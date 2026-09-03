import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Crosshair, Layers3, MapPin, Radio, Search, SlidersHorizontal } from 'lucide-react-native';
import MapWebView, { type MapWebViewHandle } from '@/components/MapWebView';
import ReportDetailModal from '@/components/ReportDetailModal';
import { useTrafficContext } from '@/contexts/TrafficContext';
import { activeReports } from '@/lib/geo';
import { REPORT_TYPE_META, COLORS } from '@/lib/constants';
import { timeAgo } from '@/hooks/useTraffic';

export default function MapScreen() {
  const { reports, refreshReports, readings, selectedReport, setSelectedReport } = useTrafficContext();
  const [showAmbient, setShowAmbient] = useState(true);
  const [locating, setLocating] = useState(false);
  const [following, setFollowing] = useState(false);
  const mapRef = useRef<MapWebViewHandle>(null);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  const live = activeReports(reports);

  const stopFollowing = () => {
    watchSubscription.current?.remove();
    watchSubscription.current = null;
    setFollowing(false);
    mapRef.current?.setFollowMode(false);
  };

  const startFollowing = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const initial = await Location.getCurrentPositionAsync({});
      mapRef.current?.setFollowMode(true, initial.coords.latitude, initial.coords.longitude);
      mapRef.current?.sendUserLocation(
        initial.coords.latitude, initial.coords.longitude,
        initial.coords.accuracy ?? undefined, initial.coords.heading ?? undefined
      );
      setFollowing(true);

      watchSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (pos) => {
          mapRef.current?.sendUserLocation(
            pos.coords.latitude, pos.coords.longitude,
            pos.coords.accuracy ?? undefined, pos.coords.heading ?? undefined
          );
        }
      );
    } finally {
      setLocating(false);
    }
  };

  const handleLocate = () => (following ? stopFollowing() : startFollowing());

  const handleSelectReport = (id: string) => {
    const r = reports.find((rep) => rep.id === id);
    if (r) setSelectedReport(r);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.mapHeader}>
        <View>
          <Text style={styles.eyebrow}>LIVE MONITORING</Text>
          <Text style={styles.title}>Traffic map</Text>
        </View>
        <Pressable style={[styles.headerButton, showAmbient && styles.headerButtonActive]} onPress={() => setShowAmbient((v) => !v)}>
          <Layers3 color={showAmbient ? '#FFFFFF' : COLORS.ink} size={19} />
        </Pressable>
      </View>
      <View style={styles.search}>
        <Search color={COLORS.mutedLight} size={19} />
        <Text style={styles.searchText}>Search a road or landmark</Text>
        <SlidersHorizontal color={COLORS.accent} size={18} />
      </View>

      <View style={styles.map}>
        <MapWebView
          ref={mapRef}
          reports={live}
          readings={readings}
          showAmbient={showAmbient}
          showReports={true}
          onSelectReport={handleSelectReport}
        />

        <Pressable style={[styles.locate, following && styles.locateActive]} onPress={handleLocate}>
          {locating ? (
            <ActivityIndicator size="small" color={following ? '#FFFFFF' : COLORS.accent} />
          ) : (
            <Crosshair color={following ? '#FFFFFF' : COLORS.accent} size={20} />
          )}
        </Pressable>

        <View style={styles.mapLegend}>
          <Legend color={COLORS.red} text="Heavy" />
          <Legend color={COLORS.amber} text="Slow" />
          <Legend color={COLORS.accent} text="Clear" />
        </View>
      </View>

      <ScrollView style={styles.bottom} contentContainerStyle={styles.bottomContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetTitle}>
          <Text style={styles.sectionTitle}>Nearby traffic</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        {live.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No active reports on campus right now.</Text>
          </View>
        ) : (
          <View style={styles.nearbyCard}>
            {live.slice(0, 6).map((r, i) => {
              const meta = REPORT_TYPE_META[r.report_type];
              return (
                <Row
                  key={r.id}
                  icon={<Text style={{ fontSize: 17 }}>{meta.icon}</Text>}
                  name={r.landmark ?? meta.label}
                  detail={meta.label}
                  time={timeAgo(r.created_at)}
                  last={i === Math.min(live.length, 6) - 1}
                  onPress={() => setSelectedReport(r)}
                />
              );
            })}
          </View>
        )}

        {readings.length > 0 && (
          <>
            <View style={[styles.sheetTitle, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>Road sensors</Text>
              <View style={styles.live}>
                <Radio size={11} color={COLORS.accent} />
                <Text style={styles.liveText}>{readings.some((r) => r.source === 'google') ? 'Google' : 'Estimated'}</Text>
              </View>
            </View>
            <View style={styles.nearbyCard}>
              {readings.slice(0, 5).map((rd, i) => (
                <Row
                  key={rd.id}
                  icon={<MapPin color={COLORS.blue} size={18} />}
                  name={rd.name}
                  detail={`${rd.congestion_pct}% congested`}
                  time={`${rd.speed_kmh} km/h`}
                  last={i === Math.min(readings.length, 5) - 1}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onVote={() => refreshReports()}
      />
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

function Row({ icon, name, detail, time, last, onPress }: {
  icon: React.ReactNode; name: string; detail: string; time: string; last?: boolean; onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.row, last && styles.lastRow]} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={styles.rowTime}>{time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  mapHeader: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: COLORS.mutedLight, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 6 },
  title: { color: COLORS.ink, fontSize: 25, fontWeight: '700' },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  search: { marginHorizontal: 20, marginBottom: 14, backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, height: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border },
  searchText: { flex: 1, color: COLORS.faint, fontSize: 13 },
  map: { height: 388, backgroundColor: '#DCEFE9', overflow: 'hidden', position: 'relative' },
  locate: { position: 'absolute', right: 16, bottom: 68, backgroundColor: COLORS.surface, width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.ink, shadowOpacity: 0.13, shadowRadius: 8, elevation: 3 },
  locateActive: { backgroundColor: COLORS.accent },
  mapLegend: { position: 'absolute', left: 16, bottom: 16, flexDirection: 'row', gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 9 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: '#52667A', fontSize: 10, fontWeight: '600' },
  bottom: { flex: 1, backgroundColor: COLORS.bg },
  bottomContent: { padding: 20, paddingBottom: 28 },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontWeight: '700', fontSize: 17 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, backgroundColor: '#1B8F80', borderRadius: 4 },
  liveText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 20, alignItems: 'center' },
  emptyText: { color: COLORS.muted, fontSize: 13 },
  nearbyCard: { backgroundColor: COLORS.surface, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F5' },
  lastRow: { borderBottomWidth: 0 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F8F9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rowCopy: { flex: 1 },
  rowName: { color: COLORS.inkSecondary, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  rowDetail: { color: COLORS.mutedLight, fontSize: 12 },
  rowTime: { color: '#52667A', fontSize: 11, fontWeight: '700' },
});
