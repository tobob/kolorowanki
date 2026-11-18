import { Pressable, StyleSheet, View } from 'react-native';

import { useMusic } from '@/audio/music';
import { stopEdyta } from '@/audio/voice';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { TutorialGame } from '@/components/tutorial/game';
import { RADIUS, TONE } from '@/constants/ui';
import { useT } from '@/i18n';
import { goBack } from '@/shell/nav';
import { markTutorialSeen } from '@/shell/prefs';

/**
 * "How to play": an interactive little game with Edyta the sheep (src/components/tutorial/game.tsx).
 * Shown on first launch, and from the home "?" button and the grown-ups area. Finishing or skipping marks it seen.
 */
export default function Tutorial() {
  const t = useT();
  useMusic(null);

  const close = () => {
    stopEdyta();
    markTutorialSeen();
    goBack();
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        <TutorialGame onFinish={close} />
        <View style={styles.top} pointerEvents="box-none">
          <Pressable onPress={close} accessibilityRole="button" hitSlop={12} style={styles.skip}>
            <AppText style={styles.skipText}>{t('tutorial.skip')}</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20 },
  skip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.7)' },
  skipText: { fontSize: 17, color: TONE.muted, fontWeight: '600' },
});
