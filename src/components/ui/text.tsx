import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { C, familyFor, Type, type FontRole } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * Every piece of text in the app.
 *
 * It exists for two reasons, both of which are bugs that happened in the
 * first draft of the picker.
 *
 * The font family has to be chosen per language — Archivo has no Arabic
 * glyphs, so an Arabic heading rendered as a row of boxes. Doing that lookup
 * inside the text component means no screen can forget it.
 *
 * And `writingDirection` has to be stated. React Native infers direction from
 * the string's own characters, so a French model name inside an Arabic screen
 * ("Clio IV" in a right-to-left list) laid itself out left-aligned in a
 * right-aligned row and the punctuation ended up on the wrong side.
 */
export type Variant = 'screenTitle' | 'sectionTitle' | 'rowTitle' | 'body' | 'label' | 'hint';

const ROLE: Record<Variant, FontRole> = {
  screenTitle: 'headingStrong',
  sectionTitle: 'heading',
  rowTitle: 'bodySemi',
  body: 'body',
  label: 'display',
  hint: 'body',
};

const TONE: Record<Variant, string> = {
  screenTitle: C.text,
  sectionTitle: C.text,
  rowTitle: C.text,
  body: C.text,
  label: C.textMuted,
  hint: C.textMuted,
};

type Props = TextProps & {
  variant?: Variant;
  /** Override the colour — for text on navy, or a failure in red. */
  tone?: string;
};

export function Text({ variant = 'body', tone, style, ...rest }: Props) {
  const { rtl } = useI18n();

  const base: TextStyle = {
    ...Type[variant],
    fontFamily: familyFor(ROLE[variant], rtl),
    color: tone ?? TONE[variant],
    writingDirection: rtl ? 'rtl' : 'ltr',
    textAlign: rtl ? 'right' : 'left',
  };

  // Uppercase is applied here rather than to the string, so the same
  // dictionary entry can be shouted in one place and spoken in another — and
  // because `toUpperCase()` on Arabic is a no-op that would have left the
  // Arabic labels looking unstyled beside the French ones.
  if (variant === 'label' && !rtl) base.textTransform = 'uppercase';

  return <RNText {...rest} style={StyleSheet.compose(base, style)} />;
}
