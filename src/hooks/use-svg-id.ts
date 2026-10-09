import { useId } from 'react';

/**
 * An id for an SVG gradient that no other mounted copy of the drawing shares.
 *
 * On the web every `<linearGradient id>` lives in one document. Two copies
 * of a screen with the same id (the picker opened twice, one under the
 * other) both point `fill="url(#id)"` at the first copy's gradient; when
 * that copy's screen is hidden, the browser paints nothing, and a navy card
 * turned white with its white title on it. React's own id, made safe for a
 * URL fragment, keeps each copy pointing at its own.
 */
export function useSvgId(prefix: string) {
  return `${prefix}${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
}
