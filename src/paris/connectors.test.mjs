// Données TEST SYNTHÉTIQUES uniquement, sans appels réseau réels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../server/paris/storage.mjs';
import {
  Collector,
  registry,
  boundary,
} from '../../server/paris/collector.mjs';
import {
  parseDisruptions,
  parseDepartures,
  primDisruptions,
  Departures,
} from '../../server/paris/prim.mjs';
import { hydro } from '../../server/paris/environment.mjs';
import {
  collectComptages,
  collectParis,
  collectVelib,
} from '../../server/paris/paris-data.mjs';
import { lignes } from '../../server/paris/references.mjs';
import {
  FlowTiles,
  tileInParis,
  lonLatTile,
  tomtomFlowProbe,
} from '../../server/paris/paid.mjs';
import { contains } from './geo.mjs';
const response = (x) =>
  new Response(JSON.stringify(x), {
    headers: { 'content-type': 'application/json' },
  });
const date = () => new Date().toISOString();
const png = () =>
  new Response(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('TEST SYNTHÉTIQUE'),
    ]),
  );
test('PRIM perturbations : périodes heure de Paris, lignes parisiennes seules, texte échappé', () => {
  const s = registry.find((s) => s.id === 'prim-perturbations'),
    now = Date.parse('2026-07-05T10:00:00Z');
  const j = {
    lastUpdatedDate: '2026-07-05T09:58:00Z',
    disruptions: [
      {
        id: 'TEST-1',
        applicationPeriods: [
          { begin: '20260705T110000', end: '20260705T140000' },
        ],
        lastUpdate: '20260705T115500',
        cause: 'PERTURBATION',
        severity: 'BLOQUANTE',
        title: 'TEST SYNTHÉTIQUE interruption',
        message: '<p>TEST <img src=x onerror=bad> message</p>',
      },
      {
        id: 'TEST-PASSE',
        applicationPeriods: [
          { begin: '20260701T080000', end: '20260701T090000' },
        ],
        title: 'TEST terminé',
      },
    ],
    lines: [
      {
        id: 'line:IDFM:C01371',
        shortName: '1',
        mode: 'Metro',
        impactedObjects: [
          { type: 'line', id: 'line:IDFM:C01371', disruptionIds: ['TEST-1'] },
          {
            type: 'stop_area',
            name: 'TEST Station',
            disruptionIds: ['TEST-1', 'TEST-PASSE'],
          },
        ],
      },
      {
        id: 'line:IDFM:C99999',
        shortName: 'HORS',
        impactedObjects: [{ type: 'line', disruptionIds: ['TEST-1'] }],
      },
    ],
  };
  const rows = parseDisruptions(s, j, new Set(['C01371']), now);
  assert.equal(rows.length, 1);
  const p = rows[0].properties;
  assert.equal(rows[0].geometry, null);
  assert.equal(p.lineRef, 'C01371');
  assert.equal(p.mode, 'metro');
  assert.equal(p.severity, 'BLOQUANTE');
  assert.equal(p.validFrom, '2026-07-05T09:00:00.000Z');
  assert.equal(p.validTo, '2026-07-05T12:00:00.000Z');
  assert.equal(p.publishedAt, '2026-07-05T09:58:00.000Z');
  assert.deepEqual(p.stops, ['TEST Station']);
  assert(!p.description.includes('<'));
  assert.throws(() => parseDisruptions(s, {}, new Set(['C01371'])));
});
test('PRIM : aucun appel sans clé ni sans référentiel parisien', async () => {
  const s = registry.find((s) => s.id === 'prim-perturbations'),
    db = new Store(':memory:');
  try {
    let calls = 0;
    const c = new Collector(db, {
      env: {},
      fetcher: async () => {
        calls++;
        return response({});
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
      primDisruptions(s, { store: db, fetcher: async () => response({}) }, {}),
      /Référentiels/,
    );
  } finally {
    db.close();
  }
});
test('PRIM prochains passages : SIRI trié, dates UTC, cache partagé et clé requise', async () => {
  const now = Date.now(),
    at = (m) => new Date(now + m * 60000).toISOString();
  const j = {
    Siri: {
      ServiceDelivery: {
        StopMonitoringDelivery: [
          {
            Status: 'true',
            MonitoredStopVisit: [
              {
                MonitoredVehicleJourney: {
                  LineRef: { value: 'STIF:Line::C01371:' },
                  DestinationName: [{ value: 'TEST <b>Destination</b>' }],
                  MonitoredCall: {
                    ExpectedDepartureTime: at(7),
                    AimedDepartureTime: at(6),
                    DepartureStatus: 'delayed',
                  },
                },
              },
              {
                MonitoredVehicleJourney: {
                  LineRef: { value: 'STIF:Line::C01371:' },
                  MonitoredCall: { ExpectedArrivalTime: at(2) },
                },
              },
              {
                MonitoredVehicleJourney: {
                  MonitoredCall: { ExpectedDepartureTime: at(-30) },
                },
              },
            ],
          },
        ],
      },
    },
  };
  const rows = parseDepartures(j, now);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].expectedAt, at(2));
  assert.equal(rows[1].lineRef, 'C01371');
  assert.equal(rows[1].status, 'DELAYED');
  assert(!rows[1].destination.includes('<'));
  assert.throws(() => parseDepartures({}));
  const db = new Store(':memory:');
  try {
    const s = registry.find((s) => s.id === 'prim-passages');
    let calls = 0;
    const fetcher = async (u, init) => {
      calls++;
      assert.equal(
        new URL(u).searchParams.get('MonitoringRef'),
        'STIF:StopPoint:Q:12345:',
      );
      assert.equal(init.headers.apiKey, 'TEST_SYNTHETIQUE');
      return response(j);
    };
    await assert.rejects(new Departures(db, {}, s, fetcher).get('12345'));
    const d = new Departures(
      db,
      { PRIM_API_KEY: 'TEST_SYNTHETIQUE' },
      s,
      fetcher,
    );
    await Promise.all([d.get('12345'), d.get('12345')]);
    await d.get('12345');
    assert.equal(calls, 1);
    const c = new Collector(db, { env: { PRIM_API_KEY: 'TEST_SYNTHETIQUE' } });
    assert.equal(c.status(s).state, 'available');
    assert.equal(c.status(s).integration, 'verified');
  } finally {
    db.close();
  }
});
test('Capteurs J-1 : même heure au dernier jour publié, états et fermetures', async () => {
  const s = registry.find((s) => s.id === 'comptages-route'),
    hour = Math.floor(Date.now() / 36e5) * 36e5,
    target = new Date(hour - 864e5).toISOString(),
    wheres = [];
  const j = await collectComptages(s, {
    fetcher: async (u) => {
      const url = new URL(u);
      if (!url.pathname.endsWith('/records'))
        return response({
          fields: [
            'iu_ac',
            'libelle',
            't_1h',
            'q',
            'k',
            'etat_trafic',
            'etat_barre',
            'geo_shape',
          ].map((name) => ({ name, type: 'text' })),
          metas: { default: { modified: target, license: 'TEST' } },
        });
      if (url.searchParams.get('order_by'))
        return response({
          results: [{ t_1h: new Date(hour - 36e5).toISOString() }],
        });
      wheres.push(url.searchParams.get('where'));
      const line = {
        type: 'LineString',
        coordinates: [
          [2.35, 48.85],
          [2.36, 48.86],
        ],
      };
      return response({
        total_count: 4,
        results: [
          {
            iu_ac: 'TEST1',
            libelle: 'TEST SYNTHÉTIQUE',
            t_1h: target,
            q: 900,
            k: 12.5,
            etat_trafic: 'Fluide',
            etat_barre: 'Ouvert',
            geo_shape: { geometry: line },
          },
          {
            iu_ac: 'TEST2',
            libelle: 'TEST',
            t_1h: target,
            q: 300,
            k: 41,
            etat_trafic: 'Pré-saturé',
            geo_shape: line,
          },
          {
            iu_ac: 'TEST3',
            libelle: 'TEST',
            t_1h: target,
            q: null,
            k: null,
            etat_trafic: 'Inconnu',
            etat_barre: 'Barré',
            geo_shape: line,
          },
          {
            iu_ac: 'TEST4',
            libelle: 'TEST',
            t_1h: target,
            q: 1e9,
            etat_trafic: 'Inconnu',
            geo_shape: line,
          },
        ],
      });
    },
  });
  assert.equal(wheres.length, 1);
  assert(wheres[0].includes(target.replace('.000Z', 'Z')));
  assert.deepEqual(
    j.features.map((f) => f.properties.trafficState),
    ['fluide', 'dense', 'ferme'],
  );
  assert.equal(j.features[0].properties.observedAt, target);
  assert.equal(j.features[0].properties.flow, 900);
  assert.equal(j.features[2].properties.flow, null);
});
test('TomTom trafic en direct : tuiles bornées à Paris, clé serveur, cache, budget et repli', async () => {
  const s = registry.find((s) => s.id === 'tomtom-flow'),
    c = lonLatTile(2.3522, 48.8566, 14);
  assert(tileInParis(14, c.x, c.y));
  assert(!tileInParis(14, c.x + 30, c.y));
  assert(!tileInParis(10, 518, 352));
  assert(!tileInParis(19, 0, 0));
  assert(!tileInParis(14.5, c.x, c.y));
  const db = new Store(':memory:');
  try {
    let calls = 0,
      fail = false;
    const fetcher = async (u) => {
      calls++;
      const url = new URL(u);
      assert.equal(url.hostname, 'api.tomtom.com');
      assert.equal(url.searchParams.get('key'), 'TEST_SYNTHETIQUE');
      if (fail) return new Response('', { status: 500 });
      return png();
    };
    await assert.rejects(
      new FlowTiles(db, {}, s, fetcher).get(14, c.x, c.y),
      /Clé/,
    );
    const t = new FlowTiles(
      db,
      { TOMTOM_API_KEY: 'TEST_SYNTHETIQUE' },
      s,
      fetcher,
    );
    await assert.rejects(t.get(14, c.x + 30, c.y), /hors de Paris/);
    assert.equal(calls, 0);
    await Promise.all([t.get(14, c.x, c.y), t.get(14, c.x, c.y)]);
    assert.equal(calls, 1);
    assert.equal(db.used('tomtom-tiles'), 1);
    fail = true;
    const late = Date.now() + s.cacheSeconds * 1000 + 1;
    assert((await t.get(14, c.x, c.y, late)).buf.length > 8);
    assert.equal(calls, 2);
    await assert.rejects(
      tomtomFlowProbe(
        s,
        { fetcher: async () => response({}) },
        { TOMTOM_API_KEY: 'TEST' },
      ),
    );
  } finally {
    db.close();
  }
});
test('Lignes par arrêt : export filtré, identifiants IDFM et lignes regroupées', async () => {
  const s = registry.find((s) => s.id === 'idfm-lignes');
  let exportUrl;
  const j = await lignes(s, {
    fetcher: async (u) => {
      const url = new URL(u);
      if (url.pathname.endsWith('/exports/json')) {
        exportUrl = url;
        const p = { lon: 2.35, lat: 48.86 };
        return response([
          {
            id: 'IDFM:C01371',
            shortname: '1',
            mode: 'Métro',
            stop_id: 'IDFM:22087',
            stop_name: 'TEST SYNTHÉTIQUE',
            pointgeo: p,
          },
          {
            id: 'IDFM:C01022',
            shortname: '21',
            mode: 'Bus',
            stop_id: 'IDFM:22087',
            stop_name: 'TEST SYNTHÉTIQUE',
            pointgeo: p,
          },
          {
            id: 'IDFM:C01371',
            shortname: '1',
            mode: 'Métro',
            stop_id: 'IDFM:22087',
            stop_name: 'TEST SYNTHÉTIQUE',
            pointgeo: p,
          },
          {
            id: 'INVALIDE',
            shortname: 'X',
            mode: 'Bus',
            stop_id: 'IDFM:1',
            stop_name: 'TEST',
            pointgeo: p,
          },
          {
            id: 'IDFM:C01742',
            shortname: 'A',
            mode: 'RapidTransit',
            stop_id: 'IDFM:monomodalStopPlace:43135',
            stop_name: 'TEST RER',
            pointgeo: p,
          },
        ]);
      }
      return response({
        fields: [
          ...['id', 'shortname', 'mode', 'stop_id', 'stop_name'].map(
            (name) => ({ name, type: 'text' }),
          ),
          { name: 'pointgeo', type: 'geo_point_2d' },
        ],
        metas: { default: { modified: date(), license: 'TEST' } },
      });
    },
  });
  assert(exportUrl.searchParams.get('where').startsWith('in_bbox(pointgeo,'));
  assert.equal(j.features.length, 2);
  assert.deepEqual(
    j.features[0].properties.lines.map((l) => l.ref + ':' + l.mode),
    ['C01371:metro', 'C01022:bus'],
  );
  assert.equal(j.features[1].properties.lines[0].mode, 'rer');
  assert.equal(j.features[1].properties.code, '43135');
  await assert.rejects(
    lignes(s, {
      fetcher: async () =>
        response({
          fields: [{ name: 'id', type: 'text' }],
          metas: { default: {} },
        }),
    }),
    /Schéma fournisseur inattendu/,
  );
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
                  type: 'ROAD_CLOSED',
                  subtype: 'ROAD_CLOSED_CONSTRUCTION',
                  direction: 'BOTH_DIRECTIONS<script>',
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
  assert.equal(j.features[0].properties.type, 'ROAD_CLOSED');
  assert.equal(j.features[0].properties.subtype, 'ROAD_CLOSED_CONSTRUCTION');
  assert.equal(j.features[0].properties.direction, null);
});
test('Travaux : niveau de perturbation et statut officiels, chantiers terminés écartés', async () => {
  const s = registry.find((s) => s.id === 'travaux');
  const shape = {
    type: 'Polygon',
    coordinates: [
      [
        [2.35, 48.85],
        [2.351, 48.85],
        [2.351, 48.851],
        [2.35, 48.85],
      ],
    ],
  };
  const j = await collectParis(s, {
    fetcher: async (u) =>
      response(
        String(u).includes('/records')
          ? {
              total_count: 2,
              results: [
                {
                  identifiant: 'TEST1',
                  voie: 'TEST SYNTHÉTIQUE',
                  statut: 2,
                  niveau_perturbation: 1,
                  impact_circulation: 'RESTREINTE',
                  date_debut: '2026-01-01',
                  date_fin: '2027-01-01',
                  geo_shape: { geometry: shape },
                },
                {
                  identifiant: 'TEST2',
                  voie: 'TEST',
                  statut: 5,
                  niveau_perturbation: 2,
                  geo_shape: shape,
                },
              ],
            }
          : {
              fields: [],
              metas: { default: { modified: date(), license: 'TEST' } },
            },
      ),
  });
  assert.equal(j.features.length, 1);
  assert.equal(j.features[0].properties.perturbationLevel, 1);
  assert.equal(j.features[0].properties.status, 'En cours');
  assert.equal(j.features[0].properties.validFrom, '2025-12-31T23:00:00.000Z');
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
