import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendance, markAllAbsent, markAttendance, exportCSV } from '../lib/api'
import { today, formatTime, formatDate, downloadBlob } from '../lib/utils'
import { Calendar, Download, CheckCircle, XCircle, Loader2, Filter, Sparkles, Clock } from 'lucide-react'

export default function Attendance() {
  const [date, setDate] = useState(today())
  const [statusFilter, setStatusFilter] = useState('present') // Default to 'present' so only students marked present for that session show up in real-time
  const qc = useQueryClient()

  const isToday = date === today()

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', date, statusFilter],
    queryFn: () => getAttendance({ date, status: statusFilter || undefined }).then(r => r.data),
    refetchInterval: isToday ? 1500 : false, // Poll every 1.5s in real-time for today's session
  })

  const { mutate: doMarkAbsent, isPending: markingAbsent } = useMutation({
    mutationFn: () => markAllAbsent(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })

  const { mutate: doManualMark, isPending: markingManual } = useMutation({
    mutationFn: ({ studentId, status }: { studentId: number; status: string }) =>
      markAttendance({ student_id: studentId, date: date, status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['daily-report'] })
      qc.invalidateQueries({ queryKey: ['student-summary'] })
      qc.invalidateQueries({ queryKey: ['my-student-stats'] })
      qc.invalidateQueries({ queryKey: ['my-student-attendance'] })
    },
  })

  const handleExport = async () => {
    const res = await exportCSV(date)
    downloadBlob(res.data, `attendance_${date}.csv`)
  }

  const present = records.filter((r: any) => r.status === 'present').length
  const absent  = records.filter((r: any) => r.status === 'absent').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Attendance Logs</h1>
            {isToday && (
              <span className="badge-purple text-xs px-2.5 py-1 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Real-Time Stream
              </span>
            )}
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">
            Real-time verification log for {formatDate(date)}
          </p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button onClick={handleExport} className="btn-secondary">
            <Download size={14} className="text-primary-600 dark:text-primary-400" /> Export CSV Sheet
          </button>
          <button onClick={() => doMarkAbsent()} disabled={markingAbsent} className="btn-danger">
            {markingAbsent ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            Mark Remaining Absent
          </button>
        </div>
      </div>

      {/* Filters & summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-primary-600 dark:text-primary-400" />
            <input
              type="date"
              className="input text-xs py-2 w-auto font-bold"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* Quick Filter Pills */}
          <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'present'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              ● Present Only ({present})
            </button>
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === ''
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setStatusFilter('absent')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === 'absent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              Absent Only ({absent})
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2 badge-green px-3.5 py-1.5 rounded-xl shadow-xs font-bold">
            <CheckCircle size={14} /> <span>{present}</span> Present
          </div>
          <div className="flex items-center gap-2 badge-red px-3.5 py-1.5 rounded-xl shadow-xs font-bold">
            <XCircle size={14} /> <span>{absent}</span> Absent
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-700 dark:text-zinc-300 font-bold">
              <tr>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Student ID</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Entry Time</th>
                <th className="px-6 py-3.5">AI Confidence</th>
                <th className="px-6 py-3.5">Verification</th>
                <th className="px-6 py-3.5">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {records.map((r: any, idx: number) => {
                const isNewest = idx === 0 && r.status === 'present' && isToday
                return (
                  <tr
                    key={r.id}
                    className={`transition-colors ${
                      isNewest
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 font-semibold'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                      {isNewest && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                      )}
                      <span>{r.student?.full_name ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold">
                      {r.student?.student_id ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>
                        {r.status === 'present' ? '✓ Present' : '✗ Absent'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-500" />
                      {r.in_time ? formatTime(r.in_time) : '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-bold">
                      {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 capitalize text-xs font-semibold">
                      {r.marked_by === 'system' ? '📷 AI Vision Camera' : r.marked_by}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {r.status === 'absent' ? (
                          <button
                            onClick={() => doManualMark({ studentId: r.student_id, status: 'present' })}
                            disabled={markingManual}
                            className="btn bg-emerald-600 hover:bg-emerald-700 text-white py-1 px-2.5 text-xs font-bold shadow-xs"
                          >
                            Mark Present
                          </button>
                        ) : (
                          <button
                            onClick={() => doManualMark({ studentId: r.student_id, status: 'absent' })}
                            disabled={markingManual}
                            className="btn-danger py-1 px-2.5 text-xs font-bold"
                          >
                            Mark Absent
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-zinc-400 dark:text-zinc-600">
                    <Sparkles size={28} className="mx-auto mb-2 opacity-40 text-primary-500" />
                    {statusFilter === 'present'
                      ? 'No students marked present yet for this session.'
                      : `No attendance records logged for ${formatDate(date)}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
