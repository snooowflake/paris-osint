import { ods, odsMeta, request, requireFields, SourceError } from './http.mjs';
import { utc, parisDay } from '../../src/paris/geo.mjs';
export const plain = (v) =>
  String(v ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f]/g, ' ')
    .slice(0, 2000);
export function feature(s, id, name, geometry, p = {}, dates = {}) {
  return {
    type: 'Feature',
    id: String(id).slice(0, 200),
    geometry,
    properties: {
      source: s.id,
      name: plain(name),
      nature: s.nature,
      observedAt: null,
      publishedAt: null,
      collectedAt: new Date().toISOString(),
      validFrom: null,
      validTo: null,
      ...p,
      ...dates,
    },
  };
}
export function geometry(r) {
  for (const k of ['geo_shape', 'geom', 'geometry'])
    if (r[k]) return r[k].geometry || r[k];
  for (const k of [
    'geo_point_2d',
    'coordonnees_geo',
    'coordonneesxy',
    'lat_lon',
  ]) {
    const p = r[k];
    if (p && Number.isFinite(p.lon) && Number.isFinite(p.lat))
      return { type: 'Point', coordinates: [p.lon, p.lat] };
  }
  return null;
}
// Codes CIFS (Waze) publiés par le PC Lutèce : conservés s’ils sont bien formés.
const code = (v) =>
  /^[A-Z][A-Z0-9_]{1,40}$/.test(String(v ?? '')) ? String(v) : null;
const travauxStatus = {
  1: 'À venir',
  2: 'En cours',
  3: 'Suspendu',
  4: 'Prolongé',
};
export async function collectParis(s, o) {
  const select =
    s.id === 'agenda'
      ? 'id,title,lead_text,date_start,date_end,updated_at,lat_lon,url,address_name,occurrences,date_description'
      : '';
  const { rows, meta } = await ods(
    'opendata.paris.fr',
    s.dataset,
    o,
    '',
    select,
  );
  const publishedAt = utc(
    meta.metas.default.data_processed || meta.metas.default.modified,
  );
  const features = rows
    .map((r) => {
      if (s.id === 'pc-lutece') {
        const a = String(r.polyline || '')
            .trim()
            .split(/\s+/)
            .map(Number),
          coordinates = [];
        if (a.length % 2) return null;
        for (let i = 0; i < a.length; i += 2)
          coordinates.push([a[i + 1], a[i]]);
        return feature(
          s,
          r.id,
          r.street,
          { type: 'LineString', coordinates },
          {
            description: plain(r.description),
            type: code(r.type),
            subtype: code(r.subtype),
            direction: code(r.direction),
          },
          { publishedAt, validFrom: utc(r.starttime), validTo: utc(r.endtime) },
        );
      }
      if (s.id === 'travaux') {
        const statut = Number(r.statut),
          level = Number(r.niveau_perturbation);
        if (statut === 5) return null;
        return feature(
          s,
          r.identifiant,
          r.voie,
          geometry(r),
          {
            description: plain(r.description),
            object: plain(r.objet),
            impact: plain(r.impact_circulation),
            impactDetail: plain(r.impact_circulation_detail),
            perturbationLevel: [1, 2].includes(level) ? level : null,
            status: travauxStatus[statut] ?? null,
            owner: plain(r.maitre_ouvrage),
            location: plain(r.precision_localisation),
            arrondissement: plain(r.cp_arrondissement),
          },
          {
            publishedAt,
            validFrom: parisDay(r.date_debut),
            validTo: parisDay(r.date_fin, true),
          },
        );
      }
      if (s.id === 'agenda')
        return feature(
          s,
          r.id,
          r.title,
          geometry(r),
          {
            description: plain(r.lead_text),
            sourceUrl: r.url,
            programmed: true,
            schedule: plain(r.date_description),
          },
          {
            publishedAt: utc(r.updated_at) || publishedAt,
            validFrom: utc(r.date_start),
            validTo: utc(r.date_end),
          },
        );
      return null;
    })
    .filter(Boolean);
  return {
    features,
    publishedAt,
    schema: meta.fields.map((x) => ({ name: x.name, type: x.type })),
    license: meta.metas.default.license,
  };
}
const fold = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
export const trafficStates = {
  fluide: 'fluide',
  'pre-sature': 'dense',
  sature: 'sature',
  bloque: 'bloque',
};
// Capteurs permanents (J-1) : la même heure que maintenant, au dernier jour publié.
export async function collectComptages(s, o) {
  const host = 'opendata.paris.fr',
    meta = await odsMeta(host, s.dataset, o);
  requireFields(meta, ['iu_ac', 'libelle', 't_1h', 'q', 'k', 'etat_trafic']);
  const known = new Set(meta.fields.map((f) => f.name)),
    shape = ['geo_shape', 'geom'].find((k) => known.has(k));
  if (!shape)
    throw new SourceError('failure', 'Géométrie des tronçons absente');
  const latest = await request(
    `https://${host}/api/explore/v2.1/catalog/datasets/${s.dataset}/records?` +
      new URLSearchParams({
        select: 't_1h',
        order_by: 't_1h desc',
        limit: '1',
      }),
    o,
  );
  const last = Date.parse(utc(latest.results?.[0]?.t_1h));
  if (!Number.isFinite(last) || last > Date.now() + 12e4)
    throw new SourceError('failure', 'Dernière heure de mesure invalide');
  let target = Math.floor(Date.now() / 36e5) * 36e5 - 864e5;
  for (let i = 0; i < 7 && target > last; i++) target -= 864e5;
  if (target > last) return { features: [], schema: meta.fields };
  const at = (t) => new Date(t).toISOString().replace('.000Z', 'Z'),
    hour = at(target);
  const select = [
    'iu_ac',
    'libelle',
    't_1h',
    'q',
    'k',
    'etat_trafic',
    'etat_barre',
    'libelle_nd_amont',
    'libelle_nd_aval',
    shape,
  ].filter((k) => known.has(k));
  const { rows } = await ods(
    host,
    s.dataset,
    o,
    `t_1h >= date'${hour}' and t_1h < date'${at(target + 36e5)}'`,
    select.join(','),
    { meta },
  );
  const publishedAt = utc(
    meta.metas.default.data_processed || meta.metas.default.modified,
  );
  const number = (v, max) =>
    Number.isFinite(v) && v >= 0 && v <= max ? v : null;
  const features = rows
    .map((r) => {
      if (utc(r.t_1h) !== new Date(target).toISOString())
        throw new SourceError('failure', 'Heure de mesure inattendue');
      const state = trafficStates[fold(r.etat_trafic)] || null,
        closed = fold(r.etat_barre) === 'barre';
      if (!state && !closed) return null;
      return feature(
        s,
        r.iu_ac,
        r.libelle,
        r[shape]?.geometry || r[shape],
        {
          trafficState: closed ? 'ferme' : state,
          flow: number(r.q, 20000),
          occupancy: number(r.k, 100),
          closed,
          from: plain(r.libelle_nd_amont),
          to: plain(r.libelle_nd_aval),
          method: 'Boucles électromagnétiques, agrégat horaire publié en J-1',
        },
        { observedAt: new Date(target).toISOString(), publishedAt },
      );
    })
    .filter(Boolean);
  return {
    features,
    publishedAt,
    schema:
      'Tronçon iu_ac, heure t_1h, débit q, taux k, etat_trafic, etat_barre, géométrie',
    license: meta.metas.default.license,
  };
}
const gbfs =
  'https://velib-metropole-opendata.smovengo.cloud/opendata/Velib_Metropole/';
export async function collectVelib(s, o) {
  let info = o.store?.get('gbfs:info');
  if (!info || info.until < Date.now()) {
    const j = await request(gbfs + 'station_information.json', o);
    if (!Array.isArray(j.data?.stations))
      throw Error('GBFS information invalide');
    info = { stations: j.data.stations, until: Date.now() + 864e5 };
    o.store?.set('gbfs:info', info);
  }
  const j = await request(gbfs + 'station_status.json', o);
  if (!Array.isArray(j.data?.stations)) throw Error('GBFS statut invalide');
  const pub = utc(j.last_updated || j.lastUpdatedOther),
    refs = new Map(info.stations.map((x) => [String(x.station_id), x]));
  let features = j.data.stations
    .map((r) => {
      const a = refs.get(String(r.station_id));
      if (!a) return null;
      const kinds = r.num_bikes_available_types || [];
      return feature(
        s,
        a.stationCode || a.station_id,
        a.name,
        { type: 'Point', coordinates: [a.lon, a.lat] },
        {
          mechanical: kinds.reduce((n, x) => n + (x.mechanical || 0), 0),
          electric: kinds.reduce((n, x) => n + (x.ebike || 0), 0),
          bikes: r.num_bikes_available,
          docks: r.num_docks_available,
          operator: 'Smovengo',
          isRenting: r.is_renting,
        },
        { observedAt: utc(r.last_reported), publishedAt: pub },
      );
    })
    .filter(Boolean);
  let license = 'Licence Ouverte Etalab';
  if (
    !features.some(
      (f) =>
        f.properties.observedAt &&
        Date.now() - Date.parse(f.properties.observedAt) < s.staleAfter * 1000,
    )
  ) {
    const alt = await ods(
      'opendata.paris.fr',
      'velib-disponibilite-en-temps-reel',
      { ...o, provider: 'paris', budget: 3000 },
      "code_insee_commune='75056'",
    );
    features = alt.rows.map((r) =>
      feature(
        s,
        r.stationcode,
        r.name,
        geometry(r),
        {
          mechanical: r.mechanical,
          electric: r.ebike,
          bikes: r.numbikesavailable,
          docks: r.numdocksavailable,
          operator: 'Paris Data — repli Smovengo',
        },
        {
          observedAt: utc(r.duedate),
          publishedAt: utc(alt.meta.metas.default.data_processed),
        },
      ),
    );
    license = 'ODbL (repli Paris Data)';
  }
  return {
    features,
    publishedAt: pub,
    license,
    ttl: Math.max(s.refreshSeconds, Math.min(Number(j.ttl) || 3600, 86400)),
    schema:
      'GBFS station_information + station_status ; stationCode, last_reported, TTL',
  };
}
