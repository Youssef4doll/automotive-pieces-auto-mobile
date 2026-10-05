import { SvgXml } from 'react-native-svg';

import conseilPhoto from './drawn/conseil-photo';
import disqueFrein from './drawn/disque-frein';
import referencePiece from './drawn/reference-piece';

/**
 * The shop artist's drawings for the ways of finding a part, in the same
 * hand as the car key and the carte grise: thick dark outlines, flat navy
 * and gold, the little red crosses. Each keeps the shape it was drawn at;
 * `width` sets its size. Files as delivered: assets/illustrations/*.svg.
 */

/** A brake disc and its caliper — "I know which part". */
export function DiscArt({ width = 120 }: { width?: number }) {
  return <SvgXml xml={disqueFrein} width={width} height={width * (127 / 160)} />;
}

/** A part's label with its code, under a magnifier — "I have the reference". */
export function ReferenceArt({ width = 120 }: { width?: number }) {
  return <SvgXml xml={referencePiece} width={width} height={width} />;
}

/** A phone framing a disc, with a question bubble — "a photo, or advice from the shop". */
export function PhotoAdviceArt({ width = 120 }: { width?: number }) {
  return <SvgXml xml={conseilPhoto} width={width} height={width * (150 / 160)} />;
}
