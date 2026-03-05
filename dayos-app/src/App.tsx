import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { AppBootstrap } from './components/AppBootstrap'
import { AppShell } from './components/AppShell'
import { ResearchPage } from './pages/ResearchPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { TodayPage } from './pages/TodayPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'research', element: <ResearchPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <>
      <AppBootstrap />
      <RouterProvider router={router} />
    </>
  )
}

