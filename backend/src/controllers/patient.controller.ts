import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { generateMRN } from '../utils/numberGenerators'
import { logAuditEvent } from '../utils/auditLogger'
import { Gender } from '@prisma/client'

export const createPatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full name is required'),
    dateOfBirth: z.string().refine(val => !isNaN(Date.parse(val)), 'Valid date of birth required'),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    bloodGroup: z.string().optional(),
    phone: z.string().min(10, 'Valid 10-digit phone number is required'),
    email: z.string().email().optional().or(z.literal('')),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    address: z.string().optional(),
    allergies: z.string().optional(),
    abhaNumber: z.string().optional(),
    abhaAddress: z.string().optional(),
    abhaStatus: z.string().optional(),
    aadhaarMasked: z.string().optional(),
    abhaDetails: z.any().optional(),
  }),
})

export const updatePatientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    bloodGroup: z.string().optional(),
    phone: z.string().min(10).optional(),
    email: z.string().email().optional().or(z.literal('')),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    address: z.string().optional(),
    allergies: z.string().optional(),
    abhaNumber: z.string().optional(),
    abhaAddress: z.string().optional(),
    abhaStatus: z.string().optional(),
    aadhaarMasked: z.string().optional(),
    abhaDetails: z.any().optional(),
  }),
})

export const mergePatientSchema = z.object({
  body: z.object({
    sourcePatientId: z.string().min(1, 'Source patient ID is required'),
    targetPatientId: z.string().min(1, 'Target patient ID is required'),
    reason: z.string().min(5, 'Reason for merge is required'),
  }),
})

export class PatientController {
  // Create Patient
  static async createPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body
      const mrn = await generateMRN()

      // Check duplicate phone
      const existing = await prisma.patient.findFirst({
        where: {
          phone: data.phone,
          isArchived: false,
          fullName: { equals: data.fullName, mode: 'insensitive' },
        },
      })

      if (existing) {
        res.status(409).json({
          success: false,
          error: 'POSSIBLE_DUPLICATE_PATIENT',
          message: `A patient with the name '${data.fullName}' and phone '${data.phone}' already exists with MRN ${existing.mrn}.`,
          duplicatePatient: existing,
        })
        return
      }

      const patient = await prisma.patient.create({
        data: {
          mrn,
          fullName: data.fullName,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender as Gender,
          bloodGroup: data.bloodGroup || null,
          phone: data.phone,
          email: data.email || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          address: data.address || null,
          allergies: data.allergies || null,
          abhaNumber: data.abhaNumber || null,
          abhaAddress: data.abhaAddress || null,
          abhaStatus: data.abhaStatus || 'NOT_LINKED',
          aadhaarMasked: data.aadhaarMasked || null,
          abhaDetails: data.abhaDetails || undefined,
        },
      })

      await logAuditEvent({
        action: 'PATIENT_CREATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Patient',
        entityId: patient.id,
        details: { mrn: patient.mrn, name: patient.fullName },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully.',
        data: patient,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Patients with search & pagination
  static async getPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 15
      const search = (req.query.search as string)?.trim()
      const isArchived = req.query.archived === 'true'

      const where: any = {
        isArchived,
      }

      if (search) {
        where.OR = [
          { mrn: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { abhaNumber: { contains: search, mode: 'insensitive' } },
          { abhaAddress: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            mrn: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            phone: true,
            email: true,
            allergies: true,
            abhaNumber: true,
            abhaAddress: true,
            abhaStatus: true,
            aadhaarMasked: true,
            createdAt: true,
            _count: {
              select: {
                appointments: true,
                encounters: true,
                admissions: true,
              },
            },
          },
        }),
        prisma.patient.count({ where }),
      ])

      res.status(200).json({
        success: true,
        data: patients,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Patient by ID with clinical history
  static async getPatientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          careContexts: {
            orderBy: { linkedAt: 'desc' },
          },
          appointments: {
            orderBy: { appointmentDate: 'desc' },
            take: 10,
            include: { doctor: { include: { staff: { select: { designation: true, user: { select: { fullName: true } } } } } } },
          },
          encounters: {
            orderBy: { startedAt: 'desc' },
            take: 10,
            include: {
              clinicalNotes: true,
              prescriptions: { include: { items: { include: { medicine: true } } } },
            },
          },
          admissions: {
            orderBy: { admittedAt: 'desc' },
            include: { bed: { include: { ward: true } } },
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { payments: true },
          },
          labOrders: {
            orderBy: { orderDate: 'desc' },
            include: { results: { include: { testCatalog: true } } },
          },
        },
      })

      if (!patient) {
        res.status(404).json({ success: false, message: 'Patient record not found.' })
        return
      }

      res.status(200).json({ success: true, data: patient })
    } catch (error) {
      next(error)
    }
  }

  // Update Patient
  static async updatePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const data = req.body

      const updated = await prisma.patient.update({
        where: { id },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        },
      })

      await logAuditEvent({
        action: 'PATIENT_UPDATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Patient',
        entityId: id,
        details: { mrn: updated.mrn },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient details updated.',
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }

  // Merge Duplicate Patients
  static async mergePatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourcePatientId, targetPatientId, reason } = req.body

      if (sourcePatientId === targetPatientId) {
        res.status(400).json({ success: false, message: 'Source and target patients cannot be the same.' })
        return
      }

      await prisma.$transaction(async tx => {
        // Move appointments, encounters, invoices, admissions, lab orders to target
        await tx.appointment.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.encounter.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.invoice.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.admission.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.labOrder.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.prescription.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })
        await tx.abhaCareContext.updateMany({ where: { patientId: sourcePatientId }, data: { patientId: targetPatientId } })

        // Mark source as archived and merged
        await tx.patient.update({
          where: { id: sourcePatientId },
          data: {
            isArchived: true,
            mergedIntoId: targetPatientId,
          },
        })
      })

      await logAuditEvent({
        action: 'PATIENT_MERGED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Patient',
        entityId: targetPatientId,
        details: { sourcePatientId, targetPatientId, reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient records successfully merged.',
      })
    } catch (error) {
      next(error)
    }
  }
}
