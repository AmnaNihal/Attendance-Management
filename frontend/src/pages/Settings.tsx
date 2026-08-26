import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { trainModel, getTrainingStatus } from '../lib/api'
import { Loader2, Cpu, CheckCircle, AlertCircle, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export default function Settings() {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />

  const [polling, setPolling] = useState(false)

  const { data: status, refetch } = useQuery({
    queryKey: ['training-status'],
    queryFn: () => getTrainingStatus().then(r => r.data),
    refetchInterval: polling ? 3000 : false,
  })

  const { mutate: doTrain, isPending: starting } = useMutation({
    mutationFn: trainModel,
    onSuccess: () => { setPolling(true); refetch() },
  })

  // Stop polling when done
  if (status?.status === 'done' || status?.status === 'error') {
    if (polling) setPolling(false)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 font-medium">Administrator controls and model retraining</p>
      </div>

      {/* Model training */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 flex items-center justify-center border border-primary-200 dark:border-primary-800">
            <Cpu size={20} />
          </div>
          <div>
            <h2 className="font-bold text-zinc-950 dark:text-white">Face Recognition AI Engine</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">OpenCV Spatial Gradients + Scikit-Learn SVM Classifier</p>
          </div>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-950 rounded-2xl p-5 text-sm space-y-3 border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Model Deployment</span>
            <span className={status?.model_ready ? 'badge-green' : 'badge-red'}>
              {status?.model_ready ? '✓ Model Ready' : '✗ Untrained'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Training Engine Status</span>
            <span className="badge-purple capitalize">{status?.status ?? 'idle'}</span>
          </div>
          {status?.last_result?.accuracy && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Validation Accuracy</span>
              <span className="font-black text-primary-700 dark:text-primary-400">{(status.last_result.accuracy * 100).toFixed(1)}%</span>
            </div>
          )}
          {status?.last_result?.num_students && (
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400 font-semibold">Enrolled Face Classes</span>
              <span className="font-bold text-zinc-950 dark:text-white">{status.last_result.num_students} Students</span>
            </div>
          )}
          {status?.last_result?.error && (
            <div className="text-rose-700 dark:text-rose-300 flex gap-2 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {status.last_result.error}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => doTrain()}
            disabled={starting || status?.status === 'running'}
            className="btn-primary flex-1 justify-center py-2.5"
          >
            {starting || status?.status === 'running'
              ? <><Loader2 size={15} className="animate-spin" /> Training SVM Model…</>
              : <><Sparkles size={15} /> Retrain AI Model</>
            }
          </button>
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
          Retraining walks all student folders in the dataset directory, extracts spatial-gradient feature vectors, and updates <code>model.pkl</code>.
        </p>
      </div>
    </div>
  )
}
