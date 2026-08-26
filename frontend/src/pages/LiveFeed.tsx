import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { STREAM_URL, WS_URL, loadModel, resetSession, markAllAbsent } from '../lib/api'
import { today, formatTime } from '../lib/utils'
import { Camera, RefreshCw, UserCheck, AlertCircle, Wifi, WifiOff, Sparkles } from 'lucide-react'

interface RecognitionEvent {
  student_id: string | null
  full_name: string
  confidence: number
  status: string
  timestamp: string
  attendance_marked: boolean
}

export default function LiveFeed() {
  const qc = useQueryClient()
  const [events, setEvents] = useState<RecognitionEvent[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [wsError, setWsError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const eventsEndRef = useRef<HTMLDivElement>(null)

  const { mutate: doLoadModel, isPending: modelLoading } = useMutation({
    mutationFn: loadModel,
  })

  const { mutate: doReset } = useMutation({
    mutationFn: resetSession,
    onSuccess: () => setEvents([]),
  })

  const { mutate: doMarkAbsent } = useMutation({
    mutationFn: () => markAllAbsent(today()),
  })

  // WebSocket for real-time recognition events
  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('token')
      const ws = new WebSocket(`${WS_URL}?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => { setWsConnected(true); setWsError('') }
      ws.onclose = () => { setWsConnected(false) }
      ws.onerror = () => setWsError('WebSocket connection failed')

      ws.onmessage = (msg) => {
        try {
          const event: RecognitionEvent = JSON.parse(msg.data)
          setEvents((prev) => [event, ...prev].slice(0, 50))
          if (event.attendance_marked) {
            qc.invalidateQueries({ queryKey: ['attendance'] })
            qc.invalidateQueries({ queryKey: ['daily-report'] })
            qc.invalidateQueries({ queryKey: ['student-summary'] })
            qc.invalidateQueries({ queryKey: ['my-student-stats'] })
            qc.invalidateQueries({ queryKey: ['my-student-attendance'] })
          }
        } catch {}
      }
    }

    connect()
    return () => wsRef.current?.close()
  }, [])

  // Auto-scroll events
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">AI Vision Live Feed</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">Continuous facial recognition entrance monitor</p>
        </div>
        <div className="flex items-center gap-2">
          {wsConnected
            ? <span className="badge-purple flex items-center gap-1.5"><Wifi size={13}/> Stream Active</span>
            : <span className="badge-red flex items-center gap-1.5"><WifiOff size={13}/> Stream Offline</span>
          }
        </div>
      </div>

      {wsError && (
        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/80 rounded-xl p-3 flex gap-2 text-sm text-rose-700 dark:text-rose-300 font-semibold">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          {wsError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Camera stream */}
        <div className="lg:col-span-3 card p-0 overflow-hidden bg-black border-zinc-800 shadow-xl">
          <div className="bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2 text-white text-sm font-bold">
              <Camera size={16} className="text-primary-400" />
              <span>Camera Stream 01</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-zinc-400 font-mono">30 FPS</span>
            </div>
          </div>
          <div className="bg-black aspect-video flex items-center justify-center relative">
            <img
              src={STREAM_URL}
              alt="Live camera feed"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        </div>

        {/* Controls + events */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="card space-y-3">
            <h2 className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
              <Sparkles size={16} className="text-primary-600 dark:text-primary-400" />
              Session Controls
            </h2>
            <button
              onClick={() => doLoadModel()}
              disabled={modelLoading}
              className="btn-primary w-full justify-center"
            >
              {modelLoading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Reload Model Weights
            </button>
            <button onClick={() => doReset()} className="btn-secondary w-full justify-center">
              <RefreshCw size={14} />
              Reset Anti-Proxy Cooldown
            </button>
            <button onClick={() => doMarkAbsent()} className="btn-danger w-full justify-center">
              <UserCheck size={14} />
              End Session &amp; Mark Absent
            </button>
          </div>

          {/* Events feed */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-zinc-950 dark:text-white">Live Recognition Log</h2>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-bold">{events.length} Events</span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {events.length === 0 && (
                <div className="text-center py-10">
                  <Camera size={24} className="mx-auto mb-2 text-zinc-400 dark:text-zinc-600" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Waiting for student faces in camera feed…</p>
                </div>
              )}
              {events.map((ev, i) => (
                <div
                  key={i}
                  className={`rounded-xl p-3 text-sm flex items-start gap-3 transition-all ${
                    ev.status === 'recognized'
                      ? 'bg-primary-50/80 border border-primary-200 dark:bg-primary-950/40 dark:border-primary-800/80'
                      : 'bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                    ev.status === 'recognized' ? 'bg-primary-600 ring-4 ring-primary-100 dark:ring-primary-900/60' : 'bg-zinc-400 dark:bg-zinc-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-zinc-950 dark:text-white truncate">
                      {ev.full_name}
                      {ev.attendance_marked && (
                        <span className="ml-2 badge-green text-xs font-bold">Marked ✓</span>
                      )}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5 font-medium">
                      {ev.confidence ? `${(ev.confidence * 100).toFixed(0)}% match` : ''}{' '}
                      · {formatTime(ev.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={eventsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
