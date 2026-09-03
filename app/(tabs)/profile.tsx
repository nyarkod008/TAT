import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Bell, ChevronRight, CircleHelp, MapPin, Settings, ShieldCheck } from 'lucide-react-native';
import { useTrafficContext } from '@/contexts/TrafficContext';
import { COLORS } from '@/lib/constants';

export default function ProfileScreen() {
  const { profileId, name, updateName, reports } = useTrafficContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const myReports = reports.filter((r) => r.user_id === profileId);
  const helpfulVotes = myReports.reduce((sum, r) => sum + r.active_votes, 0);
  const clearedCount = myReports.filter((r) => r.status === 'cleared').length;
  const resolutionRate = myReports.length > 0 ? `${Math.round((clearedCount / myReports.length) * 100)}%` : '—';

  const displayName = name.trim() || 'Anonymous';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const saveEdit = async () => {
    await updateName(draft.trim());
    setEditing(false);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.title}>Your profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials || 'AN'}</Text></View>
        <View style={styles.profileCopy}>
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Your name"
              placeholderTextColor={COLORS.faint}
              style={styles.nameInput}
              autoFocus
              onSubmitEditing={saveEdit}
            />
          ) : (
            <Text style={styles.name}>{displayName}</Text>
          )}
          <View style={styles.trusted}>
            <ShieldCheck color={COLORS.accent} size={14} />
            <Text style={styles.trustedText}>Community reporter</Text>
          </View>
        </View>
        <Pressable style={styles.edit} onPress={() => (editing ? saveEdit() : setEditing(true))}>
          <Text style={styles.editText}>{editing ? 'Save' : 'Edit'}</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <Stat value={String(myReports.length)} label="reports" />
        <Stat value={String(helpfulVotes)} label="helpful votes" />
        <Stat value={resolutionRate} label="resolved" />
      </View>

      <Text style={styles.section}>Preferences</Text>
      <View style={styles.menu}>
        <Menu icon={<Bell color={COLORS.accent} size={19} />} label="Traffic alerts" detail="On for saved routes" />
        <Menu icon={<MapPin color={COLORS.accent} size={19} />} label="Saved places" detail="Manage landmarks" />
        <Menu icon={<Settings color={COLORS.accent} size={19} />} label="App settings" detail="Notifications, privacy" last />
      </View>

      <Text style={styles.section}>Support</Text>
      <View style={styles.menu}>
        <Menu icon={<CircleHelp color={COLORS.accent} size={19} />} label="Help centre" detail="FAQs and contact" last />
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function Menu({ icon, label, detail, last }: { icon: React.ReactNode; label: string; detail: string; last?: boolean }) {
  return (
    <Pressable style={[styles.menuRow, last && styles.last]}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <ChevronRight color={COLORS.faint} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9FB' }, content: { padding: 20, paddingTop: 25, paddingBottom: 36 },
  eyebrow: { color: '#829AB1', fontSize: 11, letterSpacing: 1.4, fontWeight: '700', marginBottom: 8 }, title: { color: '#102A43', fontSize: 26, fontWeight: '700', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#E7EFF3', marginBottom: 12 }, avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#D6F0EA', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, avatarText: { color: '#167569', fontWeight: '800', fontSize: 17 }, profileCopy: { flex: 1 }, name: { color: '#102A43', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  nameInput: { color: '#102A43', fontSize: 15, fontWeight: '700', marginBottom: 3, borderBottomWidth: 1, borderBottomColor: '#168A76', paddingVertical: 2 },
  trusted: { flexDirection: 'row', alignItems: 'center', gap: 4 }, trustedText: { color: '#168A76', fontSize: 10, fontWeight: '600' }, edit: { backgroundColor: '#E8F7F3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, editText: { color: '#167569', fontSize: 11, fontWeight: '700' },
  stats: { flexDirection: 'row', backgroundColor: '#123B56', borderRadius: 17, paddingVertical: 16, marginBottom: 27 }, stat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#3B6075' }, statValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '700', marginBottom: 4 }, statLabel: { color: '#9DBCC9', fontSize: 10 },
  section: { color: '#243B53', fontSize: 15, fontWeight: '700', marginBottom: 11 }, menu: { backgroundColor: '#FFFFFF', borderRadius: 17, paddingHorizontal: 14, marginBottom: 24, borderWidth: 1, borderColor: '#E7EFF3' }, menuRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EDF2F5' }, last: { borderBottomWidth: 0 }, menuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E8F7F3', alignItems: 'center', justifyContent: 'center', marginRight: 10 }, menuCopy: { flex: 1 }, menuLabel: { color: '#243B53', fontSize: 13, fontWeight: '700', marginBottom: 4 }, menuDetail: { color: '#829AB1', fontSize: 11 },
});
