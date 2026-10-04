import { Redirect } from 'expo-router';

/**
 * Paramètres held the language and the version number, and nothing else.
 * Both are on Compte now — the language as a row with its own sheet — so an
 * old link here lands there.
 */
export default function SettingsScreen() {
  return <Redirect href="/compte" />;
}
