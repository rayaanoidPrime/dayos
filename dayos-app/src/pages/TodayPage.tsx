import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { TodayBanner } from '../components/TodayBanner'
import { db, saveImportedMeals } from '../lib/db'
import { parseNutritionMarkdownTable, type ParsedMealRow } from '../lib/nutritionParser'
import type { Meal } from '../types/domain'
import { useScheduleStore } from '../store/scheduleStore'
import { cardKeys, type TodayCardKey, useTodayStore } from '../store/todayStore'
import { useUIStore } from '../store/uiStore'

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
        <Card title="Workout & Fitness" rightLabel="Push Day" {...cardProps('workout')}>
          <ul className="space-y-2 text-sm text-text">
            <li className="rounded-input border border-border px-3 py-2">Bench Press - 4 x 8 - 70kg</li>
            <li className="rounded-input border border-border px-3 py-2">Incline Dumbbell Press - 3 x 10</li>
          </ul>
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
          <p className="text-sm text-text">ME256 controls revision - 2 pomodoros complete</p>
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
          <textarea className="h-24 w-full rounded-input border border-border p-3 text-sm" placeholder="Highlight of the day..." />
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
