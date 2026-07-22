/*
# EduInsight — profiles, study_sessions, chat_history

## Purpose
EduInsight is an AI Learning Waste Detector. Students sign in (Supabase email/password auth)
and track study sessions; the app computes focus/efficiency, generates AI insights, and
hosts an AI Coach chat. This migration creates the three core tables and owner-scoped RLS.

## New Tables
1. `profiles`
   - `id` uuid PK, references `auth.users(id)` ON DELETE CASCADE (1:1 with auth user)
   - `full_name` text
   - `email` text
   - `learning_goal` text  (free-text goal used to personalize AI responses)
   - `created_at` timestamptz default now()
2. `study_sessions`
   - `id` uuid PK default gen_random_uuid()
   - `user_id` uuid NOT NULL DEFAULT auth.uid(), references `auth.users(id)` ON DELETE CASCADE
   - `subject` text not null
   - `study_date` date not null
   - `study_time` numeric not null  (minutes)
   - `break_time` numeric not null default 0 (minutes)
   - `distraction_time` numeric not null default 0 (minutes)
   - `notes` text
   - `created_at` timestamptz default now()
3. `chat_history`
   - `id` uuid PK default gen_random_uuid()
   - `user_id` uuid NOT NULL DEFAULT auth.uid(), references `auth.users(id)` ON DELETE CASCADE
   - `title` text not null default 'New Chat'
   - `messages` jsonb not null default '[]'::jsonb  (array of {role, content, ts})
   - `created_at` timestamptz default now()
   - `updated_at` timestamptz default now()

## Security
- RLS enabled on all three tables.
- `profiles`: owner can SELECT and UPDATE only their own row.
- `study_sessions`: owner-scoped CRUD (4 policies: select/insert/update/delete).
- `chat_history`: owner-scoped CRUD (4 policies).
- `user_id` columns default to `auth.uid()` so client inserts that omit `user_id` still
  satisfy the INSERT WITH CHECK predicate.
- Trigger auto-creates a profile row when a new auth user signs up (handles the case where
  the client upsert races or is skipped).

## Notes
1. The `profiles.id` is the same as `auth.users.id` — one row per user.
2. `chat_history.messages` is a JSONB array; the AI Coach appends messages and bumps `updated_at`.
3. A trigger `on_auth_user_created` inserts a minimal profile row for new sign-ups so the
   dashboard never reads an empty profile.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT 'Student',
  email text,
  learning_goal text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- study_sessions
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  study_date date NOT NULL,
  study_time numeric NOT NULL,
  break_time numeric NOT NULL DEFAULT 0,
  distraction_time numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON study_sessions;
CREATE POLICY "sessions_select_own" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON study_sessions;
CREATE POLICY "sessions_insert_own" ON study_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON study_sessions;
CREATE POLICY "sessions_update_own" ON study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON study_sessions;
CREATE POLICY "sessions_delete_own" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, study_date desc);

-- chat_history
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_own" ON chat_history;
CREATE POLICY "chat_select_own" ON chat_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_insert_own" ON chat_history;
CREATE POLICY "chat_insert_own" ON chat_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_update_own" ON chat_history;
CREATE POLICY "chat_update_own" ON chat_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_delete_own" ON chat_history;
CREATE POLICY "chat_delete_own" ON chat_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id, updated_at desc);

-- updated_at bump for chat_history
CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_bump ON chat_history;
CREATE TRIGGER trg_chat_bump BEFORE UPDATE ON chat_history
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, learning_goal)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Student'),
    NEW.email,
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
