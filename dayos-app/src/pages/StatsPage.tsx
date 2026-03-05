import { endOfWeek, format, startOfWeek } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { db } from '../lib/db'
import { computeCurrentStreak, computeDayStatuses } from '../lib/streak'
import type { Meal, ScratchNote, SundayPlan } from '../types/domain'
import { useJournalStore } from '../store/journalStore'
import { useResearchStore } from '../store/researchStore'
import { useStudyStore } from '../store/studyStore'
import { cardKeys, useTodayStore } from '../store/todayStore'
import { useWorkoutStore } from '../store/workoutStore'

function getCurrentWeekBounds() {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  return {
    weekStartKey: format(weekStart, 'yyyy-MM-dd'),
    weekEndKey: format(weekEnd, 'yyyy-MM-dd'),
  }
}

export function StatsPage() {
  const [search, setSearch] = useState('')
  const [journalSearch, setJournalSearch] = useState('')
  const [notes, setNotes] = useState<ScratchNote[]>([])
  const [plans, setPlans] = useState<SundayPlan[]>([])
  const [weekMeals, setWeekMeals] = useState<Meal[]>([])

  const completionByDate = useTodayStore((state) => state.completionByDate)
  const waterMlByDate = useTodayStore((state) => state.waterMlByDate)
  const entriesByDate = useJournalStore((state) => state.entriesByDate)
  const workoutLogsByDate = useWorkoutStore((state) => state.logsByDate)
  const studyByDate = useStudyStore((state) => state.byDate)
  const projects = useResearchStore((state) => state.projects)
  const tasks = useResearchStore((state) => state.tasks)

  useEffect(() => {
    void db.scratchNotes.toArray().then((rows) => {
      setNotes(
        rows.sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1
          }
          return b.createdAt.localeCompare(a.createdAt)
        }),
      )
    })

    void db.sundayPlans.orderBy('weekStartDate').reverse().toArray().then(setPlans)

    const { weekStartKey, weekEndKey } = getCurrentWeekBounds()
    void db.meals.where('date').between(weekStartKey, weekEndKey, true, true).toArray().then(setWeekMeals)
  }, [])

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return notes
    }
    return notes.filter((note) => note.content.toLowerCase().includes(query))
  }, [notes, search])

  const { streak, recentStatuses, heatmapStatuses } = useMemo(() => {
    const statuses = computeDayStatuses(
      Array.from({ length: 28 }).map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (27 - index))
        const key = date.toISOString().slice(0, 10)
        const map = completionByDate[key] ?? {}
        const hadChecklistActivity = cardKeys.every((card) => Boolean(map[card]))
        return { date: key, hadChecklistActivity }
      }),
    )
    return {
      streak: computeCurrentStreak(statuses),
      recentStatuses: statuses.slice(-7).reverse(),
      heatmapStatuses: statuses,
    }
  }, [completionByDate])

  const filteredJournal = useMemo(() => {
    const entries = Object.values(entriesByDate).sort((a, b) => b.date.localeCompare(a.date))
    const query = journalSearch.trim().toLowerCase()
    if (!query) {
      return entries
    }
    return entries.filter((entry) =>
      [entry.highlight, entry.blockers, entry.topPriorityTomorrow, entry.freeText].join(' ').toLowerCase().includes(query),
    )
  }, [entriesByDate, journalSearch])

  const weeklySummary = useMemo(() => {
    const { weekStartKey, weekEndKey } = getCurrentWeekBounds()
    const isCurrentWeekDate = (key: string) => key >= weekStartKey && key <= weekEndKey

    const weeklyWorkoutLogs = Object.entries(workoutLogsByDate)
      .filter(([date]) => isCurrentWeekDate(date))
      .map(([, log]) => log)

    const weeklyWorkoutVolumeKg = weeklyWorkoutLogs.reduce(
      (total, log) =>
        total +
        log.exercises.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal +
            exercise.loggedSets.reduce((setTotal, setItem) => setTotal + (setItem.weightKg ?? exercise.weightKg ?? 0) * setItem.reps, 0),
          0,
        ),
      0,
    )

    const workoutSessionsWithActivity = weeklyWorkoutLogs.filter((log) =>
      log.exercises.some((exercise) => exercise.loggedSets.length > 0),
    ).length

    const weeklyStudyBlocks = Object.entries(studyByDate)
      .filter(([date]) => isCurrentWeekDate(date))
      .flatMap(([, day]) => day.blocks)
    const weeklyPomodoros = weeklyStudyBlocks.reduce((total, block) => total + block.pomodorosDone, 0)
    const weeklyFocusMins = weeklyPomodoros * 25

    const weeklyWaterEntries = Object.entries(waterMlByDate).filter(([date]) => isCurrentWeekDate(date))
    const weeklyWaterAvgMl =
      weeklyWaterEntries.length > 0
        ? Math.round(weeklyWaterEntries.reduce((sum, [, value]) => sum + value, 0) / weeklyWaterEntries.length)
        : 0

    const weeklyCalories = weekMeals.reduce((sum, meal) => sum + meal.calories, 0)

    const projectCompletion = projects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id)
      const done = projectTasks.filter((task) => task.status === 'done').length
      const rate = projectTasks.length > 0 ? Math.round((done / projectTasks.length) * 100) : 0
      return {
        id: project.id,
        name: project.name,
        done,
        total: projectTasks.length,
        rate,
      }
    })

    const weeklyJournalCount = Object.keys(entriesByDate).filter((date) => isCurrentWeekDate(date)).length

    return {
      weeklyWorkoutVolumeKg,
      workoutSessionsWithActivity,
      weeklyPomodoros,
      weeklyFocusMins,
      weeklyWaterAvgMl,
      weeklyCalories,
      projectCompletion,
      weeklyJournalCount,
      weekStartKey,
      weekEndKey,
    }
  }, [entriesByDate, projects, studyByDate, tasks, waterMlByDate, weekMeals, workoutLogsByDate])

  return (
    <div>
      <Card title="Streaks & Missed Days">
        <p className="text-sm text-text">Current streak: {streak} day(s)</p>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {recentStatuses.map((item) => (
            <li key={item.date}>
              {item.date}: {item.status}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Missed-Day Heatmap (4 weeks)">
        <div className="grid grid-cols-7 gap-1">
          {heatmapStatuses.map((item) => (
            <div
              key={item.date}
              title={`${item.date}: ${item.status}`}
              className={`h-6 rounded ${item.status === 'complete' ? 'bg-success/30' : 'bg-warning/30'}`}
            />
          ))}
        </div>
      </Card>

      <Card title="Weekly Summary">
        <p className="text-xs text-muted">
          {weeklySummary.weekStartKey} to {weeklySummary.weekEndKey}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-text">
          <li>Workout volume: {weeklySummary.weeklyWorkoutVolumeKg} kg-reps</li>
          <li>Workout sessions with activity: {weeklySummary.workoutSessionsWithActivity}</li>
          <li>Study focus: {weeklySummary.weeklyFocusMins} mins ({weeklySummary.weeklyPomodoros} pomodoros)</li>
          <li>Average daily water: {weeklySummary.weeklyWaterAvgMl} ml</li>
          <li>Total logged calories: {weeklySummary.weeklyCalories}</li>
          <li>Journal entries this week: {weeklySummary.weeklyJournalCount}</li>
        </ul>
      </Card>

      <Card title="Research Completion Rates">
        <ul className="space-y-2">
          {weeklySummary.projectCompletion.map((project) => (
            <li key={project.id} className="rounded-input border border-border p-2 text-sm text-text">
              <p className="font-semibold">{project.name}</p>
              <p className="text-xs text-muted">
                Done {project.done}/{project.total} ({project.rate}%)
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-primary" style={{ width: `${project.rate}%` }} />
              </div>
            </li>
          ))}
          {weeklySummary.projectCompletion.length === 0 && <li className="text-sm text-muted">No projects yet.</li>}
        </ul>
      </Card>

      <Card title="Notes">
        <input
          className="h-10 w-full rounded-input border border-border px-3 text-sm"
          placeholder="Search notes by keyword"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="mt-2 space-y-2">
          {filteredNotes.map((note) => (
            <li key={note.id} className="rounded-input border border-border p-2 text-sm text-text">
              <p>{note.content}</p>
              <p className="mt-1 text-xs text-muted">
                {note.pinned ? 'Pinned' : 'Unpinned'} | Promoted: {note.promotedTo ?? 'none'}
              </p>
            </li>
          ))}
          {filteredNotes.length === 0 && <li className="text-sm text-muted">No notes found.</li>}
        </ul>
      </Card>

      <Card title="Sunday Plan Archive">
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-input border border-border p-2 text-sm text-text">
              <p className="font-semibold">Week of {plan.weekStartDate}</p>
              <p>Workout: {plan.workoutIntentions}</p>
              <p>Study: {plan.studyIntentions}</p>
              <p>Research: {plan.researchIntentions}</p>
              <p>Theme: {plan.weeklyGoal}</p>
            </li>
          ))}
          {plans.length === 0 && <li className="text-sm text-muted">No Sunday plans saved yet.</li>}
        </ul>
      </Card>

      <Card title="Journal Search">
        <input
          className="h-10 w-full rounded-input border border-border px-3 text-sm"
          placeholder="Search journal entries"
          value={journalSearch}
          onChange={(event) => setJournalSearch(event.target.value)}
        />
        <ul className="mt-2 space-y-2">
          {filteredJournal.map((entry) => (
            <li key={entry.date} className="rounded-input border border-border p-2 text-sm text-text">
              <p className="font-semibold">{entry.date}</p>
              {entry.mode === 'prompted' && (
                <>
                  <p className="text-xs text-muted">Highlight: {entry.highlight || '-'}</p>
                  <p className="text-xs text-muted">Blockers: {entry.blockers || '-'}</p>
                  <p className="text-xs text-muted">Priority: {entry.topPriorityTomorrow || '-'}</p>
                </>
              )}
              <p className="mt-1 text-xs text-muted">{entry.freeText || '-'}</p>
            </li>
          ))}
          {filteredJournal.length === 0 && <li className="text-sm text-muted">No journal entries found.</li>}
        </ul>
      </Card>
    </div>
  )
}
