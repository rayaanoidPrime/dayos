import { afterEach, describe, expect, it } from 'vitest'
import { applyLastWriteWins, db, queueRecordSync, upsertScratchNote } from './db'

afterEach(async () => {
  await db.syncQueue.clear()
  await db.scratchNotes.clear()
})

describe('db utilities', () => {
  it('saves scratch notes and queues sync', async () => {
    const note = await upsertScratchNote('test note')
    const saved = await db.scratchNotes.get(note.id!)
    const queued = await db.syncQueue.toArray()

    expect(saved?.content).toBe('test note')
    expect(queued).toHaveLength(1)
    expect(queued[0]?.table).toBe('scratchNotes')
  })

  it('adds queue entries explicitly', async () => {
    await queueRecordSync('meals', 'abc', 'upsert', { foo: 'bar' })
    const queued = await db.syncQueue.toArray()
    expect(queued).toHaveLength(1)
    expect(queued[0]?.recordId).toBe('abc')
  })

  it('uses last-write-wins comparison', async () => {
    const local = { updatedAt: '2026-03-05T10:00:00.000Z', value: 'old' }
    const remote = { updatedAt: '2026-03-05T11:00:00.000Z', value: 'new' }
    const chosen = await applyLastWriteWins(local, remote)
    expect(chosen.value).toBe('new')
  })
})

