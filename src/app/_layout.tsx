import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui/toast';
import { C, familyFor } from '@/constants/theme';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { I18nProvider, useI18n } from '@/i18n/provider';
import { catalogueApi } from '@/api/catalogue';
import { promotionsApi } from '@/api/promotions';
import { shopApi } from '@/api/shop';
import { AuthMoment } from '@/components/auth-moment';
import { NotificationRouter } from '@/components/notification-router';
import { OrderWatch } from '@/components/order-watch';
import { Preloader } from '@/components/preloader';
import { setAnalyticsContext, track } from '@/services/analytics';
import { installCrashReporting } from '@/services/crash';
import { installNotificationHandler } from '@/services/notifications';
import { useRemoteUpdates } from '@/services/updates';
import { useAccount } from '@/store/account';
import { useGarage } from '@/store/garage';
import { appLocale } from '@/i18n/data-locale';

SplashScreen.preventAutoHideAsync();
/**
 * A browser driven by a test (Playwright sets `navigator.webdriver`) skips the
 * launch animation: the suites measure and tap the app, not the logo. Phones
 * and people always see it. e2e/launch.mjs turns the flag off to check it.
 */
const automated = Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.webdriver === true;
// Before anything renders: an error on the first frame is the one most worth knowing about.
installCrashReporting();
installNotificationHandler();

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
  const { rtl, t } = useI18n();
  useRemoteUpdates();
  const [launched, setLaunched] = useState(automated);
  const [warm, setWarm] = useState(false);

  // The home screen's first data, asked for while the launch screen is up.
  // The answers land in the API cache (api/client), so the home reads them
  // there instead of opening on skeletons. A failure is fine: the home asks
  // again and says so itself.
  useEffect(() => {
    void Promise.allSettled([catalogueApi.families(), shopApi.settings(), promotionsApi.all()]).then(() => setWarm(true));
  }, []);

  // Without the launch screen, the native splash goes when the fonts are in;
  // with it, the launch screen takes over on its first frame (onShown below).
  useEffect(() => {
    if (automated && fontsSettled) void SplashScreen.hideAsync();
  }, [fontsSettled]);

  // Once per launch: is the saved account still signed in, and the funnel's first step.
  useEffect(() => {
    void useAccount.getState().restore();
    setAnalyticsContext(() => ({
      locale: appLocale(),
      engineId: useGarage.getState().active?.engineId ?? null,
      signedIn: useAccount.getState().status === 'signedIn',
    }));
    // ms since the JavaScript started: how long the first screen took to mount.
    track('app_open', { coldStart: true, ms: typeof performance !== 'undefined' ? Math.round(performance.now()) : null });
  }, []);

  const preloader = !launched ? (
    <Preloader ready={fontsSettled && warm} onShown={() => void SplashScreen.hideAsync()} onDone={() => setLaunched(true)} />
  ) : null;

  // The launch screen keeps one place in the tree from the first frame to
  // the last, so the app arriving underneath it does not restart it.
  return (
    <>
      {fontsSettled ? <Shell rtl={rtl} backLabel={t('common.back')} launching={!launched} /> : null}
      {preloader}
    </>
  );
}

function Shell({ rtl, backLabel, launching }: { rtl: boolean; backLabel: string; launching: boolean }) {
  return (
    <>
      {/* Headers are white, as in the reference, so the clock is dark. The
          home screen's night road asks for light while it is focused. While
          the launch screen is still over the app, its night wins: this one
          mounts after the launch screen's and would otherwise be on top. */}
      <StatusBar style={launching ? 'light' : 'dark'} />
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
          // What a screen reader says for the arrow. Without it the label is
          // the previous route's name, and from any tab that is "(tabs)".
          headerBackTitle: backLabel,
          contentStyle: { backgroundColor: C.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recherche" options={{ headerShown: false, animation: 'fade' }} />
        {/* The staff screens bring their own stack and headers. */}
        <Stack.Screen name="gestion" options={{ headerShown: false }} />
      </Stack>
      {/* Above every screen, so "Ajouté au panier" survives the navigation
          that follows it. */}
      <ToastHost />
      {/* Over everything, toasts included: signing in or out is the moment. */}
      <AuthMoment />
      {/* Orders that moved and answers that came, said while the app is open. */}
      <OrderWatch />
      {Platform.OS !== 'web' ? <NotificationRouter /> : null}
    </>
  );
}

export { RouteError as ErrorBoundary } from '@/components/ui/route-error';
