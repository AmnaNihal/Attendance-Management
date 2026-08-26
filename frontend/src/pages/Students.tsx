import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudents, createStudent, deleteStudent, uploadStudentPhotos } from '../lib/api'
import { UserPlus, Trash2, Upload, Loader2, Users, Search, Sparkles, X, CheckCircle2, Image as ImageIcon } from 'lucide-react'

interface Student {
  id: number; student_id: string; full_name: string;
  email: string; course: string; image_count: number; is_enrolled: boolean
}

export default function Students() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ student_id: '', full_name: '', email: '', course: '' })

  // Upload modal state
  const [uploadStudent, setUploadStudent] = useState<Student | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => getStudents().then(r => r.data),
  })

  const { mutate: doCreate, isPending: creating } = useMutation({
    mutationFn: () => createStudent(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setShowForm(false)
      setForm({ student_id: '', full_name: '', email: '', course: '' })
    },
  })

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  })

  const { mutate: doUpload, isPending: uploading } = useMutation({
    mutationFn: ({ studentId, formData }: { studentId: string; formData: FormData }) =>
      uploadStudentPhotos(studentId, formData),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      setUploadSuccessMsg(res.data.message)
      setSelectedFiles([])
      setPreviewUrls([])
      setTimeout(() => {
        setUploadSuccessMsg('')
        setUploadStudent(null)
      }, 2000)
    },
  })

  const openUploadModal = (student: Student) => {
    setUploadStudent(student)
    setSelectedFiles([])
    setPreviewUrls([])
    setUploadSuccessMsg('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    setSelectedFiles(files)
    const urls = files.map(f => URL.createObjectURL(f))
    setPreviewUrls(urls)
  }

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadStudent || selectedFiles.length === 0) return
    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })
    doUpload({ studentId: uploadStudent.student_id, formData })
  }

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Student Directory</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">{students.length} students enrolled in AI vision database</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <UserPlus size={16} /> Enroll New Student
        </button>
      </div>

      {/* Add student form */}
      {showForm && (
        <div className="card border-primary-200 dark:border-primary-800 shadow-md bg-gradient-to-br from-white to-primary-50/20 dark:from-zinc-900 dark:to-primary-950/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="font-bold text-zinc-950 dark:text-white">Student Enrollment Form</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Student ID *</label>
              <input className="input" placeholder="e.g. STU007" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} />
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="e.g. Maya Lin" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" placeholder="maya@school.edu" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="label">Degree / Course</label>
              <input className="input" placeholder="Computer Science" value={form.course} onChange={e => setForm({...form, course: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => doCreate()} disabled={creating || !form.student_id || !form.full_name} className="btn-primary">
              {creating ? <Loader2 size={14} className="animate-spin" /> : null}
              {creating ? 'Saving Student…' : 'Save & Register'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          className="input pl-10"
          placeholder="Search by student name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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
                <th className="px-6 py-3.5">Program</th>
                <th className="px-6 py-3.5">Biometric Data</th>
                <th className="px-6 py-3.5">Enrollment</th>
                <th className="px-6 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-bold text-zinc-950 dark:text-white">{s.full_name}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5 font-medium">{s.email || 'No email'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300 font-bold">{s.student_id}</td>
                  <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-medium">{s.course || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={s.image_count >= 100 ? 'badge-green' : s.image_count > 0 ? 'badge-purple' : 'badge-gray'}>
                      {s.image_count} Face Photos
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={s.is_enrolled ? 'badge-purple' : 'badge-gray'}>
                      {s.is_enrolled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openUploadModal(s)}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                        title="Upload face photos for facial recognition"
                      >
                        <Upload size={13} className="text-primary-600 dark:text-primary-400" />
                        Upload Photo
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete student ${s.full_name}?`)) doDelete(s.student_id) }}
                        className="btn-danger py-1.5 px-2.5 text-xs"
                        title="Delete student"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-zinc-400 dark:text-zinc-600">
                    <Users size={28} className="mx-auto mb-2 opacity-40 text-zinc-400" />
                    {search ? 'No students match your query' : 'No students found. Enroll your first student above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Photos Modal */}
      {uploadStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-bold">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-950 dark:text-white text-base">Upload Face Photos</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {uploadStudent.full_name} ({uploadStudent.student_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadStudent(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {uploadSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 rounded-xl p-3.5 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-bold">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                {uploadSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary-300 dark:border-primary-800 hover:border-primary-500 rounded-2xl p-6 text-center cursor-pointer bg-primary-50/20 dark:bg-primary-950/20 hover:bg-primary-50/40 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <ImageIcon size={32} className="mx-auto text-primary-600 dark:text-primary-400 mb-2" />
                <p className="font-bold text-zinc-900 dark:text-white text-sm">
                  Click to select photos or drag &amp; drop
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                  Select 1 or more clear face photos (JPG / PNG)
                </p>
              </div>

              {previewUrls.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedFiles.length} photos ready to upload:
                    </span>
                    <button
                      type="button"
                      onClick={() => { setSelectedFiles([]); setPreviewUrls([]) }}
                      className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    {previewUrls.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 bg-black">
                        <img src={url} alt={`preview-${i}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadStudent(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedFiles.length === 0 || uploading}
                  className="btn-primary"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploading ? 'Processing Photos…' : `Upload ${selectedFiles.length} Photo${selectedFiles.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
