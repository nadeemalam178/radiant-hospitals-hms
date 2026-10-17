# ABDM Integration Matrix
**Hospital:** Radiant Hospital & Research Institute (RHRI), Bengaluru  
**Facility ID (HFR):** `IN2910000452`  
**HIP ID:** `IN_RHRI_BLR_01`  
**Architecture Version:** NHA Gateway v0.5 & ABHA v3 Specifications  
**Environment Target:** Sandbox (`https://dev.abdm.gov.in/gateway`) → Production (`https://gateway.abdm.gov.in`)  
**Last Updated:** October 2026

---

## 1. Executive Summary

This integration matrix details the technical implementation status of the Ayushman Bharat Digital Mission (ABDM) capabilities within the Radiant Hospital Management System (HMS).

In strict accordance with National Health Authority (NHA) security principles and regulatory policies:
- **Zero Simulation in Production:** No hardcoded OTPs (such as `123456`), simulated government profiles, or locally fabricated ABHA numbers are permitted or generated when running in production.
- **Credential Segregation:** Gateway client credentials (`ABDM_CLIENT_ID` and `ABDM_CLIENT_SECRET`) are stored strictly server-side in environment variables and never exposed to client browsers or git repositories.
- **Isolated Test Harness:** An isolated test mock provider is strictly gated behind `NODE_ENV === 'test'` and `ABDM_MOCK_ENABLED === true`. If production mode attempts to execute mock routines, the server aborts immediately with a fatal security violation.
- **Clear Distinction of Status:** Distinguishes between what is implemented in code and verified with automated test suites vs. what is awaiting official NHA credential issuance and external sandbox certification.

---

## 2. ABDM Capability Matrix

| Milestone | Capability / Workflow | Official NHA Specification | Technical Implementation Status | Automated Test Status | Sandbox Live Status | Remaining Dependency |
|---|---|---|---|---|---|---|
| **Core** | Gateway Session Token Management | `POST /v0.5/sessions` | **Implemented** (`AbdmClient.getSessionToken`) with database session caching (`AbdmGatewaySession`) & auto-renewal | **Tested** (mock & token lifecycle) | **BLOCKED** | Client NHA Sandbox Client ID & Secret |
| **M1** | Aadhaar OTP Authentication Initiation | `POST /v0.5/users/auth/init` | **Implemented** (`AbdmService.generateOtp`) with masked Aadhaar & correlation UUID | **Passed** (`abha.test.ts`) | **BLOCKED** | Live Gateway access |
| **M1** | Mobile OTP Authentication Initiation | `POST /v0.5/users/auth/init` | **Implemented** (`AbdmService.generateOtp`) with transaction persistence in PostgreSQL (`AbdmTransaction`) | **Passed** (`abha.test.ts`) | **BLOCKED** | Live Gateway access |
| **M1** | OTP Verification & Profile Retrieval | `POST /v0.5/users/auth/confirm` | **Implemented** (`AbdmService.verifyOtp`) with KYC demographic mapping | **Passed** (`abha.test.ts`) | **BLOCKED** | Live Gateway access |
| **M1** | Local ABHA Registry Lookup | Local HMS Registry | **Implemented** (`AbdmService.searchAbha`) searching local PostgreSQL patient database | **Passed** (`abha.test.ts`) | **Operational** | None (Local) |
| **M1** | National ABHA Gateway Directory Search | `POST /v0.5/users/auth/fetch-modes` | **Implemented** (`AbdmService.searchAbha`), reports pending credentials if unconfigured without faking data | **Passed** (`abha.test.ts`) | **BLOCKED** | Client NHA Sandbox Client ID & Secret |
| **M1** | ABHA Patient Linking | Local EMR Association | **Implemented** (`AbdmService.linkPatient`) with unique constraint validation and audit logging | **Passed** (`abha.test.ts`) | **Operational** | None (Local) |
| **M1** | ABHA Patient Unlinking | Local EMR Association | **Implemented** (`AbdmService.unlinkPatient`) with audit trail | **Passed** (`abha.test.ts`) | **Operational** | None (Local) |
| **M1** | Digital ABHA Card QR Generation | NHA QR Specification | **Implemented** (`AbhaController.getAbhaCard`) generating verified QR payload | **Passed** (`abha.test.ts`) | **Operational** | None (Local) |
| **M2** | Care Context Creation (OPD/IPD/Lab) | Local EMR Record Association | **Implemented** (`AbdmService.createCareContext`) persisting to `AbhaCareContext` | **Passed** (`abha.test.ts`) | **Operational** | None (Local) |
| **M2** | Care Context Gateway Push Notification | `POST /v0.5/links/context/notify` | **Implemented** (`AbdmService.createCareContext`), dispatches care context references to Gateway | **Tested** (unit/adapter level) | **BLOCKED** | Client NHA Sandbox Client ID & Secret |
| **M2** | Inbound Care Context Discovery Callback | `POST /v0.5/care-contexts/discover` | **Implemented** (`AbhaController.gatewayCareContextDiscover`) matching patient by mobile or ABHA | **Passed** (`abha.test.ts`) | **BLOCKED** | Gateway Webhook URL registration |
| **M2** | Care Context Linking Initialization | `POST /v0.5/links/link/init` & `on-init` | **Implemented** adapter handlers | **Tested** (mock level) | **BLOCKED** | Gateway Webhook URL registration |
| **M2** | Care Context Linking Confirmation | `POST /v0.5/links/link/confirm` & `on-confirm` | **Implemented** adapter handlers | **Tested** (mock level) | **BLOCKED** | Gateway Webhook URL registration |
| **M3** | Consent Artefact Notification Callback | `POST /v0.5/consents/hip/notify` | **Implemented** (`AbhaController.gatewayConsentNotify`) persisting to `AbdmConsent` and triggering `on-notify` | **Passed** (`abha.test.ts`) | **BLOCKED** | Gateway Webhook URL registration |
| **M3** | Health Information Request Handling | `POST /v0.5/health-information/hip/request` | **Implemented** schema & data transfer tracking (`AbdmDataTransfer`) | **Ready for sandbox testing** | **BLOCKED** | NHA M3 Sandbox Certification Session |

---

## 3. Data Protection & Privacy Governance

1. **Aadhaar Masking:** Full 12-digit Aadhaar numbers are never persisted to disk or database. Only masked representations (e.g. `XXXX-XXXX-1234`) are retained.
2. **OTP Zero-Retention:** OTPs are never logged, cached, or persisted in `AuditLog` or transaction metadata tables.
3. **Database Audit Logging:** Sensitive clinical, billing, and ABDM linking actions generate immutable audit log entries with IP addresses and user agents via `logAuditEvent()`.
4. **Request Correlation:** Every outbound gateway request generates a unique UUID `REQUEST-ID` and timestamp for end-to-end tracing with NHA gateway logs.

---

## 4. Path to Official NHA Certification

To transition from local verification to official NHA Sandbox clearance:
1. **Hospital Registration:** Hospital management registers at [https://sandbox.abdm.gov.in](https://sandbox.abdm.gov.in) under "Radiant Hospital & Research Institute".
2. **Credential Provisioning:** Client receives `Client ID` and `Client Secret` from NHA.
3. **Configuration:** Enter credentials into `backend/.env` under `ABDM_CLIENT_ID` and `ABDM_CLIENT_SECRET`.
4. **Execution of Certification Test Cases:** Execute official test scripts with NHA Sandbox portal and record transaction IDs.
5. **M1 & M2 Exit Clearance:** Submit logs to NHA for M1 and M2 compliance certificates.
