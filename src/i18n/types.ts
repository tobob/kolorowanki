import type { Key } from './locales/en';

export type { Key };
/** UI strings of one language plus number words 0..9 (the parental gate writes its question in words). */
export type Locale = { strings: Record<Key, string>; numbers: string[] };
