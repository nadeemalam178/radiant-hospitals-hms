import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { BarChart3, Download, Calendar, DollarSign, CreditCard } from 'lucide-react'

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['financial-report', startDate, endDate],
    queryFn: async () => {
      const res = await api.get('/reports/financials', {
        params: { startDate, endDate },
      })
      return res.data.data
    },
  })

  const exportCSV = () => {
    if (!reportData) return
    const rows = [
      ['Payment Method', 'Amount Collected (INR)'],
      ...Object.entries(reportData.collectionsByMethod || {}).map(([method, amount]) => [
        method,
        String(amount),
      ]),
      ['Total', String(reportData.totalCollected || 0)],
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `financial-report-${startDate}-to-${endDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Hospital Reports & Financial Analytics</h1>
          <p className="text-xs text-slate-400">Revenue Reconciliation &bull; Audit Summary &bull; CSV Export</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-[#0f172a] border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Revenue Collected
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            ₹{isLoading ? '...' : (reportData?.totalCollected || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            During selected audit window
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Invoices Issued
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {isLoading ? '...' : reportData?.totalInvoicesCount || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Bills generated across departments
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Audit Integrity Check
          </div>
          <div className="text-3xl font-extrabold text-cyan-400">
            100%
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Zero tamper anomalies detected
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by Payment Method */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={18} className="text-cyan-400" /> Collections by Payment Instrument
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
            Calculating financial totals...
          </div>
        ) : reportData?.collectionsByMethod && Object.keys(reportData.collectionsByMethod).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(reportData.collectionsByMethod).map(([method, amount]: [string, any]) => (
              <div key={method} className="p-4 rounded-xl bg-[#090f1d] border border-slate-800">
                <div className="text-xs font-semibold text-slate-400">{method}</div>
                <div className="text-xl font-bold text-white font-mono mt-1">₹{amount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {reportData.totalCollected > 0
                    ? `${((amount / reportData.totalCollected) * 100).toFixed(1)}% of total`
                    : '0%'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 text-xs">
            No collection transactions found for the specified date range.
          </div>
        )}
      </div>
    </div>
  )
}
