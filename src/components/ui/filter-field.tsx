import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { C, familyFor, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * The box above a long list.
 *
 * It filters what is already on screen; it does not search the shop. That
 * distinction is worth keeping in the name, because a box that looks like the
 * catalogue search but only narrows forty makes teaches a customer that
 * search is broken.
 *
 * Shown only when the list is long enough to need it — see the pickers. Ten
 * makes with a filter box above them wastes the top of the screen and adds a
 * control that does nothing useful.
 */
export function FilterField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const { rtl, t } = useI18n();
  const input = useRef<TextInput>(null);

  return (
    <View style={[styles.wrap, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textMuted}
        // A make or a model is a proper noun with no autocorrect entry, and
        // the keyboard capitalising "clio" into "Clio" while the customer is
        // mid-word is worse than useless when the filter is accent- and
        // case-insensitive anyway.
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        style={[
          styles.input,
          {
            fontFamily: familyFor('body', rtl),
            textAlign: rtl ? 'right' : 'left',
            writingDirection: rtl ? 'rtl' : 'ltr',
          },
        ]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('a11y.clearFilter')}
          onPress={() => {
            onChange('');
            input.current?.focus();
          }}
          style={styles.clear}
        >
          <Text variant="rowTitle" tone={C.textMuted}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Accent- and case-insensitive matching, the way people actually type.
 *
 * "citroen" has to find "Citroën" and "megane" has to find "Mégane": nobody
 * reaches for the diaeresis on a phone keyboard, and the shop's own catalogue
 * search made the same accommodation for the same reason. `NFD` splits the
 * accent off the letter and the range strips it.
 */
export function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    minHeight: Tap.primary,
    marginBottom: Spacing.two,
  },
  input: {
    flex: 1,
    ...Type.body,
    color: C.text,
    paddingVertical: Spacing.two,
  },
  clear: {
    width: Tap.min,
    height: Tap.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
