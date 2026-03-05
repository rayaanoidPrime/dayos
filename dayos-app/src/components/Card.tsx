import type { ReactNode } from 'react'

type CardProps = {
  title: string
  children: ReactNode
  rightLabel?: string
  collapsible?: boolean
  collapsed?: boolean
  onToggleCollapse?: () => void
  completeable?: boolean
  completed?: boolean
  onToggleComplete?: () => void
}

export function Card({
  title,
  children,
  rightLabel,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  completeable = false,
  completed = false,
  onToggleComplete,
}: CardProps) {
  return (
    <section className="mb-3 rounded-card border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {completeable && (
            <button
              type="button"
              onClick={onToggleComplete}
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                completed ? 'border-success bg-success text-white' : 'border-border text-transparent'
              }`}
              aria-label={completed ? `Mark ${title} incomplete` : `Mark ${title} complete`}
            >
              ✓
            </button>
          )}
          <h3 className="text-sm font-semibold text-text">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {rightLabel && <span className="text-xs text-muted">{rightLabel}</span>}
          {collapsible && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded p-1 text-xs text-muted"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              {collapsed ? '▾' : '▴'}
            </button>
          )}
        </div>
      </div>
      {!collapsed && children}
    </section>
  )
}

