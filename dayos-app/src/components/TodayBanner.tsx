import { differenceInCalendarDays, format } from 'date-fns'
import { useMemo } from 'react'
import { computeCurrentStreak, computeDayStatuses } from '../lib/streak'
import { cardKeys, useTodayStore } from '../store/todayStore'
import { useUIStore } from '../store/uiStore'

const lines = [
  'Small wins compound into deep work.',
  'Track it today so tomorrow stays lighter.',
  'Consistency beats intensity on busy weeks.',
  'Make progress visible before noon.',
  'Focus on the next meaningful block.',
]

export function TodayBanner() {
  const completionByDate = useTodayStore((state) => state.completionByDate)
  const examMode = useUIStore((state) => state.examMode)
  const today = useMemo(() => new Date(), [])
  const dayIndex = today.getDay() + today.getMonth() + today.getDate()
  const line = lines[dayIndex % lines.length]

  const streak = useMemo(() => {
    const statuses = computeDayStatuses(
      Array.from({ length: 30 }).map((_, index) => {
        const date = new Date(today)
        date.setDate(today.getDate() - (29 - index))
        const key = date.toISOString().slice(0, 10)
        const map = completionByDate[key] ?? {}
        const hadChecklistActivity = cardKeys.every((card) => Boolean(map[card]))
        return { date: key, hadChecklistActivity }
      }),
    )
    return computeCurrentStreak(statuses)
  }, [completionByDate, today])

  const examCountdown = useMemo(() => {
    if (!examMode.active || !examMode.examDate) {
      return null
    }

    const days = differenceInCalendarDays(new Date(examMode.examDate), today)
    return days >= 0 ? `Exam in ${days} day${days === 1 ? '' : 's'}` : 'Exam completed'
  }, [examMode, today])

  return (
    <section className="mb-4 rounded-card border border-border bg-surface p-4 backdrop-blur-md">
      <p className="text-sm text-text">{format(today, 'EEEE, MMMM d')}</p>
      <p className="mt-1 text-xs text-tertiary">Streak: {streak} days</p>
      <p className="mt-2 text-sm text-muted">{line}</p>
      {examMode.active && (
        <span className="mt-3 inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs text-text">
          EXAM MODE {examCountdown ? `- ${examCountdown}` : ''}
        </span>
      )}
    </section>
  )
}
