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

## Commit 2 - Today Interactions, Nutrition Tracking, and Notes/Archive
### What changed
- Added per-day persisted Today state (`zustand`): card completion, expand/collapse state, water tracking, and meal templates.
- Upgraded Today cards with completion rings, collapse chevrons, and day-complete celebration when visible mandatory cards are done.
- Added nutrition progress UI: calorie + macro tracking against targets, water quick-add controls (`+200ml`, `+500ml`, reset), and template quick-log chips.
- Implemented markdown import preview list with per-row deselection and “Save selected rows” import flow.
- Extended meal model/storage with `date` and migrated Dexie to v2 schema for date-indexed meal reads.
- Improved Scratchpad: draft updates existing note while typing, supports pin/unpin and promote-to-task/journal actions, all queued for sync.
- Added Stats Notes section with keyword search and metadata (pinned/promoted state).
- Added Sunday plan persistence to IndexedDB with week-based upsert and Settings flow for saving weekly intentions.
- Added Stats Sunday Plan Archive view sourced from persisted plans.
- Expanded DB tests to cover scratch note pin/promote and Sunday plan upsert behavior.

### What this fixed
- Closes most of the previously missing Today checklist interactions (completion, collapse persistence, and day-complete state).
- Delivers the previously missing nutrition UX slice (preview deselection, template reuse, water tracking, macro progress).
- Delivers scratchpad search/pin/promote and Sunday plan archive paths that were still pending.

### What is still left
- Real Supabase auth/session integration (magic-link) and remote/background sync worker implementation.
- Workout logging flows: planned vs actual sets input, progressive overload history, and rest-day variant UX.
- Study/Pomodoro runtime behavior: active timer engine, background pause detection, and local notifications.
- Timetable completion: full weekly grid polish and tighter deadline integration on Today.
- Research module completion: richer Kanban interactions, paper metadata quality checks, and robust arXiv online/offline handling.
- Journal completion: prompted/free mode toggle, Sunday review prompts, and keyword search for journal entries.
- Stats completion: streak/missed-day dashboards and module-level weekly summaries/visualizations.
- Production-quality PWA icons/assets (current icons remain placeholders).

## Commit 3 - Schedule and Research Tabs (Functional Baseline)
### What changed
- Implemented a persisted `scheduleStore` with recurring classes and calendar events/deadlines.
- Replaced Schedule placeholder with:
  - weekly timetable rendering (Mon-Sun grouped classes),
  - event/deadline creation form (date/time/type),
  - sorted upcoming events list.
- Added Today-screen deadline pinning banner for exam/deadline items within the next 7 days.
- Added Today study card read-only “today’s classes” timeline sourced from the weekly timetable state.
- Implemented a persisted `researchStore` with projects, Kanban tasks, and paper log entries.
- Replaced Research placeholder with:
  - Kanban-lite task columns (To Do / In Progress / Done) and move actions,
  - paper reading log form,
  - arXiv metadata autofill attempt via API with graceful fallback to manual entry/offline mode.

### What this fixed
- Delivers the missing timetable + deadline pinning baseline from the previous “still left” list.
- Delivers the missing Research Kanban and paper-log baseline, including initial arXiv autofill integration path.

### What is still left
- Supabase auth/session (magic-link) and robust remote sync worker/retry handling.
- Workout module depth: planned vs actual set logging UI, progressive overload history, and rest-day variant flow.
- Study timer runtime: full Pomodoro engine, background pause detection, and local notifications.
- Research hardening: stronger arXiv parsing/validation, richer project management, and completion-rate stats.
- Journal completion: prompted mode, free mode toggle, Sunday review prompts, and searchable journal history.
- Stats completion: streak/missed-day dashboard, weekly module summaries, and trend visualization.
- PWA polish: production icon set/assets and installability/performance audit pass.

## Commit 4 - Journal Modes and Streak Dashboard
### What changed
- Added persisted `journalStore` with per-day entries and mode support (`prompted` / `free`).
- Upgraded Today Journal card to support:
  - prompted reflections (`highlight`, `blockers`, `tomorrow priority`),
  - free-write mode toggle,
  - daily persistence keyed by ISO date.
- Replaced streak placeholder in `TodayBanner` with computed streak logic based on actual card completion history.
- Added Stats “Streaks & Missed Days” section with current streak and recent day statuses.
- Added Stats “Journal Search” section for keyword search across saved journal entries.

### What this fixed
- Delivers the missing prompted/free Journal flow from the PRD baseline.
- Replaces static streak placeholder with real computed day completion/miss tracking.
- Adds searchable reflection history path in Stats.

### What is still left
- Supabase auth/session and true background sync worker implementation.
- Workout depth: planned vs actual set logging UX + progressive overload analytics + rest-day UX.
- Study runtime: Pomodoro timer lifecycle, background pause handling, and local notifications.
- Research hardening: fuller project management flows, stronger arXiv autofill reliability, and completion analytics in Stats.
- Stats completion: richer weekly summaries and module-level trend visualizations.
- Sunday review prompts/workflow expansion (beyond current weekly intentions capture).
- Production-ready PWA icons/assets and polish pass.

## Commit 5 - Workout Logging and Pomodoro Runtime Baseline
### What changed
- Added persisted `workoutStore` with:
  - weekly split session mapping,
  - per-day workout logs,
  - planned exercise templates by session type,
  - actual set logging per exercise,
  - rest-day note support.
- Upgraded Today Workout card:
  - auto-detects daily session from weekly split,
  - supports planned vs actual set capture,
  - shows rest-day variant UI with recovery note.
- Added persisted `studyStore` with daily study blocks and pomodoro counters.
- Upgraded Today Study card:
  - functional 25-minute timer baseline (start/pause/reset),
  - timer assignment to a selected study block,
  - auto-increments block pomodoro count on cycle completion,
  - background pause behavior using `visibilitychange`,
  - local notification prompt/path when timer is paused in background.

### What this fixed
- Delivers the missing baseline workout logging flow (planned vs actual sets) and rest-day variant.
- Delivers the missing functional Pomodoro runtime baseline with background pause handling.

### What is still left
- Supabase auth/session and robust background sync worker integration.
- Workout analytics depth (progressive overload charts/weekly volume summaries in Stats).
- Pomodoro depth (break cycles, long-break cadence, richer timer/session history).
- Research module hardening and per-project completion analytics.
- Sunday review workflow expansion and tighter cross-module weekly recap.
- Additional Stats visualizations (module trends/heatmaps).
- Production-ready PWA icons/assets and final UX polish pass.

## Commit 6 - Supabase Auth and Queue Sync Controls
### What changed
- Added `lib/supabase.ts`:
  - env-driven Supabase client initialization,
  - magic-link send helper,
  - session email fetch helper.
- Added `lib/sync.ts`:
  - queue flush routine that processes local sync queue items to Supabase (`upsert` / `delete`),
  - processed/failed counts and configuration fallback messaging.
- Upgraded Settings screen with a new “Supabase Auth & Sync” card:
  - magic-link email input flow,
  - session status visibility,
  - sync queue count visibility,
  - manual queue flush trigger with result messaging.

### What this fixed
- Delivers a concrete auth/session entry point and operational visibility for local-to-remote sync lag.
- Replaces pure placeholder sync behavior with an executable queue flush path.

### What is still left
- End-to-end production auth/session UX hardening (redirect handling, sign-out flow, and recovery states).
- Automated/background sync worker behavior (service-worker flush retries and connectivity-aware scheduling).
- Schema alignment and server-side validation for all synced tables in Supabase.
- Additional module depth and analytics polish (workout/study/research/journal stats expansion).
- Production-ready PWA icons/assets and final UI/UX polish.

## Commit 7 - Auth Hardening and Automatic Sync Loop
### What changed
- Hardened Supabase auth client config (`detectSessionInUrl`, persistent session, auto token refresh).
- Added auth redirect consumption utility to process magic-link/code return URLs and clean URL state.
- Added explicit sign-out helper and Settings UI action for session termination/recovery.
- Added sync safeguards:
  - table allowlist validation before remote writes,
  - payload shape guard to reject invalid sync items.
- Added automatic sync loop startup with periodic flush + online-event-triggered flush.
- Added bootstrap initialization layer to run auth redirect handling and auto-sync lifecycle at app startup.

### What this fixed
- Closes key auth/session hardening gaps (redirect/session recovery and sign-out flow).
- Moves sync behavior from manual-only to automatic retry/online-aware operation.
- Reduces risk of invalid/unexpected table writes to Supabase via queue validation checks.

### What is still left
- Full service-worker-managed background sync (current retry loop runs in app runtime, not dedicated SW background sync).
- Supabase server schema alignment/migrations and end-to-end validation policies for all tables.
- Stats depth: module-level weekly analytics/trends/heatmap polish.
- Research analytics: per-project completion metrics surfaced in Stats.
- Sunday review workflow expansion and richer weekly retrospective summary.
- Production-ready PWA icon/asset replacements and final UX polish pass.

## Commit 8 - Weekly Analytics and Research Completion Stats
### What changed
- Expanded Stats tab with a 4-week missed-day heatmap visualization.
- Added weekly module summary card covering:
  - workout volume (`kg-reps`) and active sessions,
  - study pomodoros + focus minutes,
  - average daily water intake,
  - weekly logged calories,
  - weekly journal entry count.
- Added per-project Research completion rates card with progress bars.
- Wired Stats analytics to existing local stores (`workoutStore`, `studyStore`, `researchStore`, `todayStore`, `journalStore`) and current-week nutrition logs from IndexedDB.

### What this fixed
- Closes most of the previously remaining stats/analytics depth gap.
- Surfaces project completion progress in Stats per PRD intent.

### What is still left
- Sunday review workflow expansion (dedicated weekly retrospective prompts + completed-task recap UX).
- Service-worker-native background sync (current auto sync loop is app-runtime based).
- Supabase schema migration/policy alignment for all synchronized tables.
- PWA asset polish (replace placeholder icons with production-grade set).

## Commit 9 - Sunday Review Workflow Expansion
### What changed
- Extended journal entry model with Sunday retrospective fields:
  - `weeklyHighlight`
  - `weeklyImprove`
- Added Sunday-only review block in Today Journal card (prompted mode) with:
  - weekly reflection prompts,
  - read-only 7-day completed-task recap across all mandatory cards.
- Added Stats “Sunday Review Archive” section.
- Expanded journal search indexing/rendering to include Sunday review content.

### What this fixed
- Closes the dedicated Sunday review prompt/archive gap called out in remaining items.
- Adds a concrete weekly retrospective loop with module-completion recap context.

### What is still left
- Service-worker-native background sync (current retry loop runs in app runtime).
- Supabase schema migration/policy alignment for synchronized tables.
- PWA production asset polish (placeholder icons still pending replacement).

## Commit 10 - Service Worker Sync Route, Supabase Schema, and PWA Icon Refresh
### What changed
- Enhanced `vite-plugin-pwa` Workbox configuration with runtime background sync routing for Supabase POST requests.
- Added `supabase/schema.sql` with:
  - core table definitions aligned to current app data model,
  - ownership-aware RLS policies,
  - basic constraints/checks for synced entities.
- Replaced placeholder PWA icon assets (`192`, `512`, `maskable-512`) with branded DayOS production-style PNG icons.

### What this fixed
- Closes the service-worker sync retry gap by adding Workbox background queueing for Supabase write calls.
- Closes schema-alignment gap by providing a concrete SQL schema/policy baseline for Supabase setup.
- Closes icon placeholder gap by replacing temporary icon assets.

### What is still left
- Optional final polish only:
  - chunk size/code-splitting optimization (bundle warning >500kB),
  - deeper Supabase production hardening (migration/version workflow and strict policy refinements),
- UI fine-tuning pass.

## Commit 11 - Magic-Link Session and Sync Queue Fixes
### What changed
- Updated magic-link sign-in to pass `emailRedirectTo: window.location.origin` for consistent local callback behavior.
- Added session user-id helper for authenticated sync payload ownership.
- Fixed sync queue remote mapping:
  - local table keys now map to Supabase snake_case tables (`studyBlocks -> study_blocks`, etc.),
  - local camelCase payload fields now map to Supabase snake_case columns,
  - `user_id` is attached for RLS-compatible upserts/deletes.
- Added live Settings auth subscription so session display updates immediately after sign-in/sign-out.
- Improved sync flush status messaging with last remote error detail.

### What this fixed
- Fixes “magic link clicked but still shows not signed in” by stabilizing redirect behavior and reactive session UI updates.
- Fixes queue flush failures caused by table/field mismatches and missing `user_id` under RLS.

### What is still left
- Final polish/optimization only (bundle splitting + minor UX refinements).

## Commit 12 - Redirect Session Parsing Fix
### What changed
- Fixed magic-link redirect consumption so hash-based auth tokens are not cleared before Supabase persists session.
- Added short session-detection wait window during hash-token redirects.
- Added Settings visibility-based session refresh to avoid stale “Not signed in” UI after tab switches.

### What this fixed
- Resolves cases where Supabase shows sign-in events but app UI still displays “Not signed in”.

### What is still left
- Final optimization/polish only (bundle splitting + minor UX refinements).

## Commit 13 - Google OAuth and You Tab Migration
### What changed
- Removed email-based sign-in flow from app UI.
- Added Google OAuth sign-in helper (`signInWithGoogle`) using Supabase OAuth redirect.
- Replaced `Settings` route/tab with a `You` route/tab and migrated account/sync/exam/sunday controls there.
- Added tests for:
  - bottom nav rendering the `You` tab,
  - sync payload/table mapping for Supabase remote writes.

### What this fixed
- Aligns auth UX to OAuth-only (Google) as requested.
- Reframes profile/account controls under a dedicated `You` section instead of Settings.

### What is still left
- Design language overhaul based on `design_inspo` references (theme/layout/motion pass).
- Minor final polish and bundle optimization.

## Commit 14 - Design Inspiration Theme Pass (Earthy Glass UI)
### What changed
- Applied `design_inspo` visual direction to core app shell:
  - deep earthy dark palette,
  - radial atmospheric background gradients,
  - glassmorphism container and bottom navigation pill.
- Updated typography tone (SF/Inter stack, uppercase micro-label treatment on cards).
- Updated card surfaces to translucent elevated panels with blur/shadow depth.
- Refreshed scratchpad FAB and sheets to align with the new visual language.
- Updated Tailwind token palette/radius values to support the new look consistently across pages.

### What this fixed
- Replaced the prior generic/light look with a coherent, intentional style aligned to provided inspiration files.
- Improved visual hierarchy and atmosphere on both mobile and desktop shells.

### What is still left
- Minor final polish and bundle optimization only.

## Commit 15 - You Page Dashboard Styling
### What changed
- Redesigned `You` page to match inspiration profile/dashboard patterns:
  - weekly consistency mini-bar chart,
  - compact semester-goals metrics panels,
  - preserved account auth/sync controls in the same visual style.
- Kept all existing profile actions (Google sign-in/out, queue flush, exam mode, sunday planning) intact.

### What this fixed
- Replaces a plain settings-form feel with a purpose-built profile dashboard aligned to inspiration references.

### What is still left
- Minor final polish and bundle optimization only.

## Commit 16 - You Onboarding Copy Cleanup
### What changed
- Added first-time OAuth onboarding hint block to `You` page when no active session is detected.
- Updated Today exam-mode empty-state copy to reference the `You` tab (instead of old settings wording).
- Updated README auth/sync instructions to `You` + Google sign-in flow.

### What this fixed
- Removes leftover settings-era wording from current user-facing docs/UI.
- Makes first-time sign-in flow clearer directly inside the `You` tab.

### What is still left
- Minor final polish and bundle optimization only.

## Commit 17 - Shell and Input Styling Alignment to Design Inspo
### What changed
- Refined global visual tokens to match inspo values (`#1a1512` base, white primary text, translucent surface + border).
- Updated shell chrome to inspo geometry:
  - narrower centered mobile frame (`390px` max),
  - rounded glass container,
  - bottom nav pill with icon + label tabs.
- Updated shared card component typography and controls to reduce the previous “utility dashboard” look and align with inspo card density/contrast.
- Restyled scratchpad FAB and both sheets (editor/history) to match inspo floating action behavior and sheet treatment.
- Added global form-control normalization (`input`, `textarea`, `select`) to fix white backgrounds and ensure consistent dark text-area/input appearance across screens.

### What this fixed
- Fixes the reported white text-area/input background issue by forcing dark-theme-safe control defaults.
- Aligns app-wide shell/navigation language much closer to the provided inspo references before route-level refinements.

### What is still left
- Route-level screen-by-screen alignment:
  - `Today`, `Plan(Schedule)`, `Research`, `Stats`, and `You` still need exact/inferred layout parity with inspo.
- Final visual parity pass after route updates.

## Commit 18 - Plan and Research Screen Layout Parity
### What changed
- Rebuilt `Schedule` tab into an inspo-matched `Plan` layout:
  - day-chip selector row,
  - day-focused schedule cards,
  - event cards,
  - styled add-event form integrated into the same visual language.
- Rebuilt `Research` tab into inspo-matched `Paper Log` layout:
  - back-nav micro header, title/subtitle block,
  - arXiv import input group with chip filters,
  - paper table with status tags and notes row treatment.
- Preserved and restyled existing functional capabilities on Research:
  - task board add/move flow,
  - arXiv autofill,
  - manual paper entry and status assignment.

### What this fixed
- Resolves the largest layout mismatch on the two non-Today work screens where inspo clearly defined structure.
- Keeps all previously shipped schedule/research functionality while bringing UI hierarchy in line with inspo patterns.

### What is still left
- `Today`, `Stats`, and `You` still need final screen-specific parity/inferred redesign pass.
- Final global polish after those route updates.

## Commit 19 - Today + You Redesign and Stats Header Alignment
### What changed
- Updated `Today` screen hierarchy to match inspo structure more closely:
  - added the inspo-style header block (`Institute of Natural Law`, weekday title, date/week subtitle),
  - added a prominent session timer hero with inline play/pause control.
- Redesigned `You` tab into an inspo-driven profile dashboard:
  - deep-work bar chart,
  - thesis/workout stat cards,
  - consistency heatmap block,
  - editable semester goal rows.
- Kept all prior `You` functionality active inside the redesigned layout:
  - Google sign-in/out,
  - sync queue/flush actions,
  - exam mode,
  - sunday planning save flow.
- Added a matching top header treatment to `Stats` for visual continuity.
- Corrected primary-button contrast in the updated white-primary palette (`text-bg` on white primary actions).

### What this fixed
- Resolves the remaining major mismatch on profile/personal dashboard styling versus the inspo profile references.
- Removes white-on-white primary button text regressions introduced by token alignment.

### What is still left
- Final parity polish pass for fine-grained spacing/typography consistency across all route details.

## Commit 20 - Today Dashboard Infrastructure Prep
### What changed
- Updated app shell breakpoints to support the provided Today reference behavior:
  - mobile-first narrow shell,
  - desktop-expanded shell width (`~900px`) with hidden bottom nav.
- Added `upsertLoggedSet` to `workoutStore` for deterministic set-row editing (set-index aware) instead of append-only updates.

### What this fixed
- Removes a blocker for implementing the exact desktop/phone Today layout from your HTML while preserving functional workout logging.
- Enables backend-connected workout table inputs that can edit specific set rows directly.

### What is still left
- Full Today page replacement with the exact provided structure and real data wiring for all sections.

## Commit 21 - Today Page Rebuilt from Provided HTML (Phone + Desktop)
### What changed
- Replaced `TodayPage` layout with a React implementation that mirrors the provided HTML structure:
  - header area,
  - timer block,
  - Today task list,
  - Workout log table,
  - Research kanban strip + link,
  - Consistency heatmap/stats,
  - Nutrition task list.
- Added responsive behavior to match both requested breakpoints using the same two-column desktop information architecture.
- Removed placeholder content and connected each section to live app data:
  - Today tasks: `todayStore` completion + study/research/journal/workout data,
  - Workout table: `workoutStore` rows with editable reps persisted via indexed set upserts,
  - Research cards: `researchStore` papers by status,
  - Consistency: computed from `completionByDate` history + streak utilities,
  - Nutrition rows: real meals from IndexedDB (`db.meals` for current date).

### What this fixed
- Resolves the mismatch on the Today screen by implementing your exact supplied design language and structure.
- Replaces static/mock task/nutrition/workout/research placeholders with real backend/store-connected data.

### What is still left
- If you want pixel-level micro-adjustments (spacing/line-height/icon offsets), we can do a final visual tune pass on top of this structure.

## Commit 22 - Remove Stats Route, Remove Seeded Dummy Data, Fix Desktop Nav
### What changed
- Removed the Stats page from routing/navigation entirely:
  - deleted `StatsPage`,
  - removed `/stats` route and bottom-nav tab.
- Fixed desktop navigation visibility:
  - bottom nav is now visible on desktop and centered with fixed max width (no longer hidden behind breakpoint rules).
- Removed seeded dummy records from stores:
  - `scheduleStore`: no preloaded classes/events,
  - `studyStore`: no auto-seeded default study block,
  - `researchStore`: no preloaded project/task/paper data.
- Added `ensurePrimaryProject` in `researchStore` and wired `ResearchPage` to auto-create a primary project only when the user first adds task/paper.
- Removed Semester Goals section from `You` page and replaced static/dummy dashboard numbers with live derived metrics (study/workout/consistency).

### What this fixed
- Aligns the app with your request to remove Stats and remove hardcoded demo seed content.
- Restores bottom navigation visibility on desktop.
- Keeps Research task/paper creation functional after removing pre-seeded project data.

### What is still left
- Today nutrition section conversion to pure consumed-items list + quick JSON/CSV import control (next commit in this sequence).

## Commit 23 - Today Nutrition Table + Quick JSON/CSV Import + README Refresh
### What changed
- Converted Today Nutrition section from task-style rows to a consumed-items intake table, matching the Workout Log interaction pattern.
- Added quick meal import workflow in Today Nutrition:
  - accepts JSON array/object payloads,
  - accepts CSV with common nutrition headers,
  - persists imported entries through IndexedDB (`saveImportedMeals`) and refreshes same-day table data.
- Rewrote `README.md` to reflect current app state:
  - updated route surface (`Today`, `Plan`, `Research`, `You`),
  - removed Stats references,
  - documented quick JSON/CSV nutrition import format with examples,
  - refreshed setup/run/auth instructions for the current implementation.

### What this fixed
- Aligns Today nutrition with your requested non-task log presentation.
- Restores a fast structured meal input path (JSON/CSV) directly from Today.
- Removes stale docs and makes onboarding instructions match the current product state.

### What is still left
- No functional blockers from this request set.

## Commit 24 - Supabase Google OAuth Setup Clarification and Error Handling
### What changed
- Improved Google sign-in error handling in `supabase.ts`:
  - detects Supabase `"Unsupported provider"` responses,
  - returns a clear actionable message indicating Google provider must be enabled in Supabase Auth Providers.
- Updated README Supabase setup instructions with exact Google provider steps:
  - enable provider,
  - add Google client credentials,
  - configure Auth URL settings/redirect allow list for local origin.
- Added explicit note that **Supabase OAuth Server** (`/oauth/consent`) is separate from user social login and not a replacement for enabling Google provider.

### What this fixed
- Resolves ambiguous sign-in failure messaging and directs setup to the correct Supabase dashboard area.
- Prevents confusion between Supabase OAuth Server setup and Google social provider setup.

### What is still left
- Dashboard-side action still required once per Supabase project: enable Google provider and credentials.

---

## Migrated From dayos-app/CHANGELOG.md

# Changelog

## 2026-03-06

### Commit 1
- Fixed mobile overflow issues on Today by removing horizontal bleed in the research lane strip and forcing page content to stay within viewport width.
- Switched bottom navigation from absolute positioning to a sticky floating bar inside the scroll container so it stays visible at the bottom while scrolling.
- Removed the Today "Consistency" section to keep the page focused on quick daily overview.
- Updated Today nutrition rendering to schema-aligned fields and display: `name`, `portion_label`, `calories`, `protein_g`, `carbs_g`, `fats_g` in a mobile-safe list layout.

### Commit 2
- Removed the Research page task board section to simplify the page.
- Reworked manual paper entry into a dedicated drawer opened via a single `Manual Entry` button.
- Kept the main Research surface focused on arXiv import, filters, and the paper log table.

### Commit 3
- Updated the You page header area to show a profile avatar circle with the user name/email-prefix and account email.
- Moved sync/account actions next to the profile block, including `Sync Account`, sign-in/sign-out, and queue status.
- Removed the Sunday Planning section from the You page.

## 2026-03-06 (Current Work Session)

### Commit 4 - Plan Weekly Allocation Map + Recurring Event Drawer
#### What changed
- Rebuilt the `Plan` tab into a weekly time-block map (Mon-Sun columns, time axis, category-colored event blocks) following the provided visual reference.
- Replaced inline event form with a tasteful `Add Event` CTA that opens a bottom drawer.
- Expanded schedule data model to support:
  - start + end time,
  - event categories (`deep`, `thesis`, `health`, `workout`, `deadline`, `exam`, `other`),
  - recurrence (`none`, weekly until date, weekly forever),
  - full CRUD (`add`, `edit`, `delete`).
- Added recurrence-aware event instance helpers for daily/weekly rendering and next-event lookup.
- Updated Today’s next-event lookup to read from the new schedule model.

#### What is still left
- Wire a custom workout builder to workout events so selected workout templates feed Today workout rows on non-rest days.
- Add nutrition "left to hit" stacked bars and calories-left summary above Today meal logs.
- Add persistent macro-goal editor in `You` page and wire it to Today targets.
- Fine-tune Plan map overlap behavior for simultaneous events (currently basic single-column block rendering).
- Brainstormed next-session enrichments:
  - drag-to-resize / drag-to-move schedule blocks,
  - conflict warnings when overlapping high-priority allocations,
  - weekly reflection insights linking planned vs completed time by category.

### Commit 5 - Custom Workout Builder + Workout Events Wiring
#### What changed
- Added a custom workout-template system in `workoutStore` (create/update/delete templates with named exercise rows, sets/reps/load).
- Added a new `Workout Builder` section on the Plan tab for managing workout templates.
- Extended Add/Edit Event drawer: when event type is `workout`, you can now select a workout template or create/edit one inline without leaving the drawer.
- Enforced template selection for workout events to keep workout-event data complete.
- Wired Today workout initialization to schedule events:
  - on non-rest days, if today has a workout event with a template, Today workout log seeds from that template,
  - if the day log is untouched and template changes, it re-seeds safely,
  - workout task title now reflects selected template name when present.

#### What is still left
- Add nutrition "left to hit" bars and calories-left summary above Today meals.
- Add persistent macro-goal controls on You page and connect them to Today nutrition progress.
- Add modify/delete controls for individual logged meals (currently import + read view only).
- Brainstormed next-session enrichments:
  - automatic workout progression suggestions based on recent logged reps/loads,
  - optional workout template version history (track plan changes over time),
  - calendar quick-clone for recurring workout blocks across semester phases.

### Commit 6 - Nutrition Left-to-Hit Bars + Persistent Macro Goal Controls
#### What changed
- Added persisted `setNutritionTargets` action in `todayStore` for default daily macro goals.
- Added a new `Daily Macro Goals` card in the `You` page:
  - editable calories/protein/carbs/fats targets,
  - validation for non-negative values,
  - one-click save confirmation,
  - targets persist and remain active every day until changed.
- Upgraded Today Nutrition section with progress analytics:
  - calories-left header and stacked calorie bar,
  - stacked macro bars for protein/carbs/fats showing consumed vs remaining,
  - per-macro “grams left” and consumed/target values.

#### What is still left
- Optional UX hardening: inline edit/delete for individual meals in Today list.
- Optional schedule polish: visual lane-splitting when events overlap within the same day/time window.
- Optional quality-of-life: event search/filter in Plan (category/date/template).
- Brainstormed next-session enrichments:
  - adaptive macro goal modes (training day vs rest day targets),
  - schedule completion analytics (planned time vs completed checklist by category),
  - template-to-shopping-list helper generated from planned nutrition/workout week.

### Commit 7 - Remove Thesis-Specific Language and Normalize to Generic Projects
#### What changed
- Replaced thesis-specific scheduling category with generic `project` category in the Plan event taxonomy.
- Updated Plan visuals and controls (`legend`, category dropdown, labels) from `Thesis` to `Project`.
- Added compatibility coercion so older persisted `thesis` events are automatically treated as `project` without data loss.
- Removed thesis-institutional copy from key screens:
  - Today header now uses `Daily Allocation`,
  - Research header now uses `Research Workspace`.

#### What is still left
- Implement true project-centric research workflows:
  - project CRUD and active-project switcher in Research tab,
  - project-scoped papers/tasks/worklogs views,
  - per-project exportable worklogs (CSV/JSON/Markdown).
- Add research project metadata model (goal, milestone dates, tags, repository/paper links) and a project overview card.
- Add project-level progress summaries to You/Today surfaces (active project snapshot + upcoming milestones).

### Commit 8 - Project-Centric Research Feature Plan + App-Wide Feature Sweep
#### What changed
- Added a thorough implementation roadmap at `dayos-app/docs/project-research-roadmap.md` covering:
  - target architecture for project-first research workflows,
  - data model changes (`activeProjectId`, project CRUD, first-class worklogs),
  - project-scoped UX plan for Research tab,
  - export design (CSV/JSON/Markdown),
  - migration/compatibility strategy for existing persisted data,
  - phased rollout order.
- Completed an app-wide sweep to identify missing but high-leverage integrations and QoL features.

#### What is still left
- Research project system (core):
  - active project switcher + project CRUD UI,
  - project-scoped paper/task/worklog lists,
  - per-project worklog export actions (CSV/JSON/Markdown).
- Research project system (depth):
  - project milestones, tags, and goal tracking,
  - project-level weekly effort charts (hours/log count),
  - project archive/restore flow.
- Today-Plan-Research wiring:
  - link `project` calendar events to a selected `projectId`,
  - surface upcoming project deadlines directly in Today research card,
  - one-click “log work session” from Today timer completion into active project worklog.
- Nutrition QoL:
  - inline edit/delete for logged meals,
  - meal template quick-add chips in Today nutrition,
  - split targets by day type (training/rest) with automatic fallback.
- Workout QoL:
  - workout template reorder/duplicate,
  - progressive overload hints from recent logged sets,
  - quick “mark rest day override” when schedule changes ad hoc.
- Plan scheduler QoL:
  - drag/move/resize blocks on the weekly map,
  - overlap lane layout for concurrent events,
  - conflict detection + warning chips for hard collisions.
- You page and metrics:
  - unified weekly review card combining study/workout/research/nutrition completion,
  - configurable weekly goal thresholds and alerts,
  - downloadable weekly summary report.
- Offline and sync hardening:
  - explicit sync states per module row (pending/synced/failed),
  - retry-from-item actions for failed queue entries,
  - optional conflict resolution UI for divergent local/remote edits.
- Accessibility and usability:
  - keyboard-first interactions for drawers/tables,
  - stronger focus states + larger hit targets for mobile controls,
  - reduced-motion option for core animated surfaces.
