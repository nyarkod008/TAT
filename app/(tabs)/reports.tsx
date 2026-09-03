import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { CheckCircle2, ChevronRight, CircleHelp, FileText, Send } from 'lucide-react-native';
import type { ReportType, Landmark } from '@/types';
import { LANDMARKS, REPORT_TYPE_META, COLORS } from '@/lib/constants';
import { submitReport } from '@/hooks/useTraffic';
import { getLandmarkForPoint } from '@/lib/geo';
import { useTrafficContext } from '@/contexts/TrafficContext';

export default function ReportsScreen() {
  const { profileId, name, updateName, profileReady, refreshReports } = useTrafficContext();

  const [selected, setSelected] = useState<ReportType>('heavy_traffic');
  const [sent, setSent] = useState(false);
  const [details, setDetails] = useState('');
  const [landmark, setLandmark] = useState<Landmark>(LANDMARKS[0]);
  const [showLandmarkPicker, setShowLandmarkPicker] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setGpsStatus('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('denied');
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLandmark(getLandmarkForPoint(pos.coords.latitude, pos.coords.longitude));
        setGpsStatus('ok');
      } catch {
        setGpsStatus('denied');
      }
    })();
  }, []);

  const handleSubmit = async () => {
    if (!profileId) return;
    setSubmitting(true);
    setError(null);

    const reporterName = name.trim() || 'Anonymous';
    const result = await submitReport({
      user_id: profileId,
      reporter_name: reporterName,
      report_type: selected,
      latitude: landmark.lat,
      longitude: landmark.lng,
      landmark: landmark.name,
      description: details.trim() || null,
      image_url: null,
    });

    setSubmitting(false);
    if (result.success) {
      await updateName(reporterName);
      refreshReports();
      setSent(true);
    } else {
      setError(result.error ?? 'Failed to submit report');
    }
  };

  if (sent) {
    return (
      <View style={styles.success}>
        <View style={styles.successIcon}><CheckCircle2 color={COLORS.accent} size={42} /></View>
        <Text style={styles.successTitle}>Thanks for the report</Text>
        <Text style={styles.successText}>Your update helps keep the campus map accurate for everyone.</Text>
        <Pressable style={styles.primary} onPress={() => { setSent(false); setDetails(''); }}>
          <Text style={styles.primaryText}>Report another issue</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>COMMUNITY REPORTS</Text>
      <Text style={styles.title}>Share what you see</Text>
      <Text style={styles.subtitle}>Quick updates from people on the road make every journey better.</Text>

      <View style={styles.info}>
        <CircleHelp color={COLORS.accent} size={19} />
        <Text style={styles.infoText}>Reports are added to the live traffic map instantly.</Text>
      </View>

      <Text style={styles.label}>Your name (optional)</Text>
      <TextInput
        value={name}
        onChangeText={updateName}
        placeholder="Anonymous"
        placeholderTextColor={COLORS.faint}
        style={styles.nameInput}
      />

      <Text style={styles.label}>What is happening?</Text>
      <View style={styles.typeGrid}>
        {(Object.keys(REPORT_TYPE_META) as ReportType[]).map((t) => {
          const meta = REPORT_TYPE_META[t];
          const isActive = selected === t;
          return (
            <Pressable
              key={t}
              onPress={() => setSelected(t)}
              style={[styles.typeCard, isActive && styles.typeCardActive]}
            >
              <View style={[styles.typeIcon, { backgroundColor: isActive ? meta.bg : COLORS.bg }]}>
                <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
              </View>
              <Text style={[styles.typeText, isActive && { color: meta.color }]}>{meta.label}</Text>
              {isActive && <View style={styles.check}><CheckCircle2 color={meta.color} size={16} /></View>}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Add some details <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        value={details}
        onChangeText={setDetails}
        multiline
        placeholder="Tell us what is causing the delay..."
        placeholderTextColor={COLORS.faint}
        style={styles.input}
      />

      <Pressable style={styles.location} onPress={() => setShowLandmarkPicker((v) => !v)}>
        <View style={styles.locationIcon}><FileText color={COLORS.accent} size={18} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>Location</Text>
          <Text style={styles.locationText}>
            {gpsStatus === 'loading' ? 'Detecting your location…' : landmark.name}
          </Text>
        </View>
        {gpsStatus === 'loading' ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : (
          <ChevronRight color={COLORS.faint} size={18} />
        )}
      </Pressable>

      {showLandmarkPicker && (
        <View style={styles.landmarkList}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
            {LANDMARKS.map((l) => (
              <Pressable
                key={l.id}
                style={styles.landmarkOption}
                onPress={() => { setLandmark(l); setShowLandmarkPicker(false); }}
              >
                <Text style={styles.landmarkOptionText}>{l.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        style={[styles.primary, (submitting || !profileReady) && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={submitting || !profileReady}
      >
        {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send color="#FFFFFF" size={18} />}
        <Text style={styles.primaryText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 25, paddingBottom: 36 },
  eyebrow: { color: COLORS.mutedLight, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 8 },
  title: { color: COLORS.ink, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 18 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: COLORS.accentLight, padding: 13, borderRadius: 14, marginBottom: 22 },
  infoText: { color: COLORS.accentDark, fontSize: 12, flex: 1 },
  label: { color: COLORS.inkSecondary, fontSize: 14, fontWeight: '700', marginBottom: 11, marginTop: 4 },
  nameInput: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, height: 48, paddingHorizontal: 14, color: COLORS.inkSecondary, fontSize: 13, marginBottom: 4 },
  optional: { color: COLORS.faint, fontWeight: '400' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 8 },
  typeCard: { width: '47.5%', minHeight: 100, backgroundColor: COLORS.surface, borderRadius: 15, padding: 11, borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
  typeCardActive: { borderColor: COLORS.accent, backgroundColor: '#F4FCFA' },
  typeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  typeText: { color: '#52667A', fontSize: 11, fontWeight: '600' },
  check: { position: 'absolute', right: 8, top: 8 },
  input: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 15, minHeight: 90, padding: 14, color: COLORS.inkSecondary, textAlignVertical: 'top', fontSize: 13, marginBottom: 12 },
  location: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  locationIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  locationTitle: { color: COLORS.inkSecondary, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  locationText: { color: COLORS.mutedLight, fontSize: 11 },
  landmarkList: { marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  landmarkOption: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F5' },
  landmarkOptionText: { color: COLORS.inkSecondary, fontSize: 13 },
  errorBox: { backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: '#F5C6C6', borderRadius: 12, padding: 11, marginBottom: 12 },
  errorText: { color: COLORS.red, fontSize: 12 },
  primary: { height: 52, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 8 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  success: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 35 },
  successIcon: { width: 86, height: 86, borderRadius: 43, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { color: COLORS.ink, fontSize: 25, fontWeight: '700', marginBottom: 9 },
  successText: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 26 },
});
