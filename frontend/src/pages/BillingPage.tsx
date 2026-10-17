import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { Invoice, Patient } from '../types'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import {
  Receipt,
  Plus,
  CreditCard,
  Printer,
  Trash2,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react'

export const BillingPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)

  // Invoice creation form
  const [invoicePatientId, setInvoicePatientId] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [items, setItems] = useState<any[]>([
    { description: 'General Consultation Fee', quantity: 1, unitPrice: 500, taxRate: 0 },
  ])

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'INSURANCE'>('CASH')
  const [paymentReference, setPaymentReference] = useState('')

  // Queries
  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', page],
    queryFn: async () => {
      const res = await api.get('/billing/invoices', { params: { page, limit: 10 } })
      return res.data
    },
  })

  const { data: patients } = useQuery({
    queryKey: ['patients-quick'],
    queryFn: async () => {
      const res = await api.get('/patients', { params: { limit: 50 } })
      return res.data.data
    },
  })

  const { data: printInvoiceData } = useQuery({
    queryKey: ['invoice-print', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null
      const res = await api.get(`/billing/invoices/${selectedInvoiceId}`)
      return res.data.data
    },
    enabled: !!selectedInvoiceId,
  })

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/billing/invoices', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setIsInvoiceModalOpen(false)
      setItems([{ description: 'General Consultation Fee', quantity: 1, unitPrice: 500, taxRate: 0 }])
      setDiscountAmount(0)
      setInvoicePatientId('')
    },
  })

  const recordPaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/billing/payments', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      setPaymentInvoice(null)
    },
  })

  const handleAddItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }])
  }

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice || 0), 0)
  }

  const calculateTotal = () => {
    const sub = calculateSubtotal()
    return Math.max(0, sub - (discountAmount || 0))
  }

  const statusBadges: Record<string, any> = {
    DRAFT: 'neutral',
    FINALIZED: 'info',
    PARTIALLY_PAID: 'warning',
    PAID: 'success',
    CANCELLED: 'danger',
  }

  const columns = [
    {
      header: 'Invoice #',
      accessorKey: 'invoiceNumber' as const,
      cell: (row: Invoice) => (
        <span className="font-mono text-cyan-400 font-semibold">{row.invoiceNumber}</span>
      ),
    },
    {
      header: 'Patient Details',
      cell: (row: Invoice) => (
        <div>
          <div className="font-medium text-white">{row.patient.fullName}</div>
          <div className="text-xs text-slate-500 font-mono">
            {row.patient.mrn} &bull; {row.patient.phone}
          </div>
          {(row.patient as any).abhaNumber && (
            <div className="text-[10px] text-emerald-400 font-mono font-semibold">
              ABHA: {(row.patient as any).abhaNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Total Amount',
      cell: (row: Invoice) => (
        <span className="font-mono font-bold text-white">₹{row.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      header: 'Paid / Balance',
      cell: (row: Invoice) => (
        <div className="text-xs font-mono">
          <div className="text-emerald-400">Paid: ₹{row.paidAmount.toLocaleString()}</div>
          <div className={row.balanceAmount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
            Bal: ₹{row.balanceAmount.toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row: Invoice) => (
        <Badge variant={statusBadges[row.status] || 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row: Invoice) => (
        <div className="flex items-center gap-2">
          {row.balanceAmount > 0 && (
            <button
              onClick={() => {
                setPaymentInvoice(row)
                setPaymentAmount(row.balanceAmount)
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition"
            >
              <CreditCard size={13} /> Pay
            </button>
          )}
          <button
            onClick={() => setSelectedInvoiceId(row.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
          >
            <Printer size={13} /> Invoice
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Billing & Financial Invoicing</h1>
          <p className="text-xs text-slate-400">Invoice Generation &bull; Payment Collections &bull; Audit Trail</p>
        </div>

        <button
          onClick={() => setIsInvoiceModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition self-start"
        >
          <Plus size={15} /> Create Invoice
        </button>
      </div>

      {/* Invoice Table */}
      <Table
        columns={columns}
        data={invoicesData?.data || []}
        isLoading={isLoading}
        pagination={
          invoicesData?.pagination
            ? {
                page: invoicesData.pagination.page,
                totalPages: invoicesData.pagination.totalPages,
                total: invoicesData.pagination.total,
                onPageChange: p => setPage(p),
              }
            : undefined
        }
      />

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Generate Hospital Invoice"
        maxWidth="2xl"
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            createInvoiceMutation.mutate({
              patientId: invoicePatientId,
              discountAmount: Number(discountAmount),
              notes: invoiceNotes,
              items: items.map(it => ({
                description: it.description,
                quantity: Number(it.quantity),
                unitPrice: Number(it.unitPrice),
                taxRate: Number(it.taxRate || 0),
              })),
            })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Patient *</label>
            <select
              required
              value={invoicePatientId}
              onChange={e => setInvoicePatientId(e.target.value)}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value="">-- Choose Patient --</option>
              {patients?.map((p: Patient) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.mrn} &bull; {p.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-300">Invoice Line Items</label>
            {items.map((it, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#090f1d] border border-slate-800 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    required
                    placeholder="Service description"
                    value={it.description}
                    onChange={e => {
                      const updated = [...items]
                      updated[idx].description = e.target.value
                      setItems(updated)
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={e => {
                      const updated = [...items]
                      updated[idx].quantity = e.target.value
                      setItems(updated)
                    }}
                    className="w-full px-2 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs text-center"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Price (₹)"
                    value={it.unitPrice}
                    onChange={e => {
                      const updated = [...items]
                      updated[idx].unitPrice = e.target.value
                      setItems(updated)
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-xs font-mono"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddItemRow}
              className="text-xs text-cyan-400 font-semibold inline-flex items-center gap-1 mt-1"
            >
              <Plus size={14} /> Add Line Item
            </button>
          </div>

          {/* Discount & Totals */}
          <div className="p-4 rounded-xl bg-[#090f1d] border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-white">₹{calculateSubtotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Discount (₹):</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={e => setDiscountAmount(Number(e.target.value))}
                className="w-24 px-2 py-1 bg-[#0f172a] border border-slate-700 rounded text-white text-right font-mono"
              />
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-white pt-2 border-t border-slate-800">
              <span>Total Payable Amount:</span>
              <span className="text-cyan-400 font-mono">₹{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="px-5 py-2 rounded-xl bg-cyan-500 text-black font-bold text-xs"
            >
              {createInvoiceMutation.isPending ? 'Generating...' : 'Finalize Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        title={`Receive Payment - ${paymentInvoice?.invoiceNumber || ''}`}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            recordPaymentMutation.mutate({
              invoiceId: paymentInvoice?.id,
              amount: Number(paymentAmount),
              paymentMethod,
              transactionReference: paymentReference,
            })
          }}
          className="space-y-4 text-xs"
        >
          <div className="p-3 rounded-xl bg-[#090f1d] border border-slate-800 space-y-1">
            <div className="text-slate-400">
              Patient: <strong className="text-white">{paymentInvoice?.patient.fullName}</strong>
            </div>
            <div className="text-slate-400">
              Outstanding Balance: <strong className="text-amber-400 font-mono">₹{paymentInvoice?.balanceAmount.toLocaleString()}</strong>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Payment Amount (₹) *</label>
            <input
              type="number"
              step="any"
              max={paymentInvoice?.balanceAmount}
              required
              value={paymentAmount}
              onChange={e => setPaymentAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Payment Mode *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="INSURANCE">Insurance TPA</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Transaction Ref / Cheque No.</label>
            <input
              type="text"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              placeholder="e.g. UPI Ref 20261016XXXX"
              className="w-full px-3 py-2 bg-[#090f1d] border border-slate-700/80 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPaymentInvoice(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={recordPaymentMutation.isPending}
              className="px-5 py-2 rounded-xl bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20"
            >
              {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        title="Official Patient Invoice Receipt"
        maxWidth="2xl"
      >
        {printInvoiceData ? (
          <div className="p-6 bg-white text-black rounded-xl space-y-6 print-card text-xs">
            {/* Hospital Header */}
            <div className="flex justify-between items-start border-b pb-4 border-gray-300">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {printInvoiceData.hospital?.name || 'Radiant Hospitals'}
                </h2>
                <p className="text-gray-600">{printInvoiceData.hospital?.address}</p>
                <p className="text-gray-600">Phone: {printInvoiceData.hospital?.phone}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-gray-900 block">
                  {printInvoiceData.invoice.invoiceNumber}
                </span>
                <span className="text-gray-600">
                  Date: {new Date(printInvoiceData.invoice.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Patient Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-500 block text-[10px]">Patient Name:</span>
                <strong className="text-gray-900">{printInvoiceData.invoice.patient.fullName}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">Hospital MRN:</span>
                <strong className="font-mono text-gray-900">{printInvoiceData.invoice.patient.mrn}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">ABHA ID (ABDM):</span>
                <strong className="font-mono text-emerald-700">
                  {printInvoiceData.invoice.patient.abhaNumber || 'Not Linked'}
                </strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px]">ABDM Facility ID:</span>
                <strong className="font-mono text-gray-700">
                  {printInvoiceData.hospital?.facilityId || 'IN2910000452'}
                </strong>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-700 font-bold">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {printInvoiceData.invoice.items.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-900">{it.description}</td>
                    <td className="py-2 text-center text-gray-700">{it.quantity}</td>
                    <td className="py-2 text-right font-mono text-gray-700">₹{it.unitPrice.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono font-semibold text-gray-900">₹{it.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary Box */}
            <div className="border-t border-gray-300 pt-3 space-y-1 text-right">
              <div className="text-gray-600">
                Subtotal: <span className="font-mono">₹{printInvoiceData.invoice.subTotal.toLocaleString()}</span>
              </div>
              {printInvoiceData.invoice.discountAmount > 0 && (
                <div className="text-gray-600">
                  Discount: <span className="font-mono">-₹{printInvoiceData.invoice.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="text-base font-bold text-gray-900 pt-1">
                Net Payable: <span className="font-mono">₹{printInvoiceData.invoice.totalAmount.toLocaleString()}</span>
              </div>
              <div className="text-emerald-700 font-semibold">
                Amount Paid: <span className="font-mono">₹{printInvoiceData.invoice.paidAmount.toLocaleString()}</span>
              </div>
              <div className="text-rose-700 font-bold">
                Balance Due: <span className="font-mono">₹{printInvoiceData.invoice.balanceAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Print Action */}
            <div className="flex justify-end gap-3 pt-4 border-t no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
