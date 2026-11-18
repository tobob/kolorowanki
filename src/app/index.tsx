import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useMusic } from '@/audio/music';
import { AppText } from '@/components/app-text';
import { GrownUpsIcon } from '@/components/icons';
import { LevelDots } from '@/components/level-dots';
import { MusicToggle } from '@/components/music-toggle';
import { EmptyThumb, PageThumb } from '@/components/page-thumb';
import { Screen } from '@/components/screen';
import { SoftButton } from '@/components/soft-button';
import { getPage, pagesOfLevel } from '@/coloring/pages';
import { PageView } from '@/coloring/PageView';
import { useColoredIds } from '@/coloring/store';
import type { Fills, Level, Page } from '@/coloring/types';
import { MOTION, RADIUS, SHADOW, TONE } from '@/constants/ui';
import { useLang, useT } from '@/i18n';
import { isTutorialSeen, usePrefs } from '@/shell/prefs';

const LEVELS: Level[] = [1, 2, 3, 4];
const TOP = 56;
const CARD_PAD = 14;
const FOOTER = 58;
const FOOTER_WIDE = 76;
const HERO_IDS = ['l1-snail', 'l2-kitten-ball', 'l3-beach'];

/** The first-launch tutorial opens at most once per app run (home can mount again later). */
let tutorialOpened = false;

export default function Home() {
  const t = useT();
  const lang = useLang();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colored = useColoredIds();
  const { lastPageId } = usePrefs();
  useMusic('theme');

  // First launch: show "how to play" once (it marks itself seen when closed or skipped).
  // Wait until the root navigator is mounted, and open it only once per app run.
  const navKey = useRootNavigationState()?.key;
  useEffect(() => {
    if (!navKey || tutorialOpened || isTutorialSeen()) return;
    tutorialOpened = true;
    router.push('/tutorial');
  }, [navKey]);

  const wide = width >= 600;
  const pad = wide ? 40 : 20;
  const gap = wide ? 24 : 14;
  const content = Math.min(width - 2 * pad, 880);
  const hero = wide ? 200 : 124;
  const last = lastPageId && colored.has(lastPageId) ? getPage(lastPageId) : undefined;
  const cont = last ? (wide ? 104 : 84) + gap : 0;

  // Four cards in two columns that fit on one screen when they can (small phones scroll a little).
  const avail = height - insets.top - insets.bottom - TOP - hero - cont - gap - 20;
  const byWidth = (content - gap) / 2 - 2 * CARD_PAD;
  const byHeight = (((avail - gap) / 2 - 2 * CARD_PAD - (wide ? FOOTER_WIDE : FOOTER)) * 3) / 4;
  const thumb = Math.floor(Math.max(110, Math.min(byWidth, byHeight)));

  return (
    <Screen>
      <View style={[styles.top, { paddingHorizontal: pad }]}>
        <View style={styles.topLeft}>
          <SoftButton size={wide ? 58 : 46} color="#FCEBC0" onPress={() => router.push('/tutorial')} accessibilityLabel={t('home.howTo')}>
            <AppText style={[styles.howTo, wide && styles.howToWide]}>?</AppText>
          </SoftButton>
          <MusicToggle size={wide ? 58 : 46} />
        </View>
        <SoftButton size={wide ? 46 : 40} color={TONE.bg} style={styles.grownUps} onPress={() => router.push('/grown-ups')} accessibilityLabel={t('home.grownups')}>
          <GrownUpsIcon size={wide ? 24 : 20} color={TONE.muted} />
        </SoftButton>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: pad, gap }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { width: content, height: hero }]}>
          <AppText style={[styles.title, wide && styles.titleWide]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {t('app.name')}
          </AppText>
          <HeroFan h={hero - 12} />
        </View>

        {last ? (
          <ContinueCard page={last} title={last.title[lang] || last.title.en} label={t('home.continue')} width={content} wide={wide} />
        ) : null}

        <View style={[styles.grid, { gap, width: content }]}>
          {LEVELS.map((level) => (
            <LevelCard key={level} level={level} thumb={thumb} width={(content - gap) / 2} wide={wide} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Three finished pictures fanned out like sheets on a table — a warm hint of what's inside. */
function HeroFan({ h }: { h: number }) {
  const pages = useMemo(() => {
    const picked = HERO_IDS.map((id) => getPage(id)).filter((p): p is Page => !!p);
    const fallback = ([1, 2, 3] as Level[]).map((l) => pagesOfLevel(l)[0]).filter((p): p is Page => !!p);
    return (picked.length === 3 ? picked : fallback).slice(0, 3);
  }, []);
  if (pages.length === 0) return null;
  const w = Math.round((h * 0.78 * 3) / 4);
  const tilt = [-9, 2, 11];
  const shift = [-w * 0.72, 0, w * 0.72];
  return (
    <View style={{ width: w * 2.5, height: h }} accessible={false}>
      {pages.map((p, i) => (
        <View
          key={p.id}
          style={[
            styles.fanSheet,
            {
              width: w,
              height: (w * 4) / 3,
              left: w * 0.75 + shift[i],
              top: h * 0.08 + (i === 1 ? -4 : 6),
              transform: [{ rotate: `${tilt[i]}deg` }],
              zIndex: i === 1 ? 2 : 1,
            },
          ]}
        >
          <PageView page={p} fills={finished(p)} size={w} />
        </View>
      ))}
    </View>
  );
}

const finished = (p: Page): Fills => Object.fromEntries(p.original.map((c, i) => [i, c]));

function ContinueCard({ page, title, label, width, wide }: { page: Page; title: string; label: string; width: number; wide: boolean }) {
  return (
    <PressCard
      onPress={() => router.push({ pathname: '/page/[id]', params: { id: page.id } })}
      accessibilityLabel={`${label}: ${title}`}
      style={[styles.continue, { width }]}
    >
      <PageThumb page={page} size={wide ? 66 : 50} />
      <View style={styles.continueText}>
        <AppText style={[styles.continueLabel, wide && styles.continueLabelWide]} numberOfLines={1}>
          {label}
        </AppText>
        <AppText style={styles.continueTitle} numberOfLines={1}>
          {title}
        </AppText>
      </View>
      <View style={styles.play}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M8 5.5 L18 12 L8 18.5 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={2} strokeLinejoin="round" />
        </Svg>
      </View>
    </PressCard>
  );
}

function LevelCard({ level, thumb, width, wide }: { level: Level; thumb: number; width: number; wide: boolean }) {
  const t = useT();
  const colored = useColoredIds();
  const pages = pagesOfLevel(level);
  // Show the child's own work when there is some, otherwise the first picture of the level.
  const cover = pages.find((p) => colored.has(p.id)) ?? pages[0];
  const name = t(`level.${level}`);
  return (
    <PressCard
      onPress={() => router.push({ pathname: '/level/[level]', params: { level: String(level) } })}
      accessibilityLabel={t('home.levelA11y', { name, n: level })}
      style={[styles.card, { width, backgroundColor: TONE.level[level - 1] }]}
    >
      {cover ? <PageThumb page={cover} size={thumb} /> : <EmptyThumb size={thumb} tint="#FFFFFF" />}
      <View style={[styles.footer, { width: Math.max(thumb, width - 2 * CARD_PAD - 8) }, wide && { height: FOOTER_WIDE }]}>
        <AppText style={[styles.cardTitle, wide && styles.cardTitleWide]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {name}
        </AppText>
        <LevelDots level={level} size={wide ? 14 : 10} />
      </View>
    </PressCard>
  );
}

/** A card that sinks a little when pressed (no flashing highlight). */
function PressCard({
  onPress,
  accessibilityLabel,
  style,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.03 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => pressed.set(withTiming(1, { duration: 120, easing: MOTION.easing }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: MOTION.fast, easing: MOTION.easing }))}
      onPress={onPress}
    >
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { height: TOP, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  howTo: { fontSize: 26, fontWeight: '800', color: '#9A6B2E', marginTop: -2 },
  howToWide: { fontSize: 32 },
  grownUps: { boxShadow: 'none', borderWidth: 1.5, borderColor: TONE.line },
  scroll: { alignItems: 'center', paddingBottom: 28 },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: 40, fontWeight: '800', lineHeight: 46, letterSpacing: 0.2 },
  titleWide: { fontSize: 60, lineHeight: 68 },
  fanSheet: { position: 'absolute', borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: SHADOW.lifted },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    paddingRight: 16,
    borderRadius: RADIUS.card,
    backgroundColor: TONE.card,
    boxShadow: SHADOW.soft,
  },
  continueText: { flex: 1, gap: 2 },
  continueLabel: { fontSize: 19, fontWeight: '700' },
  continueLabelWide: { fontSize: 22 },
  continueTitle: { fontSize: 15, color: TONE.muted },
  play: { width: 46, height: 46, borderRadius: 23, backgroundColor: TONE.accent, alignItems: 'center', justifyContent: 'center', paddingLeft: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { padding: CARD_PAD, borderRadius: RADIUS.card, boxShadow: SHADOW.soft, alignItems: 'center' },
  footer: { height: FOOTER, justifyContent: 'center', gap: 7, paddingTop: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardTitleWide: { fontSize: 26 },
});
