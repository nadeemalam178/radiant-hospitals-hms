import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../config/db'
import { generateAppointmentNumber } from '../utils/numberGenerators'
import { logAuditEvent } from '../utils/auditLogger'
import { AppointmentStatus } from '@prisma/client'

export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
    doctorId: z.string().min(1, 'Doctor ID is required'),
    departmentId: z.string().optional(),
    appointmentDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Valid appointment date required'),
    slotTime: z.string().min(1, 'Slot time is required (e.g. 10:30 AM)'),
    reason: z.string().optional(),
  }),
})

export const updateAppointmentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED']),
    cancellationReason: z.string().optional(),
  }),
})

export class AppointmentController {
  // Book Appointment
  static async createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId, doctorId, departmentId, appointmentDate, slotTime, reason } = req.body
      const parsedDate = new Date(appointmentDate)
      const dateOnly = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate())

      // Conflict Check: prevent double booking the same doctor on the same date and slot
      const existingConflict = await prisma.appointment.findFirst({
        where: {
          doctorId,
          appointmentDate: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
          },
          slotTime,
          status: { notIn: ['CANCELLED'] },
        },
        include: {
          doctor: { include: { staff: { select: { user: { select: { fullName: true } } } } } },
        },
      })

      if (existingConflict) {
        res.status(409).json({
          success: false,
          error: 'SLOT_CONFLICT',
          message: `Doctor ${existingConflict.doctor.staff.user.fullName} is already booked at ${slotTime} on this date. Please choose another slot.`,
        })
        return
      }

      const appointmentNumber = await generateAppointmentNumber()

      const appointment = await prisma.appointment.create({
        data: {
          appointmentNumber,
          patientId,
          doctorId,
          departmentId: departmentId || null,
          appointmentDate: dateOnly,
          slotTime,
          reason,
          status: 'PENDING',
        },
        include: {
          patient: { select: { fullName: true, mrn: true, phone: true } },
          doctor: { include: { staff: { select: { designation: true, user: { select: { fullName: true } } } } } },
          department: { select: { name: true } },
        },
      })

      await logAuditEvent({
        action: 'APPOINTMENT_SCHEDULED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Appointment',
        entityId: appointment.id,
        details: { appointmentNumber, slotTime },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(201).json({
        success: true,
        message: 'Appointment successfully scheduled.',
        data: appointment,
      })
    } catch (error) {
      next(error)
    }
  }

  // Get Appointments with filters
  static async getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, doctorId, departmentId, status, patientId } = req.query

      const where: any = {}
      if (date) {
        const d = new Date(date as string)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
        where.appointmentDate = { gte: start, lt: end }
      }
      if (doctorId) where.doctorId = doctorId as string
      if (departmentId) where.departmentId = departmentId as string
      if (status) where.status = status as AppointmentStatus
      if (patientId) where.patientId = patientId as string

      const appointments = await prisma.appointment.findMany({
        where,
        orderBy: [{ appointmentDate: 'asc' }, { slotTime: 'asc' }],
        include: {
          patient: { select: { id: true, mrn: true, fullName: true, phone: true, gender: true } },
          doctor: {
            include: {
              staff: {
                select: {
                  designation: true,
                  user: { select: { fullName: true } },
                },
              },
            },
          },
          department: { select: { id: true, name: true } },
        },
      })

      res.status(200).json({
        success: true,
        data: appointments,
      })
    } catch (error) {
      next(error)
    }
  }

  // Update Status
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string
      const { status, cancellationReason } = req.body

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: status as AppointmentStatus,
          cancellationReason: status === 'CANCELLED' ? cancellationReason : undefined,
        },
      })

      await logAuditEvent({
        action: 'APPOINTMENT_STATUS_CHANGED',
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        entityName: 'Appointment',
        entityId: id,
        details: { newStatus: status, cancellationReason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      res.status(200).json({
        success: true,
        message: `Appointment status updated to ${status}.`,
        data: updated,
      })
    } catch (error) {
      next(error)
    }
  }

  // Doctor list for appointment booking
  static async getDoctorsList(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const doctors = await prisma.doctorProfile.findMany({
        where: { isAvailable: true },
        include: {
          staff: {
            select: {
              id: true,
              employeeId: true,
              designation: true,
              department: { select: { id: true, name: true } },
              user: { select: { fullName: true, email: true, phone: true } },
            },
          },
        },
      })

      res.status(200).json({
        success: true,
        data: doctors,
      })
    } catch (error) {
      next(error)
    }
  }
}
