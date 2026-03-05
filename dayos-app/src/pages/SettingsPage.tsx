import { useEffect, useState } from 'react'
import { format, startOfWeek } from 'date-fns'
import { Card } from '../components/Card'
import { db, upsertSundayPlan } from '../lib/db'
import { getSessionEmail, hasSupabaseConfig, sendMagicLink, signOutSession, supabase } from '../lib/supabase'
import { flushSyncQueue } from '../lib/sync'
import { useUIStore } from '../store/uiStore'

export function SettingsPage() {
  const examMode = useUIStore((state) => state.examMode)
  const setExamMode = useUIStore((state) => state.setExamMode)
  const setSundayPlan = useUIStore((state) => state.setSundayPlan)

  const [examTitle, setExamTitle] = useState(examMode.examTitle)
  const [examDate, setExamDate] = useState(examMode.examDate)
  const [workoutIntentions, setWorkoutIntentions] = useState('PPL + 1 cardio session')
  const [studyIntentions, setStudyIntentions] = useState('Finish ME256 module 4')
  const [researchIntentions, setResearchIntentions] = useState('Complete literature review draft')
  const [weeklyGoal, setWeeklyGoal] = useState('Ship consistent deep work blocks.')
  const [planStatus, setPlanStatus] = useState('')
  const [email, setEmail] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('')

  const saveSundayPlan = async () => {
    const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    await upsertSundayPlan({
      weekStartDate,
      workoutIntentions,
      studyIntentions,
      researchIntentions,
      weeklyGoal,
    })
    setSundayPlan({
      workoutIntentions,
      studyIntentions,
      researchIntentions,
      weeklyGoal,
    })
    setPlanStatus(`Saved plan for week starting ${weekStartDate}.`)
  }

  const refreshSyncInfo = async () => {
    const [count, activeEmail] = await Promise.all([db.syncQueue.count(), getSessionEmail()])
    setQueueCount(count)
    setSessionEmail(activeEmail)
  }

  useEffect(() => {
    void refreshSyncInfo()

    const authSub = supabase?.auth.onAuthStateChange(async () => {
      await refreshSyncInfo()
    })

    return () => {
      authSub?.data.subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="space-y-3">
      <Card title="Supabase Auth & Sync">
        {!hasSupabaseConfig && <p className="text-xs text-warning">Supabase env vars are missing in this build.</p>}
        <p className="mb-2 text-xs text-muted">Session: {sessionEmail ?? 'Not signed in'}</p>
        <div className="flex gap-2">
          <input
            className="h-12 flex-1 rounded-input border border-border px-3"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            type="button"
            className="h-12 rounded-full border border-border px-4 text-xs font-semibold"
            onClick={async () => {
              if (!email.trim()) {
                return
              }
              const result = await sendMagicLink(email.trim())
              setAuthStatus(result.error ? `Auth error: ${result.error}` : 'Magic link sent. Check your inbox.')
            }}
          >
            Send link
          </button>
          <button
            type="button"
            className="h-12 rounded-full border border-border px-4 text-xs font-semibold"
            onClick={async () => {
              const result = await signOutSession()
              setAuthStatus(result.error ? `Sign out error: ${result.error}` : 'Signed out.')
              await refreshSyncInfo()
            }}
          >
            Sign out
          </button>
        </div>
        {authStatus && <p className="mt-2 text-xs text-muted">{authStatus}</p>}
        <div className="mt-3 rounded-input border border-border p-3">
          <p className="text-xs text-text">Pending sync queue: {queueCount}</p>
          <button
            type="button"
            className="mt-2 h-10 w-full rounded-full bg-primary px-4 text-xs font-semibold text-white"
            onClick={async () => {
              const result = await flushSyncQueue()
              if (result.reason) {
                setSyncStatus(result.reason)
              } else {
                const suffix = result.lastError ? ` Last error: ${result.lastError}` : ''
                setSyncStatus(`Synced ${result.processed} item(s), failed ${result.failed}.${suffix}`)
              }
              await refreshSyncInfo()
            }}
          >
            Flush queue now
          </button>
          {syncStatus && <p className="mt-2 text-xs text-muted">{syncStatus}</p>}
        </div>
      </Card>

      <Card title="Exam Mode">
        <div className="space-y-2">
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            placeholder="Exam title"
            value={examTitle}
            onChange={(event) => setExamTitle(event.target.value)}
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
          />
          <button
            type="button"
            className="h-12 w-full rounded-full bg-primary px-4 font-semibold text-white"
            onClick={() => setExamMode(!examMode.active, examTitle, examDate)}
          >
            {examMode.active ? 'Disable' : 'Enable'} Exam Mode
          </button>
        </div>
      </Card>

      <Card title="Sunday Planning">
        <div className="space-y-2">
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={workoutIntentions}
            onChange={(event) => setWorkoutIntentions(event.target.value)}
            placeholder="Workout intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={studyIntentions}
            onChange={(event) => setStudyIntentions(event.target.value)}
            placeholder="Study intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={researchIntentions}
            onChange={(event) => setResearchIntentions(event.target.value)}
            placeholder="Research intentions"
          />
          <input
            className="h-12 w-full rounded-input border border-border px-3"
            value={weeklyGoal}
            onChange={(event) => setWeeklyGoal(event.target.value)}
            placeholder="Weekly goal"
          />
        </div>
        <button
          type="button"
          className="mt-2 h-12 w-full rounded-full border border-border px-4 text-sm font-semibold"
          onClick={() => void saveSundayPlan()}
        >
          Save weekly plan
        </button>
        {planStatus && <p className="mt-2 text-xs text-success">{planStatus}</p>}
      </Card>
    </div>
  )
}

