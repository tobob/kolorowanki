/**
 * Background music (expo-audio): one player at a time, soft fades, never endless.
 *
 *   useMusic('theme')      — home and level screens: the "Ko-lo-ro-wan-ki" theme plays ONCE (volume 0.5,
 *                            1.5 s fade-in) each time the child arrives there (app open, back from a page),
 *                            not again while moving between home and levels.
 *   useMusic('colouring')  — colouring screen: one of 11 slow, drum-free tunes (piano, flute, music box;
 *                            assets/audio/colouring/, rendered with the Pastelki music engine) picked at
 *                            random, never the one just played (volume 0.35). When it ends another one
 *                            follows, up to 3 tunes (~3 min), then the music rests in silence. Moving to the
 *                            next page keeps the current tune playing; after a rest, or when coming back from
 *                            home/levels, the next page starts a new tune.
 *   useMusic(null)         — silence (grown-ups area, tutorial).
 *   <MusicToggle />        — big note button (src/components/music-toggle.tsx); the choice persists.
 *   duckMusic(true/false)  — while Edyta speaks (src/audio/voice.ts) the music dips to 25 % and comes
 *                            back softly afterwards. Calls nest (a counter), so overlapping lines are safe.
 *   initAudio()            — sets up the shared audio session (also used by the voice).
 *
 * Audio session: respects the iOS ring/silent switch (playsInSilentMode false — a muted phone stays quiet),
 * mixes with other audio, never plays in the background (paused at once when the app is left; the
 * app.json plugin disables background audio and the microphone). Audio errors are silence, never a crash.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { isMusicOn, subscribePrefs } from '@/shell/prefs';

export type MusicTrack = 'theme' | 'colouring';

const SOURCES: Record<MusicTrack, number[]> = {
  theme: [require('@/assets/audio/theme.m4a')],
  colouring: [
    require('@/assets/audio/colouring/calm-00.m4a'),
    require('@/assets/audio/colouring/calm-01.m4a'),
    require('@/assets/audio/colouring/calm-02.m4a'),
    require('@/assets/audio/colouring/calm-03.m4a'),
    require('@/assets/audio/colouring/calm-04.m4a'),
    require('@/assets/audio/colouring/calm-05.m4a'),
    require('@/assets/audio/colouring/calm-06.m4a'),
    require('@/assets/audio/colouring/calm-07.m4a'),
    require('@/assets/audio/colouring/calm-08.m4a'),
    require('@/assets/audio/colouring/calm-09.m4a'),
    require('@/assets/audio/colouring/calm-10.m4a'),
  ],
};
const GAIN: Record<MusicTrack, number> = { theme: 0.5, colouring: 0.35 };
/** How many tunes in a row before the music rests (theme: once; colouring: 3 different tunes). */
const PLAYS: Record<MusicTrack, number> = { theme: 1, colouring: 3 };

/** The last tune played per track, so a random pick never repeats it straight away. */
const lastPick: Partial<Record<MusicTrack, number>> = {};
function pickSource(track: MusicTrack) {
  const all = SOURCES[track];
  let i = Math.floor(Math.random() * all.length);
  if (all.length > 1 && i === lastPick[track]) i = (i + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length;
  lastPick[track] = i;
  return all[i]!;
}
const FADE_IN_MS = 1500;
const FADE_OUT_MS = 700;
const STEP_MS = 50;
/** Screens hand over focus in quick succession; wait this long before treating a blur as "silence". */
const HANDOVER_MS = 200;
/** Music level while Edyta speaks (× the track's gain), and how fast it dips / returns. */
const DUCK = 0.25;
const DUCK_IN_MS = 300;
const DUCK_OUT_MS = 900;

type Now = { track: MusicTrack; player: AudioPlayer; plays: number; done: boolean; loaded?: boolean; fade?: ReturnType<typeof setInterval> };

let initialised = false;
let active = AppState.currentState === 'active';
let wanted: MusicTrack | null = null;
let now: Now | null = null;
let blurTimer: ReturnType<typeof setTimeout> | undefined;
let focusSeq = 0;
let ducks = 0;

const level = (track: MusicTrack) => GAIN[track] * (ducks > 0 ? DUCK : 1);

/** Dev builds only: a line per music event in the Metro log (the simulator is hard to hear). */
const log = (...a: unknown[]) => {
  if (__DEV__) console.log('[music]', ...a);
};

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // Music must never break colouring.
  }
}

function fade(n: Now, to: number, ms: number, done?: () => void) {
  if (n.fade) clearInterval(n.fade);
  const from = n.player.volume;
  const steps = Math.max(1, Math.round(ms / STEP_MS));
  let i = 0;
  n.fade = setInterval(() => {
    i += 1;
    safe(() => {
      n.player.volume = from + ((to - from) * i) / steps;
    });
    if (i >= steps) {
      clearInterval(n.fade);
      n.fade = undefined;
      done?.();
    }
  }, STEP_MS);
}

function stop(ms = FADE_OUT_MS) {
  const n = now;
  if (!n) return;
  now = null;
  log('fade out', n.track);
  fade(n, 0, ms, () =>
    safe(() => {
      n.player.pause();
      n.player.remove();
    }),
  );
}

function start(track: MusicTrack) {
  stop();
  safe(() => {
    const player = createAudioPlayer(pickSource(track));
    player.loop = false;
    player.volume = 0;
    const n: Now = { track, player, plays: 1, done: false };
    player.addListener('playbackStatusUpdate', (s) => {
      if (s.isLoaded && !n.loaded) {
        n.loaded = true;
        log('loaded', track, `${Math.round(s.duration)} s`);
      }
      if (!s.didJustFinish || now !== n) return;
      log('finished', track, `play ${n.plays}/${PLAYS[track]}`);
      if (n.plays < PLAYS[track]) {
        n.plays += 1;
        safe(() => {
          if (SOURCES[track].length > 1) player.replace(pickSource(track));
          else player.seekTo(0).catch(() => {});
          player.play();
        });
      } else {
        n.done = true; // rests in silence until the next arrival
      }
    });
    now = n;
    player.play();
    log('play', track, `vol → ${level(track)}`);
    fade(n, level(track), FADE_IN_MS);
  });
}

/** Arrival at a screen that wants `track` (or a toggle/app-resume that should restart it). */
function arrive(track: MusicTrack | null, fresh: boolean) {
  if (!track || !isMusicOn() || !active) {
    stop();
    return;
  }
  if (now?.track === track && !fresh) return; // home → level, or page → next page: let it carry on (or rest)
  start(track);
}

function onAppState(state: AppStateStatus) {
  const isActive = state === 'active';
  if (isActive === active) return;
  active = isActive;
  log('app', state);
  if (!isActive) {
    // Leaving the app: silence at once, nothing may leak into the background.
    const n = now;
    now = null;
    if (n) {
      if (n.fade) clearInterval(n.fade);
      safe(() => {
        n.player.pause();
        n.player.remove();
      });
    }
    return;
  }
  // Coming back counts as a new arrival on the current screen.
  arrive(wanted, true);
}

/** Shared audio session: respects the silent switch, mixes with others, no background, no mic. */
export function initAudio() {
  init();
}

/**
 * Dip the music while a voice speaks (`true`), bring it back afterwards (`false`). Every `true` must be
 * matched by one `false`. A track that starts while ducked starts at the ducked level.
 */
export function duckMusic(on: boolean) {
  const was = ducks > 0;
  ducks = Math.max(0, ducks + (on ? 1 : -1));
  const is = ducks > 0;
  if (was === is) return;
  log(is ? 'duck' : 'unduck');
  const n = now;
  if (n) fade(n, level(n.track), is ? DUCK_IN_MS : DUCK_OUT_MS);
}

function init() {
  if (initialised) return;
  initialised = true;
  setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    allowsRecording: false,
  }).catch(() => {});
  AppState.addEventListener('change', onAppState);
  let on = isMusicOn();
  subscribePrefs(() => {
    if (isMusicOn() === on) return;
    on = isMusicOn();
    log('toggle', on ? 'on' : 'off');
    arrive(wanted, true);
  });
}

/** Music for the focused screen. Call once per screen. */
export function useMusic(track: MusicTrack | null) {
  useFocusEffect(
    useCallback(() => {
      init();
      if (blurTimer) clearTimeout(blurTimer);
      const mine = ++focusSeq;
      // A track starts afresh only on arrival from elsewhere (app open, home ↔ page, grown-ups), not when
      // moving between home and levels or from page to page. A colouring tune that has finished its round
      // and rests starts a new tune on the next page.
      const fresh = wanted !== track || (track === 'colouring' && !!now?.done);
      wanted = track;
      arrive(track, fresh);
      return () => {
        // Fall silent only if no other screen has taken focus since (the next screen may focus
        // before or after this blur).
        if (focusSeq !== mine) return;
        blurTimer = setTimeout(() => {
          if (focusSeq === mine) {
            wanted = null;
            stop();
          }
        }, HANDOVER_MS);
      };
    }, [track]),
  );
}
