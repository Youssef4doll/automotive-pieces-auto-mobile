import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Empty } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Elevation, Radius, Spacing, Tap } from '@/constants/theme';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';
import { useI18n } from '@/i18n/provider';
import { useGarage, vehicleLabel, type SavedVehicle } from '@/store/garage';

/**
 * Mon garage — the cars this phone knows about.
 *
 * The only screen in the app so far that reads nothing from the network: the
 * garage lives on the device. That is what makes it work in a basement car
 * park, and it is also why it has no loading state and no failure state —
 * only the brief moment before the store has been read back off disk, which
 * `hydrated` covers.
 *
 * The active car is a navy card and the rest are light ones. That reads at a
 * glance from across a workshop, which an accent border alone did not: the
 * first version marked it with a gold outline and a badge, and in a list of
 * three the badge was the only thing separating them.
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

  // Before the store has been read back, `vehicles` is the empty array it was
  // created with — which is indistinguishable from an empty garage. Showing
  // "aucun véhicule enregistré" here and then replacing it with three cars is
  // the app appearing to have forgotten them.
  if (!hydrated) return <Screen edges={['left', 'right']} />;

  const confirmRemove = (vehicle: SavedVehicle) => {
    Alert.alert(t('garage.removeConfirmTitle'), vehicleLabel(vehicle) ?? '', [
      { text: t('a11y.back'), style: 'cancel' },
      { text: t('garage.remove'), style: 'destructive', onPress: () => remove(vehicle.engineId) },
    ]);
  };

  return (
    <Screen edges={['left', 'right']}>
      {vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Empty title={t('garage.empty')} body={t('garage.emptyWhy')} />
          <Button label={t('garage.add')} onPress={() => router.push('/garage/ajouter')} />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(v) => v.engineId}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarSpace }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Gap}
          renderItem={({ item }) => {
            const isActive = active?.engineId === item.engineId;
            return (
              <View
                style={[
                  styles.card,
                  Elevation.resting,
                  isActive ? styles.cardActive : styles.cardIdle,
                ]}
              >
                <View style={[styles.cardHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  <View style={styles.cardText}>
                    <Text
                      variant="sectionTitle"
                      tone={isActive ? C.heroText : C.text}
                      numberOfLines={2}
                    >
                      {item.makeName} {item.modelName}
                    </Text>
                    <View
                      style={[
                        styles.engineLine,
                        { flexDirection: rtl ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <Feather
                        name="settings"
                        size={13}
                        color={isActive ? C.heroTextMuted : C.textMuted}
                      />
                      <Text variant="hint" tone={isActive ? C.heroTextMuted : C.textMuted}>
                        {item.engineName}
                      </Text>
                    </View>
                  </View>

                  {isActive ? (
                    <View style={styles.badge}>
                      <Feather name="check" size={12} color={C.onAccent} />
                      <Text variant="label" tone={C.onAccent}>
                        {t('garage.active')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.actions,
                    { flexDirection: rtl ? 'row-reverse' : 'row' },
                    isActive && styles.actionsOnNavy,
                  ]}
                >
                  {/* "Rendre actif" is offered only where it would do
                      something. A button that is already true is a button the
                      customer taps once to find out it does nothing. */}
                  {!isActive ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setActive(item.engineId)}
                      style={[styles.action, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
                    >
                      <Feather name="check-circle" size={15} color={C.text} />
                      <Text variant="hint" tone={C.text}>
                        {t('garage.setActive')}
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('garage.remove')}
                    onPress={() => confirmRemove(item)}
                    style={[styles.action, { flexDirection: rtl ? 'row-reverse' : 'row' }]}
                  >
                    {/* On the navy card this is white, not red. The shop's
                        red is red-600, which measures 3.4:1 on navy-900 and
                        fails — and there is no lighter red in the brand to
                        reach for, so inventing one here would put a colour on
                        screen that the website has never seen. The trash icon
                        and the confirmation dialog carry the meaning instead,
                        and the label stays readable. */}
                    <Feather
                      name="trash-2"
                      size={15}
                      color={isActive ? C.heroText : C.danger}
                    />
                    <Text variant="hint" tone={isActive ? C.heroText : C.danger}>
                      {t('garage.remove')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              <Button
                label={t('garage.addAnother')}
                variant="secondary"
                onPress={() => router.push('/garage/ajouter')}
              />
              {/* The ceiling is stated where it bites, not in a help page. */}
              {isFull() ? (
                <Text variant="hint" style={styles.footerNote}>
                  {t('garage.full')}
                </Text>
              ) : null}
            </View>
          }
        />
      )}
    </Screen>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  list: {
    paddingTop: Spacing.three,
  },
  gap: {
    height: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardIdle: {
    backgroundColor: C.surface,
  },
  cardActive: {
    backgroundColor: C.surfaceBrand,
  },
  cardHead: {
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardText: {
    flex: 1,
    gap: Spacing.one,
  },
  engineLine: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: C.accent,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  actions: {
    gap: Spacing.four,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingTop: Spacing.two,
  },
  actionsOnNavy: {
    borderTopColor: C.navy700,
  },
  action: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
  },
  footer: {
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  footerNote: {
    textAlign: 'center',
  },
});
