/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { governorateFromRegion, inTunisia, project, tilesFor, unproject } from '../map-tiles';

const GOV = ['Tunis', 'Ariana', 'Ben Arous', 'Béja', 'Gabès', 'Le Kef', 'Sfax'];

describe('map tiles', () => {
  it('projects and unprojects the same point', () => {
    const p = { lat: 36.8065, lng: 10.1815 };
    const back = unproject(project(p, 16), 16);
    assert.ok(Math.abs(back.lat - p.lat) < 1e-9 && Math.abs(back.lng - p.lng) < 1e-9);
  });

  it('covers the view with tiles, the centre tile under the centre', () => {
    const tiles = tilesFor({ lat: 36.8065, lng: 10.1815 }, 16, 340, 260);
    assert.ok(tiles.length >= 4 && tiles.length <= 9);
    const under = tiles.find((t) => t.x <= 170 && t.x + 256 > 170 && t.y <= 130 && t.y + 256 > 130);
    assert.ok(under, 'a tile sits under the pin');
    assert.match(under!.url, /^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/);
  });

  it('knows Tunisia from elsewhere', () => {
    assert.equal(inTunisia({ lat: 36.8, lng: 10.18 }), true);
    assert.equal(inTunisia({ lat: 48.85, lng: 2.35 }), false);
  });

  it('reads the governorate a phone names, and nothing it cannot', () => {
    assert.equal(governorateFromRegion('Ariana', GOV), 'Ariana');
    assert.equal(governorateFromRegion('Gouvernorat de Béja', GOV), 'Béja');
    assert.equal(governorateFromRegion('Gabes Governorate', GOV), 'Gabès');
    assert.equal(governorateFromRegion('Kef', GOV), null);
    assert.equal(governorateFromRegion('Île-de-France', GOV), null);
    assert.equal(governorateFromRegion(null, GOV), null);
  });
});
