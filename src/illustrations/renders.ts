import type { ImageSourcePropType } from 'react-native';

/**
 * The photographic pictures the app ships with — studio renders of real
 * part types, made in Blender from the scripts in tools/renders (see
 * docs/imagery.md for how, and how to redo one).
 *
 * What they are and are not: each is a picture of the *kind* of part a
 * family holds — a drilled disc and its pads for Freinage, a spin-on filter
 * and a panel filter for Filtres — lit and shot like a product photograph,
 * branded by nobody. They stand in for a family everywhere, and for a
 * product only while the shop has no photograph of it, in which case the
 * screen says "Illustration" on it (see PartImage). A photograph uploaded
 * in /admin always wins.
 */
const FAMILY: Record<string, ImageSourcePropType> = {
  'allumage-prechauffage': require('../../assets/renders/allumage-prechauffage.webp'),
  'capteurs-et-sondes': require('../../assets/renders/capteurs-et-sondes.webp'),
  'cardan-et-transmission': require('../../assets/renders/cardan-et-transmission.webp'),
  carosserie: require('../../assets/renders/carosserie.webp'),
  climatisation: require('../../assets/renders/climatisation.webp'),
  'courroie-tendeur-et-chaine': require('../../assets/renders/courroie-tendeur-et-chaine.webp'),
  'demarrage-electrique': require('../../assets/renders/demarrage-electrique.webp'),
  'direction-et-trains-roulants': require('../../assets/renders/direction-et-trains-roulants.webp'),
  eclairage: require('../../assets/renders/eclairage.webp'),
  embrayage: require('../../assets/renders/embrayage.webp'),
  filtres: require('../../assets/renders/filtres.webp'),
  freinage: require('../../assets/renders/freinage.webp'),
  lubrifiant: require('../../assets/renders/lubrifiant.webp'),
  moteur: require('../../assets/renders/moteur.webp'),
  'refroidissement-moteur': require('../../assets/renders/refroidissement-moteur.webp'),
  suspension: require('../../assets/renders/suspension.webp'),
};

/** The family's render, or null for a family nobody has shot yet. */
export function familyRender(slug: string | null | undefined): ImageSourcePropType | null {
  return slug ? (FAMILY[slug] ?? null) : null;
}

export const RENDERS = {
  /** Home: a drilled disc under a gold caliper, on a dark studio floor. */
  hero: require('../../assets/renders/hero.webp') as ImageSourcePropType,
  /** "Je connais ma voiture": a car key, no maker's badge on it. */
  key: require('../../assets/renders/car-key.webp') as ImageSourcePropType,
  /** "J'ai la référence": the magnifier. */
  magnifier: require('../../assets/renders/magnifier.webp') as ImageSourcePropType,
  /** "Photo / Expert": a phone whose camera frames a brake disc. */
  phone: require('../../assets/renders/phone.webp') as ImageSourcePropType,
};
