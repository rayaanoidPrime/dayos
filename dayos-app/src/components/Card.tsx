import type { ReactNode } from 'react'

type CardProps = {
  title: string
  children: ReactNode
  rightLabel?: string
}

export function Card({ title, children, rightLabel }: CardProps) {
  return (
    <section className="mb-3 rounded-card border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {rightLabel && <span className="text-xs text-muted">{rightLabel}</span>}
      </div>
      {children}
    </section>
  )
}

