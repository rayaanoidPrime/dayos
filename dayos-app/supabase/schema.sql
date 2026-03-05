-- DayOS Supabase schema (v1 local-first alignment)
-- Apply with Supabase SQL editor or CLI migration.

create extension if not exists "pgcrypto";

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  session_type text not null,
  exercises jsonb not null default '[]'::jsonb,
  duration_mins integer not null default 0,
  notes text,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  portion_label text not null default '',
  protein_g numeric not null default 0,
  fats_g numeric not null default 0,
  carbs_g numeric not null default 0,
  calories numeric not null default 0,
  source text not null check (source in ('manual', 'import')),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.study_blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  subject text not null,
  topic text,
  target_mins integer not null default 25,
  pomodoros_done integer not null default 0,
  completed boolean not null default false,
  paused_at timestamptz,
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.scratch_notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  pinned boolean not null default false,
  promoted_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.sunday_plans (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  workout_intentions text not null default '',
  study_intentions text not null default '',
  research_intentions text not null default '',
  weekly_goal text not null default '',
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unique (user_id, week_start_date)
);

create table if not exists public.exam_mode_config (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default false,
  exam_title text not null default '',
  exam_date date,
  hidden_modules text[] not null default array[]::text[],
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

alter table public.workouts enable row level security;
alter table public.meals enable row level security;
alter table public.study_blocks enable row level security;
alter table public.scratch_notes enable row level security;
alter table public.sunday_plans enable row level security;
alter table public.exam_mode_config enable row level security;

create policy "own workouts" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own meals" on public.meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own study_blocks" on public.study_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own scratch_notes" on public.scratch_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own sunday_plans" on public.sunday_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exam_mode_config" on public.exam_mode_config for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
