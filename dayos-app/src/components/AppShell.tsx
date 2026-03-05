import { NavLink, Outlet } from 'react-router-dom'
import { ScratchpadFab } from './ScratchpadFab'

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/research', label: 'Research' },
  { to: '/stats', label: 'Stats' },
  { to: '/you', label: 'You' },
]

export function AppShell() {
  return (
    <div className="fade-in mx-auto flex min-h-screen max-w-md flex-col border-x border-border bg-bg/80 backdrop-blur-xl md:my-4 md:min-h-[calc(100vh-2rem)] md:rounded-[32px]">
      <main className="flex-1 px-4 pb-32 pt-6">
        <Outlet />
      </main>

      <ScratchpadFab />

      <nav className="fixed bottom-6 left-4 right-4 rounded-full border border-border bg-bg/85 shadow-[0_14px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl md:left-1/2 md:right-auto md:w-[calc(28rem-2rem)] md:-translate-x-1/2">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex h-14 items-center justify-center text-xs font-semibold tracking-wide transition ${
                    isActive ? 'text-primary' : 'text-muted'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

