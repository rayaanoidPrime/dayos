import { db } from './db'
import { supabase } from './supabase'

type SyncResult = {
  processed: number
  failed: number
  reason?: string
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

export async function flushSyncQueue(): Promise<SyncResult> {
  if (!supabase) {
    return {
      processed: 0,
      failed: 0,
      reason: 'Supabase is not configured.',
    }
  }

  const pending = await db.syncQueue.orderBy('updatedAt').toArray()
  let processed = 0
  let failed = 0

  for (const item of pending) {
    try {
      if (!canSyncItem(item.table, item.payload)) {
        failed += 1
        continue
      }

      if (item.operation === 'upsert') {
        const { error } = await supabase.from(item.table).upsert(item.payload as never)
        if (error) {
          failed += 1
          continue
        }
      } else {
        const { error } = await supabase.from(item.table).delete().eq('id', item.recordId)
        if (error) {
          failed += 1
          continue
        }
      }

      if (item.id) {
        await db.syncQueue.delete(item.id)
      }
      processed += 1
    } catch {
      failed += 1
    }
  }

  return { processed, failed }
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
