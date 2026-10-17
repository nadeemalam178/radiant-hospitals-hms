import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { FirstRunSetup } from './pages/FirstRunSetup'
import { DashboardPage } from './pages/DashboardPage'
import { PatientsPage } from './pages/PatientsPage'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { OpdPage } from './pages/OpdPage'
import { IpdPage } from './pages/IpdPage'
import { BillingPage } from './pages/BillingPage'
import { LabPage } from './pages/LabPage'
import { PharmacyPage } from './pages/PharmacyPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15,
      refetchOnWindowFocus: false,
    },
  },
})

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isSetupRequired, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d19] flex items-center justify-center text-cyan-400 font-semibold text-xs tracking-wider uppercase animate-pulse">
        Initializing Hospital Portal...
      </div>
    )
  }

  if (isSetupRequired) {
    return <FirstRunSetup />
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="opd" element={<OpdPage />} />
        <Route path="ipd" element={<IpdPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="lab" element={<LabPage />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
