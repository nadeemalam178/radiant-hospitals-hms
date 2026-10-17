# Radiant Hospital & Research Institute - Hospital Management System (HMS)

A production-grade, offline-first on-premise **Hospital Management System (HMS)** designed exclusively for single-hospital operations at **Radiant Hospital & Research Institute (`RHRI`), Bengaluru**, featuring real **Ayushman Bharat Digital Mission (ABDM / ABHA)** integration architecture.

---

## 🏥 Hospital Overview & Core Modules

- **Single Hospital Profile:** Configured exclusively for Radiant Hospital & Research Institute (HFR Facility ID: `IN2910000452`, HIP ID: `IN_RHRI_BLR_01`).
- **Real ABDM / ABHA Integration (M1 & M2):**
  - **Milestone 1 (M1):** 14-digit ABHA creation & authentication via official NHA Gateway (`/v0.5/users/auth/init` and `/v0.5/users/auth/confirm`), masked Aadhaar/mobile handling, transactional persistence in PostgreSQL, and Digital ABHA Card QR generation.
  - **Milestone 2 (M2):** Hospital Information Provider (HIP) care context linking for OPD consultations, diagnostic lab reports, and inpatient discharge summaries. Gateway discovery (`/v0.5/care-contexts/discover`) and push notifications (`/v0.5/links/context/notify`).
  - **Zero-Simulation Policy:** No hardcoded OTPs or simulated government data in production mode. Dedicated test mock provider strictly isolated behind `NODE_ENV=test` and `ABDM_MOCK_ENABLED=true`.
- **Patient Registry & EMR:** Automated MRN generation (`RAD-YYYYMM-XXXX`), demographics, vitals, drug allergy warnings, and duplicate patient record merging.
- **Outpatient Department (OPD):** Doctor consultations, token queuing, vitals capture, and digital prescription generation.
- **Inpatient Department (IPD):** Ward & bed allocation (General, ICU, Maternity, Surgical, Private Suites), doctor rounding notes, and admission/discharge workflows.
- **Billing & Invoicing:** Itemized bills with patient MRN and ABHA IDs, cash/card/UPI/insurance payment recording, and printable tax receipts.
- **Pharmacy & Stock:** 24/7 central dispensary inventory, batch numbers, expiry monitoring, and stock dispensing.
- **Laboratory (Pathology):** Diagnostic test catalog, sample tracking, technician result entry, and reference range validation.
- **Security & RBAC:** Role-Based Access Control with 10 hospital roles, JWT authentication with cryptographic `jti`, account lockout after 5 failed attempts, IP rate limiting, and privacy-conscious immutable audit logging.

---

## 🏛️ Architecture Overview

```text
├── frontend/             # React 18 + Vite + TypeScript + Tailwind CSS SPA
├── backend/              # Node.js + Express + TypeScript + Prisma ORM (PostgreSQL)
│   ├── prisma/
│   │   ├── schema.prisma # Authoritative Prisma database schema (27 models)
│   │   ├── migrations/   # Versioned production database migrations
│   │   ├── init-hospital.ts # Non-destructive baseline initializer
│   │   └── seed.ts       # Opt-in development dummy data seeder (protected in production)
│   ├── src/services/abdm # Official ABDM client, session manager, and service layer
│   └── tests/            # Automated Vitest test suite (Auth, Clinical, and ABDM)
├── scripts/              # Windows LAN deployment, packaging, backup, and service control scripts
└── docs/                 # Engineering audits, integration matrices, test reports, and manuals
```

---

## 📚 Technical Documentation

- **[Implementation Gap Report](file:///docs/IMPLEMENTATION_GAP_REPORT.md)** — Comprehensive repository audit, architecture analysis, and remediation records.
- **[ABDM Integration Matrix](file:///docs/ABDM_INTEGRATION_MATRIX.md)** — Milestone capabilities mapped to official NHA specifications, test status, and remaining dependencies.
- **[Test Report](file:///docs/TEST_REPORT.md)** — Automated test execution report (22 passed / 0 failed) and build validation.
- **[Windows Installation Guide](file:///docs/WINDOWS_INSTALLATION_GUIDE.md)** — Step-by-step hospital server deployment, LAN setup, firewall, and backup guide.
- **[Production Readiness Checklist](file:///docs/PRODUCTION_READINESS_CHECKLIST.md)** — Regulatory readiness status distinguishing local testing, sandbox clearance, and external certification.

---

## 🚀 Development Quick Start

### 1. Database Setup
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:init-hospital
```

*(Optional: For local development with synthetic dummy data, run `npm run prisma:seed`)*

### 2. Run Locally
```bash
# Terminal 1: Backend API (Port 4000)
npm run dev:backend

# Terminal 2: Frontend SPA (Port 5173)
npm run dev:frontend
```

---

## 🧪 Running Automated Tests

```bash
# Run full Vitest test suite (Auth, Clinical, ABDM)
npm test
```
*Current test suite status: 22 tests passing across 3 test files.*

---

## 🖥️ Windows On-Premise LAN Deployment

For hospital host PC deployment on a private local area network:
1. Extract `radiant-hms-v1.0.0.zip` to `C:\RadiantHMS`.
2. Configure `backend\.env` with PostgreSQL password.
3. Run `scripts\install-windows.bat` to deploy migrations and verify runtime.
4. Run `scripts\setup-firewall.bat` as Administrator to permit hospital LAN workstations.
5. Run `scripts\start-hms.bat` to launch the unified server on port 4000.
6. Access from any workstation browser on LAN: `http://<SERVER-LAN-IP>:4000`.
7. Schedule `scripts\backup-db.bat` in Windows Task Scheduler for daily 11:00 PM automated backups.

---

## 🔑 Default Baseline Administrator Credentials

Upon first initialization via `prisma:init-hospital`:
- **Email:** `admin@radiant.lan`
- **Initial Password:** `Radiant@123` *(Must be changed immediately upon first login)*

---

## 📦 Building the Distribution Release Package

To compile frontend assets, backend server, versioned migrations, and operations scripts into a clean Windows distribution ZIP archive:
```bash
cmd /c "scripts\package-release.bat"
```
The output package will be generated at `dist-release/radiant-hms-v1.0.0.zip`.

---

## 📄 License & Hospital Ownership
Developed for **Radiant Hospital & Research Institute (RHRI)**. Confidential and proprietary.
