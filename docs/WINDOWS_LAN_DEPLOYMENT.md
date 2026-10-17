# Windows On-Premise LAN Deployment Guide

This guide is designed for Hospital IT Administrators setting up **Radiant Hospitals HMS** on an on-premise Windows server or hospital desktop PC.

---

## 1. System Requirements

### Hospital Host PC (Server)
- **Operating System:** Windows 10 Pro / Enterprise (64-bit), Windows 11 Pro, or Windows Server 2016/2019/2022.
- **CPU:** 4 Cores or higher recommended.
- **RAM:** Minimum 8 GB (16 GB recommended for 50+ concurrent LAN terminals).
- **Disk:** SSD with at least 50 GB free space.
- **Network:** Static LAN IP address assigned via DHCP reservation or manual configuration.
- **Power:** Uninterruptible Power Supply (UPS) connected to prevent database corruption during power outages.

### Client Computers (Reception, Doctor Desks, Pharmacy, Labs)
- Any modern web browser: Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.
- No software installation is needed on client computers. Access is 100% web-based.

---

## 2. Prerequisites Installation

1. **Install PostgreSQL 16 or 18 (x64):**
   - Download from: https://www.postgresql.org/download/windows/
   - Note the master password you set for the `postgres` user during setup.
   - Verify the service `postgresql-x64-18` is running in `services.msc`.
2. **Install Node.js LTS (v20 or newer):**
   - Download from: https://nodejs.org/
   - Ensure the "Add to PATH" option is selected.

---

## 3. Installation Steps

1. **Extract or Clone the Application:**
   Place the project folder on your server (e.g., `C:\RadiantHMS\`).
2. **Configure Database Connection:**
   Open `.env` in the root folder and provide your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/radiant_hms?schema=public"
   PORT=4000
   ```
3. **Run the Automated Installer:**
   - Double-click `scripts\install-windows.bat`.
   - The installer verifies Node.js and PostgreSQL, installs dependencies, generates Prisma client models, and compiles the production frontend and backend bundles.
4. **Push Database Schema:**
   Open PowerShell in `backend` and run:
   ```powershell
   npx prisma db push
   ```
   This automatically creates all 27 hospital tables in your local database.

---

## 4. LAN Network & Firewall Setup

To allow other computers on the hospital network to open the application:

1. **Assign a Static IP to the Server:**
   Example: `192.168.1.100`.
2. **Open Port 4000 on Windows Firewall:**
   Right-click `scripts\setup-firewall.bat` and select **Run as administrator**.
   *(This opens TCP port 4000 for LAN clients while keeping PostgreSQL port 5432 safely blocked from external computers).*
3. **Verify Client Access:**
   From any reception or doctor desk computer, open a web browser and navigate to:
   ```
   http://192.168.1.100:4000
   ```

---

## 5. Daily Operation

### Starting the System
Double-click `scripts\start-hms.bat`.
- Automatically ensures PostgreSQL is active.
- Launches the single-port production server.
- Opens the local browser at `http://localhost:4000`.

### Stopping the System
Double-click `scripts\stop-hms.bat`.
- Gracefully disconnects database sessions and stops the server.

### Automatic Startup on Windows Boot
To start Radiant HMS automatically when the server boots:
1. Press `Win + R`, type `shell:startup`, and press Enter.
2. Create a shortcut to `scripts\start-hms.bat` in this folder.
