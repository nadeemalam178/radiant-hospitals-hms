import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { HospitalSettings } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  Settings as SettingsIcon,
  Building,
  Hash,
  Database,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { refreshProfile } = useAuth()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: settings, isLoading } = useQuery<HospitalSettings>({
    queryKey: ['hospital-settings'],
    queryFn: async () => {
      const res = await api.get('/reports/settings')
      return res.data.data
    },
  })

  const [formData, setFormData] = useState<Partial<HospitalSettings>>({})

  useEffect(() => {
    if (settings) {
      setFormData(settings)
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/reports/settings', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-settings'] })
      refreshProfile()
      setSuccessMsg('Hospital configuration updated successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Hospital System Settings</h1>
        <p className="text-xs text-slate-400">Branding &bull; Document Numbering &bull; Local Database Diagnostics</p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs animate-pulse">
          Loading settings...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hospital Profile */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building size={16} className="text-cyan-400" /> Organization Profile
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Hospital Legal Name</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Hospital Short Code</label>
                <input
                  type="text"
                  required
                  value={formData.code || ''}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono uppercase focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Hospital Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  required
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Full Physical Address</label>
                <input
                  type="text"
                  required
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Numbering Prefixes */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Hash size={16} className="text-cyan-400" /> Document Numbering Prefixes
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Patient MRN</label>
                <input
                  type="text"
                  value={formData.registrationPrefix || 'RAD'}
                  onChange={e => setFormData({ ...formData, registrationPrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white uppercase focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Invoices</label>
                <input
                  type="text"
                  value={formData.invoicePrefix || 'INV'}
                  onChange={e => setFormData({ ...formData, invoicePrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white uppercase focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Appointments</label>
                <input
                  type="text"
                  value={formData.appointmentPrefix || 'APT'}
                  onChange={e => setFormData({ ...formData, appointmentPrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white uppercase focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Lab Orders</label>
                <input
                  type="text"
                  value={formData.labOrderPrefix || 'LAB'}
                  onChange={e => setFormData({ ...formData, labOrderPrefix: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white uppercase focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* ABDM / ABHA (Ayushman Bharat Digital Mission) Configuration */}
          <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield size={16} className="text-emerald-400" /> Ayushman Bharat Digital Mission (ABDM) Gateway
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">ABDM Health Facility Registry (HFR) ID</label>
                <input
                  type="text"
                  value={formData.facilityId || 'IN2910000452'}
                  onChange={e => setFormData({ ...formData, facilityId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Health Information Provider (HIP) ID</label>
                <input
                  type="text"
                  value={formData.hipId || 'IN_RHRI_BLR_01'}
                  onChange={e => setFormData({ ...formData, hipId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">ABDM Gateway Bridge URL</label>
                <input
                  type="text"
                  value={formData.abdmBridgeUrl || 'https://dev.abdm.gov.in/gateway/v0.5'}
                  onChange={e => setFormData({ ...formData, abdmBridgeUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Local PostgreSQL Diagnostics Box */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database size={16} className="text-emerald-400" /> On-Premise Database & Backup Diagnostics
            </h2>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span>Database Engine:</span>
                <strong className="text-white font-mono">PostgreSQL 18.6 (Service: postgresql-x64-18)</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span>Network Binding:</span>
                <strong className="text-emerald-400 font-mono">127.0.0.1:5432 (Isolated from LAN clients)</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span>HTTP Application Port:</span>
                <strong className="text-cyan-400 font-mono">0.0.0.0:4000 (Open on Windows Firewall)</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Automated Backup Script:</span>
                <strong className="text-slate-200 font-mono">scripts\backup-db.bat</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              <Save size={15} /> Save Configurations
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
