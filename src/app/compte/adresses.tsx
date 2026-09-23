import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Text } from '@/components/ui/text';
import { Border, C, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import { useShopSettings } from '@/hooks/use-shop-settings';
import { useI18n } from '@/i18n/provider';
import { useCheckout } from '@/store/checkout';
import { useToast } from '@/store/toast';

/**
 * Adresses — the delivery address this phone remembers for checkout.
 *
 * One address, the one checkout pre-fills, editable here ahead of an order.
 * It lives on the phone only; the shop receives it with an order and not
 * before.
 */
export default function AddressScreen() {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const details = useCheckout((s) => s.details);
  const update = useCheckout((s) => s.update);
  const toast = useToast((s) => s.show);
  const settings = useShopSettings();
  const [draft, setDraft] = useState({
    customerName: details.customerName,
    phone: details.phone,
    governorate: details.governorate,
    address: details.address,
  });
  const [picking, setPicking] = useState(false);
  const empty = !details.customerName && !details.address;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('account.addresses') }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          {empty ? <Text variant="hint">{t('account.noAddress')}</Text> : null}
          <FormField label={t('checkout.name')} value={draft.customerName} onChangeText={(v) => setDraft({ ...draft, customerName: v })} autoComplete="name" />
          <FormField label={t('checkout.phone')} value={draft.phone} onChangeText={(v) => setDraft({ ...draft, phone: v })} keyboardType="phone-pad" ltr />
          <View style={styles.field}>
            <Text variant="hint" tone={C.text}>
              {t('checkout.governorate')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPicking(true)}
              style={({ pressed }) => [styles.select, { flexDirection: rtl ? 'row-reverse' : 'row' }, pressed && styles.pressed]}
            >
              <Text variant="body" tone={draft.governorate ? C.text : C.textFaint} style={styles.flex}>
                {draft.governorate || t('checkout.chooseGovernorate')}
              </Text>
              <Feather name="chevron-down" size={IconSize.large} color={C.textMuted} />
            </Pressable>
          </View>
          <FormField label={t('checkout.address')} hint={t('checkout.addressHint')} value={draft.address} onChangeText={(v) => setDraft({ ...draft, address: v })} multiline />
          <Button
            label={t('account.save')}
            onPress={() => {
              update(draft);
              toast({ message: t('account.saved') });
              router.back();
            }}
          />
        </View>
      </ScrollView>
      <BottomSheet visible={picking} onClose={() => setPicking(false)} title={t('checkout.chooseGovernorate')}>
        <ScrollView style={styles.sheetList}>
          {(settings.status === 'loaded' ? settings.data.governorates : []).map((g) => (
            <Pressable
              key={g}
              accessibilityRole="button"
              onPress={() => {
                setDraft({ ...draft, governorate: g });
                setPicking(false);
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text variant="body">{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.four, gap: Spacing.three },
  flex: { flex: 1 },
  field: { gap: Spacing.one },
  select: {
    minHeight: Tap.primary,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.tile,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  pressed: { backgroundColor: C.surface },
  sheetList: { maxHeight: 420 },
  option: { minHeight: Tap.primary, justifyContent: 'center', paddingHorizontal: Spacing.two, borderRadius: Radius.tile },
});
