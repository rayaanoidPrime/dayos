import { useMemo, useState } from 'react'
import { type PaperStatus, useResearchStore } from '../store/researchStore'

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

const paperFilters: Array<{ key: 'all' | PaperStatus; label: string }> = [
  { key: 'all', label: 'All Papers' },
  { key: 'to-read', label: 'To Read' },
  { key: 'reading', label: 'Reading' },
  { key: 'done', label: 'Done' },
]

export function ResearchPage() {
  const projects = useResearchStore((state) => state.projects)
  const papers = useResearchStore((state) => state.papers)
  const ensurePrimaryProject = useResearchStore((state) => state.ensurePrimaryProject)
  const addPaper = useResearchStore((state) => state.addPaper)

  const activeProject = projects[0]

  const [activeFilter, setActiveFilter] = useState<'all' | PaperStatus>('all')
  const [isManualDrawerOpen, setManualDrawerOpen] = useState(false)
  const [paperArxivId, setPaperArxivId] = useState('')
  const [paperStatus, setPaperStatus] = useState<PaperStatus>('to-read')
  const [paperTitle, setPaperTitle] = useState('')
  const [paperAuthors, setPaperAuthors] = useState('')
  const [paperAbstract, setPaperAbstract] = useState('')
  const [paperNotes, setPaperNotes] = useState('')
  const [autofillStatus, setAutofillStatus] = useState('')

  const filteredPapers = useMemo(() => {
    if (activeFilter === 'all') {
      return papers
    }
    return papers.filter((paper) => paper.status === activeFilter)
  }, [activeFilter, papers])

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
    if (!paperTitle.trim()) {
      return
    }
    const projectId = activeProject?.id ?? ensurePrimaryProject()

    addPaper({
      projectId,
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
    setManualDrawerOpen(false)
  }

  return (
    <div>
      <header className="pb-1 pt-1">
        <button type="button" className="mb-6 flex items-center gap-2 text-[13px] text-tertiary">
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[2]">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Natural Law / Research
        </button>
        <h1 className="page-title">Paper Log</h1>
        <p className="page-subtitle">Syncing with ArXiv RSS</p>
      </header>

      <div className="mb-4 mt-4 flex items-center rounded-input border border-border bg-[var(--surface-strong)] p-1 pl-4">
        <input
          className="h-9 flex-1 border-none bg-transparent p-0 text-[15px] outline-none"
          placeholder="Paste arXiv ID..."
          value={paperArxivId}
          onChange={(event) => setPaperArxivId(event.target.value)}
        />
        <button type="button" className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-bg" onClick={() => void onAutofill()}>
          Import
        </button>
      </div>
      {autofillStatus && <p className="mb-4 text-xs text-tertiary">{autofillStatus}</p>}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {paperFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] ${
              activeFilter === filter.key
                ? 'border-white bg-white text-bg'
                : 'border-border bg-transparent text-muted'
            }`}
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="rounded-card border border-border bg-surface px-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-[72%] border-b border-border py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-tertiary">
                Paper
              </th>
              <th className="w-[28%] border-b border-border py-3 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-tertiary">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPapers.map((paper) => (
              <tr key={paper.id}>
                <td className="border-b border-border py-4 align-top">
                  <p className="mb-1 text-[15px] text-text">{paper.title}</p>
                  <p className="text-[11px] text-tertiary">{paper.authors || 'Unknown author'}</p>
                  <p className="mt-2 text-[13px] italic leading-[1.5] text-tertiary">{paper.notes || paper.abstract || '-'}</p>
                </td>
                <td className="border-b border-border py-4 text-right align-top">
                  <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.03em] text-muted">
                    {paper.status}
                  </span>
                </td>
              </tr>
            ))}
            {filteredPapers.length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-sm text-tertiary">
                  No papers for this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-6 flex items-center justify-between rounded-input border border-border bg-surface p-3">
        <div>
          <p className="text-sm text-text">Need manual paper entry?</p>
          <p className="text-xs text-tertiary">Use the drawer to keep this page clean.</p>
        </div>
        <button type="button" className="inspo-button-primary h-10 px-4" onClick={() => setManualDrawerOpen(true)}>
          Manual Entry
        </button>
      </section>

      {isManualDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/45" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setManualDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] border border-border bg-bg/95 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[18px] font-normal text-text">Manual Paper Entry</h2>
              <button type="button" className="text-sm text-tertiary" onClick={() => setManualDrawerOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-2">
              <input
                className="inspo-field w-full"
                placeholder="arXiv ID (optional)"
                value={paperArxivId}
                onChange={(event) => setPaperArxivId(event.target.value)}
              />
              <input
                className="inspo-field w-full"
                placeholder="Title"
                value={paperTitle}
                onChange={(event) => setPaperTitle(event.target.value)}
              />
              <input
                className="inspo-field w-full"
                placeholder="Authors"
                value={paperAuthors}
                onChange={(event) => setPaperAuthors(event.target.value)}
              />
              <textarea
                className="inspo-textarea h-24 w-full"
                placeholder="Abstract"
                value={paperAbstract}
                onChange={(event) => setPaperAbstract(event.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="inspo-field"
                  value={paperStatus}
                  onChange={(event) => setPaperStatus(event.target.value as PaperStatus)}
                >
                  <option value="to-read">To Read</option>
                  <option value="reading">Reading</option>
                  <option value="done">Done</option>
                </select>
                <input
                  className="inspo-field flex-1"
                  placeholder="Notes"
                  value={paperNotes}
                  onChange={(event) => setPaperNotes(event.target.value)}
                />
              </div>
              <button type="button" className="inspo-button-primary h-10 w-full" onClick={onAddPaper}>
                Add paper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
