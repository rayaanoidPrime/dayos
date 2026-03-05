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
}

type ResearchState = {
  projects: ResearchProject[]
  tasks: ResearchTask[]
  papers: PaperEntry[]
  addTask: (task: Omit<ResearchTask, 'id'>) => void
  moveTask: (taskId: string, status: TaskStatus) => void
  addPaper: (paper: Omit<PaperEntry, 'id' | 'dateAdded'>) => void
}

const randomId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      projects: [
        {
          id: 'mtech-thesis',
          name: 'M.Tech Thesis',
          description: 'Vision-based manipulation with lightweight policy learning.',
          colorTag: '#3A86FF',
        },
      ],
      tasks: [
        {
          id: randomId(),
          title: 'Draft experiment section',
          projectId: 'mtech-thesis',
          status: 'in_progress',
        },
      ],
      papers: [],
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
    }),
    { name: 'dayos-research-state' },
  ),
)
