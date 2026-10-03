import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { questionsApi, type Question } from '@/api/questions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { QuestionThread } from '@/components/ui/question-thread';
import { Failed, Loading } from '@/components/ui/states';
import { Text } from '@/components/ui/text';
import { C, Elevation, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useLive } from '@/hooks/use-live';
import { useI18n } from '@/i18n/provider';
import { RENDERS } from '@/illustrations/renders';
import { useQuestions, type AskedQuestion } from '@/store/questions';

/**
 * Mes questions — what was asked to the shop from this phone, each with the
 * shop's answer as it stands now (read fresh each time the screen opens and
 * on pull, with each question's own token). Opening the screen counts as
 * reading the answers: the "nouvelle réponse" marks and the badge on Compte
 * go once they have been shown.
 */
type Row = { asked: AskedQuestion; live: Question | null };

export default function QuestionsScreen() {
  const { t, rtl } = useI18n();
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

  // Shown is read: remember the answers this phone has now displayed.
  useEffect(() => {
    if (rows.status !== 'loaded') return;
    for (const r of rows.data) if (r.live?.repliedAt) answered(r.asked.id, r.live.repliedAt);
  }, [rows, answered]);

  return (
    <>
      <Stack.Screen options={{ title: t('questions.title') }} />
      {asked.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            art={<Image source={RENDERS.phone} style={{ width: 112, height: 112 }} contentFit="contain" />}
            title={t('questions.emptyTitle')}
            body={t('questions.emptyBody')}
          >
            <Button label={t('questions.ask')} icon="message-square" onPress={() => router.push('/demande')} />
          </EmptyState>
        </View>
      ) : rows.status === 'loading' ? (
        <Loading />
      ) : rows.status === 'failed' ? (
        <Failed failure={rows.failure} onRetry={rows.retry} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.column}>
            {rows.data.map(({ asked: a, live }) => (
              <Pressable
                key={a.id}
                accessibilityRole={a.orderRef ? 'button' : undefined}
                disabled={!a.orderRef}
                onPress={() => a.orderRef && router.push({ pathname: '/suivi/[ref]', params: { ref: a.orderRef } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                testID="question-card"
              >
                {a.orderRef || a.productSku ? (
                  <Text variant="label" tone={C.textMuted} style={{ textAlign: rtl ? 'right' : 'left' }}>
                    {a.orderRef ? t('ask.aboutOrder', { ref: a.orderRef }) : t('ask.aboutPart', { sku: a.productSku! })}
                  </Text>
                ) : null}
                {live ? (
                  <QuestionThread q={live} fresh={Boolean(live.repliedAt && live.repliedAt !== a.answeredAt)} />
                ) : (
                  <>
                    <Text variant="body" tone={C.text} style={{ textAlign: rtl ? 'right' : 'left' }}>
                      {a.excerpt}
                    </Text>
                    <Text variant="hint">{t('questions.unreadable')}</Text>
                  </>
                )}
              </Pressable>
            ))}
            <Button label={t('questions.ask')} icon="message-square" variant="secondary" onPress={() => router.push('/demande')} />
          </View>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: 'center', backgroundColor: C.background },
  scroll: { paddingBottom: Spacing.six, backgroundColor: C.background },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, gap: Spacing.three },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card, backgroundColor: C.background, ...Elevation.resting },
  pressed: { opacity: 0.85 },
});
