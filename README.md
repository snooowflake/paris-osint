# Paris OSINT

Carte Cesium 3D de Paris et signaux publics actuels, avec une interface française : **Carte, Situation, Historique, Sources, Réglages**.

Fork de [God’s Eye View](https://github.com/bilawalsidhu/gods-eye-view) par Bilawal Sidhu, à partir du commit `e1cc7afacfd0e431d42d66f3b93c1f98c3e8a76d`. Le moteur et les modules pertinents sont conservés. [Crédits et filiation](docs/PARIS-UPSTREAM.md), [README amont](docs/README-UPSTREAM.md), licence MIT du code dans LICENSE ; licences des données distinctes.

## Données réellement connectées

Les preuves expurgées et datées sont dans [le registre généré](docs/SOURCES.md) et docs/evidence/. Le registre unique `config/paris-sources.json` pilote l’application.

### Circulation

- **Trafic en direct (TomTom)** : tronçons colorés du vert (fluide) au rouge foncé (bloqué) selon la vitesse mesurée comparée à la vitesse libre, comme sur un plan grand public. Tuiles servies par un proxy serveur à chemin fixe, bornées à Paris, cache partagé de 2 minutes et plafond quotidien ; la clé `TOMTOM_API_KEY` reste côté serveur.
- **Trafic mesuré la veille (capteurs PC Lutèce, J-1)** : sans clé, même code couleur sur les tronçons équipés de boucles, à la même heure la veille. Clairement libellé « pas du direct ». Une seule des deux couches de trafic est affichée à la fois.
- **Fermetures et événements de voirie (PC Lutèce)** : publication annoncée toutes les cinq minutes au format Waze CIFS ; voies fermées en tirets rouges et blancs, chantiers et incidents avec pictogrammes, sens et période.
- **Travaux perturbants** : niveau officiel (très perturbant / perturbant), statut, période, objet, impact et maître d’ouvrage ; publication hebdomadaire non exhaustive, aucun badge « direct ».
- Incidents TomTom v5 : préparés avec la même clé.

### Transports en commun

- **Métro, RER, tram et train** : tracés IDFM aux couleurs officielles, pastilles de ligne ; référence cartographique, sans position de rame.
- **Stations et arrêts** (métro, RER, tram, bus) : référentiel IDFM ; lignes desservies par arrêt (jeu IDFM « arrets-lignes »).
- **État du trafic** par ligne (requête globale PRIM, toutes les lignes en un appel toutes les 5 min) et **prochains passages** à l’ouverture d’une fiche d’arrêt (SIRI Lite, cache 45 s par arrêt). Nécessitent `PRIM_API_KEY` (compte gratuit IDFM) ; aucune position GPS de véhicule.

### Autres signaux

- Vélib’ : GBFS opérateur, vélos mécaniques/électriques et bornettes ; repli Paris Data dédupliqué.
- Hub’Eau : stations officielles de Paris, hauteurs selon le référentiel de chaque station et débits ; unités converties et provenance conservée.
- Météo-France : vigilance département 75 J/J1 via republication ouverte IDF, sans prétendue mesure de rue.
- CelesTrak : passages calculés par SGP4, éléments orbitaux datés ; aucune observation optique.
- Sentinel-2 : catalogue STAC des trois derniers jours, empreintes uniquement ; pas d’images téléchargées ni de vidéo.
- Que Faire à Paris ? : événements programmés.

Aéronefs, séismes, Vigicrues et Belib’ ont été retirés. Airparif, TomTom et PRIM sont implémentés mais **sans réponse réelle testée faute de clés autorisées** ; les capteurs J-1 et le jeu « arrets-lignes » sont implémentés sans clé et attendent leur première collecte réelle sur la machine de déploiement. Aucun flux indisponible n’est remplacé par une simulation.

L’état peut devenir « données anciennes », « panne » ou « vide légitime » après un test réussi. Une collecte récente ne rajeunit jamais l’observation. Les coûts associés aux clés dépendent du compte du producteur ; aucun service payant n’est souscrit automatiquement.

## Périmètre et utilisation

Limites officielles de Paris et des 20 arrondissements, incluant ses bois. Filtrage et découpe de géométries côté serveur et carte. Recherche IGN/BAN géofiltrée, favoris, annotations et vues bornés à Paris.

La carte s’ouvre en vue de dessus, comme un plan : rendu à la densité réelle de l’écran, tuiles choisies à environ un texel par pixel, sans brume ni atmosphère, voile léger hors de Paris. Fonds : Plan IGN atténué (par défaut, la circulation y ressort mieux), Plan IGN, photographies aériennes IGN et OpenStreetMap, sans clé Google/Cesium. Boutons de zoom, boussole, vue inclinée 3D et légende dynamique. Fonds d’orthophotographie = références datées, jamais une observation en direct. Simulations, effets tactiques, audio et IA sont désactivés. Les effets graphiques facultatifs sont étiquetés.

Les données synthétiques des tests n’entrent jamais dans le stockage réel. Aucune caméra privée, reconnaissance faciale, lecture de plaque ou trajectoire individuelle de vélo. Le logiciel ne prétend pas mesurer les foules ou identifier une panne de télécommunication à une adresse.

## Architecture et sécurité

JavaScript natif et Cesium amont, build Vite, serveur de production Node, SQLite local. Collecteur serveur partagé, trois collectes simultanées maximum, pagination complète, limite de réponse 12 Mo, délais, reprise et réserve de quota de 20 %. Le bouton Actualiser relit le cache et ne déclenche pas une collecte fournisseur anticipée.

Authentification obligatoire, comptes créés explicitement par l’administrateur, mots de passe scrypt, sessions de huit heures, cookies HttpOnly/SameSite et Secure sous HTTPS, vérification Origin et CSRF. Rôle reader séparé du rôle admin. Secrets serveur dans .env ou fichiers privés, jamais renvoyés au navigateur. Aucun proxy URL arbitraire. API fournisseur, export et import valident tailles, dates et coordonnées.

Temps stockés en UTC, affichés en Europe/Paris avec changement d’heure. Historique réellement acquis seulement, rétention par source (0 à 14 jours), maximum global 50 000 révisions. Les annotations et préférences restent par utilisateur. Les exports actuels Paris sont autorisés seulement pour les sources compatibles.

## Installation distante, tests et exploitation

Le poste utilisateur n’est pas requis pour exécuter l’application. Installer **dans la racine projets vérifiée de la machine désignée**, sous le compte applicatif existant. Ne pas installer sur un poste Windows pour une mission de déploiement distant.

Voir [installation et exploitation](docs/DEPLOIEMENT.md), [tests et limites](docs/VALIDATION.md), [.env.example](.env.example) et les modèles deployment/. Node **24.19.0** est utilisé dans le runtime isolé, sans modification globale. Les unités systemd et paramètres réseau réels sont consignés uniquement dans le rapport privé de l’installation.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm test
npm run test:paris
npm run diagnostic:sources
npm run docs:sources
```

Le diagnostic respecte le cache, les délais et quotas partagés. Sans clé, aucun appel au fournisseur protégé. `npm start` lance le serveur de production ; ne pas exposer Vite dev/preview.

Commencer par un accès interne/VPN authentifié. Aucun domaine n’est inventé. Si une entrée publique est autorisée ensuite, réutiliser exclusivement le VPS Nginx et le VPN existants, avec TLS ; le modèle Nginx fourni ne doit pas être appliqué à l’aveugle.

Les fournisseurs externes et les serveurs de tuiles restent nécessaires. Ce projet ne fonctionne pas hors ligne avec des données actuelles.
