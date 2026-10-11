import { useMemo } from 'react';

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
 */
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
    }),
    [rtl, t],
  );
}
