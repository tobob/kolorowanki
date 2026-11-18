/**
 * Parental gate (same as Pasujki): (1) press and hold for 3 s, then (2) answer a multiplication
 * written out in words in the UI language, using big number buttons. Pre-readers can't decode the
 * words and the task is new every time. A wrong answer quietly leaves the gate (no hint, no buzzer).
 *
 * API
 * - `<ParentalGateModal visible onPass onCancel />` — full-screen calm overlay for any screen
 *   (e.g. "Save picture" / "Share" on the colouring screen). `onPass` after a right answer;
 *   `onCancel` after a wrong answer or the back button. A new question every time it opens.
 *   Typical use: `const [ask, setAsk] = useState(false)` → `<ParentalGateModal visible={ask}
 *   onPass={() => { setAsk(false); save(); }} onCancel={() => setAsk(false)} />`.
 * - `<ParentalGate onPass onFail />` — the same gate inline (used by the grown-ups screen).
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/app-text';
import { BackIcon } from '@/components/icons';
import { SoftButton } from '@/components/soft-button';
import { RADIUS, SHADOW, TONE } from '@/constants/ui';
import { numberWord, useLang, useT } from '@/i18n';

const HOLD_MS = 3000;

type Question = { a: number; b: number; answer: number; options: number[] };

export function makeQuestion(): Question {
  const a = 3 + Math.floor(Math.random() * 7); // 3..9
  const b = 2 + Math.floor(Math.random() * 8); // 2..9
  const answer = a * b;
  // Distractors are plausible neighbours so guessing rarely works.
  const near = [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 2, answer - 2].filter((n) => n > 0 && n !== answer);
  const options = new Set<number>([answer]);
  for (const n of near.sort(() => Math.random() - 0.5)) {
    if (options.size >= 4) break;
    options.add(n);
  }
  return { a, b, answer, options: [...options].sort(() => Math.random() - 0.5) };
}

export function ParentalGate({ onPass, onFail }: { onPass: () => void; onFail: () => void }) {
  const t = useT();
  const lang = useLang();
  const [stage, setStage] = useState<'hold' | 'question'>('hold');
  const [question] = useState<Question>(makeQuestion);
  const hold = useSharedValue(0);

  const startHold = () => {
    hold.set(
      withTiming(1, { duration: HOLD_MS * (1 - hold.get()), easing: Easing.linear }, (finished) => {
        if (finished) scheduleOnRN(setStage, 'question');
      }),
    );
  };
  const stopHold = () => {
    if (hold.get() >= 1) return;
    cancelAnimation(hold);
    hold.set(withTiming(0, { duration: 300 }));
  };
  const fillStyle = useAnimatedStyle(() => ({ width: `${hold.value * 100}%` }));

  if (stage === 'hold') {
    return (
      <View style={styles.box}>
        <AppText style={styles.title}>{t('gate.title')}</AppText>
        <AppText style={styles.body}>{t('gate.hold')}</AppText>
        <Pressable onPressIn={startHold} onPressOut={stopHold} accessibilityRole="button" accessibilityLabel={t('gate.holdButton')}>
          <View style={styles.holdButton}>
            <Animated.View style={[styles.holdFill, fillStyle]} />
            <AppText style={styles.holdText}>{t('gate.holdButton')}</AppText>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <AppText style={styles.title}>{t('gate.title')}</AppText>
      <AppText style={styles.body}>{t('gate.question', { a: numberWord(lang, question.a), b: numberWord(lang, question.b) })}</AppText>
      <View style={styles.options}>
        {question.options.map((n) => (
          <Pressable
            key={n}
            onPress={() => (n === question.answer ? onPass() : onFail())}
            accessibilityRole="button"
            accessibilityLabel={String(n)}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <AppText style={styles.optionText}>{n}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function ParentalGateModal({ visible, onPass, onCancel }: { visible: boolean; onPass: () => void; onCancel: () => void }) {
  const t = useT();
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel} supportedOrientations={['portrait', 'landscape']}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalBar}>
          <SoftButton onPress={onCancel} size={52} accessibilityLabel={t('coloring.back')}>
            <BackIcon />
          </SoftButton>
        </View>
        <View style={styles.modalBody}>{visible ? <ParentalGate onPass={onPass} onFail={onCancel} /> : null}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: TONE.bgAlt },
  modalBar: { paddingHorizontal: 20, paddingTop: 8 },
  modalBody: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  box: { alignItems: 'center', gap: 22, paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 20, textAlign: 'center', lineHeight: 28 },
  holdButton: {
    minWidth: 260,
    paddingHorizontal: 24,
    height: 76,
    borderRadius: RADIUS.pill,
    backgroundColor: TONE.card,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: SHADOW.soft,
  },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: TONE.accent, opacity: 0.55 },
  holdText: { fontSize: 20, fontWeight: '600' },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  option: {
    width: 78,
    height: 88,
    borderRadius: 28,
    backgroundColor: TONE.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOW.soft,
  },
  pressed: { transform: [{ scale: 0.96 }] },
  optionText: { fontSize: 34, fontWeight: '700' },
});
