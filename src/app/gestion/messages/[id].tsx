import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { staffApi, type MessageDetail } from '@/api/staff';
import { Card, staffStyles } from '@/components/staff/kit';
import { PrivatePhoto } from '@/components/staff/private-photo';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { whatsappUrl } from '@/components/ui/shop-contact';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { Brand, C, IconSize, Radius, Spacing, Tap } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { formatDate } from '@/lib/format';
import { useToast } from '@/store/toast';

/**
 * One message, with what it takes to answer it from the counter: the
 * customer's words and photos, the order (opened in one tap when the asker
 * proved it is theirs), the part and the car; then the ways back — call or
 * WhatsApp the number they left, and for a question asked in the app, a
 * written answer they read under their question, with a notification.
 */
export default function StaffMessage() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback((signal: AbortSignal) => staffApi.message(id, signal), [id]);
  const detail = useLive(load);
  return (
    <>
      <Stack.Screen options={{ title: t('staff.menu.messages') }} />
      {detail.status === 'loading' ? (
        <Loading />
      ) : detail.status === 'failed' ? (
        <Failed failure={detail.failure} onRetry={detail.retry} />
      ) : (
        <Detail m={detail.data} onChange={detail.set} />
      )}
    </>
  );
}

function Detail({ m, onChange }: { m: MessageDetail; onChange: (d: MessageDetail) => void }) {
  const { t, rtl, locale } = useI18n();
  const router = useRouter();
  const toast = useToast((s) => s.show);
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<'reply' | 'status' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handled = m.status === 'HANDLED';
  const digits = (m.phone ?? '').replace(/\D/g, '');

  const send = async (input: { reply: string } | { status: 'NEW' | 'HANDLED' }) => {
    setBusy('reply' in input ? 'reply' : 'status');
    setError(null);
    try {
      onChange(await staffApi.answerMessage(m.id, input));
      if ('reply' in input) {
        setReply('');
        toast({ message: t('staff.msg.sent') });
      }
    } catch {
      setError(t('state.serverBody'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={staffStyles.root} contentContainerStyle={staffStyles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.head}>
        <Text variant="sectionTitle" style={align}>
          {m.subject}
        </Text>
        <Text variant="hint" style={align}>
          {`${formatDate(m.createdAt, locale, true)} · ${t(m.inApp ? 'staff.msg.inApp' : 'staff.msg.web')}`}
        </Text>
      </View>

      <Card>
        <Text variant="rowTitle" style={align}>
          {m.name}
        </Text>
        <Text variant="hint" style={align}>
          {[m.phone, m.email, t(m.signedIn ? 'staff.msg.customer' : 'staff.msg.visitor')].filter(Boolean).join(' · ')}
        </Text>
        <Text variant="body" tone={C.text} style={[styles.body, align]}>
          {m.body}
        </Text>
        {m.photoIds.length ? (
          <View style={[row, styles.photos]}>
            {m.photoIds.map((pid) => (
              <PrivatePhoto key={pid} path={staffApi.messagePhotoUrl(m.id, pid)} style={styles.photo} label={t('staff.msg.photos', { n: 1 })} />
            ))}
          </View>
        ) : null}
        {m.order ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/gestion/commandes/[id]', params: { id: m.order!.id } })}
            style={[row, styles.link]}
          >
            <Feather name="file-text" size={IconSize.medium} color={C.text} />
            <Text variant="body" tone={C.text} style={[styles.underline, align]}>
              {t('staff.msg.order', { ref: m.order.ref })}
            </Text>
          </Pressable>
        ) : m.orderRef ? (
          <Text variant="hint" style={align}>
            {t('staff.msg.typedOrder', { ref: m.orderRef })}
          </Text>
        ) : null}
        {m.productSku ? (
          <Text variant="hint" style={align}>
            {t('staff.msg.part', { sku: m.productSku })}
          </Text>
        ) : null}
        {m.vehicle ? (
          <Text variant="hint" style={align}>
            {t('staff.msg.car', { car: m.vehicle })}
          </Text>
        ) : null}
      </Card>

      {digits ? (
        <View style={[row, styles.ways]}>
          <Button label={t('staff.msg.call')} icon="phone" variant="secondary" onPress={() => void Linking.openURL(`tel:${digits}`)} style={styles.flex} />
          <Button
            label={t('staff.msg.whatsapp')}
            icon="message-circle"
            variant="secondary"
            onPress={() => void Linking.openURL(whatsappUrl(digits, `${m.name}, `)).catch(() => undefined)}
            style={styles.flex}
          />
        </View>
      ) : null}

      {m.reply ? (
        <View style={[styles.answer, rtl && styles.answerRtl]}>
          <Text variant="label" tone={C.textMuted} style={align}>
            {t('staff.msg.yourReply', { when: m.repliedAt ? formatDate(m.repliedAt, locale, true) : '' })}
          </Text>
          <Text variant="body" tone={C.text} style={align}>
            {m.reply}
          </Text>
        </View>
      ) : null}

      {m.inApp ? (
        <Card>
          <FormField
            label={t(m.reply ? 'staff.msg.correct' : 'staff.msg.reply')}
            hint={t('staff.msg.replyHint')}
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={2000}
            placeholder={t('staff.msg.replyPlaceholder')}
            testID="staff-reply"
          />
          <Button label={t('staff.msg.send')} icon="send" loading={busy === 'reply'} disabled={!reply.trim()} onPress={() => void send({ reply: reply.trim() })} />
        </Card>
      ) : (
        <Text variant="hint" style={align}>
          {t('staff.msg.webOnly')}
        </Text>
      )}

      {error ? (
        <Text variant="hint" tone={C.danger} style={align}>
          {error}
        </Text>
      ) : null}
      <Button
        label={t(handled ? 'staff.msg.reopen' : 'staff.msg.markDone')}
        icon={handled ? 'rotate-ccw' : 'check'}
        variant="secondary"
        loading={busy === 'status'}
        onPress={() => void send({ status: handled ? 'NEW' : 'HANDLED' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  flex: { flex: 1 },
  body: { marginTop: Spacing.one },
  photos: { gap: Spacing.two, flexWrap: 'wrap', marginTop: Spacing.one },
  photo: { width: 104, height: 104, borderRadius: Radius.tile },
  link: { alignItems: 'center', gap: Spacing.two, minHeight: Tap.min },
  underline: { textDecorationLine: 'underline' },
  ways: { gap: Spacing.two },
  answer: {
    gap: 4,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.background,
    borderLeftWidth: 4,
    borderLeftColor: Brand.gold500,
  },
  answerRtl: { borderLeftWidth: 0, borderRightWidth: 4, borderRightColor: Brand.gold500 },
});
