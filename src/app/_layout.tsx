import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TONE } from '@/constants/ui';
import { takeDevRoute } from '@/shell/dev';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 600, fade: true });

export default function RootLayout() {
  // Hide the splash only once the first screen has laid out (no fonts or remote data to wait for:
  // pages are bundled and saved colourings load synchronously), then fade gently into home.
  const ready = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const route = takeDevRoute();
    if (route) setTimeout(() => router.push(route as never), 800);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={ready}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 400,
          contentStyle: { backgroundColor: TONE.bg },
        }}
      >
        {/* Colouring uses pan/pinch everywhere: no edge-swipe back, the screen has its own back button. */}
        <Stack.Screen name="page/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="tutorial" options={{ gestureEnabled: false, animation: 'fade', animationDuration: 500 }} />
        <Stack.Screen name="grown-ups" options={{ contentStyle: { backgroundColor: TONE.bgAlt } }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: TONE.bg },
});
