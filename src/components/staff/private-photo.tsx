import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type ImageStyle } from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { C } from '@/constants/theme';
import { useStaff } from '@/store/staff';

/**
 * A customer's photo, which the shop serves to staff only: with the session
 * in the request, never as a public link. On a phone the image loader sends
 * the header itself; a browser's <img> cannot, so there the bytes are
 * fetched with it and shown from memory.
 */
export function PrivatePhoto({ path, style, label }: { path: string; style: ImageStyle; label: string }) {
  const token = useStaff((s) => s.token);
  const [webUri, setWebUri] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !token) return;
    let url: string | null = null;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob) return;
        url = URL.createObjectURL(blob);
        setWebUri(url);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, token]);

  if (!token) return <View style={[style, styles.blank]} />;
  const source = Platform.OS === 'web' ? (webUri ? { uri: webUri } : null) : { uri: `${API_BASE_URL}${path}`, headers: { Authorization: `Bearer ${token}` } };
  return source ? (
    <Image source={source} style={style} contentFit="cover" accessibilityLabel={label} cachePolicy="none" />
  ) : (
    <View style={[style, styles.blank]} />
  );
}

const styles = StyleSheet.create({ blank: { backgroundColor: C.surface } });
