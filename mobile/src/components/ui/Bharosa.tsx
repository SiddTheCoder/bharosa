import type { ComponentType, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import type { LucideProps } from 'lucide-react-native';

import { color, font, radius, scoreBand, shadow } from '@/constants/theme';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Txt({ children, style, np }: { children: ReactNode; style?: StyleProp<TextStyle>; np?: boolean }) {
  return <Text style={[styles.text, np && styles.np, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'amber' | 'ghost' | 'red' }) {
  const palette = {
    green: [color.g100, color.g700, color.g500],
    amber: [color.amber100, color.amber700, color.amber600],
    ghost: [color.hair, color.ink2, color.faint],
    red: [color.red100, color.red600, color.red600],
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette[0] }]}>
      <View style={[styles.dot, { backgroundColor: palette[2] }]} />
      <Txt style={[styles.pillText, { color: palette[1] }]}>{children}</Txt>
    </View>
  );
}

export function Btn({ children, variant = 'primary', onPress, style }: { children: ReactNode; variant?: 'primary' | 'ghost' | 'line' | 'light'; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'line' && styles.buttonLine,
        variant === 'light' && styles.buttonLight,
        pressed && styles.pressed,
        style,
      ]}>
      <Txt style={[styles.buttonText, variant === 'primary' && styles.buttonPrimaryText, variant === 'light' && styles.buttonLightText]}>
        {children}
      </Txt>
    </Pressable>
  );
}

export function ScoreRing({ score, size = 116, white = false }: { score: number; size?: number; white?: boolean }) {
  const stroke = size > 100 ? 10 : 9;
  const center = size / 2;
  const radiusValue = center - stroke;
  const circumference = 2 * Math.PI * radiusValue;
  const pct = Math.max(0, Math.min(1, score / 1000));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={radiusValue} fill="none" stroke={white ? 'rgba(255,255,255,0.22)' : color.hair} strokeWidth={stroke} />
          <Circle
            cx={center}
            cy={center}
            r={radiusValue}
            fill="none"
            stroke={white ? '#FFFFFF' : scoreBand(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - pct)}
          />
        </G>
      </Svg>
      <View style={styles.ringCenter}>
        <Txt style={[styles.ringScore, white && styles.whiteText, size < 100 && styles.ringScoreSmall]}>{score}</Txt>
        <Txt style={[styles.ringOf, white && styles.whiteMuted]}>OF 1000</Txt>
      </View>
    </View>
  );
}

export function Meter({ value }: { value: number }) {
  return (
    <View style={styles.meter}>
      <View style={[styles.meterFill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

export function SectionHeader({ icon: Icon, title, subtitle }: { icon: ComponentType<LucideProps>; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Icon size={17} color={color.g600} strokeWidth={1.9} />
      </View>
      <View>
        <Txt style={styles.sectionTitle}>{title}</Txt>
        {subtitle ? <Txt style={styles.sectionSub}>{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

export function ListRow({ icon: Icon, title, subtitle, tone = 'green' }: { icon: ComponentType<LucideProps>; title: string; subtitle: string; tone?: 'green' | 'amber' }) {
  return (
    <View style={styles.listRow}>
      <View style={[styles.listIcon, tone === 'amber' && styles.listIconAmber]}>
        <Icon size={19} color={tone === 'amber' ? color.amber600 : color.g600} strokeWidth={1.9} />
      </View>
      <View style={styles.flex}>
        <Txt style={styles.listTitle}>{title}</Txt>
        <Txt style={styles.listSub}>{subtitle}</Txt>
      </View>
    </View>
  );
}

export function StatusRow({ icon: Icon, title, subtitle }: { icon: ComponentType<LucideProps>; title: string; subtitle: string }) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusIcon}>
        <Icon size={18} color={color.g600} strokeWidth={1.9} />
      </View>
      <View style={styles.flex}>
        <Txt style={styles.statusTitle}>{title}</Txt>
        <Txt style={styles.statusSub}>{subtitle}</Txt>
      </View>
      <View style={styles.check}>
        <Txt style={styles.checkText}>✓</Txt>
      </View>
    </View>
  );
}

export function WeightBar({ label, value, barColor }: { label: string; value: number; barColor: string }) {
  return (
    <View style={styles.weight}>
      <View style={styles.between}>
        <Txt style={styles.weightLabel}>{label}</Txt>
        <Txt style={styles.weightPct}>{value}%</Txt>
      </View>
      <View style={styles.weightTrack}>
        <View style={[styles.weightFill, { width: `${value}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export function Timeline({ items }: { items: Array<{ title: string; date: string }> }) {
  return (
    <View style={styles.timeline}>
      {items.map((item, index) => (
        <View key={item.title} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          {index < items.length - 1 ? <View style={styles.timelineLine} /> : null}
          <Txt style={styles.timelineTitle}>{item.title}</Txt>
          <Txt style={styles.timelineDate}>{item.date}</Txt>
        </View>
      ))}
    </View>
  );
}

export function MiniQr() {
  return (
    <Svg width={50} height={50} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="8" fill="#fff" />
      {[
        [4, 4, 11, 11], [25, 4, 11, 11], [4, 25, 11, 11],
        [19, 4, 2, 2], [19, 9, 2, 2], [19, 19, 2, 2], [24, 19, 2, 2],
        [29, 19, 2, 2], [34, 24, 2, 2], [19, 24, 2, 2], [24, 29, 2, 2],
        [29, 29, 2, 2], [34, 34, 2, 2], [19, 34, 2, 2], [24, 34, 2, 2],
      ].map(([x, y, w, h]) => <Rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={w > 3 ? 1 : 0} fill={color.ink} />)}
      <Rect x="7" y="7" width="5" height="5" fill="#fff" />
      <Rect x="28" y="7" width="5" height="5" fill="#fff" />
      <Rect x="7" y="28" width="5" height="5" fill="#fff" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 116 },
  text: { color: color.ink, fontFamily: font.regular },
  np: { fontFamily: font.deva },
  whiteText: { color: '#fff' },
  whiteMuted: { color: 'rgba(255,255,255,0.72)' },
  flex: { flex: 1, minWidth: 0 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: color.card, borderRadius: radius.lg, borderWidth: 1, borderColor: color.hair, ...shadow.card },
  pill: { height: 26, paddingHorizontal: 11, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 7 },
  pillText: { fontSize: 12.5, fontFamily: font.semibold },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonPrimary: { backgroundColor: color.g600 },
  buttonGhost: { backgroundColor: color.g50 },
  buttonLine: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: color.line },
  buttonLight: { backgroundColor: '#fff' },
  buttonText: { fontFamily: font.bold, fontSize: 15, color: color.g700 },
  buttonPrimaryText: { color: '#fff' },
  buttonLightText: { color: color.g700 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  ringCenter: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontFamily: font.extra, fontSize: 31, letterSpacing: -1 },
  ringScoreSmall: { fontSize: 27 },
  ringOf: { marginTop: 3, fontFamily: font.semibold, color: color.muted, fontSize: 10.5, letterSpacing: 0.3 },
  meter: { height: 7, borderRadius: 99, backgroundColor: color.hair, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 99, backgroundColor: color.g600 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15.5, fontFamily: font.bold, letterSpacing: -0.2 },
  sectionSub: { marginTop: 1, fontSize: 12, color: color.muted, fontFamily: font.medium },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: color.hair },
  listIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  listIconAmber: { backgroundColor: color.amber50 },
  listTitle: { fontSize: 14, fontFamily: font.bold },
  listSub: { marginTop: 1, fontSize: 12, color: color.muted, fontFamily: font.medium },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1, borderTopColor: color.hair },
  statusIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 13.5, fontFamily: font.bold },
  statusSub: { marginTop: 1, fontSize: 11.5, color: color.muted, fontFamily: font.medium },
  check: { width: 22, height: 22, borderRadius: 22, backgroundColor: color.g500, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontFamily: font.extra, fontSize: 13 },
  weight: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: color.hair },
  weightLabel: { fontSize: 13, fontFamily: font.bold },
  weightPct: { fontSize: 12, fontFamily: font.bold, color: color.muted },
  weightTrack: { height: 7, borderRadius: 99, backgroundColor: color.hair, overflow: 'hidden', marginTop: 7 },
  weightFill: { height: '100%', borderRadius: 99 },
  timeline: { paddingLeft: 20, marginTop: 8 },
  timelineItem: { position: 'relative', paddingBottom: 16 },
  timelineDot: { position: 'absolute', left: -15, top: 4, width: 9, height: 9, borderRadius: 9, backgroundColor: color.g500, borderWidth: 3, borderColor: color.g50 },
  timelineLine: { position: 'absolute', left: -11, top: 14, bottom: -2, width: 1.5, backgroundColor: color.hair },
  timelineTitle: { fontSize: 13, fontFamily: font.semibold, lineHeight: 18 },
  timelineDate: { marginTop: 2, fontSize: 11.5, color: color.faint, fontFamily: font.medium },
});
