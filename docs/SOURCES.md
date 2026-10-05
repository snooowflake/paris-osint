# Registre des sources

Généré depuis config/paris-sources.json, également utilisé par le serveur et l’interface. npm run docs:sources met à jour ce document. Les candidats désactivés ne sont pas comptés comme connecteurs opérationnels.

Les états disponibles, vides, anciens, quota, authentification, panne et désactivés évoluent dans l’application. La preuve ci-dessous atteste un test daté, pas une disponibilité permanente.

| Source | Intégration | Preuve réelle UTC | Couverture / motif |
| --- | --- | --- | --- |
| Circulation — PC Lutèce | Opérationnelle vérifiée | 2026-10-05T02:53:18.251Z | Publication annoncée toutes les cinq minutes. Événements datés, sans voitures simulées. |
| Travaux en cours | Opérationnelle vérifiée | 2026-10-05T00:54:31.856Z | Publication hebdomadaire non exhaustive ; aucune indication de direct. |
| Recharge Belib’ — état publié | Opérationnelle vérifiée | 2026-10-05T02:56:20.025Z | Horodatage par point. Une capacité statique n'est pas une disponibilité. |
| Que Faire à Paris ? | Opérationnelle vérifiée | 2026-10-05T02:55:24.611Z | Périodes programmées ; ne prouve ni ouverture à cette heure ni foule. |
| Vélib’ — vélos et bornettes | Opérationnelle vérifiée | 2026-10-05T02:55:18.096Z | TTL opérateur respecté, déduplication StationCode. Repli Paris Data partagé une heure. |
| Seine — hauteurs et débits | Opérationnelle vérifiée | 2026-10-05T02:54:18.829Z | Stations en service du référentiel Paris. H : mm convertis en m, référentiel de chaque station conservé ; inconnu si absent, sans conversion NGF. Q : L/s convertis en m³/s. Qualification et commentaire du producteur conservés. |
| Vigicrues — Seine à Paris | Opérationnelle vérifiée | 2026-10-05T02:57:18.414Z | Niveau officiel de tout le tronçon Seine à Paris, sans alerte locale inventée. |
| Vigilance météo — département 75 | Opérationnelle vérifiée | 2026-10-05T02:57:18.694Z | Republication ouverte du bulletin départemental J/J1 ; aucun capteur de rue ni radar. |
| Aéronefs reçus — adsb.lol | Opérationnelle vérifiée | 2026-10-05T02:57:18.100Z | Couverture partielle. Paris strict par défaut ; contexte aéroports optatif borné, sans extension des autres couches. |
| Passages de satellites calculés | Opérationnelle vérifiée | 2026-10-05T00:54:35.932Z | SGP4 à Paris, âge des éléments affiché. Prévision de passage, aucune observation optique ou vidéo. |
| Sentinel-2 — acquisitions récentes | Opérationnelle vérifiée | 2026-10-05T00:54:35.708Z | Catalogue STAC des trois derniers jours : acquisition, résolution du produit, nuages de la scène. Empreinte uniquement, pas vidéo. |
| Séismes récents dans Paris | Opérationnelle vérifiée | 2026-10-05T02:56:18.238Z | Couche secondaire : résultat vide légitime. Profondeur en kilomètres séparée de la géométrie. |
| Airparif — prévisions communales | Implémentée, clé manquante | Non testée en réel | 20 arrondissements officiels ; prévisions aujourd’hui/demain. Une requête groupée par cycle journalier. Quota du compte à confirmer avec la clé autorisée. |
| TomTom — incidents | Implémentée, clé manquante | Non testée en réel | Incident Details v5 préparé ; Flow v4 amont conservé, migration de vitesses non testée. Simulations désactivées. |
| IDFM — référentiel des arrêts | Opérationnelle vérifiée | 2026-10-05T01:20:28.543Z | Référence pour localisation et jointures ; aucune observation actuelle, aucun véhicule GPS. |
| IDFM — tracés ferroviaires | Opérationnelle vérifiée | 2026-10-05T01:20:25.389Z | Référence pour localisation et jointures ; aucune observation actuelle, aucun véhicule GPS. |
| IDFM / PRIM — messages trafic | Implémentée, clé manquante | Non testée en réel | Connecteur compilé et testé avec réponses synthétiques identifiées. Pas de réponse réelle sans clé. Cinq lignes à 15 min représentent au plus 480 appels/jour ; aucun GPS des véhicules. |
| Comptages routiers J-1 | Non retenue | Non testée en réel | Publié en J-1. Non retenu dans les signaux actuels demandés ; une intégration historique distincte resterait nécessaire. |
| Comptages vélo et multimodaux | Non retenue | Non testée en réel | API officielle examinée : dernière publication du catalogue le 4 octobre 2026 à 05:15 UTC. Agrégats différés ; aucune trajectoire individuelle ni trafic instantané. |
| Parkings SAEMES — disponibilité | Sans couverture vérifiée | Non testée en réel | Catalogue officiel testé (19 jeux). Aucun flux public de places libres vérifié dans ce catalogue. Les capacités et horaires statiques ne sont pas présentés comme une disponibilité actuelle. |
| IRVE et stationnement — autres opérateurs | À développer | Non testée en réel | Belib’ est connecté séparément. Autres catalogues statiques non retenus comme état actuel ; disponibilités dynamiques autres opérateurs non vérifiées. |
| Sytadin / DiRIF | Accès ou licence à clarifier | Non testée en réel | Réutilisation structurée soumise à accord DiRIF / Bison Futé. Aucun accord fourni, aucun prélèvement d’images du site. |
| IDFM — prochains passages et annulations | À développer | Non testée en réel | Jeton et points d’arrêt autorisés manquants. Référentiels connectés, messages SIRI préparés séparément ; passages et horaires théoriques ne sont pas encore intégrés. |
| TomTom — vitesses et congestion | À développer | Non testée en réel | Connecteur Flow v4 amont conservé mais non activé ni vérifié avec une clé. Les incidents v5 préparés sont une intégration distincte. Aucun véhicule simulé. |
| Météo-France — observations, radar et pluie | À développer | Non testée en réel | Authentification et produits autorisés non fournis. Seule la vigilance départementale ouverte est actuellement connectée. Radar et foudre américains écartés. |
| Prévisions météorologiques globales | À développer | Non testée en réel | Modèles amont conservés dans le code. Aucun modèle Paris actuel testé dans cette interface ; pas de prévision inventée ni d’appel payant. |
| Géorisques — contexte statique | Non retenue | Non testée en réel | Risques géographiques statiques utiles en contexte, exclus des signaux actuels demandés. Aucun risque local présenté comme un incident en cours. |
| Bruitparif | Accès ou licence à clarifier | Non testée en réel | Aucun service de mesures actuelles avec droits et granularité vérifiés pour cette installation. Cartes modélisées distinctes de capteurs. |
| Indices polliniques officiels | À développer | Non testée en réel | Diffusion API à clé et autorisation à confirmer. Aucun formulaire soumis au nom de l’utilisateur, aucune estimation à une adresse. |
| OpenSky — fournisseur alternatif | Accès ou licence à clarifier | Non testée en réel | adsb.lol est le fournisseur testé. OpenSky n’est pas interrogé en doublon ; droits pour usage professionnel et quotas à confirmer. |
| 3D photoréaliste — Google / Cesium | À développer | Non testée en réel | Module amont conservé, non activé. Clé, origines autorisées, facturation et plafond non fournis. Le globe Cesium et les fonds OSM/IGN restent utilisables sans lui. |
| NASA GIBS / HLS — imagerie supplémentaire | À développer | Non testée en réel | Acquisitions Sentinel récentes vérifiées séparément. GIBS/HLS non intégré dans cette version ; pas de vidéo en direct ni d’archive immense. |
| AISStream — couverture de la Seine | À développer | Non testée en réel | Clé absente et couverture parisienne non testée. Aucune observation de bateau simulée, aucune couverture exhaustive annoncée. |
| VNF — informations de navigation | Accès ou licence à clarifier | Non testée en réel | Service officiel identifié. Flux structuré réutilisable et conditions non confirmés ; lien officiel seulement, aucun scraping de documents ou d’images. |
| NASA FIRMS | À développer | Non testée en réel | Clé absente. Détection thermique satellitaire ponctuelle, couverture d’incendies urbains non exhaustive ; pas de faux signalement. |
| Radios publiques géolocalisées | Accès ou licence à clarifier | Non testée en réel | Flux parisien et autorisation de diffusion individuellement non vérifiés ; lecture volontaire seulement. Aucun audio lancé. |
| ANFR — antennes et mesures | Non retenue | Non testée en réel | Données de publication et d’infrastructure, non activité actuelle des téléphones. Non retenues dans le périmètre de signaux actuels. |
| ARCEP — télécommunications | Non retenue | Non testée en réel | Références de couverture statiques ; aucune panne ou activité en direct à une adresse ne peut en être déduite. |
| RTE / énergie | Accès ou licence à clarifier | Non testée en réel | Accès API et granularité parisienne non vérifiés. Indicateurs nationaux/régionaux ne deviennent pas des mesures dans une rue. |
| Équipements, lieux frais, APUR | Non retenue | Non testée en réel | Catalogues statiques utiles comme références ; exclus des signaux actuels. Leur présence ne prouve pas l’ouverture aujourd’hui. |
| Webcams et caméras autorisées | Sans couverture vérifiée | Non testée en réel | Aucune webcam parisienne avec flux disponible et autorisation d’intégration vérifiés individuellement. Pas de police, RATP, ALPR, scan d’Internet ni substitution par Street View. |

## Circulation — PC Lutèce

- Identifiant : pc-lutece. Producteur : Ville de Paris.
- Source : https://opendata.paris.fr/explore/dataset/circulation_evenement/. Documentation : https://opendata.paris.fr/explore/dataset/circulation_evenement/.
- Licence : Licence Ouverte (Etalab). Couverture : Paris administratif.
- Nature : event. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 300 / 300 secondes. Limite de fraîcheur : 1800 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Publication annoncée toutes les cinq minutes. Événements datés, sans voitures simulées.
- Preuve expurgée : [2026-10-05T02:53:18.251Z](evidence/pc-lutece.json), état lors du test : available.

## Travaux en cours

- Identifiant : travaux. Producteur : Ville de Paris.
- Source : https://opendata.paris.fr/explore/dataset/chantiers-perturbants/. Documentation : https://opendata.paris.fr/explore/dataset/chantiers-perturbants/.
- Licence : Open Database License (ODbL). Couverture : Paris administratif.
- Nature : event. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 86400 / 86400 secondes. Limite de fraîcheur : 864000 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Publication hebdomadaire non exhaustive ; aucune indication de direct.
- Preuve expurgée : [2026-10-05T00:54:31.856Z](evidence/travaux.json), état lors du test : available.

## Recharge Belib’ — état publié

- Identifiant : belib. Producteur : Ville de Paris / TotalEnergies.
- Source : https://opendata.paris.fr/explore/dataset/belib-points-de-recharge-pour-vehicules-electriques-disponibilite-temps-reel/. Documentation : https://opendata.paris.fr/explore/dataset/belib-points-de-recharge-pour-vehicules-electriques-disponibilite-temps-reel/.
- Licence : Open Database License (ODbL). Couverture : Paris administratif.
- Nature : measurement. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 3600 / 3600 secondes. Limite de fraîcheur : 2700 secondes.
- Rétention : 2 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Horodatage par point. Une capacité statique n'est pas une disponibilité.
- Preuve expurgée : [2026-10-05T02:56:20.025Z](evidence/belib.json), état lors du test : available.

## Que Faire à Paris ?

- Identifiant : agenda. Producteur : Ville de Paris.
- Source : https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/. Documentation : https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/.
- Licence : Open Database License (ODbL). Couverture : Paris administratif.
- Nature : event. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 7200 / 7200 secondes. Limite de fraîcheur : 604800 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Périodes programmées ; ne prouve ni ouverture à cette heure ni foule.
- Preuve expurgée : [2026-10-05T02:55:24.611Z](evidence/agenda.json), état lors du test : available.

## Vélib’ — vélos et bornettes

- Identifiant : velib. Producteur : Smovengo / Vélib Métropole.
- Source : https://www.velib-metropole.fr/fr/donnees-open-data-gbfs-du-service-velib-metropole. Documentation : https://www.velib-metropole.fr/fr/donnees-open-data-gbfs-du-service-velib-metropole.
- Licence : Licence Ouverte Etalab. Couverture : Paris administratif.
- Nature : measurement. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 3600 / 3600 secondes. Limite de fraîcheur : 2700 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. TTL opérateur respecté, déduplication StationCode. Repli Paris Data partagé une heure.
- Preuve expurgée : [2026-10-05T02:55:18.096Z](evidence/velib.json), état lors du test : available.

## Seine — hauteurs et débits

- Identifiant : hubeau. Producteur : OFB / SCHAPI.
- Source : https://hubeau.eaufrance.fr/page/api-hydrometrie. Documentation : https://hubeau.eaufrance.fr/page/api-hydrometrie.
- Licence : Licence Ouverte 2.0. Couverture : Paris administratif.
- Nature : measurement. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 900 / 900 secondes. Limite de fraîcheur : 5400 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Stations en service du référentiel Paris. H : mm convertis en m, référentiel de chaque station conservé ; inconnu si absent, sans conversion NGF. Q : L/s convertis en m³/s. Qualification et commentaire du producteur conservés.
- Preuve expurgée : [2026-10-05T02:54:18.829Z](evidence/hubeau.json), état lors du test : available.

## Vigicrues — Seine à Paris

- Identifiant : vigicrues. Producteur : SCHAPI / Vigicrues.
- Source : https://www.vigicrues.gouv.fr/categorie/2. Documentation : https://www.vigicrues.gouv.fr/categorie/2.
- Licence : Licence Ouverte 2.0. Couverture : Paris administratif.
- Nature : official_alert. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 1800 / 1800 secondes. Limite de fraîcheur : 86400 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Niveau officiel de tout le tronçon Seine à Paris, sans alerte locale inventée.
- Preuve expurgée : [2026-10-05T02:57:18.414Z](evidence/vigicrues.json), état lors du test : available.

## Vigilance météo — département 75

- Identifiant : meteo-vigilance. Producteur : Météo-France / Région Île-de-France.
- Source : https://data.iledefrance.fr/explore/dataset/meteo-vigilance-niveau-departemental-idf/. Documentation : https://data.iledefrance.fr/explore/dataset/meteo-vigilance-niveau-departemental-idf/.
- Licence : Licence Ouverte v2.0 (Etalab). Couverture : Département 75, vigilance J/J1 ; pas de localisation de rue.
- Nature : official_alert. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 1800 / 1800 secondes. Limite de fraîcheur : 86400 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Republication ouverte du bulletin départemental J/J1 ; aucun capteur de rue ni radar.
- Preuve expurgée : [2026-10-05T02:57:18.694Z](evidence/meteo-vigilance.json), état lors du test : available.

## Aéronefs reçus — adsb.lol

- Identifiant : adsb. Producteur : adsb.lol.
- Source : https://www.adsb.lol/docs/. Documentation : https://www.adsb.lol/docs/.
- Licence : ODbL. Couverture : Paris administratif.
- Nature : measurement. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 2000/jour, 20 % réservés.
- Collecte/cache configurés : 60 / 60 secondes. Limite de fraîcheur : 120 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Couverture partielle. Paris strict par défaut ; contexte aéroports optatif borné, sans extension des autres couches.
- Preuve expurgée : [2026-10-05T02:57:18.100Z](evidence/adsb.json), état lors du test : empty.

## Passages de satellites calculés

- Identifiant : satellites. Producteur : CelesTrak.
- Source : https://celestrak.org/NORAD/documentation/gp-data-formats.php. Documentation : https://celestrak.org/NORAD/documentation/gp-data-formats.php.
- Licence : Éléments orbitaux publics CelesTrak ; attribution conservée. Couverture : Paris administratif.
- Nature : computed. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 100/jour, 20 % réservés.
- Collecte/cache configurés : 21600 / 21600 secondes. Limite de fraîcheur : 259200 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. SGP4 à Paris, âge des éléments affiché. Prévision de passage, aucune observation optique ou vidéo.
- Preuve expurgée : [2026-10-05T00:54:35.932Z](evidence/satellites.json), état lors du test : available.

## Sentinel-2 — acquisitions récentes

- Identifiant : sentinel. Producteur : Copernicus / ESA.
- Source : https://documentation.dataspace.copernicus.eu/APIs/STAC.html. Documentation : https://documentation.dataspace.copernicus.eu/APIs/STAC.html.
- Licence : Copernicus Sentinel Data Legal Notice. Couverture : Paris administratif.
- Nature : dated_image. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 200/jour, 20 % réservés.
- Collecte/cache configurés : 21600 / 21600 secondes. Limite de fraîcheur : 259200 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Catalogue STAC des trois derniers jours : acquisition, résolution du produit, nuages de la scène. Empreinte uniquement, pas vidéo.
- Preuve expurgée : [2026-10-05T00:54:35.708Z](evidence/sentinel.json), état lors du test : available.

## Séismes récents dans Paris

- Identifiant : seismes. Producteur : USGS.
- Source : https://earthquake.usgs.gov/fdsnws/event/1/. Documentation : https://earthquake.usgs.gov/fdsnws/event/1/.
- Licence : Domaine public USGS. Couverture : Paris administratif.
- Nature : event. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 3000/jour, 20 % réservés.
- Collecte/cache configurés : 3600 / 3600 secondes. Limite de fraîcheur : 86400 secondes.
- Rétention : 14 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Couche secondaire : résultat vide légitime. Profondeur en kilomètres séparée de la géométrie.
- Preuve expurgée : [2026-10-05T02:56:18.238Z](evidence/seismes.json), état lors du test : empty.

## Airparif — prévisions communales

- Identifiant : airparif. Producteur : Airparif.
- Source : https://api.airparif.asso.fr/openapi.json. Documentation : https://api.airparif.asso.fr/openapi.json.
- Licence : ODbL. Couverture : Paris administratif.
- Nature : forecast. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Secret serveur requis, jamais transmis au navigateur (AIRPARIF_API_KEY).
- Coût : Selon autorisation et abonnement ; aucun achat automatique.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 100/jour, 20 % réservés.
- Collecte/cache configurés : 86400 / 86400 secondes. Limite de fraîcheur : 86400 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Implémentée, clé manquante. 20 arrondissements officiels ; prévisions aujourd’hui/demain. Une requête groupée par cycle journalier. Quota du compte à confirmer avec la clé autorisée.

## TomTom — incidents

- Identifiant : tomtom. Producteur : TomTom.
- Source : https://developer.tomtom.com/traffic-api/documentation/traffic-incidents/incident-details. Documentation : https://developer.tomtom.com/traffic-api/documentation/traffic-incidents/incident-details.
- Licence : Conditions TomTom selon abonnement. Couverture : Paris administratif.
- Nature : event. Schéma : GeoJSON WGS84 ; id, observedAt, publishedAt, collectedAt, validFrom, validTo, provenance, unités et méthode..
- Authentification : Secret serveur requis, jamais transmis au navigateur (TOMTOM_API_KEY).
- Coût : Selon autorisation et abonnement ; aucun achat automatique.
- Quota : Quota fournisseur non précisé. Plafond local partagé ; 20 % de réserve, backoff et HTTP 429 respectés.. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 900 / 900 secondes. Limite de fraîcheur : 1800 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Implémentée, clé manquante. Incident Details v5 préparé ; Flow v4 amont conservé, migration de vitesses non testée. Simulations désactivées.

## IDFM — référentiel des arrêts

- Identifiant : idfm-arrets. Producteur : Île-de-France Mobilités.
- Source : https://data.iledefrance-mobilites.fr/explore/dataset/arrets/. Documentation : https://data.iledefrance-mobilites.fr/api-console/explore/v2.1/.
- Licence : Licence Ouverte v2.0 (Etalab). Couverture : Référentiel limité à Paris, géométries tronquées.
- Nature : reference. Schéma : GeoJSON WGS84 ; identifiants officiels, coordonnées et publication.
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Catalogue ouvert ; plafond local partagé et marge 20 %. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 86400 / 86400 secondes. Limite de fraîcheur : 31536000 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Référence pour localisation et jointures ; aucune observation actuelle, aucun véhicule GPS.
- Preuve expurgée : [2026-10-05T01:20:28.543Z](evidence/idfm-arrets.json), état lors du test : available.

## IDFM — tracés ferroviaires

- Identifiant : idfm-traces. Producteur : Île-de-France Mobilités.
- Source : https://data.iledefrance-mobilites.fr/explore/dataset/traces-du-reseau-ferre-idf/. Documentation : https://data.iledefrance-mobilites.fr/api-console/explore/v2.1/.
- Licence : Licence Ouverte v2.0 (Etalab). Couverture : Référentiel limité à Paris, géométries tronquées.
- Nature : reference. Schéma : GeoJSON WGS84 ; identifiants officiels, coordonnées et publication.
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Catalogue ouvert ; plafond local partagé et marge 20 %. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 86400 / 86400 secondes. Limite de fraîcheur : 31536000 secondes.
- Rétention : 0 jours. Cache courant remplacé à la collecte ; archivage borné selon licence et retentionDays. Pas de flux vidéo ni archive d’images..
- Validation : Types, dates UTC, tailles, pagination, géométries WGS84 et périmètre contrôlés..
- Intégration : Opérationnelle vérifiée. Référence pour localisation et jointures ; aucune observation actuelle, aucun véhicule GPS.
- Preuve expurgée : [2026-10-05T01:20:25.389Z](evidence/idfm-traces.json), état lors du test : available.

## IDFM / PRIM — messages trafic

- Identifiant : prim-messages. Producteur : Île-de-France Mobilités.
- Source : https://prim.iledefrance-mobilites.fr/fr/apis/idfm-ivtr-info_trafic. Documentation : https://prim.iledefrance-mobilites.fr/fr/apis/idfm-ivtr-info_trafic.
- Licence : Licence Mobilité et CGU de l’API. Couverture : Lignes desservant Paris ; segment affecté parfois régional, sans géométrie inventée.
- Nature : event. Schéma : SIRI ServiceDelivery/GeneralMessageDelivery ; messages, LineRef et dates UTC.
- Authentification : Jeton serveur et 1 à 5 PRIM_LINE_IDS vérifiés dans le référentiel parisien (PRIM_API_KEY).
- Coût : Accès selon autorisation PRIM ; aucune dépense engagée.
- Quota : Documentation : 1 000/jour pour certains nouveaux jetons, 20 000 pour anciens jetons. Vérifier le quota réellement attribué avant activation. Plafond local 1 000, réserve 20 %.. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 900 / 900 secondes. Limite de fraîcheur : 7200 secondes.
- Rétention : 0 jours. Cache courant, aucun archivage avant confirmation des droits associés au jeton.
- Validation : Dates explicites, 5 lignes maximum, jointure au référentiel de Paris et taille HTTP limitée.
- Intégration : Implémentée, clé manquante. Connecteur compilé et testé avec réponses synthétiques identifiées. Pas de réponse réelle sans clé. Cinq lignes à 15 min représentent au plus 480 appels/jour ; aucun GPS des véhicules.

## Comptages routiers J-1

- Identifiant : comptages-route. Producteur : Ville de Paris.
- Source : https://opendata.paris.fr/explore/dataset/comptages-routiers-permanents/. Documentation : https://opendata.paris.fr/explore/dataset/comptages-routiers-permanents/.
- Licence : ODbL. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. Publié en J-1. Non retenu dans les signaux actuels demandés ; une intégration historique distincte resterait nécessaire.

## Comptages vélo et multimodaux

- Identifiant : comptages-multimodaux. Producteur : Ville de Paris.
- Source : https://opendata.paris.fr/explore/dataset/comptage-multimodal-comptages/. Documentation : https://opendata.paris.fr/explore/dataset/comptage-multimodal-comptages/.
- Licence : ODbL. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. API officielle examinée : dernière publication du catalogue le 4 octobre 2026 à 05:15 UTC. Agrégats différés ; aucune trajectoire individuelle ni trafic instantané.

## Parkings SAEMES — disponibilité

- Identifiant : parkings-saemes. Producteur : SAEMES.
- Source : https://opendata.saemes.fr/. Documentation : https://opendata.saemes.fr/.
- Licence : Licence selon jeu ; dynamique non vérifiée. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Sans couverture vérifiée. Catalogue officiel testé (19 jeux). Aucun flux public de places libres vérifié dans ce catalogue. Les capacités et horaires statiques ne sont pas présentés comme une disponibilité actuelle.

## IRVE et stationnement — autres opérateurs

- Identifiant : stationnement-irve. Producteur : Producteurs / transport.data.gouv.fr.
- Source : https://transport.data.gouv.fr/datasets?type=charging-stations. Documentation : https://transport.data.gouv.fr/datasets?type=charging-stations.
- Licence : Selon ressource. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Belib’ est connecté séparément. Autres catalogues statiques non retenus comme état actuel ; disponibilités dynamiques autres opérateurs non vérifiées.

## Sytadin / DiRIF

- Identifiant : sytadin. Producteur : DiRIF.
- Source : https://www.sytadin.fr/pratique/faq/partenaire.html. Documentation : https://www.sytadin.fr/pratique/faq/partenaire.html.
- Licence : Accord de réutilisation requis. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. Réutilisation structurée soumise à accord DiRIF / Bison Futé. Aucun accord fourni, aucun prélèvement d’images du site.

## IDFM — prochains passages et annulations

- Identifiant : prim-passages. Producteur : Île-de-France Mobilités.
- Source : https://prim.iledefrance-mobilites.fr/fr/apis. Documentation : https://prim.iledefrance-mobilites.fr/fr/apis.
- Licence : Licence Mobilité. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Jeton et points d’arrêt autorisés manquants. Référentiels connectés, messages SIRI préparés séparément ; passages et horaires théoriques ne sont pas encore intégrés.

## TomTom — vitesses et congestion

- Identifiant : tomtom-flow. Producteur : TomTom.
- Source : https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data. Documentation : https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data.
- Licence : Conditions de l’abonnement. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Connecteur Flow v4 amont conservé mais non activé ni vérifié avec une clé. Les incidents v5 préparés sont une intégration distincte. Aucun véhicule simulé.

## Météo-France — observations, radar et pluie

- Identifiant : meteo-observations. Producteur : Météo-France.
- Source : https://portail-api.meteofrance.fr/. Documentation : https://portail-api.meteofrance.fr/.
- Licence : Selon produit et CGU. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Authentification et produits autorisés non fournis. Seule la vigilance départementale ouverte est actuellement connectée. Radar et foudre américains écartés.

## Prévisions météorologiques globales

- Identifiant : meteo-modeles. Producteur : Fournisseurs de modèles amont.
- Source : https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast. Documentation : https://www.ncei.noaa.gov/products/weather-climate-models/global-forecast.
- Licence : Selon produit. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Modèles amont conservés dans le code. Aucun modèle Paris actuel testé dans cette interface ; pas de prévision inventée ni d’appel payant.

## Géorisques — contexte statique

- Identifiant : georisques. Producteur : BRGM / Ministère de la transition écologique.
- Source : https://www.georisques.gouv.fr/doc-api. Documentation : https://www.georisques.gouv.fr/doc-api.
- Licence : Selon couche / Licence Ouverte. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. Risques géographiques statiques utiles en contexte, exclus des signaux actuels demandés. Aucun risque local présenté comme un incident en cours.

## Bruitparif

- Identifiant : bruitparif. Producteur : Bruitparif.
- Source : https://www.bruitparif.fr/opendata/. Documentation : https://www.bruitparif.fr/opendata/.
- Licence : Réutilisation à confirmer. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. Aucun service de mesures actuelles avec droits et granularité vérifiés pour cette installation. Cartes modélisées distinctes de capteurs.

## Indices polliniques officiels

- Identifiant : pollens. Producteur : Atmo France / producteurs régionaux.
- Source : https://www.atmo-france.org/article/lindice-pollen. Documentation : https://www.atmo-france.org/article/lindice-pollen.
- Licence : Selon autorisation du producteur. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Diffusion API à clé et autorisation à confirmer. Aucun formulaire soumis au nom de l’utilisateur, aucune estimation à une adresse.

## OpenSky — fournisseur alternatif

- Identifiant : opensky. Producteur : OpenSky Network.
- Source : https://openskynetwork.github.io/opensky-api/rest.html. Documentation : https://openskynetwork.github.io/opensky-api/rest.html.
- Licence : Conditions OpenSky ; accord professionnel éventuellement requis. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. adsb.lol est le fournisseur testé. OpenSky n’est pas interrogé en doublon ; droits pour usage professionnel et quotas à confirmer.

## 3D photoréaliste — Google / Cesium

- Identifiant : google-cesium-3d. Producteur : Google / Cesium.
- Source : https://developers.google.com/maps/documentation/tile/3d-tiles. Documentation : https://developers.google.com/maps/documentation/tile/3d-tiles.
- Licence : Conditions Google / Cesium. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Module amont conservé, non activé. Clé, origines autorisées, facturation et plafond non fournis. Le globe Cesium et les fonds OSM/IGN restent utilisables sans lui.

## NASA GIBS / HLS — imagerie supplémentaire

- Identifiant : nasa-imagerie. Producteur : NASA.
- Source : https://nasa-gibs.github.io/gibs-api-docs/. Documentation : https://nasa-gibs.github.io/gibs-api-docs/.
- Licence : Selon produit NASA. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Acquisitions Sentinel récentes vérifiées séparément. GIBS/HLS non intégré dans cette version ; pas de vidéo en direct ni d’archive immense.

## AISStream — couverture de la Seine

- Identifiant : ais-seine. Producteur : AISStream.
- Source : https://aisstream.io/documentation. Documentation : https://aisstream.io/documentation.
- Licence : Conditions AISStream à vérifier avec le compte. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Clé absente et couverture parisienne non testée. Aucune observation de bateau simulée, aucune couverture exhaustive annoncée.

## VNF — informations de navigation

- Identifiant : vnf. Producteur : Voies navigables de France.
- Source : https://www.vnf.fr/vnf/services/avisbat/. Documentation : https://www.vnf.fr/vnf/services/avisbat/.
- Licence : Réutilisation à confirmer. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. Service officiel identifié. Flux structuré réutilisable et conditions non confirmés ; lien officiel seulement, aucun scraping de documents ou d’images.

## NASA FIRMS

- Identifiant : firms. Producteur : NASA.
- Source : https://firms.modaps.eosdis.nasa.gov/api/. Documentation : https://firms.modaps.eosdis.nasa.gov/api/.
- Licence : Conditions NASA FIRMS. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : À développer. Clé absente. Détection thermique satellitaire ponctuelle, couverture d’incendies urbains non exhaustive ; pas de faux signalement.

## Radios publiques géolocalisées

- Identifiant : radios. Producteur : Propriétaires / Radio Browser.
- Source : https://www.radio-browser.info/. Documentation : https://www.radio-browser.info/.
- Licence : Droits de chaque propriétaire à confirmer. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. Flux parisien et autorisation de diffusion individuellement non vérifiés ; lecture volontaire seulement. Aucun audio lancé.

## ANFR — antennes et mesures

- Identifiant : anfr. Producteur : ANFR.
- Source : https://data.anfr.fr/. Documentation : https://data.anfr.fr/.
- Licence : Selon jeu ANFR. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. Données de publication et d’infrastructure, non activité actuelle des téléphones. Non retenues dans le périmètre de signaux actuels.

## ARCEP — télécommunications

- Identifiant : arcep. Producteur : ARCEP.
- Source : https://data.arcep.fr/. Documentation : https://data.arcep.fr/.
- Licence : Selon jeu ARCEP. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. Références de couverture statiques ; aucune panne ou activité en direct à une adresse ne peut en être déduite.

## RTE / énergie

- Identifiant : rte-energie. Producteur : RTE et producteurs publics.
- Source : https://data.rte-france.com/catalog. Documentation : https://data.rte-france.com/catalog.
- Licence : Selon produit et conditions du compte. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Accès ou licence à clarifier. Accès API et granularité parisienne non vérifiés. Indicateurs nationaux/régionaux ne deviennent pas des mesures dans une rue.

## Équipements, lieux frais, APUR

- Identifiant : equipements-publics. Producteur : Ville de Paris / APUR.
- Source : https://www.apur.org/fr/donnees. Documentation : https://www.apur.org/fr/donnees.
- Licence : Selon producteur / jeu. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Non retenue. Catalogues statiques utiles comme références ; exclus des signaux actuels. Leur présence ne prouve pas l’ouverture aujourd’hui.

## Webcams et caméras autorisées

- Identifiant : webcams. Producteur : Propriétaires.
- Source : https://www.paris.fr/. Documentation : https://www.paris.fr/.
- Licence : Aucun droit d’intégration vérifié. Couverture : Couverture Paris actuelle non validée.
- Nature : candidate. Schéma : Non implémenté ; schéma fournisseur non validé.
- Authentification : Aucune collecte configurée ; voir motif.
- Coût : Aucune dépense engagée.
- Quota : Aucun appel planifié. Plafond local : 0/jour, 20 % réservés.
- Collecte/cache configurés : 0 / 0 secondes. Limite de fraîcheur : 0 secondes.
- Rétention : 0 jours. Aucune donnée collectée ou retenue.
- Validation : Non testée.
- Intégration : Sans couverture vérifiée. Aucune webcam parisienne avec flux disponible et autorisation d’intégration vérifiés individuellement. Pas de police, RATP, ALPR, scan d’Internet ni substitution par Street View.
