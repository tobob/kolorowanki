/**
 * Edyta's spoken tutorial lines: i18n key `edyta.<line>` = speech-bubble text = voice clip
 * (assets/voice/edyta/<lang>/<line>.m4a, made by tools/voice/build.sh). Ordered by rendering priority:
 * instructions, then praise, then gentle hints.
 */
export const EDYTA_LINES = [
  'tray',
  'tap',
  'hold',
  'holdPick',
  'bg',
  'undo',
  'zoom',
  'done',
  'trayOk',
  'tapOk',
  'holdOk',
  'bgOk',
  'undoOk',
  'zoomOk',
  'trayHint',
  'tapHint',
  'holdHint',
  'bgHint',
  'undoHint',
  'zoomHint',
] as const;

export type EdytaLine = (typeof EDYTA_LINES)[number];
