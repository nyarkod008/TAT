import type { Landmark, FlowLevel } from '@/types';

export const KNUST_CENTER: [number, number] = [6.6745, -1.5716];
export const KNUST_ZOOM = 15;

export const LANDMARKS: Landmark[] = [
  { id: 'main-entrance',       name: 'Main Entrance',         lat: 6.6700, lng: -1.5750, category: 'gate' },
  { id: 'ayeduase-gate',       name: 'Ayeduase Gate',         lat: 6.6692, lng: -1.5658, category: 'gate' },
  { id: 'commercial-area',     name: 'Commercial Area',       lat: 6.6778, lng: -1.5740, category: 'facility' },
  { id: 'src-junction',        name: 'SRC Junction',          lat: 6.6758, lng: -1.5730, category: 'junction' },
  { id: 'independence-hall',   name: 'Independence Hall',     lat: 6.6758, lng: -1.5695, category: 'hall' },
  { id: 'unity-hall',          name: 'Unity Hall',            lat: 6.6762, lng: -1.5708, category: 'hall' },
  { id: 'republic-hall',       name: 'Republic Hall',         lat: 6.6755, lng: -1.5720, category: 'hall' },
  { id: 'qeii-hall',           name: 'Queen Elizabeth II Hall', lat: 6.6768, lng: -1.5682, category: 'hall' },
  { id: 'brunei-complex',      name: 'Brunei Complex',        lat: 6.6772, lng: -1.5760, category: 'academic' },
  { id: 'college-engineering', name: 'College of Engineering', lat: 6.6795, lng: -1.5735, category: 'academic' },
  { id: 'college-science',     name: 'College of Science',   lat: 6.6805, lng: -1.5712, category: 'academic' },
  { id: 'great-hall',          name: 'Great Hall',            lat: 6.6780, lng: -1.5725, category: 'facility' },
  { id: 'library',             name: 'Library',               lat: 6.6788, lng: -1.5718, category: 'facility' },
  { id: 'hospital',            name: 'Hospital (KATH)',       lat: 6.6718, lng: -1.5748, category: 'facility' },
  { id: 'poolside',            name: 'Poolside',              lat: 6.6815, lng: -1.5698, category: 'facility' },
];

// Same 4 values the database enforces via CHECK constraint on traffic_reports.report_type
export const REPORT_TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  heavy_traffic:     { label: 'Heavy Traffic',     color: '#D98B28', bg: '#FFF5E3', icon: '🚦' },
  accident:          { label: 'Accident',          color: '#D64545', bg: '#FDECEC', icon: '🚨' },
  road_blockage:     { label: 'Road Blockage',     color: '#3D8BA3', bg: '#E9F4F7', icon: '🚧' },
  road_construction: { label: 'Road Construction', color: '#7C5CBF', bg: '#F1ECFA', icon: '🏗️' },
};

export const FLOW_LEVEL_META: Record<FlowLevel, { label: string; color: string }> = {
  free:      { label: 'Free Flow', color: '#168A76' },
  light:     { label: 'Light',     color: '#5CB88A' },
  moderate:  { label: 'Moderate',  color: '#D98B28' },
  heavy:     { label: 'Heavy',     color: '#D9622A' },
  congested: { label: 'Congested', color: '#D64545' },
};

export function getSeverityColor(count: number): string {
  if (count === 0) return '#168A76';
  if (count <= 2)  return '#D98B28';
  if (count <= 4)  return '#D64545';
  return '#102A43';
}

/** Shared light theme palette matching the existing screens' StyleSheets. */
export const COLORS = {
  bg: '#F5F9FB',
  surface: '#FFFFFF',
  border: '#E7EFF3',
  ink: '#102A43',
  inkSecondary: '#243B53',
  muted: '#627D98',
  mutedLight: '#829AB1',
  faint: '#9FB3C8',
  accent: '#168A76',
  accentLight: '#E8F7F3',
  accentDark: '#167569',
  red: '#D64545',
  redBg: '#FDECEC',
  amber: '#D98B28',
  amberBg: '#FFF5E3',
  blue: '#3D8BA3',
  navy: '#123B56',
};
