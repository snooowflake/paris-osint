// TESTS SYNTHÉTIQUES : aucune archive réelle créée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numericSeries } from './history.mjs';
test('Courbes : stations, grandeurs et unités restent séparées', () => {
  const row = (id, value, unit, at) => ({
    feature: {
      id,
      properties: {
        source: 'hubeau',
        name: 'TEST SYNTHÉTIQUE',
        value,
        unit,
        observedAt: at,
      },
    },
  });
  const rows = [
    row('TEST:H', 1, 'm', '2026-01-01T00:00:00Z'),
    row('TEST:Q', 20, 'm³/s', '2026-01-01T00:00:00Z'),
    row('TEST:H', 1.1, 'm', '2026-01-01T01:00:00Z'),
    row('TEST:H', 1.2, 'm', '2026-01-01T01:00:00Z'),
    row('TEST-2:H', 26, 'm', '2026-01-01T01:00:00Z'),
  ];
  const g = numericSeries(rows);
  assert.equal(g.length, 3);
  assert.deepEqual(
    g[0].points.map((p) => p.value),
    [1, 1.2],
  );
  assert.equal(g[1].unit, 'm³/s');
});
test('Courbes : observation inconnue ou valeur non numérique exclue', () => {
  const rows = [
    {
      feature: {
        id: 'TEST',
        properties: { source: 'hubeau', value: 1, observedAt: null },
      },
    },
    {
      feature: {
        id: 'TEST',
        properties: {
          source: 'hubeau',
          value: 'inconnu',
          observedAt: '2026-01-01T00:00:00Z',
        },
      },
    },
  ];
  assert.deepEqual(numericSeries(rows), []);
});
test('Courbes : correction la plus récemment acquise conservée indépendamment de l’ordre SQL', () => {
  const row = (value, lastSeen) => ({
    lastSeen,
    feature: {
      id: 'TEST:H',
      properties: {
        source: 'hubeau',
        name: 'TEST SYNTHÉTIQUE',
        value,
        unit: 'm',
        observedAt: '2026-01-01T00:00:00Z',
      },
    },
  });
  const g = numericSeries([
    row(1.2, '2026-01-01T02:00:00Z'),
    row(1.1, '2026-01-01T01:00:00Z'),
  ]);
  assert.equal(g[0].points[0].value, 1.2);
});
