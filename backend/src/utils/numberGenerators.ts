import { prisma } from '../config/db'

export async function generateMRN(): Promise<string> {
  const settings = await prisma.hospitalSettings.findFirst({
    select: { registrationPrefix: true },
  })
  const prefix = settings?.registrationPrefix || 'RAD'
  const year = new Date().getFullYear()

  // Count patients registered this year
  const startOfYear = new Date(year, 0, 1)
  const count = await prisma.patient.count({
    where: { createdAt: { gte: startOfYear } },
  })

  const seq = String(count + 1).padStart(5, '0')
  return `${prefix}-${year}-${seq}`
}

export async function generateInvoiceNumber(): Promise<string> {
  const settings = await prisma.hospitalSettings.findFirst({
    select: { invoicePrefix: true },
  })
  const prefix = settings?.invoicePrefix || 'INV'
  const year = new Date().getFullYear()
  const count = await prisma.invoice.count()
  const seq = String(count + 1).padStart(6, '0')
  return `${prefix}-${year}-${seq}`
}

export async function generateAppointmentNumber(): Promise<string> {
  const settings = await prisma.hospitalSettings.findFirst({
    select: { appointmentPrefix: true },
  })
  const prefix = settings?.appointmentPrefix || 'APT'
  const count = await prisma.appointment.count()
  const seq = String(count + 1).padStart(6, '0')
  return `${prefix}-${seq}`
}

export async function generateLabOrderNumber(): Promise<string> {
  const settings = await prisma.hospitalSettings.findFirst({
    select: { labOrderPrefix: true },
  })
  const prefix = settings?.labOrderPrefix || 'LAB'
  const count = await prisma.labOrder.count()
  const seq = String(count + 1).padStart(6, '0')
  return `${prefix}-${seq}`
}
