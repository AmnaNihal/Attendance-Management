import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../lib/api'
import { GraduationCap, Eye, EyeOff, Loader2, UserPlus, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student')
  const [studentId, setStudentId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await register({
        full_name: fullName,
        email: email,
        password: password,
        role: role,
        student_id: role === 'student' ? studentId.trim() || undefined : undefined,
      })

      setSuccess('Account created successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-primary-950 p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-3 shadow-xl shadow-primary-600/30">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Create New Account</h1>
          <p className="text-zinc-400 mt-1 text-sm font-medium">Register for AI Attendance Manager</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          {error && (
            <div className="mb-4 p-3.5 bg-danger-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800 rounded-xl text-sm text-danger-700 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 bg-success-50 dark:bg-emerald-950/50 border border-green-200 dark:border-emerald-800 rounded-xl text-sm text-success-700 dark:text-emerald-300 flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} className="text-success-600 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="label">Full Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Address *</label>
              <input
                type="email"
                className="input"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role Dropdown */}
            <div>
              <label className="label">Account Role *</label>
              <select
                className="input cursor-pointer font-semibold"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                required
              >
                <option value="student">🎓 Student (Student Portal Access)</option>
                <option value="faculty">👨‍🏫 Faculty (Attendance &amp; Live Feed)</option>
                <option value="admin">⚙️ Administrator (Full Control &amp; Model)</option>
              </select>
            </div>

            {/* Conditional Student ID input when role is student */}
            {role === 'student' && (
              <div className="bg-primary-50/60 dark:bg-primary-950/40 p-3.5 rounded-2xl border border-primary-100 dark:border-primary-800 space-y-1">
                <label className="label text-primary-900 dark:text-primary-300 font-semibold mb-1">
                  Student ID <span className="text-zinc-400 font-normal text-xs">(Optional - e.g. STU007)</span>
                </label>
                <input
                  type="text"
                  className="input bg-white dark:bg-zinc-900"
                  placeholder="STU007 (auto-assigned if left blank)"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
                <p className="text-xs text-primary-700 dark:text-primary-400 mt-1 font-medium">
                  You can log into the student portal using this ID or your email.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2 shadow-md"
              disabled={loading || !!success}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  Register Account
                </>
              )}
            </button>
          </form>

          {/* Quick back to Login */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Already registered?</p>
            <Link
              to="/login"
              className="btn bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 w-full justify-center py-2.5 rounded-xl font-bold transition-all shadow-xs text-xs flex items-center gap-2"
            >
              <ArrowLeft size={13} />
              Return to Sign In
            </Link>
          </div>
        </div>

        <p className="text-center text-zinc-500 text-xs mt-6 font-medium">
          AI Attendance Manager &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
