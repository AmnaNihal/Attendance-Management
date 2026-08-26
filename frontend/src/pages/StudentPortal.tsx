import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyStudentStats, getMyStudentAttendance, exportMyStudentCSV,
  applyLeave, getMyLeaves, uploadFacePhotos
} from '../lib/api'
import { pct, formatDate, formatTime, downloadBlob, today } from '../lib/utils'
import {
  GraduationCap, CheckCircle2, XCircle, Clock, AlertTriangle,
  Download, Filter, ShieldCheck, UserCheck, BookOpen, Calendar,
  FileText, Camera, Upload, Send, Loader2, Sparkles, MessageSquare,
  ChevronRight, CheckCircle, Image as ImageIcon
} from 'lucide-react'

export default function StudentPortal() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'photos'>('attendance')

  // Attendance status filter
  const [statusFilter, setStatusFilter] = useState('')

  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    start_date: today(),
    end_date: today(),
    leave_type: 'Medical',
    reason: '',
  })
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState('')

  // Photo upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [photoUploadMsg, setPhotoUploadMsg] = useState('')

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-student-stats'],
    queryFn: () => getMyStudentStats().then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['my-student-attendance', statusFilter],
    queryFn: () => getMyStudentAttendance({ status: statusFilter || undefined }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: myLeaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => getMyLeaves().then(r => r.data),
  })

  // Leave submit mutation
  const { mutate: doApplyLeave, isPending: submittingLeave } = useMutation({
    mutationFn: () => applyLeave(leaveForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] })
      setLeaveSuccessMsg('Leave request submitted successfully to faculty!')
      setLeaveForm({ start_date: today(), end_date: today(), leave_type: 'Medical', reason: '' })
      setTimeout(() => setLeaveSuccessMsg(''), 4000)
    },
  })

  // Photo upload mutation
  const { mutate: doUploadPhotos, isPending: uploadingPhotos } = useMutation({
    mutationFn: (formData: FormData) => uploadFacePhotos(formData),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-student-stats'] })
      setPhotoUploadMsg(res.data.message)
      setSelectedFiles([])
      setPreviewUrls([])
    },
  })

  const handleDownload = async () => {
    const res = await exportMyStudentCSV()
    downloadBlob(res.data, `attendance_statement_${stats?.student_id || 'student'}.csv`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
    setPhotoUploadMsg('')
  }

  const handlePhotoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedFiles.length === 0) return
    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    doUploadPhotos(formData)
  }

  const attendancePct = stats?.attendance_percentage ?? 0
  const isLow = stats?.is_low_attendance ?? false

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Student Profile */}
      <div className="bg-gradient-to-r from-black via-zinc-950 to-primary-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-zinc-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 border border-primary-400/30 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-primary-500/20">
            {stats?.full_name?.charAt(0) || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">{stats?.full_name || 'Student Portal'}</h1>
              <span className="badge bg-primary-500/20 text-primary-300 font-mono text-xs px-3 py-1 rounded-lg border border-primary-500/30">
                {stats?.student_id}
              </span>
            </div>
            <p className="text-zinc-300 text-sm mt-1 flex items-center gap-2 font-medium">
              <BookOpen size={14} className="text-primary-400" /> {stats?.course || 'General Program'} · {stats?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="btn bg-white text-zinc-950 hover:bg-zinc-100 font-bold shadow-md shadow-black/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Download size={16} className="text-primary-600" />
            Download Statement
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <Calendar size={16} />
          Attendance &amp; History
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'leaves'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <FileText size={16} />
          Apply for Leaves
          {myLeaves.filter((l: any) => l.status === 'pending').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'photos'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <Camera size={16} />
          Update Face Photos
          <span className="badge-purple text-xs px-2 py-0.5 ml-1">{stats?.image_count ?? 0} saved</span>
        </button>
      </div>

      {/* TAB 1: ATTENDANCE OVERVIEW & LOGS */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Warning Banner if attendance < 75% */}
          {isLow && (
            <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/80 rounded-2xl p-4 flex gap-3 text-rose-900 dark:text-rose-300 shadow-sm">
              <AlertTriangle size={20} className="flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold text-sm">Attendance Warning (Below 75% Threshold)</p>
                <p className="text-sm mt-0.5 text-rose-700 dark:text-rose-400 font-medium">
                  Your overall attendance is currently <strong>{pct(attendancePct)}</strong>, which is below the mandatory 75% requirement. Please ensure regular attendance or apply for justified leaves to avoid academic penalties.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card border-l-4 border-l-primary-500">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Overall Attendance</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isLow ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400'}`}>
                  <ShieldCheck size={18} />
                </div>
              </div>
              <p className={`text-3xl font-black mt-2 ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-primary-700 dark:text-primary-400'}`}>
                {statsLoading ? '—' : pct(attendancePct)}
              </p>
              <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : 'bg-primary-600'}`}
                  style={{ width: `${Math.min(100, attendancePct)}%` }}
                />
              </div>
            </div>

            <div className="stat-card border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Days Present</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-3xl font-black text-zinc-950 dark:text-white mt-2">
                {statsLoading ? '—' : stats?.present_days}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Verified via facial recognition</span>
            </div>

            <div className="stat-card border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Days Absent</span>
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 flex items-center justify-center">
                  <XCircle size={18} />
                </div>
              </div>
              <p className="text-3xl font-black text-zinc-950 dark:text-white mt-2">
                {statsLoading ? '—' : stats?.absent_days}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Total missed lectures</span>
            </div>

            <div className="stat-card border-l-4 border-l-purple-900">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">Today's Status</span>
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400 flex items-center justify-center">
                  <Calendar size={18} />
                </div>
              </div>
              <p className="text-xl font-black text-zinc-950 dark:text-white mt-3 capitalize">
                {stats?.today_status === 'present' ? (
                  <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-black"><UserCheck size={20}/> Present</span>
                ) : stats?.today_status === 'absent' ? (
                  <span className="text-rose-700 dark:text-rose-400 flex items-center gap-1.5 font-black"><XCircle size={20}/> Absent</span>
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-400 text-base font-semibold">{stats?.today_status || 'Pending'}</span>
                )}
              </p>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Automatic entrance detection</span>
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Attendance Log History</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5 font-medium">Recorded entry &amp; exit timestamps</p>
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-zinc-400" />
                <select
                  className="input text-xs py-1.5 w-auto"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Logs</option>
                  <option value="present">Present Only</option>
                  <option value="absent">Absent Only</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800 text-left font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">In-Time (Entry)</th>
                    <th className="px-5 py-3.5">Out-Time (Exit)</th>
                    <th className="px-5 py-3.5">AI Confidence</th>
                    <th className="px-5 py-3.5">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-zinc-950 dark:text-white">
                        {formatDate(r.date)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={r.status === 'present' ? 'badge-green' : 'badge-red'}>
                          {r.status === 'present' ? '✓ Present' : '✗ Absent'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300 font-mono text-xs font-medium">
                        {r.in_time ? formatTime(r.in_time) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300 font-mono text-xs font-medium">
                        {r.out_time ? formatTime(r.out_time) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                        {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400 text-xs capitalize font-semibold">
                        {r.marked_by === 'system' ? 'Face Camera' : r.marked_by}
                      </td>
                    </tr>
                  ))}
                  {!recordsLoading && records.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-400 dark:text-zinc-600">
                        No attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLY FOR LEAVES */}
      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Leave Application Form */}
          <div className="lg:col-span-2 card space-y-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h2 className="font-bold text-zinc-950 dark:text-white">New Leave Application</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Submit to faculty for review</p>
              </div>
            </div>

            {leaveSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 rounded-xl p-3.5 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                {leaveSuccessMsg}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); doApplyLeave() }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Leave Category *</label>
                <select
                  className="input font-semibold"
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                >
                  <option value="Medical">🏥 Medical Leave</option>
                  <option value="Academic">📚 Academic / Conference</option>
                  <option value="Personal">🏠 Personal / Family</option>
                  <option value="Other">📝 Other Reason</option>
                </select>
              </div>

              <div>
                <label className="label">Reason / Justification *</label>
                <textarea
                  className="input min-h-[90px]"
                  placeholder="Provide brief details regarding your leave…"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5"
                disabled={submittingLeave || !leaveForm.reason}
              >
                {submittingLeave ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {submittingLeave ? 'Submitting…' : 'Submit Leave Request'}
              </button>
            </form>
          </div>

          {/* Past Leaves Status List */}
          <div className="lg:col-span-3 card space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h2 className="font-bold text-zinc-950 dark:text-white">Submitted Leave History</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{myLeaves.length} total applications</p>
              </div>
            </div>

            {leavesLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="animate-spin text-primary-600" />
              </div>
            ) : myLeaves.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 dark:text-zinc-600">
                <FileText size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No leave requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLeaves.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-950/70 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-950 dark:text-white text-sm">{l.leave_type} Leave</span>
                        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-semibold">
                          {formatDate(l.start_date)} &rarr; {formatDate(l.end_date)}
                        </span>
                      </div>
                      <span className={
                        l.status === 'approved'
                          ? 'badge-green'
                          : l.status === 'rejected'
                          ? 'badge-red'
                          : 'badge bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                      }>
                        {l.status === 'approved' ? '✓ Approved' : l.status === 'rejected' ? '✗ Rejected' : '⏳ Pending Review'}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 font-medium">
                      "{l.reason}"
                    </p>

                    {l.faculty_remarks && (
                      <div className="text-xs bg-primary-50 dark:bg-primary-950/60 text-primary-900 dark:text-primary-200 p-2.5 rounded-xl border border-primary-200 dark:border-primary-800 flex items-start gap-1.5">
                        <MessageSquare size={13} className="text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                        <span><strong>Faculty Note:</strong> {l.faculty_remarks} ({l.reviewed_by})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UPDATE BIOMETRIC FACE PHOTOS */}
      {activeTab === 'photos' && (
        <div className="card space-y-6 max-w-2xl mx-auto border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shadow-xs">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="font-bold text-zinc-950 dark:text-white">Update Biometric Face Photos</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Add clear face pictures to improve your AI recognition accuracy</p>
            </div>
          </div>

          {photoUploadMsg && (
            <div className="bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 text-sm text-primary-950 dark:text-primary-200 flex items-start gap-3 shadow-sm">
              <Sparkles size={18} className="text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Biometric Dataset Updated!</p>
                <p className="text-xs text-primary-700 dark:text-primary-300 mt-0.5 font-medium">{photoUploadMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handlePhotoSubmit} className="space-y-4">
            {/* Drag & Drop / File Input Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary-300 dark:border-primary-800 hover:border-primary-600 rounded-3xl p-8 text-center cursor-pointer bg-primary-50/30 dark:bg-primary-950/20 hover:bg-primary-50/60 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload size={36} className="mx-auto text-primary-600 dark:text-primary-400 mb-3 animate-bounce" />
              <p className="font-bold text-zinc-950 dark:text-white text-sm">Click to browse or drop new face photos here</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Supports JPG &amp; PNG. You can select multiple images.</p>
            </div>

            {/* Photo Previews */}
            {previewUrls.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedFiles.length} photos selected:</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedFiles([]); setPreviewUrls([]) }}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black relative shadow-xs">
                      <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-medium">
              <p className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary-600 dark:text-primary-400" />
                Tips for Best Face Recognition:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Look directly at the camera with clear lighting.</li>
                <li>Avoid sunglasses or masks that obscure your facial features.</li>
                <li>The AI automatically extracts, normalizes, and enhances the face crop.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={selectedFiles.length === 0 || uploadingPhotos}
              className="btn-primary w-full justify-center py-2.5 font-bold shadow-md"
            >
              {uploadingPhotos ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadingPhotos ? 'Processing & Enhancing Photos…' : `Upload & Save ${selectedFiles.length} Face Photos`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
