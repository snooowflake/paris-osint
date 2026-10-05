import { registry, boundary } from './collector.mjs';
import { contains, utc } from '../../src/paris/geo.mjs';
import { SourceError } from './http.mjs';
export const defaultLayers = [
  'tomtom-flow',
  'comptages-route',
  'pc-lutece',
  'travaux',
  'idfm-traces',
  'idfm-arrets',
];
// Préférences enregistrées avant la refonte : couches retirées écartées,
// nouvelles couches de circulation et de transport proposées une fois.
export function migratePreferences(stored) {
  const known = new Set(registry.map((s) => s.id));
  if (!stored)
    return { version: 2, layers: [...defaultLayers], favorites: [], views: [] };
  const layers = (Array.isArray(stored.layers) ? stored.layers : []).filter(
    (x) => known.has(x),
  );
  return {
    version: 2,
    layers:
      stored.version >= 2
        ? layers
        : [...new Set([...defaultLayers, ...layers])].slice(0, 30),
    favorites: (Array.isArray(stored.favorites) ? stored.favorites : []).filter(
      (x) => known.has(x?.source),
    ),
    views: Array.isArray(stored.views) ? stored.views : [],
  };
}
export function validatePreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Préférences invalides');
  const known = new Set(registry.map((s) => s.id));
  const layers = value.layers || [];
  if (
    !Array.isArray(layers) ||
    layers.length > 30 ||
    layers.some((x) => !known.has(x))
  )
    throw Error('Couches invalides');
  const favorites = value.favorites || [];
  if (
    !Array.isArray(favorites) ||
    favorites.length > 100 ||
    favorites.some(
      (x) =>
        typeof x.id !== 'string' ||
        x.id.length > 200 ||
        !known.has(x.source) ||
        typeof x.name !== 'string' ||
        x.name.length > 160,
    )
  )
    throw Error('Favoris invalides');
  const views = value.views || [];
  if (
    !Array.isArray(views) ||
    views.length > 20 ||
    views.some(
      (v) =>
        !contains([v.lon, v.lat], boundary) ||
        typeof v.name !== 'string' ||
        v.name.length > 100 ||
        ![v.range, v.heading, v.pitch].every(Number.isFinite) ||
        v.range < 500 ||
        v.range > 60000 ||
        v.pitch < -Math.PI / 2 ||
        v.pitch > -0.05 ||
        Math.abs(v.heading) > Math.PI * 2,
    )
  )
    throw Error('Vue hors de Paris');
  return {
    layers: [...new Set(layers)],
    favorites: favorites.map((x) => ({
      id: x.id,
      source: x.source,
      name: x.name,
    })),
    views: views.map((v) => ({
      name: v.name,
      lon: v.lon,
      lat: v.lat,
      range: v.range,
      heading: v.heading,
      pitch: v.pitch,
    })),
    version: 2,
  };
}
export async function routes(ctx) {
  const { req, res, url, user, store, collector, json, body, env } = ctx;
  const p = url.pathname;
  if (p === '/api/me')
    return json(200, {
      login: user.login,
      role: user.role,
      csrf: user.csrf,
      version: '0.4.0',
    });
  if (p === '/api/sources')
    return json(200, { sources: registry.map((s) => collector.status(s)) });
  if (p === '/api/features') {
    const s = registry.find((x) => x.id === url.searchParams.get('source'));
    if (!s) return json(404, { error: 'Source inconnue' });
    const offset = Number(url.searchParams.get('offset') || 0),
      limit = Number(url.searchParams.get('limit') || 500);
    if (
      !Number.isInteger(offset) ||
      offset < 0 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 1000
    )
      return json(400, { error: 'Pagination invalide' });
    const all = collector.features(s);
    return json(200, {
      type: 'FeatureCollection',
      source: s.id,
      features: all.slice(offset, offset + limit),
      total: all.length,
      state: collector.status(s).state,
      collectedAt: collector.status(s).collectedAt,
    });
  }
  if (p === '/api/preferences') {
    const key = 'preferences:' + user.login;
    if (req.method === 'GET')
      return json(200, migratePreferences(store.get(key)));
    if (req.method === 'POST') {
      try {
        const preferences = validatePreferences(await body());
        const old = store.get(key)?.favorites || [];
        for (const f of preferences.favorites) {
          if (old.some((x) => x.source === f.source && x.id === f.id)) continue;
          const source = registry.find((x) => x.id === f.source);
          if (!collector.features(source).some((x) => x.id === f.id))
            throw Error('Favori hors du cache parisien');
        }
        store.set(key, preferences);
        return json(200, preferences);
      } catch {
        return json(400, {
          error: 'Préférences invalides ou vue hors de Paris',
        });
      }
    }
  }
  if (p === '/api/annotations') {
    const key = 'annotations:' + user.login;
    if (req.method === 'GET') return json(200, store.get(key) || []);
    if (req.method === 'POST') {
      const a = await body();
      if (
        typeof a.text !== 'string' ||
        a.text.length > 1000 ||
        !contains(a.point, boundary)
      )
        return json(400, { error: 'Annotation invalide ou hors de Paris' });
      const rows = store.get(key) || [];
      if (rows.length >= 100)
        return json(409, { error: 'Limite de 100 annotations' });
      rows.push({
        id: crypto.randomUUID(),
        text: a.text,
        point: a.point.slice(0, 2),
        createdAt: new Date().toISOString(),
        kind: 'Annotation personnelle, pas une alerte officielle',
      });
      store.set(key, rows);
      return json(201, rows.at(-1));
    }
    if (req.method === 'DELETE') {
      const a = await body();
      store.set(
        key,
        (store.get(key) || []).filter((x) => x.id !== a.id),
      );
      return json(200, { ok: true });
    }
  }
  if (p === '/api/history') {
    const from = utc(url.searchParams.get('from')),
      to = utc(url.searchParams.get('to'));
    if (
      !from ||
      !to ||
      Date.parse(to) < Date.parse(from) ||
      Date.parse(to) - Date.parse(from) > 14 * 864e5
    )
      return json(400, {
        error: 'Période UTC valide de 14 jours maximum requise',
      });
    const source = url.searchParams.get('source') || null;
    if (source && !registry.some((s) => s.id === source))
      return json(400, { error: 'Source invalide' });
    const rawOffset = url.searchParams.get('offset') || '0';
    const offset = Number(rawOffset);
    if (
      !/^\d+$/.test(rawOffset) ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 50000
    )
      return json(400, { error: 'Pagination invalide' });
    // Archives de sources retirées du registre : conservées jusqu’à purge, non servies.
    const ids = registry.map((s) => s.id),
      inRegistry = 'source IN (' + ids.map(() => '?').join(',') + ')';
    const total = store.db
      .prepare(
        'SELECT count(*) AS n FROM history WHERE lastSeen>=? AND firstSeen<=? AND (? IS NULL OR source=?) AND ' +
          inRegistry,
      )
      .get(from, to, source, source, ...ids).n;
    const rows = store.db
      .prepare(
        'SELECT source,id,firstSeen,lastSeen,feature FROM history WHERE lastSeen>=? AND firstSeen<=? AND (? IS NULL OR source=?) AND ' +
          inRegistry +
          ' ORDER BY lastSeen DESC,source,id,revision LIMIT 1000 OFFSET ?',
      )
      .all(from, to, source, source, ...ids, offset);
    return json(200, {
      rows: rows.map((r) => ({ ...r, feature: JSON.parse(r.feature) })),
      limit: 1000,
      total,
      offset,
      nextOffset: offset + rows.length < total ? offset + rows.length : null,
      notice:
        'Archives réellement acquises, au plus 14 jours et 50 000 révisions. Première observation distincte de la date de l’événement.',
    });
  }
  const tile =
    /^\/api\/traffic-tiles\/(\d{1,2})\/(\d{1,6})\/(\d{1,6})\.png$/.exec(p);
  if (tile && req.method === 'GET') {
    try {
      const t = await collector.flowTiles.get(...tile.slice(1).map(Number));
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=60',
      });
      return res.end(t.buf);
    } catch (e) {
      const state = e instanceof SourceError ? e.state : 'failure';
      return json(
        { disabled: 503, quota: 429, auth_error: 502 }[state] ||
          (e.message === 'Tuile hors de Paris' ? 404 : 502),
        { error: e instanceof SourceError ? e.message : 'Tuile indisponible' },
      );
    }
  }
  if (p === '/api/departures' && req.method === 'GET') {
    const stop = url.searchParams.get('stop') || '',
      s = registry.find((x) => x.id === 'prim-passages');
    if (!/^\d{1,10}$/.test(stop)) return json(400, { error: 'Arrêt invalide' });
    if (!s?.enabled || !env[s.auth])
      return json(503, {
        error: 'Prochains passages indisponibles : clé PRIM non configurée',
      });
    const known = collector
      .features(registry.find((x) => x.id === 'idfm-arrets'))
      .some((f) => f.properties.code === stop);
    if (!known)
      return json(404, { error: 'Arrêt absent du référentiel parisien' });
    try {
      return json(200, await collector.departures.get(stop));
    } catch (e) {
      return json(e instanceof SourceError && e.state === 'quota' ? 429 : 502, {
        error:
          e instanceof SourceError
            ? 'Prochains passages indisponibles : ' + e.message
            : 'Prochains passages indisponibles',
      });
    }
  }
  if (p === '/api/refresh' && req.method === 'POST')
    return json(200, {
      ok: true,
      notice: 'Cache partagé ; fréquence et quotas conservés.',
    });
  if (p === '/api/logout' && req.method === 'POST') {
    store.db.prepare('DELETE FROM sessions WHERE token=?').run(user.token);
    res.setHeader('Set-Cookie', ctx.cookie(''));
    return json(200, { ok: true });
  }
  if (p === '/api/admin' && req.method === 'GET') {
    if (user.role !== 'admin')
      return json(403, { error: 'Administrateur requis' });
    return json(200, {
      providers: registry
        .filter((s) => s.auth)
        .map((s) => ({
          id: s.id,
          configured: !!env[s.auth],
          variable: s.auth,
        })),
      notice:
        'Configurer les secrets hors Git dans le fichier serveur, puis redémarrer ce seul service.',
    });
  }
  if (p === '/api/export') {
    const s = registry.find((s) => s.id === url.searchParams.get('source'));
    if (!s || !s.exportAllowed)
      return json(403, { error: 'Export non autorisé pour cette source' });
    if (!['available', 'empty'].includes(collector.status(s).state))
      return json(503, {
        error: 'Source indisponible ou ancienne ; nombre inconnu',
      });
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="paris-' + s.id + '.geojson"',
    );
    return json(200, {
      type: 'FeatureCollection',
      features: collector.features(s),
      attribution: s.producer,
      license: collector.status(s).license,
      exportedAt: new Date().toISOString(),
    });
  }
  return json(404, { error: 'Route inconnue' });
}
