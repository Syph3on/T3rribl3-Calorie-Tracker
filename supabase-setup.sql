-- =============================================================================
-- MULTI-USER MIGRATION — run this in Supabase SQL Editor
-- Turns the calorie tracker + coach chat from "single shared list" into
-- "each visitor gets their own private data", using anonymous auth.
-- =============================================================================

-- Step 1 (do this in the Dashboard, not SQL):
-- Authentication -> Providers -> scroll to "Anonymous Sign-Ins" -> enable it.
-- Without this enabled, the anonymous sign-in call from the frontend will fail.

-- Step 2: run everything below in SQL Editor -> New query -> Run.

-- If you're setting this up fresh (never ran the old supabase-setup.sql):
create table if not exists calorie_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  food text not null,
  calories int not null
);

create table if not exists profile (
  id int primary key,
  sprite_url text
);

-- Add a user_id column so each row can be tied to a specific anonymous user.
-- Safe to run even if you already have data — existing rows just get user_id = null,
-- which means they'll become invisible under the new policies below (harmless;
-- delete them via Table Editor if you want a clean slate).
alter table calorie_entries
  add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- Remove the old "anyone can do anything" policy — that's what let random
-- visitors read/write everyone's data.
drop policy if exists "public can do anything to calorie_entries" on calorie_entries;

alter table calorie_entries enable row level security;

drop policy if exists "users can view their own calorie_entries" on calorie_entries;
create policy "users can view their own calorie_entries"
  on calorie_entries for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own calorie_entries" on calorie_entries;
create policy "users can insert their own calorie_entries"
  on calorie_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own calorie_entries" on calorie_entries;
create policy "users can update their own calorie_entries"
  on calorie_entries for update
  using (auth.uid() = user_id);

drop policy if exists "users can delete their own calorie_entries" on calorie_entries;
create policy "users can delete their own calorie_entries"
  on calorie_entries for delete
  using (auth.uid() = user_id);

-- New table: persisted coach chat history, per user.
create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  file_names text[],
  created_at timestamptz default now()
);

alter table coach_messages enable row level security;

drop policy if exists "users can view their own coach_messages" on coach_messages;
create policy "users can view their own coach_messages"
  on coach_messages for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own coach_messages" on coach_messages;
create policy "users can insert their own coach_messages"
  on coach_messages for insert
  with check (auth.uid() = user_id);

-- profile table: this is YOUR single character portrait, not per-visitor
-- data, so there's no per-user split here — but RLS still needs to be
-- explicitly turned on with an explicit policy, or Supabase either leaves
-- it wide open with no policy at all (bad) or locks it to nobody (also bad).
alter table profile enable row level security;

drop policy if exists "public can read profile" on profile;
create policy "public can read profile"
  on profile for select
  using (true);

drop policy if exists "public can write profile" on profile;
create policy "public can write profile"
  on profile for all
  using (true)
  with check (true);

-- Make user_id references cascade: deleting an old anonymous user (see the
-- cleanup query at the bottom of this file) automatically cleans up their
-- calorie entries and chat history too, in one step.
alter table calorie_entries drop constraint if exists calorie_entries_user_id_fkey;
alter table calorie_entries add constraint calorie_entries_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table coach_messages drop constraint if exists coach_messages_user_id_fkey;
alter table coach_messages add constraint coach_messages_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Note: the `profile` table (your sprite image) is intentionally left alone —
-- that's YOUR character portrait, not something visitors get their own copy of.

-- =============================================================================
-- MACROS + CUSTOM DAILY GOAL — run this if you already ran everything above.
-- =============================================================================

-- Optional macro fields per entry. Nullable — a food can be logged with just
-- calories, same as before; protein/fat/carbs are opt-in extras.
alter table calorie_entries
  add column if not exists protein_g numeric,
  add column if not exists fat_g numeric,
  add column if not exists carbs_g numeric;

-- Each user's own targets, instead of one hardcoded number for everyone.
-- Macro goals are optional (null = "not tracking that macro").
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calorie_goal int not null default 2200,
  daily_protein_goal int,
  daily_fat_goal int,
  daily_carb_goal int,
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

drop policy if exists "users can view their own settings" on user_settings;
create policy "users can view their own settings"
  on user_settings for select
  using (auth.uid() = user_id);

drop policy if exists "users can insert their own settings" on user_settings;
create policy "users can insert their own settings"
  on user_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update their own settings" on user_settings;
create policy "users can update their own settings"
  on user_settings for update
  using (auth.uid() = user_id);

-- =============================================================================
-- USER-CONTROLLED DATES — run this if you already ran everything above.
-- Lets entries be logged for any day (past or future), not just "right now".
-- created_at stays as pure "when this row was actually inserted" audit info;
-- log_date is the day it should count toward, and is what day-grouping uses.
-- =============================================================================
alter table calorie_entries
  add column if not exists log_date date not null default current_date;

-- Backfill: give existing rows their real day based on when they were
-- actually created, instead of all landing on "whatever day this migration
-- happened to run". Safe to re-run — rows genuinely from today are
-- unaffected either way.
update calorie_entries
set log_date = created_at::date
where log_date = current_date;

-- =============================================================================
-- OPTIONAL CLEANUP — run this occasionally (manually), not part of setup.
-- Supabase doesn't auto-delete abandoned anonymous users yet, so if you want
-- to reclaim space from visitors who never came back, run this yourself
-- whenever you like (e.g. monthly). Deletes anonymous users inactive 30+ days
-- — their calorie_entries/coach_messages rows go with them automatically
-- thanks to the cascade above.
-- =============================================================================
-- delete from auth.users
-- where is_anonymous is true
--   and created_at < now() - interval '30 days';
