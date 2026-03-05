import { db } from './db'
import { getSessionUserId, supabase } from './supabase'

type SyncResult = {
  processed: number
  failed: number
  reason?: string
  lastError?: string
}

const allowedTables = new Set([
  'workouts',
  'meals',
  'studyBlocks',
  'scratchNotes',
  'sundayPlans',
  'examModeConfig',
])

function canSyncItem(table: string, payload: unknown): boolean {
  if (!allowedTables.has(table)) {
    return false
  }
  if (payload === null || typeof payload !== 'object') {
    return false
  }
  return true
}

const tableMap: Record<string, string> = {
  workouts: 'workouts',
  meals: 'meals',
  studyBlocks: 'study_blocks',
  scratchNotes: 'scratch_notes',
  sundayPlans: 'sunday_plans',
  examModeConfig: 'exam_mode_config',
}

export function toRemoteSyncItem(
  table: string,
  payload: Record<string, unknown>,
  userId: string,
): { table: string; payload: Record<string, unknown> } {
  const remoteTable = tableMap[table] ?? table

  switch (table) {
    case 'workouts':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
          date: payload.date,
          session_type: payload.sessionType,
        exercises: payload.exercises,
        duration_mins: payload.durationMins,
        notes: payload.notes,
          completed: payload.completed,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    case 'meals':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
        date: payload.date,
        name: payload.name,
        portion_label: payload.portionLabel,
        protein_g: payload.proteinG,
        fats_g: payload.fatsG,
        carbs_g: payload.carbsG,
        calories: payload.calories,
        source: payload.source,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    case 'studyBlocks':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
        date: payload.date,
        subject: payload.subject,
        topic: payload.topic,
        target_mins: payload.targetMins,
        pomodoros_done: payload.pomodorosDone,
        completed: payload.completed,
        paused_at: payload.pausedAt,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    case 'scratchNotes':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
        content: payload.content,
        pinned: payload.pinned,
        promoted_to: payload.promotedTo,
        created_at: payload.createdAt,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    case 'sundayPlans':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
        week_start_date: payload.weekStartDate,
        workout_intentions: payload.workoutIntentions,
        study_intentions: payload.studyIntentions,
        research_intentions: payload.researchIntentions,
        weekly_goal: payload.weeklyGoal,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    case 'examModeConfig':
      return {
        table: remoteTable,
        payload: {
          id: payload.id,
        active: payload.active,
        exam_title: payload.examTitle,
        exam_date: payload.examDate || null,
          hidden_modules: payload.hiddenModules,
          updated_at: payload.updatedAt,
          user_id: userId,
        },
      }
    default:
      return { table: remoteTable, payload: { ...payload, user_id: userId } }
  }
}

export async function flushSyncQueue(): Promise<SyncResult> {
  if (!supabase) {
    return {
      processed: 0,
      failed: 0,
      reason: 'Supabase is not configured.',
    }
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return {
      processed: 0,
      failed: 0,
      reason: 'Not signed in.',
    }
  }

  const pending = await db.syncQueue.orderBy('updatedAt').toArray()
  let processed = 0
  let failed = 0
  let lastError: string | undefined

  for (const item of pending) {
    try {
      if (!canSyncItem(item.table, item.payload)) {
        failed += 1
        continue
      }

      const remoteItem = toRemoteSyncItem(item.table, item.payload as Record<string, unknown>, userId)
      if (item.operation === 'upsert') {
        const { error } = await supabase.from(remoteItem.table).upsert(remoteItem.payload as never)
        if (error) {
          failed += 1
          lastError = error.message
          continue
        }
      } else {
        const { error } = await supabase.from(remoteItem.table).delete().eq('id', item.recordId).eq('user_id', userId)
        if (error) {
          failed += 1
          lastError = error.message
          continue
        }
      }

      if (item.id) {
        await db.syncQueue.delete(item.id)
      }
      processed += 1
    } catch {
      failed += 1
      lastError = 'Unexpected sync error'
    }
  }

  return { processed, failed, lastError }
}

export function startAutoSync(options?: { intervalMs?: number; onSync?: (result: SyncResult) => void }): () => void {
  const intervalMs = options?.intervalMs ?? 30_000
  let disposed = false

  const run = async () => {
    if (disposed || typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }
    const result = await flushSyncQueue()
    options?.onSync?.(result)
  }

  const intervalId = window.setInterval(() => {
    void run()
  }, intervalMs)

  const onlineHandler = () => {
    void run()
  }
  window.addEventListener('online', onlineHandler)

  void run()

  return () => {
    disposed = true
    window.clearInterval(intervalId)
    window.removeEventListener('online', onlineHandler)
  }
}
