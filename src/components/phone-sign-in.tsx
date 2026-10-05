import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { accountApi } from '@/api/account';
import { ApiError, type ApiFailure } from '@/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { C, familyFor, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { isEmail } from '@/lib/account';
import { tunisianDigits } from '@/lib/checkout';
import { useAccount } from '@/store/account';

const RESEND_AFTER_S = 60;

/**
 * Sign in with a code by SMS — no password to remember, which is how most
 * customers here would rather do it.
 *
 * Three steps on one screen: the number, the code (which the phone offers
 * to fill in from the SMS by itself — `oneTimeCode`), and, only for a
 * number that has no account yet, a name (the e-mail is optional). Every
 * refusal is said plainly — a wrong code, an expired one, one tried too
 * often — and the number typed is kept through all of it.
 *
 * Only shown when the shop can send texts (settings `auth.phoneCode`).
 */
export function PhoneSignIn({
  onDone,
  preset,
}: {
  onDone: () => void;
  /**
   * From the checkout: the number, name and e-mail the delivery step already
   * holds. The code goes out at once, and a number with no account is opened
   * in that name without asking for it again.
   */
  preset?: { phone: string; name: string; email: string };
}) {
  const { t, rtl, locale } = useI18n();
  const signInWithCode = useAccount((s) => s.signInWithCode);
  const signUpWithTicket = useAccount((s) => s.signUpWithTicket);

  const [step, setStep] = useState<'number' | 'code' | 'name'>('number');
  const [phone, setPhone] = useState(preset?.phone ?? '');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState<string | null>(null);
  const [name, setName] = useState(preset?.name ?? '');
  const [email, setEmail] = useState(preset?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const [fieldError, setFieldError] = useState<{ field: 'phone' | 'code' | 'name' | 'email'; key: DictKey } | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<TextInput>(null);
  const digits = tunisianDigits(phone);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  // The resend countdown.
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const general = (f: ApiFailure): DictKey =>
    f.kind === 'rateLimited' ? 'auth.err.rateLimited' : f.kind === 'offline' || f.kind === 'timeout' ? 'state.offlineBody' : 'state.serverBody';
  const failureOf = (err: unknown): ApiFailure => (err instanceof ApiError ? err.failure : { kind: 'offline' });

  const sendCode = async () => {
    setError(null);
    setFieldError(null);
    if (!digits) return setFieldError({ field: 'phone', key: 'auth.err.phone' });
    setBusy(true);
    try {
      await accountApi.sendCode(digits, locale);
      setStep('code');
      setCode('');
      setWait(RESEND_AFTER_S);
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      const f = failureOf(err);
      if (f.kind === 'invalid' && f.field === 'phone') setFieldError({ field: 'phone', key: 'auth.err.phone' });
      else setError(general(f));
    } finally {
      setBusy(false);
    }
  };

  // From the checkout the number is already known: send the code straight away.
  const autoSent = useRef(false);
  useEffect(() => {
    if (!preset || autoSent.current) return;
    autoSent.current = true;
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async (value = code) => {
    if (!digits || value.length !== 6 || busy) return;
    setError(null);
    setFieldError(null);
    setBusy(true);
    try {
      const result = await signInWithCode(digits, value);
      if (result && preset && name.trim().length >= 2 && (!email.trim() || isEmail(email))) {
        // The checkout already has the name: open the account in it.
        setTicket(result.ticket);
        try {
          await signUpWithTicket(result.ticket, name, email);
          onDone();
        } catch {
          // An e-mail already taken, a name refused: the name step, filled
          // in, says which — the code is spent, the ticket is not.
          setStep('name');
          setBusy(false);
        }
      } else if (result) {
        setTicket(result.ticket);
        setStep('name');
        setBusy(false);
      } else onDone();
    } catch (err) {
      const f = failureOf(err);
      if (f.kind === 'invalid' && f.field === 'code') {
        const reason = f.reason === 'too_many' || f.reason === 'expired' ? f.reason : 'wrong';
        setFieldError({ field: 'code', key: `auth.err.code.${reason}` });
      } else setError(general(f));
      setBusy(false);
    }
  };

  const create = async () => {
    setError(null);
    setFieldError(null);
    if (name.trim().length < 2) return setFieldError({ field: 'name', key: 'checkout.err.customerName' });
    if (email.trim() && !isEmail(email)) return setFieldError({ field: 'email', key: 'checkout.err.email' });
    if (!ticket) return;
    setBusy(true);
    try {
      await signUpWithTicket(ticket, name, email);
      onDone();
    } catch (err) {
      const f = failureOf(err);
      if (f.kind === 'invalid' && f.field === 'email') setFieldError({ field: 'email', key: f.reason === 'taken' ? 'auth.err.emailTakenPhone' : 'checkout.err.email' });
      else if (f.kind === 'invalid' && f.field === 'name') setFieldError({ field: 'name', key: 'checkout.err.customerName' });
      else if (f.kind === 'invalid' && (f.field === 'ticket' || f.field === 'phone')) {
        // The proof ran out (or the number was taken meanwhile): start again from the number.
        setError(f.field === 'phone' ? 'auth.err.phoneTaken' : 'auth.err.ticket');
        setTicket(null);
        setStep('number');
      } else setError(general(f));
      setBusy(false);
    }
  };

  const errFor = (field: 'phone' | 'code' | 'name' | 'email') => (fieldError?.field === field ? t(fieldError.key) : null);

  return (
    <View style={styles.root}>
      {step === 'number' ? (
        <>
          <Text variant="body" style={align}>
            {t('auth.phoneLead')}
          </Text>
          <FormField
            label={t('auth.phoneNumber')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            prefix="+216"
            placeholder="22 334 455"
            maxLength={30}
            ltr
            error={errFor('phone')}
            onSubmitEditing={() => void sendCode()}
            testID="phone-number"
          />
        </>
      ) : step === 'code' ? (
        <>
          <Text variant="body" style={align}>
            {t('auth.codeSentTo', { phone: digits ? `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}` : phone })}
          </Text>
          <FormField
            ref={codeRef}
            label={t('auth.code')}
            value={code}
            onChangeText={(v) => {
              const next = v.replace(/\D/g, '').slice(0, 6);
              setCode(next);
              // The sixth digit is the submit: one less tap, and what the
              // SMS autofill expects.
              if (next.length === 6) void verify(next);
            }}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            ltr
            error={errFor('code')}
            testID="phone-code"
          />
        </>
      ) : (
        <>
          <Text variant="sectionTitle" style={align}>
            {t('auth.newTitle')}
          </Text>
          <Text variant="body" style={align}>
            {t('auth.newLead')}
          </Text>
          <FormField label={t('auth.name')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" maxLength={80} error={errFor('name')} />
          <FormField
            label={t('auth.emailOptional')}
            placeholder="nom@exemple.tn"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={200}
            ltr
            error={errFor('email')}
          />
        </>
      )}

      {error ? (
        <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive" style={align}>
          {t(error)}
        </Text>
      ) : null}

      {step === 'number' ? (
        <Button label={t('auth.sendCode')} icon="message-square" onPress={() => void sendCode()} loading={busy} testID="phone-send" />
      ) : step === 'code' ? (
        <>
          <Button label={t('auth.verify')} onPress={() => void verify()} loading={busy} disabled={code.length !== 6} />
          <View style={styles.links}>
            <Pressable accessibilityRole="button" disabled={wait > 0 || busy} onPress={() => void sendCode()} style={styles.link}>
              <Text style={[styles.linkText, { fontFamily: familyFor('bodySemi', rtl) }, wait > 0 && styles.linkOff]}>
                {wait > 0 ? t('auth.resendIn', { s: wait }) : t('auth.resend')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setStep('number');
                setCode('');
                setFieldError(null);
                setError(null);
              }}
              style={styles.link}
            >
              <Text style={[styles.linkText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('auth.changeNumber')}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Button label={t('auth.createWithPhone')} onPress={() => void create()} loading={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.three },
  links: { gap: Spacing.one, alignItems: 'center' },
  link: { minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: Spacing.two },
  linkText: { fontSize: 15, color: C.text, textDecorationLine: 'underline', textAlign: 'center' },
  linkOff: { color: C.textMuted, textDecorationLine: 'none' },
});
