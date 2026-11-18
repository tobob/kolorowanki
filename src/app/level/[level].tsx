import { router, useLocalSearchParams } from 'expo-router';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMusic } from '@/audio/music';
import { AppText } from '@/components/app-text';
import { LevelDots } from '@/components/level-dots';
import { EmptyThumb, PageThumb } from '@/components/page-thumb';
import { Screen } from '@/components/screen';
import { TopBar } from '@/components/top-bar';
import { pagesOfLevel } from '@/coloring/pages';
import type { Level, Page } from '@/coloring/types';
import { MOTION, RADIUS, SHADOW, TONE } from '@/constants/ui';
import { useLang, useT } from '@/i18n';

const CARD_PAD = 12;

const toLevel = (raw: string | string[] | undefined): Level => {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return n === 2 || n === 3 || n === 4 ? n : 1;
};

export default function LevelScreen() {
  const t = useT();
  const level = toLevel(useLocalSearchParams<{ level: string }>().level);
  const pages = pagesOfLevel(level);
  const { width } = useWindowDimensions();
  useMusic('theme');

  const pad = width >= 600 ? 36 : 20;
  const gap = width >= 600 ? 24 : 16;
  const cols = width >= 1000 ? 4 : width >= 600 ? 3 : 2;
  const cell = Math.floor((width - 2 * pad - (cols - 1) * gap) / cols);
  const thumb = cell - 2 * CARD_PAD;
  const tint = TONE.level[level - 1];

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TopBar onBack={() => router.back()}>
        <View style={styles.heading}>
          <AppText style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {t(`level.${level}`)}
          </AppText>
          <LevelDots level={level} size={9} />
        </View>
      </TopBar>
      {pages.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyRow}>
            <EmptyThumb size={Math.min(thumb, 140)} tint={tint} />
            <EmptyThumb size={Math.min(thumb, 140)} tint={tint} />
          </View>
          <AppText style={styles.emptyText}>{t('level.empty')}</AppText>
        </View>
      ) : (
        <FlatList
          key={cols}
          data={pages}
          keyExtractor={(p) => p.id}
          numColumns={cols}
          columnWrapperStyle={cols > 1 ? { gap } : undefined}
          contentContainerStyle={[styles.list, { paddingHorizontal: pad, gap }]}
          renderItem={({ item }) => <PageCard page={item} thumb={thumb} tint={tint} />}
          initialNumToRender={6}
          windowSize={5}
        />
      )}
    </Screen>
  );
}

function PageCard({ page, thumb, tint }: { page: Page; thumb: number; tint: string }) {
  const t = useT();
  const lang = useLang();
  const title = page.title[lang] || page.title.en;
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.03 }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('level.openA11y', { title })}
      onPressIn={() => pressed.set(withTiming(1, { duration: 120, easing: MOTION.easing }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: MOTION.fast, easing: MOTION.easing }))}
      onPress={() => router.push({ pathname: '/page/[id]', params: { id: page.id } })}
    >
      <Animated.View style={[styles.card, { backgroundColor: tint }, anim]}>
        <PageThumb page={page} size={thumb} />
        <AppText style={[styles.pageTitle, { width: thumb }]} numberOfLines={2}>
          {title}
        </AppText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { flex: 1, gap: 6 },
  title: { fontSize: 26, fontWeight: '700' },
  list: { paddingTop: 4, paddingBottom: 48 },
  card: { padding: CARD_PAD, borderRadius: RADIUS.card, boxShadow: SHADOW.soft, gap: 10 },
  pageTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', minHeight: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 32, paddingBottom: 80 },
  emptyRow: { flexDirection: 'row', gap: 16 },
  emptyText: { fontSize: 19, textAlign: 'center', color: TONE.muted },
});
