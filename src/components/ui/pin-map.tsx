import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { Brand, C, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { project, roundCoord, tilesFor, unproject, type LatLng } from '@/lib/map-tiles';

const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

/**
 * A map with the pin held in its middle: the customer drags the map until
 * the pin sits on their door, as the delivery apps do it (the owner, October
 * 2026: "GPS + map pin"). What the courier opens is that point.
 *
 * Drawn from map tiles (lib/map-tiles) rather than a native map, so it is
 * the same on the iPhone, on Android and on the web, needs no key and no new
 * native module. The map's credit stays in its corner, as its licence asks.
 */
export function PinMap({ center, onMove, height = 260 }: { center: LatLng; onMove: (c: LatLng) => void; height?: number }) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState(17);
  const [live, setLive] = useState(center);
  // The latest values for the gesture handlers, which are made once.
  const state = useRef({ live: center, zoom: 17, start: { x: 0, y: 0 }, onMove });
  useEffect(() => {
    state.current.live = live;
    state.current.zoom = zoom;
    state.current.onMove = onMove;
  }, [live, zoom, onMove]);
  // A new centre from outside (the phone's position): the map goes there.
  const [given, setGiven] = useState(center);
  if (given !== center) {
    setGiven(center);
    setLive(center);
  }

  const responder = useMemo(
    () =>
      // The handlers read the ref when the finger moves, never during render (as components/tab-bar).
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The sheet around the map scrolls; on the map, a drag moves the map.
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          state.current.start = project(state.current.live, state.current.zoom);
        },
        onPanResponderMove: (_, g) => {
          const s = state.current.start;
          setLive(unproject({ x: s.x - g.dx, y: s.y - g.dy }, state.current.zoom));
        },
        onPanResponderRelease: (_, g) => {
          const s = state.current.start;
          const p = unproject({ x: s.x - g.dx, y: s.y - g.dy }, state.current.zoom);
          const settled = { lat: roundCoord(p.lat), lng: roundCoord(p.lng) };
          setLive(settled);
          state.current.onMove(settled);
        },
      }),
    [],
  );

  const tiles = width ? tilesFor(live, zoom, width, height) : [];
  const headers = Platform.OS === 'web' ? undefined : { 'User-Agent': 'AutomotivePiecesAuto/1.0 (app de la boutique)' };

  return (
    <View
      style={[styles.map, { height }]}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessibilityLabel={t('addr.pinHint')}
      testID="pin-map"
    >
      <View style={[StyleSheet.absoluteFill, styles.drag]} {...responder.panHandlers}>
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url, headers }}
            style={[styles.tile, { left: tile.x, top: tile.y }]}
            cachePolicy="memory-disk"
            transition={120}
            accessibilityIgnoresInvertColors
          />
        ))}
      </View>

      {/* The pin, its point on the centre of the map. */}
      <View pointerEvents="none" style={[styles.pin, { left: width / 2 - 20, top: height / 2 - 46 }]}>
        <Svg width={40} height={52} viewBox="0 0 40 52">
          <Ellipse cx={20} cy={49} rx={7} ry={2.5} fill="rgba(8,22,51,0.28)" />
          <Path d="M20 2C11.2 2 4 9 4 17.8 4 29.5 20 46 20 46s16-16.5 16-28.2C36 9 28.8 2 20 2Z" fill={Brand.navy900} stroke={Brand.white} strokeWidth={2.5} />
          <Circle cx={20} cy={17.5} r={6} fill={Brand.gold500} />
        </Svg>
      </View>

      <View style={styles.zoom}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addr.zoomIn')}
          onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
          style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]}
        >
          <Feather name="plus" size={20} color={C.text} />
        </Pressable>
        <View style={styles.zoomRule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addr.zoomOut')}
          onPress={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
          style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]}
        >
          <Feather name="minus" size={20} color={C.text} />
        </Pressable>
      </View>

      <Text style={styles.credit} pointerEvents="none">
        {t('addr.mapCredit')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.card,
    // A street-map grey while the tiles come in, or where they cannot.
    backgroundColor: '#E6EAF0',
  },
  drag: {
    ...(Platform.OS === 'web' ? ({ cursor: 'grab', touchAction: 'none', userSelect: 'none' } as object) : {}),
  },
  tile: { position: 'absolute', width: 256, height: 256 },
  pin: { position: 'absolute', width: 40, height: 52 },
  zoom: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    borderRadius: Radius.tile,
    backgroundColor: Brand.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    overflow: 'hidden',
  },
  zoomBtn: { width: Tap.min, height: Tap.min, alignItems: 'center', justifyContent: 'center' },
  zoomRule: { height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  pressed: { backgroundColor: C.surface },
  credit: {
    position: 'absolute',
    right: 4,
    bottom: 3,
    paddingHorizontal: 4,
    borderRadius: 3,
    fontSize: 10,
    lineHeight: 13,
    color: C.text,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
