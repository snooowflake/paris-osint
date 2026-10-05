import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url))),
  dir = path.join(root, 'var/backups');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, '-'),
  file = path.join(dir, 'backup-' + stamp + '.sqlite');
const db = new DatabaseSync(path.join(root, 'var/paris.sqlite'), {
  readOnly: true,
});
try {
  db.exec("VACUUM INTO '" + file.replaceAll("'", "''") + "'");
} finally {
  db.close();
}
fs.chmodSync(file, 0o600);
if (fs.existsSync(path.join(root, '.env')))
  fs.copyFileSync(path.join(root, '.env'), file + '.env');
if (fs.existsSync(file + '.env')) fs.chmodSync(file + '.env', 0o600);
fs.writeFileSync(
  file + '.json',
  JSON.stringify({
    application: 'Paris OSINT',
    createdAt: new Date().toISOString(),
    versionFile: fs.existsSync(path.join(root, 'var/deployed-version.json'))
      ? JSON.parse(
          fs.readFileSync(path.join(root, 'var/deployed-version.json')),
        )
      : null,
  }) + '\n',
  { mode: 0o600 },
);
console.log('Sauvegarde cohérente créée dans var/backups ; secrets privés.');
