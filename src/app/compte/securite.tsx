import { Feather } from '@expo/vector-icons';
import { Redirect, Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accountApi, type SignedInDevice } from '@/api/account';
import { ApiError, type ApiFailure } from '@/api/client';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Failed } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { passwordProblem, PASSWORD_MIN } from '@/lib/account';
import { formatDate } from '@/lib/format';
import { tunisianDigits } from '@/lib/checkout';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { accountToken, useAccount } from '@/store/account';
import { useToast } from '@/store/toast';

/**
 * Connexion et sécurité — the password, and the phones signed in with it.
 *
 * Both halves answer the same worry — "somebody else might be in my
 * account" — so they sit together. The password is changed with the current
 * one (an unlocked phone is not enough); the shop then signs out every other
 * phone, staff session and website sign-in, and this phone stays in. The
 * list is the shop's, not the phone's memory: each phone as it named itself
 * at sign-in, when it was last used, and a way to sign it out. A phone
 * signed in before the app sent its name says so rather than guessing one.
 */
export default function SecurityScreen() {
  const { t, rtl } = useI18n();
  const status = useAccount((s) => s.status);
  const signOut = useAccount((s) => s.signOut);
  // An account opened with a phone code has no password to change.
  const hasPassword = useAccount((s) => s.account?.hasPassword !== false);
  const toast = useToast((s) => s.show);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  const load = useCallback((signal: AbortSignal) => {
    const token = accountToken();
    if (!token) return Promise.reject(new ApiError({ kind: 'unauthorized' }, 'not signed in'));
    return accountApi.devices(token, signal);
  }, []);
  const devices = useResource(load);
  // The list after a change here: re-read quietly (it stays on screen meanwhile).
  const refresh = () => {
    if (devices.status === 'loaded') void devices.reload();
    else if (devices.status === 'failed') devices.retry();
  };

  // This phone was signed out from somewhere else: it is signed out here too.
  const lapsed = async (failure: ApiFailure) => {
    if (failure.kind !== 'unauthorized') return false;
    await signOut();
    return true;
  };

  const [busyId, setBusyId] = useState<string | null>(null);
  const signOutDevice = async (id?: string) => {
    const token = accountToken();
    if (!token) return;
    setBusyId(id ?? 'others');
    try {
      const { revoked } = await accountApi.signOutDevice(token, id);
      toast({ message: id ? t('security.signedOutOne') : t('security.signedOutOthers', { n: revoked }), tone: 'success' });
      refresh();
    } catch (err) {
      const failure: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
      if (!(await lapsed(failure))) {
        // Already gone (signed out on that phone meanwhile): the list catches up.
        if (failure.kind === 'notFound') refresh();
        else toast({ message: t(failure.kind === 'offline' || failure.kind === 'timeout' ? 'state.offlineBody' : 'state.serverBody'), tone: 'neutral' });
      }
    } finally {
      setBusyId(null);
    }
  };

  if (status === 'guest') return <Redirect href="/compte/connexion" />;

  const list = devices.status === 'loaded' ? devices.data : [];
  const others = list.filter((d) => !d.current);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('security.title') }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <PhoneSection onLapsed={lapsed} />

          {hasPassword ? (
            <View style={styles.section}>
              <Text style={[styles.heading, align, { fontFamily: familyFor('heading', rtl) }]}>{t('security.password')}</Text>
              <Text variant="hint" style={align}>
                {t('security.passwordWhy')}
              </Text>
              <PasswordCard
                onChanged={(n) => {
                  toast({ message: n > 0 ? t('security.changedOthers', { n }) : t('security.changed'), tone: 'success' });
                  refresh();
                }}
                onLapsed={lapsed}
              />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.heading, align, { fontFamily: familyFor('heading', rtl) }]}>{t('security.devices')}</Text>
            <Text variant="hint" style={align}>
              {t('security.devicesWhy')}
            </Text>
            {devices.status === 'loading' ? (
              <View style={styles.card}>
                {[0, 1].map((i) => (
                  <Skeleton key={i} style={styles.rowSkeleton} />
                ))}
              </View>
            ) : devices.status === 'failed' ? (
              <Failed failure={devices.failure} onRetry={devices.retry} />
            ) : (
              <View style={styles.card} testID="signed-in-devices">
                {list.map((d, i) => (
                  <DeviceRow
                    key={d.id}
                    device={d}
                    last={i === list.length - 1}
                    busy={busyId === d.id}
                    onSignOut={() => signOutDevice(d.id)}
                  />
                ))}
              </View>
            )}
            {devices.status === 'loaded' ? (
              others.length ? (
                <>
                  <Button
                    label={t('security.signOutOthers')}
                    variant="secondary"
                    icon="log-out"
                    loading={busyId === 'others'}
                    onPress={() => signOutDevice()}
                  />
                  <View style={[styles.note, row]}>
                    <Feather name="shield" size={IconSize.medium} color={C.textMuted} />
                    <Text variant="hint" style={[styles.flex, align]}>
                      {t('security.unknownHint')}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={[styles.note, row]}>
                  <Feather name="check-circle" size={IconSize.medium} color={C.success} />
                  <Text variant="hint" style={[styles.flex, align]}>
                    {t('security.onlyThis')}
                  </Text>
                </View>
              )
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Signing in with a code by SMS: which number does it (only a number proved
 * with a code ever does — a typed one proves nothing), and the way to add or
 * change it, code and all. Offered only when the shop can send texts; an
 * account that already has a number says so either way.
 */
function PhoneSection({ onLapsed }: { onLapsed: (f: ApiFailure) => Promise<boolean> }) {
  const { t, rtl, locale } = useI18n();
  const account = useAccount((s) => s.account);
  const setAccount = useAccount((s) => s.setAccount);
  const toast = useToast((s) => s.show);
  const settings = useShopSettings();
  const canText = settings.status === 'loaded' && settings.data.auth?.phoneCode === true;
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const verified = account?.verifiedPhone ?? null;
  const shown = verified ? `+216 ${verified.slice(4, 6)} ${verified.slice(6, 9)} ${verified.slice(9)}` : null;

  if (!verified && !canText) return null;

  const fail = async (err: unknown) => {
    const f: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
    if (await onLapsed(f)) return;
    setError(
      f.kind === 'invalid' && f.field === 'phone'
        ? f.reason === 'taken'
          ? 'security.phoneTaken'
          : f.reason === 'same'
            ? 'security.phoneSame'
            : 'auth.err.phone'
        : f.kind === 'invalid' && f.field === 'code'
          ? f.reason === 'too_many' || f.reason === 'expired'
            ? `auth.err.code.${f.reason}`
            : 'auth.err.code.wrong'
          : f.kind === 'rateLimited'
            ? 'auth.err.rateLimited'
            : f.kind === 'offline' || f.kind === 'timeout'
              ? 'state.offlineBody'
              : 'state.serverBody',
    );
  };

  const send = async () => {
    const token = accountToken();
    const digits = tunisianDigits(phone);
    if (!token) return;
    if (!digits) return setError('auth.err.phone');
    setError(null);
    setBusy(true);
    try {
      await accountApi.sendLinkCode(token, digits, locale);
      setSent(true);
      setCode('');
    } catch (err) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  };

  const link = async () => {
    const token = accountToken();
    const digits = tunisianDigits(phone);
    if (!token || !digits || code.length !== 6) return;
    setError(null);
    setBusy(true);
    try {
      const { account: next } = await accountApi.linkPhone(token, digits, code);
      setAccount(next);
      setOpen(false);
      setSent(false);
      toast({ message: t('security.phoneLinked'), tone: 'success' });
    } catch (err) {
      await fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section} testID="security-phone">
      <Text style={[styles.heading, align, { fontFamily: familyFor('heading', rtl) }]}>{t('security.phoneTitle')}</Text>
      <Text variant="hint" style={align}>
        {account?.hasPassword === false && shown
          ? t('security.noPassword', { phone: shown })
          : shown
            ? t('security.phoneOn', { phone: shown })
            : t('security.phoneOff')}
      </Text>
      {canText ? (
        open ? (
          <View style={styles.card}>
            <View style={styles.form}>
              <FormField
                label={t('auth.phoneNumber')}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setSent(false);
                }}
                keyboardType="phone-pad"
                prefix="+216"
                placeholder="22 334 455"
                maxLength={30}
                ltr
              />
              {sent ? (
                <FormField
                  label={t('auth.code')}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  ltr
                  onSubmitEditing={() => void link()}
                />
              ) : null}
              {error ? (
                <Text variant="hint" tone={C.danger} style={align}>
                  {t(error)}
                </Text>
              ) : null}
              {sent ? (
                <Button label={t('auth.verify')} onPress={() => void link()} loading={busy} disabled={code.length !== 6} />
              ) : (
                <Button label={t('auth.sendCode')} icon="message-square" onPress={() => void send()} loading={busy} />
              )}
            </View>
          </View>
        ) : (
          <Button
            label={t(verified ? 'security.phoneChange' : 'security.phoneAdd')}
            icon="smartphone"
            variant="secondary"
            onPress={() => {
              setOpen(true);
              setError(null);
            }}
          />
        )
      ) : null}
    </View>
  );
}

function DeviceRow({ device, last, busy, onSignOut }: { device: SignedInDevice; last: boolean; busy: boolean; onSignOut: () => void }) {
  const { t, rtl, locale } = useI18n();
  const name = device.device ?? t('security.unknownDevice');
  const web = /web|navigateur|windows|mac ?os/i.test(device.device ?? '');
  return (
    <View style={[styles.device, { flexDirection: rtl ? 'row-reverse' : 'row' }, !last && styles.rule]}>
      <View style={[styles.deviceIcon, device.current && styles.deviceIconCurrent]}>
        <Feather name={web ? 'monitor' : 'smartphone'} size={IconSize.large} color={device.current ? Brand.navy950 : C.text} />
      </View>
      <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start' }]}>
        <Text variant="body" tone={C.text} numberOfLines={2}>
          {name}
        </Text>
        {device.current ? (
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { fontFamily: familyFor('display', rtl) }]}>{t('security.thisDevice')}</Text>
          </View>
        ) : (
          <Text variant="hint">{t('security.lastUsed', { date: formatDate(device.lastUsedAt, locale) })}</Text>
        )}
        <Text variant="hint" tone={C.textFaint}>
          {t('security.signedInAt', { date: formatDate(device.signedInAt, locale) })}
        </Text>
        {/* Under the words rather than beside them: at 320pt a button on
            the right left the phone's name two words wide. */}
        {device.current ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('security.signOutOneA11y', { device: name })}
            disabled={busy}
            onPress={onSignOut}
            style={({ pressed }) => [styles.signOut, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.signOutPressed, busy && styles.dim]}
          >
            <Feather name="log-out" size={IconSize.small} color={C.danger} />
            <Text style={[styles.signOutText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('security.signOutOne')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Closed to one button until asked; three fields and the rule when open. */
function PasswordCard({ onChanged, onLapsed }: { onChanged: (signedOut: number) => void; onLapsed: (f: ApiFailure) => Promise<boolean> }) {
  const { t, rtl } = useI18n();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'current' | 'next' | 'confirm', DictKey>>>({});
  const [error, setError] = useState<DictKey | null>(null);

  const reset = () => {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const problems: typeof errors = {};
    if (!current) problems.current = 'auth.err.wrongPassword';
    if (next.length < PASSWORD_MIN) problems.next = 'auth.err.password';
    else if (next === current) problems.next = 'security.err.same';
    if (!problems.next && confirm !== next) problems.confirm = 'security.err.mismatch';
    setErrors(problems);
    if (Object.keys(problems).length) return;

    const token = accountToken();
    if (!token) return;
    setBusy(true);
    try {
      const { signedOut } = await accountApi.changePassword(token, current, next);
      reset();
      onChanged(signedOut);
    } catch (err) {
      const failure: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
      if (await onLapsed(failure)) return;
      if (failure.kind === 'invalid' && failure.field === 'current') setErrors({ current: 'auth.err.wrongPassword' });
      else if (failure.kind === 'invalid' && failure.field === 'next') setErrors({ next: passwordProblem(failure.reason) });
      else
        setError(
          failure.kind === 'rateLimited'
            ? 'auth.err.rateLimited'
            : failure.kind === 'offline' || failure.kind === 'timeout'
              ? 'state.offlineBody'
              : 'state.serverBody',
        );
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return <Button label={t('security.change')} variant="secondary" icon="lock" onPress={() => setOpen(true)} />;
  }

  return (
    <View style={[styles.card, styles.form]} testID="change-password">
      <FormField
        label={t('security.current')}
        value={current}
        onChangeText={setCurrent}
        error={errors.current ? t(errors.current) : null}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        maxLength={72}
        ltr
      />
      <FormField
        label={t('security.next')}
        hint={t('auth.passwordHint')}
        value={next}
        onChangeText={setNext}
        error={errors.next ? t(errors.next) : null}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        ltr
      />
      <FormField
        label={t('security.confirm')}
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm ? t(errors.confirm) : null}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        ltr
        onSubmitEditing={submit}
      />
      {error ? (
        <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
          {t(error)}
        </Text>
      ) : null}
      <View style={[styles.actions, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <View style={styles.flex}>
          <Button label={t('security.cancel')} variant="secondary" onPress={reset} disabled={busy} />
        </View>
        <View style={styles.flex}>
          <Button label={t('security.save')} onPress={submit} loading={busy} disabled={!current || !next || !confirm} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.five },
  section: { gap: Spacing.two },
  heading: { fontSize: 19, lineHeight: 25, color: C.text },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  card: {
    marginTop: Spacing.one,
    borderRadius: Radius.card,
    borderWidth: Border.thin,
    borderColor: C.border,
    backgroundColor: C.background,
    paddingHorizontal: Spacing.three,
  },
  form: { paddingVertical: Spacing.three, gap: Spacing.three },
  actions: { gap: Spacing.two },
  rowSkeleton: { height: 56, borderRadius: Radius.tile, marginVertical: Spacing.two },
  device: { alignItems: 'flex-start', gap: Spacing.three, paddingVertical: Spacing.three },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  deviceIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  deviceIconCurrent: { backgroundColor: Brand.gold500 },
  badge: { alignSelf: 'auto', paddingHorizontal: Spacing.two, paddingVertical: 1, borderRadius: Radius.pill, backgroundColor: Brand.navy50 },
  badgeText: { fontSize: 12, lineHeight: 16, color: Brand.navy900 },
  signOut: {
    marginTop: Spacing.two,
    minHeight: Tap.compact,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  signOutPressed: { backgroundColor: C.surface },
  signOutText: { fontSize: 14, color: C.danger },
  dim: { opacity: 0.5 },
  note: { alignItems: 'flex-start', gap: Spacing.two, paddingTop: Spacing.one },
});
