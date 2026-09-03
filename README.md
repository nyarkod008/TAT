# KNUST Traffic (TAT)

This is the polished 5-tab UI design, now wired to a fully real backend —
same Supabase project, same tables, same `ambient-traffic` edge function
(Google Compute Routes-based live traffic data) used by the other builds.
Nothing in this app is mock data.

## What's real

- **Overview, Map, Reports, Notifications, Profile** — all pull from and
  write to the same Supabase project (`traffic_reports`, `profiles`,
  `ambient_traffic_readings`), in real time.
- **Map** — a satellite Leaflet map (Esri imagery) inside a WebView, showing
  real community reports and real live-traffic segments, plus a "follow me"
  GPS mode that tracks your position as you move (same as the other builds).
- **Reports** — submitting a report uses your actual GPS position to detect
  the nearest campus landmark, and writes a real row to the database.
- **Notifications** — a live feed of actual active reports and congested
  road segments, not a static list.
- **Profile** — your name is stored via `AsyncStorage` + Supabase; the
  "reports / helpful votes / resolved" stats are computed from your real
  submitted reports, not fabricated numbers.

## Setup

1. Copy `.env.example` to `.env` and fill in your Supabase project's URL
   and anon/publishable key (same values as your other builds — same
   project):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. If you haven't already, make sure the `ambient-traffic` edge function is
   deployed with your `GOOGLE_MAPS_API_KEY` secret set (see the other
   project's README, or just redeploy from this project's `supabase/`
   folder — it's the identical function):

   ```bash
   supabase secrets set GOOGLE_MAPS_API_KEY=your_key
   supabase functions deploy ambient-traffic
   ```

3. Install dependencies and start:

   ```bash
   npm install
   npm run dev
   ```

   Scan the QR code with Expo Go on your phone (same Wi-Fi network).

## Notes

- All 4 report types shown in the Reports tab (Heavy Traffic, Accident,
  Road Blockage, Road Construction) match exactly what the database's
  `CHECK` constraint allows — no mismatch between UI and schema.
- Ambient traffic readings tagged `source: "estimated"` mean Google
  couldn't compute a route for that specific segment right then (rare) —
  this is shown honestly in the UI, never disguised as live data.
