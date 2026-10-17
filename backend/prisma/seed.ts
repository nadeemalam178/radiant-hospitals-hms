import { PrismaClient, Gender, RoleName, WardType, BedStatus, AdmissionStatus, AppointmentStatus, EncounterType, EncounterStatus, InvoiceStatus, PaymentMethod, LabOrderStatus, LabResultStatus, MedicineForm, StockMovementType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED_PURGE !== 'true') {
    console.error('❌ SAFETY ABORT: Refusing to run destructive development seed script in PRODUCTION environment!')
    console.error('For fresh production initialization, use: npm run prisma:init-hospital')
    process.exit(1)
  }

  console.log('🧹 Purging existing development database records...')

  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany()
  await prisma.abhaCareContext.deleteMany()
  await prisma.refund.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.labResult.deleteMany()
  await prisma.labOrder.deleteMany()
  await prisma.labTestCatalog.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.inventoryBatch.deleteMany()
  await prisma.prescriptionItem.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.clinicalNote.deleteMany()
  await prisma.encounter.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.admission.deleteMany()
  await prisma.bed.deleteMany()
  await prisma.ward.deleteMany()
  await prisma.serviceCatalog.deleteMany()
  await prisma.medicine.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.doctorProfile.deleteMany()
  await prisma.staffProfile.deleteMany()
  await prisma.department.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.userRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.user.deleteMany()
  await prisma.hospitalSettings.deleteMany()
  await prisma.applicationSetting.deleteMany()

  console.log('🏥 Initializing Single Hospital Profile (Radiant Hospital & Research Institute)...')
  const hospital = await prisma.hospitalSettings.create({
    data: {
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
      abdmBridgeUrl: 'https://dev.abdm.gov.in/gateway/v0.5',
    },
  })

  console.log('🛡️ Creating System Roles...')
  const rolesData: { name: RoleName; displayName: string; description: string }[] = [
    { name: 'SYSTEM_ADMIN', displayName: 'System Administrator', description: 'Full system configuration, database & user management' },
    { name: 'HOSPITAL_ADMIN', displayName: 'Hospital Administrator', description: 'Administrative oversight, staff, and hospital reporting' },
    { name: 'DOCTOR', displayName: 'Medical Doctor', description: 'OPD/IPD clinical examinations, diagnoses, and prescriptions' },
    { name: 'NURSE', displayName: 'Staff Nurse', description: 'Ward management, vitals monitoring, and inpatient care' },
    { name: 'RECEPTIONIST', displayName: 'Frontdesk Receptionist', description: 'Patient registration, ABHA linking, and appointments' },
    { name: 'BILLING_OPERATOR', displayName: 'Billing Officer', description: 'Invoicing, receipts, payment collection, and discharge bills' },
    { name: 'LAB_STAFF', displayName: 'Laboratory Technologist', description: 'Diagnostic sample processing, test results, and reports' },
    { name: 'PHARMACIST', displayName: 'Pharmacist', description: 'Medicine dispensing, inventory stock, and batch control' },
    { name: 'INVENTORY_MANAGER', displayName: 'Inventory Manager', description: 'Procurement, vendor batches, and stock management' },
    { name: 'AUDITOR', displayName: 'Compliance Auditor', description: 'Read-only access to audit trails and financial logs' },
  ]

  const rolesMap = new Map<RoleName, any>()
  for (const r of rolesData) {
    const createdRole = await prisma.role.create({ data: r })
    rolesMap.set(r.name, createdRole)
  }

  console.log('🏢 Creating Hospital Departments...')
  const deptGeneralMed = await prisma.department.create({
    data: { name: 'General Medicine', code: 'MED', description: 'Adult internal medicine, fever, diabetes & lifestyle diseases' },
  })
  const deptCardiology = await prisma.department.create({
    data: { name: 'Cardiology', code: 'CARD', description: 'Heart, hypertension, and cardiovascular care' },
  })
  const deptOrthopedics = await prisma.department.create({
    data: { name: 'Orthopedics & Joint Care', code: 'ORTHO', description: 'Bones, joints, fractures, and arthroscopy' },
  })
  const deptPediatrics = await prisma.department.create({
    data: { name: 'Pediatrics & Neonatology', code: 'PED', description: 'Child health, immunization, and pediatric medicine' },
  })
  const deptPathology = await prisma.department.create({
    data: { name: 'Pathology & Diagnostics', code: 'PATH', description: 'Hematology, biochemistry, and microbiology' },
  })
  const deptPharmacy = await prisma.department.create({
    data: { name: 'In-House Pharmacy', code: 'PHARM', description: '24/7 central dispensary and medical supplies' },
  })

  console.log('👨‍⚕️ Creating Hospital Staff & User Accounts...')
  const defaultAdminPass = await bcrypt.hash('Radiant@123', 10)
  const defaultDoctorPass = await bcrypt.hash('Doctor@123', 10)
  const defaultStaffPass = await bcrypt.hash('Staff@123', 10)

  // 1. Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@radiant.lan',
      fullName: 'Dr. Alok Verma (Medical Director)',
      phone: '+91 98450 11111',
      passwordHash: defaultAdminPass,
      userRoles: {
        create: [
          { roleId: rolesMap.get('SYSTEM_ADMIN')!.id },
          { roleId: rolesMap.get('HOSPITAL_ADMIN')!.id },
        ],
      },
      staffProfile: {
        create: {
          employeeId: 'EMP-ADM-001',
          designation: 'Medical Director & Administrator',
          departmentId: deptGeneralMed.id,
        },
      },
    },
  })

  // 2. Doctor - General Medicine
  const doctorMed = await prisma.user.create({
    data: {
      email: 'dr.sharma@radiant.lan',
      fullName: 'Dr. Rajesh Sharma',
      phone: '+91 98450 22221',
      passwordHash: defaultDoctorPass,
      userRoles: { create: [{ roleId: rolesMap.get('DOCTOR')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-DOC-001',
          designation: 'Senior Consultant Physician',
          departmentId: deptGeneralMed.id,
          doctorProfile: {
            create: {
              specialization: 'Internal Medicine (MD)',
              licenseNumber: 'KMC-19842',
              consultationFee: 600.0,
              roomNumber: 'OPD Room 101',
              isAvailable: true,
            },
          },
        },
      },
    },
    include: { staffProfile: { include: { doctorProfile: true } } },
  })

  // 3. Doctor - Cardiology
  const doctorCardio = await prisma.user.create({
    data: {
      email: 'dr.priya@radiant.lan',
      fullName: 'Dr. Priya Nair',
      phone: '+91 98450 22222',
      passwordHash: defaultDoctorPass,
      userRoles: { create: [{ roleId: rolesMap.get('DOCTOR')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-DOC-002',
          designation: 'Consultant Interventional Cardiologist',
          departmentId: deptCardiology.id,
          doctorProfile: {
            create: {
              specialization: 'Cardiology (DM, MCh)',
              licenseNumber: 'KMC-24190',
              consultationFee: 1000.0,
              roomNumber: 'OPD Room 204',
              isAvailable: true,
            },
          },
        },
      },
    },
    include: { staffProfile: { include: { doctorProfile: true } } },
  })

  // 4. Doctor - Orthopedics
  const doctorOrtho = await prisma.user.create({
    data: {
      email: 'dr.amit@radiant.lan',
      fullName: 'Dr. Amit Verma',
      phone: '+91 98450 22223',
      passwordHash: defaultDoctorPass,
      userRoles: { create: [{ roleId: rolesMap.get('DOCTOR')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-DOC-003',
          designation: 'Consultant Orthopedic Surgeon',
          departmentId: deptOrthopedics.id,
          doctorProfile: {
            create: {
              specialization: 'Orthopedics & Joint Surgery (MS)',
              licenseNumber: 'KMC-31852',
              consultationFee: 800.0,
              roomNumber: 'OPD Room 108',
              isAvailable: true,
            },
          },
        },
      },
    },
    include: { staffProfile: { include: { doctorProfile: true } } },
  })

  // 5. Doctor - Pediatrics
  const doctorPedia = await prisma.user.create({
    data: {
      email: 'dr.sneha@radiant.lan',
      fullName: 'Dr. Sneha Reddy',
      phone: '+91 98450 22224',
      passwordHash: defaultDoctorPass,
      userRoles: { create: [{ roleId: rolesMap.get('DOCTOR')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-DOC-004',
          designation: 'Consultant Pediatrician',
          departmentId: deptPediatrics.id,
          doctorProfile: {
            create: {
              specialization: 'Pediatrics (DNB, DCH)',
              licenseNumber: 'KMC-42918',
              consultationFee: 700.0,
              roomNumber: 'OPD Room 112',
              isAvailable: true,
            },
          },
        },
      },
    },
    include: { staffProfile: { include: { doctorProfile: true } } },
  })

  // 6. Receptionist
  const receptionist = await prisma.user.create({
    data: {
      email: 'reception@radiant.lan',
      fullName: 'Manoj Kumar',
      phone: '+91 98450 33331',
      passwordHash: defaultStaffPass,
      userRoles: { create: [{ roleId: rolesMap.get('RECEPTIONIST')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-REC-001',
          designation: 'Frontdesk Executive',
          departmentId: deptGeneralMed.id,
        },
      },
    },
  })

  // 7. Nurse
  const nurse = await prisma.user.create({
    data: {
      email: 'nurse.sunita@radiant.lan',
      fullName: 'Sister Sunita Rao',
      phone: '+91 98450 44441',
      passwordHash: defaultStaffPass,
      userRoles: { create: [{ roleId: rolesMap.get('NURSE')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-NUR-001',
          designation: 'Head Nursing Supervisor',
          departmentId: deptGeneralMed.id,
        },
      },
    },
  })

  // 8. Pharmacist
  const pharmacist = await prisma.user.create({
    data: {
      email: 'pharmacy@radiant.lan',
      fullName: 'Vikram Joshi',
      phone: '+91 98450 55551',
      passwordHash: defaultStaffPass,
      userRoles: { create: [{ roleId: rolesMap.get('PHARMACIST')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-PHM-001',
          designation: 'Chief Pharmacist',
          departmentId: deptPharmacy.id,
        },
      },
    },
  })

  // 9. Lab Technician
  const labTech = await prisma.user.create({
    data: {
      email: 'lab@radiant.lan',
      fullName: 'Anjali Deshmukh',
      phone: '+91 98450 66661',
      passwordHash: defaultStaffPass,
      userRoles: { create: [{ roleId: rolesMap.get('LAB_STAFF')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-LAB-001',
          designation: 'Senior Lab Technologist',
          departmentId: deptPathology.id,
        },
      },
    },
  })

  // 10. Billing Officer
  const billingOfficer = await prisma.user.create({
    data: {
      email: 'billing@radiant.lan',
      fullName: 'Kavita Patel',
      phone: '+91 98450 77771',
      passwordHash: defaultStaffPass,
      userRoles: { create: [{ roleId: rolesMap.get('BILLING_OPERATOR')!.id }] },
      staffProfile: {
        create: {
          employeeId: 'EMP-BIL-001',
          designation: 'Senior Billing Officer',
          departmentId: deptGeneralMed.id,
        },
      },
    },
  })

  console.log('🛏️ Creating Wards and Beds...')
  // Ward 1: General Male Ward
  const wardGMW = await prisma.ward.create({
    data: {
      name: 'General Male Ward',
      code: 'GMW',
      wardType: WardType.GENERAL,
      floor: '1st Floor - Wing A',
      totalBeds: 10,
    },
  })
  const bedsGMW = []
  for (let i = 1; i <= 10; i++) {
    const bed = await prisma.bed.create({
      data: {
        wardId: wardGMW.id,
        bedNumber: `GMW-${String(i).padStart(2, '0')}`,
        dailyRate: 1000.0,
        status: i === 1 ? BedStatus.OCCUPIED : BedStatus.AVAILABLE,
      },
    })
    bedsGMW.push(bed)
  }

  // Ward 2: General Female Ward
  const wardGFW = await prisma.ward.create({
    data: {
      name: 'General Female Ward',
      code: 'GFW',
      wardType: WardType.GENERAL,
      floor: '1st Floor - Wing B',
      totalBeds: 10,
    },
  })
  const bedsGFW = []
  for (let i = 1; i <= 10; i++) {
    const bed = await prisma.bed.create({
      data: {
        wardId: wardGFW.id,
        bedNumber: `GFW-${String(i).padStart(2, '0')}`,
        dailyRate: 1000.0,
        status: i === 2 ? BedStatus.OCCUPIED : BedStatus.AVAILABLE,
      },
    })
    bedsGFW.push(bed)
  }

  // Ward 3: ICU
  const wardICU = await prisma.ward.create({
    data: {
      name: 'Intensive Care Unit (ICU)',
      code: 'ICU',
      wardType: WardType.ICU,
      floor: '2nd Floor - Critical Care',
      totalBeds: 6,
    },
  })
  const bedsICU = []
  for (let i = 1; i <= 6; i++) {
    const bed = await prisma.bed.create({
      data: {
        wardId: wardICU.id,
        bedNumber: `ICU-${String(i).padStart(2, '0')}`,
        dailyRate: 4500.0,
        status: i === 1 ? BedStatus.OCCUPIED : BedStatus.AVAILABLE,
      },
    })
    bedsICU.push(bed)
  }

  // Ward 4: Private Deluxe
  const wardPVT = await prisma.ward.create({
    data: {
      name: 'Deluxe Private Suites',
      code: 'PVT',
      wardType: WardType.PRIVATE,
      floor: '3rd Floor - Executive Wing',
      totalBeds: 4,
    },
  })
  const bedsPVT = []
  for (let i = 1; i <= 4; i++) {
    const bed = await prisma.bed.create({
      data: {
        wardId: wardPVT.id,
        bedNumber: `PVT-${100 + i}`,
        dailyRate: 3200.0,
        status: i === 1 ? BedStatus.OCCUPIED : BedStatus.AVAILABLE,
      },
    })
    bedsPVT.push(bed)
  }

  console.log('💊 Populating Pharmacy Inventory & Batches...')
  const medicinesData = [
    { itemCode: 'MED-001', brandName: 'Dolo 650', genericName: 'Paracetamol', category: 'Analgesics / Antipyretic', form: MedicineForm.TABLET, strength: '650 mg', reorderLevel: 50, batchNo: 'DL-2026-A1', purRate: 18.0, saleRate: 32.0, qty: 650, expiry: new Date('2028-05-31') },
    { itemCode: 'MED-002', brandName: 'Augmentin 625 Duo', genericName: 'Amoxicillin + Potassium Clavulanate', category: 'Antibiotics', form: MedicineForm.TABLET, strength: '625 mg', reorderLevel: 30, batchNo: 'AG-8812', purRate: 110.0, saleRate: 185.0, qty: 320, expiry: new Date('2027-11-30') },
    { itemCode: 'MED-003', brandName: 'Telma 40', genericName: 'Telmisartan', category: 'Cardiovascular / Antihypertensive', form: MedicineForm.TABLET, strength: '40 mg', reorderLevel: 40, batchNo: 'TL-9021', purRate: 42.0, saleRate: 85.0, qty: 450, expiry: new Date('2028-08-31') },
    { itemCode: 'MED-004', brandName: 'Glycomet 500', genericName: 'Metformin Hydrochloride', category: 'Antidiabetic', form: MedicineForm.TABLET, strength: '500 mg', reorderLevel: 50, batchNo: 'GM-4420', purRate: 16.0, saleRate: 34.0, qty: 580, expiry: new Date('2028-03-31') },
    { itemCode: 'MED-005', brandName: 'Pan 40', genericName: 'Pantoprazole', category: 'Gastrointestinal (PPI)', form: MedicineForm.TABLET, strength: '40 mg', reorderLevel: 40, batchNo: 'PN-6712', purRate: 48.0, saleRate: 95.0, qty: 400, expiry: new Date('2028-09-30') },
    { itemCode: 'MED-006', brandName: 'Azithral 500', genericName: 'Azithromycin', category: 'Macrolide Antibiotic', form: MedicineForm.TABLET, strength: '500 mg', reorderLevel: 25, batchNo: 'AZ-3301', purRate: 65.0, saleRate: 120.0, qty: 240, expiry: new Date('2027-08-31') },
    { itemCode: 'MED-007', brandName: 'Monocef 1g Inj', genericName: 'Ceftriaxone Sodium', category: 'Cephalosporin Antibiotic', form: MedicineForm.INJECTION, strength: '1000 mg', reorderLevel: 20, batchNo: 'MN-1190', purRate: 40.0, saleRate: 75.0, qty: 180, expiry: new Date('2027-12-31') },
    { itemCode: 'MED-008', brandName: 'Atorva 20', genericName: 'Atorvastatin', category: 'Lipid Lowering / Statin', form: MedicineForm.TABLET, strength: '20 mg', reorderLevel: 30, batchNo: 'AT-5541', purRate: 75.0, saleRate: 145.0, qty: 310, expiry: new Date('2028-06-30') },
    { itemCode: 'MED-009', brandName: 'Emeset 4', genericName: 'Ondansetron', category: 'Antiemetic', form: MedicineForm.TABLET, strength: '4 mg', reorderLevel: 25, batchNo: 'EM-2291', purRate: 22.0, saleRate: 48.0, qty: 290, expiry: new Date('2028-04-30') },
    { itemCode: 'MED-010', brandName: 'Shelcal 500', genericName: 'Calcium + Vitamin D3', category: 'Nutritional Supplement', form: MedicineForm.TABLET, strength: '500 mg + 250 IU', reorderLevel: 40, batchNo: 'SH-8842', purRate: 55.0, saleRate: 110.0, qty: 420, expiry: new Date('2028-10-31') },
    { itemCode: 'MED-011', brandName: 'Ciplox Eye/Ear Drops', genericName: 'Ciprofloxacin', category: 'Ophthalmic / Otic', form: MedicineForm.DROPS, strength: '0.3% w/v', reorderLevel: 15, batchNo: 'CP-4411', purRate: 14.0, saleRate: 28.0, qty: 95, expiry: new Date('2027-04-30') },
    { itemCode: 'MED-012', brandName: 'Normal Saline 0.9% IV', genericName: 'Sodium Chloride IV Infusion', category: 'Intravenous Fluids', form: MedicineForm.INJECTION, strength: '500 ml', reorderLevel: 50, batchNo: 'NS-9910', purRate: 25.0, saleRate: 50.0, qty: 350, expiry: new Date('2029-01-31') },
  ]

  const medicinesMap = new Map<string, any>()
  for (const m of medicinesData) {
    const med = await prisma.medicine.create({
      data: {
        itemCode: m.itemCode,
        brandName: m.brandName,
        genericName: m.genericName,
        category: m.category,
        form: m.form,
        strength: m.strength,
        reorderLevel: m.reorderLevel,
        unit: 'STRIP',
        batches: {
          create: {
            batchNumber: m.batchNo,
            expiryDate: m.expiry,
            purchaseRate: m.purRate,
            saleRate: m.saleRate,
            quantityInStock: m.qty,
          },
        },
      },
      include: { batches: true },
    })
    medicinesMap.set(m.brandName, med)
  }

  console.log('🧪 Creating Diagnostic Laboratory Test Catalog...')
  const labTests = [
    { testCode: 'CBC-01', name: 'Complete Blood Count (CBC) with ESR', category: 'Hematology', normalRange: 'Hb: 13-17 g/dL, WBC: 4000-11000/cu.mm', unit: 'Comprehensive', price: 350.0 },
    { testCode: 'LIPID-01', name: 'Comprehensive Lipid Profile', category: 'Biochemistry', normalRange: 'Total Chol: <200, HDL: >40, Trig: <150', unit: 'mg/dL', price: 850.0 },
    { testCode: 'LFT-01', name: 'Liver Function Test (LFT)', category: 'Biochemistry', normalRange: 'SGOT: 15-40, SGPT: 10-49, Bilirubin: 0.2-1.2', unit: 'U/L & mg/dL', price: 750.0 },
    { testCode: 'KFT-01', name: 'Kidney Function Test (KFT / RFT)', category: 'Biochemistry', normalRange: 'Creatinine: 0.7-1.3, Urea: 15-45', unit: 'mg/dL', price: 650.0 },
    { testCode: 'HBA1C-01', name: 'Glycated Hemoglobin (HbA1c)', category: 'Biochemistry', normalRange: 'Normal: <5.7%, Pre-diabetic: 5.7-6.4%', unit: '%', price: 550.0 },
    { testCode: 'DENGUE-01', name: 'Dengue NS1 Antigen & IgM/IgG Antibody', category: 'Serology', normalRange: 'Negative / Non-reactive', unit: 'Index', price: 950.0 },
    { testCode: 'URINE-01', name: 'Urine Routine & Microscopic Examination', category: 'Clinical Pathology', normalRange: 'Pus cells: 0-5, Protein: Nil, Sugar: Nil', unit: 'Microscopy', price: 200.0 },
    { testCode: 'THYROID-01', name: 'Thyroid Panel (T3, T4, TSH)', category: 'Endocrinology', normalRange: 'TSH: 0.35-4.94 uIU/mL', unit: 'uIU/mL', price: 600.0 },
  ]

  const labCatalogMap = new Map<string, any>()
  for (const t of labTests) {
    const labTest = await prisma.labTestCatalog.create({ data: t })
    labCatalogMap.set(t.testCode, labTest)
  }

  console.log('🩺 Creating Hospital Service Catalog for Invoicing...')
  await prisma.serviceCatalog.createMany({
    data: [
      { serviceCode: 'SRV-OPD-GEN', name: 'OPD Consultation - General Medicine', category: 'CONSULTATION', basePrice: 600.0, departmentId: deptGeneralMed.id },
      { serviceCode: 'SRV-OPD-CARD', name: 'OPD Consultation - Cardiology Super-Specialist', category: 'CONSULTATION', basePrice: 1000.0, departmentId: deptCardiology.id },
      { serviceCode: 'SRV-OPD-ORTH', name: 'OPD Consultation - Orthopedic Specialist', category: 'CONSULTATION', basePrice: 800.0, departmentId: deptOrthopedics.id },
      { serviceCode: 'SRV-OPD-PED', name: 'OPD Consultation - Pediatrics', category: 'CONSULTATION', basePrice: 700.0, departmentId: deptPediatrics.id },
      { serviceCode: 'SRV-ECG-12L', name: '12-Lead Electrocardiogram (ECG)', category: 'PROCEDURE', basePrice: 400.0, departmentId: deptCardiology.id },
      { serviceCode: 'SRV-XRAY-CHEST', name: 'Digital X-Ray Chest (PA View)', category: 'RADIOLOGY', basePrice: 600.0, departmentId: deptGeneralMed.id },
      { serviceCode: 'SRV-BED-GEN', name: 'Daily Ward Bed Charge (General)', category: 'BED_CHARGE', basePrice: 1000.0 },
      { serviceCode: 'SRV-BED-ICU', name: 'Daily ICU Bed & Monitoring Charge', category: 'BED_CHARGE', basePrice: 4500.0 },
      { serviceCode: 'SRV-BED-PVT', name: 'Daily Deluxe Private Suite Charge', category: 'BED_CHARGE', basePrice: 3200.0 },
      { serviceCode: 'SRV-NURSING-CARE', name: 'Daily Inpatient Nursing Care Fee', category: 'NURSING', basePrice: 500.0 },
    ],
  })

  console.log('🇮🇳 Registering Patients with ABDM / ABHA IDs...')
  const patientsData = [
    {
      mrn: 'RAD-2026-0001',
      fullName: 'Ramesh Chandra Patel',
      dateOfBirth: new Date('1972-04-12'),
      gender: Gender.MALE,
      bloodGroup: 'B+',
      phone: '9845112233',
      email: 'ramesh.patel@gmail.com',
      emergencyContactName: 'Geeta Patel (Wife)',
      emergencyContactPhone: '9845112234',
      address: 'No. 14, 2nd Cross, Indira Nagar, Bengaluru',
      allergies: 'Penicillin (Severe Rash)',
      abhaNumber: '91-4521-8903-1284',
      abhaAddress: 'ramesh.patel@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-4521',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560038', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0002',
      fullName: 'Ananya Sharma',
      dateOfBirth: new Date('1994-08-22'),
      gender: Gender.FEMALE,
      bloodGroup: 'O+',
      phone: '9845223344',
      email: 'ananya.sharma@yahoo.co.in',
      emergencyContactName: 'Vikram Sharma (Brother)',
      emergencyContactPhone: '9845223345',
      address: 'Flat 302, Palm Meadows, Whitefield, Bengaluru',
      allergies: 'Sulfa Drugs',
      abhaNumber: '91-7812-4450-9921',
      abhaAddress: 'ananya.sharma@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-7812',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560066', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0003',
      fullName: 'Mohammed Rizwan Khan',
      dateOfBirth: new Date('1980-11-05'),
      gender: Gender.MALE,
      bloodGroup: 'A+',
      phone: '9845334455',
      email: 'rizwan.khan@outlook.com',
      emergencyContactName: 'Shabana Khan (Wife)',
      emergencyContactPhone: '9845334456',
      address: 'House 88, BTM Layout 2nd Stage, Bengaluru',
      allergies: 'None known',
      abhaNumber: '91-6623-1198-3341',
      abhaAddress: 'rizwan.khan@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-6623',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560076', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0004',
      fullName: 'Sunita Devi Yadav',
      dateOfBirth: new Date('1965-03-18'),
      gender: Gender.FEMALE,
      bloodGroup: 'AB+',
      phone: '9845445566',
      email: null,
      emergencyContactName: 'Rajesh Yadav (Son)',
      emergencyContactPhone: '9845445567',
      address: '52, Green Glen Layout, Bellandur, Bengaluru',
      allergies: 'Aspirin (Gastric irritation)',
      abhaNumber: '91-3345-7789-2210',
      abhaAddress: 'sunita.yadav@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-3345',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560103', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0005',
      fullName: 'Aarav Sundaram',
      dateOfBirth: new Date('2018-06-14'),
      gender: Gender.MALE,
      bloodGroup: 'O+',
      phone: '9845556677',
      email: 'sundaram.parents@gmail.com',
      emergencyContactName: 'K. Sundaram (Father)',
      emergencyContactPhone: '9845556678',
      address: 'Villa 12, Sobha Chrysanthemum, Thanisandra, Bengaluru',
      allergies: 'Peanuts',
      abhaNumber: '91-9981-2244-6632',
      abhaAddress: 'aarav.sundaram@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-9981',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560077', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0006',
      fullName: 'Deepak Kumar Verma',
      dateOfBirth: new Date('1997-09-30'),
      gender: Gender.MALE,
      bloodGroup: 'B-',
      phone: '9845667788',
      email: 'deepak.verma@techcorp.in',
      emergencyContactName: 'Pooja Verma (Sister)',
      emergencyContactPhone: '9845667789',
      address: 'Tower 4-802, Prestige Shantiniketan, ITPL, Bengaluru',
      allergies: 'None',
      abhaNumber: '91-5512-8877-4401',
      abhaAddress: 'deepak.verma@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-5512',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560048', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0007',
      fullName: 'Lakshmi Narayan Iyer',
      dateOfBirth: new Date('1954-12-08'),
      gender: Gender.FEMALE,
      bloodGroup: 'A+',
      phone: '9845778899',
      email: 'iyer.family@gmail.com',
      emergencyContactName: 'Ganesh Iyer (Son)',
      emergencyContactPhone: '9845778800',
      address: '22, Malleshwaram 7th Cross, Bengaluru',
      allergies: 'Ciprofloxacin',
      abhaNumber: '91-1190-3345-8822',
      abhaAddress: 'lakshmi.iyer@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-1190',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560003', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0008',
      fullName: 'Gurpreet Singh',
      dateOfBirth: new Date('1985-05-15'),
      gender: Gender.MALE,
      bloodGroup: 'O-',
      phone: '9845889900',
      email: 'gurpreet.singh@transport.in',
      emergencyContactName: 'Harpreet Kaur (Wife)',
      emergencyContactPhone: '9845889901',
      address: 'Plot 71, HSR Layout Sector 1, Bengaluru',
      allergies: 'Dust & Pollen Asthma',
      abhaNumber: '91-8844-1122-7790',
      abhaAddress: 'gurpreet.singh@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-8844',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560102', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0009',
      fullName: 'Pooja Kulkarni',
      dateOfBirth: new Date('1999-01-20'),
      gender: Gender.FEMALE,
      bloodGroup: 'B+',
      phone: '9845990011',
      email: 'pooja.kulkarni@gmail.com',
      emergencyContactName: 'Ashok Kulkarni (Father)',
      emergencyContactPhone: '9845990012',
      address: '4th Block, Koramangala, Bengaluru',
      allergies: 'None',
      abhaNumber: '91-2233-6677-9911',
      abhaAddress: 'pooja.kulkarni@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-2233',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560034', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0010',
      fullName: 'Suresh Babu Nair',
      dateOfBirth: new Date('1968-07-11'),
      gender: Gender.MALE,
      bloodGroup: 'AB-',
      phone: '9845001122',
      email: 'suresh.nair@kerala.org',
      emergencyContactName: 'Mini Nair (Wife)',
      emergencyContactPhone: '9845001123',
      address: '35, Defence Colony, Domlur, Bengaluru',
      allergies: 'Codeine',
      abhaNumber: '91-4455-9988-1122',
      abhaAddress: 'suresh.nair@abdm',
      abhaStatus: 'VERIFIED',
      aadhaarMasked: 'XXXX-XXXX-4455',
      abhaDetails: { state: 'Karnataka', district: 'Bengaluru Urban', pin: '560071', kycStatus: 'VERIFIED_AADHAAR' },
    },
    {
      mrn: 'RAD-2026-0011',
      fullName: 'Meera Sen',
      dateOfBirth: new Date('1987-10-25'),
      gender: Gender.FEMALE,
      bloodGroup: 'O+',
      phone: '9845119988',
      email: 'meera.sen@designstudio.in',
      emergencyContactName: 'Subhash Sen (Brother)',
      emergencyContactPhone: '9845119989',
      address: '2nd Main, Cambridge Layout, Ulsoor, Bengaluru',
      allergies: 'None',
      abhaNumber: null,
      abhaAddress: null,
      abhaStatus: 'NOT_LINKED', // Left unlinked for testing ABHA linking in UI
      aadhaarMasked: null,
      abhaDetails: undefined,
    },
  ]

  const patientsMap = new Map<string, any>()
  for (const p of patientsData) {
    const patient = await prisma.patient.create({ data: p })
    patientsMap.set(p.mrn, patient)
  }

  console.log('🔗 Creating ABDM Care Contexts (HIP Milestone 2 Records)...')
  const careContextsData = [
    { patientId: patientsMap.get('RAD-2026-0001')!.id, referenceNumber: 'ENC-2026-001', display: 'OPD Consultation - Dr. Rajesh Sharma (Diabetes & HTN)', careContextType: 'OPD_VISIT' },
    { patientId: patientsMap.get('RAD-2026-0001')!.id, referenceNumber: 'LAB-2026-001', display: 'Diagnostic Pathology - HbA1c & Lipid Profile', careContextType: 'DIAGNOSTIC_REPORT' },
    { patientId: patientsMap.get('RAD-2026-0002')!.id, referenceNumber: 'ENC-2026-002', display: 'OPD Consultation - Dr. Priya Nair (Cardiac Evaluation)', careContextType: 'OPD_VISIT' },
    { patientId: patientsMap.get('RAD-2026-0003')!.id, referenceNumber: 'ADM-2026-001', display: 'IPD Critical Care - ICU Admission Monitoring', careContextType: 'DISCHARGE_SUMMARY' },
    { patientId: patientsMap.get('RAD-2026-0004')!.id, referenceNumber: 'ENC-2026-003', display: 'OPD Orthopedics - Knee Arthroplasty Follow-up', careContextType: 'OPD_VISIT' },
    { patientId: patientsMap.get('RAD-2026-0005')!.id, referenceNumber: 'ENC-2026-004', display: 'Pediatric Well-Child Consultation - Dr. Sneha Reddy', careContextType: 'OPD_VISIT' },
  ]
  for (const cc of careContextsData) {
    await prisma.abhaCareContext.create({
      data: {
        patientId: cc.patientId,
        referenceNumber: cc.referenceNumber,
        display: cc.display,
        careContextType: cc.careContextType,
        status: 'LINKED',
        hipId: 'IN_RHRI_BLR_01',
      },
    })
  }

  console.log('📅 Creating Clinical Encounters, OPD Consultations & Prescriptions...')
  const docMedProfile = doctorMed.staffProfile!.doctorProfile!
  const docCardioProfile = doctorCardio.staffProfile!.doctorProfile!
  const docOrthoProfile = doctorOrtho.staffProfile!.doctorProfile!
  const docPediaProfile = doctorPedia.staffProfile!.doctorProfile!

  // Encounter 1: Ramesh Patel with Dr. Sharma (MED)
  const encounter1 = await prisma.encounter.create({
    data: {
      encounterNumber: 'ENC-2026-001',
      encounterType: EncounterType.OPD,
      patientId: patientsMap.get('RAD-2026-0001')!.id,
      doctorId: docMedProfile.id,
      status: EncounterStatus.CLOSED,
      clinicalNotes: {
        create: {
          chiefComplaint: 'Uncontrolled blood sugar levels for 2 weeks, frequent urination, mild fatigue',
          historyOfPresentIllness: 'Known case of Type 2 Diabetes Mellitus since 6 years. Currently on Metformin 500mg BD. Irregular dietary compliance.',
          vitals: { bp: '138/88 mmHg', pulse: 78, temp: '98.4 F', spo2: '98%', weight: '76 kg', bmi: '26.2' },
          diagnosis: 'Type 2 Diabetes Mellitus (Uncontrolled) with Grade-1 Essential Hypertension',
          clinicalAdvice: 'Strict diabetic diet, brisk walking 45 mins/day, monitor fasting & post-prandial blood glucose weekly.',
        },
      },
      prescriptions: {
        create: {
          prescriptionNumber: 'RX-2026-001',
          patientId: patientsMap.get('RAD-2026-0001')!.id,
          doctorId: docMedProfile.id,
          generalInstructions: 'Take medications with meals. Avoid skipping breakfast. Review in 1 month with FBS/PPBS.',
          items: {
            create: [
              { medicineId: medicinesMap.get('Glycomet 500')!.id, dosage: '500 mg', frequency: '1-0-1 (Twice daily after meals)', duration: '30 Days' },
              { medicineId: medicinesMap.get('Telma 40')!.id, dosage: '40 mg', frequency: '1-0-0 (Morning after breakfast)', duration: '30 Days' },
              { medicineId: medicinesMap.get('Pan 40')!.id, dosage: '40 mg', frequency: '1-0-0 (Empty stomach 30 mins before breakfast)', duration: '15 Days' },
            ],
          },
        },
      },
    },
  })

  // Encounter 2: Ananya Sharma with Dr. Priya Nair (Cardio)
  const encounter2 = await prisma.encounter.create({
    data: {
      encounterNumber: 'ENC-2026-002',
      encounterType: EncounterType.OPD,
      patientId: patientsMap.get('RAD-2026-0002')!.id,
      doctorId: docCardioProfile.id,
      status: EncounterStatus.ACTIVE,
      clinicalNotes: {
        create: {
          chiefComplaint: 'Intermittent chest palpitations, anxiety, and mild exertional breathlessness',
          historyOfPresentIllness: 'Symptoms triggered by work stress and high caffeine intake over past month. No history of syncope.',
          vitals: { bp: '122/80 mmHg', pulse: 92, temp: '98.6 F', spo2: '99%', weight: '58 kg' },
          diagnosis: 'Sinus Tachycardia secondary to stress/caffeine; rule out subclinical hyperthyroidism.',
          clinicalAdvice: 'ECG 12-Lead conducted: Normal sinus rhythm. Advised cutback on coffee and hydration.',
        },
      },
    },
  })

  console.log('🏥 Creating Inpatient Admissions (IPD)...')
  // Active Admission 1: Mohammed Rizwan Khan in ICU
  await prisma.admission.create({
    data: {
      admissionNumber: 'ADM-2026-001',
      patientId: patientsMap.get('RAD-2026-0003')!.id,
      bedId: bedsICU[0].id,
      attendingDoctorId: docCardioProfile.id,
      status: AdmissionStatus.ADMITTED,
      admissionDiagnosis: 'Acute Coronary Syndrome - Non-ST Elevation Myocardial Infarction (NSTEMI)',
      admittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  })

  // Active Admission 2: Sunita Devi Yadav in GFW
  await prisma.admission.create({
    data: {
      admissionNumber: 'ADM-2026-002',
      patientId: patientsMap.get('RAD-2026-0004')!.id,
      bedId: bedsGFW[1].id,
      attendingDoctorId: docOrthoProfile.id,
      status: AdmissionStatus.ADMITTED,
      admissionDiagnosis: 'Right Knee Severe Osteoarthritis - Day 2 Post Total Knee Arthroplasty (TKR)',
      admittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  })

  // Active Admission 3: Ramesh Chandra Patel in GMW
  await prisma.admission.create({
    data: {
      admissionNumber: 'ADM-2026-003',
      patientId: patientsMap.get('RAD-2026-0001')!.id,
      bedId: bedsGMW[0].id,
      attendingDoctorId: docMedProfile.id,
      status: AdmissionStatus.ADMITTED,
      admissionDiagnosis: 'Severe Dengue with Thrombocytopenia (Platelets 42,000/cu.mm)',
      admittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  })

  // Active Admission 4: Lakshmi Narayan Iyer in Private Suite
  await prisma.admission.create({
    data: {
      admissionNumber: 'ADM-2026-004',
      patientId: patientsMap.get('RAD-2026-0007')!.id,
      bedId: bedsPVT[0].id,
      attendingDoctorId: docMedProfile.id,
      status: AdmissionStatus.ADMITTED,
      admissionDiagnosis: 'Community Acquired Pneumonia with Exudative Pleural Effusion',
      admittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
  })

  console.log('🧪 Creating Diagnostic Lab Orders & Clinical Results...')
  // Lab Order 1: Ramesh Patel (CBC & HbA1c)
  const labOrder1 = await prisma.labOrder.create({
    data: {
      orderNumber: 'LAB-2026-0001',
      encounterId: encounter1.id,
      patientId: patientsMap.get('RAD-2026-0001')!.id,
      orderedById: docMedProfile.id,
      status: LabOrderStatus.COMPLETED,
      priority: 'ROUTINE',
      results: {
        create: [
          {
            testCatalogId: labCatalogMap.get('CBC-01')!.id,
            resultValue: 'Hb: 14.2, WBC: 8400, Platelets: 185000',
            unit: 'gm/dL & /cu.mm',
            normalRange: 'Hb: 13-17, WBC: 4000-11000',
            interpretation: 'Hematological parameters within normal clinical limits.',
            isAbnormal: false,
            status: LabResultStatus.VERIFIED,
            verifiedById: labTech.id,
            verifiedAt: new Date(),
          },
          {
            testCatalogId: labCatalogMap.get('HBA1C-01')!.id,
            resultValue: '8.4',
            unit: '%',
            normalRange: '< 5.7% (Good control < 7.0%)',
            interpretation: 'Suboptimal glycemic control over previous 90-day window.',
            isAbnormal: true,
            status: LabResultStatus.VERIFIED,
            verifiedById: labTech.id,
            verifiedAt: new Date(),
          },
        ],
      },
    },
  })

  // Lab Order 2: Ananya Sharma (Lipid Profile & Thyroid)
  await prisma.labOrder.create({
    data: {
      orderNumber: 'LAB-2026-0002',
      encounterId: encounter2.id,
      patientId: patientsMap.get('RAD-2026-0002')!.id,
      orderedById: docCardioProfile.id,
      status: LabOrderStatus.COMPLETED,
      priority: 'ROUTINE',
      results: {
        create: [
          {
            testCatalogId: labCatalogMap.get('LIPID-01')!.id,
            resultValue: 'Chol: 182, HDL: 52, LDL: 108, Trig: 130',
            unit: 'mg/dL',
            normalRange: 'Total Chol: <200, HDL: >40',
            interpretation: 'Desirable lipid parameters.',
            isAbnormal: false,
            status: LabResultStatus.VERIFIED,
            verifiedById: labTech.id,
            verifiedAt: new Date(),
          },
          {
            testCatalogId: labCatalogMap.get('THYROID-01')!.id,
            resultValue: 'TSH: 2.14, T3: 1.2, T4: 8.5',
            unit: 'uIU/mL',
            normalRange: 'TSH: 0.35-4.94',
            interpretation: 'Euthyroid state. Normal thyroid profile.',
            isAbnormal: false,
            status: LabResultStatus.VERIFIED,
            verifiedById: labTech.id,
            verifiedAt: new Date(),
          },
        ],
      },
    },
  })

  console.log('💰 Generating Hospital Invoices & Settle Payments...')
  // Invoice 1: Ramesh Patel OPD Consultation + Lab
  const inv1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      patientId: patientsMap.get('RAD-2026-0001')!.id,
      encounterId: encounter1.id,
      subTotal: 1500.0,
      taxAmount: 0.0,
      discountAmount: 100.0,
      totalAmount: 1400.0,
      paidAmount: 1400.0,
      balanceAmount: 0.0,
      status: InvoiceStatus.PAID,
      finalizedAt: new Date(),
      createdById: billingOfficer.id,
      items: {
        create: [
          { description: 'OPD Consultation - Dr. Rajesh Sharma (MD)', quantity: 1, unitPrice: 600.0, totalPrice: 600.0 },
          { description: 'Complete Blood Count (CBC) with ESR', quantity: 1, unitPrice: 350.0, totalPrice: 350.0 },
          { description: 'Glycated Hemoglobin (HbA1c)', quantity: 1, unitPrice: 550.0, totalPrice: 550.0 },
        ],
      },
      payments: {
        create: {
          paymentNumber: 'PAY-2026-0001',
          amount: 1400.0,
          paymentMethod: PaymentMethod.UPI,
          transactionReference: 'UPI-RAZOR-991204812394',
          notes: 'Google Pay UPI transaction verified',
          receivedById: billingOfficer.id,
        },
      },
    },
  })

  // Invoice 2: Ananya Sharma OPD
  const inv2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0002',
      patientId: patientsMap.get('RAD-2026-0002')!.id,
      encounterId: encounter2.id,
      subTotal: 2450.0,
      taxAmount: 0.0,
      discountAmount: 0.0,
      totalAmount: 2450.0,
      paidAmount: 2450.0,
      balanceAmount: 0.0,
      status: InvoiceStatus.PAID,
      finalizedAt: new Date(),
      createdById: billingOfficer.id,
      items: {
        create: [
          { description: 'Cardiology Super-Specialist Consultation - Dr. Priya Nair', quantity: 1, unitPrice: 1000.0, totalPrice: 1000.0 },
          { description: '12-Lead Electrocardiogram (ECG)', quantity: 1, unitPrice: 400.0, totalPrice: 400.0 },
          { description: 'Comprehensive Lipid Profile', quantity: 1, unitPrice: 850.0, totalPrice: 850.0 },
          { description: 'Blood Sample Collection & Phlebotomy Kit', quantity: 1, unitPrice: 200.0, totalPrice: 200.0 },
        ],
      },
      payments: {
        create: {
          paymentNumber: 'PAY-2026-0002',
          amount: 2450.0,
          paymentMethod: PaymentMethod.CARD,
          transactionReference: 'HDFC-POS-TXN-88129',
          notes: 'Visa Debit Card ending in 4129',
          receivedById: billingOfficer.id,
        },
      },
    },
  })

  // Invoice 3: Active IPD Interim Bill for Mohammed Rizwan Khan (Partially Paid)
  const inv3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0003',
      patientId: patientsMap.get('RAD-2026-0003')!.id,
      subTotal: 14500.0,
      taxAmount: 0.0,
      discountAmount: 500.0,
      totalAmount: 14000.0,
      paidAmount: 10000.0,
      balanceAmount: 4000.0,
      status: InvoiceStatus.PARTIALLY_PAID,
      finalizedAt: new Date(),
      createdById: billingOfficer.id,
      items: {
        create: [
          { description: 'ICU Critical Care Bed Charge (2 Days)', quantity: 2, unitPrice: 4500.0, totalPrice: 9000.0 },
          { description: 'Daily Cardiac Intensive Monitoring & Nursing', quantity: 2, unitPrice: 1500.0, totalPrice: 3000.0 },
          { description: 'Emergency Cardiac Enzymes (Troponin-I, CK-MB)', quantity: 1, unitPrice: 2500.0, totalPrice: 2500.0 },
        ],
      },
      payments: {
        create: {
          paymentNumber: 'PAY-2026-0003',
          amount: 10000.0,
          paymentMethod: PaymentMethod.CASH,
          transactionReference: 'CASH-REC-001',
          notes: 'Advance deposit received at admission desk',
          receivedById: billingOfficer.id,
        },
      },
    },
  })

  console.log('📅 Creating OPD Appointments Schedule...')
  const now = new Date()
  const todayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30)
  const todayAfternoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0)
  const tomorrowMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0)

  await prisma.appointment.createMany({
    data: [
      {
        appointmentNumber: 'APT-2026-001',
        patientId: patientsMap.get('RAD-2026-0001')!.id,
        doctorId: docMedProfile.id,
        departmentId: deptGeneralMed.id,
        appointmentDate: todayMorning,
        slotTime: '09:30 AM',
        status: AppointmentStatus.COMPLETED,
        reason: 'Monthly Diabetes & Hypertension Checkup',
      },
      {
        appointmentNumber: 'APT-2026-002',
        patientId: patientsMap.get('RAD-2026-0002')!.id,
        doctorId: docCardioProfile.id,
        departmentId: deptCardiology.id,
        appointmentDate: todayMorning,
        slotTime: '10:15 AM',
        status: AppointmentStatus.COMPLETED,
        reason: 'Palpitations & Cardiac Evaluation',
      },
      {
        appointmentNumber: 'APT-2026-003',
        patientId: patientsMap.get('RAD-2026-0005')!.id,
        doctorId: docPediaProfile.id,
        departmentId: deptPediatrics.id,
        appointmentDate: todayAfternoon,
        slotTime: '02:30 PM',
        status: AppointmentStatus.CONFIRMED,
        reason: 'Child Fever & Persistent Cough',
      },
      {
        appointmentNumber: 'APT-2026-004',
        patientId: patientsMap.get('RAD-2026-0006')!.id,
        doctorId: docOrthoProfile.id,
        departmentId: deptOrthopedics.id,
        appointmentDate: todayAfternoon,
        slotTime: '03:15 PM',
        status: AppointmentStatus.CHECKED_IN,
        reason: 'Acute Right Ankle Sprain (Sports Injury)',
      },
      {
        appointmentNumber: 'APT-2026-005',
        patientId: patientsMap.get('RAD-2026-0008')!.id,
        doctorId: docMedProfile.id,
        departmentId: deptGeneralMed.id,
        appointmentDate: tomorrowMorning,
        slotTime: '10:00 AM',
        status: AppointmentStatus.CONFIRMED,
        reason: 'Asthma Inhaler Refill & Wheezing Review',
      },
      {
        appointmentNumber: 'APT-2026-006',
        patientId: patientsMap.get('RAD-2026-0009')!.id,
        doctorId: docMedProfile.id,
        departmentId: deptGeneralMed.id,
        appointmentDate: tomorrowMorning,
        slotTime: '11:00 AM',
        status: AppointmentStatus.PENDING,
        reason: 'Severe Migraine Headache and Nausea',
      },
    ],
  })

  console.log('📜 Recording Audit Trail Logs...')
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'HOSPITAL_INITIALIZED',
        actorEmail: 'admin@radiant.lan',
        entityName: 'HospitalSettings',
        entityId: hospital.id,
        details: { name: hospital.name, code: hospital.code, facilityId: hospital.facilityId },
      },
      {
        action: 'ABHA_GATEWAY_CONFIGURED',
        actorEmail: 'admin@radiant.lan',
        entityName: 'ABDM',
        details: { facilityId: hospital.facilityId, hipId: hospital.hipId, bridgeUrl: hospital.abdmBridgeUrl },
      },
      {
        action: 'PATIENT_CREATED',
        actorEmail: 'reception@radiant.lan',
        entityName: 'Patient',
        entityId: patientsMap.get('RAD-2026-0001')!.id,
        details: { mrn: 'RAD-2026-0001', name: 'Ramesh Chandra Patel', abha: '91-4521-8903-1284' },
      },
      {
        action: 'ABHA_LINKED_TO_PATIENT',
        actorEmail: 'reception@radiant.lan',
        entityName: 'Patient',
        entityId: patientsMap.get('RAD-2026-0001')!.id,
        details: { abhaNumber: '91-4521-8903-1284', abhaAddress: 'ramesh.patel@abdm', status: 'VERIFIED' },
      },
      {
        action: 'PRESCRIPTION_DISPENSED',
        actorEmail: 'pharmacy@radiant.lan',
        entityName: 'Prescription',
        details: { prescriptionNumber: 'RX-2026-001', mrn: 'RAD-2026-0001' },
      },
      {
        action: 'INVOICE_SETTLED',
        actorEmail: 'billing@radiant.lan',
        entityName: 'Invoice',
        details: { invoiceNumber: 'INV-2026-0001', amount: 1400.0, method: 'UPI' },
      },
    ],
  })

  console.log('✅ Master Database Seed Completed Successfully!')
  console.log('==================================================================')
  console.log('🏥 Hospital: Radiant Hospital & Research Institute (RHRI)')
  console.log('🆔 ABDM Facility ID: IN2910000452 | HIP ID: IN_RHRI_BLR_01')
  console.log('------------------------------------------------------------------')
  console.log('🔑 Default Staff Credentials for Testing:')
  console.log('   👑 Administrator : admin@radiant.lan     / Radiant@123')
  console.log('   🩺 General Doctor: dr.sharma@radiant.lan  / Doctor@123')
  console.log('   ❤️ Cardiologist  : dr.priya@radiant.lan   / Doctor@123')
  console.log('   🦴 Orthopedic    : dr.amit@radiant.lan    / Doctor@123')
  console.log('   👶 Pediatrician  : dr.sneha@radiant.lan   / Doctor@123')
  console.log('   👩‍⚕️ Head Nurse    : nurse.sunita@radiant.lan / Staff@123')
  console.log('   💊 Pharmacist    : pharmacy@radiant.lan   / Staff@123')
  console.log('   🔬 Lab Tech      : lab@radiant.lan        / Staff@123')
  console.log('   📋 Receptionist  : reception@radiant.lan  / Staff@123')
  console.log('   💵 Billing Off.  : billing@radiant.lan    / Staff@123')
  console.log('==================================================================')
}

main()
  .catch(e => {
    console.error('❌ Seeding failed with error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
