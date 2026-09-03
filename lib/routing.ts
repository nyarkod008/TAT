import {
  buildAdjacencyList,
  getNode,
  getCongestionMultiplier,
  type RoadEdge,
} from '@/lib/roadNetwork';
import type { TrafficReading, TrafficReport } from '@/types';

export interface RouteStep {
  fromId: string;
  toId: string;
  edge: RoadEdge;
  travelTime: number;
  congestionPct: number;
  isCongested: boolean;
}

export interface RouteResult {
  path: string[];
  steps: RouteStep[];
  totalTime: number;
  totalDistance: number;
  congestedSegments: RouteStep[];
  isAlternate: boolean;
}

interface DijkstraResult {
  path: string[];
  totalTime: number;
  totalDistance: number;
  steps: RouteStep[];
}

function buildCongestionMap(
  readings: TrafficReading[],
  reports: TrafficReport[],
): Map<string, { flowLevel: string; congestionPct: number }> {
  const map = new Map<string, { flowLevel: string; congestionPct: number }>();

  for (const r of readings) {
    map.set(r.id, { flowLevel: r.flow_level, congestionPct: r.congestion_pct });
  }

  for (const report of reports) {
    if (report.status !== 'active') continue;
    const lat = report.latitude;
    const lng = report.longitude;
    for (const reading of readings) {
      const dist = Math.hypot(lat - reading.latitude, lng - reading.longitude);
      if (dist < 0.0015) {
        const existing = map.get(reading.id);
        const extra = report.report_type === 'accident' ? 40 : report.report_type === 'road_blockage' ? 50 : 20;
        map.set(reading.id, {
          flowLevel: existing?.flowLevel ?? 'heavy',
          congestionPct: Math.min(100, (existing?.congestionPct ?? 50) + extra),
        });
      }
    }
  }

  return map;
}

function dijkstra(
  startId: string,
  endId: string,
  congestionMap: Map<string, { flowLevel: string; congestionPct: number }>,
  excludedEdges: Set<string> = new Set(),
): DijkstraResult | null {
  const adj = buildAdjacencyList();
  const times = new Map<string, number>();
  const distances = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; edge: RoadEdge }>();
  const visited = new Set<string>();

  for (const node of adj.keys()) {
    times.set(node, Infinity);
    distances.set(node, Infinity);
  }
  times.set(startId, 0);
  distances.set(startId, 0);

  while (visited.size < adj.size) {
    let current: string | null = null;
    let minTime = Infinity;
    for (const [nodeId, time] of times) {
      if (!visited.has(nodeId) && time < minTime) {
        minTime = time;
        current = nodeId;
      }
    }
    if (current === null || current === endId) break;
    if (current === null) return null;
    visited.add(current);

    const neighbors = adj.get(current) ?? [];
    for (const { nodeId, edge } of neighbors) {
      if (visited.has(nodeId)) continue;

      const edgeKey = [edge.from, edge.to].sort().join('-');
      if (excludedEdges.has(edgeKey)) continue;

      const cong = edge.segmentId ? congestionMap.get(edge.segmentId) : undefined;
      const multiplier = getCongestionMultiplier(
        cong?.flowLevel as never,
        cong?.congestionPct,
      );
      const travelTime = edge.baseTime * multiplier;
      const newTime = (times.get(current) ?? 0) + travelTime;
      const newDist = (distances.get(current) ?? 0) + edge.distance;

      if (newTime < (times.get(nodeId) ?? Infinity)) {
        times.set(nodeId, newTime);
        distances.set(nodeId, newDist);
        prev.set(nodeId, { nodeId: current, edge });
      }
    }
  }

  if (times.get(endId) === Infinity) return null;

  const path: string[] = [];
  const steps: RouteStep[] = [];
  let cursor = endId;
  while (cursor !== startId) {
    const link = prev.get(cursor);
    if (!link) return null;
    path.unshift(cursor);
    const cong = link.edge.segmentId ? congestionMap.get(link.edge.segmentId) : undefined;
    const congestionPct = cong?.congestionPct ?? 0;
    const multiplier = getCongestionMultiplier(cong?.flowLevel as never, congestionPct);
    steps.unshift({
      fromId: link.nodeId,
      toId: cursor,
      edge: link.edge,
      travelTime: link.edge.baseTime * multiplier,
      congestionPct,
      isCongested: congestionPct >= 60,
    });
    cursor = link.nodeId;
  }
  path.unshift(startId);

  return {
    path,
    totalTime: times.get(endId) ?? 0,
    totalDistance: distances.get(endId) ?? 0,
    steps,
  };
}

export function findRoutes(
  startId: string,
  endId: string,
  readings: TrafficReading[],
  reports: TrafficReport[],
): { primary: RouteResult | null; alternate: RouteResult | null } {
  const congestionMap = buildCongestionMap(readings, reports);

  const primary = dijkstra(startId, endId, congestionMap);
  if (!primary) return { primary: null, alternate: null };

  const congestedSteps = primary.steps.filter((s) => s.isCongested);

  // Build alternate by excluding the most congested edges from the primary route
  const excludedEdges = new Set<string>();
  for (const step of primary.steps) {
    if (step.isCongested) {
      excludedEdges.add([step.edge.from, step.edge.to].sort().join('-'));
    }
  }

  let alternate: DijkstraResult | null = null;
  if (excludedEdges.size > 0) {
    alternate = dijkstra(startId, endId, congestionMap, excludedEdges);
  }

  // Only show alternate if it's actually different and not much longer
  let altResult: RouteResult | null = null;
  if (alternate && alternate.path.join(',') !== primary.path.join(',')) {
    const altCongested = alternate.steps.filter((s) => s.isCongested);
    altResult = {
      path: alternate.path,
      steps: alternate.steps,
      totalTime: alternate.totalTime,
      totalDistance: alternate.totalDistance,
      congestedSegments: altCongested,
      isAlternate: true,
    };
  }

  return {
    primary: {
      path: primary.path,
      steps: primary.steps,
      totalTime: primary.totalTime,
      totalDistance: primary.totalDistance,
      congestedSegments: congestedSteps,
      isAlternate: false,
    },
    alternate: altResult,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function routeCoords(path: string[]): [number, number][] {
  return path.map((id) => {
    const node = getNode(id);
    return [node!.lat, node!.lng];
  });
}
