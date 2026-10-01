import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Brand, C, Elevation, familyFor, IconSize, Radius, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { AdviceArt } from '@/illustrations/advice-art';
import { Text } from './text';

/**
 * "Besoin d'un conseil ?" — the way out for a customer who cannot name the
 * part: a photo to the shop's inbox (/demande-photo), always there, since it
 * promises nothing but a person looking at it.
 *
 * Drawn like the app's other quiet cards rather than as a banner: a pale
 * surface, the flat navy-and-gold drawing on the leading side, the question,
 * one line of why, and the action as an underlined link with an arrow. The
 * whole card is the button — one target, not a small one inside a big one.
 *
 * `title` lets a screen ask it in its own words ("Vous ne trouvez pas votre
 * pièce ?" at the foot of the catalogue); the rest is the same everywhere.
 */
export function AdviceCard({ title = 'look.advice', onPale = false }: { title?: DictKey; /** On a screen whose background is already the pale surface: draw the card white. */ onPale?: boolean }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(title)} ${t('look.adviceWhy')}`}
      accessibilityHint={t('look.adviceCta')}
      onPress={() => router.push('/demande-photo')}
      testID="advice-card"
      style={({ pressed }) => [styles.card, onPale && styles.white, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
    >
      <AdviceArt size={84} />
      <View style={[styles.body, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.title, align, { fontFamily: familyFor('heading', rtl) }]}>{t(title)}</Text>
        <Text variant="hint" tone={C.textMuted} style={align}>
          {t('look.adviceWhy')}
        </Text>
        <View style={[styles.link, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
          <Feather name="camera" size={IconSize.small} color={C.text} />
          <Text style={[styles.linkText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('look.adviceCta')}</Text>
          <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={IconSize.small} color={C.text} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.surface,
  },
  white: { backgroundColor: Brand.white, ...Elevation.resting },
  pressed: { backgroundColor: C.surfacePressed },
  body: { flex: 1, minWidth: 0, gap: Spacing.one },
  title: { fontSize: 17, lineHeight: 22, color: C.text },
  link: { alignItems: 'center', gap: 6, marginTop: Spacing.one, minHeight: 28 },
  linkText: { fontSize: 15, lineHeight: 20, color: C.text, textDecorationLine: 'underline' },
});
