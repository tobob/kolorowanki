import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMusic } from '@/audio/music';
import { AppText } from '@/components/app-text';
import { Screen } from '@/components/screen';
import { SoftButton } from '@/components/soft-button';
import { TutorialDemo } from '@/components/tutorial/demo';
import { RADIUS, TONE } from '@/constants/ui';
import { useT, type Key } from '@/i18n';
import { markTutorialSeen } from '@/shell/prefs';

const STEPS: Key[] = ['tutorial.step1', 'tutorial.step2', 'tutorial.step3', 'tutorial.step4'];

/** "How to play": shown on first launch, and from the home "?" button and the grown-ups area. */
export default function Tutorial() {
  // Dev builds only: `kolorowanki:///tutorial?step=2` opens a given step (for screenshots).
  const { step: devStep } = useLocalSearchParams<{ step?: string }>();
  const first = __DEV__ ? Math.min(Math.max(Number(devStep) || 0, 0), STEPS.length - 1) : 0;
  return <TutorialSteps key={first} first={first} />;
}

function TutorialSteps({ first }: { first: number }) {
  const t = useT();
  useMusic(null);
  const [step, setStep] = useState(first);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const last = step === STEPS.length - 1;

  // Demo picture: as large as fits above the text and buttons (3:4 page).
  const avail = height - insets.top - insets.bottom - 64 - 230;
  const size = Math.floor(Math.max(180, Math.min(width - 64, (avail * 3) / 4, width >= 600 ? 640 : 460)));

  const close = () => {
    markTutorialSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={close} accessibilityRole="button" hitSlop={12} style={styles.skip}>
          <AppText style={styles.skipText}>{t('tutorial.skip')}</AppText>
        </Pressable>
      </View>
      <View style={styles.body} accessibilityLabel={t('tutorial.a11y', { n: step + 1 })}>
        <TutorialDemo step={step} size={size} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
          ))}
        </View>
        <Animated.View key={step} entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.textBox}>
          <AppText style={styles.text}>{t(STEPS[step])}</AppText>
        </Animated.View>
        <SoftButton
          size={64}
          radius={RADIUS.pill}
          color={TONE.accent}
          style={styles.next}
          onPress={() => (last ? close() : setStep(step + 1))}
          accessibilityLabel={last ? t('tutorial.start') : t('tutorial.next')}
        >
          <AppText style={styles.nextText}>{last ? t('tutorial.start') : t('tutorial.next')}</AppText>
        </SoftButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: 64, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 24 },
  skip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.7)' },
  skipText: { fontSize: 17, color: TONE.muted, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { alignItems: 'center', gap: 16, paddingHorizontal: 28, paddingBottom: 20, paddingTop: 8 },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TONE.dotEmpty },
  dotOn: { backgroundColor: TONE.accent, width: 26 },
  textBox: { minHeight: 78, justifyContent: 'center', maxWidth: 560 },
  text: { fontSize: 19, lineHeight: 26, textAlign: 'center' },
  next: { minWidth: 240, paddingHorizontal: 32, width: 'auto' },
  nextText: { fontSize: 21, fontWeight: '700' },
});
