import { db } from './db'
import { supabase } from './supabase'

type SyncResult = {
  processed: number
  failed: number
  reason?: string
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
