import React from 'react'
import { Patient, HospitalSettings } from '../../types'
import { ShieldCheck, QrCode, Copy, Check, Printer, Building2, User, Phone, Calendar } from 'lucide-react'

interface AbhaCardProps {
  patient: Patient
  hospital?: HospitalSettings | null
  onUnlink?: () => void
}

export const AbhaCard: React.FC<AbhaCardProps> = ({ patient, hospital, onUnlink }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    if (patient.abhaNumber) {
      navigator.clipboard.writeText(patient.abhaNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!patient.abhaNumber) {
    return (
      <div className="p-6 rounded-2xl bg-[#090f1d] border border-dashed border-slate-700 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
          <ShieldCheck size={24} />
        </div>
        <h4 className="text-sm font-bold text-white">No ABHA Identity Linked</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          This patient does not currently have an Ayushman Bharat Health Account (ABHA) linked to their hospital record.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Official ABHA Card Container */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-[#0d1829] to-[#071322] border-2 border-emerald-500/40 shadow-2xl p-6 text-white max-w-xl mx-auto">
        {/* Tricolor accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 flex">
          <div className="w-1/3 bg-[#FF9933]" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-[#138808]" />
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 leading-tight">
                National Health Authority &bull; ABDM
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">
                Ayushman Bharat Health Account (ABHA)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified Profile
          </div>
        </div>

        {/* Card Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4 items-center">
          {/* Avatar / Photo Placeholder */}
          <div className="sm:col-span-1 flex flex-col items-center justify-center text-center p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg mb-2">
              {patient.fullName.charAt(0)}
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate w-full">{patient.fullName}</div>
            <div className="text-[10px] text-slate-400">{patient.gender} &bull; {new Date(patient.dateOfBirth).getFullYear()}</div>
          </div>

          {/* Demographic & ABHA Details */}
          <div className="sm:col-span-2 space-y-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ABHA Number (14 Digits)</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-bold text-emerald-300 tracking-wider">
                  {patient.abhaNumber}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy ABHA Number"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">ABHA Address</span>
                <span className="font-mono text-xs font-semibold text-cyan-300 truncate block">
                  {patient.abhaAddress || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Hospital MRN</span>
                <span className="font-mono text-xs font-semibold text-slate-300">
                  {patient.mrn}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">DOB / Age</span>
                <span className="text-slate-300">
                  {new Date(patient.dateOfBirth).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Registered Mobile</span>
                <span className="text-slate-300 font-mono">
                  {patient.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer: Facility Stamp & QR Simulator */}
        <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-cyan-400 flex-shrink-0" />
            <div className="truncate max-w-[240px]">
              <span className="text-slate-300 font-medium">{hospital?.name || 'Radiant Hospital & Research Institute'}</span>
              <span className="text-[10px] text-slate-500 block">HFR ID: {hospital?.facilityId || 'IN2910000452'} &bull; HIP: {hospital?.hipId || 'IN_RHRI_BLR_01'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60 font-mono text-[10px] text-slate-300">
            <QrCode size={14} className="text-emerald-400" />
            <span>NHA Verified</span>
          </div>
        </div>
      </div>

      {/* ABDM Actions & Care Contexts */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        >
          <Printer size={13} /> Print ABHA Card
        </button>

        {onUnlink && (
          <button
            onClick={onUnlink}
            className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
          >
            Unlink ABHA from Patient
          </button>
        )}
      </div>

      {/* Linked Care Contexts (HIP Milestone 2 Records) */}
      <div className="p-4 rounded-xl bg-[#090f1d] border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" /> ABDM Care Contexts (HIP Records)
          </h4>
          <span className="text-[11px] text-slate-400">
            {patient.careContexts?.length || 0} Linked Records
          </span>
        </div>

        {patient.careContexts && patient.careContexts.length > 0 ? (
          <div className="space-y-1.5 mt-2">
            {patient.careContexts.map(cc => (
              <div key={cc.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-slate-200">{cc.display}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Ref: {cc.referenceNumber} &bull; Type: {cc.careContextType}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                  {cc.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-1">
            Care contexts for this patient will be automatically published to the ABDM Health Record network upon OPD consultation or lab verification.
          </p>
        )}
      </div>
    </div>
  )
}
