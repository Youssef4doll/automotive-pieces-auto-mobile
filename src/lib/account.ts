import type { DictKey } from '@/i18n/dictionaries';

export type SignupField = 'name' | 'email' | 'phone' | 'password';
export type SignupInput = Record<SignupField, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * What is wrong with the create-account form, before it is sent.
 *
 * The same thresholds and sentences as the checkout (lib/checkout) and the
 * website's `signupSchema`, which has the last word: a refusal from the shop
 * names the field and lands on it through `fieldProblem` below.
 */
export function signupProblems(d: SignupInput): Partial<Record<SignupField, DictKey>> {
  const out: Partial<Record<SignupField, DictKey>> = {};
  const name = d.name.trim();
  const letters = (name.match(/\p{L}/gu) ?? []).length;
  if (name.includes('@')) out.name = 'checkout.err.customerNameEmail';
  else if (name.length < 2 || letters < 2) out.name = 'checkout.err.customerName';
  if (!EMAIL.test(d.email.trim())) out.email = 'checkout.err.email';
  if (d.phone.replace(/\D/g, '').length < 8) out.phone = 'checkout.err.phone';
  if (d.password.length < 6) out.password = 'auth.err.password';
  return out;
}

export function isEmail(value: string) {
  return EMAIL.test(value.trim());
}

/** The shop refused a field: which sentence goes under it. */
export function fieldProblem(field: string, reason?: string): { field: SignupField; key: DictKey } | null {
  switch (field) {
    case 'name':
      return { field: 'name', key: 'checkout.err.customerName' };
    case 'email':
      return { field: 'email', key: reason === 'taken' ? 'auth.err.taken' : 'checkout.err.email' };
    case 'phone':
      return { field: 'phone', key: 'checkout.err.phone' };
    case 'password':
      return { field: 'password', key: 'auth.err.password' };
    default:
      return null;
  }
}
