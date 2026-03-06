# Repository Guidelines

## Project Structure & Module Organization
This repository is organized around the app in `dayos-app/`.
- `dayos-app/src/`: React + TypeScript application code.
- `dayos-app/src/pages/`: route-level screens (`TodayPage`, `SchedulePage`, `ResearchPage`, `YouPage`).
- `dayos-app/src/components/`: reusable UI and app shell.
- `dayos-app/src/store/`: Zustand state stores.
- `dayos-app/src/lib/`: utilities, data/sync logic, and most unit tests (`*.test.ts`).
- `dayos-app/public/`: static assets (including PWA icons).
- `dayos-app/supabase/schema.sql`: baseline schema/RLS setup.
- Root docs: `CHANGELOG.md`, `DayOS_PRD_v1.1.md`, `design_inspo/`.

## Build, Test, and Development Commands
Run commands from `dayos-app/`:
- `npm run dev`: start Vite dev server.
- `npm run build`: type-check and build production bundle.
- `npm run preview`: preview built app locally.
- `npm run lint`: run ESLint across the project.
- `npm run test`: run Vitest once with coverage output.
- `npm run test:watch`: watch mode for local test iteration.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`/`.tsx`), ES modules.
- Indentation: 2 spaces; keep semicolon-free style consistent with existing code.
- Components/pages: PascalCase file names (for example, `AppShell.tsx`).
- Stores/utilities/tests: camelCase files (for example, `workoutStore.ts`, `sync.test.ts`).
- Prefer small, focused functions and typed state/actions in stores.
- Linting is configured in `dayos-app/eslint.config.js`; resolve lint findings before PR.

## Testing Guidelines
- Frameworks: Vitest + Testing Library (`jsdom` environment).
- Keep tests near related logic using `*.test.ts` naming.
- Current coverage targets `src/lib/**/*.ts`; add tests when changing parsing, DB, or sync behavior.
- Example: `npm run test` before pushing, `npm run test:watch` while developing.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit subjects.
- Preferred format: Conventional Commits when practical (for example, `feat(today): improve nutrition import`), though short non-prefixed commits are also present.
- Keep commits scoped to one change.
- PRs should include:
  - summary of user-visible behavior changes,
  - linked issue/task (if available),
  - screenshots or short clips for UI changes,
  - test/lint status and any known follow-ups.

## Security & Configuration Tips
- Use `dayos-app/.env.local` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never commit secrets.
- If auth/sync changes are made, verify Supabase provider settings and schema compatibility in `supabase/schema.sql`.
