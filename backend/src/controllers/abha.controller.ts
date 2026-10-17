import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { AbdmService } from '../services/abdm/abdm.service'
import { AbdmError } from '../services/abdm/abdm.client'

export const generateOtpSchema = z.object({
  body: z.object({
    authMethod: z.enum(['AADHAAR', 'MOBILE', 'ABHA_NUMBER']),
    value: z.string().min(10, 'Invalid Aadhaar, Mobile, or ABHA Number'),
    patientId: z.string().optional(),
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
    patientIdToLink: z.string().optional(),
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
   * Return ABDM Gateway readiness & operational status
   */
  static async getStatus(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = AbdmService.getStatus()
      res.status(200).json({
        success: true,
        data: status,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Milestone 1 (M1): Request OTP for ABHA creation / authentication via Aadhaar or Mobile
   */
  static async generateOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { authMethod, value, patientId } = req.body

      const result = await AbdmService.generateOtp({
        authMethod,
        value,
        patientId,
      })

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        res.status(400).json({
          success: false,
          error: error.code,
          message: error.message,
          details: error.details,
        })
        return
      }
      next(error)
    }
  }

  /**
   * Milestone 1 (M1): Verify OTP and retrieve official verified ABHA profile
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { txnId, otp, patientDetails, patientIdToLink } = req.body

      const verifiedProfile = await AbdmService.verifyOtp({
        txnId,
        otp,
        patientDetails,
        patientIdToLink,
      })

      res.status(200).json({
        success: true,
        message: 'ABHA identity successfully verified.',
        data: verifiedProfile,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        res.status(400).json({
          success: false,
          error: error.code,
          message: error.message,
          details: error.details,
        })
        return
      }
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

      const result = await AbdmService.searchAbha(query)

      if (!result.foundIn) {
        res.status(404).json({
          success: false,
          message: result.message,
        })
        return
      }

      res.status(200).json({
        success: true,
        foundIn: result.foundIn,
        data: result.data,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        res.status(404).json({
          success: false,
          error: error.code,
          message: error.message,
        })
        return
      }
      next(error)
    }
  }

  /**
   * Link verified ABHA identity to an existing Hospital Patient (MRN)
   */
  static async linkPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, abhaNumber, abhaAddress, aadhaarMasked, abhaDetails } = req.body

      const updated = await AbdmService.linkPatient({
        patientId,
        abhaNumber,
        abhaAddress,
        aadhaarMasked,
        abhaDetails,
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Patient record successfully linked with ABHA network.',
        data: updated,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        const statusCode = error.code === 'ABHA_ALREADY_LINKED' ? 409 : 400
        res.status(statusCode).json({
          success: false,
          error: error.code,
          message: error.message,
        })
        return
      }
      next(error)
    }
  }

  /**
   * Unlink ABHA from Patient
   */
  static async unlinkPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.params.patientId as string

      const updated = await AbdmService.unlinkPatient({
        patientId,
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'ABHA record unlinked from patient successfully.',
        data: updated,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        res.status(404).json({
          success: false,
          error: error.code,
          message: error.message,
        })
        return
      }
      next(error)
    }
  }

  /**
   * Milestone 2 (M2): Create Care Context (HIP linking of OPD/IPD encounter with ABHA)
   */
  static async createCareContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, referenceNumber, display, careContextType } = req.body

      const careContext = await AbdmService.createCareContext({
        patientId,
        referenceNumber,
        display,
        careContextType,
      })

      res.status(201).json({
        success: true,
        message: 'Care context successfully linked to patient health record.',
        data: careContext,
      })
    } catch (error) {
      if (error instanceof AbdmError) {
        res.status(400).json({
          success: false,
          error: error.code,
          message: error.message,
        })
        return
      }
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
        verificationStatus: patient.abhaStatus,
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

  /**
   * Gateway Inbound Webhook: /v0.5/care-contexts/discover
   */
  static async gatewayCareContextDiscover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AbdmService.handleCareContextDiscover(req.body)
      res.status(202).json({ status: 'ACCEPTED', result })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Gateway Inbound Webhook: /v0.5/consents/hip/notify
   */
  static async gatewayConsentNotify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AbdmService.handleConsentNotify(req.body)
      res.status(202).json({ status: 'ACCEPTED', result })
    } catch (error) {
      next(error)
    }
  }
}
