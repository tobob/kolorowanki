/**
 * Grown-ups area only (behind the parental gate): rating and feedback. The app sends nothing itself.
 *
 * - `<AskCard>`: the gentle "Do you like Kolorowanki?" card, shown on the 6th visit (rules: shell/feedback-logic).
 *   Yes → iOS system rating prompt (fallback: the App Store write-review page). On Android, Google Play forbids
 *   asking before its in-app review card, so Yes there offers the Google Play link instead.
 *   Not really → "Tell us what could be better" (the pastelki.club feedback page with liked=0) and, just as
 *   visible, "Rate on the App Store", so the rating path never depends on the answer (no review gating).
 * - `<RateCard>`: always at the bottom of the area: "Rate Kolorowanki on the App Store" + "Send us feedback".
 * Links open outside the app (store / external browser). Everything is in-screen; no RN Modal, so a system
 * sheet such as the rating prompt never collides with a modal that is still dismissing (RN 0.88 Fabric).
 */
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { SoftButton } from '@/components/soft-button';
import { RADIUS, TONE } from '@/constants/ui';
import { useLang, useT } from '@/i18n';
import { askForRating, openFeedbackPage, openStoreReviewPage, saveAnswer } from '@/shell/feedback';

const ANDROID = Platform.OS === 'android';

export function AskCard() {
  const t = useT();
  const lang = useLang();
  const [stage, setStage] = useState<'ask' | 'yes' | 'no' | 'gone'>('ask');
  const rateSmall = t(ANDROID ? 'feedback.rateSmall.android' : 'feedback.rateSmall.ios');
  if (stage === 'gone') return null;

  if (stage === 'yes') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <AppText style={styles.p}>{t('feedback.thanks')}</AppText>
        {ANDROID ? (
          <Wide label={rateSmall} onPress={openStoreReviewPage} />
        ) : (
          <SmallLink label={rateSmall} onPress={openStoreReviewPage} />
        )}
      </Animated.View>
    );
  }

  if (stage === 'no') {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
        <AppText style={styles.p}>{t('feedback.sorry')}</AppText>
        <Wide label={t('feedback.better')} accent onPress={() => openFeedbackPage(lang, false)} />
        <Wide label={rateSmall} onPress={openStoreReviewPage} />
        <SmallLink label={t('feedback.askLater')} onPress={() => setStage('gone')} />
      </Animated.View>
    );
  }

  return (
    <View style={styles.card}>
      <AppText style={styles.h2}>{t('feedback.askTitle')}</AppText>
      <View style={styles.row}>
        <Wide
          label={t('feedback.askYes')}
          accent
          onPress={() => {
            saveAnswer('yes');
            setStage('yes');
            askForRating();
          }}
        />
        <Wide
          label={t('feedback.askNo')}
          onPress={() => {
            saveAnswer('no');
            setStage('no');
          }}
        />
      </View>
      <SmallLink label={t('feedback.askLater')} onPress={() => setStage('gone')} />
    </View>
  );
}

export function RateCard() {
  const t = useT();
  const lang = useLang();
  return (
    <View style={styles.card}>
      <AppText style={styles.h2}>{t('feedback.title')}</AppText>
      <Wide label={t(ANDROID ? 'feedback.rate.android' : 'feedback.rate.ios')} onPress={openStoreReviewPage} />
      <Wide label={t('feedback.open')} onPress={() => openFeedbackPage(lang, null)} />
      <AppText style={styles.muted}>{t('feedback.note')}</AppText>
    </View>
  );
}

function Wide({ label, onPress, accent }: { label: string; onPress: () => void; accent?: boolean }) {
  return (
    <SoftButton size={52} radius={RADIUS.pill} color={accent ? TONE.accent : TONE.card} style={[styles.wide, !accent && styles.outlined]} onPress={onPress} accessibilityLabel={label}>
      <AppText style={styles.buttonText}>{label}</AppText>
    </SoftButton>
  );
}

function SmallLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <AppText style={styles.linkText}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: TONE.card, borderRadius: RADIUS.card, padding: 20, gap: 12 },
  h2: { fontSize: 20, fontWeight: '700' },
  p: { fontSize: 16, lineHeight: 23 },
  muted: { fontSize: 14, lineHeight: 20, color: TONE.muted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  wide: { paddingHorizontal: 22, alignSelf: 'flex-start', width: 'auto' },
  outlined: { borderWidth: 1.5, borderColor: TONE.line },
  buttonText: { fontSize: 17, fontWeight: '600' },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: 16, color: TONE.muted, textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});
