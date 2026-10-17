import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
import { User, HospitalSettings } from '../types'

interface AuthContextType {
  user: User | null
  hospital: HospitalSettings | null
  isAuthenticated: boolean
  isSetupRequired: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setupHospital: (data: any) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [hospital, setHospital] = useState<HospitalSettings | null>(null)
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  const checkAuthStatus = async () => {
    try {
      // 1. Check if first run setup is needed
      const statusRes = await api.get('/auth/status')
      if (statusRes.data.data.isSetupRequired) {
        setIsSetupRequired(true)
        setLoading(false)
        return
      }

      setHospital(statusRes.data.data.hospital)

      // 2. Check if token exists
      const token = localStorage.getItem('hms_access_token')
      if (!token) {
        setLoading(false)
        return
      }

      // 3. Fetch user profile
      const meRes = await api.get('/auth/me')
      setUser(meRes.data.data.user)
      if (meRes.data.data.hospital) {
        setHospital(meRes.data.data.hospital)
      }
    } catch (error) {
      localStorage.removeItem('hms_access_token')
      localStorage.removeItem('hms_refresh_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { user: userData, tokens } = res.data.data

    localStorage.setItem('hms_access_token', tokens.accessToken)
    localStorage.setItem('hms_refresh_token', tokens.refreshToken)

    setUser(userData)
    await checkAuthStatus()
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('hms_refresh_token')
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch (e) {
      // Ignore
    } finally {
      localStorage.removeItem('hms_access_token')
      localStorage.removeItem('hms_refresh_token')
      setUser(null)
    }
  }

  const setupHospital = async (data: any) => {
    const res = await api.post('/auth/setup', data)
    const { hospital: hospitalData, user: userData, tokens } = res.data.data

    localStorage.setItem('hms_access_token', tokens.accessToken)
    localStorage.setItem('hms_refresh_token', tokens.refreshToken)

    setHospital(hospitalData)
    setUser(userData)
    setIsSetupRequired(false)
  }

  const refreshProfile = async () => {
    try {
      const meRes = await api.get('/auth/me')
      setUser(meRes.data.data.user)
      setHospital(meRes.data.data.hospital)
    } catch (e) {
      // Ignore
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hospital,
        isAuthenticated: !!user,
        isSetupRequired,
        loading,
        login,
        logout,
        setupHospital,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
