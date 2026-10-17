import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Ward, Patient, Doctor } from '../types'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  Bed as BedIcon,
  UserPlus,
  LogOut,
  RefreshCw,
  Building,
  Activity,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

export const IpdPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false)
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null)
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)
  const [dischargeSummary, setDischargeSummary] = useState('')

  const [admitForm, setAdmitForm] = useState({
    patientId: '',
    bedId: '',
    attendingDoctorId: '',
    admissionDiagnosis: '',
  })

  // Query Wards & Beds
  const { data: ipdData, isLoading } = useQuery({
    queryKey: ['ipd-wards'],
    queryFn: async () => {
      const res = await api.get('/ipd/wards')
      return res.data.data
    },
  })

  // Patients
  const { data: patients } = useQuery({
    queryKey: ['patients-quick'],
    queryFn: async () => {
      const res = await api.get('/patients', { params: { limit: 50 } })
      return res.data.data
    },
  })

  // Doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await api.get('/appointments/doctors')
      return res.data.data
    },
  })

  // Mutations
  const admitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/ipd/admit', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipd-wards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsAdmitModalOpen(false)
    },
  })

  const dischargeMutation = useMutation({
    mutationFn: async ({ id, summary }: { id: string; summary: string }) => {
      const res = await api.post(`/ipd/discharge/${id}`, { dischargeSummary: summary })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipd-wards'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsDischargeModalOpen(false)
    },
  })

  // Collect available beds across all wards
  const availableBeds: any[] = []
  ipdData?.wards?.forEach((w: Ward) => {
    w.beds?.forEach(b => {
      if (b.status === 'AVAILABLE') {
        availableBeds.push({ ...b, wardName: w.name })
      }
    })
  })

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Inpatient Department (IPD)</h1>
          <p className="text-xs text-slate-400">Ward Allocations &bull; Real-Time Bed Occupancy &bull; Admissions</p>
        </div>

        <button
          onClick={() => setIsAdmitModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition self-start"
        >
          <UserPlus size={15} /> Admit Inpatient
        </button>
      </div>

      {/* Bed Occupancy Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Ward Beds</div>
          <div className="text-2xl font-bold text-white mt-1">{ipdData?.summary?.totalBeds || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase">Available Beds</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{ipdData?.summary?.availableBeds || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800">
          <div className="text-[11px] font-semibold text-rose-400 uppercase">Occupied Beds</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{ipdData?.summary?.occupiedBeds || 0}</div>
        </div>
        <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800">
          <div className="text-[11px] font-semibold text-cyan-400 uppercase">Occupancy Rate</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{ipdData?.summary?.occupancyRate || '0.0%'}</div>
        </div>
      </div>

      {/* Interactive Ward Grid */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs animate-pulse">
            Loading hospital ward occupancy matrix...
          </div>
        ) : ipdData?.wards && ipdData.wards.length > 0 ? (
          ipdData.wards.map((ward: Ward) => (
            <div key={ward.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                    <Building size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">{ward.name}</h2>
                    <span className="text-xs text-slate-500 font-mono">
                      Type: {ward.wardType} &bull; Floor: {ward.floor || '1'} &bull; {ward.beds.length} Total Beds
                    </span>
                  </div>
                </div>
              </div>

              {/* Bed Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {ward.beds.map(bed => {
                  const currentAdm = bed.admissions?.[0]
                  const isOccupied = bed.status === 'OCCUPIED'

                  return (
                    <div
                      key={bed.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                        isOccupied
                          ? 'bg-rose-500/5 border-rose-500/25 text-rose-200'
                          : 'bg-emerald-500/5 border-emerald-500/25 text-emerald-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs">{bed.bedNumber}</span>
                        <BedIcon size={16} className={isOccupied ? 'text-rose-400' : 'text-emerald-400'} />
                      </div>

                      {isOccupied && currentAdm ? (
                        <div className="space-y-2 mt-1">
                          <div className="text-[11px] font-semibold text-white truncate">
                            {currentAdm.patient?.fullName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {currentAdm.patient?.mrn}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAdmission(currentAdm)
                              setIsDischargeModalOpen(true)
                            }}
                            className="w-full mt-2 py-1 px-2 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-semibold transition"
                          >
                            Discharge
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-emerald-400 font-medium">
                          Available (₹{bed.dailyRate}/day)
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs bg-[#0f172a] border border-slate-800 rounded-2xl">
            No active wards configured in the hospital catalog.
          </div>
        )}
      </div>

      {/* Admit Patient Modal */}
      <Modal
        isOpen={isAdmitModalOpen}
        onClose={() => setIsAdmitModalOpen(false)}
        title="Inpatient Ward Admission"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            admitMutation.mutate(admitForm)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Patient *</label>
            <select
              required
              value={admitForm.patientId}
              onChange={e => setAdmitForm({ ...admitForm, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Patient --</option>
              {patients?.map((p: Patient) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.mrn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Available Bed *</label>
            <select
              required
              value={admitForm.bedId}
              onChange={e => setAdmitForm({ ...admitForm, bedId: e.target.value })}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Available Bed --</option>
              {availableBeds.map(b => (
                <option key={b.id} value={b.id}>
                  {b.wardName} &bull; Bed {b.bedNumber} (₹{b.dailyRate}/day)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Attending Clinician *</label>
            <select
              required
              value={admitForm.attendingDoctorId}
              onChange={e => setAdmitForm({ ...admitForm, attendingDoctorId: e.target.value })}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.staff.user.fullName} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admission Diagnosis *</label>
            <input
              type="text"
              required
              value={admitForm.admissionDiagnosis}
              onChange={e => setAdmitForm({ ...admitForm, admissionDiagnosis: e.target.value })}
              placeholder="e.g. Acute Appendicitis, Post-op Recovery"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdmitModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={admitMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20"
            >
              {admitMutation.isPending ? 'Allocating Bed...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge Patient Modal */}
      <Modal
        isOpen={isDischargeModalOpen}
        onClose={() => setIsDischargeModalOpen(false)}
        title={`Patient Discharge & Bed Release - ${selectedAdmission?.patient?.fullName || ''}`}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            dischargeMutation.mutate({
              id: selectedAdmission?.id,
              summary: dischargeSummary,
            })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Discharge Summary & Instructions *</label>
            <textarea
              required
              rows={4}
              value={dischargeSummary}
              onChange={e => setDischargeSummary(e.target.value)}
              placeholder="Clinical condition at discharge, medications continued, follow-up advice..."
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            <span>Discharging will immediately mark Bed {selectedAdmission?.bed?.bedNumber} as AVAILABLE.</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsDischargeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dischargeMutation.isPending}
              className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
            >
              {dischargeMutation.isPending ? 'Processing...' : 'Discharge & Free Bed'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
