import { test } from 'node:test';
import assert from 'node:assert/strict';

import { arrivalWindow } from '../arrival';

test('the window is the shipping time plus the shop\'s own delay', () => {
  const w = arrivalWindow('2026-09-28T10:00:00Z', '48–72h');
  assert.equal(w?.from.toISOString(), '2026-09-30T10:00:00.000Z');
  assert.equal(w?.to.toISOString(), '2026-10-01T10:00:00.000Z');
  const one = arrivalWindow('2026-09-28T10:00:00Z', '24h');
  assert.equal(one?.from.toISOString(), one?.to.toISOString());
});

test('no date from a delay that is not in hours, or none at all', () => {
  assert.equal(arrivalWindow('2026-09-28T10:00:00Z', '2 à 3 jours'), null);
  assert.equal(arrivalWindow('2026-09-28T10:00:00Z', null), null);
});
