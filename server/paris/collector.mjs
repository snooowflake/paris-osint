import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { clip, dedup, current, validGeometry } from '../../src/paris/geo.mjs';
import { collectParis, collectVelib } from './paris-data.mjs';
import { hydro, vigilance, meteo } from './environment.mjs';
import { aircraft, satellites, sentinel, seismes } from './extensions.mjs';
import { reference } from './references.mjs';
import { airparif, tomtom } from './paid.mjs';
import { SourceError } from './http.mjs';
import { prim } from './prim.mjs';
export const registry = JSON.parse(
  fs.readFileSync(
    new URL('../../config/paris-sources.json', import.meta.url),
    'utf8',
  ),
);
export const boundary = JSON.parse(
  fs.readFileSync(
    new URL('../../public/paris/boundary.json', import.meta.url),
    'utf8',
  ),
).geometry;
export const arrondissements = JSON.parse(
  fs.readFileSync(
    new URL('../../public/paris/arrondissements.json', import.meta.url),
    'utf8',
  ),
);
export class Collector {
  constructor(
    store,
    { env = process.env, fetcher = fetch, adapters = {} } = {},
  ) {
    this.store = store;
    this.env = env;
    this.fetcher = fetcher;
    this.pending = new Map();
    this.owners = new Map();
    this.shutdown = new AbortController();
    this.adapters = {
      prim: (s, o) => prim(s, o, env),
      paris: collectParis,
      velib: collectVelib,
      hydro: (s, o) => hydro(s, o, boundary),
      vigicrues: vigilance,
      meteo,
      adsb: aircraft,
      satellites,
      sentinel,
      seismes,
      reference,
      airparif: (s, o) => airparif(s, o, arrondissements, env),
      tomtom: (s, o) => tomtom(s, o, env),
      ...adapters,
    };
  }
  configured(s) {
    return !s.auth || !!this.env[s.auth];
  }
  features(s, airportContext = false) {
    const snap = this.store.get('source:' + s.id);
    if (!snap || snap.errorState) return [];
    return snap.features
      .filter((f) => current(f, s))
      .map((f) => {
        if (!f.geometry) return f;
        const geometry = clip(
          f.geometry,
          boundary,
          airportContext && s.id === 'adsb',
        );
        return geometry ? { ...f, geometry } : null;
      })
      .filter(Boolean);
  }
  status(s) {
    const snap = this.store.get('source:' + s.id),
      a = this.features(s),
      freshContext = s.id === 'adsb' && this.features(s, true).length > 0,
      old = snap?.features.length > 0 && !a.length && !freshContext;
    return {
      ...s,
      integration: snap?.lastSuccess
        ? 'verified'
        : this.configured(s)
          ? s.auth && s.integration === 'missing_key'
            ? 'implemented_unverified'
            : s.integration
          : 'missing_key',
      state: !s.enabled
        ? 'disabled'
        : !this.configured(s)
          ? 'disabled'
          : snap?.errorState ||
            (!snap
              ? 'disabled'
              : old
                ? 'stale'
                : a.length
                  ? 'available'
                  : 'empty'),
      count: !snap || snap.errorState || old ? null : a.length,
      collectedAt: snap?.collectedAt || null,
      lastSuccess: snap?.lastSuccess || null,
      error: snap?.error || null,
      nextAttempt: snap?.nextAttempt || null,
      license: snap?.license || s.license,
      usedToday: this.store.used(s.provider || s.id),
      evidence: snap?.evidence || s.evidence,
    };
  }
  async collect(s) {
    if (!s.enabled || !this.configured(s) || !this.adapters[s.adapter])
      return null;
    if (this.pending.has(s.id)) return this.pending.get(s.id);
    const prev = this.store.get('source:' + s.id);
    if (prev?.nextAttempt > Date.now()) return prev;
    const owner = randomUUID();
    if (!this.store.acquireCollection(s.id, owner)) return prev;
    this.owners.set(s.id, owner);
    const p = this.perform(s, prev).finally(() => {
      this.pending.delete(s.id);
      this.store.releaseCollection(s.id, owner);
      this.owners.delete(s.id);
    });
    this.pending.set(s.id, p);
    return p;
  }
  async perform(s, prev) {
    try {
      const r = await this.adapters[s.adapter](s, {
        store: this.store,
        fetcher: this.fetcher,
        provider: s.provider || s.id,
        budget: s.dailyBudget,
        signal: AbortSignal.any([
          this.shutdown.signal,
          AbortSignal.timeout(120000),
        ]),
      });
      if (!r || !Array.isArray(r.features) || r.features.length > 10000)
        throw Error('Schéma normalisé invalide');
      let missingGeometry = 0,
        outside = 0;
      const features = dedup(
        r.features
          .map((f) => {
            if (
              !f ||
              f.type !== 'Feature' ||
              typeof f.id !== 'string' ||
              !f.properties?.collectedAt
            )
              throw Error('Objet normalisé invalide');
            if (!f.geometry) {
              if (s.map || s.nature === 'reference') {
                missingGeometry++;
                return null;
              }
              return f;
            }
            if (!validGeometry(f.geometry)) throw Error('Geometry invalid');
            const g = clip(f.geometry, boundary, s.id === 'adsb');
            if (!g) {
              outside++;
              return null;
            }
            return { ...f, geometry: g };
          })
          .filter(Boolean),
      );
      if (r.features.length && missingGeometry === r.features.length)
        throw Error('Geometries manquantes');
      const now = Date.now(),
        collectedAt = new Date(now).toISOString();
      const evidence = {
        testedAt: collectedAt,
        rawCount: r.features.length,
        retainedCount: features.length,
        outside,
        missingGeometry,
        schema: r.schema || s.schema,
        sample: features.slice(0, 2).map((f) => ({
          id: s.id === 'adsb' ? 'redacted' : f.id,
          geometryType: f.geometry?.type || null,
          observedAt: f.properties.observedAt,
          publishedAt: f.properties.publishedAt,
          validFrom: f.properties.validFrom,
          validTo: f.properties.validTo,
          source: f.properties.source,
        })),
      };
      const snap = {
        features,
        collectedAt,
        lastSuccess: collectedAt,
        nextAttempt: now + Math.max(s.refreshSeconds, r.ttl || 0) * 1000,
        failures: 0,
        license: r.license || s.license,
        evidence: [evidence],
      };
      this.store.set('source:' + s.id, snap);
      this.store.archive(
        s,
        features.filter((f) => current(f, s)),
      );
      return snap;
    } catch (e) {
      const failures = (prev?.failures || 0) + 1,
        state = e instanceof SourceError ? e.state : 'failure';
      const next =
        state === 'quota'
          ? Date.parse(
              new Date(Date.now() + 864e5).toISOString().slice(0, 10) +
                'T00:00:00Z',
            )
          : Date.now() +
            Math.min(21600, s.refreshSeconds * 2 ** Math.min(failures, 6)) *
              1000;
      const snap = {
        ...prev,
        features: prev?.features || [],
        errorState: state,
        error:
          e instanceof SourceError
            ? e.message
            : 'Collecte indisponible ou schéma invalide',
        failures,
        collectedAt: new Date().toISOString(),
        nextAttempt: next,
      };
      this.store.set('source:' + s.id, snap);
      return snap;
    }
  }
  async cycle() {
    const list = registry.filter((s) => s.enabled && this.configured(s));
    let at = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (at < list.length) {
          const s = list[at++];
          await this.collect(s);
        }
      }),
    );
    this.store.purge();
  }
  start() {
    this.cycle();
    this.timer = setInterval(() => this.cycle(), 60000);
    this.timer.unref();
  }
  stop() {
    clearInterval(this.timer);
    this.shutdown.abort();
    for (const [id, owner] of this.owners)
      this.store.releaseCollection(id, owner);
  }
}
