import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { db } from '../lib/db'
import { computeCurrentStreak, computeDayStatuses } from '../lib/streak'
import type { ScratchNote, SundayPlan } from '../types/domain'
import { useJournalStore } from '../store/journalStore'
import { cardKeys, useTodayStore } from '../store/todayStore'

export function StatsPage() {
  const [search, setSearch] = useState('')
  const [journalSearch, setJournalSearch] = useState('')
  const [notes, setNotes] = useState<ScratchNote[]>([])
  const [plans, setPlans] = useState<SundayPlan[]>([])
  const completionByDate = useTodayStore((state) => state.completionByDate)
  const entriesByDate = useJournalStore((state) => state.entriesByDate)

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
  }, [])

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      return notes
    }
    return notes.filter((note) => note.content.toLowerCase().includes(query))
  }, [notes, search])

  const { streak, recentStatuses } = useMemo(() => {
    const statuses = computeDayStatuses(
      Array.from({ length: 14 }).map((_, index) => {
        const date = new Date()
        date.setDate(date.getDate() - (13 - index))
        const key = date.toISOString().slice(0, 10)
        const map = completionByDate[key] ?? {}
        const hadChecklistActivity = cardKeys.every((card) => Boolean(map[card]))
        return { date: key, hadChecklistActivity }
      }),
    )
    return {
      streak: computeCurrentStreak(statuses),
      recentStatuses: statuses.slice(-7).reverse(),
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

