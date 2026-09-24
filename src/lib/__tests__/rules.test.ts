/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ShopSettings } from '@/api/shop';
import { fieldProblem, isEmail, signupProblems } from '@/lib/account';
import { checkoutProblems, deliveryDelay } from '@/lib/checkout';
import { formatDT, yearSpan } from '@/lib/format';
import type { CheckoutDetails } from '@/store/checkout';

/**
 * The rules the app applies before the shop does. The shop has the last
 * word on every one of them; these tests hold the app to the same
 * thresholds so a customer hears about a problem on the screen where they
 * made it, not one screen later.
 */

const details = (patch: Partial<CheckoutDetails> = {}): CheckoutDetails => ({
  customerName: 'Amina Ben Salah',
  phone: '22 334 455',
  email: '',
  governorate: 'Ariana',
  address: '3 rue de la Liberté',
  notes: '',
  deliveryMethod: 'DELIVERY',
  ...patch,
});

describe('checkout form', () => {
  it('accepts a complete delivery', () => {
    assert.deepEqual(checkoutProblems(details()), {});
  });
  it('accepts names in Arabic script and with apostrophes', () => {
    assert.deepEqual(checkoutProblems(details({ customerName: 'بن صالح' })), {});
    assert.deepEqual(checkoutProblems(details({ customerName: "M'hamed Abd el-Kader" })), {});
  });
  it('refuses an e-mail typed into the name box, with its own sentence', () => {
    assert.equal(checkoutProblems(details({ customerName: 'ttttt@gmail.com' })).customerName, 'checkout.err.customerNameEmail');
  });
  it('refuses a name without letters', () => {
    assert.equal(checkoutProblems(details({ customerName: '12' })).customerName, 'checkout.err.customerName');
  });
  it('needs eight digits of phone, whatever the spacing', () => {
    assert.equal(checkoutProblems(details({ phone: '22 33' })).phone, 'checkout.err.phone');
    assert.equal(checkoutProblems(details({ phone: '+216 22-334-455' })).phone, undefined);
  });
  it('treats the e-mail as optional but checks it when given', () => {
    assert.equal(checkoutProblems(details({ email: 'nope' })).email, 'checkout.err.email');
    assert.equal(checkoutProblems(details({ email: 'a@b.tn' })).email, undefined);
  });
  it('needs an address for delivery, not for pickup', () => {
    assert.equal(checkoutProblems(details({ address: '' })).address, 'checkout.err.address');
    assert.equal(checkoutProblems(details({ address: '', deliveryMethod: 'PICKUP' })).address, undefined);
  });
});

describe('create-account form', () => {
  const ok = { name: 'Amina Ben Salah', email: 'amina@exemple.tn', phone: '22334455', password: 'secret1' };
  it('accepts a complete form', () => {
    assert.deepEqual(signupProblems(ok), {});
  });
  it('names every field that is wrong at once', () => {
    assert.deepEqual(Object.keys(signupProblems({ name: 'a@b.c', email: 'x', phone: '1', password: '123' })).sort(), [
      'email',
      'name',
      'password',
      'phone',
    ]);
  });
  it('needs six characters of password, as the website', () => {
    assert.equal(signupProblems({ ...ok, password: '12345' }).password, 'auth.err.password');
    assert.equal(signupProblems({ ...ok, password: '123456' }).password, undefined);
  });
  it('maps the shop’s refusals onto the fields', () => {
    assert.deepEqual(fieldProblem('email', 'taken'), { field: 'email', key: 'auth.err.taken' });
    assert.deepEqual(fieldProblem('email'), { field: 'email', key: 'checkout.err.email' });
    assert.equal(fieldProblem('form'), null);
  });
  it('recognises an e-mail with surrounding spaces', () => {
    assert.equal(isEmail('  amina@exemple.tn '), true);
    assert.equal(isEmail('amina@'), false);
  });
});

describe('money and years', () => {
  it('writes dinars the Tunisian way, isolated for right-to-left text', () => {
    assert.equal(formatDT(89), '⁦89,00 DT⁩');
    assert.equal(formatDT(117.3), '⁦117,30 DT⁩');
  });
  it('says nothing about years the shop did not record', () => {
    const t = (key: string, vars: Record<string, number>) => `${key}:${Object.values(vars).join('-')}`;
    assert.equal(yearSpan(2004, 2011, t), 'common.years:2004-2011');
    assert.equal(yearSpan(2019, null, t), 'common.yearsFrom:2019');
    assert.equal(yearSpan(null, null, t), null);
  });
});

describe('delivery delay', () => {
  const settings = {
    delivery: { grandTunis: '24h', regions: '48–72h' },
    grandTunis: ['Tunis', 'Ariana', 'Ben Arous', 'Manouba'],
  } as unknown as ShopSettings;
  it('is the shop’s published delay for the governorate, never a date', () => {
    assert.equal(deliveryDelay(settings, 'Ariana'), '24h');
    assert.equal(deliveryDelay(settings, 'Sfax'), '48–72h');
  });
  it('is nothing when the shop has published nothing', () => {
    const none = { delivery: { grandTunis: null, regions: null }, grandTunis: [] } as unknown as ShopSettings;
    assert.equal(deliveryDelay(none, 'Sfax'), null);
  });
});
