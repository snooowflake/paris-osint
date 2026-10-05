export const $ = (s) => document.querySelector(s);
export const el = (tag, text, attrs = {}) => {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = String(text);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else n.setAttribute(k, v);
  }
  return n;
};
export const button = (text, fn) => {
  const n = el('button', text);
  n.addEventListener('click', (e) => {
    try {
      Promise.resolve(fn(e)).catch((error) => toast(error.message));
    } catch (error) {
      toast(error.message);
    }
  });
  return n;
};
const formatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  dateStyle: 'medium',
  timeStyle: 'short',
});
export const fmt = (x) =>
  x && Number.isFinite(Date.parse(x))
    ? formatter.format(new Date(x))
    : 'inconnu';
const hourFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});
export const hm = (x) =>
  x && Number.isFinite(Date.parse(x)) ? hourFormatter.format(new Date(x)) : '';
// Ancienneté lisible d’un horodatage (« il y a 4 min »).
export function ago(x, now = Date.now()) {
  const t = Date.parse(x);
  if (!Number.isFinite(t)) return 'date inconnue';
  const m = Math.round((now - t) / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return 'il y a ' + m + ' min';
  const h = Math.round(m / 60);
  if (h < 48) return 'il y a ' + h + ' h';
  return 'le ' + fmt(x);
}
// Pastille de ligne aux couleurs officielles (métro rond, autres modes carrés).
export function chip(line, { status } = {}) {
  const n = el('span', line?.name || '?', {
    class: 'line-chip mode-' + (line?.mode || 'other'),
  });
  n.style.setProperty('--c', line?.color || '#5A6872');
  n.style.setProperty('--t', line?.text || '#FFFFFF');
  if (status) n.dataset.status = String(status);
  return n;
}
export const link = (text, url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') throw Error();
    return el('a', text, {
      href: u.href,
      target: '_blank',
      rel: 'noopener noreferrer',
    });
  } catch {
    return el('span', text);
  }
};
export const field = (label, value) => {
  const n = el('div', null, { class: 'field' });
  n.append(
    el('span', label),
    el(
      'span',
      value == null
        ? 'inconnu'
        : typeof value === 'boolean'
          ? value
            ? 'oui'
            : 'non'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : value,
    ),
  );
  return n;
};
export function toast(message) {
  $('#toast').textContent = message;
  $('#toast').style.display = 'block';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($('#toast').style.display = 'none'), 4500);
}
export let csrf = '';
export function setCsrf(s) {
  csrf = s;
}
export async function api(path, { method = 'GET', data, signal } = {}) {
  const r = await fetch(path, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(method === 'GET' ? {} : { 'X-CSRF-Token': csrf }),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (r.status === 401) {
    location.assign('/login.html');
    throw Error('Connexion requise');
  }
  if (!r.ok) {
    const error = await r.json().catch(() => ({}));
    throw Error(error.error || 'Requête indisponible');
  }
  return r.json();
}
export const stateLabel = {
  available: 'Disponible',
  empty: 'Vide légitime',
  stale: 'Données anciennes',
  quota: 'Quota atteint',
  auth_error: 'Erreur d’authentification',
  failure: 'Panne ou schéma invalide',
  disabled: 'Désactivée',
  on_demand: 'À la demande',
};
export const integrationLabel = {
  verified: 'Opérationnelle vérifiée',
  missing_key: 'Implémentée, clé manquante',
  implemented_unverified: 'Implémentée, test réel en attente',
  to_develop: 'À développer',
  license_unclear: 'Licence ou accès à clarifier',
  no_coverage: 'Sans couverture',
  excluded: 'Non retenue',
};

let dialogSequence = 0;
export function askText(label, { maxLength = 100, multiline = false } = {}) {
  return new Promise((resolve) => {
    const previous = document.activeElement,
      id = 'paris-input-' + ++dialogSequence,
      d = el('dialog', null, { 'aria-label': label }),
      form = el('form'),
      l = el('label', label, { for: id }),
      input = el(multiline ? 'textarea' : 'input', null, {
        id,
        maxlength: String(maxLength),
        required: '',
      }),
      controls = el('div', null, { class: 'actions' }),
      save = el('button', 'Enregistrer', { type: 'submit' }),
      cancel = el('button', 'Annuler', { type: 'button' });
    const finish = (value) => {
      d.close();
      d.remove();
      previous?.focus();
      resolve(value);
    };
    cancel.addEventListener('click', () => finish(null));
    d.addEventListener('cancel', (e) => {
      e.preventDefault();
      finish(null);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (value) finish(value);
    });
    controls.append(save, cancel);
    form.append(l, input, controls);
    d.append(form);
    document.body.append(d);
    d.showModal();
    input.focus();
  });
}
