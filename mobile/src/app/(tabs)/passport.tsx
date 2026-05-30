import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { BarChart3, CheckCircle2, Mic, Receipt, Share2, ShieldCheck, Store, TrendingUp, Users } from 'lucide-react-native';

import { Btn, Card, MiniQr, Screen, SectionHeader, StatusRow, Txt, WeightBar } from '@/components/ui/Bharosa';
import { color, font, radius, shadow } from '@/constants/theme';
import { mockMerchant, useMockPassport } from '@/lib/mockData';
import { riskLabel, tierOf } from '@/lib/passport';

const tasks = [
  { state: 'done', title: 'Added electricity bill', subtitle: 'Linked your utility account', points: '+20' },
  { state: 'done', title: 'Got a supplier vouch', subtitle: 'A verified anchor backed you', points: '+40' },
  { state: 'active', title: 'Finish the voice check', subtitle: '2 minutes, in Nepali', points: 'Start' },
  { state: 'todo', title: 'Set up water bill autopay', subtitle: 'One more bill on record', points: '+15' },
];

export default function PassportScreen() {
  const passport = useMockPassport(); // TODO: server API — currently mocked
  const tier = tierOf(passport.score);
  const next = tier.next ?? 1000;
  const confidencePct = Math.round(passport.confidence * 100);
  const pointsLeft = Math.max(0, next - passport.score);
  const progress = Math.min(100, Math.round((passport.score / next) * 100));

  async function sharePassport() {
    await Share.share({ message: `${passport.merchant_name} credit passport: ${passport.score}/1000, ${riskLabel(passport.fraud_risk)}, ${confidencePct}% confidence.` });
  }

  return (
    <Screen>
      <View style={styles.topbar}>
        <View>
          <Txt style={styles.title}>Credit Passport</Txt>
          <Txt style={styles.subtitle}>Proof, growth, and lender readiness</Txt>
        </View>
        <Btn variant="line" onPress={sharePassport} style={styles.shareIcon}><Share2 size={18} color={color.ink2} /></Btn>
      </View>

      <Card style={styles.passport}>
        <LinearGradient colors={['#18A977', color.g600, color.g700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passportTop}>
          <View style={styles.brandRow}>
            <Txt style={styles.watermark}>BHAROSA PASSPORT</Txt>
            <View style={styles.verified}>
              <ShieldCheck size={14} color="#fff" strokeWidth={2.1} />
              <Txt style={styles.verifiedText}>Verified</Txt>
            </View>
          </View>

          <View style={styles.identity}>
            <View style={styles.identityAvatar}><Txt style={styles.identityAvatarText}>{mockMerchant.initials}</Txt></View>
            <View style={{ flex: 1 }}>
              <Txt style={styles.identityName}>{passport.merchant_name}</Txt>
              <Txt style={styles.identitySub}>{mockMerchant.business} · {mockMerchant.city} · since {mockMerchant.since}</Txt>
            </View>
          </View>

          <View style={styles.scorePanel}>
            <View>
              <Txt style={styles.scoreKicker}>Trust score</Txt>
              <View style={styles.scoreLine}>
                <Txt style={styles.scoreNum}>{passport.score}</Txt>
                <Txt style={styles.scoreOut}>/1000</Txt>
              </View>
              <Txt style={styles.scoreMeta}>{tier.label} · {riskLabel(passport.fraud_risk)}</Txt>
            </View>
            <View style={styles.qrWrap}><MiniQr /></View>
          </View>
        </LinearGradient>

        <View style={styles.proofGrid}>
          <ProofMetric value={`${confidencePct}%`} label="Confidence" />
          <ProofMetric value={`${passport.interval.p5}-${passport.interval.p95}`} label="Likely range" />
          <ProofMetric value={String(passport.evidence.length)} label="Signals" />
        </View>
      </Card>

      <Card style={styles.band}>
        <View style={styles.between}>
          <Txt style={styles.bandNow}>{passport.score} · {tier.label}</Txt>
          <Txt style={styles.bandNext}>Next: {next} Strong</Txt>
        </View>
        <View style={styles.seg}><View style={[styles.segFill, { width: `${progress}%` }]} /></View>
        <Txt style={styles.bandNote}><Txt style={styles.bandBold}>{pointsLeft} points</Txt> to unlock a stronger lender band.</Txt>
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={ShieldCheck} title="Merchant proof" subtitle="What lenders see first" />
        <StatusRow icon={Users} title="Community vouches" subtitle="2 trusted businesses vouched for you" />
        <StatusRow icon={Receipt} title="On-time bill payments" subtitle="5 of 6 utility bills paid on time" />
        <StatusRow icon={Store} title="Monthly sales (QR)" subtitle="Steady digital sales every month" />
        <StatusRow icon={Mic} title="Business interview" subtitle="Voice check completed in Nepali" />
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={CheckCircle2} title="Ways to add points" subtitle="Focused actions for this merchant" />
        {tasks.map((task, index) => (
          <View key={task.title} style={styles.quest}>
            <View style={[styles.qState, task.state === 'done' && styles.qDone, task.state === 'active' && styles.qActive]}>
              <Txt style={[styles.qStateText, task.state === 'done' && styles.qDoneText]}>{task.state === 'done' ? '✓' : index + 1}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={[styles.qTitle, task.state === 'done' && styles.qTitleDone]}>{task.title}</Txt>
              <Txt style={styles.qSub}>{task.subtitle}</Txt>
            </View>
            {task.state === 'active' ? (
              <Link href="/voice" asChild>
                <Pressable style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}>
                  <Txt style={styles.startText}>Start</Txt>
                </Pressable>
              </Link>
            ) : (
              <Txt style={[styles.points, task.state === 'done' && styles.pointsDone]}>{task.points}</Txt>
            )}
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={BarChart3} title="Score composition" />
        <WeightBar label="Community trust" value={30} barColor={color.g600} />
        <WeightBar label="Bill payments" value={25} barColor={color.g500} />
        <WeightBar label="Sales activity" value={25} barColor={color.g400} />
        <WeightBar label="Behavior & voice" value={20} barColor="#7CCBA8" />
      </Card>

      <Card style={styles.section}>
        <SectionHeader icon={TrendingUp} title="Good & slow months" subtitle="Seasonality lenders should understand" />
        <View style={styles.months}>
          <Month score={passport.season.lean_score} label="Slow" />
          <Month score={passport.season.current_score} label="Typical" mid />
          <Month score={passport.season.boom_score} label="Good" />
        </View>
      </Card>
    </Screen>
  );
}

function ProofMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.proofMetric}>
      <Txt style={styles.proofValue}>{value}</Txt>
      <Txt style={styles.proofLabel}>{label}</Txt>
    </View>
  );
}

function Month({ score, label, mid }: { score: number; label: string; mid?: boolean }) {
  return (
    <View style={[styles.month, mid && styles.monthMid]}>
      <Txt style={styles.monthScore}>{score}</Txt>
      <Txt style={styles.monthLabel}>{label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 12 },
  title: { fontFamily: font.extra, fontSize: 23, letterSpacing: -0.5 },
  subtitle: { fontFamily: font.medium, fontSize: 13.5, color: color.muted, marginTop: 2 },
  shareIcon: { width: 42, height: 42, paddingHorizontal: 0 },
  passport: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: 14, ...shadow.deep },
  passportTop: { padding: 18, paddingBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  watermark: { color: '#fff', fontFamily: font.extra, fontSize: 12, letterSpacing: 1.4, opacity: 0.92 },
  verified: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  verifiedText: { color: '#fff', fontFamily: font.bold, fontSize: 11.5 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 16 },
  identityAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  identityAvatarText: { color: '#fff', fontFamily: font.extra, fontSize: 17 },
  identityName: { color: '#fff', fontFamily: font.extra, fontSize: 19, letterSpacing: -0.3 },
  identitySub: { color: 'rgba(255,255,255,0.82)', fontFamily: font.medium, fontSize: 12.5, marginTop: 2 },
  scorePanel: { marginTop: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  scoreKicker: { color: 'rgba(255,255,255,0.7)', fontFamily: font.semibold, fontSize: 12 },
  scoreLine: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 },
  scoreNum: { color: '#fff', fontFamily: font.extra, fontSize: 38, letterSpacing: -1.2, lineHeight: 42 },
  scoreOut: { color: 'rgba(255,255,255,0.72)', fontFamily: font.bold, fontSize: 13, marginBottom: 7, marginLeft: 2 },
  scoreMeta: { color: 'rgba(255,255,255,0.75)', fontFamily: font.medium, fontSize: 11.5, marginTop: 1 },
  qrWrap: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  proofGrid: { flexDirection: 'row', padding: 14, backgroundColor: '#fff' },
  proofMetric: { flex: 1, alignItems: 'center' },
  proofValue: { color: color.g700, fontFamily: font.extra, fontSize: 17 },
  proofLabel: { color: color.muted, fontFamily: font.semibold, fontSize: 11, marginTop: 2 },
  band: { padding: 16, marginBottom: 14 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  bandNow: { fontFamily: font.extra, fontSize: 14 },
  bandNext: { fontFamily: font.semibold, fontSize: 12.5, color: color.muted },
  seg: { height: 12, borderRadius: 99, backgroundColor: color.hair, overflow: 'hidden' },
  segFill: { height: '100%', borderRadius: 99, backgroundColor: color.g600 },
  bandNote: { marginTop: 10, color: color.ink2, fontFamily: font.medium, fontSize: 12.5, lineHeight: 18 },
  bandBold: { color: color.g700, fontFamily: font.extra },
  section: { padding: 16, paddingBottom: 14, marginBottom: 14 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, borderTopWidth: 1, borderTopColor: color.hair },
  qState: { width: 28, height: 28, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: color.line, borderStyle: 'dashed', backgroundColor: '#fff' },
  qDone: { backgroundColor: color.g500, borderStyle: 'solid', borderColor: color.g500 },
  qActive: { backgroundColor: color.amber50, borderStyle: 'solid', borderColor: color.amber600 },
  qStateText: { fontFamily: font.extra, fontSize: 12, color: color.faint },
  qDoneText: { color: '#fff' },
  qTitle: { fontFamily: font.bold, fontSize: 13.5, letterSpacing: -0.1 },
  qTitleDone: { color: color.muted, textDecorationLine: 'line-through', textDecorationColor: color.line },
  qSub: { fontFamily: font.medium, fontSize: 11.5, color: color.muted, marginTop: 1 },
  points: { fontFamily: font.extra, fontSize: 12, color: color.g600 },
  pointsDone: { color: color.faint },
  startBtn: { height: 40, borderRadius: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.g50 },
  startText: { fontFamily: font.bold, fontSize: 14, color: color.g700 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  months: { flexDirection: 'row', gap: 9, marginTop: 4 },
  month: { flex: 1, alignItems: 'center', paddingVertical: 13, paddingHorizontal: 6, borderRadius: 14, backgroundColor: color.bg, borderWidth: 1, borderColor: color.hair },
  monthMid: { backgroundColor: color.g50, borderColor: color.g100 },
  monthScore: { fontFamily: font.extra, fontSize: 21, letterSpacing: -0.5 },
  monthLabel: { fontFamily: font.semibold, fontSize: 10.5, color: color.muted, marginTop: 3 },
});
