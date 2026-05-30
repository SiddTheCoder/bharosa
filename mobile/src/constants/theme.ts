import { Platform } from 'react-native';

export const color = {
  ink: '#15211C',
  ink2: '#46554E',
  muted: '#7E8C84',
  faint: '#A7B2AB',
  line: '#E7EBE6',
  hair: '#EFF2EE',
  bg: '#F1F3EE',
  card: '#FFFFFF',
  g800: '#094E38',
  g700: '#0B6E4C',
  g600: '#0E8A5F',
  g500: '#16A06D',
  g400: '#3CB98A',
  g100: '#DCF1E7',
  g50: '#ECF8F2',
  amber700: '#9A6510',
  amber600: '#B5780F',
  amber100: '#FBEAC9',
  amber50: '#FBF3E1',
  red600: '#C0413A',
  red100: '#F7D9D6',
  red50: '#FBEBE9',
  blue600: '#2D6CCB',
  blue50: '#E9F1FB',
} as const;

export const Colors = {
  light: {
    text: color.ink,
    background: color.bg,
    backgroundElement: color.card,
    backgroundSelected: color.g50,
    textSecondary: color.muted,
  },
  dark: {
    text: color.ink,
    background: color.bg,
    backgroundElement: color.card,
    backgroundSelected: color.g50,
    textSecondary: color.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 } as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
  deva: 'NotoSansDevanagari_400Regular',
  devaBold: 'NotoSansDevanagari_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: { sans: font.regular, serif: font.regular, rounded: font.regular, mono: 'Menlo' },
  default: { sans: font.regular, serif: font.regular, rounded: font.regular, mono: 'monospace' },
  web: { sans: font.regular, serif: font.regular, rounded: font.regular, mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export function scoreBand(score: number) {
  if (score < 400) return color.amber600;
  if (score < 700) return color.g500;
  return color.g700;
}

export const shadow = {
  card: {
    shadowColor: '#10281E',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deep: {
    shadowColor: '#10281E',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;
