# Radiant Hospitals - Hospital Management System (HMS)

A production-grade, on-premise and cloud-ready **Hospital Management System (HMS)** designed for reliable, offline-first hospital clinical and administrative workflows.

---

## 🏥 Modules & Features

- **Patient Management & MRN:** Automated generation of unique Medical Record Numbers, demographics, and medical history.
- **Outpatient Department (OPD):** Doctor consultations, token queuing, vitals capture, and digital prescriptions.
- **Inpatient Department (IPD):** Ward/bed allocation, daily doctor rounding logs, admission/discharge summaries.
- **Billing & Invoicing:** Itemized patient billing, payments, discounts, insurance, and printable receipt generation.
- **Pharmacy & Inventory:** Stock management, batch numbers, expiry tracking, and direct prescription dispensing.
- **Laboratory (Pathology):** Diagnostic test orders, sample tracking, lab technician result entry, and PDF report generation.
- **Security & RBAC:** Role-Based Access Control (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Accountant) with JWT authentication and audit trails.
- **Windows LAN Deployment:** Automated one-click batch scripts (`.bat`) for hospital host PC installation, firewall rules, automated backup, and restore routines.

---

## 🏛️ Architecture Overview

The system is engineered as a decoupled full-stack application:

```
├── frontend/             # React + Vite + TypeScript + Tailwind CSS SPA
├── backend/              # Node.js + Express + TypeScript + Prisma ORM (PostgreSQL)
├── scripts/              # Windows LAN deployment, backup, and service control scripts
├── docs/                 # Complete architecture, technical specs, security, & user guide
└── docker-compose.yml    # Containerized multi-service deployment
```

### Tech Stack
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, Winston Logger, Swagger / OpenAPI
- **Database:** PostgreSQL (with automated `pg_dump` backups and health checks)
- **Deployment:** Windows Server / Host PC on local network or Docker container

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/nadeemalam178/radiant-hospitals-hms.git
cd radiant-hospitals-hms
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npx prisma db push
npm run dev
```
Backend runs by default at `http://localhost:4000`. Swagger API documentation is available at `http://localhost:4000/api-docs`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs by default at `http://localhost:5173`.

---

## 🖥️ Windows On-Premise Deployment

For standalone hospital host PCs running Windows:

1. **Install Dependencies & Database:** Run [`scripts/install-windows.bat`](file:///scripts/install-windows.bat) as Administrator.
2. **Start Services:** Run [`scripts/start-hms.bat`](file:///scripts/start-hms.bat).
3. **Stop Services:** Run [`scripts/stop-hms.bat`](file:///scripts/stop-hms.bat).
4. **Automated Database Backup:** Run [`scripts/backup-db.bat`](file:///scripts/backup-db.bat).
5. **Interactive Database Restore:** Run [`scripts/restore-db.bat`](file:///scripts/restore-db.bat).

Detailed LAN deployment instructions are available in [`docs/WINDOWS_LAN_DEPLOYMENT.md`](file:///docs/WINDOWS_LAN_DEPLOYMENT.md).

---

## 📚 Documentation

- [Architecture Plan](docs/ARCHITECTURE_PLAN.md)
- [Client Technical Specifications & Delivery Guide](docs/CLIENT_TECHNICAL_SPEC_AND_DELIVERY_GUIDE.md)
- [Windows LAN Deployment](docs/WINDOWS_LAN_DEPLOYMENT.md)
- [Backup and Disaster Recovery](docs/BACKUP_AND_DISASTER_RECOVERY.md)
- [Security Checklist](docs/SECURITY_CHECKLIST.md)
- [Release Notes](docs/RELEASE_NOTES.md)

---

## 📄 License
Internal proprietary license for Radiant Hospitals.
