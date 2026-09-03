import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Segment {
  id: string;
  name: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

// Real campus road segments, using the same node coordinates as the route
// planner's road graph (lib/roadNetwork.ts) — so the ambient traffic layer
// and the turn-by-turn route planner describe the exact same roads, instead
// of a separately-guessed set of points.
const SEGMENTS: Segment[] = [
  { id: "hospital-to-main-entrance",    name: "KATH → Main Entrance",
    origin: { lat: 6.6700, lng: -1.5750 }, destination: { lat: 6.6718, lng: -1.5748 } },
  { id: "main-entrance-to-commercial",  name: "Main Entrance → Commercial Area",
    origin: { lat: 6.6718, lng: -1.5748 }, destination: { lat: 6.6739, lng: -1.5745 } },
  { id: "commercial-to-src-junction",   name: "Commercial Area → SRC Junction",
    origin: { lat: 6.6739, lng: -1.5745 }, destination: { lat: 6.6758, lng: -1.5730 } },
  { id: "src-junction-to-independence", name: "SRC Junction → Independence Hall",
    origin: { lat: 6.6758, lng: -1.5730 }, destination: { lat: 6.6758, lng: -1.5695 } },
  { id: "independence-to-unity",        name: "Independence Hall → Unity Hall",
    origin: { lat: 6.6758, lng: -1.5695 }, destination: { lat: 6.6762, lng: -1.5708 } },
  { id: "unity-to-qeii",                name: "Unity Hall → Queen Elizabeth II",
    origin: { lat: 6.6762, lng: -1.5708 }, destination: { lat: 6.6768, lng: -1.5682 } },
  { id: "brunei-to-engineering",        name: "Brunei Complex → College of Eng.",
    origin: { lat: 6.6772, lng: -1.5760 }, destination: { lat: 6.6795, lng: -1.5735 } },
  { id: "engineering-to-science",       name: "College of Eng. → College of Sci.",
    origin: { lat: 6.6795, lng: -1.5735 }, destination: { lat: 6.6805, lng: -1.5712 } },
  { id: "science-to-poolside",          name: "College of Science → Poolside",
    origin: { lat: 6.6805, lng: -1.5712 }, destination: { lat: 6.6815, lng: -1.5698 } },
  { id: "library-to-great-hall",        name: "Library → Great Hall",
    origin: { lat: 6.6788, lng: -1.5718 }, destination: { lat: 6.6780, lng: -1.5725 } },
  { id: "ayeduase-to-brunei",           name: "Ayeduase Gate → Brunei Complex",
    origin: { lat: 6.6692, lng: -1.5658 }, destination: { lat: 6.6772, lng: -1.5760 } },
  { id: "republic-to-poolside",         name: "Republic Hall → Poolside",
    origin: { lat: 6.6755, lng: -1.5720 }, destination: { lat: 6.6815, lng: -1.5698 } },
];

// Don't hit Google (and burn the free Demo Key's daily quota) on every
// client request. If the most recent reading is newer than this, just serve
// what's already in the table instead of re-fetching.
const MIN_REFRESH_INTERVAL_MS = 55_000;

interface ComputeRoutesResponse {
  routes?: {
    duration?: string;        // e.g. "123s" — traffic-aware travel time
    staticDuration?: string;  // e.g. "100s" — free-flow travel time, no traffic
    distanceMeters?: number;
  }[];
  error?: { code: number; message: string; status: string };
}

function parseSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration);
  return match ? parseFloat(match[1]) : null;
}

function flowLevelForCongestion(pct: number): "free" | "light" | "moderate" | "heavy" | "congested" {
  if (pct < 15) return "free";
  if (pct < 35) return "light";
  if (pct < 60) return "moderate";
  if (pct < 85) return "heavy";
  return "congested";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Fallback ONLY for the rare case where Google returns success but genuinely
// finds no drivable route between two points (e.g. disconnected by a gate).
// This is a modeled time-of-day estimate, not a live reading — tagged
// source: "estimated" (never "google") with confidence_pct: 0, so nothing
// downstream can mistake it for a real routed value. It must never be used
// to paper over a real failure (auth error, quota, network fault) — those
// stay failures, surfaced in `failures` in the response.
function modeledEstimate(segment: Segment) {
  const hour = new Date().getUTCHours(); // campus is UTC+0 (GMT)
  const rushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18.5);
  const midday = hour >= 11 && hour <= 14;
  const base = rushHour ? 55 : midday ? 30 : 12;
  const noise = Math.random() * 20 - 10;
  const congestionPct = Math.round(clamp(base + noise, 3, 92));
  const freeFlowSpeed = 35;
  const speedKmh = Math.round(freeFlowSpeed * (1 - congestionPct / 100));

  return {
    id: segment.id,
    name: segment.name,
    latitude: segment.origin.lat,
    longitude: segment.origin.lng,
    flow_level: flowLevelForCongestion(congestionPct),
    speed_kmh: Math.max(speedKmh, 3),
    congestion_pct: congestionPct,
    confidence_pct: 0,
    road_closed: false,
    updated_at: new Date().toISOString(),
    source: "estimated",
  };
}

async function fetchSegmentReading(segment: Segment, apiKey: string) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: segment.origin.lat, longitude: segment.origin.lng } } },
      destination: { location: { latLng: { latitude: segment.destination.lat, longitude: segment.destination.lng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      units: "METRIC",
    }),
  });

  const data = (await res.json()) as ComputeRoutesResponse;

  if (!res.ok) {
    // Auth/quota/config errors are real problems — never paper over these
    // with a fake estimate, they need to be seen and fixed.
    throw new Error(`Google Routes API error for ${segment.id}: ${res.status} ${data.error?.message ?? JSON.stringify(data)}`);
  }

  const route = data.routes?.[0];
  const duration = parseSeconds(route?.duration);
  const staticDuration = parseSeconds(route?.staticDuration);
  const distanceMeters = route?.distanceMeters;

  if (!route || duration === null || staticDuration === null || !distanceMeters) {
    // Google genuinely found no route between these two points — fall back
    // to a clearly-labeled estimate rather than leaving this segment blank.
    return modeledEstimate(segment);
  }

  // Traffic-aware duration vs free-flow duration tells us how much slower
  // the road is right now than it would be with no traffic. Scaled up
  // slightly (x1.3) since typical urban slowdowns are modest fractions but
  // we want them to register meaningfully on a 0-100 congestion scale.
  const slowdownRatio = staticDuration > 0 ? (duration - staticDuration) / staticDuration : 0;
  const congestionPct = Math.round(clamp(slowdownRatio * 130, 0, 100));
  const speedKmh = duration > 0 ? Math.round((distanceMeters / duration) * 3.6) : 0;

  return {
    id: segment.id,
    name: segment.name,
    latitude: segment.origin.lat,
    longitude: segment.origin.lng,
    flow_level: flowLevelForCongestion(congestionPct),
    speed_kmh: speedKmh,
    congestion_pct: congestionPct,
    // Google's Compute Routes doesn't expose a per-reading confidence score
    // the way TomTom did. 100 here means "a real route was computed", not a
    // statistical confidence value — shown to the user with different
    // wording than the old TomTom confidence label (see MapView popup).
    confidence_pct: 100,
    // Not available in this field mask without deeper route-leg parsing;
    // left false rather than guessed.
    road_closed: false,
    updated_at: new Date().toISOString(),
    source: "google",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

    if (!googleApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "GOOGLE_MAPS_API_KEY is not configured. Set it with: supabase secrets set GOOGLE_MAPS_API_KEY=your_key",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Throttle: if we refreshed recently, just return the current rows.
    const { data: latest } = await supabase
      .from("ambient_traffic_readings")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && Date.now() - new Date(latest.updated_at).getTime() < MIN_REFRESH_INTERVAL_MS) {
      const { data: current, error: readError } = await supabase
        .from("ambient_traffic_readings")
        .select("*");
      if (readError) throw readError;
      return new Response(
        JSON.stringify({ readings: current, updated: latest.updated_at, throttled: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.allSettled(
      SEGMENTS.map((seg) => fetchSegmentReading(seg, googleApiKey)),
    );

    const readings = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchSegmentReading>>> => r.status === "fulfilled")
      .map((r) => r.value);

    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason));

    if (readings.length > 0) {
      const { error } = await supabase
        .from("ambient_traffic_readings")
        .upsert(readings, { onConflict: "id" });
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ readings, updated: new Date().toISOString(), failures }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
