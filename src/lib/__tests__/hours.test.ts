import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hoursIn } from '../../i18n/data-locale';

test('the shop hours read in English and Arabic', () => {
  assert.equal(hoursIn('Lun–Sam · 8h30–18h30', 'en'), 'Mon–Sat · 8:30–18:30');
  assert.equal(hoursIn('Lun–Sam · 8h30–18h30', 'ar'), 'الإثنين–السبت · 8:30–18:30');
  assert.equal(hoursIn('Lundi au vendredi 9h–17h, dimanche fermé', 'en'), 'Mon au Fri 9:00–17:00, Sun closed');
  assert.equal(hoursIn('Lun–Sam · 8h30–18h30', 'fr'), 'Lun–Sam · 8h30–18h30');
});
