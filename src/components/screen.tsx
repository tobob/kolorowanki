import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { TONE } from '@/constants/ui';

/** Calm full-screen surface with safe-area padding. */
export function Screen({
  children,
  tint = TONE.bg,
  style,
  edges,
}: {
  children: ReactNode;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}) {
  return (
    <View style={[styles.fill, { backgroundColor: tint }]}>
      <SafeAreaView style={[styles.fill, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
