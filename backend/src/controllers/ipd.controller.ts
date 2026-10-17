import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { logAuditEvent } from '../utils/auditLogger'
import { BedStatus } from '@prisma/client'

export const admitPatientSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    bedId: z.string().min(1, 'Bed ID is required'),
    attendingDoctorId: z.string().min(1, 'Attending doctor ID is required'),
    admissionDiagnosis: z.string().min(2, 'Admission diagnosis is required'),
  }),
})

export const dischargePatientSchema = z.object({
  body: z.object({
    dischargeSummary: z.string().min(5, 'Discharge summary is required'),
  }),
})

export const transferBedSchema = z.object({
  body: z.object({
    newBedId: z.string().min(1, 'New bed ID is required'),
    reason: z.string().optional(),
  }),
})

export class IpdController {
  // Get all wards with beds and occupancy status
  static async getWardsAndBeds(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const wards = await prisma.ward.findMany({
        where: { status: 'ACTIVE' },
        include: {
          beds: {
            orderBy: { bedNumber: 'asc' },
            include: {
              admissions: {
                where: { status: 'ADMITTED' },
                include: {
                  patient: { select: { id: true, mrn: true, fullName: true, gender: true } },
                  attendingDoctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
                },
              },
            },
          },
        },
      })

      // Aggregate statistics
      let totalBeds = 0
      let occupiedBeds = 0
      let availableBeds = 0
      let maintenanceBeds = 0

      for (const w of wards) {
        for (const b of w.beds) {
          totalBeds++
          if (b.status === 'OCCUPIED') occupiedBeds++
          else if (b.status === 'AVAILABLE') availableBeds++
          else maintenanceBeds++
        }
      }

      const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0.0'

      res.status(200).json({
        success: true,
        data: {
          wards,
          summary: {
            totalBeds,
            occupiedBeds,
            availableBeds,
            maintenanceBeds,
            occupancyRate: `${occupancyRate}%`,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Admit patient to bed
  static async admitPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, bedId, attendingDoctorId, admissionDiagnosis } = req.body

      const bed = await prisma.bed.findUnique({
        where: { id: bedId },
        include: { ward: true },
      })

      if (!bed) {
        res.status(404).json({ success: false, message: 'Bed not found.' })
        return
      }

      if (bed.status !== 'AVAILABLE') {
        res.status(409).json({
          success: false,
          error: 'BED_UNAVAILABLE',
          message: `Bed ${bed.bedNumber} in ${bed.ward.name} is currently ${bed.status}.`,
        })
        return
      }

      const count = await prisma.admission.count()
      const admissionNumber = `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const admission = await prisma.$transaction(async tx => {
        // Mark bed occupied
        await tx.bed.update({
          where: { id: bedId },
          data: { status: 'OCCUPIED' },
        })

        // Create admission record
        return tx.admission.create({
          data: {
            admissionNumber,
            patientId,
            bedId,
            attendingDoctorId,
            admissionDiagnosis,
            status: 'ADMITTED',
          },
          include: {
            patient: { select: { fullName: true, mrn: true } },
            bed: { include: { ward: true } },
          },
        })
      })

      await logAuditEvent({
        action: 'PATIENT_ADMITTED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Admission',
        entityId: admission.id,
        details: { admissionNumber, bedNumber: bed.bedNumber, wardName: bed.ward.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Patient admitted successfully.',
        data: admission,
      })
    } catch (error) {
      next(error)
    }
  }

  // Discharge patient and release bed
  static async dischargePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const { dischargeSummary } = req.body

      const admission = await prisma.admission.findUnique({
        where: { id },
        include: { bed: true },
      })

      if (!admission || admission.status !== 'ADMITTED') {
        res.status(400).json({ success: false, message: 'Active admission not found for this patient.' })
        return
      }

      await prisma.$transaction(async tx => {
        // Free bed
        await tx.bed.update({
          where: { id: admission.bedId },
          data: { status: 'AVAILABLE' },
        })

        // Mark discharged
        await tx.admission.update({
          where: { id },
          data: {
            status: 'DISCHARGED',
            dischargedAt: new Date(),
            dischargeSummary,
          },
        })
      })

      await logAuditEvent({
        action: 'PATIENT_DISCHARGED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Admission',
        entityId: id,
        details: { admissionNumber: admission.admissionNumber },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient discharged. Bed has been released.',
      })
    } catch (error) {
      next(error)
    }
  }

  // Transfer Bed
  static async transferBed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const { newBedId, reason } = req.body

      const admission = await prisma.admission.findUnique({
        where: { id },
      })

      if (!admission || admission.status !== 'ADMITTED') {
        res.status(400).json({ success: false, message: 'Active admission not found.' })
        return
      }

      const targetBed = await prisma.bed.findUnique({ where: { id: newBedId } })
      if (!targetBed || targetBed.status !== 'AVAILABLE') {
        res.status(409).json({ success: false, message: 'Target bed is not available.' })
        return
      }

      await prisma.$transaction(async tx => {
        // Free old bed
        await tx.bed.update({
          where: { id: admission.bedId },
          data: { status: 'AVAILABLE' },
        })

        // Occupy new bed
        await tx.bed.update({
          where: { id: newBedId },
          data: { status: 'OCCUPIED' },
        })

        // Update admission
        await tx.admission.update({
          where: { id },
          data: { bedId: newBedId },
        })
      })

      await logAuditEvent({
        action: 'BED_TRANSFERRED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Admission',
        entityId: id,
        details: { oldBedId: admission.bedId, newBedId, reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient bed transferred successfully.',
      })
    } catch (error) {
      next(error)
    }
  }
}
