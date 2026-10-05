import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import {
  createApplicationViewer,
  installTrackpadPinchZoom,
} from '../app/viewer.js';
import { contains, clip, airportBounds, parisDay } from './geo.mjs';
import { $, el, button, link, toast, api, setCsrf, askText } from './ui.mjs';
import { page } from './pages.mjs';
import { objectCard } from './objects.mjs';
async function start() {
  const limit = await fetch('/boundary.json').then((r) => r.json());
  const viewer = createApplicationViewer({
    container: $('#map'),
    creditContainer: $('#credits'),
  });
  viewer.scene.globe.show = true;
  viewer.scene.globe.enableLighting = false;
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#080d12');
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#202d37');
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 65000;
  installTrackpadPinchZoom(viewer);
  const colors = {
    'pc-lutece': '#ffbb71',
    travaux: '#d990f0',
    velib: '#7de6ac',
    belib: '#b4db6f',
    hubeau: '#70c4ff',
    vigicrues: '#ffd86b',
    adsb: '#c3ecff',
    sentinel: '#aa9af7',
    seismes: '#fd9292',
  };
  const app = {
    viewer,
    sources: [],
    data: new Map(),
    ds: new Map(),
    pending: new Map(),
    contains: (p) => contains(p, limit.geometry),
    parisDay,
    mapSource: localStorage.getItem('paris-basemap') || 'osm',
    me: await api('/api/me'),
    preferences: await api('/api/preferences'),
    currentPage: 'map',
  };
  setCsrf(app.me.csrf);
  app.anchor = (g) => {
    if (!g) return null;
    if (g.type === 'Point') return g.coordinates.slice(0, 2);
    let a = g.coordinates;
    while (Array.isArray(a?.[0])) a = a[0];
    return Array.isArray(a) && Number.isFinite(a[0]) ? a.slice(0, 2) : null;
  };
  app.recenter = () => {
    viewer.camera.lookAt(
      Cesium.Cartesian3.fromDegrees(2.3522, 48.8566),
      new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-55), 15500),
    );
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.scene.requestRender();
  };
  app.setBasemap = async (id) => {
    viewer.imageryLayers.removeAll();
    let provider;
    if (id === 'ign' || id === 'ortho') {
      provider = new Cesium.WebMapTileServiceImageryProvider({
        url: 'https://data.geopf.fr/wmts',
        layer:
          id === 'ign'
            ? 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'
            : 'ORTHOIMAGERY.ORTHOPHOTOS',
        style: 'normal',
        format: id === 'ign' ? 'image/png' : 'image/jpeg',
        tileMatrixSetID: 'PM',
        maximumLevel: 19,
        credit: new Cesium.Credit('© IGN / Géoplateforme', true),
      });
    } else {
      provider = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
        maximumLevel: 19,
        credit: new Cesium.Credit(
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          true,
        ),
      });
      id = 'osm';
    }
    provider.errorEvent.addEventListener(() =>
      toast(
        'Fond cartographique temporairement indisponible ; essayer un autre fond dans Réglages.',
      ),
    );
    viewer.imageryLayers.addImageryProvider(provider);
    app.mapSource = id;
    localStorage.setItem('paris-basemap', id);
    viewer.scene.requestRender();
  };
  await app.setBasemap(app.mapSource);
  const outline = await Cesium.GeoJsonDataSource.load(limit, {
    stroke: Cesium.Color.fromCssColorString('#89e2b6'),
    fill: Cesium.Color.TRANSPARENT,
    strokeWidth: 2,
    clampToGround: true,
  });
  viewer.dataSources.add(outline);
  for (const e of outline.entities.values) {
    if (e.polygon) {
      e.polygon.material = Cesium.Color.TRANSPARENT;
      e.polygon.outline = false;
    }
    e._parisBoundary = true;
  }
  const boundaryPolygons =
    limit.geometry.type === 'MultiPolygon'
      ? limit.geometry.coordinates
      : [limit.geometry.coordinates];
  for (const polygon of boundaryPolygons)
    for (const ring of polygon)
      viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray(
            ring.flatMap((p) => p.slice(0, 2)),
          ),
          width: 2,
          clampToGround: true,
          material: Cesium.Color.fromCssColorString('#70d8a5'),
        },
      });
  app.recenter();
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
  app.select = (f) => {
    objectCard(f, app);
    if (f.geometry) {
      const pos = app.anchor(f.geometry);
      if (
        pos &&
        (app.contains(pos) ||
          (f.properties.source === 'adsb' && app.preferences.airportContext))
      ) {
        viewer.camera.flyToBoundingSphere(
          new Cesium.BoundingSphere(
            Cesium.Cartesian3.fromDegrees(
              pos[0],
              pos[1],
              f.geometry.type === 'Point' && f.geometry.coordinates.length === 3
                ? f.geometry.coordinates[2]
                : 0,
            ),
            50,
          ),
          {
            offset: new Cesium.HeadingPitchRange(
              viewer.camera.heading,
              Cesium.Math.toRadians(-55),
              Math.max(
                1800,
                Math.min(12000, viewer.camera.positionCartographic.height),
              ),
            ),
            duration: 0.6,
          },
        );
      }
    }
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
  app.render = async (id) => {
    const s = app.sources.find((s) => s.id === id);
    if (!s?.map || !app.preferences.layers.includes(id)) return;
    if (app.ds.has(id)) viewer.dataSources.remove(app.ds.get(id), true);
    const features = (app.data.get(id) || [])
      .filter((f) => f.geometry)
      .map((f) => {
        const geometry = clip(
          f.geometry,
          limit.geometry,
          id === 'adsb' && app.preferences.airportContext,
        );
        return geometry
          ? {
              ...f,
              id: id + ':' + f.id,
              geometry,
              properties: { ...f.properties, _recordId: f.id },
            }
          : null;
      })
      .filter(Boolean);
    const color = Cesium.Color.fromCssColorString(colors[id] || '#7ddcb3');
    const ds = await Cesium.GeoJsonDataSource.load(
      { type: 'FeatureCollection', features },
      {
        stroke: color,
        fill: color.withAlpha(0.12),
        strokeWidth: id === 'vigicrues' ? 5 : 3,
        markerColor: color,
        clampToGround: true,
      },
    );
    ds.clustering.enabled = true;
    ds.clustering.pixelRange = 40;
    ds.clustering.minimumClusterSize = 8;
    ds.clustering.clusterEvent.addEventListener((entities, cluster) => {
      cluster.label.show = true;
      cluster.label.text = String(entities.length);
      cluster.label.font = 'bold 14px sans-serif';
      cluster.label.fillColor = Cesium.Color.WHITE;
      cluster.label.outlineColor = Cesium.Color.BLACK;
      cluster.label.outlineWidth = 4;
      cluster.billboard.show = false;
      cluster.point.show = true;
      cluster.point.pixelSize = 22;
      cluster.point.color = color;
    });
    const refs = new Map((app.data.get(id) || []).map((f) => [f.id, f]));
    for (const e of ds.entities.values) {
      const key = e.properties?._recordId?.getValue(Cesium.JulianDate.now());
      e._parisFeature = refs.get(key);
      if (e.polygon) e.polygon.outline = false;
      if (e.billboard) {
        e.billboard = undefined;
        e.point = new Cesium.PointGraphics({
          pixelSize: id === 'adsb' ? 10 : 7,
          color,
          outlineColor: Cesium.Color.fromCssColorString('#07121a'),
          outlineWidth: 2,
          heightReference:
            id === 'adsb'
              ? Cesium.HeightReference.NONE
              : Cesium.HeightReference.CLAMP_TO_GROUND,
        });
      }
    }
    app.ds.set(id, ds);
    viewer.dataSources.add(ds);
    viewer.scene.requestRender();
  };
  app.load = async (id, render = true) => {
    if (app.pending.has(id)) return app.pending.get(id);
    const p = (async () => {
      const features = [];
      let offset = 0,
        total = 1;
      while (offset < total) {
        const q = new URLSearchParams({
          source: id,
          offset: String(offset),
          limit: '500',
          airport: app.preferences.airportContext ? '1' : '0',
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
      if (render) await app.render(id);
    })().finally(() => app.pending.delete(id));
    app.pending.set(id, p);
    return p;
  };
  function renderLayers() {
    const root = $('#layer-list'),
      legend = $('#legend');
    root.replaceChildren();
    legend.replaceChildren();
    const query = $('#layer-search').value.trim().toLocaleLowerCase('fr');
    const available = app.sources.filter(
      (s) =>
        s.map &&
        s.nature !== 'reference' &&
        s.enabled &&
        s.integration === 'verified' &&
        ['available', 'empty'].includes(s.state) &&
        s.name.toLocaleLowerCase('fr').includes(query),
    );
    for (const theme of [
      'Mobilité',
      'Aviation',
      'Environnement',
      'Seine',
      'Infrastructures',
      'Images/événements',
    ]) {
      const group = available.filter((s) => s.theme === theme);
      if (!group.length) continue;
      root.append(el('h2', theme, { class: 'theme-title' }));
      for (const s of group) {
        const row = el('div', null, { class: 'layer-row' }),
          label = el('label', null, { class: 'layer-label' }),
          input = el('input', null, {
            type: 'checkbox',
            'aria-label': 'Activer ' + s.name,
          });
        input.checked = app.preferences.layers.includes(s.id);
        input.addEventListener('change', async () => {
          try {
            if (input.checked) {
              app.preferences.layers.push(s.id);
              await app.load(s.id);
            } else {
              app.preferences.layers = app.preferences.layers.filter(
                (x) => x !== s.id,
              );
              if (app.ds.has(s.id)) {
                viewer.dataSources.remove(app.ds.get(s.id), true);
                app.ds.delete(s.id);
              }
            }
            await app.savePreferences();
          } catch (e) {
            toast(e.message);
          }
        });
        label.append(
          input,
          el('span', s.name, { class: 'layer-name' }),
          el('span', s.count === null ? 'inconnu' : s.count, {
            class: 'count',
          }),
        );
        row.append(
          label,
          el(
            'div',
            s.nature === 'dated_image'
              ? 'Acquisitions datées'
              : s.nature === 'official_alert'
                ? 'Vigilance officielle'
                : s.id === 'travaux'
                  ? 'En cours · publication hebdomadaire'
                  : s.id === 'agenda'
                    ? 'Périodes programmées'
                    : 'Données horodatées',
            { class: 'layer-meta' },
          ),
        );
        const info = button('Source et fraîcheur', () =>
          app.navigate('sources', s.id),
        );
        info.className = 'layer-info';
        row.append(info);
        root.append(row);
        const l = el('div', null, { class: 'legend-item' }),
          sw = el('span', null, { class: 'swatch' });
        sw.style.backgroundColor = colors[s.id] || '#7ddcb3';
        l.append(sw, el('span', s.name));
        legend.append(l);
      }
    }
    const unavailable = app.sources.filter(
      (s) => s.enabled && s.map && !['available', 'empty'].includes(s.state),
    ).length;
    $('#map-status').textContent =
      unavailable +
      ' sources indisponibles ou anciennes · détails dans Sources';
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
          await app.load(favorite.source, false);
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
    renderLayers();
    renderFavorites();
    await Promise.all(
      app.preferences.layers.map((id) =>
        app.load(id, true).catch((e) => toast(e.message)),
      ),
    );
    if (app.currentPage !== 'map')
      page(app.currentPage, app).catch((e) => toast(e.message));
  }
  for (const b of document.querySelectorAll('[data-nav]'))
    b.addEventListener('click', () => app.navigate(b.dataset.nav));
  $('#back-map').addEventListener('click', () => app.navigate('map'));
  $('#recenter').addEventListener('click', app.recenter);
  $('#layer-search').addEventListener('input', renderLayers);
  $('#show-layers').addEventListener('click', () =>
    $('#layers').classList.add('open'),
  );
  $('#close-layers').addEventListener('click', () =>
    $('#layers').classList.remove('open'),
  );
  $('#refresh').addEventListener('click', async () => {
    await api('/api/refresh', { method: 'POST', data: {} });
    await refresh();
    toast('Cache partagé actualisé ; fréquence fournisseurs conservée.');
  });
  $('#save-view').addEventListener('click', async () => {
    const ray = viewer.camera.getPickRay(
        new Cesium.Cartesian2(
          viewer.canvas.clientWidth / 2,
          viewer.canvas.clientHeight / 2,
        ),
      ),
      hit = viewer.scene.globe.pick(ray, viewer.scene);
    if (!hit) return toast('Recentrer Paris avant de sauvegarder.');
    const c = Cesium.Cartographic.fromCartesian(hit),
      lon = Cesium.Math.toDegrees(c.longitude),
      lat = Cesium.Math.toDegrees(c.latitude);
    if (!app.contains([lon, lat]))
      return toast('Les vues enregistrées restent dans Paris.');
    const name = await askText('Nom de la vue parisienne');
    if (!name) return;
    app.preferences.views.push({
      name: name.slice(0, 100),
      lon,
      lat,
      range: Math.max(
        500,
        Math.min(
          60000,
          Cesium.Cartesian3.distance(viewer.camera.positionWC, hit),
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
  const clicker = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  clicker.setInputAction((e) => {
    const pick = viewer.scene.pick(e.position);
    if (pick?.id?._parisFeature) objectCard(pick.id._parisFeature, app);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  let searchTimer, searchAbort;
  $('#search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchAbort?.abort();
    const q = $('#search').value.trim(),
      root = $('#search-results');
    root.replaceChildren();
    if (q.length < 3) return;
    searchTimer = setTimeout(async () => {
      try {
        const found = [];
        for (const rows of app.data.values())
          for (const f of rows)
            if (
              f.geometry &&
              app.contains(app.anchor(f.geometry)) &&
              f.properties.name
                .toLocaleLowerCase('fr')
                .includes(q.toLocaleLowerCase('fr'))
            )
              found.push(f);
        const reference = app.sources.find((s) => s.id === 'idfm-arrets');
        if (reference?.integration === 'verified') {
          await app.load(reference.id, false);
          for (const f of app.data.get(reference.id) || [])
            if (
              f.properties.name
                .toLocaleLowerCase('fr')
                .includes(q.toLocaleLowerCase('fr'))
            )
              found.push(f);
        }
        searchAbort = new AbortController();
        const j = await api('/api/search?q=' + encodeURIComponent(q), {
          signal: searchAbort.signal,
        });
        found.push(...j.features);
        root.replaceChildren();
        for (const f of found.slice(0, 15))
          root.append(
            button(f.properties.name, () => {
              app.select(f);
              root.replaceChildren();
            }),
          );
        if (!found.length)
          root.append(
            el('p', 'Aucun résultat dans Paris.', { class: 'muted' }),
          );
      } catch (e) {
        if (e.name !== 'AbortError') toast(e.message);
      }
    }, 400);
  });
  viewer.camera.moveEnd.addEventListener(() => {
    const ray = viewer.camera.getPickRay(
        new Cesium.Cartesian2(
          viewer.canvas.clientWidth / 2,
          viewer.canvas.clientHeight / 2,
        ),
      ),
      hit = viewer.scene.globe.pick(ray, viewer.scene);
    if (!hit) return;
    const c = Cesium.Cartographic.fromCartesian(hit),
      p = [
        Cesium.Math.toDegrees(c.longitude),
        Cesium.Math.toDegrees(c.latitude),
      ];
    const inAir =
      app.preferences.airportContext &&
      p[0] >= airportBounds[0] &&
      p[0] <= airportBounds[2] &&
      p[1] >= airportBounds[1] &&
      p[1] <= airportBounds[3];
    if (!app.contains(p) && !inAir) app.recenter();
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
