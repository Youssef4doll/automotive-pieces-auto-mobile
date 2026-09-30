import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The tab bar's five glyphs, drawn as one set: a 24-unit box, a 1.8 navy
 * outline with round caps and joins — and, on the open tab, the same drawing
 * filled with the shop's gold under its outline, the way the reference fills
 * its active bag. The outline never changes, so the shape a customer learned
 * is the shape they find; the gold is the "you are here", with the pill
 * behind it and the bolder label (components/tab-bar) saying it twice more.
 *
 * Gold fill under a navy line rather than gold line on white: gold on white
 * measures 1.8:1, under the 3:1 a control's graphic needs, while navy on
 * white or on the pale pill is over 12:1 either way.
 */
export type TabIconName = 'home' | 'catalogue' | 'garage' | 'cart' | 'account';

type Props = { name: TabIconName; active: boolean; size?: number; color?: ColorValue };

const STROKE = 1.8;
const FILL = Brand.gold500;

export function TabIcon({ name, active, size = 24, color = Brand.navy900 }: Props) {
  const line = { stroke: color, strokeWidth: STROKE, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const fill = active ? FILL : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path d="M5 10.2 12 4.3l7 5.9V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19Z" fill={fill} />
          <Path d="M3.2 11.6 12 4.3l8.8 7.3" {...line} />
          <Path d="M5 10.2V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-8.8" {...line} />
          <Path d="M9.8 20.5v-4.6a2.2 2.2 0 0 1 4.4 0v4.6" {...line} fill={active ? Brand.white : 'none'} />
        </>
      ) : name === 'catalogue' ? (
        <>
          <Rect x={3.5} y={3.5} width={7} height={7} rx={2} {...line} fill={fill} />
          <Rect x={13.5} y={3.5} width={7} height={7} rx={2} {...line} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={2} {...line} />
          <Rect x={13.5} y={13.5} width={7} height={7} rx={2} {...line} fill={fill} />
        </>
      ) : name === 'garage' ? (
        <>
          <Path d="M5 11 6.8 6.3A2 2 0 0 1 8.7 5h6.6a2 2 0 0 1 1.9 1.3L19 11" {...line} fill={active ? Brand.white : 'none'} />
          <Path d="M4.8 11h14.4a2 2 0 0 1 2 2v3.8a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1V13a2 2 0 0 1 2-2Z" {...line} fill={fill} />
          <Path d="M6.2 17.8v2M17.8 17.8v2" {...line} />
          <Circle cx={7.2} cy={14.4} r={1.3} fill={color} />
          <Circle cx={16.8} cy={14.4} r={1.3} fill={color} />
        </>
      ) : name === 'cart' ? (
        <>
          <Path d="M5.9 6.1h13.3a.9.9 0 0 1 .87 1.13l-1.9 7.1a1.2 1.2 0 0 1-1.16.9H8.97a1.2 1.2 0 0 1-1.17-.93Z" fill={fill} />
          <Path
            d="M2.5 3.5h2.1a1 1 0 0 1 1 .78L7.8 14.2a1.2 1.2 0 0 0 1.17.93h8.66a1.2 1.2 0 0 0 1.16-.9l1.9-7.1a.9.9 0 0 0-.87-1.13H5.9"
            {...line}
          />
          <Circle cx={9.4} cy={19.4} r={1.6} {...line} />
          <Circle cx={17.2} cy={19.4} r={1.6} {...line} />
        </>
      ) : (
        <>
          <Circle cx={12} cy={8} r={3.8} {...line} fill={fill} />
          <Path d="M4.6 20.4c.9-3.7 3.9-6.1 7.4-6.1s6.5 2.4 7.4 6.1Z" {...line} fill={fill} />
        </>
      )}
    </Svg>
  );
}
