import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { staffApi, type Family } from '@/api/staff';
import { Card, Tag, staffStyles } from '@/components/staff/kit';
import { Button } from '@/components/ui/button';
import { PartImage } from '@/components/ui/part-image';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Spacing } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { photoForm, pickPhoto } from '@/lib/photo';
import { useToast } from '@/store/toast';

/**
 * The picture on each family's tile, on the website's home and the app's.
 * The same upload as /admin/catalogue: a new picture replaces the old one,
 * and removing it brings back the shop's own drawing (/api/part-icon), never
 * a blank tile. The storefront caches the catalogue for two minutes, so a
 * change shows there shortly after, not instantly.
 */
export default function StaffFamilies() {
  const { t } = useI18n();
  const load = useCallback((signal: AbortSignal) => staffApi.families(signal), []);
  const families = useLive(load);

  return (
    <>
      <Stack.Screen options={{ title: t('staff.menu.families') }} />
      {families.status === 'loading' ? (
        <Loading />
      ) : families.status === 'failed' ? (
        <Failed failure={families.failure} onRetry={families.retry} />
      ) : (
        <ScrollView style={staffStyles.root} contentContainerStyle={staffStyles.scroll}>
          <Text variant="body" tone={C.textMuted}>
            {t('staff.fam.why')}
          </Text>
          {families.data.map((f) => (
            <FamilyCard
              key={f.id}
              family={f}
              onChange={(imageUrl) => families.set(families.data.map((x) => (x.id === f.id ? { ...x, imageUrl } : x)))}
            />
          ))}
        </ScrollView>
      )}
    </>
  );
}

function FamilyCard({ family, onChange }: { family: Family; onChange: (imageUrl: string | null) => void }) {
  const { t, rtl } = useI18n();
  const toast = useToast((s) => s.show);
  const [busy, setBusy] = useState<'change' | 'remove' | null>(null);
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  const failed = (err: unknown) => {
    if (err instanceof ApiError && err.failure.kind === 'unauthorized') return;
    const bad = err instanceof ApiError && err.failure.kind === 'invalid';
    toast({ message: t(bad ? 'staff.p.photoBad' : 'staff.err.save'), tone: 'neutral' });
  };

  const change = async () => {
    try {
      const picked = await pickPhoto('library');
      if (!picked) return;
      setBusy('change');
      const { imageUrl } = await staffApi.familyPicture(family.id, await photoForm('file', picked));
      onChange(imageUrl);
      toast({ message: t('staff.fam.updated', { name: family.name }), tone: 'success' });
    } catch (err) {
      failed(err);
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => {
    setBusy('remove');
    try {
      await staffApi.removeFamilyPicture(family.id);
      onChange(null);
      toast({ message: t('staff.fam.removed', { name: family.name }), tone: 'success' });
    } catch (err) {
      failed(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <View style={[row, styles.head]}>
        <View style={styles.tile}>
          <PartImage
            // Keyed on the picture so a replaced one is fetched, not served from the old cache entry.
            key={family.imageUrl ?? 'drawn'}
            slug={family.slug}
            imageUrl={family.imageUrl}
            size={family.imageUrl ? 72 : 44}
            label={family.name}
            fit={family.imageUrl ? 'cover' : 'contain'}
          />
        </View>
        <View style={[styles.flex, { alignItems: rtl ? 'flex-end' : 'flex-start', gap: 4 }]}>
          <Text variant="rowTitle">{family.name}</Text>
          <Text variant="hint">{t('staff.fam.subN', { n: family.children.length })}</Text>
          <Tag label={family.imageUrl ? t('staff.fam.uploaded') : t('staff.fam.drawn')} tone="muted" />
        </View>
      </View>
      <View style={[row, styles.gap]}>
        <Button label={t('staff.fam.change')} icon="image" variant="secondary" onPress={change} loading={busy === 'change'} style={styles.flex} />
        {family.imageUrl ? (
          <Button label={t('staff.fam.remove')} variant="secondary" onPress={remove} loading={busy === 'remove'} style={styles.flex} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { alignItems: 'center', gap: Spacing.three },
  gap: { gap: Spacing.two },
  tile: { width: 72, height: 72, borderRadius: 18, overflow: 'hidden', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
});
