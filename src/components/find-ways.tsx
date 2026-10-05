import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { CarKey } from '@/illustrations/car-key';
import { DiscArt, PhotoAdviceArt, ReferenceArt } from '@/illustrations/ways-art';
import type { DictKey } from '@/i18n/dictionaries';
import { useI18n } from '@/i18n/provider';
import { useGarage } from '@/store/garage';

export type Way = 'car' | 'part' | 'ref' | 'photo';

export type FindWay = {
  key: Way;
  title: DictKey;
  /** One line under the title; names the car in the garage when there is one. */
  why: string;
  /** The artist's drawing, drawn to fit a box `size` wide. */
  art: (size: number) => React.ReactNode;
};

/**
 * The four ways of finding a part, shared by /trouver and the home screen so
 * the two never disagree: what each is called, its drawing, and where one
 * tap takes it. The fourth ("je ne sais pas comment ça s'appelle") sends a
 * photo to the shop's inbox, so there is always somebody to answer it.
 */
export function useFindWays(): { ways: FindWay[]; go: (way: Way) => void } {
  const { t } = useI18n();
  const router = useRouter();
  const active = useGarage((s) => s.active);

  const ways: FindWay[] = [
    {
      key: 'car',
      title: 'look.find.car',
      why: active ? t('look.forVehicle', { car: `${active.makeName} ${active.modelName}` }) : t('look.find.carWhy'),
      art: (size) => <CarKey size={size * 0.92} />,
    },
    { key: 'part', title: 'look.find.part', why: t('look.find.partWhy'), art: (size) => <DiscArt width={size * 0.92} /> },
    { key: 'ref', title: 'look.find.ref', why: t('look.find.refWhy'), art: (size) => <ReferenceArt width={size * 0.8} /> },
    { key: 'photo', title: 'look.find.photo', why: t('look.find.photoWhy'), art: (size) => <PhotoAdviceArt width={size * 0.82} /> },
  ];

  const go = useCallback(
    (way: Way) => {
      if (way === 'car') return active ? router.push({ pathname: '/pieces-compatibles', params: { engine: active.engineId } }) : router.push('/garage/ajouter');
      if (way === 'part') return router.navigate('/catalogue');
      if (way === 'ref') return router.push({ pathname: '/recherche', params: { mode: 'reference' } });
      router.push({ pathname: '/demande', params: { photo: '1' } });
    },
    [active, router],
  );

  return { ways, go };
}
