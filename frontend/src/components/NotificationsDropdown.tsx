import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStudentSummary, getMyStudentStats, getAllLeaves } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { Bell, AlertTriangle, FileText, CheckCircle2, ChevronRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationsDropdown() {
  const { user, isStudent, isAdmin, isFaculty } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Faculty/Admin: Query all student summaries for low attendance
  const { data: summary = [] } = useQuery({
    queryKey: ['student-summary'],
    queryFn: () => getStudentSummary().then(r => r.data),
    enabled: !isStudent,
    refetchInterval: 15000,
  })

  // Faculty/Admin: Query pending leaves
  const { data: leaves = [] } = useQuery({
    queryKey: ['all-leaves-notifications'],
    queryFn: () => getAllLeaves('pending').then(r => r.data),
    enabled: !isStudent,
    refetchInterval: 15000,
  })

  // Student: Query personal student stats
  const { data: studentStats } = useQuery({
    queryKey: ['my-student-stats'],
    queryFn: () => getMyStudentStats().then(r => r.data),
    enabled: isStudent,
    refetchInterval: 15000,
  })

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Calculate notifications
  const lowAttendanceStudents = !isStudent ? summary.filter((s: any) => s.low_attendance) : []
  const pendingLeaves = !isStudent ? leaves : []
  const studentLowAttendance = isStudent && studentStats?.is_low_attendance

  const notificationCount = isStudent
    ? (studentLowAttendance ? 1 : 0)
    : (lowAttendanceStudents.length + pendingLeaves.length)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-all cursor-pointer active:scale-95 shadow-xs"
        title="In-App Notifications"
      >
        <Bell size={17} />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-600 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm animate-pulse">
            {notificationCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden text-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary-600 dark:text-primary-400" />
              <h3 className="font-bold text-zinc-950 dark:text-white">In-App Notifications</h3>
            </div>
            <span className="badge-purple text-xs px-2 py-0.5 font-bold">
              {notificationCount} Alert{notificationCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-3 space-y-2.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {/* STUDENT VIEW: Low attendance alert */}
            {isStudent && studentLowAttendance && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
                <div className="flex items-start gap-2 text-rose-900 dark:text-rose-300">
                  <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs">Low Attendance Warning</p>
                    <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 font-medium">
                      Your attendance is at <strong>{(studentStats.attendance_percentage).toFixed(1)}%</strong> (Below mandatory 75% threshold).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setIsOpen(false); navigate('/student-portal') }}
                  className="btn-danger text-xs py-1 px-3 w-full justify-center"
                >
                  Apply for Leave Now &rarr;
                </button>
              </div>
            )}

            {/* FACULTY / ADMIN VIEW: Low attendance student alerts */}
            {!isStudent && lowAttendanceStudents.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={13} /> Low Attendance Students (&lt;75%)
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">{lowAttendanceStudents.length}</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {lowAttendanceStudents.map((s: any) => (
                    <div
                      key={s.student.id}
                      onClick={() => { setIsOpen(false); navigate('/reports') }}
                      className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 hover:bg-rose-100/80 cursor-pointer flex items-center justify-between transition-all text-xs"
                    >
                      <div>
                        <p className="font-bold text-zinc-950 dark:text-white">{s.student.full_name}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{s.student.student_id}</p>
                      </div>
                      <span className="badge-red text-[11px] font-black">{s.attendance_percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FACULTY / ADMIN VIEW: Pending leave applications */}
            {!isStudent && pendingLeaves.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={13} /> Pending Leave Applications
                  </span>
                  <span className="text-xs text-zinc-500 font-bold">{pendingLeaves.length}</span>
                </div>
                <div className="space-y-1.5">
                  {pendingLeaves.slice(0, 3).map((l: any) => (
                    <div
                      key={l.id}
                      onClick={() => { setIsOpen(false); navigate('/leaves') }}
                      className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 hover:bg-amber-100/80 cursor-pointer flex items-center justify-between transition-all text-xs"
                    >
                      <div>
                        <p className="font-bold text-zinc-950 dark:text-white">{l.student?.full_name}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{l.leave_type} Leave</p>
                      </div>
                      <span className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                        Review &rarr;
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {notificationCount === 0 && (
              <div className="py-8 text-center text-zinc-400 dark:text-zinc-600 space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 opacity-60" />
                <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300">All Clear!</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">No active low attendance warnings or pending requests.</p>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <button
              onClick={() => { setIsOpen(false); navigate(!isStudent ? '/reports' : '/student-portal') }}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
            >
              View Detailed Reports &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
