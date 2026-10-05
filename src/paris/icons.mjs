// Pictogrammes dessinés localement (canvas → data URL), mis en cache par clé.
import { textOn } from './model.mjs';
const cache = new Map();
const ratio = () => Math.min(globalThis.devicePixelRatio || 1, 2);
function draw(key, w, h, paint) {
  if (cache.has(key)) return cache.get(key);
  const r = ratio(),
    c = document.createElement('canvas');
  c.width = Math.ceil(w * r);
  c.height = Math.ceil(h * r);
  const g = c.getContext('2d');
  g.scale(r, r);
  paint(g, w, h);
  const icon = { url: c.toDataURL('image/png'), width: w, height: h };
  cache.set(key, icon);
  return icon;
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function shadow(g) {
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 3;
  g.shadowOffsetY = 1;
}
// Pastille ronde avec un symbole blanc.
export function badge(kind, color) {
  return draw('badge:' + kind + color, 26, 26, (g) => {
    shadow(g);
    g.fillStyle = color;
    g.beginPath();
    g.arc(13, 13, 10.5, 0, Math.PI * 2);
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 2;
    g.strokeStyle = '#fff';
    g.stroke();
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    if (kind === 'closure') {
      g.fillRect(7.5, 11.5, 11, 3);
    } else if (kind === 'works') {
      // barrière de chantier
      g.fillRect(7, 10, 12, 2.4);
      g.fillRect(7, 14, 12, 2.4);
      g.fillRect(8.5, 9, 1.8, 9);
      g.fillRect(15.7, 9, 1.8, 9);
    } else if (kind === 'incident') {
      g.fillRect(11.8, 7.5, 2.4, 7.5);
      g.fillRect(11.8, 16.5, 2.4, 2.4);
    } else if (kind === 'event') {
      g.beginPath();
      g.arc(13, 13, 3.6, 0, Math.PI * 2);
      g.fill();
    } else if (kind === 'water') {
      g.beginPath();
      g.moveTo(13, 7);
      g.bezierCurveTo(17, 12, 18, 14, 18, 15.5);
      g.arc(13, 15.5, 5, 0, Math.PI);
      g.bezierCurveTo(8, 14, 9, 12, 13, 7);
      g.fill();
    } else if (kind === 'agenda') {
      g.fillRect(8, 9, 10, 9);
      g.fillStyle = color;
      g.fillRect(9.5, 12, 7, 4.5);
    }
  });
}
// Cartouche de ligne aux couleurs officielles (métro rond, RER/train carré).
export function lineBadge(text, color, mode) {
  const label = String(text || '?').slice(0, 4),
    w = Math.max(20, 8 + label.length * 7.5),
    round = mode === 'metro' && label.length <= 2;
  return draw('line:' + label + color + mode, round ? 20 : w, 20, (g, W, H) => {
    shadow(g);
    g.fillStyle = color || '#5A6872';
    if (round) {
      g.beginPath();
      g.arc(10, 10, 9, 0, Math.PI * 2);
      g.fill();
    } else {
      roundRect(g, 1, 1, W - 2, H - 2, mode === 'tram' ? 3 : 5);
      g.fill();
    }
    g.shadowColor = 'transparent';
    g.fillStyle = textOn(color);
    g.font = 'bold 11px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, W / 2, H / 2 + 0.5);
  });
}
