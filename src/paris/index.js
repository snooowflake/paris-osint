import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { contains, parisDay } from './geo.mjs';
import {
  $,
  el,
  button,
  toast,
  api,
  setCsrf,
  askText,
  ago,
  hm,
  stateLabel,
} from './ui.mjs';
import { page } from './pages.mjs';
import { objectCard, openCard, closeCard } from './objects.mjs';
import { createMap, bounds, basemaps, parisRect } from './map.mjs';
import { createRenderer, anchorOf, roadColors } from './render.mjs';
import { renderTransitStatus, showLine } from './transit.mjs';
import { traffic, perturbation } from './model.mjs';
import { badge } from './icons.mjs';
// Couches de la carte, regroupées comme dans un plan grand public.
const groups = [
  {
    title: 'Circulation',
    ids: ['tomtom-flow', 'comptages-route', 'pc-lutece', 'travaux', 'tomtom'],
  },
  { title: 'Transports en commun', ids: ['idfm-traces', 'idfm-arrets'] },
  { title: 'Vélo', ids: ['velib'] },
  { title: 'Seine', ids: ['hubeau'] },
  { title: 'Événements et images', ids: ['agenda', 'sentinel'] },
];
// Deux représentations du trafic : une seule à la fois.
const exclusive = [['tomtom-flow', 'comptages-route']];
// Données utiles même sans affichage (lignes, arrêts, info trafic).
const context = ['idfm-traces', 'idfm-lignes', 'prim-perturbations'];
const icons = {
  'tomtom-flow': ['gradient'],
  'comptages-route': ['gradient'],
  'pc-lutece': ['badge', 'closure', roadColors.closure],
  travaux: ['badge', 'works', perturbation[2].color],
  tomtom: ['badge', 'incident', '#C2185B'],
  'idfm-traces': ['line'],
  'idfm-arrets': ['dot', '#FFFFFF', '#2B3136'],
  velib: ['dot', '#2EAA4A', '#FFFFFF'],
  hubeau: ['badge', 'water', '#1F78C8'],
  agenda: ['badge', 'agenda', '#8E44AD'],
  sentinel: ['dash'],
};
function swatch(id) {
  const [kind, a, b] = icons[id] || ['dot', '#7DDCB3', '#FFFFFF'],
    n = el('span', null, {
      class: 'swatch swatch-' + kind,
      'aria-hidden': 'true',
    });
  if (kind === 'badge') {
    const img = el('img', null, { src: badge(a, b).url, alt: '' });
    n.append(img);
  } else if (kind === 'dot') {
    n.style.setProperty('--c', a);
    n.style.setProperty('--o', b);
  }
  return n;
}
async function start() {
  const limit = await fetch('/boundary.json').then((r) => r.json());
  const app = {
    boundary: limit.geometry,
    sources: [],
    data: new Map(),
    pending: new Map(),
    drawn: new Map(),
    contains: (p) => contains(p, limit.geometry),
    parisDay,
    me: await api('/api/me'),
    preferences: await api('/api/preferences'),
    currentPage: 'map',
  };
  setCsrf(app.me.csrf);
  app.openCard = (...a) => openCard(app, ...a);
  app.anchor = anchorOf;
  const map = createMap(app);
  app.map = map;
  app.viewer = map.viewer;
  app.renderer = createRenderer(map, app);
  const viewer = map.viewer;
  app.mapSource = map.basemap;
  app.setBasemap = (id) => {
    map.setBasemap(id);
    app.mapSource = map.basemap;
    renderBasemapMenu();
  };
  app.recenter = () => map.recenter();
  map.recenter(0);
  const source = (id) => app.sources.find((s) => s.id === id);
  const usable = (s) =>
    s?.enabled &&
    s.integration === 'verified' &&
    ['available', 'empty'].includes(s.state);
  app.effective = () => {
    const on = new Set(
      app.preferences.layers.filter((id) => usable(source(id))),
    );
    for (const [a, b] of exclusive) if (on.has(a) && on.has(b)) on.delete(b);
    return on;
  };
  app.navigate = (name, focus) => {
    app.currentPage = name;
    for (const b of document.querySelectorAll('[data-nav]'))
      b.setAttribute('aria-current', b.dataset.nav === name ? 'page' : 'false');
    $('#map-page').hidden = name !== 'map';
    $('#content-page').hidden = name === 'map';
    if (name === 'map') {
      viewer.resize();
      viewer.scene.requestRender();
    } else {
      page(name, app, focus).catch((e) => toast(e.message));
      $('#content-page').focus();
    }
  };
  app.select = (f, { fly = true } = {}) => {
    objectCard(f, app);
    app.renderer.highlight(f);
    const r = f.geometry && bounds(f.geometry);
    if (!fly || !r || !app.contains(app.anchor(f.geometry))) return;
    const pad = f.geometry.type === 'Point' ? 0.004 : 0;
    map.flyToRect([r[0] - pad, r[1] - pad * 0.7, r[2] + pad, r[3] + pad * 0.7]);
  };
  app.savePreferences = async () => {
    app.preferences = await api('/api/preferences', {
      method: 'POST',
      data: app.preferences,
    });
    renderFavorites();
  };
  app.exportSource = async (id) => {
    try {
      const j = await api('/api/export?source=' + encodeURIComponent(id));
      const u = URL.createObjectURL(
        new Blob([JSON.stringify(j, null, 2)], {
          type: 'application/geo+json',
        }),
      );
      const a = el('a', null, {
        href: u,
        download: 'paris-' + id + '.geojson',
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch (e) {
      toast(e.message);
    }
  };
  app.load = async (id) => {
    if (app.pending.has(id)) return app.pending.get(id);
    const p = (async () => {
      const features = [];
      let offset = 0,
        total = 1;
      while (offset < total) {
        const q = new URLSearchParams({
          source: id,
          offset: String(offset),
          limit: '1000',
        });
        const j = await api('/api/features?' + q);
        if (!Array.isArray(j.features) || j.total > 10000 || j.total < 0)
          throw Error('Schéma de couche invalide');
        features.push(...j.features);
        total = j.total;
        if (!j.features.length && offset < total)
          throw Error('Pagination incomplète');
        offset += j.features.length;
      }
      app.data.set(id, features);
      app.loaded.set(id, source(id)?.collectedAt);
      if (id === 'idfm-traces')
        app.tracedLines = new Set(
          features.map((f) => f.properties.lineRef).filter(Boolean),
        );
    })().finally(() => app.pending.delete(id));
    app.pending.set(id, p);
    return p;
  };
  app.loaded = new Map();
  const fresh = (id) =>
    app.data.has(id) && app.loaded.get(id) === source(id)?.collectedAt;
  // Rendu : n’actualise une couche que si sa collecte a changé.
  app.sync = async () => {
    const want = app.effective();
    for (const id of [...app.drawn.keys()])
      if (!want.has(id)) {
        app.renderer.clear(id);
        app.drawn.delete(id);
      }
    await Promise.all(
      [...want].map(async (id) => {
        const s = source(id),
          stamp = s.nature === 'tiles' ? 'tiles' : s.collectedAt;
        if (app.drawn.get(id) === stamp) return;
        try {
          if (s.nature !== 'tiles' && !fresh(id)) await app.load(id);
          if (!app.effective().has(id)) return;
          app.renderer.draw(id, app.data.get(id) || []);
          app.drawn.set(id, stamp);
        } catch (e) {
          toast(s.name + ' : ' + e.message);
        }
      }),
    );
    renderLegend();
  };
  const toggle = async (id, on) => {
    const layers = new Set(app.preferences.layers);
    if (on) {
      layers.add(id);
      for (const pair of exclusive)
        if (pair.includes(id))
          for (const other of pair)
            if (other !== id && layers.delete(other) && usable(source(other)))
              toast(
                source(id).name +
                  ' affiché ; ' +
                  source(other).name +
                  ' masqué.',
              );
    } else layers.delete(id);
    app.preferences.layers = [...layers];
    renderLayers();
    await app.sync();
    await app.savePreferences();
  };
  function meta(s) {
    const rows = app.data.get(s.id) || [];
    switch (s.id) {
      case 'tomtom-flow':
        return 'En direct · vitesses mesurées par TomTom';
      case 'comptages-route': {
        const at = rows[0]?.properties.observedAt;
        return at
          ? 'Veille à ' + hm(at) + ' · capteurs, pas du direct'
          : 'Mesures de la veille (J-1)';
      }
      case 'pc-lutece':
        return 'Fermetures, chantiers, incidents · ' + ago(s.collectedAt);
      case 'travaux':
        return 'Chantiers perturbants · publication hebdomadaire';
      case 'tomtom':
        return 'Incidents signalés · ' + ago(s.collectedAt);
      case 'idfm-traces':
        return 'Plan du réseau · couleurs officielles';
      case 'idfm-arrets':
        return usable(source('prim-passages')) ||
          source('prim-passages')?.state === 'on_demand'
          ? 'Cliquer une station : prochains passages'
          : 'Stations et arrêts de bus';
      case 'velib':
        return 'Vélos disponibles · ' + ago(s.collectedAt);
      case 'hubeau':
        return 'Hauteurs et débits · ' + ago(s.collectedAt);
      case 'agenda':
        return 'Événements programmés';
      case 'sentinel':
        return 'Empreintes d’acquisitions datées';
      default:
        return ago(s.collectedAt);
    }
  }
  function reason(s) {
    if (s.integration === 'missing_key')
      return 'Clé serveur ' + s.auth + ' à configurer';
    if (s.state === 'disabled' && s.integration === 'implemented_unverified')
      return 'En attente de la première collecte';
    return stateLabel[s.state] || 'Indisponible';
  }
  function renderLayers() {
    const root = $('#layer-list');
    root.replaceChildren();
    const on = app.effective();
    let unavailable = 0;
    for (const g of groups) {
      const list = g.ids.map(source).filter((s) => s?.enabled && s.map);
      if (!list.length) continue;
      const section = el('section', null, { class: 'layer-group' });
      section.append(el('h2', g.title, { class: 'theme-title' }));
      for (const s of list) {
        const ok = usable(s),
          row = el('div', null, { class: 'layer-row' + (ok ? '' : ' off') }),
          label = el('label', null, { class: 'layer-label' }),
          input = el('input', null, {
            type: 'checkbox',
            role: 'switch',
            'aria-label': s.name,
          });
        input.checked = on.has(s.id);
        input.disabled = !ok;
        input.addEventListener('change', () =>
          toggle(s.id, input.checked).catch((e) => toast(e.message)),
        );
        const text = el('span', null, { class: 'layer-text' });
        text.append(
          el('span', s.name, { class: 'layer-name' }),
          el('span', ok ? meta(s) : reason(s), { class: 'layer-meta' }),
        );
        label.append(swatch(s.id), text);
        if (ok && Number.isInteger(s.count))
          label.append(el('span', String(s.count), { class: 'count' }));
        label.append(input);
        const info = button('Source', () => app.navigate('sources', s.id));
        info.className = 'layer-info';
        info.setAttribute('aria-label', 'Source et fraîcheur : ' + s.name);
        row.append(label, info);
        section.append(row);
        if (!ok) unavailable++;
      }
      if (g.title === 'Transports en commun') {
        const status = el('div', null, { class: 'transit-status' });
        renderTransitStatus(status, app);
        section.append(status);
      }
      root.append(section);
    }
    $('#map-status').textContent = unavailable
      ? unavailable +
        ' couche(s) en attente de clé ou indisponible(s) · détails dans Sources'
      : 'Toutes les couches sont disponibles';
  }
  function renderLegend() {
    const root = $('#map-legend'),
      on = app.effective();
    root.replaceChildren();
    const live = on.has('tomtom-flow'),
      j1 = on.has('comptages-route');
    if (live || j1) {
      const row = el('div', null, { class: 'legend-traffic' });
      row.append(
        el('span', live ? 'Trafic en direct' : 'Trafic de la veille', {
          class: 'legend-title',
        }),
      );
      const scale = el('span', null, { class: 'scale' });
      for (const k of ['fluide', 'dense', 'sature', 'bloque']) {
        const s = el('span', null, { title: traffic[k].label });
        s.style.background = traffic[k].color;
        scale.append(s);
      }
      row.append(
        el('span', 'Fluide', { class: 'muted' }),
        scale,
        el('span', 'Bloqué', { class: 'muted' }),
      );
      if (j1 && !live) {
        const at = app.data.get('comptages-route')?.[0]?.properties.observedAt;
        row.append(
          el('span', at ? '· mesuré à ' + hm(at) + ' (J-1)' : '· J-1', {
            class: 'muted',
          }),
        );
      }
      root.append(row);
    }
    const items = [];
    if (on.has('pc-lutece') || on.has('tomtom')) {
      items.push(['closure', 'Voie fermée']);
      items.push(['event', 'Événement / incident']);
    }
    if (on.has('travaux')) items.push(['works', 'Travaux perturbants']);
    if (on.has('idfm-arrets'))
      items.push(['station', 'Station'], ['bus', 'Arrêt de bus']);
    if (on.has('velib'))
      items.push(['velib', 'Vélib’ : vert ≥ 5, orange 1–4, rouge 0']);
    if (items.length) {
      const row = el('div', null, { class: 'legend-items' });
      for (const [k, text] of items) {
        const i = el('span', null, { class: 'legend-item' });
        i.append(
          el('span', null, { class: 'key key-' + k, 'aria-hidden': 'true' }),
          el('span', text),
        );
        row.append(i);
      }
      root.append(row);
    }
    root.hidden = !root.childElementCount;
  }
  function renderBasemapMenu() {
    const menu = $('#basemap-menu');
    menu.replaceChildren(el('h3', 'Fond de carte'));
    for (const [id, b] of Object.entries(basemaps)) {
      const opt = button('', () => {
        app.setBasemap(id);
        menu.hidden = true;
        $('#basemap-toggle').setAttribute('aria-expanded', 'false');
      });
      opt.className = 'basemap-option';
      opt.setAttribute('aria-pressed', String(map.basemap === id));
      opt.append(el('strong', b.label), el('span', b.hint, { class: 'muted' }));
      menu.append(opt);
    }
  }
  function renderFavorites() {
    const f = $('#favorites-list'),
      v = $('#views-list');
    f.replaceChildren();
    v.replaceChildren();
    for (const favorite of app.preferences.favorites) {
      const row = el('div', null, { class: 'view-row' });
      row.append(
        button(favorite.name, async () => {
          await app.load(favorite.source);
          const object = app.data
            .get(favorite.source)
            ?.find((x) => x.id === favorite.id);
          if (object) app.select(object);
          else toast('Objet absent du cache actuel ; consulter Sources.');
        }),
        button('Retirer', async () => {
          app.preferences.favorites = app.preferences.favorites.filter(
            (x) => x !== favorite,
          );
          await app.savePreferences();
        }),
      );
      f.append(row);
    }
    for (const saved of app.preferences.views) {
      const row = el('div', null, { class: 'view-row' });
      row.append(
        button(saved.name, () =>
          viewer.camera.flyToBoundingSphere(
            new Cesium.BoundingSphere(
              Cesium.Cartesian3.fromDegrees(saved.lon, saved.lat),
              1,
            ),
            {
              offset: new Cesium.HeadingPitchRange(
                saved.heading,
                saved.pitch,
                saved.range,
              ),
              duration: 0.6,
            },
          ),
        ),
        button('Retirer', async () => {
          app.preferences.views = app.preferences.views.filter(
            (x) => x !== saved,
          );
          await app.savePreferences();
        }),
      );
      v.append(row);
    }
  }
  async function refresh() {
    const j = await api('/api/sources');
    app.sources = j.sources;
    await Promise.all(
      context
        .filter((id) => usable(source(id)) && !fresh(id))
        .map((id) => app.load(id).catch(() => {})),
    );
    renderLayers();
    renderFavorites();
    await app.sync();
    renderLayers();
    if (app.currentPage !== 'map')
      page(app.currentPage, app).catch((e) => toast(e.message));
  }
  app.refresh = refresh;
  for (const b of document.querySelectorAll('[data-nav]'))
    b.addEventListener('click', () => app.navigate(b.dataset.nav));
  $('#back-map').addEventListener('click', () => app.navigate('map'));
  $('#recenter').addEventListener('click', () => map.recenter());
  $('#zoom-in').addEventListener('click', () => map.zoom(0.5));
  $('#zoom-out').addEventListener('click', () => map.zoom(2));
  $('#compass').addEventListener('click', () => map.north());
  $('#view-mode').addEventListener('click', () =>
    map.setMode(map.mode === '3d' ? 'plan' : '3d'),
  );
  app.onMode = (mode) => {
    const b = $('#view-mode');
    b.setAttribute('aria-pressed', String(mode === '3d'));
    b.textContent = mode === '3d' ? '2D' : '3D';
    b.title =
      mode === '3d' ? 'Revenir à la vue de dessus' : 'Vue inclinée en 3D';
  };
  $('#basemap-toggle').addEventListener('click', () => {
    const menu = $('#basemap-menu');
    menu.hidden = !menu.hidden;
    $('#basemap-toggle').setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('[aria-pressed="true"]')?.focus();
  });
  renderBasemapMenu();
  const needle = $('#compass .needle');
  viewer.camera.changed.addEventListener(() => {
    needle.style.transform =
      'rotate(' + -Cesium.Math.toDegrees(viewer.camera.heading) + 'deg)';
  });
  $('#show-layers').addEventListener('click', () =>
    $('#layers').classList.add('open'),
  );
  $('#close-layers').addEventListener('click', () =>
    $('#layers').classList.remove('open'),
  );
  $('#refresh').addEventListener('click', async () => {
    await api('/api/refresh', { method: 'POST', data: {} });
    await refresh();
    toast('Cache partagé relu ; fréquence des fournisseurs conservée.');
  });
  $('#save-view').addEventListener('click', async () => {
    const c = map.center();
    if (!c) return toast('Recentrer Paris avant de sauvegarder.');
    if (!app.contains([c.lon, c.lat]))
      return toast('Les vues enregistrées restent dans Paris.');
    const name = await askText('Nom de la vue parisienne');
    if (!name) return;
    app.preferences.views.push({
      name: name.slice(0, 100),
      lon: c.lon,
      lat: c.lat,
      range: Math.max(
        500,
        Math.min(
          60000,
          Cesium.Cartesian3.distance(viewer.camera.positionWC, c.hit),
        ),
      ),
      heading: viewer.camera.heading,
      pitch: Math.min(-0.05, viewer.camera.pitch),
    });
    try {
      await app.savePreferences();
      toast('Vue enregistrée');
    } catch (e) {
      toast(e.message);
    }
  });
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  const picked = (position) => {
    const f = viewer.scene.pick(position)?.id;
    return f?.properties?.source ? f : null;
  };
  handler.setInputAction((e) => {
    const f = picked(e.position);
    if (f) app.select(f, { fly: false });
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  let hover = 0;
  handler.setInputAction((e) => {
    if (hover) return;
    hover = requestAnimationFrame(() => {
      hover = 0;
      viewer.canvas.style.cursor = picked(e.endPosition) ? 'pointer' : '';
    });
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#object-card').hidden) closeCard(app);
  });
  let searchTimer, searchAbort;
  $('#search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchAbort?.abort();
    const q = $('#search').value.trim(),
      root = $('#search-results'),
      needle = q.toLocaleLowerCase('fr');
    root.replaceChildren();
    if (q.length < 2) return;
    searchTimer = setTimeout(async () => {
      try {
        const found = [];
        for (const [id, rows] of app.data)
          for (const f of rows)
            if (
              f.geometry &&
              id !== 'idfm-lignes' &&
              app.contains(app.anchor(f.geometry)) &&
              (f.properties.name || '').toLocaleLowerCase('fr').includes(needle)
            )
              found.push(f);
        const reference = source('idfm-arrets');
        if (usable(reference)) {
          if (!fresh('idfm-arrets')) await app.load('idfm-arrets');
          for (const f of app.data.get('idfm-arrets') || [])
            if (
              !found.includes(f) &&
              f.properties.name.toLocaleLowerCase('fr').includes(needle)
            )
              found.push(f);
        }
        const item = (f) => {
          const b = button(f.properties.name, () => {
            app.select(f);
            root.replaceChildren();
          });
          b.append(
            el(
              'small',
              source(f.properties.source)?.name || 'Adresse (IGN / BAN)',
            ),
          );
          return b;
        };
        // Résultats locaux tout de suite ; adresses IGN ajoutées ensuite, sans
        // redessiner la liste pendant qu’on la parcourt.
        const extra = el('div');
        root.replaceChildren(...found.slice(0, 12).map(item), extra);
        if (q.length < 3) {
          if (!found.length)
            extra.append(
              el('p', 'Aucun résultat dans Paris.', { class: 'muted' }),
            );
          return;
        }
        extra.append(el('p', 'Recherche des adresses…', { class: 'muted' }));
        searchAbort = new AbortController();
        try {
          const j = await api('/api/search?q=' + encodeURIComponent(q), {
            signal: searchAbort.signal,
          });
          extra.replaceChildren(...j.features.slice(0, 8).map(item));
          if (!found.length && !j.features.length)
            extra.append(
              el('p', 'Aucun résultat dans Paris.', { class: 'muted' }),
            );
        } catch (e) {
          if (e.name === 'AbortError') return;
          extra.replaceChildren(
            el('p', 'Adresses IGN momentanément indisponibles.', {
              class: 'muted',
            }),
          );
        }
      } catch (e) {
        if (e.name !== 'AbortError') toast(e.message);
      }
    }, 300);
  });
  // La carte reste centrée sur Paris administratif (avec une marge).
  viewer.camera.moveEnd.addEventListener(() => {
    const p = viewer.camera.positionCartographic,
      c = map.center() || {
        lon: Cesium.Math.toDegrees(p.longitude),
        lat: Cesium.Math.toDegrees(p.latitude),
      };
    if (
      c.lon < parisRect[0] - 0.03 ||
      c.lon > parisRect[2] + 0.03 ||
      c.lat < parisRect[1] - 0.02 ||
      c.lat > parisRect[3] + 0.02
    )
      map.recenter();
  });
  const clockFormatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  });
  const clock = () =>
    ($('#clock').textContent = clockFormatter.format(new Date()) + ' · PARIS');
  clock();
  setInterval(clock, 30000);
  app.showLine = (ref) => showLine(app, ref);
  await refresh();
  setInterval(() => {
    if (!document.hidden) refresh().catch((e) => toast(e.message));
  }, 60000);
}
start().catch((e) => {
  toast(e.message);
  const n = document.querySelector('#map-status');
  if (n)
    n.textContent =
      'Chargement indisponible : consulter Sources ou recharger la page.';
});
