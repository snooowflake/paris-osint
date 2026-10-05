import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './storage.mjs';
import { Collector, boundary } from './collector.mjs';
import {
  session,
  verify,
  newSession,
  cookie as makeCookie,
  csrfOk,
  Limiter,
} from './auth.mjs';
import { routes } from './routes.mjs';
import { search } from './search.mjs';
import { privateAddress, vpnAddress } from './network.mjs';
export { vpnAddress } from './network.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
function deployedRevision() {
  try {
    const x = JSON.parse(
      fs.readFileSync(path.join(root, 'var/deployed-version.json'), 'utf8'),
    );
    return /^[a-f0-9]{40}$/.test(x.revision) ? x.revision : 'uncommitted';
  } catch {
    return 'uncommitted';
  }
}
export function createApplicationServer({
  store = new Store(),
  collector = new Collector(store),
  env = process.env,
  allowEmptyUsers = false,
} = {}) {
  const config = {
    host: env.BIND_HOST || '127.0.0.1',
    port: Number(env.PORT || 4174),
    origin: env.APP_ORIGIN || 'http://127.0.0.1:4174',
  };
  const cidrs = (env.VPN_CIDRS || '').split(',').filter(Boolean);
  const origin = new URL(config.origin),
    remote = !['127.0.0.1', '::1'].includes(config.host);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/'
  )
    throw Error('Origine invalide');
  if (
    remote &&
    origin.protocol !== 'https:' &&
    !(
      env.VPN_ONLY === '1' &&
      privateAddress(config.host) &&
      vpnAddress(config.host, cidrs) &&
      origin.hostname === config.host
    )
  )
    throw Error('HTTPS ou accès VPN explicitement limité requis');
  if (
    !allowEmptyUsers &&
    !store.db.prepare("SELECT 1 FROM users WHERE role='admin' LIMIT 1").get()
  )
    throw Error('Créer un administrateur explicitement avant le démarrage');
  const secure = origin.protocol === 'https:',
    cookie = (t) => makeCookie(t, secure),
    loginLimit = new Limiter(),
    requestLimit = new Limiter(),
    tileLimit = new Limiter();
  const listener = async (req, res) => {
    const json = (status, value) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      res.end(JSON.stringify(value));
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://data.geopf.fr; connect-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://data.geopf.fr https://tile.googleapis.com https://assets.cesium.com https://api.cesium.com; worker-src 'self' blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
    );
    if (env.VPN_ONLY === '1' && !vpnAddress(req.socket.remoteAddress, cidrs))
      return json(403, { error: 'Accès réservé au VPN' });
    try {
      if (
        req.headers.host !== new URL(config.origin).host &&
        !['127.0.0.1', 'localhost', '[::1]'].some(
          (h) => req.headers.host === h + ':' + server.address()?.port,
        )
      )
        return json(421, { error: 'Hôte inattendu' });
      const url = new URL(req.url, config.origin);
      const body = async () => {
        if (Number(req.headers['content-length']) > 65536)
          throw Error('BODY_LIMIT');
        let size = 0,
          parts = [];
        for await (const b of req) {
          size += b.length;
          if (size > 65536) throw Error('BODY_LIMIT');
          parts.push(b);
        }
        try {
          return JSON.parse(Buffer.concat(parts).toString('utf8'));
        } catch {
          throw Error('BAD_JSON');
        }
      };
      if (url.pathname === '/healthz')
        return json(200, {
          ok: true,
          version: '0.4.0',
          revision: deployedRevision(),
        });
      if (url.pathname === '/api/login' && req.method === 'POST') {
        if (req.headers.origin !== config.origin)
          return json(403, { error: 'Origine invalide' });
        if (!loginLimit.allow(req.socket.remoteAddress, 10, 15 * 60000))
          return json(429, { error: 'Réessayer plus tard' });
        const b = await body(),
          u =
            typeof b.login === 'string'
              ? store.db
                  .prepare('SELECT * FROM users WHERE login=?')
                  .get(b.login)
              : null;
        const dummy =
          '00000000000000000000000000000000:' + ''.padStart(128, '0');
        const valid = verify(b.password, u?.hash || dummy);
        if (!u || !valid) return json(401, { error: 'Connexion refusée' });
        const s = newSession(store, u.login);
        res.setHeader('Set-Cookie', cookie(s.token));
        return json(200, { ok: true });
      }
      const user = session(store, req);
      if (url.pathname.startsWith('/api/')) {
        if (!user) return json(401, { error: 'Connexion requise' });
        // Les tuiles de trafic arrivent par rafales lors d’un zoom : limite dédiée.
        if (
          url.pathname.startsWith('/api/traffic-tiles/')
            ? !tileLimit.allow(user.login, 1500)
            : !requestLimit.allow(user.login, 240)
        )
          return json(429, { error: 'Limite locale atteinte' });
        if (
          !['GET', 'HEAD'].includes(req.method) &&
          !csrfOk(req, user, config.origin)
        )
          return json(403, { error: 'CSRF invalide' });
        if (url.pathname === '/api/search') {
          try {
            return json(200, {
              type: 'FeatureCollection',
              features: await search(
                url.searchParams.get('q'),
                store,
                boundary,
              ),
            });
          } catch (e) {
            const invalid = e.message.startsWith('Recherche de'),
              paced = e.message.startsWith('Recherche partagée');
            return json(invalid ? 400 : paced ? 429 : 502, {
              error:
                invalid || paced ? e.message : 'Géocodage IGN indisponible',
            });
          }
        }
        return await routes({
          req,
          res,
          url,
          user,
          store,
          collector,
          json,
          body,
          env,
          cookie,
        });
      }
      const anonymous = ['/login.html', '/login.js', '/login.css'];
      if (!user && !anonymous.includes(url.pathname)) {
        res.writeHead(303, { Location: '/login.html' });
        return res.end();
      }
      if (!['GET', 'HEAD'].includes(req.method))
        return json(405, { error: 'Méthode invalide' });
      let decoded;
      try {
        decoded = decodeURIComponent(url.pathname);
      } catch {
        return json(400, { error: 'Chemin invalide' });
      }
      if (
        decoded.includes('\\') ||
        decoded.includes('\0') ||
        decoded.split('/').some((p) => p.startsWith('.') || p === '..')
      )
        return json(404, { error: 'Fichier indisponible' });
      const dist = path.join(root, 'dist'),
        f = path.join(dist, decoded === '/' ? 'index.html' : decoded);
      let real;
      try {
        real = fs.realpathSync(f);
      } catch {
        return json(404, { error: 'Fichier indisponible' });
      }
      if (
        !real.startsWith(fs.realpathSync(dist) + path.sep) ||
        !fs.statSync(real).isFile()
      )
        return json(404, { error: 'Fichier indisponible' });
      const ext = path.extname(real),
        mime =
          {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.mjs': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.wasm': 'application/wasm',
            '.woff2': 'font/woff2',
          }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime + '; charset=utf-8' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(real).pipe(res);
    } catch (e) {
      if (!res.headersSent)
        json(e.message === 'BODY_LIMIT' ? 413 : 400, {
          error: 'Requête invalide',
        });
      else res.end();
    }
  };
  const server =
    env.TLS_CERT && env.TLS_KEY
      ? https.createServer(
          {
            cert: fs.readFileSync(env.TLS_CERT),
            key: fs.readFileSync(env.TLS_KEY),
          },
          listener,
        )
      : http.createServer(listener);
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return { server, store, collector, config };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const app = createApplicationServer();
  app.server.listen(app.config.port, app.config.host, () => {
    console.log(
      JSON.stringify({
        event: 'started',
        version: '0.4.0',
        revision: deployedRevision(),
      }),
    );
    app.collector.start();
  });
  for (const sig of ['SIGTERM', 'SIGINT'])
    process.on(sig, () => {
      app.collector.stop();
      app.server.close(() => {
        app.store.close();
        process.exit(0);
      });
    });
}
