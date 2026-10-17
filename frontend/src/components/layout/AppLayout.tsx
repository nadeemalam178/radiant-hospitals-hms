import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Bed,
  Receipt,
  FlaskConical,
  Pill,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ShieldCheck,
  Activity,
} from 'lucide-react'

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { user, hospital, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Appointments', path: '/appointments', icon: Calendar },
    { name: 'OPD Clinical', path: '/opd', icon: Stethoscope },
    { name: 'IPD / Wards', path: '/ipd', icon: Bed },
    { name: 'Billing & Invoices', path: '/billing', icon: Receipt },
    { name: 'Laboratory', path: '/lab', icon: FlaskConical },
    { name: 'Pharmacy & Stock', path: '/pharmacy', icon: Pill },
    { name: 'Reports & Audits', path: '/reports', icon: BarChart3 },
    { name: 'Hospital Settings', path: '/settings', icon: Settings },
  ]

  // Get current breadcrumb label
  const currentNav = navItems.find(item => item.path === location.pathname) || { name: 'Hospital Portal' }

  return (
    <div className="flex h-screen bg-[#090f1d] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } flex-shrink-0 bg-[#0c1427] border-r border-slate-800/80 flex flex-col transition-all duration-300 z-30 select-none`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-cyan-500/20">
              <Activity size={22} />
            </div>
            {!collapsed && (
              <div className="truncate">
                <h1 className="font-bold text-sm text-white tracking-tight leading-none truncate">
                  {hospital?.name || 'Radiant Hospital'}
                </h1>
                <span className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">
                  {hospital?.code || 'RHRI'} &bull; ABDM CONNECTED
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={19} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Profile in Sidebar Bottom */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080d1a]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 flex-shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-200 truncate">{user?.fullName}</div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-400" />
                    {user?.roles?.[0] || 'Staff'}
                  </div>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/80 bg-[#090f1d]/80 backdrop-blur-md z-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span>{hospital?.name || 'Hospital'}</span>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="text-cyan-400 font-semibold">{currentNav.name}</span>
          </div>

          {/* System Environment & Status Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ABDM HFR: {hospital?.facilityId || 'IN2910000452'}
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              LAN Active (Port 4000)
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
