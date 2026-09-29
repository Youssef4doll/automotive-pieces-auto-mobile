import { test } from 'node:test';
import assert from 'node:assert/strict';

import { canStartReturn, coverCopy, returnErrorKey, returnStep } from '../returns';

const option = (open: boolean) => ({ reason: 'NOT_NEEDED' as const, open, until: '2026-10-01T00:00:00Z', photo: 'optional' as const, unmounted: true, cover: 'standard' as const });

test('a return can start only with an open reason and a part still free', () => {
  assert.equal(canStartReturn({ returnOptions: null }), false);
  assert.equal(canStartReturn({ returnOptions: { deliveredAt: '', reasons: [option(true)], items: [{ orderItemId: 'a', returnable: 1 }] } }), true);
  assert.equal(canStartReturn({ returnOptions: { deliveredAt: '', reasons: [option(false)], items: [{ orderItemId: 'a', returnable: 1 }] } }), false);
  assert.equal(canStartReturn({ returnOptions: { deliveredAt: '', reasons: [option(true)], items: [{ orderItemId: 'a', returnable: 0 }] } }), false);
});

test('a misfit names the car when the car is what makes it the shop’s error', () => {
  assert.deepEqual(coverCopy('shop', 'DOES_NOT_FIT', 'Clio IV 1.5 dCi', null), { key: 'returns.cover.shopVehicle', vars: { vehicle: 'Clio IV 1.5 dCi' } });
  assert.deepEqual(coverCopy('shop', 'DAMAGED', 'Clio IV', null), { key: 'returns.cover.shop', vars: {} });
});

test('the warranty and 14-day lines use the shop’s figures, or say nothing', () => {
  assert.equal(coverCopy('warranty', 'DEFECTIVE', null, null), null);
  assert.deepEqual(coverCopy('standard', 'NOT_NEEDED', null, { warrantyMonths: 12, returnDays: 14 }), { key: 'returns.cover.standard', vars: { n: 14 } });
});

test('steps and refusals read from the shop’s answer', () => {
  assert.equal(returnStep({ status: 'APPROVED' }), 1);
  assert.equal(returnStep({ status: 'REFUSED' }), -1);
  assert.equal(returnErrorKey('photo_required'), 'returns.err.photo');
  assert.equal(returnErrorKey(undefined), 'returns.err.failed');
});
