# Paris OSINT

Carte Cesium 3D de Paris et signaux publics actuels, avec une interface française : **Carte, Situation, Historique, Sources, Réglages**.

Fork de [God’s Eye View](https://github.com/bilawalsidhu/gods-eye-view) par Bilawal Sidhu, à partir du commit `e1cc7afacfd0e431d42d66f3b93c1f98c3e8a76d`. Le moteur et les modules pertinents sont conservés. [Crédits et filiation](docs/PARIS-UPSTREAM.md), [README amont](docs/README-UPSTREAM.md), licence MIT du code dans LICENSE ; licences des données distinctes.

## Données réellement connectées

Les preuves expurgées et datées sont dans [le registre généré](docs/SOURCES.md) et docs/evidence/. Le registre unique `config/paris-sources.json` pilote l’application.

- Circulation PC Lutèce : publication annoncée toutes les cinq minutes.
- Travaux en cours : publication hebdomadaire non exhaustive, aucun badge « direct ».
- Vélib’ : GBFS opérateur, vélos mécaniques/électriques et bornettes ; repli Paris Data dédupliqué.
- Belib’ : disponibilité horodatée de chaque point de recharge. Les points anciens sont écartés.
- Hub’Eau : stations officielles de Paris, hauteurs selon le référentiel de chaque station et débits ; unités converties et provenance conservée.
- Vigicrues : niveau officiel du tronçon Seine à Paris ; géométrie visible limitée à Paris.
- Météo-France : vigilance département 75 J/J1 via republication ouverte IDF, sans prétendue mesure de rue.
- adsb.lol : aéronefs effectivement reçus dans Paris, y compris classification militaire du producteur, couverture partielle.
- CelesTrak : passages calculés par SGP4, éléments orbitaux datés ; aucune observation optique.
- Sentinel-2 : catalogue STAC des trois derniers jours, acquisition, résolution et nuages de la scène. Empreintes uniquement dans cette version ; pas d’images téléchargées ni de vidéo.
- USGS : événements sismiques récents filtrés Paris, souvent vide légitime, couche secondaire.
- IDFM : référentiels d’arrêts et de tracés pour localisation/recherche/jointures, clairement distincts d’observations.

Airparif, incidents TomTom v5 et messages PRIM sont préparés mais **sans réponse réelle testée faute de clés autorisées**. Les passages IDFM, vitesses TomTom, radar météo, AIS, webcams, FIRMS et autres cibles restent explicitement non intégrés, bloqués ou non retenus dans Sources. Aucun flux indisponible n’est remplacé par une simulation.

L’état peut devenir « données anciennes », « panne » ou « vide légitime » après un test réussi. Une collecte récente ne rajeunit jamais l’observation. Les coûts associés aux clés dépendent du compte du producteur ; aucun service payant n’est souscrit automatiquement.

## Périmètre et utilisation

Limites officielles de Paris et des 20 arrondissements, incluant ses bois. Filtrage et découpe de géométries côté serveur et carte. Recherche IGN/BAN géofiltrée, favoris, annotations et vues bornés à Paris. L’option **Contexte des aéroports parisiens**, désactivée par défaut, étend uniquement l’aviation à un rectangle borné couvrant CDG, Orly et Le Bourget.

OSM et IGN/Géoplateforme permettent une carte sans clé Google/Cesium photoréaliste. Le globe est en 3D ; la 3D photoréaliste des bâtiments n’est pas activée. Fonds d’orthophotographie = références datées, jamais une observation en direct. Simulations, effets tactiques, audio et IA sont désactivés. Les effets graphiques facultatifs sont étiquetés.

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
