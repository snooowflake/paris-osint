import { registry, boundary } from './collector.mjs';
import { contains, utc } from '../../src/paris/geo.mjs';
import { digest } from './auth.mjs';
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
    airportContext: value.airportContext === true,
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
      version: '0.3.0',
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
    const all = collector.features(s, url.searchParams.get('airport') === '1');
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
      return json(
        200,
        store.get(key) || {
          layers: ['pc-lutece', 'hubeau', 'vigicrues'],
          favorites: [],
          views: [],
          airportContext: false,
        },
      );
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
    const total = store.db
      .prepare(
        'SELECT count(*) AS n FROM history WHERE lastSeen>=? AND firstSeen<=? AND (? IS NULL OR source=?)',
      )
      .get(from, to, source, source).n;
    const rows = store.db
      .prepare(
        'SELECT source,id,firstSeen,lastSeen,feature FROM history WHERE lastSeen>=? AND firstSeen<=? AND (? IS NULL OR source=?) ORDER BY lastSeen DESC,source,id,revision LIMIT 1000 OFFSET ?',
      )
      .all(from, to, source, source, offset);
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
