import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C, familyFor } from '@/constants/theme';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { I18nProvider, useI18n } from '@/i18n/provider';

SplashScreen.preventAutoHideAsync();

/**
 * The app's root.
 *
 * Order matters here. The fonts and the saved locale both have to be settled
 * before the first screen paints, because both change how every screen looks:
 * a screen rendered before the fonts land comes up in the system face and
 * re-flows a moment later, and one rendered before the locale is read comes
 * up in French and re-flows into Arabic. The splash screen stays up until
 * both are done, which is the one thing it is for.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const fontsSettled = useAppFonts();
  const { rtl } = useI18n();

  useEffect(() => {
    if (fontsSettled) SplashScreen.hideAsync();
  }, [fontsSettled]);

  if (!fontsSettled) return null;

  return (
    <>
      {/* The header is navy, so the clock and the battery have to be white. */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.surfaceBrand },
          headerTintColor: C.textInverse,
          headerTitleStyle: { fontFamily: familyFor('heading', rtl), fontSize: 17 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
