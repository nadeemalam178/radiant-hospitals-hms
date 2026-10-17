import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Medicine } from '../types'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  Pill,
  Plus,
  PackagePlus,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react'

export const PharmacyPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false)
  const [isReceiveBatchModalOpen, setIsReceiveBatchModalOpen] = useState(false)
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)

  // Add Medicine Form
  const [medForm, setMedForm] = useState({
    itemCode: '',
    genericName: '',
    brandName: '',
    category: 'Antibiotics',
    form: 'TABLET',
    strength: '500 mg',
    reorderLevel: 20,
    unit: 'STRIP',
  })

  // Receive Batch Form
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    expiryDate: '',
    purchaseRate: 50,
    saleRate: 85,
    quantity: 100,
    referenceId: '',
  })

  // Queries
  const { data: medicines, isLoading } = useQuery<Medicine[]>({
    queryKey: ['pharmacy-medicines'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/medicines')
      return res.data.data
    },
  })

  // Mutations
  const addMedMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/pharmacy/medicines', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-medicines'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsAddMedModalOpen(false)
    },
  })

  const receiveBatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/pharmacy/batches', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy-medicines'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsReceiveBatchModalOpen(false)
      setSelectedMedicine(null)
    },
  })

  const columns = [
    {
      header: 'Item Code',
      accessorKey: 'itemCode' as const,
      cell: (row: Medicine) => (
        <span className="font-mono text-cyan-400 font-semibold">{row.itemCode}</span>
      ),
    },
    {
      header: 'Brand & Generic Name',
      cell: (row: Medicine) => (
        <div>
          <div className="font-medium text-white">{row.brandName}</div>
          <div className="text-xs text-slate-500 font-mono">{row.genericName} &bull; {row.strength}</div>
        </div>
      ),
    },
    {
      header: 'Dosage Form',
      accessorKey: 'form' as const,
      cell: (row: Medicine) => (
        <Badge variant="neutral">{row.form}</Badge>
      ),
    },
    {
      header: 'Total Stock',
      cell: (row: Medicine) => (
        <div className="space-y-1">
          <span className="font-mono font-bold text-white text-sm">
            {row.totalStock || 0} {row.unit}s
          </span>
          {row.isLowStock && (
            <div className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
              <AlertTriangle size={11} /> Reorder Alert (&le;{row.reorderLevel})
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Earliest Expiry',
      cell: (row: Medicine) => (
        row.earliestExpiry ? (
          <div className="text-xs font-mono">
            <span className={row.hasNearExpiry ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
              {new Date(row.earliestExpiry).toLocaleDateString()}
            </span>
            {row.hasNearExpiry && (
              <span className="block text-[10px] text-rose-400">Near Expiry (&le;90d)</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-500">No active batch</span>
        )
      ),
    },
    {
      header: 'Actions',
      cell: (row: Medicine) => (
        <button
          onClick={() => {
            setSelectedMedicine(row)
            setIsReceiveBatchModalOpen(true)
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition"
        >
          <PackagePlus size={13} /> Receive Batch
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Pharmacy & Medicine Inventory</h1>
          <p className="text-xs text-slate-400">Batch-Level Stock Tracking &bull; Expiry Control &bull; Stock Adjustments</p>
        </div>

        <button
          onClick={() => setIsAddMedModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition self-start"
        >
          <Plus size={15} /> Add Medicine
        </button>
      </div>

      {/* Medicines Table */}
      <Table
        columns={columns}
        data={medicines || []}
        isLoading={isLoading}
        emptyMessage="No medicines registered in the hospital formulary."
      />

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isAddMedModalOpen}
        onClose={() => setIsAddMedModalOpen(false)}
        title="Add Medicine to Hospital Formulary"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            addMedMutation.mutate(medForm)
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Item Code *</label>
              <input
                type="text"
                required
                value={medForm.itemCode}
                onChange={e => setMedForm({ ...medForm, itemCode: e.target.value })}
                placeholder="e.g. MED-PCM-500"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Brand Name *</label>
              <input
                type="text"
                required
                value={medForm.brandName}
                onChange={e => setMedForm({ ...medForm, brandName: e.target.value })}
                placeholder="e.g. Dolo 650"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Generic Name *</label>
              <input
                type="text"
                required
                value={medForm.genericName}
                onChange={e => setMedForm({ ...medForm, genericName: e.target.value })}
                placeholder="e.g. Paracetamol"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Strength *</label>
              <input
                type="text"
                required
                value={medForm.strength}
                onChange={e => setMedForm({ ...medForm, strength: e.target.value })}
                placeholder="e.g. 650 mg"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Form *</label>
              <select
                value={medForm.form}
                onChange={e => setMedForm({ ...medForm, form: e.target.value })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="TABLET">Tablet</option>
                <option value="CAPSULE">Capsule</option>
                <option value="SYRUP">Syrup</option>
                <option value="INJECTION">Injection</option>
                <option value="OINTMENT">Ointment</option>
                <option value="DROPS">Drops</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reorder Threshold</label>
              <input
                type="number"
                min="1"
                value={medForm.reorderLevel}
                onChange={e => setMedForm({ ...medForm, reorderLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddMedModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMedMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
            >
              {addMedMutation.isPending ? 'Adding...' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Receive Batch Modal */}
      <Modal
        isOpen={isReceiveBatchModalOpen}
        onClose={() => setIsReceiveBatchModalOpen(false)}
        title={`Receive Consignment Batch - ${selectedMedicine?.brandName || ''}`}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            receiveBatchMutation.mutate({
              medicineId: selectedMedicine?.id,
              batchNumber: batchForm.batchNumber,
              expiryDate: batchForm.expiryDate,
              purchaseRate: Number(batchForm.purchaseRate),
              saleRate: Number(batchForm.saleRate),
              quantity: Number(batchForm.quantity),
              referenceId: batchForm.referenceId,
            })
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Batch Number *</label>
              <input
                type="text"
                required
                value={batchForm.batchNumber}
                onChange={e => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                placeholder="e.g. BATCH-2026-X"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Expiry Date *</label>
              <input
                type="date"
                required
                value={batchForm.expiryDate}
                onChange={e => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Units Received (Quantity) *</label>
              <input
                type="number"
                min="1"
                required
                value={batchForm.quantity}
                onChange={e => setBatchForm({ ...batchForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Purchase Cost (₹/unit) *</label>
              <input
                type="number"
                step="any"
                required
                value={batchForm.purchaseRate}
                onChange={e => setBatchForm({ ...batchForm, purchaseRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Retail Price (₹/unit) *</label>
              <input
                type="number"
                step="any"
                required
                value={batchForm.saleRate}
                onChange={e => setBatchForm({ ...batchForm, saleRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Invoice / PO Reference</label>
              <input
                type="text"
                value={batchForm.referenceId}
                onChange={e => setBatchForm({ ...batchForm, referenceId: e.target.value })}
                placeholder="PO-2026-001"
                className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsReceiveBatchModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={receiveBatchMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20"
            >
              {receiveBatchMutation.isPending ? 'Stocking...' : 'Add to Stock Inventory'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
