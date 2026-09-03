/*
# Ambient Traffic Readings — Switch from TomTom to Google Compute Routes

## Summary
TomTom's Traffic Flow API was confirmed to have zero probe-data coverage in
Ghana (verified against Kumasi's Kejetia roundabout and Accra's Tetteh
Quarshie Interchange — both returned "no coverage" even at the widest search
radius). The `ambient-traffic` edge function now uses Google's Compute
Routes API instead, comparing traffic-aware vs. free-flow travel time
between each road segment's two endpoints to derive congestion — Google's
traffic data is sourced from Android/Google Maps usage, which is far denser
in Ghana than TomTom's probe network.

This migration only updates the column default for clarity; it does not
change the schema shape (confidence_pct and road_closed already exist from
the prior TomTom migration and are reused as-is — confidence_pct is now
always 100 for real Google readings, since Google doesn't expose a
per-reading confidence score the way TomTom did).
*/

ALTER TABLE public.ambient_traffic_readings
  ALTER COLUMN source SET DEFAULT 'google';
