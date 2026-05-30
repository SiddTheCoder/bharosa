import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgeCheck, Camera, CheckCircle2, ChevronRight, CreditCard, FileBadge, IdCard, ShieldCheck, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Card, Txt } from '@/components/ui/Bharosa';
import { color, font, radius, shadow } from '@/constants/theme';

const docs = [
  { icon: IdCard, title: 'Citizenship / ID Card', subtitle: 'Front and back photo' },
  { icon: FileBadge, title: 'Passport', subtitle: 'Photo page' },
  { icon: CreditCard, title: 'Driving Licence', subtitle: 'Valid government licence' },
];

export default function KycScreen() {
  const [step, setStep] = useState(0);
  const [documentType, setDocumentType] = useState(docs[0].title);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          {step === 0 ? <ArrowLeft size={20} color={color.ink} strokeWidth={2} /> : <X size={20} color={color.ink} strokeWidth={2} />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Txt style={styles.title}>KYC verification</Txt>
          <Txt style={styles.subtitle}>Step {step + 1} of 4</Txt>
        </View>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progress}>
          {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.progressBar, item <= step && styles.progressOn]} />)}
        </View>

        {step === 0 ? <IntroStep /> : null}
        {step === 1 ? <DocumentStep selected={documentType} onSelect={setDocumentType} /> : null}
        {step === 2 ? <SelfieStep /> : null}
        {step === 3 ? <CompleteStep documentType={documentType} /> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && step < 3 ? <Btn variant="line" onPress={() => setStep((s) => Math.max(0, s - 1))} style={styles.footerBtn}>Back</Btn> : null}
        <Btn onPress={() => (step === 3 ? router.back() : setStep((s) => Math.min(3, s + 1)))} style={styles.footerBtn}>
          {step === 0 ? 'Start verification' : step === 1 ? 'Continue to selfie' : step === 2 ? 'Submit mock KYC' : 'Done'}
        </Btn>
      </View>
    </SafeAreaView>
  );
}

function IntroStep() {
  return (
    <View>
      <LinearGradient colors={[color.g50, '#FFFFFF']} style={styles.hero}>
        <View style={styles.docMock}>
          <View style={styles.docCorners} />
          <IdCard size={58} color={color.g700} strokeWidth={1.7} />
        </View>
        <Txt style={styles.heroTitle}>Let's verify KYC</Txt>
        <Txt style={styles.heroText}>Please submit the following documents to verify your profile.</Txt>
      </LinearGradient>

      <Card style={styles.list}>
        <KycRow icon={IdCard} title="Take a picture of your valid ID" subtitle="To check your personal information is correct" />
        <KycRow icon={Camera} title="Take a selfie of yourself" subtitle="To match your face to your ID photo" />
      </Card>

      <Txt style={styles.help}>Why is this needed?</Txt>
    </View>
  );
}

function DocumentStep({ selected, onSelect }: { selected: string; onSelect: (value: string) => void }) {
  return (
    <View>
      <View style={styles.docHeroSmall}>
        <IdCard size={64} color={color.g700} strokeWidth={1.7} />
      </View>
      <Txt style={styles.screenTitle}>Upload proof of your identity</Txt>
      <Txt style={styles.screenText}>Please choose one document below. Upload is mocked for Phase A.</Txt>

      <Card style={styles.list}>
        {docs.map((doc, index) => (
          <Pressable key={doc.title} onPress={() => onSelect(doc.title)} style={({ pressed }) => [styles.docRow, index > 0 && styles.rowBorder, pressed && styles.rowPressed]}>
            <View style={[styles.rowIcon, selected === doc.title && styles.rowIconActive]}>
              <doc.icon size={18} color={selected === doc.title ? '#fff' : color.g600} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={styles.rowTitle}>{doc.title}</Txt>
              <Txt style={styles.rowSub}>{doc.subtitle}</Txt>
            </View>
            {selected === doc.title ? <CheckCircle2 size={18} color={color.g600} strokeWidth={2} /> : <ChevronRight size={18} color={color.faint} strokeWidth={2} />}
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

function SelfieStep() {
  return (
    <LinearGradient colors={['#10231C', color.g800, '#07100D']} style={styles.selfie}>
      <Txt style={styles.selfieTitle}>Face Recognition</Txt>
      <View style={styles.faceOval}>
        <View style={styles.faceMock}>
          <Txt style={styles.faceInitials}>AS</Txt>
        </View>
      </View>
      <Txt style={styles.selfieInstruction}>Place your face in the oval, then move left, right and smile</Txt>
      <View style={styles.captureRow}>
        <View style={styles.flashSpacer} />
        <Pressable style={({ pressed }) => [styles.capture, pressed && styles.pressed]} />
        <Camera size={24} color="#fff" strokeWidth={2} />
      </View>
    </LinearGradient>
  );
}

function CompleteStep({ documentType }: { documentType: string }) {
  return (
    <View>
      <LinearGradient colors={[color.g50, '#FFFFFF']} style={styles.complete}>
        <View style={styles.completeIcon}>
          <BadgeCheck size={54} color={color.g700} strokeWidth={1.8} />
        </View>
        <Txt style={styles.heroTitle}>KYC submitted</Txt>
        <Txt style={styles.heroText}>{documentType} and selfie are ready for mock review.</Txt>
      </LinearGradient>
      <Card style={styles.reviewCard}>
        <KycRow icon={ShieldCheck} title="Identity document" subtitle={documentType} done />
        <KycRow icon={Camera} title="Selfie match" subtitle="Face capture completed" done />
        <KycRow icon={CheckCircle2} title="Review status" subtitle="Mock approval for demo" done />
      </Card>
    </View>
  );
}

function KycRow({ icon: Icon, title, subtitle, done }: { icon: typeof IdCard; title: string; subtitle: string; done?: boolean }) {
  return (
    <View style={styles.docRow}>
      <View style={[styles.rowIcon, done && styles.rowIconActive]}>
        <Icon size={18} color={done ? '#fff' : color.g600} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.rowTitle}>{title}</Txt>
        <Txt style={styles.rowSub}>{subtitle}</Txt>
      </View>
      {done ? <CheckCircle2 size={18} color={color.g600} strokeWidth={2} /> : <ChevronRight size={18} color={color.faint} strokeWidth={2} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  iconSpacer: { width: 42 },
  title: { fontFamily: font.extra, fontSize: 20, letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { fontFamily: font.medium, color: color.muted, fontSize: 12, textAlign: 'center', marginTop: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 18 },
  progress: { flexDirection: 'row', gap: 7, marginBottom: 16 },
  progressBar: { flex: 1, height: 5, borderRadius: 99, backgroundColor: color.hair },
  progressOn: { backgroundColor: color.g600 },
  hero: { alignItems: 'center', borderRadius: radius.xl, padding: 22, marginBottom: 16, borderWidth: 1, borderColor: color.hair, ...shadow.card },
  docMock: { width: 152, height: 152, borderRadius: 28, backgroundColor: '#E6F6EE', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '5deg' }], marginBottom: 20 },
  docCorners: { position: 'absolute', inset: 14, borderWidth: 1.5, borderColor: 'rgba(21,33,28,0.28)', borderRadius: 18 },
  heroTitle: { fontFamily: font.extra, fontSize: 27, letterSpacing: -0.8, textAlign: 'center' },
  heroText: { fontFamily: font.medium, color: color.ink2, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  list: { paddingHorizontal: 14, paddingVertical: 4, marginBottom: 18 },
  docRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: color.hair },
  rowPressed: { opacity: 0.85 },
  rowIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  rowIconActive: { backgroundColor: color.g600 },
  rowTitle: { fontFamily: font.bold, fontSize: 14.5 },
  rowSub: { fontFamily: font.medium, color: color.muted, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  help: { textAlign: 'center', textDecorationLine: 'underline', fontFamily: font.bold, fontSize: 13, color: color.ink },
  docHeroSmall: { alignSelf: 'center', width: 172, height: 116, borderRadius: 18, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 34, borderWidth: 1, borderColor: color.g100 },
  screenTitle: { fontFamily: font.extra, fontSize: 29, lineHeight: 33, letterSpacing: -1, marginBottom: 10 },
  screenText: { fontFamily: font.medium, color: color.ink2, fontSize: 14, marginBottom: 28 },
  selfie: { minHeight: 560, borderRadius: 28, padding: 18, alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  selfieTitle: { color: '#fff', fontFamily: font.extra, fontSize: 23, marginTop: 8 },
  faceOval: { width: 220, height: 300, borderRadius: 130, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  faceMock: { width: 190, height: 260, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  faceInitials: { color: '#fff', fontFamily: font.extra, fontSize: 48 },
  selfieInstruction: { color: '#fff', fontFamily: font.bold, fontSize: 18, lineHeight: 24, textAlign: 'center', paddingHorizontal: 16 },
  captureRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 46, paddingBottom: 8 },
  flashSpacer: { width: 24 },
  capture: { width: 62, height: 62, borderRadius: 62, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,0.45)' },
  complete: { alignItems: 'center', borderRadius: radius.xl, padding: 28, borderWidth: 1, borderColor: color.hair, marginTop: 22, marginBottom: 16, ...shadow.card },
  completeIcon: { width: 86, height: 86, borderRadius: 86, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  reviewCard: { paddingHorizontal: 14, paddingVertical: 4 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, borderTopWidth: 1, borderTopColor: color.hair, backgroundColor: '#fff' },
  footerBtn: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
