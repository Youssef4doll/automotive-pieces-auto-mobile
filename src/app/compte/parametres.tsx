import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { C, familyFor, MaxContentWidth, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';

/** Paramètres — the language, the staff door, and what version of the app this is. */
export default function SettingsScreen() {
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();
  const router = useRouter();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('account.settings') }} />
      <View style={styles.column}>
        <Text variant="label">{t('lang.title')}</Text>
        <View style={[styles.langRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          {locales.map((code) => (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: code === locale }}
              onPress={() => setLocale(code)}
              style={({ pressed }) => [styles.lang, code === locale && styles.langActive, pressed && code !== locale && styles.langPressed]}
            >
              <Text style={{ ...Type.hint, fontFamily: familyFor('display', rtl), color: code === locale ? C.onAccent : C.text }}>
                {localeMeta[code].label}
              </Text>
            </Pressable>
          ))}
        </View>
        {needsRestartForRTL ? <Text variant="hint">{t('lang.rtlRestart')}</Text> : null}
        {/* The staff door: here, quiet, rather than in the customer's menu.
            Behind it is a real sign-in checked by the shop on every request. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('staff.entry')}
          onPress={() => router.push('/gestion')}
          style={({ pressed }) => [styles.staff, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.langPressed]}
        >
          <Feather name="briefcase" size={18} color={C.textMuted} />
          <Text variant="hint" tone={C.text} style={styles.flex}>
            {t('staff.entry')}
          </Text>
          <Text variant="hint">{t('staff.entryHint')}</Text>
        </Pressable>
        <Text variant="hint" tone={C.textFaint} style={styles.version}>
          {`${t('app.name')} · ${Constants.expoConfig?.version ?? ''}`}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  langRow: { gap: Spacing.two, flexWrap: 'wrap' },
  lang: { minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: Spacing.three, borderRadius: Radius.chip, backgroundColor: C.surface },
  langActive: { backgroundColor: C.accent },
  langPressed: { backgroundColor: C.surfacePressed },
  version: { paddingTop: Spacing.two },
  flex: { flex: 1 },
  staff: { alignItems: 'center', gap: Spacing.two, minHeight: Tap.min, marginTop: Spacing.five, paddingHorizontal: Spacing.three, borderRadius: Radius.tile, borderWidth: 1, borderColor: C.border },
});
