# Backup & Disaster Recovery Standard Operating Procedure (SOP)

This document outlines the backup retention, disaster recovery, and verification protocols for **Radiant Hospitals HMS**.

---

## 1. Automated Daily Backup

### Script: `scripts\backup-db.bat`
- **Utility:** Uses PostgreSQL's native `pg_dump.exe`.
- **Destination:** `backups\radiant_hms_backup_YYYYMMDD_HHMMSS.sql`.
- **Retention:** Automatically prunes backup files older than 30 days.

### Setting up Scheduled Automatic Backups (Windows Task Scheduler)
1. Open **Windows Task Scheduler** (`taskschd.msc`).
2. Click **Create Basic Task...**
3. Name: `Radiant HMS Daily Backup`.
4. Trigger: **Daily** at **01:00 AM** (or non-peak hospital hours).
5. Action: **Start a program** -> Browse to `C:\RadiantHMS\scripts\backup-db.bat`.
6. Start in: `C:\RadiantHMS\scripts`.
7. Finish.

---

## 2. Off-Site / External Media Backup Rule (3-2-1 Strategy)

> [!CAUTION]
> Never keep your only backup on the same physical hard drive as the running PostgreSQL database. A drive failure will destroy both the live data and the backups!

### Recommended Practice:
1. Connect an external USB encrypted drive or secondary hospital Network Attached Storage (NAS).
2. Configure a scheduled batch sync or robocopy script to copy the contents of `C:\RadiantHMS\backups\` to the external drive:
   ```cmd
   robocopy C:\RadiantHMS\backups E:\Hospital_Backups\ /MIR /R:2 /W:5
   ```
3. Disconnect or rotate secondary media weekly.

---

## 3. Database Restoration Procedure

### Script: `scripts\restore-db.bat`

If your system experiences a hardware failure or data corruption:
1. Ensure the PostgreSQL service is active.
2. Double-click `scripts\restore-db.bat`.
3. Provide the full file path to the verified `.sql` backup file.
4. Type `RESTORE` when prompted to confirm.
5. The script overwrites the `radiant_hms` database with the exact snapshot from the backup.

### Verification After Restore
After restoring:
1. Log in to the application at `http://localhost:4000`.
2. Verify patient records in the EMR match expectations.
3. Check the audit log under **Hospital Settings** to verify historical continuity.

---

## 4. Disaster Recovery Checklist

- [ ] Uninterruptible Power Supply (UPS) tested and functional.
- [ ] Daily Task Scheduler backup verified weekly.
- [ ] At least one backup restored to a secondary test PC once per quarter to verify archive readability.
- [ ] Master database password stored in a secure hospital vault / safe.
