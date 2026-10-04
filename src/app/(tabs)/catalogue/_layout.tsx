import { TabScreen } from '@/components/tab-header';
import { useI18n } from '@/i18n/provider';

/** The tab's title over its screen — see components/tab-header. */
export default function Layout() {
  const { t } = useI18n();
  return <TabScreen title={t('catalog.title')} />;
}
