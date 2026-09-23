import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Border, Brand, C, familyFor, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/** A search box that reports what was typed once the typing pauses. */
export function SearchBox({ placeholder, onSearch, initial = '' }: { placeholder: string; onSearch: (q: string) => void; initial?: string }) {
  const { rtl } = useI18n();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), 350);
    return () => clearTimeout(id);
  }, [value, onSearch]);

  return (
    <View style={[styles.box, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Feather name="search" size={18} color={C.textMuted} />
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.input, { fontFamily: familyFor('body', rtl), textAlign: rtl ? 'right' : 'left' }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="×" onPress={() => setValue('')} style={styles.clear}>
          <Feather name="x" size={18} color={C.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Brand.white,
    borderRadius: Radius.pill,
    borderWidth: Border.hairline,
    borderColor: C.border,
    paddingHorizontal: Spacing.three,
    minHeight: Tap.primary,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16, color: C.text, paddingVertical: Spacing.two, outlineStyle: 'none' } as never,
  clear: { width: Tap.min, height: Tap.min, alignItems: 'center', justifyContent: 'center', marginEnd: -Spacing.three },
});
