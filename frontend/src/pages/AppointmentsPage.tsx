import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Appointment, Doctor, Patient } from '../types'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  CalendarPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Printer,
  Calendar as CalendarIcon,
  Stethoscope,
} from 'lucide-react'

export const AppointmentsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    departmentId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    slotTime: '10:00 AM',
    reason: '',
  })

  // Query Appointments
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments', selectedDate, selectedDoctorId],
    queryFn: async () => {
      const res = await api.get('/appointments', {
        params: {
          date: selectedDate || undefined,
          doctorId: selectedDoctorId || undefined,
        },
      })
      return res.data.data
    },
  })

  // Query Doctors
  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await api.get('/appointments/doctors')
      return res.data.data
    },
  })

  // Query Patients list for select dropdown
  const { data: patientList } = useQuery({
    queryKey: ['patients-quick'],
    queryFn: async () => {
      const res = await api.get('/patients', { params: { limit: 50 } })
      return res.data.data
    },
  })

  // Book Mutation
  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/appointments', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsBookModalOpen(false)
      setFormError(null)
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Slot conflict or booking error.')
    },
  })

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.patch(`/appointments/${id}/status`, { status })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    },
  })

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    bookMutation.mutate(formData)
  }

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM',
  ]

  const statusBadges: Record<string, any> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    CHECKED_IN: 'cyan',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  }

  const columns = [
    {
      header: 'Appt No.',
      accessorKey: 'appointmentNumber' as const,
      cell: (row: Appointment) => (
        <span className="font-mono text-cyan-400 font-semibold">{row.appointmentNumber}</span>
      ),
    },
    {
      header: 'Patient Details',
      cell: (row: Appointment) => (
        <div>
          <div className="font-medium text-white">{row.patient.fullName}</div>
          <div className="text-xs text-slate-500 font-mono">{row.patient.mrn} &bull; {row.patient.phone}</div>
        </div>
      ),
    },
    {
      header: 'Doctor / Specialization',
      cell: (row: Appointment) => (
        <div>
          <div className="text-white font-medium">{row.doctor.staff.user.fullName}</div>
          <div className="text-xs text-slate-400">{row.doctor.staff.designation} &bull; {row.department?.name || 'General'}</div>
        </div>
      ),
    },
    {
      header: 'Slot Time',
      cell: (row: Appointment) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Clock size={13} className="text-cyan-400" /> {row.slotTime}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: Appointment) => (
        <Badge variant={statusBadges[row.status] || 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Workflow Actions',
      cell: (row: Appointment) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'PENDING' && (
            <button
              onClick={() => statusMutation.mutate({ id: row.id, status: 'CONFIRMED' })}
              className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-xs transition"
            >
              Confirm
            </button>
          )}
          {row.status === 'CONFIRMED' && (
            <button
              onClick={() => statusMutation.mutate({ id: row.id, status: 'CHECKED_IN' })}
              className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded text-xs transition"
            >
              Check-In
            </button>
          )}
          {row.status === 'CHECKED_IN' && (
            <button
              onClick={() => statusMutation.mutate({ id: row.id, status: 'COMPLETED' })}
              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded text-xs transition"
            >
              Mark Done
            </button>
          )}
          {row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && (
            <button
              onClick={() => statusMutation.mutate({ id: row.id, status: 'CANCELLED' })}
              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs transition"
            >
              Cancel
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Appointment Scheduler</h1>
          <p className="text-xs text-slate-400">Doctor Rosters &bull; Conflict-Free Slot Reservations</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          />

          <select
            value={selectedDoctorId}
            onChange={e => setSelectedDoctorId(e.target.value)}
            className="px-3 py-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Clinicians</option>
            {doctors?.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.staff.user.fullName} ({doc.specialization})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition"
          >
            <CalendarPlus size={15} /> Book Appointment
          </button>
        </div>
      </div>

      {/* Appointment Table */}
      <Table
        columns={columns}
        data={appointments || []}
        isLoading={isLoading}
        emptyMessage="No appointments scheduled for the selected date or doctor filter."
      />

      {/* Book Appointment Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Schedule Clinical Appointment"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Patient *
            </label>
            <select
              required
              value={formData.patientId}
              onChange={e => setFormData({ ...formData, patientId: e.target.value })}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Registered Patient --</option>
              {patientList?.map((p: Patient) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.mrn} - {p.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Attending Clinician *
            </label>
            <select
              required
              value={formData.doctorId}
              onChange={e => {
                const doc = doctors?.find(d => d.id === e.target.value)
                setFormData({
                  ...formData,
                  doctorId: e.target.value,
                  departmentId: doc?.staff.department?.id || '',
                })
              }}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors?.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.staff.user.fullName} &bull; {doc.specialization} (Fee: ₹{doc.consultationFee})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Consultation Date *
              </label>
              <input
                type="date"
                required
                value={formData.appointmentDate}
                onChange={e => setFormData({ ...formData, appointmentDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Available Slot Time *
              </label>
              <select
                required
                value={formData.slotTime}
                onChange={e => setFormData({ ...formData, slotTime: e.target.value })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
              >
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Primary Chief Complaint / Reason
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Acute Fever, Hypertension follow-up"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {bookMutation.isPending ? 'Checking Conflicts...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
