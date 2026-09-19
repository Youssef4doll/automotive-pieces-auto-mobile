import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { C, Radius, Spacing } from '@/constants/theme';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Accueil.
 *
 * Small on purpose. The brief's home screen has a search box, the part
 * families and the real best sellers on it, and none of those three exist in
 * the app yet — the API endpoints behind them are not written and "real best
 * sellers" needs the sales data the shop has but this app cannot yet read.
 * So the home screen currently does the one thing it can do honestly: say
 * which car the app is answering for, or ask for one.
 *
 * It is not padded out with a placeholder search box that does nothing or a
 * "nos meilleures ventes" strip filled with whatever came back first. Those
 * arrive when the endpoints do.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();

  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.body}>
        {hydrated && active ? (
          <View style={styles.card}>
            <Text variant="label">{t('home.yourVehicle')}</Text>
            <Text variant="sectionTitle">
              {active.makeName} {active.modelName}
            </Text>
            <Text variant="body">{active.engineName}</Text>
            <Button
              label={t('garage.changeCar')}
              variant="secondary"
              onPress={() => router.push('/garage')}
              style={styles.cardButton}
            />
          </View>
        ) : hydrated ? (
          <View style={styles.card}>
            <Text variant="sectionTitle">{t('home.noVehicle')}</Text>
            <Text variant="body">{t('home.noVehicleWhy')}</Text>
            <Button
              label={t('garage.add')}
              onPress={() => router.push('/garage/ajouter')}
              style={styles.cardButton}
            />
          </View>
        ) : null}
      </View>

      {/* The language switcher lives here until there is a Compte screen to
          hold it. Three languages and no room for a menu, so they are three
          buttons; each is labelled in its own language, which is the one
          label a speaker of it can always read. */}
      <View style={styles.langBlock}>
        <Text variant="label">{t('lang.title')}</Text>
        <View style={[styles.langRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {locales.map((code) => (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: code === locale }}
              onPress={() => setLocale(code)}
              style={[styles.lang, code === locale && styles.langActive]}
            >
              <Text variant="body" tone={code === locale ? C.onAccent : C.text}>
                {localeMeta[code].label}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* Only shown when the native layout direction genuinely disagrees
            with the chosen language — see the note in the i18n provider. */}
        {needsRestartForRTL ? (
          <Text variant="hint" style={styles.restart}>
            {t('lang.rtlRestart')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    // Top, not centred. Vertically centring one card left a third of the
    // screen empty above it, which reads as a screen that failed to load
    // rather than one with little to say — and this screen will grow
    // downwards as search and the families land.
    paddingTop: Spacing.four,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardButton: {
    marginTop: Spacing.two,
  },
  langBlock: {
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  langRow: {
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  lang: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
  },
  langActive: {
    backgroundColor: C.accent,
  },
  restart: {
    paddingTop: Spacing.one,
  },
});
