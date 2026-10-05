#!/bin/sh
set -eu
[ "$(id -u)" -ne 0 ] || { echo 'Exécuter la préparation sous le compte applicatif.' >&2; exit 1; }
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd -P)
cd "$project_dir"
[ -z "$(git status --porcelain)" ] || { echo 'Travail non commité présent ; arrêt.' >&2; exit 1; }
[ "$#" -eq 1 ] || { echo 'Usage : prepare-release.sh <commit-ou-ref-vérifié>' >&2; exit 1; }
case "$1" in -*|'') exit 2;; esac
revision=$(git rev-parse --verify "$1^{commit}")
previous=$(git rev-parse HEAD)
exec 9>var/update.lock
flock -n 9 || { echo 'Une préparation est déjà en cours.' >&2; exit 1; }
export PATH="$project_dir/var/runtime/node-v24.19.0-linux-x64/bin:$PATH"
export NPM_CONFIG_CACHE="$project_dir/var/npm-cache"
node deployment/backup.mjs
git checkout --detach "$revision"
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
printf '{"revision":"%s","previous":"%s"}\n' "$revision" "$previous" > var/deployed-version.json
echo 'Préparation terminée. Redémarrer uniquement le service applicatif avec les droits déjà autorisés, puis contrôler santé, authentification et carte.'
