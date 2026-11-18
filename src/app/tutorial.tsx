import { StyleSheet, View } from 'react-native';

import { useMusic } from '@/audio/music';
import { stopEdyta } from '@/audio/voice';
import { Screen } from '@/components/screen';
import { TutorialGame } from '@/components/tutorial/game';
import { goBack } from '@/shell/nav';
import { markTutorialSeen } from '@/shell/prefs';

/**
 * "How to play": an interactive little game with Edyta the sheep (src/components/tutorial/game.tsx).
 * Back and Skip live in the game's top bar (the colouring screen's own, src/coloring/Toolbar.tsx).
 * Shown on first launch, and from the home "?" button and the grown-ups area. Finishing or skipping marks it seen.
 */
export default function Tutorial() {
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
