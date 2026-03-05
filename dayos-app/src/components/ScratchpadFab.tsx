import { useEffect, useMemo, useState } from 'react'
import { db, upsertScratchNote } from '../lib/db'
import type { ScratchNote } from '../types/domain'

export function ScratchpadFab() {
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [isHistoryOpen, setHistoryOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [notes, setNotes] = useState<ScratchNote[]>([])

  useEffect(() => {
    if (!isHistoryOpen) {
      return
    }

    void db.scratchNotes
      .orderBy('createdAt')
      .reverse()
      .toArray()
      .then(setNotes)
  }, [isHistoryOpen])

  const hasContent = draft.trim().length > 0

  const debouncedDraft = useMemo(() => draft, [draft])

  useEffect(() => {
    if (!isEditorOpen || !debouncedDraft.trim()) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void upsertScratchNote(debouncedDraft.trim())
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [debouncedDraft, isEditorOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditorOpen(true)
          setHistoryOpen(false)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          setHistoryOpen(true)
          setEditorOpen(false)
        }}
        className="fixed bottom-20 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg"
        aria-label="Open scratchpad"
      >
        +
      </button>

      {isEditorOpen && (
        <div className="fixed inset-0 z-30 bg-black/40" role="dialog" aria-modal="true">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white p-4">
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
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Scratch Notes</h2>
              <button type="button" className="text-sm text-muted" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-card border border-border bg-surface p-3 text-sm text-text">
                  {note.content}
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

