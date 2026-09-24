import { Feather } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { ShopSettings } from '@/api/shop';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Failed, Loading } from '@/components/ui/states';
import { StepIndicator } from '@/components/ui/step-indicator';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { checkoutProblems, deliveryDelay, type CheckoutField } from '@/lib/checkout';
import { formatDT } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { track } from '@/services/analytics';

/**
 * Commande, step 2 of 4: who, and where.
 *
 * One screen, the fields a delivery note needs and nothing else: a name the
 * driver can ask for at the door, a phone he can ring, a governorate and an
 * address. E-mail is optional and says what it is for. Everything is
 * remembered on this phone for the next order.
 *
 * The delivery options come from the shop. Home delivery states the delay
 * the shop publishes for the chosen governorate and the fee the basket will
 * actually be charged; collecting in store is offered only when the shop has
 * published where the store is — which in production today it has not, so
 * the option is simply absent.
 */
export default function DeliveryStep() {
  const { t } = useI18n();
  const settings = useShopSettings();
  useEffect(() => {
    track('begin_checkout', { lines: useCart.getState().items.length });
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: t('checkout.stepDelivery') }} />
      {settings.status === 'loading' ? (
        <Loading />
      ) : settings.status === 'failed' ? (
        <Failed failure={settings.failure} onRetry={settings.retry} />
      ) : (
        <DeliveryForm settings={settings.data} />
      )}
    </>
  );
}

function DeliveryForm({ settings }: { settings: ShopSettings }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const details = useCheckout((s) => s.details);
  const update = useCheckout((s) => s.update);
  const itemCount = useCart((s) => s.items.length);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [picking, setPicking] = useState(false);
  const phone = useRef<TextInput>(null);
  const email = useRef<TextInput>(null);
  const address = useRef<TextInput>(null);

  const method = settings.pickup ? details.deliveryMethod : 'DELIVERY';

  // An error belongs to what was typed when it was raised. The moment the
  // customer changes that field it is no longer about their answer, and a red
  // "indiquez votre nom" under a name they have just typed reads as the app
  // refusing it.
  const edit = (field: CheckoutField, value: string) => {
    update({ [field]: value });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const next = () => {
    const problems = checkoutProblems({ ...details, deliveryMethod: method });
    setErrors(Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, t(v)])));
    if (Object.keys(problems).length) return;
    update({ deliveryMethod: method });
    router.push('/commande/paiement');
  };

  // Reached with an empty basket — a back gesture after an order, a stale
  // deep link. There is nothing to deliver.
  if (itemCount === 0) return <Redirect href="/panier" />;

  const delay = deliveryDelay(settings, details.governorate);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <StepIndicator
            steps={[t('checkout.stepCart'), t('checkout.stepDelivery'), t('checkout.stepPayment'), t('checkout.stepDone')]}
            current={1}
          />

          <View style={styles.head}>
            <Text variant="sectionTitle">{t('checkout.deliveryTitle')}</Text>
            <Text variant="hint">{t('checkout.deliveryWhy')}</Text>
          </View>

          <View style={styles.fields}>
            <FormField
              label={t('checkout.name')}
              value={details.customerName}
              onChangeText={(v) => edit('customerName', v)}
              error={errors.customerName}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => phone.current?.focus()}
              maxLength={80}
            />
            <FormField
              ref={phone}
              label={t('checkout.phone')}
              value={details.phone}
              onChangeText={(v) => edit('phone', v)}
              error={errors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="22 334 455"
              returnKeyType="next"
              onSubmitEditing={() => email.current?.focus()}
              maxLength={30}
              ltr
            />
            <FormField
              ref={email}
              label={t('checkout.email')}
              hint={t('checkout.emailWhy')}
              value={details.email}
              onChangeText={(v) => edit('email', v)}
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={200}
              ltr
            />

            {/* A list of twenty-four, so a sheet rather than a dropdown a
                thumb has to scroll inside. */}
            <View style={styles.field}>
              <Text variant="hint" tone={C.text}>
                {t('checkout.governorate')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('checkout.governorate')}: ${details.governorate || t('checkout.chooseGovernorate')}`}
                onPress={() => setPicking(true)}
                style={({ pressed }) => [
                  styles.select,
                  row,
                  errors.governorate ? styles.selectError : null,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="body" tone={details.governorate ? C.text : C.textFaint} style={styles.flex}>
                  {details.governorate || t('checkout.chooseGovernorate')}
                </Text>
                <Feather name="chevron-down" size={IconSize.large} color={C.textMuted} />
              </Pressable>
              {errors.governorate ? (
                <Text variant="hint" tone={C.danger}>
                  {errors.governorate}
                </Text>
              ) : null}
            </View>

            {method === 'DELIVERY' ? (
              <FormField
                ref={address}
                label={t('checkout.address')}
                hint={t('checkout.addressHint')}
                value={details.address}
                onChangeText={(v) => edit('address', v)}
                error={errors.address}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                multiline
                maxLength={500}
              />
            ) : null}
          </View>

          <View style={styles.head}>
            <Text variant="sectionTitle">{t('checkout.method')}</Text>
          </View>
          <View style={styles.methods}>
            <MethodCard
              selected={method === 'DELIVERY'}
              icon="truck"
              title={t('checkout.home')}
              lines={[delay, t('product.deliveryFree', { amount: formatDT(settings.delivery.freeShippingThreshold), fee: formatDT(settings.delivery.fee) })]}
              onPress={() => update({ deliveryMethod: 'DELIVERY' })}
            />
            {settings.pickup ? (
              <MethodCard
                selected={method === 'PICKUP'}
                icon="home"
                title={t('checkout.pickup')}
                lines={[t('checkout.pickupFree'), settings.pickup.address, settings.pickup.hours]}
                onPress={() => update({ deliveryMethod: 'PICKUP' })}
              />
            ) : null}
          </View>

          <View style={styles.fields}>
            <FormField
              label={t('checkout.notes')}
              value={details.notes}
              onChangeText={(v) => update({ notes: v })}
              multiline
              maxLength={1000}
            />
          </View>
        </View>
      </ScrollView>

      <StickyBar>
        <Button label={t('common.continue')} onPress={next} />
      </StickyBar>

      <BottomSheet visible={picking} onClose={() => setPicking(false)} title={t('checkout.chooseGovernorate')}>
        <ScrollView style={styles.sheetList}>
          {settings.governorates.map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              accessibilityState={{ selected: g === details.governorate }}
              onPress={() => {
                update({ governorate: g });
                setErrors((e) => ({ ...e, governorate: undefined }));
                setPicking(false);
              }}
              style={({ pressed }) => [styles.option, row, pressed && styles.pressed]}
            >
              <Text variant="body" style={styles.flex}>
                {g}
              </Text>
              {g === details.governorate ? <Feather name="check" size={IconSize.medium} color={C.text} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function MethodCard({
  selected,
  icon,
  title,
  lines,
  onPress,
}: {
  selected: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  lines: (string | null)[];
  onPress: () => void;
}) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.method,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        selected && styles.methodSelected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.flex}>
        <Text variant="rowTitle">{title}</Text>
        {lines.filter(Boolean).map((l) => (
          <Text key={l} variant="hint">
            {l}
          </Text>
        ))}
      </View>
      <Feather name={icon} size={IconSize.large} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.five },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  flex: { flex: 1 },
  head: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  fields: { gap: Spacing.three },
  field: { gap: Spacing.one },
  select: {
    minHeight: Tap.primary,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  selectError: { borderColor: C.danger },
  pressed: { backgroundColor: C.surface },
  methods: { gap: Spacing.two, paddingBottom: Spacing.four },
  method: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  methodSelected: {
    borderWidth: Border.selected,
    borderColor: C.text,
    backgroundColor: C.surface,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: C.text },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },
  sheetList: { maxHeight: 420 },
  option: {
    minHeight: Tap.primary,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.tile,
  },
});
