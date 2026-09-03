import type { TrafficReport } from '@/types';
import { LANDMARKS, getSeverityColor } from '@/lib/constants';
import { isExpired } from '@/hooks/useTraffic';

export function getLandmarkForPoint(lat: number, lng: number) {
  let nearest = LANDMARKS[0];
  let minDist = Infinity;
  for (const lm of LANDMARKS) {
    const d = Math.hypot(lat - lm.lat, lng - lm.lng);
    if (d < minDist) { minDist = d; nearest = lm; }
  }
  return nearest;
}

export function activeReports(reports: TrafficReport[]): TrafficReport[] {
  return reports.filter((r) => r.status === 'active' && !isExpired(r));
}

export function severityForPoint(reports: TrafficReport[]): number {
  return activeReports(reports).length;
}

export function colorForCluster(count: number): string {
  return getSeverityColor(count);
}
