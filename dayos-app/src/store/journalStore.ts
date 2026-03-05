import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type JournalMode = 'prompted' | 'free'

export type JournalEntry = {
  date: string
  mode: JournalMode
  highlight: string
  blockers: string
  topPriorityTomorrow: string
  freeText: string
  weeklyHighlight: string
  weeklyImprove: string
  updatedAt: string
}

type JournalState = {
  entriesByDate: Record<string, JournalEntry>
  setJournalMode: (date: string, mode: JournalMode) => void
  updateEntry: (date: string, patch: Partial<Omit<JournalEntry, 'date' | 'updatedAt'>>) => void
}

const createDefaultEntry = (date: string): JournalEntry => ({
  date,
  mode: 'prompted',
  highlight: '',
  blockers: '',
  topPriorityTomorrow: '',
  freeText: '',
  weeklyHighlight: '',
  weeklyImprove: '',
  updatedAt: new Date().toISOString(),
})

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entriesByDate: {},
      setJournalMode: (date, mode) => {
        const current = get().entriesByDate[date] ?? createDefaultEntry(date)
        set((state) => ({
          entriesByDate: {
            ...state.entriesByDate,
            [date]: {
              ...current,
              mode,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },
      updateEntry: (date, patch) => {
        const current = get().entriesByDate[date] ?? createDefaultEntry(date)
        set((state) => ({
          entriesByDate: {
            ...state.entriesByDate,
            [date]: {
              ...current,
              ...patch,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },
    }),
    { name: 'dayos-journal-state' },
  ),
)
