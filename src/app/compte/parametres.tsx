import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { C, familyFor, MaxContentWidth, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';

/** Paramètres — the language, and what version of the app this is. */
export default function SettingsScreen() {
  const { t, locale, setLocale, needsRestartForRTL, rtl } = useI18n();

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
  version: { paddingTop: Spacing.five },
});
