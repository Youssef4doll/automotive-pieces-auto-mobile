import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { ordersApi } from '@/api/orders';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { C, MaxContentWidth, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useOrders } from '@/store/orders';

/**
 * Retrouver une commande — the reference, the phone number, and the order is
 * back on this phone.
 *
 * For an order placed on the website, on another phone, or on this one
 * before the app was reinstalled. The shop checks the pair with the same rule
 * as the website's own form and, on a match, issues this phone its own key.
 *
 * One message for every failure, the website's, because the shop gives one
 * answer for every failure: telling a guesser "that reference exists but the
 * number is wrong" would tell them which references are real.
 */
export default function FindOrderScreen() {
  const params = useLocalSearchParams<{ ref?: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const remember = useOrders((s) => s.remember);
  const [ref, setRef] = useState(params.ref ?? '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);

  const find = async () => {
    setError(null);
    setBusy(true);
    try {
      const found = await ordersApi.lookup(ref.trim(), phone.trim());
      const order = await ordersApi.get(found.ref, found.token);
      await remember(
        { ref: order.ref, placedAt: order.createdAt, total: order.total, itemCount: order.items.reduce((n, i) => n + i.qty, 0) },
        found.token,
      );
      router.replace({ pathname: '/suivi/[ref]', params: { ref: order.ref } });
    } catch (err) {
      const kind = err instanceof ApiError ? err.failure.kind : 'offline';
      setError(
        kind === 'notFound'
          ? 'account.findFail'
          : kind === 'rateLimited'
            ? 'account.findRateLimited'
            : kind === 'offline' || kind === 'timeout'
              ? 'state.offlineBody'
              : 'state.serverBody',
      );
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('account.find') }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Text variant="body">{t('account.findWhy')}</Text>
          <FormField
            label={t('account.findRef')}
            placeholder={t('account.findRefHint')}
            value={ref}
            onChangeText={setRef}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={32}
            ltr
          />
          <FormField
            label={t('account.findPhone')}
            placeholder="22 334 455"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={30}
            ltr
            onSubmitEditing={find}
          />
          {error ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
              {t(error)}
            </Text>
          ) : null}
          <Button
            label={t('account.findSubmit')}
            onPress={find}
            loading={busy}
            disabled={ref.trim().length < 3 || phone.replace(/\D/g, '').length < 8}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
