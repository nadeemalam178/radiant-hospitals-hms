# Release Notes: Radiant Hospitals HMS v1.0.0

## Production-Ready On-Premise Hospital Management System

**Release Date:** October 2026  
**Architecture:** Decoupled Monorepo (Express.js REST API + React Vite SPA + PostgreSQL + Prisma ORM)  
**Deployment Model:** On-Premise Single-Tenant Hospital Server (100% Offline-First)

---

## 1. Implemented Modules & Capabilities

### Core Infrastructure
- **Offline & LAN Operation:** Complete independence from cloud services, external CDNs, or Google Fonts. All assets, icons, and styling are bundled locally.
- **Single-Port LAN Serving:** Express serves the `/api/v1/*` REST API, Swagger docs at `/api/docs`, and the compiled React production SPA at `/*` on port 4000.
- **First-Run Wizard:** Secure setup wizard for new hospital installations (`/status` -> `/setup`) creating the hospital profile and initial master administrator without hardcoded passwords.
- **Role-Based Access Control (RBAC):** 10 distinct staff roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `NURSE`, `RECEPTIONIST`, `BILLING_OPERATOR`, `LAB_STAFF`, `PHARMACIST`, `INVENTORY_MANAGER`, `AUDITOR`).
- **Audit Logging:** Asynchronous logging of clinical, financial, and authentication operations to `AuditLog`.

### Functional Modules
1. **Dashboard:** Real database aggregations for patient counts, appointment breakdowns, IPD bed occupancy, financial collections, inventory warnings, and recent audit activity.
2. **Patient Management (EMR):** Unique MRN generation (`RAD-YYYY-XXXXX`), demographic intake, allergy alerts, search/pagination, duplicate detection, record merging, and print summary.
3. **Appointment Scheduling:** Doctor rosters, appointment booking, slot conflict prevention, and consultation workflows (`CONFIRMED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`).
4. **OPD Clinical Desk:** Encounter creation, clinical notes, patient vitals (BP, pulse, temp, spo2, weight), clinical diagnosis, and electronic prescription builder.
5. **IPD & Ward Management:** Ward allocations, visual bed occupancy floorplan (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`), admission workflows, bed transfers, and discharge summaries.
6. **Billing & Financials:** Configurable service catalog, invoice generation, payment reconciliation (Cash, UPI, Card, Net Banking), and printable receipts.
7. **Laboratory:** Pathology test catalog, test order generation, sample status tracking, result entry, abnormal flag alerts, and verification.
8. **Pharmacy & Stock Inventory:** Medicine formulary, batch-level consignment tracking, expiry monitoring, reorder thresholds, and stock adjustments.
9. **Reports & Analytics:** Financial collection breakdown by payment instrument, audit query window, and CSV export.
10. **Hospital Settings:** Organization profile, document numbering prefixes, system health diagnostics, and database configuration.

---

## 2. Windows Deployment Deliverables

- `scripts\install-windows.bat`: Validates Node.js & PostgreSQL, installs packages, and compiles production builds.
- `scripts\start-hms.bat`: Starts PostgreSQL service and the HMS web server on LAN port 4000.
- `scripts\stop-hms.bat`: Gracefully stops the hospital server.
- `scripts\backup-db.bat`: Automated timestamped database backups with 30-day rotation.
- `scripts\restore-db.bat`: Database restoration script with explicit user confirmation.
- `scripts\setup-firewall.bat`: Configures Windows Defender Firewall inbound rule for port 4000.
- `docker-compose.yml`: Optional containerized reproducible deployment.

---

## 3. Future Phase Roadmap: React Native Mobile App

The backend REST API is built in strict decoupled fashion using JSON request/response formats and standard JWT Bearer token authentication. In the next phase, a React Native (iOS/Android) mobile app can directly consume `/api/v1/*` without backend changes:
- Doctors can review schedules and patient records on mobile.
- Administrators can review daily hospital collection metrics on LAN Wi-Fi.
