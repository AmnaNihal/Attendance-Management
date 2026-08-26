import React, { createContext, useContext, useState, useEffect } from 'react'
import { getMe, login as apiLogin } from '../lib/api'

interface User {
  id: number
  full_name: string
  email: string
  student_id?: string
  role: 'admin' | 'faculty' | 'student'
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isStudent: boolean
  isFaculty: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => { localStorage.removeItem('token'); setToken(null) })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await apiLogin(email.trim(), password)
    const { access_token } = res.data
    localStorage.setItem('token', access_token)
    setToken(access_token)
    // Query profile with the fresh token
    const meRes = await getMe()
    setUser(meRes.data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student',
        isFaculty: user?.role === 'faculty',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
