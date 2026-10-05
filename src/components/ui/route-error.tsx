import type { ErrorBoundaryProps } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, Spacing } from '@/constants/theme';
import { useMaybeI18n } from '@/i18n/provider';
import { track } from '@/services/analytics';
import { Button } from './button';
import { EmptyState } from './empty-state';
import { CarKey } from '@/illustrations/car-key';

/**
 * What a screen shows when its own code throws, instead of a white page.
 *
 * Exported as `ErrorBoundary` from the layouts and the product page
 * (expo-router's convention). It says it is the app's fault, not the
 * customer's, offers "Réessayer" (which re-renders the route), and reports
 * the error name and route to the shop's analytics so a crash is seen
 * without the customer having to describe it. Never the stack trace on
 * screen. The root boundary can sit outside the language provider, so the
 * French words are the fallback.
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  const i18n = useMaybeI18n();
  const insets = useSafeAreaInsets();
  const t = (key: 'error.title' | 'error.body' | 'state.retry') => (i18n ? i18n.t(key) : FALLBACK[key]);

  useEffect(() => {
    track('app_error', { message: String(error?.message ?? error).slice(0, 180), name: error?.name ?? 'Error' });
  }, [error]);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <EmptyState
        art={<CarKey size={108} />}
        title={t('error.title')}
        body={t('error.body')}
      >
        <Button label={t('state.retry')} onPress={() => void retry()} />
      </EmptyState>
    </View>
  );
}

const FALLBACK = {
  'error.title': 'Un problème est survenu sur cet écran',
  'error.body': 'C’est de notre côté, pas du vôtre. Réessayez ; votre panier et votre véhicule sont conservés.',
  'state.retry': 'Réessayer',
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', backgroundColor: C.background, paddingHorizontal: Spacing.three },
});
