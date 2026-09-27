import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ordersApi, type Order } from '@/api/orders';
import { Brand, C, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';
import { useOrders } from '@/store/orders';
import { Button } from './button';
import { FormField } from './form-field';
import { Text } from './text';

/**
 * "Comment s'est passée cette commande ?" — once the shop has marked it
 * delivered, and only then. Stars and an optional sentence, for the shop:
 * nothing here is published, and the card says so.
 */
export function OrderRating({ order, onRated }: { order: Order; onRated: (order: Order) => void }) {
  const { t, rtl } = useI18n();
  const tokenFor = useOrders((s) => s.tokenFor);
  const given = order.review ?? null;
  const [editing, setEditing] = useState(!given);
  const [stars, setStars] = useState(given?.stars ?? 0);
  const [comment, setComment] = useState(given?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  if (order.status !== 'DELIVERED') return null;

  const send = async () => {
    if (!stars) return;
    setBusy(true);
    setFailed(false);
    try {
      const key = await tokenFor(order.ref);
      if (!key) throw new Error('no key');
      const updated = await ordersApi.review(order.ref, key, { stars, comment: comment.trim() || undefined });
      track('order_rated', { stars, comment: Boolean(comment.trim()) });
      setEditing(false);
      onRated(updated);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text variant="rowTitle" style={align}>
        {editing ? t('rating.title') : t('rating.thanks')}
      </Text>
      <View style={[styles.stars, { flexDirection: rtl ? 'row-reverse' : 'row' }]} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            disabled={!editing}
            accessibilityRole="radio"
            accessibilityState={{ checked: stars === n, disabled: !editing }}
            accessibilityLabel={t('rating.star', { n })}
            hitSlop={4}
            onPress={() => setStars(n)}
            style={styles.star}
          >
            <FontAwesome name={n <= stars ? 'star' : 'star-o'} size={30} color={n <= stars ? Brand.gold500 : C.textMuted} />
          </Pressable>
        ))}
      </View>
      {editing ? (
        <>
          <FormField label={t('rating.comment')} value={comment} onChangeText={setComment} multiline maxLength={1000} />
          <Text variant="hint" style={align}>
            {t('rating.why')}
          </Text>
          {failed ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite">
              {t('rating.failed')}
            </Text>
          ) : null}
          <Button label={t('rating.send')} onPress={() => void send()} disabled={!stars} loading={busy} />
        </>
      ) : (
        <>
          {given?.comment ? (
            <Text variant="body" style={align}>
              {`« ${given.comment} »`}
            </Text>
          ) : null}
          <Button label={t('rating.edit')} variant="secondary" onPress={() => setEditing(true)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.surface },
  stars: { gap: Spacing.two, alignItems: 'center' },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
