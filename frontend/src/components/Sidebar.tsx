import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  LayoutDashboard, Users, Camera, ClipboardList,
  BarChart2, LogOut, GraduationCap, Settings, UserCheck, FileText,
  Sun, Moon
} from 'lucide-react'
import { cn } from '../lib/utils'

const adminFacultyNav = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/live',       icon: Camera,          label: 'Live Feed' },
  { to: '/students',   icon: Users,           label: 'Students' },
  { to: '/attendance', icon: ClipboardList,   label: 'Attendance' },
  { to: '/leaves',     icon: FileText,        label: 'Leave Requests' },
  { to: '/reports',    icon: BarChart2,       label: 'Reports' },
]

const studentNav = [
  { to: '/student-portal', icon: UserCheck, label: 'My Attendance' },
]

export default function Sidebar() {
  const { user, logout, isAdmin, isStudent } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const currentNav = isStudent ? studentNav : adminFacultyNav

  return (
    <aside className="w-64 min-h-screen bg-black text-white flex flex-col fixed left-0 top-0 z-30 border-r border-zinc-800/80">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <GraduationCap size={22} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight text-white">AI Attendance</p>
          <p className="text-xs text-primary-400 font-medium">
            {isStudent ? 'Student Portal' : 'Manager Pro'}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        {currentNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/student-portal'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              )
            }
          >
            <Settings size={18} />
            Settings
          </NavLink>
        )}
      </nav>

      {/* User Card & Theme Switcher */}
      <div className="px-4 py-4 border-t border-zinc-800/80 bg-zinc-950/60 space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 hover:text-white transition-all w-full border border-zinc-800"
          title="Toggle Light / Dark Mode"
        >
          <span className="flex items-center gap-2">
            {isDark ? <Moon size={14} className="text-primary-400" /> : <Sun size={14} className="text-amber-400" />}
            <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {theme}
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-purple-800 text-white flex items-center justify-center text-xs font-bold shadow-sm">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-white">{user?.full_name}</p>
            <p className="text-xs text-primary-400 capitalize">
              {isStudent && user?.student_id ? `${user.student_id}` : user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 py-2 rounded-lg transition-all w-full border border-zinc-800"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
