import polygonClipping from 'polygon-clipping';
export const point = (p) =>
  Array.isArray(p) &&
  p.length >= 2 &&
  p.length <= 3 &&
  p.every(Number.isFinite) &&
  Math.abs(p[0]) <= 180 &&
  Math.abs(p[1]) <= 90;
const cross = (a, b, p) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
function ringContains(p, r) {
  let yes = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[j],
      b = r[i];
    if (
      Math.abs(cross(a, b, p)) < 1e-10 &&
      p[0] >= Math.min(a[0], b[0]) - 1e-10 &&
      p[0] <= Math.max(a[0], b[0]) + 1e-10 &&
      p[1] >= Math.min(a[1], b[1]) - 1e-10 &&
      p[1] <= Math.max(a[1], b[1]) + 1e-10
    )
      return true;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
const polygons = (g) =>
  g.type === 'Polygon'
    ? [g.coordinates]
    : g.type === 'MultiPolygon'
      ? g.coordinates
      : [];
export function contains(p, g) {
  return (
    point(p) &&
    polygons(g).some(
      (r) =>
        ringContains(p, r[0]) && !r.slice(1).some((h) => ringContains(p, h)),
    )
  );
}
export function validGeometry(g) {
  if (
    !g ||
    ![
      'Point',
      'MultiPoint',
      'LineString',
      'MultiLineString',
      'Polygon',
      'MultiPolygon',
    ].includes(g.type) ||
    !Array.isArray(g.coordinates) ||
    g.crs
  )
    return false;
  let n = 0;
  const pts = (a) =>
      Array.isArray(a) && a.every((p) => point(p) && ++n <= 20000),
    ring = (r) =>
      pts(r) &&
      r.length >= 4 &&
      r[0][0] === r.at(-1)[0] &&
      r[0][1] === r.at(-1)[1],
    poly = (p) => Array.isArray(p) && p.length > 0 && p.every(ring);
  if (g.type === 'Point') return point(g.coordinates);
  if (g.type === 'MultiPoint') return pts(g.coordinates);
  if (g.type === 'LineString')
    return pts(g.coordinates) && g.coordinates.length >= 2;
  if (g.type === 'MultiLineString')
    return g.coordinates.every((r) => pts(r) && r.length >= 2);
  return g.type === 'Polygon' ? poly(g.coordinates) : g.coordinates.every(poly);
}
function lineClip(line, g) {
  const out = [];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1],
      b = line[i],
      v = [b[0] - a[0], b[1] - a[1]],
      ts = [0, 1];
    for (const poly of polygons(g))
      for (const r of poly)
        for (let j = 1; j < r.length; j++) {
          const c = r[j - 1],
            d = r[j],
            w = [d[0] - c[0], d[1] - c[1]],
            den = v[0] * w[1] - v[1] * w[0];
          if (Math.abs(den) < 1e-15) continue;
          const q = [c[0] - a[0], c[1] - a[1]],
            t = (q[0] * w[1] - q[1] * w[0]) / den,
            u = (q[0] * v[1] - q[1] * v[0]) / den;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
        }
    ts.sort((x, y) => x - y);
    const at = (t) => [a[0] + t * v[0], a[1] + t * v[1]];
    for (let j = 1; j < ts.length; j++)
      if (ts[j] - ts[j - 1] > 1e-12 && contains(at((ts[j] + ts[j - 1]) / 2), g))
        out.push([at(ts[j - 1]), at(ts[j])]);
  }
  return out;
}
export function clip(g, boundary) {
  if (!validGeometry(g)) return null;
  if (g.type === 'Point') return contains(g.coordinates, boundary) ? g : null;
  if (g.type === 'MultiPoint') {
    const c = g.coordinates.filter((p) => contains(p, boundary));
    return c.length ? { type: g.type, coordinates: c } : null;
  }
  if (['Polygon', 'MultiPolygon'].includes(g.type)) {
    try {
      const c = polygonClipping.intersection(
        g.coordinates,
        boundary.coordinates,
      );
      return c.length ? { type: 'MultiPolygon', coordinates: c } : null;
    } catch {
      return null;
    }
  }
  const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates,
    c = lines.flatMap((l) => lineClip(l, boundary));
  return c.length ? { type: 'MultiLineString', coordinates: c } : null;
}
export function utc(v) {
  if (typeof v === 'number') {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof v !== 'string' || !/(Z|[+-]\d{2}:?\d{2})$/.test(v)) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
// Heure murale de Paris (changements d’heure compris) vers un instant UTC.
function parisWallClock(year, month, day, hour = 0, minute = 0, second = 0) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let t = target;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      f.formatToParts(t).map((x) => [x.type, x.value]),
    );
    const local = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    t -= local - target;
  }
  return t;
}
export function parisDay(s, next = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  const target = Date.parse(s + 'T00:00:00Z');
  if (
    !Number.isFinite(target) ||
    new Date(target).toISOString().slice(0, 10) !== s
  )
    return null;
  const d = new Date(target + (next ? 864e5 : 0));
  return new Date(
    parisWallClock(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
  ).toISOString();
}
// Dates Navitia/PRIM « AAAAMMJJTHHMMSS » exprimées en heure de Paris.
export function parisLocal(s) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s || '');
  if (!m) return utc(s);
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number);
  const check = new Date(Date.UTC(y, mo - 1, d, h, mi, se));
  if (
    check.getUTCMonth() !== mo - 1 ||
    check.getUTCDate() !== d ||
    h > 23 ||
    mi > 59 ||
    se > 59
  )
    return null;
  return new Date(parisWallClock(y, mo, d, h, mi, se)).toISOString();
}
export function current(f, s, now = Date.now()) {
  const p = f.properties || {};
  if (
    !['computed', 'forecast'].includes(s.nature) &&
    p.validFrom &&
    Date.parse(p.validFrom) > now
  )
    return false;
  if (p.validTo && Date.parse(p.validTo) <= now) return false;
  if (s.nature === 'reference') return true;
  const d =
    p.observedAt ||
    p.publishedAt ||
    (s.nature === 'computed' ? p.elementEpoch : null);
  if (s.nature === 'forecast' && p.forecastDate && p.publicationUnknown)
    return Date.parse(parisDay(p.forecastDate, true)) > now;
  if (
    !d ||
    Date.parse(d) > now + 12e4 ||
    now - Date.parse(d) > s.staleAfter * 1000
  )
    return false;
  return true;
}
export function dedup(rows) {
  const m = new Map();
  for (const f of rows) {
    const old = m.get(f.id);
    if (
      !old ||
      Date.parse(f.properties.observedAt || f.properties.publishedAt || 0) >
        Date.parse(old.properties.observedAt || old.properties.publishedAt || 0)
    )
      m.set(f.id, f);
  }
  return [...m.values()];
}
