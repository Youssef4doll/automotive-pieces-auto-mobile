import { useMemo } from 'react';
import { Platform } from 'react-native';

import { C, familyFor } from '@/constants/theme';
import { useI18n } from '@/i18n/provider';

/**
 * How every stack draws its header — the root's and each tab's own
 * (components/tab-header) — so a part page looks the same whichever tab it
 * was opened in.
 *
 * White headers with navy type, the reference's chrome: the screen under
 * them is white, and a navy bar on every page read as a second hero the
 * design never had.
 *
 * Android gets the iPhone's manners, so the two builds are one app: titles
 * centred, and a page that slides in from the side over the one it came
 * from (react-native-screens' `ios_from_right`) instead of Material's fade
 * up from the bottom. In Arabic it slides in from the other side.
 */
const android = Platform.OS === 'android';

export function useStackOptions() {
  const { rtl, t } = useI18n();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: C.background },
      headerTintColor: C.text,
      headerShadowVisible: false,
      headerTitleStyle: { fontFamily: familyFor('heading', rtl), fontSize: 18 },
      headerBackButtonDisplayMode: 'minimal' as const,
      // What a screen reader says for the arrow. Without it the label is
      // the previous route's name, and from any tab that is "(tabs)".
      headerBackTitle: t('common.back'),
      contentStyle: { backgroundColor: C.background },
      ...(android
        ? { headerTitleAlign: 'center' as const, animation: rtl ? ('ios_from_left' as const) : ('ios_from_right' as const) }
        : {}),
    }),
    [rtl, t],
  );
}
