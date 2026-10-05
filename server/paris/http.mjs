export class SourceError extends Error {
  constructor(state, message) {
    super(message);
    this.state = state;
  }
}
const allowed = {
  'opendata.paris.fr':
    /^\/api\/explore\/v2\.1\/catalog\/datasets\/[a-z0-9_-]+(?:\/records|\/exports\/json)?$/,
  'data.iledefrance.fr':
    /^\/api\/explore\/v2\.1\/catalog\/datasets\/meteo-vigilance-niveau-departemental-idf(?:\/records)?$/,
  'data.iledefrance-mobilites.fr':
    /^\/api\/explore\/v2\.1\/catalog\/datasets\/[a-z0-9_-]+(?:\/records|\/exports\/json)?$/,
  'velib-metropole-opendata.smovengo.cloud':
    /^\/opendata\/Velib_Metropole\/(station_information|station_status|system_information|gbfs)\.json$/,
  'hubeau.eaufrance.fr':
    /^\/api\/v2\/hydrometrie\/(referentiel\/stations|observations_tr)$/,
  'celestrak.org': /^\/NORAD\/elements\/gp\.php$/,
  'stac.dataspace.copernicus.eu':
    /^\/v1\/(search|collections\/sentinel-2-l2a)$/,
  'data.geopf.fr': /^\/geocodage\/search$/,
  'api.airparif.fr': /^\/indices\/prevision\/commune$/,
  'api.tomtom.com':
    /^\/traffic\/(services\/5\/incidentDetails|map\/4\/tile\/flow\/relative0\/\d{1,2}\/\d{1,6}\/\d{1,6}\.png)$/,
  'prim.iledefrance-mobilites.fr':
    /^\/marketplace\/(disruptions_bulk\/disruptions\/v2|stop-monitoring)$/,
  'public-api.meteofrance.fr':
    /^\/public\/DPVigilance\/v1\/cartevigilance\/encours$/,
};
export function allowedUrl(value) {
  const u = new URL(value);
  if (
    u.protocol !== 'https:' ||
    u.username ||
    u.password ||
    (u.port && u.port !== '443') ||
    !allowed[u.hostname]?.test(u.pathname)
  )
    throw new SourceError(
      'failure',
      'Fournisseur ou chemin sortant non autorisé',
    );
  return u;
}
export async function request(
  url,
  {
    store,
    provider = 'public',
    budget = 4000,
    headers = {},
    fetcher = fetch,
    limit = 12e6,
    text = false,
    binary = false,
    signal,
  } = {},
) {
  const u = allowedUrl(url);
  signal?.throwIfAborted();
  if (store && !store.reserve(provider, budget))
    throw new SourceError('quota', 'Budget partagé atteint (20 % de réserve)');
  const r = await fetcher(u, {
    headers: {
      'User-Agent':
        'Paris-OSINT/0.4.0 (https://github.com/snooowflake/paris-osint)',
      Accept: binary ? 'image/png' : 'application/json',
      ...headers,
    },
    redirect: 'error',
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!r.ok)
    throw new SourceError(
      [401, 403].includes(r.status)
        ? 'auth_error'
        : r.status === 429
          ? 'quota'
          : 'failure',
      `HTTP ${r.status}`,
    );
  if (Number(r.headers.get('content-length')) > limit)
    throw new SourceError('failure', 'Réponse trop volumineuse');
  const reader = r.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit)
        throw new SourceError('failure', 'Réponse trop volumineuse');
      chunks.push(value);
    }
  } catch (e) {
    await reader.cancel().catch(() => {});
    throw e;
  }
  const raw = Buffer.concat(chunks);
  if (binary) return raw;
  const body = raw.toString('utf8');
  if (text) return body;
  try {
    return JSON.parse(body);
  } catch {
    throw new SourceError('failure', 'JSON invalide');
  }
}
export async function odsMeta(host, dataset, options = {}) {
  const meta = await request(
    `https://${host}/api/explore/v2.1/catalog/datasets/${dataset}`,
    options,
  );
  if (!Array.isArray(meta.fields) || !meta.metas?.default)
    throw new SourceError('failure', 'Schéma du catalogue invalide');
  return meta;
}
export async function ods(
  host,
  dataset,
  options = {},
  where = '',
  select = '',
  { pageSize = 100, meta } = {},
) {
  const base = `https://${host}/api/explore/v2.1/catalog/datasets/${dataset}`;
  meta ??= await odsMeta(host, dataset, options);
  const rows = [];
  let total;
  for (let offset = 0; offset < 10000; offset += pageSize) {
    const q = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
    });
    if (where) q.set('where', where);
    if (select) q.set('select', select);
    const j = await request(base + '/records?' + q, options);
    if (
      !Number.isInteger(j.total_count) ||
      !Array.isArray(j.results) ||
      j.total_count > 10000
    )
      throw new SourceError('failure', 'Pagination hors limites');
    if (total !== undefined && total !== j.total_count)
      throw new SourceError(
        'failure',
        'Jeu modifié pendant la pagination : reprise différée',
      );
    total = j.total_count;
    rows.push(...j.results);
    if (rows.length >= total) break;
    if (j.results.length !== pageSize)
      throw new SourceError('failure', 'Page tronquée');
  }
  if (rows.length !== total)
    throw new SourceError('failure', 'Pagination incomplète');
  return { rows, meta };
}
// Export complet filtré, pour les référentiels dépassant 10 000 lignes paginées.
export async function odsExport(host, dataset, options, where, select, max) {
  const q = new URLSearchParams({ where, select });
  const rows = await request(
    `https://${host}/api/explore/v2.1/catalog/datasets/${dataset}/exports/json?` +
      q,
    options,
  );
  if (!Array.isArray(rows) || rows.length > max)
    throw new SourceError('failure', 'Export hors limites');
  return rows;
}
// Premier champ du catalogue ayant l’un des types demandés.
export function odsField(meta, types) {
  return (
    meta.fields.find(
      (f) => types.includes(f.type) && /^[a-z0-9_]{1,64}$/.test(f.name),
    )?.name || null
  );
}
export function requireFields(meta, names) {
  const known = new Set(meta.fields.map((f) => f.name));
  const missing = names.filter((n) => !known.has(n));
  if (missing.length)
    throw new SourceError(
      'failure',
      'Schéma fournisseur inattendu : ' + missing.join(', ') + ' absent',
    );
}
