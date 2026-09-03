import type { FlowLevel } from '@/types';

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RoadEdge {
  from: string;
  to: string;
  /** road segment id matching ambient_traffic_readings.id, if applicable */
  segmentId?: string;
  /** base travel time in seconds at free flow */
  baseTime: number;
  /** distance in meters (approximate) */
  distance: number;
  /** name of the road for display */
  roadName: string;
}

export const ROAD_NODES: RoadNode[] = [
  { id: 'main-entrance',         name: 'Main Entrance',          lat: 6.6700, lng: -1.5750 },
  { id: 'hospital-junction',     name: 'Hospital Junction',      lat: 6.6718, lng: -1.5748 },
  { id: 'commercial-area',       name: 'Commercial Area',        lat: 6.6739, lng: -1.5745 },
  { id: 'ayeduase-gate',         name: 'Ayeduase Gate',          lat: 6.6692, lng: -1.5658 },
  { id: 'ayeduase-junction',     name: 'Ayeduase Junction',      lat: 6.6732, lng: -1.5709 },
  { id: 'src-junction',          name: 'SRC Junction',           lat: 6.6758, lng: -1.5730 },
  { id: 'brunei-complex',        name: 'Brunei Complex',         lat: 6.6772, lng: -1.5760 },
  { id: 'independence-hall',     name: 'Independence Hall',      lat: 6.6758, lng: -1.5695 },
  { id: 'unity-hall',            name: 'Unity Hall',             lat: 6.6762, lng: -1.5708 },
  { id: 'republic-hall',         name: 'Republic Hall',          lat: 6.6755, lng: -1.5720 },
  { id: 'qeii-hall',             name: 'Queen Elizabeth II Hall', lat: 6.6768, lng: -1.5682 },
  { id: 'college-engineering',   name: 'College of Engineering', lat: 6.6795, lng: -1.5735 },
  { id: 'college-science',       name: 'College of Science',     lat: 6.6805, lng: -1.5712 },
  { id: 'library',               name: 'Library',                lat: 6.6788, lng: -1.5718 },
  { id: 'great-hall',            name: 'Great Hall',             lat: 6.6780, lng: -1.5725 },
  { id: 'poolside',              name: 'Poolside',               lat: 6.6815, lng: -1.5698 },
  { id: 'science-junction',      name: 'Science Junction',       lat: 6.6800, lng: -1.5724 },
  { id: 'eng-science-link',      name: 'Eng-Science Link',       lat: 6.6790, lng: -1.5720 },
];

export const ROAD_EDGES: RoadEdge[] = [
  // Main entrance corridor
  { from: 'main-entrance',       to: 'hospital-junction',  segmentId: 'hospital-to-main-entrance',    baseTime: 60,  distance: 220, roadName: 'Hospital Road' },
  { from: 'hospital-junction',   to: 'commercial-area',    segmentId: 'main-entrance-to-commercial',  baseTime: 80,  distance: 280, roadName: 'Commercial Road' },
  { from: 'commercial-area',     to: 'src-junction',       segmentId: 'commercial-to-src-junction',   baseTime: 70,  distance: 250, roadName: 'SRC Road' },
  { from: 'src-junction',        to: 'independence-hall',  segmentId: 'src-junction-to-independence', baseTime: 65,  distance: 230, roadName: 'Independence Road' },
  { from: 'independence-hall',   to: 'unity-hall',         segmentId: 'independence-to-unity',        baseTime: 50,  distance: 170, roadName: 'Hall Road' },
  { from: 'unity-hall',          to: 'qeii-hall',          segmentId: 'unity-to-qeii',                baseTime: 55,  distance: 180, roadName: 'QEII Road' },

  // Commercial to Brunei
  { from: 'commercial-area',     to: 'brunei-complex',     segmentId: 'brunei-to-engineering',        baseTime: 75,  distance: 260, roadName: 'Brunei Road' },

  // Brunei to Engineering
  { from: 'brunei-complex',      to: 'college-engineering', segmentId: 'brunei-to-engineering',       baseTime: 60,  distance: 210, roadName: 'Engineering Road' },

  // Engineering to Science
  { from: 'college-engineering', to: 'eng-science-link',   segmentId: 'engineering-to-science',       baseTime: 45,  distance: 150, roadName: 'Science Link' },
  { from: 'eng-science-link',    to: 'college-science',    segmentId: 'engineering-to-science',       baseTime: 40,  distance: 140, roadName: 'Science Link' },
  { from: 'college-science',     to: 'science-junction',   segmentId: 'science-to-poolside',          baseTime: 50,  distance: 170, roadName: 'Science Road' },
  { from: 'science-junction',    to: 'library',            segmentId: 'library-to-great-hall',        baseTime: 45,  distance: 160, roadName: 'Library Road' },
  { from: 'library',             to: 'great-hall',         segmentId: 'library-to-great-hall',        baseTime: 35,  distance: 120, roadName: 'Great Hall Road' },
  { from: 'great-hall',          to: 'src-junction',       segmentId: 'src-junction-to-independence', baseTime: 40,  distance: 140, roadName: 'Hall Link Road' },

  // Republic / independence cross connections
  { from: 'src-junction',        to: 'republic-hall',      baseTime: 35,  distance: 120, roadName: 'Republic Road' },
  { from: 'republic-hall',       to: 'independence-hall',  baseTime: 30,  distance: 100, roadName: 'Hall Cross Road' },
  { from: 'republic-hall',       to: 'unity-hall',         baseTime: 30,  distance: 100, roadName: 'Unity Link' },
  { from: 'unity-hall',          to: 'independence-hall',  baseTime: 25,  distance: 90,  roadName: 'Inner Hall Road' },

  // Ayeduase corridor (alternate route)
  { from: 'ayeduase-gate',       to: 'ayeduase-junction',  segmentId: 'ayeduase-to-brunei',           baseTime: 70,  distance: 240, roadName: 'Ayeduase Road' },
  { from: 'ayeduase-junction',   to: 'brunei-complex',     segmentId: 'ayeduase-to-brunei',           baseTime: 65,  distance: 220, roadName: 'Ayeduase-Brunei Road' },
  { from: 'ayeduase-junction',   to: 'independence-hall',  baseTime: 55,  distance: 190, roadName: 'Ayeduase-Inner Road' },
  { from: 'ayeduase-junction',   to: 'unity-hall',         baseTime: 50,  distance: 170, roadName: 'Ayeduase-Unity Road' },

  // Poolside corridor
  { from: 'science-junction',    to: 'poolside',           segmentId: 'science-to-poolside',          baseTime: 55,  distance: 190, roadName: 'Poolside Road' },
  { from: 'poolside',            to: 'qeii-hall',          baseTime: 50,  distance: 170, roadName: 'QEII Link Road' },
  { from: 'qeii-hall',           to: 'independence-hall',  baseTime: 35,  distance: 120, roadName: 'QEII-Inner Road' },

  // Library to Independence (shortcut)
  { from: 'library',             to: 'independence-hall',  baseTime: 50,  distance: 180, roadName: 'Library Shortcut' },
  { from: 'great-hall',          to: 'republic-hall',      baseTime: 30,  distance: 100, roadName: 'Republic Link' },
];

/** Build adjacency list from edges (bidirectional) */
export function buildAdjacencyList(): Map<string, { nodeId: string; edge: RoadEdge }[]> {
  const adj = new Map<string, { nodeId: string; edge: RoadEdge }[]>();
  for (const node of ROAD_NODES) {
    adj.set(node.id, []);
  }
  for (const edge of ROAD_EDGES) {
    adj.get(edge.from)?.push({ nodeId: edge.to, edge });
    adj.get(edge.to)?.push({ nodeId: edge.from, edge });
  }
  return adj;
}

const NODE_MAP = new Map(ROAD_NODES.map((n) => [n.id, n]));
export function getNode(id: string): RoadNode | undefined {
  return NODE_MAP.get(id);
}

export function getCongestionMultiplier(flowLevel: FlowLevel | undefined, congestionPct: number | undefined): number {
  if (congestionPct !== undefined) {
    return 1 + (congestionPct / 100) * 2.5;
  }
  if (flowLevel === 'free')      return 1.0;
  if (flowLevel === 'light')     return 1.3;
  if (flowLevel === 'moderate')  return 1.8;
  if (flowLevel === 'heavy')     return 2.5;
  if (flowLevel === 'congested') return 3.5;
  return 1.0;
}
