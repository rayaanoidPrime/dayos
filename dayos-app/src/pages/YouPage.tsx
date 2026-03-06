import { format, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/db'
import { computeCurrentStreak, computeDayStatuses } from '../lib/streak'
import { flushSyncQueue } from '../lib/sync'
import { getSessionEmail, hasSupabaseConfig, signInWithGoogle, signOutSession, supabase } from '../lib/supabase'
import { useStudyStore } from '../store/studyStore'
import { cardKeys, useTodayStore } from '../store/todayStore'
import { useUIStore } from '../store/uiStore'
import { useWorkoutStore } from '../store/workoutStore'

function weekBounds(offsetWeeks: number) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 })
  start.setDate(start.getDate() + offsetWeeks * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

function getProfileName(email: string | null): string {
  if (!email) {
    return 'Guest'
  }
  const [localPart] = email.split('@')
  return localPart || email
}

export function YouPage() {
  const examMode = useUIStore((state) => state.examMode)
  const setExamMode = useUIStore((state) => state.setExamMode)

  const completionByDate = useTodayStore((state) => state.completionByDate)
  const nutritionTargets = useTodayStore((state) => state.nutritionTargets)
  const setNutritionTargets = useTodayStore((state) => state.setNutritionTargets)
  const studyByDate = useStudyStore((state) => state.byDate)
  const workoutLogsByDate = useWorkoutStore((state) => state.logsByDate)

  const [examTitle, setExamTitle] = useState(examMode.examTitle)
  const [examDate, setExamDate] = useState(examMode.examDate)
  const [authStatus, setAuthStatus] = useState('')
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState('')
  const [targetDayType, setTargetDayType] = useState<'default' | 'training' | 'rest'>('default')
  const activeNutritionTarget = useMemo(
    () => nutritionTargets[targetDayType] ?? nutritionTargets.default,
    [nutritionTargets, targetDayType],
  )
  const [targetCalories, setTargetCalories] = useState(String(activeNutritionTarget.calories))
  const [targetProtein, setTargetProtein] = useState(String(activeNutritionTarget.proteinG))
  const [targetCarbs, setTargetCarbs] = useState(String(activeNutritionTarget.carbsG))
  const [targetFats, setTargetFats] = useState(String(activeNutritionTarget.fatsG))
  const [goalStatus, setGoalStatus] = useState('')

  const profileName = useMemo(() => getProfileName(sessionEmail), [sessionEmail])
  const profileInitial = useMemo(() => profileName.charAt(0).toUpperCase(), [profileName])

  const dashboard = useMemo(() => {
    const { start: currentStart, end: currentEnd } = weekBounds(0)
    const { start: previousStart, end: previousEnd } = weekBounds(-1)

    const inRange = (date: string, start: string, end: string) => date >= start && date <= end

    const weeklyStudyBlocks = Object.entries(studyByDate)
      .filter(([date]) => inRange(date, currentStart, currentEnd))
      .flatMap(([, day]) => day.blocks)
    const weeklyFocusMins = weeklyStudyBlocks.reduce((sum, block) => sum + block.pomodorosDone * 25, 0)

    const workoutVolume = (start: string, end: string) =>
      Object.entries(workoutLogsByDate)
        .filter(([date]) => inRange(date, start, end))
        .reduce(
          (total, [, log]) =>
            total +
            log.exercises.reduce(
              (exerciseTotal, exercise) =>
                exerciseTotal +
                exercise.loggedSets.reduce(
                  (setTotal, setItem) => setTotal + (setItem.weightKg ?? exercise.weightKg ?? 0) * setItem.reps,
                  0,
                ),
              0,
            ),
          0,
        )

    const currentVolume = workoutVolume(currentStart, currentEnd)
    const previousVolume = workoutVolume(previousStart, previousEnd)
    const workoutDeltaPct =
      previousVolume > 0 ? Math.round(((currentVolume - previousVolume) / previousVolume) * 100) : currentVolume > 0 ? 100 : 0

    const weeklyConsistencyBars = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(`${currentStart}T00:00:00`)
      date.setDate(date.getDate() + index)
      const key = format(date, 'yyyy-MM-dd')
      const map = completionByDate[key] ?? {}
      const completed = cardKeys.reduce((count, card) => count + (map[card] ? 1 : 0), 0)
      return Math.max(8, Math.round((completed / cardKeys.length) * 100))
    })

    const streakStatuses = computeDayStatuses(
      Array.from({ length: 60 }).map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (59 - index))
        const key = format(date, 'yyyy-MM-dd')
        const map = completionByDate[key] ?? {}
        return { date: key, hadChecklistActivity: cardKeys.every((card) => Boolean(map[card])) }
      }),
    )

    let bestStreak = 0
    let running = 0
    for (const item of streakStatuses) {
      if (item.status === 'complete') {
        running += 1
        bestStreak = Math.max(bestStreak, running)
      } else {
        running = 0
      }
    }

    const heatmapData = Array.from({ length: 28 }).map((_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (27 - index))
      const key = format(date, 'yyyy-MM-dd')
      const map = completionByDate[key] ?? {}
      const completed = cardKeys.reduce((count, card) => count + (map[card] ? 1 : 0), 0)
      if (completed === cardKeys.length) {
        return 'high'
      }
      if (completed > 0) {
        return 'active'
      }
      return ''
    })

    return {
      weeklyFocusMins,
      currentVolume,
      workoutDeltaPct,
      weeklyConsistencyBars,
      currentStreak: computeCurrentStreak(streakStatuses),
      bestStreak,
      heatmapData,
    }
  }, [completionByDate, studyByDate, workoutLogsByDate])

  const refreshSyncInfo = async () => {
    const [count, activeEmail] = await Promise.all([db.syncQueue.count(), getSessionEmail()])
    setQueueCount(count)
    setSessionEmail(activeEmail)
  }

  const syncNow = async () => {
    const result = await flushSyncQueue()
    if (result.reason) {
      setSyncStatus(result.reason)
    } else {
      const suffix = result.lastError ? ` Last error: ${result.lastError}` : ''
      setSyncStatus(`Synced ${result.processed} item(s), failed ${result.failed}.${suffix}`)
    }
    await refreshSyncInfo()
  }

  const saveNutritionGoals = () => {
    const nextCalories = Number(targetCalories)
    const nextProtein = Number(targetProtein)
    const nextCarbs = Number(targetCarbs)
    const nextFats = Number(targetFats)

    if (![nextCalories, nextProtein, nextCarbs, nextFats].every((value) => Number.isFinite(value) && value >= 0)) {
      setGoalStatus('Enter valid non-negative numbers for all macro targets.')
      return
    }

    setNutritionTargets(targetDayType, {
      calories: Math.round(nextCalories),
      proteinG: Math.round(nextProtein),
      carbsG: Math.round(nextCarbs),
      fatsG: Math.round(nextFats),
    })
    setGoalStatus(
      targetDayType === 'default'
        ? 'Saved. These default targets apply every day until changed again.'
        : `Saved. These ${targetDayType} targets override defaults for ${targetDayType} days.`,
    )
  }

  useEffect(() => {
    setTargetCalories(String(activeNutritionTarget.calories))
    setTargetProtein(String(activeNutritionTarget.proteinG))
    setTargetCarbs(String(activeNutritionTarget.carbsG))
    setTargetFats(String(activeNutritionTarget.fatsG))
  }, [activeNutritionTarget])

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
        <span className="page-label">You</span>
        <h1 className="page-title">Profile &amp; Metrics</h1>
      </header>

      <section className="mt-4 rounded-input border border-border bg-surface p-4">
        {!hasSupabaseConfig && <p className="mb-3 text-xs text-warning">Supabase env vars are missing in this build.</p>}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-[var(--surface-strong)] text-sm font-semibold text-white">
              {profileInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base text-text">{profileName}</p>
              <p className="truncate text-xs text-tertiary">{sessionEmail ?? 'Not signed in'}</p>
            </div>
          </div>
          <button type="button" className="inspo-button-primary h-10 px-4" onClick={() => void syncNow()}>
            Sync Account
          </button>
        </div>

        {!sessionEmail && (
          <div className="mt-3 rounded-input border border-border bg-[var(--surface-strong)] p-3 text-xs text-muted">
            <p className="uppercase tracking-[0.05em] text-tertiary">First-time sign in</p>
            <p className="mt-1">1. Click "Sign in with Google".</p>
            <p>2. Complete Google consent.</p>
            <p>3. Return to this app tab and account status refreshes automatically.</p>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inspo-button-ghost h-11"
            onClick={async () => {
              const result = await signInWithGoogle()
              setAuthStatus(result.error ? `Sign in error: ${result.error}` : 'Continue in Google to finish sign-in.')
            }}
          >
            Sign in with Google
          </button>
          <button
            type="button"
            className="inspo-button-ghost h-11"
            onClick={async () => {
              const result = await signOutSession()
              setAuthStatus(result.error ? `Sign out error: ${result.error}` : 'Signed out.')
              await refreshSyncInfo()
            }}
          >
            Sign out
          </button>
        </div>

        <p className="mt-3 text-xs text-muted">Pending sync queue: {queueCount}</p>
        {authStatus && <p className="mt-2 text-xs text-tertiary">{authStatus}</p>}
        {syncStatus && <p className="mt-1 text-xs text-tertiary">{syncStatus}</p>}
      </section>

      <section className="mt-5">
        <span className="page-label">Weekly Consistency</span>
        <div className="mt-2 flex h-20 items-end gap-1 rounded-input border border-border bg-surface p-3">
          {dashboard.weeklyConsistencyBars.map((value, index) => (
            <div
              key={`${value}-${index}`}
              className={`flex-1 rounded-t ${index === dashboard.weeklyConsistencyBars.length - 1 ? 'bg-white' : 'bg-white/45'}`}
              style={{ height: `${value}%` }}
            />
          ))}
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-input border border-border bg-surface p-3">
          <span className="page-label">Study Focus</span>
          <p className="text-lg text-text">
            {dashboard.weeklyFocusMins} <span className="text-xs text-tertiary">mins this week</span>
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded bg-white/15">
            <div className="h-full rounded bg-white" style={{ width: `${Math.min(100, Math.round((dashboard.weeklyFocusMins / 600) * 100))}%` }} />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.05em] text-tertiary">Target: 600 mins</p>
        </div>
        <div className="rounded-input border border-border bg-surface p-3">
          <span className="page-label">Workout Volume</span>
          <p className="text-lg text-text">
            {dashboard.currentVolume} <span className="text-xs text-tertiary">kg-reps</span>
          </p>
          <p className="mt-2 text-xs text-tertiary">
            {dashboard.workoutDeltaPct >= 0 ? '+' : ''}
            {dashboard.workoutDeltaPct}% vs last week
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center justify-between text-[20px] font-normal text-text">
          Consistency <span className="text-[13px] text-tertiary">Last 4 Weeks</span>
        </h2>
        <div className="rounded-input border border-border bg-surface p-4">
          <div className="grid grid-cols-7 gap-1.5">
            {dashboard.heatmapData.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className={`aspect-square rounded-[2px] ${
                  day === 'high' ? 'bg-white/60' : day === 'active' ? 'bg-white/20' : 'bg-white/5'
                }`}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
            <span>Current Streak</span>
            <span className="text-white">{dashboard.currentStreak} Days</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
            <span>Best Streak</span>
            <span className="text-white">{dashboard.bestStreak} Days</span>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[20px] font-normal text-text">Daily Macro Goals</h2>
        <div className="rounded-input border border-border bg-surface p-4">
          <p className="mb-3 text-xs text-tertiary">Set default targets and optional overrides for training/rest days.</p>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            {(['default', 'training', 'rest'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`h-8 rounded-full border px-3 ${
                  targetDayType === type
                    ? 'border-white bg-white/15 text-white'
                    : 'border-border bg-transparent text-tertiary'
                }`}
                onClick={() => {
                  setTargetDayType(type)
                  setGoalStatus('')
                }}
              >
                {type === 'default' ? 'Default' : type === 'training' ? 'Training Day' : 'Rest Day'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="inspo-field"
              type="number"
              min={0}
              placeholder="Calories"
              value={targetCalories}
              onChange={(event) => setTargetCalories(event.target.value)}
            />
            <input
              className="inspo-field"
              type="number"
              min={0}
              placeholder="Protein (g)"
              value={targetProtein}
              onChange={(event) => setTargetProtein(event.target.value)}
            />
            <input
              className="inspo-field"
              type="number"
              min={0}
              placeholder="Carbs (g)"
              value={targetCarbs}
              onChange={(event) => setTargetCarbs(event.target.value)}
            />
            <input
              className="inspo-field"
              type="number"
              min={0}
              placeholder="Fats (g)"
              value={targetFats}
              onChange={(event) => setTargetFats(event.target.value)}
            />
          </div>
          <button type="button" className="inspo-button-primary mt-3 h-10 w-full" onClick={saveNutritionGoals}>
            Save Macro Goals
          </button>
          {goalStatus && <p className="mt-2 text-xs text-tertiary">{goalStatus}</p>}
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
    </div>
  )
}
