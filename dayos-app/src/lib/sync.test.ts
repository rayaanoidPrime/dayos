import { describe, expect, it } from 'vitest'
import { toRemoteSyncItem } from './sync'

describe('toRemoteSyncItem', () => {
  it('maps meals payload and table to snake_case with user ownership', () => {
    const result = toRemoteSyncItem(
      'meals',
      {
        id: 'meal-1',
        date: '2026-03-06',
        name: 'Oats',
        portionLabel: '1 bowl',
        proteinG: 20,
        fatsG: 7,
        carbsG: 45,
        calories: 320,
        source: 'manual',
        updatedAt: '2026-03-06T00:00:00.000Z',
      },
      'user-123',
    )

    expect(result.table).toBe('meals')
    expect(result.payload).toMatchObject({
      portion_label: '1 bowl',
      protein_g: 20,
      fats_g: 7,
      carbs_g: 45,
      updated_at: '2026-03-06T00:00:00.000Z',
      user_id: 'user-123',
    })
  })

  it('maps studyBlocks table name to study_blocks', () => {
    const result = toRemoteSyncItem(
      'studyBlocks',
      {
        id: 'sb-1',
        date: '2026-03-06',
        subject: 'ME256',
        targetMins: 50,
        pomodorosDone: 1,
        completed: false,
        updatedAt: '2026-03-06T00:00:00.000Z',
      },
      'user-123',
    )

    expect(result.table).toBe('study_blocks')
    expect(result.payload).toMatchObject({
      target_mins: 50,
      pomodoros_done: 1,
      user_id: 'user-123',
    })
  })
})
