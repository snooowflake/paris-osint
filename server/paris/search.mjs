import { request } from './http.mjs';
import { contains } from '../../src/paris/geo.mjs';
import { digest } from './auth.mjs';
export async function search(query, store, boundary, fetcher = fetch) {
  if (
    typeof query !== 'string' ||
    query.trim().length < 3 ||
    query.length > 200
  )
    throw Error('Recherche de 3 à 200 caractères');
  const q = query.trim(),
    key = 'search:' + digest(q.toLocaleLowerCase('fr'));
  const cached = store.get(key);
  if (cached && cached.until > Date.now()) return cached.features;
  const pace = store.get('search:pace');
  if (pace && pace.next > Date.now())
    throw Error('Recherche partagée limitée à une requête par seconde');
  store.set('search:pace', { next: Date.now() + 1000 });
  const params = new URLSearchParams({
    q: q + ' Paris',
    citycode: '75056',
    limit: '10',
  });
  const j = await request('https://data.geopf.fr/geocodage/search?' + params, {
    store,
    fetcher,
    provider: 'ign-search',
    budget: 1000,
    limit: 1e6,
  });
  if (
    j.type !== 'FeatureCollection' ||
    !Array.isArray(j.features) ||
    j.features.length > 10
  )
    throw Error('Géocodage invalide');
  const features = j.features
    .filter(
      (f) =>
        f.geometry?.type === 'Point' &&
        contains(f.geometry.coordinates, boundary),
    )
    .map((f, i) => ({
      type: 'Feature',
      id: String(f.properties?.id || i),
      geometry: f.geometry,
      properties: {
        name: String(f.properties?.label || 'Adresse Paris').slice(0, 200),
        source: 'ign-ban',
        nature: 'reference',
        observedAt: null,
        publishedAt: null,
        collectedAt: new Date().toISOString(),
        method: 'Géocodage IGN / BAN, référence sans observation actuelle',
      },
    }));
  store.set(key, { until: Date.now() + 864e5, features });
  store.db.exec(
    "DELETE FROM kv WHERE key LIKE 'search:%' AND key NOT IN (SELECT key FROM kv WHERE key LIKE 'search:%' ORDER BY rowid DESC LIMIT 2000)",
  );
  return features;
}
