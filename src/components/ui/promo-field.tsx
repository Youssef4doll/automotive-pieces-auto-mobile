import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import type { CartQuote } from '@/api/orders';
import { Border, C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { formatDT } from '@/lib/format';
import { track } from '@/services/analytics';
import { useCart } from '@/store/cart';
import { Button } from './button';
import { Text } from './text';

/**
 * "Vous avez un code promo ?" — folded away until asked for.
 *
 * The phone keeps the code and nothing else. Whether it applies, and for how
 * much, is the shop's answer on the next quote: this component only says
 * what that answer was. A code that does not apply yet (the basket is under
 * its minimum) stays, and starts applying by itself once the basket is big
 * enough; a code the shop does not know is taken out at once (see
 * store/cart dropPromo) and said once.
 */
export function PromoField({ quote, stale }: { quote: CartQuote | null; stale: boolean }) {
  const { t, rtl } = useI18n();
  const code = useCart((s) => s.promoCode);
  const dropped = useCart((s) => s.promoDropped);
  const setCode = useCart((s) => s.setPromoCode);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const apply = () => {
    if (!text.trim()) return;
    track('promo_entered', {});
    setCode(text);
    setText('');
  };

  // A code is held: applied, waiting on the shop, or not applying (and why).
  if (code) {
    const judged = quote && !stale;
    const applied = judged && quote.promo?.code === code;
    const problem = judged && quote.promoError ? quote.promoError : null;
    const line = applied
      ? t('cart.promo.applied', { code })
      : problem
        ? t(`cart.promo.err.${problem.reason}` as DictKey, { code, amount: problem.minSubtotal != null ? formatDT(problem.minSubtotal) : '' })
        : t('cart.promo.checking', { code });
    return (
      <View style={[styles.held, row, applied ? styles.heldOk : problem ? styles.heldProblem : null]}>
        <Feather name={applied ? 'check-circle' : problem ? 'alert-circle' : 'tag'} size={IconSize.medium} color={applied ? C.success : problem ? C.caution : C.textMuted} />
        <View style={styles.flex}>
          <Text variant="body" tone={applied ? C.success : C.text} style={align} accessibilityLiveRegion="polite">
            {line}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('cart.promo.remove')} hitSlop={10} onPress={() => setCode(null)} style={styles.x}>
          <Feather name="x" size={IconSize.medium} color={C.textMuted} />
        </Pressable>
      </View>
    );
  }

  if (!open && !dropped) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={[styles.ask, row]} hitSlop={6}>
        <Feather name="tag" size={IconSize.small} color={C.text} />
        <Text variant="hint" tone={C.text} style={styles.link}>
          {t('cart.promo.ask')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <Text variant="hint" tone={C.text} style={align}>
        {t('cart.promo.label')}
      </Text>
      <View style={[row, styles.entry]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={apply}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={40}
          returnKeyType="done"
          placeholder="ETE10"
          placeholderTextColor={C.textMuted}
          accessibilityLabel={t('cart.promo.label')}
          style={[styles.input, { writingDirection: 'ltr', textAlign: rtl ? 'right' : 'left' }]}
        />
        <Button label={t('cart.promo.apply')} variant="secondary" onPress={apply} disabled={!text.trim()} />
      </View>
      {dropped ? (
        <Text variant="hint" tone={C.danger} style={align} accessibilityLiveRegion="polite">
          {t(`cart.promo.err.${dropped.reason}` as DictKey, { code: dropped.code, amount: '' })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  ask: { alignItems: 'center', gap: Spacing.two, minHeight: Tap.min, alignSelf: 'flex-start' },
  link: { textDecorationLine: 'underline' },
  form: { gap: Spacing.one },
  entry: { gap: Spacing.two, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: Tap.primary,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
    color: C.text,
    fontSize: 16,
    letterSpacing: 1,
  },
  held: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  heldOk: { borderColor: C.success, backgroundColor: C.successSurface },
  heldProblem: { borderColor: C.caution, backgroundColor: C.cautionSurface },
  x: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
