import { NavLink, Outlet } from 'react-router-dom'
import { ScratchpadFab } from './ScratchpadFab'

const tabs = [
  { to: '/', label: 'Today' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/research', label: 'Research' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-bg">
      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <ScratchpadFab />

      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-white">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                className={({ isActive }) =>
                  `flex h-14 items-center justify-center text-xs font-semibold ${
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

