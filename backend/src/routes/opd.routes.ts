import { Router } from 'express'
import {
  OpdController,
  startEncounterSchema,
  addClinicalNoteSchema,
  createPrescriptionSchema,
} from '../controllers/opd.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// List Encounters
router.get('/', OpdController.getEncounters)

// Start Consultation Encounter
router.post(
  '/encounter',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validate(startEncounterSchema),
  OpdController.startEncounter
)

// Add Clinical Note & Vitals
router.post(
  '/notes',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validate(addClinicalNoteSchema),
  OpdController.addClinicalNote
)

// Issue Electronic Prescription
router.post(
  '/prescription',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  validate(createPrescriptionSchema),
  OpdController.createPrescription
)

export const opdRoutes = router
