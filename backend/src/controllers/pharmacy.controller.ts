import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { logAuditEvent } from '../utils/auditLogger'
import { MedicineForm, StockMovementType } from '@prisma/client'

export const createMedicineSchema = z.object({
  body: z.object({
    itemCode: z.string().min(2, 'Item code is required'),
    genericName: z.string().min(2, 'Generic name is required'),
    brandName: z.string().min(2, 'Brand name is required'),
    category: z.string().min(2, 'Category is required'),
    form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER']).default('TABLET'),
    strength: z.string().min(1, 'Strength is required (e.g. 500 mg)'),
    reorderLevel: z.number().int().min(1).default(20),
    unit: z.string().default('STRIP'),
  }),
})

export const receiveBatchSchema = z.object({
  body: z.object({
    medicineId: z.string().min(1, 'Medicine ID is required'),
    batchNumber: z.string().min(2, 'Batch number is required'),
    expiryDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Valid expiry date required'),
    purchaseRate: z.number().positive('Purchase rate must be positive'),
    saleRate: z.number().positive('Sale rate must be positive'),
    quantity: z.number().int().positive('Quantity must be greater than zero'),
    referenceId: z.string().optional(), // Purchase Order Number
  }),
})

export const adjustStockSchema = z.object({
  body: z.object({
    medicineId: z.string().min(1, 'Medicine ID is required'),
    batchId: z.string().optional(),
    movementType: z.enum(['ADJUSTMENT', 'RETURN_EXPIRED']),
    quantity: z.number().int(), // Negative to deduct, positive to add
    reason: z.string().min(3, 'Adjustment reason is required'),
  }),
})

export class PharmacyController {
  // Get Medicines Catalog with total stock & alerts
  static async getMedicines(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const medicines = await prisma.medicine.findMany({
        where: { status: 'ACTIVE' },
        include: {
          batches: {
            where: { quantityInStock: { gt: 0 } },
            orderBy: { expiryDate: 'asc' },
          },
        },
        orderBy: { brandName: 'asc' },
      })

      const now = new Date()
      const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

      const enriched = medicines.map(m => {
        const totalStock = m.batches.reduce((sum, b) => sum + b.quantityInStock, 0)
        const isLowStock = totalStock <= m.reorderLevel
        const nearExpiryBatch = m.batches.find(b => b.expiryDate <= ninetyDaysFromNow)

        return {
          ...m,
          totalStock,
          isLowStock,
          hasNearExpiry: !!nearExpiryBatch,
          earliestExpiry: m.batches[0]?.expiryDate || null,
        }
      })

      res.status(200).json({ success: true, data: enriched })
    } catch (error) {
      next(error)
    }
  }

  // Add new medicine to catalog
  static async createMedicine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body
      const medicine = await prisma.medicine.create({
        data: {
          ...data,
          form: data.form as MedicineForm,
        },
      })

      res.status(201).json({
        success: true,
        message: 'Medicine added to pharmacy catalog.',
        data: medicine,
      })
    } catch (error) {
      next(error)
    }
  }

  // Receive Stock Batch
  static async receiveBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, batchNumber, expiryDate, purchaseRate, saleRate, quantity, referenceId } = req.body

      const result = await prisma.$transaction(async tx => {
        // Upsert batch
        const batch = await tx.inventoryBatch.upsert({
          where: {
            medicineId_batchNumber: {
              medicineId,
              batchNumber,
            },
          },
          update: {
            quantityInStock: { increment: quantity },
            purchaseRate,
            saleRate,
            expiryDate: new Date(expiryDate),
          },
          create: {
            medicineId,
            batchNumber,
            expiryDate: new Date(expiryDate),
            purchaseRate,
            saleRate,
            quantityInStock: quantity,
          },
        })

        // Log Stock Movement
        const movement = await tx.stockMovement.create({
          data: {
            medicineId,
            batchId: batch.id,
            movementType: 'PURCHASE_RECEIPT',
            quantity,
            unitCost: purchaseRate,
            referenceId,
            reason: 'Purchase consignment receipt',
            performedById: req.user?.userId,
          },
        })

        return { batch, movement }
      })

      await logAuditEvent({
        action: 'STOCK_RECEIVED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'InventoryBatch',
        entityId: result.batch.id,
        details: { batchNumber, quantity, purchaseRate },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: `Received ${quantity} units into batch ${batchNumber}.`,
        data: result.batch,
      })
    } catch (error) {
      next(error)
    }
  }

  // Adjust Stock
  static async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicineId, batchId, movementType, quantity, reason } = req.body

      await prisma.$transaction(async tx => {
        if (batchId) {
          await tx.inventoryBatch.update({
            where: { id: batchId },
            data: { quantityInStock: { increment: quantity } },
          })
        }

        await tx.stockMovement.create({
          data: {
            medicineId,
            batchId: batchId || null,
            movementType: movementType as StockMovementType,
            quantity,
            reason,
            performedById: req.user?.userId,
          },
        })
      })

      res.status(200).json({
        success: true,
        message: 'Stock adjustment recorded successfully.',
      })
    } catch (error) {
      next(error)
    }
  }
}
