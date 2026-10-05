import fs from 'node:fs';
const all = JSON.parse(
  fs.readFileSync(
    new URL('../config/paris-sources.json', import.meta.url),
    'utf8',
  ),
);
const labels = {
  verified: 'Opérationnelle vérifiée',
  missing_key: 'Implémentée, clé manquante',
  implemented_unverified: 'Implémentée, non testée en réel',
  to_develop: 'À développer',
  excluded: 'Non retenue',
  no_coverage: 'Sans couverture vérifiée',
  license_unclear: 'Accès ou licence à clarifier',
};
const esc = (x) =>
  String(x ?? 'Inconnu')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
const doc = [
  '# Registre des sources',
  '',
  'Généré depuis config/paris-sources.json, également utilisé par le serveur et l’interface. npm run docs:sources met à jour ce document. Les candidats désactivés ne sont pas comptés comme connecteurs opérationnels.',
  '',
  'Les états disponibles, vides, anciens, quota, authentification, panne et désactivés évoluent dans l’application. La preuve ci-dessous atteste un test daté, pas une disponibilité permanente.',
  '',
  '| Source | Intégration | Preuve réelle UTC | Couverture / motif |',
  '| --- | --- | --- | --- |',
];
for (const s of all)
  doc.push(
    '| ' +
      [
        s.name,
        labels[s.integration] || s.integration,
        s.evidence?.[0]?.testedAt || 'Non testée en réel',
        s.note,
      ]
        .map(esc)
        .join(' | ') +
      ' |',
  );
for (const s of all) {
  doc.push(
    '',
    '## ' + s.name,
    '',
    '- Identifiant : ' + s.id + '. Producteur : ' + s.producer + '.',
    '- Source : ' + s.source + '. Documentation : ' + s.documentation + '.',
    '- Licence : ' + s.license + '. Couverture : ' + s.coverage + '.',
    '- Nature : ' + s.nature + '. Schéma : ' + s.schema + '.',
    '- Authentification : ' +
      s.authDescription +
      (s.auth ? ' (' + s.auth + ')' : '') +
      '.',
    '- Coût : ' + s.cost + '.',
    '- Quota : ' +
      s.quota +
      '. Plafond local : ' +
      s.dailyBudget +
      '/jour, 20 % réservés.',
    '- Collecte/cache configurés : ' +
      s.refreshSeconds +
      ' / ' +
      s.cacheSeconds +
      ' secondes. Limite de fraîcheur : ' +
      s.staleAfter +
      ' secondes.',
    '- Rétention : ' + s.retentionDays + ' jours. ' + s.cacheRetention + '.',
    '- Validation : ' + s.schemaValidation + '.',
    '- Intégration : ' +
      (labels[s.integration] || s.integration) +
      '. ' +
      s.note,
  );
  for (const e of s.evidence || [])
    doc.push(
      '- Preuve expurgée : [' +
        e.testedAt +
        '](' +
        e.file.replace('docs/', '') +
        '), état lors du test : ' +
        e.state +
        '.',
    );
}
fs.writeFileSync(
  new URL('../docs/SOURCES.md', import.meta.url),
  doc.join('\n') + '\n',
);
console.log(
  'Documentation générée : ' +
    all.filter((s) => s.enabled).length +
    ' connecteurs configurés, ' +
    all.filter((s) => !s.enabled).length +
    ' candidats non activés.',
);
