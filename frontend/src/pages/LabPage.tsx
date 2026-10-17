import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { LabOrder, Patient, Doctor } from '../types'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  FlaskConical,
  Plus,
  CheckCircle,
  AlertTriangle,
  Printer,
  FileCheck2,
} from 'lucide-react'

export const LabPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedResult, setSelectedResult] = useState<any | null>(null)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [resultValue, setResultValue] = useState('')
  const [isAbnormal, setIsAbnormal] = useState(false)
  const [interpretation, setInterpretation] = useState('')

  // Order Form
  const [orderForm, setOrderForm] = useState({
    patientId: '',
    orderedById: '',
    priority: 'ROUTINE',
    selectedTests: [] as string[],
  })

  // Queries
  const { data: labOrders, isLoading } = useQuery<LabOrder[]>({
    queryKey: ['lab-orders'],
    queryFn: async () => {
      const res = await api.get('/lab/orders')
      return res.data.data
    },
  })

  const { data: testCatalog } = useQuery({
    queryKey: ['lab-catalog'],
    queryFn: async () => {
      const res = await api.get('/lab/catalog')
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

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/lab/orders', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsOrderModalOpen(false)
      setOrderForm({ patientId: '', orderedById: '', priority: 'ROUTINE', selectedTests: [] })
    },
  })

  const recordResultMutation = useMutation({
    mutationFn: async ({ resultId, payload }: { resultId: string; payload: any }) => {
      const res = await api.patch(`/lab/results/${resultId}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsResultModalOpen(false)
      setSelectedResult(null)
      setResultValue('')
      setIsAbnormal(false)
      setInterpretation('')
    },
  })

  const toggleTestSelection = (testId: string) => {
    if (orderForm.selectedTests.includes(testId)) {
      setOrderForm({
        ...orderForm,
        selectedTests: orderForm.selectedTests.filter(id => id !== testId),
      })
    } else {
      setOrderForm({
        ...orderForm,
        selectedTests: [...orderForm.selectedTests, testId],
      })
    }
  }

  const columns = [
    {
      header: 'Order #',
      accessorKey: 'orderNumber' as const,
      cell: (row: LabOrder) => (
        <span className="font-mono text-cyan-400 font-semibold">{row.orderNumber}</span>
      ),
    },
    {
      header: 'Patient Details',
      cell: (row: LabOrder) => (
        <div>
          <div className="font-medium text-white">{row.patient.fullName}</div>
          <div className="text-xs text-slate-500 font-mono">{row.patient.mrn}</div>
        </div>
      ),
    },
    {
      header: 'Doctor',
      cell: (row: LabOrder) => (
        <span className="text-xs text-slate-300">{row.doctor.staff.user.fullName}</span>
      ),
    },
    {
      header: 'Tests & Results',
      cell: (row: LabOrder) => (
        <div className="space-y-1.5 py-1">
          {row.results.map(res => (
            <div key={res.id} className="flex items-center justify-between text-xs gap-3">
              <span className="text-slate-300">
                {res.testCatalog.name}:{' '}
                {res.status === 'VERIFIED' ? (
                  <strong className={res.isAbnormal ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                    {res.resultValue} {res.testCatalog.unit || ''}
                  </strong>
                ) : (
                  <span className="text-amber-400 text-[11px]">Awaiting result</span>
                )}
              </span>

              {res.status === 'PENDING' && (
                <button
                  onClick={() => {
                    setSelectedResult(res)
                    setIsResultModalOpen(true)
                  }}
                  className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[11px] font-semibold transition"
                >
                  Enter Value
                </button>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row: LabOrder) => (
        <Badge variant={row.status === 'COMPLETED' ? 'success' : 'warning'}>
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Laboratory & Diagnostics</h1>
          <p className="text-xs text-slate-400">Pathology Investigations &bull; Result Authorization</p>
        </div>

        <button
          onClick={() => setIsOrderModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition self-start"
        >
          <Plus size={15} /> Order Lab Investigation
        </button>
      </div>

      {/* Lab Orders Table */}
      <Table
        columns={columns}
        data={labOrders || []}
        isLoading={isLoading}
        emptyMessage="No laboratory orders generated yet."
      />

      {/* Order Tests Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title="Generate Lab Investigation Order"
        maxWidth="2xl"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            createOrderMutation.mutate({
              patientId: orderForm.patientId,
              orderedById: orderForm.orderedById,
              priority: orderForm.priority,
              testCatalogIds: orderForm.selectedTests,
            })
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Patient *</label>
              <select
                required
                value={orderForm.patientId}
                onChange={e => setOrderForm({ ...orderForm, patientId: e.target.value })}
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Prescribing Clinician *</label>
              <select
                required
                value={orderForm.orderedById}
                onChange={e => setOrderForm({ ...orderForm, orderedById: e.target.value })}
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
          </div>

          {/* Test Catalog Checkbox Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Investigation Panels *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-xl bg-[#090f1d] border border-slate-800">
              {testCatalog?.map((t: any) => {
                const isSelected = orderForm.selectedTests.includes(t.id)
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleTestSelection(t.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex justify-between items-center transition ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-[#0f172a] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{t.testCode} &bull; {t.category}</div>
                    </div>
                    <span className="font-mono text-xs">₹{t.price}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOrderMutation.isPending || orderForm.selectedTests.length === 0}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs disabled:opacity-50"
            >
              {createOrderMutation.isPending ? 'Generating Order...' : 'Send to Laboratory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Enter Result Modal */}
      <Modal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        title={`Enter & Authorize Result - ${selectedResult?.testCatalog?.name || ''}`}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            recordResultMutation.mutate({
              resultId: selectedResult?.id,
              payload: {
                resultValue,
                isAbnormal,
                interpretation,
              },
            })
          }}
          className="space-y-4 text-xs"
        >
          <div className="p-3 rounded-xl bg-[#090f1d] border border-slate-800 space-y-1">
            <div className="text-slate-400">
              Normal Reference Range: <strong className="text-white">{selectedResult?.testCatalog?.normalRange || 'Standard reference'}</strong>
            </div>
            <div className="text-slate-400">
              Unit: <strong className="text-cyan-400">{selectedResult?.testCatalog?.unit || 'N/A'}</strong>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Result Numerical / Text Value *</label>
            <input
              type="text"
              required
              value={resultValue}
              onChange={e => setResultValue(e.target.value)}
              placeholder="e.g. 14.2 g/dL, Negative, 98 mg/dL"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="abnormalCheck"
              checked={isAbnormal}
              onChange={e => setIsAbnormal(e.target.checked)}
              className="rounded bg-[#090f1d] border-slate-700 text-rose-500 focus:ring-0"
            />
            <label htmlFor="abnormalCheck" className="text-slate-300 cursor-pointer">
              Flag as Clinically Abnormal (Alerts Doctor)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Pathologist Interpretation / Notes</label>
            <input
              type="text"
              value={interpretation}
              onChange={e => setInterpretation(e.target.value)}
              placeholder="e.g. Within normal limits, mild leukocytosis"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsResultModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordResultMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
            >
              {recordResultMutation.isPending ? 'Verifying...' : 'Authorize Result'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
