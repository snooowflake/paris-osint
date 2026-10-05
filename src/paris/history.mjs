import { el, fmt } from './ui.mjs';
export function numericSeries(rows) {
  const groups = new Map();
  for (const r of rows) {
    const f = r.feature,
      p = f?.properties;
    if (
      p?.source !== 'hubeau' ||
      !Number.isFinite(p.value) ||
      !Number.isFinite(Date.parse(p.observedAt))
    )
      continue;
    const key = f.id + '|' + p.unit;
    if (!groups.has(key))
      groups.set(key, {
        name: p.name + ' — ' + p.kind,
        unit: p.unit,
        reference: p.reference,
        points: new Map(),
      });
    const group = groups.get(key),
      previous = group.points.get(p.observedAt);
    const acquired = Date.parse(r.lastSeen || p.collectedAt) || 0;
    if (!previous || acquired >= previous.acquired)
      group.points.set(p.observedAt, {
        at: p.observedAt,
        value: p.value,
        acquired,
      });
  }
  return [...groups.values()].map((g) => ({
    ...g,
    points: [...g.points.values()].sort(
      (a, b) => Date.parse(a.at) - Date.parse(b.at),
    ),
  }));
}
export function appendNumericHistory(root, rows) {
  const groups = numericSeries(rows);
  if (!groups.length) return;
  const card = el('article', null, { class: 'card' }),
    choose = el('select', null, {
      'aria-label': 'Station et grandeur hydrométrique',
    }),
    plot = el('div');
  groups.forEach((g, i) =>
    choose.append(el('option', g.name + ' · ' + g.unit, { value: String(i) })),
  );
  card.append(el('h2', 'Observations hydrométriques acquises'), choose, plot);
  root.append(card);
  const draw = () => {
    const g = groups[Number(choose.value) || 0],
      ps = g.points;
    plot.replaceChildren(
      el('p', g.reference || 'Référentiel inconnu', { class: 'muted' }),
    );
    if (ps.length < 2) {
      plot.append(
        el(
          'p',
          'Une seule observation acquise : aucune courbe antérieure disponible.',
        ),
      );
      return;
    }
    const t0 = Date.parse(ps[0].at),
      dt = Date.parse(ps.at(-1).at) - t0 || 1,
      lo = Math.min(...ps.map((p) => p.value)),
      hi = Math.max(...ps.map((p) => p.value)),
      dy = hi - lo || 1;
    const ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 600 160');
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      g.name + ' du ' + fmt(ps[0].at) + ' au ' + fmt(ps.at(-1).at),
    );
    svg.style.width = '100%';
    svg.style.maxHeight = '220px';
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute(
      'points',
      ps
        .map(
          (p) =>
            20 +
            ((Date.parse(p.at) - t0) / dt) * 560 +
            ',' +
            (140 - ((p.value - lo) / dy) * 120),
        )
        .join(' '),
    );
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#80dfb2');
    line.setAttribute('stroke-width', '2');
    svg.append(line);
    for (const p of ps) {
      const c = document.createElementNS(ns, 'circle'),
        title = document.createElementNS(ns, 'title');
      c.setAttribute('cx', String(20 + ((Date.parse(p.at) - t0) / dt) * 560));
      c.setAttribute('cy', String(140 - ((p.value - lo) / dy) * 120));
      c.setAttribute('r', '3');
      c.setAttribute('fill', '#e8fff3');
      title.textContent = fmt(p.at) + ' : ' + p.value + ' ' + g.unit;
      c.append(title);
      svg.append(c);
    }
    plot.append(
      svg,
      el(
        'p',
        'Min. ' +
          lo +
          ' · max. ' +
          hi +
          ' ' +
          g.unit +
          ' · ' +
          ps.length +
          ' observations réellement acquises',
        { class: 'muted' },
      ),
      el(
        'p',
        'Les segments relient les points archivés ; les valeurs intermédiaires ne sont pas mesurées.',
        { class: 'source-description' },
      ),
    );
  };
  choose.addEventListener('change', draw);
  draw();
}
