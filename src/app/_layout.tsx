import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui/toast';
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
      {/* Headers are white, as in the reference, so the clock is dark. The
          home screen's night road asks for light while it is focused. */}
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          // White headers with navy type, the reference's chrome: the screen
          // under them is white, and a navy bar on every page read as a
          // second hero the design never had.
          headerStyle: { backgroundColor: C.background },
          headerTintColor: C.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: familyFor('heading', rtl), fontSize: 18 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recherche" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      {/* Above every screen, so "Ajouté au panier" survives the navigation
          that follows it. */}
      <ToastHost />
    </>
  );
}
