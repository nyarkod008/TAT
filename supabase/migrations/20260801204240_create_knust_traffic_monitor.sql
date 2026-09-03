
/*
# KNUST Traffic Monitor - Initial Schema

## Summary
Creates the core tables for the KNUST campus traffic monitoring application.

## New Tables

### `profiles`
Stores lightweight display names for anonymous users identified by a client-generated UUID stored in localStorage.
- `id` (uuid, primary key) — client-generated identity
- `name` (text) — display name chosen by the user
- `created_at` (timestamptz)

### `traffic_reports`
Stores all traffic incident reports submitted by campus users.
- `id` (uuid, primary key)
- `user_id` (uuid, nullable FK → profiles.id)
- `reporter_name` (text) — denormalised name at report time
- `report_type` (text) — one of: heavy_traffic, accident, road_blockage, road_construction
- `latitude` (float8) — GPS latitude
- `longitude` (float8) — GPS longitude
- `landmark` (text) — nearest named KNUST landmark
- `description` (text) — optional free-text details
- `image_url` (text) — optional photo URL
- `created_at` (timestamptz)
- `expires_at` (timestamptz) — auto-expires 4 hours after creation
- `status` (text) — active | cleared
- `active_votes` (int) — community "Still Active" votes
- `cleared_votes` (int) — community "Cleared" votes

## Security
- RLS enabled on both tables.
- Both tables are fully open to anon + authenticated (no sign-in required for MVP).
- This is intentional: the app is a public community reporting tool.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO anon, authenticated USING (false);

-- Traffic reports table
CREATE TABLE IF NOT EXISTS public.traffic_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name text NOT NULL DEFAULT 'Anonymous',
  report_type text NOT NULL CHECK (report_type IN ('heavy_traffic', 'accident', 'road_blockage', 'road_construction')),
  latitude float8 NOT NULL,
  longitude float8 NOT NULL,
  landmark text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '4 hours'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cleared')),
  active_votes int NOT NULL DEFAULT 0,
  cleared_votes int NOT NULL DEFAULT 0
);

ALTER TABLE public.traffic_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select" ON public.traffic_reports;
CREATE POLICY "reports_select" ON public.traffic_reports FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert" ON public.traffic_reports;
CREATE POLICY "reports_insert" ON public.traffic_reports FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reports_update" ON public.traffic_reports;
CREATE POLICY "reports_update" ON public.traffic_reports FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "reports_delete" ON public.traffic_reports;
CREATE POLICY "reports_delete" ON public.traffic_reports FOR DELETE TO anon, authenticated USING (false);

-- Index for fast geo + status queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.traffic_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.traffic_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_landmark ON public.traffic_reports(landmark);
