import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Border, Brand, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { NavCar } from '@/illustrations/vehicle';
import { localeMeta, locales } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { pickAvatar } from '@/lib/photo';
import { useAccount } from '@/store/account';
import { useGarage } from '@/store/garage';
import { useOrders } from '@/store/orders';
import { unreadAnswers, useQuestions } from '@/store/questions';
import { useStaff } from '@/store/staff';
import { useProfilePhoto } from '@/store/profile-photo';
import { useTabBarSpace } from '@/hooks/use-tab-bar-space';

/**
 * Mon compte — the reference's list, row for row.
 *
 * Signed in, the profile at the top is the account, and the foot of the
 * list holds "Se déconnecter" and "Supprimer mon compte" — one tap from the
 * tab, as both stores require. Signed out, it is "Invité" and nobody else:
 * ordering takes an account, so a guest has no orders, addresses or details
 * here, and the row at the top is the way in.
 *
 * Every row opens something real: the orders placed or recovered here, the
 * active car, the garage, the saved delivery address, the shop's contact
 * details (as far as the owner has published them).
 *
 * The language is a row here, with the one in use beside it, and opens a
 * sheet of the three — not a "Paramètres" screen that held nothing else. The
 * app's version, which that screen also showed, sits at the foot.
 */
export default function AccountScreen() {
  const tabBarSpace = useTabBarSpace();
  const { t, rtl, locale, setLocale, needsRestartForRTL } = useI18n();
  const router = useRouter();
  const [languageSheet, setLanguageSheet] = useState(false);
  const orders = useOrders((s) => s.orders);
  const vehicles = useGarage((s) => s.vehicles);
  const active = useGarage((s) => s.active);
  const settings = useShopSettings();
  const [photoSheet, setPhotoSheet] = useState(false);
  const photo = useProfilePhoto((s) => s.photo);
  const setPhoto = useProfilePhoto((s) => s.set);
  const clearPhoto = useProfilePhoto((s) => s.clear);
  const choosePhoto = async () => {
    setPhotoSheet(false);
    const picked = await pickAvatar().catch(() => null);
    if (picked) setPhoto(picked);
  };
  const questions = useQuestions((s) => s.questions);
  const unread = unreadAnswers(questions);
  const staffSignedIn = useStaff((s) => s.status === 'signedIn');
  const restoreStaff = useStaff((s) => s.restore);
  const accountStatus = useAccount((s) => s.status);
  const account = useAccount((s) => s.account);
  const signOut = useAccount((s) => s.signOut);
  const syncOrders = useAccount((s) => s.syncOrders);
  const signedIn = accountStatus === 'signedIn';
  // Orders placed on another device show up here when the tab is opened.
  useEffect(() => {
    if (signedIn) void syncOrders();
  }, [signedIn, syncOrders]);
  // Only asks the shop when a staff token is saved on this phone.
  useEffect(() => {
    restoreStaff();
  }, [restoreStaff]);

  // Signed in, the account speaks. Signed out, nobody: "Invité", with no
  // name or number — not even ones a checkout once remembered.
  const name = signedIn && account ? account.name : '';
  const contactLine = signedIn && account ? (account.email ?? (account.phone ? `+216 ${account.phone}` : '')) : '';
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : null;
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]}>
      <View style={styles.column}>
        <View style={[styles.profile, row]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('profile.photo')}. ${t('profile.photoWhy')}`}
            onPress={() => (photo ? setPhotoSheet(true) : choosePhoto())}
            style={({ pressed }) => [styles.avatar, pressed && { opacity: 0.8 }]}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarPhoto} contentFit="cover" />
            ) : initials ? (
              <Text style={{ fontFamily: familyFor('headingStrong', false), fontSize: 20, color: Brand.white }}>{initials}</Text>
            ) : (
              <Feather name="user" size={26} color={Brand.white} />
            )}
            <View style={styles.avatarEdit}>
              <Feather name="camera" size={12} color={Brand.navy950} />
            </View>
          </Pressable>
          <View style={styles.flex}>
            <Text style={[styles.name, { fontFamily: familyFor('heading', rtl) }]}>{name || t('account.guestName')}</Text>
            <Text variant="hint" numberOfLines={2}>
              {contactLine || t('account.guestWhy')}
            </Text>
          </View>
        </View>

        {accountStatus === 'guest' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('auth.row')}, ${t('auth.rowHint')}`}
            onPress={() => router.push('/compte/connexion')}
            style={({ pressed }) => [styles.signIn, row, pressed && styles.pressed]}
          >
            <Feather name="log-in" size={IconSize.large} color={C.text} />
            <View style={styles.flex}>
              <Text variant="rowTitle">{t('auth.row')}</Text>
              <Text variant="hint">{t('auth.rowHint')}</Text>
            </View>
            <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
          </Pressable>
        ) : null}

        <View style={styles.list}>
          {/* Orders and addresses are the account's: a guest has neither. */}
          {signedIn ? (
            <Row
              icon="file-text"
              label={t('account.orders')}
              value={orders.length ? String(orders.length) : null}
              onPress={() => router.push('/compte/commandes')}
            />
          ) : null}
          {/* One row for the cars: the one the app answers for, and how many
              are saved. Two rows opening the same garage read as a bug. */}
          <Row
            icon="car"
            label={t('account.vehicles')}
            value={
              active
                ? `${active.makeName} ${active.modelName}${vehicles.length > 1 ? ` · ${vehicles.length}` : ''}`
                : t('account.noVehicle')
            }
            onPress={() => router.navigate('/garage')}
          />
          {signedIn ? <Row icon="map-pin" label={t('account.addresses')} onPress={() => router.push('/compte/adresses')} /> : null}
          {signedIn ? (
            <Row
              icon="lock"
              label={t('security.row')}
              value={t('security.rowHint')}
              onPress={() => router.push('/compte/securite')}
            />
          ) : null}
          <Row icon="rotate-ccw" label={t('returns.title')} onPress={() => router.push('/garanties')} />
          {questions.length ? (
            <Row
              icon="message-square"
              label={t('account.questions')}
              value={unread ? t('account.questionsNew', { n: unread }) : String(questions.length)}
              onPress={() => router.push('/compte/questions')}
            />
          ) : null}
          <Row icon="help-circle" label={t('account.helpContact')} onPress={() => router.push('/aide')} />
          <Row
            icon="translate"
            label={t('lang.title')}
            value={localeMeta[locale].label}
            onPress={() => setLanguageSheet(true)}
            last
          />
        </View>
        {needsRestartForRTL ? (
          <Text variant="hint" style={styles.restart}>
            {t('lang.rtlRestart')}
          </Text>
        ) : null}

        {/* The shop's own door, for the shop only: it appears when the
            account signed in here is an admin (its password sign-in opened
            the staff session too), or a staff session is live on this phone.
            A customer never sees it. The shop checks the role on every
            request behind it regardless. */}
        {account?.staff || staffSignedIn ? (
          <View style={styles.staff}>
            <Row
              icon="briefcase"
              label={t('staff.entry')}
              value={staffSignedIn ? t('staff.connected') : t('staff.entryHint')}
              onPress={() => router.push('/gestion')}
              last
            />
          </View>
        ) : null}

        {signedIn ? (
          <View style={styles.accountActions}>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                // "À bientôt" is drawn over the app (components/auth-moment).
                await signOut();
              }}
              style={styles.danger}
            >
              <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 15, color: C.text, textAlign: 'center' }}>
                {t('auth.signOut')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/compte/supprimer')} style={styles.danger}>
              <Text style={{ fontFamily: familyFor('bodySemi', rtl), fontSize: 15, color: C.danger, textAlign: 'center' }}>
                {t('auth.delete')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {settings.status === 'loaded' ? (
          <Text variant="hint" tone={C.textFaint} style={styles.policies}>
            {t('account.policies', { m: settings.data.warrantyMonths, d: settings.data.returnDays })}
          </Text>
        ) : null}
        <Text variant="hint" tone={C.textFaint} style={styles.version}>
          {`${t('app.name')} · ${Constants.expoConfig?.version ?? ''}`}
        </Text>
      </View>

      <BottomSheet visible={languageSheet} onClose={() => setLanguageSheet(false)} title={t('lang.title')}>
        <View accessibilityRole="radiogroup" style={styles.languages}>
          {locales.map((code, i) => {
            const chosen = code === locale;
            return (
              <Pressable
                key={code}
                accessibilityRole="radio"
                accessibilityState={{ checked: chosen }}
                aria-checked={chosen}
                onPress={() => {
                  setLocale(code);
                  setLanguageSheet(false);
                }}
                style={({ pressed }) => [
                  styles.language,
                  { flexDirection: rtl ? 'row-reverse' : 'row' },
                  i < locales.length - 1 && styles.rowRule,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.languageName,
                    { fontFamily: familyFor(chosen ? 'bodySemi' : 'body', code === 'ar'), textAlign: rtl ? 'right' : 'left' },
                  ]}
                >
                  {localeMeta[code].label}
                </Text>
                {chosen ? <Feather name="check" size={IconSize.large} color={C.text} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <BottomSheet visible={photoSheet} onClose={() => setPhotoSheet(false)} title={t('profile.photo')}>
        <View style={styles.sheet}>
          <Text variant="hint">{t('profile.photoWhy')}</Text>
          <Button label={t('profile.photoChoose')} icon="image" onPress={choosePhoto} />
          <Button
            label={t('profile.photoRemove')}
            variant="secondary"
            onPress={() => {
              clearPhoto();
              setPhotoSheet(false);
            }}
          />
        </View>
      </BottomSheet>

    </ScrollView>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'] | 'car' | 'translate';
  label: string;
  value?: string | null;
  onPress: () => void;
  last?: boolean;
}) {
  const { rtl } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { flexDirection: rtl ? 'row-reverse' : 'row' },
        !last && styles.rowRule,
        pressed && styles.pressed,
      ]}
    >
      {icon === 'car' ? (
        <NavCar size={IconSize.large} color={C.text} />
      ) : icon === 'translate' ? (
        // 文A, the sign every app uses for language.
        <MaterialCommunityIcons name="translate" size={IconSize.large} color={C.text} />
      ) : (
        <Feather name={icon} size={IconSize.large} color={C.text} />
      )}
      <Text variant="body" tone={C.text} style={styles.flex}>
        {label}
      </Text>
      {value ? (
        <Text variant="hint" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
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
    paddingHorizontal: Spacing.four,
  },
  flex: { flex: 1 },
  profile: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.navy700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: { width: 64, height: 64, borderRadius: 32 },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.gold500,
    borderWidth: 2,
    borderColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 19, lineHeight: 25, color: C.text },
  list: { marginTop: Spacing.two },
  staff: { marginTop: Spacing.four, borderTopWidth: Border.hairline, borderTopColor: C.border },
  row: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.two },
  rowRule: { borderBottomWidth: Border.hairline, borderBottomColor: C.border },
  pressed: { backgroundColor: C.surface },
  value: { maxWidth: '40%' },
  restart: { paddingTop: Spacing.two },
  version: { textAlign: 'center', paddingTop: Spacing.two, paddingBottom: Spacing.two },
  languages: { paddingBottom: Spacing.two },
  language: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.primary + Spacing.two },
  languageName: { flex: 1, fontSize: 17, lineHeight: 24, color: C.text },
  danger: { marginTop: Spacing.four, minHeight: Tap.min, justifyContent: 'center' },
  accountActions: { marginTop: Spacing.two },
  signIn: {
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: Tap.primary + Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: Border.hairline,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  policies: { textAlign: 'center', paddingTop: Spacing.four },
  sheet: { gap: Spacing.three, paddingBottom: Spacing.two },
});
