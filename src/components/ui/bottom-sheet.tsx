import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

/**
 * A sheet from the bottom of the screen, for a short list of choices.
 *
 * It exists because of one rule: a destructive action never sits beside the
 * action it could be mistaken for. "Retirer ce véhicule" next to "Voir les
 * pièces compatibles" is two taps apart on a phone held one-handed on a bus,
 * and the cost of the wrong one is a customer's saved car. So the garage's
 * per-vehicle actions live behind a single "…" and open here, at the bottom
 * of the screen where the thumb already is.
 *
 * Built on React Native's own `Modal` rather than a gesture library. It is
 * the platform's modal — it traps focus, it closes on the Android back
 * button, it announces itself to VoiceOver and TalkBack, and it costs no
 * dependency. What it does not give is a drag-to-dismiss handle; the grabber
 * drawn at the top is therefore a visual affordance for "this is a sheet",
 * and the backdrop and the close button are the two real ways out. Drawing a
 * grabber that cannot be dragged is a small lie, so it is deliberately a
 * short, low-contrast bar rather than the prominent pill that reads as
 * "pull me".
 *
 * `animationType` follows the system's Reduce Motion setting. A sheet that
 * slides is the clearest possible statement of where it came from and where
 * it will go, and for somebody who has asked their phone to stop moving
 * things it is exactly what they asked it not to do.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { t, rtl } = useI18n();
  const flat = useReduceMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={flat ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* The backdrop is a button, not decoration: tapping outside is how
          most people close a sheet, and a screen reader needs to be told
          that is available. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('garage.cancel')}
        onPress={onClose}
        style={styles.backdrop}
      />

      <View style={styles.dock} pointerEvents="box-none">
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}
        >
          <View style={styles.grabber} />

          <View style={[styles.head, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
            <Text variant="rowTitle" style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('garage.cancel')}
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
            >
              <Feather name="x" size={IconSize.large} color={C.text} />
            </Pressable>
          </View>

          {children}
        </View>
      </View>
    </Modal>
  );
}

/**
 * One choice in a sheet.
 *
 * `tone="danger"` is red text and a red icon, and it is always the last row
 * with a rule above it — separated rather than merely coloured, because
 * colour alone is not a signal a red-green colourblind customer receives.
 */
export function SheetAction({
  icon,
  label,
  onPress,
  tone = 'default',
  separated = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
  separated?: boolean;
}) {
  const { rtl } = useI18n();
  const colour = tone === 'danger' ? C.danger : C.text;

  return (
    <View>
      {/* The rule is its own element rather than a border on the row. The row
          is rounded so that its pressed state is a pill, and a 1px top border
          on a rounded box follows the corners round — which looked like the
          top of a card had been drawn above the delete action rather than a
          separator between two choices. */}
      {separated ? <View style={styles.rule} /> : null}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          { flexDirection: rtl ? 'row-reverse' : 'row' },
          pressed && styles.actionPressed,
        ]}
      >
        <Feather name={icon} size={IconSize.large} color={colour} />
        <Text variant="body" tone={colour} style={styles.actionLabel} numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Navy rather than black: the shop's own dark, so the sheet reads as part
    // of the app rather than as an OS dialog dropped on top of it.
    backgroundColor: 'rgba(8, 22, 51, 0.45)',
  },
  dock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: C.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: { flex: 1 },
  close: {
    width: Tap.min,
    height: Tap.min,
    borderRadius: Radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { backgroundColor: C.surface },
  action: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.tile,
  },
  rule: {
    height: Border.thin,
    backgroundColor: C.border,
    marginVertical: Spacing.two,
    marginHorizontal: Spacing.two,
  },
  actionPressed: { backgroundColor: C.surface },
  actionLabel: { flex: 1 },
});
