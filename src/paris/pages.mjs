import { appendNumericHistory } from './history.mjs';
import { basemaps } from './map.mjs';
import {
  $,
  el,
  button,
  field,
  link,
  fmt,
  toast,
  api,
  stateLabel,
  integrationLabel,
} from './ui.mjs';
export async function page(name, app, focus) {
  const root = $('#page-content');
  root.replaceChildren();
  const grid = el('div', null, { class: 'cards' });
  if (name === 'sources') {
    root.append(
      el('h1', 'Sources et disponibilité'),
      el(
        'p',
        'Intégration et état actuel sont séparés. Une collecte récente ne rajeunit pas une observation. Les heures sont affichées en Europe/Paris.',
        { class: 'page-intro' },
      ),
    );
    const excluded = app.sources.filter((s) => !s.enabled);
    for (const s of app.sources.filter((s) => s.enabled)) {
      const card = el('article', null, { class: 'card', id: 'source-' + s.id });
      card.append(
        el('h2', s.name),
        el('span', integrationLabel[s.integration] || s.integration, {
          class: 'badge',
        }),
        el('span', stateLabel[s.state] || s.state, {
          class:
            'badge ' +
            (['failure', 'stale', 'quota', 'disabled', 'auth_error'].includes(
              s.state,
            )
              ? 'warning'
              : ''),
        }),
        el('p', s.note, { class: 'source-description' }),
      );
      card.append(
        field(
          s.nature === 'reference'
            ? 'Références parisiennes'
            : 'Données actuelles Paris',
          s.nature === 'tiles' || s.onDemand ? 'non applicable' : s.count,
        ),
        field('Couverture', s.coverage),
        field('Producteur', s.producer),
        field(
          'Nature',
          {
            measurement: 'Mesures',
            event: 'Événements datés',
            official_alert: 'Vigilance officielle',
            computed: 'Passages calculés',
            dated_image: 'Acquisitions datées',
            reference: 'Référentiel',
            forecast: 'Prévisions',
            tiles: 'Tuiles de trafic en direct',
            on_demand: 'Consultation à la demande',
          }[s.nature] || s.nature,
        ),
        field('Dernière collecte', fmt(s.collectedAt)),
        field(
          s.onDemand ? 'Cache par arrêt' : 'Fréquence',
          s.refreshSeconds >= 3600
            ? s.refreshSeconds / 3600 + ' h'
            : s.refreshSeconds >= 60
              ? s.refreshSeconds / 60 + ' min'
              : s.refreshSeconds + ' s',
        ),
        field('Licence', s.license),
      );
      const details = el('details');
      details.append(
        el('summary', 'Accès, quotas et preuves'),
        field('Authentification', s.authDescription || 'Sans clé'),
        field(
          'Budget local',
          Math.floor(s.dailyBudget * 0.8) +
            ' appels/jour utilisables, ' +
            s.usedToday +
            ' consommés',
        ),
        field('Quota fournisseur', s.quota),
        field('Cache / rétention', s.cacheRetention),
        field('Archivage choisi', s.retentionDays + ' jours maximum'),
        field('Coût', s.cost),
        field('Schéma', s.schema),
        field(
          'Preuve',
          s.evidence?.[0]?.testedAt
            ? fmt(s.evidence[0].testedAt)
            : 'Test réel non réalisé',
        ),
      );
      if (s.error) details.append(field('Erreur', s.error));
      if (s.auth) details.append(field('Clé serveur attendue', s.auth));
      card.append(details, link('Documentation officielle', s.documentation));
      grid.append(card);
    }
    root.append(grid);
    if (excluded.length) {
      const d = el('details');
      d.append(
        el(
          'summary',
          'Sources non retenues, bloquées ou à développer (' +
            excluded.length +
            ')',
        ),
      );
      for (const s of excluded) {
        const c = el('article', null, { class: 'card' });
        c.append(
          el('h3', s.name),
          el('span', integrationLabel[s.integration] || s.integration, {
            class: 'badge warning',
          }),
          el('p', s.note, { class: 'source-description' }),
          link('Source / documentation officielle', s.documentation),
        );
        d.append(c);
      }
      root.append(d);
    }
    if (focus) {
      const node = $('#source-' + CSS.escape(focus));
      node?.scrollIntoView({ block: 'center' });
      node?.querySelector('details')?.setAttribute('open', '');
    }
    return;
  }
  if (name === 'situation') {
    root.append(
      el('h1', 'Situation à Paris'),
      el(
        'p',
        'Signaux disponibles, bulletins officiels et périodes programmées. Aucun rapprochement n’établit une causalité. Les comptages historiques et références ne représentent pas une activité actuelle.',
        { class: 'page-intro' },
      ),
    );
    for (const s of app.sources.filter(
      (s) =>
        s.enabled && !['reference', 'tiles', 'on_demand'].includes(s.nature),
    )) {
      const card = el('article', null, { class: 'card' });
      card.append(
        el('h2', s.name),
        el('span', stateLabel[s.state], { class: 'badge' }),
        el(
          'p',
          (s.count === null
            ? 'Nombre inconnu'
            : s.count + ' informations concernant Paris') +
            ' · collecte ' +
            fmt(s.collectedAt),
          { class: 'muted' },
        ),
      );
      if (['available', 'empty'].includes(s.state)) {
        await app.load(s.id);
        let rows = app.data.get(s.id) || [];
        if (s.nature === 'official_alert')
          rows = [...rows].sort(
            (a, b) => (b.properties.level || 0) - (a.properties.level || 0),
          );
        for (const f of rows.slice(0, 6)) {
          const p = f.properties;
          card.append(
            button(
              (p.status ? p.status + ' · ' : '') +
                (p.lineName ? 'Ligne ' + p.lineName + ' · ' : '') +
                p.name +
                (p.value !== undefined ? ' · ' + p.value + ' ' + p.unit : ''),
              () => {
                app.navigate('map');
                if (p.lineRef && !f.geometry) app.showLine(p.lineRef);
                else app.select(f);
              },
            ),
          );
        }
      }
      card.append(
        button('Consulter la source', () => app.navigate('sources', s.id)),
      );
      grid.append(card);
    }
    root.append(grid);
    return;
  }
  if (name === 'history') {
    root.append(
      el('h1', 'Historique acquis'),
      el(
        'p',
        'Les archives commencent à la première collecte de cette installation. Aucune relecture antérieure ni donnée fictive. Rétention bornée par source.',
        { class: 'page-intro' },
      ),
    );
    const form = el('form'),
      from = el('input', null, { type: 'date', required: '' }),
      to = el('input', null, { type: 'date', required: '' }),
      source = el('select');
    source.append(el('option', 'Toutes les sources', { value: '' }));
    for (const s of app.sources.filter((s) => s.enabled && s.retentionDays))
      source.append(el('option', s.name, { value: s.id }));
    const parisDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Paris',
    });
    from.value = parisDate.format(Date.now() - 864e5);
    to.value = parisDate.format(Date.now());
    for (const [label, n] of [
      ['Du', from],
      ['Au', to],
      ['Source', source],
    ]) {
      const l = el('label', label);
      l.append(n);
      form.append(l);
    }
    const submit = el('button', 'Afficher les archives', { type: 'submit' }),
      results = el('div');
    form.append(submit);
    root.append(form, results);
    let generation = 0;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ownGeneration = ++generation;
      const q = new URLSearchParams({
        from: app.parisDay(from.value),
        to: app.parisDay(to.value, true),
        source: source.value,
      });
      let rows = [],
        tablePage = 0,
        busy = false,
        info;
      const render = () => {
        results.replaceChildren(
          el('p', info.notice, { class: 'muted' }),
          el(
            'p',
            rows.length +
              ' révisions chargées sur ' +
              info.total +
              '. Les graphiques portent sur les archives chargées ; charger la suite pour compléter la période.',
            { class: 'muted' },
          ),
        );
        const bins = new Map();
        for (const r of rows) {
          const day = parisDate.format(new Date(r.firstSeen));
          bins.set(day, (bins.get(day) || 0) + 1);
        }
        if (rows.length) {
          const chart = el('div', null, {
              class: 'chart',
              'aria-label':
                'Révisions acquises par jour parmi les archives chargées',
            }),
            max = Math.max(...bins.values());
          for (const [day, count] of [...bins].sort()) {
            const bar = el('span', null, {
              title: day + ' : ' + count + ' révisions',
            });
            bar.style.height = (count / max) * 100 + '%';
            chart.append(bar);
          }
          results.append(chart);
        } else
          results.append(el('p', 'Aucune archive acquise pour cette période.'));
        const table = el('table'),
          head = el('tr');
        for (const v of [
          'Donnée',
          'Date événement / observation',
          'Première acquisition',
        ])
          head.append(el('th', v));
        table.append(head);
        const begin = tablePage * 100;
        for (const r of rows.slice(begin, begin + 100)) {
          const tr = el('tr'),
            p = r.feature.properties;
          for (const v of [
            p.name,
            fmt(p.observedAt || p.validFrom || p.publishedAt),
            fmt(r.firstSeen),
          ])
            tr.append(el('td', v));
          table.append(tr);
        }
        results.append(table);
        if (rows.length) {
          const controls = el('div', null, { class: 'actions' });
          controls.append(
            el(
              'span',
              begin +
                1 +
                '–' +
                Math.min(begin + 100, rows.length) +
                ' / ' +
                rows.length +
                ' archives chargées',
            ),
          );
          if (tablePage > 0)
            controls.append(
              button('100 précédentes', () => {
                tablePage--;
                render();
              }),
            );
          if (begin + 100 < rows.length)
            controls.append(
              button('100 suivantes', () => {
                tablePage++;
                render();
              }),
            );
          results.append(controls);
        }
        appendNumericHistory(results, rows);
        if (info.nextOffset !== null) {
          const more = button(
            'Charger les archives suivantes (1 000 maximum)',
            () => load(info.nextOffset),
          );
          more.disabled = busy;
          results.append(more);
        }
      };
      const load = async (offset) => {
        if (busy) return;
        busy = true;
        try {
          q.set('offset', String(offset));
          const j = await api('/api/history?' + q);
          if (ownGeneration !== generation) return;
          info = j;
          rows.push(...j.rows);
          render();
        } catch (error) {
          toast(error.message);
        } finally {
          busy = false;
          if (info && ownGeneration === generation) render();
        }
      };
      await load(0);
    });
    form.requestSubmit();
    return;
  }
  if (name === 'settings') {
    root.append(
      el('h1', 'Réglages'),
      el(
        'p',
        'Préférences personnelles. Les secrets et autorisations payantes sont configurés sur le serveur par l’administrateur.',
        { class: 'page-intro' },
      ),
    );
    const c = el('article', null, { class: 'card' });
    c.append(el('h2', 'Fond cartographique'));
    const maps = el('select', null, { 'aria-label': 'Fond cartographique' });
    for (const [id, b] of Object.entries(basemaps))
      maps.append(el('option', b.label + ' — ' + b.hint, { value: id }));
    maps.value = app.mapSource;
    maps.addEventListener('change', () => app.setBasemap(maps.value));
    c.append(maps);
    const advanced = el('details');
    advanced.append(el('summary', 'Options avancées'));
    const effect = el('select', null, { 'aria-label': 'Effet graphique' });
    for (const [id, name] of [
      ['', 'Aucun effet'],
      ['night', 'Vision nocturne — effet graphique'],
      ['thermal', 'Thermique — effet graphique'],
    ])
      effect.append(el('option', name, { value: id }));
    effect.addEventListener('change', () => {
      document.body.classList.remove('effect-night', 'effect-thermal');
      if (effect.value) document.body.classList.add('effect-' + effect.value);
    });
    advanced.append(
      effect,
      el(
        'p',
        'Ces effets sont des filtres graphiques, pas des capteurs. Simulations, vidéo supposée en direct, assistant IA et lecture audio sont désactivés.',
        { class: 'source-description' },
      ),
    );
    c.append(advanced);
    grid.append(c);
    const annotations = await api('/api/annotations');
    const a = el('article', null, { class: 'card' });
    a.append(el('h2', 'Annotations personnelles'));
    if (!annotations.length)
      a.append(
        el(
          'p',
          'Sélectionner un objet sur la carte pour annoter son emplacement.',
        ),
      );
    for (const n of annotations) {
      a.append(
        el('p', n.text),
        el('small', fmt(n.createdAt)),
        button('Supprimer cette annotation', async () => {
          await api('/api/annotations', {
            method: 'DELETE',
            data: { id: n.id },
          });
          page('settings', app);
        }),
      );
    }
    grid.append(a);
    if (app.me.role === 'admin') {
      const j = await api('/api/admin'),
        admin = el('article', null, { class: 'card' });
      admin.append(
        el('h2', 'Administration'),
        el('p', j.notice, { class: 'source-description' }),
      );
      for (const p of j.providers)
        admin.append(
          field(p.variable, p.configured ? 'Configurée' : 'Manquante'),
        );
      grid.append(admin);
    }
    root.append(
      grid,
      button('Se déconnecter', async () => {
        await api('/api/logout', { method: 'POST', data: {} });
        location.assign('/login.html');
      }),
    );
  }
}
