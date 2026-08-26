import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Eye, EyeOff, Loader2, UserPlus, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please check your details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-primary-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-3 shadow-xl shadow-primary-600/30">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Attendance Manager</h1>
          <p className="text-zinc-400 mt-1 text-sm font-medium">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-100 dark:border-zinc-800 transition-colors duration-200">
          {error && (
            <div className="mb-5 p-3.5 bg-danger-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-800 rounded-xl text-sm text-danger-700 dark:text-rose-300 font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email or Student ID</label>
              <input
                type="text"
                className="input"
                placeholder="admin@school.com or STU001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-2 shadow-md" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Quick Sign Up link */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Don't have an account yet?</p>
            <Link
              to="/register"
              className="btn bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 dark:hover:bg-zinc-700 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 w-full justify-center py-2.5 rounded-xl font-bold transition-all shadow-xs text-xs flex items-center gap-2"
            >
              <UserPlus size={14} className="text-primary-600 dark:text-primary-400" />
              Register New Account
              <ArrowRight size={13} />
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
