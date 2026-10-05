import { request } from './http.mjs';
import { feature } from './paris-data.mjs';
import { utc } from '../../src/paris/geo.mjs';
import { twoline2satrec } from 'satellite.js';
import { findNextSatellitePass } from '../../src/data/satellitePass.js';
export async function satellites(s, o) {
  const text = await request(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    { ...o, text: true, limit: 200000 },
  );
  const lines = text.trim().split(/\r?\n/);
  if (lines.length % 3 || lines.length > 300)
    throw Error('TLE incomplets ou trop nombreux');
  const features = [];
  for (let i = 0; i < lines.length; i += 3) {
    if (!lines[i + 1].startsWith('1 ') || !lines[i + 2].startsWith('2 '))
      throw Error('TLE invalide');
    const rec = twoline2satrec(lines[i + 1], lines[i + 2]);
    if (rec.error) continue;
    const year = rec.epochyr < 57 ? 2000 + rec.epochyr : 1900 + rec.epochyr;
    const epoch = Date.UTC(year, 0, 1) + (rec.epochdays - 1) * 864e5;
    if (Date.now() - epoch > s.staleAfter * 1000 || epoch > Date.now() + 12e4)
      continue;
    const p = findNextSatellitePass({
      satrec: rec,
      latDeg: 48.8566,
      lonDeg: 2.3522,
      fromMs: Date.now(),
      horizonHours: 24,
      minElevDeg: 10,
    });
    if (p)
      features.push(
        feature(
          s,
          rec.satnum,
          lines[i].trim(),
          null,
          {
            elementEpoch: utc(epoch),
            model: 'SGP4',
            maxElevationDeg: p.maxElevDeg,
            peakAt: utc(p.maxElevMs),
            visibleCalculated: p.visible,
            coverage: 'Calcul pour Paris, horizon +24 h',
          },
          { validFrom: utc(p.riseMs), validTo: utc(p.setMs) },
        ),
      );
  }
  return {
    features,
    schema: 'TLE 3 lignes ; époque orbitale ; passage calculé SGP4',
  };
}
export async function sentinel(s, o) {
  const start = new Date(Date.now() - 3 * 864e5).toISOString(),
    end = new Date().toISOString();
  const query = new URLSearchParams({
    collections: 'sentinel-2-l2a',
    bbox: '2.224,48.815,2.47,48.904',
    datetime: start + '/' + end,
    limit: '100',
    sortby: '-datetime',
  });
  let url = 'https://stac.dataspace.copernicus.eu/v1/search?' + query;
  const features = [];
  for (let page = 0; url && page < 10; page++) {
    const j = await request(url, o);
    if (j.type !== 'FeatureCollection' || !Array.isArray(j.features))
      throw Error('STAC invalide');
    for (const r of j.features) {
      if (
        r.collection !== 'sentinel-2-l2a' ||
        !utc(r.properties?.datetime) ||
        !Number.isFinite(r.properties.gsd)
      )
        throw Error('Produit Sentinel invalide');
      features.push(
        feature(
          s,
          r.id,
          r.id,
          r.geometry,
          {
            resolutionMeters: r.properties.gsd,
            cloudCoverScenePercent: r.properties['eo:cloud_cover'] ?? null,
            representation: 'Empreinte d’acquisition, image non téléchargée',
            sourceUrl: 'https://browser.dataspace.copernicus.eu/',
          },
          {
            observedAt: utc(r.properties.datetime),
            publishedAt: utc(r.properties.published),
          },
        ),
      );
    }
    const next = j.links?.find((x) => x.rel === 'next');
    url = next?.href;
    if (url) {
      const u = new URL(url);
      if (
        u.searchParams.get('bbox') !== query.get('bbox') ||
        u.searchParams.get('datetime') !== query.get('datetime')
      )
        throw Error('Pagination STAC hors périmètre');
    }
  }
  if (url) throw Error('Pagination STAC incomplète');
  return {
    features,
    schema:
      'STAC sentinel-2-l2a ; datetime acquisition, published, gsd, eo:cloud_cover pour scène entière',
  };
}
