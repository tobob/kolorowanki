import Svg, { Circle, Path } from 'react-native-svg';

import { TONE } from '@/constants/ui';

type P = { size?: number; color?: string };

/** Soft left arrow. */
export function BackIcon({ size = 26, color = TONE.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M14.5 5.5 L8 12 L14.5 18.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Two people (a grown-up and a child) — the door to the grown-ups area. */
export function GrownUpsIcon({ size = 26, color = TONE.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={9} cy={7} r={3.2} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M3.5 20 C3.5 15.5 6 13 9 13 C12 13 14.5 15.5 14.5 20" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={17} cy={10} r={2.3} fill="none" stroke={color} strokeWidth={2} />
      <Path d="M15.6 15.2 C16 15 16.5 14.9 17 14.9 C19.2 14.9 20.5 16.8 20.5 20" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 22, color = TONE.text }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5 L10 17 L19 7.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
