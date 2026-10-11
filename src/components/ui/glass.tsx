import { GlassView } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { SYSTEM_TAB_BAR } from '@/components/tab-bar';
import { Brand } from '@/constants/theme';

/** iOS draws liquid glass itself (26 and later) — the same test as the tab bar. */
export const LIQUID_GLASS = SYSTEM_TAB_BAR;

/**
 * Where the glass sits, which decides how it reads.
 *
 * - `light`: on a white screen — the drawn tab bar's frost, a pale capsule
 *   with a hairline of light round it.
 * - `bright`: a card that must stay white enough for navy type, over the
 *   navy hero.
 * - `dark`: a small control on the navy hero, white icon on smoked glass.
 */
export type GlassTone = 'light' | 'bright' | 'dark';

/**
 * A surface of liquid glass — the material of the tab bar and of the
 * product page's island, for the search boxes (the owner, October 2026).
 *
 * On iOS 26 and later it is Apple's own (`expo-glass-effect`'s GlassView):
 * it refracts what is behind it, catches the light at its edge, and with
 * `interactive` swells and brightens under the finger as the system's
 * controls do. Everywhere else it is drawn — the frost of the drawn tab bar
 * (components/tab-bar), with a backdrop blur on the web.
 */
export function Glass({
  tone = 'light',
  interactive = false,
  style,
  children,
  ...rest
}: ViewProps & { tone?: GlassTone; interactive?: boolean; style?: StyleProp<ViewStyle> }) {
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        colorScheme={tone === 'dark' ? 'dark' : 'light'}
        tintColor={tone === 'bright' ? 'rgba(255,255,255,0.9)' : undefined}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View style={[frost[tone], style]} {...rest}>
      {children}
    </View>
  );
}

const web = Platform.OS === 'web';

export const frost = StyleSheet.create({
  light: {
    borderWidth: StyleSheet.hairlineWidth,
    ...(web
      ? ({
          borderColor: 'rgba(255,255,255,0.9)',
          backgroundColor: 'rgba(244,246,250,0.74)',
          backdropFilter: 'blur(22px) saturate(180%)',
          WebkitBackdropFilter: 'blur(22px) saturate(180%)',
          boxShadow: '0 4px 16px rgba(8,22,51,0.10), 0 1px 2px rgba(8,22,51,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
        } as object)
      : {
          borderColor: 'rgba(15,35,82,0.08)',
          backgroundColor: 'rgba(244,246,250,0.97)',
          shadowColor: Brand.navy950,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 3,
        }),
  },
  bright: {
    borderWidth: StyleSheet.hairlineWidth,
    ...(web
      ? ({
          borderColor: 'rgba(255,255,255,0.8)',
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 12px 32px rgba(3,10,26,0.32), 0 2px 6px rgba(3,10,26,0.18), inset 0 1px 0 rgba(255,255,255,0.95)',
        } as object)
      : {
          borderColor: 'rgba(255,255,255,0.6)',
          backgroundColor: Brand.white,
          shadowColor: Brand.navy950,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 22,
          elevation: 8,
        }),
  },
  dark: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
    ...(web
      ? ({
          backgroundColor: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 14px rgba(3,10,26,0.25)',
        } as object)
      : { backgroundColor: 'rgba(255,255,255,0.14)' }),
  },
});
