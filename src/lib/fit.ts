import type { Feather } from '@expo/vector-icons';

import type { Product } from '@/api/catalogue';
import { C } from '@/constants/theme';
import type { DictKey } from '@/i18n/dictionaries';

/**
 * The one fit verdict, shown the same way on the card, the tile, the product
 * page, the cart and the order summary — so a part can never read "à
 * vérifier" in one place and carry a green tick in another.
 *
 *   FITS          the shop recorded this part for exactly this engine.
 *   LIKELY        a lead, not a fact: the import inferred it from a sibling
 *                 engine, or the shop confirmed it for the same engine code in
 *                 another model. Amber, never green, always "à confirmer".
 *   UNKNOWN       no evidence at all.
 *   DOES_NOT_FIT  the wrong fuel, or the model is listed without this engine.
 *
 * Each state has its own icon shape, so colour is never the only signal.
 * Amber TEXT is `C.cautionText` (5.5:1 on white); the gold itself is kept for
 * the icon, where 3:1 is enough.
 */
export type FitState = 'FITS' | 'LIKELY' | 'UNKNOWN' | 'DOES_NOT_FIT';

export function fitState(p: Pick<Product, 'fitment' | 'fitmentReason'>): FitState | null {
  if (!p.fitment) return null;
  if (p.fitment === 'UNKNOWN' && (p.fitmentReason === 'DERIVED' || p.fitmentReason === 'SAME_ENGINE_CODE')) return 'LIKELY';
  return p.fitment;
}

type Look = {
  icon: React.ComponentProps<typeof Feather>['name'];
  /** For the icon. */
  iconTone: string;
  /** For the words. */
  tone: string;
  /** The long sentence, without a car. */
  label: DictKey;
  /** One or two words, for a tile. */
  short: DictKey;
};

export const FIT_LOOK: Record<FitState, Look> = {
  FITS: { icon: 'check-circle', iconTone: C.success, tone: C.success, label: 'fit.fits', short: 'look.fit.FITS' },
  LIKELY: { icon: 'help-circle', iconTone: C.caution, tone: C.cautionText, label: 'fit.likely', short: 'look.fit.LIKELY' },
  UNKNOWN: { icon: 'search', iconTone: C.textMuted, tone: C.textMuted, label: 'fit.unknown', short: 'look.fit.UNKNOWN' },
  DOES_NOT_FIT: { icon: 'x-circle', iconTone: C.danger, tone: C.danger, label: 'fit.no', short: 'look.fit.DOES_NOT_FIT' },
};
