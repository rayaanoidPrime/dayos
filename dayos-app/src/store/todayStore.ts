import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const cardKeys = ['workout', 'nutrition', 'study', 'research', 'journal'] as const
export type TodayCardKey = (typeof cardKeys)[number]

type NutritionTargets = {
  calories: number
  proteinG: number
  fatsG: number
  carbsG: number
}

export type NutritionDayType = 'default' | 'training' | 'rest'

type NutritionTargetsByType = {
  default: NutritionTargets
  training?: NutritionTargets
  rest?: NutritionTargets
}

export type MealTemplate = {
  id: string
  name: string
  portionLabel: string
  calories: number
  proteinG: number
  fatsG: number
  carbsG: number
}

type DayCardState = Partial<Record<TodayCardKey, boolean>>

type TodayState = {
  collapsedByDate: Record<string, DayCardState>
  completionByDate: Record<string, DayCardState>
  waterMlByDate: Record<string, number>
  nutritionTargets: NutritionTargetsByType
  mealTemplates: MealTemplate[]
  setCardCollapsed: (date: string, key: TodayCardKey, collapsed: boolean) => void
  toggleCardComplete: (date: string, key: TodayCardKey) => void
  addWater: (date: string, delta: number) => void
  resetWater: (date: string) => void
  addMealTemplate: (template: Omit<MealTemplate, 'id'>) => void
  setNutritionTargets: (type: NutritionDayType, targets: NutritionTargets) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useTodayStore = create<TodayState>()(
  persist(
    (set) => ({
      collapsedByDate: {},
      completionByDate: {},
      waterMlByDate: {},
      nutritionTargets: {
        default: {
          calories: 2200,
          proteinG: 140,
          fatsG: 70,
          carbsG: 250,
        },
      },
      mealTemplates: [],
      setCardCollapsed: (date, key, collapsed) =>
        set((state) => ({
          collapsedByDate: {
            ...state.collapsedByDate,
            [date]: {
              ...(state.collapsedByDate[date] ?? {}),
              [key]: collapsed,
            },
          },
        })),
      toggleCardComplete: (date, key) =>
        set((state) => ({
          completionByDate: {
            ...state.completionByDate,
            [date]: {
              ...(state.completionByDate[date] ?? {}),
              [key]: !(state.completionByDate[date]?.[key] ?? false),
            },
          },
        })),
      addWater: (date, delta) =>
        set((state) => ({
          waterMlByDate: {
            ...state.waterMlByDate,
            [date]: Math.max(0, (state.waterMlByDate[date] ?? 0) + delta),
          },
        })),
      resetWater: (date) =>
        set((state) => ({
          waterMlByDate: {
            ...state.waterMlByDate,
            [date]: 0,
          },
        })),
      addMealTemplate: (template) =>
        set((state) => {
          const exists = state.mealTemplates.some(
            (item) => item.name.toLowerCase() === template.name.toLowerCase() && item.portionLabel === template.portionLabel,
          )
          if (exists) {
            return state
          }

          return {
            mealTemplates: [{ ...template, id: randomId() }, ...state.mealTemplates].slice(0, 20),
          }
        }),
      setNutritionTargets: (type, targets) =>
        set((state) => ({
          nutritionTargets: {
            ...state.nutritionTargets,
            [type]: {
              calories: Math.max(0, Math.round(targets.calories)),
              proteinG: Math.max(0, Math.round(targets.proteinG)),
              fatsG: Math.max(0, Math.round(targets.fatsG)),
              carbsG: Math.max(0, Math.round(targets.carbsG)),
            },
          },
        })),
    }),
    {
      name: 'dayos-today-state',
    },
  ),
)
