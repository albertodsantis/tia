// Single source of truth for the accent-color presets the backend accepts.
// Frontend visual definitions (CSS gradients, swatches) live in
// apps/web/src/lib/accent.ts and must use these same keys.

export const ALLOWED_GRADIENT_KEYS = ['instagram', 'dawn', 'efi'] as const;
export const ALLOWED_CONIC_KEYS = ['tiktok'] as const;
export const ALLOWED_RETRO_KEYS = ['crt'] as const;

export type GradientKey = (typeof ALLOWED_GRADIENT_KEYS)[number];
export type ConicKey = (typeof ALLOWED_CONIC_KEYS)[number];
export type RetroKey = (typeof ALLOWED_RETRO_KEYS)[number];
