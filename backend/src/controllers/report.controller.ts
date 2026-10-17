import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/db'
import { logAuditEvent } from '../utils/auditLogger'

export class ReportController {
  // Real database metrics for Dashboard
  static async getDashboardMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

      const [
        totalPatients,
        todayPatients,
        todayAppointments,
        activeAdmissions,
        totalBeds,
        occupiedBeds,
        todayPayments,
        monthlyInvoices,
        lowStockCount,
        nearExpiryCount,
        pendingLabOrders,
        recentAudits,
      ] = await Promise.all([
        // Total & Today patients
        prisma.patient.count({ where: { isArchived: false } }),
        prisma.patient.count({ where: { createdAt: { gte: startOfToday, lt: endOfToday } } }),

        // Today's appointments grouped
        prisma.appointment.findMany({
          where: { appointmentDate: { gte: startOfToday, lt: endOfToday } },
          select: { status: true },
        }),

        // Admissions & Beds
        prisma.admission.count({ where: { status: 'ADMITTED' } }),
        prisma.bed.count(),
        prisma.bed.count({ where: { status: 'OCCUPIED' } }),

        // Financials: Today payments
        prisma.payment.aggregate({
          where: { receivedAt: { gte: startOfToday, lt: endOfToday } },
          _sum: { amount: true },
        }),

        // Financials: Month invoices
        prisma.invoice.aggregate({
          where: { createdAt: { gte: startOfMonth } },
          _sum: { totalAmount: true, paidAmount: true, balanceAmount: true },
        }),

        // Low stock count (batches total <= reorderLevel)
        prisma.medicine.count({
          where: {
            status: 'ACTIVE',
            batches: { none: { quantityInStock: { gt: 10 } } },
          },
        }),

        // Near expiry batches
        prisma.inventoryBatch.count({
          where: {
            expiryDate: { lte: ninetyDaysFromNow },
            quantityInStock: { gt: 0 },
          },
        }),

        // Pending lab orders
        prisma.labOrder.count({ where: { status: { in: ['ORDERED', 'PROCESSING'] } } }),

        // Recent Audit events
        prisma.auditLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            actorEmail: true,
            entityName: true,
            createdAt: true,
          },
        }),
      ])

      // Appointment breakdown
      const appointmentStats = {
        total: todayAppointments.length,
        pending: todayAppointments.filter(a => a.status === 'PENDING').length,
        confirmed: todayAppointments.filter(a => a.status === 'CONFIRMED').length,
        checkedIn: todayAppointments.filter(a => a.status === 'CHECKED_IN').length,
        completed: todayAppointments.filter(a => a.status === 'COMPLETED').length,
        cancelled: todayAppointments.filter(a => a.status === 'CANCELLED').length,
      }

      const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0.0'

      res.status(200).json({
        success: true,
        data: {
          patients: {
            total: totalPatients,
            today: todayPatients,
          },
          appointments: appointmentStats,
          ipd: {
            admissions: activeAdmissions,
            totalBeds,
            occupiedBeds,
            occupancyRate: `${occupancyRate}%`,
          },
          financials: {
            todayCollections: todayPayments._sum.amount || 0,
            monthlyTotalBilled: monthlyInvoices._sum.totalAmount || 0,
            monthlyTotalPaid: monthlyInvoices._sum.paidAmount || 0,
            outstandingBalance: monthlyInvoices._sum.balanceAmount || 0,
          },
          alerts: {
            lowStockMedicines: lowStockCount,
            nearExpiryBatches: nearExpiryCount,
            pendingLabOrders,
          },
          recentActivity: recentAudits,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Financial Breakdown Report
  static async getFinancialReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate ? new Date(endDate as string) : new Date()

      const [payments, invoices] = await Promise.all([
        prisma.payment.findMany({
          where: { receivedAt: { gte: start, lte: end } },
          select: { amount: true, paymentMethod: true, receivedAt: true },
        }),
        prisma.invoice.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { totalAmount: true, paidAmount: true, balanceAmount: true, status: true, createdAt: true },
        }),
      ])

      // Group payments by method
      const byMethod: Record<string, number> = {}
      let totalCollected = 0
      for (const p of payments) {
        byMethod[p.paymentMethod] = (byMethod[p.paymentMethod] || 0) + p.amount
        totalCollected += p.amount
      }

      res.status(200).json({
        success: true,
        data: {
          period: { start, end },
          totalCollected,
          collectionsByMethod: byMethod,
          totalInvoicesCount: invoices.length,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get and Update Hospital Settings
  static async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.hospitalSettings.findFirst()
      res.status(200).json({ success: true, data: settings })
    } catch (error) {
      next(error)
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await prisma.hospitalSettings.findFirst()
      if (!settings) {
        res.status(404).json({ success: false, message: 'Hospital settings not found.' })
        return
      }

      const updated = await prisma.hospitalSettings.update({
        where: { id: settings.id },
        data: req.body,
      })

      await logAuditEvent({
        action: 'HOSPITAL_SETTINGS_UPDATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'HospitalSettings',
        entityId: updated.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Hospital settings updated.',
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }
}
