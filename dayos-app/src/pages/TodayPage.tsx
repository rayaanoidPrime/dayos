import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import { computeCurrentStreak, computeDayStatuses } from '../lib/streak'
import { useJournalStore } from '../store/journalStore'
import { useResearchStore } from '../store/researchStore'
import { useScheduleStore } from '../store/scheduleStore'
import { useStudyStore } from '../store/studyStore'
import { cardKeys, useTodayStore } from '../store/todayStore'
import { useWorkoutStore } from '../store/workoutStore'
import type { Meal } from '../types/domain'

function toSessionTitle(session: string): string {
  return session
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type DashboardTask = {
  key: 'study' | 'research' | 'journal' | 'workout'
  title: string
  meta: string
}

type WorkoutRow = {
  key: string
  exerciseIndex: number
  setIndex: number
  exercise: string
  set: number
  load: string
  reps: number
}

export function TodayPage() {
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const weekday = useMemo(() => format(new Date(), 'EEEE'), [])
  const subtitle = useMemo(() => `${format(new Date(), 'MMMM d, yyyy')} - Week ${format(new Date(), 'II')}`, [])

  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [mealChecks, setMealChecks] = useState<Record<string, boolean>>({})
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [isRunningTimer, setIsRunningTimer] = useState(false)
  const [remainingSecs, setRemainingSecs] = useState(23 * 60 + 45)
  const [repsDraft, setRepsDraft] = useState<Record<string, string>>({})

  const completionByDate = useTodayStore((state) => state.completionByDate)
  const toggleCardComplete = useTodayStore((state) => state.toggleCardComplete)
  const nutritionTargets = useTodayStore((state) => state.nutritionTargets)

  const recurringClasses = useScheduleStore((state) => state.recurringClasses)
  const events = useScheduleStore((state) => state.events)
  const tasks = useResearchStore((state) => state.tasks)
  const papers = useResearchStore((state) => state.papers)
  const studyByDate = useStudyStore((state) => state.byDate)
  const ensureStudyDate = useStudyStore((state) => state.ensureDate)
  const incrementPomodoro = useStudyStore((state) => state.incrementPomodoro)
  const entriesByDate = useJournalStore((state) => state.entriesByDate)

  const weeklySplit = useWorkoutStore((state) => state.weeklySplit)
  const logsByDate = useWorkoutStore((state) => state.logsByDate)
  const ensureDayLog = useWorkoutStore((state) => state.ensureDayLog)
  const upsertLoggedSet = useWorkoutStore((state) => state.upsertLoggedSet)

  const dayIndexForSplit = (new Date().getDay() + 6) % 7
  const sessionType = weeklySplit[dayIndexForSplit] ?? 'rest'
  const workoutLog = logsByDate[today]
  const studyBlocks = studyByDate[today]?.blocks ?? []
  const journalEntry = entriesByDate[today]
  const complete = completionByDate[today] ?? {}

  useEffect(() => {
    ensureDayLog(today, sessionType)
  }, [ensureDayLog, sessionType, today])

  useEffect(() => {
    ensureStudyDate(today)
  }, [ensureStudyDate, today])

  useEffect(() => {
    if (!activeBlockId && studyBlocks.length > 0) {
      setActiveBlockId(studyBlocks[0].id)
    }
  }, [activeBlockId, studyBlocks])

  useEffect(() => {
    void db.meals.where('date').equals(today).toArray().then((rows) => {
      setTodayMeals(rows)
      setMealChecks((prev) => {
        const next = { ...prev }
        for (const meal of rows) {
          const key = meal.id ?? `${meal.name}-${meal.updatedAt}`
          if (!(key in next)) {
            next[key] = false
          }
        }
        return next
      })
    })
  }, [today])

  useEffect(() => {
    if (!isRunningTimer) {
      return
    }

    const intervalId = window.setInterval(() => {
      setRemainingSecs((secs) => {
        if (secs <= 1) {
          if (activeBlockId) {
            incrementPomodoro(today, activeBlockId)
          }
          setIsRunningTimer(false)
          return 25 * 60
        }
        return secs - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeBlockId, incrementPomodoro, isRunningTimer, today])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden' || !isRunningTimer) {
        return
      }
      setIsRunningTimer(false)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Pomodoro paused', {
          body: 'DayOS paused your timer while the app is in background.',
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isRunningTimer])

  const todayClass = useMemo(
    () =>
      recurringClasses
        .filter((item) => item.dayOfWeek === ((new Date().getDay() + 6) % 7) + 1)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0],
    [recurringClasses],
  )

  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => event.date >= today)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0],
    [events, today],
  )

  const primaryStudy = studyBlocks[0]
  const primaryResearchTask =
    tasks.find((task) => task.status === 'in_progress') ?? tasks.find((task) => task.status === 'todo') ?? tasks[0]

  const dashboardTasks = useMemo<DashboardTask[]>(
    () => [
      {
        key: 'study',
        title: primaryStudy ? `${primaryStudy.subject}${primaryStudy.topic ? `: ${primaryStudy.topic}` : ''}` : 'No study block planned',
        meta: primaryStudy
          ? `Deep Work • ${primaryStudy.targetMins}m • ${primaryStudy.pomodorosDone} pomodoros`
          : 'Add a study block in Study module',
      },
      {
        key: 'research',
        title: primaryResearchTask?.title ?? 'No research task yet',
        meta: primaryResearchTask
          ? primaryResearchTask.status === 'in_progress'
            ? 'Research • In Progress'
            : primaryResearchTask.status === 'done'
              ? 'Research • Done'
              : 'Research • To Do'
          : 'Create a research task in Research tab',
      },
      {
        key: 'journal',
        title: journalEntry?.topPriorityTomorrow || nextEvent?.title || 'No admin/journal priority yet',
        meta: journalEntry?.topPriorityTomorrow
          ? 'Journal • Tomorrow Priority'
          : nextEvent
            ? `${nextEvent.type.toUpperCase()} • ${nextEvent.date} ${nextEvent.time}`
            : todayClass
              ? `${todayClass.course} • ${todayClass.startTime}-${todayClass.endTime}`
              : 'Add a class/event in Plan tab',
      },
      {
        key: 'workout',
        title: `Workout: ${toSessionTitle(sessionType)}`,
        meta:
          workoutLog?.sessionType === 'rest'
            ? 'Recovery • Rest day'
            : `Health • ${workoutLog?.exercises.length ?? 0} exercises`,
      },
    ],
    [journalEntry, nextEvent, primaryResearchTask, primaryStudy, sessionType, todayClass, workoutLog?.exercises.length, workoutLog?.sessionType],
  )

  const weekTaskCompletion = useMemo(() => {
    const taskKeys: Array<DashboardTask['key']> = ['study', 'research', 'journal', 'workout']
    let done = 0
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(`${today}T00:00:00`)
      date.setDate(date.getDate() - i)
      const key = format(date, 'yyyy-MM-dd')
      const map = completionByDate[key] ?? {}
      if (taskKeys.every((taskKey) => Boolean(map[taskKey]))) {
        done += 1
      }
    }
    return done
  }, [completionByDate, today])

  const workoutRows = useMemo<WorkoutRow[]>(() => {
    if (!workoutLog || workoutLog.sessionType === 'rest') {
      return []
    }

    const rows: WorkoutRow[] = []
    workoutLog.exercises.forEach((exercise, exerciseIndex) => {
      const setCount = Math.max(exercise.plannedSets, exercise.loggedSets.length || 1)
      for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
        const logged = exercise.loggedSets[setIndex]
        rows.push({
          key: `${exerciseIndex}-${setIndex}`,
          exerciseIndex,
          setIndex,
          exercise: exercise.name,
          set: setIndex + 1,
          load: `${logged?.weightKg ?? exercise.weightKg ?? '-'}${logged?.weightKg ?? exercise.weightKg ? 'kg' : ''}`,
          reps: logged?.reps ?? exercise.plannedReps,
        })
      }
    })

    return rows
  }, [workoutLog])

  const paperByStatus = {
    toRead: papers.find((paper) => paper.status === 'to-read'),
    reading: papers.find((paper) => paper.status === 'reading'),
    done: papers.find((paper) => paper.status === 'done'),
  }

  const heatmap = useMemo(() => {
    const recent = Array.from({ length: 21 }).map((_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (20 - index))
      const key = format(date, 'yyyy-MM-dd')
      const map = completionByDate[key] ?? {}
      const completedCount = cardKeys.reduce((count, cardKey) => count + (map[cardKey] ? 1 : 0), 0)
      if (completedCount >= cardKeys.length) {
        return 'high'
      }
      if (completedCount > 0) {
        return 'active'
      }
      return 'low'
    })

    const chunks = [recent.slice(0, 7), recent.slice(7, 14), recent.slice(14, 21)]

    const statuses = computeDayStatuses(
      Array.from({ length: 30 }).map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (29 - index))
        const key = format(date, 'yyyy-MM-dd')
        const map = completionByDate[key] ?? {}
        const hadChecklistActivity = cardKeys.every((card) => Boolean(map[card]))
        return { date: key, hadChecklistActivity }
      }),
    )

    const completionRate = Math.round((recent.filter((level) => level !== 'low').length / recent.length) * 100)

    return {
      chunks,
      streak: computeCurrentStreak(statuses),
      completionRate,
    }
  }, [completionByDate])

  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0)

  const onWorkoutRepsCommit = (row: WorkoutRow) => {
    const value = repsDraft[row.key] ?? String(row.reps)
    const reps = Number(value)
    if (!Number.isFinite(reps) || reps <= 0) {
      setRepsDraft((draft) => ({ ...draft, [row.key]: String(row.reps) }))
      return
    }

    const loggedWeight = row.load === '-' ? undefined : Number(row.load.replace('kg', ''))
    upsertLoggedSet(today, row.exerciseIndex, row.setIndex, reps, Number.isFinite(loggedWeight) ? loggedWeight : undefined)
  }

  return (
    <div className="h-full">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="md:col-span-2">
          <span className="page-label">Institute of Natural Law</span>
          <h1 className="page-title">{weekday}</h1>
          <span className="page-subtitle">{subtitle}</span>
        </div>

        <div>
          <section className="mb-8 text-left">
            <span className="page-label">Current Session</span>
            <div className="my-4 flex items-end gap-3 text-[64px] font-light leading-none tracking-[-0.03em] text-white [font-variant-numeric:tabular-nums]">
              {Math.floor(remainingSecs / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(remainingSecs % 60).toString().padStart(2, '0')}
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-white transition hover:border-muted hover:bg-white/5"
                onClick={async () => {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    await Notification.requestPermission()
                  }
                  setIsRunningTimer((running) => !running)
                }}
              >
                {isRunningTimer ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="text-[15px] text-white/80">
              {studyBlocks.find((block) => block.id === activeBlockId)?.topic || 'Background session is idle'}
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center justify-between text-[20px] font-normal text-white">
              Today <span className="text-[13px] text-tertiary">{weekTaskCompletion}/7</span>
            </h2>
            <div className="flex flex-col">
              {dashboardTasks.map((task) => (
                <div
                  key={task.key}
                  className={`flex cursor-pointer items-start gap-3 border-b border-border py-3 ${complete[task.key] ? 'checked' : ''}`}
                  onClick={() => toggleCardComplete(today, task.key)}
                >
                  <div
                    className={`mt-0.5 h-5 w-5 shrink-0 border ${
                      complete[task.key] ? 'border-white bg-white' : 'border-tertiary bg-transparent'
                    } ${task.key === 'journal' ? 'rounded-[4px]' : 'rounded-full'}`}
                  />
                  <div className="flex-1">
                    <div className={`mb-1 text-[15px] ${complete[task.key] ? 'text-tertiary line-through' : 'text-white'}`}>
                      {task.title}
                    </div>
                    <div className="text-[11px] text-tertiary">{task.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 mt-8 flex items-center justify-between text-[20px] font-normal text-white">
              Workout Log <span className="text-[13px] text-tertiary">{sessionType === 'rest' ? 'Rest Day' : 'Active'}</span>
            </h2>
            {sessionType === 'rest' ? (
              <p className="text-sm text-tertiary">Rest day configured in weekly split.</p>
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="border-b border-border pb-2 text-left font-normal text-tertiary">Exercise</th>
                    <th className="border-b border-border pb-2 text-left font-normal text-tertiary">Set</th>
                    <th className="border-b border-border pb-2 text-left font-normal text-tertiary">Load</th>
                    <th className="border-b border-border pb-2 text-right font-normal text-tertiary">Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {workoutRows.map((row) => (
                    <tr key={row.key}>
                      <td className="border-b border-white/5 py-2.5 text-muted">{row.exercise}</td>
                      <td className="border-b border-white/5 py-2.5 text-muted">{row.set}</td>
                      <td className="border-b border-white/5 py-2.5 text-muted">{row.load}</td>
                      <td className="border-b border-white/5 py-2.5 text-right text-muted">
                        <input
                          type="text"
                          className="w-8 border-none bg-transparent text-right text-white outline-none"
                          value={repsDraft[row.key] ?? String(row.reps)}
                          onChange={(event) => setRepsDraft((draft) => ({ ...draft, [row.key]: event.target.value }))}
                          onBlur={() => onWorkoutRepsCommit(row)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              onWorkoutRepsCommit(row)
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {workoutRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-sm text-tertiary">
                        No workout sets logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div>
          <section>
            <h2 className="mb-4 mt-0 flex items-center justify-between text-[20px] font-normal text-white md:mt-8">
              Research <span className="text-[13px] text-tertiary">ArXiv Sync</span>
            </h2>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
              <div className="min-w-[200px] rounded-input border border-border bg-surface p-4">
                <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted">To Read</span>
                <div className="mt-2 text-[13px] leading-[1.4] text-white">{paperByStatus.toRead?.title ?? 'No paper in this lane yet'}</div>
                <div className="mt-2 text-[11px] text-tertiary">{paperByStatus.toRead?.authors || 'Add from Research tab'}</div>
              </div>
              <div className="min-w-[200px] rounded-input border border-border bg-surface p-4">
                <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted">Analysis</span>
                <div className="mt-2 text-[13px] leading-[1.4] text-white">{paperByStatus.reading?.title ?? 'No paper in this lane yet'}</div>
                <div className="mt-2 text-[11px] text-tertiary">{paperByStatus.reading?.authors || 'Move a paper to reading'}</div>
              </div>
              <div className="min-w-[200px] rounded-input border border-border bg-surface p-4">
                <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted">Done</span>
                <div className="mt-2 text-[13px] leading-[1.4] text-white">{paperByStatus.done?.title ?? 'No paper in this lane yet'}</div>
                <div className="mt-2 text-[11px] text-tertiary">{paperByStatus.done?.authors || 'Complete a paper to populate'}</div>
              </div>
            </div>
            <Link to="/research" className="mt-4 inline-flex items-center gap-2 text-[13px] text-muted">
              View Paper Log
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </section>

          <section>
            <h2 className="mb-4 mt-8 text-[20px] font-normal text-white">Consistency</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.chunks.flat().map((level, index) => (
                <div
                  key={`${level}-${index}`}
                  className={`aspect-square rounded-[2px] ${
                    level === 'high' ? 'bg-white/60' : level === 'active' ? 'bg-white/20' : 'bg-white/5'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
              <span>Current Streak</span>
              <span className="text-white">{heatmap.streak} Days</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px] text-muted">
              <span>Completion Rate</span>
              <span className="text-white">{heatmap.completionRate}%</span>
            </div>
          </section>

          <section>
            <h2 className="mb-4 mt-8 flex items-center justify-between text-[20px] font-normal text-white">
              Nutrition <span className="text-[13px] text-tertiary">{totalCalories} / {nutritionTargets.calories} kcal</span>
            </h2>
            <div className="flex flex-col">
              {todayMeals.map((meal) => {
                const mealKey = meal.id ?? `${meal.name}-${meal.updatedAt}`
                const checked = mealChecks[mealKey] ?? false
                return (
                  <div
                    key={mealKey}
                    className={`flex cursor-pointer items-start gap-3 border-b border-border py-3 ${checked ? 'checked' : ''}`}
                    onClick={() => setMealChecks((state) => ({ ...state, [mealKey]: !checked }))}
                  >
                    <div
                      className={`mt-0.5 h-5 w-5 shrink-0 rounded-[4px] border ${
                        checked ? 'border-white bg-white' : 'border-tertiary bg-transparent'
                      }`}
                    />
                    <div className="flex-1">
                      <div className={`mb-1 text-[15px] ${checked ? 'text-tertiary line-through' : 'text-white'}`}>{meal.name}</div>
                      <div className="text-[11px] text-tertiary">
                        {meal.calories} kcal • {meal.proteinG}g P • {meal.portionLabel || 'portion n/a'}
                      </div>
                    </div>
                  </div>
                )
              })}
              {todayMeals.length === 0 && <p className="text-sm text-tertiary">No meals logged yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
