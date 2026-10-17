import { Router } from 'express'
import {
  BillingController,
  createInvoiceSchema,
  recordPaymentSchema,
} from '../controllers/billing.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// Service Catalog
router.get('/services', BillingController.getServiceCatalog)

// List Invoices
router.get('/invoices', BillingController.getInvoices)

// Get Invoice by ID (Print View)
router.get('/invoices/:id', BillingController.getInvoiceById)

// Generate Invoice
router.post(
  '/invoices',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_OPERATOR', 'RECEPTIONIST'),
  validate(createInvoiceSchema),
  BillingController.createInvoice
)

// Record Payment
router.post(
  '/payments',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_OPERATOR', 'RECEPTIONIST'),
  validate(recordPaymentSchema),
  BillingController.recordPayment
)

export const billingRoutes = router
