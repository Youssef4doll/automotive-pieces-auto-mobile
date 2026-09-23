import { Redirect, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { Loading } from '@/components/ui/states';
import { C, familyFor } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';
import { useStaff } from '@/store/staff';

/**
 * The shop's own screens, behind the staff sign-in.
 *
 * Every screen under /gestion is reached only with a live session; without
 * one — never signed in, signed out, or a session the shop just refused —
 * the door is the sign-in screen. The screens themselves never decide who
 * may see them: the shop does, on every request (see api/staff.ts), and a
 * refusal there signs this phone out and lands back here.
 */
export default function StaffLayout() {
  const { t, rtl } = useI18n();
  const status = useStaff((s) => s.status);
  const restore = useStaff((s) => s.restore);
  const segments = useSegments();
  const atDoor = segments[segments.length - 1] === 'connexion';

  useEffect(() => {
    restore();
  }, [restore]);

  if (status === 'unknown') return <Loading />;
  if (status === 'signedOut' && !atDoor) return <Redirect href="/gestion/connexion" />;
  if (status === 'signedIn' && atDoor) return <Redirect href="/gestion" />;

  return (
    // The root stack's chrome, repeated: this stack owns the headers under
    // /gestion so each staff screen can title itself.
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.background },
        headerTintColor: C.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: familyFor('heading', rtl), fontSize: 18 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.surface },
      }}
    >
      <Stack.Screen name="connexion" options={{ title: t('staff.signInTitle') }} />
    </Stack>
  );
}
