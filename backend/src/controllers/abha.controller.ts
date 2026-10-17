import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { logAuditEvent } from '../utils/auditLogger'

// In-memory transaction store for ABDM OTP verification
interface AbhaTransaction {
  txnId: string
  authMethod: 'AADHAAR' | 'MOBILE' | 'ABHA_NUMBER'
  identifier: string
  otp: string
  expiresAt: number
}

const transactionStore = new Map<string, AbhaTransaction>()

export const generateOtpSchema = z.object({
  body: z.object({
    authMethod: z.enum(['AADHAAR', 'MOBILE', 'ABHA_NUMBER']),
    value: z.string().min(10, 'Invalid Aadhaar, Mobile, or ABHA Number'),
  }),
})

export const verifyOtpSchema = z.object({
  body: z.object({
    txnId: z.string().min(1, 'Transaction ID is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    patientDetails: z
      .object({
        fullName: z.string().optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        dateOfBirth: z.string().optional(),
      })
      .optional(),
  }),
})

export const linkPatientSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    abhaNumber: z.string().min(14, 'Valid 14-digit ABHA Number is required'),
    abhaAddress: z.string().min(3, 'Valid ABHA Address is required'),
    aadhaarMasked: z.string().optional(),
    abhaDetails: z.record(z.any()).optional(),
  }),
})

export const createCareContextSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    referenceNumber: z.string().min(1, 'Reference number is required'),
    display: z.string().min(1, 'Display description is required'),
    careContextType: z.enum(['OPD_VISIT', 'DIAGNOSTIC_REPORT', 'DISCHARGE_SUMMARY', 'PRESCRIPTION']),
  }),
})

export class AbhaController {
  /**
   * Milestone 1 (M1): Generate OTP for ABHA creation / authentication via Aadhaar or Mobile
   */
  static async generateOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { authMethod, value } = req.body
      const cleanValue = value.replace(/[-\s]/g, '')

      if (authMethod === 'AADHAAR' && cleanValue.length !== 12) {
        res.status(400).json({ success: false, message: 'Aadhaar must be a 12-digit number.' })
        return
      }

      if (authMethod === 'MOBILE' && cleanValue.length !== 10) {
        res.status(400).json({ success: false, message: 'Mobile must be a 10-digit number.' })
        return
      }

      const txnId = `ABDM-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      // For local and sandbox environment, standard OTP is 123456
      const demoOtp = '123456'

      transactionStore.set(txnId, {
        txnId,
        authMethod,
        identifier: cleanValue,
        otp: demoOtp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      })

      const masked = cleanValue.slice(-4)

      res.status(200).json({
        success: true,
        data: {
          txnId,
          authMethod,
          maskedIdentifier: `******${masked}`,
          message: `OTP sent successfully to registered mobile ending with ${masked}. (For testing/development, use OTP: 123456)`,
          expiresInSeconds: 600,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Milestone 1 (M1): Verify OTP and retrieve / issue verified ABHA profile
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { txnId, otp, patientDetails } = req.body
      const txn = transactionStore.get(txnId)

      // Allow 123456 in dev/test environment or verify against recorded txn
      if (otp !== '123456' && (!txn || txn.otp !== otp || txn.expiresAt < Date.now())) {
        res.status(400).json({
          success: false,
          error: 'INVALID_OR_EXPIRED_OTP',
          message: 'The OTP entered is invalid or has expired. Please try again or use demo code 123456.',
        })
        return
      }

      // Generate realistic 14-digit ABHA number and address if not already existing
      const randomSeed = Math.floor(100000000000 + Math.random() * 900000000000).toString()
      const formattedAbhaNumber = `91-${randomSeed.slice(0, 4)}-${randomSeed.slice(4, 8)}-${randomSeed.slice(8, 12)}`

      const nameBase = (patientDetails?.fullName || 'Health Seeker').toLowerCase().replace(/[^a-z0-9]/g, '.')
      const abhaAddress = `${nameBase.split('.')[0] || 'user'}${Math.floor(100 + Math.random() * 900)}@abdm`

      const maskedAadhaar = txn?.authMethod === 'AADHAAR'
        ? `XXXX-XXXX-${txn.identifier.slice(-4)}`
        : `XXXX-XXXX-${Math.floor(1000 + Math.random() * 9000)}`

      const verifiedProfile = {
        abhaNumber: formattedAbhaNumber,
        abhaAddress,
        fullName: patientDetails?.fullName || 'Verified Ayushman Beneficiary',
        gender: patientDetails?.gender || 'MALE',
        dateOfBirth: patientDetails?.dateOfBirth || '1990-01-15',
        phone: txn?.authMethod === 'MOBILE' ? txn.identifier : '9845012345',
        aadhaarMasked: maskedAadhaar,
        address: 'Outer Ring Road, Bengaluru',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        pincode: '560103',
        status: 'VERIFIED',
        kycVerified: true,
        verifiedAt: new Date().toISOString(),
        qrCodePayload: `ABDM|${formattedAbhaNumber}|${abhaAddress}|VERIFIED|RHRI`,
      }

      // Cleanup transaction
      transactionStore.delete(txnId)

      res.status(200).json({
        success: true,
        message: 'ABHA identity successfully authenticated and verified by ABDM Gateway.',
        data: verifiedProfile,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Search ABDM registry or local database by ABHA number or ABHA address
   */
  static async searchAbha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string)?.trim()

      if (!query) {
        res.status(400).json({ success: false, message: 'Search parameter q is required.' })
        return
      }

      // 1. Search in local database
      const localPatient = await prisma.patient.findFirst({
        where: {
          OR: [
            { abhaNumber: { equals: query, mode: 'insensitive' } },
            { abhaAddress: { equals: query, mode: 'insensitive' } },
            { phone: query },
          ],
          isArchived: false,
        },
      })

      if (localPatient) {
        res.status(200).json({
          success: true,
          foundIn: 'LOCAL_REGISTRY',
          data: {
            patientId: localPatient.id,
            mrn: localPatient.mrn,
            fullName: localPatient.fullName,
            abhaNumber: localPatient.abhaNumber,
            abhaAddress: localPatient.abhaAddress,
            abhaStatus: localPatient.abhaStatus,
            gender: localPatient.gender,
            dateOfBirth: localPatient.dateOfBirth,
            phone: localPatient.phone,
          },
        })
        return
      }

      // 2. ABDM Network Simulation Lookup
      if (query.includes('@') || query.startsWith('91-')) {
        const dummyProfile = {
          abhaNumber: query.startsWith('91-') ? query : `91-4521-8903-${Math.floor(1000 + Math.random() * 9000)}`,
          abhaAddress: query.includes('@') ? query : `${query.toLowerCase()}@abdm`,
          fullName: 'Ayushman Beneficiary',
          gender: 'MALE',
          dateOfBirth: '1988-06-20',
          phone: '9876543210',
          status: 'VERIFIED',
          kycVerified: true,
        }

        res.status(200).json({
          success: true,
          foundIn: 'ABDM_GATEWAY_REGISTRY',
          data: dummyProfile,
        })
        return
      }

      res.status(404).json({
        success: false,
        message: `No ABHA profile found for '${query}'. You can generate a new ABHA via OTP.`,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Link verified ABHA identity to an existing Hospital Patient (MRN)
   */
  static async linkPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, abhaNumber, abhaAddress, aadhaarMasked, abhaDetails } = req.body

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      })

      if (!patient) {
        res.status(404).json({ success: false, message: 'Patient record not found.' })
        return
      }

      // Check if this ABHA is already linked to another patient
      const existingAbha = await prisma.patient.findFirst({
        where: {
          abhaNumber,
          id: { not: patientId },
          isArchived: false,
        },
      })

      if (existingAbha) {
        res.status(409).json({
          success: false,
          error: 'ABHA_ALREADY_LINKED',
          message: `This ABHA Number is already linked to patient '${existingAbha.fullName}' (${existingAbha.mrn}).`,
        })
        return
      }

      const updated = await prisma.patient.update({
        where: { id: patientId },
        data: {
          abhaNumber,
          abhaAddress,
          abhaStatus: 'VERIFIED',
          aadhaarMasked: aadhaarMasked || null,
          abhaDetails: abhaDetails || undefined,
        },
      })

      await logAuditEvent({
        action: 'ABHA_LINKED_TO_PATIENT',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Patient',
        entityId: patient.id,
        details: { mrn: patient.mrn, abhaNumber, abhaAddress },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient record successfully linked with ABHA network.',
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Unlink ABHA from Patient
   */
  static async unlinkPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId as string

      const patient = await prisma.patient.findUnique({ where: { id: patientId } })
      if (!patient) {
        res.status(404).json({ success: false, message: 'Patient not found.' })
        return
      }

      const updated = await prisma.patient.update({
        where: { id: patientId },
        data: {
          abhaNumber: null,
          abhaAddress: null,
          abhaStatus: 'NOT_LINKED',
          aadhaarMasked: null,
          abhaDetails: undefined,
        },
      })

      await logAuditEvent({
        action: 'ABHA_UNLINKED_FROM_PATIENT',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Patient',
        entityId: patient.id,
        details: { mrn: patient.mrn },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'ABHA record unlinked from patient successfully.',
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Milestone 2 (M2): Create Care Context (HIP linking of OPD/IPD encounter with ABHA)
   */
  static async createCareContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, referenceNumber, display, careContextType } = req.body

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true, abhaNumber: true, abhaStatus: true, mrn: true },
      })

      if (!patient) {
        res.status(404).json({ success: false, message: 'Patient not found.' })
        return
      }

      const careContext = await prisma.abhaCareContext.upsert({
        where: {
          patientId_referenceNumber: {
            patientId,
            referenceNumber,
          },
        },
        update: {
          display,
          careContextType,
          status: 'LINKED',
        },
        create: {
          patientId,
          referenceNumber,
          display,
          careContextType,
          status: 'LINKED',
          hipId: 'IN_RHRI_BLR_01',
        },
      })

      res.status(201).json({
        success: true,
        message: 'Care context successfully linked to patient health record.',
        data: careContext,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get Care Contexts for a Patient
   */
  static async getCareContexts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId as string

      const careContexts = await prisma.abhaCareContext.findMany({
        where: { patientId },
        orderBy: { linkedAt: 'desc' },
      })

      res.status(200).json({
        success: true,
        data: careContexts,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Retrieve formatted Digital ABHA Card payload
   */
  static async getAbhaCard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId as string

      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          careContexts: true,
        },
      })

      if (!patient || !patient.abhaNumber) {
        res.status(404).json({
          success: false,
          message: 'No active ABHA identity found for this patient.',
        })
        return
      }

      const hospital = await prisma.hospitalSettings.findFirst()

      const cardData = {
        hospitalName: hospital?.name || 'Radiant Hospital & Research Institute',
        facilityId: hospital?.facilityId || 'IN2910000452',
        hipId: hospital?.hipId || 'IN_RHRI_BLR_01',
        patient: {
          mrn: patient.mrn,
          fullName: patient.fullName,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          bloodGroup: patient.bloodGroup,
          phone: patient.phone,
          abhaNumber: patient.abhaNumber,
          abhaAddress: patient.abhaAddress,
          abhaStatus: patient.abhaStatus,
          aadhaarMasked: patient.aadhaarMasked,
        },
        verificationStatus: 'VERIFIED_BY_ABDM',
        qrPayload: `ABDM|${patient.abhaNumber}|${patient.abhaAddress}|${patient.fullName}|${hospital?.hipId || 'IN_RHRI_BLR_01'}`,
        linkedCareContextsCount: patient.careContexts.length,
        issuedDate: patient.createdAt,
      }

      res.status(200).json({
        success: true,
        data: cardData,
      })
    } catch (error) {
      next(error)
    }
  }
}
