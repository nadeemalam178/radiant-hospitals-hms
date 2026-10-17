# Hospital Network Security & Hardening Checklist

This document details the security safeguards built into **Radiant Hospitals HMS** and guidance for securing on-premise hospital deployments.

---

## 1. Built-in Application Security Controls

| Security Feature | Implementation Detail |
| :--- | :--- |
| **Password Storage** | Hashed using **bcrypt** with 12 salt rounds. Plaintext passwords are never stored. |
| **Brute-Force Protection** | Endpoint rate-limiting on `/api/v1/auth/login` (10 attempts per 15-minute window). Automatic account lockout after 5 consecutive failed attempts. |
| **Authentication & Tokens** | Short-lived JWT access tokens with rotating database-tracked refresh tokens that can be revoked immediately on logout. |
| **RBAC Authorization** | Server-side role middleware enforced on every single protected API route (`requireRole`, `requirePermission`). |
| **Database Injection Protection** | 100% parameterized SQL queries generated through Prisma ORM. No raw string SQL concatenation. |
| **Network Isolation** | PostgreSQL port `5432` binds strictly to `127.0.0.1` (localhost). Client terminals cannot access the database directly. |
| **HTTP Security Headers** | Configured via **Helmet** to protect against clickjacking, MIME sniffing, and XSS. |
| **Audit Trail** | Sensitive actions (patient creation, status changes, bill finalization, login attempts) are permanently recorded in the `AuditLog` table. |

---

## 2. Hospital LAN Hardening Recommendations

1. **VLAN Segmentation:**
   - Place hospital staff computers and the HMS server on a dedicated private VLAN separate from public guest Wi-Fi.
2. **Static IP Configuration:**
   - Prevent IP conflicts by assigning a permanent static IP to the hospital host server.
3. **Restricted Windows Administrator Access:**
   - Only authorized hospital IT personnel should have administrator rights on the host server PC.
4. **Offline Air-Gap Safety:**
   - The application does not require internet access to function. If the hospital chooses to run completely offline (air-gapped), all features, fonts, and icons work without interruption.
5. **HTTPS via Self-Signed or Internal CA Certificate:**
   - For environments transmitting sensitive patient data over Wi-Fi, configure Nginx or Caddy on the host PC as a local TLS reverse proxy with a hospital-issued certificate.
