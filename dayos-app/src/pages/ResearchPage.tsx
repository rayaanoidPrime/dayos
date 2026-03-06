import { useMemo, useState, useEffect } from 'react'
import { type PaperStatus, useResearchStore } from '../store/researchStore'
import { exportProjectWorklogs, type ExportFormat } from '../lib/researchExport'

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
  const {
    projects,
    papers,
    worklogs,
    activeProjectId,
    setActiveProject,
    ensurePrimaryProject,
    addProject,
    addPaper,
    addWorklog,
  } = useResearchStore()

  useEffect(() => {
    ensurePrimaryProject()
  }, [ensurePrimaryProject])

  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null

  const [showWorklogScreen, setShowWorklogScreen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | PaperStatus>('all')
  const [isManualDrawerOpen, setManualDrawerOpen] = useState(false)
  const [isProjectDrawerOpen, setProjectDrawerOpen] = useState(false)
  const [isWorklogDrawerOpen, setWorklogDrawerOpen] = useState(false)
  const [isExportDrawerOpen, setExportDrawerOpen] = useState(false)

  // Project draft
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [projectColor, setProjectColor] = useState('#3A86FF')

  // Worklog draft
  const [worklogTitle, setWorklogTitle] = useState('')
  const [worklogSummary, setWorklogSummary] = useState('')
  const [worklogHours, setWorklogHours] = useState<number | ''>('')
  const [worklogOutputs, setWorklogOutputs] = useState('')

  // Paper draft
  const [paperArxivId, setPaperArxivId] = useState('')
  const [paperStatus, setPaperStatus] = useState<PaperStatus>('to-read')
  const [paperTitle, setPaperTitle] = useState('')
  const [paperAuthors, setPaperAuthors] = useState('')
  const [paperAbstract, setPaperAbstract] = useState('')
  const [paperNotes, setPaperNotes] = useState('')
  const [autofillStatus, setAutofillStatus] = useState('')

  const filteredPapers = useMemo(() => {
    let result = papers
    if (activeProjectId) {
      result = result.filter((paper) => paper.projectId === activeProjectId)
    }
    if (activeFilter !== 'all') {
      result = result.filter((paper) => paper.status === activeFilter)
    }
    return result
  }, [activeFilter, papers, activeProjectId])

  const activeProjectWorklogs = useMemo(() => {
    if (!activeProjectId) return []
    return worklogs
      .filter((w) => w.projectId === activeProjectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [worklogs, activeProjectId])

  const onAddProject = () => {
    if (!projectName.trim()) return
    addProject({
      name: projectName.trim(),
      description: projectDesc.trim(),
      colorTag: projectColor,
    })
    setProjectName('')
    setProjectDesc('')
    setProjectDrawerOpen(false)
  }

  const onAddWorklog = () => {
    if (!worklogTitle.trim() || !activeProjectId || typeof worklogHours !== 'number') return
    addWorklog({
      projectId: activeProjectId,
      date: new Date().toISOString().slice(0, 10),
      title: worklogTitle.trim(),
      summary: worklogSummary.trim(),
      hours: worklogHours,
      outputs: worklogOutputs.trim() || undefined,
    })
    setWorklogTitle('')
    setWorklogSummary('')
    setWorklogHours('')
    setWorklogOutputs('')
    setWorklogDrawerOpen(false)
  }

  const handleExport = (format: ExportFormat) => {
    if (!activeProject) return
    exportProjectWorklogs(activeProject, worklogs, format)
    setExportDrawerOpen(false)
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
    <div className="relative flex h-[calc(100vh-8rem)] w-full flex-col overflow-hidden font-sans">
      {/* --- HUB SCREEN --- */}
      <div 
        id="screen-hub" 
        className={`absolute inset-0 z-10 flex h-full w-full flex-col transition-transform duration-300 ${
          showWorklogScreen ? '-translate-x-1/4 opacity-50' : ''
        }`}
      >
        <div className="sticky top-0 z-20 bg-bg pb-2 pt-2">
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-3xl tracking-wide text-cream">Research</h1>
          </header>
          
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                activeProjectId === null ? 'bg-cream text-bg shadow-md shadow-black/20' : 'border-divider bg-surface text-creamMuted hover:text-cream'
              }`}
              onClick={() => setActiveProject(null)}
            >
              All Projects
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
                  activeProjectId === project.id
                    ? 'bg-cream text-bg shadow-md shadow-black/20'
                    : 'border-divider bg-surface text-creamMuted hover:text-cream'
                }`}
                onClick={() => setActiveProject(project.id)}
              >
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.colorTag }} />
                {project.name}
              </button>
            ))}
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-divider bg-transparent px-3.5 py-1.5 text-[13px] text-creamMuted transition-colors hover:text-cream"
              onClick={() => setProjectDrawerOpen(true)}
            >
              + New
            </button>
          </div>
        </div>

        {activeProject && (
          <div className="flex items-center justify-between border-b border-divider bg-surface/50 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeProject.colorTag }}></span>
              <span className="text-xs font-medium uppercase tracking-wide text-cream">{activeProject.name}</span>
            </div>
            <button onClick={() => setShowWorklogScreen(true)} className="flex items-center gap-1 text-xs text-sage transition-colors hover:text-cream">
              View Worklog <span className="text-lg leading-none">→</span>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-4 flex items-center justify-between px-2">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {paperFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] ${
                    activeFilter === filter.key
                      ? 'border-white bg-white text-bg'
                      : 'border-divider bg-transparent text-creamMuted hover:text-cream'
                  }`}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mb-2 ml-2 flex shrink-0 items-center justify-center rounded-full border border-border bg-white px-3.5 py-1.5 text-[13px] font-medium text-bg transition hover:bg-white/90"
              onClick={() => setManualDrawerOpen(true)}
            >
              Add Paper
            </button>
          </div>

          <div className="space-y-4 px-2">
            {filteredPapers.map((paper) => (
              <div key={paper.id} className="group rounded-xl border border-divider bg-surface p-5 transition-transform duration-100 active:scale-[0.99] border-t-white/10">
                <div className="mb-3 flex items-start justify-between">
                  <span className="max-w-[120px] truncate rounded border border-white/5 bg-divider px-2 py-0.5 text-[10px] uppercase tracking-wider text-creamMuted font-mono">
                    {activeProjectId ? activeProject?.name : projects.find(p => p.id === paper.projectId)?.name || 'Unknown'}
                  </span>
                </div>
                <h3 className="mb-1.5 line-clamp-2 text-xl leading-snug text-cream">{paper.title}</h3>
                <p className="mb-5 text-xs font-light text-creamMuted">{paper.authors || 'Unknown author'}</p>
                <div className="flex items-center justify-between">
                  {paper.status === 'done' ? (
                    <button className="rounded-full border border-sage/20 bg-sage/10 px-3 py-1 text-[10px] font-medium text-sage uppercase">Done</button>
                  ) : paper.status === 'reading' ? (
                    <button className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1 text-[10px] font-medium text-amber uppercase">Reading</button>
                  ) : (
                    <button className="rounded-full border border-transparent bg-divider px-3 py-1 text-[10px] font-medium text-creamMuted uppercase">To Read</button>
                  )}
                </div>
              </div>
            ))}
            {filteredPapers.length === 0 && (
              <div className="py-6 text-center text-sm text-tertiary">
                No papers for this filter yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- WORKLOG SCREEN --- */}
      <div 
        id="screen-worklog" 
        className={`absolute inset-0 z-30 flex h-full w-full flex-col bg-bg transition-transform duration-300 ${
          showWorklogScreen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-divider bg-bg pb-4 pt-2 px-2">
          <button onClick={() => setShowWorklogScreen(false)} className="-ml-2 p-2 text-cream transition-colors hover:text-sage">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="text-center">
             <h2 className="text-lg leading-none text-cream">{activeProject?.name || 'Worklog'}</h2>
             <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-creamMuted">Freeform Worklog</span>
          </div>
          <button onClick={() => setExportDrawerOpen(true)} className="-mr-2 p-2 text-creamMuted transition-colors hover:text-cream">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-divider border-b border-divider bg-surface py-4">
          <div className="px-2 text-center">
             <div className="mb-1 text-xs uppercase tracking-wider text-creamMuted">Sessions</div>
             <div className="text-xl text-cream">{activeProjectWorklogs.length}</div>
          </div>
          <div className="px-2 text-center">
             <div className="mb-1 text-xs uppercase tracking-wider text-creamMuted">Hrs Logged</div>
             <div className="text-xl text-cream">{activeProjectWorklogs.reduce((sum, w) => sum + w.hours, 0)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeProjectWorklogs.map((log, index) => (
            <div key={log.id} className={`border-divider p-6 ${index !== activeProjectWorklogs.length - 1 ? 'border-b' : ''}`}>
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-medium text-creamMuted">{log.date}</span>
                  <span className="rounded border border-divider bg-bg px-1.5 py-0.5 font-mono text-[10px] text-creamMuted">{log.hours}h</span>
                </div>
              </div>
              <div className="mb-3">
                 <span className="inline-block rounded border border-sage/40 bg-sage/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sage">
                    {log.title}
                 </span>
              </div>
              <p className="whitespace-pre-line font-sans text-sm font-light leading-relaxed text-cream/90">{log.summary}</p>
            </div>
          ))}
          {activeProjectWorklogs.length === 0 && (
             <div className="p-8 text-center text-sm text-tertiary">No logs yet.</div>
          )}
        </div>
        
        <div className="absolute bottom-6 left-0 right-0 px-6 z-30 pointer-events-none">
           <button onClick={() => setWorklogDrawerOpen(true)} className="pointer-events-auto flex w-full items-center justify-center gap-2 rounded-xl bg-cream py-4 text-lg text-bg shadow-xl shadow-black/40 transition-colors hover:bg-white">
             <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
             New Entry
           </button>
        </div>
      </div>


      {isManualDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/45" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setManualDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] border border-border bg-bg/95 p-4 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-normal text-text">Add Paper</h2>
              <button type="button" className="text-[13px] text-tertiary" onClick={() => setManualDrawerOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="inspo-field flex-1"
                  placeholder="arXiv ID (optional)"
                  value={paperArxivId}
                  onChange={(event) => setPaperArxivId(event.target.value)}
                />
                <button type="button" className="inspo-button-primary h-10 px-4" onClick={() => void onAutofill()}>
                  Autofill
                </button>
              </div>
              {autofillStatus && <p className="text-[11px] text-tertiary px-1">{autofillStatus}</p>}
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

      {isProjectDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setProjectDrawerOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[22px] border-t border-border bg-[#1a1512]/95 p-5 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-normal text-white">New Project</h2>
              <button type="button" className="text-[13px] text-tertiary" onClick={() => setProjectDrawerOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-3">
              <input
                className="inspo-field w-full"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <textarea
                className="inspo-textarea h-20 w-full"
                placeholder="Description / Objective"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  type="color"
                  className="h-10 w-12 rounded bg-surface p-1 cursor-pointer"
                  value={projectColor}
                  onChange={(e) => setProjectColor(e.target.value)}
                />
                <button type="button" className="inspo-button-primary h-10 flex-1" onClick={onAddProject}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isWorklogDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/80 backdrop-blur-sm">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" onClick={() => setWorklogDrawerOpen(false)} />
          
          <div className="relative z-10 mx-auto mb-4 flex w-full max-w-md justify-end px-6">
            <button type="button" className="rounded-full bg-surface/80 px-4 py-2 text-[13px] font-medium uppercase tracking-wider text-creamMuted backdrop-blur transition-colors hover:bg-white/10 hover:text-cream" onClick={() => setWorklogDrawerOpen(false)}>
              Cancel
            </button>
          </div>

          <div className="relative z-10 flex h-[85vh] w-full flex-col rounded-t-[24px] border-t border-divider bg-bg p-6 pb-12 shadow-2xl animate-fade-in">
            <div className="mb-6">
              <h3 className="text-xl text-cream">New Entry</h3>
            </div>
            
            <div className="mb-6 flex items-center border-b border-divider pb-2">
               <label className="w-24 text-sm text-creamMuted">Title</label>
               <input
                 type="text"
                 className="w-full bg-transparent font-sans text-[15px] text-cream focus:outline-none"
                 placeholder="E.g. Paper Reading"
                 value={worklogTitle}
                 onChange={(e) => setWorklogTitle(e.target.value)}
               />
            </div>

            <div className="mb-6 flex items-center border-b border-divider pb-2">
               <label className="w-24 text-sm text-creamMuted">Hours</label>
               <input
                 type="number"
                 step="0.5"
                 min="0"
                 className="w-full bg-transparent font-mono text-cream focus:outline-none"
                 placeholder="1.5"
                 value={worklogHours}
                 onChange={(e) => setWorklogHours(e.target.value ? Number(e.target.value) : '')}
               />
            </div>

            <div className="mb-6 flex items-center border-b border-divider pb-2">
               <label className="w-24 text-sm text-creamMuted">Outputs</label>
               <input
                 type="text"
                 className="w-full bg-transparent font-sans text-[15px] text-cream focus:outline-none"
                 placeholder="Optional: Models merged, notes saved"
                 value={worklogOutputs}
                 onChange={(e) => setWorklogOutputs(e.target.value)}
               />
            </div>

            <textarea
              className="flex-1 resize-none bg-transparent font-sans text-lg font-light leading-relaxed text-cream focus:outline-none placeholder:text-creamMuted/30"
              placeholder="Start typing your thoughts..."
              value={worklogSummary}
              onChange={(e) => setWorklogSummary(e.target.value)}
            />
            
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-sage py-4 font-medium text-bg transition-colors hover:bg-[#9dbfa3]"
              onClick={onAddWorklog}
            >
              Save Entry
            </button>
          </div>
        </div>
      )}

      {isExportDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-h-[50vh] rounded-t-[22px] border-t border-border bg-[#1a1512] p-5">
            <h2 className="mb-4 text-[17px] font-normal text-white">Export Worklogs</h2>
            <div className="space-y-2">
              <button type="button" className="w-full rounded-input border border-border bg-surface p-4 text-left hover:bg-white/5" onClick={() => handleExport('csv')}>
                <div className="text-[15px] text-white">Spreadsheet (CSV)</div>
                <div className="mt-1 text-[12px] text-tertiary">Best for tracking hours and Excel templates.</div>
              </button>
              <button type="button" className="w-full rounded-input border border-border bg-surface p-4 text-left hover:bg-white/5" onClick={() => handleExport('md')}>
                <div className="text-[15px] text-white">Report (Markdown)</div>
                <div className="mt-1 text-[12px] text-tertiary">Readable format perfect for sharing progress.</div>
              </button>
              <button type="button" className="w-full rounded-input border border-border bg-surface p-4 text-left hover:bg-white/5" onClick={() => handleExport('json')}>
                <div className="text-[15px] text-white">Data Archive (JSON)</div>
                <div className="mt-1 text-[12px] text-tertiary">Raw data format for backups and APIs.</div>
              </button>
            </div>
            <button type="button" className="mt-4 w-full text-[13px] text-tertiary py-2" onClick={() => setExportDrawerOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
