/**
 * One safe "back" for the whole app. A second tap while the screen is still animating away (or a back
 * with nothing underneath, e.g. the tutorial opened on first launch) would otherwise dispatch a GO_BACK
 * that no navigator handles.
 */
import { router } from 'expo-router';

let lastBack = 0;

export function goBack(): void {
  const now = Date.now();
  if (now - lastBack < 800) return; // the previous back is still animating
  lastBack = now;
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
