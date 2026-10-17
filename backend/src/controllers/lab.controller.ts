import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { generateLabOrderNumber } from '../utils/numberGenerators'
import { logAuditEvent } from '../utils/auditLogger'

export const createLabOrderSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    orderedById: z.string().min(1, 'Doctor ID is required'),
    encounterId: z.string().optional(),
    priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    notes: z.string().optional(),
    testCatalogIds: z.array(z.string()).min(1, 'At least one test is required'),
  }),
})

export const updateLabResultSchema = z.object({
  body: z.object({
    resultValue: z.string().min(1, 'Result value is required'),
    interpretation: z.string().optional(),
    isAbnormal: z.boolean().default(false),
  }),
})

export class LabController {
  // Test Catalog
  static async getCatalog(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tests = await prisma.labTestCatalog.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
      res.status(200).json({ success: true, data: tests })
    } catch (error) {
      next(error)
    }
  }

  // Order Lab Tests
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, orderedById, encounterId, priority, notes, testCatalogIds } = req.body
      const orderNumber = await generateLabOrderNumber()

      const order = await prisma.labOrder.create({
        data: {
          orderNumber,
          patientId,
          orderedById,
          encounterId: encounterId || null,
          priority,
          notes,
          status: 'ORDERED',
          results: {
            create: testCatalogIds.map((testCatalogId: string) => ({
              testCatalogId,
              status: 'PENDING',
            })),
          },
        },
        include: {
          results: { include: { testCatalog: true } },
          patient: { select: { fullName: true, mrn: true } },
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
        },
      })

      await logAuditEvent({
        action: 'LAB_ORDER_CREATED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'LabOrder',
        entityId: order.id,
        details: { orderNumber, testsCount: testCatalogIds.length },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Lab order generated.',
        data: order,
      })
    } catch (error) {
      next(error)
    }
  }

  // List Lab Orders
  static async getOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, patientId } = req.query
      const where: any = {}
      if (status) where.status = status
      if (patientId) where.patientId = patientId as string

      const orders = await prisma.labOrder.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        include: {
          patient: { select: { mrn: true, fullName: true, phone: true } },
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
          results: { include: { testCatalog: true } },
        },
      })

      res.status(200).json({ success: true, data: orders })
    } catch (error) {
      next(error)
    }
  }

  // Record / Verify Lab Result
  static async recordResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultId = req.params.resultId as string
      const { resultValue, interpretation, isAbnormal } = req.body

      const result = await prisma.labResult.update({
        where: { id: resultId },
        data: {
          resultValue,
          interpretation,
          isAbnormal,
          status: 'VERIFIED',
          verifiedById: req.user?.userId,
          verifiedAt: new Date(),
        },
      })

      // Check if all results in the order are verified
      const unverifiedCount = await prisma.labResult.count({
        where: {
          labOrderId: result.labOrderId,
          status: 'PENDING',
        },
      })

      if (unverifiedCount === 0) {
        await prisma.labOrder.update({
          where: { id: result.labOrderId },
          data: { status: 'COMPLETED' },
        })
      }

      await logAuditEvent({
        action: 'LAB_RESULT_VERIFIED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'LabResult',
        entityId: result.id,
        details: { resultValue, isAbnormal },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: 'Lab result recorded and verified.',
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }
}
