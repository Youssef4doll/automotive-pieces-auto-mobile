import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Empty } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Radius, Spacing, Tap } from '@/constants/theme';
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
 */
export default function GarageScreen() {
  const router = useRouter();
  const { t, rtl } = useI18n();

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
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isActive = active?.engineId === item.engineId;
            return (
              <View style={[styles.card, isActive && styles.cardActive]}>
                <View style={[styles.cardHead, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  <View style={styles.cardText}>
                    <Text variant="rowTitle">
                      {item.makeName} {item.modelName}
                    </Text>
                    <Text variant="hint">{item.engineName}</Text>
                  </View>
                  {isActive ? (
                    <View style={styles.badge}>
                      <Text variant="label" tone={C.onAccent}>
                        {t('garage.active')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.actions, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
                  {/* "Rendre actif" is offered only where it would do
                      something. A button that is already true is a button the
                      customer taps once to find out it does nothing. */}
                  {!isActive ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setActive(item.engineId)}
                      style={styles.action}
                    >
                      <Text variant="hint" tone={C.text}>
                        {t('garage.setActive')}
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('garage.remove')}
                    onPress={() => confirmRemove(item)}
                    style={styles.action}
                  >
                    <Text variant="hint" tone={C.danger}>
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

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  list: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: C.accent,
  },
  cardHead: {
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cardText: {
    flex: 1,
    gap: 1,
  },
  badge: {
    backgroundColor: C.accent,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  actions: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  action: {
    minHeight: Tap.compact,
    justifyContent: 'center',
  },
  footer: {
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  footerNote: {
    textAlign: 'center',
  },
});
