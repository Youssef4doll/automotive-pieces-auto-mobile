import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { questionsApi, type Question } from '@/api/questions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { QuestionThread, useWhen } from '@/components/ui/question-thread';
import { Failed, Loading } from '@/components/ui/states';
import { StickyBar } from '@/components/ui/sticky-bar';
import { Text } from '@/components/ui/text';
import { Border, C, familyFor, IconSize, MaxContentWidth, Radius, Spacing, Tap } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { PhotoAdviceArt } from '@/illustrations/ways-art';
import { useQuestions, type AskedQuestion } from '@/store/questions';

/**
 * Mes questions — what was asked to the shop from this phone, each with the
 * shop's answer as it stands now (read fresh each time the screen opens and
 * on pull, with each question's own token). Opening the screen counts as
 * reading the answers: the "nouvelle réponse" marks and the badge on Compte
 * go once they have been shown.
 *
 * Sorted the way an inbox is read (the owner, October 2026: "more organized
 * and aesthetic"): new answers first, then what is still waiting, then what
 * the shop has dealt with — newest first in each. "Poser une question" stays
 * under the thumb at the foot of the screen.
 */
type Row = { asked: AskedQuestion; live: Question | null };
type Group = 'new' | 'waiting' | 'done';

const GROUPS: { key: Group; title: DictKey }[] = [
  { key: 'new', title: 'questions.section.new' },
  { key: 'waiting', title: 'questions.section.waiting' },
  { key: 'done', title: 'questions.section.done' },
];

function groupOf({ asked, live }: Row): Group {
  if (live?.repliedAt && live.repliedAt !== asked.answeredAt) return 'new';
  if (live?.reply || live?.handled) return 'done';
  return 'waiting';
}

export default function QuestionsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const asked = useQuestions((s) => s.questions);
  const answered = useQuestions((s) => s.answered);
  const ids = asked.map((q) => q.id).join(',');

  const load = useCallback(
    async (signal: AbortSignal): Promise<Row[]> => {
      const store = useQuestions.getState();
      return Promise.all(
        store.questions.map(async (q) => {
          const token = await store.tokenFor(q.id);
          const live = token ? await questionsApi.get(q.id, token, signal).catch(() => null) : null;
          return { asked: q, live };
        }),
      );
    },
    // Re-read when a question is added or dropped, not when one is marked read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  );
  const rows = useLive(load);

  // Shown is read: remember the answers this phone has now displayed. The
  // groups are taken from the rows as they were loaded, so a new answer stays
  // under "Nouvelles réponses" for as long as the screen is open.
  useEffect(() => {
    if (rows.status !== 'loaded') return;
    for (const r of rows.data) if (r.live?.repliedAt) answered(r.asked.id, r.live.repliedAt);
  }, [rows, answered]);

  const ask = () => router.push('/demande');

  if (asked.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: t('questions.title') }} />
        <View style={styles.empty}>
          <EmptyState art={<PhotoAdviceArt width={112} />} title={t('questions.emptyTitle')} body={t('questions.emptyBody')}>
            <Button label={t('questions.ask')} icon="message-square" onPress={ask} />
          </EmptyState>
        </View>
      </>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: t('questions.title') }} />
      {rows.status === 'loading' ? (
        <Loading />
      ) : rows.status === 'failed' ? (
        <Failed failure={rows.failure} onRetry={rows.retry} />
      ) : (
        <Groups rows={rows.data} />
      )}
      <StickyBar>
        <Button label={t('questions.ask')} icon="message-square" onPress={ask} testID="questions-ask" />
      </StickyBar>
    </View>
  );
}

function Groups({ rows }: { rows: Row[] }) {
  const { t, rtl } = useI18n();
  // Grouped once, as loaded: marking an answer read must not move its card.
  const byGroup = new Map<Group, Row[]>();
  for (const r of [...rows].sort((a, b) => b.asked.createdAt.localeCompare(a.asked.createdAt))) {
    const g = groupOf(r);
    byGroup.set(g, [...(byGroup.get(g) ?? []), r]);
  }
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.column}>
        {GROUPS.filter((g) => byGroup.get(g.key)?.length).map((g) => (
          <View key={g.key} style={styles.group} testID={`questions-${g.key}`}>
            <Text style={[styles.groupTitle, { fontFamily: familyFor('bodySemi', rtl), textAlign: rtl ? 'right' : 'left' }]}>
              {`${t(g.title)} · ${byGroup.get(g.key)!.length}`}
            </Text>
            {byGroup.get(g.key)!.map((r) => (
              <QuestionCard key={r.asked.id} row={r} fresh={g.key === 'new'} />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * One question: what it is about (an order, a part, or just the shop) with
 * its icon, the thread, and — for an order — the way to it.
 */
function QuestionCard({ row: { asked: a, live }, fresh }: { row: Row; fresh: boolean }) {
  const { t, rtl } = useI18n();
  const router = useRouter();
  const said = useWhen();
  const flex = { flexDirection: rtl ? ('row-reverse' as const) : ('row' as const) };
  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };
  const about = a.orderRef
    ? { icon: 'package' as const, title: t('questions.order', { ref: a.orderRef }) }
    : a.productSku
      ? { icon: 'tool' as const, title: t('questions.part', { sku: a.productSku }) }
      : { icon: 'message-circle' as const, title: t('questions.general') };

  return (
    <View style={[styles.card, fresh && styles.cardFresh]} testID="question-card">
      <View style={[flex, styles.head]}>
        <View style={styles.icon}>
          <Feather name={about.icon} size={IconSize.medium} color={C.text} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.title, { fontFamily: familyFor('bodySemi', rtl) }, align]} numberOfLines={1}>
            {about.title}
          </Text>
          <Text variant="hint" style={align}>
            {said(a.createdAt)}
          </Text>
        </View>
      </View>

      {live ? (
        <QuestionThread q={live} fresh={fresh} dated={false} />
      ) : (
        <View style={styles.unreadable}>
          <Text variant="body" tone={C.text} style={align}>
            {a.excerpt}
          </Text>
          <Text variant="hint" style={align}>
            {t('questions.unreadable')}
          </Text>
        </View>
      )}

      {a.orderRef ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/suivi/[ref]', params: { ref: a.orderRef! } })}
          style={({ pressed }) => [flex, styles.link, pressed && styles.pressed]}
        >
          <Text style={[styles.flex, styles.linkText, { fontFamily: familyFor('bodySemi', rtl) }, align]}>{t('questions.seeOrder')}</Text>
          <Feather name={rtl ? 'chevron-left' : 'chevron-right'} size={IconSize.large} color={C.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  empty: { flex: 1, justifyContent: 'center', backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.four },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.four },
  group: { gap: Spacing.three },
  groupTitle: { fontSize: 13, lineHeight: 18, color: C.textMuted },
  flex: { flex: 1, minWidth: 0 },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: C.background,
    borderWidth: Border.thin,
    borderColor: C.border,
  },
  cardFresh: { borderColor: C.accent, borderWidth: Border.selected },
  head: { alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  title: { fontSize: 15, lineHeight: 20, color: C.text },
  unreadable: { gap: Spacing.one },
  link: {
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Tap.min,
    marginTop: -Spacing.two,
    marginBottom: -Spacing.two,
    borderTopWidth: Border.hairline,
    borderTopColor: C.border,
  },
  linkText: { fontSize: 14, lineHeight: 20, color: C.text },
  pressed: { opacity: 0.7 },
});
