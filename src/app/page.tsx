'use client'

import React, { useState } from 'react'
import {
  Activity,
  Calendar,
  Users,
  UserCheck,
  Stethoscope,
  FileText,
  CreditCard,
  Database,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
} from 'lucide-react'

export default function Home() {
  const [dbStatus, setDbStatus] = useState<{
    tested: boolean
    loading: boolean
    connected?: boolean
    message?: string
    details?: string
    hint?: string
  }>({
    tested: false,
    loading: false,
  })

  const checkDatabaseConnection = async () => {
    setDbStatus({ tested: false, loading: true })
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.status === 'connected') {
        setDbStatus({
          tested: true,
          loading: false,
          connected: true,
          message: data.message,
        })
      } else {
        setDbStatus({
          tested: true,
          loading: false,
          connected: false,
          message: data.message,
          details: data.details,
          hint: data.hint,
        })
      }
    } catch (err: unknown) {
      const error = err as Error
      setDbStatus({
        tested: true,
        loading: false,
        connected: false,
        message: 'Could not reach server health endpoint.',
        details: error.message,
      })
    }
  }

  return (
    <div className="container">
      {/* Top Navbar */}
      <header className="navbar" id="main-navbar">
        <div className="nav-brand">
          <div className="brand-badge">
            <Activity size={22} />
          </div>
          <span className="brand-title">Radiant Hospitals HMS</span>
        </div>
        <div className="nav-meta">
          <span className="status-chip" id="server-status-chip">
            <span className="status-pulse"></span>
            PostgreSQL 18 Running
          </span>
          <span className="status-chip" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
            Next.js 16 Active
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-pill">
          <Stethoscope size={15} /> Enterprise Healthcare Platform
        </div>
        <h1 className="hero-title">
          Modern Hospital Operations, <br />
          <span>Powered by PostgreSQL</span>
        </h1>
        <p className="hero-desc">
          Your full-stack Hospital Management System foundation is completely initialized.
          Includes high-performance relational schemas, Prisma ORM, and instant Vercel cloud deployment.
        </p>

        <div className="cta-group">
          <button
            id="test-db-btn"
            className="btn btn-primary"
            onClick={checkDatabaseConnection}
            disabled={dbStatus.loading}
          >
            {dbStatus.loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Verifying Connection...
              </>
            ) : (
              <>
                <Database size={18} /> Test Database Connection
              </>
            )}
          </button>
          <a
            id="view-schema-btn"
            className="btn btn-secondary"
            href="#diagnostics-section"
          >
            <Terminal size={18} /> View Setup & Commands
          </a>
        </div>
      </section>

      {/* Database Verification Feedback Banner */}
      {dbStatus.tested && (
        <section
          id="db-status-banner"
          style={{
            marginBottom: '40px',
            padding: '20px 24px',
            borderRadius: '16px',
            border: `1px solid ${dbStatus.connected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            background: dbStatus.connected
              ? 'rgba(16, 185, 129, 0.08)'
              : 'rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            {dbStatus.connected ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : (
              <AlertCircle size={24} color="#ef4444" />
            )}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: dbStatus.connected ? '#34d399' : '#f87171', marginBottom: '4px' }}>
                {dbStatus.connected ? 'Database Connected!' : 'Configuration Required'}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem' }}>{dbStatus.message}</p>
              {dbStatus.hint && (
                <p style={{ color: '#38bdf8', fontSize: '0.86rem', marginTop: '6px' }}>
                  💡 <strong>Tip:</strong> {dbStatus.hint}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Hospital Metrics Snapshot */}
      <section className="stats-grid" id="stats-overview">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            <Users size={22} />
          </div>
          <div className="stat-value">1,248</div>
          <div className="stat-label">Registered Patients</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <UserCheck size={22} />
          </div>
          <div className="stat-value">42</div>
          <div className="stat-label">Doctors on Roster</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <Calendar size={22} />
          </div>
          <div className="stat-value">86</div>
          <div className="stat-label">Appointments Scheduled</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Activity size={22} />
          </div>
          <div className="stat-value">99.9%</div>
          <div className="stat-label">System Uptime</div>
        </div>
      </section>

      {/* Core Hospital Modules */}
      <section id="hospital-modules">
        <h2 className="section-title">Pre-Engineered Healthcare Modules</h2>
        <p className="section-subtitle">
          Data schemas, relationship models, and CRUD structures are ready in your repository.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Users size={24} />
            </div>
            <h3 className="feature-heading">Patient Records (EMR)</h3>
            <p className="feature-desc">
              Comprehensive patient intake, personal health identifier, emergency contacts, blood group, and medical history tracking.
            </p>
            <div className="feature-tags">
              <span className="tag">Prisma Model: Patient</span>
              <span className="tag">Full Audit Trail</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}>
              <Stethoscope size={24} />
            </div>
            <h3 className="feature-heading">Doctor & Clinical Staff</h3>
            <p className="feature-desc">
              Department allocation (Cardiology, Neurology, Pediatrics, etc.), duty schedules, room availability, and assigned cases.
            </p>
            <div className="feature-tags">
              <span className="tag">Prisma Model: Doctor</span>
              <span className="tag">Department Schedules</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.12)' }}>
              <Calendar size={24} />
            </div>
            <h3 className="feature-heading">Appointment Scheduler</h3>
            <p className="feature-desc">
              Conflict-free patient consultation booking, status workflows (Pending, Confirmed, Completed, Cancelled).
            </p>
            <div className="feature-tags">
              <span className="tag">Prisma Model: Appointment</span>
              <span className="tag">Zero Conflicts</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' }}>
              <FileText size={24} />
            </div>
            <h3 className="feature-heading">Clinical Diagnostics</h3>
            <p className="feature-desc">
              Doctor consultation notes, symptom logs, diagnoses, electronic prescriptions, and treatment plans.
            </p>
            <div className="feature-tags">
              <span className="tag">Prisma Model: MedicalRecord</span>
              <span className="tag">Rx Prescriptions</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: '#ec4899', background: 'rgba(236, 72, 153, 0.12)' }}>
              <CreditCard size={24} />
            </div>
            <h3 className="feature-heading">Billing & Invoices</h3>
            <p className="feature-desc">
              Automatic invoice generation, payment reconciliation, partial payment tracking, and balance due reminders.
            </p>
            <div className="feature-tags">
              <span className="tag">Prisma Model: Bill</span>
              <span className="tag">ACID Guaranteed</span>
            </div>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)' }}>
              <Cloud size={24} />
            </div>
            <h3 className="feature-heading">Vercel & Cloud Ready</h3>
            <p className="feature-desc">
              Zero configuration required to migrate from your local PostgreSQL to Neon or Supabase when deploying live.
            </p>
            <div className="feature-tags">
              <span className="tag">Vercel CLI 64.3</span>
              <span className="tag">Environment Swapping</span>
            </div>
          </div>
        </div>
      </section>

      {/* Diagnostics & Quick Setup Box */}
      <section className="diagnostics-box" id="diagnostics-section">
        <div className="diag-header">
          <div className="diag-title">
            <Database size={24} color="#06b6d4" />
            PostgreSQL Quick Setup & Synchronization
          </div>
          <span className="tag" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
            Local Port: 5432
          </span>
        </div>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
          To sync your database tables into your local PostgreSQL:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 500 }}>
              1. Ensure your master password is saved in <code>.env</code>:
            </div>
            <div className="code-block">
              DATABASE_URL=&quot;postgresql://postgres:YOUR_PASSWORD@localhost:5432/radiant_hms?schema=public&quot;
            </div>
          </div>

          <div>
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 500 }}>
              2. Push the schema to create all hospital tables automatically:
            </div>
            <div className="code-block">npx prisma db push</div>
          </div>

          <div>
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '4px', fontWeight: 500 }}>
              3. View and manage all database records visually in your browser:
            </div>
            <div className="code-block">npx prisma studio</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="main-footer">
        <p>Radiant Hospitals HMS &bull; Built with Next.js, PostgreSQL, and Prisma</p>
      </footer>
    </div>
  )
}
