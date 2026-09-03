import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { X, MapPin, Clock, ThumbsUp, CheckCircle2, AlertTriangle, User } from 'lucide-react-native';
import type { TrafficReport } from '@/types';
import { REPORT_TYPE_META, COLORS } from '@/lib/constants';
import { timeAgo, isExpired, voteOnReport } from '@/hooks/useTraffic';

interface ReportDetailModalProps {
  report: TrafficReport | null;
  onClose: () => void;
  onVote: () => void;
}

export default function ReportDetailModal({ report, onClose, onVote }: ReportDetailModalProps) {
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState<'active' | 'cleared' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!report) return null;

  const meta = REPORT_TYPE_META[report.report_type];
  const expired = isExpired(report);

  const handleVote = async (field: 'active_votes' | 'cleared_votes') => {
    setVoting(true);
    setError(null);
    const result = await voteOnReport(report.id, field);
    setVoting(false);
    if (result.success) {
      setVoted(field === 'active_votes' ? 'active' : 'cleared');
      onVote();
    } else {
      setError(result.error ?? 'Vote failed');
    }
  };

  return (
    <Modal visible={!!report} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                <Text style={styles.iconEmoji}>{meta.icon}</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>{meta.label}</Text>
                <Text style={styles.headerSubtitle}>
                  {report.status === 'active' && !expired ? 'Active' : 'Cleared / Expired'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={COLORS.mutedLight} />
            </Pressable>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <MapPin size={14} color={COLORS.accent} />
              <Text style={styles.infoText}>{report.landmark ?? 'Unknown location'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={14} color={COLORS.faint} />
              <Text style={styles.infoTextMuted}>Reported {timeAgo(report.created_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <User size={14} color={COLORS.faint} />
              <Text style={styles.infoTextMuted}>by {report.reporter_name}</Text>
            </View>
            {report.description && (
              <View style={styles.descBox}>
                <Text style={styles.descText}>{report.description}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, styles.statBoxActive]}>
              <Text style={styles.statValueActive}>{report.active_votes}</Text>
              <Text style={styles.statLabel}>Active votes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{report.cleared_votes}</Text>
              <Text style={styles.statLabel}>Cleared votes</Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {report.status === 'active' && !expired && (
            <View style={styles.actions}>
              <Pressable
                onPress={() => handleVote('active_votes')}
                disabled={voting || voted !== null}
                style={[styles.voteBtn, voted === 'active' ? styles.voteBtnActiveVoted : styles.voteBtnActive, (voting || voted !== null) && { opacity: 0.6 }]}
              >
                {voting ? <ActivityIndicator size="small" color={COLORS.accent} /> : <ThumbsUp size={16} color={COLORS.accent} />}
                <Text style={styles.voteBtnActiveText}>
                  {voted === 'active' ? 'Voted Still Active' : 'Still Active'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleVote('cleared_votes')}
                disabled={voting || voted !== null}
                style={[styles.voteBtn, styles.voteBtnCleared, (voting || voted !== null) && { opacity: 0.6 }]}
              >
                {voting ? <ActivityIndicator size="small" color={COLORS.muted} /> : <CheckCircle2 size={16} color={COLORS.muted} />}
                <Text style={styles.voteBtnClearedText}>
                  {voted === 'cleared' ? 'Voted Cleared' : "It's Cleared"}
                </Text>
              </Pressable>
            </View>
          )}

          {expired && report.status === 'active' && (
            <View style={styles.expiredBox}>
              <AlertTriangle size={14} color={COLORS.amber} />
              <Text style={styles.expiredText}>
                This report has expired but was not confirmed cleared.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(16,42,67,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flexShrink: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 22 },
  headerTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  infoBlock: { gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: COLORS.inkSecondary, fontSize: 14, fontWeight: '600' },
  infoTextMuted: { color: COLORS.muted, fontSize: 13 },
  descBox: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginTop: 4 },
  descText: { color: COLORS.inkSecondary, fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  statBox: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, alignItems: 'center' },
  statBoxActive: { backgroundColor: COLORS.accentLight, borderColor: '#CDECE3' },
  statValue: { color: COLORS.inkSecondary, fontSize: 22, fontWeight: '700' },
  statValueActive: { color: COLORS.accentDark, fontSize: 22, fontWeight: '700' },
  statLabel: { color: COLORS.faint, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  errorBox: { marginTop: 12, backgroundColor: COLORS.redBg, borderWidth: 1, borderColor: '#F5C6C6', borderRadius: 12, padding: 10 },
  errorText: { color: COLORS.red, fontSize: 12 },
  actions: { marginTop: 18, gap: 8 },
  voteBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 13, borderWidth: 1 },
  voteBtnActive: { backgroundColor: COLORS.accentLight, borderColor: '#CDECE3' },
  voteBtnActiveVoted: { backgroundColor: '#D6F0EA', borderColor: COLORS.accent },
  voteBtnActiveText: { color: COLORS.accentDark, fontSize: 13.5, fontWeight: '700' },
  voteBtnCleared: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  voteBtnClearedText: { color: COLORS.inkSecondary, fontSize: 13.5, fontWeight: '700' },
  expiredBox: { marginTop: 18, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.amberBg, borderWidth: 1, borderColor: '#F3DDB0', borderRadius: 12, padding: 10 },
  expiredText: { color: '#9A6314', fontSize: 12, flexShrink: 1 },
});
