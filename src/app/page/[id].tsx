import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useMusic } from '@/audio/music';
import { ColoringScreen } from '@/coloring/ColoringScreen';
import { setLastPage } from '@/shell/prefs';

export default function PageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = String(id);
  useMusic('colouring');
  // Remember it for the home screen's "Keep colouring" card.
  useEffect(() => setLastPage(pageId), [pageId]);
  return <ColoringScreen pageId={pageId} />;
}
