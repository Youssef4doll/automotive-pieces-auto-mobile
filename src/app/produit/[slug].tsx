import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';

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

  const buyable = product.availability !== 'UNAVAILABLE';
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const add = () => {
    if (product.fitment === 'DOES_NOT_FIT') {
      setConfirming(true);
      return;
    }
    addToCart(product, qty);
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
  const fit =
    product.fitment === 'FITS'
      ? { icon: 'check-circle' as const, fg: C.success, bg: C.successSurface, border: C.successBorder, text: t('product.fitsYour', { car: carName }) }
      : product.fitment === 'DOES_NOT_FIT'
        ? { icon: 'x-circle' as const, fg: C.danger, bg: C.dangerSurface, border: '#f6d5d9', text: t('product.notYour', { car: carName }) }
        : product.fitment === 'UNKNOWN'
          ? { icon: 'help-circle' as const, fg: C.caution, bg: C.cautionSurface, border: C.cautionBorder, text: t('fit.unknown') }
          : { icon: 'truck' as const, fg: C.text, bg: C.surface, border: C.border, text: t('product.chooseCar') };

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
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

          {/* The compatibility pill: the verdict against THEIR car, and a way
              to its details — or to choosing a car when there is none. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (product.fitment === null) {
                router.push('/garage/ajouter');
                return;
              }
              setCompatKey((k) => k + 1);
              requestAnimationFrame(() => scroll.current?.scrollTo({ y: compatY.current, animated: true }));
            }}
            style={({ pressed }) => [styles.pill, row, { backgroundColor: fit.bg, borderColor: fit.border }, pressed && styles.pressedDim]}
          >
            <Feather name={fit.icon} size={IconSize.medium} color={fit.fg} />
            <Text variant="hint" tone={fit.fg} numberOfLines={2} style={styles.flex}>
              {fit.text}
            </Text>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.medium} color={fit.fg} />
          </Pressable>
          {product.fitment === 'UNKNOWN' ? (
            <Text variant="hint" style={styles.note}>
              {t('product.unknownNote')}
            </Text>
          ) : null}

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
          <View style={[styles.buyRow, row]}>
            {buyable ? (
              <>
                <QuantityStepper value={qty} onChange={setQty} size="compact" />
                <Button label={t('product.add')} onPress={add} style={styles.flex} />
              </>
            ) : (
              <Button label={t('stock.unavailable')} onPress={() => undefined} disabled style={styles.flex} />
            )}
          </View>

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

      <BottomSheet visible={confirming} onClose={() => setConfirming(false)} title={t('product.mismatchTitle')}>
        <View style={styles.sheetBody}>
          <Text variant="body">{t('product.mismatchBody', { vehicle: vehicleLabel(active) ?? '' })}</Text>
          <Button
            label={t('product.addAnyway')}
            variant="secondary"
            onPress={() => {
              setConfirming(false);
              addToCart(product, qty);
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
        <PartImage slug={product.familySlug} size={170} />
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
      <Feather name={icon} size={IconSize.large} color={C.text} />
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

function Line({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  const { rtl } = useI18n();
  return (
    <View style={[styles.line, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Feather name={icon} size={IconSize.medium} color={C.textMuted} />
      <Text variant="body" style={styles.flex}>
        {text}
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? t('look.favRemove') : t('look.favAdd')}
      accessibilityState={{ selected: on }}
      hitSlop={8}
      onPress={() =>
        toggle({
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          familySlug: product.familySlug,
          imageUrl: product.imageUrl,
        })
      }
      style={styles.share}
    >
      <HeartIcon filled={on} />
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

const GALLERY_HEIGHT = 240;

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
    height: 220,
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
  facts: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
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
