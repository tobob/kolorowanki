import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Calm visual tokens (same language as Pasujki: pastel surfaces, soft charcoal text, slow eased motion).
 * Light UI only — the pages are white paper, so a dark shell would make them glare.
 */
export const TONE = {
  /** Soft cream paper behind everything (also splash + adaptive icon background). */
  bg: '#FFF8EE',
  /** Slightly warmer surface for the grown-ups area, so it reads as "a different room". */
  bgAlt: '#F7F1F8',
  card: '#FFFFFF',
  text: '#4B4453',
  muted: '#6E6677', // Pastelki ink-soft (docs/BRAND.md): 5.2:1 on cream, AA
  line: '#EDE6EF',
  /** One soft pastel per level card (1..4), and a deeper tone of the same hue for its dots. */
  level: ['#FCE3D9', '#DDEFDB', '#DCEAF7', '#ECE1F6'],
  levelDeep: ['#F0A98F', '#8FCB93', '#8DB8E2', '#B79AD9'],
  dotEmpty: '#E8E1EB',
  accent: '#8FCB93',
  warm: '#B5654A',
} as const;

export const RADIUS = { card: 28, tile: 22, pill: 999 } as const;

export const SHADOW = {
  soft: '0px 4px 14px rgba(75, 68, 83, 0.10)',
  lifted: '0px 10px 24px rgba(75, 68, 83, 0.16)',
} as const;

/** Motion stays within 250–600 ms, ease-in-out; nothing bounces or flashes. */
export const MOTION = {
  fast: 250,
  base: 400,
  slow: 600,
  easing: Easing.inOut(Easing.quad),
} as const;

export const FONT = Platform.select({ ios: 'ui-rounded', default: undefined });
