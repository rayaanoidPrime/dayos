# Feature Sweep: DayOS Daily Planner / Research Worklog

## Goals
- Understand the current capability surface per screen and store.
- Highlight cohesion between modules (Plan → Today → Research → You).
- Capture gaps, friction, and missing wiring that prevent the app from feeling like a unified researcher planner/worklog tracker.

## Screen-by-screen snapshot

### Today
- **Features**: adaptive timer hero, checklist cards, workout log table, research cards, nutrition intake table + quick import.
- **Cohesion**: feeds from workout store, nutrition store (IndexedDB) and schedule events; still needs clearer project/event linkage and meal editing.
- **Gaps**:  
  - No inline meal edits or macro-source tagging.  
  - Research card offers surface-level context; no direct project link or worklog entry creation.  
  - Timer not wired to project worklog or next research task.

### Plan
- **Features**: weekly allocation map, event drawer with recurrence and categories, workout builder and templates.
- **Cohesion**: schedule store powers Today timeline and next-event lookup; workout templates seed workout log.
- **Gaps**:  
  - No project-level linking for `project` events (missing pointer into Research state).  
  - Drag/move, overlap handling, conflict warnings missing.  
  - Add/edit drawer is isolated – no quick export or weekly summary.

### Research
- **Features**: ArXiv import, manual paper drawer, filters, persisted project/task/paper state.
- **Cohesion**: ensures primary project but lacks active project switcher or worklog insights.
- **Gaps**:  
  - No active project selector or metadata (goal/milestone).  
  - Worklogs are missing entirely (no capture of hours/outputs).  
  - No export path for project docs (CSV/JSON/MD).

### You
- **Features**: profile/auth, sync controls, consistency heatmaps, study/workout metrics, macro goals.
- **Cohesion**: aggregates store data but lacks explicit active project or aggregated worklogs.
- **Gaps**:  
  - No weekly review export; no configurable alerts for high-level goals.  
  - Metrics are module-specific, not tied into project-level narratives.

## Store-level observations
- `scheduleStore`: robust recurrent event model and recurrence helpers, missing project linkage and conflict tracking.
- `workoutStore`: templates/workout logs with template seeding; missing overload hints and rest-day overrides.
- `todayStore`: macros, completion, water. No meal editing (CRUD) or target variation by day type.
- `researchStore`: projects/papers/tasks but no worklog entity, no active project pointer; ensures default project.

## Cohesion opportunities
1. Link `project` events in Plan to `researchStore.activeProjectId`, surface upcoming deadlines in Today, and allow logging work sessions from timer completion.
2. Make Research exports part of Plan/You reporting (e.g., “export this week’s research log as Markdown”).
3. Surface macro intake/workout progress in You as part of weekly review.

## Missing wiring & ease-of-life ideas
- Inline meal edit/delete + per-meal macro breakdown.
- Research-side worklog capture: log journal/notes/hours, link to project, export.
- Workout template versioning + quick rest-day override toggles.
- Plan map drag/resize and conflict detection badges.
- Weekly review export via You page (PDF/Markdown summary).
- Sync diagnostics per module row (pending/synced/failed).
- Keyboard-first drawer navigation and reduced-motion toggles.

