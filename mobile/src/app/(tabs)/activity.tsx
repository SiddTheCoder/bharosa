import { Bell, CalendarClock, Landmark } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Card, Screen, SectionHeader, Timeline, Txt } from '@/components/ui/Bharosa';
import { color, font } from '@/constants/theme';
import { mockTimeline } from '@/lib/mockData';

export default function ActivityScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Txt style={styles.title}>Activity</Txt>
          <Txt style={styles.subtitle}>Records building your credit passport</Txt>
        </View>
        <View style={styles.iconButton}>
          <Bell size={19} color={color.ink2} strokeWidth={1.9} />
        </View>
      </View>

      <Card style={styles.summary}>
        <View style={styles.summaryItem}>
          <Txt style={styles.summaryNum}>8</Txt>
          <Txt style={styles.summaryLabel}>Signals</Txt>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Txt style={styles.summaryNum}>+114</Txt>
          <Txt style={styles.summaryLabel}>Point lift</Txt>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Txt style={styles.summaryNum}>30d</Txt>
          <Txt style={styles.summaryLabel}>Freshness</Txt>
        </View>
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={Landmark} title="Recent activity" subtitle="Auto-built from bills, sales, vouches, and interviews" />
        <Timeline items={mockTimeline} />
      </Card>

      <Card style={styles.note}>
        <CalendarClock size={18} color={color.g600} strokeWidth={1.9} />
        <Txt style={styles.noteText}>New verified records update your passport automatically after the server API is connected.</Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginTop: 10, marginBottom: 14 },
  title: { fontFamily: font.extra, fontSize: 23, letterSpacing: -0.5 },
  subtitle: { fontFamily: font.medium, fontSize: 13.5, color: color.muted, marginTop: 2 },
  iconButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: color.hair, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontFamily: font.extra, fontSize: 22, color: color.g700, letterSpacing: -0.5 },
  summaryLabel: { fontFamily: font.semibold, fontSize: 11.5, color: color.muted, marginTop: 2 },
  summaryRule: { width: 1, height: 34, backgroundColor: color.hair },
  section: { padding: 16, paddingBottom: 6, marginBottom: 14 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: color.g50 },
  noteText: { flex: 1, color: color.ink2, fontFamily: font.medium, fontSize: 12.5, lineHeight: 18 },
});
