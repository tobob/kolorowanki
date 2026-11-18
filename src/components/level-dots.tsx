import { StyleSheet, View } from 'react-native';

import { TONE } from '@/constants/ui';
import type { Level } from '@/coloring/types';

/** Gentle difficulty cue: 1–4 filled dots out of 4. */
export function LevelDots({ level, size = 10 }: { level: Level; size?: number }) {
  return (
    <View style={styles.row} accessible={false}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i <= level ? TONE.levelDeep[level - 1] : TONE.dotEmpty,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 6, alignItems: 'center' } });
