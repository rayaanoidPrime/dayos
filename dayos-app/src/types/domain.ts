export type SessionType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'cardio' | 'rest'

export type Exercise = {
  name: string
  plannedSets: number
  plannedReps: number
  weightKg?: number
  loggedSets: Array<{ reps: number; weightKg?: number }>
}

export type WorkoutLog = {
  id?: string
  date: string
  sessionType: SessionType
  exercises: Exercise[]
  durationMins: number
  notes?: string
  completed: boolean
  updatedAt: string
}

export type Meal = {
  id?: string
  name: string
  portionLabel: string
  proteinG: number
  fatsG: number
  carbsG: number
  calories: number
  source: 'manual' | 'import'
  updatedAt: string
}

export type ScratchNote = {
  id?: string
  content: string
  pinned: boolean
  createdAt: string
  promotedTo: 'task' | 'journal' | null
  updatedAt: string
}

export type StudyBlock = {
  id?: string
  date: string
  subject: string
  topic?: string
  targetMins: number
  pomodorosDone: number
  completed: boolean
  pausedAt?: string
  updatedAt: string
}

export type SundayPlan = {
  id?: string
  weekStartDate: string
  workoutIntentions: string
  studyIntentions: string
  researchIntentions: string
  weeklyGoal: string
  updatedAt: string
}

export type ExamModeConfig = {
  id?: string
  active: boolean
  examTitle: string
  examDate: string
  hiddenModules: string[]
  updatedAt: string
}

export type SyncQueueItem = {
  id?: string
  table: string
  recordId: string
  operation: 'upsert' | 'delete'
  payload: unknown
  updatedAt: string
}

