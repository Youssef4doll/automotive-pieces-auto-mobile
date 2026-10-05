import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickLocale } from '../../i18n/locales';

test('an Arabic phone opens in Arabic', () => {
  assert.equal(pickLocale(['ar-TN', 'fr-FR']), 'ar');
});

test('a French phone opens in French', () => {
  assert.equal(pickLocale(['fr-TN']), 'fr');
});

test('an English or other phone opens in French, never English', () => {
  assert.equal(pickLocale(['en-US']), 'fr');
  assert.equal(pickLocale(['it-IT', 'en-GB']), 'fr');
  assert.equal(pickLocale([]), 'fr');
});

test('the first of the shop languages wins', () => {
  assert.equal(pickLocale(['en-US', 'ar-TN']), 'ar');
});
