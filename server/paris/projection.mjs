import proj4 from 'proj4';
import { point } from '../../src/paris/geo.mjs';
proj4.defs(
  'EPSG:2154',
  '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs',
);
export function toWgs84(p, crs = 'EPSG:4326') {
  if (
    !Array.isArray(p) ||
    !p.every(Number.isFinite) ||
    !['EPSG:4326', 'EPSG:2154'].includes(crs)
  )
    throw Error('Projection invalide');
  const result = crs === 'EPSG:4326' ? p : proj4(crs, 'EPSG:4326', p);
  if (!point(result)) throw Error('Coordonnées invalides');
  return result;
}
export const heightMeters = (x) => (Number.isFinite(x) ? x / 1000 : null);
export const flowM3s = (x) => (Number.isFinite(x) ? x / 1000 : null);
