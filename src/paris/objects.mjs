import {
  $,
  el,
  button,
  field,
  link,
  fmt,
  hm,
  toast,
  api,
  askText,
} from './ui.mjs';
import {
  traffic,
  roadEvent,
  perturbation,
  tomtomCategories,
  modes,
} from './model.mjs';
import { roadColors, velibColor, tomtomStyle } from './render.mjs';
import { lineCatalog, showLine, stopSection } from './transit.mjs';
import { chip } from './ui.mjs';
export function openCard(app, title, subtitle, lead) {
  app.onCardClose?.();
  app.onCardClose = null;
  const card = $('#object-card'),
    head = el('header', null, { class: 'card-head' }),
    text = el('div', null, { class: 'card-title' }),
    close = button('×', () => closeCard(app)),
    body = el('div', null, { class: 'card-body' });
  close.className = 'close';
  close.setAttribute('aria-label', 'Fermer la fiche');
  text.append(el('h2', title), el('p', subtitle, { class: 'muted' }));
  if (lead) head.append(lead);
  head.append(text, close);
  card.replaceChildren(head, body);
  card.hidden = false;
  card.scrollTop = 0;
  return body;
}
export function closeCard(app) {
  app.onCardClose?.();
  app.onCardClose = null;
  $('#object-card').hidden = true;
  app.renderer?.highlight(null);
}
const pill = (text, color) => {
  const n = el('span', text, { class: 'pill' });
  if (color) n.style.setProperty('--c', color);
  return n;
};
function facts(rows) {
  const dl = el('dl', null, { class: 'facts' });
  for (const [k, v] of rows) {
    if (v === null || v === undefined || v === '') continue;
    const d = el('div');
    d.append(el('dt', k), el('dd', v));
    dl.append(d);
  }
  return dl;
}
const number = (v, unit, digits = 0) =>
  Number.isFinite(v)
    ? v.toLocaleString('fr-FR', { maximumFractionDigits: digits }) +
      (unit ? ' ' + unit : '')
    : null;
const period = (p) =>
  p.validFrom || p.validTo
    ? (p.validFrom ? 'du ' + fmt(p.validFrom) : 'jusqu’') +
      (p.validTo ? (p.validFrom ? ' au ' : 'au ') + fmt(p.validTo) : '')
    : null;
// Résumé lisible propre à chaque source.
function summary(f, app, body) {
  const p = f.properties;
  if (p.source === 'comptages-route') {
    const t = traffic[p.trafficState];
    body.append(
      pill(t?.label || 'État inconnu', t?.color),
      facts([
        ['Mesure', 'La veille à ' + hm(p.observedAt) + ' (J-1, pas du direct)'],
        ['Débit', number(p.flow, 'véhicules/h')],
        ['Occupation', number(p.occupancy, '%', 1)],
        ['Tronçon', p.from && p.to ? p.from + ' → ' + p.to : null],
      ]),
    );
    return;
  }
  if (p.source === 'pc-lutece') {
    const ev = roadEvent(p);
    body.append(
      pill(ev.label, roadColors[ev.kind]),
      facts([
        ['Précision', ev.detail],
        ['Sens', ev.direction],
        ['Période', period(p)],
      ]),
    );
    if (p.description) body.append(el('p', p.description, { class: 'lead' }));
    return;
  }
  if (p.source === 'travaux') {
    const level = perturbation[p.perturbationLevel];
    if (level) body.append(pill(level.label, level.color));
    if (p.status) body.append(pill(p.status, '#5A6872'));
    body.append(
      facts([
        ['Période', period(p)],
        ['Objet', p.object],
        ['Impact', p.impact],
        ['Détail', p.impactDetail],
        ['Localisation', p.location],
        ['Maître d’ouvrage', p.owner],
      ]),
    );
    if (p.description) body.append(el('p', p.description, { class: 'lead' }));
    return;
  }
  if (p.source === 'tomtom') {
    const t = tomtomStyle(p.category);
    body.append(
      pill(tomtomCategories[p.category] || 'Incident', t.color),
      facts([
        ['Période', period(p)],
        ['Signalé', p.observedAt ? fmt(p.observedAt) : null],
      ]),
    );
    return;
  }
  if (p.source === 'idfm-traces') {
    const line = lineCatalog(app).get(p.lineRef);
    body.append(
      facts([
        ['Mode', modes[p.mode]?.label],
        ['Exploitant', p.operator],
      ]),
      el(
        'p',
        'Tracé de référence : il ne montre ni la position des rames ni l’état du trafic.',
        { class: 'muted' },
      ),
    );
    if (line)
      body.append(
        button('État du trafic de la ligne', () => showLine(app, p.lineRef)),
      );
    return;
  }
  if (p.source === 'idfm-arrets') {
    body.append(
      facts([
        ['Type', modes[p.mode]?.label || p.kind],
        ['Accessibilité', p.accessibility],
      ]),
    );
    stopSection(app, f, body);
    return;
  }
  if (p.source === 'velib') {
    const stats = el('div', null, { class: 'stats' });
    for (const [v, label] of [
      [p.mechanical, 'mécaniques'],
      [p.electric, 'électriques'],
      [p.docks, 'places libres'],
    ]) {
      const s = el('div');
      s.append(
        el('strong', Number.isFinite(v) ? String(v) : '?'),
        el('span', label),
      );
      stats.append(s);
    }
    body.append(
      pill((p.bikes ?? '?') + ' vélos disponibles', velibColor(p)),
      stats,
    );
    return;
  }
  if (p.source === 'hubeau') {
    body.append(
      pill(
        number(p.value, p.kind === 'Q' ? 'm³/s' : 'm', 2) || 'Valeur inconnue',
        '#1F78C8',
      ),
      facts([
        ['Grandeur', p.kind === 'Q' ? 'Débit' : 'Hauteur'],
        ['Référentiel', p.reference],
      ]),
    );
    return;
  }
  if (p.source === 'agenda') {
    body.append(
      facts([
        ['Horaires', p.schedule],
        ['Période', period(p)],
      ]),
    );
    if (p.description) body.append(el('p', p.description, { class: 'lead' }));
    return;
  }
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
    'referenceOnly',
  ]);
  for (const [k, v] of Object.entries(p))
    if (!omit.has(k))
      body.append(
        field(
          {
            description: 'Description',
            method: 'Méthode',
            coverage: 'Granularité',
            resolutionMeters: 'Résolution (m)',
            cloudCoverScenePercent: 'Nuages de la scène (%)',
            representation: 'Représentation',
            status: 'État publié',
            level: 'Niveau officiel',
          }[k] || k,
          v,
        ),
      );
}
export function objectCard(f, app) {
  const p = f.properties,
    s = app.sources.find((s) => s.id === p.source);
  let lead = null;
  if (p.source === 'idfm-traces') {
    const line = lineCatalog(app).get(p.lineRef);
    if (line) lead = chip(line);
  }
  const body = openCard(
    app,
    p.name || 'Sans nom',
    s?.name || 'Référence géographique',
    lead,
  );
  summary(f, app, body);
  const prov = el('details', null, { class: 'provenance' });
  prov.append(el('summary', 'Provenance et horodatage'));
  if (s?.note) prov.append(el('p', s.note, { class: 'source-description' }));
  for (const [label, key] of [
    ['Observation', 'observedAt'],
    ['Publication', 'publishedAt'],
    ['Collecte', 'collectedAt'],
    ['Début de validité', 'validFrom'],
    ['Fin de validité', 'validTo'],
  ])
    prov.append(field(label, fmt(p[key])));
  if (p.method) prov.append(field('Méthode', p.method));
  if (p.coverage) prov.append(field('Granularité', p.coverage));
  if (s)
    prov.append(
      link('Source officielle · ' + s.producer, s.source),
      button('Fiche de la source', () => app.navigate('sources', s.id)),
    );
  if (p.sourceUrl) {
    const paragraph = el('p');
    paragraph.append(link('Consulter le producteur', p.sourceUrl));
    prov.append(paragraph);
  }
  body.append(prov);
  const actions = el('div', null, { class: 'actions' });
  const pos = app.anchor(f.geometry);
  if (s && (!f.geometry || (pos && app.contains(pos))))
    actions.append(
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
  if (pos && app.contains(pos))
    actions.append(
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
    actions.append(button('Exporter la couche', () => app.exportSource(s.id)));
  body.append(actions);
}
