# Radiant Hospitals HMS - Visual Progress & Architecture Guide
**Hospital:** Radiant Hospital & Research Institute (RHRI), Bengaluru  
**Release Version:** `v1.0.0` (Production Hardened)  
**Repository:** [https://github.com/nadeemalam178/radiant-hospitals-hms](https://github.com/nadeemalam178/radiant-hospitals-hms)  
**Status:** All 9 Phases Completed & Pushed to GitHub (`dc3f7f9`)

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph LAN_Clients ["🏥 Hospital LAN Workstations (Port 4000)"]
        Desk["Reception & OPD Desks<br/>(Registration / Appointments)"]
        Doc["Doctor Consultation Rooms<br/>(EMR / Prescriptions)"]
        Nurse["Nursing Stations<br/>(Vitals / IPD Beds)"]
        Lab["Laboratory Stations<br/>(Diagnostics / Reports)"]
        Pharm["Pharmacy Dispensary<br/>(Formulary / Batches)"]
        Bill["Billing Counters<br/>(Invoices / Payments)"]
    end

    subgraph Host_Server ["🖥️ Host Server (Windows Server / 10 / 11)"]
        direction TB
        FW["Windows Firewall<br/>(Rule: Port 4000 Private/Domain)"]
        
        subgraph App_Server ["Node.js Express Application (Port 4000)"]
            Static["Compiled Frontend SPA<br/>(React 18 + Vite + Tailwind)"]
            Router["API Router (/api/v1)"]
            AuthSec["Auth & RBAC Middleware<br/>(JWT + UUID jti + Lockout)"]
            Audit["PII-Sanitized Audit Logger<br/>(Aadhaar Masked / Passwords Redacted)"]
            
            subgraph ABDM_Module ["ABDM Gateway Integration Engine"]
                Client["AbdmClient<br/>(v0.5 Protocol / Tokens)"]
                Service["AbdmService<br/>(M1 / M2 / M3 Workflows)"]
                Mock["AbdmMockProvider<br/>(GATED: Test Mode Only)"]
            end
        end

        subgraph DB ["PostgreSQL Database (Port 5432 - Internal Only)"]
            Prisma["Prisma ORM (27 Models)"]
            Migrate["Versioned Migrations<br/>(20261017000000_init_radiant_hms)"]
            Tables["Patients, Invoices, Admissions,<br/>AbdmTransactions, AuditLogs"]
        end
    end

    subgraph Govt_Cloud ["🇮🇳 National Health Authority (NHA) ABDM Gateway"]
        NHA_Sbx["ABDM Sandbox Gateway<br/>(https://dev.abdm.gov.in/gateway)"]
        NHA_Prod["ABDM Production Gateway<br/>(https://gateway.abdm.gov.in)"]
        PHR["Ayushman ABHA App<br/>(Patient PHR Records)"]
    end

    LAN_Clients -->|HTTP / JSON (LAN)| FW
    FW --> App_Server
    Static -.->|Serves UI to Browser| LAN_Clients
    Router --> AuthSec
    AuthSec --> ABDM_Module
    AuthSec --> Prisma
    Audit --> Prisma
    Prisma --> Tables
    Client -->|Encrypted HTTPS / TLS 1.3| NHA_Sbx
    Client -->|Encrypted HTTPS / TLS 1.3| NHA_Prod
    NHA_Sbx -->|Inbound Webhooks: Discover / Consent| Router
    PHR <--> NHA_Sbx
```

---

## 2. Before vs. After Transformation

```mermaid
graph LR
    subgraph Before ["❌ BEFORE (Simulated & Vulnerable)"]
        B1["Hybrid Confusion<br/>(Dead Next.js + Vite Root)"]
        B2["Two Conflicting<br/>Prisma Schemas"]
        B3["Fake ABHA Simulation<br/>(Hardcoded OTP 123456)"]
        B4["In-Memory OTP Store<br/>(Map - Lost on Restart)"]
        B5["Credential Leak<br/>(Dev .env in release ZIP)"]
        B6["Destructive DB Scripts<br/>(Wiped DB on every run)"]
    end

    subgraph After ["✅ AFTER (Production Hardened)"]
        A1["Unified Production Stack<br/>(Vite + Express on Port 4000)"]
        A2["One Authoritative Schema<br/>(27 Models + Versioned Migrations)"]
        A3["Real NHA ABDM Engine<br/>(Zero fake data in prod)"]
        A4["PostgreSQL Transactions<br/>(AbdmTransaction & AbdmConsent)"]
        A5["Sanitized Packaging<br/>(Clean .env.template, Zero Leaks)"]
        A6["Non-Destructive Init<br/>(Safe baseline init-hospital.ts)"]
    end

    B1 ==> A1
    B2 ==> A2
    B3 ==> A3
    B4 ==> A4
    B5 ==> A5
    B6 ==> A6
```

---

## 3. Real ABDM Milestone 1 & 2 Workflow Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 🧑 Patient (Ayushman Beneficiary)
    actor Staff as 👩‍⚕️ Hospital Staff (Reception / OPD)
    participant UI as 💻 Radiant HMS Frontend (SPA)
    participant API as ⚙️ Express Backend (AbdmService)
    participant DB as 🗄️ PostgreSQL (AbdmTransaction)
    participant NHA as 🏛️ NHA ABDM Gateway

    Note over Staff, NHA: MILESTONE 1 (M1): Official ABHA Identity Authentication
    Staff->>UI: Enter 10-Digit Mobile or 12-Digit Aadhaar
    UI->>API: POST /api/v1/abha/generate-otp
    API->>DB: Check active session / Log transaction attempt
    API->>NHA: POST /v0.5/users/auth/init (Purpose: KYC_AND_LINK)
    NHA-->>Patient: SMS with official 6-digit Govt OTP
    NHA-->>API: 200 OK (Transaction UUID)
    API->>DB: Record AbdmTransaction (Status: OTP_SENT, Masked Identifier)
    API-->>UI: OTP Dispatched Response
    
    Patient->>Staff: Provides SMS OTP
    Staff->>UI: Inputs 6-digit OTP
    UI->>API: POST /api/v1/abha/verify-otp (txnId, otp)
    API->>NHA: POST /v0.5/users/auth/confirm (txnId, authCode)
    NHA-->>API: Verified Demographics (14-Digit ABHA, Address, Name, Gender, DOB)
    API->>DB: Update AbdmTransaction (Status: VERIFIED)
    API->>DB: Link ABHA to Patient EMR Record (abhaStatus: VERIFIED)
    API-->>UI: Verified ABHA Profile & Digital QR Card

    Note over Staff, NHA: MILESTONE 2 (M2): Care Context Linking & Discovery
    Staff->>UI: Doctor Completes OPD Consultation
    UI->>API: POST /api/v1/abha/care-contexts (patientId, encounterNumber)
    API->>DB: Upsert AbhaCareContext (Status: LINKED, hipId: IN_RHRI_BLR_01)
    API->>NHA: POST /v0.5/links/context/notify (Push Care Context)
    NHA-->>API: 200 OK (Acknowledged)
    
    Note over Patient, API: Patient Searches Records on ABHA Mobile App
    Patient->>NHA: Search Radiant Hospital in PHR App
    NHA->>API: Webhook: POST /v0.5/care-contexts/discover
    API->>DB: Find Patient & Care Contexts by Mobile or ABHA
    API->>NHA: POST /v0.5/care-contexts/on-discover (Matching Care Contexts)
    NHA-->>Patient: Shows Radiant Hospital Consultations on Phone
```

---

## 4. Security & Privacy Architecture

```mermaid
graph TD
    subgraph Input ["Incoming Request"]
        Req["HTTP Request to Port 4000"]
    end

    subgraph Defense ["Security Layers"]
        H["Helmet Security Headers"]
        RL["IP Rate Limiter<br/>(100 req / 15 min per IP)"]
        CORS["Strict CORS Whitelist"]
        JWT["JWT Auth with UUID jti<br/>(Zero parallel collision)"]
        RBAC["Server-Side Role Guard<br/>(10 Distinct Hospital Roles)"]
        Lockout["Lockout Defense<br/>(Account locked after 5 failed attempts)"]
    end

    subgraph Sanitizer ["Privacy & Audit Filter"]
        AadhaarMask["Aadhaar Masker<br/>(XXXX-XXXX-1234)"]
        SecretRedact["Secret Redactor<br/>(Passwords, Tokens, OTPs -> [REDACTED])"]
        DBAudit["PostgreSQL AuditLog<br/>(Immutable Record)"]
    end

    Req --> H
    H --> RL
    RL --> CORS
    CORS --> JWT
    JWT --> RBAC
    JWT --> Lockout
    RBAC --> Sanitizer
    AadhaarMask --> DBAudit
    SecretRedact --> DBAudit
```

---

## 5. Windows Packaging & Automated Deployment Pipeline

```mermaid
graph LR
    subgraph Step1 ["1. Build"]
        B_Front["Frontend Build<br/>(Vite -> frontend/dist)"]
        B_Back["Backend Build<br/>(tsc -> backend/dist)"]
    end

    subgraph Step2 ["2. Staging & Sanitation"]
        Stage["Create Staging Folder"]
        CopyBin["Copy dist/ & migrations/"]
        Sanitize["CRITICAL: Copy .env.example<br/>as .env.template (NO DEV SECRETS)"]
    end

    subgraph Step3 ["3. ZIP Packaging"]
        Zip["Compress-Archive<br/>radiant-hms-v1.0.0.zip (426 KB)"]
    end

    subgraph Step4 ["4. Client Host Deployment"]
        Extract["Extract to C:\\RadiantHMS"]
        Install["Run scripts\\install-windows.bat<br/>(Migrate Deploy + Baseline Init)"]
        Firewall["Run scripts\\setup-firewall.bat<br/>(Open Port 4000 on LAN)"]
        Start["Run scripts\\start-hms.bat<br/>(Launch Express Server)"]
        Backup["Schedule scripts\\backup-db.bat<br/>(Daily 11 PM Automated Backup)"]
    end

    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
```

---

## 6. Execution Progress Summary

| Phase | Milestone Name | Key Accomplishments | Status |
|---|---|---|---|
| **Phase 1** | Repository Audit | Audited 60+ files, identified duplicate Next.js artifacts, simulated OTPs, and packaging flaws. Created `IMPLEMENTATION_GAP_REPORT.md`. | **100% Completed** |
| **Phase 2** | Clean Architecture | Removed obsolete Next.js root files. Established single Vite + Express + PostgreSQL stack. | **100% Completed** |
| **Phase 3** | Purge Fake ABDM | Removed hardcoded OTP `123456`, Math.random ABHA generator, and in-memory Map store. | **100% Completed** |
| **Phase 4** | Real ABDM Workflows | Implemented `AbdmClient`, `AbdmService`, PostgreSQL transaction models, and M1/M2/M3 webhooks. | **100% Completed** |
| **Phase 5** | Security Hardening | Implemented UUID `jti` in tokens, masked Aadhaar logging, production mock rejection, and rate limiting. | **100% Completed** |
| **Phase 6** | Database Integrity | Created versioned migrations (`20261017000000_init_radiant_hms`), guarded seed script, and built `init-hospital.ts`. | **100% Completed** |
| **Phase 7** | Automated Testing | Auth, Clinical, and ABDM test suites: **22 passed / 0 failed (100% pass rate)**. | **100% Completed** |
| **Phase 8** | Windows ZIP Packaging | Hardened packaging script, eliminated credential leaks, generated verified `radiant-hms-v1.0.0.zip` (426 KB). | **100% Completed** |
| **Phase 9** | Documentation Suite | Created Gap Report, ABDM Matrix, Test Report, Windows Guide, Readiness Checklist, and updated README. | **100% Completed** |
