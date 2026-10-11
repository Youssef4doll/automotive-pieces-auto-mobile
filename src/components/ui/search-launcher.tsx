import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Glass } from './glass';
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
 * A capsule of liquid glass (components/ui/glass), as the tab bar is:
 * `tone="brand"` the bright one over the navy hero, `tone="light"` the frost
 * on a white screen. On iOS 26 the glass itself answers the finger.
 */
export function SearchLauncher({ tone = 'light' }: { tone?: 'brand' | 'light' }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const brand = tone === 'brand';

  return (
    <Glass tone={brand ? 'bright' : 'light'} interactive style={styles.glass}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('search.placeholder')}
        onPress={() => router.push('/recherche')}
        style={({ pressed }) => [styles.box, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
      >
        <Feather name="search" size={IconSize.medium} color={C.text} />
        <Text variant="body" tone={C.textMuted} numberOfLines={1} style={styles.label}>
          {t('search.placeholder')}
        </Text>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  glass: { borderRadius: Radius.pill },
  box: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.primary + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: { backgroundColor: 'rgba(15,35,82,0.06)' },
  label: {
    flex: 1,
  },
});
