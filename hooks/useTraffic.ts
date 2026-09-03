import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getLocalUserId, getLocalUserName, setLocalUserName } from '@/lib/storage';
import type { TrafficReport, ReportType, TrafficReading } from '@/types';

export function useReports() {
  const [reports, setReports] = useState<TrafficReport[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load reports', error);
    } else {
      setReports(data as TrafficReport[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('traffic_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'traffic_reports' }, () => {
        refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { reports, loading, refresh };
}

export function useProfile() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getLocalUserId();
      const storedName = await getLocalUserName();
      setProfileId(id);
      setName(storedName);
      setReady(true);
    })();
  }, []);

  const updateName = useCallback(async (newName: string) => {
    setName(newName);
    await setLocalUserName(newName);
    if (!profileId) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: profileId, name: newName });
    if (error) console.error('Failed to save profile', error);
  }, [profileId]);

  return { profileId, name, updateName, ready };
}

const AMBIENT_REFRESH_INTERVAL = 60_000;

export function useAmbientTraffic() {
  const [readings, setReadings] = useState<TrafficReading[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('ambient_traffic_readings')
      .select('*')
      .order('congestion_pct', { ascending: false });
    if (error) {
      console.error('Failed to load ambient traffic', error);
    } else {
      setReadings(data as TrafficReading[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, AMBIENT_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refresh]);

  return { readings, loading, refresh };
}

export async function triggerAmbientUpdate(): Promise<boolean> {
  try {
    const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ambient-traffic`;
    const headers = {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    const res = await fetch(url, { method: 'POST', headers });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitReport(report: {
  user_id: string;
  reporter_name: string;
  report_type: ReportType;
  latitude: number;
  longitude: number;
  landmark: string | null;
  description: string | null;
  image_url: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('traffic_reports').insert({
    ...report,
    expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function voteOnReport(
  id: string,
  field: 'active_votes' | 'cleared_votes'
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('traffic_reports')
    .select('active_votes, cleared_votes')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return { success: false, error: error?.message ?? 'Report not found' };

  const newVotes = data[field] + 1;
  const update: Record<string, unknown> = { [field]: newVotes };

  if (field === 'cleared_votes' && newVotes >= 3) {
    update.status = 'cleared';
  }

  const { error: updateError } = await supabase
    .from('traffic_reports')
    .update(update)
    .eq('id', id);
  if (updateError) return { success: false, error: updateError.message };
  return { success: true };
}

export async function markCleared(id: string) {
  const { error } = await supabase
    .from('traffic_reports')
    .update({ status: 'cleared' })
    .eq('id', id);
  return { success: !error, error: error?.message };
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function isExpired(report: TrafficReport): boolean {
  return new Date(report.expires_at).getTime() < Date.now();
}
