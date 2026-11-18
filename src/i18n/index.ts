/**
 * UI strings. SKELETON — the app-shell owner expands it to all 17 languages (types.ts LANGS), picks the
 * language from expo-localization (fallback en) and may add keys. Keys used by the coloring screen:
 * coloring.back · coloring.undo · coloring.hint · coloring.palette · coloring.color (a11y, "{n}" = 1..7)
 */
import type { Lang } from '@/coloring/types';

const en = {
  'coloring.back': 'Back',
  'coloring.undo': 'Undo',
  'coloring.hint': 'Hold your finger on the picture to pick a colour',
  'coloring.palette': 'Colours',
  'coloring.color': 'Colour {n}',
};
export type Key = keyof typeof en;
const pl: Record<Key, string> = {
  'coloring.back': 'Wróć',
  'coloring.undo': 'Cofnij',
  'coloring.hint': 'Przytrzymaj palec na obrazku, żeby wybrać kolor',
  'coloring.palette': 'Kolory',
  'coloring.color': 'Kolor {n}',
};

export function useLang(): Lang {
  return 'pl';
}

export function useT() {
  const lang = useLang();
  const table: Record<Key, string> = lang === 'pl' ? pl : en;
  return (key: Key, vars?: Record<string, string | number>) =>
    table[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ''));
}
