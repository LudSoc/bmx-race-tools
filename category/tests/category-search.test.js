// Tests de la recherche pilote du tableau (tokens, navigation circulaire).
// Code extrait de index.html (pas recopié) ; norm vient de common.js.
// Usage : node --test tests/category-search.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const commonSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'common.js'), 'utf8');
const SC = new Function('window', commonSrc + '\nreturn window.BmxCommon;')({});
function block(start, indent = '  ') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
const H = new Function('norm',
  block('function wrapSearchPos(pos, n) {') + '\n' +
  block('function stepSearchState(centered, pos, dir, n) {') + '\n' +
  'let currentYearFilter = "all";\n' +
  block('function renderYearFilterBar() {') +
  '\nreturn { wrapSearchPos, stepSearchState, renderYearFilterBar, __setYF: (v) => { currentYearFilter = v; } };'
)(SC.norm);

test('wrapSearchPos : circulaire dans les deux sens', () => {
  assert.equal(H.wrapSearchPos(0, 5), 0);
  assert.equal(H.wrapSearchPos(5, 5), 0);
  assert.equal(H.wrapSearchPos(-1, 5), 4);
  assert.equal(H.wrapSearchPos(-6, 5), 4);
  assert.equal(H.wrapSearchPos(7, 5), 2);
  assert.equal(H.wrapSearchPos(0, 0), 0);
  assert.equal(H.wrapSearchPos(3, 1), 0);
});

test('stepSearchState : Entrée centre d’abord, puis navigue', () => {
  assert.deepEqual(H.stepSearchState(false, 0, 1, 5), { centered: true, pos: 0 });
  assert.deepEqual(H.stepSearchState(false, 3, -1, 5), { centered: true, pos: 3 });
  assert.deepEqual(H.stepSearchState(true, 0, 1, 5), { centered: true, pos: 1 });
  assert.deepEqual(H.stepSearchState(true, 0, -1, 5), { centered: true, pos: 4 });
  assert.deepEqual(H.stepSearchState(true, 4, 1, 5), { centered: true, pos: 0 });
  assert.deepEqual(H.stepSearchState(false, 0, 1, 0), { centered: true, pos: 0 });
});

test('renderYearFilterBar : libellés favorable/défavorable', () => {
  H.__setYF('all');
  const out = H.renderYearFilterBar();
  assert.ok(out.includes('1ère année (défavorable)'), 'bouton 1ère année');
  assert.ok(out.includes('2ème année (favorable)'), 'bouton 2ème année');
  assert.ok(out.includes('data-yf="1"') && out.includes('data-yf="2"'), 'valeurs inchangées');
  H.__setYF('2');
  assert.ok(/data-yf="2" role="tab" aria-selected="true"/.test(H.renderYearFilterBar()), 'état actif');
});
