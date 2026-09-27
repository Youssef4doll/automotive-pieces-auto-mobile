import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pluralize } from '../../i18n/plural';

const PIECES = '{n:one=قطعة واحدة;two=قطعتان;few=# قطع;other=# قطعة}';

test('Arabic uses the dual, the plural of 3–10, and the singular of 11+', () => {
  assert.equal(pluralize(PIECES, 'ar', { n: 1 }), 'قطعة واحدة');
  assert.equal(pluralize(PIECES, 'ar', { n: 2 }), 'قطعتان');
  assert.equal(pluralize(PIECES, 'ar', { n: 8 }), '8 قطع');
  assert.equal(pluralize(PIECES, 'ar', { n: 16 }), '16 قطعة');
  assert.equal(pluralize(PIECES, 'ar', { n: 103 }), '103 قطع');
});

test('French and English resolve "(s)"; French 0 is singular', () => {
  assert.equal(pluralize('{n} pièce(s) remise(s)', 'fr', { n: 1 }), '{n} pièce remise');
  assert.equal(pluralize('{n} pièce(s)', 'fr', { n: 0 }), '{n} pièce');
  assert.equal(pluralize('{n} pièce(s)', 'fr', { n: 3 }), '{n} pièces');
  assert.equal(pluralize('{n} item(s)', 'en', { n: 0 }), '{n} items');
  assert.equal(pluralize('{n} item(s)', 'en', { n: 1 }), '{n} item');
});

test('a string without counts is untouched', () => {
  assert.equal(pluralize('Livraison {t}', 'fr', { t: '24h' }), 'Livraison {t}');
});
