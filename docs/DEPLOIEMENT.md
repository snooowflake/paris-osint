# Installation et exploitation sur une machine désignée

Ce document public utilise des paramètres génériques. Les IP, noms de machines, chemins réels, unités installées et preuves d’exploitation appartiennent au rapport privé dans var/ops-private/. L’application s’exécute sans poste utilisateur, Codex, assistant ou orchestrateur.

## Reconnaissance et installation

1. En lecture seule, vérifier identité de la machine explicitement désignée, compte SSH existant, système, ressources, instructions locales, services/ports, VPN, reverse proxy et vraie racine projets. Ne pas déduire le rôle d’une IP. Préserver le travail non commité.
2. Choisir un seul `PROJECT_DIR=<racine-confirmée>/paris-osint` et un compte applicatif existant `APP_USER`. Créer ce seul dossier avec droits restreints si absent ; cloner le fork vérifié, configurer upstream et une branche dédiée. Ne pas installer sur le poste de contrôle.
3. Node 24.19.0 x64 Linux est utilisé ici. Télécharger l’archive depuis nodejs.org/dist/v24.19.0, vérifier son SHA256 avec SHASUMS256.txt publié par Node, puis extraire uniquement dans `PROJECT_DIR/var/runtime/`. Conserver la preuve du hash et retirer l’archive. Sur une autre architecture, vérifier l’archive correspondante. Aucune mise à niveau globale.
4. Sous le compte applicatif : ajouter le bin du runtime au PATH, définir NPM_CONFIG_CACHE dans var/npm-cache, puis `npm ci --ignore-scripts --no-audit --no-fund`, `npm run build`, `npm test`. Conserver les journaux bornés dans var/.
5. Créer .env depuis l’exemple, droits 0600. Choisir une adresse interne confirmée et un port libre, APP_ORIGIN exacte, VPN_ONLY et les seuls CIDR existants autorisés. HTTP est accepté uniquement pour cet accès privé/VPN explicitement borné. Pour une origine publique, HTTPS est obligatoire.
6. Créer explicitement le premier administrateur depuis la CLI sous le compte applicatif ; aucun identifiant ou mot de passe par défaut. Fournir le mot de passe via stdin protégée, pas dans les arguments, Git ou les journaux. Exemple interactif : `read -r -s APP_PASSWORD`, puis `printf '%s' "$APP_PASSWORD" | node scripts/create-paris-user.mjs identifiant admin`, puis `unset APP_PASSWORD`. Les comptes supplémentaires nécessitent une décision explicite de l’administrateur.
7. Rendre le modèle deployment/paris-osint.service.in avec PROJECT_DIR et APP_USER confirmés ; vérifier avec systemd-analyze verify. Installer uniquement cette unité et sa configuration de journal dédiée, puis daemon-reload et enable --now de ce seul service. Aucun compte OS, règle SSH, pare-feu ou routage ne doit être créé par ces étapes.
8. Vérifier santé réelle, connexion, API datées, schéma/région, carte, puis restart du seul service et seconde vérification. Enregistrer le commit dans var/deployed-version.json. Ne pas redémarrer la VM.

Les répertoires var/ sont privés, ignorés par Git. Base SQLite, clés, configuration, données, runtime et dépendances restent dans le projet. Seules l’unité systemd et la configuration journald dédiée sont hors projet.

## Accès web et reverse proxy

Débuter sur le VPN. Aucun domaine n’est choisi automatiquement, aucun routeur public ajouté à la VM. Le modèle deployment/vps-nginx.conf.example prépare l’entrée **sur le VPS Nginx existant**, vers l’adresse interne via le VPN, avec certificats et domaine autorisés. Ne l’appliquer qu’après vérification des accès et de la topologie, sans modifier les autres sites. Ne jamais contourner pfSense ou ouvrir généralement le pare-feu.

Vite dev/preview n’est pas le serveur de production. Le service Node sert le build et les API. Les sessions sont HttpOnly et SameSite=Strict ; Secure sous HTTPS. Origin et CSRF sont vérifiés. Le service refuse le démarrage distant HTTP si les CIDR privés/VPN ne sont pas explicitement configurés. Aucun trust-proxy arbitraire ni clé exposée dans les pages distantes.

## Collectes, coûts et rétention

config/paris-sources.json contient les plafonds locaux et cadences. Confirmer le quota effectif du compte avant activation d’une clé. La réserve de 20 % n’autorise jamais à dépasser un quota fournisseur plus faible. PRIM (`PRIM_API_KEY`) : info trafic par requête globale toutes les 5 minutes, soit 288 appels/jour pour toutes les lignes, marge sur 1 000/jour ; prochains passages uniquement à l’ouverture d’une fiche d’arrêt parisien, cache partagé 45 s par arrêt, plafond local 5 000/jour. TomTom (`TOMTOM_API_KEY`) : trafic en direct par tuiles servies via `/api/traffic-tiles/` (zoom 11 à 18, emprise de Paris, cache serveur 2 min, plafond local 7 500 tuiles/jour dont 20 % de réserve, contrôle d’une tuile toutes les 10 min) ; incidents v5 avec la même clé. Vérifier le quota de tuiles du compte TomTom et ajuster `dailyBudget` si besoin. Airparif : produit, droits de cache, coûts et quota du compte à confirmer. Après ajout d’une clé dans .env, redémarrer uniquement ce service.

Aucun bouton utilisateur ne force une collecte anticipée. Un seul collecteur partagé, reprise avec temporisation, erreurs isolées. La collecte récente et la date d’observation sont distinctes. Les tableaux peuvent légitimement être vides ou anciens. Pas de notifications externes ni d’IA cloud payante.

Rétention des révisions : au plus 14 jours depuis acquisition, zéro pour Vélib’, capteurs J-1, éléments orbitaux, images, tuiles de trafic, PRIM et fournisseurs à droits non confirmés. Les archives des sources retirées (aéronefs, séismes, Vigicrues, Belib’) ne sont plus servies et disparaissent à l’échéance de leur rétention. Plafond global 50 000 révisions ; purge au cycle serveur. Pas de conservation automatique de flux vidéo, audio ou fichiers d’imagerie.

## Sauvegarde, mise à jour et retour arrière

Sous le compte applicatif, `node deployment/backup.mjs` produit une copie SQLite cohérente via VACUUM INTO dans var/backups, accompagnée de la configuration privée et du manifeste. Répertoire 0700, fichiers 0600. Ces fichiers contiennent des secrets ; ne jamais les pousser. Garder la sauvegarde nécessaire à la dernière intervention et appliquer la rétention privée décidée pour la machine. Aucun script ne efface automatiquement une sauvegarde sans contrôle de sa récupération.

Mise à jour : vérifier un arbre Git propre, fetch du seul fork, lire le diff, sauvegarder puis sélectionner le commit exact sans reset/force. Le script prepare-release.sh applique ces étapes sous le compte applicatif, installe uniquement les dépendances locales, construit et teste. Prévoir une courte fenêtre de maintenance interne pendant la reconstruction du build. En cas d’échec il s’arrête ; ne pas relancer le service avec un build invalide. Revenir au commit précédent conservé dans le manifeste et reconstruire.

Après tests réussis, redémarrer uniquement paris-osint avec les droits déjà disponibles, contrôler healthz, connexion, Sources et carte. Un HTTP 200 seul ne valide pas une source. Conserver les deux derniers commits et une sauvegarde exploitable ; ne pas réécrire l’historique.

Retour arrière : sélectionner le commit précédent avec `git checkout --detach <commit>`, réinstaller depuis son lockfile sous le compte applicatif, reconstruire/tester et rétablir le manifeste de version, puis redémarrer ce seul service. Ne restaurer une base qu’en cas de nécessité et avec le service arrêté : préserver l’état actuel, vérifier la sauvegarde et les permissions, restaurer uniquement les fichiers de ce projet. Aucun nettoyage global ou redémarrage machine.

## Journaux et diagnostics

Journald dédié : plafond disque 50 Mo, mémoire 20 Mo, fichiers 10 Mo, rétention sept jours et limitation 40 messages/30 s. Le serveur journalise le démarrage et la version, jamais une clé ou URL contenant une clé. `journalctl --namespace=paris-osint -u paris-osint` ne doit servir qu’au diagnostic de ce projet.

`npm run diagnostic:sources` examine les réponses dues et le cache partagé, écrit des preuves expurgées (deux échantillons maximum) et retourne une erreur pour les collectes en panne. Il ne contourne pas quotas/cadences. `npm run docs:sources` met à jour la matrice depuis le registre. Ne publier ni exports privés, captures authentifiées, inventaire réseau ni rapports d’exploitation.
