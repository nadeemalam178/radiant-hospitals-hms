import { Router } from 'express'
import { ReportController } from '../controllers/report.controller'
import { requireAuth, requireRole } from '../middleware/auth'

const router = Router()
router.use(requireAuth)

// Dashboard Metrics (accessible to staff)
router.get('/dashboard', ReportController.getDashboardMetrics)

// Financial Reports (Auditors & Administrators)
router.get(
  '/financials',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'BILLING_OPERATOR', 'AUDITOR'),
  ReportController.getFinancialReport
)

// Hospital Settings
router.get('/settings', ReportController.getSettings)
router.put(
  '/settings',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'),
  ReportController.updateSettings
)

export const reportRoutes = router
