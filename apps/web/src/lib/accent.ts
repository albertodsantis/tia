import {
  ALLOWED_CONIC_KEYS,
  ALLOWED_GRADIENT_KEYS,
  ALLOWED_RETRO_KEYS,
  type ConicKey,
  type GradientKey,
  type RetroKey,
} from '@shared';

const GRADIENT_KEY_SET = new Set<string>(ALLOWED_GRADIENT_KEYS);
const CONIC_KEY_SET = new Set<string>(ALLOWED_CONIC_KEYS);
const RETRO_KEY_SET = new Set<string>(ALLOWED_RETRO_KEYS);

function asGradientKey(value: string): GradientKey | null {
  return GRADIENT_KEY_SET.has(value) ? (value as GradientKey) : null;
}
function asConicKey(value: string): ConicKey | null {
  return CONIC_KEY_SET.has(value) ? (value as ConicKey) : null;
}
function asRetroKey(value: string): RetroKey | null {
  return RETRO_KEY_SET.has(value) ? (value as RetroKey) : null;
}

export const ACCENT_OPTIONS = [
  { name: 'Efi', value: 'gradient:efi' },
  { name: 'Vintage TV', value: 'retro:crt' },
  { name: 'Dawn', value: 'gradient:dawn' },
  { name: 'IG', value: 'gradient:instagram' },
  { name: 'TikTok', value: 'conic:tiktok' },
  { name: 'Matcha', value: '#74A12E' },
  { name: 'Youtube', value: '#FF0000' },
  { name: 'Eucalipto', value: '#5D8D7B' },
  { name: 'Twitch', value: '#9146FF' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Cielo', value: '#0EA5E9' },
  { name: 'Turquesa', value: '#06B6D4' },
  { name: 'Fucsia', value: '#D946EF' },
] as const;

export const DEFAULT_ACCENT = 'gradient:instagram';

// Retro presets — stored as "retro:<key>" in the database
const RETRO_PRESETS: Record<RetroKey, { representative: string; swatch: string }> = {
  crt: {
    representative: '#FFB000',
    swatch: 'radial-gradient(ellipse at 42% 38%, #FFD966 0%, #FFB000 35%, #7A4F00 70%, #140900 100%)',
  },
};

// Gradient presets — stored as "gradient:<key>" in the database
const GRADIENT_PRESETS: Record<GradientKey, { gradient: string; representative: string }> = {
  efi: {
    gradient: 'linear-gradient(180deg, #FF1E7A 0%, #FF4D3D 55%, #FFA500 100%)',
    representative: '#FF1E7A',
  },
  instagram: {
    gradient: 'linear-gradient(135deg, #FCAF45, #F56040, #E1306C, #833AB4)',
    representative: '#E1306C',
  },
  dawn: {
    gradient: 'linear-gradient(180deg, #FF4E36 0%, #FFA100 45%, #FFD93D 100%)',
    representative: '#FFA100',
  },
};

// Conic presets — swatch shows brand colors as pie sections, accent uses representative hex
const CONIC_PRESETS: Record<ConicKey, { conic: string; representative: string; secondary?: string }> = {
  tiktok: {
    conic: 'conic-gradient(#25F4EE 0deg 180deg, #FE2C55 180deg 360deg)',
    representative: '#FE2C55',
    secondary: '#25F4EE',
  },
};

export function isRetroAccent(value: string): boolean {
  return value.startsWith('retro:');
}

export function isGradientAccent(value: string): boolean {
  return value.startsWith('gradient:');
}

export function isConicAccent(value: string): boolean {
  return value.startsWith('conic:');
}

export function getGradientCss(value: string): string | null {
  const key = asGradientKey(value.replace('gradient:', ''));
  return key ? GRADIENT_PRESETS[key].gradient : null;
}

export function getConicCss(value: string): string | null {
  const key = asConicKey(value.replace('conic:', ''));
  return key ? CONIC_PRESETS[key].conic : null;
}

export function getSwatchCss(value: string): string {
  if (isRetroAccent(value)) {
    const key = asRetroKey(value.replace('retro:', ''));
    return key ? RETRO_PRESETS[key].swatch : value;
  }
  if (isGradientAccent(value)) return getGradientCss(value) || value;
  if (isConicAccent(value)) return getConicCss(value) || value;
  return value;
}

export function getAccentSecondary(value: string): string | null {
  if (!isConicAccent(value)) return null;
  const key = asConicKey(value.replace('conic:', ''));
  return key ? CONIC_PRESETS[key].secondary ?? null : null;
}

export function getRepresentativeHex(value: string): string {
  if (isRetroAccent(value)) {
    const key = asRetroKey(value.replace('retro:', ''));
    return key ? RETRO_PRESETS[key].representative : '#FF1E7A';
  }
  if (isGradientAccent(value)) {
    const key = asGradientKey(value.replace('gradient:', ''));
    return key ? GRADIENT_PRESETS[key].representative : '#FF1E7A';
  }
  if (isConicAccent(value)) {
    const key = asConicKey(value.replace('conic:', ''));
    return key ? CONIC_PRESETS[key].representative : '#FF1E7A';
  }
  return value;
}

// Surface overrides — keyed by normalized accent value, defines light + dark surface variables
const SURFACE_THEMES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  'gradient:efi': {
    light: {
      '--surface-app': '#fdf3f0',
      '--surface-shell': 'rgba(253, 243, 240, 0.84)',
      '--surface-card': 'rgba(253, 243, 240, 0.78)',
      '--surface-card-strong': 'rgba(254, 247, 244, 0.94)',
      '--surface-muted': 'rgba(248, 232, 226, 0.78)',
      '--surface-overlay': 'rgba(251, 238, 232, 0.7)',
      '--text-secondary': '#8a3a52',
      '--line-soft': 'rgba(255, 30, 122, 0.12)',
      '--line-strong': 'rgba(255, 30, 122, 0.2)',
      '--body-theme-bg': [
        'radial-gradient(ellipse 60% 22% at 50% 50%, rgba(255, 80, 60, 0.32) 0%, transparent 72%)',
        'linear-gradient(180deg, #ffb3c8 0%, #ff9a90 30%, #ff8856 55%, #ffb347 78%, #fdf3f0 100%)',
      ].join(', '),
    },
    dark: {
      '--surface-app': '#0c0210',
      '--surface-shell': 'rgba(18, 4, 24, 0.84)',
      '--surface-card': 'rgba(24, 6, 32, 0.66)',
      '--surface-card-strong': 'rgba(30, 8, 40, 0.82)',
      '--surface-muted': 'rgba(20, 5, 28, 0.62)',
      '--surface-overlay': 'rgba(14, 3, 20, 0.6)',
      '--line-soft': 'rgba(255, 30, 122, 0.12)',
      '--line-strong': 'rgba(255, 30, 122, 0.2)',
      '--body-theme-bg': [
        'radial-gradient(ellipse 72% 24% at 50% 52%, rgba(255, 30, 122, 0.42) 0%, rgba(255, 77, 61, 0.18) 55%, transparent 82%)',
        'linear-gradient(180deg, #0c0210 0%, #2a0620 16%, #5a0e3e 32%, #a81858 48%, #e02e4a 62%, #f26028 74%, #ffa500 88%, rgba(255, 165, 0, 0.4) 100%)',
      ].join(', '),
    },
  },
  'gradient:dawn': {
    light: {
      '--surface-app': '#f5efed',
      '--surface-shell': 'rgba(245, 239, 237, 0.82)',
      '--surface-card': 'rgba(245, 239, 237, 0.76)',
      '--surface-card-strong': 'rgba(250, 244, 242, 0.92)',
      '--surface-muted': 'rgba(238, 232, 228, 0.74)',
      '--surface-overlay': 'rgba(242, 236, 232, 0.68)',
      '--text-secondary': '#7a5a52',
      '--line-soft': 'rgba(190, 90, 55, 0.12)',
      '--line-strong': 'rgba(190, 90, 55, 0.20)',
      '--body-theme-bg': [
        // Sun warmth at horizon
        'radial-gradient(ellipse 60% 22% at 50% 50%, rgba(255, 140, 50, 0.38) 0%, transparent 72%)',
        // Pastel sky: soft violet → rose pink → warm peach → amber → gold → surface
        'linear-gradient(180deg, #c0aee2 0%, #daa0c8 20%, #f09078 40%, #f7b84e 60%, #fcd86e 78%, #f5efed 100%)',
      ].join(', '),
    },
    dark: {
      '--surface-app': '#06011a',
      '--surface-shell': 'rgba(10, 4, 28, 0.82)',
      '--surface-card': 'rgba(16, 7, 38, 0.65)',
      '--surface-card-strong': 'rgba(20, 9, 46, 0.80)',
      '--surface-muted': 'rgba(14, 6, 32, 0.60)',
      '--surface-overlay': 'rgba(9, 3, 22, 0.58)',
      '--line-soft': 'rgba(255, 145, 42, 0.11)',
      '--line-strong': 'rgba(255, 145, 42, 0.18)',
      '--body-theme-bg': [
        // Sun disk: tiny bright core at horizon
        'radial-gradient(ellipse 14% 7% at 50% 55%, rgba(255, 225, 155, 0.22) 0%, transparent 100%)',
        // Horizon glow burst
        'radial-gradient(ellipse 82% 22% at 50% 56%, rgba(220, 55, 12, 0.46) 0%, rgba(255, 108, 20, 0.18) 54%, transparent 82%)',
        // Full sky: midnight → indigo → purple → magenta → crimson → orange → gold
        'linear-gradient(180deg, #06011a 0%, #1a0845 18%, #4a1265 32%, #8a1450 44%, #c42c22 55%, #e07012 66%, #f5a500 78%, #ffd840 92%, rgba(255, 210, 50, 0.40) 100%)',
      ].join(', '),
    },
  },
  'gradient:instagram': {
    light: {
      '--surface-app': '#f4eef8',
      '--surface-shell': 'rgba(244, 238, 248, 0.82)',
      '--surface-card': 'rgba(244, 238, 248, 0.76)',
      '--surface-card-strong': 'rgba(248, 242, 252, 0.92)',
      '--surface-muted': 'rgba(238, 232, 244, 0.74)',
      '--surface-overlay': 'rgba(242, 236, 248, 0.68)',
      '--text-secondary': '#7a4a7a',
      '--line-soft': 'rgba(180, 60, 150, 0.12)',
      '--line-strong': 'rgba(180, 60, 150, 0.20)',
      '--body-theme-bg': [
        // Pink-magenta warmth at center
        'radial-gradient(ellipse 58% 20% at 50% 52%, rgba(220, 50, 100, 0.30) 0%, transparent 72%)',
        // Pastel IG sky: soft purple → mauve → coral → peach → golden → surface
        'linear-gradient(180deg, #c8a8e8 0%, #e0a0cc 22%, #f07888 42%, #f8a050 62%, #fcc840 80%, #f4eef8 100%)',
      ].join(', '),
    },
    dark: {
      '--surface-app': '#0d0120',
      '--surface-shell': 'rgba(18, 5, 38, 0.82)',
      '--surface-card': 'rgba(25, 8, 50, 0.65)',
      '--surface-card-strong': 'rgba(30, 10, 58, 0.80)',
      '--surface-muted': 'rgba(22, 6, 44, 0.60)',
      '--surface-overlay': 'rgba(16, 4, 32, 0.58)',
      '--line-soft': 'rgba(200, 60, 180, 0.12)',
      '--line-strong': 'rgba(200, 60, 180, 0.20)',
      '--body-theme-bg': [
        // Magenta core glow at mid-screen
        'radial-gradient(ellipse 75% 25% at 50% 52%, rgba(200, 25, 90, 0.45) 0%, rgba(230, 60, 40, 0.18) 55%, transparent 80%)',
        // Full sky: deep purple → rich purple → hot magenta → red-orange → amber → gold
        'linear-gradient(180deg, #0d0120 0%, #200850 14%, #4a1280 26%, #7a1875 38%, #c01860 50%, #d83840 62%, #e86020 72%, #f59030 82%, #fcb840 92%, rgba(252, 184, 64, 0.40) 100%)',
      ].join(', '),
    },
  },
  'retro:crt': {
    light: {
      '--surface-app': '#0b0800',
      '--surface-shell': 'rgba(18, 12, 0, 0.94)',
      '--surface-card': 'rgba(24, 16, 0, 0.88)',
      '--surface-card-strong': 'rgba(30, 20, 0, 0.96)',
      '--surface-muted': 'rgba(20, 13, 0, 0.82)',
      '--surface-overlay': 'rgba(14, 9, 0, 0.72)',
      '--text-primary': '#ffd077',
      '--text-secondary': '#b87f2a',
      '--line-soft': 'rgba(255, 176, 0, 0.11)',
      '--line-strong': 'rgba(255, 176, 0, 0.18)',
    },
    dark: {
      '--surface-app': '#0b0800',
      '--surface-shell': 'rgba(18, 12, 0, 0.94)',
      '--surface-card': 'rgba(24, 16, 0, 0.88)',
      '--surface-card-strong': 'rgba(30, 20, 0, 0.96)',
      '--surface-muted': 'rgba(20, 13, 0, 0.82)',
      '--surface-overlay': 'rgba(14, 9, 0, 0.72)',
      '--text-primary': '#ffd077',
      '--text-secondary': '#b87f2a',
      '--line-soft': 'rgba(255, 176, 0, 0.11)',
      '--line-strong': 'rgba(255, 176, 0, 0.18)',
    },
  },
  '#74a12e': {
    light: {
      '--surface-app': '#f0f4eb',
      '--surface-shell': 'rgba(247, 252, 242, 0.88)',
      '--surface-card': 'rgba(247, 252, 242, 0.84)',
      '--surface-card-strong': 'rgba(250, 254, 246, 0.96)',
      '--surface-muted': 'rgba(234, 242, 226, 0.84)',
      '--surface-overlay': 'rgba(244, 250, 237, 0.72)',
      '--text-secondary': '#5c6b52',
      '--line-soft': 'rgba(72, 96, 52, 0.12)',
      '--line-strong': 'rgba(72, 96, 52, 0.18)',
    },
    dark: {
      '--surface-app': '#0e1209',
      '--surface-shell': 'rgba(16, 22, 12, 0.9)',
      '--surface-card': 'rgba(22, 30, 17, 0.84)',
      '--surface-card-strong': 'rgba(28, 37, 22, 0.96)',
      '--surface-muted': 'rgba(20, 28, 14, 0.78)',
      '--surface-overlay': 'rgba(16, 22, 12, 0.68)',
      '--text-secondary': '#8aaa7a',
      '--line-soft': 'rgba(116, 161, 46, 0.1)',
      '--line-strong': 'rgba(116, 161, 46, 0.16)',
    },
  },
};

const SURFACE_OVERRIDE_KEYS = [
  '--surface-app',
  '--surface-shell',
  '--surface-card',
  '--surface-card-strong',
  '--surface-muted',
  '--surface-overlay',
  '--text-primary',
  '--text-secondary',
  '--line-soft',
  '--line-strong',
  '--body-theme-bg',
] as const;

function getDefaultBodyBg(theme: 'light' | 'dark'): string {
  if (theme === 'dark') {
    return [
      'radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color) 6%, transparent) 0%, transparent 28%)',
      'radial-gradient(circle at bottom left, rgba(99, 110, 140, 0.04) 0%, transparent 24%)',
      'linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 94%, black) 0%, var(--surface-app) 100%)',
    ].join(', ');
  }
  return [
    'radial-gradient(circle at top right, color-mix(in srgb, var(--accent-color) 14%, transparent) 0%, transparent 34%)',
    'radial-gradient(circle at bottom left, rgba(114, 151, 140, 0.12) 0%, transparent 30%)',
    'linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 82%, white) 0%, var(--surface-app) 100%)',
  ].join(', ');
}

export function getSurfaceOverrides(accentColor: string, theme: 'light' | 'dark'): Record<string, string> {
  const themeData = SURFACE_THEMES[accentColor.toLowerCase()];
  const overrides = themeData ? themeData[theme] : {};
  return Object.fromEntries(
    SURFACE_OVERRIDE_KEYS.map((key) => [
      key,
      overrides[key] ?? (key === '--body-theme-bg' ? getDefaultBodyBg(theme) : ''),
    ])
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');

  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toLinearChannel(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getLuminance(hex: string) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return 0;
  }

  const red = toLinearChannel(rgb.r);
  const green = toLinearChannel(rgb.g);
  const blue = toLinearChannel(rgb.b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(colorA: string, colorB: string) {
  const luminanceA = getLuminance(colorA);
  const luminanceB = getLuminance(colorB);
  const lightest = Math.max(luminanceA, luminanceB);
  const darkest = Math.min(luminanceA, luminanceB);

  return (lightest + 0.05) / (darkest + 0.05);
}

export function withAlpha(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getAccessibleAccentForeground(value: string) {
  const hex = getRepresentativeHex(value);
  const slate = '#0f172a';
  const white = '#ffffff';

  return getContrastRatio(hex, slate) >= getContrastRatio(hex, white) ? slate : white;
}

export function getAccentCssVariables(value: string) {
  const hex = getRepresentativeHex(value);
  const foreground = getAccessibleAccentForeground(hex);
  const gradientCss = isGradientAccent(value)
    ? getGradientCss(value)
    : hex;

  const conicKey = isConicAccent(value) ? asConicKey(value.replace('conic:', '')) : null;
  const secondary = conicKey
    ? (CONIC_PRESETS[conicKey].secondary ?? 'transparent')
    : 'transparent';

  return {
    '--accent-color': hex,
    '--accent-gradient': gradientCss || hex,
    '--accent-foreground': foreground,
    '--accent-soft': withAlpha(hex, 0.12),
    '--accent-soft-strong': withAlpha(hex, 0.18),
    '--accent-border': withAlpha(hex, 0.22),
    '--accent-glow': withAlpha(hex, 0.3),
    '--accent-secondary': secondary,
  } as const;
}
