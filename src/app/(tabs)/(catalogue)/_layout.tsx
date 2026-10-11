import { TabStack } from '@/components/tab-header';
import { useI18n } from '@/i18n/provider';

/** The catalogue's own stack — see components/tab-header. */
export const unstable_settings = { anchor: 'catalogue/index' };

export default function Layout() {
  const { t } = useI18n();
  return <TabStack root="catalogue/index" title={t('catalog.title')} />;
}
