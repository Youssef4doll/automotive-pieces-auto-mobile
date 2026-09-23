import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { ApiError } from '@/api/client';
import { staffApi, type Setting } from '@/api/staff';
import { Card, staffStyles } from '@/components/staff/kit';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useToast } from '@/store/toast';

/**
 * The shop's own facts, as /admin/parametres edits them — same keys, same
 * rules on the shop's side. A contact field still carrying the setup
 * placeholder says so, because the storefront hides it until it is real
 * (BRIEF.md: never print a made-up phone number); the owner should see at a
 * glance which ones customers cannot use yet.
 */
const GROUPS: { title: DictKey; keys: string[]; hint?: DictKey }[] = [
  { title: 'staff.set.shop', keys: ['shop_name', 'shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address', 'shop_hours', 'shop_founded_year'] },
  {
    title: 'staff.set.delivery',
    keys: ['free_shipping_threshold', 'delivery_grand_tunis', 'delivery_regions', 'supplier_lead_time'],
    hint: 'staff.set.leadHint',
  },
  { title: 'staff.set.tax', keys: ['shop_tax_id', 'vat_rate', 'stamp_duty'], hint: 'staff.set.taxHint' },
];
const LTR = new Set(['shop_phone', 'shop_whatsapp', 'shop_email', 'shop_tax_id', 'vat_rate', 'stamp_duty', 'free_shipping_threshold', 'shop_founded_year']);
const NUMERIC = new Set(['vat_rate', 'stamp_duty', 'free_shipping_threshold', 'shop_founded_year']);
/** Where a placeholder matters: these are hidden from customers until filled. */
const CONTACT = new Set(['shop_phone', 'shop_whatsapp', 'shop_email', 'shop_address']);

export default function StaffShop() {
  const { t } = useI18n();
  const load = useCallback((signal: AbortSignal) => staffApi.settings(signal), []);
  const settings = useLive(load);

  return (
    <>
      <Stack.Screen options={{ title: t('staff.menu.settings') }} />
      {settings.status === 'loading' ? (
        <Loading />
      ) : settings.status === 'failed' ? (
        <Failed failure={settings.failure} onRetry={settings.retry} />
      ) : (
        <Form settings={settings.data} onSaved={settings.set} />
      )}
    </>
  );
}

function Form({ settings, onSaved }: { settings: Setting[]; onSaved: (s: Setting[]) => void }) {
  const { t } = useI18n();
  const toast = useToast((s) => s.show);
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(settings.map((s) => [s.key, s.value])));
  const [saving, setSaving] = useState(false);
  const [badKey, setBadKey] = useState<string | null>(null);
  useEffect(() => setValues(Object.fromEntries(settings.map((s) => [s.key, s.value]))), [settings]);

  const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => byKey[k] && byKey[k].value !== v));
  const save = async () => {
    setSaving(true);
    setBadKey(null);
    try {
      onSaved(await staffApi.saveSettings(changed));
      toast({ message: t('staff.set.saved'), tone: 'success' });
    } catch (err) {
      if (err instanceof ApiError && err.failure.kind === 'invalid') setBadKey(err.failure.field);
      if (!(err instanceof ApiError && err.failure.kind === 'unauthorized')) toast({ message: t('staff.err.save'), tone: 'neutral' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={staffStyles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={staffStyles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="body" tone={C.textMuted}>
          {t('staff.set.why')}
        </Text>
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <Text variant="label" tone={C.textMuted}>
              {t(g.title)}
            </Text>
            {g.keys
              .filter((k) => byKey[k])
              .map((k) => {
                // A placeholder is shown as an empty box with the warning under
                // it — the owner types their number, not around "⚠ à compléter".
                const placeholder = CONTACT.has(k) && byKey[k].placeholder && values[k] === byKey[k].value;
                return (
                  <FormField
                    key={k}
                    label={t(`staff.set.${k}` as DictKey)}
                    value={placeholder ? '' : values[k]}
                    placeholder={placeholder ? byKey[k].value : undefined}
                    onChangeText={(v) => setValues((s) => ({ ...s, [k]: v }))}
                    keyboardType={NUMERIC.has(k) ? 'decimal-pad' : k === 'shop_email' ? 'email-address' : k === 'shop_phone' || k === 'shop_whatsapp' ? 'phone-pad' : 'default'}
                    autoCapitalize={LTR.has(k) ? 'none' : 'sentences'}
                    hint={placeholder ? t('staff.set.placeholder') : null}
                    error={badKey === k ? t('staff.err.save') : null}
                    maxLength={500}
                    ltr={LTR.has(k)}
                  />
                );
              })}
            {g.hint ? <Text variant="hint">{t(g.hint)}</Text> : null}
          </Card>
        ))}
        <Button label={t('staff.p.save')} onPress={save} loading={saving} disabled={Object.keys(changed).length === 0} icon="save" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

