import { addDays, format } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, deleteMeal, logMeal, saveImportedMeals, updateMeal } from '../lib/db'
import { useJournalStore } from '../store/journalStore'
import { useResearchStore } from '../store/researchStore'
import { findNextEventInstance, getEventInstancesForDate, useScheduleStore } from '../store/scheduleStore'
import { useStudyStore } from '../store/studyStore'
import type { MealTemplate } from '../store/todayStore'
import { NutritionDayType, useTodayStore } from '../store/todayStore'
import { useWorkoutStore } from '../store/workoutStore'
import type { Meal, SessionType } from '../types/domain'

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

type QuickImportMeal = {
  name: string
  portionLabel: string
  calories: number
  proteinG: number
  fatsG: number
  carbsG: number
}

type MealSchemaView = {
  id?: string
  name: string
  portion_label: string
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
  updated_at: string
}

const toMealSchemaView = (meal: Meal): MealSchemaView => ({
  id: meal.id,
  name: meal.name,
  portion_label: meal.portionLabel,
  calories: meal.calories,
  protein_g: meal.proteinG,
  carbs_g: meal.carbsG,
  fats_g: meal.fatsG,
  updated_at: meal.updatedAt,
})

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const splitCsvLine = (line: string): string[] => {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  values.push(current.trim())
  return values
}

function parseQuickMealInput(raw: string): QuickImportMeal[] {
  const input = raw.trim()
  if (!input) {
    return []
  }

  if (input.startsWith('{') || input.startsWith('[')) {
    const parsed = JSON.parse(input) as unknown
    const items = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed && 'meals' in parsed
        ? (parsed as { meals: unknown[] }).meals
        : []

    return items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        name: String(item.name ?? item.item ?? item.food ?? '').trim(),
        portionLabel: String(item.portionLabel ?? item.portion ?? item.qty ?? '').trim(),
        calories: toNumber(item.calories ?? item.kcal),
        proteinG: toNumber(item.proteinG ?? item.protein ?? item.protein_g),
        fatsG: toNumber(item.fatsG ?? item.fats ?? item.fat ?? item.fat_g),
        carbsG: toNumber(item.carbsG ?? item.carbs ?? item.carbohydrates ?? item.carb_g),
      }))
      .filter((item) => item.name.length > 0)
  }

  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    return []
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase())

  return lines
    .slice(1)
    .map((line) => splitCsvLine(line))
    .map((columns) => {
      const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? '']))
      return {
        name: String(row.name ?? row.item ?? row.food ?? '').trim(),
        portionLabel: String(row.portionlabel ?? row.portion ?? row.qty ?? '').trim(),
        calories: toNumber(row.calories ?? row.kcal),
        proteinG: toNumber(row.proteing ?? row.protein ?? row.protein_g),
        fatsG: toNumber(row.fatsg ?? row.fats ?? row.fat ?? row.fat_g),
        carbsG: toNumber(row.carbsg ?? row.carbs ?? row.carbohydrates ?? row.carb_g),
      }
    })
    .filter((item) => item.name.length > 0)
}

export function TodayPage() {
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const weekday = useMemo(() => format(new Date(), 'EEEE'), [])
  const subtitle = useMemo(() => `${format(new Date(), 'MMMM d, yyyy')} - Week ${format(new Date(), 'II')}`, [])

  const [todayMeals, setTodayMeals] = useState<MealSchemaView[]>([])
  const [isImportOpen, setImportOpen] = useState(false)
  const [importInput, setImportInput] = useState('')
  const [importStatus, setImportStatus] = useState('')
  const [editingMealId, setEditingMealId] = useState<string | null>(null)
  const [mealDraft, setMealDraft] = useState<MealSchemaView | null>(null)
  const [templateSaveStatus, setTemplateSaveStatus] = useState('')
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [isRunningTimer, setIsRunningTimer] = useState(false)
  const [remainingSecs, setRemainingSecs] = useState(23 * 60 + 45)
  const [repsDraft, setRepsDraft] = useState<Record<string, string>>({})

  const completionByDate = useTodayStore((state) => state.completionByDate)
  const toggleCardComplete = useTodayStore((state) => state.toggleCardComplete)
  const nutritionTargets = useTodayStore((state) => state.nutritionTargets)
  const mealTemplates = useTodayStore((state) => state.mealTemplates)
  const addMealTemplate = useTodayStore((state) => state.addMealTemplate)

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
  const templates = useWorkoutStore((state) => state.templates)
  const ensureDayLog = useWorkoutStore((state) => state.ensureDayLog)
  const upsertLoggedSet = useWorkoutStore((state) => state.upsertLoggedSet)
  const manualSessionOverrides = useWorkoutStore((state) => state.manualSessionOverrides)
  const setSessionOverride = useWorkoutStore((state) => state.setSessionOverride)
  const clearSessionOverride = useWorkoutStore((state) => state.clearSessionOverride)

  const dayIndexForSplit = (new Date().getDay() + 6) % 7
  const baseSessionType = weeklySplit[dayIndexForSplit] ?? 'rest'
  const sessionOverrideType = manualSessionOverrides[today]
  const sessionType = sessionOverrideType ?? baseSessionType
  const dayType: NutritionDayType = sessionType === 'rest' ? 'rest' : 'training'
  const workoutLog = logsByDate[today]
  const trainingOptions = weeklySplit.filter((type) => type !== 'rest')
  const [overrideSelection, setOverrideSelection] = useState<SessionType>(trainingOptions[0] ?? 'push')
  useEffect(() => {
    if (!trainingOptions.includes(overrideSelection)) {
      setOverrideSelection(trainingOptions[0] ?? 'push')
    }
  }, [trainingOptions, overrideSelection])
  const studyBlocks = studyByDate[today]?.blocks ?? []
  const journalEntry = entriesByDate[today]
  const complete = completionByDate[today] ?? {}

  const todayWorkoutEvent = useMemo(
    () => getEventInstancesForDate(events, today).find((item) => item.event.category === 'workout')?.event,
    [events, today],
  )

  const todayWorkoutTemplate = useMemo(
    () => templates.find((template) => template.id === todayWorkoutEvent?.workoutTemplateId),
    [templates, todayWorkoutEvent?.workoutTemplateId],
  )

  useEffect(() => {
    if (sessionType === 'rest') {
      ensureDayLog(today, sessionType)
      return
    }

    if (todayWorkoutTemplate) {
      ensureDayLog(today, sessionType, {
        templateId: todayWorkoutTemplate.id,
        templateName: todayWorkoutTemplate.name,
        exercises: todayWorkoutTemplate.exercises.map((exercise) => ({
          name: exercise.name,
          plannedSets: exercise.plannedSets,
          plannedReps: exercise.plannedReps,
          weightKg: exercise.weightKg,
        })),
      })
      return
    }

    ensureDayLog(today, sessionType)
  }, [ensureDayLog, sessionType, today, todayWorkoutTemplate])

  useEffect(() => {
    ensureStudyDate(today)
  }, [ensureStudyDate, today])

  useEffect(() => {
    if (!activeBlockId && studyBlocks.length > 0) {
      setActiveBlockId(studyBlocks[0].id)
    }
  }, [activeBlockId, studyBlocks])

  const reloadMeals = useCallback(async () => {
    const rows = await db.meals.where('date').equals(today).toArray()
    setTodayMeals(rows.map(toMealSchemaView))
  }, [today])

  useEffect(() => {
    void reloadMeals()
  }, [reloadMeals])

  const startMealEdit = (meal: MealSchemaView) => {
    if (!meal.id) {
      return
    }
    setEditingMealId(meal.id)
    setMealDraft(meal)
    setTemplateSaveStatus('')
  }

  const cancelMealEdit = () => {
    setEditingMealId(null)
    setMealDraft(null)
    setTemplateSaveStatus('')
  }

  const saveMealEdit = async () => {
    if (!mealDraft?.id) {
      return
    }
    const parseNumber = (value: unknown) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    await updateMeal({
      id: mealDraft.id,
      date: today,
      name: mealDraft.name,
      portionLabel: mealDraft.portion_label,
      calories: parseNumber(mealDraft.calories),
      proteinG: parseNumber(mealDraft.protein_g),
      fatsG: parseNumber(mealDraft.fats_g),
      carbsG: parseNumber(mealDraft.carbs_g),
      source: 'manual',
      updatedAt: mealDraft.updated_at ?? new Date().toISOString(),
    })

    cancelMealEdit()
    void reloadMeals()
  }

  const deleteMealEntry = async (mealId: string) => {
    if (!window.confirm('Remove this meal?')) {
      return
    }
    await deleteMeal(mealId)
    if (editingMealId === mealId) {
      cancelMealEdit()
    }
    void reloadMeals()
  }

  const saveMealAsTemplate = () => {
    if (!mealDraft) {
      return
    }
    addMealTemplate({
      name: mealDraft.name,
      portionLabel: mealDraft.portion_label,
      calories: mealDraft.calories ?? 0,
      proteinG: mealDraft.protein_g ?? 0,
      fatsG: mealDraft.fats_g ?? 0,
      carbsG: mealDraft.carbs_g ?? 0,
    })
    setTemplateSaveStatus('Saved as template')
  }

  const applyMealTemplate = async (template: MealTemplate) => {
    await logMeal({
      date: today,
      name: template.name,
      portionLabel: template.portionLabel,
      calories: template.calories,
      proteinG: template.proteinG,
      fatsG: template.fatsG,
      carbsG: template.carbsG,
      source: 'manual',
    })
    setImportStatus(`Logged ${template.name}`)
    setTemplateSaveStatus('')
    void reloadMeals()
  }

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
    () => findNextEventInstance(events, today, format(new Date(), 'HH:mm')),
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
          ? `Deep Work  -  ${primaryStudy.targetMins}m  -  ${primaryStudy.pomodorosDone} pomodoros`
          : 'Add a study block in Study module',
      },
      {
        key: 'research',
        title: primaryResearchTask?.title ?? 'No research task yet',
        meta: primaryResearchTask
          ? primaryResearchTask.status === 'in_progress'
            ? 'Research  -  In Progress'
            : primaryResearchTask.status === 'done'
              ? 'Research  -  Done'
              : 'Research  -  To Do'
          : 'Create a research task in Research tab',
      },
      {
        key: 'journal',
        title: journalEntry?.topPriorityTomorrow || nextEvent?.event.title || 'No admin/journal priority yet',
        meta: journalEntry?.topPriorityTomorrow
          ? 'Journal  -  Tomorrow Priority'
          : nextEvent
            ? nextEvent.event.category.toUpperCase() + '  -  ' + nextEvent.date + ' ' + nextEvent.startTime
            : todayClass
              ? `${todayClass.course}  -  ${todayClass.startTime}-${todayClass.endTime}`
              : 'Add a class/event in Plan tab',
      },
      {
        key: 'workout',
        title: workoutLog?.templateName ? `Workout: ${workoutLog.templateName}` : `Workout: ${toSessionTitle(sessionType)}`,
        meta:
          workoutLog?.sessionType === 'rest'
            ? 'Recovery  -  Rest day'
            : `Health  -  ${workoutLog?.exercises.length ?? 0} exercises`,
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

  const progressiveHints = useMemo(() => {
    if (!workoutLog) {
      return []
    }
    return workoutLog.exercises
      .map((exercise) => {
        const lastSet = exercise.loggedSets[exercise.loggedSets.length - 1]
        if (!lastSet?.weightKg || !exercise.weightKg) {
          return null
        }
        const difference = Number((lastSet.weightKg - (exercise.weightKg ?? 0)).toFixed(1))
        if (Math.abs(difference) < 0.5) {
          return null
        }
        return {
          name: exercise.name,
          diff: difference,
        }
      })
      .filter(Boolean)
  }, [workoutLog])

  const paperByStatus = {
    toRead: papers.find((paper) => paper.status === 'to-read'),
    reading: papers.find((paper) => paper.status === 'reading'),
    done: papers.find((paper) => paper.status === 'done'),
  }

  const activeTarget = useMemo(() => nutritionTargets[dayType] ?? nutritionTargets.default, [dayType, nutritionTargets])

  const nutritionProgress = useMemo(() => {
    const consumed = todayMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        proteinG: acc.proteinG + meal.protein_g,
        carbsG: acc.carbsG + meal.carbs_g,
        fatsG: acc.fatsG + meal.fats_g,
      }),
      {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatsG: 0,
      },
    )

    const remaining = {
      calories: Math.max(0, activeTarget.calories - consumed.calories),
      proteinG: Math.max(0, activeTarget.proteinG - consumed.proteinG),
      carbsG: Math.max(0, activeTarget.carbsG - consumed.carbsG),
      fatsG: Math.max(0, activeTarget.fatsG - consumed.fatsG),
    }

    return { consumed, remaining }
  }, [nutritionTargets, todayMeals])

  const macroBars = useMemo(
    () => [
      {
        key: 'protein',
        label: 'Protein',
        consumed: nutritionProgress.consumed.proteinG,
        remaining: nutritionProgress.remaining.proteinG,
        target: activeTarget.proteinG,
        colorClass: 'bg-[#7FA5D8]',
      },
      {
        key: 'carbs',
        label: 'Carbs',
        consumed: nutritionProgress.consumed.carbsG,
        remaining: nutritionProgress.remaining.carbsG,
        target: activeTarget.carbsG,
        colorClass: 'bg-[#C8A37E]',
      },
      {
        key: 'fats',
        label: 'Fats',
        consumed: nutritionProgress.consumed.fatsG,
        remaining: nutritionProgress.remaining.fatsG,
        target: activeTarget.fatsG,
        colorClass: 'bg-[#7FCB92]',
      },
    ],
    [nutritionProgress, activeTarget],
  )

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

  const onQuickImportMeals = async () => {
    try {
      const parsed = parseQuickMealInput(importInput)
      if (parsed.length === 0) {
        setImportStatus('No valid rows found. Use JSON array or CSV with meal fields.')
        return
      }

      await saveImportedMeals(
        parsed.map((row) => ({
          date: today,
          name: row.name,
          portionLabel: row.portionLabel,
          calories: row.calories,
          proteinG: row.proteinG,
          fatsG: row.fatsG,
          carbsG: row.carbsG,
          source: 'import' as const,
        })),
      )

      const refreshed = await db.meals.where('date').equals(today).toArray()
      setTodayMeals(refreshed.map(toMealSchemaView))
      setImportStatus(`Imported ${parsed.length} meal${parsed.length === 1 ? '' : 's'}.`)
      setImportInput('')
      setImportOpen(false)
    } catch {
      setImportStatus('Could not parse input. Check JSON/CSV formatting.')
    }
  }

  return (
    <div className="h-full max-w-full overflow-x-hidden">
      <div className="grid gap-8 md:grid-cols-2 md:gap-10">
        <div className="md:col-span-2">
          <span className="page-label">Daily Allocation</span>
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
              <div className="space-y-2">
                <p className="text-sm text-tertiary">Rest day configured in weekly split.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-tertiary">Train as</span>
                  <select
                    className="inspo-field w-full max-w-[180px]"
                    value={overrideSelection}
                    onChange={(event) => setOverrideSelection(event.target.value as SessionType)}
                  >
                    {trainingOptions.map((option) => (
                      <option key={option} value={option}>
                        {toSessionTitle(option)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inspo-button-primary h-9 px-4"
                    onClick={() => {
                      setSessionOverride(today, overrideSelection)
                      ensureDayLog(today, overrideSelection)
                    }}
                  >
                    Apply override
                  </button>
                  {sessionOverrideType && (
                    <button
                      type="button"
                      className="inspo-button-ghost h-9 px-3 text-[11px]"
                      onClick={() => {
                        clearSessionOverride(today)
                        ensureDayLog(today, baseSessionType)
                      }}
                    >
                      Clear override
                    </button>
                  )}
                </div>
                {sessionOverrideType && (
                  <p className="text-xs text-success">
                    Current override: {toSessionTitle(sessionOverrideType)}
                  </p>
                )}
              </div>
            ) : (
              <>
                {progressiveHints.length > 0 && (
                  <div className="mb-3 text-xs text-success">
                    {progressiveHints
                      .map((hint) => `${hint?.name} ${hint?.diff > 0 ? '+' : ''}${hint?.diff}kg vs plan`)
                      .join(' · ')}
                  </div>
                )}
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
            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-[20px] font-normal text-white">Nutrition</h2>
              <div className="text-[13px] text-tertiary">
                {nutritionProgress.consumed.calories} / {activeTarget.calories} kcal · {sessionType === 'rest' ? 'Rest day targets' : 'Training day targets'}
              </div>
            </div>
            <div className="mb-4 rounded-input border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.05em] text-tertiary">Calories Left</p>
                <p className="text-sm text-white">{nutritionProgress.remaining.calories} kcal</p>
              </div>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/10">
                <span
                  className="bg-white/60"
                  style={{
                    width: `${activeTarget.calories > 0 ? Math.min(100, (nutritionProgress.consumed.calories / activeTarget.calories) * 100) : 0}%`,
                  }}
                />
                <span
                  className="bg-white/20"
                  style={{
                    width: `${activeTarget.calories > 0 ? Math.min(100, (nutritionProgress.remaining.calories / activeTarget.calories) * 100) : 0}%`,
                  }}
                />
              </div>

              <div className="mt-3 space-y-2">
                {macroBars.map((macro) => (
                  <div key={macro.key}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{macro.label}</span>
                      <span>
                        {macro.remaining}g left ({macro.consumed}/{macro.target}g)
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                      <span
                        className={macro.colorClass}
                        style={{ width: `${macro.target > 0 ? Math.min(100, (macro.consumed / macro.target) * 100) : 0}%` }}
                      />
                      <span
                        className="bg-white/15"
                        style={{ width: `${macro.target > 0 ? Math.min(100, (macro.remaining / macro.target) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {mealTemplates.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
                {mealTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="rounded-full border border-border bg-white/10 px-3 py-1 text-white transition hover:border-primary"
                    onClick={() => void applyMealTemplate(template)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 flex items-center gap-2">
              <button type="button" className="inspo-button-ghost h-9 px-4" onClick={() => setImportOpen((open) => !open)}>
                Quick Import JSON/CSV
              </button>
              {templateSaveStatus && <span className="text-xs text-success">{templateSaveStatus}</span>}
              {importStatus && <span className="text-xs text-tertiary">{importStatus}</span>}
            </div>

            {isImportOpen && (
              <div className="mb-3 rounded-input border border-border bg-surface p-3">
                <textarea
                  className="inspo-textarea h-24 w-full"
                  value={importInput}
                  onChange={(event) => setImportInput(event.target.value)}
                  placeholder={'JSON: [{"name":"Oats","portionLabel":"80g","calories":300,"proteinG":12,"fatsG":5,"carbsG":50}] or CSV: name,portion,calories,protein,fats,carbs'}
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" className="inspo-button-primary h-9 px-4" onClick={() => void onQuickImportMeals()}>
                    Import meals
                  </button>
                  <button type="button" className="inspo-button-ghost h-9 px-4" onClick={() => setImportOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {todayMeals.map((meal) => {
                const isEditing = editingMealId === meal.id
                if (isEditing && mealDraft) {
                  return (
                    <article key={meal.id} className="rounded-input border border-border bg-[rgba(255,255,255,0.04)] p-3">
                      <div className="space-y-2">
                        <input
                          className="inspo-field w-full"
                          value={mealDraft.name}
                          onChange={(event) => setMealDraft((draft) => (draft ? { ...draft, name: event.target.value } : draft))}
                        />
                        <input
                          className="inspo-field w-full"
                          value={mealDraft.portion_label}
                          onChange={(event) => setMealDraft((draft) => (draft ? { ...draft, portion_label: event.target.value } : draft))}
                          placeholder="Portion"
                        />
                        <div className="grid grid-cols-4 gap-2">
                          <input
                            className="inspo-field"
                            type="number"
                            min={0}
                            value={mealDraft.calories}
                            onChange={(event) =>
                              setMealDraft((draft) => (draft ? { ...draft, calories: Number(event.target.value) } : draft))
                            }
                            placeholder="Calories"
                          />
                          <input
                            className="inspo-field"
                            type="number"
                            min={0}
                            value={mealDraft.protein_g}
                            onChange={(event) =>
                              setMealDraft((draft) => (draft ? { ...draft, protein_g: Number(event.target.value) } : draft))
                            }
                            placeholder="Protein"
                          />
                          <input
                            className="inspo-field"
                            type="number"
                            min={0}
                            value={mealDraft.carbs_g}
                            onChange={(event) =>
                              setMealDraft((draft) => (draft ? { ...draft, carbs_g: Number(event.target.value) } : draft))
                            }
                            placeholder="Carbs"
                          />
                          <input
                            className="inspo-field"
                            type="number"
                            min={0}
                            value={mealDraft.fats_g}
                            onChange={(event) =>
                              setMealDraft((draft) => (draft ? { ...draft, fats_g: Number(event.target.value) } : draft))
                            }
                            placeholder="Fats"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="inspo-button-primary h-9 px-4" onClick={() => void saveMealEdit()}>
                            Save meal
                          </button>
                          <button type="button" className="inspo-button-ghost h-9 px-4" onClick={cancelMealEdit}>
                            Cancel
                          </button>
                        </div>
                        <button type="button" className="inspo-button-ghost h-8 px-3 text-[11px]" onClick={saveMealAsTemplate}>
                          Save as template
                        </button>
                      </div>
                    </article>
                  )
                }

                return (
                  <article
                    key={meal.id ?? `${meal.name}-${meal.updated_at}`}
                    className="rounded-input border border-white/5 bg-surface px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{meal.name}</p>
                        <p className="text-xs text-tertiary">{meal.portion_label || '-'}</p>
                      </div>
                      <p className="shrink-0 text-sm text-muted">{meal.calories} kcal</p>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted">
                      <p>P {meal.protein_g} g</p>
                      <p>C {meal.carbs_g} g</p>
                      <p>F {meal.fats_g} g</p>
                    </div>
                    <div className="mt-2 flex gap-2 text-[11px]">
                      <button type="button" className="inspo-button-ghost h-8 px-3" onClick={() => startMealEdit(meal)}>
                        Edit
                      </button>
                      {meal.id && (
                        <button type="button" className="inspo-button-ghost h-8 px-3" onClick={() => void deleteMealEntry(meal.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
              {todayMeals.length === 0 && <p className="py-2 text-sm text-tertiary">No meals logged yet.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}


