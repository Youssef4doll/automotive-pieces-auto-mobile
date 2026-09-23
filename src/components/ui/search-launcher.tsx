import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Border, Brand, C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * The search box where a customer starts — on the home hero and at the top
 * of the catalogue.
 *
 * It looks like a field and it is a button: tapping it opens the search
 * screen with a real input already focused and the keyboard up. A live
 * input here would have to share the home screen with the keyboard, and on
 * a 320pt phone the keyboard would cover everything the customer typed for.
 *
 * `tone="brand"` is the white pill on the navy hero; `tone="light"` is the
 * surface pill on a white screen.
 */
export function SearchLauncher({ tone = 'light' }: { tone?: 'brand' | 'light' }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const brand = tone === 'brand';

  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={t('search.placeholder')}
      onPress={() => router.push('/recherche')}
      style={({ pressed }) => [
        styles.box,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        brand ? styles.brand : styles.light,
        pressed && (brand ? styles.brandPressed : styles.lightPressed),
      ]}
    >
      <Feather name="search" size={IconSize.medium} color={C.textMuted} />
      <Text variant="body" tone={C.textMuted} numberOfLines={1} style={styles.label}>
        {t('search.placeholder')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  brand: {
    backgroundColor: Brand.white,
  },
  brandPressed: {
    backgroundColor: C.surface,
  },
  light: {
    backgroundColor: C.surface,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  lightPressed: {
    backgroundColor: C.surfacePressed,
  },
  label: {
    flex: 1,
  },
});
