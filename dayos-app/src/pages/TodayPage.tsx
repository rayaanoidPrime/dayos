import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { TodayBanner } from '../components/TodayBanner'
import { parseNutritionMarkdownTable } from '../lib/nutritionParser'
import { useUIStore } from '../store/uiStore'

const mandatoryKeys = ['workout', 'nutrition', 'study', 'research', 'journal']

export function TodayPage() {
  const examMode = useUIStore((state) => state.examMode)
  const sundayPlan = useUIStore((state) => state.sundayPlan)
  const [mdInput, setMdInput] = useState('')

  const importedRows = useMemo(() => parseNutritionMarkdownTable(mdInput), [mdInput])

  const visibleCards = mandatoryKeys.filter((key) => !(examMode.active && examMode.hiddenModules.includes(key)))

  return (
    <div>
      <TodayBanner />

      {sundayPlan && (
        <Card title="This Week's Intentions">
          <p className="text-sm text-text">Workout: {sundayPlan.workoutIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Study: {sundayPlan.studyIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Research: {sundayPlan.researchIntentions || 'Not set'}</p>
          <p className="text-sm text-text">Theme: {sundayPlan.weeklyGoal || 'Not set'}</p>
        </Card>
      )}

      {visibleCards.includes('workout') && (
        <Card title="Workout & Fitness" rightLabel="Push Day">
          <ul className="space-y-2 text-sm text-text">
            <li className="rounded-input border border-border px-3 py-2">Bench Press · 4 x 8 · 70kg</li>
            <li className="rounded-input border border-border px-3 py-2">Incline Dumbbell Press · 3 x 10</li>
          </ul>
        </Card>
      )}

      {visibleCards.includes('nutrition') && (
        <Card title="Macro & Nutrition" rightLabel="Markdown import ready">
          <textarea
            value={mdInput}
            onChange={(event) => setMdInput(event.target.value)}
            className="h-28 w-full rounded-input border border-border p-3 text-sm outline-none focus:border-primary"
            placeholder="Paste markdown table (Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g))"
          />
          <p className="mt-2 text-xs text-muted">
            Parsed rows: {importedRows.rows.length} · Warnings: {importedRows.warnings.length}
          </p>
        </Card>
      )}

      {visibleCards.includes('study') && (
        <Card title="Study Sessions" rightLabel="Pomodoro 25/5">
          <p className="text-sm text-text">ME256 controls revision · 2 pomodoros complete</p>
        </Card>
      )}

      {visibleCards.includes('research') && (
        <Card title="Research Progress" rightLabel="In Progress tasks">
          <p className="text-sm text-text">Draft literature review methods section</p>
        </Card>
      )}

      {visibleCards.includes('journal') && (
        <Card title="Journal & Reflection">
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

