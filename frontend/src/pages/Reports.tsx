import { useQuery, useMutation } from '@tanstack/react-query'
import { getStudentSummary, getWeeklyReport, sendAlerts, sendDailyReport, exportCSV } from '../lib/api'
import { pct, downloadBlob } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Mail, Download, AlertTriangle, Loader2, Send } from 'lucide-react'

export default function Reports() {
  const { isDark } = useTheme()
  const PIE_COLORS = ['#9333ea', isDark ? '#3f3f46' : '#e4e4e7']

  const { data: summary = [] } = useQuery({
    queryKey: ['student-summary'],
    queryFn: () => getStudentSummary().then(r => r.data),
  })

  const { data: weekly = [] } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: () => getWeeklyReport().then(r => r.data),
  })

  const { mutate: doAlerts, isPending: alerting } = useMutation({ mutationFn: sendAlerts })
  const { mutate: doReport, isPending: reporting } = useMutation({ mutationFn: () => sendDailyReport() })

  const handleExportAll = async () => {
    const res = await exportCSV()
    downloadBlob(res.data, 'attendance_all.csv')
  }

  const lowCount   = summary.filter((s: any) => s.low_attendance).length
  const totalDays  = summary[0]?.total_days ?? 0

  // Pie chart data
  const avgPresent = summary.length > 0
    ? summary.reduce((acc: number, s: any) => acc + s.present_days, 0) / summary.length
    : 0
  const pieData = [
    { name: 'Avg Present', value: parseFloat(avgPresent.toFixed(1)) },
    { name: 'Avg Absent',  value: parseFloat(Math.max(0, totalDays - avgPresent).toFixed(1)) },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">Historical attendance metrics, AI alerts, and CSV exports</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button onClick={handleExportAll} className="btn-secondary">
            <Download size={14} className="text-primary-600 dark:text-primary-400" /> Export All (CSV)
          </button>
          <button onClick={() => doAlerts()} disabled={alerting} className="btn-secondary">
            {alerting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />}
            Send Low Attendance Alerts
          </button>
          <button onClick={() => doReport()} disabled={reporting} className="btn-primary">
            {reporting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Email Daily Report
          </button>
        </div>
      </div>

      {/* Summary highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Total Tracked Students</span>
          <p className="text-3xl font-black text-zinc-950 dark:text-white mt-1">{summary.length}</p>
          <span className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-1">Across all registered cohorts</span>
        </div>
        <div className="stat-card">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Logged Class Days</span>
          <p className="text-3xl font-black text-zinc-950 dark:text-white mt-1">{totalDays}</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Total recorded lecture sessions</span>
        </div>
        <div className="stat-card">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Students Below 75%</span>
          <p className={`text-3xl font-black mt-1 ${lowCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {lowCount}
          </p>
          <span className={`text-xs font-bold mt-1 ${lowCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {lowCount > 0 ? 'Requires intervention / alert email' : 'All students in good standing'}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly distribution */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">Attendance Distribution (Last 7 Days)</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Daily headcounts</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#f4f4f5'} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <YAxis tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#52525b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#09090b' : '#ffffff',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  borderRadius: '12px',
                  color: isDark ? '#ffffff' : '#09090b',
                }}
              />
              <Legend />
              <Bar dataKey="present" name="Present" fill="#9333ea" radius={[6,6,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill={isDark ? '#3f3f46' : '#e4e4e7'} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie ratio */}
        <div className="card flex flex-col items-center justify-center">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white self-start mb-2">Overall Ratio</h2>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#09090b' : '#ffffff',
                  borderColor: isDark ? '#27272a' : '#e4e4e7',
                  borderRadius: '12px',
                  color: isDark ? '#ffffff' : '#09090b',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed student table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">Per-Student Attendance Metrics</h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Sorted by enrolled roster</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-700 dark:text-zinc-300 font-bold">
              <tr>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Student ID</th>
                <th className="px-6 py-3.5">Course</th>
                <th className="px-6 py-3.5">Total Days</th>
                <th className="px-6 py-3.5">Present</th>
                <th className="px-6 py-3.5">Absent</th>
                <th className="px-6 py-3.5">Rate</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {summary.map((s: any) => (
                <tr key={s.student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-950 dark:text-white">{s.student.full_name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold">{s.student.student_id}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium">{s.student.course || '—'}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">{s.total_days}</td>
                  <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400 font-bold">{s.present_days}</td>
                  <td className="px-6 py-4 text-rose-700 dark:text-rose-400 font-bold">{s.absent_days}</td>
                  <td className="px-6 py-4 font-black">
                    <span className={s.low_attendance ? 'text-rose-600 dark:text-rose-400' : 'text-primary-700 dark:text-primary-400'}>
                      {pct(s.attendance_percentage)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={s.low_attendance ? 'badge-red' : 'badge-purple'}>
                      {s.low_attendance ? '⚠ Warning' : '✓ Regular'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
