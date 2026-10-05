import { request, SourceError } from './http.mjs';
import { feature, plain } from './paris-data.mjs';
import { utc, parisDay } from '../../src/paris/geo.mjs';
export async function airparif(s, o, arrondissements, env) {
  const q = new URLSearchParams();
  for (const a of arrondissements.features)
    q.append('insee', a.properties.insee);
  const j = await request(
    'https://api.airparif.fr/indices/prevision/commune?' + q,
    { ...o, headers: { 'X-Api-Key': env.AIRPARIF_API_KEY } },
  );
  const valid = new Set(
      arrondissements.features.map((x) => x.properties.insee),
    ),
    features = [];
  const grades = [
    'Bon',
    'Moyen',
    'Dégradé',
    'Mauvais',
    'Très mauvais',
    'Extrêmement mauvais',
  ];
  for (const [code, rows] of Object.entries(j)) {
    if (!valid.has(code) || !Array.isArray(rows) || rows.length > 3)
      throw Error('Schéma Airparif hors communes autorisées');
    for (const r of rows) {
      if (!parisDay(r.date) || !grades.includes(r.indice))
        throw Error('Indice Airparif invalide');
      features.push(
        feature(
          s,
          code + ':' + r.date,
          'Indice Atmo — ' + code,
          null,
          {
            status: r.indice,
            indices: {
              no2: r.no2,
              o3: r.o3,
              pm10: r.pm10,
              pm25: r.pm25,
              so2: r.so2,
            },
            forecastDate: r.date,
            method: 'Prévision communale officielle',
            coverage: 'Arrondissement entier, aucune mesure de rue',
            publicationUnknown: true,
          },
          { validFrom: parisDay(r.date), validTo: parisDay(r.date, true) },
        ),
      );
    }
  }
  return {
    features,
    schema:
      'ResultatIndice : code INSEE -> date, indice, no2, o3, pm10, pm25, so2 ; prévisions aujourd’hui/demain',
  };
}
export async function tomtom(s, o, env) {
  const q = new URLSearchParams({
    key: env.TOMTOM_API_KEY,
    bbox: '2.224,48.815,2.47,48.904',
    fields:
      '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,startTime,endTime,lastReportTime,events{description}}}}',
    language: 'fr-FR',
    timeValidityFilter: 'present',
  });
  const j = await request(
    'https://api.tomtom.com/traffic/services/5/incidentDetails?' + q,
    o,
  );
  if (!Array.isArray(j.incidents)) throw Error('Incidents TomTom invalides');
  return {
    features: j.incidents.map((r) =>
      feature(
        s,
        r.properties.id,
        r.properties.events?.map((e) => plain(e.description)).join(', ') ||
          'Incident TomTom',
        r.geometry,
        { category: r.properties.iconCategory, providerSaysCurrent: true },
        {
          observedAt: utc(r.properties.lastReportTime),
          validFrom: utc(r.properties.startTime),
          validTo: utc(r.properties.endTime),
        },
      ),
    ),
    schema:
      'Incident Details v5 ; geometry, id, startTime/endTime/lastReportTime ; demande present',
  };
}

// Tuiles Raster Flow v4 : clé serveur, chemin fixe, zooms et emprise bornés à Paris.
export const parisBox = [2.224, 48.815, 2.47, 48.904];
export const flowZoom = { min: 11, max: 18 };
const tileLat = (y, n) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
export function tileInParis(z, x, y) {
  if (
    ![z, x, y].every(Number.isInteger) ||
    z < flowZoom.min ||
    z > flowZoom.max
  )
    return false;
  const n = 2 ** z;
  if (x < 0 || y < 0 || x >= n || y >= n) return false;
  const west = (x / n) * 360 - 180,
    east = ((x + 1) / n) * 360 - 180;
  return (
    east >= parisBox[0] &&
    west <= parisBox[2] &&
    tileLat(y, n) >= parisBox[1] &&
    tileLat(y + 1, n) <= parisBox[3]
  );
}
export function lonLatTile(lon, lat, z) {
  const n = 2 ** z,
    r = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n),
  };
}
const flowUrl = (z, x, y, key) =>
  `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png?` +
  new URLSearchParams({ key, tileSize: '256' });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const isPng = (b) =>
  Buffer.isBuffer(b) && b.length > 8 && b.subarray(0, 8).equals(PNG);
// Collecte de contrôle : une tuile du centre de Paris atteste clé, quota et format.
export async function tomtomFlowProbe(s, o, env) {
  const { x, y } = lonLatTile(2.3522, 48.8566, 13);
  const buf = await request(flowUrl(13, x, y, env.TOMTOM_API_KEY), {
    ...o,
    binary: true,
    limit: 1e6,
  });
  if (!isPng(buf)) throw new SourceError('failure', 'Tuile TomTom invalide');
  return { features: [], schema: s.schema };
}
export class FlowTiles {
  constructor(store, env, source, fetcher = fetch) {
    Object.assign(this, { store, env, source, fetcher });
    this.cache = new Map();
    this.pending = new Map();
    this.max = 1500;
  }
  async get(z, x, y, now = Date.now()) {
    if (!this.source?.enabled || !this.env.TOMTOM_API_KEY)
      throw new SourceError('disabled', 'Clé TomTom non configurée');
    if (!tileInParis(z, x, y))
      throw new SourceError('failure', 'Tuile hors de Paris');
    const k = z + '/' + x + '/' + y,
      hit = this.cache.get(k);
    if (hit && now - hit.at < this.source.cacheSeconds * 1000) return hit;
    if (this.pending.has(k)) return this.pending.get(k);
    const p = request(flowUrl(z, x, y, this.env.TOMTOM_API_KEY), {
      store: this.store,
      fetcher: this.fetcher,
      provider: this.source.provider,
      budget: this.source.dailyBudget,
      binary: true,
      limit: 1e6,
    })
      .then((buf) => {
        if (!isPng(buf))
          throw new SourceError('failure', 'Tuile TomTom invalide');
        const entry = { at: Date.now(), buf };
        this.cache.delete(k);
        this.cache.set(k, entry);
        while (this.cache.size > this.max)
          this.cache.delete(this.cache.keys().next().value);
        return entry;
      })
      .catch((e) => {
        if (hit && Date.now() - hit.at < 600000) return hit;
        throw e;
      })
      .finally(() => this.pending.delete(k));
    this.pending.set(k, p);
    return p;
  }
}
