import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Sidebar from '../components/Sidebar'
import NotificationsDropdown from '../components/NotificationsDropdown'
import { Sun, Moon, ShieldCheck, User } from 'lucide-react'

export default function Layout() {
  const { user, isLoading, isStudent } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 px-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-20 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              AI Vision System Online
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* In-App Notifications Center (Bell) */}
            <NotificationsDropdown />

            {/* Direct Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              type="button"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs transition-all cursor-pointer active:scale-95"
              title="Click to Switch Light / Dark Mode"
            >
              {isDark ? (
                <>
                  <Moon size={15} className="text-primary-400" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={15} className="text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            {/* User Quick Info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-purple-800 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {user.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  {user.full_name}
                </p>
                <p className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  {isStudent && user.student_id ? user.student_id : user.role}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
