// Données TEST SYNTHÉTIQUES uniquement, sans appels réseau réels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../server/paris/storage.mjs';
import {
  Collector,
  registry,
  boundary,
} from '../../server/paris/collector.mjs';
import { parsePrim, prim } from '../../server/paris/prim.mjs';
import { hydro } from '../../server/paris/environment.mjs';
import { collectParis, collectVelib } from '../../server/paris/paris-data.mjs';
import { contains } from './geo.mjs';
const response = (x) =>
  new Response(JSON.stringify(x), {
    headers: { 'content-type': 'application/json' },
  });
const date = () => new Date().toISOString();
test('PRIM : dates SIRI, texte échappé, lignes exclues et clé manquante', async () => {
  const s = registry.find((s) => s.id === 'prim-messages'),
    at = date();
  const j = {
    Siri: {
      ServiceDelivery: {
        ResponseTimestamp: at,
        GeneralMessageDelivery: [
          {
            Status: true,
            InfoMessage: [
              {
                RecordedAtTime: at,
                ItemIdentifier: { value: 'TEST' },
                ValidUntilTime: new Date(Date.now() + 3600000).toISOString(),
                Content: {
                  LineRef: [{ value: 'STIF:Line::C12345:' }],
                  Message: [
                    {
                      MessageText: {
                        value: 'TEST <img src=x onerror=bad> message',
                      },
                    },
                  ],
                },
              },
              {
                RecordedAtTime: at,
                ItemIdentifier: { value: 'TEST-OUT' },
                Content: {
                  LineRef: [{ value: 'STIF:Line::C54321:' }],
                  Message: [{ MessageText: { value: 'TEST HORS PÉRIMÈTRE' } }],
                },
              },
            ],
          },
        ],
      },
    },
  };
  const rows = parsePrim(s, j, 'C12345');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].geometry, null);
  assert.equal(rows[0].properties.publishedAt, at);
  assert(!rows[0].properties.description.includes('<img'));
  assert.throws(() => parsePrim(s, {}, 'C12345'));
  const db = new Store(':memory:');
  try {
    let calls = 0;
    const c = new Collector(db, {
      env: {},
      fetcher: async () => {
        calls++;
        return response(j);
      },
    });
    await c.collect(s);
    assert.equal(calls, 0);
    assert.equal(c.status(s).integration, 'missing_key');
    const keyed = new Collector(db, {
      env: { PRIM_API_KEY: 'TEST_SYNTHETIQUE' },
    });
    assert.equal(keyed.status(s).integration, 'implemented_unverified');
    await assert.rejects(
      prim(s, { store: db }, { PRIM_LINE_IDS: 'C12345' }),
      /Lignes non vérifiées/,
    );
    await assert.rejects(
      prim(
        s,
        { store: db },
        { PRIM_LINE_IDS: Array(6).fill('C12345').join(',') },
      ),
      /1 à 5/,
    );
  } finally {
    db.close();
  }
});
test('Hub’Eau : référentiel officiel, pagination et unités sans station inventée', async () => {
  const db = new Store(':memory:');
  try {
    const at = date(),
      later = new Date(Date.now() - 60000).toISOString();
    let calls = 0;
    const o = {
      store: db,
      fetcher: async (u) => {
        calls++;
        const url = new URL(u);
        if (url.pathname.includes('referentiel'))
          return response({
            data: [
              {
                code_station: 'TEST000001',
                en_service: true,
                code_commune_station: '75056',
                longitude_station: 2.35,
                latitude_station: 48.85,
                libelle_station: 'TEST SYNTHÉTIQUE Seine',
              },
              {
                code_station: 'TEST000002',
                en_service: true,
                code_commune_station: '75056',
                longitude_station: 1,
                latitude_station: 48,
                libelle_station: 'TEST HORS PARIS',
              },
            ],
          });
        if (!url.searchParams.has('cursor'))
          return response({
            data: [
              {
                code_station: 'TEST000001',
                grandeur_hydro: 'H',
                date_obs: later,
                resultat_obs: 2000,
              },
            ],
            next: 'https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=TEST000001&cursor=2',
          });
        return response({
          data: [
            {
              code_station: 'TEST000001',
              grandeur_hydro: 'H',
              date_obs: at,
              resultat_obs: 2500,
            },
            {
              code_station: 'TEST000001',
              grandeur_hydro: 'Q',
              date_obs: at,
              resultat_obs: 123000,
            },
          ],
          next: null,
        });
      },
    };
    const j = await hydro(
      registry.find((s) => s.id === 'hubeau'),
      o,
      boundary,
    );
    assert.equal(calls, 3);
    assert.equal(j.features.length, 2);
    assert(j.features.every((f) => contains(f.geometry.coordinates, boundary)));
    assert.deepEqual(
      j.features.map((f) => f.properties.value),
      [2.5, 123],
    );
    assert(j.features[0].properties.reference.includes('non renseigné'));
  } finally {
    db.close();
  }
});
test('PC Lutèce : polyline latitude/longitude, date et description non fiable', async () => {
  const s = registry.find((s) => s.id === 'pc-lutece'),
    at = date();
  let calls = 0;
  const j = await collectParis(s, {
    fetcher: async (u) => {
      calls++;
      return response(
        String(u).includes('/records')
          ? {
              total_count: 1,
              results: [
                {
                  id: 'TEST',
                  street: 'TEST SYNTHÉTIQUE',
                  polyline: '48.85 2.35 48.86 2.36',
                  description: '<script>bad</script>',
                  starttime: at,
                },
              ],
            }
          : {
              fields: [{ name: 'id', type: 'text' }],
              metas: { default: { modified: at, license: 'TEST' } },
            },
      );
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(j.features[0].geometry.coordinates, [
    [2.35, 48.85],
    [2.36, 48.86],
  ]);
  assert(!j.features[0].properties.description.includes('<'));
  assert.equal(j.features[0].properties.validFrom, at);
});
test('GBFS : jointure StationCode, types de vélos et TTL conservés', async () => {
  const db = new Store(':memory:');
  try {
    const now = Math.floor(Date.now() / 1000);
    const s = registry.find((s) => s.id === 'velib');
    let calls = 0;
    const j = await collectVelib(s, {
      store: db,
      fetcher: async (u) => {
        calls++;
        return response(
          String(u).includes('information')
            ? {
                data: {
                  stations: [
                    {
                      station_id: 1,
                      stationCode: 'TEST1',
                      name: 'TEST SYNTHÉTIQUE',
                      lon: 2.35,
                      lat: 48.85,
                    },
                  ],
                },
              }
            : {
                last_updated: now,
                ttl: 3600,
                data: {
                  stations: [
                    {
                      station_id: 1,
                      last_reported: now,
                      num_bikes_available: 5,
                      num_docks_available: 3,
                      num_bikes_available_types: [
                        { mechanical: 2 },
                        { ebike: 3 },
                      ],
                      is_renting: 1,
                    },
                    { station_id: 999, last_reported: now },
                  ],
                },
              },
        );
      },
    });
    assert.equal(calls, 2);
    assert.equal(j.ttl, 3600);
    assert.equal(j.features.length, 1);
    assert.equal(j.features[0].id, 'TEST1');
    assert.equal(j.features[0].properties.mechanical, 2);
    assert.equal(j.features[0].properties.electric, 3);
    assert.equal(j.features[0].properties.docks, 3);
  } finally {
    db.close();
  }
});
test('Panne : aucune ancienne couche exportée comme un état courant', () => {
  const db = new Store(':memory:');
  try {
    const s = registry.find((s) => s.id === 'hubeau'),
      c = new Collector(db);
    db.set('source:' + s.id, {
      features: [
        {
          type: 'Feature',
          id: 'TEST',
          geometry: { type: 'Point', coordinates: [2.35, 48.85] },
          properties: { observedAt: date() },
        },
      ],
      errorState: 'failure',
    });
    assert.equal(c.features(s).length, 0);
    assert.equal(c.status(s).count, null);
  } finally {
    db.close();
  }
});
test('Une observation inchangée ne prolonge pas indéfiniment la rétention', () => {
  const db = new Store(':memory:');
  try {
    const s = { id: 'TEST', nature: 'measurement', retentionDays: 1 },
      f = {
        type: 'Feature',
        id: 'TEST',
        geometry: null,
        properties: {
          name: 'TEST SYNTHÉTIQUE',
          observedAt: '2026-01-01T00:00:00Z',
        },
      };
    db.archive(s, [f], 100000);
    db.archive(s, [f], 200000);
    const r = db.db.prepare('SELECT * FROM history').get();
    assert.equal(r.expires, 100000 + 86400000);
    db.purge(100000 + 86400000 + 1);
    assert.equal(db.db.prepare('SELECT COUNT(*) n FROM history').get().n, 0);
  } finally {
    db.close();
  }
});
