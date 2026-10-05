import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressScale } from '@/components/ui/press-scale';
import { Text } from '@/components/ui/text';
import { Brand, C, Elevation, familyFor, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFindWays } from '@/components/find-ways';
import { useI18n } from '@/i18n/provider';

/**
 * "Comment trouver votre pièce ?" — the four ways in, as four tiles, each
 * with the shop artist's drawing of it, for anybody who would rather read
 * than swipe the home screen's arc. A tile goes straight down its path in
 * one tap. The fourth ("je ne sais pas comment ça s'appelle") sends a photo
 * to the shop's inbox (/demande, photo first).
 *
 * Two tiles a row on a phone, four on a wide screen. With a car in the
 * garage, the first tile names it, since that is where it leads.
 */
const GAP = Spacing.three;

export default function FindScreen() {
  const { t, rtl } = useI18n();
  const { ways, go } = useFindWays();
  const [width, setWidth] = useState(0);

  const columns = width >= 600 ? 4 : 2;
  const tile = width ? (width - GAP * (columns - 1)) / columns : 0;
  const art = Math.min(tile - Spacing.three * 2, 150);

  const align = { textAlign: rtl ? ('right' as const) : ('left' as const) };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: t('look.find') }} />
      <View style={styles.column}>
        <Text variant="body" tone={C.textMuted} style={align}>
          {t('look.findLead')}
        </Text>
        <View style={[styles.grid, { flexDirection: rtl ? 'row-reverse' : 'row' }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {tile
            ? ways.map((w) => (
                <PressScale
                  key={w.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(w.title)}. ${w.why}`}
                  onPress={() => go(w.key)}
                  style={[styles.tile, { width: tile }]}
                  pressedStyle={styles.pressed}
                  scaleTo={0.97}
                >
                  <View style={[styles.art, { height: art }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {w.art(art)}
                  </View>
                  <View style={styles.words}>
                    <Text style={[styles.title, align, { fontFamily: familyFor('heading', rtl) }]}>{t(w.title)}</Text>
                    <Text variant="hint" style={align} numberOfLines={2}>
                      {w.why}
                    </Text>
                  </View>
                  <View style={[styles.go, { alignSelf: rtl ? 'flex-start' : 'flex-end' }]}>
                    <Feather name={rtl ? 'arrow-left' : 'arrow-right'} size={18} color={Brand.navy900} />
                  </View>
                </PressScale>
              ))
            : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  scroll: { paddingVertical: Spacing.three },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  grid: { flexWrap: 'wrap', gap: GAP },
  tile: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderRadius: Radius.card,
    backgroundColor: Brand.white,
    ...Elevation.resting,
  },
  pressed: { backgroundColor: C.surfacePressed },
  art: { alignItems: 'center', justifyContent: 'center', borderRadius: Radius.tile, backgroundColor: C.surface },
  // minWidth 0: a long title wraps inside the tile rather than widening it.
  words: { flex: 1, gap: 2, minWidth: 0 },
  title: { fontSize: 17, lineHeight: 22, color: C.text },
  go: { width: 32, height: 32, borderRadius: 16, backgroundColor: Brand.gold500, alignItems: 'center', justifyContent: 'center' },
});
