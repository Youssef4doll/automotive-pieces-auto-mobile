import { TabStack } from '@/components/tab-header';
import { useI18n } from '@/i18n/provider';

/** The basket's own stack — see components/tab-header. */
export const unstable_settings = { anchor: 'panier/index' };

export default function Layout() {
  const { t } = useI18n();
  return <TabStack root="panier/index" title={t('cart.title')} centered />;
}
