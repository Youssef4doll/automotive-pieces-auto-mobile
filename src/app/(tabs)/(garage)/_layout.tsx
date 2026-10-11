import { TabStack } from '@/components/tab-header';
import { useI18n } from '@/i18n/provider';

/** The garage's own stack — see components/tab-header. */
export const unstable_settings = { anchor: 'garage/index' };

export default function Layout() {
  const { t } = useI18n();
  return <TabStack root="garage/index" title={t('garage.title')} />;
}
