import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Border, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { FIT_LOOK, type FitState } from '@/lib/fit';
import { Text } from './text';

/**
 * Whether this part fits the customer's car — the app's most important signal.
 *
 * The states of `lib/fit` (FITS, LIKELY, UNKNOWN, DOES_NOT_FIT), plus null:
 * no vehicle chosen — we have not been told, which is not the same as not
 * knowing.
 *
 * UNKNOWN is the common case and will stay common until the fitment data
 * lands: most of this catalogue has no rows. A design that treated it as a
 * failure would spend its life apologising. It is phrased as a next step —
 * "à vérifier" — not as a warning.
 *
 * Never colour alone. Every state carries an icon and a sentence, because a
 * customer with a colour vision deficiency has to be able to tell "compatible"
 * from "ne correspond pas" and because a green dot means nothing on its own.
 */
const SURFACE: Record<FitState | 'NONE', { bg: string; border: string }> = {
  FITS: { bg: C.successSurface, border: C.successBorder },
  LIKELY: { bg: C.cautionSurface, border: C.cautionBorder },
  UNKNOWN: { bg: C.surface, border: C.border },
  DOES_NOT_FIT: { bg: C.dangerSurface, border: '#f6d5d9' },
  NONE: { bg: C.surface, border: C.border },
};
const NONE = { icon: 'truck' as const, iconTone: C.textMuted, tone: C.textMuted, label: 'fit.noVehicle' as const };

export function CompatibilityBadge({
  state,
  /** "compact" for a product card, "full" for a product page. */
  size = 'compact',
}: {
  /** From `fitState(product)`; null when no car is chosen. */
  state: FitState | null;
  size?: 'compact' | 'full';
}) {
  const { t, rtl } = useI18n();
  const tone = state ? FIT_LOOK[state] : NONE;
  const surface = SURFACE[state ?? 'NONE'];

  return (
    <View
      // One accessible sentence rather than an icon and a label read
      // separately, which a screen reader announces as two unrelated things.
      accessibilityRole="text"
      accessibilityLabel={t(tone.label)}
      style={[
        styles.badge,
        size === 'full' && styles.full,
        {
          flexDirection: rtl ? 'row-reverse' : 'row',
          // A compact badge hugs its text, so it has to be told which edge it
          // belongs to: pinned to flex-start it sat on the LEFT of an Arabic
          // card, under the quick-add button that correctly moved there.
          ...(size === 'compact' ? { alignSelf: rtl ? ('flex-end' as const) : ('flex-start' as const) } : {}),
          backgroundColor: surface.bg,
          borderColor: surface.border,
        },
      ]}
    >
      <Feather
        name={tone.icon}
        size={size === 'full' ? IconSize.medium : IconSize.small}
        color={tone.iconTone}
      />
      <Text
        variant={size === 'full' ? 'body' : 'hint'}
        tone={tone.tone}
        style={styles.label}
        numberOfLines={2}
      >
        {t(tone.label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
  },
  full: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  label: {
    flexShrink: 1,
  },
});
