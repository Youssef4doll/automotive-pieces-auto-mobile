import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { justPlaced, ordersApi, type Order } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/ui/confetti';
import { Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { formatDate, formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useOrders } from '@/store/orders';

/**
 * Commande, step 4 of 4: it went through.
 *
 * The one screen in the app allowed a flourish, and it gets a small one. What
 * it is actually for is the reference number: large, selectable, and with a
 * sentence saying why to keep it — with it and their phone number a customer
 * can find the order again on any device.
 *
 * "Commande enregistrée", not "confirmée". The order is PENDING until the
 * shop confirms it, usually by phone; calling it confirmed here would be the
 * app promising something on the shop's behalf. The next line says exactly
 * what happens next, in the website's words.
 */
export default function ConfirmationScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const tokenFor = useOrders((s) => s.tokenFor);

  const load = useCallback(
    async (signal: AbortSignal): Promise<Order> => {
      const cached = justPlaced.get(ref);
      if (cached) return cached;
      const token = await tokenFor(ref);
      if (!token) throw new ApiError({ kind: 'unauthorized' }, 'no token on this phone');
      return ordersApi.get(ref, token, signal);
    },
    [ref, tokenFor],
  );
  const order = useResource(load);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      {order.status === 'loaded' ? <Body order={order.data} /> : order.status === 'loading' ? <Loading /> : <Body order={null} refNumber={ref} />}
    </>
  );
}

function Body({ order, refNumber }: { order: Order | null; refNumber?: string }) {
  const { t, locale, rtl } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ref = order?.ref ?? refNumber ?? '';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Confetti />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.column}>
          <Animated.View entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System)} style={styles.check}>
            <Feather name="check" size={40} color={Brand.white} />
          </Animated.View>

          <Text variant="screenTitle" style={styles.centred} accessibilityRole="header">
            {t('done.title')}
          </Text>
          <Text variant="body" style={styles.centred}>
            {t('done.thanks')}
          </Text>

          <View style={styles.refCard}>
            <Text variant="label" style={styles.centred}>
              {t('done.ref')}
            </Text>
            <Text
              selectable
              style={{ fontFamily: familyFor('headingStrong', false), fontSize: 30, lineHeight: 36, color: C.text, textAlign: 'center', writingDirection: 'ltr' }}
            >
              {ref}
            </Text>
            {order ? (
              <Text variant="hint" style={styles.centred}>
                {formatDate(order.createdAt, locale, true)}
              </Text>
            ) : null}
          </View>

          {order ? (
            <View style={styles.facts}>
              <View style={[styles.fact, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <Text variant="body">{t('done.total')}</Text>
                <Text variant="rowTitle">{formatDT(order.total)}</Text>
              </View>
              <View style={[styles.fact, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                <Text variant="body">{t('track.items')}</Text>
                <Text variant="body" tone={C.text}>
                  {t('done.items', { n: order.items.reduce((n, i) => n + i.qty, 0) })}
                </Text>
              </View>
              <Text variant="hint">{t(`next.${order.status}`)}</Text>
            </View>
          ) : null}

          <View style={[styles.keep, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Feather name="bookmark" size={18} color={C.text} />
            <Text variant="hint" tone={C.text} style={styles.flex}>
              {t('done.keep')}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              label={t('done.track')}
              onPress={() => router.replace({ pathname: '/suivi/[ref]', params: { ref } })}
            />
            <Button label={t('done.continue')} variant="secondary" onPress={() => router.dismissTo('/')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingTop: Spacing.five },
  column: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  flex: { flex: 1 },
  centred: { textAlign: 'center' },
  check: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  refCard: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
    marginTop: Spacing.two,
  },
  facts: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  fact: {
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  keep: {
    gap: Spacing.two,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.cautionSurface,
    borderWidth: 1,
    borderColor: C.cautionBorder,
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
    maxWidth: MaxContentWidth,
  },
});
