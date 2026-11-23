export const palette = {
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue700: '#1D4ED8',
  green: '#22C55E',
  greenDark: '#15803D',
  amber: '#F59E0B',
  amberDark: '#B45309',
  red: '#EF4444',
  redDark: '#B91C1C',
} as const;

export const themes = {
  dark: {
    background: '#0A0A0A',
    backgroundElevated: '#0E1116',
    surface: '#121212',
    surfaceElevated: '#171A1F',
    surfaceMuted: '#1A1A1A',
    border: '#262626',
    borderStrong: '#353535',
    text: '#EDEDED',
    textMuted: '#A3A3A3',
    textSubtle: '#737373',
    primary: '#60A5FA',
    primaryStrong: '#3B82F6',
    onPrimary: '#0A0A0A',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    offline: '#737373',
    glow: 'rgba(96, 165, 250, 0.18)',
    grid: 'rgba(96, 165, 250, 0.075)',
    overlay: 'rgba(0, 0, 0, 0.72)',
  },
  light: {
    background: '#F7F3EA',
    backgroundElevated: '#F2ECDE',
    surface: '#FFFDF7',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#ECE6D6',
    border: '#DDD5C1',
    borderStrong: '#C9BEA4',
    text: '#0A0A0A',
    textMuted: '#524A3D',
    textSubtle: '#786F61',
    primary: '#1D4ED8',
    primaryStrong: '#1E40AF',
    onPrimary: '#FAF7EF',
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
    offline: '#78716C',
    glow: 'rgba(29, 78, 216, 0.14)',
    grid: 'rgba(29, 78, 216, 0.08)',
    overlay: 'rgba(10, 10, 10, 0.54)',
  },
} as const;

export type ThemeName = keyof typeof themes;
export type AppColors = (typeof themes)[ThemeName];

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;

export const layout = {
  maxContentWidth: 1240,
  desktopBreakpoint: 980,
  tabletBreakpoint: 720,
  sidebarWidth: 244,
} as const;
