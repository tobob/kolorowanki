/**
 * Saved colourings (docs/ARCHITECTURE.md → store.ts), backed by expo-sqlite/kv-store.
 * Reads are synchronous through an in-memory cache; writes update the cache, notify subscribers
 * (so gallery thumbnails follow live) and persist (synchronously, see persist()).
 */
import { useSyncExternalStore } from 'react';
import Storage from 'expo-sqlite/kv-store';

import type { Fills } from './types';

const FILLS = 'kolorowanki.fills.';
const LAST = 'kolorowanki.last.';
const HINT_DONE = 'kolorowanki.hintDone';

const EMPTY: Fills = Object.freeze({}) as Fills;

const fillsCache = new Map<string, Fills>();
const lastCache = new Map<string, string | null>();
let colored: Set<string> | null = null;
let hintDone: boolean | null = null;

const pageListeners = new Map<string, Set<() => void>>();
const globalListeners = new Set<() => void>();

function emit(pageId: string) {
  pageListeners.get(pageId)?.forEach((l) => l());
  globalListeners.forEach((l) => l());
}

function parseFills(raw: string | null): Fills {
  if (!raw) return EMPTY;
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Fills = {};
    for (const [k, v] of Object.entries(obj)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && typeof v === 'string') out[i] = v;
    }
    return Object.keys(out).length ? out : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * Writes are synchronous on purpose: one tiny row per change (well under a millisecond), and it keeps
 * a single connection/ordering — an async write could otherwise land after a later resetAll().
 */
function persist(key: string, value: string | null) {
  try {
    if (value === null) Storage.removeItemSync(key);
    else Storage.setItemSync(key, value);
  } catch (e) {
    if (__DEV__) console.warn('coloring store: write failed', key, e);
  }
}

/** Current fills of a page (sync, cached). */
export function loadFills(pageId: string): Fills {
  let f = fillsCache.get(pageId);
  if (f === undefined) {
    let raw: string | null = null;
    try {
      raw = Storage.getItemSync(FILLS + pageId);
    } catch {}
    f = parseFills(raw);
    fillsCache.set(pageId, f);
  }
  return f;
}

/** Replace the fills of a page. Pass a new object (fills are treated as immutable). */
export function saveFills(pageId: string, fills: Fills): void {
  const empty = Object.keys(fills).length === 0;
  const next = empty ? EMPTY : fills;
  if (fillsCache.get(pageId) === next) return;
  fillsCache.set(pageId, next);
  const ids = coloredIds();
  const had = ids.has(pageId);
  if (had === empty) {
    const copy = new Set(ids);
    if (empty) copy.delete(pageId);
    else copy.add(pageId);
    colored = copy;
  }
  persist(FILLS + pageId, empty ? null : JSON.stringify(next));
  emit(pageId);
}

function coloredIds(): Set<string> {
  if (!colored) {
    const set = new Set<string>();
    try {
      for (const key of Storage.getAllKeysSync()) {
        if (!key.startsWith(FILLS)) continue;
        const id = key.slice(FILLS.length);
        if (Object.keys(loadFills(id)).length) set.add(id);
      }
    } catch {}
    colored = set;
  }
  return colored;
}

function subscribePage(pageId: string, l: () => void) {
  let set = pageListeners.get(pageId);
  if (!set) pageListeners.set(pageId, (set = new Set()));
  set.add(l);
  return () => {
    set.delete(l);
    if (!set.size) pageListeners.delete(pageId);
  };
}

function subscribeAll(l: () => void) {
  globalListeners.add(l);
  return () => {
    globalListeners.delete(l);
  };
}

/** Live fills of a page. */
export function useFills(pageId: string): Fills {
  return useSyncExternalStore(
    (l) => subscribePage(pageId, l),
    () => loadFills(pageId),
  );
}

/** Ids of pages with at least one coloured region (live). */
export function useColoredIds(): Set<string> {
  return useSyncExternalStore(subscribeAll, coloredIds);
}

/** Last colour picked on a page (quick tap uses it), or null. */
export function loadLastColor(pageId: string): string | null {
  let c = lastCache.get(pageId);
  if (c === undefined) {
    try {
      c = Storage.getItemSync(LAST + pageId);
    } catch {
      c = null;
    }
    lastCache.set(pageId, c);
  }
  return c;
}

export function saveLastColor(pageId: string, color: string): void {
  if (lastCache.get(pageId) === color) return;
  lastCache.set(pageId, color);
  persist(LAST + pageId, color);
}

/** Whether the "hold to pick a colour" hint was already understood (a colour was picked once). */
export function isHintDone(): boolean {
  if (hintDone === null) {
    try {
      hintDone = Storage.getItemSync(HINT_DONE) === '1';
    } catch {
      hintDone = false;
    }
  }
  return hintDone;
}

export function markHintDone(): void {
  if (isHintDone()) return;
  hintDone = true;
  persist(HINT_DONE, '1');
}

/** Erase every saved colouring (parents' area). */
export function resetAll(): void {
  let keys: string[] = [];
  try {
    keys = Storage.getAllKeysSync().filter((k) => k.startsWith(FILLS) || k.startsWith(LAST));
  } catch {}
  const ids = new Set<string>([...fillsCache.keys(), ...keys.filter((k) => k.startsWith(FILLS)).map((k) => k.slice(FILLS.length))]);
  for (const k of keys) {
    try {
      Storage.removeItemSync(k);
    } catch {}
  }
  for (const id of ids) fillsCache.set(id, EMPTY);
  lastCache.clear();
  colored = new Set();
  ids.forEach((id) => pageListeners.get(id)?.forEach((l) => l()));
  globalListeners.forEach((l) => l());
}
