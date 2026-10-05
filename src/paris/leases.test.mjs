// TESTS SYNTHÉTIQUES : stockages en mémoire, aucun fournisseur réel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../../server/paris/storage.mjs';
import { Collector } from '../../server/paris/collector.mjs';
import { request } from '../../server/paris/http.mjs';
test('Deux collecteurs partagent le verrou et ne doublent pas une collecte', async () => {
  const s = new Store(':memory:');
  try {
    let resolve,
      calls = 0;
    const wait = new Promise((r) => (resolve = r)),
      source = {
        id: 'TEST-SYNTHETIQUE',
        adapter: 'TEST',
        enabled: true,
        refreshSeconds: 60,
        staleAfter: 60,
        map: true,
        dailyBudget: 10,
        retentionDays: 0,
      };
    const adapters = {
        TEST: async () => {
          calls++;
          await wait;
          return { features: [] };
        },
      },
      a = new Collector(s, { adapters }),
      b = new Collector(s, { adapters });
    const pending = a.collect(source);
    await b.collect(source);
    assert.equal(calls, 1);
    resolve();
    await pending;
    await b.collect(source);
    assert.equal(calls, 1);
    assert.equal(
      s.db.prepare('SELECT COUNT(*) n FROM collection_leases').get().n,
      0,
    );
  } finally {
    s.close();
  }
});
test('Un verrou expiré est repris et une ancienne instance ne libère pas le nouveau', () => {
  const s = new Store(':memory:');
  try {
    assert(s.acquireCollection('TEST', 'a', 1000));
    assert(!s.acquireCollection('TEST', 'b', 2000));
    assert(s.acquireCollection('TEST', 'b', 131001));
    s.releaseCollection('TEST', 'a');
    assert(!s.acquireCollection('TEST', 'c', 131002));
    s.releaseCollection('TEST', 'b');
    assert(s.acquireCollection('TEST', 'c', 131003));
  } finally {
    s.close();
  }
});
test('Annulation avant requête : aucun appel ni budget consommé', async () => {
  const s = new Store(':memory:');
  try {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;
    await assert.rejects(
      request(
        'https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr',
        {
          store: s,
          provider: 'TEST',
          budget: 10,
          signal: controller.signal,
          fetcher: async () => {
            calls++;
            return new Response('{}');
          },
        },
      ),
    );
    assert.equal(calls, 0);
    assert.equal(s.used('TEST'), 0);
  } finally {
    s.close();
  }
});
