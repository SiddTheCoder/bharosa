import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { mockQuestions } from '@/lib/mockData';
import { color, font } from '@/constants/theme';
import { Txt } from '@/components/ui/Bharosa';

export default function VoiceScreen() {
  const question = mockQuestions[0]; // TODO: server API — currently mocked

  return (
    <LinearGradient colors={['#20303A', '#131A1F', '#0C1114']} style={styles.sheet}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={18} color="#fff" strokeWidth={2} />
        </Pressable>
        <View style={styles.progress}>
          {[0, 1, 2, 3, 4].map((dot) => <View key={dot} style={[styles.progressDot, dot < 2 && styles.progressOn]} />)}
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        <Txt style={styles.tag}>QUESTION 2 OF 5</Txt>
        <Txt np style={styles.questionNe}>{question.text_ne}</Txt>
        <Txt style={styles.questionEn}>{question.text_en}</Txt>

        <View style={styles.chips}>
          {question.chips.map(([en, ne]) => (
            <Pressable key={en} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
              <Txt style={styles.chipEn}>{en}</Txt>
              <Txt np style={styles.chipNe}>{ne}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={styles.micZone}>
          <View style={styles.wave}>
            {Array.from({ length: 18 }).map((_, index) => <View key={index} style={[styles.waveBar, { height: 8 + ((index * 7) % 24) }]} />)}
          </View>
          <Pressable style={({ pressed }) => [styles.micButton, pressed && styles.pressed]}>
            <Mic size={36} color="#fff" strokeWidth={1.8} />
          </Pressable>
          <Txt style={styles.micHint}><Txt np style={styles.micHintNe}>बोल्न थिच्नुहोस्{'\n'}</Txt>Hold to answer out loud</Txt>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <Txt style={styles.typeFallback}>Can't talk now? Type your answer instead</Txt>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  top: { paddingTop: 60, paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  progressDot: { width: 22, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressOn: { backgroundColor: color.g400 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 14, paddingBottom: 26 },
  tag: { color: color.g400, fontFamily: font.bold, fontSize: 12, letterSpacing: 0.3 },
  questionNe: { color: '#fff', fontFamily: font.devaBold, fontSize: 21, lineHeight: 32, marginTop: 14 },
  questionEn: { color: 'rgba(255,255,255,0.62)', fontFamily: font.medium, fontSize: 14, lineHeight: 21, marginTop: 8 },
  chips: { gap: 10, marginTop: 20 },
  chip: { padding: 15, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
  chipPressed: { transform: [{ scale: 0.98 }], borderColor: color.g400, backgroundColor: 'rgba(60,185,138,0.16)' },
  chipEn: { color: '#fff', fontFamily: font.semibold, fontSize: 14.5, lineHeight: 20 },
  chipNe: { color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 3 },
  micZone: { marginTop: 'auto', alignItems: 'center', gap: 14 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34 },
  waveBar: { width: 4, borderRadius: 99, backgroundColor: color.g400, opacity: 0.8 },
  micButton: { width: 88, height: 88, borderRadius: 88, alignItems: 'center', justifyContent: 'center', backgroundColor: color.g600, borderWidth: 12, borderColor: 'rgba(22,160,109,0.22)' },
  micHint: { color: 'rgba(255,255,255,0.7)', fontFamily: font.semibold, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  micHintNe: { color: '#fff', fontFamily: font.devaBold, fontSize: 14 },
  typeFallback: { color: 'rgba(255,255,255,0.55)', fontFamily: font.semibold, fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
});
