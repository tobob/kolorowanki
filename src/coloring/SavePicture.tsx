/**
 * "Save picture" for grown-ups: parental gate → save to Photos (add-only permission) → a calm result card
 * that also offers Share. If Photos access is denied, the card explains it and offers Share; if saving fails
 * for another reason (e.g. an old Android that would need the blocked legacy storage permission), the system
 * share sheet opens instead.
 *
 * The picture is rendered offscreen by react-native-svg at 1500×2000 px (white paper, vector-crisp lines) with
 * Svg.toDataURL, written to the cache as PNG, then added to Photos (expo-media-library Asset.create) or
 * shared (expo-sharing).
 */
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

import { ParentalGateModal } from '@/components/parental-gate';
import { useT } from '@/i18n';

import { PageShapes } from './PageShapes';
import { PAGE_H, PAGE_W, PAPER, type Fills, type Page } from './types';
import { CloseIcon, FONT, RoundButton, SHADOW, TONE } from './ui';

export const EXPORT_W = 1500;
export const EXPORT_H = 2000;

type Result = null | 'working' | 'saved' | 'denied';

/** Render the page to a 1500×2000 PNG in the cache. */
async function renderPng(svg: Svg, pageId: string): Promise<File> {
  const base64 = await new Promise<string>((resolve) => svg.toDataURL((b64) => resolve(b64)));
  const file = new File(Paths.cache, `kolorowanki-${pageId}.png`);
  if (file.exists) file.delete();
  await file.write(base64.replace(/\s/g, ''), { encoding: 'base64' });
  return file;
}

async function shareFile(file: File, title: string) {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
}

/**
 * Returns `ask()` (call from a "Save picture" button) and the elements to render once in the screen:
 * the gate modal, the offscreen export surface (only while needed) and the result card.
 */
export function useSavePicture(page: Page, fills: Fills, bottomInset: number) {
  const t = useT();
  const [gate, setGate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const svgRef = useRef<Svg>(null);
  const fileRef = useRef<File | null>(null);

  const ask = () => {
    setResult(null);
    setMounted(true); // lay the export surface out while the grown-up passes the gate
    setGate(true);
  };

  const getFile = async () => {
    if (!svgRef.current) throw new Error('export surface not mounted');
    fileRef.current = await renderPng(svgRef.current, page.id);
    return fileRef.current;
  };

  const save = async () => {
    setResult('working');
    let file: File | null = null;
    try {
      file = await getFile();
      const perm = await requestPermissionsAsync(true);
      if (perm.status !== 'granted') {
        setResult('denied');
        return;
      }
      await Asset.create(file.uri);
      setResult('saved');
    } catch (e) {
      if (__DEV__) console.warn('save picture failed, falling back to share', e);
      setResult(null);
      if (file) await shareFile(file, t('coloring.share')).catch(() => {});
    }
  };

  const share = async () => {
    try {
      const file = fileRef.current ?? (await getFile());
      await shareFile(file, t('coloring.share'));
    } catch (e) {
      if (__DEV__) console.warn('share picture failed', e);
    }
  };

  const close = () => {
    setResult(null);
    setMounted(false);
  };

  // toDataURL renders at the view size × screen scale, and the native bounds are whole points: use a width in
  // points that is a multiple of 3 so the 3:4 height is whole too (≈1500×2000 px, e.g. 1503×2004 on a 3× phone).
  const pt = Math.ceil(EXPORT_W / PixelRatio.get() / 3) * 3;

  const element = (
    <>
      <ParentalGateModal
        visible={gate}
        onPass={() => {
          setGate(false);
          save();
        }}
        onCancel={() => {
          setGate(false);
          setMounted(false);
        }}
      />
      {mounted && (
        <View pointerEvents="none" collapsable={false} style={[styles.offscreen, { left: -pt - 100, width: pt }]}>
          <Svg ref={svgRef} width={pt} height={(pt * EXPORT_H) / EXPORT_W} viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}>
            <Rect x={-50} y={-50} width={PAGE_W + 100} height={PAGE_H + 100} fill={PAPER} />
            <PageShapes page={page} fills={fills} />
          </Svg>
        </View>
      )}
      {result && result !== 'working' && (
        <Animated.View style={[styles.card, { bottom: bottomInset + 16 }]} entering={FadeIn.duration(350)} exiting={FadeOut.duration(250)}>
          <Text style={styles.text}>{result === 'saved' ? t('coloring.saved') : t('coloring.saveDenied')}</Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" onPress={share} style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
              <Text style={styles.pillText}>{t('coloring.share')}</Text>
            </Pressable>
            <RoundButton accessibilityLabel={t('coloring.back')} onPress={close} size={52}>
              <CloseIcon size={24} />
            </RoundButton>
          </View>
        </Animated.View>
      )}
    </>
  );

  return { ask, element };
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', top: 0 },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignSelf: 'center',
    maxWidth: 520,
    backgroundColor: TONE.card,
    borderRadius: 28,
    padding: 18,
    gap: 14,
    boxShadow: SHADOW.lifted,
    zIndex: 20,
  },
  text: { fontFamily: FONT, fontSize: 18, lineHeight: 25, color: TONE.text, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  pill: {
    height: 52,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#E6F2E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: FONT, fontSize: 18, fontWeight: '600', color: TONE.text },
  pressed: { transform: [{ scale: 0.97 }] },
});
