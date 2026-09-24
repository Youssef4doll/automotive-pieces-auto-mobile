import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productApi, type ProductDetail } from '@/api/product';
import type { ShopSettings } from '@/api/shop';
import { Accordion } from '@/components/ui/accordion';
import { BottomSheet } from '@/components/ui/bottom-sheet';
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
import { formatDT, yearSpan } from '@/lib/format';
import { useI18n } from '@/i18n/provider';
import { HeartIcon } from '@/illustrations/heart';
import { useFavourites } from '@/store/favourites';
import { useGarage, vehicleLabel } from '@/store/garage';
import { track } from '@/services/analytics';

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
  useEffect(() => {
    if (!viewed) return;
    track('product_viewed', { productId: viewed.id, slug: viewed.slug, brand: viewed.brand, price: viewed.price, family: viewed.familySlug });
    if (engineId) track('compatibility_checked', { productId: viewed.id, engineId, verdict: viewed.fitment });
  }, [viewed, engineId]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () =>
            product.status === 'loaded' ? (
              <View style={styles.headerActions}>
                <HeartButton product={product.data} />
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
  const { t, rtl } = useI18n();
  const router = useRouter();
  const addToCart = useAddToCart();
  const active = useGarage((s) => s.active);
  const [qty, setQty] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [compatKey, setCompatKey] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const compatY = useRef(0);
  const insets = useSafeAreaInsets();

  // The purchase bar is pinned to the foot of the screen, always within
  // reach. After an add it says so itself — "Ajouté au panier · Voir le
  // panier" — for a few seconds, instead of a toast floating over the part.
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (addedTimer.current) clearTimeout(addedTimer.current);
  }, []);
  const commit = () => {
    if (!addToCart(product, qty, { silent: true })) return;
    setJustAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setJustAdded(false), 2800);
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
  const engineLine = active ? `${active.engineName}` : '';
  // Incompatible is a neutral panel with a red mark, not a red alarm: the
  // part is fine, it is just not listed for this car — and here is why.
  const fit =
    product.fitment === 'FITS'
      ? { icon: 'check-circle' as const, fg: C.success, titleTone: C.success, bg: C.successSurface, text: t('product.fitsYour', { car: carName }), why: engineLine || null }
      : product.fitment === 'DOES_NOT_FIT'
        ? {
            icon: 'x-circle' as const,
            fg: C.danger,
            titleTone: C.text,
            bg: C.surface,
            text: t('product.notYour', { car: carName }),
            why: product.compatibility.total > 0 ? t('look.whyNot', { n: product.compatibility.total, car: carName }) : t('look.whyNotNone'),
          }
        : product.fitment === 'UNKNOWN'
          ? { icon: 'help-circle' as const, fg: C.caution, titleTone: C.text, bg: C.cautionSurface, text: t('fit.unknown'), why: `${t('look.unknownWhy', { car: carName })} ${t('product.unknownNote')}` }
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
          label: product.lowStockQty !== null ? t('stock.low', { n: product.lowStockQty }) : t('stock.inStock'),
          detail: null,
        }
      : product.availability === 'ON_ORDER'
        ? {
            icon: 'clock' as const,
            tone: C.caution,
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
      >
        <View style={styles.column}>
          <Gallery product={product} />

          {/* Brand in the shop's red, then the name — the reference's order. */}
          <View style={styles.identity}>
            {product.brand ? (
              <Text style={[styles.brand, { fontFamily: familyFor('headingStrong', rtl) }]}>{product.brand.toUpperCase()}</Text>
            ) : null}
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

          {/* The verdict against THEIR car — the strongest thing on the
              page after the part itself. Never an error screen: when it does
              not fit, it says why, from the shop's own table, and what to do. */}
          <View style={[styles.fitBlock, { backgroundColor: fit.bg }]}>
            <View style={[row, styles.fitHead]}>
              <Feather name={fit.icon} size={22} color={fit.fg} />
              <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 2 }]}>
                <Text style={[styles.fitTitle, { fontFamily: familyFor('bodySemi', rtl), color: fit.titleTone, textAlign: rtl ? 'right' : 'left' }]}>{fit.text}</Text>
                {fit.why ? (
                  <Text variant="hint" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {fit.why}
                  </Text>
                ) : null}
              </View>
            </View>
            {product.fitment === null ? (
              <Button label={t('look.changeVehicle')} icon="plus" variant="secondary" onPress={() => router.push('/garage/ajouter')} />
            ) : (
              <View style={[row, styles.fitActions]}>
                {product.compatibility.total > 0 ? (
                  <Pressable accessibilityRole="button" onPress={openCompat} hitSlop={6} style={styles.fitLink}>
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('look.seeFits')}
                    </Text>
                  </Pressable>
                ) : null}
                {product.fitment === 'DOES_NOT_FIT' ? (
                  <Pressable accessibilityRole="button" onPress={() => router.push('/garage/ajouter')} hitSlop={6} style={styles.fitLink}>
                    <Text variant="hint" tone={C.text} style={styles.underline}>
                      {t('look.changeVehicle')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>

          <View style={[styles.priceRow, row]}>
            <Text style={[styles.price, { fontFamily: familyFor('headingStrong', rtl) }]}>{formatDT(product.price)}</Text>
            {product.compareAtPrice !== null && product.compareAtPrice > product.price ? (
              <Text variant="hint" tone={C.textFaint} style={styles.struck}>
                {formatDT(product.compareAtPrice)}
              </Text>
            ) : null}
          </View>
          <View style={[styles.stock, row]}>
            <View style={[styles.dot, { backgroundColor: stock.tone }]} />
            <Text variant="hint" tone={stock.tone}>
              {stock.label}
            </Text>
            {buyable && settings?.delivery.grandTunis ? (
              <Text variant="hint">{`·  ${t('product.shipIn', { t: settings.delivery.grandTunis })}`}</Text>
            ) : null}
          </View>
          {stock.detail ? <Text variant="hint">{stock.detail}</Text> : null}

          {/* Quantity and the button, side by side, as in the reference. */}
          {/* Three facts, each the shop's own: its delay, its warranty, its
              return window. */}
          {settings ? (
            <View style={[styles.facts, row]}>
              <Fact icon="truck" title={t('product.deliveryShort')} value={settings.delivery.grandTunis ?? settings.delivery.regions ?? t('product.cod')} />
              <View style={styles.factRule} />
              <Fact icon="shield" title={t('product.warrantyShort')} value={t('product.months', { n: settings.warrantyMonths })} />
              <View style={styles.factRule} />
              <Fact icon="rotate-ccw" title={t('product.returnShort')} value={t('product.days', { n: settings.returnDays })} />
            </View>
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
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={[styles.barInner, row]}>
          {!buyable ? (
            <Button label={t('stock.unavailable')} onPress={() => undefined} disabled style={styles.flex} />
          ) : justAdded ? (
            <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)} style={[styles.flex, row, styles.addedRow]}>
              <View style={[row, styles.addedLabel]}>
                <View style={styles.addedTick}>
                  <Feather name="check" size={16} color={Brand.white} />
                </View>
                <Text accessibilityLiveRegion="polite" style={[styles.addedText, { fontFamily: familyFor('bodySemi', rtl) }]} numberOfLines={1}>
                  {t('look.added')}
                </Text>
              </View>
              <Button label={t('look.viewCart')} variant="secondary" onPress={() => router.navigate('/panier')} style={styles.viewCart} />
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
          <Text variant="body">{t('product.mismatchBody', { vehicle: vehicleLabel(active) ?? '' })}</Text>
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
        style={[styles.gallery, { width: slide }]}
      >
        {product.gallery.map((src) => (
          <Image
            key={src}
            source={{ uri: `${API_BASE_URL}${src}` }}
            style={{ width: slide, height: GALLERY_HEIGHT }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={product.name}
          />
        ))}
      </ScrollView>
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
            <Feather name={mine ? 'check-circle' : 'circle'} size={IconSize.small} color={mine ? C.success : C.textFaint} />
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

/** Keep this part on the phone — identity only, never its price (see store/favourites). */
function HeartButton({ product }: { product: ProductDetail }) {
  const { t } = useI18n();
  const on = useFavourites((s) => s.items.some((f) => f.slug === product.slug));
  const toggle = useFavourites((s) => s.toggle);
  // A small pop when a part is kept — felt, not watched. Nothing on removal.
  const scale = useSharedValue(1);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? t('look.favRemove') : t('look.favAdd')}
      accessibilityState={{ selected: on }}
      hitSlop={8}
      onPress={() => {
        const nowOn = toggle({
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          familySlug: product.familySlug,
          imageUrl: product.imageUrl,
        });
        if (nowOn) {
          scale.set(
            withSequence(
              withSpring(1.28, { damping: 8, stiffness: 420, reduceMotion: ReduceMotion.System }),
              withSpring(1, { damping: 14, stiffness: 260, reduceMotion: ReduceMotion.System }),
            ),
          );
        }
      }}
      style={styles.share}
    >
      <Animated.View style={pop}>
        <HeartIcon filled={on} />
      </Animated.View>
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
  brand: { fontSize: 15, lineHeight: 20, letterSpacing: 0.6, color: Brand.red600 },
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
  priceRow: { alignItems: 'baseline', gap: Spacing.two, paddingTop: Spacing.three },
  price: { fontSize: 28, lineHeight: 34, color: C.text },
  struck: { textDecorationLine: 'line-through' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  // Reassurance, not a second call to action: no box, muted, below the button.
  facts: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
  },
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
  addedLabel: { alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  addedTick: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center' },
  addedText: { fontSize: 15, color: C.text, flexShrink: 1 },
  viewCart: { paddingHorizontal: Spacing.three },
  fitBlock: { marginTop: Spacing.three, borderRadius: Radius.tile, padding: Spacing.three, gap: Spacing.two },
  fitHead: { alignItems: 'flex-start', gap: Spacing.three },
  fitTitle: { fontSize: 16, lineHeight: 21 },
  fitActions: { flexWrap: 'wrap', gap: Spacing.three },
  fitLink: { minHeight: Tap.min, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  sheetBody: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
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
