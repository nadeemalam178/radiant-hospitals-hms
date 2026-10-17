import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { generateInvoiceNumber } from '../utils/numberGenerators'
import { logAuditEvent } from '../utils/auditLogger'
import { PaymentMethod } from '@prisma/client'

export const createInvoiceSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    encounterId: z.string().optional(),
    discountAmount: z.number().min(0).default(0),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        serviceId: z.string().optional(),
        medicineId: z.string().optional(),
        description: z.string().min(1, 'Item description is required'),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
        taxRate: z.number().min(0).default(0),
      })
    ).min(1, 'At least one invoice item is required'),
  }),
})

export const recordPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().min(1, 'Invoice ID is required'),
    amount: z.number().positive('Payment amount must be greater than zero'),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'INSURANCE']),
    transactionReference: z.string().optional(),
    notes: z.string().optional(),
  }),
})

export class BillingController {
  // Service Catalog
  static async getServiceCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = await prisma.serviceCatalog.findMany({
        where: { status: 'ACTIVE' },
        include: { department: { select: { name: true } } },
        orderBy: { name: 'asc' },
      })
      res.status(200).json({ success: true, data: services })
    } catch (error) {
      next(error)
    }
  }

  // Create Invoice
  static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, encounterId, discountAmount, notes, items } = req.body

      let subTotal = 0
      let totalTax = 0

      const processedItems = items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTax = (itemSubtotal * (item.taxRate || 0)) / 100
        const itemTotal = itemSubtotal + itemTax

        subTotal += itemSubtotal
        totalTax += itemTax

        return {
          serviceId: item.serviceId || null,
          medicineId: item.medicineId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          totalPrice: itemTotal,
        }
      })

      const finalDiscount = discountAmount || 0
      const totalAmount = Math.max(0, subTotal + totalTax - finalDiscount)
      const balanceAmount = totalAmount
      const invoiceNumber = await generateInvoiceNumber()

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          patientId,
          encounterId: encounterId || null,
          subTotal,
          taxAmount: totalTax,
          discountAmount: finalDiscount,
          totalAmount,
          paidAmount: 0.0,
          balanceAmount,
          status: 'DRAFT',
          notes,
          createdById: req.user?.userId,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: true,
          patient: { select: { fullName: true, mrn: true, phone: true } },
        },
      })

      await logAuditEvent({
        action: 'INVOICE_CREATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Invoice',
        entityId: invoice.id,
        details: { invoiceNumber, totalAmount },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully.',
        data: invoice,
      })
    } catch (error) {
      next(error)
    }
  }

  // Record Payment
  static async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, amount, paymentMethod, transactionReference, notes } = req.body

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { patient: { select: { fullName: true, mrn: true } } },
      })

      if (!invoice) {
        res.status(404).json({ success: false, message: 'Invoice not found.' })
        return
      }

      if (invoice.status === 'PAID') {
        res.status(400).json({ success: false, message: 'Invoice is already fully paid.' })
        return
      }

      if (amount > invoice.balanceAmount + 0.01) {
        res.status(400).json({
          success: false,
          message: `Payment amount (${amount}) exceeds outstanding balance (${invoice.balanceAmount}).`,
        })
        return
      }

      const count = await prisma.payment.count()
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`

      const updated = await prisma.$transaction(async tx => {
        const payment = await tx.payment.create({
          data: {
            paymentNumber,
            invoiceId,
            amount,
            paymentMethod: paymentMethod as PaymentMethod,
            transactionReference,
            notes,
            receivedById: req.user?.userId,
          },
        })

        const newPaidAmount = invoice.paidAmount + amount
        const newBalanceAmount = Math.max(0, invoice.totalAmount - newPaidAmount)
        const newStatus = newBalanceAmount <= 0.01 ? 'PAID' : 'PARTIALLY_PAID'

        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus,
          },
          include: { items: true, payments: true, patient: true },
        })

        return { payment, invoice: updatedInvoice }
      })

      await logAuditEvent({
        action: 'PAYMENT_RECORDED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Payment',
        entityId: updated.payment.id,
        details: { invoiceNumber: invoice.invoiceNumber, amount, paymentMethod },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Payment received successfully.',
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Invoices list
  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, patientId, page, limit } = req.query
      const p = parseInt(page as string) || 1
      const l = parseInt(limit as string) || 20

      const where: any = {}
      if (status) where.status = status
      if (patientId) where.patientId = patientId as string

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip: (p - 1) * l,
          take: l,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: { select: { mrn: true, fullName: true, phone: true } },
            payments: { select: { id: true, amount: true, paymentMethod: true, receivedAt: true } },
          },
        }),
        prisma.invoice.count({ where }),
      ])

      res.status(200).json({
        success: true,
        data: invoices,
        pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) },
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Invoice by ID (Printable)
  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          items: true,
          payments: true,
          patient: true,
        },
      })

      if (!invoice) {
        res.status(404).json({ success: false, message: 'Invoice not found.' })
        return
      }

      const hospital = await prisma.hospitalSettings.findFirst()

      res.status(200).json({
        success: true,
        data: {
          invoice,
          hospital,
        },
      })
    } catch (error) {
      next(error)
    }
  }
}
