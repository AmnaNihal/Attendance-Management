import { useQuery } from '@tanstack/react-query'
import { getDailyReport, getWeeklyReport, getStudentSummary } from '../lib/api'
import { today, formatDate, pct } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'
import { Users, UserCheck, UserX, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'

function StatCard({ label, value, icon: Icon, color, subtext }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-zinc-950 dark:text-white mt-2">{value}</p>
      {subtext && <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{subtext}</span>}
    </div>
  )
}

export default function Dashboard() {
  const todayStr = today()
  const { isDark } = useTheme()

  const { data: daily } = useQuery({
    queryKey: ['daily-report', todayStr],
    queryFn: () => getDailyReport(todayStr).then(r => r.data),
    refetchInterval: 3000,
  })

  const { data: weekly } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: () => getWeeklyReport().then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: summary } = useQuery({
    queryKey: ['student-summary'],
    queryFn: () => getStudentSummary().then(r => r.data),
    refetchInterval: 3000,
  })

  const lowAttendance = summary?.filter((s: any) => s.low_attendance) ?? []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">Real-time attendance intelligence · {formatDate(todayStr)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-primary-100 text-primary-900 border border-primary-200 dark:bg-primary-950 dark:text-primary-300 dark:border-primary-800">
            ● Live System Online
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={daily?.total_students ?? '—'}
          icon={Users}
          color="bg-primary-600 shadow-primary-600/30"
          subtext="Enrolled across all courses"
        />
        <StatCard
          label="Present Today"
          value={daily?.present ?? '—'}
          icon={UserCheck}
          color="bg-emerald-600 shadow-emerald-600/30"
          subtext="Verified at entrance camera"
        />
        <StatCard
          label="Absent Today"
          value={daily?.absent ?? '—'}
          icon={UserX}
          color="bg-rose-600 shadow-rose-600/30"
          subtext="Pending / unrecorded"
        />
        <StatCard
          label="Attendance Rate"
          value={daily ? pct(daily.attendance_percentage) : '—'}
          icon={TrendingUp}
          color="bg-purple-900 shadow-purple-900/30"
          subtext="Today's aggregate percentage"
        />
      </div>

      {/* Low attendance alert */}
      {lowAttendance.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/80 rounded-2xl p-4 flex gap-3 shadow-sm">
          <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-900 dark:text-rose-300 text-sm">Low Attendance Alert (Below 75% Requirement)</p>
            <p className="text-rose-700 dark:text-rose-400 text-sm mt-0.5 font-medium">
              <strong>{lowAttendance.length} student{lowAttendance.length > 1 ? 's' : ''}</strong> below threshold:{' '}
              {lowAttendance.slice(0, 5).map((s: any) => s.student.full_name).join(', ')}
              {lowAttendance.length > 5 ? ` +${lowAttendance.length - 5} more` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly bar chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">Weekly Attendance Overview</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={weekly ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#f4f4f5'} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <YAxis tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#09090b' : '#ffffff',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  borderRadius: '12px',
                  color: isDark ? '#ffffff' : '#09090b',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#9333ea" radius={[6,6,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill={isDark ? '#3f3f46' : '#e4e4e7'} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance % line */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">Attendance % Trend</h2>
            <span className="text-xs text-primary-600 dark:text-primary-400 font-bold">Goal: &ge; 75%</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={weekly ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#f4f4f5'} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <Tooltip
                formatter={(v: number) => `${v}%`}
                contentStyle={{
                  backgroundColor: isDark ? '#09090b' : '#ffffff',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  borderRadius: '12px',
                  color: isDark ? '#ffffff' : '#09090b',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
              />
              <Line
                type="monotone" dataKey="percentage" name="Attendance %"
                stroke="#a855f7" strokeWidth={3} dot={{ fill: '#7e22ce', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom students table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">Student Attendance Standings</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">{summary?.length || 0} Registered</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-700 dark:text-zinc-300 font-bold">
              <tr>
                <th className="px-6 py-3.5">Student</th>
                <th className="px-6 py-3.5">ID</th>
                <th className="px-6 py-3.5">Present</th>
                <th className="px-6 py-3.5">Absent</th>
                <th className="px-6 py-3.5">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {summary?.map((s: any) => (
                <tr key={s.student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{s.student.full_name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400 font-semibold">{s.student.student_id}</td>
                  <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-bold">{s.present_days}</td>
                  <td className="px-6 py-4 text-rose-700 dark:text-rose-400 font-bold">{s.absent_days}</td>
                  <td className="px-6 py-4">
                    <span className={s.low_attendance ? 'badge-red' : 'badge-purple'}>
                      {pct(s.attendance_percentage)}
                    </span>
                  </td>
                </tr>
              ))}
              {!summary?.length && (
                <tr><td colSpan={5} className="py-8 text-center text-zinc-400">No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
