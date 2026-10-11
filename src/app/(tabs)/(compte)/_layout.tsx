import { TabStack } from '@/components/tab-header';
import { useI18n } from '@/i18n/provider';

/** The account's own stack — see components/tab-header. */
export const unstable_settings = { anchor: 'compte/index' };

export default function Layout() {
  const { t } = useI18n();
  return <TabStack root="compte/index" title={t('account.me')} />;
}
