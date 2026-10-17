import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { logAuditEvent } from '../utils/auditLogger'

export const startEncounterSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    doctorId: z.string().min(1, 'Doctor ID is required'),
    encounterType: z.enum(['OPD', 'IPD', 'EMERGENCY']).default('OPD'),
    notes: z.string().optional(),
  }),
})

export const addClinicalNoteSchema = z.object({
  body: z.object({
    encounterId: z.string().min(1, 'Encounter ID is required'),
    chiefComplaint: z.string().min(2, 'Chief complaint is required'),
    historyOfPresentIllness: z.string().optional(),
    vitals: z.object({
      bp: z.string().optional(),
      pulse: z.number().optional(),
      temp: z.number().optional(),
      spo2: z.number().optional(),
      weight: z.number().optional(),
    }).optional(),
    diagnosis: z.string().min(2, 'Diagnosis is required'),
    clinicalAdvice: z.string().optional(),
  }),
})

export const createPrescriptionSchema = z.object({
  body: z.object({
    encounterId: z.string().min(1, 'Encounter ID is required'),
    patientId: z.string().min(1, 'Patient ID is required'),
    doctorId: z.string().min(1, 'Doctor ID is required'),
    generalInstructions: z.string().optional(),
    items: z.array(
      z.object({
        medicineId: z.string().min(1, 'Medicine is required'),
        dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
        frequency: z.string().min(1, 'Frequency is required (e.g. 1-0-1)'),
        duration: z.string().min(1, 'Duration is required (e.g. 5 Days)'),
        specialInstructions: z.string().optional(),
      })
    ).min(1, 'At least one medicine item is required'),
  }),
})

export class OpdController {
  // Start clinical encounter
  static async startEncounter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, doctorId, encounterType, notes } = req.body
      const count = await prisma.encounter.count()
      const encounterNumber = `ENC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const encounter = await prisma.encounter.create({
        data: {
          encounterNumber,
          patientId,
          doctorId,
          encounterType,
          notes,
          status: 'ACTIVE',
        },
        include: {
          patient: { select: { fullName: true, mrn: true } },
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
        },
      })

      res.status(201).json({
        success: true,
        message: 'Clinical encounter initiated.',
        data: encounter,
      })
    } catch (error) {
      next(error)
    }
  }

  // Record Clinical Notes and Vitals
  static async addClinicalNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { encounterId, chiefComplaint, historyOfPresentIllness, vitals, diagnosis, clinicalAdvice } = req.body

      const note = await prisma.clinicalNote.create({
        data: {
          encounterId,
          chiefComplaint,
          historyOfPresentIllness,
          vitals: vitals || {},
          diagnosis,
          clinicalAdvice,
          createdById: req.user?.userId,
        },
      })

      await logAuditEvent({
        action: 'CLINICAL_NOTE_RECORDED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'ClinicalNote',
        entityId: note.id,
        details: { encounterId, diagnosis },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Clinical note and vitals successfully recorded.',
        data: note,
      })
    } catch (error) {
      next(error)
    }
  }

  // Create Electronic Prescription
  static async createPrescription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { encounterId, patientId, doctorId, generalInstructions, items } = req.body
      const count = await prisma.prescription.count()
      const prescriptionNumber = `RX-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

      const prescription = await prisma.prescription.create({
        data: {
          prescriptionNumber,
          encounterId,
          patientId,
          doctorId,
          generalInstructions,
          items: {
            create: items.map((item: any) => ({
              medicineId: item.medicineId,
              dosage: item.dosage,
              frequency: item.frequency,
              duration: item.duration,
              specialInstructions: item.specialInstructions,
            })),
          },
        },
        include: {
          items: { include: { medicine: true } },
          patient: { select: { fullName: true, mrn: true } },
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
        },
      })

      await logAuditEvent({
        action: 'PRESCRIPTION_CREATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Prescription',
        entityId: prescription.id,
        details: { prescriptionNumber, itemCount: items.length },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Electronic prescription generated.',
        data: prescription,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get active encounters for doctor / clinic
  static async getEncounters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, doctorId, status } = req.query
      const where: any = {}
      if (patientId) where.patientId = patientId as string
      if (doctorId) where.doctorId = doctorId as string
      if (status) where.status = status

      const encounters = await prisma.encounter.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          patient: { select: { id: true, mrn: true, fullName: true, gender: true, phone: true } },
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
          clinicalNotes: true,
          prescriptions: { include: { items: { include: { medicine: true } } } },
        },
      })

      res.status(200).json({ success: true, data: encounters })
    } catch (error) {
      next(error)
    }
  }
}
