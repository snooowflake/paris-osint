// TESTS SYNTHÉTIQUES : aucun fournisseur ni accès à la production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { knockoutGlobalThis } from '../../build/paris-csp.mjs';
test('Cesium : contexte global compatible CSP sans eval', () => {
  assert.equal(
    knockoutGlobalThis('var A=this||(0,eval)("this"),w=A.document;'),
    'var A=globalThis,w=A.document;',
  );
  assert.throws(() => knockoutGlobalThis('VERSION INATTENDUE'), /inattendue/);
});
