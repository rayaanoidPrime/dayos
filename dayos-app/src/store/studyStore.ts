import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type StudyBlock = {
  id: string
  subject: string
  topic: string
  targetMins: number
  pomodorosDone: number
}

type StudyDayState = {
  blocks: StudyBlock[]
}

type StudyState = {
  byDate: Record<string, StudyDayState>
  ensureDate: (date: string) => void
  addBlock: (date: string, subject: string, topic: string, targetMins: number) => void
  incrementPomodoro: (date: string, blockId: string) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      byDate: {},
      ensureDate: (date) => {
        if (get().byDate[date]) {
          return
        }
        set((state) => ({
          byDate: {
            ...state.byDate,
            [date]: {
              blocks: [],
            },
          },
        }))
      },
      addBlock: (date, subject, topic, targetMins) =>
        set((state) => ({
          byDate: {
            ...state.byDate,
            [date]: {
              blocks: [
                ...(state.byDate[date]?.blocks ?? []),
                { id: randomId(), subject, topic, targetMins, pomodorosDone: 0 },
              ],
            },
          },
        })),
      incrementPomodoro: (date, blockId) =>
        set((state) => ({
          byDate: {
            ...state.byDate,
            [date]: {
              blocks: (state.byDate[date]?.blocks ?? []).map((block) =>
                block.id === blockId ? { ...block, pomodorosDone: block.pomodorosDone + 1 } : block,
              ),
            },
          },
        })),
    }),
    { name: 'dayos-study-state' },
  ),
)
