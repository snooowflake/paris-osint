import {
  ods,
  odsMeta,
  odsExport,
  odsField,
  requireFields,
  SourceError,
} from './http.mjs';
import { feature, plain } from './paris-data.mjs';
import { toWgs84 } from './projection.mjs';
import { utc } from '../../src/paris/geo.mjs';
import {
  hexColor,
  lineRefOf,
  modes,
  normMode,
} from '../../src/paris/model.mjs';
export async function reference(s, o) {
  const where =
    s.id === 'idfm-arrets'
      ? ['75056', ...Array.from({ length: 20 }, (_, i) => String(75101 + i))]
          .map((c) => "arrpostalregion='" + c + "'")
          .join(' or ')
      : '';
  const j = await ods('data.iledefrance-mobilites.fr', s.dataset, o, where);
  const features = j.rows.map((r) => {
    if (s.id === 'idfm-arrets') {
      const p = r.arrgeopoint
        ? [r.arrgeopoint.lon, r.arrgeopoint.lat]
        : toWgs84([r.arrxepsg2154, r.arryepsg2154], 'EPSG:2154');
      return feature(
        s,
        r.arrid,
        r.arrname,
        { type: 'Point', coordinates: p },
        {
          kind: r.arrtype,
          mode: normMode(r.arrtype),
          referenceOnly: true,
          code: /^\d{1,10}$/.test(String(r.arrid)) ? String(r.arrid) : null,
          accessibility: plain(r.arraccessibility).slice(0, 40) || null,
        },
        { publishedAt: utc(r.arrchanged) },
      );
    }
    return feature(
      s,
      r.objectid_1 || r.id || r.objectid || r.code_ligne,
      r.res_com || r.nom_ligne || r.route_long_name,
      r.geo_shape?.geometry || r.geo_shape || r.geom?.geometry || r.geom,
      {
        referenceOnly: true,
        lineRef: lineRefOf(r.idrefligc || r.idreflig),
        mode: normMode(r.mode),
        line: plain(r.indice_lig).slice(0, 12) || null,
        color: hexColor(r.colourweb_hexa),
        operator: plain(r.exploitant).slice(0, 80) || null,
      },
      { publishedAt: utc(j.meta.metas.default.modified) },
    );
  });
  return {
    features,
    license: j.meta.metas.default.license,
    schema: j.meta.fields,
  };
}
// Lignes théoriques (GTFS) desservant chaque arrêt du rectangle parisien.
export async function lignes(s, o) {
  const host = 'data.iledefrance-mobilites.fr',
    meta = await odsMeta(host, s.dataset, o);
  requireFields(meta, ['id', 'shortname', 'mode', 'stop_id', 'stop_name']);
  const point = odsField(meta, ['geo_point_2d']);
  if (!point)
    throw new SourceError('failure', 'Coordonnées des arrêts absentes');
  const longName = meta.fields.some((f) => f.name === 'route_long_name')
    ? ['route_long_name']
    : [];
  const rows = await odsExport(
    host,
    s.dataset,
    o,
    `in_bbox(${point}, 48.815, 2.224, 48.904, 2.47)`,
    [
      'id',
      'shortname',
      'mode',
      'stop_id',
      'stop_name',
      point,
      ...longName,
    ].join(','),
    60000,
  );
  const stops = new Map();
  for (const r of rows) {
    const m = /^IDFM:(?:monomodalStopPlace:)?(\d{1,10})$/.exec(r.stop_id || ''),
      ref = lineRefOf(r.id),
      p = r[point];
    if (!m || !ref || !Number.isFinite(p?.lon) || !Number.isFinite(p?.lat))
      continue;
    if (!stops.has(r.stop_id))
      stops.set(r.stop_id, {
        code: m[1],
        name: r.stop_name,
        point: [p.lon, p.lat],
        lines: new Map(),
      });
    stops.get(r.stop_id).lines.set(ref, {
      ref,
      name: plain(r.shortname).slice(0, 24),
      mode: normMode(r.mode),
      longName: plain(r.route_long_name).slice(0, 160) || null,
    });
  }
  const features = [...stops].map(([id, x]) =>
    feature(
      s,
      id,
      x.name,
      { type: 'Point', coordinates: x.point },
      {
        referenceOnly: true,
        code: x.code,
        lines: [...x.lines.values()]
          .sort(
            (a, b) =>
              modes[a.mode].order - modes[b.mode].order ||
              a.name.localeCompare(b.name, 'fr', { numeric: true }),
          )
          .slice(0, 30),
      },
      { publishedAt: utc(meta.metas.default.modified) },
    ),
  );
  return {
    features,
    license: meta.metas.default.license,
    schema: meta.fields.map((x) => ({ name: x.name, type: x.type })),
  };
}
