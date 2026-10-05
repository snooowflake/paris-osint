// Adaptation équivalente de la détection du contexte global de Knockout.
// Aucun assouplissement CSP : les widgets à expressions dynamiques sont désactivés.
export function knockoutGlobalThis(code) {
  const legacy = 'this||(0,eval)("this")';
  if (!code.includes(legacy))
    throw Error(
      'Initialisation Knockout inattendue : vérifier la version Cesium',
    );
  return code.replace(legacy, 'globalThis');
}
export function parisCspCompatibility() {
  return {
    name: 'paris-cesium-csp',
    enforce: 'pre',
    transform(code, id) {
      if (id.replaceAll('\\\\', '/').endsWith('/ThirdParty/knockout-3.5.1.js'))
        return { code: knockoutGlobalThis(code), map: null };
    },
  };
}
