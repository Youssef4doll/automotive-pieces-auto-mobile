import { StyleSheet, View } from 'react-native';

import { Brand, Spacing } from '@/constants/theme';
import { Text } from './text';

/**
 * An empty screen that still looks like the shop: the drawing on a soft
 * halo, a title that says what is missing, a line that says why it will not
 * stay that way, and the ways on. A `scene` — a whole drawing with its own
 * ground and sparkles, like the artist's box — stands on the page instead.
 */
export function EmptyState({
  art,
  title,
  body,
  scene = false,
  children,
}: {
  art: React.ReactNode;
  /** The art is a full scene: no halo behind it. */
  scene?: boolean;
  title: string;
  body?: string | null;
  /** The actions — buttons, full width. */
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.root}>
      {scene ? (
        <View style={styles.scene}>{art}</View>
      ) : (
        <View style={styles.halo}>
          <View style={styles.disc}>{art}</View>
        </View>
      )}
      <Text variant="sectionTitle" style={styles.centred}>
        {title}
      </Text>
      {body ? (
        <Text variant="hint" style={[styles.centred, styles.body]}>
          {body}
        </Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.five },
  halo: {
    width: 184,
    height: 184,
    borderRadius: 92,
    backgroundColor: Brand.navy50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  disc: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.navy950,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  scene: { alignItems: 'center', marginBottom: Spacing.two },
  centred: { textAlign: 'center' },
  body: { maxWidth: 300 },
  actions: { alignSelf: 'stretch', gap: Spacing.two, marginTop: Spacing.three, maxWidth: 420, width: '100%', marginHorizontal: 'auto' },
});
