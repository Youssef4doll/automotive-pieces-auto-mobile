import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { C, Elevation, familyFor, MaxContentWidth, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

/**
 * Accueil.
 *
 * A navy hero with the customer's car set in it large, and a light sheet
 * overlapping the bottom of it carrying the actions. The composition is
 * lifted from the way a good booking app opens — a big image up top, a
 * rounded panel pulled over its lower edge — with one substitution that
 * matters: there is no image.
 *
 * The shop has almost no product photography and no lifestyle photography at
 * all, and putting a stock photograph of somebody else's workshop behind the
 * headline would be inventing the shop's premises the same way a fake stock
 * count invents its shelves. So the hero is navy and the presence comes from
 * type size and the overlap instead. It costs nothing and it is true.
 *
 * Still small on purpose: search, the part families and real best sellers all
 * need endpoints that are not written. This screen says which car the app is
 * answering for, or asks for one, and stops.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();

  const active = useGarage((s) => s.active);
  const hydrated = useGarage((s) => s.hydrated);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* `flexGrow: 1` on the content and `space-between` here is what puts
            the language block against the tab bar instead of leaving half a
            phone of white under it. The screen has one card on it until
            search lands; the alternative was a composition that looked
            unfinished rather than sparse. It still scrolls the moment the
            content outgrows the screen. */}
        <View style={styles.column}>
          {/* The hero runs to the screen edges and under the status bar, so
              its padding carries the inset rather than a SafeAreaView above
              it — an inset applied outside would leave a white band over the
              navy, which is the thing that makes an app look assembled. */}
          <View>
          <View style={[styles.hero, { paddingTop: insets.top + Spacing.five }]}>
            <Text variant="label" tone={C.accent}>
              {hydrated && active ? t('home.yourVehicle') : t('app.name')}
            </Text>

            {hydrated && active ? (
              <>
                <Text variant="hero" tone={C.heroText}>
                  {active.makeName}
                </Text>
                <Text variant="hero" tone={C.heroText}>
                  {active.modelName}
                </Text>
                <View style={[styles.engineChip, { alignSelf: rtl ? 'flex-end' : 'flex-start' }]}>
                  <Feather name="settings" size={13} color={C.heroTextMuted} />
                  <Text variant="hint" tone={C.heroTextMuted}>
                    {active.engineName}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text variant="hero" tone={C.heroText}>
                  {t('home.heroLine1')}
                </Text>
                <Text variant="hero" tone={C.heroTextMuted}>
                  {t('home.heroLine2')}
                </Text>
              </>
            )}
          </View>

          {/* Pulled up over the hero's bottom edge. The negative margin is the
              whole effect — without it these are two stacked blocks. */}
          <View style={[styles.sheet, Elevation.lifted]}>
            {hydrated && active ? (
              <SheetAction
                icon="repeat"
                title={t('garage.changeCar')}
                body={t('home.changeCarWhy')}
                onPress={() => router.push('/garage')}
              />
            ) : hydrated ? (
              <View style={styles.pitch}>
                <Text variant="sectionTitle">{t('home.noVehicle')}</Text>
                <Text variant="body" tone={C.textMuted}>
                  {t('home.noVehicleWhy')}
                </Text>
                <Button
                  label={t('garage.add')}
                  onPress={() => router.push('/garage/ajouter')}
                  style={styles.pitchButton}
                />
              </View>
            ) : null}
          </View>
          </View>

          {/* The language switcher lives here until there is a Compte screen
              to hold it. Each option is labelled in its own language, which
              is the one label a speaker of it can always read. */}
          <View style={styles.langBlock}>
            <Text variant="label">{t('lang.title')}</Text>
            <View style={[styles.langRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
              {locales.map((code) => (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected: code === locale }}
                  onPress={() => setLocale(code)}
                  style={({ pressed }) => [
                    styles.lang,
                    code === locale && styles.langActive,
                    pressed && code !== locale && styles.langPressed,
                  ]}
                >
                  <Text
                    style={{
                      ...Type.body,
                      fontFamily: familyFor('display', rtl),
                      color: code === locale ? C.onAccent : C.text,
                    }}
                  >
                    {localeMeta[code].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {needsRestartForRTL ? (
              <Text variant="hint" style={styles.restart}>
                {t('lang.rtlRestart')}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** A row in the sheet: an icon in a soft square, a title, a line, a chevron. */
function SheetAction({
  icon,
  title,
  body,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  body: string;
  onPress: () => void;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        pressed && styles.actionPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Feather name={icon} size={18} color={C.text} />
      </View>
      <View style={styles.actionText}>
        <Text variant="rowTitle">{title}</Text>
        <Text variant="hint">{body}</Text>
      </View>
      <Feather
        name={rtl ? 'chevron-left' : 'chevron-right'}
        size={20}
        color={C.textFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  hero: {
    // Tall enough to be the screen's subject rather than a band across the
    // top. The home screen has one card on it until search and the families
    // land, and a short hero left two thirds of the phone empty and white,
    // which reads as a screen that failed to finish loading.
    minHeight: 300,
    justifyContent: 'flex-end',
    backgroundColor: C.surfaceBrand,
    borderBottomLeftRadius: Radius.hero,
    borderBottomRightRadius: Radius.hero,
    paddingHorizontal: Spacing.four,
    // The sheet overlaps by 28, so the hero carries that much extra below its
    // last line to keep the text clear of it.
    paddingBottom: Spacing.five + 28,
    gap: Spacing.one,
  },
  engineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.chip,
    backgroundColor: C.heroSurface,
  },
  sheet: {
    marginTop: -28,
    marginHorizontal: Spacing.three,
    backgroundColor: C.background,
    borderRadius: Radius.sheet,
    padding: Spacing.two,
  },
  pitch: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  pitchButton: {
    marginTop: Spacing.two,
  },
  action: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  actionPressed: {
    backgroundColor: C.surface,
  },
  actionIcon: {
    width: Tap.min,
    height: Tap.min,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 1,
  },
  langBlock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.two,
  },
  langRow: {
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  lang: {
    minHeight: Tap.min,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.chip,
    backgroundColor: C.surface,
  },
  langActive: {
    backgroundColor: C.accent,
  },
  langPressed: {
    backgroundColor: C.surfacePressed,
  },
  restart: {
    paddingTop: Spacing.one,
  },
});
