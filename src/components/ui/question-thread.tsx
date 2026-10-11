import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Brand, C, familyFor, IconSize, Radius, Spacing } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { LogoMark } from '@/illustrations/logo';
import { when } from '@/lib/when';
import { Text } from './text';

export type ThreadQuestion = {
  body: string;
  createdAt: string;
  photoCount: number;
  reply: string | null;
  repliedAt: string | null;
  handled: boolean;
};

/** "Aujourd’hui à 16:00", "Hier à 9:12", "8 oct." */
export function useWhen() {
  const { t, locale } = useI18n();
  return (iso: string) => {
    const w = when(iso, locale);
    return w.day ? t(`when.${w.day}` as DictKey, { time: w.time }) : w.date;
  };
}

/**
 * One question to the shop and what became of it: the customer's words,
 * then the shop's written answer in a tinted block under the shop's mark —
 * or, with no written answer, the plain state: waiting, or dealt with by
 * phone. Nothing here guesses when an answer will come. `dated={false}`
 * leaves out "Vous · <date>" where the card around it already says when.
 */
export function QuestionThread({ q, fresh = false, dated = true }: { q: ThreadQuestion; fresh?: boolean; dated?: boolean }) {
  const { t, rtl } = useI18n();
  const said = useWhen();
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const row = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };

  return (
    <View style={styles.thread}>
      <View style={styles.asked}>
        {dated ? (
          <Text variant="hint" style={align}>
            {`${t('questions.you')} · ${said(q.createdAt)}`}
          </Text>
        ) : null}
        <Text style={[styles.words, { fontFamily: familyFor('body', rtl) }, align]}>{q.body}</Text>
        {q.photoCount ? (
          <View style={[row, styles.meta]}>
            <Feather name="image" size={IconSize.small} color={C.textMuted} />
            <Text variant="hint">{t('questions.photos', { n: q.photoCount })}</Text>
          </View>
        ) : null}
      </View>

      {q.reply ? (
        <View style={styles.answer} testID="question-reply">
          <View style={[row, styles.meta]}>
            <View style={styles.mark}>
              <LogoMark size={16} />
            </View>
            <Text style={[styles.flex, styles.from, { fontFamily: familyFor('bodySemi', rtl) }, align]}>{t('questions.reply')}</Text>
            {fresh ? (
              <View style={styles.newPill}>
                <Text style={[styles.newText, { fontFamily: familyFor('bodySemi', rtl) }]}>{t('questions.newShort')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.words, { fontFamily: familyFor('body', rtl) }, align]}>{q.reply}</Text>
          {q.repliedAt ? (
            <Text variant="hint" style={align}>
              {said(q.repliedAt)}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={[row, styles.state, q.handled ? styles.stateDone : null, rtl ? styles.stateRtl : null]}>
          <Feather name={q.handled ? 'check-circle' : 'clock'} size={IconSize.small} color={q.handled ? C.success : C.textMuted} />
          <Text variant="hint" tone={q.handled ? C.success : C.textMuted} style={[styles.shrink, align]}>
            {q.handled ? t('questions.handled') : t('questions.waiting')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: Spacing.three },
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  asked: { gap: Spacing.one },
  words: { fontSize: 15, lineHeight: 22, color: C.text },
  meta: { alignItems: 'center', gap: Spacing.two },
  answer: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.tile,
    backgroundColor: C.surface,
  },
  mark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.navy900 },
  from: { fontSize: 13, lineHeight: 18, color: C.text },
  newPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Brand.gold500 },
  newText: { fontSize: 11, lineHeight: 15, color: Brand.navy950 },
  state: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: C.surface,
  },
  stateRtl: { alignSelf: 'flex-end' },
  stateDone: { backgroundColor: C.successSurface },
});
