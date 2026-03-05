export type DayActivity = {
  date: string
  hadChecklistActivity: boolean
}

export type DayStatus = {
  date: string
  status: 'complete' | 'missed'
}

export function computeDayStatuses(days: DayActivity[]): DayStatus[] {
  return days
    .map<DayStatus>((day) => ({
      date: day.date,
      status: day.hadChecklistActivity ? 'complete' : 'missed',
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function computeCurrentStreak(statuses: DayStatus[]): number {
  let streak = 0

  for (let i = statuses.length - 1; i >= 0; i -= 1) {
    if (statuses[i].status === 'complete') {
      streak += 1
      continue
    }

    break
  }

  return streak
}
