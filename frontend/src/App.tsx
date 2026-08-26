import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import LoginPage     from './pages/Login'
import RegisterPage  from './pages/Register'
import Dashboard     from './pages/Dashboard'
import LiveFeed      from './pages/LiveFeed'
import Students      from './pages/Students'
import Attendance    from './pages/Attendance'
import Reports       from './pages/Reports'
import Settings      from './pages/Settings'
import StudentPortal from './pages/StudentPortal'
import LeavesReview  from './pages/LeavesReview'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function RootRedirect() {
  const { isStudent } = useAuth()
  if (isStudent) {
    return <Navigate to="/student-portal" replace />
  }
  return <Dashboard />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route element={<Layout />}>
                <Route index               element={<RootRedirect />} />
                <Route path="student-portal" element={<StudentPortal />} />
                <Route path="live"         element={<LiveFeed />} />
                <Route path="students"     element={<Students />} />
                <Route path="attendance"   element={<Attendance />} />
                <Route path="leaves"       element={<LeavesReview />} />
                <Route path="reports"      element={<Reports />} />
                <Route path="settings"     element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
