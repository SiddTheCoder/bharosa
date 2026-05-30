import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera, Check, MapPin, Store, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Card, Txt } from '@/components/ui/Bharosa';
import { color, font, radius, shadow } from '@/constants/theme';
import { mockMerchant, useMockPassport } from '@/lib/mockData';

export default function EditProfileScreen() {
  const passport = useMockPassport(); // TODO: server API — currently mocked
  const [form, setForm] = useState({
    businessName: passport.merchant_name,
    ownerName: mockMerchant.owner,
    businessType: mockMerchant.business,
    city: mockMerchant.city,
    since: mockMerchant.since,
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroller} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <ArrowLeft size={20} color={color.ink} strokeWidth={2} />
            </Pressable>
            <View>
              <Txt style={styles.title}>Edit profile</Txt>
              <Txt style={styles.subtitle}>Merchant information</Txt>
            </View>
            <View style={styles.iconSpacer} />
          </View>

          <LinearGradient colors={[color.g50, '#FFFFFF']} style={styles.avatarCard}>
            <View style={styles.avatarOuter}>
              <LinearGradient colors={[color.g400, color.g700]} style={styles.avatar}>
                <Txt style={styles.avatarText}>{mockMerchant.initials}</Txt>
              </LinearGradient>
              <Pressable style={({ pressed }) => [styles.camera, pressed && styles.pressed]}>
                <Camera size={15} color="#fff" strokeWidth={2} />
              </Pressable>
            </View>
            <Txt style={styles.avatarHint}>Tap camera to update store photo</Txt>
          </LinearGradient>

          <Card style={styles.form}>
            <Field icon={Store} label="Business name" value={form.businessName} onChangeText={(businessName) => setForm((prev) => ({ ...prev, businessName }))} />
            <Field icon={UserRound} label="Owner name" value={form.ownerName} onChangeText={(ownerName) => setForm((prev) => ({ ...prev, ownerName }))} />
            <Field icon={Store} label="Business type" value={form.businessType} onChangeText={(businessType) => setForm((prev) => ({ ...prev, businessType }))} />
            <Field icon={MapPin} label="City" value={form.city} onChangeText={(city) => setForm((prev) => ({ ...prev, city }))} />
            <Field icon={Check} label="Operating since" value={form.since} onChangeText={(since) => setForm((prev) => ({ ...prev, since }))} keyboardType="number-pad" />
          </Card>

          <Card style={styles.note}>
            <Txt style={styles.noteTitle}>Verification note</Txt>
            <Txt style={styles.noteText}>Changes are mocked for Phase A. Later this form should update the merchant profile through the server API.</Txt>
          </Card>

          <View style={styles.footer}>
            <Btn variant="line" onPress={() => router.back()} style={styles.footerBtn}>Cancel</Btn>
            <Btn onPress={() => router.back()} style={styles.footerBtn}>Save changes</Btn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ icon: Icon, label, value, onChangeText, keyboardType = 'default' }: { icon: typeof Store; label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'number-pad' }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}>
        <Icon size={18} color={color.g600} strokeWidth={1.9} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={styles.fieldLabel}>{label}</Txt>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable
          multiline={false}
          keyboardType={keyboardType}
          autoCorrect={false}
          autoCapitalize="words"
          style={styles.input}
          selectionColor={color.g600}
          placeholderTextColor={color.faint}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  keyboard: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: color.hair, alignItems: 'center', justifyContent: 'center' },
  iconSpacer: { width: 42 },
  title: { fontFamily: font.extra, fontSize: 22, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { color: color.muted, fontFamily: font.medium, fontSize: 12.5, textAlign: 'center', marginTop: 1 },
  scroller: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 24 },
  avatarCard: { borderRadius: radius.xl, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: color.hair, marginBottom: 14, ...shadow.card },
  avatarOuter: { width: 88, height: 88, borderRadius: 88, padding: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: color.g100 },
  avatar: { flex: 1, borderRadius: 88, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.extra, fontSize: 26 },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 30, height: 30, borderRadius: 30, backgroundColor: color.g600, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarHint: { color: color.muted, fontFamily: font.medium, fontSize: 12.5, marginTop: 12 },
  form: { paddingHorizontal: 14, paddingVertical: 2, marginBottom: 14 },
  field: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: color.hair },
  fieldIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: color.g50, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: color.muted, fontFamily: font.semibold, fontSize: 11.5 },
  input: { minHeight: 38, color: color.ink, fontFamily: font.bold, fontSize: 15, paddingVertical: 7, paddingHorizontal: 10, marginTop: 4, borderRadius: 11, backgroundColor: color.bg, borderWidth: 1, borderColor: color.hair },
  note: { padding: 14, backgroundColor: color.g50 },
  noteTitle: { fontFamily: font.bold, fontSize: 13.5 },
  noteText: { color: color.ink2, fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 4, paddingBottom: 8 },
  footerBtn: { flex: 1 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
});
