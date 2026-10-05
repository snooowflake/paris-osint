# Validation de Paris OSINT

Vérifications réalisées le 5 octobre 2026, sur une installation Linux distante. Les paramètres d’exploitation privés sont consignés hors Git. Ce document décrit des contrôles effectués ; il ne garantit pas la disponibilité future des fournisseurs.

## Tests et build

- `npm run build` : réussi. Entrée Paris, Cesium ESM et workers servis par le serveur de production. Aucun serveur Vite dev/preview exposé.
- `npm test` : réussi. Suite principale : 5 647 tests, 5 646 réussis et un ignoré ; suite additionnelle : un réussi ; performances : 13 réussis. Ces scénarios amont peuvent contenir des sources mondiales synthétiques et ne valident pas leur déploiement parisien.
- `npm run test:paris` : 38 tests réussis, aucun échec ni test ignoré. Tests exclusivement synthétiques identifiés ; base SQLite en mémoire ou fichiers temporaires isolés, jamais la base de production.
- `npm run check:boundaries` : réussi. Limites de dépendances amont conservées.
- Diagnostic réel des sources : réussi ; chaque preuve possède son schéma, sa région, son heure de test et au plus deux exemples expurgés.
- Sauvegarde SQLite cohérente et copie privée de la configuration : exécutées et vérifiées. Démarrage systemd et redémarrage du seul service applicatif : vérifiés.

Les tests Paris couvrent : limites administratives avec bois et trous, bornage aérien distinct, clipping des polygones/lignes, déduplication, pagination intégrale et changement de total fournisseur, EPSG:2154 vers WGS84, unités H/Q/aviation, dates UTC et changements d’heure, sources vides/périmées/en panne/sans clé, quotas atomiques avec réserve, cache partagé, baux SQLite entre processus et annulation.

Ils couvrent également les hôtes sortants autorisés, ports, identifiants d’URL, redirections, métadonnées cloud, taille des réponses, validation JSON, mots de passe/sessions, CSRF, rôles administrateur/lecteur, accès aux fichiers privés, entrées HTML malveillantes, export limité, annotations et vues parisiennes. La pagination de 1 005 archives synthétiques vérifie les deux pages sans doublons. Les courbes distinguent stations et unités, et conservent la correction la plus récemment acquise.

## Parcours navigateur réellement exécuté

Connexion avec l’administrateur existant ; cinq entrées françaises ; carte Cesium réellement rendue avec limites Paris, couches de mesures, sélection d’objets réels, fiches et liens Sources ; navigation Situation/Sources/Historique/Réglages puis retour à la carte.

Affichage mobile 390 × 844 : cinq entrées visibles, ouverture/fermeture du panneau de couches, activation de la Seine, sélection de fiche. Fonds OpenStreetMap et IGN Plan vérifiés. Recherche réelle IGN/BAN : adresse avenue Anatole-France dans Paris ; requête « Marseille » limitée à des adresses parisiennes. Option aéroports désactivée par défaut, activation puis désactivation vérifiées.

Historique réellement acquis : date de l’événement distinguée de la première acquisition, filtrage Hub’Eau, courbe de plusieurs observations réelles et légende explicitant les segments entre points. Les graphiques portent sur les archives chargées, avec indication du total et pagination explicite.

CSP : aucun `unsafe-eval` autorisé. Une adaptation de build remplace uniquement la détection globale historique de Knockout par `globalThis` ; les widgets à expressions dynamiques restent désactivés. Rendu de la carte et commandes vérifiés après cette adaptation ; aucune protection désactivée pour masquer une erreur.

## Réponses fournisseurs et progression

Le registre [SOURCES.md](SOURCES.md) est généré depuis [config/paris-sources.json](../config/paris-sources.json). Quatorze connecteurs ont une réponse réelle validée : douze flux datés et deux référentiels IDFM, explicitement séparés de l’activité actuelle.

Une intégration vérifiée peut être temporairement ancienne, vide ou en panne. Les preuves sont des instantanés de test et non une promesse de flux direct. Les stations Vélib’ respectent le TTL GBFS annoncé ; une donnée collectée aujourd’hui reste ancienne si son observation ne l’est pas. Les travaux restent hebdomadaires et non exhaustifs.

[Progression Hub’Eau](evidence/hubeau-progression.json) : comparaison datée de réponses réellement acquises, avec progression des heures d’observation pour les mêmes codes officiels. Aucun point intermédiaire inventé. Le H publié est converti de mm en m ; les références propres aux stations sont conservées, inconnues si absentes, sans transformation NGF supposée.

## Non testé en conditions réelles ou non retenu

- Airparif, TomTom incidents et PRIM messages : connecteurs préparés, tests synthétiques ; clés autorisées absentes, quotas du compte et droits contractuels à vérifier avant activation.
- Vitesses TomTom, prochains passages/horaires PRIM, mesures météo et radar Météo-France : non activés ; absence de clé ou connecteur restant à développer. Aucune coordonnée GPS de véhicule déduite des horaires.
- AIS/AISStream, webcams, flux Sytadin/DiRIF, bruit/pollens et autres fournisseurs restreints : aucune couverture réelle autorisée démontrée ; exclusions détaillées dans le registre. Aucun bateau ou flux vidéo simulé.
- Sentinel : catalogue et empreintes d’acquisition seulement ; pixels, mosaïques et téléchargement d’archives non implémentés. Les nuages concernent la scène, pas une mesure dans une rue.
- Photogrammétrie Google/Cesium, bâtiments 3D et terrain détaillé : non activés. La carte utilise le globe 3D Cesium et des fonds cartographiques de référence ; aucun service payant engagé.
- Sources statiques ANFR/ARCEP/APUR/équipements et comptages J-1 : hors des couches d’activité actuelle, selon la priorité donnée aux API actuelles.
- Pas d’essai prolongé sur plusieurs jours, charge multi-utilisateur réelle, restauration complète de la sauvegarde ni exercice de retour arrière sur une autre version. Les procédures sont préparées, et la sauvegarde actuelle est contrôlée.
- Pas d’exposition publique ni TLS/Nginx public testé : aucun domaine autorisé fourni. L’accès privé/VPN est vérifié.
- Séparation lecteur/administrateur vérifiée sur serveur de test isolé ; aucun compte de lecteur supplémentaire créé dans la production pour le test.

L’application fonctionne sans assistant IA, poste utilisateur ou agent d’automatisation. Les API et fonds externes restent des dépendances d’exécution identifiées.

Formulaires accessibles : vue parisienne enregistrée et favori d’une station réelle, persistance vérifiée ; formulaire d’annotation ouvert puis annulé au clavier, sans insertion de faux événement. Recherche de couche « Seine » vérifiée.

Mode tablette 768 x 1024 et retour au format habituel verifies. Attributions OSM/IGN presentes sur la carte. Le flux Belib et les stations Velib ont repris des observations fraiches lors du controle suivant, sans requalifier les anciennes observations.
