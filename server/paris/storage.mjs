import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export class Store {
  constructor(file = 'var/paris.sqlite') {
    if (file !== ':memory:') {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    }
    this.db = new DatabaseSync(file);
    this.db.exec(
      `PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS users(login TEXT PRIMARY KEY,hash TEXT NOT NULL,role TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,login TEXT,csrf TEXT,expires INTEGER); CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE IF NOT EXISTS budgets(provider TEXT,day TEXT,n INTEGER,PRIMARY KEY(provider,day)); CREATE TABLE IF NOT EXISTS history(source TEXT,id TEXT,revision TEXT,firstSeen TEXT,lastSeen TEXT,expires INTEGER,feature TEXT,PRIMARY KEY(source,id,revision));`,
    );
    this.db.exec(
      'CREATE TABLE IF NOT EXISTS collection_leases(id TEXT PRIMARY KEY,owner TEXT NOT NULL,expires INTEGER NOT NULL)',
    );
    if (file !== ':memory:') fs.chmodSync(file, 0o600);
  }
  get(k) {
    const r = this.db.prepare('SELECT value FROM kv WHERE key=?').get(k);
    return r ? JSON.parse(r.value) : null;
  }
  set(k, v) {
    this.db
      .prepare(
        'INSERT INTO kv VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
      )
      .run(k, JSON.stringify(v));
  }
  acquireCollection(id, owner, now = Date.now()) {
    return !!this.db
      .prepare(
        'INSERT INTO collection_leases VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE collection_leases.expires<=?',
      )
      .run(id, owner, now + 130000, now).changes;
  }
  releaseCollection(id, owner) {
    this.db
      .prepare('DELETE FROM collection_leases WHERE id=? AND owner=?')
      .run(id, owner);
  }
  reserve(provider, budget, now = Date.now()) {
    const day = new Date(now).toISOString().slice(0, 10);
    this.db
      .prepare('INSERT OR IGNORE INTO budgets VALUES(?,?,0)')
      .run(provider, day);
    return !!this.db
      .prepare('UPDATE budgets SET n=n+1 WHERE provider=? AND day=? AND n<?')
      .run(provider, day, Math.floor(budget * 0.8)).changes;
  }
  used(p) {
    return (
      this.db
        .prepare('SELECT n FROM budgets WHERE provider=? AND day=?')
        .get(p, new Date().toISOString().slice(0, 10))?.n || 0
    );
  }
  archive(s, features, now = Date.now()) {
    if (!s.retentionDays) return;
    const stmt = this.db.prepare(
      'INSERT INTO history VALUES(?,?,?,?,?,?,?) ON CONFLICT(source,id,revision) DO UPDATE SET lastSeen=excluded.lastSeen',
    );
    for (const f of features) {
      const text = JSON.stringify(f);
      const p = { ...f.properties };
      delete p.collectedAt;
      if (s.nature === 'event') delete p.publishedAt;
      const rev = createHash('sha256')
        .update(JSON.stringify({ ...f, properties: p }))
        .digest('hex');
      stmt.run(
        s.id,
        String(f.id),
        rev,
        new Date(now).toISOString(),
        new Date(now).toISOString(),
        now + s.retentionDays * 864e5,
        text,
      );
    }
    this.purge(now);
  }
  purge(now = Date.now()) {
    this.db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
    this.db.prepare('DELETE FROM history WHERE expires<?').run(now);
    this.db
      .prepare('DELETE FROM budgets WHERE day<?')
      .run(new Date(now - 3 * 864e5).toISOString().slice(0, 10));
    this.db.exec(
      'DELETE FROM history WHERE rowid IN (SELECT rowid FROM history ORDER BY lastSeen DESC LIMIT -1 OFFSET 50000)',
    );
  }
  close() {
    this.db.close();
  }
}
