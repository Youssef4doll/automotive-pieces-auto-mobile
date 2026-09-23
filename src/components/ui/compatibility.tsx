import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import type { FitmentVerdict } from '@/api/catalogue';
import { Border, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import type { DictKey } from '@/i18n/dictionaries';
import { Text } from './text';

/**
 * Whether this part fits the customer's car — the app's most important signal.
 *
 * Four states, and they are four genuinely different sentences:
 *
 *   FITS          a fitment row matches the chosen engine
 *   UNKNOWN       the part has no fitment rows at all. NOT "fits everything"
 *   DOES_NOT_FIT  rows exist and none of them match
 *   null          no vehicle chosen — we have not been told, which is not the
 *                 same as not knowing
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
type Tone = {
  icon: React.ComponentProps<typeof Feather>['name'];
  fg: string;
  bg: string;
  border: string;
  label: DictKey;
};

const TONES: Record<'FITS' | 'UNKNOWN' | 'DOES_NOT_FIT' | 'NONE', Tone> = {
  FITS: {
    icon: 'check-circle',
    fg: C.success,
    bg: C.successSurface,
    border: C.successBorder,
    label: 'fit.fits',
  },
  UNKNOWN: {
    icon: 'help-circle',
    fg: C.caution,
    bg: C.cautionSurface,
    border: C.cautionBorder,
    label: 'fit.unknown',
  },
  DOES_NOT_FIT: {
    icon: 'x-circle',
    fg: C.danger,
    bg: C.dangerSurface,
    border: '#f6d5d9',
    label: 'fit.no',
  },
  NONE: {
    icon: 'truck',
    fg: C.textMuted,
    bg: C.surface,
    border: C.border,
    label: 'fit.noVehicle',
  },
};

export function CompatibilityBadge({
  verdict,
  /** "compact" for a product card, "full" for a product page. */
  size = 'compact',
}: {
  verdict: FitmentVerdict | null;
  size?: 'compact' | 'full';
}) {
  const { t, rtl } = useI18n();
  const tone = TONES[verdict ?? 'NONE'];

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
          backgroundColor: tone.bg,
          borderColor: tone.border,
        },
      ]}
    >
      <Feather
        name={tone.icon}
        size={size === 'full' ? IconSize.medium : IconSize.small}
        color={tone.fg}
      />
      <Text
        variant={size === 'full' ? 'body' : 'hint'}
        tone={tone.fg}
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
