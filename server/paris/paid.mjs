import { request } from './http.mjs';
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
