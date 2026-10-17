import { Router } from 'express'
import {
  LabController,
  createLabOrderSchema,
  updateLabResultSchema,
} from '../controllers/lab.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// Test Catalog
router.get('/catalog', LabController.getCatalog)

// List Lab Orders
router.get('/orders', LabController.getOrders)

// Create Lab Order
router.post(
  '/orders',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'),
  validate(createLabOrderSchema),
  LabController.createOrder
)

// Record / Verify Test Result (Lab Staff & Doctors only)
router.patch(
  '/results/:resultId',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'LAB_STAFF', 'DOCTOR'),
  validate(updateLabResultSchema),
  LabController.recordResult
)

export const labRoutes = router
