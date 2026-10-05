// TESTS SYNTHÉTIQUES : libellés et styles, aucun appel réseau.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normMode,
  hexColor,
  textOn,
  lineRefOf,
  roadEvent,
  severity,
} from './model.mjs';
import { migratePreferences } from '../../server/paris/routes.mjs';
test('Modes IDFM ramenés à des codes stables', () => {
  for (const [raw, mode] of [
    ['METRO', 'metro'],
    ['Métro', 'metro'],
    ['RER', 'rer'],
    ['RapidTransit', 'rer'],
    ['TRAMWAY', 'tram'],
    ['Tramway', 'tram'],
    ['TRAIN', 'train'],
    ['LocalTrain', 'train'],
    ['Bus', 'bus'],
    ['Funiculaire', 'funicular'],
    ['', 'other'],
    ['<script>', 'other'],
  ])
    assert.equal(normMode(raw), mode, raw);
});
test('Couleurs officielles validées et contraste du texte', () => {
  assert.equal(hexColor('ffcd00'), '#FFCD00');
  assert.equal(hexColor('#003CA6'), '#003CA6');
  assert.equal(hexColor('red;background:url(x)'), null);
  assert.equal(textOn('#FFCD00'), '#111111');
  assert.equal(textOn('#003CA6'), '#FFFFFF');
  assert.equal(lineRefOf('line:IDFM:C01371'), 'C01371');
  assert.equal(lineRefOf('STIF:Line::C01371:'), 'C01371');
  assert.equal(lineRefOf('C1371'), null);
});
test('Événements CIFS et sévérités PRIM lisibles, valeurs inconnues conservées', () => {
  assert.deepEqual(
    roadEvent({
      type: 'ROAD_CLOSED',
      subtype: 'ROAD_CLOSED_EVENT',
      direction: 'ONE_DIRECTION',
    }),
    {
      kind: 'closure',
      label: 'Voie fermée',
      detail: 'Fermeture pour événement',
      direction: 'Un sens',
    },
  );
  assert.equal(roadEvent({ type: 'LANE_CLOSED' }).label, 'Lane closed');
  assert.equal(roadEvent({}).label, 'Événement de voirie');
  assert.equal(severity('BLOQUANTE').rank, 3);
  assert.equal(severity('AUTRE_CODE').label, 'Autre code');
});
test('Préférences antérieures : couches retirées écartées, nouvelles couches proposées une fois', () => {
  const old = migratePreferences({
    layers: ['hubeau', 'vigicrues', 'adsb'],
    favorites: [
      { id: 'TEST', source: 'belib', name: 'TEST' },
      { id: 'TEST', source: 'velib', name: 'TEST' },
    ],
    views: [],
    airportContext: true,
  });
  assert(old.layers.includes('hubeau'));
  assert(old.layers.includes('tomtom-flow'));
  assert(!old.layers.includes('vigicrues'));
  assert.deepEqual(
    old.favorites.map((f) => f.source),
    ['velib'],
  );
  assert(!('airportContext' in old));
  assert.deepEqual(
    migratePreferences({ version: 2, layers: ['hubeau'] }).layers,
    ['hubeau'],
  );
  assert.equal(migratePreferences(null).version, 2);
});
