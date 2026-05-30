import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Edit3, FileCheck2, HelpCircle, LogOut, Receipt, Settings, ShieldCheck, Store, UserRound, WalletCards } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, Txt } from '@/components/ui/Bharosa';
import { color, font, radius, shadow } from '@/constants/theme';
import { mockMerchant, useMockPassport } from '@/lib/mockData';
import { npr } from '@/lib/passport';

const accountRows: Array<{ icon: typeof Store; title: string; subtitle: string; href?: '/kyc' }> = [
  { icon: Store, title: 'Business details', subtitle: 'Kirana shop · Bhaktapur' },
  { icon: ShieldCheck, title: 'KYC verification', subtitle: 'Identity verified', href: '/kyc' },
  { icon: Receipt, title: 'Bills and records', subtitle: 'Receipts linked to score' },
  { icon: WalletCards, title: 'Loan preferences', subtitle: 'Weekly repayment schedule' },
];

const supportRows = [
  { icon: FileCheck2, title: 'Data permissions', subtitle: 'Manage linked signals' },
  { icon: HelpCircle, title: 'Help and support', subtitle: 'Questions about your passport' },
  { icon: Settings, title: 'App settings', subtitle: 'Language, alerts, security' },
];

export default function ProfileScreen() {
  const passport = useMockPassport(); // TODO: server API — currently mocked

  return (
    <Screen>
      <LinearGradient colors={[color.g50, '#FFFFFF']} style={styles.hero}>
        <View style={styles.headerRow}>
          <View style={styles.backButton}>
            <UserRound size={18} color={color.g700} strokeWidth={2} />
          </View>
          <Txt style={styles.headerTitle}>Profile</Txt>
          <Link href="/edit-profile" asChild>
            <Pressable style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
              <Edit3 size={17} color={color.g700} strokeWidth={2} />
            </Pressable>
          </Link>
        </View>

        <View style={styles.avatarOuter}>
          <LinearGradient colors={[color.g400, color.g700]} style={styles.avatar}>
            <Txt style={styles.avatarText}>{mockMerchant.initials}</Txt>
          </LinearGradient>
        </View>
        <Txt style={styles.name}>{passport.merchant_name}</Txt>
        <Txt style={styles.role}>{mockMerchant.business} · {mockMerchant.city}</Txt>

        <View style={styles.stats}>
          <Stat value={String(passport.score)} label="Score" />
          <Stat value={`${Math.round(passport.confidence * 100)}%`} label="Confidence" />
          <Stat value={npr(passport.loan.amount_npr).replace('NPR ', '')} label="Limit" />
        </View>
      </LinearGradient>

      <Card style={styles.group}>
        {accountRows.map((row, index) => <ProfileRow key={row.title} {...row} first={index === 0} />)}
      </Card>

      <Card style={styles.group}>
        {supportRows.map((row, index) => <ProfileRow key={row.title} {...row} first={index === 0} />)}
      </Card>

      <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <LogOut size={18} color={color.red600} strokeWidth={2} />
        <Txt style={styles.logoutText}>Log out</Txt>
      </Pressable>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt style={styles.statValue}>{value}</Txt>
      <Txt style={styles.statLabel}>{label}</Txt>
    </View>
  );
}

function ProfileRow({ icon: Icon, title, subtitle, first, href }: { icon: typeof Store; title: string; subtitle: string; first?: boolean; href?: '/kyc' }) {
  return (
    <Pressable
      onPress={() => {
        if (href) router.push(href);
      }}
      style={({ pressed }) => [styles.row, !first && styles.rowBorder, pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}>
        <Icon size={18} color={color.g600} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.rowTitle}>{title}</Txt>
        <Txt style={styles.rowSub}>{subtitle}</Txt>
      </View>
      <ChevronRight size={18} color={color.faint} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 16, paddingBottom: 18, marginTop: 8, marginBottom: 14, borderWidth: 1, borderColor: color.hair, ...shadow.card },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hair },
  editButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hair },
  headerTitle: { fontFamily: font.extra, fontSize: 21, letterSpacing: -0.4 },
  avatarOuter: { alignSelf: 'center', width: 82, height: 82, borderRadius: 82, marginTop: 18, padding: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: color.g100 },
  avatar: { flex: 1, borderRadius: 82, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.extra, fontSize: 25 },
  name: { textAlign: 'center', fontFamily: font.extra, fontSize: 24, letterSpacing: -0.6, marginTop: 12 },
  role: { textAlign: 'center', fontFamily: font.medium, color: color.muted, fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: color.hair },
  statValue: { fontFamily: font.extra, fontSize: 18, color: color.g700, letterSpacing: -0.3 },
  statLabel: { fontFamily: font.semibold, fontSize: 11.5, color: color.muted, marginTop: 3 },
  group: { paddingHorizontal: 14, paddingVertical: 2, marginBottom: 14 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.hair },
  rowPressed: { opacity: 0.85 },
  rowIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle: { fontFamily: font.bold, fontSize: 14 },
  rowSub: { fontFamily: font.medium, fontSize: 12, color: color.muted, marginTop: 1 },
  logout: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: color.red100, backgroundColor: color.red50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  logoutText: { color: color.red600, fontFamily: font.bold, fontSize: 14 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
