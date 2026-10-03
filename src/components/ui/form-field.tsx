import { forwardRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Border, C, familyFor, Radius, Spacing, Tap, Type } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A labelled input with room for the one thing that is wrong with it.
 *
 * The label sits above the box, always — never a placeholder standing in
 * for a label, which vanishes the moment the customer starts typing and
 * leaves them looking at "22 334 455" with no idea which box it is in.
 *
 * The error replaces the hint rather than stacking under it, and the border
 * goes red with it; the words are what carry the meaning.
 *
 * Focus is the app's own navy border, not the browser's outline — which in
 * the web build drew a gold ring the shop's palette reserves for buttons.
 */
export const FormField = forwardRef<
  TextInput,
  TextInputProps & {
    label: string;
    hint?: string | null;
    error?: string | null;
    /** Right-aligned counter such as "0/17", for fixed-length input. */
    counter?: string | null;
    /** Keep numbers and references left-to-right even in Arabic. */
    ltr?: boolean;
    /** Fixed text before the value, such as "+216" — shown, never typed or sent. */
    prefix?: string;
  }
>(function FormField({ label, hint, error, counter, ltr = false, prefix, style, ...input }, ref) {
  const { rtl } = useI18n();
  const [focused, setFocused] = useState(false);
  const direction = ltr ? 'ltr' : rtl ? 'rtl' : 'ltr';

  return (
    <View style={styles.field}>
      <View style={[styles.labelRow, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <Text variant="hint" tone={C.text} style={styles.label}>
          {label}
        </Text>
        {counter ? (
          <Text variant="hint" tone={C.textMuted}>
            {counter}
          </Text>
        ) : null}
      </View>
      <View style={prefix ? [styles.prefixed, focused && styles.inputFocused, error ? styles.inputError : null] : undefined}>
      {prefix ? (
        <Text style={[styles.prefix, { fontFamily: familyFor('bodySemi', false) }]} accessibilityElementsHidden importantForAccessibility="no">
          {/* Isolated left-to-right: in Arabic "+216" otherwise reads "216+". */}
          {`\u2066${prefix}\u2069`}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={C.textFaint}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint ?? undefined}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            fontFamily: familyFor('body', rtl && !ltr),
            writingDirection: direction,
            textAlign: direction === 'rtl' ? 'right' : 'left',
          },
          input.multiline && styles.multiline,
          !prefix && focused && styles.inputFocused,
          !prefix && error ? styles.inputError : null,
          prefix ? styles.inputBare : null,
          style,
        ]}
      />
      </View>
      {error ? (
        <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="hint">{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  labelRow: {
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  label: {
    flexShrink: 1,
  },
  input: {
    minHeight: Tap.primary,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: C.text,
    ...Type.body,
    fontSize: 16, // 16 or more, or iOS Safari zooms the page on focus in the web build
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  inputFocused: {
    borderColor: C.text,
    borderWidth: Border.selected,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: C.danger,
  },
  prefixed: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Tap.primary,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    paddingStart: Spacing.three,
  },
  prefix: { fontSize: 16, color: C.textMuted, paddingEnd: Spacing.two, borderEndWidth: Border.thin, borderEndColor: C.border },
  inputBare: { flex: 1, borderWidth: 0, minHeight: Tap.primary - 2 },
});
