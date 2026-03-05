import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ClassMode = 'offline' | 'online'
type EventType = 'deadline' | 'exam' | 'other'

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
  time: string
  type: EventType
  notes?: string
}

type ScheduleState = {
  recurringClasses: RecurringClass[]
  events: CalendarEvent[]
  addRecurringClass: (payload: Omit<RecurringClass, 'id'>) => void
  addEvent: (payload: Omit<CalendarEvent, 'id'>) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

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
    }),
    { name: 'dayos-schedule-state' },
  ),
)
