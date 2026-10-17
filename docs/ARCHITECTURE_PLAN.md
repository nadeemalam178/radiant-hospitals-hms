# Technical Architecture & Implementation Plan: Production-Ready On-Premise HMS

## 1. Executive Summary & Repository Inspection

### Current Repository State
- **Root Directory:** Currently holds the experimental Next.js 16 scaffold initialized during earlier discovery.
- **Prisma Database:** An initial draft schema (`prisma/schema.prisma`) exists with basic patient/doctor/appointment definitions.
- **Local Environment:** 
  - PostgreSQL 18.6 is installed, active, and running on port 5432 (`postgresql-x64-18` service).
  - Node.js LTS (v24.20) and npm (v11.19) are installed.
  - Vercel CLI and Git are installed.
- **Required Architectural Pivot:** 
  Per Section 3 of the specifications, the production on-premise system requires a decoupled, clean architecture:
  - **Frontend:** React + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query + React Hook Form + Zod.
  - **Backend:** Node.js + Express.js + TypeScript + Prisma ORM + Zod + Swagger + Winston Logger.
  - **Deployment Target:** Windows Server / Windows 10/11 Hospital Host PC on private LAN (100% offline-first, no external CDNs).

---

## 2. Target Project Architecture

```
Project Radiant Hospitals HMS/
├── backend/                       # Express.js + TypeScript + Prisma REST API
│   ├── src/
│   │   ├── config/                # Environment, Winston logger, database client, constants
│   │   ├── controllers/           # Auth, Patients, Appointments, OPD, IPD, Billing, Lab, Pharmacy, Reports, Settings
│   │   ├── middleware/            # JWT/Session authentication, RBAC authorization, rate limiting, request validation
│   │   ├── routes/                # Versioned API routes (/api/v1/...)
│   │   ├── services/              # Transactional business logic & domain services
│   │   ├── utils/                 # Password hashing (bcrypt/argon2), audit logger, token manager, MRN generator
│   │   ├── docs/                  # OpenAPI / Swagger specifications
│   │   ├── app.ts                 # Express app configuration & middleware
│   │   └── server.ts              # HTTP server & graceful shutdown
│   ├── prisma/                    # Schema with all 27 domain entities, migrations, seed script
│   ├── tests/                     # Integration and unit tests (Supertest + Vitest)
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/                      # React + Vite + TypeScript + Tailwind CSS SPA
│   ├── src/
│   │   ├── components/            # Reusable accessible UI: Sidebar, Header, Table, Modal, FormInput, Badge, Breadcrumb
│   │   ├── pages/                 # Dashboard, Patients, Appointments, OPD, IPD, Billing, Pharmacy, Lab, Reports, Settings
│   │   ├── services/              # API Client (Axios/fetch with interceptors & offline fallback)
│   │   ├── hooks/                 # Custom TanStack Query hooks for cache management
│   │   ├── context/               # AuthContext, HospitalSettingsContext, NotificationContext
│   │   ├── types/                 # Shared TypeScript interfaces
│   │   ├── App.tsx                # React Router root with Role-based Protected Routes
│   │   └── index.css              # Tailwind CSS & print-friendly styles
│   ├── public/                    # Bundled offline assets & local fonts (Zero external CDN calls)
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                       # Windows On-Premise Automation
│   ├── install-windows.bat        # Verifies Node.js, PostgreSQL, sets up database & dependencies
│   ├── start-hms.bat              # Launches backend and serves production frontend on LAN IP
│   ├── stop-hms.bat               # Gracefully terminates HMS processes
│   ├── backup-db.bat              # Scheduled pg_dump with timestamping, rotation & integrity check
│   ├── restore-db.bat             # Tested interactive database restoration script
│   └── setup-firewall.bat         # Configures Windows Defender Firewall for LAN access on port 4000
│
├── docs/                          # On-Premise Operational Documentation
│   ├── WINDOWS_LAN_DEPLOYMENT.md  # Step-by-step setup for hospital IT staff
│   ├── BACKUP_AND_DISASTER_RECOVERY.md # Full recovery SOP
│   ├── SECURITY_CHECKLIST.md      # Hospital network security guidelines
│   └── API_DOCUMENTATION.md       # API endpoint specification
│
├── docker-compose.yml             # Optional containerized reproducible deployment
├── package.json                   # Root workspace scripts to build & run both apps
└── .env.example                   # Clean template without secrets
```

---

## 3. Database Architecture (Prisma Relational Schema)

The database schema is strictly normalized, enforces foreign key constraints, indexes, timestamps, and auditability:

1. **Hospital & System Core:**
   - `HospitalSettings`: Single installation profile (Name, Code, Logo, Address, Phone, Email, Currency, Timezone, RegistrationPrefix).
   - `ApplicationSetting`: Key-value configuration for tax rates, invoice numbering, bed pricing.
   - `AuditLog`: Action, ActorId, EntityName, EntityId, Details, IPAddress, Timestamp.

2. **Access Control (RBAC):**
   - `User`: Email, PasswordHash, FullName, Phone, Status (ACTIVE/INACTIVE), FailedAttempts, LockoutUntil.
   - `Role`: 10 System Roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `BILLING_OPERATOR`, `LAB_STAFF`, `PHARMACIST`, `INVENTORY_MANAGER`, `AUDITOR`).
   - `UserRole`: Many-to-many relationship linking users to roles.
   - `RefreshToken`: Stored session tokens with revocation status and expiry.

3. **Clinical Core (Patients, Doctors, Staff):**
   - `Department`: Name, Code, Description, Status.
   - `StaffProfile`: User link, Department, Designation, EmployeeId, JoiningDate.
   - `DoctorProfile`: Staff link, Specialization, LicenseNumber, ConsultationFee, RoomNumber, ScheduleConfig.
   - `Patient`: Unique `mrn` (Medical Record Number, e.g., `RAD-2026-0001`), FullName, DOB, Gender, BloodGroup, Phone, EmergencyContact, Address, MergedIntoId (for record merging).

4. **Encounters & Clinical Care (OPD & IPD):**
   - `Appointment`: PatientId, DoctorId, DepartmentId, Date, SlotTime, Status (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`), CancellationReason.
   - `Encounter`: EncounterType (`OPD`, `IPD`, `EMERGENCY`), PatientId, DoctorId, StartTime, EndTime, Status.
   - `ClinicalNote`: EncounterId, ChiefComplaint, HistoryOfPresentIllness, Vitals (JSON: BP, Pulse, Temp, SpO2, Weight), Diagnosis (ICD-ready), ClinicalAdvice.
   - `Prescription`: EncounterId, DoctorId, PatientId, Instructions, ValidUntil.
   - `PrescriptionItem`: PrescriptionId, MedicineId, Dosage, Frequency, Duration, SpecialInstructions.
   - `Ward`: Name, WardType (`GENERAL`, `ICU`, `MATERNITY`, `SURGICAL`, `PRIVATE`), Capacity.
   - `Bed`: WardId, BedNumber, Status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `RESERVED`), DailyRate.
   - `Admission`: PatientId, BedId, AdmittedAt, DischargedAt, DoctorId, Status, AdmissionNotes, DischargeSummary.

5. **Financial Core (Billing & Payments):**
   - `ServiceCatalog`: ServiceCode, Name, DepartmentId, BasePrice, TaxPercent, Status.
   - `Invoice`: InvoiceNumber, PatientId, EncounterId, SubTotal, TaxAmount, DiscountAmount, TotalAmount, PaidAmount, BalanceAmount, Status (`DRAFT`, `FINALIZED`, `PAID`, `PARTIALLY_PAID`, `CANCELLED`).
   - `InvoiceItem`: InvoiceId, ServiceId/MedicineId, Description, Quantity, UnitPrice, TotalPrice.
   - `Payment`: InvoiceId, Amount, PaymentMethod (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `INSURANCE`), ReferenceNumber, ReceivedById, ReceivedAt.
   - `Refund`: PaymentId, Amount, Reason, ApprovedById, CreatedAt.

6. **Diagnostics & Pharmacy (Lab & Inventory):**
   - `LabTestCatalog`: TestCode, Name, Category, NormalRange, Unit, Cost.
   - `LabOrder`: EncounterId, PatientId, DoctorId, OrderDate, Status (`ORDERED`, `SAMPLE_COLLECTED`, `PROCESSING`, `VERIFIED`, `REJECTED`).
   - `LabResult`: LabOrderId, TestId, ResultValue, Interpretation, VerifiedById, VerifiedAt.
   - `Medicine`: GenericName, BrandName, Category, Form (`TABLET`, `SYRUP`, `INJECTION`, `OINTMENT`), ReorderLevel.
   - `InventoryBatch`: MedicineId, BatchNumber, ExpiryDate, PurchaseRate, SaleRate, QuantityInStock.
   - `StockMovement`: MedicineId, BatchId, MovementType (`PURCHASE_RECEIPT`, `DISPENSED`, `ADJUSTMENT`, `RETURN_EXPIRED`), Quantity, Reason, PerformedById.

---

## 4. Phased Implementation Roadmap

- [x] **Phase 1: Repository Inspection & Architectural Plan** (Completed).
- [ ] **Phase 2: Project Scaffold, Complete Prisma Schema & Security Core**
  - Scaffold `backend/` (Express + TypeScript + Zod + Winston + Supertest).
  - Scaffold `frontend/` (Vite + React + TypeScript + Tailwind CSS).
  - Write comprehensive `prisma/schema.prisma` with all 27 domain models.
  - Implement secure password hashing, JWT/Session auth, rate limiting, and RBAC middleware.
  - Implement initial First-Run Hospital Setup & Admin Account Initialization.
  - Write automated tests for Auth and RBAC.
- [ ] **Phase 3: Shared Accessible UI & Responsive Layout**
  - Implement desktop-first layout with collapsible sidebar, hospital branding top bar, user status.
  - Build reusable UI primitives: Data Table, Modal Dialog, Search/Filter Toolbar, Form controls, Badge indicators.
  - Configure print stylesheets for bills, prescriptions, and lab slips.
  - Implement TanStack Query client & Axios API service with local offline handling.
- [ ] **Phase 4: Patient Management, Appointments & Clinical (OPD/IPD)**
  - Patient registration with automatic MRN generation, search, duplication check, and print summary.
  - Appointment booking with conflict prevention and daily rosters.
  - Doctor profiles & OPD consultations (vitals, diagnoses, prescription builder).
  - IPD Ward & Bed occupancy dashboard with admission/discharge workflow.
- [ ] **Phase 5: Financial Billing, Pharmacy Inventory & Laboratory**
  - Service catalog, transactional invoice creation, receipt generation, payment recording.
  - Medicine inventory with batch tracking, expiry monitoring, and stock adjustment logs.
  - Lab test catalog, order workflow, result verification, and print-ready reports.
  - Hospital metrics & reports (daily collections, OPD counts, bed occupancy, inventory alerts).
- [ ] **Phase 6: Audit Logging, Disaster Recovery & Automated Tests**
  - Structured audit trail interceptor for all sensitive mutations.
  - Automated PostgreSQL backup & restore scripts with retention logic.
  - Comprehensive unit and integration test suite passing via Vitest.
- [ ] **Phase 7: Windows Production LAN Packaging & Installer**
  - Production build scripts (`install-windows.bat`, `start-hms.bat`, `setup-firewall.bat`).
  - Production static frontend served directly via Express (single-port LAN deployment on port 4000).
- [ ] **Phase 8: Documentation, Verification & Handover**
  - System deployment guide, backup SOP, security hardening checklist.
