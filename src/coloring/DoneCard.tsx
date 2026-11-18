/**
 * Shown (once, gently) when every region of the page is coloured: a calm, non-blocking card at the bottom
 * with a small preview and three choices. No confetti, no sound, no reward — and it never navigates by itself.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useT } from '@/i18n';

import { PageView } from './PageView';
import type { Fills, Page } from './types';
import { FONT, NextIcon, SaveIcon, SHADOW, TONE } from './ui';

type Props = {
  page: Page;
  fills: Fills;
  bottom: number;
  hasNext: boolean;
  onNext: () => void;
  onSave: () => void;
  onKeep: () => void;
};

export function DoneCard({ page, fills, bottom, hasNext, onNext, onSave, onKeep }: Props) {
  const t = useT();
  return (
    <Animated.View
      style={[styles.card, { bottom: bottom + 12 }]}
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
        {hasNext && <Choice label={t('coloring.next')} onPress={onNext} primary icon={<NextIcon size={22} />} />}
        <Choice label={t('coloring.save')} onPress={onSave} icon={<SaveIcon size={22} />} />
        <Choice label={t('coloring.keepGoing')} onPress={onKeep} />
      </View>
    </Animated.View>
  );
}

function Choice({ label, onPress, primary, icon }: { label: string; onPress: () => void; primary?: boolean; icon?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.choice, primary && styles.primary, pressed && styles.pressed]}
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
    position: 'absolute',
    left: 14,
    right: 14,
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
});
