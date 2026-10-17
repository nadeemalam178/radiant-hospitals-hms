import { Router } from 'express'
import {
  IpdController,
  admitPatientSchema,
  dischargePatientSchema,
  transferBedSchema,
} from '../controllers/ipd.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// Wards & Beds overview
router.get('/wards', IpdController.getWardsAndBeds)

// Admit Patient
router.post(
  '/admit',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validate(admitPatientSchema),
  IpdController.admitPatient
)

// Discharge Patient
router.post(
  '/discharge/:id',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'),
  validate(dischargePatientSchema),
  IpdController.dischargePatient
)

// Transfer Bed
router.post(
  '/transfer/:id',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'NURSE', 'DOCTOR'),
  validate(transferBedSchema),
  IpdController.transferBed
)

export const ipdRoutes = router
