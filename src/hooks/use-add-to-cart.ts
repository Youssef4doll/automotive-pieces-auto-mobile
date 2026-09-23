import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import type { Product } from '@/api/catalogue';
import { useI18n } from '@/i18n/provider';
import { useCart } from '@/store/cart';
import { useToast } from '@/store/toast';

/**
 * Put a part in the basket and say so, with a way to get there.
 *
 * One function for the product page, the quick-add on a card and "commander à
 * nouveau", so the confirmation reads the same wherever the tap came from —
 * and so the customer stays where they were. Jumping to the basket after
 * every add is the desktop habit that makes adding three parts a six-screen
 * round trip.
 *
 * It does not decide whether a part SHOULD be added. A part listed as not
 * fitting the customer's car asks first, and that question is asked by the
 * screen that knows it is asking — see the product page.
 */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  const show = useToast((s) => s.show);
  const router = useRouter();
  const { t } = useI18n();

  return useCallback(
    (product: Pick<Product, 'id' | 'slug' | 'name' | 'sku' | 'brand' | 'familySlug' | 'imageUrl'>, qty = 1) => {
      if (!add(product, qty)) {
        show({ message: t('product.cartFull'), tone: 'neutral' });
        return false;
      }
      show({
        message: t('product.added'),
        action: { label: t('product.viewCart'), onPress: () => router.navigate('/panier') },
      });
      return true;
    },
    [add, show, router, t],
  );
}
