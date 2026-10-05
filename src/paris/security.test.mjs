import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Store } from '../../server/paris/storage.mjs';
import {
  Collector,
  registry,
  boundary,
} from '../../server/paris/collector.mjs';
import {
  hashPassword,
  verify,
  user,
  csrfOk,
} from '../../server/paris/auth.mjs';
import { createApplicationServer } from '../../server/paris/server.mjs';
import { validatePreferences } from '../../server/paris/routes.mjs';
import { privateAddress, vpnAddress } from '../../server/paris/network.mjs';
import { search } from '../../server/paris/search.mjs';
import { aircraft } from '../../server/paris/extensions.mjs';
import { hydro, vigilance, meteo } from '../../server/paris/environment.mjs';
import { feature } from '../../server/paris/paris-data.mjs';
const reply = (j) => new Response(JSON.stringify(j));
test('Scrypt, mots de passe faibles refusés et aucun administrateur par défaut', () => {
  const p = 'TEST password 2026 long';
  const h = hashPassword(p);
  assert(verify(p, h));
  assert(!verify('wrong', h));
  assert.throws(() => hashPassword('short'));
  const s = new Store(':memory:');
  try {
    assert.throws(
      () => createApplicationServer({ store: s, env: {} }),
      /administrateur/,
    );
  } finally {
    s.close();
  }
});
test('Accès HTTP distant exige VPN borné, aucune liaison publique générale', () => {
  assert(privateAddress('192.168.2.1'));
  assert(!privateAddress('192.0.2.1'));
  assert(vpnAddress('192.168.2.12', ['192.168.2.0/24']));
  assert(!vpnAddress('192.168.3.12', ['192.168.2.0/24']));
  assert(!vpnAddress('203.0.113.1', ['0.0.0.0/0']));
  const s = new Store(':memory:');
  try {
    user(s, 'TEST-admin', 'TEST password long', 'admin');
    assert.throws(
      () =>
        createApplicationServer({
          store: s,
          env: { BIND_HOST: '0.0.0.0', APP_ORIGIN: 'http://192.0.2.1' },
        }),
      /HTTPS/,
    );
  } finally {
    s.close();
  }
});
test('CSRF origine et jeton stricts, Unicode ne provoque pas de crash', () => {
  const value = 'a'.repeat(48),
    s = { csrf: value };
  assert(
    csrfOk(
      { headers: { origin: 'https://example.org', 'x-csrf-token': value } },
      s,
      'https://example.org',
    ),
  );
  assert(
    !csrfOk(
      { headers: { origin: 'https://evil.example', 'x-csrf-token': value } },
      s,
      'https://example.org',
    ),
  );
  assert(
    !csrfOk(
      {
        headers: {
          origin: 'https://example.org',
          'x-csrf-token': 'é'.repeat(48),
        },
      },
      s,
      'https://example.org',
    ),
  );
});
test('Vues et favoris contraints, contenu ne peut pas ajouter des fournisseurs arbitraires', () => {
  const valid = {
    layers: ['pc-lutece'],
    views: [
      {
        name: 'TEST vue',
        lon: 2.35,
        lat: 48.86,
        range: 5000,
        heading: 0,
        pitch: -1,
      },
    ],
    favorites: [],
  };
  assert(validatePreferences(valid));
  assert.throws(() =>
    validatePreferences({
      ...valid,
      views: [{ ...valid.views[0], lon: 2.55, lat: 49.01 }],
    }),
  );
  assert.throws(() =>
    validatePreferences({ ...valid, layers: ['https://evil.example'] }),
  );
  assert.throws(() =>
    validatePreferences({
      ...valid,
      favorites: [{ id: 'x', name: 'TEST', source: 'untrusted' }],
    }),
  );
});
test('Géocodage IGN borné à Paris, partagé et ne conserve pas un score inventé', async () => {
  const s = new Store(':memory:');
  let calls = 0;
  try {
    const f = async (u) => {
      calls++;
      const url = new URL(u);
      assert.equal(url.hostname, 'data.geopf.fr');
      assert.equal(url.searchParams.get('citycode'), '75056');
      return reply({
        type: 'FeatureCollection',
        features: [
          {
            properties: { id: 'TEST', label: 'TEST SYNTHÉTIQUE', score: 0.9 },
            geometry: { type: 'Point', coordinates: [2.35, 48.86] },
          },
          {
            properties: { id: 'CDG' },
            geometry: { type: 'Point', coordinates: [2.55, 49.01] },
          },
        ],
      });
    };
    const a = await search('TEST lieu', s, boundary, f);
    assert.equal(a.length, 1);
    assert.equal(a[0].properties.observedAt, null);
    assert(!('score' in a[0].properties));
    await search('TEST lieu', s, boundary, f);
    assert.equal(calls, 1);
    await assert.rejects(search('x', s, boundary, f));
  } finally {
    s.close();
  }
});
test('ADS-B unités, âge de position et classification de source conservés', async () => {
  const source = registry.find((s) => s.id === 'adsb'),
    now = Date.now();
  const r = await aircraft(source, {
    fetcher: async () =>
      reply({
        now,
        ac: [
          {
            hex: 'TEST',
            lat: 48.86,
            lon: 2.35,
            seen_pos: 2,
            alt_baro: 10000,
            gs: 100,
            dbFlags: 1,
          },
        ],
      }),
  });
  assert.equal(r.features[0].properties.altitudeMeters, 3048);
  assert(Math.abs(r.features[0].properties.speedMps - 51.4444) < 0.001);
  assert(r.features[0].properties.militaryClassifiedBySource);
  assert.equal(Date.parse(r.features[0].properties.observedAt), now - 2000);
  await assert.rejects(
    aircraft(source, { fetcher: async () => reply({ ac: {} }) }),
  );
});
test('Vigicrues prend le code et le niveau officiels, pas un seuil personnel', async () => {
  const s = registry.find((s) => s.id === 'vigicrues');
  const r = await vigilance(s, {
    fetcher: async () =>
      reply({
        type: 'FeatureCollection',
        DtHrInfoVigiCru: new Date().toISOString(),
        features: [
          {
            properties: {
              CdEntCru: 'TEST-code',
              lbentcru: 'Seine à Paris',
              NivInfViCr: 2,
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [2.3, 48.85],
                [2.4, 48.86],
              ],
            },
          },
        ],
      }),
  });
  assert.equal(r.features[0].id, 'TEST-code');
  assert.equal(r.features[0].properties.status, 'Jaune');
  assert(r.features[0].properties.official);
});
test('Vigilance météo reste départementale sans point géographique fictif', async () => {
  const s = registry.find((s) => s.id === 'meteo-vigilance');
  const r = await meteo(s, {
    fetcher: async (u) =>
      new URL(u).pathname.endsWith('/records')
        ? reply({
            total_count: 1,
            results: [
              {
                domain_id: '75',
                phenomenon_id: 1,
                echeance: 'J',
                color_id: 1,
                color: 'vert',
                phenomenon: 'vent',
                product_datetime: new Date().toISOString(),
                begin_time: new Date(Date.now() - 3600000).toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
              },
            ],
          })
        : reply({
            fields: [],
            metas: { default: { license: 'Licence Ouverte' } },
          }),
  });
  assert.equal(r.features[0].geometry, null);
  assert(r.features[0].properties.coverage.includes('Département'));
});
test('Serveur réel : login, sessions, CSRF, admin/lecteur, cache, exports et fichiers privés', async () => {
  const store = new Store(':memory:');
  user(store, 'TEST-admin', 'TEST admin password', 'admin');
  user(store, 'TEST-reader', 'TEST reader password', 'reader');
  const c = new Collector(store, { env: {} });
  const src = registry.find((s) => s.id === 'pc-lutece');
  store.set('source:' + src.id, {
    features: [
      feature(
        src,
        'TEST-id',
        'TEST SYNTHÉTIQUE <img src=x onerror=alert(1)>',
        { type: 'Point', coordinates: [2.35, 48.86] },
        {},
        { publishedAt: new Date().toISOString() },
      ),
    ],
    lastSuccess: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    evidence: [],
  });
  const app = createApplicationServer({
    store,
    collector: c,
    env: {
      BIND_HOST: '127.0.0.1',
      PORT: '0',
      APP_ORIGIN: 'http://127.0.0.1:0',
    },
  });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  app.config.origin = base;
  const call = (p, init = {}) =>
    fetch(base + p, { redirect: 'manual', ...init });
  try {
    assert.equal((await call('/api/sources')).status, 401);
    assert.equal((await call('/')).status, 303);
    assert.equal((await call('/login.html')).status, 200);
    assert.equal(
      (
        await call('/api/login', {
          method: 'POST',
          headers: {
            Origin: 'http://evil.example',
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      ).status,
      403,
    );
    const login = await call('/api/login', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'TEST-reader',
        password: 'TEST reader password',
      }),
    });
    assert.equal(login.status, 200);
    assert(login.headers.get('set-cookie').includes('HttpOnly'));
    assert(login.headers.get('set-cookie').includes('SameSite=Strict'));
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const headers = {
      Cookie: cookie,
      Origin: base,
      'Content-Type': 'application/json',
    };
    const me = await call('/api/me', { headers }).then((r) => r.json());
    headers['x-csrf-token'] = me.csrf;
    assert.equal((await call('/api/admin', { headers })).status, 403);
    const bad = { ...headers };
    delete bad['x-csrf-token'];
    assert.equal(
      (
        await call('/api/preferences', {
          method: 'POST',
          headers: bad,
          body: '{}',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/api/preferences', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            layers: [],
            views: [
              {
                name: 'TEST hors Paris',
                lon: 3,
                lat: 49,
                range: 5000,
                heading: 0,
                pitch: -1,
              },
            ],
          }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call('/api/annotations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: 'TEST <script>alert(1)</script>',
            point: [2.35, 48.86],
          }),
        })
      ).status,
      201,
    );
    const notes = await call('/api/annotations', { headers }).then((r) =>
      r.json(),
    );
    assert.equal(notes[0].text, 'TEST <script>alert(1)</script>');
    assert.equal(
      (await call('/api/refresh', { method: 'POST', headers, body: '{}' }))
        .status,
      200,
    );
    assert.equal(
      (await call('/api/export?source=tomtom', { headers })).status,
      403,
    );
    assert.equal(
      (await call('/api/export?source=pc-lutece', { headers })).status,
      200,
    );
    for (const p of [
      '/var/paris.sqlite',
      '/server/paris/server.mjs',
      '/.env',
      '/config/paris-sources.json',
    ])
      assert.equal((await call(p, { headers })).status, 404);
    assert.equal((await call('/%E0%A4%A', { headers })).status, 400);
    assert.equal(
      (await call('/api/history?from=invalid&to=invalid', { headers })).status,
      400,
    );
    // Archives synthétiques exclusivement dans SQLite :memory:.
    const testNow = Date.now();
    store.archive(
      src,
      Array.from({ length: 1005 }, (_, i) =>
        feature(
          src,
          'TEST-H-' + String(i).padStart(4, '0'),
          'TEST SYNTHÉTIQUE',
          { type: 'Point', coordinates: [2.35, 48.86] },
          {},
          { observedAt: new Date(testNow).toISOString() },
        ),
      ),
      testNow,
    );
    const hq = new URLSearchParams({
      from: new Date(testNow - 60000).toISOString(),
      to: new Date(testNow + 60000).toISOString(),
      source: src.id,
    });
    const firstPage = await call('/api/history?' + hq, { headers }).then((r) =>
      r.json(),
    );
    assert.equal(firstPage.total, 1005);
    assert.equal(firstPage.rows.length, 1000);
    assert.equal(firstPage.nextOffset, 1000);
    hq.set('offset', '1000');
    const lastPage = await call('/api/history?' + hq, { headers }).then((r) =>
      r.json(),
    );
    assert.equal(lastPage.rows.length, 5);
    assert.equal(lastPage.nextOffset, null);
    assert.equal(
      new Set([...firstPage.rows, ...lastPage.rows].map((r) => r.id)).size,
      1005,
    );
    hq.set('offset', '-1');
    assert.equal((await call('/api/history?' + hq, { headers })).status, 400);
    const hostStatus = await new Promise((resolve, reject) => {
      http
        .get(base + '/healthz', { headers: { Host: 'evil.example' } }, (r) => {
          r.resume();
          resolve(r.statusCode);
        })
        .on('error', reject);
    });
    assert.equal(hostStatus, 421);
    const admin = await call('/api/login', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'TEST-admin',
        password: 'TEST admin password',
      }),
    });
    const result = await call('/api/admin', {
      headers: { Cookie: admin.headers.get('set-cookie').split(';')[0] },
    }).then((r) => r.json());
    assert(
      result.providers.every(
        (x) => typeof x.configured === 'boolean' && !('value' in x),
      ),
    );
    assert(!JSON.stringify(result).includes('TEST admin password'));
    assert.equal(
      (await call('/api/logout', { method: 'POST', headers, body: '{}' }))
        .status,
      200,
    );
    assert.equal((await call('/api/me', { headers })).status, 401);
  } finally {
    await new Promise((r) => app.server.close(r));
    store.close();
  }
});
