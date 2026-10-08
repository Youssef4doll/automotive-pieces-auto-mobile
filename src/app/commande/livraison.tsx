import { Feather } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ApiError, newIdempotencyKey, type ApiFailure } from '@/api/client';
import { justPlaced, ordersApi, type OrderInput } from '@/api/orders';
import type { ShopSettings } from '@/api/shop';
import { PhoneSignIn } from '@/components/phone-sign-in';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { OrderSummary } from '@/components/ui/order-summary';
import { PromoField } from '@/components/ui/promo-field';
import { Failed, Loading } from '@/components/ui/states';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { Border, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { quoteOf, useCartQuote } from '@/hooks/use-cart-quote';
import { useShopSettings } from '@/hooks/use-shop-settings';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { checkoutProblems, deliveryDelay, type CheckoutField } from '@/lib/checkout';
import { DELEGATIONS, otherGovernorateIn } from '@/lib/delegations';
import { fitState, FIT_LOOK } from '@/lib/fit';
import { formatDT, ltr } from '@/lib/format';
import { track } from '@/services/analytics';
import { accountToken, useAccount } from '@/store/account';
import { useCart } from '@/store/cart';
import { useCheckout } from '@/store/checkout';
import { useGarage, vehicleLabel } from '@/store/garage';
import { useOrders } from '@/store/orders';

/**
 * Commande — one page, as a delivery app lays it out.
 *
 * What is being bought (folded to a line, open on a tap), how it travels
 * (the shop's options, with the delay it publishes and the fee the basket is
 * charged — first, because it decides whether there is an address to give),
 * where it goes and who takes it (two rows, each opening a sheet with only
 * its own fields), how it is paid (cash on delivery, the only way),
 * the code, and the shop's figures on a receipt. One button at the bottom,
 * carrying the total the shop has just priced.
 *
 * Nothing about the order is decided here: the shop prices the basket for
 * this delivery method (useCartQuote) and prices it again when the order
 * arrives. The order carries an idempotency key, one per basket-and-details,
 * so a retry after a dropped connection is answered with the order the first
 * try placed — and the copy says so.
 *
 * A guest (where the shop can text) confirms the number by SMS when they
 * press the button, and the order goes on from there; where it cannot, a
 * guest signs in first. Everything typed is remembered on this phone for the
 * next order.
 */
export default function CheckoutScreen() {
  const { t } = useI18n();
  const settings = useShopSettings();
  const account = useAccount((s) => s.status);
  useEffect(() => {
    track('begin_checkout', { lines: useCart.getState().items.length });
  }, []);

  const phoneCode = settings.status === 'loaded' && settings.data.auth?.phoneCode === true;
  if (account === 'guest' && settings.status === 'loaded' && !phoneCode) {
    return <Redirect href={{ pathname: '/compte/connexion', params: { then: 'checkout' } }} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: t('checkout.title'), headerTitleAlign: 'center' }} />
      {settings.status === 'loading' ? (
        <Loading />
      ) : settings.status === 'failed' ? (
        <Failed failure={settings.failure} onRetry={settings.retry} />
      ) : (
        <Checkout settings={settings.data} />
      )}
    </>
  );
}

type Sheet = 'address' | 'contact' | 'note' | 'confirm' | null;
const CONTACT: CheckoutField[] = ['customerName', 'phone', 'email'];

function Checkout({ settings }: { settings: ShopSettings }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const details = useCheckout((s) => s.details);
  const update = useCheckout((s) => s.update);
  const settle = useCheckout((s) => s.settle);
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const active = useGarage((s) => s.active);
  const remember = useOrders((s) => s.remember);
  const guest = useAccount((s) => s.status === 'guest');
  const method = settings.pickup ? details.deliveryMethod : 'DELIVERY';
  const { state, retry } = useCartQuote(method);
  const quote = quoteOf(state);
  const [sheet, setSheet] = useState<Sheet>(null);
  // Inside the address sheet: the form, or one of its two lists. One sheet
  // whose content changes — iOS cannot present a modal while another is
  // still closing, and the lists as sheets of their own never appeared.
  const [pick, setPick] = useState<'governorate' | 'delegation' | null>(null);
  const openSheet = (next: Sheet) => {
    setPick(null);
    setSheet(next);
  };
  const [open, setOpen] = useState(false);
  const [whyCheck, setWhyCheck] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const attempt = useRef<{ body: string; key: string } | null>(null);
  // A ref, not the state: two taps inside one frame both see `placing` still false.
  const busy = useRef(false);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  // Reached with an empty basket — a back gesture after an order, a stale
  // deep link. There is nothing to deliver.
  if (items.length === 0 && !placing) return <Redirect href="/panier" />;

  // An error belongs to what was typed when it was raised; editing the field clears it.
  const edit = (field: CheckoutField, value: string) => {
    update({ [field]: value });
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const place = async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setPlacing(true);
    try {
      const input: OrderInput = {
        customerName: details.customerName.trim(),
        phone: details.phone.trim(),
        email: details.email.trim() || undefined,
        governorate: method === 'DELIVERY' ? details.governorate : undefined,
        // The delegation leads the address the driver reads.
        address: method === 'DELIVERY' ? [details.delegation, details.address.trim()].filter(Boolean).join(', ') : undefined,
        deliveryMethod: method,
        paymentMethod: 'COD',
        notes: details.notes.trim() || undefined,
        vehicleEngineId: active?.engineId,
        // Only a code the shop's last quote accepted. The shop judges it again.
        promoCode: quote?.promo?.code,
        items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      };
      const body = JSON.stringify(input);
      if (attempt.current?.body !== body) attempt.current = { body, key: newIdempotencyKey() };
      const result = await ordersApi.place(input, accountToken(), attempt.current.key);
      // The key first, then everything that depends on the order existing.
      await remember(
        {
          ref: result.ref,
          placedAt: result.order.createdAt,
          total: result.order.total,
          itemCount: result.order.items.reduce((n, i) => n + i.qty, 0),
          lead: { name: result.order.items[0]?.name ?? '', families: result.order.items.slice(0, 3).map((i) => i.familySlug) },
          fromAccount: Boolean(accountToken()),
        },
        result.token,
      );
      justPlaced.set(result.ref, result.order);
      track('purchase', {
        ref: result.ref,
        total: result.order.total,
        items: result.order.items.reduce((n, i) => n + i.qty, 0),
        delivery: result.order.deliveryMethod,
        payment: 'COD',
        vehicle: Boolean(active),
      });
      clearCart();
      settle();
      // The stack ends up [tabs, confirmation]: "back" lands in the app.
      // Reached straight from sign-in, checkout can be alone in the stack.
      if (router.canDismiss()) router.dismissAll();
      router.push({ pathname: '/commande/confirmation/[ref]', params: { ref: result.ref } });
    } catch (err) {
      track('purchase_failed', { reason: err instanceof ApiError ? err.failure.kind : 'offline' });
      const failure: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
      setError(messageFor(failure));
      // The code stopped applying between the quote and the order: price again.
      if (failure.kind === 'invalid' && failure.field === 'promoCode') retry();
      setPlacing(false);
      busy.current = false;
    }
  };

  // The button: whatever is missing opens where it is typed; then a guest
  // confirms the number; then the order goes.
  const submit = () => {
    const problems = checkoutProblems({ ...details, deliveryMethod: method });
    setErrors(Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, t(v)])));
    const missing = Object.keys(problems) as CheckoutField[];
    if (missing.length) {
      openSheet(missing.some((f) => CONTACT.includes(f)) ? 'contact' : 'address');
      return;
    }
    update({ deliveryMethod: method });
    track('delivery_details_submitted', { method, governorate: details.governorate, delegation: details.delegation || null });
    if (guest) setSheet('confirm');
    else place();
  };

  const delay = deliveryDelay(settings, details.governorate);
  const delegations = details.governorate ? DELEGATIONS[details.governorate] : undefined;
  const elsewhere = details.governorate && details.address ? otherGovernorateIn(details.address, details.governorate, settings.governorates) : null;
  const count = items.reduce((n, i) => n + i.qty, 0);
  const toCheck = active && quote ? quote.lines.filter((l) => l.product && fitState(l.product) !== 'FITS').length : 0;
  const canPlace = state.status === 'loaded' && !state.data.blocked && !placing;
  const where = [details.delegation, details.governorate].filter(Boolean).join(', ');
  const addressSet = Boolean(details.governorate && details.address.trim());
  const contactSet = Boolean(details.customerName.trim() && details.phone.trim());
  const addressError = errors.governorate ?? errors.delegation ?? errors.address;
  const contactError = errors.customerName ?? errors.phone ?? errors.email;
  // Home delivery's own price, whichever option is picked: the quote's fee
  // when it was priced for delivery; priced for pickup (0), the shop's fee
  // unless the basket is over its free threshold. The order is priced again.
  const fee =
    method === 'DELIVERY' && quote
      ? quote.deliveryFee
      : quote && quote.subtotal - quote.discount >= quote.freeShippingThreshold
        ? 0
        : settings.delivery.fee;

  return (
    <View style={styles.root}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          {/* What is being bought, folded to one line. */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            style={[styles.orderHead, row]}
          >
            <View style={styles.flex}>
              <Text style={[styles.h1, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('checkout.yourOrder')}</Text>
              <Text variant="hint" style={start}>
                {active ? `${t('cart.itemCount', { n: count })} · ${t('checkout.forVehicle', { vehicle: ltr(vehicleLabel(active) ?? '') })}` : t('cart.itemCount', { n: count })}
              </Text>
            </View>
            <Feather name={open ? 'chevron-up' : 'chevron-down'} size={24} color={C.textMuted} />
          </Pressable>
          {open ? (
            <View style={styles.lines}>
              {items.map((i) => {
                const line = quote?.lines.find((l) => l.productId === i.productId);
                const fit = active && line?.product ? fitState(line.product) : null;
                return (
                  <View key={i.productId} style={[styles.lineRow, row]}>
                    <View style={styles.flex}>
                      <Text variant="body" tone={C.text} numberOfLines={2} style={start}>
                        {`${i.qty} × ${line?.product?.name ?? i.name}`}
                      </Text>
                      {fit ? (
                        <View style={[row, styles.fitLine]}>
                          <Feather name={FIT_LOOK[fit].icon} size={13} color={FIT_LOOK[fit].iconTone} />
                          <Text variant="hint" tone={FIT_LOOK[fit].tone}>
                            {t(FIT_LOOK[fit].short)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text variant="body">{line ? formatDT(line.lineTotal) : '—'}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Parts not confirmed for the car: one short line in bold; the
              why, the promise and the way to ask behind the (i). */}
          {toCheck > 0 ? (
            <View style={styles.toCheck}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: whyCheck }}
                accessibilityHint={t('product.fitWhy')}
                onPress={() => setWhyCheck((v) => !v)}
                testID="checkout-to-check"
                style={({ pressed }) => [styles.toCheckHead, row, pressed && { opacity: 0.7 }]}
              >
                <Feather name="help-circle" size={IconSize.medium} color={C.caution} />
                <Text style={[styles.flex, styles.toCheckTitle, start, { fontFamily: familyFor('bodySemi', rtl) }]}>
                  {t('checkout.toCheckTitle', { n: toCheck })}
                </Text>
                <Feather name={whyCheck ? 'x' : 'info'} size={IconSize.medium} color={C.text} />
              </Pressable>
              {whyCheck ? (
                <View style={styles.toCheckBody}>
                  <Text variant="hint" tone={C.text} style={start}>
                    {t('checkout.toCheckWhy', { n: toCheck })}
                  </Text>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push('/demande')}
                    style={[styles.toCheckLink, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}
                  >
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('expert.askShop')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* How it travels first — it decides whether there is an address to give:
              the shop's options, its delay, the basket's fee. */}
          <Text style={[styles.h2, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('checkout.method')}</Text>
          <View style={styles.options}>
            <Option
              selected={method === 'DELIVERY'}
              title={t('checkout.home')}
              sub={delay}
              price={fee === 0 ? t('cart.free') : formatDT(fee)}
              free={fee === 0}
              onPress={() => update({ deliveryMethod: 'DELIVERY' })}
            />
            {settings.pickup ? (
              <Option
                selected={method === 'PICKUP'}
                title={t('checkout.pickup')}
                sub={settings.pickup.hours}
                price={t('checkout.pickupFree')}
                free
                onPress={() => update({ deliveryMethod: 'PICKUP' })}
              />
            ) : null}
          </View>

          {/* Where, and who. */}
          <Text style={[styles.h2, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t(method === 'PICKUP' ? 'checkout.pickupAt' : 'checkout.addressTitle')}</Text>
          {/* Collected in store: the shop is the place — no address to give. */}
          {method === 'PICKUP' && settings.pickup ? (
            <Row icon="home" title={settings.pickup.address} sub={settings.pickup.hours} />
          ) : null}
          {method === 'DELIVERY' ? (
            <Row
              icon="map-pin"
              title={addressSet ? details.address.trim() : t('checkout.addAddress')}
              sub={addressSet ? where : null}
              strong={!addressSet}
              error={addressError}
              testID="checkout-address"
              onPress={() => openSheet('address')}
            />
          ) : null}
          <Row
            icon="user"
            title={contactSet ? details.customerName.trim() : t('checkout.addContact')}
            sub={contactSet ? ltr(`+216 ${details.phone.trim()}`) : null}
            strong={!contactSet}
            error={contactError}
            testID="checkout-contact"
            onPress={() => openSheet('contact')}
          />
          <Row
            icon="message-square"
            title={details.notes.trim() ? details.notes.trim() : t('checkout.noteRow')}
            sub={details.notes.trim() ? null : t('checkout.noteRowWhy')}
            onPress={() => openSheet('note')}
          />

          {/* How it is paid: one way, said plainly. */}
          <Text style={[styles.h2, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('checkout.paymentTitle')}</Text>
          <View style={[styles.row, row]} accessibilityRole="radio" accessibilityState={{ checked: true }}>
            <Feather name="dollar-sign" size={IconSize.large} color={C.text} />
            <View style={styles.flex}>
              <Text variant="body" tone={C.text} style={start}>
                {t('checkout.cod')}
              </Text>
              <Text variant="hint" style={start}>
                {t('checkout.codWhy')}
              </Text>
            </View>
            <Feather name="check-circle" size={IconSize.large} color={C.success} />
          </View>
          <View style={styles.promo}>
            <PromoField quote={quote} stale={state.status === 'loading'} />
          </View>
        </View>

        {/* The shop's figures, on a receipt. */}
        <Receipt>
          <View style={styles.column}>
            <Text style={[styles.h2, styles.receiptTitle, start, { fontFamily: familyFor('headingStrong', rtl) }]}>{t('checkout.summary')}</Text>
            {quote ? (
              <OrderSummary
                subtotal={quote.subtotal}
                discount={quote.discount}
                promoCode={quote.promo?.code}
                deliveryFee={quote.deliveryFee}
                deliveryFeeWaived={quote.deliveryFeeWaived ?? 0}
                stampDuty={quote.stampDuty}
                total={quote.total}
                deliveryLabel={t(method === 'PICKUP' ? 'checkout.pickup' : 'cart.deliveryHome')}
                stale={state.status === 'loading'}
              />
            ) : null}
            {state.status === 'failed' ? (
              <View style={styles.notice}>
                <Text variant="hint" tone={C.danger}>
                  {t('cart.quoteFailed')}
                </Text>
                <Button label={t('state.retry')} variant="secondary" onPress={retry} />
              </View>
            ) : null}
          </View>
        </Receipt>
      </ScrollView>

      <StickyBar>
        {error ? (
          <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
            {t(error)}
          </Text>
        ) : null}
        <Button
          label={quote ? `${t('cart.go')} · ${formatDT(quote.total)}` : t('checkout.place')}
          onPress={submit}
          disabled={!canPlace}
          loading={placing || state.status === 'loading'}
        />
      </StickyBar>

      {/* Where: the form, and the governorate and delegation lists inside
          the same sheet, so a sheet never opens over (or after) a sheet. */}
      <BottomSheet
        visible={sheet === 'address'}
        onClose={() => (pick ? setPick(null) : setSheet(null))}
        title={t(pick === 'governorate' ? 'checkout.chooseGovernorate' : pick === 'delegation' ? 'checkout.chooseDelegation' : 'checkout.addressTitle')}
      >
        {pick === 'governorate' ? (
          <ScrollView style={styles.sheetList}>
            {settings.governorates.map((g) => (
              <Choice
                key={g}
                label={g}
                selected={g === details.governorate}
                onPress={() => {
                  // A delegation belongs to its governorate; changing one clears the other.
                  update({ governorate: g, ...(g !== details.governorate ? { delegation: '' } : {}) });
                  setErrors((e) => ({ ...e, governorate: undefined }));
                  setPick(null);
                }}
              />
            ))}
          </ScrollView>
        ) : pick === 'delegation' ? (
          <ScrollView style={styles.sheetList}>
            {(delegations ?? []).map((d) => (
              <Choice
                key={d}
                label={d}
                selected={d === details.delegation}
                onPress={() => {
                  update({ delegation: d });
                  setErrors((e) => ({ ...e, delegation: undefined }));
                  setPick(null);
                }}
              />
            ))}
          </ScrollView>
        ) : (
          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fields}>
              <Select
                label={t('checkout.governorate')}
                value={details.governorate}
                placeholder={t('checkout.chooseGovernorate')}
                error={errors.governorate}
                onPress={() => setPick('governorate')}
              />
              {delegations ? (
                <Select
                  label={t('checkout.delegation')}
                  value={details.delegation ?? ''}
                  placeholder={t('checkout.chooseDelegation')}
                  error={errors.delegation}
                  onPress={() => setPick('delegation')}
                />
              ) : null}
              <FormField
                label={t('checkout.address')}
                hint={elsewhere ? t('checkout.addressElsewhere', { chosen: details.governorate, named: elsewhere }) : delegations ? t('checkout.addressHintShort') : t('checkout.addressHint')}
                value={details.address}
                onChangeText={(v) => edit('address', v)}
                error={errors.address}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                multiline
                maxLength={500}
              />
              <Button label={t('checkout.save')} onPress={() => setSheet(null)} />
            </View>
          </ScrollView>
        )}
      </BottomSheet>

      <BottomSheet visible={sheet === 'contact'} onClose={() => setSheet(null)} title={t('checkout.contactTitle')}>
        <ContactFields details={details} errors={errors} edit={edit} onDone={() => setSheet(null)} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'note'} onClose={() => setSheet(null)} title={t('checkout.noteRow')}>
        <View style={styles.fields}>
          <FormField label={t('checkout.notes')} value={details.notes} onChangeText={(v) => update({ notes: v })} multiline maxLength={1000} />
          <Button label={t('checkout.save')} onPress={() => setSheet(null)} />
        </View>
      </BottomSheet>

      {/* The account, opened here: the number just typed, confirmed by SMS. */}
      <BottomSheet visible={sheet === 'confirm'} onClose={() => setSheet(null)} title={t('checkout.confirmPhone')}>
        <View style={styles.fields}>
          <Text variant="hint" style={start}>
            {t('checkout.confirmPhoneWhy')}
          </Text>
          {sheet === 'confirm' ? (
            <PhoneSignIn
              preset={{ phone: details.phone, name: details.customerName, email: details.email }}
              onDone={() => {
                setSheet(null);
                place();
              }}
            />
          ) : null}
        </View>
      </BottomSheet>
    </View>
  );
}

function ContactFields({
  details,
  errors,
  edit,
  onDone,
}: {
  details: { customerName: string; phone: string; email: string };
  errors: Partial<Record<CheckoutField, string>>;
  edit: (field: CheckoutField, value: string) => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const phone = useRef<TextInput>(null);
  const email = useRef<TextInput>(null);
  return (
    <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
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
          prefix="+216"
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
        <Button label={t('checkout.save')} onPress={onDone} />
      </View>
    </ScrollView>
  );
}

/** A line of the page: an icon, what is set (or what to add), a chevron. */
function Row({
  icon,
  title,
  sub,
  strong = false,
  error,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  sub?: string | null;
  strong?: boolean;
  error?: string;
  onPress?: () => void;
  testID?: string;
}) {
  const { rtl } = useI18n();
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
    >
      <Feather name={icon} size={IconSize.large} color={error ? C.danger : C.text} />
      <View style={styles.flex}>
        <Text
          numberOfLines={2}
          style={[styles.rowTitle, start, { fontFamily: familyFor(strong ? 'bodySemi' : 'body', rtl) }, error ? { color: C.danger } : null]}
        >
          {title}
        </Text>
        {sub ? (
          <Text variant="hint" numberOfLines={2} style={start}>
            {sub}
          </Text>
        ) : null}
        {error ? (
          <Text variant="hint" tone={C.danger} style={start}>
            {error}
          </Text>
        ) : null}
      </View>
      {onPress ? <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} /> : null}
    </Pressable>
  );
}

/** One delivery option, as a card that is either chosen or not. */
function Option({
  selected,
  title,
  sub,
  price,
  free,
  onPress,
}: {
  selected: boolean;
  title: string;
  sub: string | null;
  price: string;
  free: boolean;
  onPress: () => void;
}) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, { flexDirection: rtl ? 'row-reverse' : 'row' }, selected && styles.optionOn, pressed && !selected && styles.pressed]}
    >
      <View style={[styles.flex, { flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'baseline', gap: Spacing.two, flexWrap: 'wrap' }]}>
        <Text style={[styles.optionTitle, { fontFamily: familyFor('bodySemi', rtl) }]}>{title}</Text>
        {sub ? <Text variant="hint">{sub}</Text> : null}
      </View>
      {free ? (
        <View style={styles.freeTag}>
          <Text style={[styles.freeText, { fontFamily: familyFor('bodySemi', rtl) }]}>{price}</Text>
        </View>
      ) : (
        <Text style={[styles.optionPrice, { fontFamily: familyFor('bodySemi', rtl) }]}>{price}</Text>
      )}
    </Pressable>
  );
}

function Select({ label, value, placeholder, error, onPress }: { label: string; value: string; placeholder: string; error?: string; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <View style={styles.field}>
      <Text variant="hint" tone={C.text}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [styles.select, { flexDirection: rtl ? 'row-reverse' : 'row' }, error ? styles.selectError : null, pressed && styles.pressed]}
      >
        <Text variant="body" tone={value ? C.text : C.textFaint} style={styles.flex}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={IconSize.large} color={C.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="hint" tone={C.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
    >
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      {selected ? <Feather name="check" size={IconSize.medium} color={C.text} /> : null}
    </Pressable>
  );
}

/** A grey band with a torn top edge, as a till receipt is. */
function Receipt({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(0);
  const tooth = 12;
  const n = Math.ceil(width / tooth);
  let d = `M0 ${tooth / 2}`;
  for (let i = 0; i < n; i++) d += ` L${i * tooth + tooth / 2} 0 L${(i + 1) * tooth} ${tooth / 2}`;
  d += ` L${width} ${tooth / 2 + 1} L0 ${tooth / 2 + 1} Z`;
  return (
    <View style={styles.receipt} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <Svg width={width} height={tooth / 2 + 1} style={styles.teeth}>
          <Path d={d} fill={C.surface} />
        </Svg>
      ) : null}
      <View style={styles.receiptBody}>{children}</View>
    </View>
  );
}

/** Whose problem it is, in the customer's words — and whether it may have gone through. */
function messageFor(failure: ApiFailure): DictKey {
  switch (failure.kind) {
    case 'invalid':
      if (failure.field === 'promoCode') return 'checkout.err.promo';
      return failure.field === 'customerName'
        ? 'checkout.err.customerName'
        : failure.field === 'phone'
          ? 'checkout.err.phone'
          : failure.field === 'email'
            ? 'checkout.err.email'
            : failure.field === 'address'
              ? 'checkout.err.address'
              : failure.field === 'governorate'
                ? 'checkout.err.governorate'
                : 'checkout.err.form';
    case 'unavailable':
      return 'checkout.err.unavailable';
    case 'rateLimited':
      return 'checkout.err.rateLimited';
    case 'offline':
      return 'checkout.err.offline';
    case 'timeout':
      return 'checkout.err.timeout';
    default:
      return 'checkout.err.server';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { flexGrow: 1 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  pressed: { backgroundColor: C.surface },
  underline: { textDecorationLine: 'underline' },
  toCheckHead: { alignItems: 'center', gap: Spacing.two, minHeight: Tap.min + 4 },
  toCheckTitle: { fontSize: 15, lineHeight: 20, color: C.text },
  toCheckBody: { paddingBottom: Spacing.two },
  toCheckLink: { minHeight: Tap.min, justifyContent: 'center' },
  orderHead: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  h1: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: C.text },
  h2: { fontSize: 21, lineHeight: 27, color: C.text, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  lines: { gap: Spacing.two, paddingVertical: Spacing.two },
  lineRow: { gap: Spacing.three, alignItems: 'flex-start' },
  fitLine: { alignItems: 'center', gap: Spacing.one, marginTop: 2 },
  toCheck: {
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    backgroundColor: C.cautionSurface,
    borderColor: C.cautionBorder,
  },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + 8, paddingVertical: Spacing.two, borderRadius: Radius.tile },
  rowTitle: { fontSize: 16, lineHeight: 22, color: C.text },
  options: { gap: Spacing.two },
  option: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  optionOn: { borderWidth: Border.selected, borderColor: C.text },
  optionTitle: { fontSize: 16, lineHeight: 22, color: C.text },
  optionPrice: { fontSize: 16, lineHeight: 22, color: C.text },
  freeTag: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 6, backgroundColor: C.successSurface },
  freeText: { fontSize: 14, lineHeight: 20, color: C.success },
  promo: { paddingTop: Spacing.two },
  receipt: { marginTop: Spacing.four, flexGrow: 1 },
  teeth: { marginBottom: -1 },
  receiptBody: { flexGrow: 1, backgroundColor: C.surface, paddingBottom: Spacing.five },
  receiptTitle: { paddingTop: Spacing.three },
  notice: { gap: Spacing.two },
  sheetBody: { maxHeight: 520 },
  sheetList: { maxHeight: 420 },
  fields: { gap: Spacing.three, paddingBottom: Spacing.three },
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
  choice: { minHeight: Tap.primary, alignItems: 'center', paddingHorizontal: Spacing.two, borderRadius: Radius.tile },
});
