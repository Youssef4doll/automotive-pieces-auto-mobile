import { Archivo_700Bold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import { Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold } from '@expo-google-fonts/barlow';
import { BarlowSemiCondensed_600SemiBold } from '@expo-google-fonts/barlow-semi-condensed';
import { Cairo_400Regular, Cairo_700Bold, Cairo_800ExtraBold } from '@expo-google-fonts/cairo';
import { useFonts } from 'expo-font';

/**
 * The shop's faces, loaded before the first screen paints.
 *
 * Nine files, which is more than it looks: three weights of Barlow, one
 * condensed, two of Archivo and three of Cairo. React Native cannot fake a
 * weight, so every weight the design uses is a file — see `Fonts` in
 * theme.ts.
 *
 * Cairo is loaded on every device, not only Arabic ones. It is about 90KB and
 * it ships inside the binary rather than being downloaded, so the cost is
 * install size and not the customer's data; loading it lazily on a language
 * switch would mean the first Arabic screen renders in the system face and
 * visibly re-flows a moment later.
 *
 * The keys here are the family names every style in the app refers to. They
 * must match `Fonts` exactly: a mismatch is not an error anywhere — React
 * Native quietly falls back to the system face — so it shows up as "the app
 * looks slightly wrong" and nothing else.
 */
export function useAppFonts() {
  const [loaded, error] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    BarlowSemiCondensed_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Cairo_400Regular,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  // A font that fails to load is a cosmetic problem and must not be a blank
  // app: the screens render in the system face and everything still works.
  // The error is logged because a silent downgrade that nobody notices is how
  // a broken asset ships.
  if (error) console.warn('fonts: falling back to the system face', error);

  return loaded || Boolean(error);
}
