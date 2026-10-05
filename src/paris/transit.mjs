import { el, button, fmt, hm, ago, api, chip } from './ui.mjs';
import { modes, severity, causes, textOn, hexColor } from './model.mjs';
import { bounds } from './map.mjs';
const modeColor = {
  bus: '#1E6FD9',
  tram: '#6E6E6E',
  train: '#5A6872',
  rer: '#5A6872',
};
// Catalogue des lignes : tracés (couleurs officielles) puis arrêts (bus compris).
export function lineCatalog(app) {
  const lines = new Map();
  for (const f of app.data.get('idfm-traces') || []) {
    const p = f.properties;
    if (!p.lineRef || lines.has(p.lineRef)) continue;
    lines.set(p.lineRef, {
      ref: p.lineRef,
      name: p.line || p.name,
      mode: p.mode,
      color: hexColor(p.color),
      label: p.name,
    });
  }
  for (const f of app.data.get('idfm-lignes') || [])
    for (const l of f.properties.lines || [])
      if (!lines.has(l.ref)) lines.set(l.ref, { ...l, label: l.longName });
  for (const l of lines.values()) {
    l.color ||= modeColor[l.mode] || '#5A6872';
    l.text = textOn(l.color);
  }
  return lines;
}
export function disruptionsByLine(app) {
  const by = new Map();
  for (const f of app.data.get('prim-perturbations') || []) {
    const ref = f.properties.lineRef;
    if (!by.has(ref)) by.set(ref, []);
    by.get(ref).push(f);
  }
  for (const rows of by.values())
    rows.sort(
      (a, b) =>
        severity(b.properties.severity).rank -
        severity(a.properties.severity).rank,
    );
  return by;
}
const worst = (rows) =>
  rows?.length ? severity(rows[0].properties.severity) : null;
// Panneau « État du trafic » : métro, RER, tram, train desservant Paris.
export function renderTransitStatus(root, app) {
  root.replaceChildren();
  const source = app.sources.find((s) => s.id === 'prim-perturbations'),
    live = source && ['available', 'empty'].includes(source.state),
    catalog = lineCatalog(app),
    by = disruptionsByLine(app);
  const head = el('div', null, { class: 'status-head' });
  head.append(el('h3', 'État du trafic'));
  head.append(
    el(
      'span',
      live
        ? 'PRIM · ' + ago(source.collectedAt)
        : source?.integration === 'missing_key'
          ? 'Clé PRIM à configurer'
          : 'Info trafic indisponible',
      { class: 'muted' },
    ),
  );
  root.append(head);
  let shown = 0;
  for (const mode of ['metro', 'rer', 'tram', 'train']) {
    const group = [...catalog.values()]
      .filter((l) => l.mode === mode && app.tracedLines?.has(l.ref))
      .sort((a, b) =>
        String(a.name).localeCompare(String(b.name), 'fr', { numeric: true }),
      );
    if (!group.length) continue;
    const row = el('div', null, { class: 'mode-row' }),
      chips = el('div', null, { class: 'chips' });
    row.append(el('span', modes[mode].label, { class: 'mode-name' }));
    for (const l of group) {
      const w = live ? worst(by.get(l.ref)) : null,
        b = button('', () => showLine(app, l.ref));
      b.className = 'chip-button';
      b.append(chip(l, { status: w?.rank }));
      b.setAttribute(
        'aria-label',
        modes[mode].label +
          ' ' +
          l.name +
          ' : ' +
          (w ? w.label : live ? 'aucune perturbation publiée' : 'état inconnu'),
      );
      b.title = b.getAttribute('aria-label');
      chips.append(b);
      shown++;
    }
    row.append(chips);
    root.append(row);
  }
  if (!shown)
    root.append(
      el(
        'p',
        'Activer « Métro, RER, tram et train » pour afficher les lignes.',
        { class: 'muted' },
      ),
    );
  else if (live) {
    const n = [...by.keys()].filter((r) => app.tracedLines?.has(r)).length;
    root.append(
      el(
        'p',
        n
          ? n +
              ' ligne(s) avec une information publiée. Pastille rouge : interrompu ; orange : perturbé ; bleue : information.'
          : 'Aucune perturbation publiée sur ces lignes.',
        { class: 'muted' },
      ),
    );
  }
}
function disruptionItem(f) {
  const p = f.properties,
    sev = severity(p.severity),
    item = el('article', null, { class: 'disruption' });
  const pill = el('span', sev.label, { class: 'pill' });
  pill.style.setProperty('--c', sev.color);
  item.append(pill);
  if (causes[p.cause])
    item.append(el('span', causes[p.cause], { class: 'pill quiet' }));
  item.append(el('h4', p.name));
  item.append(
    el(
      'p',
      (p.validFrom ? 'Depuis ' + fmt(p.validFrom) : '') +
        (p.validTo ? ' · jusqu’au ' + fmt(p.validTo) : ''),
      { class: 'muted' },
    ),
  );
  if (p.description && p.description !== p.name) {
    const d = el('details');
    d.append(el('summary', 'Message du transporteur'), el('p', p.description));
    item.append(d);
  }
  if (p.stops?.length)
    item.append(
      el('p', 'Arrêts concernés : ' + p.stops.join(', '), { class: 'muted' }),
    );
  return item;
}
// Fiche d’une ligne : tracé mis en avant et perturbations publiées.
export function showLine(app, ref) {
  const line = lineCatalog(app).get(ref),
    rows = disruptionsByLine(app).get(ref) || [],
    source = app.sources.find((s) => s.id === 'prim-perturbations'),
    traces = (app.data.get('idfm-traces') || []).filter(
      (f) => f.properties.lineRef === ref,
    );
  const card = app.openCard(
    (line ? modes[line.mode]?.label + ' ' + line.name : 'Ligne') || 'Ligne',
    line?.label || 'Île-de-France Mobilités',
    line ? chip(line) : null,
  );
  if (!source || !['available', 'empty'].includes(source.state))
    card.append(
      el(
        'p',
        source?.integration === 'missing_key'
          ? 'Info trafic en direct non configurée : l’administrateur doit renseigner la clé PRIM (compte gratuit Île-de-France Mobilités).'
          : 'Info trafic momentanément indisponible ; consulter Sources.',
        { class: 'notice' },
      ),
    );
  else if (!rows.length)
    card.append(
      el('p', 'Aucune perturbation publiée pour cette ligne.', {
        class: 'notice ok',
      }),
      el('p', 'Source PRIM · ' + ago(source.collectedAt), { class: 'muted' }),
    );
  else {
    for (const f of rows) card.append(disruptionItem(f));
    card.append(
      el('p', 'Source PRIM · ' + ago(source.collectedAt), { class: 'muted' }),
    );
  }
  if (traces.length) {
    app.renderer.emphasize(traces);
    const r = traces
      .map((f) => bounds(f.geometry))
      .filter(Boolean)
      .reduce((a, b) => [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[2]),
        Math.max(a[3], b[3]),
      ]);
    app.map.flyToRect(r);
  }
}
const statusLabel = {
  DELAYED: 'Retard',
  CANCELLED: 'Supprimé',
  EARLY: 'En avance',
  MISSED: 'Manqué',
  NOTEXPECTED: 'Non prévu',
};
// Lignes théoriques d’un arrêt : même identifiant, sinon même nom à moins de 150 m.
export function stopLines(app, f) {
  const code = f.properties.code,
    name = f.properties.name.toLocaleLowerCase('fr'),
    [x, y] = f.geometry.coordinates,
    found = new Map();
  for (const s of app.data.get('idfm-lignes') || []) {
    const [sx, sy] = s.geometry.coordinates;
    if (
      s.properties.code === code ||
      (s.properties.name?.toLocaleLowerCase('fr') === name &&
        Math.abs(sx - x) < 0.002 &&
        Math.abs(sy - y) < 0.0014)
    )
      for (const l of s.properties.lines) found.set(l.ref, l);
  }
  const catalog = lineCatalog(app);
  return [...found.values()]
    .map((l) => catalog.get(l.ref) || l)
    .sort(
      (a, b) =>
        modes[a.mode].order - modes[b.mode].order ||
        String(a.name).localeCompare(String(b.name), 'fr', { numeric: true }),
    );
}
// Section de fiche d’arrêt : lignes desservies et prochains passages PRIM.
export function stopSection(app, f, card) {
  const lines = stopLines(app, f),
    by = disruptionsByLine(app);
  if (lines.length) {
    const wrap = el('div', null, { class: 'chips stop-lines' });
    for (const l of lines) {
      const b = button('', () => showLine(app, l.ref));
      b.className = 'chip-button';
      b.append(chip(l, { status: worst(by.get(l.ref))?.rank }));
      b.title = modes[l.mode].label + ' ' + l.name;
      wrap.append(b);
    }
    card.append(el('h3', 'Lignes desservies'), wrap);
  }
  const source = app.sources.find((s) => s.id === 'prim-passages'),
    box = el('section', null, { class: 'departures' });
  card.append(box);
  if (!source || source.state === 'disabled' || !f.properties.code) {
    box.append(
      el('h3', 'Prochains passages'),
      el(
        'p',
        source?.integration === 'missing_key'
          ? 'Temps réel non configuré : l’administrateur doit renseigner la clé PRIM.'
          : 'Temps réel indisponible pour cet arrêt.',
        { class: 'notice' },
      ),
    );
    return;
  }
  const catalog = lineCatalog(app),
    stopId = f.properties.code;
  const load = async () => {
    if (!box.isConnected && box.dataset.loaded) return stop();
    try {
      const j = await api('/api/departures?stop=' + encodeURIComponent(stopId));
      box.dataset.loaded = '1';
      box.replaceChildren(el('h3', 'Prochains passages'));
      if (!j.departures.length)
        box.append(
          el('p', 'Aucun passage publié dans l’immédiat.', { class: 'muted' }),
        );
      const list = el('ul', null, { class: 'departure-list' });
      for (const d of j.departures.slice(0, 12)) {
        const li = el('li'),
          at = d.expectedAt || d.aimedAt,
          min = Math.round((Date.parse(at) - Date.now()) / 60000),
          line = catalog.get(d.lineRef) || {
            name: '?',
            mode: 'other',
            color: '#5A6872',
            text: '#FFFFFF',
          };
        li.append(
          chip(line),
          el('span', d.destination || 'Destination non publiée', {
            class: 'dest',
          }),
          el(
            'span',
            d.atStop
              ? 'À quai'
              : min <= 0
                ? 'À l’approche'
                : min < 60
                  ? min + ' min'
                  : hm(at),
            { class: 'when' + (d.expectedAt ? ' live' : '') },
          ),
        );
        if (statusLabel[d.status])
          li.append(el('span', statusLabel[d.status], { class: 'pill quiet' }));
        list.append(li);
      }
      box.append(
        list,
        el(
          'p',
          'Horaires attendus publiés par l’opérateur (PRIM) · ' +
            ago(j.collectedAt) +
            '. Minutes en vert : temps réel ; sinon horaire théorique.',
          { class: 'muted' },
        ),
      );
    } catch (e) {
      box.replaceChildren(
        el('h3', 'Prochains passages'),
        el('p', e.message, { class: 'notice' }),
      );
    }
  };
  let timer = setInterval(() => {
    if (!document.hidden) load();
  }, 30000);
  const stop = () => clearInterval(timer);
  app.onCardClose = stop;
  box.append(
    el('h3', 'Prochains passages'),
    el('p', 'Chargement…', { class: 'muted' }),
  );
  load();
}
