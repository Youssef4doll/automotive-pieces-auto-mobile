import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * The photo request became part of "Demander à la boutique" (/demande),
 * where a photo is one way to ask. Kept as a door so links, notifications
 * and older screens that open /demande-photo land on it, photo first.
 */
export default function PhotoRequestRedirect() {
  const { sku } = useLocalSearchParams<{ sku?: string }>();
  return <Redirect href={{ pathname: '/demande', params: { photo: '1', ...(sku ? { sku } : {}) } }} />;
}
