import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { DashboardMetrics } from '../types'
import { Link } from 'react-router-dom'
import {
  Users,
  Calendar,
  Bed,
  Receipt,
  AlertTriangle,
  Clock,
  UserPlus,
  CalendarPlus,
  FilePlus,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'

export const DashboardPage: React.FC = () => {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard')
      return res.data.data
    },
    refetchInterval: 30000, // Refresh every 30s
  })

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0c1a30] via-[#0f172a] to-[#090f1d] border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Hospital Operations Center
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Real-time statistics derived directly from your local PostgreSQL database.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/patients"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/25 transition"
          >
            <UserPlus size={15} /> New Patient
          </Link>
          <Link
            to="/appointments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <CalendarPlus size={15} /> Book Appointment
          </Link>
          <Link
            to="/billing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold hover:bg-slate-700 transition"
          >
            <FilePlus size={15} /> Create Invoice
          </Link>
        </div>
      </div>

      {/* Real Statistics 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patients */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Patient Registry
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoading ? '...' : metrics?.patients.total || 0}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">+{metrics?.patients.today || 0}</span> new registrations today
          </div>
        </div>

        {/* Card 2: Appointments */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Appointments
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoading ? '...' : metrics?.appointments.total || 0}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-2">
            <span className="text-cyan-400">{metrics?.appointments.confirmed || 0} Confirmed</span>
            <span>&bull;</span>
            <span className="text-emerald-400">{metrics?.appointments.completed || 0} Completed</span>
          </div>
        </div>

        {/* Card 3: IPD Bed Occupancy */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Inpatient Wards
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Bed size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {isLoading ? '...' : metrics?.ipd.occupancyRate || '0%'}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            <span className="text-white font-semibold">{metrics?.ipd.occupiedBeds || 0}</span> of {metrics?.ipd.totalBeds || 0} beds occupied
          </div>
        </div>

        {/* Card 4: Daily Revenue */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today's Collections
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Receipt size={18} />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            ₹{isLoading ? '...' : (metrics?.financials.todayCollections || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Outstanding: <span className="text-amber-400 font-semibold">₹{(metrics?.financials.outstandingBalance || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Operational Alerts & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alerts & Workflows (1/3) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" /> Operational Attention
          </h2>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Low Stock Medicines</div>
                  <div className="text-[11px] text-slate-400">Items below reorder threshold</div>
                </div>
              </div>
              <Badge variant={metrics?.alerts?.lowStockMedicines ? 'warning' : 'neutral'}>
                {metrics?.alerts?.lowStockMedicines || 0} items
              </Badge>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Near-Expiry Batches</div>
                  <div className="text-[11px] text-slate-400">Expiring within 90 days</div>
                </div>
              </div>
              <Badge variant={metrics?.alerts?.nearExpiryBatches ? 'danger' : 'neutral'}>
                {metrics?.alerts?.nearExpiryBatches || 0} batches
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Pending Lab Orders</div>
                  <div className="text-[11px] text-slate-400">Awaiting sample/results</div>
                </div>
              </div>
              <Badge variant="cyan">
                {metrics?.alerts?.pendingLabOrders || 0} orders
              </Badge>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Audit Activity Log (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} className="text-cyan-400" /> Recent System Audit Events
            </h2>
            <Link to="/settings" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="divide-y divide-slate-800/80">
              {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
                metrics.recentActivity.map(act => (
                  <div key={act.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <div>
                        <span className="font-semibold text-white">{act.action}</span>
                        <span className="text-slate-400 ml-2">on {act.entityName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>{act.actorEmail || 'System'}</span>
                      <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No audit logs recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
