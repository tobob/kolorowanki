import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackIcon } from '@/components/icons';
import { SoftButton } from '@/components/soft-button';
import { useT } from '@/i18n';

/** Row with a soft round back button on the left and optional content after it. */
export function TopBar({ onBack, children }: { onBack: () => void; children?: ReactNode }) {
  const t = useT();
  return (
    <View style={styles.bar}>
      <SoftButton onPress={onBack} size={52} accessibilityLabel={t('coloring.back')}>
        <BackIcon />
      </SoftButton>
      <View style={styles.rest}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  rest: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
