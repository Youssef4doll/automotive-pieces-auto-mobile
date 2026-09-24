import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { accountApi } from '@/api/account';
import { ApiError, type ApiFailure } from '@/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { C, familyFor, MaxContentWidth, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { fieldProblem, isEmail, signupProblems, type SignupField } from '@/lib/account';
import { useAccount } from '@/store/account';
import { useToast } from '@/store/toast';

type Mode = 'signin' | 'signup' | 'forgot';

/**
 * Sign in, create an account, or ask for a new password — one screen, three
 * modes, because they are one decision for the customer ("I want my
 * account") and switching between them should not lose what was typed.
 *
 * Optional, and says so: the line at the top tells the customer they can
 * order without an account, and nothing in the app routes here on its own.
 *
 * A new password is chosen on the website's reset page, from the e-mailed
 * link — one reset flow for both front doors, not two.
 */
export default function SignInScreen() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { t, rtl } = useI18n();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const signIn = useAccount((s) => s.signIn);
  const signUp = useAccount((s) => s.signUp);

  const [mode, setMode] = useState<Mode>(params.mode === 'signup' || params.mode === 'forgot' ? params.mode : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<SignupField, DictKey>>>({});
  const [error, setError] = useState<DictKey | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setErrors({});
    setError(null);
    setSent(false);
  };

  const general = (failure: ApiFailure): DictKey =>
    failure.kind === 'rateLimited'
      ? 'auth.err.rateLimited'
      : failure.kind === 'offline' || failure.kind === 'timeout'
        ? 'state.offlineBody'
        : 'state.serverBody';

  const done = () => {
    const account = useAccount.getState().account;
    toast({ message: t('auth.welcome', { name: account?.name.split(/\s+/)[0] ?? '' }), tone: 'success' });
    // Opened from a link there is nothing to go back to.
    if (router.canGoBack()) router.back();
    else router.replace('/compte');
  };

  const submit = async () => {
    setError(null);
    if (mode === 'forgot') {
      if (!isEmail(email)) return setErrors({ email: 'checkout.err.email' });
      setErrors({});
      setBusy(true);
      try {
        await accountApi.requestReset(email);
        setSent(true);
      } catch (err) {
        setError(general(err instanceof ApiError ? err.failure : { kind: 'offline' }));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'signup') {
      const problems = signupProblems({ name, email, phone, password });
      setErrors(problems);
      if (Object.keys(problems).length) return;
    } else {
      const problems: Partial<Record<SignupField, DictKey>> = {};
      if (!isEmail(email)) problems.email = 'checkout.err.email';
      if (!password) problems.password = 'auth.err.password';
      setErrors(problems);
      if (Object.keys(problems).length) return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') await signUp({ name, email, phone, password });
      else await signIn(email, password);
      done();
    } catch (err) {
      const failure: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
      if (failure.kind === 'unauthorized') setError('auth.err.wrong');
      else if (failure.kind === 'invalid') {
        const problem = fieldProblem(failure.field, failure.reason);
        if (problem) setErrors({ [problem.field]: problem.key });
        else setError('state.serverBody');
      } else setError(general(failure));
      setBusy(false);
    }
  };

  const title = mode === 'signup' ? t('auth.signUp') : mode === 'forgot' ? t('auth.forgotTitle') : t('auth.signIn');
  const err = (f: SignupField) => (errors[f] ? t(errors[f]!) : null);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Text variant="body">{mode === 'forgot' ? t('auth.forgotWhy') : t('auth.why')}</Text>

          {mode === 'signup' ? (
            <FormField
              label={t('auth.name')}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
              maxLength={80}
              error={err('name')}
            />
          ) : null}

          <FormField
            label={t('auth.email')}
            placeholder="nom@exemple.tn"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType={mode === 'signup' ? 'emailAddress' : 'username'}
            maxLength={200}
            error={err('email')}
            ltr
            onSubmitEditing={() => (mode === 'forgot' ? submit() : passwordRef.current?.focus())}
          />

          {mode === 'signup' ? (
            <FormField
              label={t('auth.phone')}
              placeholder="22 334 455"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={30}
              error={err('phone')}
              ltr
            />
          ) : null}

          {mode !== 'forgot' ? (
            <FormField
              ref={passwordRef}
              label={t('auth.password')}
              hint={mode === 'signup' ? t('auth.passwordHint') : null}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              maxLength={72}
              error={err('password')}
              ltr
              onSubmitEditing={submit}
            />
          ) : null}

          {error ? (
            <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
              {t(error)}
            </Text>
          ) : null}
          {sent ? (
            <Text variant="body" tone={C.success} accessibilityLiveRegion="polite">
              {t('auth.forgotSent')}
            </Text>
          ) : null}

          <Button
            label={mode === 'signup' ? t('auth.signUp') : mode === 'forgot' ? t('auth.forgotSend') : t('auth.signIn')}
            onPress={submit}
            loading={busy}
          />

          <View style={styles.links}>
            {mode === 'signin' ? (
              <>
                <Link label={t('auth.forgot')} onPress={() => switchTo('forgot')} rtl={rtl} />
                <Link label={t('auth.noAccount')} onPress={() => switchTo('signup')} rtl={rtl} />
              </>
            ) : mode === 'signup' ? (
              <Link label={t('auth.haveAccount')} onPress={() => switchTo('signin')} rtl={rtl} />
            ) : (
              <Link label={t('auth.back')} onPress={() => switchTo('signin')} rtl={rtl} />
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Link({ label, onPress, rtl }: { label: string; onPress: () => void; rtl: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
      <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 15, color: C.text, textDecorationLine: 'underline', textAlign: 'center' }}>
        {label}
      </Text>
    </Pressable>
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
  links: { gap: Spacing.one, alignItems: 'center' },
  link: { minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: Spacing.two },
});
