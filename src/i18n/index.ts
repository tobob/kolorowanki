/**
 * UI strings for all 17 Pastelki languages (src/coloring/types.ts LANGS).
 * Language = the grown-ups' choice in settings (persisted in expo-sqlite/kv-store), otherwise the
 * first supported device language (expo-localization), otherwise English.
 * Keys used by the coloring screen: coloring.back · coloring.undo · coloring.hint · coloring.palette · coloring.color
 */
import { useLocales, type Locale as DeviceLocale } from 'expo-localization';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { LANGS, type Lang } from '@/coloring/types';

import cs from './locales/cs';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import hu from './locales/hu';
import it from './locales/it';
import ja from './locales/ja';
import nl from './locales/nl';
import pl from './locales/pl';
import pt from './locales/pt';
import ro from './locales/ro';
import sk from './locales/sk';
import sv from './locales/sv';
import tr from './locales/tr';
import uk from './locales/uk';
import zh from './locales/zh';
import type { Key, Locale } from './types';

export type { Key, Locale };

export const LOCALES: Record<Lang, Locale> = { pl, en, de, fr, es, it, pt, nl, uk, cs, sk, sv, ro, hu, tr, ja, zh };

/** Each language's own name, for the language picker. */
export const LANG_NAMES: Record<Lang, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  uk: 'Українська',
  cs: 'Čeština',
  sk: 'Slovenčina',
  sv: 'Svenska',
  ro: 'Română',
  hu: 'Magyar',
  tr: 'Türkçe',
  ja: '日本語',
  zh: '中文',
};

export const isLang = (x: string | null | undefined): x is Lang => !!x && (LANGS as readonly string[]).includes(x);

/** First supported language among the device's preferred languages, else English. */
export function langFromLocales(locales: readonly DeviceLocale[]): Lang {
  for (const l of locales) {
    const code = l.languageCode?.toLowerCase();
    if (isLang(code)) return code;
  }
  return 'en';
}

// ── grown-ups' override ("auto" = follow the device) ─────────────────────────────────────────────
export type LangSetting = Lang | 'auto';
const KEY = 'kolorowanki.lang.v1';
const listeners = new Set<() => void>();
let setting: LangSetting | null = null;

function readSetting(): LangSetting {
  if (setting === null) {
    try {
      const raw = Storage.getItemSync(KEY);
      setting = isLang(raw) ? raw : 'auto';
    } catch {
      setting = 'auto';
    }
  }
  return setting;
}

export function setLangSetting(next: LangSetting) {
  setting = next;
  try {
    if (next === 'auto') Storage.removeItemSync(KEY);
    else Storage.setItemSync(KEY, next);
  } catch {
    // Storage failure must never break the app; the choice still applies until restart.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useLangSetting(): LangSetting {
  return useSyncExternalStore(subscribe, readSetting, readSetting);
}

/** The device's language (ignores the override). Re-renders when the OS language changes. */
export function useDeviceLang(): Lang {
  return langFromLocales(useLocales());
}

/** The language the UI is shown in. */
export function useLang(): Lang {
  const chosen = useLangSetting();
  const device = useDeviceLang();
  return chosen === 'auto' ? device : chosen;
}

// ── lookups ──────────────────────────────────────────────────────────────────────────────────────
export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  const raw = LOCALES[lang].strings[key] ?? en.strings[key];
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ''));
}

/** Number 0..9 written out as a word ("seven"), used by the parental gate. */
export const numberWord = (lang: Lang, n: number) => LOCALES[lang].numbers[n] ?? String(n);

export function useT() {
  const lang = useLang();
  return (key: Key, vars?: Vars) => translate(lang, key, vars);
}
