import { Router } from 'express'
import {
  PatientController,
  createPatientSchema,
  updatePatientSchema,
  mergePatientSchema,
} from '../controllers/patient.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// List & Search Patients (All staff roles)
router.get('/', PatientController.getPatients)

// Get Patient by ID
router.get('/:id', PatientController.getPatientById)

// Register new Patient (Receptionist, Doctor, Nurse, Admin)
router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validate(createPatientSchema),
  PatientController.createPatient
)

// Update Patient
router.patch(
  '/:id',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validate(updatePatientSchema),
  PatientController.updatePatient
)

// Merge Duplicate Patients (Admins only)
router.post(
  '/merge',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'),
  validate(mergePatientSchema),
  PatientController.mergePatients
)

export const patientRoutes = router
