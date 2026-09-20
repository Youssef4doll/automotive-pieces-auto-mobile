import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet, SheetAction } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, Elevation, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { CarProfile, EmptyBay } from '@/illustrations/vehicle';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel, type SavedVehicle } from '@/store/garage';

/**
 * Mon garage — the customer's own corner of the app.
 *
 * The first version of this screen was a list with two buttons under every
 * row, and it was a CRUD page for a table called Vehicle. This one is built
 * around the fact that one car matters far more than the others: the active
 * one is what every compatibility badge in the app is measured against, so it
 * gets the picture, the name, the space and the actions, and the rest are a
 * short list underneath that exists to switch between them.
 *
 * The only screen in the app that reads nothing from the network: the garage
 * lives on the device. That is what makes it work in a basement car park, and
 * it is also why it has no loading state and no failure state — only the
 * brief moment before the store has been read back off disk, which
 * `hydrated` covers.
 *
 * ## Where the destructive action went
 *
 * Behind the "…" on each row, in a sheet, with its own confirmation step.
 * Removing a car is not dangerous in any absolute sense — it is three taps to
 * add it back — but it is invisible when it goes wrong: a customer who loses
 * the engine variant they picked three months ago has no way of knowing which
 * of the four "1.6 HDi" entries was theirs. So it does not sit next to
 * anything, and it asks.
 *
 * ## What is not here
 *
 * "Historique des commandes" and "Informations du véhicule", both of which
 * the design calls for. There are no orders in this build — no basket, no
 * checkout, no `GET /api/v1/orders` — and the database holds a make, a model
 * and an engine for a car and nothing else, so a vehicle-information screen
 * would be the three lines already on this one, reprinted. Both are tiles
 * that would open onto a page apologising for itself.
 */
export default function GarageScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();
  const tabBarSpace = useTabBarSpace();

  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);
  const setActive = useGarage((s) => s.setActive);
  const remove = useGarage((s) => s.remove);
  const isFull = useGarage((s) => s.isFull);

  /** The car whose options sheet is open, and whether it is asking to confirm. */
  const [sheet, setSheet] = useState<SavedVehicle | null>(null);
  const [confirming, setConfirming] = useState(false);

  const closeSheet = () => {
    setSheet(null);
    setConfirming(false);
  };

  // Before the store has been read back, `vehicles` is the empty array it was
  // created with — which is indistinguishable from an empty garage. Showing
  // "aucun véhicule enregistré" here and then replacing it with three cars is
  // the app appearing to have forgotten them.
  if (!hydrated) return <Screen edges={['left', 'right']} />;

  if (!active) {
    return (
      <Screen edges={['left', 'right']} style={styles.emptyWrap}>
        <EmptyBay width={200} />
        <Text variant="screenTitle" style={styles.centred}>
          {t('garage.empty')}
        </Text>
        <Text variant="hint" style={styles.centred}>
          {t('garage.emptyWhy')}
        </Text>
        <Button label={t('home.chooseCar')} onPress={() => router.push('/garage/ajouter')} />
      </Screen>
    );
  }

  const others = vehicles.filter((v) => v.engineId !== active.engineId);
  const row = rtl ? ('row-reverse' as const) : ('row' as const);

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The customer's car, as a picture rather than as a row of text.
            This is the identity the rest of the app answers for, and it is
            the one place in the garage that gets to be generous. */}
        <Text variant="label" style={styles.eyebrow}>
          {t('garage.yourCar')}
        </Text>

        {/* `alignItems` is set per-language: this is a column, and a column
            does not mirror under RTL the way `row-reverse` mirrors a row. The
            engine line and the "véhicule principal" badge are both narrower
            than the card, and both sat against the left edge of an otherwise
            right-aligned Arabic screen before this. */}
        <View
          style={[
            styles.hero,
            Elevation.resting,
            { alignItems: rtl ? 'flex-end' : 'flex-start' },
          ]}
        >
          <View style={styles.heroArt}>
            {/* White, not the default navy-50: this card IS navy-50, and a
                body filled with its own background reads as an outline with
                the shape knocked out of it. */}
            <CarProfile width={220} accent={Brand.white} ground />
          </View>
          <Text variant="screenTitle" numberOfLines={2}>
            {active.makeName} {active.modelName}
          </Text>
          <View style={[styles.engineLine, { flexDirection: row }]}>
            <Feather name="settings" size={IconSize.small} color={C.textMuted} />
            <Text variant="hint">{active.engineName}</Text>
          </View>
          <View style={[styles.badge, { flexDirection: row }]}>
            <Feather name="check" size={IconSize.small} color={C.onAccent} />
            <Text variant="label" tone={C.onAccent}>
              {t('garage.primary')}
            </Text>
          </View>
        </View>

        {/* Two actions, both of which do something today. */}
        <View style={styles.section}>
          <SectionHeader title={t('garage.quickActions')} />
          <View style={[styles.bento, { flexDirection: row }]}>
            <ActionTile
              icon="check-circle"
              tint={C.success}
              label={t('home.seeCompatible')}
              onPress={() =>
                router.push({
                  pathname: '/pieces-compatibles',
                  params: { engine: active.engineId },
                })
              }
            />
            <ActionTile
              icon="plus-circle"
              tint={C.text}
              label={t('garage.add')}
              onPress={() => router.push('/garage/ajouter')}
              disabled={isFull()}
              note={isFull() ? t('garage.full') : undefined}
            />
          </View>
        </View>

        {others.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('garage.others')} />
            <View style={styles.others}>
              {others.map((vehicle) => (
                <View key={vehicle.engineId} style={[styles.otherRow, { flexDirection: row }]}>
                  {/* The row itself switches car. It is the only thing anybody
                      comes to this list to do, so it is the whole row rather
                      than a button inside it. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('garage.use')}. ${vehicleLabel(vehicle)}`}
                    onPress={() => setActive(vehicle.engineId)}
                    style={({ pressed }) => [
                      styles.otherMain,
                      { flexDirection: row },
                      pressed && styles.otherPressed,
                    ]}
                  >
                    <CarProfile width={52} />
                    <View style={styles.otherText}>
                      <Text variant="rowTitle" numberOfLines={1}>
                        {vehicle.makeName} {vehicle.modelName}
                      </Text>
                      <Text variant="hint" numberOfLines={1}>
                        {vehicle.engineName}
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('garage.options')}. ${vehicleLabel(vehicle)}`}
                    onPress={() => setSheet(vehicle)}
                    style={({ pressed }) => [styles.more, pressed && styles.otherPressed]}
                  >
                    <Feather name="more-horizontal" size={IconSize.large} color={C.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={sheet !== null}
        onClose={closeSheet}
        title={vehicleLabel(sheet) ?? t('garage.options')}
      >
        {confirming ? (
          <View style={styles.confirm}>
            <Text variant="rowTitle">{t('garage.removeConfirmTitle')}</Text>
            <Text variant="hint">{t('garage.removeConfirmBody')}</Text>
            <View style={[styles.confirmRow, { flexDirection: row }]}>
              <Button
                label={t('garage.cancel')}
                variant="secondary"
                onPress={closeSheet}
                style={styles.confirmButton}
              />
              <Button
                label={t('garage.remove')}
                variant="danger"
                onPress={() => {
                  if (sheet) remove(sheet.engineId);
                  closeSheet();
                }}
                style={styles.confirmButton}
              />
            </View>
          </View>
        ) : (
          <>
            <SheetAction
              icon="check-circle"
              label={t('garage.use')}
              onPress={() => {
                if (sheet) setActive(sheet.engineId);
                closeSheet();
              }}
            />
            {/* Last, separated by a rule, and red. Three signals, because
                colour on its own is not one everybody receives. */}
            <SheetAction
              icon="trash-2"
              tone="danger"
              separated
              label={t('garage.remove')}
              onPress={() => setConfirming(true)}
            />
          </>
        )}
      </BottomSheet>
    </Screen>
  );
}

/** One tile in the quick-actions bento. */
function ActionTile({
  icon,
  label,
  tint,
  onPress,
  disabled = false,
  note,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  tint: string;
  onPress: () => void;
  disabled?: boolean;
  note?: string;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        // Another column that has to be told which way it reads: the icon
        // sat top-left above right-aligned Arabic text.
        { alignItems: rtl ? 'flex-end' : 'flex-start' },
        disabled && styles.tileDisabled,
        pressed && !disabled && styles.tilePressed,
      ]}
    >
      <Feather name={icon} size={IconSize.feature} color={disabled ? C.textFaint : tint} />
      <Text variant="rowTitle" tone={disabled ? C.textFaint : C.text} numberOfLines={2}>
        {label}
      </Text>
      {/* The ceiling is stated where it bites, not in a help page. */}
      {note ? (
        <Text variant="hint" tone={C.textFaint} numberOfLines={3}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  centred: { textAlign: 'center' },

  scroll: { paddingTop: Spacing.three },
  eyebrow: { paddingBottom: Spacing.two },
  hero: {
    backgroundColor: C.surface,
    borderRadius: Radius.sheet,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  heroArt: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  engineLine: { alignItems: 'center', gap: Spacing.two },
  badge: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    backgroundColor: C.accent,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },

  section: { paddingTop: Spacing.five },
  bento: { gap: Spacing.two },
  tile: {
    flex: 1,
    minHeight: 112,
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    justifyContent: 'flex-start',
  },
  tilePressed: { backgroundColor: C.surface },
  tileDisabled: { backgroundColor: C.surface, borderColor: C.surface },

  others: { gap: Spacing.two },
  otherRow: {
    alignItems: 'center',
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    paddingRight: Spacing.one,
    paddingLeft: Spacing.one,
  },
  otherMain: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 68,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.card,
  },
  otherPressed: { backgroundColor: C.surface },
  otherText: { flex: 1, gap: 1 },
  more: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.chip,
  },

  confirm: { gap: Spacing.two, paddingBottom: Spacing.two },
  confirmRow: { gap: Spacing.two, paddingTop: Spacing.two },
  confirmButton: { flex: 1 },
});
