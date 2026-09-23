import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { hasContactChannel } from '@/api/shop';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { BubbleCar, BubblePart, BubblePhoto, BubbleReference } from '@/illustrations/bubbles';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * "Comment trouver votre pièce ?" — the four ways in, as a list to choose
 * from and a button to go, for anybody who would rather read than swipe the
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
  const [way, setWay] = useState<Way>('car');

  const ways: { key: Way; title: DictKey; why: DictKey; icon: React.ReactNode }[] = [
    { key: 'car', title: 'look.find.car', why: 'look.find.carWhy', icon: <BubbleCar size={34} /> },
    { key: 'part', title: 'look.find.part', why: 'look.find.partWhy', icon: <BubblePart size={30} /> },
    { key: 'ref', title: 'look.find.ref', why: 'look.find.refWhy', icon: <BubbleReference size={30} /> },
    ...(canAsk ? [{ key: 'photo' as Way, title: 'look.find.photo' as DictKey, why: 'look.find.photoWhy' as DictKey, icon: <BubblePhoto size={30} /> }] : []),
  ];

  const go = () => {
    if (way === 'car') return active ? router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }) : router.push('/garage/ajouter');
    if (way === 'part') return router.navigate('/catalogue');
    if (way === 'ref') return router.push({ pathname: '/recherche', params: { mode: 'reference' } });
    router.push('/aide');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('look.find') }} />
      <View style={styles.column}>
        {ways.map((w) => {
          const on = w.key === way;
          return (
            <Pressable
              key={w.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setWay(w.key)}
              style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, on && styles.on, pressed && styles.pressed]}
            >
              <View style={styles.icon}>{w.icon}</View>
              <View style={[styles.text, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
                <Text variant="rowTitle">{t(w.title)}</Text>
                <Text variant="hint">{t(w.why)}</Text>
              </View>
              <Feather name={on ? 'check-circle' : rtl ? 'chevron-left' : 'chevron-right'} size={20} color={on ? Brand.navy700 : C.textMuted} />
            </Pressable>
          );
        })}
        <Button label={t('look.continue')} onPress={go} />
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
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: Brand.white,
  },
  on: { borderColor: Brand.navy700, borderWidth: 1.5 },
  pressed: { backgroundColor: C.surface },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
