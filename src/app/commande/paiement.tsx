import { Redirect } from 'expo-router';

/**
 * The old second step. Checkout is one page now (commande/livraison); a link
 * or a back-stack that still points here lands on it.
 */
export default function PaymentStep() {
  return <Redirect href="/commande/livraison" />;
}
