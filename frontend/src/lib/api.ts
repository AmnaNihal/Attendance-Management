import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password })

export const register = (data: { full_name: string; email: string; password: string; role: string; student_id?: string }) =>
  api.post('/api/auth/register', data)

export const getMe = () => api.get('/api/auth/me')

// ── Students ──────────────────────────────────────────────────────────────────
export const getStudents = () => api.get('/api/students/')
export const getStudent = (id: string) => api.get(`/api/students/${id}`)
export const createStudent = (data: any) => api.post('/api/students/', data)
export const deleteStudent = (id: string) => api.delete(`/api/students/${id}`)
export const uploadStudentPhotos = (studentId: string, formData: FormData) =>
  api.post(`/api/students/${studentId}/upload-photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const triggerCapture = (id: string, numImages = 100) =>
  api.post(`/api/students/${id}/capture?num_images=${numImages}`)

// ── Attendance ────────────────────────────────────────────────────────────────
export const getAttendance = (params?: { date?: string; student_id?: number; status?: string }) =>
  api.get('/api/attendance/', { params })

export const markAttendance = (data: { student_id: number; date: string; status: string }) =>
  api.post('/api/attendance/mark', data)

export const markAllAbsent = (date: string) =>
  api.post(`/api/attendance/mark-all-absent?date=${date}`)

// ── Camera ────────────────────────────────────────────────────────────────────
export const STREAM_URL = `${BASE_URL}/api/camera/stream`
export const WS_URL = BASE_URL.replace('http', 'ws') + '/api/camera/ws'

export const loadModel = () => api.post('/api/camera/load-model')
export const resetSession = () => api.post('/api/camera/reset-session')

// ── Training ──────────────────────────────────────────────────────────────────
export const trainModel = () => api.post('/api/training/train')
export const getTrainingStatus = () => api.get('/api/training/status')

// ── Reports ───────────────────────────────────────────────────────────────────
export const getDailyReport = (date?: string) =>
  api.get('/api/reports/daily', { params: date ? { date } : {} })

export const getWeeklyReport = () => api.get('/api/reports/weekly')
export const getStudentSummary = () => api.get('/api/reports/student-summary')
export const sendAlerts = () => api.post('/api/reports/send-alerts')
export const sendDailyReport = (date?: string) =>
  api.post('/api/reports/send-daily-report', null, { params: date ? { date } : {} })
export const exportCSV = (date?: string) =>
  api.get('/api/reports/export/csv', {
    params: date ? { date } : {},
    responseType: 'blob',
  })

// ── Student Portal ─────────────────────────────────────────────────────────────
export const getMyStudentStats = () => api.get('/api/student-portal/stats')
export const getMyStudentAttendance = (params?: { status?: string }) =>
  api.get('/api/student-portal/attendance', { params })
export const exportMyStudentCSV = () =>
  api.get('/api/student-portal/export-csv', { responseType: 'blob' })

export const applyLeave = (data: { start_date: string; end_date: string; leave_type: string; reason: string }) =>
  api.post('/api/student-portal/leaves', data)
export const getMyLeaves = () => api.get('/api/student-portal/leaves')

export const uploadFacePhotos = (formData: FormData) =>
  api.post('/api/student-portal/upload-photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// ── Faculty / Admin Leave Management ──────────────────────────────────────────
export const getAllLeaves = (status?: string) =>
  api.get('/api/leaves/', { params: status ? { status } : {} })
export const reviewLeave = (leaveId: number, data: { status: string; faculty_remarks?: string }) =>
  api.patch(`/api/leaves/${leaveId}/review`, data)
