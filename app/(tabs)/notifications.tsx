import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { CheckCircle2, Radio } from 'lucide-react-native';
import { useTrafficContext } from '@/contexts/TrafficContext';
import { activeReports } from '@/lib/geo';
import { REPORT_TYPE_META, COLORS } from '@/lib/constants';
import { timeAgo } from '@/hooks/useTraffic';
import ReportDetailModal from '@/components/ReportDetailModal';
import type { TrafficReport } from '@/types';

export default function NotificationsScreen() {
  const { reports, refreshReports, readings, selectedReport, setSelectedReport } = useTrafficContext();
  const live = activeReports(reports).sort(
    (a: TrafficReport, b: TrafficReport) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const congestedReadings = readings.filter((rd) => rd.congestion_pct >= 35);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>UPDATES</Text>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Live reports from people on campus, newest first.</Text>

      {live.length === 0 ? (
        <View style={styles.empty}>
          <CheckCircle2 color={COLORS.accent} size={40} />
          <Text style={styles.emptyTitle}>All clear on campus</Text>
          <Text style={styles.emptySubtitle}>No active reports right now — great time to travel.</Text>
        </View>
      ) : (
        live.map((r: TrafficReport) => {
          const meta = REPORT_TYPE_META[r.report_type];
          return (
            <Pressable key={r.id} style={styles.notice} onPress={() => setSelectedReport(r)}>
              <View style={[styles.icon, { backgroundColor: meta.bg }]}>
                <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.noticeTitle}>{meta.label}{r.landmark ? ` · ${r.landmark}` : ''}</Text>
                <Text style={styles.noticeText} numberOfLines={2}>
                  {r.description || `${r.active_votes} people confirmed this is still active.`}
                </Text>
                <Text style={styles.time}>{timeAgo(r.created_at)} · by {r.reporter_name}</Text>
              </View>
            </Pressable>
          );
        })
      )}

      {readings.length > 0 && (
        <>
          <Text style={[styles.eyebrow, { marginTop: 24 }]}>ROAD SENSORS</Text>
          {congestedReadings.slice(0, 4).map((rd) => (
              <View key={rd.id} style={styles.notice}>
                <View style={[styles.icon, { backgroundColor: '#E9F4F7' }]}>
                  <Radio color={COLORS.blue} size={18} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.noticeTitle}>{rd.name}</Text>
                  <Text style={styles.noticeText}>{rd.congestion_pct}% congested · {rd.speed_kmh} km/h</Text>
                  <Text style={styles.time}>{rd.source === 'google' ? 'Live · Google' : 'Estimated'}</Text>
                </View>
              </View>
            ))}
          {congestedReadings.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptySubtitle}>All monitored roads are flowing freely.</Text>
            </View>
          )}
        </>
      )}

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onVote={() => refreshReports()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 25, paddingBottom: 40 },
  eyebrow: { color: COLORS.mutedLight, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 8 },
  title: { color: COLORS.ink, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 24 },
  notice: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 17, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  copy: { flex: 1 },
  noticeTitle: { color: COLORS.inkSecondary, fontSize: 13, fontWeight: '700', marginBottom: 5 },
  noticeText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  time: { color: COLORS.faint, fontSize: 10, marginTop: 7 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  emptyTitle: { color: COLORS.inkSecondary, fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptySubtitle: { color: COLORS.muted, fontSize: 12, textAlign: 'center' },
});
