import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { ArrowUpRight, Bell, CheckCircle2, Gauge, Landmark, Receipt, ShieldCheck, Sparkles, Store, TrendingUp, WalletCards } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, ListRow, Screen, SectionHeader, Timeline, Txt } from '@/components/ui/Bharosa';
import { color, font } from '@/constants/theme';
import { mockMerchant, mockTimeline, useMockPassport } from '@/lib/mockData';
import { npr, riskLabel, tierOf } from '@/lib/passport';

export default function HomeScreen() {
  const passport = useMockPassport(); // TODO: server API — currently mocked
  const tier = tierOf(passport.score);
  const confidencePct = Math.round(passport.confidence * 100);
  const positiveSignals = passport.evidence.filter((item) => item.impact > 0).slice(0, 3);
  const recentPreview = mockTimeline.slice(0, 3);

  return (
    <Screen>
      <View style={styles.greet}>
        <LinearGradient colors={[color.g500, color.g700]} style={styles.topAvatar}>
          <Txt style={styles.topAvatarText}>{mockMerchant.initials}</Txt>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Txt style={styles.greetTitle}>Namaste, {mockMerchant.owner} <Txt np style={styles.greetTitle}>नमस्ते</Txt></Txt>
          <Txt style={styles.greetSub}>{mockMerchant.business} · {mockMerchant.city}</Txt>
        </View>
        <View style={styles.iconButton}>
          <Bell size={19} color={color.ink2} strokeWidth={1.9} />
          <View style={styles.topBellDot} />
        </View>
      </View>

      <LinearGradient colors={['#18A977', color.g600, color.g700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
        <View style={styles.walletGlow} />
        <View style={styles.walletHeader}>
          <Txt style={styles.walletEyebrow}>Credit passport</Txt>
          <View style={styles.riskPill}>
            <Txt style={styles.riskPillText}>{riskLabel(passport.fraud_risk)}</Txt>
          </View>
        </View>

        <View style={styles.cardMain}>
          <View style={styles.scoreBlock}>
            <Txt style={styles.scoreLabel}>Trust score</Txt>
            <View style={styles.scoreLine}>
              <Txt style={styles.walletScore}>{passport.score}</Txt>
              <Txt style={styles.walletOutOf}>/1000</Txt>
            </View>
            <View style={styles.lift}>
              <TrendingUp size={13} color="#B9F5D7" strokeWidth={2.2} />
              <Txt style={styles.liftText}>+24 this week</Txt>
            </View>
          </View>

          <View style={styles.metricPanel}>
            <MetricCapsule icon={<WalletCards size={16} color="#fff" strokeWidth={2} />} label="Borrow limit" value={npr(passport.loan.amount_npr)} />
            <View style={styles.metricRule} />
            <MetricCapsule icon={<Gauge size={16} color="#fff" strokeWidth={2} />} label="Confidence" value={`${confidencePct}%`} />
          </View>
        </View>

        <View style={styles.walletBottom}>
          <Txt style={styles.updated}>Updated today · {tier.label}</Txt>
          <Txt style={styles.walletNote}>{passport.loan.schedule_note}</Txt>
        </View>
      </LinearGradient>

      <Card style={styles.nextStep}>
        <LinearGradient colors={['#F4B53C', '#D8881A']} style={styles.nextIcon}>
          <Sparkles size={22} color="#fff" strokeWidth={2} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Txt style={styles.nextKicker}>NEXT BEST STEP</Txt>
          <Txt style={styles.nextTitle}>{passport.next_steps[0]}</Txt>
          <Txt style={styles.nextPts}>Can add about +30 points</Txt>
        </View>
        <ArrowUpRight size={19} color={color.amber700} strokeWidth={2.1} />
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={CheckCircle2} title="What's lifting your score" subtitle="Signals lenders can trust" />
        {positiveSignals.map((item) => (
          <ListRow key={item.label} icon={item.action_type === 'bill' ? Receipt : item.action_type === 'qr' ? Store : ShieldCheck} title={item.label} subtitle={`Positive impact +${item.impact}`} />
        ))}
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionTop}>
          <SectionHeader icon={Landmark} title="Recent activity" subtitle="Auto-built from your records" />
          <Link href="/activity" asChild>
            <Pressable style={({ pressed }) => [styles.seeMore, pressed && styles.pressed]}>
              <Txt style={styles.seeMoreText}>See more</Txt>
              <ArrowUpRight size={13} color={color.g700} strokeWidth={2.2} />
            </Pressable>
          </Link>
        </View>
        <Timeline items={recentPreview} />
      </Card>
    </Screen>
  );
}

function MetricCapsule({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}>{icon}</View>
      <View>
        <Txt style={styles.metricLabel}>{label}</Txt>
        <Txt style={styles.metricValue}>{value}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  greet: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 2, paddingVertical: 8, marginBottom: 8 },
  topAvatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  topAvatarText: { color: '#fff', fontFamily: font.extra, fontSize: 15 },
  greetTitle: { fontFamily: font.bold, fontSize: 17, letterSpacing: -0.2 },
  greetSub: { marginTop: 1, fontFamily: font.medium, fontSize: 12.5, color: color.muted },
  iconButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: color.hair, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  topBellDot: { position: 'absolute', right: 10, top: 10, width: 6, height: 6, borderRadius: 6, backgroundColor: color.amber600 },
  walletCard: { position: 'relative', overflow: 'hidden', borderRadius: 24, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 11, marginTop: 2, marginBottom: 14 },
  walletGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 210, backgroundColor: 'rgba(255,255,255,0.16)', right: -80, top: -92 },
  walletHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletEyebrow: { color: '#fff', fontFamily: font.extra, fontSize: 15, letterSpacing: -0.2 },
  riskPill: { height: 24, borderRadius: 99, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  riskPillText: { color: '#fff', fontFamily: font.bold, fontSize: 11 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  scoreBlock: { width: 118 },
  scoreLabel: { color: 'rgba(255,255,255,0.62)', fontFamily: font.semibold, fontSize: 12 },
  scoreLine: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  walletScore: { color: '#fff', fontFamily: font.extra, fontSize: 35, letterSpacing: -1.1, lineHeight: 39 },
  walletOutOf: { color: 'rgba(255,255,255,0.72)', fontFamily: font.bold, fontSize: 12, marginBottom: 6, marginLeft: 2 },
  updated: { color: 'rgba(255,255,255,0.72)', fontFamily: font.medium, fontSize: 11 },
  metricPanel: { flex: 1, minHeight: 76, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricIcon: { width: 28, height: 28, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: font.medium, fontSize: 10.5 },
  metricValue: { color: '#fff', fontFamily: font.extra, fontSize: 13.5, marginTop: 1 },
  metricRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 8, marginLeft: 36 },
  walletBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 9 },
  lift: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(185,245,215,0.13)', borderRadius: 99, paddingHorizontal: 9, height: 25, marginTop: 4 },
  liftText: { color: '#D8FFE9', fontFamily: font.bold, fontSize: 11.5 },
  walletNote: { flex: 1, textAlign: 'right', color: 'rgba(255,255,255,0.68)', fontFamily: font.medium, fontSize: 10.5, lineHeight: 14 },
  nextStep: { padding: 16, marginBottom: 14, borderColor: color.amber100, backgroundColor: '#FFFDF7', flexDirection: 'row', gap: 13, alignItems: 'center' },
  nextIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextKicker: { color: color.amber700, fontFamily: font.bold, fontSize: 12, letterSpacing: 0.2 },
  nextTitle: { fontFamily: font.bold, fontSize: 14.5, marginTop: 2, letterSpacing: -0.2 },
  nextPts: { color: color.ink2, fontFamily: font.semibold, fontSize: 12, marginTop: 2 },
  section: { padding: 16, paddingBottom: 6, marginBottom: 14 },
  sectionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  seeMore: { height: 30, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, borderRadius: 10, backgroundColor: color.g50 },
  seeMoreText: { color: color.g700, fontFamily: font.bold, fontSize: 11.5 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
