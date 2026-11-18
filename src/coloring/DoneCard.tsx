/**
 * Shown (once, gently) when every region of the page is coloured: a calm, non-blocking card at the bottom
 * with a small preview and three choices. No confetti, no sound, no reward — and it never navigates by itself.
 *
 * It replaces the colour tray, so it never covers the picture, and its buttons only become active ~1.2 s after
 * it appears: a child who is still tapping where the colours were must not jump to the next picture by accident
 * (that was the "tapping the background moves to the next page" bug — the last fill completed the page, the card
 * popped up under the finger and the next tap hit "Next picture").
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useT } from '@/i18n';

import { PageView } from './PageView';
import type { Fills, Page } from './types';
import { FONT, NextIcon, SaveIcon, SHADOW, TONE } from './ui';

type Props = {
  page: Page;
  fills: Fills;
  bottomInset: number;
  hasNext: boolean;
  onNext: () => void;
  onSave: () => void;
  onKeep: () => void;
};

const ARM_MS = 1200;

export function DoneCard({ page, fills, bottomInset, hasNext, onNext, onSave, onKeep }: Props) {
  const t = useT();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <Animated.View
      style={[styles.card, { marginBottom: Math.max(bottomInset, 10) }]}
      entering={FadeInDown.duration(500).withInitialValues({ transform: [{ translateY: 24 }] })}
      exiting={FadeOut.duration(300)}
    >
      <View style={styles.head}>
        <View style={styles.preview}>
          <PageView page={page} fills={fills} size={54} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {t('coloring.done')}
        </Text>
      </View>
      <View style={styles.row}>
        {hasNext && <Choice label={t('coloring.next')} onPress={onNext} primary icon={<NextIcon size={22} />} armed={armed} />}
        <Choice label={t('coloring.save')} onPress={onSave} icon={<SaveIcon size={22} />} armed={armed} />
        <Choice label={t('coloring.keepGoing')} onPress={onKeep} armed={armed} />
      </View>
    </Animated.View>
  );
}

function Choice({ label, onPress, primary, icon, armed }: { label: string; onPress: () => void; primary?: boolean; icon?: ReactNode; armed: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={armed ? onPress : undefined}
      disabled={!armed}
      hitSlop={4}
      style={({ pressed }) => [styles.choice, primary && styles.primary, !armed && styles.waiting, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.choiceText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginTop: 6,
    width: '92%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: TONE.card,
    borderRadius: 30,
    padding: 16,
    gap: 14,
    boxShadow: SHADOW.lifted,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  preview: { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: TONE.dot },
  title: { flex: 1, fontFamily: FONT, fontSize: 26, fontWeight: '700', color: TONE.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: 6,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#F4EFE6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#CDE8CD' },
  choiceText: { fontFamily: FONT, fontSize: 17, fontWeight: '600', color: TONE.text },
  pressed: { transform: [{ scale: 0.97 }] },
  waiting: { opacity: 0.55 },
});
