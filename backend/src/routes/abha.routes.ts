import { Router } from 'express'
import {
  AbhaController,
  generateOtpSchema,
  verifyOtpSchema,
  linkPatientSchema,
  createCareContextSchema,
} from '../controllers/abha.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

// All routes require authenticated hospital staff
router.use(requireAuth)

// Check ABDM Gateway configuration & operational readiness
router.get('/status', AbhaController.getStatus)

// Search ABHA directory
router.get('/search', AbhaController.searchAbha)

// Generate OTP (Aadhaar / Mobile)
router.post('/generate-otp', validate(generateOtpSchema), AbhaController.generateOtp)

// Verify OTP & fetch ABHA Profile
router.post('/verify-otp', validate(verifyOtpSchema), AbhaController.verifyOtp)

// Link ABHA to Patient
router.post(
  '/link',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validate(linkPatientSchema),
  AbhaController.linkPatient
)

// Unlink ABHA
router.delete(
  '/patient/:patientId/link',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'),
  AbhaController.unlinkPatient
)

// Register Care Context (M2 HIP Linking)
router.post(
  '/care-contexts',
  validate(createCareContextSchema),
  AbhaController.createCareContext
)

// Get Care Contexts for Patient
router.get('/patient/:patientId/care-contexts', AbhaController.getCareContexts)

// Get formatted Digital ABHA Card
router.get('/patient/:patientId/card', AbhaController.getAbhaCard)

export const abhaRoutes = router
