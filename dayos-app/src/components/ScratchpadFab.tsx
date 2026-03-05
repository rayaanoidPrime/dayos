import { useEffect, useMemo, useState } from 'react'
import { db, promoteScratchNote, setScratchNotePinned, upsertScratchNote } from '../lib/db'
import type { ScratchNote } from '../types/domain'

export function ScratchpadFab() {
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [isHistoryOpen, setHistoryOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState<ScratchNote[]>([])

  const loadNotes = async () => {
    const list = await db.scratchNotes
      .toArray()
      .then((rows) =>
        rows.sort((a, b) => {
          if (a.pinned !== b.pinned) {
            return a.pinned ? -1 : 1
          }
          return b.createdAt.localeCompare(a.createdAt)
        }),
      )
    setNotes(list)
  }

  useEffect(() => {
    if (!isHistoryOpen) {
      return
    }
    void loadNotes()
  }, [isHistoryOpen])

  const hasContent = draft.trim().length > 0

  const debouncedDraft = useMemo(() => draft, [draft])

  useEffect(() => {
    if (!isEditorOpen || !debouncedDraft.trim()) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void upsertScratchNote(debouncedDraft.trim(), activeNoteId).then((note) => {
        setActiveNoteId(note.id)
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [activeNoteId, debouncedDraft, isEditorOpen])

  const handlePinToggle = async (note: ScratchNote) => {
    if (!note.id) {
      return
    }
    await setScratchNotePinned(note.id, !note.pinned)
    await loadNotes()
  }

  const handlePromote = async (note: ScratchNote, target: 'task' | 'journal') => {
    if (!note.id) {
      return
    }
    await promoteScratchNote(note.id, target)
    await loadNotes()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditorOpen(true)
          setHistoryOpen(false)
          setActiveNoteId(undefined)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          setHistoryOpen(true)
          setEditorOpen(false)
        }}
        className="fixed bottom-20 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-bg shadow-lg"
        aria-label="Open scratchpad"
      >
        ✦
      </button>

      {isEditorOpen && (
        <div className="fixed inset-0 z-30 bg-black/40" role="dialog" aria-modal="true">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-border bg-bg p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Quick Scratchpad</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setEditorOpen(false)}>
                Close
              </button>
            </div>
            <textarea
              className="h-36 w-full rounded-input border border-border p-3 outline-none focus:border-primary"
              placeholder="Capture thoughts, references, or reminders..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <p className="mt-2 text-xs text-muted">Autosaves every 500ms while typing.</p>
            {hasContent && <p className="text-xs text-success">Draft queued for offline sync.</p>}
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-30 bg-black/40" role="dialog" aria-modal="true">
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-border bg-bg p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Scratch Notes</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-card border border-border bg-surface p-3 text-sm text-text">
                  <p>{note.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-0.5 text-xs"
                      onClick={() => void handlePinToggle(note)}
                    >
                      {note.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-0.5 text-xs"
                      onClick={() => void handlePromote(note, 'task')}
                    >
                      Promote to Task
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-0.5 text-xs"
                      onClick={() => void handlePromote(note, 'journal')}
                    >
                      Promote to Journal
                    </button>
                  </div>
                </li>
              ))}
              {notes.length === 0 && <li className="text-sm text-muted">No scratch notes yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

