import { create } from 'zustand'

type SundayPlanPreview = {
  workoutIntentions: string
  studyIntentions: string
  researchIntentions: string
  weeklyGoal: string
}

type UIState = {
  streak: number
  examMode: {
    active: boolean
    examTitle: string
    examDate: string
    hiddenModules: string[]
  }
  sundayPlan?: SundayPlanPreview
  setExamMode: (active: boolean, examTitle?: string, examDate?: string) => void
  setSundayPlan: (plan: SundayPlanPreview) => void
}

export const useUIStore = create<UIState>((set) => ({
  streak: 0,
  examMode: {
    active: false,
    examTitle: '',
    examDate: '',
    hiddenModules: ['workout', 'nutrition'],
  },
  sundayPlan: undefined,
  setExamMode: (active, examTitle = '', examDate = '') =>
    set((state) => ({
      examMode: {
        ...state.examMode,
        active,
        examTitle,
        examDate,
      },
    })),
  setSundayPlan: (plan) => set({ sundayPlan: plan }),
}))

