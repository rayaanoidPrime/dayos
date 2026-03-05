# DayOS

DayOS is an offline-first PWA for daily execution across workout, nutrition, study, research, and journaling.

## Stack
- React 19 + TypeScript + Vite
- Zustand for local app state
- Dexie (IndexedDB) for offline persistence
- Supabase (optional) for auth + queue sync
- Workbox via `vite-plugin-pwa`
- Vitest + Testing Library

## Current App Surface
Routes:
- `/` Today dashboard (mobile + desktop layouts)
- `/schedule` Plan
- `/research` Research
- `/you` Profile, auth, sync, exam mode, sunday planning

Removed:
- Stats page is no longer part of the app.

## Key Features
- Today dashboard matching design inspo structure
  - Timer + session context
  - Daily task checklist linked to persisted completion state
  - Workout log table with editable reps (persisted)
  - Research lane preview (linked to paper log)
  - Consistency heatmap + streak metrics
  - Nutrition intake table + quick JSON/CSV meal import
- Plan page with day selector and event management
- Research page with paper log, filters, autofill, and task board
- You page with real data metrics, Google sign-in/out, sync controls, exam mode, sunday planning
- Scratchpad FAB with autosave, pin/promote workflow
- Offline-first queue sync model with optional Supabase backend

## Prerequisites
- Node.js 20+
- npm 10+

## Install
```bash
cd dayos-app
npm install
```

## Environment (Optional but recommended)
Create `dayos-app/.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Without these values, the app still runs locally, but cloud auth/sync stays disabled.

## Supabase Setup
Run schema in Supabase SQL editor:
- [`dayos-app/supabase/schema.sql`](./supabase/schema.sql)

Configure Google sign-in:
1. Supabase Dashboard -> **Authentication** -> **Providers** -> **Google**.
2. Enable Google provider.
3. Add Google OAuth Client ID and Client Secret.
4. Supabase Dashboard -> **Authentication** -> **URL Configuration**:
   - Site URL: your app base URL (for Vite dev usually `http://localhost:5173`)
   - Add redirect URL allow list entry for your app origin (for local dev: `http://localhost:5173`)

Important:
- The **Supabase OAuth Server** feature (`/oauth/consent`) is for hosting your own OAuth server/apps.
- It is separate from Google social login for app users, and does **not** replace enabling Google provider above.

## Run
```bash
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Test
```bash
npm run test
npm run test:watch
```

## Lint
```bash
npm run lint
```

## Auth + Sync Usage
1. Open **You** tab.
2. Click **Sign in with Google**.
3. Use **Flush queue now** to manually push pending writes.
4. Auto-sync also retries on interval + reconnect.

## Nutrition Quick Import Format (Today page)
Use **Quick Import JSON/CSV** in the Nutrition section.

JSON example:
```json
[
  { "name": "Oats", "portionLabel": "80g", "calories": 300, "proteinG": 12, "fatsG": 5, "carbsG": 50 }
]
```

CSV example:
```csv
name,portion,calories,protein,fats,carbs
Oats,80g,300,12,5,50
```

## Scripts
From `dayos-app`:
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run test:watch`
- `npm run lint`
