import { NavLink, Outlet } from 'react-router-dom'
import { ScratchpadFab } from './ScratchpadFab'

const tabs = [
  {
    to: '/',
    label: 'Today',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[1.5]">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/schedule',
    label: 'Plan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[1.5]">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/research',
    label: 'Research',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[1.5]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/you',
    label: 'You',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[1.5]">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export function AppShell() {
  return (
    <>
      <div className="fade-in mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-hidden border-x border-border bg-bg/80 backdrop-blur-[20px] md:my-4 md:max-w-[900px] md:min-h-[calc(100vh-2rem)] md:rounded-[40px] md:border">
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 pb-24 pt-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-10 md:pt-10">
          <Outlet />
        </main>

        <ScratchpadFab />
      </div>

      <nav className="fixed bottom-4 left-1/2 z-50 h-[60px] w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 rounded-full border border-border bg-[rgba(20,16,14,0.85)] px-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-[20px]">
        <ul className="grid h-full grid-cols-4">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex h-full flex-col items-center justify-center gap-1 text-[10px] transition ${
                    isActive ? 'text-primary' : 'text-tertiary'
                  }`
                }
              >
                {tab.icon}
                <span>{tab.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}

