/**
 * Music on/off: a big, friendly note button. The choice persists (kv-store) and applies at once.
 * Usage (any screen): `<MusicToggle />` or `<MusicToggle size={56} />`. Pair with `useMusic(...)` from
 * '@/audio/music' on the screen that wants music.
 */
import Svg, { Circle, Path } from 'react-native-svg';

import { SoftButton } from '@/components/soft-button';
import { TONE } from '@/constants/ui';
import { useT } from '@/i18n';
import { setMusicOn, usePrefs } from '@/shell/prefs';

export function MusicToggle({ size = 52, color }: { size?: number; color?: string }) {
  const t = useT();
  const { music } = usePrefs();
  return (
    <SoftButton
      size={size}
      color={color ?? (music ? '#DCEAF7' : TONE.card)}
      onPress={() => setMusicOn(!music)}
      accessibilityLabel={music ? t('music.on') : t('music.off')}
      accessibilityState={{ selected: music }}
    >
      <NoteIcon size={size * 0.52} on={music} />
    </SoftButton>
  );
}

/** Two beamed notes; when off, drawn soft grey with a gentle slash (no red, no alarm). */
export function NoteIcon({ size = 26, on }: { size?: number; on: boolean }) {
  const ink = on ? '#4A6FA5' : TONE.muted;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 17.5 V5.5 L19 3.5 V15.5" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 8.5 L19 6.5" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={6.6} cy={17.6} r={2.8} fill={ink} />
      <Circle cx={16.6} cy={15.6} r={2.8} fill={ink} />
      {on ? null : <Path d="M4 4 L20 20" stroke={TONE.muted} strokeWidth={2.2} strokeLinecap="round" />}
    </Svg>
  );
}
