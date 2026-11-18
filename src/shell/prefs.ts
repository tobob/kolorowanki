/**
 * Small app-shell preferences, kept only on the device (expo-sqlite/kv-store):
 * whether the "how to play" tutorial was seen, the last page the child opened (for "Keep colouring"),
 * whether music is on (default on, at low volumes) and whether Edyta the sheep reads the tutorial
 * aloud (default on; a grown-ups setting, separate from music — her voice is not music).
 */
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

type Prefs = { tutorialSeen: boolean; lastPageId: string | null; music: boolean; voice: boolean };

const KEY = 'kolorowanki.shell.v1';
const DEFAULTS: Prefs = { tutorialSeen: false, lastPageId: null, music: true, voice: true };
const listeners = new Set<() => void>();
let state: Prefs | null = null;

function get(): Prefs {
  if (state === null) {
    try {
      const raw = Storage.getItemSync(KEY);
      state = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULTS;
    } catch {
      state = DEFAULTS;
    }
  }
  return state;
}

function set(patch: Partial<Prefs>) {
  const next = { ...get(), ...patch };
  const prev = get();
  if ((Object.keys(next) as (keyof Prefs)[]).every((k) => next[k] === prev[k])) return;
  state = next;
  try {
    Storage.setItemSync(KEY, JSON.stringify(next));
  } catch {
    // Never break play over storage; the value still lives in memory.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, get, get);
export const subscribePrefs = subscribe;
export const isMusicOn = () => get().music;
export const setMusicOn = (on: boolean) => set({ music: on });
export const isVoiceOn = () => get().voice;
export const setVoiceOn = (on: boolean) => set({ voice: on });
export const isTutorialSeen = () => get().tutorialSeen;
export const markTutorialSeen = () => set({ tutorialSeen: true });
export const setLastPage = (id: string) => set({ lastPageId: id });
