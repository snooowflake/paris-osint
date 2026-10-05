import fs from 'node:fs';
import { Store } from '../server/paris/storage.mjs';
import { user } from '../server/paris/auth.mjs';
const [login, role = 'admin'] = process.argv.slice(2);
if (!login) {
  console.error(
    'Usage : node scripts/create-paris-user.mjs <identifiant> [admin|reader], mot de passe via entrée standard',
  );
  process.exit(2);
}
if (process.stdin.isTTY) {
  console.error(
    'Fournir le mot de passe par une entrée standard protégée, sans argument de commande.',
  );
  process.exit(2);
}
const password = fs.readFileSync(0, 'utf8').replace(/\r?\n$/, '');
const store = new Store();
try {
  user(store, login, password, role);
  console.log('Compte créé, rôle : ' + role);
} finally {
  store.close();
}
