import { Router } from 'express'
import {
  AppointmentController,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../controllers/appointment.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { validate } from '../middleware/validate'

const router = Router()
router.use(requireAuth)

// List doctors for scheduling
router.get('/doctors', AppointmentController.getDoctorsList)

// List appointments with date / doctor filters
router.get('/', AppointmentController.getAppointments)

// Book new appointment
router.post(
  '/',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validate(createAppointmentSchema),
  AppointmentController.createAppointment
)

// Update appointment status (Check-in, Complete, Cancel)
router.patch(
  '/:id/status',
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'),
  validate(updateAppointmentStatusSchema),
  AppointmentController.updateStatus
)

export const appointmentRoutes = router
