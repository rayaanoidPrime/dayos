import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type PaperStatus = 'to-read' | 'reading' | 'done'

export type ResearchTask = {
  id: string
  title: string
  projectId: string
  dueDate?: string
  notes?: string
  status: TaskStatus
}

export type PaperEntry = {
  id: string
  projectId: string
  title: string
  authors: string
  abstract: string
  arxivId: string
  status: PaperStatus
  dateAdded: string
  dateRead?: string
  notes?: string
}

export type ResearchProject = {
  id: string
  name: string
  description: string
  colorTag: string
  goal?: string
  milestoneDate?: string
  createdAt?: string
  updatedAt?: string
}

export type ResearchWorklog = {
  id: string
  projectId: string
  date: string
  title: string
  summary: string
  hours: number
  outputs?: string
  blockers?: string
  nextSteps?: string
  updatedAt: string
}

type ResearchState = {
  activeProjectId: string | null
  projects: ResearchProject[]
  tasks: ResearchTask[]
  papers: PaperEntry[]
  worklogs: ResearchWorklog[]
  setActiveProject: (id: string | null) => void
  ensurePrimaryProject: () => string
  addProject: (project: Omit<ResearchProject, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateProject: (id: string, updates: Partial<ResearchProject>) => void
  deleteProject: (id: string) => void
  addTask: (task: Omit<ResearchTask, 'id'>) => void
  moveTask: (taskId: string, status: TaskStatus) => void
  addPaper: (paper: Omit<PaperEntry, 'id' | 'dateAdded'>) => void
  addWorklog: (worklog: Omit<ResearchWorklog, 'id' | 'updatedAt'>) => void
  updateWorklog: (id: string, updates: Partial<ResearchWorklog>) => void
  deleteWorklog: (id: string) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      activeProjectId: null,
      projects: [],
      tasks: [],
      papers: [],
      worklogs: [],
      setActiveProject: (id) => set({ activeProjectId: id }),
      ensurePrimaryProject: () => {
        const state = get()
        const existing = state.projects[0]
        if (existing) {
          if (!state.activeProjectId) {
            set({ activeProjectId: existing.id })
          }
          return existing.id
        }

        const project: ResearchProject = {
          id: randomId(),
          name: 'General Research',
          description: 'User-created research workspace.',
          colorTag: '#3A86FF',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((s) => ({
          projects: [project, ...s.projects],
          activeProjectId: project.id,
        }))
        return project.id
      },
      addProject: (project) =>
        set((state) => {
          const newProject: ResearchProject = {
            ...project,
            id: randomId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          return { projects: [newProject, ...state.projects], activeProjectId: newProject.id }
        }),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          activeProjectId: state.activeProjectId === id ? (state.projects.find((p) => p.id !== id)?.id ?? null) : state.activeProjectId,
        })),
      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, { ...task, id: randomId() }],
        })),
      moveTask: (taskId, status) =>
        set((state) => ({
          tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
        })),
      addPaper: (paper) =>
        set({
          papers: [
            ...get().papers,
            {
              ...paper,
              id: randomId(),
              dateAdded: new Date().toISOString().slice(0, 10),
            },
          ],
        }),
      addWorklog: (worklog) =>
        set((state) => ({
          worklogs: [
            ...state.worklogs,
            { ...worklog, id: randomId(), updatedAt: new Date().toISOString() },
          ],
        })),
      updateWorklog: (id, updates) =>
        set((state) => ({
          worklogs: state.worklogs.map((w) => (w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w)),
        })),
      deleteWorklog: (id) =>
        set((state) => ({
          worklogs: state.worklogs.filter((w) => w.id !== id),
        })),
    }),
    { name: 'dayos-research-state' },
  ),
)
