import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DELEGATIONS, otherGovernorateIn } from '../delegations';

const ALL = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Sousse', 'Le Kef', 'Béja'];

test('the lists that are shipped are complete for their governorate', () => {
  assert.equal(DELEGATIONS.Tunis.length, 21);
  assert.equal(DELEGATIONS.Ariana.length, 7);
  assert.equal(DELEGATIONS['Ben Arous'].length, 12);
  assert.equal(DELEGATIONS.Manouba.length, 8);
  assert.equal(DELEGATIONS.Nabeul.length, 16);
});

test('an address naming another governorate is caught', () => {
  assert.equal(otherGovernorateIn('rue 12, cité manouba', 'Nabeul', ALL), 'Manouba');
  assert.equal(otherGovernorateIn('Avenue Habib Bourguiba, Sousse', 'Nabeul', ALL), 'Sousse');
  assert.equal(otherGovernorateIn('près du kef', 'Nabeul', ALL), 'Le Kef');
});

test('the chosen governorate and its own delegations are fine', () => {
  assert.equal(otherGovernorateIn('Rue de la plage, Nabeul', 'Nabeul', ALL), null);
  assert.equal(otherGovernorateIn('Cité Ennasr, Ariana', 'Ariana', ALL), null);
  assert.equal(otherGovernorateIn('Rue Ibn Khaldoun, Hammamet', 'Nabeul', ALL), null);
  assert.equal(otherGovernorateIn('Route de Tunis km 3', 'Nabeul', ALL), 'Tunis');
});
