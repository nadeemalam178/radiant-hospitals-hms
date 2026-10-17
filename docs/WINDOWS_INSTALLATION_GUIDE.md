# Windows On-Premise Installation & Operations Guide
**Hospital:** Radiant Hospital & Research Institute (RHRI), Bengaluru  
**Release:** `radiant-hms-v1.0.0`  
**Deployment Model:** Single-Hospital On-Premise Local Server with LAN Workstations  
**Target OS:** Windows 10 / 11 Pro or Windows Server 2019 / 2022 (64-bit)

---

## 1. System Prerequisites

Before running the installation, ensure the server machine has the following software installed:

| Component | Minimum Required Version | Download / Installation Link | Purpose |
|---|---|---|---|
| **Operating System** | Windows 10/11 Pro or Windows Server 2019/2022 | N/A | Host operating system |
| **Node.js Runtime** | Node.js LTS v20.x or v22.x (64-bit) | [https://nodejs.org](https://nodejs.org) | Backend application server |
| **PostgreSQL Database** | PostgreSQL v15, v16, v17, or v18 | [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/) | Relational database engine |
| **RAM** | 8 GB minimum (16 GB recommended for 50+ concurrent LAN terminals) | N/A | Memory capacity |
| **Storage** | 50 GB available SSD space | N/A | Database records, backups, and logs |

> [!IMPORTANT]
> When installing PostgreSQL on Windows:
> - Note the master password you set for the `postgres` user.
> - Ensure the default port is `5432`.
> - Check that the PostgreSQL Windows Service is set to start automatically on system boot.

---

## 2. Extracting the Release Distribution Package

1. Copy the delivery file `radiant-hms-v1.0.0.zip` to your permanent hospital server drive (recommended: `C:\RadiantHMS` or `D:\RadiantHMS`).
2. Right-click the `.zip` file and select **Extract All...**.
3. You will have a clean folder structure containing:
   ```text
   RadiantHMS\
   ├── backend\
   │   ├── dist\              (Pre-compiled backend server)
   │   ├── prisma\
   │   │   ├── migrations\    (Versioned database migrations)
   │   │   ├── schema.prisma  (Authoritative database schema)
   │   │   └── init-hospital.ts (Safe non-destructive baseline initializer)
   │   ├── package.json
   │   └── .env.template      (Clean configuration template)
   ├── frontend\
   │   └── dist\              (Pre-compiled client SPA for LAN serving)
   ├── scripts\
   │   ├── install-windows.bat (Automated installer)
   │   ├── start-hms.bat      (Server startup launcher)
   │   ├── stop-hms.bat       (Clean server stop)
   │   ├── setup-firewall.bat (Firewall configuration for LAN)
   │   ├── backup-db.bat      (Automated database backup)
   │   └── restore-db.bat     (Database restoration utility)
   ├── docs\                  (Complete documentation suite)
   └── README.md
   ```

---

## 3. Configuration Setup (`.env`)

1. Inside the `backend\` folder, locate `.env.template`.
2. Rename or copy `.env.template` to `.env`.
3. Open `.env` in Notepad or your preferred text editor.
4. Update the `DATABASE_URL` with your local PostgreSQL password:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/radiant_hms?schema=public"
   ```
5. Generate two secure 32+ character random secret keys for JWT authentication:
   ```env
   JWT_SECRET="radiant_hospital_prod_jwt_secret_key_random_32_chars_minimum"
   JWT_REFRESH_SECRET="radiant_hospital_prod_refresh_secret_key_random_32_chars_minimum"
   ```
6. (Optional) If you have already received official ABDM credentials from NHA, configure them:
   ```env
   ABDM_CLIENT_ID="your_official_nha_client_id"
   ABDM_CLIENT_SECRET="your_official_nha_client_secret"
   ```
   *If you do not have NHA credentials yet, leave them blank. The HMS will operate normally for all internal clinical, billing, and lab workflows, and mark live ABDM Gateway operations as pending.*

---

## 4. Running the Automated Windows Installer

1. Open File Explorer and navigate to the `scripts\` folder.
2. Double-click `install-windows.bat`.
3. The installer automatically performs the following verified steps:
   - Verifies Node.js LTS is present.
   - Detects running PostgreSQL Windows services.
   - Installs production runtime dependencies (`npm install --omit=dev`).
   - Generates the Prisma client.
   - Deploys versioned migrations (`npx prisma migrate deploy`).
   - Executes non-destructive baseline initialization (`init-hospital.ts`):
     - Hospital profile for Radiant Hospital & Research Institute (`RHRI`).
     - Standard clinical, administrative, and inventory roles.
     - Core hospital departments.
     - Secure initial administrator account (`admin@radiant.lan`).

---

## 5. Configuring Windows Firewall for Hospital LAN Access

To allow receptionist desks, doctor consultation rooms, nursing stations, lab computers, and pharmacy terminals to connect across your local network:

1. In the `scripts\` folder, right-click `setup-firewall.bat`.
2. Select **Run as administrator**.
3. This creates an inbound firewall rule permitting TCP port `4000` exclusively on Private / Domain networks.
4. It ensures PostgreSQL port `5432` remains internal and restricted to the server host.

---

## 6. Starting the Hospital Management System

1. In the `scripts\` folder, double-click `start-hms.bat`.
2. The script:
   - Verifies the PostgreSQL database is active.
   - Starts the production Node.js Express server on port `4000`.
   - Automatically opens your default web browser to `http://localhost:4000`.
3. Log in with the initial administrator credentials:
   - **Email:** `admin@radiant.lan`
   - **Password:** `Radiant@123` *(or your configured `INITIAL_ADMIN_PASSWORD`)*
4. Immediately change this temporary password from the user settings menu.

### LAN Access for Other Hospital Computers
On any other computer connected to the hospital local network or Wi-Fi, open a modern web browser (Google Chrome, Microsoft Edge, or Mozilla Firefox) and navigate to:
```text
http://<SERVER_LAN_IP>:4000
```
*(Example: `http://192.168.1.100:4000`)*

---

## 7. Automated Backups & Disaster Recovery

### Automated Daily Database Backup
1. In `scripts\`, run `backup-db.bat` to create an immediate complete SQL dump in `backups\`.
2. To schedule automatic daily backups at 11:00 PM:
   - Open Windows **Task Scheduler**.
   - Click **Create Basic Task**.
   - Name: `Radiant HMS Daily Database Backup`.
   - Trigger: **Daily** at `23:00`.
   - Action: **Start a program** -> Browse to `C:\RadiantHMS\scripts\backup-db.bat`.
   - `backup-db.bat` automatically enforces a 30-day retention cleanup.

### Restoring from Backup
If hardware failure occurs or you need to restore previous data:
1. Double-click `scripts\restore-db.bat`.
2. Enter the full path of the `.sql` backup file.
3. Type `RESTORE` to confirm.

---

## 8. Stopping the Server
To cleanly stop the running server:
1. Double-click `scripts\stop-hms.bat`.
2. This cleanly terminates any process listening on port 4000.
