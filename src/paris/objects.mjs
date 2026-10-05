import { $, el, button, field, link, fmt, toast, api, askText } from './ui.mjs';
export function objectCard(f, app) {
  const p = f.properties,
    s = app.sources.find((s) => s.id === p.source),
    card = $('#object-card');
  card.replaceChildren(button('Fermer', () => (card.hidden = true)));
  card.firstChild.className = 'close';
  card.append(
    el('h2', p.name),
    el('p', s?.name || 'Référence géographique', { class: 'muted' }),
  );
  if (s?.note) card.append(el('p', s.note, { class: 'source-description' }));
  for (const [label, key] of [
    ['Observation', 'observedAt'],
    ['Publication', 'publishedAt'],
    ['Collecte', 'collectedAt'],
    ['Début de validité', 'validFrom'],
    ['Fin de validité', 'validTo'],
  ])
    card.append(field(label, fmt(p[key])));
  const omit = new Set([
    'name',
    'source',
    'observedAt',
    'publishedAt',
    'collectedAt',
    'validFrom',
    'validTo',
    'nature',
    '_recordId',
    'sourceUrl',
  ]);
  for (const [key, value] of Object.entries(p))
    if (!omit.has(key))
      card.append(
        field(
          {
            mechanical: 'Vélos mécaniques',
            electric: 'Vélos électriques',
            bikes: 'Vélos disponibles',
            docks: 'Bornettes libres',
            operator: 'Opérateur',
            isRenting: 'Location activée',
            value: 'Valeur',
            unit: 'Unité',
            kind: 'Grandeur',
            qualification: 'Code de qualification officiel',
            station: 'Code station',
            method: 'Méthode',
            reference: 'Référentiel',
            altimetricReferenceRaw: 'Référence altimétrique publiée',
            altimetricSystemCode: 'Code du référentiel altimétrique',
            stationNotes: 'Commentaires du producteur',
            altitudeMeters: 'Altitude (m)',
            speedMps: 'Vitesse (m/s)',
            militaryClassifiedBySource:
              'Classification militaire par le fournisseur',
            callsign: 'Indicatif',
            level: 'Niveau officiel',
            status: 'État publié',
            official: 'Publication officielle',
            coverage: 'Granularité',
            description: 'Description',
            type: 'Type',
            programmed: 'Événement programmé',
            schedule: 'Horaires publiés',
            cloudCover: 'Nuages de la scène (%)',
            resolution: 'Résolution (m)',
            acquisition: 'Acquisition',
            elementEpoch: 'Époque orbitale',
            forecastDate: 'Date prévue',
            publicationUnknown: 'Publication non horodatée',
          }[key] || key,
          value,
        ),
      );
  if (s)
    card.append(
      link('Source officielle · ' + s.producer, s.source),
      button('Fiche de la source', () => app.navigate('sources', s.id)),
    );
  if (p.sourceUrl) {
    const paragraph = el('p');
    paragraph.append(link('Consulter le producteur', p.sourceUrl));
    card.append(paragraph);
  }
  if (s && (!f.geometry || app.contains(app.anchor(f.geometry))))
    card.append(
      button('Ajouter aux favoris', async () => {
        if (
          !app.preferences.favorites.some(
            (x) => x.id === f.id && x.source === s.id,
          )
        ) {
          app.preferences.favorites.push({
            id: f.id,
            source: s.id,
            name: p.name.slice(0, 160),
          });
          await app.savePreferences();
          toast('Favori enregistré');
        }
      }),
    );
  const pos = app.anchor(f.geometry);
  if (pos && app.contains(pos))
    card.append(
      button('Annoter ce lieu', async () => {
        const text = await askText(
          'Annotation personnelle (1 000 caractères maximum)',
          { maxLength: 1000, multiline: true },
        );
        if (text?.trim()) {
          try {
            await api('/api/annotations', {
              method: 'POST',
              data: { text: text.slice(0, 1000), point: pos },
            });
            toast('Annotation personnelle enregistrée');
          } catch (e) {
            toast(e.message);
          }
        }
      }),
    );
  if (s?.exportAllowed)
    card.append(button('Exporter cette couche', () => app.exportSource(s.id)));
  card.hidden = false;
}
