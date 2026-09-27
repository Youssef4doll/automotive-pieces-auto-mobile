/**
 * Delegations, per governorate — only where this list is certain.
 *
 * Tunisia has 264 delegations. The ones below are Greater Tunis and Nabeul,
 * where the shop delivers in 24h and where most of its orders go; each list
 * is the official set for its governorate. The other nineteen governorates
 * keep the free-text address until an authoritative list (INS) is added
 * here — a dropdown with a misspelt or missing delegation would be worse
 * than a text box, because the customer could not type their way around it.
 */
export const DELEGATIONS: Record<string, readonly string[]> = {
  Tunis: [
    'Bab Bhar', 'Bab Souika', 'Carthage', 'Cité El Khadra', 'Djebel Jelloud', 'El Hrairia', 'El Kabaria', 'El Menzah',
    'El Omrane', 'El Omrane Supérieur', 'El Ouardia', 'Ettahrir', 'Ezzouhour', 'La Goulette', 'La Marsa', 'La Médina',
    'Le Bardo', 'Le Kram', 'Séjoumi', 'Sidi El Béchir', 'Sidi Hassine',
  ],
  Ariana: ['Ariana Ville', 'Ettadhamen', 'Kalâat el-Andalous', 'La Soukra', 'Mnihla', 'Raoued', 'Sidi Thabet'],
  'Ben Arous': [
    'Ben Arous', 'Bou Mhel el-Bassatine', 'El Mourouj', 'Ezzahra', 'Fouchana', 'Hammam Chott', 'Hammam Lif', 'Mégrine',
    'Mohamedia', 'Mornag', 'Nouvelle Médina', 'Radès',
  ],
  Manouba: ['Borj El Amri', 'Djedeida', 'Douar Hicher', 'El Battan', 'La Manouba', 'Mornaguia', 'Oued Ellil', 'Tebourba'],
  Nabeul: [
    'Béni Khalled', 'Béni Khiar', 'Bou Argoub', 'Dar Chaâbane El Fehri', 'El Haouaria', 'El Mida', 'Grombalia',
    'Hammam El Ghezaz', 'Hammamet', 'Kélibia', 'Korba', 'Menzel Bouzelfa', 'Menzel Temime', 'Nabeul', 'Soliman', 'Takelsa',
  ],
};

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Another governorate named in the typed address — "manouba" under Nabeul.
 * Names that are also a delegation of the chosen governorate, or part of a
 * longer name there ("Tunis" inside "Grand Tunis"), are not counted.
 */
export function otherGovernorateIn(address: string, chosen: string, all: readonly string[]): string | null {
  const text = ` ${fold(address).replace(/[^a-z0-9]+/g, ' ')} `;
  const own = new Set([chosen, ...(DELEGATIONS[chosen] ?? [])].map(fold));
  for (const g of all) {
    const name = fold(g);
    if (name === fold(chosen) || own.has(name)) continue;
    // "Manouba" also matches "La Manouba"; words only, never inside a word.
    const bare = name.replace(/^(le|la) /, '').replace(/[^a-z0-9]+/g, ' ').trim();
    if (text.includes(` ${bare} `) && ![...own].some((o) => o.includes(bare))) return g;
  }
  return null;
}
