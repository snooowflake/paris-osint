import { request, SourceError } from './http.mjs';
import { feature, plain } from './paris-data.mjs';
import { utc, parisLocal } from '../../src/paris/geo.mjs';
import { lineRefOf, normMode } from '../../src/paris/model.mjs';
const PRIM = 'https://prim.iledefrance-mobilites.fr/marketplace/';
const code = (v) => {
  const c = String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  return /^[A-Z][A-Z0-9_]{1,40}$/.test(c) ? c : null;
};
const value = (x) => (typeof x === 'string' ? x : x?.value);
const first = (x) => value(Array.isArray(x) ? x[0] : x);
// Lignes desservant Paris : tracés ferrés découpés et lignes des arrêts parisiens.
export function parisLineRefs(store) {
  const refs = new Set();
  for (const f of store?.get('source:idfm-traces')?.features || [])
    if (lineRefOf(f.properties?.lineRef)) refs.add(f.properties.lineRef);
  for (const f of store?.get('source:idfm-lignes')?.features || [])
    for (const l of f.properties?.lines || [])
      if (lineRefOf(l.ref)) refs.add(l.ref);
  return refs;
}
function period(d, now) {
  const periods = (
    Array.isArray(d.applicationPeriods) ? d.applicationPeriods : []
  )
    .slice(0, 200)
    .map((p) => ({ begin: parisLocal(p?.begin), end: parisLocal(p?.end) }))
    .filter((p) => p.begin && (!p.end || Date.parse(p.end) > now))
    .sort((a, b) => Date.parse(a.begin) - Date.parse(b.begin));
  return periods.find((p) => Date.parse(p.begin) <= now) || periods[0] || null;
}
export function parseDisruptions(s, j, refs, now = Date.now()) {
  if (!j || !Array.isArray(j.disruptions) || !Array.isArray(j.lines))
    throw Error('Réponse PRIM disruptions invalide');
  if (j.disruptions.length > 20000 || j.lines.length > 5000)
    throw Error('Réponse PRIM trop volumineuse');
  const byId = new Map();
  for (const d of j.disruptions)
    if (typeof d?.id === 'string' && d.id.length <= 200) byId.set(d.id, d);
  const updates = [...byId.values()]
    .map((d) => parisLocal(d.lastUpdate))
    .filter(Boolean)
    .sort();
  const publishedAt = utc(j.lastUpdatedDate) || updates.at(-1) || null;
  if (byId.size && !publishedAt)
    throw Error('Date de publication PRIM absente');
  const out = [];
  for (const l of j.lines) {
    const ref = lineRefOf(l?.id);
    if (!ref || !refs.has(ref) || !Array.isArray(l.impactedObjects)) continue;
    const stops = new Map();
    for (const o of l.impactedObjects.slice(0, 2000))
      for (const id of Array.isArray(o?.disruptionIds) ? o.disruptionIds : []) {
        if (!stops.has(id)) stops.set(id, new Set());
        if (['stop_area', 'stop_point'].includes(o.type) && o.name)
          stops.get(id).add(plain(o.name).slice(0, 120));
      }
    for (const [id, names] of stops) {
      const d = byId.get(id),
        p = d && period(d, now);
      if (!p) continue;
      const title = plain(d.title).trim(),
        text = plain(d.message || d.shortMessage)
          .replace(/\s+/g, ' ')
          .trim();
      out.push(
        feature(
          s,
          id + ':' + ref,
          title || text.slice(0, 140) || 'Information trafic',
          null,
          {
            lineRef: ref,
            lineName: plain(l.shortName || l.name).slice(0, 24),
            mode: normMode(l.mode),
            severity: code(d.severity),
            cause: code(d.cause),
            description: text,
            stops: [...names].slice(0, 30),
            updatedAt: parisLocal(d.lastUpdate),
            official: true,
            coverage:
              'Ligne desservant Paris ; tronçon et arrêts décrits par le producteur',
          },
          { publishedAt, validFrom: p.begin, validTo: p.end },
        ),
      );
    }
  }
  return out;
}
export async function primDisruptions(s, o, env) {
  const refs = parisLineRefs(o.store);
  if (!refs.size)
    throw new SourceError(
      'failure',
      'Référentiels des lignes parisiennes pas encore collectés',
    );
  const j = await request(PRIM + 'disruptions_bulk/disruptions/v2', {
    ...o,
    headers: { apiKey: env.PRIM_API_KEY },
  });
  return {
    features: parseDisruptions(s, j, refs),
    schema:
      'disruptions[] id, applicationPeriods, lastUpdate, cause, severity, title, message ; lines[] id, shortName, mode, impactedObjects[].disruptionIds',
  };
}
export function parseDepartures(j, now = Date.now()) {
  const delivery = j?.Siri?.ServiceDelivery?.StopMonitoringDelivery;
  if (!Array.isArray(delivery))
    throw Error('SIRI StopMonitoringDelivery invalide');
  const out = [];
  for (const d of delivery) {
    if (d?.Status === false || d?.Status === 'false')
      throw Error('SIRI Status false');
    for (const v of (Array.isArray(d?.MonitoredStopVisit)
      ? d.MonitoredStopVisit
      : []
    ).slice(0, 500)) {
      const journey = v?.MonitoredVehicleJourney || {},
        call = journey.MonitoredCall || {};
      const expectedAt =
          utc(call.ExpectedDepartureTime) || utc(call.ExpectedArrivalTime),
        aimedAt = utc(call.AimedDepartureTime) || utc(call.AimedArrivalTime),
        at = expectedAt || aimedAt;
      if (!at || Date.parse(at) < now - 60000 || Date.parse(at) > now + 864e5)
        continue;
      out.push({
        lineRef: lineRefOf(value(journey.LineRef)),
        destination: plain(
          first(journey.DestinationName) || first(call.DestinationDisplay),
        ).slice(0, 120),
        expectedAt,
        aimedAt,
        status: code(call.DepartureStatus || call.ArrivalStatus),
        atStop: call.VehicleAtStop === true,
      });
    }
  }
  return out
    .sort(
      (a, b) =>
        Date.parse(a.expectedAt || a.aimedAt) -
        Date.parse(b.expectedAt || b.aimedAt),
    )
    .slice(0, 40);
}
// Prochains passages à la demande, cache partagé par arrêt et appels coalescés.
export class Departures {
  constructor(store, env, source, fetcher = fetch) {
    Object.assign(this, { store, env, source, fetcher });
    this.cache = new Map();
    this.pending = new Map();
  }
  async get(stop) {
    if (!this.env.PRIM_API_KEY)
      throw new SourceError('disabled', 'Clé PRIM non configurée');
    const hit = this.cache.get(stop);
    if (hit && hit.until > Date.now()) return hit.value;
    if (this.pending.has(stop)) return this.pending.get(stop);
    const p = (async () => {
      const key = 'source:' + this.source.id;
      try {
        const j = await request(
          PRIM +
            'stop-monitoring?' +
            new URLSearchParams({
              MonitoringRef: 'STIF:StopPoint:Q:' + stop + ':',
            }),
          {
            store: this.store,
            fetcher: this.fetcher,
            provider: this.source.provider,
            budget: this.source.dailyBudget,
            headers: { apiKey: this.env.PRIM_API_KEY },
            limit: 2e6,
          },
        );
        const value = {
          departures: parseDepartures(j),
          collectedAt: new Date().toISOString(),
          notice:
            'Horaires attendus publiés par l’opérateur via PRIM ; aucune position de véhicule.',
        };
        this.cache.set(stop, {
          value,
          until: Date.now() + this.source.cacheSeconds * 1000,
        });
        if (this.cache.size > 2000)
          this.cache.delete(this.cache.keys().next().value);
        this.store.set(key, {
          features: [],
          collectedAt: value.collectedAt,
          lastSuccess: value.collectedAt,
          evidence: [],
        });
        return value;
      } catch (e) {
        const prev = this.store.get(key);
        this.store.set(key, {
          ...prev,
          features: [],
          collectedAt: new Date().toISOString(),
          errorState: e instanceof SourceError ? e.state : 'failure',
          error:
            e instanceof SourceError
              ? e.message
              : 'Réponse PRIM indisponible ou invalide',
        });
        throw e;
      }
    })().finally(() => this.pending.delete(stop));
    this.pending.set(stop, p);
    return p;
  }
}
