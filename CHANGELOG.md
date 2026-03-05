# DayOS Implementation Changelog

## Commit 1 - Foundation Scaffold and Core Architecture
### What changed
- Bootstrapped `dayos-app` using React + TypeScript + Vite.
- Added PWA setup with `vite-plugin-pwa` manifest, service worker generation, and install-ready metadata.
- Added Tailwind CSS design tokens matching PRD v1.1 palette and spacing constraints.
- Implemented mobile-first app shell with bottom navigation tabs: Today, Schedule, Research, Stats, Settings.
- Implemented floating Quick Scratchpad FAB with bottom-sheet editor and autosave behavior.
- Added IndexedDB data layer with Dexie (`workouts`, `meals`, `studyBlocks`, `scratchNotes`, `sundayPlans`, `examModeConfig`, `syncQueue`).
- Added sync queue primitives and last-write-wins utility for offline-first sync behavior.
- Implemented Today banner with date, streak placeholder, rotating motivation text, and Exam Mode countdown chip.
- Implemented initial Today card scaffolding for workout, nutrition import area, study, research, and journal.
- Added Settings controls for Exam Mode toggling and sample Sunday planning seed flow.
- Implemented markdown nutrition parser (`Item | Portion | Calories | Protein (g) | Fats (g) | Carbs (g)`) with TOTAL-row skip and calorie fallback logic.
- Added automated tests (Vitest + Testing Library + fake-indexeddb): parser behavior + local DB utilities.

### What this fixed
- Establishes required PRD technical foundation: PWA shell, offline-first local persistence, and testable domain utilities.
- Removes startup blockers for iterative feature development by creating stable routing, data, and test infrastructure.

### What is still left
- Real Supabase auth/session integration (magic-link) and remote sync worker implementation.
- Full Today checklist interactions: completion rings, expand/collapse persistence, swipe gestures, haptics, day-complete state.
- Workout logging flows (planned vs actual sets, progressive overload records, rest-day variant).
- Nutrition UI completeness: import preview with row deselection, template saving/reuse, water tracker and progress bars.
- Study/Pomodoro runtime behavior including background pause + local notification handling.
- Timetable weekly grid and deadline pinning logic.
- Research Kanban, paper logs, arXiv autofill integration.
- Journal prompted/free mode, Sunday review archive, and searchable reflections.
- Stats dashboards, streak/missed-day tracking, scratchpad search/pin/promote flows.
- Production-quality PWA assets/icons (current icons are placeholders).
