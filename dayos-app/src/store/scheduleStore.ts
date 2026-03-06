import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ClassMode = 'offline' | 'online'
export type EventCategory = 'deep' | 'thesis' | 'health' | 'workout' | 'deadline' | 'exam' | 'other'
export type EventRepeat = 'none' | 'weekly_until' | 'weekly_forever'

export type RecurringClass = {
  id: string
  course: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string
  mode: ClassMode
}

export type CalendarEvent = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  category: EventCategory
  repeat: EventRepeat
  repeatUntil?: string | null
  workoutTemplateId?: string
  notes?: string
}

export type CalendarEventInstance = {
  event: CalendarEvent
  date: string
  startTime: string
  endTime: string
}

type ScheduleState = {
  recurringClasses: RecurringClass[]
  events: CalendarEvent[]
  addRecurringClass: (payload: Omit<RecurringClass, 'id'>) => void
  addEvent: (payload: Omit<CalendarEvent, 'id'>) => void
  updateEvent: (eventId: string, payload: Omit<CalendarEvent, 'id'>) => void
  deleteEvent: (eventId: string) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const toUtcMidnight = (date: string): number => {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) {
    return Number.NaN
  }
  return Date.UTC(year, month - 1, day)
}

const addDays = (date: string, days: number): string => {
  const utc = toUtcMidnight(date)
  if (!Number.isFinite(utc)) {
    return date
  }
  return new Date(utc + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export const eventOccursOnDate = (event: CalendarEvent, date: string): boolean => {
  if (!event.date || !date || date < event.date) {
    return false
  }

  if (event.repeat === 'none') {
    return event.date === date
  }

  const startUtc = toUtcMidnight(event.date)
  const targetUtc = toUtcMidnight(date)
  if (!Number.isFinite(startUtc) || !Number.isFinite(targetUtc)) {
    return false
  }

  const dayDiff = Math.floor((targetUtc - startUtc) / (24 * 60 * 60 * 1000))
  if (dayDiff < 0 || dayDiff % 7 !== 0) {
    return false
  }

  if (event.repeat === 'weekly_until' && event.repeatUntil && date > event.repeatUntil) {
    return false
  }

  return true
}

export const getEventInstancesForDate = (events: CalendarEvent[], date: string): CalendarEventInstance[] =>
  events
    .filter((event) => eventOccursOnDate(event, date))
    .map((event) => ({
      event,
      date,
      startTime: event.startTime,
      endTime: event.endTime,
    }))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))

export const getEventInstancesForWeek = (events: CalendarEvent[], weekStartDate: string): CalendarEventInstance[] => {
  const instances: CalendarEventInstance[] = []
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStartDate, i)
    instances.push(...getEventInstancesForDate(events, date))
  }
  return instances.sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
}

export const findNextEventInstance = (
  events: CalendarEvent[],
  fromDate: string,
  fromTime = '00:00',
  lookaheadDays = 60,
): CalendarEventInstance | undefined => {
  for (let i = 0; i <= lookaheadDays; i += 1) {
    const date = addDays(fromDate, i)
    const dayItems = getEventInstancesForDate(events, date).filter(
      (item) => i > 0 || `${item.date}T${item.startTime}` >= `${fromDate}T${fromTime}`,
    )
    if (dayItems.length > 0) {
      return dayItems[0]
    }
  }
  return undefined
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      recurringClasses: [],
      events: [],
      addRecurringClass: (payload) =>
        set((state) => ({
          recurringClasses: [...state.recurringClasses, { ...payload, id: randomId() }],
        })),
      addEvent: (payload) =>
        set((state) => ({
          events: [...state.events, { ...payload, id: randomId() }],
        })),
      updateEvent: (eventId, payload) =>
        set((state) => ({
          events: state.events.map((event) => (event.id === eventId ? { ...payload, id: eventId } : event)),
        })),
      deleteEvent: (eventId) =>
        set((state) => ({
          events: state.events.filter((event) => event.id !== eventId),
        })),
    }),
    { name: 'dayos-schedule-state' },
  ),
)
