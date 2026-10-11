import { TabStack } from '@/components/tab-header';

/** Accueil's own stack — see components/tab-header. The navy hero is its top: no title. */
export const unstable_settings = { anchor: 'index' };

export default function Layout() {
  return <TabStack root="index" />;
}
