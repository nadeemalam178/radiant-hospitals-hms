# Radiant Hospital & Research Institute - Hospital Management System (HMS)

A production-grade, offline-first on-premise **Hospital Management System (HMS)** designed for single hospital operations with full **Ayushman Bharat Digital Mission (ABDM / ABHA)** integration.

---

## 🏥 Modules & Capabilities

- **Single Hospital Core:** Dedicated to Radiant Hospital & Research Institute (`RHRI`), streamlined without multi-tenant overhead.
- **ABDM / ABHA Integration (M1 & M2):**
  - **Milestone 1 (M1):** 14-digit ABHA ID generation & OTP authentication (Aadhaar / Mobile), verification badges, and Digital ABHA Card generation with QR codes.
  - **Milestone 2 (M2):** Hospital Information Provider (HIP) care context linking for OPD consultations, diagnostic lab reports, and inpatient discharge summaries.
- **Patient Registry & EMR:** Automated MRN generation, demographics, vitals, drug allergy warnings, and duplicate patient record merging.
- **Outpatient Department (OPD):** Doctor consultations, token queuing, vitals capture, and digital prescription generation.
- **Inpatient Department (IPD):** Ward & bed allocation (General, ICU, Private Suites), doctor rounding notes, and admission/discharge workflows.
- **Billing & Invoicing:** Itemized bills with patient MRN and ABHA IDs, cash/card/UPI payment recording, and printable tax receipts.
- **Pharmacy & Stock:** 24/7 central dispensary inventory, batch numbers, expiry monitoring, and stock dispensing.
- **Laboratory (Pathology):** Diagnostic test catalog, sample tracking, technician result entry, and reference range validation.
- **Security & RBAC:** Role-Based Access Control with JWT authentication, audit trails, and rate limiting.

---

## 🏛️ Architecture Overview

```
├── frontend/             # React 18 + Vite + TypeScript + Tailwind CSS SPA
├── backend/              # Node.js + Express + TypeScript + Prisma ORM (PostgreSQL)
│   ├── prisma/seed.ts    # Comprehensive database reset & realistic dummy data seeder
│   └── tests/            # Automated Vitest test suite (Auth & ABHA endpoints)
├── scripts/              # Windows LAN deployment, backup, and service control scripts
└── docs/                 # Complete architecture, technical specs, security & user guides
```

---

## 🚀 Quick Start & Seed Setup

### 1. Database Setup & Seed
```bash
cd backend
npm install
npx prisma db push --force-reset
npm run prisma:seed
npm run dev
```
Backend runs at `http://localhost:4000`. Swagger API documentation is available at `http://localhost:4000/api-docs`.

### 2. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 🔑 Default Staff Credentials

The database comes pre-seeded with realistic Indian clinical dummy data and default staff accounts for testing:

| Role | Staff Name | Email | Password |
|---|---|---|---|
| **System Administrator** | Dr. Alok Verma | `admin@radiant.lan` | `Radiant@123` |
| **General Medicine Doctor** | Dr. Rajesh Sharma | `dr.sharma@radiant.lan` | `Doctor@123` |
| **Senior Cardiologist** | Dr. Priya Nair | `dr.priya@radiant.lan` | `Doctor@123` |
| **Orthopedic Surgeon** | Dr. Amit Verma | `dr.amit@radiant.lan` | `Doctor@123` |
| **Consultant Pediatrician** | Dr. Sneha Reddy | `dr.sneha@radiant.lan` | `Doctor@123` |
| **Head Nurse** | Sister Sunita Rao | `nurse.sunita@radiant.lan` | `Staff@123` |
| **Chief Pharmacist** | Vikram Joshi | `pharmacy@radiant.lan` | `Staff@123` |
| **Senior Lab Technologist**| Anjali Deshmukh | `lab@radiant.lan` | `Staff@123` |
| **Frontdesk Receptionist** | Manoj Kumar | `reception@radiant.lan` | `Staff@123` |
| **Senior Billing Officer** | Kavita Patel | `billing@radiant.lan` | `Staff@123` |

> [!NOTE]
> For ABDM OTP verification in test/sandbox mode, use test code: **`123456`**.

---

## 🖥️ Windows LAN Deployment

For hospital host PC deployment on a private local area network:
1. Run [`scripts/install-windows.bat`](file:///scripts/install-windows.bat) as Administrator.
2. Run [`scripts/start-hms.bat`](file:///scripts/start-hms.bat) to launch the unified server on port 4000.
3. Access from any workstation browser on LAN: `http://<HOST-IP>:4000`.
4. Run [`scripts/backup-db.bat`](file:///scripts/backup-db.bat) for automated database snapshots.

---

## 📄 License
Proprietary license for Radiant Hospital & Research Institute.
