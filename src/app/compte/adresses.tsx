import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accountApi, type SavedAddress } from '@/api/account';
import { ApiError } from '@/api/client';
import { PinCard } from '@/components/pin-card';
import { PinPicker } from '@/components/pin-picker';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Border, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useResource } from '@/hooks/use-resource';
import { useShopSettings } from '@/hooks/use-shop-settings';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { DELEGATIONS } from '@/lib/delegations';
import { governorateFromRegion, type LatLng } from '@/lib/map-tiles';
import { accountToken } from '@/store/account';
import { useToast } from '@/store/toast';

type Draft = {
  id: string | null;
  label: string;
  governorate: string;
  delegation: string;
  address: string;
  landmark: string;
  pin: LatLng | null;
};

const EMPTY: Draft = { id: null, label: '', governorate: '', delegation: '', address: '', landmark: '', pin: null };
const PRESETS: DictKey[] = ['addr.labelHome', 'addr.labelWork', 'addr.labelOther'];

/**
 * Mes adresses — the account's delivery addresses (the owner, October 2026:
 * "saved addresses, landmark notes, GPS + map pin"), kept by the shop
 * (api/v1/account/addresses) so they follow the customer to a new phone and
 * to the website. Each with a name ("Maison", "Travail"), the governorate
 * and delegation, the street, a landmark for the driver and, when placed, a
 * pin on the map. At checkout they are one tap; the last one used comes
 * first.
 */
export default function AddressesScreen() {
  const { t, rtl } = useI18n();
  const toast = useToast((s) => s.show);
  const settings = useShopSettings();
  // Read again after each change: a new `load` is a new request (hooks/use-resource).
  const [version, setVersion] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) => {
      void version; // each change asks again
      const token = accountToken();
      if (!token) throw new ApiError({ kind: 'unauthorized' }, 'signed out');
      return (await accountApi.addresses(token, signal)).addresses;
    },
    [version],
  );
  const list = useResource(load);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pick, setPick] = useState<'governorate' | 'delegation' | 'map' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const start = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const governorates = settings.status === 'loaded' ? settings.data.governorates : [];
  const addresses = list.status === 'loaded' ? list.data : [];

  const edit = (a: SavedAddress | null) => {
    setError(null);
    setPick(null);
    setDraft(
      a
        ? { id: a.id, label: a.label, governorate: a.governorate, delegation: a.delegation ?? '', address: a.address, landmark: a.landmark ?? '', pin: a.pin }
        : { ...EMPTY, label: t(addresses.some((x) => x.label === t('addr.labelHome')) ? 'addr.labelWork' : 'addr.labelHome') },
    );
  };

  const save = async () => {
    if (!draft) return;
    const token = accountToken();
    if (!token) return;
    if (!draft.label.trim()) return setError('addr.err.label');
    if (!draft.governorate) return setError('checkout.err.governorate');
    if (DELEGATIONS[draft.governorate] && !draft.delegation) return setError('checkout.err.delegation');
    if (draft.address.trim().length < 5) return setError('checkout.err.address');
    setBusy(true);
    setError(null);
    const input = {
      label: draft.label.trim(),
      governorate: draft.governorate,
      delegation: draft.delegation || undefined,
      address: draft.address.trim(),
      landmark: draft.landmark.trim() || undefined,
      latitude: draft.pin?.lat ?? null,
      longitude: draft.pin?.lng ?? null,
    };
    try {
      if (draft.id) await accountApi.updateAddress(token, draft.id, input);
      else await accountApi.addAddress(token, input);
      toast({ message: t('addr.saved') });
      setDraft(null);
      setVersion((v) => v + 1);
    } catch (e) {
      const failure = e instanceof ApiError ? e.failure : null;
      setError(
        failure?.kind === 'invalid' && failure.reason === 'too_many'
          ? 'addr.err.too_many'
          : failure?.kind === 'invalid' && failure.field === 'governorate'
            ? 'checkout.err.governorate'
            : failure?.kind === 'invalid'
              ? 'checkout.err.address'
              : failure?.kind === 'offline'
                ? 'state.offlineBody'
                : 'state.serverBody',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const token = accountToken();
    if (!token || !draft?.id) return;
    setBusy(true);
    try {
      await accountApi.deleteAddress(token, draft.id);
      toast({ message: t('addr.deleted') });
      setDraft(null);
      setVersion((v) => v + 1);
    } catch {
      setError('state.serverBody');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('addr.mine') }} />
      {list.status === 'loading' ? (
        <Loading />
      ) : list.status === 'failed' ? (
        <Failed failure={list.failure} onRetry={list.retry} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.scroll}>
          <View style={styles.column}>
            {addresses.length === 0 ? (
              <Text variant="body" style={start}>
                {t('addr.empty')}
              </Text>
            ) : (
              <View style={styles.card}>
                {addresses.map((a, i) => (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${a.label}, ${a.address}, ${a.governorate}`}
                    onPress={() => edit(a)}
                    style={({ pressed }) => [styles.item, row, i < addresses.length - 1 && styles.rule, pressed && styles.pressed]}
                    testID={`address-${i}`}
                  >
                    <View style={styles.icon}>
                      <Feather name={a.label === t('addr.labelWork') ? 'briefcase' : a.label === t('addr.labelHome') ? 'home' : 'map-pin'} size={19} color={C.text} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.label, start, { fontFamily: familyFor('bodySemi', rtl) }]}>{a.label}</Text>
                      <Text variant="hint" tone={C.text} numberOfLines={2} style={start}>
                        {[a.address, a.delegation, a.governorate].filter(Boolean).join(', ')}
                      </Text>
                      {a.landmark || a.pin ? (
                        <Text variant="hint" numberOfLines={1} style={start}>
                          {[a.landmark, a.pin ? t('addr.pinSet') : null].filter(Boolean).join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
            {addresses.length < 10 ? <Button label={t('addr.new')} icon="plus" variant="secondary" onPress={() => edit(null)} testID="address-new" /> : null}
          </View>
        </ScrollView>
      )}

      <BottomSheet
        visible={draft != null}
        onClose={() => (pick ? setPick(null) : setDraft(null))}
        title={t(pick === 'governorate' ? 'checkout.chooseGovernorate' : pick === 'delegation' ? 'checkout.chooseDelegation' : pick === 'map' ? 'addr.pinTitle' : draft?.id ? 'addr.edit' : 'addr.new')}
      >
        {draft && pick === 'map' ? (
          <PinPicker
            initial={draft.pin}
            governorate={draft.governorate}
            onConfirm={(pin, place) => {
              // What the phone says is there fills what is still empty, in view, to be checked.
              const named = draft.governorate ? null : governorateFromRegion(place?.region ?? null, governorates);
              const street = draft.address.trim() ? null : place?.street;
              setDraft({ ...draft, pin, ...(named ? { governorate: named, delegation: '' } : {}), ...(street ? { address: street } : {}) });
              setPick(null);
            }}
            onRemove={() => {
              setDraft({ ...draft, pin: null });
              setPick(null);
            }}
          />
        ) : draft && pick ? (
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={styles.sheetList}>
            {(pick === 'governorate' ? governorates : (DELEGATIONS[draft.governorate] ?? [])).map((g) => (
              <Pressable
                key={g}
                accessibilityRole="button"
                accessibilityState={{ selected: g === (pick === 'governorate' ? draft.governorate : draft.delegation) }}
                onPress={() => {
                  setDraft(pick === 'governorate' ? { ...draft, governorate: g, delegation: g === draft.governorate ? draft.delegation : '' } : { ...draft, delegation: g });
                  setPick(null);
                }}
                style={({ pressed }) => [styles.option, row, pressed && styles.pressed]}
              >
                <Text variant="body" style={styles.flex}>
                  {g}
                </Text>
                {g === (pick === 'governorate' ? draft.governorate : draft.delegation) ? <Feather name="check" size={IconSize.medium} color={C.text} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : draft ? (
          <ScrollView keyboardDismissMode="on-drag" style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fields}>
              {/* The door first, on the map, as at checkout. */}
              <PinCard pin={draft.pin} height={130} onPress={() => setPick('map')} testID="address-pin" />
              <View style={[row, styles.presets]}>
                {PRESETS.map((key) => {
                  const on = draft.label === t(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setDraft({ ...draft, label: t(key) })}
                      style={[styles.preset, on && styles.presetOn]}
                    >
                      <Text variant="hint" tone={on ? C.onAccent : C.text}>
                        {t(key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField label={t('addr.label')} value={draft.label} onChangeText={(v) => setDraft({ ...draft, label: v })} maxLength={40} />
              <Select label={t('checkout.governorate')} value={draft.governorate} placeholder={t('checkout.chooseGovernorate')} onPress={() => setPick('governorate')} />
              {DELEGATIONS[draft.governorate] ? (
                <Select label={t('checkout.delegation')} value={draft.delegation} placeholder={t('checkout.chooseDelegation')} onPress={() => setPick('delegation')} />
              ) : null}
              <FormField label={t('addr.street')} value={draft.address} onChangeText={(v) => setDraft({ ...draft, address: v })} multiline maxLength={300} />
              <FormField label={t('addr.landmark')} placeholder={t('addr.landmarkHint')} value={draft.landmark} onChangeText={(v) => setDraft({ ...draft, landmark: v })} maxLength={200} />
              {error ? (
                <Text variant="hint" tone={C.danger} accessibilityLiveRegion="assertive">
                  {t(error)}
                </Text>
              ) : null}
              <Button label={t('account.save')} onPress={save} loading={busy} testID="address-save" />
              {draft.id ? (
                <Pressable accessibilityRole="button" onPress={remove} disabled={busy} style={styles.delete}>
                  <Text variant="body" tone={C.danger}>
                    {t('addr.delete')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function Select({ label, value, placeholder, onPress }: { label: string; value: string; placeholder: string; onPress: () => void }) {
  const { rtl } = useI18n();
  return (
    <View style={styles.field}>
      <Text variant="hint" tone={C.text}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={onPress}
        style={({ pressed }) => [styles.select, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
      >
        <Text variant="body" tone={value ? C.text : C.textFaint} style={styles.flex}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={IconSize.large} color={C.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  card: { borderRadius: Radius.card, borderWidth: Border.thin, borderColor: C.border, overflow: 'hidden' },
  item: { alignItems: 'center', gap: Spacing.three, minHeight: Tap.min + 24, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 21, color: C.text },
  pressed: { backgroundColor: C.surface },
  sheetList: { maxHeight: 420 },
  sheetBody: { maxHeight: 560 },
  fields: { gap: Spacing.three, paddingBottom: Spacing.three },
  field: { gap: Spacing.one },
  select: {
    minHeight: Tap.primary,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  option: { minHeight: Tap.primary, alignItems: 'center', paddingHorizontal: Spacing.two, borderRadius: Radius.tile },
  presets: { gap: Spacing.two, flexWrap: 'wrap' },
  preset: { minHeight: Tap.min - 8, paddingHorizontal: Spacing.three, borderRadius: Radius.pill, borderWidth: Border.thin, borderColor: C.border, justifyContent: 'center' },
  presetOn: { backgroundColor: C.text, borderColor: C.text },
  delete: { minHeight: Tap.min, alignItems: 'center', justifyContent: 'center' },
});
