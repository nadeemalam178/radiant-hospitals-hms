import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Activity, Lock, Mail, AlertCircle, ShieldCheck, Sparkles, Building2 } from 'lucide-react'

export const Login: React.FC = () => {
  const { login, hospital } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please verify your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail)
    setPassword(userPass)
  }

  return (
    <div className="min-h-screen bg-[#070d19] flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-white">
      <div className="w-full max-w-lg">
        {/* Hospital Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/20 mb-3">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {hospital?.name || 'Radiant Hospital & Research Institute'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ABDM / ABHA Connected Hospital Core &bull; LAN Node
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck size={20} className="text-cyan-400" /> Staff Authentication
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {hospital?.code || 'RHRI'}
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle size={18} className="flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="staff@radiant.lan"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Sign In to Hospital Portal'}
            </button>
          </form>

          {/* Quick Demo Staff Login Selector */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-cyan-400" /> Quick-Login Demo Profiles:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@radiant.lan', 'Radiant@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Admin</div>
                <div className="text-[9px] text-slate-400">Dr. Alok Verma</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('dr.sharma@radiant.lan', 'Doctor@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Doctor (OPD)</div>
                <div className="text-[9px] text-slate-400">Dr. Rajesh Sharma</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('dr.priya@radiant.lan', 'Doctor@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Cardiologist</div>
                <div className="text-[9px] text-slate-400">Dr. Priya Nair</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('reception@radiant.lan', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Receptionist</div>
                <div className="text-[9px] text-slate-400">Manoj Kumar</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('pharmacy@radiant.lan', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Pharmacist</div>
                <div className="text-[9px] text-slate-400">Vikram Joshi</div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('billing@radiant.lan', 'Staff@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/15 border border-slate-700 hover:border-cyan-500/40 text-left transition group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-cyan-300">Billing Desk</div>
                <div className="text-[9px] text-slate-400">Kavita Patel</div>
              </button>
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-slate-500">
            HFR Facility ID: {hospital?.facilityId || 'IN2910000452'} &bull; HIPAA & ABDM Ready
          </div>
        </div>
      </div>
    </div>
  )
}
