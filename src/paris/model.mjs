// Libellés et styles partagés entre serveur et navigateur, sans dépendance.
const fold = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const modes = {
  metro: { label: 'Métro', order: 1 },
  rer: { label: 'RER', order: 2 },
  train: { label: 'Train', order: 3 },
  tram: { label: 'Tram', order: 4 },
  cable: { label: 'Câble', order: 5 },
  funicular: { label: 'Funiculaire', order: 6 },
  bus: { label: 'Bus', order: 7 },
  other: { label: 'Autre', order: 8 },
};

// Modes publiés par IDFM (référentiels, GTFS, Navitia) ramenés à un code stable.
export function normMode(value) {
  const m = fold(value);
  if (!m) return 'other';
  if (m.includes('metro') || m === 'val') return 'metro';
  if (m.includes('rer') || m.includes('rapidtransit') || m === 'rapid transit')
    return 'rer';
  if (m.includes('tram')) return 'tram';
  if (m.includes('bus')) return 'bus';
  if (m.includes('funi')) return 'funicular';
  if (m.includes('cable') || m.includes('telecab')) return 'cable';
  if (m.includes('train') || m.includes('rail') || m.includes('transilien'))
    return 'train';
  return 'other';
}

export const hexColor = (v) =>
  /^#?[0-9a-f]{6}$/i.test(String(v ?? '').trim())
    ? '#' + String(v).trim().replace('#', '').toUpperCase()
    : null;

// Texte noir ou blanc selon la luminance relative de la couleur de ligne.
export function textOn(hex) {
  const c = hexColor(hex);
  if (!c) return '#FFFFFF';
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#FFFFFF';
}

export const lineRefOf = (v) => {
  const m = /(?:^|[:])(C\d{5})(?::|$)/.exec(String(v ?? ''));
  return m ? m[1] : null;
};

// Palette proche des cartes grand public : vert fluide → rouge foncé bloqué.
export const traffic = {
  fluide: { label: 'Fluide', color: '#2EAA4A' },
  dense: { label: 'Dense', color: '#F59A23' },
  sature: { label: 'Saturé', color: '#E2382B' },
  bloque: { label: 'Bloqué', color: '#8E1B13' },
  ferme: { label: 'Voie fermée', color: '#8E1B13' },
};

// Codes CIFS publiés par le PC Lutèce.
const cifsTypes = {
  ROAD_CLOSED: { label: 'Voie fermée', kind: 'closure' },
  CONSTRUCTION: { label: 'Travaux sur la voie', kind: 'works' },
  ACCIDENT: { label: 'Accident', kind: 'incident' },
  HAZARD: { label: 'Danger signalé', kind: 'incident' },
  JAM: { label: 'Embouteillage', kind: 'incident' },
  EVENT: { label: 'Événement', kind: 'event' },
};
const cifsSubtypes = {
  ROAD_CLOSED_CONSTRUCTION: 'Fermeture pour travaux',
  ROAD_CLOSED_EVENT: 'Fermeture pour événement',
  ROAD_CLOSED_HAZARD: 'Fermeture pour danger',
};
const pretty = (code) =>
  code
    ? code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ')
    : null;
export function roadEvent(p = {}) {
  const t = cifsTypes[p.type] || {
    label: pretty(p.type) || 'Événement de voirie',
    kind: 'event',
  };
  return {
    kind: t.kind,
    label: t.label,
    detail: cifsSubtypes[p.subtype] || pretty(p.subtype),
    direction:
      p.direction === 'BOTH_DIRECTIONS'
        ? 'Deux sens'
        : p.direction === 'ONE_DIRECTION'
          ? 'Un sens'
          : null,
  };
}

export const perturbation = {
  1: { label: 'Très perturbant', color: '#D93A1F' },
  2: { label: 'Perturbant', color: '#F08A24' },
};

// Sévérités PRIM (Navitia) ; valeur inconnue affichée telle quelle.
export const severities = {
  BLOQUANTE: { label: 'Trafic interrompu', rank: 3, color: '#D7263D' },
  PERTURBEE: { label: 'Trafic perturbé', rank: 2, color: '#F08A24' },
  INFORMATION: { label: 'Information', rank: 1, color: '#2F80ED' },
};
export function severity(code) {
  return (
    severities[code] || {
      label: pretty(code) || 'Information',
      rank: 1,
      color: '#2F80ED',
    }
  );
}
export const causes = { TRAVAUX: 'Travaux', PERTURBATION: 'Incident' };

// Catégories d’incidents TomTom v5 (iconCategory).
export const tomtomCategories = {
  0: 'Inconnu',
  1: 'Accident',
  2: 'Brouillard',
  3: 'Conditions dangereuses',
  4: 'Pluie',
  5: 'Verglas',
  6: 'Embouteillage',
  7: 'Voie fermée',
  8: 'Route fermée',
  9: 'Travaux',
  10: 'Vent',
  11: 'Inondation',
  14: 'Véhicule en panne',
};
