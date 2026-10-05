# Paris OSINT — règles de contribution

Ce dépôt est un fork de bilawalsidhu/gods-eye-view. Conserver Cesium, les modules pertinents, les crédits et les licences amont. Commit amont de départ : e1cc7afacfd0e431d42d66f3b93c1f98c3e8a76d.

- Travailler sur une branche dédiée ; origin est le fork, upstream est l’original. Pas de push amont, force-push ou destruction d’historique.
- Pour une mission distante, créer et tester l’application uniquement dans la racine projets confirmée sur la machine explicitement désignée. Le poste sert au contrôle SSH et au navigateur.
- Lire les instructions locales de la machine et les fichiers non commités avant modification. Ne pas explorer les secrets d’autres applications.
- Paris administratif est le périmètre des données, recherches, statistiques, favoris et vues. Le contexte des aéroports est une option aérienne bornée et désactivée par défaut.
- config/paris-sources.json est le registre unique. Distinguer intégration, état actuel, observation, publication, collecte et validité. UTC en stockage ; Europe/Paris à l’écran.
- Priorité aux API officielles actuelles et aux signaux OSINT pertinents. Aucun placeholder ne compte comme connecteur. Une référence cartographique n’est pas une observation.
- Données et textes fournisseurs non fiables : validation, géofiltrage, tailles, pagination complète, échappement, temporisation, quotas et cache serveur partagé.
- Ne publier aucun .env, secret, adresse interne, inventaire réseau, compte applicatif, base, cache, capture privée ni rapport d’exploitation. var/ est privé et ignoré.
- Garder l’authentification, CSRF et séparation administrateur. Aucun identifiant par défaut ; secrets jamais dans le bundle. Pas de proxy URL arbitraire.
- Pas de simulation, suivi de personnes, reconnaissance faciale, plaques, scan de caméras ou prétendue vidéo satellite en direct.
- Pas d’achat cloud, notification externe, nouveau point d’entrée public, changement SSH/routage/VPN/pare-feu, mise à niveau globale ou redémarrage VM.
- Production : runtime isolé dans var/runtime, serveur Node dédié sous compte existant non privilégié, unité systemd minimale. Vite dev/preview réservé au développement interne.
- Compiler, exécuter les tests utiles, diagnostiquer de vraies réponses et vérifier le parcours navigateur. Les données synthétiques restent exclusivement dans les tests.
- Après changement du registre : npm run docs:sources. Après changement du code : build/tests appropriés ; redémarrer uniquement le service applicatif.
