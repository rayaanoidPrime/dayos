import { format, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { db, upsertSundayPlan } from '../lib/db'
import { flushSyncQueue } from '../lib/sync'
import { getSessionEmail, hasSupabaseConfig, signInWithGoogle, signOutSession, supabase } from '../lib/supabase'
import { useUIStore } from '../store/uiStore'

export function YouPage() {
  const examMode = useUIStore((state) => state.examMode)
  const setExamMode = useUIStore((state) => state.setExamMode)
  const setSundayPlan = useUIStore((state) => state.setSundayPlan)

  const [examTitle, setExamTitle] = useState(examMode.examTitle)
  const [examDate, setExamDate] = useState(examMode.examDate)
  const [workoutIntentions, setWorkoutIntentions] = useState('PPL + 1 cardio session')
  const [studyIntentions, setStudyIntentions] = useState('Finish ME256 module 4')
  const [researchIntentions, setResearchIntentions] = useState('Complete literature review draft')
  const [weeklyGoal, setWeeklyGoal] = useState('Ship consistent deep work blocks.')
  const [gpaTarget, setGpaTarget] = useState('3.85')
  const [deepWorkTarget, setDeepWorkTarget] = useState('25h')
  const [benchTarget, setBenchTarget] = useState('100kg')
  const [papersTarget, setPapersTarget] = useState('15/50')
  const [planStatus, setPlanStatus] = useState('')
  const [authStatus, setAuthStatus] = useState('')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('')

  const consistency = [40, 65, 30, 85, 95, 20, 10]

  const heatmapData = useMemo(
    () => [
      ['high', 'high', 'active', 'high', 'active', '', ''],
      ['high', 'active', 'high', 'high', 'active', '', ''],
      ['high', 'active', 'high', 'high', 'high', 'active', ''],
      ['high', 'high', 'active', 'high', 'active', 'active', ''],
    ],
    [],
  )

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
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshSyncInfo()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      authSub?.data.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <div>
      <header className="pb-1 pt-1">
        <span className="page-label">System Profile</span>
        <h1 className="page-title">Metrics &amp; Focus</h1>
      </header>

      <section className="mt-3">
        <span className="page-label">Deep Work (Weekly)</span>
        <div className="mt-2 flex h-20 items-end gap-1 rounded-input border border-border bg-surface p-3">
          {consistency.map((value, index) => (
            <div
              key={`${value}-${index}`}
              className={`flex-1 rounded-t ${index === 4 ? 'bg-white' : 'bg-white/45'}`}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-input border border-border bg-surface p-3">
          <span className="page-label">Thesis Progress</span>
          <p className="text-lg text-text">
            12,450 <span className="text-xs text-tertiary">words</span>
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded bg-white/15">
            <div className="h-full rounded bg-white" style={{ width: '62%' }} />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.05em] text-tertiary">Target: 20,000</p>
        </div>
        <div className="rounded-input border border-border bg-surface p-3">
          <span className="page-label">Workout Volume</span>
          <p className="text-lg text-text">
            +12% <span className="text-xs text-tertiary">vs LW</span>
          </p>
          <svg viewBox="0 0 100 40" className="mt-2 h-5 w-full stroke-white/75 stroke-[2]">
            <polyline points="0,35 20,30 40,38 60,25 80,15 100,5" />
          </svg>
          <p className="mt-1 text-[10px] uppercase tracking-[0.05em] text-tertiary">Trend: Increasing</p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center justify-between text-[20px] font-normal text-text">
          Consistency <span className="text-[13px] text-tertiary">Year to Date</span>
        </h2>
        <div className="rounded-input border border-border bg-surface p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {heatmapData.map((week, weekIndex) =>
              week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`aspect-square rounded-[2px] ${
                    day === 'high' ? 'bg-white/60' : day === 'active' ? 'bg-white/20' : 'bg-white/5'
                  }`}
                />
              )),
            )}
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
            <span>Current Streak</span>
            <span className="text-white">12 Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
            <span>Best Streak</span>
            <span className="text-white">24 Days</span>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center justify-between text-[20px] font-normal text-text">
          Semester Goals <span className="text-[13px] text-tertiary">Editable</span>
        </h2>
        <div className="space-y-1 border-y border-border">
          <div className="flex items-center justify-between py-3">
            <input className="w-[70%] border-none bg-transparent text-[15px] text-text outline-none" value={gpaTarget} onChange={(event) => setGpaTarget(event.target.value)} />
            <span className="text-[13px] text-tertiary">GPA Target</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <input className="w-[70%] border-none bg-transparent text-[15px] text-text outline-none" value={deepWorkTarget} onChange={(event) => setDeepWorkTarget(event.target.value)} />
            <span className="text-[13px] text-tertiary">Deep Work / Week</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <input className="w-[70%] border-none bg-transparent text-[15px] text-text outline-none" value={benchTarget} onChange={(event) => setBenchTarget(event.target.value)} />
            <span className="text-[13px] text-tertiary">Bench Press Max</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <input className="w-[70%] border-none bg-transparent text-[15px] text-text outline-none" value={papersTarget} onChange={(event) => setPapersTarget(event.target.value)} />
            <span className="text-[13px] text-tertiary">Papers Read</span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[20px] font-normal text-text">Account &amp; Sync</h2>
        {!hasSupabaseConfig && <p className="mb-2 text-xs text-warning">Supabase env vars are missing in this build.</p>}
        <p className="mb-3 text-xs text-tertiary">Account: {sessionEmail ?? 'Not signed in'}</p>
        {!sessionEmail && (
          <div className="mb-3 rounded-input border border-border bg-surface p-3 text-xs text-muted">
            <p className="uppercase tracking-[0.05em] text-tertiary">First-time sign in</p>
            <p className="mt-1">1. Click "Sign in with Google".</p>
            <p>2. Complete Google consent.</p>
            <p>3. Return to this app tab and the account status refreshes automatically.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inspo-button-ghost h-12"
            onClick={async () => {
              const result = await signInWithGoogle()
              setAuthStatus(result.error ? `Sign in error: ${result.error}` : 'Continue in Google to finish sign-in.')
            }}
          >
            Sign in with Google
          </button>
          <button
            type="button"
            className="inspo-button-ghost h-12"
            onClick={async () => {
              const result = await signOutSession()
              setAuthStatus(result.error ? `Sign out error: ${result.error}` : 'Signed out.')
              await refreshSyncInfo()
            }}
          >
            Sign out
          </button>
        </div>
        {authStatus && <p className="mt-2 text-xs text-tertiary">{authStatus}</p>}

        <div className="mt-3 rounded-input border border-border bg-surface p-3">
          <p className="text-xs text-muted">Pending sync queue: {queueCount}</p>
          <button
            type="button"
            className="inspo-button-primary mt-2 h-10 w-full"
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
          {syncStatus && <p className="mt-2 text-xs text-tertiary">{syncStatus}</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[20px] font-normal text-text">Exam Mode</h2>
        <div className="space-y-2">
          <input
            className="inspo-field w-full"
            placeholder="Exam title"
            value={examTitle}
            onChange={(event) => setExamTitle(event.target.value)}
          />
          <input
            className="inspo-field w-full"
            type="date"
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
          />
          <button
            type="button"
            className="inspo-button-primary h-12 w-full"
            onClick={() => setExamMode(!examMode.active, examTitle, examDate)}
          >
            {examMode.active ? 'Disable' : 'Enable'} Exam Mode
          </button>
        </div>
      </section>

      <section className="mb-2 mt-8">
        <h2 className="mb-3 text-[20px] font-normal text-text">Sunday Planning</h2>
        <div className="space-y-2">
          <input
            className="inspo-field w-full"
            value={workoutIntentions}
            onChange={(event) => setWorkoutIntentions(event.target.value)}
            placeholder="Workout intentions"
          />
          <input
            className="inspo-field w-full"
            value={studyIntentions}
            onChange={(event) => setStudyIntentions(event.target.value)}
            placeholder="Study intentions"
          />
          <input
            className="inspo-field w-full"
            value={researchIntentions}
            onChange={(event) => setResearchIntentions(event.target.value)}
            placeholder="Research intentions"
          />
          <input
            className="inspo-field w-full"
            value={weeklyGoal}
            onChange={(event) => setWeeklyGoal(event.target.value)}
            placeholder="Weekly goal"
          />
          <button type="button" className="inspo-button-ghost h-12 w-full" onClick={() => void saveSundayPlan()}>
            Save weekly plan
          </button>
          {planStatus && <p className="text-xs text-success">{planStatus}</p>}
        </div>
      </section>
    </div>
  )
}
