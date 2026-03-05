# DayOS

DayOS is an offline-first PWA for daily execution across fitness, nutrition, study, research, and journaling.

## Tech Stack
- React 19 + TypeScript + Vite
- Zustand (local state)
- Dexie (IndexedDB local persistence)
- Supabase (auth + remote sync, optional but recommended)
- Workbox via `vite-plugin-pwa`
- Vitest + Testing Library

## Features Implemented
- Today checklist with per-card completion + collapse persistence
- Workout logging (planned vs actual sets, rest-day notes)
- Nutrition markdown import (preview, deselect rows, templates, water tracking)
- Study blocks with Pomodoro runtime + background pause handling
- Schedule weekly grid + deadlines/events
- Research Kanban + paper log + arXiv autofill attempt
- Journal prompted/free modes + Sunday review flow
- Stats: streaks, missed-day heatmap, weekly summaries, research completion rates
- Scratchpad FAB with autosave, pin/promote, searchable archive
- Supabase magic-link auth hooks + sync queue flush/auto-retry
- PWA manifest + service worker background sync route

## Prerequisites
- Node.js 20+
- npm 10+

Check:
```bash
node -v
npm -v
```

## 1) Install
From project root:
```bash
cd dayos-app
npm install
```

## 2) Environment Setup
Create `dayos-app/.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Notes:
- App still runs without these values, but auth/sync will stay local-only.
- For full functionality, set both variables.

## 3) Supabase Setup (Recommended)
1. Create a Supabase project.
2. Open SQL Editor in Supabase.
3. Run:
- [`dayos-app/supabase/schema.sql`](./supabase/schema.sql)

This creates tables + RLS policies expected by the app.

## 4) Run Development Server
```bash
npm run dev
```
Open the URL shown by Vite (usually `http://localhost:5173`).

## 5) Build and Preview
```bash
npm run build
npm run preview
```

## 6) Run Tests
```bash
npm run test
```

Watch mode:
```bash
npm run test:watch
```

Lint:
```bash
npm run lint
```

## Auth + Sync Usage
- Go to **You** tab.
- Click **Sign in with Google**.
- After signing in, session state is shown in **You**.
- Use **Flush queue now** to manually push pending local writes.
- Auto-sync also runs on interval and when network comes back.

## PWA Notes
- App is installable (manifest + icons included).
- Service worker is generated during build.
- Workbox runtime caching includes a background sync route for Supabase POST writes.

## Troubleshooting
- `Supabase env vars are missing` in You:
  - Check `.env.local` keys and restart dev server.
- Sync queue not clearing:
  - Ensure you are signed in and schema SQL was applied in Supabase.
  - Check browser network tab for 401/403 (usually RLS/auth mismatch).
- Build warns about large bundle size:
  - This is currently expected; code-splitting optimization is pending polish.

## Project Scripts
From `dayos-app`:
- `npm run dev` - start dev server
- `npm run build` - type-check + production build
- `npm run preview` - preview production build
- `npm run test` - run tests with coverage
- `npm run test:watch` - watch tests
- `npm run lint` - lint code
