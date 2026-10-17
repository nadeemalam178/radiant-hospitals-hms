import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Building2, UserPlus, ShieldAlert, CheckCircle2 } from 'lucide-react'

export const FirstRunSetup: React.FC = () => {
  const { setupHospital } = useAuth()
  const [formData, setFormData] = useState({
    hospitalName: 'Radiant Multi-Speciality Hospital',
    hospitalCode: 'RAD',
    address: '100 Healthcare Avenue, Sector 5',
    phone: '+91 98765 43210',
    email: 'admin@radianthospitals.org',
    adminFullName: 'Master System Administrator',
    adminEmail: 'admin@radiant.lan',
    adminPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.adminPassword.length < 8) {
      setError('Administrator password must be at least 8 characters long.')
      return
    }

    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await setupHospital({
        hospitalName: formData.hospitalName,
        hospitalCode: formData.hospitalCode,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        adminFullName: formData.adminFullName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initialize hospital system.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070d19] flex items-center justify-center p-6 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-4">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Hospital System Initialization
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Welcome to Radiant HMS. Please configure your hospital profile and initialize the Master Administrator account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
            <ShieldAlert size={18} className="text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Hospital Details */}
          <div>
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={16} /> 1. Hospital Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hospital Name
                </label>
                <input
                  type="text"
                  name="hospitalName"
                  required
                  value={formData.hospitalName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Hospital Code (e.g. RAD)
                </label>
                <input
                  type="text"
                  name="hospitalCode"
                  required
                  value={formData.hospitalCode}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Hospital Address
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Master Administrator Account */}
          <div className="pt-4 border-t border-slate-800">
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserPlus size={16} /> 2. Master Administrator Setup
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  name="adminFullName"
                  required
                  value={formData.adminFullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  required
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Secure Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  required
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-2"
          >
            {loading ? 'Initializing Hospital System...' : 'Initialize On-Premise Installation'}
            <CheckCircle2 size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
