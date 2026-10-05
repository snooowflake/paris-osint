import { ods } from './http.mjs';
import { feature } from './paris-data.mjs';
import { toWgs84 } from './projection.mjs';
import { utc } from '../../src/paris/geo.mjs';
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
        { kind: r.arrtype, referenceOnly: true, code: r.arrid },
        { publishedAt: utc(r.arrchanged) },
      );
    }
    return feature(
      s,
      r.objectid_1 || r.id || r.objectid || r.code_ligne,
      r.res_com || r.nom_ligne || r.route_long_name,
      r.geo_shape?.geometry || r.geo_shape || r.geom?.geometry || r.geom,
      { referenceOnly: true, lineRef: r.idrefligc || r.idreflig || null },
      { publishedAt: utc(j.meta.metas.default.modified) },
    );
  });
  return {
    features,
    license: j.meta.metas.default.license,
    schema: j.meta.fields,
  };
}
