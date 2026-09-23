import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useStaff } from '@/store/staff';
import { staffStyles } from '@/components/staff/kit';

/**
 * The staff door. The same e-mail and password as the website's admin, the
 * same lockout after repeated failures (the shop counts both doors
 * together), and the same single message for a wrong e-mail or a wrong
 * password — telling them apart would tell a stranger which addresses have
 * accounts.
 */
export default function StaffSignIn() {
  const { t } = useI18n();
  const router = useRouter();
  const signIn = useStaff((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError('staff.err.invalid');
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace('/gestion');
    } catch (err) {
      const kind = err instanceof ApiError ? err.failure.kind : 'offline';
      setError(
        kind === 'unauthorized' || kind === 'invalid'
          ? 'staff.err.invalid'
          : kind === 'forbidden'
            ? 'staff.err.forbidden'
            : kind === 'rateLimited'
              ? 'staff.err.rateLimited'
              : 'staff.err.offline',
      );
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={staffStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[staffStyles.scroll, styles.scroll]} keyboardShouldPersistTaps="handled">
        <Text variant="screenTitle">{t('staff.signInTitle')}</Text>
        <Text variant="body" tone={C.textMuted}>
          {t('staff.signInWhy')}
        </Text>
        <View style={styles.form}>
          <FormField
            label={t('staff.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            ltr
          />
          <FormField
            label={t('staff.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={submit}
            returnKeyType="go"
            error={error ? t(error) : null}
            ltr
          />
          <Button label={t('staff.signIn')} onPress={submit} loading={busy} icon="log-in" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: Spacing.five },
  form: { gap: Spacing.three, marginTop: Spacing.three },
});
