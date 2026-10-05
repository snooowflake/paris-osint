import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  contains,
  clip,
  validGeometry,
  parisDay,
  utc,
  current,
  dedup,
} from './geo.mjs';
import {
  heightMeters,
  flowM3s,
  toWgs84,
} from '../../server/paris/projection.mjs';
import { Store } from '../../server/paris/storage.mjs';
import { allowedUrl, request, ods } from '../../server/paris/http.mjs';
import {
  Collector,
  boundary,
  registry,
} from '../../server/paris/collector.mjs';
import { feature, collectParis } from '../../server/paris/paris-data.mjs';
const square = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0],
    ],
    [
      [0.5, 0.5],
      [1.5, 0.5],
      [1.5, 1.5],
      [0.5, 1.5],
      [0.5, 0.5],
    ],
  ],
};
const response = (j) =>
  new Response(JSON.stringify(j), {
    headers: { 'content-type': 'application/json' },
  });
test('Paris officiel inclut ses bois et exclut les aéroports', () => {
  assert(contains([2.3522, 48.8566], boundary));
  assert(contains([2.25, 48.865], boundary));
  assert(!contains([2.55, 49.01], boundary));
  assert(!clip({ type: 'Point', coordinates: [2.55, 49.01] }, boundary));
});
test('Trous et lignes sont réellement découpés', () => {
  assert(!contains([1, 1], square));
  assert(contains([0.2, 0.2], square));
  const g = clip(
    {
      type: 'LineString',
      coordinates: [
        [-1, 1],
        [3, 1],
      ],
    },
    square,
  );
  assert.equal(g.coordinates.length, 2);
  assert.deepEqual(g.coordinates[0], [
    [0, 1],
    [0.5, 1],
  ]);
});
test('Polygones découpés, géométries malformées et CRS inconnus rejetés', () => {
  assert(
    clip(
      {
        type: 'Polygon',
        coordinates: [
          [
            [-1, -1],
            [3, -1],
            [3, 3],
            [-1, 3],
            [-1, -1],
          ],
        ],
      },
      square,
    ),
  );
  for (const g of [
    { type: 'Point', coordinates: [NaN, 1] },
    { type: 'Point', coordinates: [800, 42] },
    { type: 'LineString', coordinates: [1, 2] },
    {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 2],
        ],
      ],
    },
    { type: 'Point', coordinates: [1, 2], crs: 'EPSG:3857' },
  ])
    assert(!validGeometry(g));
});
test('Lambert-93 et unités hydrométriques convertis explicitement', () => {
  const p = toWgs84([653435, 6860703], 'EPSG:2154');
  assert(Math.abs(p[0] - 2.36551) < 0.001);
  assert(Math.abs(p[1] - 48.84468) < 0.001);
  assert.equal(heightMeters(1200), 1.2);
  assert.equal(flowM3s(250000), 250);
  assert.throws(() => toWgs84([1, 2], 'EPSG:3857'));
});
test('UTC, changements d’heure Paris et dates civiles inclusives', () => {
  assert.equal(utc('2026-10-05T02:00:00+02:00'), '2026-10-05T00:00:00.000Z');
  assert.equal(utc('2026-10-05 12:00'), null);
  assert.equal(utc(1e30), null);
  assert.equal(
    Date.parse(parisDay('2026-03-29', true)) -
      Date.parse(parisDay('2026-03-29')),
    23 * 36e5,
  );
  assert.equal(
    Date.parse(parisDay('2026-10-25', true)) -
      Date.parse(parisDay('2026-10-25')),
    25 * 36e5,
  );
  assert.equal(parisDay('2026-02-30'), null);
});
test('Collecte récente ne rajeunit pas une mesure, événements futurs exclus', () => {
  const s = { staleAfter: 600, nature: 'measurement' },
    f = {
      properties: {
        observedAt: '2020-01-01T00:00:00Z',
        collectedAt: new Date().toISOString(),
      },
    };
  assert(!current(f, s));
  f.properties.observedAt = new Date().toISOString();
  assert(current(f, s));
  f.properties.validFrom = new Date(Date.now() + 36e5).toISOString();
  assert(!current(f, s));
});
test('Déduplication conserve la date d’observation la plus récente', () => {
  const f = (t) => ({ id: 'TEST', properties: { observedAt: t } });
  assert.equal(
    dedup([f('2026-10-04T00:00:00Z'), f('2026-10-05T00:00:00Z')])[0].properties
      .observedAt,
    '2026-10-05T00:00:00Z',
  );
});
test('Budget partagé persistant réserve 20 % et change de jour UTC', () => {
  const s = new Store(':memory:');
  try {
    for (let i = 0; i < 8; i++) assert(s.reserve('TEST', 10, 0));
    assert(!s.reserve('TEST', 10, 0));
    assert(s.reserve('TEST', 10, 864e5));
  } finally {
    s.close();
  }
});
test('Pagination ODS complète et schéma vérifié', async () => {
  let calls = 0;
  const j = await ods('opendata.paris.fr', 'test-fixture', {
    fetcher: async (u) => {
      calls++;
      const url = new URL(u);
      if (!url.pathname.endsWith('/records'))
        return response({ fields: [], metas: { default: {} } });
      const offset = Number(url.searchParams.get('offset'));
      return response({
        total_count: 205,
        results: Array.from(
          { length: Math.min(100, 205 - offset) },
          (_, i) => ({ id: offset + i }),
        ),
      });
    },
  });
  assert.equal(j.rows.length, 205);
  assert.equal(calls, 4);
});
test('Pagination tronquée ou instable ne passe pas pour complète', async () => {
  for (const unstable of [false, true]) {
    let page = 0;
    await assert.rejects(
      ods('opendata.paris.fr', 'test-fixture', {
        fetcher: async (u) =>
          !new URL(u).pathname.endsWith('/records')
            ? response({ fields: [], metas: { default: {} } })
            : response({
                total_count: unstable ? 205 + page++ : 205,
                results: Array.from(
                  { length: unstable ? 100 : 20 },
                  () => ({}),
                ),
              }),
      }),
    );
  }
});
test('Proxys rejettent réseau privé, métadonnées cloud, URL arbitraire et identifiants', () => {
  for (const u of [
    'http://localhost/',
    'https://169.254.169.254/',
    'https://example.org/',
    'https://user:password@hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr',
    'https://hubeau.eaufrance.fr:444/api/v2/hydrometrie/observations_tr',
  ])
    assert.throws(() => allowedUrl(u));
});
test('Erreurs d’authentification, quotas, JSON et taille détectés ; redirection refusée', async () => {
  for (const [status, state] of [
    [401, 'auth_error'],
    [429, 'quota'],
  ])
    await assert.rejects(
      request(
        'https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr',
        {
          fetcher: async () => new Response('', { status }),
        },
      ),
      (e) => e.state === state,
    );
  await assert.rejects(
    request('https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr', {
      fetcher: async () => new Response('bad'),
    }),
  );
  await assert.rejects(
    request('https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr', {
      limit: 2,
      fetcher: async () => response({ big: true }),
    }),
  );
  await request(
    'https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr',
    {
      fetcher: async (u, init) => {
        assert.equal(init.redirect, 'error');
        assert(init.signal);
        return response({});
      },
    },
  );
});
test('Source sans clé ne fait aucun appel', async () => {
  const store = new Store(':memory:');
  let calls = 0;
  try {
    const c = new Collector(store, {
      env: {},
      fetcher: async () => {
        calls++;
        return response({});
      },
    });
    await c.collect(registry.find((s) => s.id === 'airparif'));
    assert.equal(calls, 0);
    assert.equal(
      c.status(registry.find((s) => s.id === 'airparif')).integration,
      'missing_key',
    );
  } finally {
    store.close();
  }
});
test('Collectes concurrentes coalescées, vide légitime et backoff isolés', async () => {
  const store = new Store(':memory:');
  let calls = 0;
  const s = {
    id: 'TEST-source',
    enabled: true,
    adapter: 'TEST',
    refreshSeconds: 600,
    staleAfter: 600,
    dailyBudget: 20,
    map: true,
    retentionDays: 0,
  };
  try {
    const c = new Collector(store, {
      env: {},
      adapters: {
        TEST: async () => {
          calls++;
          await new Promise((r) => setTimeout(r, 5));
          return { features: [] };
        },
      },
    });
    await Promise.all([c.collect(s), c.collect(s)]);
    assert.equal(calls, 1);
    assert.equal(c.status(s).state, 'empty');
    await c.collect(s);
    assert.equal(calls, 1);
    const bad = { ...s, id: 'TEST-bad', adapter: 'BAD' };
    c.adapters.BAD = async () => {
      throw Error('sensitive URL');
    };
    await c.collect(bad);
    assert.equal(c.status(bad).count, null);
    assert(!c.status(bad).error.includes('sensitive'));
    await c.collect(bad);
    assert.equal(c.status(s).state, 'empty');
  } finally {
    store.close();
  }
});
test('Historique conserve première acquisition et purge la rétention', () => {
  const s = new Store(':memory:');
  try {
    const source = { id: 'TEST', retentionDays: 1, nature: 'event' },
      f = feature(
        source,
        'TEST',
        'TEST SYNTHÉTIQUE',
        null,
        {},
        { validFrom: '2020-01-01T00:00:00Z' },
      );
    s.archive(source, [f], 100000);
    f.properties.collectedAt = '2026-10-05T00:00:00Z';
    s.archive(source, [f], 200000);
    const rows = s.db.prepare('SELECT * FROM history').all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].firstSeen, new Date(100000).toISOString());
    assert.equal(
      JSON.parse(rows[0].feature).properties.validFrom,
      '2020-01-01T00:00:00Z',
    );
    s.purge(200000 + 864e5 + 1);
    assert.equal(s.db.prepare('SELECT COUNT(*) n FROM history').get().n, 0);
  } finally {
    s.close();
  }
});
test('Registre unique, preuves bornées, données privées exclues du build', () => {
  assert.equal(new Set(registry.map((s) => s.id)).size, registry.length);
  for (const s of registry) {
    assert(s.producer && s.license && s.documentation && s.schema);
    assert(Number.isFinite(s.dailyBudget));
  }
  const html = fs.readFileSync('dist/index.html', 'utf8');
  assert(!html.includes('TEST SYNTHÉTIQUE'));
  for (const f of fs
    .readdirSync('dist/assets')
    .filter((f) => f.endsWith('.js'))) {
    const text = fs.readFileSync('dist/assets/' + f, 'utf8');
    assert(!text.includes('BEGIN PRIVATE KEY'));
    assert(!text.includes('TOMTOM_API_KEY'));
    assert(!text.includes('AIRPARIF_API_KEY'));
  }
  assert(!fs.existsSync('dist/var'));
  assert(!fs.existsSync('dist/config'));
});
