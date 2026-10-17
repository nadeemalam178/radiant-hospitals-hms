import { Router } from 'express'
import {
  PharmacyController,
  createMedicineSchema,
  receiveBatchSchema,
  adjustStockSchema,
} from '../controllers/pharmacy.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// Catalog
router.get('/medicines', PharmacyController.getMedicines)

// Add new medicine
router.post(
  '/medicines',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER'),
  validate(createMedicineSchema),
  PharmacyController.createMedicine
)

// Receive Stock Batch
router.post(
  '/batches',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER'),
  validate(receiveBatchSchema),
  PharmacyController.receiveBatch
)

// Adjust stock
router.post(
  '/adjust',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER'),
  validate(adjustStockSchema),
  PharmacyController.adjustStock
)

export const pharmacyRoutes = router
