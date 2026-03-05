import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionType } from '../types/domain'

type LoggedSet = { reps: number; weightKg?: number }
type WorkoutExercise = {
  name: string
  plannedSets: number
  plannedReps: number
  weightKg?: number
  loggedSets: LoggedSet[]
}

type WorkoutDayLog = {
  sessionType: SessionType
  exercises: WorkoutExercise[]
  durationMins: number
  restDayNote: string
}

type WorkoutState = {
  weeklySplit: SessionType[]
  logsByDate: Record<string, WorkoutDayLog>
  ensureDayLog: (date: string, sessionType: SessionType) => void
  logActualSet: (date: string, exerciseIndex: number, reps: number, weightKg?: number) => void
  setRestDayNote: (date: string, note: string) => void
}

const defaultExercisesBySession: Record<SessionType, WorkoutExercise[]> = {
  push: [
    { name: 'Bench Press', plannedSets: 4, plannedReps: 8, weightKg: 70, loggedSets: [] },
    { name: 'Incline DB Press', plannedSets: 3, plannedReps: 10, loggedSets: [] },
  ],
  pull: [
    { name: 'Pull-up', plannedSets: 4, plannedReps: 8, loggedSets: [] },
    { name: 'Barbell Row', plannedSets: 4, plannedReps: 8, weightKg: 60, loggedSets: [] },
  ],
  legs: [
    { name: 'Squat', plannedSets: 4, plannedReps: 6, weightKg: 90, loggedSets: [] },
    { name: 'Romanian Deadlift', plannedSets: 3, plannedReps: 8, weightKg: 80, loggedSets: [] },
  ],
  upper: [{ name: 'Upper Body Compound', plannedSets: 4, plannedReps: 8, loggedSets: [] }],
  lower: [{ name: 'Lower Body Compound', plannedSets: 4, plannedReps: 8, loggedSets: [] }],
  cardio: [{ name: 'Zone 2 Cardio', plannedSets: 1, plannedReps: 30, loggedSets: [] }],
  rest: [],
}

const createDefaultLog = (sessionType: SessionType): WorkoutDayLog => ({
  sessionType,
  exercises: defaultExercisesBySession[sessionType].map((exercise) => ({ ...exercise, loggedSets: [] })),
  durationMins: 0,
  restDayNote: '',
})

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      weeklySplit: ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'cardio'],
      logsByDate: {},
      ensureDayLog: (date, sessionType) => {
        if (get().logsByDate[date]) {
          return
        }
        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [date]: createDefaultLog(sessionType),
          },
        }))
      },
      logActualSet: (date, exerciseIndex, reps, weightKg) =>
        set((state) => {
          const dayLog = state.logsByDate[date]
          if (!dayLog || !dayLog.exercises[exerciseIndex]) {
            return state
          }

          const exercises = dayLog.exercises.map((exercise, index) =>
            index === exerciseIndex
              ? { ...exercise, loggedSets: [...exercise.loggedSets, { reps, weightKg }] }
              : exercise,
          )
          return {
            logsByDate: {
              ...state.logsByDate,
              [date]: { ...dayLog, exercises },
            },
          }
        }),
      setRestDayNote: (date, note) =>
        set((state) => {
          const dayLog = state.logsByDate[date]
          if (!dayLog) {
            return state
          }
          return {
            logsByDate: {
              ...state.logsByDate,
              [date]: { ...dayLog, restDayNote: note },
            },
          }
        }),
    }),
    { name: 'dayos-workout-state' },
  ),
)
