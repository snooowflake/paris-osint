import { request, ods } from './http.mjs';
import { feature, plain } from './paris-data.mjs';
import { utc, contains } from '../../src/paris/geo.mjs';
import { heightMeters, flowM3s, toWgs84 } from './projection.mjs';
export async function hydro(s, o, boundary) {
  let ref = o.store?.get('hydro:ref');
  if (!ref || ref.until < Date.now()) {
    const j = await request(
      'https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?code_commune_station=75056&en_service=true&size=100',
      o,
    );
    if (!Array.isArray(j.data) || j.next)
      throw Error('Référentiel hydrométrique incomplet');
    ref = {
      rows: j.data.filter(
        (x) =>
          x.en_service &&
          x.code_commune_station === '75056' &&
          contains([x.longitude_station, x.latitude_station], boundary),
      ),
      until: Date.now() + 864e5,
    };
    o.store?.set('hydro:ref', ref);
  }
  const codes = ref.rows.map((x) => x.code_station);
  if (codes.some((c) => !/^[A-Z0-9]{10}$/.test(c)))
    throw Error('Code station invalide');
  if (!codes.length) return { features: [] };
  const q = new URLSearchParams({
    code_entite: codes.join(','),
    date_debut_obs: new Date(Date.now() - 6 * 36e5).toISOString(),
    size: '2000',
    sort: 'desc',
  });
  let url =
      'https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?' + q,
    rows = [];
  for (let page = 0; url && page < 20; page++) {
    const j = await request(url, o);
    if (!Array.isArray(j.data)) throw Error('Observations invalides');
    rows.push(...j.data);
    url = j.next;
    if (url) {
      const u = new URL(url);
      if (u.searchParams.get('code_entite') !== codes.join(','))
        throw Error('Pagination hors stations');
    }
  }
  if (url) throw Error('Historique trop volumineux');
  const latest = new Map();
  for (const r of rows) {
    if (
      !codes.includes(r.code_station) ||
      !['H', 'Q'].includes(r.grandeur_hydro) ||
      !utc(r.date_obs) ||
      !Number.isFinite(r.resultat_obs)
    )
      continue;
    const k = r.code_station + ':' + r.grandeur_hydro;
    if (
      !latest.has(k) ||
      Date.parse(r.date_obs) > Date.parse(latest.get(k).date_obs)
    )
      latest.set(k, r);
  }
  const features = [...latest.entries()].map(([id, r]) => {
    const a = ref.rows.find((x) => x.code_station === r.code_station);
    const p = toWgs84([a.longitude_station, a.latitude_station]);
    return feature(
      s,
      id,
      a.libelle_station,
      { type: 'Point', coordinates: p },
      {
        value:
          r.grandeur_hydro === 'H'
            ? heightMeters(r.resultat_obs)
            : flowM3s(r.resultat_obs),
        unit: r.grandeur_hydro === 'H' ? 'm (H publié)' : 'm³/s',
        kind: r.grandeur_hydro,
        qualification: r.code_qualification_obs,
        station: a.code_station,
        method: 'Observation brute Hub’Eau',
        reference:
          a.altitude_ref_alti_station == null
            ? 'Référentiel altimétrique non renseigné ; ne pas comparer aux autres stations'
            : 'Référentiel propre à la station, conversion sans NGF',
        altimetricReferenceRaw: a.altitude_ref_alti_station ?? null,
        altimetricSystemCode: a.code_systeme_alti_site ?? null,
        stationNotes: plain(a.commentaire_station),
        sourceUrl:
          'https://www.hydro.eaufrance.fr/stationhydro/' +
          a.code_station +
          '/fiche',
      },
      { observedAt: utc(r.date_obs) },
    );
  });
  return {
    features,
    schema:
      'Référentiel code_station, commune, en_service ; observations date_obs, grandeur_hydro H/Q, resultat_obs mm ou L/s',
  };
}
export async function meteo(s, o) {
  const j = await ods(
    'data.iledefrance.fr',
    'meteo-vigilance-niveau-departemental-idf',
    o,
    "domain_id='75'",
  );
  return {
    features: j.rows.map((r) => {
      if (
        r.domain_id !== '75' ||
        ![1, 2, 3, 4].includes(r.color_id) ||
        !utc(r.product_datetime) ||
        !utc(r.begin_time) ||
        !utc(r.end_time)
      )
        throw Error('Vigilance météo invalide');
      return feature(
        s,
        r.phenomenon_id + ':' + r.echeance,
        r.phenomenon,
        null,
        {
          status: r.color,
          level: r.color_id,
          official: true,
          coverage: 'Département 75, aucun emplacement précis',
        },
        {
          publishedAt: utc(r.product_datetime),
          validFrom: utc(r.begin_time),
          validTo: utc(r.end_time),
        },
      );
    }),
    schema: j.meta.fields,
    license: j.meta.metas.default.license,
  };
}
