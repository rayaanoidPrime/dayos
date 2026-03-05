**DayOS**

Daily Operating System for the Focused Researcher

Product Requirements Document --- v1.1

  ----------------------------------- -----------------------------------
  **Version**                         1.1 --- Iterated from Open
                                      Questions

  **Platform**                        Progressive Web App (PWA)

  **Audience**                        MTech Robotics --- IISc Bengaluru

  **Primary Device**                  Mobile First (iOS & Android)

  **Backend**                         Supabase (PostgreSQL + Auth +
                                      Realtime)

  **Status**                          Draft --- Pending Developer Handoff
  ----------------------------------- -----------------------------------

**1. Executive Summary**

DayOS is a mobile-first Progressive Web App designed specifically for
graduate researchers juggling academic workloads, fitness goals, and
deep research. The product replaces the fragmented habit of using
separate apps for gym tracking, food logging, study timers, and project
management with a single, opinionated daily command centre.

The app is task-checklist driven --- meaning the primary interaction
model is a structured daily card that the user works through each day,
not a passive analytics dashboard. Everything is logged in context,
inline, and fast. End-of-day data is synced to Supabase for persistence
and cross-device access, with full offline-first support via a service
worker.

**2. Goals & Non-Goals**

**2.1 Goals**

-   Give the user a single, zero-friction daily view of everything that
    matters: workouts, nutrition, classes, study blocks, research tasks,
    and journalling.

-   Ensure the app works completely offline --- all data is written
    locally first, then synced to Supabase in the background.

-   Be installable as a home-screen PWA on both Android and iOS with no
    App Store required.

-   Keep logging fast --- any single log action should require no more
    than 3 taps or inputs.

-   Surface lightweight progress signals (streaks, weekly summaries)
    without overwhelming the user with charts.

**2.2 Non-Goals (v1)**

-   Social or sharing features.

-   AI-generated recommendations or coaching.

-   Integration with wearables (Garmin, Apple Watch) --- deferred to v2.

-   Custom recurring reminders per-habit --- v1 supports a single
    configurable daily reminder time.

-   Multi-user or team features.

**3. User Persona**

+-----------------------------------------------------------------------+
| **The IISc Researcher-Athlete**                                       |
|                                                                       |
| Age: 22--26 · Degree: M.Tech Robotics · Location: IISc Campus,        |
| Bengaluru                                                             |
|                                                                       |
| Has 3--5 hours of structured coursework per day, plus research lab    |
| time that is largely self-directed. Trains 4--5 days a week. Eats     |
| primarily at the mess with occasional outside food. Reads 2--4        |
| research papers per week. Struggles to maintain consistency on all    |
| fronts simultaneously --- a good gym week often means a bad study     |
| week and vice versa.                                                  |
|                                                                       |
| Core frustration: Too many apps, too much friction. Needs one place   |
| to see if today is 'on track' or not.                                 |
+-----------------------------------------------------------------------+

**4. Information Architecture**

The app has five top-level tabs accessible via a persistent bottom
navigation bar:

  ------------------------------------------------------------------------
  **Tab**    **Icon**     **Description**
  ---------- ------------ ------------------------------------------------
  Today      🏠 Home      The daily checklist --- the app's primary view.
                          One scrollable card per module.

  Schedule   📅 Calendar  Timetable view of the week with classes, lab
                          slots, and deadlines.

  Research   🔬 Flask     Project tracker with tasks, paper log, and lab
                          hours.

  Stats      📊 Chart     Weekly summaries for each module. Streaks and
                          completion rates.

  Settings   ⚙️ Gear      Profile, Supabase sync status, notification
                          preferences, data export.
  ------------------------------------------------------------------------

**5. Module Specifications**

**5.1 Today --- The Daily Checklist**

The Today screen is the app's centrepiece. It renders a vertically
scrollable list of module cards for the current day. Each card has a
header with a completion ring and an expand/collapse chevron. Cards are
ordered by the user's configured priority.

**Behaviour**

-   Cards default to expanded on first open of the day, and remember
    their collapse state after.

-   A 'Day complete!' celebration state is shown when all mandatory
    items in all cards are checked off.

-   A persistent top banner shows the date, day streak, and a
    motivational one-liner (rotated daily from a static list).

-   Pull-to-refresh triggers a Supabase sync.

**5.2 Workout & Fitness Card**

**Features**

-   User pre-configures a weekly training split (e.g.,
    Push/Pull/Legs/Rest). The card shows today's session type
    automatically.

-   Exercises are added as a checklist. Each item shows: Exercise name,
    sets × reps, weight (optional).

-   Long-press on a set to log actual values (vs planned), enabling
    progressive overload tracking.

-   A 'Rest day' card variant replaces the checklist with a recovery
    prompt and optional note.

-   Weekly volume summary available in Stats tab.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  session_type       enum            push / pull / legs / upper / lower /
                                     cardio / rest

  exercises          array           Each: { name, planned_sets,
                                     planned_reps, weight_kg,
                                     logged_sets\[\] }

  duration_mins      integer         Total session duration

  notes              text            Optional free-text

  completed          boolean         Marks the workout as done for the
                                     day
  -----------------------------------------------------------------------

**5.3 Macro & Nutrition Card**

**Features**

-   User sets daily macro targets: calories, protein (g), fats (g),
    carbs (g). These are stored in user_preferences.

-   Meals can be logged in two ways: (1) Manual entry --- type a meal
    name and enter values for each macro column directly. (2) Markdown
    table import --- user pastes a markdown-formatted table; the app
    parses it and creates one meal entry per row automatically.

-   Calories in the import table are used as-is. Auto-computation from
    macros (P×4 + C×4 + F×9) is a fallback only, used when the Calories
    column is empty or absent.

-   Frequently used meals are saved as templates for 1-tap reuse.

-   A horizontal macro progress bar (Protein · Fats · Carbs) with
    calorie total updates live as meals are added.

-   Water intake tracker: quick +200ml / +500ml buttons with a daily
    goal ring.

**Markdown Import Specification**

The import parser must handle tables in the following exact format,
which the user will paste from their own nutrition log:

+-----------------------------------------------------------------------+
| **Expected column order (case-insensitive header match):**            |
|                                                                       |
| Item \| Portion \| Calories \| Protein (g) \| Fats (g) \| Carbs (g)   |
|                                                                       |
| **Example rows:**                                                     |
|                                                                       |
| Naan (4 small halves) \| 2 whole \| 380 \| 10 \| 10 \| 62             |
|                                                                       |
| Shahi Paneer Cubes \| \~5-6 pieces \| 100 \| 8 \| 7 \| 2              |
|                                                                       |
| TOTAL \| \| 1,410 \| 51g \| 61g \| 172g                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **Parser Rule**       **Detail**
  --------------------- -------------------------------------------------
  Column delimiter      Pipe character \| with flexible surrounding
                        whitespace

  Header row            First row; matched case-insensitively. \'Protein
                        (g)\', \'Fats (g)\', \'Carbs (g)\' are the
                        canonical names.

  Separator row         Row of dashes (\-\--\|\-\--\|\-\--) is detected
                        and skipped automatically

  TOTAL row             Any row where Item column equals \'TOTAL\'
                        (case-insensitive) is skipped --- not logged as a
                        meal entry

  Portion column        Stored as a plain string. Not parsed or computed.

  Numeric cleaning      Commas stripped (1,410 → 1410). Unit suffixes
                        stripped (51g → 51). Tilde prefix stripped (\~5 →
                        5 but stored as label).

  Calories fallback     If Calories cell is empty or 0, compute as:
                        (Protein × 4) + (Carbs × 4) + (Fats × 9)

  Validation            Warn (non-blocking) if a row has fewer than 4
                        filled numeric columns. Skip silently if Item
                        name is empty.

  Import UX             After paste, show a preview table of parsed rows
                        before confirming. User can deselect individual
                        rows before saving.
  -----------------------------------------------------------------------

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  meals              array           Each: { name, portion_label,
                                     protein_g, fats_g, carbs_g,
                                     calories, source: manual\|import }

  water_ml           integer         Cumulative for the day

  targets            object          { calories, protein_g, carbs_g,
                                     fat_g } --- user profile

  meal_templates     array           Saved quick-log templates
  -----------------------------------------------------------------------

**5.4 Study Sessions & Pomodoro Card**

**Features**

-   User creates study blocks for the day: subject/course name, target
    duration, and optional topic.

-   Each block has an embedded Pomodoro timer (default: 25 min work / 5
    min break, configurable).

-   The Pomodoro timer pauses automatically when the app is backgrounded
    on mobile. It does not continue silently. A local notification fires
    when the timer is paused due to backgrounding, prompting the user to
    return.

-   Completed pomodoros are shown as filled tomato icons on the block.

-   Total focused time for the day is shown in the card header.

-   Subjects are colour-tagged and carry over to the Schedule tab for
    consistency.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  blocks             array           Each: { subject, topic, target_mins,
                                     pomodoros_done, completed }

  pomodoro_config    object          { work_mins, break_mins,
                                     long_break_mins, cycles_before_long
                                     }

  total_focus_mins   integer         Computed: sum of actual time across
                                     blocks
  -----------------------------------------------------------------------

**5.5 Timetable & Class Schedule**

**Features**

-   User inputs their semester timetable once (course name, day of week,
    start/end time, room/mode).

-   The Today card shows today's classes as a read-only timeline.

-   The Schedule tab shows a full weekly grid view.

-   One-time events and deadlines (exams, assignment submissions, lab
    reports) can be added to any date.

-   Deadlines within the next 7 days surface as a pinned banner on the
    Today screen.

**Data Fields**

  ------------------------------------------------------------------------
  **Field**           **Type**        **Notes**
  ------------------- --------------- ------------------------------------
  recurring_classes   array           Each: { course, day_of_week,
                                      start_time, end_time, room, mode }

  events              array           Each: { title, date, time, type:
                                      deadline\|exam\|other, notes }
  ------------------------------------------------------------------------

**5.6 Research & Project Progress**

**Features**

-   User creates one or more Projects (e.g., 'M.Tech Thesis', 'Course
    Project --- ME256').

-   Each project has a Kanban-lite task list with three columns: To Do,
    In Progress, Done.

-   Today's research card shows tasks marked 'In Progress' as the active
    checklist for the day.

-   A Paper Reading Log is attached to each project: title, arXiv ID,
    status (to-read / reading / done), date read, and a notes field.

-   arXiv ID autofill: when the user enters an arXiv ID (e.g.,
    2304.01234), the app calls the arXiv API to auto-populate the paper
    title, authors, and abstract. Works online only; degrades gracefully
    to manual entry when offline.

-   Task completion rates are shown in the Stats tab per project.

-   Note: lab hours are not tracked. Research tasks and paper reading
    are the sole units of research progress in DayOS.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  projects           array           Each: { name, description,
                                     colour_tag, tasks\[\], papers\[\] }

  tasks              array           Each: { title, status, due_date,
                                     notes, project_id }

  papers             array           Each: { title, authors, abstract,
                                     arxiv_id, status, date_added,
                                     date_read, notes }
  -----------------------------------------------------------------------

**5.7 Daily Journal & Reflection**

**Features**

-   A single free-text journal card at the bottom of Today's checklist.

-   Three optional prompt fields to structure the entry: 'Highlight of
    the day', 'What slowed me down', and 'Tomorrow's #1 priority'.

-   User can toggle between prompted mode and a blank free-write mode.

-   Entries are searchable from the Stats tab by keyword.

**Sunday Planning Mode**

-   Every Sunday, the journal card expands into a full Sunday Review &
    Weekly Plan.

-   The review section contains: 'Weekly highlight', 'What I'd do
    differently', and a read-only summary of the week's completed tasks
    across all modules.

-   The planning section lets the user set intentions for the coming
    week across each module: 3 research tasks to move forward, study
    subjects to focus on, workout split for the week, and one personal
    goal.

-   Weekly plan data is stored and surfaced as a collapsible reference
    banner on each day of the following week's Today screen.

**Data Fields**

  ----------------------------------------------------------------------------
  **Field**               **Type**        **Notes**
  ----------------------- --------------- ------------------------------------
  date                    date            ISO date for the entry

  highlight               text            Optional prompted field

  blockers                text            Optional prompted field

  top_priority_tomorrow   text            Optional prompted field

  free_text               text            Unstructured journal body

  weekly_review           text            Sunday only: reflection field

  weekly_plan             JSONB           Sunday only: { research_tasks\[\],
                                          study_subjects\[\], workout_split,
                                          personal_goal }
  ----------------------------------------------------------------------------

**5.8 Quick Scratchpad**

**Features**

-   A floating action button (FAB) visible on all screens, positioned
    above the bottom nav bar.

-   Tapping it opens a lightweight bottom sheet modal with a single text
    area. No titles, no categories --- just write.

-   Each note is saved with a timestamp and stored in a dedicated
    scratchpad log.

-   The full scratchpad history is accessible from the Stats tab under a
    'Notes' section, searchable by keyword.

-   Notes are local-first (IndexedDB) and sync to Supabase in the
    background like all other data.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  content            text            The note body

  created_at         timestamp       Auto-set on creation

  context_screen     text            Which tab was open when note was
                                     created (optional, for context)
  -----------------------------------------------------------------------

**6. PWA & Technical Requirements**

**6.1 Offline-First Architecture**

-   All writes go to IndexedDB first. A background sync queue (via
    Service Worker) flushes to Supabase when connectivity is restored.

-   The app must be fully functional with no network connection. The
    only degraded state is sync lag.

-   Conflict resolution: last-write-wins per record, keyed on updated_at
    timestamp.

**6.2 Installability**

-   Must include a valid Web App Manifest: name, short_name, icons
    (192px, 512px, maskable), theme_color, background_color, display:
    standalone, orientation: portrait.

-   Lighthouse PWA score target: ≥90.

-   App should prompt install on second session or after one week of use
    (not on first launch).

**6.3 Push Notifications**

-   Single configurable daily reminder: user sets a time (e.g., 7:00
    AM). Notification reads: 'Your DayOS is ready --- tap to start your
    day.'

-   Optional workout reminder if no workout logged by a user-set cutoff
    time (e.g., 7:00 PM).

-   Optional Pomodoro session end alerts (local notifications only, no
    server push needed for this).

-   Notifications use the Web Push API with a Supabase Edge Function as
    the VAPID push server.

**6.4 Backend --- Supabase**

A single personal Supabase project is sufficient for v1. No
multi-environment (dev/prod) setup is required. The developer should use
a single project with RLS enforced throughout.

  -----------------------------------------------------------------------
  **Service**            **Usage**
  ---------------------- ------------------------------------------------
  Auth                   Magic link email auth (no password). Single user
                         assumed for v1.

  PostgreSQL             Primary persistence layer. All module data
                         tables.

  Realtime               Optional --- for future multi-device live sync.

  Edge Functions         VAPID push notification delivery.

  Storage                Not required in v1.
  -----------------------------------------------------------------------

**7. UX & Design Guidelines**

**7.1 Visual Language**

  -----------------------------------------------------------------------
  **Token**          **Value**
  ------------------ ----------------------------------------------------
  Primary            #3A86FF --- Electric Blue

  Background         #FFFFFF --- Pure White

  Surface            #F7F8FA --- Off-White (cards)

  Border             #E8E8E8 --- Hairline

  Text Primary       #1A1A2E --- Near Black

  Text Secondary     #6B7280 --- Muted Gray

  Success            #10B981 --- Emerald

  Warning            #F59E0B --- Amber

  Font               Inter (Google Fonts) --- 400, 500, 600, 700

  Border Radius      12px for cards, 8px for inputs, 999px for
                     pills/buttons
  -----------------------------------------------------------------------

**7.2 Mobile UX Constraints**

-   Bottom navigation bar --- no hamburger menus.

-   All tap targets ≥48px height.

-   Cards use full-width layout with 16px horizontal padding.

-   No horizontal scrolling on the Today screen.

-   Swipe-to-complete on checklist items (right swipe = done, left swipe
    = delete).

-   Haptic feedback on task completion (if supported by device).

**8. Supabase Schema Overview**

All tables include id (UUID), user_id (FK to auth.users), created_at,
and updated_at. Row Level Security (RLS) must be enabled on all tables,
restricting access to the owning user_id.

  -----------------------------------------------------------------------
  **Table**             **Key Columns**
  --------------------- -------------------------------------------------
  daily_checklist       date, status (complete/partial/missed),
                        workout_done, nutrition_logged, study_done,
                        journal_done

  workouts              date, session_type, exercises (JSONB),
                        duration_mins, notes

  nutrition_logs        date, meals (JSONB), water_ml, import_source
                        (manual\|markdown)

  meal_templates        name, protein_g, fats_g, carbs_g, calories
                        (auto-computed fallback)

  study_blocks          date, subject, topic, target_mins,
                        pomodoros_done, paused_at

  timetable             course, day_of_week, start_time, end_time, room,
                        mode

  events                title, date, time, type (deadline/exam/other),
                        notes

  projects              name, description, colour_tag

  tasks                 project_id, title, status, due_date, notes

  papers                project_id, title, authors, arxiv_id, status,
                        date_read, notes

  journal_entries       date, highlight, blockers, top_priority_tomorrow,
                        free_text, weekly_reflection

  scratch_notes         id, content, created_at, pinned

  sunday_plans          week_start_date, workout_intentions,
                        study_intentions, research_intentions,
                        weekly_goal

  exam_mode_config      active, exam_title, exam_date, hidden_modules
                        (JSONB)

  user_preferences      daily_reminder_time, workout_cutoff_time,
                        pomodoro_config (JSONB), macro_targets (JSONB),
                        card_order (JSONB)
  -----------------------------------------------------------------------

**9. Recommended Tech Stack**

  -----------------------------------------------------------------------
  **Layer**          **Choice**             **Rationale**
  ------------------ ---------------------- -----------------------------
  Frontend           React + Vite           Fast build, great PWA plugin
                                            ecosystem

  Styling            Tailwind CSS           Utility-first, easy
                                            mobile-first layout

  State              Zustand + React Query  Lightweight global state +
                                            async cache

  Offline DB         Dexie.js (IndexedDB)   Simple IndexedDB wrapper with
                                            sync hooks

  Service Worker     Workbox (via           Precaching, background sync,
                     vite-plugin-pwa)       push

  Backend            Supabase JS SDK v2     Auth, DB, Realtime, Edge
                                            Functions

  Push               Web Push + Supabase    VAPID keys, server-side
                     Edge Fn                delivery

  Hosting            Vercel or Netlify      Easy PWA deploy, HTTPS by
                                            default
  -----------------------------------------------------------------------

**10. Suggested Development Milestones**

  ---------------------------------------------------------------------------
  **Sprint**   **Focus**          **Deliverable**
  ------------ ------------------ -------------------------------------------
  1            Foundation         Vite PWA scaffold, Supabase auth (magic
                                  link), IndexedDB + Dexie setup, bottom nav
                                  shell

  2            Today Screen       Daily checklist card container, missed-day
                                  marking logic, timetable display, deadline
                                  banner

  3            Fitness &          Workout card, macro card with MD table
               Nutrition          import parser, progress bars, meal
                                  templates, water tracker

  4            Study & Research   Pomodoro card (with backgrounding pause),
                                  study blocks, project/task manager, paper
                                  log + arXiv autofill

  5            Journal & New      Journal card, Sunday planning mode, Quick
               Modules            Scratchpad FAB, Exam Mode toggle

  6            Stats & Polish     Stats tab (weekly summaries, streaks,
                                  missed-day heatmap), Sunday review
                                  surfacing

  7            PWA & Push         Service worker, offline sync, push
                                  notifications, install prompt, Lighthouse
                                  audit ≥90

  8            Beta & Bugfix      Device testing (Android + iOS Safari),
                                  performance tuning, Settings screen, edge
                                  cases
  ---------------------------------------------------------------------------

**11. New Modules (Added in v1.1)**

**11.1 Quick Scratchpad**

A persistent floating action button (FAB) visible on every screen.
Tapping it opens a bottom-sheet note editor for zero-friction capture of
ideas, paper references, or task reminders mid-class --- without losing
your place in the app.

**Features**

-   FAB sits just above the bottom nav bar. Tapping opens a bottom-sheet
    modal with a single text area.

-   Notes save automatically as the user types (debounced 500ms). No
    save button.

-   All scratch notes are listed in a 'Notes' sheet accessible from the
    FAB long-press.

-   Notes can be pinned to stay at the top, or promoted into a Research
    task or Journal entry via a long-press context menu.

-   Fully offline-first. Syncs to Supabase with all other data.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  id                 UUID            Primary key

  content            text            The note body

  pinned             boolean         Whether pinned to top of list

  created_at         timestamp       Auto-set on creation

  promoted_to        enum \| null    task / journal / null
  -----------------------------------------------------------------------

**11.2 Sunday Planning Mode**

Every Sunday, a 'Plan Your Week' card surfaces at the top of the Today
screen. A lightweight weekly intention-setting flow --- not a rigid
schedule builder. The resulting plan stays visible as a collapsed banner
throughout the week.

**Features**

-   Auto-triggered on Sundays. Also accessible manually from Settings at
    any time.

-   Four short intention fields: (1) Workout plan --- which sessions
    this week, (2) Study focus --- subjects or topics to prioritise, (3)
    Research goal --- one concrete output for the week, (4) Weekly
    intention --- one free-text sentence about the week's theme.

-   Once completed, intentions display as a read-only collapsed banner
    on Today for Monday--Saturday.

-   Past Sunday plans are archived in the Stats tab for weekly
    retrospectives.

**Data Fields**

  --------------------------------------------------------------------------
  **Field**             **Type**        **Notes**
  --------------------- --------------- ------------------------------------
  week_start_date       date            ISO date of the Monday of that week

  workout_intentions    text            E.g. 'PPL + 1 cardio session'

  study_intentions      text            E.g. 'Finish ME256 module 4'

  research_intentions   text            E.g. 'Complete literature review
                                        draft'

  weekly_goal           text            One-sentence theme for the week
  --------------------------------------------------------------------------

**11.3 Exam Mode**

A toggle in Settings and via a chip on the Today banner. When active,
Exam Mode strips the Today screen to study essentials --- removing
workout and nutrition noise during crunch periods. Data is never
deleted; modules are only hidden from the Today view.

**Behaviour**

-   When ON: Today screen shows only the Study card, Research card
    (tasks only), and Journal card. Workout and Nutrition cards are
    hidden from Today but remain accessible via their respective tabs.

-   The Today banner shows a red 'EXAM MODE' chip with a live countdown:
    e.g. 'Exam in 3 days'.

-   User sets an exam title and date on activation. Multiple exams can
    be queued.

-   Exam Mode auto-deactivates the day after the exam date, with a
    confirmation prompt before turning off.

**Data Fields**

  -----------------------------------------------------------------------
  **Field**          **Type**        **Notes**
  ------------------ --------------- ------------------------------------
  active             boolean         Whether Exam Mode is currently on

  exam_title         text            E.g. 'ME256 Mid-sem'

  exam_date          date            Auto-deactivation trigger date

  hidden_modules     JSONB           Array of module keys e.g.
                                     \['workout', 'nutrition'\]
  -----------------------------------------------------------------------

**12. Changelog**

  ---------------------------------------------------------------------------
  **Version**   **Date**     **Summary**
  ------------- ------------ ------------------------------------------------
  v1.1          Current      Resolved all 6 open questions. Removed lab hours
                             entirely. Added Quick Scratchpad, Sunday
                             Planning Mode, Exam Mode (focus strip). Added
                             markdown nutrition import + arXiv autofill.
                             Updated schema, milestones, and decisions log.

  v1.0          Prior        Initial PRD. 7 modules specced. Supabase +
                             offline-first architecture defined. Tech stack
                             selected.
  ---------------------------------------------------------------------------

**13. Decisions Log**

All open questions from PRD v1.0 have been resolved. The following
decisions are locked for v1 and should not require further discussion
with the developer.

  -----------------------------------------------------------------------
  **Decision**                **Resolution**
  --------------------------- -------------------------------------------
  Pomodoro backgrounding      Timer pauses when app is backgrounded. A
                              local notification fires to prompt the user
                              to return. No background countdown.

  Lab hours tracking          Removed entirely. Not relevant to the
                              user's workflow. Research progress is
                              tracked via tasks and paper reading only.

  Calorie & macro entry       Two modes: manual entry and markdown table
                              paste. Calories in the table are used
                              directly. Auto-compute (P×4 + C×4 + F×9) is
                              fallback only when Calories column is
                              empty. Column order: Item \| Portion \|
                              Calories \| Protein \| Fats \| Carbs.

  Missed days                 A day with no logged checklist activity is
                              marked as 'missed'. Missed days break the
                              streak. They are not skipped or ignored in
                              the Stats view.

  Supabase environment        A single personal Supabase project is
                              sufficient for v1. No dev/prod split
                              required.

  arXiv autofill              Supported. Entering an arXiv ID triggers an
                              API call to auto-fill title, authors, and
                              abstract. Degrades gracefully to manual
                              entry when offline.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  **✅ PRD v1.1 --- All decisions locked. Ready for developer handoff.**

  -----------------------------------------------------------------------
