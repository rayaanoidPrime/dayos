# Project-Centric Research Roadmap

## Objective
Make Research fully project-first: users can create multiple projects, attach papers/tasks/worklogs per project, and export project worklogs anytime.

## Current Gaps
- Project list exists in state but there is no project CRUD UI or active-project selector.
- Papers are not filtered by selected project in UI.
- Worklogs are not first-class entities; no export pipeline exists.
- Today/You surfaces do not show active project context.

## Data Model Plan
- `ResearchProject`: add `createdAt`, `updatedAt`, optional `goal`, `milestoneDate`, `tags`.
- `ResearchState`: add `activeProjectId`, `setActiveProject`, `addProject`, `updateProject`, `deleteProject`.
- `ResearchWorklog` (new):
  - `id`, `projectId`, `date`, `title`, `summary`, `hours`, `outputs`, `blockers`, `nextSteps`, `updatedAt`.
- Add selectors:
  - `getProjectById`
  - `getPapersByProject`
  - `getTasksByProject`
  - `getWorklogsByProject`

## UX Plan (Research Tab)
1. Add project switcher pill row at top.
2. Add `New Project` drawer (name, description, color, goal, milestone).
3. Scope paper/task table to active project.
4. Add `Worklog` section with quick daily entry and edit/delete.
5. Add `Export Worklog` action for active project:
  - CSV (spreadsheet-friendly),
  - JSON (backup/import),
  - Markdown (share/report).

## Export Plan
- Build `serializeProjectWorklogs(projectId, format)` in `src/lib/researchExport.ts`.
- Include project metadata header in all export formats.
- Use browser file download API and deterministic filenames:
  - `project-name-worklog-YYYY-MM-DD.csv|json|md`.

## Integration Plan
- Today card meta for Research should reference active project task/worklog.
- You page should show active project progress snapshot (open tasks, papers reading, worklog hours this week).
- Plan tab `project` events can optionally reference `projectId` for tighter cross-module context.

## Migration Plan
- If no `activeProjectId`, default to first project.
- Keep existing records; assign any orphaned papers/tasks to auto-created `General Research` project.
- Preserve backward compatibility in persisted state.

## Rollout Phases
1. Store and migration updates.
2. Project selector + CRUD UI.
3. Project-scoped papers/tasks/worklog.
4. Export formats and polish.
5. Cross-tab integrations (Today/You/Plan).
