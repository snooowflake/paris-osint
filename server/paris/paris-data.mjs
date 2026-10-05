import { ods, request } from './http.mjs';
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
          { description: plain(r.description), type: plain(r.type) },
          { publishedAt, validFrom: utc(r.starttime), validTo: utc(r.endtime) },
        );
      }
      if (s.id === 'travaux')
        return feature(
          s,
          r.identifiant,
          r.voie,
          geometry(r),
          {
            description: plain(r.description),
            impact: plain(r.impact_circulation),
            status: r.statut,
          },
          {
            publishedAt,
            validFrom: parisDay(r.date_debut),
            validTo: parisDay(r.date_fin, true),
          },
        );
      if (s.id === 'belib')
        return feature(
          s,
          r.id_pdc,
          r.adresse_station,
          geometry(r),
          { status: plain(r.statut_pdc) },
          { publishedAt, observedAt: utc(r.last_updated) },
        );
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
