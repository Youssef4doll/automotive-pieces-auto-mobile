import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Border, C, Elevation, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { CarProfile, EmptyBay } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';
import { Button } from './button';
import { Skeleton } from './skeleton';
import { Text } from './text';

/**
 * The car the rest of the app is answering for.
 *
 * This is the single most important object on the home screen, because every
 * other thing on it means something different depending on what is in here.
 * "Plaquettes de frein" is a category when the app does not know the car and
 * a shortlist when it does; a price is a price either way but a compatibility
 * badge is either a verdict or a shrug.
 *
 * So it is a card, it sits above everything it changes, and it carries its
 * own two actions rather than making the customer go and find them:
 *
 *   Changer — the garage, for a second car or a correction.
 *   Voir les pièces compatibles — the shop's confirmed list for this engine.
 *
 * Two, not five. The reference designs that put six chips on a context card
 * turn the most-glanced-at object on the screen into a menu, and the customer
 * ends up reading it every time instead of seeing it.
 *
 * ## The three states are genuinely three
 *
 * Not loaded yet, no car, and a car. The middle one is a pitch and the last
 * one is a fact, and the first one must not look like either — a garage that
 * shows "aucun véhicule" for two frames and then the customer's BMW is an app
 * that appears to forget things, which is the one impression a garage cannot
 * afford. `hydrated` is what keeps them apart.
 */
export function VehicleContextCard() {
  const router = useRouter();
  const { t, rtl } = useI18n();

  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);
  const count = useGarage((s) => s.vehicles.length);

  if (!hydrated) {
    return (
      <View style={[styles.card, Elevation.lifted, styles.pad]}>
        <Skeleton style={{ width: 96, height: 11 }} />
        <Skeleton style={{ width: '70%', height: 18 }} />
        <Skeleton style={{ width: '45%', height: 13 }} />
      </View>
    );
  }

  if (!active) {
    return (
      <View style={[styles.card, Elevation.lifted, styles.pad]}>
        {/* Compact on purpose. This card's whole job is to get one tap, and
            the arc directly below it offers the same route as its first
            option — so a tall illustrated pitch here would be the screen
            asking the same question twice, in its two largest voices. The
            bay is drawn small; the generous version of it belongs on the
            garage's own empty state, where there is nothing else to say. */}
        <View style={[styles.bay, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <EmptyBay width={84} />
          <View style={styles.bayText}>
            <Text variant="rowTitle" numberOfLines={2}>
              {t('home.noVehicle')}
            </Text>
          </View>
        </View>
        <Text variant="hint">{t('home.noVehicleWhy')}</Text>
        <Button
          label={t('home.chooseCar')}
          onPress={() => router.push('/garage/ajouter')}
          style={styles.cta}
        />
      </View>
    );
  }

  const row = rtl ? ('row-reverse' as const) : ('row' as const);

  return (
    <View style={[styles.card, Elevation.lifted]}>
      <View style={[styles.head, { flexDirection: row }]}>
        <Text variant="label" tone={C.textMuted}>
          {t('home.yourVehicle')}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('garage.changeCar')}
          onPress={() => router.push('/garage')}
          style={({ pressed }) => [
            styles.change,
            { flexDirection: row },
            pressed && styles.changePressed,
          ]}
        >
          <Text variant="hint" tone={C.text}>
            {t('home.change')}
          </Text>
          <Feather
            name={rtl ? 'chevron-left' : 'chevron-right'}
            size={IconSize.small}
            color={C.text}
          />
        </Pressable>
      </View>

      <View style={[styles.body, { flexDirection: row }]}>
        <CarProfile width={76} ground />
        <View style={styles.names}>
          <Text variant="rowTitle" numberOfLines={2}>
            {active.makeName} {active.modelName}
          </Text>
          <Text variant="hint" numberOfLines={1}>
            {active.engineName}
          </Text>
          {/* Stated only when it is true of more than one car. With a single
              vehicle "1 véhicule" is a count nobody asked for. */}
          {count > 1 ? (
            <Text variant="hint" tone={C.textFaint} numberOfLines={1}>
              {t('garage.count', { n: count })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* The card's own primary action, on its own row under a rule. It is
          the one thing a customer with a saved car most often wants, and
          putting it here means it is one tap from the top of the app. */}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/pieces-compatibles',
            params: { engine: active.engineId },
          })
        }
        style={({ pressed }) => [
          styles.action,
          { flexDirection: row },
          pressed && styles.actionPressed,
        ]}
      >
        <Feather name="check-circle" size={IconSize.medium} color={C.success} />
        {/* Two lines, not one. At 320pt the row has about 236pt for the
            label and "Voir les pièces compatibles" wants 240, so a single
            line shipped as "Voir les pièces compatibl…" — an ellipsis in the
            middle of the card's only call to action. It wraps on the iPhone
            SE and stays on one line everywhere else. */}
        <Text variant="rowTitle" style={styles.actionLabel} numberOfLines={2}>
          {t('home.seeCompatible')}
        </Text>
        <Feather
          name={rtl ? 'arrow-left' : 'arrow-right'}
          size={IconSize.medium}
          color={C.textFaint}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.background,
    borderRadius: Radius.sheet,
    borderWidth: Border.thin,
    borderColor: C.border,
    overflow: 'hidden',
  },
  pad: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bay: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  bayText: { flex: 1 },
  cta: {
    marginTop: Spacing.two,
  },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  change: {
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: Tap.min,
    paddingHorizontal: Spacing.two,
    marginHorizontal: -Spacing.two,
    borderRadius: Radius.chip,
  },
  changePressed: { backgroundColor: C.surface },
  body: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  names: { flex: 1, gap: 1 },
  action: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: Border.thin,
    borderTopColor: C.border,
    backgroundColor: C.surface,
  },
  actionPressed: { backgroundColor: C.surfacePressed },
  actionLabel: { flex: 1 },
});
