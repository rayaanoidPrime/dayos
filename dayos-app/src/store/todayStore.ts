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

type WeeklyGoalThresholds = {
  study: number
  research: number
  workout: number
  nutrition: number
}

type WeeklyReminderSettings = {
  enabled: boolean
  inApp: boolean
  push: boolean
  hour24: number
  lastPushSentAt?: string
}

type DayCardState = Partial<Record<TodayCardKey, boolean>>

type TodayState = {
  collapsedByDate: Record<string, DayCardState>
  completionByDate: Record<string, DayCardState>
  waterMlByDate: Record<string, number>
  nutritionTargets: NutritionTargetsByType
  mealTemplates: MealTemplate[]
  weeklyGoalThresholds: WeeklyGoalThresholds
  weeklyReminderSettings: WeeklyReminderSettings
  setCardCollapsed: (date: string, key: TodayCardKey, collapsed: boolean) => void
  toggleCardComplete: (date: string, key: TodayCardKey) => void
  addWater: (date: string, delta: number) => void
  resetWater: (date: string) => void
  addMealTemplate: (template: Omit<MealTemplate, 'id'>) => void
  setNutritionTargets: (type: NutritionDayType, targets: NutritionTargets) => void
  setWeeklyGoalThreshold: (key: keyof WeeklyGoalThresholds, value: number) => void
  setWeeklyReminderSettings: (payload: Partial<Omit<WeeklyReminderSettings, 'lastPushSentAt'>>) => void
  markWeeklyReminderSent: (timestamp: string) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const defaultNutritionTargets: NutritionTargets = {
  calories: 2200,
  proteinG: 140,
  fatsG: 70,
  carbsG: 250,
}

const normalizeTarget = (input: unknown): NutritionTargets => {
  const source = input as Partial<NutritionTargets> | undefined
  const calories = typeof source?.calories === 'number' ? source.calories : Number.NaN
  const proteinG = typeof source?.proteinG === 'number' ? source.proteinG : Number.NaN
  const fatsG = typeof source?.fatsG === 'number' ? source.fatsG : Number.NaN
  const carbsG = typeof source?.carbsG === 'number' ? source.carbsG : Number.NaN
  return {
    calories: Number.isFinite(calories) ? Math.max(0, Math.round(calories)) : defaultNutritionTargets.calories,
    proteinG: Number.isFinite(proteinG) ? Math.max(0, Math.round(proteinG)) : defaultNutritionTargets.proteinG,
    fatsG: Number.isFinite(fatsG) ? Math.max(0, Math.round(fatsG)) : defaultNutritionTargets.fatsG,
    carbsG: Number.isFinite(carbsG) ? Math.max(0, Math.round(carbsG)) : defaultNutritionTargets.carbsG,
  }
}

const normalizeNutritionTargets = (input: unknown): NutritionTargetsByType => {
  if (!input || typeof input !== 'object') {
    return { default: { ...defaultNutritionTargets } }
  }

  const raw = input as Record<string, unknown>
  if ('default' in raw) {
    const typed = raw as { default?: unknown; training?: unknown; rest?: unknown }
    return {
      default: normalizeTarget(typed.default),
      training: typed.training ? normalizeTarget(typed.training) : undefined,
      rest: typed.rest ? normalizeTarget(typed.rest) : undefined,
    }
  }

  return {
    default: normalizeTarget(raw),
  }
}

const defaultReminderSettings: WeeklyReminderSettings = {
  enabled: false,
  inApp: true,
  push: false,
  hour24: 19,
}

const normalizeReminderSettings = (input: unknown): WeeklyReminderSettings => {
  if (!input || typeof input !== 'object') {
    return { ...defaultReminderSettings }
  }
  const raw = input as Partial<WeeklyReminderSettings>
  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : defaultReminderSettings.enabled,
    inApp: typeof raw.inApp === 'boolean' ? raw.inApp : defaultReminderSettings.inApp,
    push: typeof raw.push === 'boolean' ? raw.push : defaultReminderSettings.push,
    hour24:
      typeof raw.hour24 === 'number' && Number.isFinite(raw.hour24)
        ? Math.max(0, Math.min(23, Math.round(raw.hour24)))
        : defaultReminderSettings.hour24,
    lastPushSentAt: typeof raw.lastPushSentAt === 'string' ? raw.lastPushSentAt : undefined,
  }
}

export const useTodayStore = create<TodayState>()(
  persist(
    (set) => ({
      collapsedByDate: {},
      completionByDate: {},
      waterMlByDate: {},
      nutritionTargets: {
        default: { ...defaultNutritionTargets },
      },
      mealTemplates: [],
      weeklyGoalThresholds: {
        study: 5,
        research: 4,
        workout: 4,
        nutrition: 6,
      },
      weeklyReminderSettings: { ...defaultReminderSettings },
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
      setWeeklyGoalThreshold: (key, value) =>
        set((state) => ({
          weeklyGoalThresholds: {
            ...state.weeklyGoalThresholds,
            [key]: Math.max(0, Math.min(7, Math.round(value))),
          },
        })),
      setWeeklyReminderSettings: (payload) =>
        set((state) => ({
          weeklyReminderSettings: normalizeReminderSettings({
            ...state.weeklyReminderSettings,
            ...payload,
          }),
        })),
      markWeeklyReminderSent: (timestamp) =>
        set((state) => ({
          weeklyReminderSettings: {
            ...state.weeklyReminderSettings,
            lastPushSentAt: timestamp,
          },
        })),
    }),
    {
      name: 'dayos-today-state',
      merge: (persistedState, currentState) => {
        const incoming = (persistedState as Partial<TodayState> | undefined) ?? {}
        return {
          ...currentState,
          ...incoming,
          nutritionTargets: normalizeNutritionTargets(incoming.nutritionTargets ?? currentState.nutritionTargets),
          weeklyReminderSettings: normalizeReminderSettings(
            incoming.weeklyReminderSettings ?? currentState.weeklyReminderSettings,
          ),
        }
      },
    },
  ),
)
