import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Activity, ArrowRight, Bell, CarFront, ChevronRight, CircleAlert, Gauge, MapPin, Navigation, Radio, TrendingDown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTrafficContext } from '@/contexts/TrafficContext';
import { activeReports } from '@/lib/geo';
import { REPORT_TYPE_META, COLORS } from '@/lib/constants';
import { timeAgo } from '@/hooks/useTraffic';
import ReportDetailModal from '@/components/ReportDetailModal';

const TODAY_LABEL = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

export default function OverviewScreen() {
  const router = useRouter();
  const { reports, refreshReports, readings, selectedReport, setSelectedReport } = useTrafficContext();
  const [dismissed, setDismissed] = useState(false);

  const live = activeReports(reports).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latest = live[0];
  const showNotice = !!latest && !dismissed;

  const avgCongestion = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.congestion_pct, 0) / readings.length)
    : 0;
  const avgSpeed = readings.length > 0
    ? Math.round(readings.reduce((sum, r) => sum + r.speed_kmh, 0) / readings.length)
    : 0;
  const heroLabel = avgCongestion >= 60 ? 'Heavy traffic' : avgCongestion >= 30 ? 'Moving slowly' : 'Flowing freely';

  const today = new Date().toDateString();
  const clearedToday = reports.filter(
    (r) => r.status === 'cleared' && new Date(r.created_at).toDateString() === today
  ).length;

  const lastUpdated = readings[0]?.updated_at;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{TODAY_LABEL}</Text>
            <Text style={styles.title}>Good day, KNUST</Text>
          </View>
          <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
            <Bell color={COLORS.ink} size={21} />
            {live.length > 0 && <View style={styles.notificationDot} />}
          </Pressable>
        </View>

        {showNotice && (
          <View style={styles.notice}>
            <View style={styles.noticeIcon}><CircleAlert color="#A86E0A" size={20} /></View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>{REPORT_TYPE_META[latest.report_type].label}{latest.landmark ? ` · ${latest.landmark}` : ''}</Text>
              <Text style={styles.noticeText} numberOfLines={2}>
                {latest.description || `Reported ${timeAgo(latest.created_at)} by ${latest.reporter_name}`}
              </Text>
            </View>
            <Pressable onPress={() => setDismissed(true)}><Text style={styles.dismiss}>×</Text></Pressable>
          </View>
        )}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>CAMPUS TRAFFIC</Text>
              <Text style={styles.heroTitle}>{heroLabel}</Text>
            </View>
            <View style={styles.statusPill}><Activity color="#FFFFFF" size={14} /><Text style={styles.statusText}>LIVE</Text></View>
          </View>
          <View style={styles.heroStats}>
            <View><Text style={styles.heroNumber}>{avgCongestion}%</Text><Text style={styles.heroSub}>avg congestion</Text></View>
            <View style={styles.heroDivider} />
            <View><Text style={styles.heroNumber}>{live.length}</Text><Text style={styles.heroSub}>active reports</Text></View>
          </View>
          <Pressable style={styles.heroAction} onPress={() => router.push('/map')}>
            <Text style={styles.heroActionText}>Open live map</Text><ArrowRight color="#FFFFFF" size={17} />
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Today at a glance</Text>
          <Text style={styles.updated}>{lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'Live'}</Text>
        </View>
        <View style={styles.metricGrid}>
          <Metric icon={<CarFront color="#167C70" size={20} />} value={String(live.length)} label="active reports" />
          <Metric icon={<Gauge color="#167C70" size={20} />} value={readings.length > 0 ? `${avgSpeed} km/h` : '—'} label="avg road speed" />
          <Metric icon={<Radio color="#167C70" size={20} />} value={String(readings.length)} label="roads monitored" />
          <Metric icon={<TrendingDown color="#167C70" size={20} />} value={String(clearedToday)} label="cleared today" />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Reports near you</Text>
          <Pressable onPress={() => router.push('/map')}><Text style={styles.seeAll}>See all</Text></Pressable>
        </View>
        {live.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active reports on campus right now.</Text>
          </View>
        ) : (
          <View style={styles.routeList}>
            {live.slice(0, 3).map((r) => {
              const meta = REPORT_TYPE_META[r.report_type];
              return (
                <Pressable key={r.id} style={styles.routeRow} onPress={() => setSelectedReport(r)}>
                  <View style={[styles.routeBadge, { backgroundColor: meta.bg }]}><MapPin color={meta.color} size={18} /></View>
                  <View style={styles.routeCopy}>
                    <Text style={styles.routeName}>{r.landmark ?? meta.label}</Text>
                    <Text style={styles.routeStatus}>{meta.label}</Text>
                  </View>
                  <View style={styles.routeTime}>
                    <Text style={[styles.delay, { color: meta.color }]}>{timeAgo(r.created_at)}</Text>
                    <ChevronRight color={COLORS.faint} size={18} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={styles.reportCta} onPress={() => router.push('/reports')}>
          <View style={styles.reportIcon}><Navigation color="#FFFFFF" size={20} /></View>
          <View style={styles.reportCopy}><Text style={styles.reportTitle}>Help improve the map</Text><Text style={styles.reportText}>Report a traffic issue in your area</Text></View>
          <ChevronRight color="#FFFFFF" size={20} />
        </Pressable>
      </ScrollView>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onVote={() => refreshReports()}
      />
    </View>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <View style={styles.metric}><View style={styles.metricIcon}>{icon}</View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9FB' }, content: { padding: 20, paddingTop: 22, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, eyebrow: { color: '#829AB1', fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 7 }, title: { color: '#102A43', fontSize: 24, fontWeight: '700' }, bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#102A43', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 }, notificationDot: { position: 'absolute', top: 10, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: '#D64545', borderWidth: 1.5, borderColor: '#FFFFFF' },
  notice: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7E8', borderRadius: 16, padding: 13, marginBottom: 18, borderWidth: 1, borderColor: '#F3D69A' }, noticeIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FBE9BF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, noticeCopy: { flex: 1 }, noticeTitle: { color: '#704C0B', fontWeight: '700', fontSize: 13, marginBottom: 3 }, noticeText: { color: '#8A671F', fontSize: 12, lineHeight: 17 }, dismiss: { color: '#A86E0A', fontSize: 23, marginLeft: 8 },
  heroCard: { backgroundColor: '#123B56', borderRadius: 24, padding: 20, marginBottom: 26, shadowColor: '#123B56', shadowOpacity: 0.22, shadowRadius: 16, elevation: 5 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, heroLabel: { color: '#91B9C5', fontSize: 11, letterSpacing: 1.3, fontWeight: '700', marginBottom: 6 }, heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' }, statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1D8D7E', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 }, statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 20 }, heroNumber: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' }, heroSub: { color: '#91B9C5', fontSize: 12, marginTop: 4 }, heroDivider: { height: 37, width: 1, backgroundColor: '#3B6075', marginHorizontal: 32 }, heroAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1B8F80', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13 }, heroActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: '#102A43', fontSize: 17, fontWeight: '700' }, updated: { color: '#829AB1', fontSize: 11 }, seeAll: { color: '#168A76', fontSize: 13, fontWeight: '700' }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 }, metric: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, minHeight: 116, borderWidth: 1, borderColor: '#E7EFF3' }, metricIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E8F7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, metricValue: { color: '#102A43', fontSize: 20, fontWeight: '700' }, metricLabel: { color: '#829AB1', fontSize: 12, marginTop: 3 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E7EFF3', padding: 20, alignItems: 'center', marginBottom: 20 }, emptyText: { color: '#627D98', fontSize: 13 },
  routeList: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 14, marginBottom: 20, borderWidth: 1, borderColor: '#E7EFF3' }, routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F5' }, routeBadge: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, routeCopy: { flex: 1 }, routeName: { color: '#243B53', fontSize: 13, fontWeight: '700', marginBottom: 4 }, routeStatus: { color: '#829AB1', fontSize: 12 }, routeTime: { alignItems: 'flex-end', gap: 6 }, delay: { fontSize: 11, fontWeight: '700' }, reportCta: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#168A76', padding: 15, borderRadius: 17 }, reportIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#0F7162', alignItems: 'center', justifyContent: 'center', marginRight: 11 }, reportCopy: { flex: 1 }, reportTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginBottom: 4 }, reportText: { color: '#B9E5DC', fontSize: 12 },
});
