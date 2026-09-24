import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { C, MaxContentWidth, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useAccount } from '@/store/account';
import { useToast } from '@/store/toast';

/**
 * Supprimer mon compte — reachable from Compte in one tap, as both stores
 * require, and finished with the password rather than a second "are you
 * sure": an unlocked phone on a counter must not be a tap from erasing
 * somebody.
 *
 * It says what goes and what stays before it asks. Orders stay with the
 * shop, detached, because an invoice has to be kept; saying so here is the
 * difference between a deletion and a surprise.
 */
export default function DeleteAccountScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const status = useAccount((s) => s.status);
  const deleteAccount = useAccount((s) => s.deleteAccount);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);

  if (status === 'guest') return <Redirect href="/compte" />;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(password);
      toast({ message: t('auth.deleteDone'), tone: 'neutral' });
      if (router.canGoBack()) router.dismissTo('/compte');
      else router.replace('/compte');
    } catch (err) {
      const f = err instanceof ApiError ? err.failure : ({ kind: 'offline' } as const);
      setError(
        f.kind === 'invalid'
          ? 'auth.err.wrongPassword'
          : f.kind === 'forbidden'
            ? 'auth.err.admin'
            : f.kind === 'rateLimited'
              ? 'auth.err.rateLimited'
              : f.kind === 'offline' || f.kind === 'timeout'
                ? 'state.offlineBody'
                : 'state.serverBody',
      );
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('auth.delete') }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Text variant="body">{t('auth.deleteWhat')}</Text>
          <Text variant="body">{t('auth.deleteKept')}</Text>
          <Text variant="rowTitle">{t('auth.deleteFinal')}</Text>
          <FormField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            maxLength={72}
            ltr
            onSubmitEditing={submit}
          />
          {error ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
              {t(error)}
            </Text>
          ) : null}
          <Button label={t('auth.deleteSubmit')} variant="danger" onPress={submit} loading={busy} disabled={!password} />
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
