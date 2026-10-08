import { Feather, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productApi, type ProductDetail } from '@/api/product';
import type { ShopSettings } from '@/api/shop';
import { Accordion } from '@/components/ui/accordion';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BrandLogo } from '@/components/ui/brand-logo';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { API_BASE_URL } from '@/constants/config';
import { Border, Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useAddToCart } from '@/hooks/use-add-to-cart';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { PartImage } from '@/components/ui/part-image';
import { fitState } from '@/lib/fit';
import { formatDT, ltr, yearSpan } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel } from '@/store/garage';
import { track } from '@/services/analytics';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCheckout } from '@/store/checkout';
import { delaySpan, deliveryDelay } from '@/lib/checkout';
import { useCart } from '@/store/cart';
import { ProductTile } from '@/components/ui/product-tile';
import { Rail } from '@/components/ui/rail';
import { whatsappUrl } from '@/components/ui/shop-contact';
import { MakeLogo } from '@/components/ui/make-logo';
import { useVehicleLine } from '@/components/ui/vehicle-card';
import { StockAlert } from '@/components/ui/stock-alert';

/**
 * Fiche produit.
 *
 * Top to bottom in the order a customer decides — the order the website's
 * own page settled on after its first version buried the price under a
 * paragraph of prose: the part, who made it, what it is, whether it fits
 * THEIR car, what it costs, whether the shop has it. Then the button, pinned
 * under the thumb. Everything else is real and is one tap away in a section
 * that says, closed, what it holds.
 *
 * What is not here, because the shop has no data for it: a star rating, a
 * review count, a delivery date, a "best-seller" ribbon. The reference
 * design this screen was drawn from shows "4.6 (124 avis)"; this catalogue
 * has no review table, so the line is absent rather than invented.
 *
 * A part that does not fit the chosen car can still be bought — the fitment
 * data can be wrong, and a mechanic may know better — but not on one tap. It
 * asks first. That is the website's rule and the brief's: do not silently
 * allow it, and do not silently block it.
 */
export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const active = useGarage((s) => s.active);
  const engineId = active?.engineId;

  const load = useCallback((signal: AbortSignal) => productApi.bySlug(slug, engineId, signal), [slug, engineId]);
  const product = useResource(load);
  const settings = useShopSettings();
  const viewed = product.status === 'loaded' ? product.data : null;
  // Once per opening of the page, when it first renders — not again on
  // every refetch (pull to refresh, a language switch, the refresh after an
  // add), which stamped a second "viewed" after the add and turned the
  // view → add funnel backwards.
  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (!viewed) return;
    const key = `${viewed.id}|${engineId ?? ''}`;
    if (tracked.current === key) return;
    tracked.current = key;
    const fit = fitState(viewed);
    track('product_viewed', { productId: viewed.id, slug: viewed.slug, brand: viewed.brand, price: viewed.price, family: viewed.familySlug, fit: fit ?? 'none' });
    if (engineId) track('compatibility_checked', { productId: viewed.id, engineId, verdict: viewed.fitment, fit: fit ?? 'none' });
  }, [viewed, engineId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            product.status === 'loaded' ? (
              <View style={styles.headerActions}>
                <PhotoButton sku={product.data.sku} />
                <ShareButton product={product.data} />
              </View>
            ) : null,
        }}
      />
      {product.status === 'loading' ? (
        <ProductSkeleton />
      ) : product.status === 'failed' ? (
        product.failure.kind === 'notFound' ? (
          <Empty title={t('product.goneTitle')} body={t('product.goneBody')} />
        ) : (
          <Failed failure={product.failure} onRetry={product.retry} />
        )
      ) : (
        <ProductBody product={product.data} settings={settings.status === 'loaded' ? settings.data : null} />
      )}
    </>
  );
}

function ProductBody({ product, settings }: { product: ProductDetail; settings: ShopSettings | null }) {
  // One delivery promise across the app: the delay the checkout will show,
  // for the governorate the customer last delivered to (lib/checkout). With
  // none known yet, both of the shop's delays, each with its area — never
  // the fast one alone, which the checkout would then contradict.
  const governorate = useCheckout((s) => s.details.governorate);
  const { t: tr } = useI18n();
  const delay = settings && governorate ? deliveryDelay(settings, governorate) : null;
  const shipLine = !settings
    ? null
    : delay
      ? tr('product.shipTo', { t: delay, g: governorate })
      : settings.delivery.grandTunis && settings.delivery.regions
        ? tr('product.shipBoth', { a: settings.delivery.grandTunis, b: settings.delivery.regions })
        : (settings.delivery.grandTunis ?? settings.delivery.regions)
          ? tr('product.shipIn', { t: (settings.delivery.grandTunis ?? settings.delivery.regions)! })
          : null;
  const shipShort = delay ?? (settings ? delaySpan(settings.delivery.grandTunis, settings.delivery.regions) : null);
  const refreshControl = usePullRefresh();
  const { t, rtl } = useI18n();
  const router = useRouter();
  const addToCart = useAddToCart();
  const active = useGarage((s) => s.active);
  const [qty, setQty] = useState(1);
  const [confirming, setConfirming] = useState(false);
  // The verdict's reasons, opened from its (i).
  const [whyOpen, setWhyOpen] = useState(false);
  const [compatKey, setCompatKey] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const compatY = useRef(0);
  const insets = useSafeAreaInsets();

  // The purchase bar is pinned to the foot of the screen, always within
  // reach. Once the part is in the cart the bar becomes the cart's own
  // counter for it (− n +, down to zero to take it out) beside "Voir le
  // panier (n)" — the state stays on screen instead of a message that
  // vanished before it was read.
  const inCart = useCart((s) => s.items.find((i) => i.productId === product.id)?.qty ?? 0);
  const setCartQty = useCart((s) => s.setQty);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const commit = () => {
    if (!addToCart(product, qty, { silent: true })) return;
    setQty(1);
  };

  const buyable = product.availability !== 'UNAVAILABLE';
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const add = () => {
    if (product.fitment === 'DOES_NOT_FIT') {
      setConfirming(true);
      return;
    }
    commit();
  };

  const position = [
    product.axle ? t(`axle.${product.axle}`) : null,
    product.side ? t(`side.${product.side}`) : null,
  ].filter(Boolean) as string[];

  const specRows = [
    ...(position.length ? [{ label: t('product.position'), value: position.join(' · ') }] : []),
    ...product.specs,
  ];

  const carName = active ? `${active.makeName} ${active.modelName}` : '';
  const engineLine = active ? ltr(active.engineName) : '';
  // Incompatible is a neutral panel with a red mark, not a red alarm: the
  // part is fine, it is just not listed for this car — and here is why.
  const fit =
    product.fitment === 'FITS'
      ? { icon: 'check-circle' as const, fg: C.success, titleTone: C.success, bg: C.successSurface, text: t('product.fitsYour', { car: carName }), why: [engineLine, t('look.fitGuarantee')].filter(Boolean).join(' · ') }
      : product.fitment === 'DOES_NOT_FIT'
        ? {
            icon: 'x-circle' as const,
            fg: C.danger,
            titleTone: C.text,
            bg: C.surface,
            text: t('product.notYour', { car: carName }),
            why:
              product.fitmentReason === 'WRONG_FUEL'
                ? t('look.whyFuel', { car: carName })
                : product.compatibility.total > 0
                  ? t('look.whyNot', { n: product.compatibility.total, car: carName })
                  : t('look.whyNotNone'),
          }
        : product.fitment === 'UNKNOWN' && fitState(product) === 'LIKELY'
          ? {
              icon: 'help-circle' as const,
              fg: C.caution,
              titleTone: C.cautionText,
              bg: C.cautionSurface,
              text: t('fit.likely'),
              why: product.fitmentReason === 'SAME_ENGINE_CODE' ? t('look.unknownSameEngine', { car: carName }) : t('look.likelyDerived', { car: carName }),
            }
          : product.fitment === 'UNKNOWN'
            ? { icon: 'search' as const, fg: C.textMuted, titleTone: C.text, bg: C.surface, text: t('fit.unknown'), why: `${t('look.unknownWhy', { car: carName })} ${t('product.unknownNote')}` }
            : { icon: 'info' as const, fg: C.text, titleTone: C.text, bg: C.surface, text: t('look.chooseToCheck'), why: null };
  const openCompat = () => {
    setCompatKey((k) => k + 1);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: compatY.current, animated: true }));
  };

  const refCount = product.oeGroups.reduce((n, g) => n + g.refs.length, 0) + product.aftermarketRefs.length;

  const stock =
    product.availability === 'IN_STOCK'
      ? {
          icon: 'check' as const,
          tone: C.success,
          // In stock, without a count: the owner's rule.
          label: t('stock.inStock'),
          detail: null,
        }
      : product.availability === 'ON_ORDER'
        ? {
            icon: 'clock' as const,
            tone: C.cautionText,
            label: t('stock.onOrder'),
            // Named only when the shop has named it. Without the setting the
            // line says the part is ordered in and stops there.
            detail: product.leadTime ? `${t('product.onOrderDetail')} · ${product.leadTime}` : t('product.onOrderDetail'),
          }
        : { icon: 'slash' as const, tone: C.textFaint, label: t('stock.unavailable'), detail: t('product.unavailableDetail') };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.scroll, { paddingBottom: BAR_HEIGHT + insets.bottom + Spacing.four }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.column}>
          <ShoppingFor />
          <Gallery product={product} />

          {/* The maker's logo, then the name — the reference's order. */}
          <View style={styles.identity}>
            {product.brand ? <BrandLogo name={product.brand} /> : null}
            <Text style={[styles.name, { fontFamily: familyFor('heading', rtl) }]}>{product.name}</Text>
            <View style={[styles.refRow, row]}>
              <Text variant="hint" selectable>
                {t('product.ref', { sku: product.sku })}
              </Text>
              {position.map((p) => (
                <View key={p} style={styles.tag}>
                  <Text variant="hint" tone={C.text}>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.priceRow, row]}>
            <Text style={[styles.price, { fontFamily: familyFor('headingStrong', rtl) }]}>{formatDT(product.price)}</Text>
            {product.compareAtPrice !== null && product.compareAtPrice > product.price ? (
              <>
                <Text variant="hint" tone={C.textFaint} style={styles.struck}>
                  {formatDT(product.compareAtPrice)}
                </Text>
                {/* The shop's own reference price, never an invented "was". */}
                <View style={styles.save}>
                  <Text style={[styles.saveText, { fontFamily: familyFor('bodySemi', rtl) }]}>
                    {t('product.save', { amount: formatDT(product.compareAtPrice - product.price) })}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
          <View style={[styles.stock, row]}>
            <View style={[styles.dot, { backgroundColor: stock.tone }]} />
            <Text variant="hint" tone={stock.tone}>
              {stock.label}
            </Text>
            {buyable && shipLine ? <Text variant="hint">{`·  ${shipLine}`}</Text> : null}
          </View>
          {stock.detail ? <Text variant="hint">{stock.detail}</Text> : null}
          {/* Not on the shelf: one push the day it is (phones with push only). */}
          {product.availability !== 'IN_STOCK' ? <StockAlert slug={product.slug} /> : null}

          {/* The verdict against their car, on one line. Why — the shop's
              own reasons — opens under it from the (i), so the price and the
              button stay the loudest things here. */}
          <View style={[styles.fitBlock, { backgroundColor: fit.bg }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={fit.why ? { expanded: whyOpen } : undefined}
              accessibilityHint={fit.why ? t('product.fitWhy') : undefined}
              disabled={!fit.why}
              onPress={() => setWhyOpen((v) => !v)}
              testID="fit-info"
              style={[row, styles.fitHead]}
            >
              <Feather name={fit.icon} size={20} color={fit.fg} />
              <Text style={[styles.fitTitle, styles.flex, { fontFamily: familyFor('bodySemi', rtl), color: fit.titleTone, textAlign: rtl ? 'right' : 'left' }]}>{fit.text}</Text>
              {fit.why ? <Feather name={whyOpen ? 'x' : 'info'} size={20} color={C.textMuted} /> : null}
            </Pressable>
            {whyOpen && fit.why ? (
              <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
                {fit.why}
              </Text>
            ) : null}
            {product.fitment === null ? (
              <Button label={t('look.changeVehicle')} icon="plus" variant="secondary" onPress={() => router.push('/garage/ajouter')} />
            ) : (
              <View style={[row, styles.fitActions]}>
                {product.compatibility.total > 0 ? (
                  <Pressable accessibilityRole="button" onPress={openCompat} hitSlop={10} style={styles.fitLink}>
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('look.seeFits')}
                    </Text>
                  </Pressable>
                ) : null}
                {product.fitment === 'FITS' ? (
                  // The shop's own guarantee for a part it confirmed (/garanties).
                  <Pressable accessibilityRole="link" onPress={() => router.push('/garanties')} hitSlop={10} style={styles.fitLink}>
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('look.ourGuarantees')}
                    </Text>
                  </Pressable>
                ) : null}
                {product.fitment === 'UNKNOWN' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/demande', params: { sku: product.sku } })}
                    hitSlop={10}
                    style={styles.fitLink}
                  >
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('expert.askShop')}
                    </Text>
                  </Pressable>
                ) : null}
                {product.fitment === 'UNKNOWN' && settings?.contact.whatsapp ? (
                  // A link with the green mark, not a green button: the
                  // question is a side door, the basket is the way on.
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={t('help.whatsapp')}
                    onPress={() => {
                      track('whatsapp_opened', { from: 'to_check', sku: product.sku });
                      track('fitment_question_sent', { productId: product.id, sku: product.sku, channel: 'whatsapp' });
                      const text = t('product.whatsappCheck', { name: product.name, sku: product.sku, car: vehicleLabel(active) ?? '' });
                      void Linking.openURL(whatsappUrl(settings.contact.whatsapp!, text)).catch(() => undefined);
                    }}
                    hitSlop={10}
                    style={[row, styles.fitLink, styles.waLink]}
                  >
                    <FontAwesome name="whatsapp" size={16} color={Brand.green700} />
                    <Text variant="hint" tone={Brand.green800} style={styles.underline}>
                      WhatsApp
                    </Text>
                  </Pressable>
                ) : null}
                {product.fitment === 'DOES_NOT_FIT' && active ? (
                  // The way out of a part that does not fit is the parts of
                  // the same kind that do — for this car, compatible first.
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/famille/[family]', params: { family: product.familySlug } })}
                    hitSlop={10}
                    style={styles.fitLink}
                  >
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('look.seeFitsMine', { make: active.makeName })}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>


          {/* Quantity and the button, side by side, as in the reference. */}
          {/* Three facts, each the shop's own: its delay, its warranty, its
              return window. */}
          {/* The whole row opens "Retours et garantie": what each promise
              means, and how to use it. */}
          {settings ? (
            <Pressable
              accessibilityRole="link"
              accessibilityHint={t('returns.policy')}
              onPress={() => router.push('/garanties')}
              style={({ pressed }) => [styles.facts, row, pressed && styles.factsPressed]}
            >
              <Fact icon="truck" title={t('product.deliveryShort')} value={shipShort ?? t('product.cod')} />
              <View style={styles.factRule} />
              <Fact icon="shield" title={t('product.warrantyShort')} value={t('product.months', { n: settings.warrantyMonths })} />
              <View style={styles.factRule} />
              <Fact icon="rotate-ccw" title={t('product.returnShort')} value={t('product.days', { n: settings.returnDays })} />
            </Pressable>
          ) : null}

          <View style={styles.sections}>
            {product.description ? (
              <Accordion title={t('product.description')}>
                <Text variant="body" selectable>
                  {product.description}
                </Text>
              </Accordion>
            ) : null}

            {specRows.length ? (
              <Accordion title={t('product.specsLong')}>
                {specRows.map((r) => (
                  <KeyValue key={r.label} label={r.label} value={r.value} />
                ))}
              </Accordion>
            ) : null}

            <View onLayout={(e) => (compatY.current = e.nativeEvent.layout.y)}>
              <Accordion
                key={compatKey}
                initiallyOpen={compatKey > 0}
                title={t('product.compat')}
                summary={
                  product.compatibility.total
                    ? t('product.compatCount', { n: product.compatibility.total })
                    : t('fit.unknownShort')
                }
              >
                <Compatibility product={product} activeEngineId={active?.engineId} />
              </Accordion>
            </View>

            {refCount ? (
              <Accordion title={t('product.oemLong')}>
                {product.oeGroups.length ? (
                  <View style={styles.refGroup}>
                    <Text variant="label">{t('product.oem')}</Text>
                    {product.oeGroups.map((g) => (
                      <KeyValue key={g.owner || '—'} label={g.owner || '—'} value={g.refs.map((r) => r.raw).join('  ·  ')} mono />
                    ))}
                  </View>
                ) : null}
                {product.aftermarketRefs.length ? (
                  <View style={styles.refGroup}>
                    <Text variant="label">{t('product.aftermarket')}</Text>
                    {product.aftermarketRefs.map((r) => (
                      <KeyValue key={`${r.brand}-${r.raw}`} label={r.brand || '—'} value={r.raw} mono />
                    ))}
                  </View>
                ) : null}
              </Accordion>
            ) : null}

            {product.packContents.length ? (
              <Accordion title={t('product.pack')} initiallyOpen>
                {product.packContents.map((p) => (
                  <Pressable
                    key={p.slug}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/produit/[slug]', params: { slug: p.slug } })}
                    style={({ pressed }) => [styles.packRow, row, pressed && styles.pressed]}
                  >
                    <Text variant="body" style={styles.flex} numberOfLines={2}>
                      {p.name}
                    </Text>
                    <Text variant="hint" tone={C.text}>
                      {formatDT(p.price)}
                    </Text>
                  </Pressable>
                ))}
              </Accordion>
            ) : null}

            {product.manufacturer ? (
              <Accordion title={t('product.manufacturer')}>
                {[product.manufacturer.legalName, product.manufacturer.address, product.manufacturer.phone, product.manufacturer.email, product.manufacturer.website]
                  .filter(Boolean)
                  .map((line) => (
                    <Text key={line} variant="body" selectable>
                      {line}
                    </Text>
                  ))}
              </Accordion>
            ) : null}
          </View>

          {product.boughtTogether.length > 0 ? (
            <View style={styles.together}>
              <Text style={[styles.togetherTitle, { fontFamily: familyFor('heading', rtl), textAlign: rtl ? 'right' : 'left' }]}>
                {t('product.boughtTogether')}
              </Text>
              <Rail contentContainerStyle={[styles.togetherRow, row]}>
                {product.boughtTogether.map((p) => (
                  <View key={p.id} style={styles.togetherTile}>
                    <ProductTile product={p} />
                  </View>
                ))}
              </Rail>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.barInner, row]}>
          {!buyable ? (
            <Button label={t('stock.unavailable')} onPress={() => undefined} disabled style={styles.flex} />
          ) : inCart > 0 ? (
            <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={[styles.flex, row, styles.addedRow]}>
              <View style={styles.inCart}>
                <Text accessibilityLiveRegion="polite" variant="hint" tone={C.success} style={{ fontFamily: familyFor('bodySemi', rtl) }}>
                  {t('look.inCart')}
                </Text>
                <QuantityStepper value={inCart} onChange={(q) => setCartQty(product.id, q)} min={0} size="compact" />
              </View>
              <Button label={t('look.viewCartN', { n: cartCount })} icon="shopping-cart" onPress={() => router.navigate('/panier')} style={styles.flex} />
            </Animated.View>
          ) : (
            <>
              <QuantityStepper value={qty} onChange={setQty} size="compact" />
              <Button label={t('product.add')} icon="shopping-cart" onPress={add} style={styles.flex} />
            </>
          )}
        </View>
      </View>

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} title={t('product.mismatchTitle')}>
        <View style={styles.sheetBody}>
          <Text variant="body">{t('product.mismatchBody', { vehicle: ltr(vehicleLabel(active) ?? '') })}</Text>
          <Button
            label={t('product.addAnyway')}
            variant="secondary"
            onPress={() => {
              setConfirming(false);
              commit();
            }}
          />
          <Button label={t('garage.cancel')} onPress={() => setConfirming(false)} />
        </View>
      </BottomSheet>
    </View>
  );
}

/**
 * The part itself — a photograph when the shop uploaded one, otherwise the
 * family's drawing, labelled as a drawing so a screen reader does not
 * describe it as a photo of this part.
 */
function Gallery({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState<string | null>(null);
  const slide = Math.min(width, MaxContentWidth) - Spacing.three * 2;

  if (product.gallery.length === 0) {
    // Shorter than a photograph's frame. A drawing of the family is a
    // placeholder for a photo the shop does not have yet, and giving it the
    // photo's 240pt made the first screen a large grey box with a small icon
    // in it — the "giant empty rectangle" the old storefront cards had.
    return (
      <View
        style={[styles.gallery, styles.galleryDrawing]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('product.illustration', { family: product.family.name })}
      >
        <PartImage slug={product.familySlug} size={220} tagIllustration />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / slide))}
        // A ScrollView's own style must not carry alignItems/justifyContent —
        // React Native throws on it (that crashed every product with photos).
        style={[styles.galleryScroll, { width: slide }]}
      >
        {product.gallery.map((src) => (
          // Tap for the photo full screen — a part is chosen by its details.
          <Pressable key={src} accessibilityRole="imagebutton" accessibilityLabel={product.name} onPress={() => setZoomed(src)}>
            <Image source={{ uri: `${API_BASE_URL}${src}` }} style={{ width: slide, height: GALLERY_HEIGHT }} contentFit="contain" transition={150} />
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={zoomed !== null} transparent animationType="fade" onRequestClose={() => setZoomed(null)}>
        <View style={styles.zoom}>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={styles.zoomContent}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {zoomed ? <Image source={{ uri: `${API_BASE_URL}${zoomed}` }} style={{ width, height: width }} contentFit="contain" /> : null}
          </ScrollView>
          <Pressable accessibilityRole="button" accessibilityLabel={t('product.zoomClose')} onPress={() => setZoomed(null)} hitSlop={12} style={styles.zoomClose}>
            <Feather name="x" size={26} color={Brand.white} />
          </Pressable>
        </View>
      </Modal>
      {product.gallery.length > 1 ? (
        <Text variant="hint" style={styles.counter}>
          {`${index + 1} / ${product.gallery.length}`}
        </Text>
      ) : null}
    </View>
  );
}

function Compatibility({ product, activeEngineId }: { product: ProductDetail; activeEngineId?: string }) {
  const { t, rtl } = useI18n();
  const { vehicles, total } = product.compatibility;

  if (total === 0) return <Text variant="body">{t('product.compatNone')}</Text>;

  return (
    <View style={styles.compat}>
      {vehicles.map((v) => {
        const mine = v.engineId === activeEngineId;
        const years = yearSpan(v.yearFrom, v.yearTo, t);
        const meta = [v.fuel, v.powerHp ? t('common.power', { hp: v.powerHp }) : null, v.engineCode, years]
          .filter(Boolean)
          .join(' · ');
        return (
          <View key={v.engineId} style={[styles.vehicleRow, { flexDirection: rtl ? 'row-reverse' : 'row' }, mine && styles.vehicleMine]}>
            {/* A green tick only for a row the shop recorded. An inferred row
                for THEIR engine is a lead, and the page above says "à
                confirmer" about it — the two must never disagree. */}
            <Feather
              name={mine ? (v.derived ? 'help-circle' : 'check-circle') : 'circle'}
              size={IconSize.small}
              color={mine ? (v.derived ? C.caution : C.success) : C.textFaint}
            />
            <View style={styles.flex}>
              <Text variant="body" tone={C.text}>
                {`${v.make} ${v.model} · ${v.engine}`}
              </Text>
              {meta || mine || v.derived ? (
                <Text variant="hint">
                  {[mine ? t('product.compatYours') : null, meta || null, v.derived ? t('product.compatDerived') : null]
                    .filter(Boolean)
                    .join(' — ')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      {total > vehicles.length ? <Text variant="hint">{t('product.compatMore', { n: total - vehicles.length })}</Text> : null}
    </View>
  );
}

function Fact({ icon, title, value }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Feather name={icon} size={IconSize.medium} color={C.textMuted} />
      <Text variant="hint" tone={C.text} style={styles.factText}>
        {title}
      </Text>
      <Text variant="hint" style={styles.factText}>
        {value}
      </Text>
    </View>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { rtl } = useI18n();
  return (
    <View style={[styles.kv, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Text variant="hint" style={styles.kvLabel}>
        {label}
      </Text>
      <Text variant="body" selectable style={[styles.kvValue, mono && styles.mono]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * "Envoyer une photo": the camera, one tap from any part — a photo of the
 * old part goes to the shop with this part's reference and the car, and a
 * seller answers (app/demande, photo first).
 */
function PhotoButton({ sku }: { sku: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('search.sendPhoto')}
      hitSlop={8}
      onPress={() => router.push({ pathname: '/demande', params: { photo: '1', sku } })}
      style={styles.share}
    >
      <Feather name="camera" size={IconSize.large} color={C.text} />
    </Pressable>
  );
}

/**
 * Which car this page is judged against, said before anything else — the
 * maker's mark, the model and engine, and "Changer". Changing happens here:
 * a sheet with the cars in the garage, and the verdict on this page follows
 * the one picked (the page reloads for that engine). A car not yet in the
 * garage still needs the picker, so that one row leaves the page.
 */
function ShoppingFor() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);
  const vehicles = useGarage((s) => s.vehicles);
  const setActive = useGarage((s) => s.setActive);
  const isFull = useGarage((s) => s.isFull);
  const line = useVehicleLine();
  const [open, setOpen] = useState(false);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={active ? `${t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` })}, ${t('home.change')}` : t('look.noVehicleLine')}
        onPress={() => (vehicles.length ? setOpen(true) : router.push('/garage/ajouter'))}
        style={({ pressed }) => [styles.forCar, row, pressed && { backgroundColor: C.surfacePressed }]}
      >
        {active ? (
          <MakeLogo name={active.makeName} slug={active.makeSlug} size={32} lifted={false} />
        ) : (
          <Feather name="help-circle" size={IconSize.large} color={C.textMuted} />
        )}
        <View style={[styles.forCarText, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
          <Text variant="hint">{active ? t('product.shoppingFor') : t('look.noVehicleLine')}</Text>
          {active ? (
            <Text numberOfLines={1} style={[styles.forCarName, { fontFamily: familyFor('bodySemi', rtl) }]}>
              {/* The maker's mark says the make; the model and engine fit the line. */}
              {ltr([active.modelName, line(active)].filter(Boolean).join(' · '))}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.forCarAction, { fontFamily: familyFor('bodySemi', rtl) }]}>{active ? t('home.change') : t('look.choose')}</Text>
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={t('look.myVehiclesTitle')}>
        <ScrollView style={styles.carList}>
          {vehicles.map((v) => {
            const on = v.engineId === active?.engineId;
            return (
              <Pressable
                key={v.engineId}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  if (!on) setActive(v.engineId);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.carRow, row, on && styles.carRowOn, pressed && { backgroundColor: C.surface }]}
              >
                <MakeLogo name={v.makeName} slug={v.makeSlug} size={36} lifted={false} />
                <View style={styles.forCarText}>
                  <Text numberOfLines={1} style={[styles.forCarName, start, { fontFamily: familyFor('bodySemi', rtl) }]}>
                    {ltr(`${v.makeName} ${v.modelName}`)}
                  </Text>
                  <Text variant="hint" numberOfLines={1} style={start}>
                    {line(v)}
                  </Text>
                </View>
                {on ? <Feather name="check-circle" size={IconSize.large} color={C.success} /> : null}
              </Pressable>
            );
          })}
          {!isFull() ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setOpen(false);
                router.push('/garage/ajouter');
              }}
              style={({ pressed }) => [styles.carRow, row, pressed && { backgroundColor: C.surface }]}
            >
              <View style={styles.carAdd}>
                <Feather name="plus" size={IconSize.medium} color={C.onAccent} />
              </View>
              <Text style={[styles.forCarName, styles.forCarText, start, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.bento.add')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </BottomSheet>
    </>
  );
}

/**
 * Send the part's page on the website — to a mechanic, to a brother-in-law
 * who knows cars. The link is the shop's public page, which opens in any
 * browser, not an app link that only works on a phone with the app.
 */
function ShareButton({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('product.share')}
      hitSlop={8}
      onPress={() => Share.share({ message: `${product.name} — ${API_BASE_URL}/produit/${product.slug}` }).catch(() => undefined)}
      style={styles.share}
    >
      <Feather name="share" size={IconSize.large} color={C.text} />
    </Pressable>
  );
}

function ProductSkeleton() {
  return (
    <View style={[styles.column, styles.skeleton]}>
      <Skeleton style={styles.skeletonImage} />
      <Skeleton style={{ height: 14, width: 80, borderRadius: 7 }} />
      <Skeleton style={{ height: 26, width: '85%', borderRadius: 8 }} />
      <Skeleton style={{ height: 48, borderRadius: Radius.card }} />
      <Skeleton style={{ height: 32, width: 140, borderRadius: 8 }} />
    </View>
  );
}

const GALLERY_HEIGHT = 210;
/** The purchase bar's height above the safe area, for the scroll padding under it. */
const BAR_HEIGHT = 76;

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
  // White, as in the reference: the part on the page, not in a grey box.
  gallery: {
    height: GALLERY_HEIGHT,
    marginTop: Spacing.two,
    borderRadius: Radius.card,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  galleryScroll: {
    height: GALLERY_HEIGHT,
    marginTop: Spacing.two,
    borderRadius: Radius.card,
    backgroundColor: C.background,
    overflow: 'hidden',
  },
  galleryDrawing: {
    height: 176,
  },
  counter: {
    textAlign: 'center',
    paddingTop: Spacing.one,
  },
  identity: {
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  name: { fontSize: 21, lineHeight: 27, color: C.text },
  pill: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: Border.thin,
  },
  pressedDim: { opacity: 0.75 },
  note: { paddingTop: Spacing.two },
  // Wraps as a row, never inside the price: "89,000 DT" stays on one line and
  // the saving moves under it when the three do not fit.
  priceRow: { alignItems: 'baseline', flexWrap: 'wrap', columnGap: Spacing.two, rowGap: Spacing.one, paddingTop: Spacing.three },
  price: { fontSize: 26, lineHeight: 32, color: C.text, flexShrink: 0 },
  struck: { textDecorationLine: 'line-through' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  // Reassurance, not a second call to action: no box, muted, below the button.
  facts: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.tile,
  },
  factsPressed: { backgroundColor: C.surface },
  fact: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: Spacing.one },
  factText: { textAlign: 'center' },
  factRule: { width: Border.thin, backgroundColor: C.border },
  refRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  block: {
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  priceBlock: {
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  stock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  sections: {
    marginTop: Spacing.three,
    borderBottomWidth: Border.hairline,
    borderBottomColor: C.border,
  },
  kv: {
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  kvLabel: {
    width: '38%',
  },
  kvValue: {
    flex: 1,
  },
  mono: {
    letterSpacing: 0.4,
  },
  refGroup: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  packRow: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.min,
    borderRadius: Radius.tile,
  },
  pressed: { backgroundColor: C.surface },
  compat: { gap: Spacing.two },
  vehicleRow: {
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.tile,
  },
  vehicleMine: {
    backgroundColor: C.successSurface,
  },
  line: {
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingVertical: 2,
  },
  buyRow: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: C.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  barInner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', alignItems: 'center', gap: Spacing.two, minHeight: Tap.primary },
  addedRow: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  inCart: { alignItems: 'center', gap: 2 },
  zoom: { flex: 1, backgroundColor: 'rgba(3,10,26,0.96)' },
  zoomContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  zoomClose: { position: 'absolute', top: 48, right: 20, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  save: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: C.successSurface },
  saveText: { fontSize: 13, lineHeight: 18, color: C.success },
  together: { gap: Spacing.two, paddingTop: Spacing.four },
  togetherTitle: { fontSize: 18, lineHeight: 24, color: C.text },
  togetherRow: { gap: Spacing.two, paddingBottom: Spacing.two },
  togetherTile: { width: 172 },
  viewCart: { paddingHorizontal: Spacing.three },
  fitBlock: { marginTop: Spacing.three, borderRadius: Radius.tile, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.one },
  fitHead: { alignItems: 'center', gap: Spacing.two, minHeight: 36 },
  fitTitle: { fontSize: 15, lineHeight: 20 },
  // Small links on one line where they fit; the hit slop makes up the 44.
  fitActions: { flexWrap: 'wrap', columnGap: Spacing.three, rowGap: 0 },
  fitLink: { minHeight: 30, justifyContent: 'center' },
  waLink: { alignItems: 'center', gap: 6 },
  underline: { textDecorationLine: 'underline' },
  sheetBody: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  forCar: { alignItems: 'center', gap: Spacing.three, minHeight: 52, paddingHorizontal: Spacing.three, marginTop: Spacing.two, marginBottom: Spacing.two, borderRadius: Radius.tile, backgroundColor: C.surface },
  forCarText: { flex: 1, minWidth: 0 },
  forCarName: { fontSize: 15, lineHeight: 20, color: C.text },
  carList: { maxHeight: 420 },
  carRow: { alignItems: 'center', gap: Spacing.three, minHeight: 60, paddingHorizontal: Spacing.two, borderRadius: Radius.tile },
  carRowOn: { backgroundColor: C.surface },
  carAdd: { width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
  forCarAction: { fontSize: 14, lineHeight: 20, color: C.text, textDecorationLine: 'underline' },
  share: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeleton: {
    gap: Spacing.three,
  },
  skeletonImage: {
    height: GALLERY_HEIGHT,
    marginTop: Spacing.three,
    borderRadius: Radius.card,
  },
});

export { RouteError as ErrorBoundary } from '@/components/ui/route-error';
