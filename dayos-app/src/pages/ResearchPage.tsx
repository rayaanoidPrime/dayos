import { useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { type PaperStatus, type TaskStatus, useResearchStore } from '../store/researchStore'

async function fetchArxivMetadata(arxivId: string): Promise<{ title: string; authors: string; abstract: string } | null> {
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`)
  if (!response.ok) {
    return null
  }

  const xmlText = await response.text()
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'text/xml')
  const title = xml.querySelector('entry > title')?.textContent?.trim()
  const abstract = xml.querySelector('entry > summary')?.textContent?.trim()
  const authors = Array.from(xml.querySelectorAll('entry > author > name'))
    .map((node) => node.textContent?.trim())
    .filter(Boolean)
    .join(', ')

  if (!title) {
    return null
  }

  return { title, authors, abstract: abstract ?? '' }
}

export function ResearchPage() {
  const projects = useResearchStore((state) => state.projects)
  const tasks = useResearchStore((state) => state.tasks)
  const papers = useResearchStore((state) => state.papers)
  const addTask = useResearchStore((state) => state.addTask)
  const moveTask = useResearchStore((state) => state.moveTask)
  const addPaper = useResearchStore((state) => state.addPaper)

  const activeProject = projects[0]

  const [taskTitle, setTaskTitle] = useState('')
  const [paperArxivId, setPaperArxivId] = useState('')
  const [paperStatus, setPaperStatus] = useState<PaperStatus>('to-read')
  const [paperTitle, setPaperTitle] = useState('')
  const [paperAuthors, setPaperAuthors] = useState('')
  const [paperAbstract, setPaperAbstract] = useState('')
  const [paperNotes, setPaperNotes] = useState('')
  const [autofillStatus, setAutofillStatus] = useState('')

  const taskColumns = useMemo(
    () => [
      { key: 'todo' as TaskStatus, label: 'To Do' },
      { key: 'in_progress' as TaskStatus, label: 'In Progress' },
      { key: 'done' as TaskStatus, label: 'Done' },
    ],
    [],
  )

  const onAddTask = () => {
    if (!taskTitle.trim() || !activeProject) {
      return
    }
    addTask({
      title: taskTitle.trim(),
      projectId: activeProject.id,
      status: 'todo',
    })
    setTaskTitle('')
  }

  const onAutofill = async () => {
    if (!paperArxivId.trim()) {
      return
    }
    setAutofillStatus('Fetching arXiv metadata...')
    try {
      const metadata = await fetchArxivMetadata(paperArxivId.trim())
      if (!metadata) {
        setAutofillStatus('No metadata found. You can enter details manually.')
        return
      }
      setPaperTitle(metadata.title)
      setPaperAuthors(metadata.authors)
      setPaperAbstract(metadata.abstract)
      setAutofillStatus('Autofill complete.')
    } catch {
      setAutofillStatus('Autofill unavailable offline. Enter details manually.')
    }
  }

  const onAddPaper = () => {
    if (!activeProject || !paperTitle.trim()) {
      return
    }
    addPaper({
      projectId: activeProject.id,
      arxivId: paperArxivId.trim(),
      title: paperTitle.trim(),
      authors: paperAuthors.trim(),
      abstract: paperAbstract.trim(),
      status: paperStatus,
      notes: paperNotes.trim(),
    })
    setPaperArxivId('')
    setPaperTitle('')
    setPaperAuthors('')
    setPaperAbstract('')
    setPaperNotes('')
    setAutofillStatus('')
  }

  return (
    <div className="space-y-3">
      <Card title={activeProject ? activeProject.name : 'Projects'}>
        <p className="text-sm text-text">{activeProject?.description}</p>
      </Card>

      <Card title="Kanban Tasks">
        <div className="flex gap-2">
          <input
            className="h-10 flex-1 rounded-input border border-border px-3 text-sm"
            placeholder="Task title"
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
          />
          <button type="button" className="h-10 rounded-full bg-primary px-4 text-sm font-semibold text-white" onClick={onAddTask}>
            Add
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {taskColumns.map((column) => (
            <div key={column.key} className="rounded-input border border-border p-2">
              <p className="mb-2 text-xs font-semibold text-text">{column.label}</p>
              <ul className="space-y-2">
                {tasks
                  .filter((task) => task.status === column.key)
                  .map((task) => (
                    <li key={task.id} className="rounded border border-border bg-surface p-2 text-xs text-text">
                      <p>{task.title}</p>
                      <div className="mt-1 flex gap-1">
                        {taskColumns
                          .filter((item) => item.key !== task.status)
                          .map((target) => (
                            <button
                              key={target.key}
                              type="button"
                              className="rounded border border-border px-1 py-0.5 text-[10px]"
                              onClick={() => moveTask(task.id, target.key)}
                            >
                              {target.label}
                            </button>
                          ))}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Paper Reading Log">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className="h-10 flex-1 rounded-input border border-border px-3 text-sm"
              placeholder="arXiv ID"
              value={paperArxivId}
              onChange={(event) => setPaperArxivId(event.target.value)}
            />
            <button type="button" className="h-10 rounded-full border border-border px-4 text-xs font-semibold" onClick={() => void onAutofill()}>
              Autofill
            </button>
          </div>
          <input
            className="h-10 w-full rounded-input border border-border px-3 text-sm"
            placeholder="Title"
            value={paperTitle}
            onChange={(event) => setPaperTitle(event.target.value)}
          />
          <input
            className="h-10 w-full rounded-input border border-border px-3 text-sm"
            placeholder="Authors"
            value={paperAuthors}
            onChange={(event) => setPaperAuthors(event.target.value)}
          />
          <textarea
            className="h-24 w-full rounded-input border border-border p-3 text-sm"
            placeholder="Abstract"
            value={paperAbstract}
            onChange={(event) => setPaperAbstract(event.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="h-10 rounded-input border border-border px-3 text-sm"
              value={paperStatus}
              onChange={(event) => setPaperStatus(event.target.value as PaperStatus)}
            >
              <option value="to-read">To Read</option>
              <option value="reading">Reading</option>
              <option value="done">Done</option>
            </select>
            <input
              className="h-10 flex-1 rounded-input border border-border px-3 text-sm"
              placeholder="Notes"
              value={paperNotes}
              onChange={(event) => setPaperNotes(event.target.value)}
            />
          </div>
          <button type="button" className="h-10 w-full rounded-full bg-primary text-sm font-semibold text-white" onClick={onAddPaper}>
            Add paper
          </button>
          {autofillStatus && <p className="text-xs text-muted">{autofillStatus}</p>}
        </div>
        <ul className="mt-3 space-y-2">
          {papers.map((paper) => (
            <li key={paper.id} className="rounded-input border border-border p-2 text-sm text-text">
              <p className="font-semibold">{paper.title}</p>
              <p className="text-xs text-muted">
                {paper.arxivId || 'Manual'} | {paper.status}
              </p>
            </li>
          ))}
          {papers.length === 0 && <li className="text-sm text-muted">No papers logged yet.</li>}
        </ul>
      </Card>
    </div>
  )
}

