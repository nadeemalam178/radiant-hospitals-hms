import React, { useState } from 'react'
import { Modal } from '../ui/Modal'
import { api } from '../../services/api'
import { AbhaProfile } from '../../types'
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  Search,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'

interface AbhaVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (profile: AbhaProfile) => void
  patientIdToLink?: string // If linking to existing patient
  initialPhone?: string
  initialName?: string
}

export const AbhaVerifyModal: React.FC<AbhaVerifyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  patientIdToLink,
  initialPhone = '',
  initialName = '',
}) => {
  const [activeTab, setActiveTab] = useState<'OTP' | 'SEARCH'>('OTP')
  const [authMethod, setAuthMethod] = useState<'AADHAAR' | 'MOBILE'>('MOBILE')
  const [identifier, setIdentifier] = useState(initialPhone)
  const [searchQuery, setSearchQuery] = useState('')

  // OTP State
  const [txnId, setTxnId] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpMessage, setOtpMessage] = useState<string | null>(null)

  // Loading & Error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifiedProfile, setVerifiedProfile] = useState<AbhaProfile | null>(null)

  const handleGenerateOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await api.post('/abha/generate-otp', {
        authMethod,
        value: identifier,
      })
      setTxnId(res.data.data.txnId)
      setOtpMessage(res.data.data.message)
      setOtp('')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate OTP via ABDM Gateway.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!txnId) return
    setError(null)
    setLoading(true)

    try {
      const res = await api.post('/abha/verify-otp', {
        txnId,
        otp,
        patientDetails: {
          fullName: initialName || undefined,
        },
      })

      const profile: AbhaProfile = res.data.data
      setVerifiedProfile(profile)

      // If linking to an existing patient, immediately call backend link
      if (patientIdToLink) {
        await api.post('/abha/link', {
          patientId: patientIdToLink,
          abhaNumber: profile.abhaNumber,
          abhaAddress: profile.abhaAddress,
          aadhaarMasked: profile.aadhaarMasked,
          abhaDetails: profile,
        })
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setError(null)
    setLoading(true)

    try {
      const res = await api.get('/abha/search', {
        params: { q: searchQuery.trim() },
      })
      const profile: AbhaProfile = res.data.data
      setVerifiedProfile(profile)

      if (patientIdToLink) {
        await api.post('/abha/link', {
          patientId: patientIdToLink,
          abhaNumber: profile.abhaNumber,
          abhaAddress: profile.abhaAddress,
          aadhaarMasked: profile.aadhaarMasked,
          abhaDetails: profile,
        })
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'No ABHA account found with this identifier.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (verifiedProfile) {
      onSuccess(verifiedProfile)
      onClose()
    }
  }

  const handleReset = () => {
    setTxnId(null)
    setOtp('')
    setOtpMessage(null)
    setVerifiedProfile(null)
    setError(null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ayushman Bharat Digital Mission (ABDM) Integration"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Subtitle */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
          <span>
            Connect, authenticate, and issue official 14-digit ABHA IDs via the National Health Authority (NHA) Gateway.
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verified Profile State */}
        {verifiedProfile ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#0b1728] to-slate-900 border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{verifiedProfile.fullName}</h4>
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ABDM Verified Identity
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ABHA Number</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{verifiedProfile.abhaNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ABHA Address</span>
                <span className="font-mono font-semibold text-cyan-300">{verifiedProfile.abhaAddress}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gender & DOB</span>
                <span className="text-slate-300">{verifiedProfile.gender} &bull; {verifiedProfile.dateOfBirth}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Aadhaar (Masked)</span>
                <span className="font-mono text-slate-300">{verifiedProfile.aadhaarMasked || 'XXXX-XXXX-9912'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Search Another
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
              >
                Apply to Patient Record <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => { setActiveTab('OTP'); setError(null) }}
                className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 transition ${
                  activeTab === 'OTP'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound size={14} /> Aadhaar / Mobile OTP Authentication
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('SEARCH'); setError(null) }}
                className={`flex items-center gap-2 pb-2.5 px-3 border-b-2 transition ${
                  activeTab === 'SEARCH'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Search size={14} /> Search Existing ABHA ID
              </button>
            </div>

            {/* TAB 1: OTP FLOW */}
            {activeTab === 'OTP' && (
              <div className="space-y-4">
                {!txnId ? (
                  <form onSubmit={handleGenerateOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Authentication Method
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAuthMethod('MOBILE')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                            authMethod === 'MOBILE'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#090f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Smartphone size={16} /> Mobile Number OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthMethod('AADHAAR')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                            authMethod === 'AADHAAR'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-[#090f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <CreditCard size={16} /> Aadhaar (12-Digit)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        {authMethod === 'MOBILE' ? '10-Digit Mobile Number' : '12-Digit Aadhaar Number'}
                      </label>
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder={authMethod === 'MOBILE' ? 'e.g. 9845012345' : 'e.g. 5421 8903 1284'}
                        className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !identifier}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                    >
                      {loading ? 'Requesting Gateway OTP...' : 'Send ABDM Verification OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {otpMessage && (
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                        {otpMessage}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Enter 6-Digit OTP
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-sm font-mono tracking-widest text-center focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 block mt-1">
                        💡 Test OTP Code: <strong className="text-emerald-400">123456</strong>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-400"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                      >
                        {loading ? 'Authenticating...' : 'Verify OTP & Issue ABHA'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: SEARCH FLOW */}
            {activeTab === 'SEARCH' && (
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ABHA Number (14 Digits) or ABHA Address
                  </label>
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="e.g. 91-4521-8903-1284 or patient@abdm"
                    className="w-full px-3.5 py-2.5 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {loading ? 'Searching ABDM Registry...' : 'Search ABDM Registry'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
