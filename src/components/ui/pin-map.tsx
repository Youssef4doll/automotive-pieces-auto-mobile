import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Brand, C, Radius, Spacing, Tap } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { MAP_PIN, MapPin } from '@/illustrations/address-art';
import { project, roundCoord, TILE, tilesFor, unproject, type LatLng } from '@/lib/map-tiles';

const MIN_ZOOM = 12;
const MAX_ZOOM = 19;

/**
 * A map with the pin held in its middle: the customer drags the map until
 * the pin sits on their door, as the delivery apps do it (the owner, October
 * 2026: "GPS + map pin"). What the courier opens is that point.
 *
 * It zooms as Google Maps does (the owner, October 2026): two fingers pinch
 * it in and out, a double tap goes closer, the mouse wheel on the web, and
 * the + and − for a thumb. The zoom is continuous — the nearest level of
 * tiles drawn larger or smaller — and always about the pin, which never
 * leaves the door.
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
  const state = useRef({
    live: center,
    zoom: 17,
    onMove,
    start: { x: 0, y: 0 },
    // Where the finger was when the drag was last anchored (a pinch re-anchors it).
    from: { dx: 0, dy: 0 },
    pinch: null as { dist: number; zoom: number } | null,
    pinched: false,
    lastTap: 0,
  });
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

  const zoomTo = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
    state.current.zoom = next;
    setZoom(next);
  };

  const responder = useMemo(
    () => {
      const s = state.current;
      const anchor = (dx: number, dy: number) => {
        s.start = project(s.live, s.zoom);
        s.from = { dx, dy };
      };
      const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
      // The handlers read the ref when the finger moves, never during render (as components/tab-bar).
      // eslint-disable-next-line react-hooks/refs
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The sheet around the map scrolls; on the map, a drag moves the map.
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          s.pinch = null;
          s.pinched = false;
          anchor(0, 0);
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          if (touches && touches.length >= 2) {
            // Two fingers: the zoom follows their spread, about the pin.
            const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
            if (!s.pinch) s.pinch = { dist: Math.max(dist, 1), zoom: s.zoom };
            const z = clamp(s.pinch.zoom + Math.log2(Math.max(dist, 1) / s.pinch.dist));
            s.zoom = z;
            s.pinched = true;
            setZoom(z);
            return;
          }
          if (s.pinch) {
            // Back to one finger: the drag goes on from here, at the new zoom.
            s.pinch = null;
            anchor(g.dx, g.dy);
          }
          const p = unproject({ x: s.start.x - (g.dx - s.from.dx), y: s.start.y - (g.dy - s.from.dy) }, s.zoom);
          s.live = p;
          setLive(p);
        },
        onPanResponderRelease: (e, g) => {
          const still = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
          if (still && !s.pinched) {
            // A double tap goes one level closer.
            const now = e.nativeEvent.timestamp;
            if (now - s.lastTap < 300) {
              const z = clamp(Math.round(s.zoom) + 1);
              s.zoom = z;
              setZoom(z);
              s.lastTap = 0;
            } else s.lastTap = now;
            return;
          }
          const settled = { lat: roundCoord(s.live.lat), lng: roundCoord(s.live.lng) };
          s.live = settled;
          setLive(settled);
          s.onMove(settled);
        },
      });
    },
    [],
  );

  // The nearest level of tiles, drawn at the scale the zoom asks for.
  const level = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
  const scale = 2 ** (zoom - level);
  const tiles = width ? tilesFor(live, level, width / scale, height / scale) : [];
  const headers = Platform.OS === 'web' ? undefined : { 'User-Agent': 'AutomotivePiecesAuto/1.0 (app de la boutique)' };
  // The mouse wheel, on the web.
  const wheel =
    Platform.OS === 'web'
      ? ({ onWheel: (e: { nativeEvent: { deltaY: number } }) => zoomTo(state.current.zoom - e.nativeEvent.deltaY / 400) } as object)
      : {};

  return (
    <View
      style={[styles.map, { height }]}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessibilityLabel={t('addr.pinHint')}
      testID="pin-map"
    >
      <View style={[StyleSheet.absoluteFill, styles.drag]} {...responder.panHandlers} {...wheel}>
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url, headers }}
            style={[styles.tile, { left: tile.x * scale, top: tile.y * scale, width: TILE * scale, height: TILE * scale }]}
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
          onPress={() => zoomTo(Math.round(state.current.zoom) + 1)}
          style={({ pressed }) => [styles.zoomBtn, pressed && styles.pressed]}
        >
          <Feather name="plus" size={20} color={C.text} />
        </Pressable>
        <View style={styles.zoomRule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('addr.zoomOut')}
          onPress={() => zoomTo(Math.round(state.current.zoom) - 1)}
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
