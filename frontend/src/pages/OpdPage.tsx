import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Doctor, Patient, Medicine } from '../types'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  Stethoscope,
  Plus,
  Activity,
  FileCheck,
  Printer,
  Trash2,
  AlertCircle,
  Clock,
  HeartPulse,
} from 'lucide-react'

export const OpdPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [selectedEncounter, setSelectedEncounter] = useState<any | null>(null)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isRxModalOpen, setIsRxModalOpen] = useState(false)

  // Start Encounter Form
  const [encounterForm, setEncounterForm] = useState({
    patientId: '',
    doctorId: '',
    notes: '',
  })

  // Clinical Notes Form with Vitals
  const [noteForm, setNoteForm] = useState({
    chiefComplaint: '',
    historyOfPresentIllness: '',
    diagnosis: '',
    clinicalAdvice: '',
    bp: '120/80',
    pulse: 72,
    temp: 98.6,
    spo2: 99,
    weight: 70,
  })

  // Prescription Form
  const [rxItems, setRxItems] = useState<any[]>([
    { medicineId: '', dosage: '500mg', frequency: '1-0-1 (After meals)', duration: '5 Days', specialInstructions: '' },
  ])

  // Queries
  const { data: encounters, isLoading } = useQuery({
    queryKey: ['opd-encounters'],
    queryFn: async () => {
      const res = await api.get('/opd')
      return res.data.data
    },
  })

  const { data: patients } = useQuery({
    queryKey: ['patients-quick'],
    queryFn: async () => {
      const res = await api.get('/patients', { params: { limit: 50 } })
      return res.data.data
    },
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const res = await api.get('/appointments/doctors')
      return res.data.data
    },
  })

  const { data: medicines } = useQuery({
    queryKey: ['medicines-list'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/medicines')
      return res.data.data
    },
  })

  // Mutations
  const startEncounterMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/opd/encounter', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opd-encounters'] })
      setIsStartModalOpen(false)
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/opd/notes', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opd-encounters'] })
      setIsNoteModalOpen(false)
    },
  })

  const createRxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/opd/prescription', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opd-encounters'] })
      setIsRxModalOpen(false)
    },
  })

  const handleAddRxRow = () => {
    setRxItems([
      ...rxItems,
      { medicineId: '', dosage: '500mg', frequency: '1-0-1 (After meals)', duration: '5 Days', specialInstructions: '' },
    ])
  }

  const handleRemoveRxRow = (index: number) => {
    setRxItems(rxItems.filter((_, idx) => idx !== index))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">OPD Clinical Consultations</h1>
          <p className="text-xs text-slate-400">Doctor Desk &bull; Clinical Vitals &bull; Electronic Prescriptions</p>
        </div>

        <button
          onClick={() => setIsStartModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition self-start"
        >
          <Plus size={15} /> Start Patient Encounter
        </button>
      </div>

      {/* Encounters List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-slate-500 text-xs animate-pulse">
            Loading active clinic encounters...
          </div>
        ) : encounters && encounters.length > 0 ? (
          encounters.map((enc: any) => (
            <div
              key={enc.id}
              className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold text-cyan-400">
                    {enc.encounterNumber}
                  </span>
                  <Badge variant={enc.status === 'ACTIVE' ? 'cyan' : 'neutral'}>
                    {enc.status}
                  </Badge>
                </div>

                <h3 className="font-bold text-white text-base">{enc.patient.fullName}</h3>
                <div className="text-xs text-slate-400 mt-0.5 font-mono">
                  {enc.patient.mrn} &bull; {enc.patient.gender}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <span className="text-slate-500">Doctor: </span>
                  <span className="font-medium text-slate-200">{enc.doctor.staff.user.fullName}</span>
                </div>

                {/* Vitals & Diagnosis snippet if recorded */}
                {enc.clinicalNotes?.[0] && (
                  <div className="mt-3 p-3 rounded-xl bg-[#090f1d] border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-cyan-400 font-medium">
                      <HeartPulse size={14} /> Vitals: BP {enc.clinicalNotes[0].vitals?.bp || 'N/A'}, Pulse {enc.clinicalNotes[0].vitals?.pulse || 'N/A'} bpm
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-500">Diagnosis: </span>
                      {enc.clinicalNotes[0].diagnosis}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedEncounter(enc)
                    setIsNoteModalOpen(true)
                  }}
                  className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-400 rounded-lg transition text-center"
                >
                  Record Notes & Vitals
                </button>
                <button
                  onClick={() => {
                    setSelectedEncounter(enc)
                    setIsRxModalOpen(true)
                  }}
                  className="flex-1 py-1.5 px-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-300 border border-cyan-500/30 rounded-lg transition text-center"
                >
                  Prescription
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs bg-[#0f172a] border border-slate-800 rounded-2xl">
            No active clinical encounters. Click &quot;Start Patient Encounter&quot; to begin consultation.
          </div>
        )}
      </div>

      {/* Start Encounter Modal */}
      <Modal
        isOpen={isStartModalOpen}
        onClose={() => setIsStartModalOpen(false)}
        title="Start Consultation Encounter"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            startEncounterMutation.mutate(encounterForm)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Patient *</label>
            <select
              required
              value={encounterForm.patientId}
              onChange={e => setEncounterForm({ ...encounterForm, patientId: e.target.value })}
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Attending Clinician *</label>
            <select
              required
              value={encounterForm.doctorId}
              onChange={e => setEncounterForm({ ...encounterForm, doctorId: e.target.value })}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Doctor --</option>
              {doctors?.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.staff.user.fullName} &bull; {d.specialization}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsStartModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={startEncounterMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs"
            >
              {startEncounterMutation.isPending ? 'Starting...' : 'Open Encounter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Notes & Vitals Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title={`Clinical Notes & Vitals - ${selectedEncounter?.patient.fullName || ''}`}
        maxWidth="2xl"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            addNoteMutation.mutate({
              encounterId: selectedEncounter?.id,
              chiefComplaint: noteForm.chiefComplaint,
              historyOfPresentIllness: noteForm.historyOfPresentIllness,
              diagnosis: noteForm.diagnosis,
              clinicalAdvice: noteForm.clinicalAdvice,
              vitals: {
                bp: noteForm.bp,
                pulse: Number(noteForm.pulse),
                temp: Number(noteForm.temp),
                spo2: Number(noteForm.spo2),
                weight: Number(noteForm.weight),
              },
            })
          }}
          className="space-y-4"
        >
          {/* Vitals Box */}
          <div className="p-4 rounded-xl bg-[#090f1d] border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Patient Vitals
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Blood Pressure</label>
                <input
                  type="text"
                  value={noteForm.bp}
                  onChange={e => setNoteForm({ ...noteForm, bp: e.target.value })}
                  placeholder="120/80"
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Pulse (bpm)</label>
                <input
                  type="number"
                  value={noteForm.pulse}
                  onChange={e => setNoteForm({ ...noteForm, pulse: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={noteForm.temp}
                  onChange={e => setNoteForm({ ...noteForm, temp: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">SpO2 (%)</label>
                <input
                  type="number"
                  value={noteForm.spo2}
                  onChange={e => setNoteForm({ ...noteForm, spo2: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Weight (kg)</label>
                <input
                  type="number"
                  value={noteForm.weight}
                  onChange={e => setNoteForm({ ...noteForm, weight: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Chief Complaint *</label>
            <input
              type="text"
              required
              value={noteForm.chiefComplaint}
              onChange={e => setNoteForm({ ...noteForm, chiefComplaint: e.target.value })}
              placeholder="e.g. High fever for 3 days, dry cough"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Diagnosis *</label>
            <input
              type="text"
              required
              value={noteForm.diagnosis}
              onChange={e => setNoteForm({ ...noteForm, diagnosis: e.target.value })}
              placeholder="e.g. Acute Viral Bronchitis"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Advice / Notes</label>
            <textarea
              rows={2}
              value={noteForm.clinicalAdvice}
              onChange={e => setNoteForm({ ...noteForm, clinicalAdvice: e.target.value })}
              placeholder="Bed rest for 3 days, drink warm fluids, review if fever persists."
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addNoteMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs"
            >
              {addNoteMutation.isPending ? 'Saving Notes...' : 'Save Clinical Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Prescription Builder Modal */}
      <Modal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        title={`Electronic Prescription - ${selectedEncounter?.patient.fullName || ''}`}
        maxWidth="4xl"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            createRxMutation.mutate({
              encounterId: selectedEncounter?.id,
              patientId: selectedEncounter?.patientId,
              doctorId: selectedEncounter?.doctorId,
              items: rxItems,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-3">
            {rxItems.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-[#090f1d] border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                <div className="sm:col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Medicine *</label>
                  <select
                    required
                    value={item.medicineId}
                    onChange={e => {
                      const updated = [...rxItems]
                      updated[idx].medicineId = e.target.value
                      setRxItems(updated)
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs"
                  >
                    <option value="">-- Select Medicine --</option>
                    {medicines?.map((m: Medicine) => (
                      <option key={m.id} value={m.id}>
                        {m.brandName} ({m.strength})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Dosage</label>
                  <input
                    type="text"
                    value={item.dosage}
                    onChange={e => {
                      const updated = [...rxItems]
                      updated[idx].dosage = e.target.value
                      setRxItems(updated)
                    }}
                    placeholder="500mg"
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Frequency</label>
                  <input
                    type="text"
                    value={item.frequency}
                    onChange={e => {
                      const updated = [...rxItems]
                      updated[idx].frequency = e.target.value
                      setRxItems(updated)
                    }}
                    placeholder="1-0-1 (After meals)"
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-0.5">Duration</label>
                  <input
                    type="text"
                    value={item.duration}
                    onChange={e => {
                      const updated = [...rxItems]
                      updated[idx].duration = e.target.value
                      setRxItems(updated)
                    }}
                    placeholder="5 Days"
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-center pt-3">
                  {rxItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRxRow(idx)}
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddRxRow}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition"
            >
              <Plus size={14} /> Add Another Medicine
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRxModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRxMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs"
            >
              {createRxMutation.isPending ? 'Generating...' : 'Issue Electronic Prescription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
