import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { hasContactChannel } from '@/api/shop';
import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { BubbleCar, BubblePart, BubblePhoto, BubbleReference } from '@/illustrations/bubbles';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * "Comment trouver votre pièce ?" — the four ways in, as a list where each
 * row goes straight down its path, for anybody who would rather read than swipe the
 * home screen's arc. The fourth ("je ne sais pas comment ça s'appelle") is
 * offered only when the shop has published a way to be reached, like its
 * bubble: a promise of advice nobody can answer is worse than no promise.
 */
type Way = 'car' | 'part' | 'ref' | 'photo';

export default function FindScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const settings = useShopSettings();
  const canAsk = settings.status === 'loaded' && hasContactChannel(settings.data);

  const ways: { key: Way; title: DictKey; why: DictKey; icon: React.ReactNode }[] = [
    { key: 'car', title: 'look.find.car', why: 'look.find.carWhy', icon: <BubbleCar size={52} /> },
    { key: 'part', title: 'look.find.part', why: 'look.find.partWhy', icon: <BubblePart size={52} /> },
    { key: 'ref', title: 'look.find.ref', why: 'look.find.refWhy', icon: <BubbleReference size={52} /> },
    ...(canAsk ? [{ key: 'photo' as Way, title: 'look.find.photo' as DictKey, why: 'look.find.photoWhy' as DictKey, icon: <BubblePhoto size={52} /> }] : []),
  ];

  // One tap, straight to the path: choosing and then confirming the choice
  // was a second decision about the same thing.
  const go = (way: Way) => {
    if (way === 'car') return active ? router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }) : router.push('/garage/ajouter');
    if (way === 'part') return router.navigate('/catalogue');
    if (way === 'ref') return router.push({ pathname: '/recherche', params: { mode: 'reference' } });
    router.push('/aide');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('look.find') }} />
      <View style={styles.column}>
        {ways.map((w) => (
          <PressScale
            key={w.key}
            accessibilityRole="button"
            accessibilityLabel={`${t(w.title)}. ${t(w.why)}`}
            onPress={() => go(w.key)}
            style={[styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
            pressedStyle={styles.pressed}
          >
            <View style={styles.icon}>{w.icon}</View>
            <View style={[styles.text, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
              <Text variant="rowTitle">{t(w.title)}</Text>
              <Text variant="hint">{t(w.why)}</Text>
            </View>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={C.textMuted} />
          </PressScale>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingVertical: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.two },
  row: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  pressed: { backgroundColor: C.surfacePressed },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
