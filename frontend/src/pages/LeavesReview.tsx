import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllLeaves, reviewLeave } from '../lib/api'
import { formatDate } from '../lib/utils'
import {
  FileText, CheckCircle2, XCircle, Clock, Filter,
  Loader2, User, Calendar, MessageSquare, AlertCircle
} from 'lucide-react'

export default function LeavesReview() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [remarksState, setRemarksState] = useState<{ [id: number]: string }>({})

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['all-leaves', statusFilter],
    queryFn: () => getAllLeaves(statusFilter || undefined).then(r => r.data),
    refetchInterval: 15000,
  })

  const { mutate: doReview, isPending: reviewing } = useMutation({
    mutationFn: ({ id, status, remarks }: { id: number; status: string; remarks?: string }) =>
      reviewLeave(id, { status, faculty_remarks: remarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-leaves'] })
    },
  })

  const pendingCount  = leaves.filter((l: any) => l.status === 'pending').length
  const approvedCount = leaves.filter((l: any) => l.status === 'approved').length
  const rejectedCount = leaves.filter((l: any) => l.status === 'rejected').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Student Leave Requests</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">Review and process student absence justifications</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-zinc-400" />
          <select
            className="input text-xs py-2 w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Applications</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card border-l-4 border-l-amber-500">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Pending Review</span>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Awaiting faculty approval</span>
        </div>
        <div className="stat-card border-l-4 border-l-emerald-500">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Approved Leaves</span>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{approvedCount}</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Excused student absences</span>
        </div>
        <div className="stat-card border-l-4 border-l-rose-500">
          <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Rejected Leaves</span>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">{rejectedCount}</p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Unjustified applications</span>
        </div>
      </div>

      {/* Leave cards list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="card text-center py-16 text-zinc-400 dark:text-zinc-600">
            <FileText size={32} className="mx-auto mb-2 opacity-40 text-primary-400" />
            <p className="text-sm font-semibold">No leave requests found for this filter.</p>
          </div>
        ) : (
          leaves.map((l: any) => (
            <div
              key={l.id}
              className="card border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 flex items-center justify-center font-black text-sm">
                    {l.student?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-950 dark:text-white text-base">{l.student?.full_name || 'Student'}</h3>
                      <span className="badge-purple text-xs font-mono">{l.student?.student_id}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">· {l.student?.course || 'General'}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                      Submitted on {formatDate(l.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <span className={
                    l.status === 'approved'
                      ? 'badge-green px-3 py-1 text-xs'
                      : l.status === 'rejected'
                      ? 'badge-red px-3 py-1 text-xs'
                      : 'badge bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 px-3 py-1 text-xs'
                  }>
                    {l.status === 'approved' ? '✓ Approved' : l.status === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
                  </span>
                </div>
              </div>

              {/* Leave Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-sm">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block mb-1">Leave Period</span>
                  <p className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary-600 dark:text-primary-400" />
                    {formatDate(l.start_date)} &rarr; {formatDate(l.end_date)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block mb-1">Leave Category</span>
                  <p className="font-bold text-zinc-950 dark:text-white">
                    {l.leave_type} Leave
                  </p>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block mb-1">Student Stated Reason</span>
                  <p className="text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm leading-relaxed font-medium">
                    "{l.reason}"
                  </p>
                </div>
              </div>

              {/* Review status or actions */}
              {l.status === 'pending' ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      className="input text-xs py-2"
                      placeholder="Optional feedback / remarks to student…"
                      value={remarksState[l.id] || ''}
                      onChange={(e) => setRemarksState({ ...remarksState, [l.id]: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doReview({ id: l.id, status: 'approved', remarks: remarksState[l.id] })}
                      disabled={reviewing}
                      className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm"
                    >
                      <CheckCircle2 size={14} /> Approve Leave
                    </button>
                    <button
                      onClick={() => doReview({ id: l.id, status: 'rejected', remarks: remarksState[l.id] })}
                      disabled={reviewing}
                      className="btn-danger text-xs font-bold px-4 py-2"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-primary-600 dark:text-primary-400" />
                    <span><strong>Decision Note:</strong> {l.faculty_remarks || 'No remarks added'}</span>
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400 font-mono">Reviewed by {l.reviewed_by || 'Faculty'}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
