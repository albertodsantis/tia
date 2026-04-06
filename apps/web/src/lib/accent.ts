export const ACCENT_OPTIONS = [
  { name: 'CRT', value: 'retro:crt' },
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

// Retro presets — stored as "retro:<key>" in the database
const RETRO_PRESETS: Record<string, { representative: string; swatch: string }> = {
  crt: {
    representative: '#FFB000',
    swatch: 'radial-gradient(ellipse at 42% 38%, #FFD966 0%, #FFB000 35%, #7A4F00 70%, #140900 100%)',
  },
};

// Gradient presets — stored as "gradient:<key>" in the database
const GRADIENT_PRESETS: Record<string, { gradient: string; representative: string }> = {
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
const CONIC_PRESETS: Record<string, { conic: string; representative: string; secondary?: string }> = {
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
  const key = value.replace('gradient:', '');
  return GRADIENT_PRESETS[key]?.gradient ?? null;
}

export function getConicCss(value: string): string | null {
  const key = value.replace('conic:', '');
  return CONIC_PRESETS[key]?.conic ?? null;
}

export function getSwatchCss(value: string): string {
  if (isRetroAccent(value)) return RETRO_PRESETS[value.replace('retro:', '')]?.swatch ?? value;
  if (isGradientAccent(value)) return getGradientCss(value) || value;
  if (isConicAccent(value)) return getConicCss(value) || value;
  return value;
}

export function getAccentSecondary(value: string): string | null {
  if (!isConicAccent(value)) return null;
  return CONIC_PRESETS[value.replace('conic:', '')]?.secondary ?? null;
}

export function getRepresentativeHex(value: string): string {
  if (isRetroAccent(value)) {
    const key = value.replace('retro:', '');
    return RETRO_PRESETS[key]?.representative ?? '#C96F5B';
  }
  if (isGradientAccent(value)) {
    const key = value.replace('gradient:', '');
    return GRADIENT_PRESETS[key]?.representative ?? '#C96F5B';
  }
  if (isConicAccent(value)) {
    const key = value.replace('conic:', '');
    return CONIC_PRESETS[key]?.representative ?? '#C96F5B';
  }
  return value;
}

// Surface overrides — keyed by normalized accent value, defines light + dark surface variables
const SURFACE_THEMES: Record<string, { light: Record<string, string>; dark: Record<string, string> }> = {
  'gradient:dawn': {
    light: {
      '--body-theme-bg': 'linear-gradient(180deg, rgba(255, 78, 54, 0.28) 0%, rgba(255, 161, 0, 0.16) 22%, rgba(255, 217, 61, 0.06) 44%, transparent 62%), linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 82%, white) 0%, var(--surface-app) 100%)',
    },
    dark: {
      '--body-theme-bg': 'linear-gradient(180deg, rgba(255, 78, 54, 0.22) 0%, rgba(255, 161, 0, 0.12) 22%, rgba(255, 217, 61, 0.05) 44%, transparent 62%), linear-gradient(180deg, color-mix(in srgb, var(--surface-app) 94%, black) 0%, var(--surface-app) 100%)',
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

export function getSurfaceOverrides(accentColor: string, theme: 'light' | 'dark'): Record<string, string> {
  const themeData = SURFACE_THEMES[accentColor.toLowerCase()];
  const overrides = themeData ? themeData[theme] : {};
  return Object.fromEntries(SURFACE_OVERRIDE_KEYS.map((key) => [key, overrides[key] ?? '']));
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

  const secondary = isConicAccent(value)
    ? (CONIC_PRESETS[value.replace('conic:', '')]?.secondary ?? 'transparent')
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
