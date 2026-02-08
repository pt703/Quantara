-- =============================================================================
-- QUANTARA SUPABASE DATABASE SETUP
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)
-- This creates all tables needed for persistent user data storage
-- =============================================================================

-- 1. USER PROFILES
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default 'Learner',
  avatar integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- 2. FINANCIAL SNAPSHOTS
create table if not exists public.financial_snapshots (
  id uuid references auth.users on delete cascade primary key,
  monthly_income numeric default 0,
  monthly_expenses numeric default 0,
  total_debt numeric default 0,
  savings_goal numeric default 0,
  current_savings numeric default 0,
  subscriptions jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.financial_snapshots enable row level security;

create policy "Users can view own financial data"
  on public.financial_snapshots for select
  using (auth.uid() = id);

create policy "Users can insert own financial data"
  on public.financial_snapshots for insert
  with check (auth.uid() = id);

create policy "Users can update own financial data"
  on public.financial_snapshots for update
  using (auth.uid() = id);

-- 3. GAMIFICATION STATS
create table if not exists public.gamification_stats (
  id uuid references auth.users on delete cascade primary key,
  hearts integer default 5,
  total_xp integer default 0,
  today_xp integer default 0,
  level integer default 1,
  streak integer default 0,
  last_activity_date text,
  today_date text,
  updated_at timestamptz default now()
);

alter table public.gamification_stats enable row level security;

create policy "Users can view own gamification"
  on public.gamification_stats for select
  using (auth.uid() = id);

create policy "Users can insert own gamification"
  on public.gamification_stats for insert
  with check (auth.uid() = id);

create policy "Users can update own gamification"
  on public.gamification_stats for update
  using (auth.uid() = id);

-- 4. LEARNING PROGRESS (per-lesson completion tracking)
create table if not exists public.learning_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id text not null,
  course_id text not null,
  status text default 'not_started',
  score numeric default 0,
  accuracy numeric default 0,
  attempts integer default 0,
  completed_at timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

alter table public.learning_progress enable row level security;

create policy "Users can view own learning progress"
  on public.learning_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own learning progress"
  on public.learning_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own learning progress"
  on public.learning_progress for update
  using (auth.uid() = user_id);

-- 5. QUIZ RESULTS (detailed per-question tracking for AI personalization)
create table if not exists public.quiz_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  lesson_id text not null,
  question_id text not null,
  concept_id text,
  domain text not null,
  difficulty text not null,
  difficulty_tier integer,
  is_correct boolean not null,
  response_time_ms integer,
  attempt_number integer default 1,
  is_ai_generated boolean default false,
  created_at timestamptz default now()
);

alter table public.quiz_results enable row level security;

create policy "Users can view own quiz results"
  on public.quiz_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

-- 6. SKILL ACCURACY (aggregated per-domain performance)
create table if not exists public.skill_accuracy (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  domain text not null,
  correct integer default 0,
  total integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, domain)
);

alter table public.skill_accuracy enable row level security;

create policy "Users can view own skill accuracy"
  on public.skill_accuracy for select
  using (auth.uid() = user_id);

create policy "Users can insert own skill accuracy"
  on public.skill_accuracy for insert
  with check (auth.uid() = user_id);

create policy "Users can update own skill accuracy"
  on public.skill_accuracy for update
  using (auth.uid() = user_id);

-- 7. BADGE PROGRESS
create table if not exists public.badge_progress (
  id uuid references auth.users on delete cascade primary key,
  unlocked_badges jsonb default '[]'::jsonb,
  lesson_count integer default 0,
  quiz_count integer default 0,
  perfect_quiz_count integer default 0,
  total_xp integer default 0,
  max_streak integer default 0,
  updated_at timestamptz default now()
);

alter table public.badge_progress enable row level security;

create policy "Users can view own badge progress"
  on public.badge_progress for select
  using (auth.uid() = id);

create policy "Users can insert own badge progress"
  on public.badge_progress for insert
  with check (auth.uid() = id);

create policy "Users can update own badge progress"
  on public.badge_progress for update
  using (auth.uid() = id);

-- INDEX for quiz_results queries (AI personalization lookups)
create index if not exists idx_quiz_results_user_domain 
  on public.quiz_results(user_id, domain);

create index if not exists idx_quiz_results_user_concept 
  on public.quiz_results(user_id, concept_id);

create index if not exists idx_learning_progress_user 
  on public.learning_progress(user_id);
