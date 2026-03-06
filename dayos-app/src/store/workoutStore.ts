import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionType } from '../types/domain'

type LoggedSet = {
  reps: number
  weightKg?: number
}

export type WorkoutExercise = {
  name: string
  plannedSets: number
  plannedReps: number
  weightKg?: number
  loggedSets: LoggedSet[]
}

export type WorkoutTemplateExercise = {
  id: string
  name: string
  plannedSets: number
  plannedReps: number
  weightKg?: number
}

export type WorkoutTemplate = {
  id: string
  name: string
  exercises: WorkoutTemplateExercise[]
  updatedAt: string
}

type WorkoutDayLog = {
  sessionType: SessionType
  exercises: WorkoutExercise[]
  durationMins: number
  restDayNote: string
  templateId?: string
  templateName?: string
}

type DayLogSeed = {
  templateId?: string
  templateName?: string
  exercises?: Array<{
    name: string
    plannedSets: number
    plannedReps: number
    weightKg?: number
  }>
}

type TemplateInputExercise = {
  name: string
  plannedSets: number
  plannedReps: number
  weightKg?: number
}

type TemplateInput = {
  name: string
  exercises: TemplateInputExercise[]
}

type WorkoutState = {
  weeklySplit: SessionType[]
  logsByDate: Record<string, WorkoutDayLog>
  templates: WorkoutTemplate[]
  ensureDayLog: (date: string, sessionType: SessionType, seed?: DayLogSeed) => void
  logActualSet: (date: string, exerciseIndex: number, reps: number, weightKg?: number) => void
  upsertLoggedSet: (date: string, exerciseIndex: number, setIndex: number, reps: number, weightKg?: number) => void
  setRestDayNote: (date: string, note: string) => void
  addTemplate: (payload: TemplateInput) => string
  updateTemplate: (templateId: string, payload: TemplateInput) => void
  deleteTemplate: (templateId: string) => void
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

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeDayExercises = (
  exercises: Array<{
    name: string
    plannedSets: number
    plannedReps: number
    weightKg?: number
  }>,
): WorkoutExercise[] =>
  exercises
    .filter((exercise) => exercise.name.trim().length > 0)
    .map((exercise) => ({
      name: exercise.name.trim(),
      plannedSets: Math.max(1, Math.round(exercise.plannedSets)),
      plannedReps: Math.max(1, Math.round(exercise.plannedReps)),
      weightKg: Number.isFinite(exercise.weightKg) ? exercise.weightKg : undefined,
      loggedSets: [],
    }))

const normalizeTemplateExercises = (exercises: TemplateInputExercise[]): WorkoutTemplateExercise[] =>
  exercises
    .filter((exercise) => exercise.name.trim().length > 0)
    .map((exercise) => ({
      id: randomId(),
      name: exercise.name.trim(),
      plannedSets: Math.max(1, Math.round(exercise.plannedSets)),
      plannedReps: Math.max(1, Math.round(exercise.plannedReps)),
      weightKg: Number.isFinite(exercise.weightKg) ? exercise.weightKg : undefined,
    }))

const buildLogFromSeed = (sessionType: SessionType, seed?: DayLogSeed): WorkoutDayLog => {
  const seededExercises =
    seed?.exercises && seed.exercises.length > 0
      ? normalizeDayExercises(seed.exercises)
      : defaultExercisesBySession[sessionType].map((exercise) => ({ ...exercise, loggedSets: [] }))

  return {
    sessionType,
    exercises: seededExercises,
    durationMins: 0,
    restDayNote: '',
    templateId: seed?.templateId,
    templateName: seed?.templateName,
  }
}

const isLogUntouched = (dayLog: WorkoutDayLog): boolean =>
  dayLog.exercises.every((exercise) => exercise.loggedSets.length === 0)

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      weeklySplit: ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'cardio'],
      logsByDate: {},
      templates: [],
      ensureDayLog: (date, sessionType, seed) => {
        const existing = get().logsByDate[date]
        if (existing) {
          if (!seed || !isLogUntouched(existing)) {
            return
          }

          if (existing.templateId === seed.templateId) {
            return
          }

          set((state) => ({
            logsByDate: {
              ...state.logsByDate,
              [date]: buildLogFromSeed(sessionType, seed),
            },
          }))
          return
        }

        set((state) => ({
          logsByDate: {
            ...state.logsByDate,
            [date]: buildLogFromSeed(sessionType, seed),
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
      upsertLoggedSet: (date, exerciseIndex, setIndex, reps, weightKg) =>
        set((state) => {
          const dayLog = state.logsByDate[date]
          if (!dayLog || !dayLog.exercises[exerciseIndex] || setIndex < 0) {
            return state
          }

          const exercises = dayLog.exercises.map((exercise, index) => {
            if (index !== exerciseIndex) {
              return exercise
            }

            const nextLoggedSets = [...exercise.loggedSets]
            if (setIndex >= nextLoggedSets.length) {
              nextLoggedSets.push({ reps, weightKg })
            } else {
              nextLoggedSets[setIndex] = { reps, weightKg }
            }

            return { ...exercise, loggedSets: nextLoggedSets }
          })

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
      addTemplate: (payload) => {
        const now = new Date().toISOString()
        const templateId = randomId()
        const template: WorkoutTemplate = {
          id: templateId,
          name: payload.name.trim(),
          exercises: normalizeTemplateExercises(payload.exercises),
          updatedAt: now,
        }

        set((state) => ({
          templates: [template, ...state.templates],
        }))

        return templateId
      },
      updateTemplate: (templateId, payload) =>
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === templateId
              ? {
                  ...template,
                  name: payload.name.trim(),
                  exercises: normalizeTemplateExercises(payload.exercises),
                  updatedAt: new Date().toISOString(),
                }
              : template,
          ),
        })),
      deleteTemplate: (templateId) =>
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== templateId),
        })),
    }),
    { name: 'dayos-workout-state' },
  ),
)
