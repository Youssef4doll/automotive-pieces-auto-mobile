import { get } from './client';

/**
 * The vehicle tables, as `/api/v1/vehicles/*` returns them.
 *
 * These types are hand-written to match the website's route handlers rather
 * than generated from them: the two repositories deploy separately, so a
 * generated type would only ever describe the website as it was the day
 * someone last ran the generator. What keeps them honest is that the client
 * checks the envelope at runtime and the screens render `null` fields as
 * nothing — a field this app has never heard of is ignored, and a field that
 * stops being sent renders as absent rather than as "undefined".
 *
 * `partCount` is how many distinct active parts have a recorded fitment for
 * that make, model or engine. It is a count from the catalogue, never a
 * popularity figure, and a zero is shown as a zero — see `MakeRow` in the
 * picker for what the screen does with it.
 */

export type Make = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  modelCount: number;
  partCount: number;
};

export type Model = {
  id: string;
  name: string;
  slug: string;
  yearFrom: number | null;
  yearTo: number | null;
  engineCount: number;
  partCount: number;
};

export type Engine = {
  id: string;
  name: string;
  fuel: string | null;
  powerHp: number | null;
  engineCode: string | null;
  displacementCc: number | null;
  /** Production years the shop recorded for this engine, when it did. */
  yearFrom?: number | null;
  yearTo?: number | null;
  partCount: number;
};

export const vehiclesApi = {
  makes: (signal?: AbortSignal) => get<Make[]>('/api/v1/vehicles/makes', { signal }),

  models: (makeSlug: string, signal?: AbortSignal) =>
    get<Model[]>(`/api/v1/vehicles/models?make=${encodeURIComponent(makeSlug)}`, { signal }),

  engines: (makeSlug: string, modelSlug: string, signal?: AbortSignal) =>
    get<Engine[]>(
      `/api/v1/vehicles/engines?make=${encodeURIComponent(makeSlug)}&model=${encodeURIComponent(modelSlug)}`,
      { signal },
    ),

  /**
   * The make a VIN belongs to, from its first three characters — or null.
   *
   * Only the make. The shop recognises the manufacturer code for the makes
   * it stocks and nothing else; a full VIN decode needs a paid data service
   * it does not have, so the model and engine are still chosen by hand.
   */
  vinMake: (vin: string, signal?: AbortSignal) =>
    get<{ make: { id: string; name: string; slug: string } | null }>(
      `/api/v1/vehicles/vin?vin=${encodeURIComponent(vin)}`,
      { signal },
    ),
};

/**
 * "2012 – 2019", "depuis 2012", or nothing at all.
 *
 * Most models in this database have both years; some have only the first, and
 * a handful have neither. The third case renders no line rather than a dash
 * or an em-dash with a blank after it — an empty year range on a car is the
 * kind of thing a customer reads as "the app is broken", and it is also
 * exactly the shape of gap the shop's rules say to leave empty.
 */
export function yearRange(model: Pick<Model, 'yearFrom' | 'yearTo'>, since: string): string | null {
  if (model.yearFrom && model.yearTo) return `${model.yearFrom} – ${model.yearTo}`;
  if (model.yearFrom) return `${since} ${model.yearFrom}`;
  return null;
}

/**
 * The line under an engine's name: fuel, power, code, displacement.
 *
 * Every one of those is nullable and most rows have only the first two. The
 * parts are joined with a middle dot and the absent ones are simply not
 * there; nothing is inferred from the engine's name, even though "1.5 dCi"
 * plainly implies 1461cc to anyone in the trade. Implying it here would put a
 * number on the screen that nobody at the shop has recorded, which is the one
 * thing this app does not do.
 */
export function engineDetail(engine: Engine): string | null {
  const parts = [
    engine.fuel,
    engine.powerHp ? `${engine.powerHp} ch` : null,
    engine.engineCode,
    engine.displacementCc ? `${engine.displacementCc} cm³` : null,
  ].filter((p): p is string => Boolean(p));

  return parts.length ? parts.join(' · ') : null;
}
