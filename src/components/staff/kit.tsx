import { Feather } from '@expo/vector-icons';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View, type ViewStyle } from 'react-native';

import type { OrderStatus } from '@/api/staff';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * The small parts the staff screens share. They follow the shopper side's
 * rules — mirrored rows under Arabic, 44pt floors, words carrying the
 * meaning and colour only repeating it — in a plainer register: this is a
 * counter tool, used standing up, not a shop window.
 */

const STATUS_TONE: Record<OrderStatus, { bg: string; fg: string }> = {
  PENDING: { bg: C.cautionSurface, fg: '#92400e' },
  CONFIRMED: { bg: Brand.navy50, fg: Brand.navy700 },
  PREPARED: { bg: Brand.navy50, fg: Brand.navy700 },
  SHIPPED: { bg: Brand.navy50, fg: Brand.navy700 },
  DELIVERED: { bg: C.successSurface, fg: C.success },
  CANCELLED: { bg: C.dangerSurface, fg: C.danger },
};

export function StatusPill({ status }: { status: OrderStatus }) {
  const { t, rtl } = useI18n();
  const tone = STATUS_TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 12, lineHeight: 16, color: tone.fg }}>
        {t(`status.${status}`)}
      </Text>
    </View>
  );
}

/** A small tag: "À commander", "Hors ligne". */
export function Tag({ label, tone = 'caution' }: { label: string; tone?: 'caution' | 'danger' | 'muted' }) {
  const { rtl } = useI18n();
  const colours =
    tone === 'danger'
      ? { bg: C.dangerSurface, fg: C.danger }
      : tone === 'muted'
        ? { bg: C.surface, fg: C.textMuted }
        : { bg: C.cautionSurface, fg: '#92400e' };
  return (
    <View style={[styles.pill, { backgroundColor: colours.bg }]}>
      <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 12, lineHeight: 16, color: colours.fg }}>{label}</Text>
    </View>
  );
}

/** One-of-n filter as a scrolling row of chips. */
export function FilterChips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const { rtl } = useI18n();
  const ordered = rtl ? [...options].reverse() : options;
  const scroller = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      // Reversed under Arabic, the first choice is at the far end of the
      // row; start the row there, or "Toutes" opens off-screen.
      onContentSizeChange={() => {
        if (rtl) scroller.current?.scrollToEnd({ animated: false });
      }}
    >
      {ordered.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && !on && styles.chipPressed]}
          >
            <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 14, color: on ? Brand.white : C.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A white card with a hairline, the unit every staff screen is built from. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Label on one side, value on the other, mirrored under Arabic. */
export function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { rtl } = useI18n();
  return (
    <View style={[styles.line, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <Text variant={strong ? 'rowTitle' : 'body'} tone={strong ? C.text : C.textMuted} style={styles.flex}>
        {label}
      </Text>
      <Text variant={strong ? 'rowTitle' : 'body'} tone={C.text}>
        {value}
      </Text>
    </View>
  );
}

/** A tappable menu row with an icon and an optional count. */
export function MenuRow({
  icon,
  label,
  note,
  onPress,
  tone,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  note?: string | null;
  onPress: () => void;
  tone?: string;
}) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note ? `${label}, ${note}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
    >
      <Feather name={icon} size={IconSize.large} color={tone ?? C.text} />
      <Text variant="body" tone={tone ?? C.text} style={styles.flex}>
        {label}
      </Text>
      {note ? (
        <Text variant="hint" numberOfLines={1}>
          {note}
        </Text>
      ) : null}
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
    </Pressable>
  );
}

/** A switch with its label and what it does. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const { rtl } = useI18n();
  return (
    <View style={[styles.toggle, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
      <View style={styles.flex}>
        <Text variant="rowTitle">{label}</Text>
        {hint ? <Text variant="hint">{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Brand.navy700, false: C.border }}
        thumbColor={Brand.white}
        // react-native-web draws the "on" knob in its own teal unless told.
        {...({ activeThumbColor: Brand.white } as object)}
      />
    </View>
  );
}

export const staffStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three, width: '100%', maxWidth: 720, alignSelf: 'center' },
  gap: { gap: Spacing.two },
});

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  pill: { alignSelf: 'flex-start', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    // The 44pt floor, not the compact 40: these are thumbed at a counter.
    minHeight: Tap.min,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: Border.hairline,
    borderColor: C.border,
    backgroundColor: Brand.white,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Brand.navy900, borderColor: Brand.navy900 },
  chipPressed: { backgroundColor: C.surfacePressed },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.tile,
    borderWidth: Border.hairline,
    borderColor: C.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  line: { alignItems: 'baseline', gap: Spacing.two },
  menuRow: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.one },
  pressed: { opacity: 0.6 },
  toggle: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min },
});
