import { describe, expect, it } from 'vitest'
import { computeCurrentStreak, computeDayStatuses } from './streak'

describe('streak utils', () => {
  it('marks inactive days as missed', () => {
    const statuses = computeDayStatuses([
      { date: '2026-03-01', hadChecklistActivity: true },
      { date: '2026-03-02', hadChecklistActivity: false },
    ])

    expect(statuses[1]).toEqual({ date: '2026-03-02', status: 'missed' })
  })

  it('breaks streak at first missed day from the end', () => {
    const streak = computeCurrentStreak([
      { date: '2026-03-01', status: 'complete' },
      { date: '2026-03-02', status: 'missed' },
      { date: '2026-03-03', status: 'complete' },
      { date: '2026-03-04', status: 'complete' },
    ])

    expect(streak).toBe(2)
  })

  it('returns zero when latest day is missed', () => {
    const streak = computeCurrentStreak([
      { date: '2026-03-04', status: 'complete' },
      { date: '2026-03-05', status: 'missed' },
    ])

    expect(streak).toBe(0)
  })
})
