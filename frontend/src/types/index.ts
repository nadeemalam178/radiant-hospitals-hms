export type RoleName =
  | 'SYSTEM_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'BILLING_OPERATOR'
  | 'LAB_STAFF'
  | 'PHARMACIST'
  | 'INVENTORY_MANAGER'
  | 'AUDITOR'

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  roles: RoleName[]
  permissions?: string[]
}

export interface HospitalSettings {
  id?: string
  name: string
  code: string
  address: string
  phone: string
  email: string
  currency: string
  timezone: string
  registrationPrefix: string
  invoicePrefix: string
  appointmentPrefix: string
  labOrderPrefix: string
  taxPercentDefault: number
  facilityId?: string
  facilityName?: string
  hipId?: string
  abdmBridgeUrl?: string
}

export interface AbhaCareContext {
  id: string
  patientId: string
  referenceNumber: string
  display: string
  careContextType: string
  status: string
  hipId?: string
  linkedAt: string
}

export interface AbhaProfile {
  abhaNumber: string
  abhaAddress: string
  fullName: string
  gender: string
  dateOfBirth: string
  phone?: string
  aadhaarMasked?: string
  address?: string
  district?: string
  state?: string
  pincode?: string
  status: string
  kycVerified: boolean
  qrCodePayload?: string
}

export interface Patient {
  id: string
  mrn: string
  fullName: string
  dateOfBirth: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  bloodGroup?: string
  phone: string
  email?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  address?: string
  allergies?: string
  isArchived: boolean
  createdAt: string
  abhaNumber?: string
  abhaAddress?: string
  abhaStatus?: 'VERIFIED' | 'PENDING' | 'NOT_LINKED'
  aadhaarMasked?: string
  abhaDetails?: AbhaProfile | Record<string, unknown>
  careContexts?: AbhaCareContext[]
  _count?: {
    appointments: number
    encounters: number
    admissions: number
  }
}

export interface Doctor {
  id: string
  specialization: string
  licenseNumber: string
  consultationFee: number
  roomNumber?: string
  isAvailable: boolean
  staff: {
    id: string
    employeeId: string
    designation: string
    department?: { id: string; name: string }
    user: { fullName: string; email: string; phone?: string }
  }
}

export interface Appointment {
  id: string
  appointmentNumber: string
  patientId: string
  doctorId: string
  departmentId?: string
  appointmentDate: string
  slotTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'
  reason?: string
  cancellationReason?: string
  createdAt: string
  patient: { id: string; mrn: string; fullName: string; phone: string; gender: string }
  doctor: {
    staff: {
      designation: string
      user: { fullName: string }
    }
  }
  department?: { id: string; name: string }
}

export interface Ward {
  id: string
  name: string
  code: string
  wardType: 'GENERAL' | 'ICU' | 'MATERNITY' | 'SURGICAL' | 'PRIVATE'
  floor?: string
  totalBeds: number
  beds: Bed[]
}

export interface Bed {
  id: string
  wardId: string
  bedNumber: string
  dailyRate: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
  admissions?: Admission[]
}

export interface Admission {
  id: string
  admissionNumber: string
  patientId: string
  bedId: string
  attendingDoctorId: string
  admittedAt: string
  dischargedAt?: string
  status: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED'
  admissionDiagnosis: string
  dischargeSummary?: string
  patient?: { id: string; mrn: string; fullName: string; gender: string }
  bed?: { bedNumber: string; ward: { name: string } }
  attendingDoctor?: { staff: { user: { fullName: string } } }
}

export interface InvoiceItem {
  id?: string
  serviceId?: string
  medicineId?: string
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  totalPrice: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId: string
  patient: { mrn: string; fullName: string; phone: string }
  subTotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED'
  notes?: string
  createdAt: string
  items: InvoiceItem[]
  payments: { id: string; amount: number; paymentMethod: string; receivedAt: string }[]
}

export interface Medicine {
  id: string
  itemCode: string
  genericName: string
  brandName: string
  category: string
  form: string
  strength: string
  reorderLevel: number
  unit: string
  totalStock?: number
  isLowStock?: boolean
  hasNearExpiry?: boolean
  earliestExpiry?: string
}

export interface LabOrder {
  id: string
  orderNumber: string
  patientId: string
  patient: { mrn: string; fullName: string; phone: string }
  doctor: { staff: { user: { fullName: string } } }
  orderDate: string
  priority: string
  status: 'ORDERED' | 'SAMPLE_COLLECTED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  results: {
    id: string
    testCatalog: { name: string; testCode: string; normalRange?: string; unit?: string }
    resultValue?: string
    status: 'PENDING' | 'VERIFIED'
    isAbnormal: boolean
  }[]
}

export interface DashboardMetrics {
  patients: {
    total: number
    today: number
  }
  appointments: {
    total: number
    pending: number
    confirmed: number
    checkedIn: number
    completed: number
    cancelled: number
  }
  ipd: {
    admissions: number
    totalBeds: number
    occupiedBeds: number
    occupancyRate: string
  }
  financials: {
    todayCollections: number
    monthlyTotalBilled: number
    monthlyTotalPaid: number
    outstandingBalance: number
  }
  alerts: {
    lowStockMedicines: number
    nearExpiryBatches: number
    pendingLabOrders: number
  }
  recentActivity: {
    id: string
    action: string
    actorEmail?: string
    entityName: string
    createdAt: string
  }[]
}
