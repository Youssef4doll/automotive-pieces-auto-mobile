import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accountApi } from '@/api/account';
import { ApiError, type ApiFailure } from '@/api/client';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { isEmail } from '@/lib/account';
import { formatDate, ltr } from '@/lib/format';
import { useAccount } from '@/store/account';
import { useProfilePhoto } from '@/store/profile-photo';
import { useToast } from '@/store/toast';

/**
 * Mon compte — the account's own details, each one a row that opens where
 * it is changed, the way a settings page lists them.
 *
 * The name and the e-mail change here, in a sheet (PATCH /account). A new
 * e-mail is proved with the password — or, for an account opened with a
 * phone code, a code sent to its number — because it is where a password
 * reset goes; the shop checks the proof and that the address is free. The
 * phone is changed with a code by SMS, which "Connexion et sécurité"
 * already does; its row goes there. What is shown is what the shop holds:
 * no field is filled in for the customer.
 */
export default function ProfileScreen() {
  const { t, rtl, locale } = useI18n();
  const router = useRouter();
  const status = useAccount((s) => s.status);
  const account = useAccount((s) => s.account);
  const photo = useProfilePhoto((s) => s.photo);
  const [editing, setEditing] = useState<'name' | 'email' | null>(null);

  if (status === 'guest' || (status === 'signedIn' && !account)) return <Redirect href="/compte" />;
  if (!account) return <View style={styles.root} />;

  const initials = account.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const proved = account.verifiedPhone ?? null;
  const phone = proved
    ? `+216 ${proved.slice(4, 6)} ${proved.slice(6, 9)} ${proved.slice(9)}`
    : account.phone
      ? `+216 ${account.phone}`
      : null;

  return (
    <>
      <Stack.Screen options={{ title: t('profile.title') }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.head}>
            <View style={styles.avatar}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatarPhoto} contentFit="cover" />
              ) : (
                <Text style={[styles.initials, { fontFamily: familyFor('headingStrong', false) }]}>{initials}</Text>
              )}
            </View>
            <Text style={[styles.name, { fontFamily: familyFor('heading', rtl) }]}>{account.name}</Text>
            <Text variant="hint" tone={C.textMuted}>
              {t('profile.since', { date: formatDate(account.createdAt, locale) })}
            </Text>
          </View>

          <Section title={t('profile.info')}>
            <InfoRow icon="user" label={t('profile.name')} value={account.name} onPress={() => setEditing('name')} testID="profile-name" />
            <InfoRow
              icon="mail"
              label={t('profile.email')}
              value={account.email}
              onPress={() => setEditing('email')}
              testID="profile-email"
            />
            <InfoRow
              icon="phone"
              label={t('profile.phone')}
              value={phone ? ltr(phone) : null}
              hint={t('profile.phoneHint')}
              onPress={() => router.push('/compte/securite')}
              last
            />
          </Section>

          <Section title={t('profile.security')}>
            <InfoRow icon="lock" label={t('security.row')} hint={t('security.rowHint')} onPress={() => router.push('/compte/securite')} last />
          </Section>

          <Pressable accessibilityRole="button" onPress={() => router.push('/compte/supprimer')} style={({ pressed }) => [styles.delete, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.deleteText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('auth.delete')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <EditSheet field={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { rtl } = useI18n();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign: rtl ? 'right' : 'left', fontFamily: familyFor('heading', rtl) }]}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  hint,
  onPress,
  last = false,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  /** What the shop holds ("Ajouter" when nothing); without one, the row is a door named by its label. */
  value?: string | null;
  hint?: string;
  onPress: () => void;
  last?: boolean;
  testID?: string;
}) {
  const { t, rtl } = useI18n();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value === undefined ? label : [label, value ?? t('profile.none')].join(', ')}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, { flexDirection: rtl ? 'row-reverse' : 'row' }, !last && styles.rule, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Feather name={icon} size={18} color={Brand.navy900} />
      </View>
      <View style={styles.flex}>
        {value === undefined ? (
          <Text numberOfLines={1} style={[styles.value, align, { fontFamily: familyFor('bodySemi', rtl) }]}>
            {label}
          </Text>
        ) : (
          <>
            <Text variant="hint" tone={C.textMuted} style={align}>
              {label}
            </Text>
            <Text numberOfLines={1} style={[styles.value, align, !value && styles.valueEmpty, { fontFamily: familyFor(value ? 'bodySemi' : 'body', rtl) }]}>
              {value ?? t('profile.none')}
            </Text>
          </>
        )}
        {hint ? (
          <Text variant="hint" tone={C.textFaint} style={align}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.medium} color={C.textMuted} />
    </Pressable>
  );
}

/**
 * One field at a time, in a sheet: what it is now, the new one, and — for
 * a new e-mail — the proof. Checked here for the obvious slips; the shop
 * has the last word and its refusal lands under the field.
 */
function EditSheet({ field, onClose }: { field: 'name' | 'email' | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const account = useAccount((s) => s.account);
  const token = useAccount((s) => s.token);
  const setAccount = useAccount((s) => s.setAccount);
  const signOut = useAccount((s) => s.signOut);
  const toast = useToast((s) => s.show);
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<DictKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState<typeof field>(null);

  // A fresh sheet each time one opens (adjusted during render, not in an effect).
  if (field !== opened) {
    setOpened(field);
    setValue(field === 'name' ? (account?.name ?? '') : field === 'email' ? (account?.email ?? '') : '');
    setPassword('');
    setCode('');
    setSentTo(null);
    setError(null);
  }

  const byCode = account?.hasPassword === false;
  const emailChanged = field === 'email' && value.trim().toLowerCase() !== (account?.email ?? '').toLowerCase();

  const failed = async (err: unknown) => {
    const f: ApiFailure = err instanceof ApiError ? err.failure : { kind: 'offline' };
    if (f.kind === 'unauthorized') {
      onClose();
      await signOut();
      return;
    }
    setError(
      f.kind === 'invalid' && f.field === 'name'
        ? 'checkout.err.customerName'
        : f.kind === 'invalid' && f.field === 'email'
          ? f.reason === 'taken'
            ? 'profile.err.taken'
            : 'checkout.err.email'
          : f.kind === 'invalid' && f.field === 'password'
            ? 'auth.err.wrongPassword'
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

  const sendCode = async () => {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      const { to } = await accountApi.sendConfirmCode(token, locale);
      setSentTo(to);
    } catch (err) {
      await failed(err);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!token || !field) return;
    const next = value.trim();
    if (field === 'name') {
      const letters = (next.match(/\p{L}/gu) ?? []).length;
      if (next.includes('@')) return setError('checkout.err.customerNameEmail');
      if (next.length < 2 || letters < 2) return setError('checkout.err.customerName');
    }
    if (field === 'email' && !isEmail(next)) return setError('checkout.err.email');
    setError(null);
    setBusy(true);
    try {
      const { account: saved } = await accountApi.updateProfile(
        token,
        field === 'name'
          ? { name: next }
          : { email: next, ...(emailChanged ? (byCode ? { code } : { password }) : {}) },
      );
      setAccount(saved);
      toast({ message: t('profile.saved'), tone: 'success' });
      onClose();
    } catch (err) {
      await failed(err);
    } finally {
      setBusy(false);
    }
  };

  const proofReady = !emailChanged || (byCode ? code.length === 6 : password.length > 0);

  return (
    <BottomSheet visible={field !== null} onClose={onClose} title={field === 'email' ? t('profile.editEmail') : t('profile.editName')}>
      <View style={styles.sheet}>
        {field === 'name' ? (
          <FormField
            label={t('auth.name')}
            value={value}
            onChangeText={setValue}
            autoComplete="name"
            textContentType="name"
            maxLength={80}
            onSubmitEditing={() => void save()}
            testID="profile-name-input"
          />
        ) : (
          <FormField
            label={t('auth.email')}
            value={value}
            onChangeText={setValue}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={200}
            ltr
            testID="profile-email-input"
          />
        )}

        {emailChanged ? (
          byCode ? (
            <View style={styles.proof}>
              <Text variant="hint">{t('profile.emailProofCode')}</Text>
              {sentTo ? (
                <FormField
                  label={t('delete.code')}
                  hint={t('delete.codeLead', { phone: sentTo })}
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  ltr
                />
              ) : (
                <Button label={t('delete.sendCode')} variant="secondary" loading={busy} onPress={() => void sendCode()} />
              )}
            </View>
          ) : (
            <View style={styles.proof}>
              <Text variant="hint">{t('profile.emailProof')}</Text>
              <FormField
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                onSubmitEditing={() => void save()}
                testID="profile-password-input"
              />
            </View>
          )
        ) : null}

        {error ? (
          <Text variant="hint" tone={C.danger} accessibilityLiveRegion="polite">
            {t(error)}
          </Text>
        ) : null}
        <Button label={t('profile.save')} loading={busy} disabled={!proofReady} onPress={() => void save()} testID="profile-save" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.four },
  flex: { flex: 1, minWidth: 0, gap: 1 },
  head: { alignItems: 'center', gap: Spacing.one, paddingTop: Spacing.two },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: Brand.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarPhoto: { width: 88, height: 88 },
  initials: { fontSize: 30, lineHeight: 36, color: Brand.white },
  name: { fontSize: 22, lineHeight: 28, color: C.text, textAlign: 'center' },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 17, lineHeight: 23, color: C.text },
  card: { borderRadius: Radius.card, borderWidth: Border.thin, borderColor: C.border, backgroundColor: Brand.white, overflow: 'hidden' },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min + 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  pressed: { backgroundColor: C.surface },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 15, lineHeight: 20, color: C.text },
  valueEmpty: { color: C.textMuted },
  delete: { alignSelf: 'center', minHeight: Tap.min, justifyContent: 'center', paddingHorizontal: Spacing.three },
  deleteText: { fontSize: 15, color: C.danger },
  sheet: { gap: Spacing.three, paddingBottom: Spacing.two },
  proof: { gap: Spacing.two },
});
