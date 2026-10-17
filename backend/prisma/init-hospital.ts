/**
 * Production-Safe Hospital Initialization Script
 * Non-destructive: Uses upsert to establish roles, permissions, departments, and hospital settings.
 * Safe for clean production installations and upgrades.
 */

import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🏥 Initializing Radiant Hospital & Research Institute baseline configuration...')

  // 1. Hospital Settings
  const hospital = await prisma.hospitalSettings.upsert({
    where: { code: 'RHRI' },
    update: {},
    create: {
      name: 'Radiant Hospital & Research Institute',
      code: 'RHRI',
      address: 'Plot No. 42, Health City, Outer Ring Road, Bengaluru, Karnataka 560103',
      phone: '+91 80 4912 3456 / +91 98450 12345',
      email: 'contact@radianthospitals.in',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      registrationPrefix: 'RAD',
      invoicePrefix: 'INV',
      appointmentPrefix: 'APT',
      labOrderPrefix: 'LAB',
      taxPercentDefault: 0.0,
      facilityId: 'IN2910000452',
      facilityName: 'Radiant Hospital & Research Institute',
      hipId: 'IN_RHRI_BLR_01',
      abdmBridgeUrl: 'https://dev.abdm.gov.in/gateway',
    },
  })
  console.log(`✓ Hospital Profile verified: ${hospital.name} (${hospital.code})`)

  // 2. Standard Roles
  const roles: Array<{ name: RoleName; displayName: string; description: string }> = [
    { name: 'SYSTEM_ADMIN', displayName: 'System Administrator', description: 'Full server, security, and administrative access' },
    { name: 'HOSPITAL_ADMIN', displayName: 'Hospital Administrator', description: 'Operational oversight and management' },
    { name: 'DOCTOR', displayName: 'Consulting Doctor', description: 'Clinical consultations, prescriptions, and orders' },
    { name: 'NURSE', displayName: 'Nursing Staff', description: 'Vitals tracking, bed management, and medication administration' },
    { name: 'RECEPTIONIST', displayName: 'Front Desk Receptionist', description: 'Patient registration, appointments, and check-in' },
    { name: 'BILLING_OPERATOR', displayName: 'Billing Officer', description: 'Invoices, payments, refunds, and receipts' },
    { name: 'LAB_STAFF', displayName: 'Laboratory Technician', description: 'Sample collection, analysis, and report generation' },
    { name: 'PHARMACIST', displayName: 'Pharmacist', description: 'Prescription dispensing and pharmacy inventory' },
    { name: 'INVENTORY_MANAGER', displayName: 'Inventory Manager', description: 'Stock receipts, batch tracking, and adjustments' },
    { name: 'AUDITOR', displayName: 'Compliance Auditor', description: 'Read-only audit and compliance inspection' },
  ]

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: { displayName: r.displayName, description: r.description },
      create: r,
    })
  }
  console.log(`✓ ${roles.length} Standard Roles configured`)

  // 3. Core Departments
  const departments = [
    { name: 'General Medicine', code: 'GENMED', description: 'Primary and internal medicine care' },
    { name: 'Cardiology', code: 'CARDIO', description: 'Heart and cardiovascular care' },
    { name: 'Orthopedics', code: 'ORTHO', description: 'Bone, joint, and trauma surgery' },
    { name: 'Pediatrics', code: 'PEDIA', description: 'Child and neonatal health' },
    { name: 'Obstetrics & Gynecology', code: 'OBGYN', description: 'Maternity and women health' },
    { name: 'Emergency & Trauma', code: 'EMERG', description: '24x7 emergency medical response' },
    { name: 'Laboratory & Pathology', code: 'LAB', description: 'Diagnostic pathology and testing' },
    { name: 'Pharmacy', code: 'PHARM', description: 'Hospital formulary and medication distribution' },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    })
  }
  console.log(`✓ ${departments.length} Core Departments configured`)

  // 4. Initial Administrator Account Check
  const adminUserCount = await prisma.user.count({
    where: {
      userRoles: {
        some: {
          role: { name: 'SYSTEM_ADMIN' },
        },
      },
    },
  })

  if (adminUserCount === 0) {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@radiant.lan'
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Radiant@123'
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    const sysAdminRole = await prisma.role.findUnique({ where: { name: 'SYSTEM_ADMIN' } })

    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        fullName: 'Hospital System Administrator',
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: sysAdminRole!.id,
          },
        },
      },
    })

    console.log('---------------------------------------------------------')
    console.log('🔐 Initial Administrator Account Created:')
    console.log(`   Email:    ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log('   IMPORTANT: Change this password immediately after first login.')
    console.log('---------------------------------------------------------')
  } else {
    console.log('✓ System Administrator account already exists in database.')
  }

  console.log('✨ Production initialization completed successfully.')
}

main()
  .catch(e => {
    console.error('Initialization error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
