import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { db } from '../lib/db'
import type { ScratchNote, SundayPlan } from '../types/domain'

export function StatsPage() {
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState<ScratchNote[]>([])
  const [plans, setPlans] = useState<SundayPlan[]>([])

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

  return (
    <div>
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
    </div>
  )
}

