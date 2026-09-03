/*
# Ambient Traffic Readings - Live Road Segment Flow Data

## Summary
Adds a table to store real-time ambient traffic flow readings for key road
segments across the KNUST campus. These readings are generated and refreshed by
a Supabase Edge Function (`ambient-traffic`) that simulates roadside sensor
data, giving users a live picture of campus traffic independent of manual user
reports.

## New Tables

### `ambient_traffic_readings`
Stores one row per monitored road segment, continuously updated by the
`ambient-traffic` edge function.
- `id` (text, primary key) — stable segment identifier (e.g. "main-entrance-to-src")
- `name` (text) — human-readable road segment name
- `latitude` (float8) — representative latitude of the segment midpoint
- `longitude` (float8) — representative longitude of the segment midpoint
- `flow_level` (text) — one of: free, light, moderate, heavy, congested
- `speed_kmh` (int) — estimated average vehicle speed on the segment
- `congestion_pct` (int) — 0–100 congestion index (0 = free flow, 100 = gridlock)
- `vehicle_count` (int) — estimated number of vehicles currently on the segment
- `updated_at` (timestamptz) — last time the reading was refreshed
- `source` (text) — data source label (e.g. "simulated-sensor")

## Security
- RLS enabled on `ambient_traffic_readings`.
- Public read access (anon + authenticated) — ambient traffic data is shared
  campus information with no privacy sensitivity.
- Write access is intentionally restricted: only the service role (used by the
  edge function) can insert/update. Anon and authenticated can read but not
  write, so users cannot tamper with sensor data.
*/

CREATE TABLE IF NOT EXISTS public.ambient_traffic_readings (
  id text PRIMARY KEY,
  name text NOT NULL,
  latitude float8 NOT NULL,
  longitude float8 NOT NULL,
  flow_level text NOT NULL DEFAULT 'free'
    CHECK (flow_level IN ('free', 'light', 'moderate', 'heavy', 'congested')),
  speed_kmh int NOT NULL DEFAULT 50,
  congestion_pct int NOT NULL DEFAULT 0 CHECK (congestion_pct >= 0 AND congestion_pct <= 100),
  vehicle_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'simulated-sensor'
);

ALTER TABLE public.ambient_traffic_readings ENABLE ROW LEVEL SECURITY;

-- Public read access: ambient traffic is shared campus information
DROP POLICY IF EXISTS "ambient_readings_select" ON public.ambient_traffic_readings;
CREATE POLICY "ambient_readings_select" ON public.ambient_traffic_readings
  FOR SELECT TO anon, authenticated USING (true);

-- No insert/update/delete for anon or authenticated — the edge function uses
-- the service role key which bypasses RLS entirely.
DROP POLICY IF EXISTS "ambient_readings_insert" ON public.ambient_traffic_readings;
CREATE POLICY "ambient_readings_insert" ON public.ambient_traffic_readings
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "ambient_readings_update" ON public.ambient_traffic_readings;
CREATE POLICY "ambient_readings_update" ON public.ambient_traffic_readings
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "ambient_readings_delete" ON public.ambient_traffic_readings;
CREATE POLICY "ambient_readings_delete" ON public.ambient_traffic_readings
  FOR DELETE TO anon, authenticated USING (false);

CREATE INDEX IF NOT EXISTS idx_ambient_readings_updated ON public.ambient_traffic_readings(updated_at DESC);
