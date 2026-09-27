import { test } from 'node:test';
import assert from 'node:assert/strict';

import { careDue, parseDate } from '../care';

test('the oil change is due from the owner\'s own interval, never an assumed one', () => {
  assert.deepEqual(careDue({ mileageKm: 120_000, oilChangeKm: 110_000 }), []);
  assert.deepEqual(careDue({ mileageKm: 119_200, oilChangeKm: 110_000, oilIntervalKm: 10_000 }), [{ kind: 'oil', km: 800, overdue: false }]);
  assert.deepEqual(careDue({ mileageKm: 121_000, oilChangeKm: 110_000, oilIntervalKm: 10_000 }), [{ kind: 'oil', km: 1000, overdue: true }]);
});

test('dates count days, overdue first', () => {
  const today = new Date('2026-09-27T10:00:00Z');
  const due = careDue({ inspectionDue: '2026-10-07', insuranceDue: '2026-09-20' }, today);
  assert.equal(due[0].kind, 'insurance');
  assert.equal(due[0].overdue, true);
  assert.equal(due[1].kind, 'inspection');
});

test('dates are typed day first, and impossible ones are refused', () => {
  assert.equal(parseDate('07/10/2026'), '2026-10-07');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('2026-10-07'), null);
});
