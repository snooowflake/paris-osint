import * as Cesium from 'cesium';
import { badge, lineBadge } from './icons.mjs';
import { traffic, roadEvent, perturbation } from './model.mjs';
const color = (css, alpha) => {
  const c = Cesium.Color.fromCssColorString(css);
  return alpha === undefined ? c : c.withAlpha(alpha);
};
const far = (d) => new Cesium.DistanceDisplayCondition(0, d);
// Un matériau par polyligne : Cesium le détruit avec sa collection, mais
// regroupe toujours le rendu par type et valeurs d’uniformes.
function material(type, uniforms) {
  return Cesium.Material.fromType(
    type,
    Object.fromEntries(
      Object.entries(uniforms).map(([k, v]) => [
        k,
        typeof v === 'string' ? color(v) : v,
      ]),
    ),
  );
}
const solid = (c) => material('Color', { color: c });
const cased = (c, outline = '#FFFFFF', width = 1) =>
  material('PolylineOutline', {
    color: c,
    outlineColor: outline,
    outlineWidth: width,
  });
const dashed = (c, gap = '#FFFFFF', length = 12) =>
  material('PolylineDash', { color: c, gapColor: gap, dashLength: length });
const linesOf = (g) =>
  !g
    ? []
    : g.type === 'LineString'
      ? [g.coordinates]
      : g.type === 'MultiLineString'
        ? g.coordinates
        : g.type === 'Polygon'
          ? [g.coordinates[0]]
          : g.type === 'MultiPolygon'
            ? g.coordinates.map((p) => p[0])
            : [];
const polygonsOf = (g) =>
  g?.type === 'Polygon'
    ? [g.coordinates]
    : g?.type === 'MultiPolygon'
      ? g.coordinates
      : [];
const positions = (line, h) =>
  Cesium.Cartesian3.fromDegreesArrayHeights(
    line.flatMap((p) => [p[0], p[1], h]),
  );
// Point représentatif : milieu du plus long tracé, centre d’emprise sinon.
export function anchorOf(g) {
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates;
  if (g.type === 'MultiPoint') return g.coordinates[0];
  const polys = polygonsOf(g);
  if (polys.length) {
    const ring = polys.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
    const n = ring.length - 1 || 1;
    return [
      ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n,
      ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n,
    ];
  }
  const line = linesOf(g).sort((a, b) => b.length - a.length)[0];
  if (!line?.length) return null;
  if (line.length === 2)
    return [(line[0][0] + line[1][0]) / 2, (line[0][1] + line[1][1]) / 2];
  return line[Math.floor(line.length / 2)];
}
export const roadColors = {
  closure: '#D7263D',
  works: '#F08A24',
  incident: '#E2382B',
  event: '#7B61FF',
};
const railModes = new Set([
  'metro',
  'rer',
  'train',
  'tram',
  'cable',
  'funicular',
]);
export function velibColor(p) {
  if (p.isRenting === 0 || p.isRenting === false) return '#8A949C';
  return p.bikes >= 5 ? '#2EAA4A' : p.bikes > 0 ? '#F59A23' : '#E2382B';
}
export function tomtomStyle(category) {
  const c = Number(category);
  if (c === 6) return { kind: 'incident', color: '#E2382B' };
  if (c === 7 || c === 8) return { kind: 'closure', color: '#D7263D' };
  if (c === 9) return { kind: 'works', color: '#F08A24' };
  return { kind: 'incident', color: '#C2185B' };
}
export function createRenderer(map, app) {
  // Cesium applique lui-même la densité d’écran aux pictos et libellés.
  const { viewer } = map,
    scene = viewer.scene;
  // Ordre de dessin stable : emprises, halo de sélection, transports, trafic,
  // événements, points, pictos.
  const slots = {};
  for (const name of [
    'areas',
    'highlight',
    'transit',
    'traffic',
    'events',
    'points',
    'icons',
  ])
    slots[name] = scene.primitives.add(new Cesium.PrimitiveCollection());
  const layers = new Map();
  class Layer {
    constructor() {
      this.items = [];
    }
    add(slot, primitive) {
      slots[slot].add(primitive);
      this.items.push([slot, primitive]);
      return primitive;
    }
    lines(slot) {
      return this.add(slot, new Cesium.PolylineCollection());
    }
    points(slot = 'points') {
      return this.add(slot, new Cesium.PointPrimitiveCollection());
    }
    icons() {
      const b = this.add('icons', new Cesium.BillboardCollection({ scene }));
      return {
        add: (icon, lonlat, id, distance = Infinity) =>
          b.add({
            image: icon.url,
            width: icon.width,
            height: icon.height,
            position: Cesium.Cartesian3.fromDegrees(lonlat[0], lonlat[1], 4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: far(distance),
            id,
          }),
      };
    }
    labels() {
      const l = this.add('icons', new Cesium.LabelCollection({ scene }));
      return {
        add: (text, lonlat, distance, offset = 12) =>
          l.add({
            text,
            position: Cesium.Cartesian3.fromDegrees(lonlat[0], lonlat[1], 4),
            font: '600 12px system-ui, sans-serif',
            fillColor: color('#1F262C'),
            outlineColor: color('#FFFFFF'),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -offset),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: far(distance),
          }),
      };
    }
    polygons(instances) {
      if (!instances.length) return;
      this.add(
        'areas',
        new Cesium.Primitive({
          geometryInstances: instances,
          appearance: new Cesium.PerInstanceColorAppearance({
            flat: true,
            translucent: true,
          }),
        }),
      );
    }
    destroy() {
      for (const [slot, p] of this.items) slots[slot].remove(p);
      this.items = [];
    }
  }
  const polygonInstances = (f, fill) =>
    polygonsOf(f.geometry).map(
      (rings) =>
        new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: new Cesium.PolygonHierarchy(
              Cesium.Cartesian3.fromDegreesArray(rings[0].flat()),
              rings
                .slice(1)
                .map(
                  (h) =>
                    new Cesium.PolygonHierarchy(
                      Cesium.Cartesian3.fromDegreesArray(h.flat()),
                    ),
                ),
            ),
            height: 1,
          }),
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(fill),
          },
          id: f,
        }),
    );
  const styles = {
    'comptages-route'(L, rows) {
      const lines = L.lines('traffic');
      for (const f of rows) {
        const state = f.properties.trafficState,
          t = traffic[state];
        if (!t) continue;
        const m =
          state === 'ferme' ? dashed(t.color, '#FFFFFF', 10) : cased(t.color);
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 3),
            width: 5,
            material: m,
            id: f,
          });
      }
    },
    'pc-lutece'(L, rows) {
      const lines = L.lines('events'),
        icons = L.icons();
      for (const f of rows) {
        const ev = roadEvent(f.properties),
          c = roadColors[ev.kind];
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 5),
            width: 6,
            material:
              ev.kind === 'closure' ? dashed(c, '#FFFFFF', 10) : cased(c),
            id: f,
          });
        const a = anchorOf(f.geometry);
        if (a) icons.add(badge(ev.kind, c), a, f, 26000);
      }
    },
    travaux(L, rows) {
      const lines = L.lines('areas'),
        icons = L.icons(),
        instances = [];
      for (const f of rows) {
        const c = (
          perturbation[f.properties.perturbationLevel] || {
            color: '#F08A24',
          }
        ).color;
        instances.push(...polygonInstances(f, color(c, 0.3)));
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 2),
            width: f.geometry.type.includes('Polygon') ? 2 : 5,
            material: solid(c),
            id: f,
          });
        const a = anchorOf(f.geometry);
        if (a) icons.add(badge('works', c), a, f, 30000);
      }
      L.polygons(instances);
    },
    tomtom(L, rows) {
      const lines = L.lines('events'),
        icons = L.icons();
      for (const f of rows) {
        const t = tomtomStyle(f.properties.category);
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 5),
            width: 6,
            material:
              t.kind === 'closure'
                ? dashed(t.color, '#FFFFFF', 10)
                : cased(t.color),
            id: f,
          });
        const a = anchorOf(f.geometry);
        if (a) icons.add(badge(t.kind, t.color), a, f, 26000);
      }
    },
    'idfm-traces'(L, rows) {
      const lines = L.lines('transit'),
        icons = L.icons(),
        seen = new Set();
      for (const f of rows) {
        const p = f.properties,
          c = p.color || '#5A6872',
          width = { metro: 4, rer: 5, train: 3.5, tram: 3.5 }[p.mode] || 3;
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 1.5),
            width,
            material: cased(c, '#FFFFFF', 1.2),
            id: f,
          });
        const a = anchorOf(f.geometry),
          cell =
            (p.lineRef || p.line) +
            ':' +
            Math.round(a?.[0] / 0.018) +
            ':' +
            Math.round(a?.[1] / 0.012);
        if (a && p.line && !seen.has(cell)) {
          seen.add(cell);
          icons.add(lineBadge(p.line, c, p.mode), a, f, 11000);
        }
      }
    },
    'idfm-arrets'(L, rows) {
      const points = L.points(),
        labels = L.labels(),
        named = new Map();
      for (const f of rows) {
        const p = f.properties,
          q = f.geometry?.coordinates;
        if (!q) continue;
        const rail = railModes.has(p.mode);
        points.add({
          position: Cesium.Cartesian3.fromDegrees(q[0], q[1], 4),
          pixelSize: rail ? 9 : 6,
          color: color(rail ? '#FFFFFF' : '#1E6FD9'),
          outlineColor: color(rail ? '#2B3136' : '#FFFFFF'),
          outlineWidth: rail ? 2.5 : 1.5,
          distanceDisplayCondition: far(rail ? 16000 : 2600),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          id: f,
        });
        if (rail) {
          const key = p.name.toLocaleLowerCase('fr'),
            prev = named.get(key);
          if (
            !prev ||
            Math.abs(prev[0] - q[0]) > 0.004 ||
            Math.abs(prev[1] - q[1]) > 0.003
          ) {
            named.set(key, q);
            labels.add(p.name, q, 4200);
          }
        }
      }
    },
    velib(L, rows) {
      const points = L.points();
      for (const f of rows) {
        const q = f.geometry?.coordinates;
        if (q)
          points.add({
            position: Cesium.Cartesian3.fromDegrees(q[0], q[1], 4),
            pixelSize: 8,
            color: color(velibColor(f.properties)),
            outlineColor: color('#FFFFFF'),
            outlineWidth: 1.5,
            distanceDisplayCondition: far(7000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            id: f,
          });
      }
    },
    hubeau(L, rows) {
      const icons = L.icons(),
        labels = L.labels();
      for (const f of rows) {
        const q = f.geometry?.coordinates,
          p = f.properties;
        if (!q) continue;
        icons.add(badge('water', '#1F78C8'), q, f, Infinity);
        if (Number.isFinite(p.value))
          labels.add(
            p.value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) +
              ' ' +
              (p.kind === 'Q' ? 'm³/s' : 'm'),
            q,
            14000,
            16,
          );
      }
    },
    agenda(L, rows) {
      const icons = L.icons();
      for (const f of rows) {
        const a = anchorOf(f.geometry);
        if (a) icons.add(badge('agenda', '#8E44AD'), a, f, 9000);
      }
    },
    sentinel(L, rows) {
      const lines = L.lines('areas');
      for (const f of rows)
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 2),
            width: 2,
            material: dashed('#7B61FF', 'rgba(0,0,0,0)', 16),
            id: f,
          });
    },
  };
  // Tuiles de trafic en direct, renouvelées sans clignotement.
  let trafficLayer = null,
    trafficTimer = null;
  const addTraffic = () => {
    const provider = new Cesium.UrlTemplateImageryProvider({
      url:
        '/api/traffic-tiles/{z}/{x}/{y}.png?v=' +
        Math.floor(Date.now() / 60000),
      minimumLevel: 11,
      maximumLevel: 18,
      rectangle: Cesium.Rectangle.fromDegrees(2.224, 48.815, 2.47, 48.904),
      credit: new Cesium.Credit('Trafic © TomTom', true),
    });
    provider.errorEvent.addEventListener(() => {});
    const layer = viewer.imageryLayers.addImageryProvider(provider);
    const previous = trafficLayer;
    trafficLayer = layer;
    if (previous)
      setTimeout(() => {
        if (viewer.imageryLayers.contains(previous))
          viewer.imageryLayers.remove(previous, true);
        scene.requestRender();
      }, 8000);
    scene.requestRender();
  };
  const renderer = {
    has: (id) => !!styles[id] || id === 'tomtom-flow',
    draw(id, rows) {
      renderer.clear(id);
      if (id === 'tomtom-flow') {
        addTraffic();
        trafficTimer = setInterval(() => {
          if (!document.hidden) addTraffic();
        }, 120000);
        layers.set(id, null);
        return;
      }
      const L = new Layer();
      try {
        styles[id]?.(L, rows);
      } catch (e) {
        L.destroy();
        throw e;
      }
      layers.set(id, L);
      scene.requestRender();
    },
    clear(id) {
      if (id === 'tomtom-flow') {
        clearInterval(trafficTimer);
        for (const l of [...Array(viewer.imageryLayers.length).keys()]
          .map((i) => viewer.imageryLayers.get(i))
          .filter((l) =>
            l.imageryProvider?.url?.startsWith?.('/api/traffic-tiles/'),
          ))
          viewer.imageryLayers.remove(l, true);
        trafficLayer = null;
      }
      layers.get(id)?.destroy();
      layers.delete(id);
      scene.requestRender();
    },
    // Surbrillance de l’objet sélectionné.
    highlight(f) {
      slots.highlight.removeAll();
      if (!f?.geometry) return scene.requestRender();
      const g = f.geometry;
      if (g.type === 'Point') {
        const points = slots.highlight.add(
          new Cesium.PointPrimitiveCollection(),
        );
        points.add({
          position: Cesium.Cartesian3.fromDegrees(
            g.coordinates[0],
            g.coordinates[1],
            5,
          ),
          pixelSize: 22,
          color: color('#1A73E8', 0.25),
          outlineColor: color('#1A73E8'),
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      } else {
        const lines = slots.highlight.add(new Cesium.PolylineCollection());
        for (const l of linesOf(g))
          lines.add({
            positions: positions(l, 1),
            width: 14,
            material: solid('rgba(26,115,232,0.55)'),
          });
      }
      scene.requestRender();
    },
    // Tracés d’une ligne mis en avant (info trafic).
    emphasize(rows) {
      slots.highlight.removeAll();
      const lines = slots.highlight.add(new Cesium.PolylineCollection());
      for (const f of rows)
        for (const l of linesOf(f.geometry))
          lines.add({
            positions: positions(l, 1),
            width: 10,
            material: cased(f.properties.color || '#1A73E8', '#1F262C', 2),
          });
      scene.requestRender();
    },
  };
  return renderer;
}
