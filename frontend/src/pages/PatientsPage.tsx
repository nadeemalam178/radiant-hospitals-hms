import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Patient } from '../types'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  UserPlus,
  Search,
  Printer,
  Eye,
  FileText,
  AlertCircle,
  Phone,
  Calendar,
  Activity,
  HeartPulse,
} from 'lucide-react'

export const PatientsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    address: '',
    allergies: '',
  })

  // Query Patients
  const { data: patientData, isLoading } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: async () => {
      const res = await api.get('/patients', {
        params: { page, limit: 10, search: search || undefined },
      })
      return res.data
    },
  })

  // Query Selected Patient Details
  const { data: activePatient, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['patient-details', selectedPatientId],
    queryFn: async () => {
      if (!selectedPatientId) return null
      const res = await api.get(`/patients/${selectedPatientId}`)
      return res.data.data
    },
    enabled: !!selectedPatientId,
  })

  // Register Patient Mutation
  const registerMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/patients', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsRegisterOpen(false)
      setFormData({
        fullName: '',
        dateOfBirth: '',
        gender: 'MALE',
        bloodGroup: 'O+',
        phone: '',
        email: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        address: '',
        allergies: '',
      })
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to register patient.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    registerMutation.mutate(formData)
  }

  const columns = [
    {
      header: 'MRN',
      accessorKey: 'mrn' as const,
      cell: (row: Patient) => (
        <span className="font-mono font-semibold text-cyan-400">{row.mrn}</span>
      ),
    },
    {
      header: 'Patient Name',
      accessorKey: 'fullName' as const,
      cell: (row: Patient) => (
        <div>
          <div className="font-medium text-white">{row.fullName}</div>
          <div className="text-xs text-slate-500">{row.gender} &bull; {new Date(row.dateOfBirth).toLocaleDateString()}</div>
        </div>
      ),
    },
    {
      header: 'Contact Phone',
      accessorKey: 'phone' as const,
      cell: (row: Patient) => (
        <span className="text-slate-300 font-mono text-xs">{row.phone}</span>
      ),
    },
    {
      header: 'Blood Group',
      accessorKey: 'bloodGroup' as const,
      cell: (row: Patient) => (
        <Badge variant={row.bloodGroup ? 'danger' : 'neutral'}>
          {row.bloodGroup || 'Not Specified'}
        </Badge>
      ),
    },
    {
      header: 'Registered Date',
      accessorKey: 'createdAt' as const,
      cell: (row: Patient) => (
        <span className="text-xs text-slate-400">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row: Patient) => (
        <button
          onClick={() => setSelectedPatientId(row.id)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 font-medium transition"
        >
          <Eye size={13} /> View File
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Patient Registry (EMR)</h1>
          <p className="text-xs text-slate-400">Unique Medical Record Numbers &bull; Clinical Histories</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Search MRN, Name, Phone..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-700/80 rounded-xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
            />
          </div>

          <button
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <UserPlus size={15} /> Register Patient
          </button>
        </div>
      </div>

      {/* Patients Table */}
      <Table
        columns={columns}
        data={patientData?.data || []}
        isLoading={isLoading}
        pagination={
          patientData?.pagination
            ? {
                page: patientData.pagination.page,
                totalPages: patientData.pagination.totalPages,
                total: patientData.pagination.total,
                onPageChange: p => setPage(p),
              }
            : undefined
        }
      />

      {/* Patient Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="New Patient Registration (EMR)"
        maxWidth="2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Patient Full Name"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Relative / Guardian"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="Guardian phone"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Known Drug Allergies / Medical Alerts
              </label>
              <input
                type="text"
                value={formData.allergies}
                onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Sulfa drugs, Latex (leave blank if none)"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {registerMutation.isPending ? 'Generating MRN...' : 'Save & Issue MRN'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Patient Profile / EMR Details View Modal */}
      <Modal
        isOpen={!!selectedPatientId}
        onClose={() => setSelectedPatientId(null)}
        title="Electronic Medical Record (EMR)"
        maxWidth="4xl"
      >
        {isLoadingDetails ? (
          <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
            Loading patient medical record...
          </div>
        ) : activePatient ? (
          <div className="space-y-6">
            {/* Patient Header Card */}
            <div className="p-5 rounded-2xl bg-[#090f1d] border border-slate-800 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-white">{activePatient.fullName}</h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20">
                    {activePatient.mrn}
                  </span>
                  <Badge variant={activePatient.gender === 'FEMALE' ? 'info' : 'cyan'}>
                    {activePatient.gender}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1"><Calendar size={13} /> DOB: {new Date(activePatient.dateOfBirth).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Phone size={13} /> {activePatient.phone}</span>
                  <span className="flex items-center gap-1"><HeartPulse size={13} className="text-rose-400" /> Blood: {activePatient.bloodGroup || 'N/A'}</span>
                </div>
                {activePatient.allergies && (
                  <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 inline-block">
                    ⚠️ Allergy Warning: {activePatient.allergies}
                  </div>
                )}
              </div>

              <button
                onClick={() => window.print()}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition"
              >
                <Printer size={13} /> Print Summary
              </button>
            </div>

            {/* Encounters & Prescriptions History */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Clinical Consultations & Prescriptions
              </h3>
              {activePatient.encounters && activePatient.encounters.length > 0 ? (
                <div className="space-y-3">
                  {activePatient.encounters.map((enc: any) => (
                    <div key={enc.id} className="p-4 rounded-xl bg-[#090f1d] border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between items-center font-semibold text-slate-300">
                        <span className="text-cyan-400">{enc.encounterNumber} ({enc.encounterType})</span>
                        <span className="text-slate-500">{new Date(enc.startedAt).toLocaleString()}</span>
                      </div>
                      {enc.clinicalNotes?.[0] && (
                        <div>
                          <span className="text-slate-400">Diagnosis: </span>
                          <span className="text-white font-medium">{enc.clinicalNotes[0].diagnosis}</span>
                        </div>
                      )}
                      {enc.prescriptions?.[0]?.items && (
                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-slate-400 block mb-1">Prescribed Medicines:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {enc.prescriptions[0].items.map((pi: any) => (
                              <span key={pi.id} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px]">
                                {pi.medicine.brandName} ({pi.dosage}) - {pi.frequency} for {pi.duration}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 p-4 rounded-xl bg-[#090f1d] border border-slate-800">
                  No previous consultation records for this patient.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
