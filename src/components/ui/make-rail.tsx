import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { vehiclesApi, type Make } from '@/api/vehicles';
import { C, familyFor, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useI18n } from '@/i18n/provider';
import { MakeLogo } from './make-logo';
import { PressScale } from './press-scale';
import { Rail } from './rail';
import { Skeleton } from './skeleton';
import { Text } from './text';

/** How many makes the home rail carries; "Voir tout" opens every one. */
const SIZE = 14;

/**
 * "Marques automobiles" — a rail of car makes on Home (the owner, October
 * 2026), each badge a door straight into the picker at that make: the
 * models, then the engine.
 *
 * The makes the shop has the most parts for first, then the most models —
 * the picker's own order, from real counts. The badge is the make's own
 * mark (illustrations/marques), initials for a make nobody has one for.
 * Nothing at all until the list is in, or when the shop has no vehicle data.
 */
export function MakeRail() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const load = useCallback((signal: AbortSignal) => vehiclesApi.makes(signal), []);
  const makes = useResource(load);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const top = useMemo(
    () =>
      makes.status === 'loaded'
        ? [...makes.data]
            .sort((a, b) => b.partCount - a.partCount || b.modelCount - a.modelCount || a.name.localeCompare(b.name))
            .slice(0, SIZE)
        : [],
    [makes],
  );

  if (makes.status === 'failed' || (makes.status === 'loaded' && top.length === 0)) return null;

  const open = (m: Make) =>
    router.push({ pathname: '/garage/ajouter/[make]', params: { make: m.slug, makeName: m.name, makeId: m.id } });

  return (
    <View style={styles.wrap} testID="make-rail">
      <View style={styles.column}>
        <View style={[styles.head, row]}>
          <Text style={[styles.title, { fontFamily: familyFor('heading', rtl) }]}>{t('look.makesCarousel')}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/garage/ajouter')} hitSlop={8} style={[styles.seeAll, row]}>
            <Text variant="hint" tone={C.text}>
              {t('catalog.seeAll')}
            </Text>
            <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={14} color={C.text} />
          </Pressable>
        </View>
      </View>
      <Rail contentContainerStyle={[styles.rail, row]}>
        {makes.status === 'loading'
          ? [0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.badge}>
                <Skeleton style={styles.skeleton} />
              </View>
            ))
          : top.map((m) => (
              <PressScale
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={m.name}
                onPress={() => open(m)}
                style={styles.badge}
                scaleTo={0.94}
              >
                <MakeLogo name={m.name} slug={m.slug} size={64} />
                <Text variant="hint" tone={C.text} numberOfLines={1} style={styles.name}>
                  {m.name}
                </Text>
              </PressScale>
            ))}
      </Rail>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: Spacing.four },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.four },
  head: { alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, lineHeight: 26, color: C.text },
  seeAll: { alignItems: 'center', gap: 4, minHeight: Tap.min },
  rail: { gap: Spacing.two, paddingHorizontal: Spacing.four - 4, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  badge: { width: 80, alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.tile },
  skeleton: { width: 64, height: 64, borderRadius: 32 },
  name: { textAlign: 'center' },
});
