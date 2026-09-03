export type ReportType = 'heavy_traffic' | 'accident' | 'road_blockage' | 'road_construction';
export type ReportStatus = 'active' | 'cleared';
export type FlowLevel = 'free' | 'light' | 'moderate' | 'heavy' | 'congested';

export interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: 'gate' | 'hall' | 'academic' | 'facility' | 'junction';
}

export interface TrafficReport {
  id: string;
  user_id: string | null;
  reporter_name: string;
  report_type: ReportType;
  latitude: number;
  longitude: number;
  landmark: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  expires_at: string;
  status: ReportStatus;
  active_votes: number;
  cleared_votes: number;
}

export interface Profile {
  id: string;
  name: string;
  created_at: string;
}

export interface TrafficReading {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  flow_level: FlowLevel;
  speed_kmh: number;
  congestion_pct: number;
  confidence_pct: number;
  road_closed: boolean;
  updated_at: string;
  source: string;
}
