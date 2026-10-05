import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
export const digest = (s) => createHash('sha256').update(s).digest('hex');
export function hashPassword(p) {
  if (typeof p !== 'string' || p.length < 12 || p.length > 512)
    throw Error('Mot de passe : 12 à 512 caractères');
  const salt = randomBytes(16).toString('hex');
  return (
    salt +
    ':' +
    scryptSync(p, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64e6 }).toString(
      'hex',
    )
  );
}
export function verify(p, hash) {
  if (typeof p !== 'string' || p.length > 512) return false;
  const [salt, key] = (hash || '').split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(key || '')) return false;
  const value = scryptSync(p, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64e6 });
  return timingSafeEqual(value, Buffer.from(key, 'hex'));
}
export function user(store, login, password, role = 'admin') {
  if (
    !/^[a-zA-Z0-9_.-]{3,64}$/.test(login) ||
    !['admin', 'reader'].includes(role)
  )
    throw Error('Compte invalide');
  store.db
    .prepare('INSERT INTO users VALUES(?,?,?)')
    .run(login, hashPassword(password), role);
}
export function newSession(store, login) {
  const token = randomBytes(32).toString('hex'),
    csrf = randomBytes(24).toString('hex');
  store.db
    .prepare('INSERT INTO sessions VALUES(?,?,?,?)')
    .run(digest(token), login, csrf, Date.now() + 8 * 36e5);
  return { token, csrf };
}
export function session(store, req) {
  const raw = (req.headers.cookie || '')
    .split(';')
    .find((x) => x.trim().startsWith('paris_session='))
    ?.trim()
    .slice(14);
  if (!/^[a-f0-9]{64}$/.test(raw || '')) return null;
  return (
    store.db
      .prepare(
        'SELECT s.*,u.role FROM sessions s JOIN users u USING(login) WHERE token=? AND expires>?',
      )
      .get(digest(raw), Date.now()) || null
  );
}
export function csrfOk(req, s, origin) {
  const value = req.headers['x-csrf-token'];
  return (
    req.headers.origin === origin &&
    typeof value === 'string' &&
    /^[a-f0-9]{48}$/.test(value) &&
    timingSafeEqual(Buffer.from(value), Buffer.from(s.csrf))
  );
}
export const cookie = (token, secure = false) =>
  `paris_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? 28800 : 0}${secure ? '; Secure' : ''}`;
export class Limiter {
  constructor() {
    this.m = new Map();
  }
  allow(key, max = 120, ms = 60000) {
    const now = Date.now();
    let v = this.m.get(key);
    if (!v || v.until < now) {
      v = { n: 0, until: now + ms };
      this.m.set(key, v);
    }
    if (this.m.size > 2000)
      for (const [k, x] of this.m) if (x.until < now) this.m.delete(k);
    if (this.m.size > 3000) return false;
    return ++v.n <= max;
  }
}
