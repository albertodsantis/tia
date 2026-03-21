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

export function getAccessibleAccentForeground(hex: string) {
  const slate = '#0f172a';
  const white = '#ffffff';

  return getContrastRatio(hex, slate) >= getContrastRatio(hex, white) ? slate : white;
}

export function getAccentCssVariables(hex: string) {
  const foreground = getAccessibleAccentForeground(hex);

  return {
    '--accent-color': hex,
    '--accent-foreground': foreground,
    '--accent-soft': withAlpha(hex, 0.14),
    '--accent-soft-strong': withAlpha(hex, 0.18),
    '--accent-border': withAlpha(hex, 0.24),
    '--accent-glow': withAlpha(hex, 0.32),
  } as const;
}
