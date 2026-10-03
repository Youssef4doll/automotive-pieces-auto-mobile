import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Brand, C, IconSize, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { formatDate } from '@/lib/format';
import { Text } from './text';

export type ThreadQuestion = {
  body: string;
  createdAt: string;
  photoCount: number;
  reply: string | null;
  repliedAt: string | null;
  handled: boolean;
};

/**
 * One question to the shop and what became of it: the customer's words on
 * the trailing side, the shop's written answer on the leading side with the
 * gold edge the shop's own voice carries elsewhere — or, with no written
 * answer, the plain state: waiting, or dealt with by phone. Nothing here
 * guesses when an answer will come.
 */
export function QuestionThread({ q, fresh = false }: { q: ThreadQuestion; fresh?: boolean }) {
  const { t, rtl, locale } = useI18n();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View style={styles.thread}>
      <View style={[styles.mine, rtl ? styles.mineRtl : null]}>
        <Text variant="label" tone={C.textMuted} style={align}>
          {`${t('questions.you')} · ${formatDate(q.createdAt, locale, true)}`}
        </Text>
        <Text variant="body" tone={C.text} style={align}>
          {q.body}
        </Text>
        {q.photoCount ? (
          <View style={[row, styles.meta]}>
            <Feather name="image" size={IconSize.small} color={C.textMuted} />
            <Text variant="hint">{t('questions.photos', { n: q.photoCount })}</Text>
          </View>
        ) : null}
      </View>

      {q.reply ? (
        <View style={[styles.theirs, rtl ? styles.theirsRtl : null]}>
          <View style={[row, styles.meta]}>
            <Text variant="label" tone={C.text} style={[styles.flex, align]}>
              {`${t('questions.reply')}${q.repliedAt ? ` · ${formatDate(q.repliedAt, locale, true)}` : ''}`}
            </Text>
            {fresh ? (
              <View style={styles.newPill}>
                <Text variant="label" tone={Brand.navy950}>
                  {t('questions.new')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text variant="body" tone={C.text} style={align}>
            {q.reply}
          </Text>
        </View>
      ) : (
        <View style={[row, styles.state]}>
          <Feather name={q.handled ? 'check-circle' : 'clock'} size={IconSize.small} color={q.handled ? C.success : C.textMuted} />
          <Text variant="hint" tone={q.handled ? C.success : C.textMuted} style={align}>
            {q.handled ? t('questions.handled') : t('questions.waiting')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  mine: {
    alignSelf: 'flex-end',
    maxWidth: '92%',
    gap: 4,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    borderBottomRightRadius: 4,
    backgroundColor: C.surface,
  },
  mineRtl: { alignSelf: 'flex-start', borderBottomRightRadius: Radius.tile, borderBottomLeftRadius: 4 },
  theirs: {
    alignSelf: 'flex-start',
    maxWidth: '92%',
    gap: 4,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    borderBottomLeftRadius: 4,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: Brand.gold500,
  },
  theirsRtl: {
    alignSelf: 'flex-end',
    borderBottomLeftRadius: Radius.tile,
    borderBottomRightRadius: 4,
    borderLeftWidth: 1,
    borderLeftColor: C.border,
    borderRightWidth: 4,
    borderRightColor: Brand.gold500,
  },
  meta: { alignItems: 'center', gap: Spacing.one },
  state: { alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.one },
  newPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, backgroundColor: Brand.gold500 },
});
