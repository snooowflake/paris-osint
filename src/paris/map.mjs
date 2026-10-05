import * as Cesium from 'cesium';
import {
  createApplicationViewer,
  installTrackpadPinchZoom,
} from '../app/viewer.js';
import { $, toast } from './ui.mjs';
export const parisRect = [2.224, 48.815, 2.47, 48.904];
// Fonds de plan officiels ou ouverts ; l’orthophotographie reste une référence datée.
export const basemaps = {
  'plan-neutre': {
    label: 'Plan IGN atténué',
    hint: 'Couleurs adoucies : la circulation ressort mieux',
    wmts: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format: 'image/png',
    adjust: { saturation: 0.3, brightness: 1.04, contrast: 0.96 },
  },
  plan: {
    label: 'Plan IGN',
    hint: 'Plan officiel en couleurs',
    wmts: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
    format: 'image/png',
  },
  ortho: {
    label: 'Photographies aériennes',
    hint: 'IGN, prises de vue datées, pas une image en direct',
    wmts: 'ORTHOIMAGERY.ORTHOPHOTOS',
    format: 'image/jpeg',
  },
  osm: { label: 'OpenStreetMap', hint: 'Plan collaboratif' },
};
export function createMap(app) {
  const viewer = createApplicationViewer({
    container: $('#map'),
    creditContainer: $('#credits'),
  });
  const scene = viewer.scene,
    globe = scene.globe;
  // Netteté : rendu à la densité réelle de l’écran et tuiles choisies à ~1 texel
  // par pixel (Cesium agrandit jusqu’à ×2 avec l’erreur d’écran par défaut).
  viewer.useBrowserRecommendedResolution = false;
  viewer.resolutionScale = Math.min(1, 2 / (globalThis.devicePixelRatio || 1));
  viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  globe.show = true;
  globe.enableLighting = false;
  globe.showGroundAtmosphere = false;
  globe.maximumScreenSpaceError = Math.SQRT2;
  globe.tileCacheSize = 400;
  globe.preloadSiblings = true;
  globe.baseColor = Cesium.Color.fromCssColorString('#e8ebee');
  // Pas de brume ni d’atmosphère : elles délavent le plan à distance.
  scene.fog.enabled = false;
  scene.skyAtmosphere.show = false;
  if (scene.skyBox) scene.skyBox.show = false;
  if (scene.sun) scene.sun.show = false;
  if (scene.moon) scene.moon.show = false;
  scene.highDynamicRange = false;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#0d151e');
  // Rendu continu : en rendu à la demande, Cesium peut cesser de redessiner
  // le globe après le retrait d’une couche d’imagerie (carte vide).
  const control = scene.screenSpaceCameraController;
  control.minimumZoomDistance = 80;
  control.maximumZoomDistance = 40000;
  installTrackpadPinchZoom(viewer);
  viewer.camera.percentageChanged = 0.01;

  const map = { viewer, mode: 'plan' };
  let baseLayer = null,
    lastError = 0;
  map.setBasemap = (id) => {
    const b = basemaps[id] ? id : 'plan-neutre',
      def = basemaps[b];
    const provider = def.wmts
      ? new Cesium.WebMapTileServiceImageryProvider({
          url: 'https://data.geopf.fr/wmts',
          layer: def.wmts,
          style: 'normal',
          format: def.format,
          tileMatrixSetID: 'PM',
          maximumLevel: 19,
          credit: new Cesium.Credit('© IGN / Géoplateforme', true),
        })
      : new Cesium.OpenStreetMapImageryProvider({
          url: 'https://tile.openstreetmap.org/',
          maximumLevel: 19,
          credit: new Cesium.Credit(
            '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            true,
          ),
        });
    provider.errorEvent.addEventListener(() => {
      if (Date.now() - lastError < 60000) return;
      lastError = Date.now();
      toast(
        'Fond de carte momentanément incomplet ; un autre fond est disponible dans le sélecteur.',
      );
    });
    const layer = new Cesium.ImageryLayer(provider);
    Object.assign(layer, def.adjust || {});
    if (baseLayer) viewer.imageryLayers.remove(baseLayer, true);
    viewer.imageryLayers.add(layer, 0);
    baseLayer = layer;
    map.basemap = b;
    try {
      localStorage.setItem('paris-basemap', b);
    } catch {}
    scene.requestRender();
    app.onBasemap?.(b);
  };
  let stored = null;
  try {
    stored = localStorage.getItem('paris-basemap');
  } catch {}
  map.setBasemap(stored);

  // Contour officiel et voile léger hors de Paris.
  const ring = app.boundary.coordinates[0];
  viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray([
          1.6, 48.4, 3.1, 48.4, 3.1, 49.3, 1.6, 49.3,
        ]),
        [
          new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(ring.flat()),
          ),
        ],
      ),
      // Altitude fixe : rendu identique avec ou sans primitives « au sol ».
      height: 1,
      material: Cesium.Color.fromCssColorString('#0b1620').withAlpha(0.32),
    },
  });
  const outline = scene.primitives.add(new Cesium.PolylineCollection());
  outline.add({
    positions: Cesium.Cartesian3.fromDegreesArrayHeights(
      ring.flatMap((p) => [p[0], p[1], 2]),
    ),
    width: 2.5,
    material: Cesium.Material.fromType('Color', {
      color: Cesium.Color.fromCssColorString('#127a5a'),
    }),
  });

  const centerHit = () => {
    const ray = viewer.camera.getPickRay(
      new Cesium.Cartesian2(
        viewer.canvas.clientWidth / 2,
        viewer.canvas.clientHeight / 2,
      ),
    );
    return ray && globe.pick(ray, scene);
  };
  map.center = () => {
    const hit = centerHit();
    if (!hit) return null;
    const c = Cesium.Cartographic.fromCartesian(hit);
    return {
      hit,
      lon: Cesium.Math.toDegrees(c.longitude),
      lat: Cesium.Math.toDegrees(c.latitude),
    };
  };
  // Rectangle élargi côté panneau pour que Paris reste visible à côté de lui.
  const framed = (r) => {
    const panel = $('#layers'),
      w = viewer.canvas.clientWidth || 1,
      covered =
        panel && !panel.hidden && getComputedStyle(panel).display !== 'none'
          ? Math.min(0.5, (panel.offsetWidth + 24) / w)
          : 0,
      west = r[0] - ((r[2] - r[0]) * covered) / (1 - covered);
    return Cesium.Rectangle.fromDegrees(west, r[1], r[2], r[3]);
  };
  map.flyToRect = (r, duration = 0.8) => {
    const pad = Math.max(r[2] - r[0], r[3] - r[1]) * 0.25 + 0.0015;
    viewer.camera.flyTo({
      destination: framed([r[0] - pad, r[1] - pad, r[2] + pad, r[3] + pad]),
      orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
      duration,
      complete: () => {
        if (map.mode === '3d') map.setMode('3d', true);
      },
    });
  };
  map.recenter = (duration = 0.8) => {
    viewer.camera.flyTo({
      destination: framed(parisRect),
      orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
      duration,
      complete: () => {
        if (map.mode === '3d') map.setMode('3d', true);
      },
    });
  };
  map.setMode = (mode, keep = false) => {
    map.mode = mode;
    const c = map.center();
    if (!c) return;
    const range = Math.max(
      300,
      Cesium.Cartesian3.distance(viewer.camera.positionWC, c.hit),
    );
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(c.hit, 1), {
      offset: new Cesium.HeadingPitchRange(
        viewer.camera.heading,
        mode === '3d' ? Cesium.Math.toRadians(-42) : -Cesium.Math.PI_OVER_TWO,
        mode === '3d' && !keep ? range * 1.1 : range,
      ),
      duration: 0.6,
    });
    app.onMode?.(mode);
  };
  map.zoom = (factor) => {
    const c = map.center(),
      camera = viewer.camera;
    if (!c) return;
    const d = Cesium.Cartesian3.distance(camera.positionWC, c.hit),
      target = Math.min(40000, Math.max(120, d * factor));
    const move = Cesium.Cartesian3.multiplyByScalar(
      camera.directionWC,
      d - target,
      new Cesium.Cartesian3(),
    );
    camera.flyTo({
      destination: Cesium.Cartesian3.add(
        camera.positionWC,
        move,
        new Cesium.Cartesian3(),
      ),
      orientation: {
        heading: camera.heading,
        pitch: camera.pitch,
        roll: 0,
      },
      duration: 0.3,
    });
  };
  map.north = () => {
    const c = map.center();
    if (!c) return;
    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(c.hit, 1), {
      offset: new Cesium.HeadingPitchRange(
        0,
        viewer.camera.pitch,
        Cesium.Cartesian3.distance(viewer.camera.positionWC, c.hit),
      ),
      duration: 0.5,
    });
  };
  map.height = () => viewer.camera.positionCartographic.height;
  return map;
}
// Rectangle englobant d’une géométrie GeoJSON.
export function bounds(g) {
  const r = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = (a) => {
    if (typeof a[0] === 'number') {
      r[0] = Math.min(r[0], a[0]);
      r[1] = Math.min(r[1], a[1]);
      r[2] = Math.max(r[2], a[0]);
      r[3] = Math.max(r[3], a[1]);
    } else a.forEach(walk);
  };
  if (g?.coordinates) walk(g.coordinates);
  return Number.isFinite(r[0]) ? r : null;
}
