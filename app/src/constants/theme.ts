export const COLORS = {
  // Backgrounds
  background: '#0D0D1A',
  backgroundSecondary: '#141428',
  card: '#1A1A35',
  cardElevated: '#1F1F40',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#606080',
  textAccent: '#E8C547',

  // Accent
  accent: '#E8C547',
  accentDim: '#C9A832',
  accentGlow: 'rgba(232, 197, 71, 0.15)',

  // Action buttons
  save: '#E8547A',
  saveDim: '#C94065',
  skip: '#5A5A8A',
  seenIt: '#4A90E2',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.15)',

  // Overlays
  overlay: 'rgba(13,13,26,0.7)',
  overlayDark: 'rgba(0,0,0,0.85)',
  gradientStart: 'transparent',
  gradientEnd: 'rgba(13,13,26,0.98)',

  // Status
  error: '#FF5252',
  success: '#4CAF50',
  warning: '#E8C547',
};

export const FONTS = {
  heading: 'System',
  body: 'System',
  mono: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 50,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const STREAMING_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Max': '#002BE7',
  'Hulu': '#1CE783',
  'Disney+': '#113CCF',
  'Prime Video': '#00A8E1',
  'Apple TV+': '#F5F5F7',
  'Peacock': '#F4A701',
  'Paramount+': '#0064FF',
};

export const MOODS = [
  { id: 'Thrilling', label: 'Thrilling', emoji: '⚡' },
  { id: 'Fun', label: 'Fun', emoji: '😄' },
  { id: 'Emotional', label: 'Emotional', emoji: '💔' },
  { id: 'Chill', label: 'Chill', emoji: '😌' },
  { id: 'Mind-Bending', label: 'Mind-Bending', emoji: '🌀' },
  { id: 'Feel-Good', label: 'Feel-Good', emoji: '✨' },
];

export const GENRES = [
  'Thriller', 'Comedy', 'Drama', 'Sci-Fi',
  'Horror', 'Romance', 'Documentary', 'Action', 'Animation',
];

export const STREAMING_SERVICES = [
  'Netflix',
  'Max',
  'Hulu',
  'Disney+',
  'Prime Video',
  'Apple TV+',
  'Peacock',
  'Paramount+',
];
