# Registre des sources

Généré depuis config/paris-sources.json, également utilisé par le serveur et l’interface. npm run docs:sources met à jour ce document. Les candidats désactivés ne sont pas comptés comme connecteurs opérationnels.

Les états disponibles, vides, anciens, quota, authentification, panne et désactivés évoluent dans l’application. La preuve ci-dessous atteste un test daté, pas une disponibilité permanente.

| Source | Intégration | Preuve réelle UTC | Couverture / motif |
| --- | --- | --- | --- |
| Trafic en direct — TomTom | Implémentée, clé manquante | Non testée en réel | Couleur de chaque tronçon selon la vitesse mesurée par TomTom comparée à la vitesse libre (vert fluide → rouge saturé, rouge foncé bloqué). Aucun véhicule simulé ; voies non couvertes laissées sans couleur. |
| Trafic mesuré la veille — capteurs (J-1) | Implémentée, non testée en réel | Non testée en réel | Publication J-1 : état mesuré la veille à la même heure (fluide, pré-saturé, saturé, bloqué). Ce n’est pas du direct ; utile sans clé pour repérer les axes habituellement chargés. |
| Fermetures et événements de voirie — PC Lutèce | Opérationnelle vérifiée | 2026-10-05T02:53:18.251Z | Publication annoncée toutes les cinq minutes : fermetures de voies, chantiers, incidents et événements diffusés par le PC Lutèce (format Waze CIFS). Événements datés, sans voitures simulées. |
| Travaux perturbants en cours | Opérationnelle vérifiée | 2026-10-05T00:54:31.856Z | Chantiers ayant un impact sur la circulation, avec niveau de perturbation officiel. Publication hebdomadaire non exhaustive ; aucune indication de direct. |
| Incidents de circulation — TomTom | Implémentée, clé manquante | Non testée en réel | Incident Details v5 préparé ; Flow v4 amont conservé, migration de vitesses non testée. Simulations désactivées. |
| Métro, RER, tram et train — tracés | Opérationnelle vérifiée | 2026-10-05T01:20:25.389Z | Tracés officiels aux couleurs IDFM, pour se repérer. Référence cartographique : aucune circulation en direct ni véhicule GPS. |
| Stations et arrêts (métro, RER, tram, bus) | Opérationnelle vérifiée | 2026-10-05T01:20:28.543Z | Référentiel officiel des arrêts. Une station sélectionnée affiche ses lignes et, si PRIM est configuré, les prochains passages publiés. |
| IDFM — lignes desservant chaque arrêt | Implémentée, non testée en réel | Non testée en réel | Référence théorique (GTFS) : quelles lignes desservent chaque arrêt parisien. Sert aux fiches d’arrêt et au périmètre de l’info trafic ; aucune observation actuelle. |
| Info trafic métro, RER, tram et bus — PRIM | Implémentée, clé manquante | Non testée en réel | Incidents, travaux et informations publiés par IDFM pour toutes les lignes en une requête, filtrés sur les lignes desservant Paris. Aucune position GPS de véhicule. |
| Prochains passages en temps réel — PRIM | Implémentée, clé manquante | Non testée en réel | Horaires attendus publiés par les opérateurs, affichés dans la fiche d’une station ou d’un arrêt. Aucun suivi ni position de véhicule. |
| Vélib’ — vélos et bornettes | Opérationnelle vérifiée | 2026-10-05T02:55:18.096Z | TTL opérateur respecté, déduplication StationCode. Repli Paris Data partagé une heure. |
| Seine — hauteurs et débits | Opérationnelle vérifiée | 2026-10-05T02:54:18.829Z | Stations en service du référentiel Paris. H : mm convertis en m, référentiel de chaque station conservé ; inconnu si absent, sans conversion NGF. Q : L/s convertis en m³/s. Qualification et commentaire du producteur conservés. |
| Vigilance météo — département 75 | Opérationnelle vérifiée | 2026-10-05T02:57:18.694Z | Republication ouverte du bulletin départemental J/J1 ; aucun capteur de rue ni radar. |
| Airparif — prévisions communales | Implémentée, clé manquante | Non testée en réel | 20 arrondissements officiels ; prévisions aujourd’hui/demain. Une requête groupée par cycle journalier. Quota du compte à confirmer avec la clé autorisée. |
| Que Faire à Paris ? | Opérationnelle vérifiée | 2026-10-05T02:55:24.611Z | Périodes programmées ; ne prouve ni ouverture à cette heure ni foule. |
| Sentinel-2 — acquisitions récentes | Opérationnelle vérifiée | 2026-10-05T00:54:35.708Z | Catalogue STAC des trois derniers jours : acquisition, résolution du produit, nuages de la scène. Empreinte uniquement, pas vidéo. |
| Passages de satellites calculés | Opérationnelle vérifiée | 2026-10-05T00:54:35.932Z | SGP4 à Paris, âge des éléments affiché. Prévision de passage, aucune observation optique ou vidéo. |
| Comptages vélo et multimodaux | Non retenue | Non testée en réel | API officielle examinée : dernière publication du catalogue le 4 octobre 2026 à 05:15 UTC. Agrégats différés ; aucune trajectoire individuelle ni trafic instantané. |
| Parkings SAEMES — disponibilité | Sans couverture vérifiée | Non testée en réel | Catalogue officiel testé (19 jeux). Aucun flux public de places libres vérifié dans ce catalogue. Les capacités et horaires statiques ne sont pas présentés comme une disponibilité actuelle. |
| IRVE et stationnement — autres opérateurs | À développer | Non testée en réel | La couche Belib’ a été retirée de la carte. Autres catalogues statiques non retenus comme état actuel ; disponibilités dynamiques autres opérateurs non vérifiées. |
| Sytadin / DiRIF | Accès ou licence à clarifier | Non testée en réel | Réutilisation structurée soumise à accord DiRIF / Bison Futé. Aucun accord fourni, aucun prélèvement d’images du site. |
| Météo-France — observations, radar et pluie | À développer | Non testée en réel | Authentification et produits autorisés non fournis. Seule la vigilance départementale ouverte est actuellement connectée. Radar et foudre américains écartés. |
| Prévisions météorologiques globales | À développer | Non testée en réel | Modèles amont conservés dans le code. Aucun modèle Paris actuel testé dans cette interface ; pas de prévision inventée ni d’appel payant. |
| Géorisques — contexte statique | Non retenue | Non testée en réel | Risques géographiques statiques utiles en contexte, exclus des signaux actuels demandés. Aucun risque local présenté comme un incident en cours. |
| Bruitparif | Accès ou licence à clarifier | Non testée en réel | Aucun service de mesures actuelles avec droits et granularité vérifiés pour cette installation. Cartes modélisées distinctes de capteurs. |
| Indices polliniques officiels | À développer | Non testée en réel | Diffusion API à clé et autorisation à confirmer. Aucun formulaire soumis au nom de l’utilisateur, aucune estimation à une adresse. |
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

## Trafic en direct — TomTom

- Identifiant : tomtom-flow. Producteur : TomTom.
- Source : https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles. Documentation : https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles.
- Licence : Conditions TomTom selon le compte ; affichage avec attribution. Couverture : Voirie couverte par TomTom, tuiles bornées au rectangle de Paris administratif.
- Nature : tiles. Schéma : Tuiles PNG 256 px Raster Flow v4, style relative0 : vitesse mesurée rapportée à la vitesse libre ; zoom 11 à 18..
- Authentification : Clé serveur TomTom (TOMTOM_API_KEY).
- Coût : Aucune dépense engagée par l’application ; dépend du compte TomTom.
- Quota : Quota de tuiles trafic selon le compte TomTom (offre gratuite à vérifier dans la console). Plafond local partagé 7 500 tuiles/jour dont 20 % de réserve ; cache serveur 2 min.. Plafond local : 7500/jour, 20 % réservés.
- Collecte/cache configurés : 600 / 120 secondes. Limite de fraîcheur : 1800 secondes.
- Rétention : 0 jours. Cache mémoire de 2 min, servi au plus 10 min en cas de panne ; aucune archive..
- Validation : Coordonnées de tuile entières, zoom 11 à 18, intersection avec Paris, signature PNG et taille maximale 1 Mo..
- Intégration : Implémentée, clé manquante. Couleur de chaque tronçon selon la vitesse mesurée par TomTom comparée à la vitesse libre (vert fluide → rouge saturé, rouge foncé bloqué). Aucun véhicule simulé ; voies non couvertes laissées sans couleur.

## Trafic mesuré la veille — capteurs (J-1)

- Identifiant : comptages-route. Producteur : Ville de Paris — PC Lutèce.
- Source : https://opendata.paris.fr/explore/dataset/comptages-routiers-permanents/. Documentation : https://opendata.paris.fr/explore/dataset/comptages-routiers-permanents/information/.
- Licence : ODbL. Couverture : Tronçons équipés de boucles de comptage, Paris administratif.
- Nature : measurement. Schéma : iu_ac, libelle, t_1h (heure de mesure), q débit véhicules/h, k taux d’occupation %, etat_trafic, etat_barre, libelle_nd_amont, libelle_nd_aval, geo_shape..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Quota fournisseur non précisé. Une heure de mesures par collecte horaire (environ 32 appels) ; plafond local 1 500/jour, réserve 20 %.. Plafond local : 1500/jour, 20 % réservés.
- Collecte/cache configurés : 3600 / 3600 secondes. Limite de fraîcheur : 259200 secondes.
- Rétention : 0 jours. Dernière heure publiée remplacée à chaque collecte ; pas d’archive locale (historique disponible chez le producteur)..
- Validation : Heure de mesure UTC unique, états connus, débits et taux numériques, géométries WGS84 découpées sur Paris..
- Intégration : Implémentée, non testée en réel. Publication J-1 : état mesuré la veille à la même heure (fluide, pré-saturé, saturé, bloqué). Ce n’est pas du direct ; utile sans clé pour repérer les axes habituellement chargés.

## Fermetures et événements de voirie — PC Lutèce

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
- Intégration : Opérationnelle vérifiée. Publication annoncée toutes les cinq minutes : fermetures de voies, chantiers, incidents et événements diffusés par le PC Lutèce (format Waze CIFS). Événements datés, sans voitures simulées.
- Preuve expurgée : [2026-10-05T02:53:18.251Z](evidence/pc-lutece.json), état lors du test : available.

## Travaux perturbants en cours

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
- Intégration : Opérationnelle vérifiée. Chantiers ayant un impact sur la circulation, avec niveau de perturbation officiel. Publication hebdomadaire non exhaustive ; aucune indication de direct.
- Preuve expurgée : [2026-10-05T00:54:31.856Z](evidence/travaux.json), état lors du test : available.

## Incidents de circulation — TomTom

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

## Métro, RER, tram et train — tracés

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
- Intégration : Opérationnelle vérifiée. Tracés officiels aux couleurs IDFM, pour se repérer. Référence cartographique : aucune circulation en direct ni véhicule GPS.
- Preuve expurgée : [2026-10-05T01:20:25.389Z](evidence/idfm-traces.json), état lors du test : available.

## Stations et arrêts (métro, RER, tram, bus)

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
- Intégration : Opérationnelle vérifiée. Référentiel officiel des arrêts. Une station sélectionnée affiche ses lignes et, si PRIM est configuré, les prochains passages publiés.
- Preuve expurgée : [2026-10-05T01:20:28.543Z](evidence/idfm-arrets.json), état lors du test : available.

## IDFM — lignes desservant chaque arrêt

- Identifiant : idfm-lignes. Producteur : Île-de-France Mobilités.
- Source : https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes/. Documentation : https://data.iledefrance-mobilites.fr/explore/dataset/arrets-lignes/information/.
- Licence : ODbL. Couverture : Arrêts situés dans Paris administratif.
- Nature : reference. Schéma : id (ligne IDFM:Cxxxxx), shortname, mode, route_long_name, stop_id, stop_name, coordonnées de l’arrêt..
- Authentification : Sans clé.
- Coût : Accès public sans dépense engagée.
- Quota : Catalogue ouvert ; un export filtré par jour, plafond local partagé et marge 20 %. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 86400 / 86400 secondes. Limite de fraîcheur : 31536000 secondes.
- Rétention : 0 jours. Référentiel remplacé chaque jour ; aucune archive..
- Validation : Champs attendus vérifiés dans le catalogue, identifiants de ligne IDFM, coordonnées dans Paris, 30 lignes maximum par arrêt..
- Intégration : Implémentée, non testée en réel. Référence théorique (GTFS) : quelles lignes desservent chaque arrêt parisien. Sert aux fiches d’arrêt et au périmètre de l’info trafic ; aucune observation actuelle.

## Info trafic métro, RER, tram et bus — PRIM

- Identifiant : prim-perturbations. Producteur : Île-de-France Mobilités.
- Source : https://prim.iledefrance-mobilites.fr/fr/apis/idfm-disruptions_bulk. Documentation : https://prim.iledefrance-mobilites.fr/fr/aide-et-contact/documentation/prise-en-main-des-api/api-information-trafic-travaux/api-messages-info-trafic-requete-globale.
- Licence : Licence Mobilité et CGU de l’API. Couverture : Lignes desservant Paris selon les référentiels IDFM ; tronçon décrit par le producteur.
- Nature : event. Schéma : disruptions[] : id, applicationPeriods (begin/end AAAAMMJJTHHMMSS, heure de Paris), lastUpdate, cause, severity, title, message ; lines[] : id line:IDFM:Cxxxxx, shortName, mode, impactedObjects[].disruptionIds..
- Authentification : Clé serveur PRIM (compte gratuit) (PRIM_API_KEY).
- Coût : Accès gratuit avec compte PRIM ; aucune dépense engagée.
- Quota : Requête globale : 1 000/jour pour les jetons récents, 18 000 pour les anciens, 5 req/s. Collecte toutes les 5 min = 288 appels/jour ; plafond local 1 000, réserve 20 %.. Plafond local : 1000/jour, 20 % réservés.
- Collecte/cache configurés : 300 / 300 secondes. Limite de fraîcheur : 1800 secondes.
- Rétention : 0 jours. Cache courant remplacé à chaque collecte ; aucune archive tant que les droits ne sont pas confirmés..
- Validation : Identifiants de ligne IDFM, périodes converties de l’heure de Paris en UTC, messages HTML réduits au texte, lignes hors Paris écartées..
- Intégration : Implémentée, clé manquante. Incidents, travaux et informations publiés par IDFM pour toutes les lignes en une requête, filtrés sur les lignes desservant Paris. Aucune position GPS de véhicule.

## Prochains passages en temps réel — PRIM

- Identifiant : prim-passages. Producteur : Île-de-France Mobilités.
- Source : https://prim.iledefrance-mobilites.fr/fr/apis/idfm-ivtr-requete_unitaire. Documentation : https://prim.iledefrance-mobilites.fr/fr/apis/idfm-ivtr-requete_unitaire.
- Licence : Licence Mobilité et CGU de l’API. Couverture : Arrêts du référentiel IDFM situés dans Paris.
- Nature : on_demand. Schéma : Siri.ServiceDelivery.StopMonitoringDelivery[].MonitoredStopVisit[].MonitoredVehicleJourney : LineRef, DestinationName, MonitoredCall (ExpectedDepartureTime, AimedDepartureTime, DepartureStatus)..
- Authentification : Clé serveur PRIM (compte gratuit) (PRIM_API_KEY).
- Coût : Accès gratuit avec compte PRIM ; aucune dépense engagée.
- Quota : Requête unitaire SIRI Lite selon le jeton. Appel seulement à l’ouverture d’une fiche d’arrêt parisien ; cache partagé 45 s par arrêt, plafond local 5 000/jour, réserve 20 %.. Plafond local : 5000/jour, 20 % réservés.
- Collecte/cache configurés : 45 / 45 secondes. Limite de fraîcheur : 300 secondes.
- Rétention : 0 jours. Cache mémoire de 45 s par arrêt ; aucune archive..
- Validation : Arrêt présent dans le référentiel parisien, dates UTC, textes échappés, 40 passages maximum..
- Intégration : Implémentée, clé manquante. Horaires attendus publiés par les opérateurs, affichés dans la fiche d’une station ou d’un arrêt. Aucun suivi ni position de véhicule.

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
- Intégration : À développer. La couche Belib’ a été retirée de la carte. Autres catalogues statiques non retenus comme état actuel ; disponibilités dynamiques autres opérateurs non vérifiées.

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
