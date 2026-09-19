import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ApiFailure } from '@/api/client';
import { C, Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import type { DictKey } from '@/i18n/dictionaries';
import { Button } from './button';
import { Text } from './text';

/**
 * The screens that are not the happy path, which is most of what a parts app
 * actually shows a customer on a workshop's connection.
 */

export function Loading() {
  const { t } = useI18n();
  return (
    <View style={styles.centre}>
      <ActivityIndicator color={C.surfaceBrand} />
      <Text variant="hint" style={styles.centred}>
        {t('state.loading')}
      </Text>
    </View>
  );
}

/**
 * Nothing here, and why.
 *
 * Always two lines: what is missing, and what the customer can do about it.
 * An empty state that says only "Aucun résultat" leaves someone staring at a
 * blank screen deciding whether the app is broken.
 */
export function Empty({ title, body }: { title: string; body?: string | null }) {
  return (
    <View style={styles.centre}>
      <Text variant="sectionTitle" style={styles.centred}>
        {title}
      </Text>
      {body ? (
        <Text variant="hint" style={styles.centred}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A failure, in the customer's language, saying whose problem it is.
 *
 * The distinction is the whole point: "vérifiez votre connexion" is useless
 * advice when the shop's server is down, and "réessayez dans un instant" is
 * useless when the customer is in a basement. `ApiFailure` carries enough to
 * tell them apart, so the screen does.
 *
 * The HTTP status is never printed. "Erreur 503" tells a customer nothing and
 * tells a developer nothing either, because the one who needs it is reading
 * the server's logs.
 */
export function Failed({ failure, onRetry }: { failure: ApiFailure; onRetry: () => void }) {
  const { t } = useI18n();

  const [title, body]: [DictKey, DictKey] =
    failure.kind === 'offline' || failure.kind === 'timeout'
      ? ['state.offlineTitle', 'state.offlineBody']
      : ['state.serverTitle', 'state.serverBody'];

  return (
    <View style={styles.centre}>
      <Text variant="sectionTitle" style={styles.centred}>
        {t(title)}
      </Text>
      <Text variant="hint" style={styles.centred}>
        {t(body)}
      </Text>
      <Button label={t('state.retry')} onPress={onRetry} variant="secondary" style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  centred: {
    textAlign: 'center',
  },
  retry: {
    marginTop: Spacing.three,
    minWidth: 180,
  },
});
