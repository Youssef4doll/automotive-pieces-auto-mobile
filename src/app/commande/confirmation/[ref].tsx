import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { justPlaced, ordersApi, type Order } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/ui/confetti';
import { Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, familyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { estimateDays, estimateHours } from '@/lib/estimate-text';
import { formatDate, formatDT, ltr } from '@/lib/format';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { useOrders } from '@/store/orders';
import { OrderNotify } from '@/components/ui/order-notify';

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
 * app promising something on the shop's behalf.
 *
 * Made to be a good moment (the owner, October 2026): thanks by name, the
 * estimated delivery date large on the shop's navy — the date the shop
 * stored with the order (lib/delivery-estimate), the courier's hours and the
 * place — and "Et maintenant ?": the shop confirms (a text at each step,
 * where the shop can send them), the courier calls before coming, the
 * amount to pay at the door. Without a date the next step is said in the
 * website's words, as before.
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
  const settings = useShopSettings();
  const ref = order?.ref ?? refNumber ?? '';
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const first = order?.customerName.trim().split(/\s+/)[0] ?? '';
  const delivery = order?.deliveryMethod !== 'PICKUP';
  const estimate = order?.estimate ?? null;
  const hours = estimate ? estimateHours(estimate, locale) : null;
  const place = order && delivery ? [order.address?.split(',')[0]?.trim(), order.governorate].filter(Boolean).join(', ') : '';
  // Texts at each step only where the shop can send them (lib/sms on the website).
  const texts = settings.status === 'loaded' && settings.data.auth?.phoneCode === true;
  const steps: { icon: React.ComponentProps<typeof Feather>['name']; title: string; sub?: string }[] = order
    ? [
        { icon: 'check-circle', title: t('done.step.confirm'), sub: texts ? t('done.step.sms') : undefined },
        delivery ? { icon: 'truck', title: t('done.step.ship') } : { icon: 'home', title: t('done.step.pickup') },
        { icon: 'credit-card', title: t(delivery ? 'done.step.pay' : 'done.step.payPickup', { total: formatDT(order.total) }) },
      ]
    : [];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Confetti />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.column}>
          <Animated.View entering={ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System)} style={styles.check}>
            <Feather name="check" size={40} color={Brand.white} />
          </Animated.View>

          <Text variant="screenTitle" style={styles.centred} accessibilityRole="header">
            {first ? t('done.thanksName', { name: first }) : t('done.thanksNoName')}
          </Text>
          <Text variant="body" style={styles.centred}>
            {t('done.title')} · {t('done.thanks')}
          </Text>

          {/* When — what the customer wants to know first, as large as the shop can say it. */}
          {estimate && delivery ? (
            <Animated.View entering={FadeInDown.delay(180).duration(420).reduceMotion(ReduceMotion.System)} style={styles.eta} testID="done-eta">
              <Text style={[styles.etaLabel, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('eta.label')}</Text>
              <Text style={[styles.etaDay, { fontFamily: familyFor('headingStrong', rtl) }]}>{estimateDays(estimate, locale)}</Text>
              {hours || place ? (
                <View style={[row, styles.etaMeta]}>
                  {hours ? (
                    <View style={[row, styles.etaChip]}>
                      <Feather name="clock" size={14} color={Brand.white} />
                      <Text style={[styles.etaChipText, { fontFamily: familyFor('bodySemi', rtl) }]}>{ltr(hours)}</Text>
                    </View>
                  ) : null}
                  {place ? (
                    <View style={[row, styles.etaChip, styles.flexShrink]}>
                      <Feather name="map-pin" size={14} color={Brand.white} />
                      <Text numberOfLines={1} style={[styles.etaChipText, styles.flexShrink, { fontFamily: familyFor('bodySemi', rtl) }]}>
                        {place}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Animated.View>
          ) : null}

          {/* What happens now, in three lines the customer can hold the shop to. */}
          {steps.length ? (
            <View style={styles.next}>
              <Text style={[styles.nextTitle, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('done.next')}</Text>
              {steps.map((step, i) => (
                <View key={step.title} style={[row, styles.step]}>
                  <View style={styles.stepRail}>
                    <View style={styles.stepIcon}>
                      <Feather name={step.icon} size={18} color={C.text} />
                    </View>
                    {i < steps.length - 1 ? <View style={styles.stepLine} /> : null}
                  </View>
                  <View style={[styles.flex, styles.stepText]}>
                    <Text style={[styles.stepTitle, start, { fontFamily: familyFor('bodySemi', rtl) }]}>{step.title}</Text>
                    {step.sub ? (
                      <Text variant="hint" style={start}>
                        {step.sub}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.refCard}>
            <Text variant="label" style={styles.centred}>
              {t('done.ref')}
            </Text>
            <Text
              selectable
              style={{ fontFamily: familyFor('headingStrong', false), fontSize: 26, lineHeight: 32, color: C.text, textAlign: 'center', writingDirection: 'ltr' }}
            >
              {ref}
            </Text>
            {order ? (
              <Text variant="hint" style={styles.centred}>
                {formatDate(order.createdAt, locale, true)} · {t('done.items', { n: order.items.reduce((n, i) => n + i.qty, 0) })}
              </Text>
            ) : null}
          </View>

          <View style={[styles.keep, row]}>
            <Feather name="bookmark" size={18} color={C.text} />
            <Text variant="hint" tone={C.text} style={styles.flex}>
              {t('done.keep')}
            </Text>
          </View>

          {ref ? <OrderNotify orderRef={ref} auto /> : null}

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
  flexShrink: { flexShrink: 1 },
  centred: { textAlign: 'center' },
  // The date, on the shop's navy: the answer to "quand ?".
  eta: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.card,
    backgroundColor: Brand.navy900,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  etaLabel: { fontSize: 13, lineHeight: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: Brand.gold400 },
  etaDay: { fontSize: 26, lineHeight: 32, color: Brand.white, textAlign: 'center' },
  etaMeta: { gap: Spacing.two, marginTop: Spacing.two, flexWrap: 'wrap', justifyContent: 'center' },
  etaChip: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  etaChipText: { fontSize: 14, lineHeight: 18, color: Brand.white },
  next: { gap: 0, marginTop: Spacing.two },
  nextTitle: { fontSize: 18, lineHeight: 24, color: C.text, marginBottom: Spacing.two },
  step: { gap: Spacing.three, alignItems: 'stretch' },
  stepRail: { width: 36, alignItems: 'center' },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, width: 2, minHeight: 12, backgroundColor: C.border },
  stepText: { paddingTop: 7, paddingBottom: Spacing.three, gap: 2 },
  stepTitle: { fontSize: 15, lineHeight: 21, color: C.text },
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
