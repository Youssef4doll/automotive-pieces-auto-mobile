import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Border, C, Elevation, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * One way into the catalogue, on the home screen.
 *
 * "Que cherchez-vous ?" offers a few routes and lets the customer take the
 * one matching what they already know — their car, or the part's name, or the
 * reference stamped on the old one, or nothing at all. No route is the
 * "correct" one and none is presented as primary.
 *
 * The drawing does most of the work. Somebody who cannot name the part in
 * their hand recognises a camera faster than they read a sentence about not
 * knowing what something is called, and that is exactly the customer this
 * section exists for.
 *
 * Deliberately not a big image card. The reference designs put a photograph
 * in a tile this size and it leaves room for a title and nothing else; an
 * illustration at 40pt leaves room for the title AND the line that explains
 * what the route actually asks for.
 */
export function EntryCard({
  artwork,
  title,
  hint,
  onPress,
}: {
  artwork: React.ReactNode;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const { rtl } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, Elevation.resting, pressed && styles.pressed]}
    >
      <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.art}>{artwork}</View>
        <Feather
          name={rtl ? 'arrow-left' : 'arrow-right'}
          size={IconSize.small}
          color={C.textFaint}
        />
      </View>

      <View style={styles.text}>
        <Text variant="rowTitle" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="hint" numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    // Not a fixed height: "Je ne sais pas comment ça s'appelle" is three
    // lines at 320pt and one at 430, and a fixed card clips it on the phone
    // that needs it most.
    minHeight: 132,
    backgroundColor: C.background,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    padding: Spacing.three,
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pressed: {
    backgroundColor: C.surface,
  },
  head: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: 1,
  },
});
