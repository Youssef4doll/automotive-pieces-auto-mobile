import { get } from './client';

/**
 * The banners the shop is running.
 *
 * Same list the storefront's own promo band renders, so the two front doors
 * show the same campaign: the shop changes it once from /admin/promotions
 * and both move, with no deploy on either side.
 */
export type PromoKind = 'SEASONAL' | 'NEW_ARRIVALS' | 'DEAL';

export type Promo = {
  id: string;
  /**
   * The shop writes this as the image's alt text, so it describes the banner
   * rather than headlining it. It is the accessible name and must NOT be
   * drawn over the image as a title — the artwork already carries whatever
   * it is saying, and printing the alt text on top would say it twice.
   */
  title: string;
  /** Relative to the website, where the file is served from. */
  imageUrl: string;
  href: string | null;
  /** Null on a hero banner. A code, never a label. */
  kind: PromoKind | null;
  placement: 'HERO' | 'CAMPAIGN';
};

export const promotionsApi = {
  all: (signal?: AbortSignal) => get<Promo[]>('/api/v1/promotions', { signal }),
};

/**
 * Where a banner goes when it is tapped, in this app's terms.
 *
 * The hrefs come from the website and are the website's routes. Some have an
 * obvious equivalent here and some do not — `/#magasin` is an anchor on the
 * storefront's own home page and there is simply nothing in the app to open.
 *
 * A banner whose destination cannot be mapped is not tappable. The
 * alternative is throwing the customer into a web view of the shop they are
 * already standing in, which is worse than a banner that only tells them
 * something. Returning null is how the component knows.
 */
export function appRouteFor(href: string | null): string | null {
  if (!href) return null;

  // Only same-origin paths. An absolute URL is somewhere else entirely and
  // is not this app's to open.
  if (!href.startsWith('/') || href.startsWith('//')) return null;

  const path = href.split('#')[0].split('?')[0].replace(/\/+$/, '');
  if (path === '/catalogue' || path === '') return path === '' ? null : '/catalogue';

  // /catalogue/freinage and /catalogue/freinage/disque-de-frein both land on
  // the family, which is as deep as the app goes today.
  const family = path.match(/^\/catalogue\/([a-z0-9-]+)/i);
  if (family) return `/famille/${family[1]}`;

  return null;
}
