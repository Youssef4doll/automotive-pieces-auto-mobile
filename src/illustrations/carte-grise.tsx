import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * A registration card, drawn to point at one line on it.
 *
 * Not a picture of the Tunisian carte grise, and deliberately not: an
 * official document's layout, crest and typography are not the shop's to
 * reproduce, and a convincing copy of an ID document is not something an
 * app should be drawing. What the customer needs is the idea — "it is on the
 * grey card, on the serial-number line" — so this is a card, a header band,
 * rows of type rendered as bars, and one row picked out in the shop's gold.
 *
 * Same pen as the car and the part families: navy outlines on a white
 * ground, flat fills, one accent. `compact` drops the rows for the 40pt
 * version on the picker's shortcut card, where they would be noise.
 */
export function CarteGrise({ width = 280, compact = false }: { width?: number; compact?: boolean }) {
  const height = width * 0.62;
  const stroke = compact ? 2.4 : 1.6;

  if (compact) {
    return (
      <Svg width={width} height={height} viewBox="0 0 100 62">
        <Rect x={3} y={3} width={94} height={56} rx={8} fill={Brand.white} stroke={Brand.navy900} strokeWidth={stroke * 2.5} />
        <Rect x={3} y={3} width={94} height={16} rx={8} fill={Brand.navy900} />
        <Rect x={3} y={12} width={94} height={7} fill={Brand.navy900} />
        <Rect x={14} y={31} width={72} height={12} rx={3} fill={Brand.gold500} />
        <Line x1={14} y1={50} x2={60} y2={50} stroke={Brand.navy300} strokeWidth={4} strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 280 174">
      {/* The card, lifted a little off the page. */}
      <Rect x={10} y={12} width={262} height={156} rx={14} fill={Brand.navy50} />
      <Rect x={6} y={6} width={262} height={156} rx={14} fill={Brand.white} stroke={Brand.navy900} strokeWidth={stroke} />

      {/* Header band, with a plain disc where a real card carries its crest. */}
      <G>
        <Rect x={6} y={6} width={262} height={34} rx={14} fill={Brand.navy900} />
        <Rect x={6} y={26} width={262} height={14} fill={Brand.navy900} />
        <Circle cx={30} cy={23} r={9} fill="none" stroke={Brand.navy300} strokeWidth={1.5} />
        <Line x1={48} y1={19} x2={140} y2={19} stroke={Brand.navy300} strokeWidth={3} strokeLinecap="round" />
        <Line x1={48} y1={28} x2={110} y2={28} stroke={Brand.navy400} strokeWidth={2.5} strokeLinecap="round" />
      </G>

      {/* Rows of print. */}
      {[58, 76].map((y) => (
        <G key={y}>
          <Line x1={24} y1={y} x2={62} y2={y} stroke={Brand.navy300} strokeWidth={3} strokeLinecap="round" />
          <Line x1={74} y1={y} x2={180} y2={y} stroke={Brand.navy400} strokeWidth={3} strokeLinecap="round" />
        </G>
      ))}

      {/* The line that matters. */}
      <Rect x={16} y={88} width={242} height={26} rx={7} fill={Brand.gold500} opacity={0.22} />
      <Rect x={16} y={88} width={242} height={26} rx={7} fill="none" stroke={Brand.gold600} strokeWidth={stroke} />
      <Line x1={26} y1={101} x2={62} y2={101} stroke={Brand.navy700} strokeWidth={3} strokeLinecap="round" />
      {Array.from({ length: 17 }, (_, i) => (
        <Rect key={i} x={74 + i * 10} y={96} width={6} height={10} rx={1.5} fill={Brand.navy900} />
      ))}

      {[132, 150].map((y) => (
        <G key={y}>
          <Line x1={24} y1={y} x2={62} y2={y} stroke={Brand.navy300} strokeWidth={3} strokeLinecap="round" />
          <Line x1={74} y1={y} x2={y === 132 ? 150 : 206} y2={y} stroke={Brand.navy400} strokeWidth={3} strokeLinecap="round" />
        </G>
      ))}

      {/* The registration office's round stamp, drawn as a plain ring — its
          place on a real card, none of its content. */}
      <Circle cx={232} cy={141} r={17} fill="none" stroke="#e1112c" strokeOpacity={0.55} strokeWidth={2.2} />
      <Circle cx={232} cy={141} r={11} fill="none" stroke="#e1112c" strokeOpacity={0.35} strokeWidth={1.4} />

      {/* "Here": a tag pointing at the VIN line, so the customer looks at
          the right place on their own card. */}
      <Path d="M206 66h48a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6h-18l-6 6-6-6h-18a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6z" fill={Brand.navy900} />
      <SvgText x={230} y={80} fontSize={11} fontWeight="700" fill={Brand.gold500} textAnchor="middle">
        VIN · 17
      </SvgText>
    </Svg>
  );
}
