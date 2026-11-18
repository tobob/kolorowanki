import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '@/shell/nav';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useMusic } from '@/audio/music';
import { AppText } from '@/components/app-text';
import { CheckIcon } from '@/components/icons';
import { ParentalGate } from '@/components/parental-gate';
import { Screen } from '@/components/screen';
import { SoftButton } from '@/components/soft-button';
import { TopBar } from '@/components/top-bar';
import { resetAll } from '@/coloring/store';
import { LANGS } from '@/coloring/types';
import { CONTACT, DEVELOPER, PASTELKI, PASTELKI_MUSIC, PRIVACY_URL, REPO } from '@/constants/contact';
import { RADIUS, TONE } from '@/constants/ui';
import { setMusicOn, setVoiceOn, usePrefs } from '@/shell/prefs';
import { LANG_NAMES, setLangSetting, useDeviceLang, useLangSetting, useT, type LangSetting } from '@/i18n';

export default function GrownUps() {
  const t = useT();
  // Dev builds only: `kolorowanki:///grown-ups?dev=open` skips the gate for screenshots. Ignored in release.
  const { dev } = useLocalSearchParams<{ dev?: string }>();
  const [passed, setPassed] = useState(__DEV__ && dev === 'open');
  useMusic(null);

  return (
    <Screen tint={TONE.bgAlt} edges={['top', 'left', 'right']}>
      <TopBar onBack={goBack} />
      {!passed ? (
        <View style={styles.gate}>
          <ParentalGate onPass={() => setPassed(true)} onFail={goBack} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <AppText style={styles.h1}>{t('settings.title')}</AppText>
          <LanguageCard />
          <MusicCard />
          <VoiceCard />
          <Card>
            <AppText style={styles.h2}>{t('home.howTo')}</AppText>
            <SoftButton size={52} radius={RADIUS.pill} style={styles.wideButton} onPress={() => router.push('/tutorial')} accessibilityLabel={t('home.howTo')}>
              <AppText style={styles.buttonText}>{t('home.howTo')}</AppText>
            </SoftButton>
          </Card>
          <RestartCard />
          <Card>
            <AppText style={styles.h2}>{t('about.title')}</AppText>
            <AppText style={styles.p}>{t('about.body')}</AppText>
            <AppText style={styles.p}>{t('about.promise')}</AppText>
            <AppText style={styles.p}>{t('about.credit', { pastelki: PASTELKI })}</AppText>
            <AppText style={styles.p}>{t('about.music', { url: PASTELKI_MUSIC })}</AppText>
            <AppText style={styles.p}>{t('about.voice')}</AppText>
            <AppText style={styles.p}>{t('about.source', { repo: REPO })}</AppText>
            <AppText style={styles.muted}>{t('about.version', { v: Constants.expoConfig?.version ?? '1.0.0' })}</AppText>
          </Card>
          <Card>
            <AppText style={styles.h2}>{t('privacy.title')}</AppText>
            <AppText style={styles.p}>{t('privacy.p1')}</AppText>
            <AppText style={styles.p}>{t('privacy.p2')}</AppText>
            <AppText style={styles.p}>{t('privacy.p3')}</AppText>
            <AppText style={styles.p}>{t('privacy.photos')}</AppText>
            <AppText style={styles.p}>{t('privacy.p4')}</AppText>
            <AppText style={styles.muted} selectable>
              {t('privacy.p5', { developer: DEVELOPER, contact: CONTACT, url: PRIVACY_URL })}
            </AppText>
          </Card>
        </ScrollView>
      )}
    </Screen>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function MusicCard() {
  const t = useT();
  const { music } = usePrefs();
  return (
    <Card>
      <View style={styles.row}>
        <AppText style={[styles.h2, styles.rowLabel]}>{t('music.label')}</AppText>
        <Switch value={music} onValueChange={setMusicOn} trackColor={{ true: TONE.accent }} accessibilityLabel={t('music.label')} />
      </View>
    </Card>
  );
}

/** Edyta the sheep reads the tutorial aloud; separate from music (her voice is not music). */
function VoiceCard() {
  const t = useT();
  const { voice } = usePrefs();
  return (
    <Card>
      <View style={styles.row}>
        <AppText style={[styles.h2, styles.rowLabel]}>{t('settings.voice')}</AppText>
        <Switch value={voice} onValueChange={setVoiceOn} trackColor={{ true: TONE.accent }} accessibilityLabel={t('settings.voice')} />
      </View>
      <AppText style={styles.muted}>{t('settings.voiceHint')}</AppText>
    </Card>
  );
}

function LanguageCard() {
  const t = useT();
  const setting = useLangSetting();
  const device = useDeviceLang();
  const options: { value: LangSetting; label: string }[] = [
    { value: 'auto', label: `${t('settings.languageAuto')} · ${LANG_NAMES[device]}` },
    ...LANGS.map((l) => ({ value: l, label: LANG_NAMES[l] })),
  ];
  return (
    <Card>
      <AppText style={styles.h2}>{t('settings.language')}</AppText>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o.value === setting;
          return (
            <Pressable
              key={o.value}
              onPress={() => setLangSetting(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
            >
              {selected ? <CheckIcon size={18} /> : null}
              <AppText style={styles.chipText}>{o.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

function RestartCard() {
  const t = useT();
  const [stage, setStage] = useState<'idle' | 'confirm' | 'done'>('idle');
  return (
    <Card>
      <AppText style={styles.h2}>{t('settings.restart')}</AppText>
      {stage === 'done' ? (
        <AppText style={styles.p}>{t('settings.restartDone')}</AppText>
      ) : stage === 'idle' ? (
        <SoftButton size={52} radius={RADIUS.pill} style={styles.wideButton} onPress={() => setStage('confirm')} accessibilityLabel={t('settings.restart')}>
          <AppText style={styles.buttonText}>{t('settings.restart')}</AppText>
        </SoftButton>
      ) : (
        <View style={styles.confirm}>
          <AppText style={styles.p}>{t('settings.restartBody')}</AppText>
          <View style={styles.confirmRow}>
            <SoftButton size={52} radius={RADIUS.pill} color={TONE.accent} style={styles.wideButton} onPress={() => setStage('idle')} accessibilityLabel={t('settings.restartNo')}>
              <AppText style={styles.buttonText}>{t('settings.restartNo')}</AppText>
            </SoftButton>
            <SoftButton
              size={52}
              radius={RADIUS.pill}
              style={styles.wideButton}
              onPress={() => {
                resetAll();
                setStage('done');
              }}
              accessibilityLabel={t('settings.restartYes')}
            >
              <AppText style={[styles.buttonText, { color: TONE.warm }]}>{t('settings.restartYes')}</AppText>
            </SoftButton>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: 'center', paddingBottom: 60 },
  content: { padding: 20, paddingBottom: 60, gap: 16, width: '100%', maxWidth: 680, alignSelf: 'center' },
  h1: { fontSize: 30, fontWeight: '700', marginBottom: 4 },
  h2: { fontSize: 20, fontWeight: '700' },
  p: { fontSize: 16, lineHeight: 23 },
  muted: { fontSize: 14, lineHeight: 20, color: TONE.muted },
  card: { backgroundColor: TONE.card, borderRadius: RADIUS.card, padding: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rowLabel: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: TONE.bgAlt,
  },
  chipOn: { backgroundColor: '#DDEFDB' },
  chipText: { fontSize: 16 },
  pressed: { opacity: 0.8 },
  wideButton: { paddingHorizontal: 22, alignSelf: 'flex-start', width: 'auto' },
  buttonText: { fontSize: 17, fontWeight: '600' },
  confirm: { gap: 14 },
  confirmRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
