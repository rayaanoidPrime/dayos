import Dexie, { type Table } from 'dexie'
import type {
  ExamModeConfig,
  Meal,
  ScratchNote,
  StudyBlock,
  SundayPlan,
  SyncQueueItem,
  WorkoutLog,
} from '../types/domain'

export class DayOSDatabase extends Dexie {
  workouts!: Table<WorkoutLog, string>
  meals!: Table<Meal, string>
  studyBlocks!: Table<StudyBlock, string>
  scratchNotes!: Table<ScratchNote, string>
  sundayPlans!: Table<SundayPlan, string>
  examModeConfig!: Table<ExamModeConfig, string>
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super('dayos-db')
    this.version(1).stores({
      workouts: 'id, date, sessionType, updatedAt',
      meals: 'id, name, source, updatedAt',
      studyBlocks: 'id, date, subject, updatedAt',
      scratchNotes: 'id, pinned, createdAt, updatedAt',
      sundayPlans: 'id, weekStartDate, updatedAt',
      examModeConfig: 'id, active, examDate, updatedAt',
      syncQueue: 'id, table, recordId, operation, updatedAt',
    })
    this.version(2).stores({
      workouts: 'id, date, sessionType, updatedAt',
      meals: 'id, date, name, source, updatedAt',
      studyBlocks: 'id, date, subject, updatedAt',
      scratchNotes: 'id, pinned, createdAt, updatedAt',
      sundayPlans: 'id, weekStartDate, updatedAt',
      examModeConfig: 'id, active, examDate, updatedAt',
      syncQueue: 'id, table, recordId, operation, updatedAt',
    })
  }
}

export const db = new DayOSDatabase()

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export async function upsertScratchNote(content: string, noteId?: string): Promise<ScratchNote> {
  const now = new Date().toISOString()
  const existing = noteId ? await db.scratchNotes.get(noteId) : undefined
  const note: ScratchNote = existing
    ? {
        ...existing,
        content,
        updatedAt: now,
      }
    : {
        id: randomId(),
        content,
        pinned: false,
        createdAt: now,
        promotedTo: null,
        updatedAt: now,
      }

  await db.scratchNotes.put(note)
  await queueRecordSync('scratchNotes', note.id!, 'upsert', note)
  return note
}

export async function setScratchNotePinned(noteId: string, pinned: boolean): Promise<void> {
  const note = await db.scratchNotes.get(noteId)
  if (!note) {
    return
  }

  const updated = { ...note, pinned, updatedAt: new Date().toISOString() }
  await db.scratchNotes.put(updated)
  await queueRecordSync('scratchNotes', noteId, 'upsert', updated)
}

export async function promoteScratchNote(noteId: string, target: 'task' | 'journal'): Promise<void> {
  const note = await db.scratchNotes.get(noteId)
  if (!note) {
    return
  }

  const updated = { ...note, promotedTo: target, updatedAt: new Date().toISOString() }
  await db.scratchNotes.put(updated)
  await queueRecordSync('scratchNotes', noteId, 'upsert', updated)
}

export async function saveImportedMeals(
  meals: Array<Omit<Meal, 'id' | 'updatedAt'>>,
): Promise<Array<Meal>> {
  const now = new Date().toISOString()
  const hydrated = meals.map((meal) => ({
    ...meal,
    id: randomId(),
    updatedAt: now,
  }))

  await db.meals.bulkPut(hydrated)
  for (const meal of hydrated) {
    await queueRecordSync('meals', meal.id!, 'upsert', meal)
  }

  return hydrated
}

export async function logMeal(meal: Omit<Meal, 'id' | 'updatedAt'>): Promise<Meal> {
  const now = new Date().toISOString()
  const record: Meal = {
    ...meal,
    id: randomId(),
    updatedAt: now,
  }

  await db.meals.put(record)
  await queueRecordSync('meals', record.id!, 'upsert', record)
  return record
}

export async function updateMeal(meal: Meal): Promise<void> {
  if (!meal.id) {
    throw new Error('Meal id is required for update')
  }

  const updated: Meal = {
    ...meal,
    updatedAt: new Date().toISOString(),
  }

  await db.meals.put(updated)
  await queueRecordSync('meals', meal.id, 'upsert', updated)
}

export async function deleteMeal(mealId: string): Promise<void> {
  await db.meals.delete(mealId)
  await queueRecordSync('meals', mealId, 'delete', {})
}

export async function upsertSundayPlan(plan: Omit<SundayPlan, 'id' | 'updatedAt'>): Promise<SundayPlan> {
  const existing = await db.sundayPlans.where('weekStartDate').equals(plan.weekStartDate).first()
  const record: SundayPlan = {
    ...plan,
    id: existing?.id ?? randomId(),
    updatedAt: new Date().toISOString(),
  }

  await db.sundayPlans.put(record)
  await queueRecordSync('sundayPlans', record.id!, 'upsert', record)
  return record
}

export async function queueRecordSync(
  table: string,
  recordId: string,
  operation: 'upsert' | 'delete',
  payload: unknown,
): Promise<void> {
  const entry: SyncQueueItem = {
    id: randomId(),
    table,
    recordId,
    operation,
    payload,
    updatedAt: new Date().toISOString(),
  }

  await db.syncQueue.put(entry)
}

export async function applyLastWriteWins<T extends { updatedAt: string }>(
  localRecord: T | undefined,
  remoteRecord: T,
): Promise<T> {
  if (!localRecord) {
    return remoteRecord
  }

  return new Date(remoteRecord.updatedAt).getTime() >= new Date(localRecord.updatedAt).getTime()
    ? remoteRecord
    : localRecord
}

