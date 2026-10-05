import { request, SourceError } from './http.mjs';
import { feature, plain } from './paris-data.mjs';
import { utc } from '../../src/paris/geo.mjs';
export function parsePrim(s, j, line) {
  const delivery = j?.Siri?.ServiceDelivery;
  if (!delivery || !Array.isArray(delivery.GeneralMessageDelivery))
    throw Error('SIRI GeneralMessageDelivery invalide');
  const out = [];
  for (const d of delivery.GeneralMessageDelivery) {
    if (d.Status === false) throw Error('SIRI Status false');
    if (!Array.isArray(d.InfoMessage)) continue;
    for (const m of d.InfoMessage) {
      const content = m.Content || {},
        refs = (content.LineRef || []).map((r) => r.value || r);
      if (refs.length && !refs.includes('STIF:Line::' + line + ':')) continue;
      const messages = (content.Message || [])
        .map((x) => plain(x.MessageText?.value || x.MessageText || ''))
        .filter(Boolean);
      if (!messages.length) continue;
      const date = utc(
        m.RecordedAtTime || d.ResponseTimestamp || delivery.ResponseTimestamp,
      );
      if (!date) throw Error('Date SIRI manquante');
      out.push(
        feature(
          s,
          String(
            m.ItemIdentifier?.value ||
              m.ItemIdentifier ||
              m.InfoMessageIdentifier?.value ||
              m.InfoMessageIdentifier ||
              line,
          ) +
            ':' +
            line,
          messages.join(' · '),
          null,
          {
            lineRef: line,
            description: messages.join(' · '),
            coverage:
              'Message de ligne desservant Paris ; segment affecté non localisé',
            official: true,
          },
          { publishedAt: date, validTo: utc(m.ValidUntilTime) },
        ),
      );
    }
  }
  return out;
}
export async function prim(s, o, env) {
  const lines = (env.PRIM_LINE_IDS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    !lines.length ||
    lines.length > 5 ||
    lines.some((x) => !/^C\d{5}$/.test(x))
  )
    throw new SourceError(
      'disabled',
      'Configurer 1 à 5 lignes PRIM officielles et vérifier le quota attribué',
    );
  const refs = o.store.get('source:idfm-traces')?.features || [];
  const parisLines = new Set(refs.map((f) => f.properties.lineRef));
  if (lines.some((x) => !parisLines.has(x)))
    throw new SourceError(
      'disabled',
      'Lignes non vérifiées dans le référentiel parisien',
    );
  const features = [];
  for (const line of lines) {
    const q = new URLSearchParams({ LineRef: 'STIF:Line::' + line + ':' });
    const j = await request(
      'https://prim.iledefrance-mobilites.fr/marketplace/general-message?' + q,
      { ...o, headers: { apiKey: env.PRIM_API_KEY } },
    );
    features.push(...parsePrim(s, j, line));
  }
  return {
    features,
    schema:
      'SIRI ServiceDelivery/GeneralMessageDelivery/InfoMessage ; LineRef, RecordedAtTime, ValidUntilTime et MessageText',
  };
}
