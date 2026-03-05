import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { TodayBanner } from '../components/TodayBanner'
import { db, saveImportedMeals } from '../lib/db'
import { parseNutritionMarkdownTable, type ParsedMealRow } from '../lib/nutritionParser'
import type { Meal } from '../types/domain'
import { useJournalStore } from '../store/journalStore'
import { useScheduleStore } from '../store/scheduleStore'
import { useStudyStore } from '../store/studyStore'
import { cardKeys, type TodayCardKey, useTodayStore } from '../store/todayStore'
import { useUIStore } from '../store/uiStore'
import { useWorkoutStore } from '../store/workoutStore'

export function TodayPage() {
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])
  const examMode = useUIStore((state) => state.examMode)
  const sundayPlan = useUIStore((state) => state.sundayPlan)

  const [mdInput, setMdInput] = useState('')
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<ParsedMealRow[]>([])
  const [saveStatus, setSaveStatus] = useState('')

  const collapsedByDate = useTodayStore((state) => state.collapsedByDate)
  const completionByDate = useTodayStore((state) => state.completionByDate)
  const setCardCollapsed = useTodayStore((state) => state.setCardCollapsed)
  const toggleCardComplete = useTodayStore((state) => state.toggleCardComplete)
  const addMealTemplate = useTodayStore((state) => state.addMealTemplate)
  const mealTemplates = useTodayStore((state) => state.mealTemplates)
  const nutritionTargets = useTodayStore((state) => state.nutritionTargets)
  const waterMlByDate = useTodayStore((state) => state.waterMlByDate)
  const addWater = useTodayStore((state) => state.addWater)
  const resetWater = useTodayStore((state) => state.resetWater)
  const recurringClasses = useScheduleStore((state) => state.recurringClasses)
  const events = useScheduleStore((state) => state.events)
  const entriesByDate = useJournalStore((state) => state.entriesByDate)
  const setJournalMode = useJournalStore((state) => state.setJournalMode)
  const updateEntry = useJournalStore((state) => state.updateEntry)
  const weeklySplit = useWorkoutStore((state) => state.weeklySplit)
  const logsByDate = useWorkoutStore((state) => state.logsByDate)
  const ensureDayLog = useWorkoutStore((state) => state.ensureDayLog)
  const logActualSet = useWorkoutStore((state) => state.logActualSet)
  const setRestDayNote = useWorkoutStore((state) => state.setRestDayNote)
  const studyByDate = useStudyStore((state) => state.byDate)
  const ensureStudyDate = useStudyStore((state) => state.ensureDate)
  const addStudyBlock = useStudyStore((state) => state.addBlock)
  const incrementPomodoro = useStudyStore((state) => state.incrementPomodoro)

  const [setRepsInput, setSetRepsInput] = useState('8')
  const [setWeightInput, setSetWeightInput] = useState('0')
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null)
  const [newSubject, setNewSubject] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newTargetMins, setNewTargetMins] = useState('25')
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [isRunningTimer, setIsRunningTimer] = useState(false)
  const [remainingSecs, setRemainingSecs] = useState(25 * 60)

  const collapsed = collapsedByDate[today] ?? {}
  const complete = completionByDate[today] ?? {}

  const visibleCards = cardKeys.filter((key) => !(examMode.active && examMode.hiddenModules.includes(key)))
  const allVisibleComplete = visibleCards.length > 0 && visibleCards.every((key) => complete[key])

  useEffect(() => {
    const parsed = parseNutritionMarkdownTable(mdInput)
    setPreviewRows(parsed.rows)
    setImportWarnings(parsed.warnings)
  }, [mdInput])

  useEffect(() => {
    void db.meals.where('date').equals(today).toArray().then(setTodayMeals)
  }, [today])

  const totals = useMemo(
    () =>
      todayMeals.reduce(
        (sum, meal) => ({
          calories: sum.calories + meal.calories,
          proteinG: sum.proteinG + meal.proteinG,
          fatsG: sum.fatsG + meal.fatsG,
          carbsG: sum.carbsG + meal.carbsG,
        }),
        { calories: 0, proteinG: 0, fatsG: 0, carbsG: 0 },
      ),
    [todayMeals],
  )

  const waterMl = waterMlByDate[today] ?? 0
  const journalEntry = entriesByDate[today]
  const isSunday = new Date(`${today}T00:00:00`).getDay() === 0
  const dayIndexForSplit = (new Date().getDay() + 6) % 7
  const sessionType = weeklySplit[dayIndexForSplit] ?? 'rest'
  const workoutLog = logsByDate[today]
  const studyBlocks = studyByDate[today]?.blocks ?? []

  const progress = (value: number, goal: number) => (goal <= 0 ? 0 : Math.min(100, Math.round((value / goal) * 100)))

  const todayClasses = useMemo(
    () =>
      recurringClasses
        .filter((item) => item.dayOfWeek === ((new Date().getDay() + 6) % 7) + 1)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [recurringClasses],
  )

  const upcomingDeadlines = useMemo(() => {
    const now = new Date(`${today}T00:00:00`)
    const nextWeek = new Date(now)
    nextWeek.setDate(now.getDate() + 7)
    return events
      .filter((event) => {
        if (event.type !== 'deadline' && event.type !== 'exam') {
          return false
        }
        const eventDate = new Date(`${event.date}T00:00:00`)
        return eventDate >= now && eventDate <= nextWeek
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
  }, [events, today])

  const togglePreviewRow = (index: number) => {
    setPreviewRows((rows) => rows.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row)))
  }

  const refreshTodayMeals = async () => {
    const meals = await db.meals.where('date').equals(today).toArray()
    setTodayMeals(meals)
  }

  const saveSelectedMeals = async () => {
    const selected = previewRows.filter((row) => row.selected)
    if (selected.length === 0) {
      setSaveStatus('No selected rows to import.')
      return
    }

    await saveImportedMeals(
      selected.map((row) => ({
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

    setSaveStatus(`Imported ${selected.length} meal${selected.length === 1 ? '' : 's'}.`)
    setMdInput('')
    await refreshTodayMeals()
  }

  const logFromTemplate = async (templateId: string) => {
    const template = mealTemplates.find((item) => item.id === templateId)
    if (!template) {
      return
    }

    await saveImportedMeals([
      {
        date: today,
        name: template.name,
        portionLabel: template.portionLabel,
        calories: template.calories,
        proteinG: template.proteinG,
        fatsG: template.fatsG,
        carbsG: template.carbsG,
        source: 'manual',
      },
    ])

    await refreshTodayMeals()
  }

  const addTemplateFromRow = (index: number) => {
    const row = previewRows[index]
    if (!row) {
      return
    }

    addMealTemplate({
      name: row.name,
      portionLabel: row.portionLabel,
      calories: row.calories,
      proteinG: row.proteinG,
      fatsG: row.fatsG,
      carbsG: row.carbsG,
    })
  }

  const cardProps = (key: TodayCardKey) => ({
    completeable: true,
    completed: complete[key] ?? false,
    onToggleComplete: () => toggleCardComplete(today, key),
    collapsible: true,
    collapsed: collapsed[key] ?? false,
    onToggleCollapse: () => setCardCollapsed(today, key, !(collapsed[key] ?? false)),
  })

  const weeklyReviewSummary = useMemo(() => {
    const summary = {
      daysComplete: 0,
      cardCompletions: {
        workout: 0,
        nutrition: 0,
        study: 0,
        research: 0,
        journal: 0,
      },
    }

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(`${today}T00:00:00`)
      date.setDate(date.getDate() - i)
      const key = format(date, 'yyyy-MM-dd')
      const map = completionByDate[key] ?? {}
      const allDone = cardKeys.every((card) => Boolean(map[card]))
      if (allDone) {
        summary.daysComplete += 1
      }
      for (const card of cardKeys) {
        if (map[card]) {
          summary.cardCompletions[card] += 1
        }
      }
    }

    return summary
  }, [completionByDate, today])

  useEffect(() => {
    ensureDayLog(today, sessionType)
  }, [ensureDayLog, sessionType, today])

  useEffect(() => {
    ensureStudyDate(today)
  }, [ensureStudyDate, today])

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

  return (
    <div>
      <TodayBanner />

      {allVisibleComplete && (
        <Card title="Day complete!">
          <p className="text-sm text-success">All mandatory cards are checked off for {today}.</p>
        </Card>
      )}

      {upcomingDeadlines.length > 0 && (
        <Card title="Upcoming Deadlines (7 days)">
          <ul className="space-y-1 text-sm text-text">
            {upcomingDeadlines.map((event) => (
              <li key={event.id}>
                {event.date} {event.time} - {event.title}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sundayPlan && (
        <Card title="This Week's Intentions">
          <p className="text-sm text-text">Workout: {sundayPlan.workoutIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Study: {sundayPlan.studyIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Research: {sundayPlan.researchIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Theme: {sundayPlan.weeklyGoal || 'Not set'}</p>
        </Card>
      )}

      {visibleCards.includes('workout') && (
        <Card title="Workout & Fitness" rightLabel={sessionType.toUpperCase()} {...cardProps('workout')}>
          {workoutLog?.sessionType === 'rest' ? (
            <div className="rounded-input border border-border p-3">
              <p className="text-sm text-text">Rest day. Capture recovery notes.</p>
              <textarea
                className="mt-2 h-20 w-full rounded-input border border-border p-2 text-sm"
                placeholder="Mobility, sleep, soreness..."
                value={workoutLog.restDayNote}
                onChange={(event) => setRestDayNote(today, event.target.value)}
              />
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-text">
              {workoutLog?.exercises.map((exercise, index) => (
                <li key={`${exercise.name}-${index}`} className="rounded-input border border-border px-3 py-2">
                  <p>
                    {exercise.name} - {exercise.plannedSets} x {exercise.plannedReps}
                    {exercise.weightKg ? ` - ${exercise.weightKg}kg` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">Logged sets: {exercise.loggedSets.length}</p>
                  <button
                    type="button"
                    className="mt-2 rounded border border-border px-2 py-1 text-xs"
                    onClick={() => setActiveExerciseIndex(activeExerciseIndex === index ? null : index)}
                  >
                    Log actual set
                  </button>
                  {activeExerciseIndex === index && (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="h-8 w-20 rounded-input border border-border px-2 text-xs"
                        value={setRepsInput}
                        onChange={(event) => setSetRepsInput(event.target.value)}
                        placeholder="Reps"
                      />
                      <input
                        className="h-8 w-20 rounded-input border border-border px-2 text-xs"
                        value={setWeightInput}
                        onChange={(event) => setSetWeightInput(event.target.value)}
                        placeholder="Kg"
                      />
                      <button
                        type="button"
                        className="h-8 rounded border border-border px-2 text-xs"
                        onClick={() => {
                          const reps = Number(setRepsInput)
                          const weight = Number(setWeightInput)
                          if (!Number.isFinite(reps) || reps <= 0) {
                            return
                          }
                          logActualSet(today, index, reps, Number.isFinite(weight) && weight > 0 ? weight : undefined)
                          setActiveExerciseIndex(null)
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {visibleCards.includes('nutrition') && (
        <Card title="Macro & Nutrition" rightLabel="Markdown import ready" {...cardProps('nutrition')}>
          <div className="mb-3 space-y-2 text-xs text-muted">
            <p>
              Calories: {totals.calories}/{nutritionTargets.calories} ({progress(totals.calories, nutritionTargets.calories)}%)
            </p>
            <p>
              Protein: {totals.proteinG}g/{nutritionTargets.proteinG}g
            </p>
            <p>
              Fats: {totals.fatsG}g/{nutritionTargets.fatsG}g
            </p>
            <p>
              Carbs: {totals.carbsG}g/{nutritionTargets.carbsG}g
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${progress(
                    totals.proteinG + totals.fatsG + totals.carbsG,
                    nutritionTargets.proteinG + nutritionTargets.fatsG + nutritionTargets.carbsG,
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mb-3 rounded-input border border-border p-3">
            <p className="text-xs font-semibold text-text">Water intake</p>
            <p className="mt-1 text-xs text-muted">{waterMl}ml / 3000ml</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => addWater(today, 200)}
              >
                +200ml
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => addWater(today, 500)}
              >
                +500ml
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1 text-xs"
                onClick={() => resetWater(today)}
              >
                Reset
              </button>
            </div>
          </div>

          {mealTemplates.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-xs font-semibold text-text">Meal templates</p>
              <div className="flex flex-wrap gap-2">
                {mealTemplates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    className="rounded-full border border-border px-3 py-1 text-xs"
                    onClick={() => void logFromTemplate(template.id)}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={mdInput}
            onChange={(event) => setMdInput(event.target.value)}
            className="h-28 w-full rounded-input border border-border p-3 text-sm outline-none focus:border-primary"
            placeholder="Paste markdown table (Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g))"
          />
          <p className="mt-2 text-xs text-muted">
            Parsed rows: {previewRows.length} - Warnings: {importWarnings.length}
          </p>

          {previewRows.length > 0 && (
            <ul className="mt-2 space-y-1">
              {previewRows.map((row, index) => (
                <li
                  key={`${row.name}-${index}`}
                  className="flex items-center gap-2 rounded-input border border-border px-2 py-1 text-xs"
                >
                  <input type="checkbox" checked={row.selected} onChange={() => togglePreviewRow(index)} />
                  <span className="flex-1">
                    {row.name} ({row.portionLabel || 'n/a'}) - {row.calories} kcal
                  </span>
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-0.5"
                    onClick={() => addTemplateFromRow(index)}
                  >
                    Template
                  </button>
                </li>
              ))}
            </ul>
          )}

          {importWarnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-warning">
              {importWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="mt-2 h-10 w-full rounded-full bg-primary px-4 text-sm font-semibold text-white"
            onClick={() => void saveSelectedMeals()}
          >
            Save selected rows
          </button>
          {saveStatus && <p className="mt-2 text-xs text-success">{saveStatus}</p>}
        </Card>
      )}

      {visibleCards.includes('study') && (
        <Card title="Study Sessions" rightLabel="Pomodoro 25/5" {...cardProps('study')}>
          <div className="mb-2 rounded-input border border-border p-2">
            <p className="text-xs font-semibold text-text">
              Timer: {Math.floor(remainingSecs / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(remainingSecs % 60).toString().padStart(2, '0')}
            </p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={async () => {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    await Notification.requestPermission()
                  }
                  setIsRunningTimer((running) => !running)
                }}
              >
                {isRunningTimer ? 'Pause' : 'Start'}
              </button>
              <button
                type="button"
                className="rounded border border-border px-2 py-1 text-xs"
                onClick={() => {
                  setIsRunningTimer(false)
                  setRemainingSecs(25 * 60)
                }}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="mb-2 space-y-2 rounded-input border border-border p-2">
            <p className="text-xs font-semibold text-text">Study blocks</p>
            {studyBlocks.map((block) => (
              <div key={block.id} className="rounded border border-border bg-surface p-2 text-xs">
                <p className="font-semibold text-text">{block.subject}</p>
                <p className="text-muted">{block.topic || 'No topic'}</p>
                <p className="text-muted">
                  Target {block.targetMins} min - Pomodoros {block.pomodorosDone}
                </p>
                <button
                  type="button"
                  className="mt-1 rounded border border-border px-2 py-1"
                  onClick={() => {
                    setActiveBlockId(block.id)
                    setRemainingSecs(25 * 60)
                    setIsRunningTimer(true)
                  }}
                >
                  Focus on this block
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <input
                className="h-8 flex-1 rounded-input border border-border px-2 text-xs"
                placeholder="Subject"
                value={newSubject}
                onChange={(event) => setNewSubject(event.target.value)}
              />
              <input
                className="h-8 flex-1 rounded-input border border-border px-2 text-xs"
                placeholder="Topic"
                value={newTopic}
                onChange={(event) => setNewTopic(event.target.value)}
              />
              <input
                className="h-8 w-20 rounded-input border border-border px-2 text-xs"
                placeholder="Mins"
                value={newTargetMins}
                onChange={(event) => setNewTargetMins(event.target.value)}
              />
              <button
                type="button"
                className="h-8 rounded border border-border px-2 text-xs"
                onClick={() => {
                  const mins = Number(newTargetMins)
                  if (!newSubject.trim() || !Number.isFinite(mins) || mins <= 0) {
                    return
                  }
                  addStudyBlock(today, newSubject.trim(), newTopic.trim(), mins)
                  setNewSubject('')
                  setNewTopic('')
                  setNewTargetMins('25')
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-2 rounded-input border border-border p-2">
            <p className="text-xs font-semibold text-text">Today's classes</p>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {todayClasses.map((item) => (
                <li key={item.id}>
                  {item.startTime}-{item.endTime} {item.course} ({item.room})
                </li>
              ))}
              {todayClasses.length === 0 && <li>No classes scheduled.</li>}
            </ul>
          </div>
        </Card>
      )}

      {visibleCards.includes('research') && (
        <Card title="Research Progress" rightLabel="In Progress tasks" {...cardProps('research')}>
          <p className="text-sm text-text">Draft literature review methods section</p>
        </Card>
      )}

      {visibleCards.includes('journal') && (
        <Card title="Journal & Reflection" {...cardProps('journal')}>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${journalEntry?.mode !== 'free' ? 'border-primary text-primary' : 'border-border'}`}
              onClick={() => setJournalMode(today, 'prompted')}
            >
              Prompted
            </button>
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${journalEntry?.mode === 'free' ? 'border-primary text-primary' : 'border-border'}`}
              onClick={() => setJournalMode(today, 'free')}
            >
              Free write
            </button>
          </div>
          {journalEntry?.mode === 'free' ? (
            <textarea
              className="h-24 w-full rounded-input border border-border p-3 text-sm"
              placeholder="Write freely..."
              value={journalEntry.freeText}
              onChange={(event) => updateEntry(today, { freeText: event.target.value })}
            />
          ) : (
            <div className="space-y-2">
              <input
                className="h-10 w-full rounded-input border border-border px-3 text-sm"
                placeholder="Highlight of the day"
                value={journalEntry?.highlight ?? ''}
                onChange={(event) => updateEntry(today, { highlight: event.target.value })}
              />
              <input
                className="h-10 w-full rounded-input border border-border px-3 text-sm"
                placeholder="What slowed me down"
                value={journalEntry?.blockers ?? ''}
                onChange={(event) => updateEntry(today, { blockers: event.target.value })}
              />
              <input
                className="h-10 w-full rounded-input border border-border px-3 text-sm"
                placeholder="Tomorrow's #1 priority"
                value={journalEntry?.topPriorityTomorrow ?? ''}
                onChange={(event) => updateEntry(today, { topPriorityTomorrow: event.target.value })}
              />
              <textarea
                className="h-24 w-full rounded-input border border-border p-3 text-sm"
                placeholder="Additional notes..."
                value={journalEntry?.freeText ?? ''}
                onChange={(event) => updateEntry(today, { freeText: event.target.value })}
              />

              {isSunday && (
                <div className="space-y-2 rounded-input border border-border p-3">
                  <p className="text-xs font-semibold text-text">Sunday Review</p>
                  <input
                    className="h-10 w-full rounded-input border border-border px-3 text-sm"
                    placeholder="Weekly highlight"
                    value={journalEntry?.weeklyHighlight ?? ''}
                    onChange={(event) => updateEntry(today, { weeklyHighlight: event.target.value })}
                  />
                  <input
                    className="h-10 w-full rounded-input border border-border px-3 text-sm"
                    placeholder="What I'd do differently"
                    value={journalEntry?.weeklyImprove ?? ''}
                    onChange={(event) => updateEntry(today, { weeklyImprove: event.target.value })}
                  />
                  <div className="rounded-input border border-border bg-surface p-2 text-xs text-muted">
                    <p>Completed days this week: {weeklyReviewSummary.daysComplete}/7</p>
                    <p>Workout checkmarks: {weeklyReviewSummary.cardCompletions.workout}</p>
                    <p>Nutrition checkmarks: {weeklyReviewSummary.cardCompletions.nutrition}</p>
                    <p>Study checkmarks: {weeklyReviewSummary.cardCompletions.study}</p>
                    <p>Research checkmarks: {weeklyReviewSummary.cardCompletions.research}</p>
                    <p>Journal checkmarks: {weeklyReviewSummary.cardCompletions.journal}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {visibleCards.length === 0 && (
        <Card title="Exam Mode">
          <p className="text-sm text-text">No cards available. Review Exam Mode settings.</p>
        </Card>
      )}
    </div>
  )
}
