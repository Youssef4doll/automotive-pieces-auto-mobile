import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Brand, C, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { MAP_PIN, MapPin } from '@/illustrations/address-art';
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

      <CentrePin width={width} height={height} size={56} />

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

/** The pin, its point on the centre of the map. */
function CentrePin({ width, height, size }: { width: number; height: number; size: number }) {
  const scale = size / MAP_PIN.height;
  return (
    <View pointerEvents="none" style={[styles.pin, { left: width / 2 - MAP_PIN.tipX * scale, top: height / 2 - MAP_PIN.tipY * scale }]}>
      <MapPin size={size} />
    </View>
  );
}

/**
 * The same map, still: the pin the customer placed, as Glovo shows the
 * delivery spot at the top of its checkout. Nothing on it moves; the screen
 * around it decides what a tap does.
 */
export function MapPreview({ center, height = 150, zoom = 16 }: { center: LatLng; height?: number; zoom?: number }) {
  const { t } = useI18n();
  const [width, setWidth] = useState(0);
  const tiles = width ? tilesFor(center, zoom, width, height) : [];
  const headers = Platform.OS === 'web' ? undefined : { 'User-Agent': 'AutomotivePiecesAuto/1.0 (app de la boutique)' };
  return (
    <View pointerEvents="none" style={[styles.map, { height }]} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} testID="map-preview">
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
      {width ? <CentrePin width={width} height={height} size={44} /> : null}
      <Text style={styles.credit}>{t('addr.mapCredit')}</Text>
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
  pin: { position: 'absolute' },
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
