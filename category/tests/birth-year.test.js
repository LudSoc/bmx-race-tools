// Repli année de naissance : `by` (index récents) ou dérivée de `age`
// (anciens index : by = année de l'épreuve − âge). Sans ça, dominantBy est
// null partout et le filtre 1ère/2ème année ne filtre rien.
// Usage : node --test tests/birth-year.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start, indent = '  ') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}

const H = new Function(
  block('function birthYearOf(c, event) {') +
  '\nreturn { birthYearOf };'
)();

test('birthYearOf : champ by prioritaire', () => {
  assert.equal(H.birthYearOf({ by: 2015, age: 11 }, { eventDate: '2026-05-01' }), 2015);
});

test('birthYearOf : repli age (anciens index sans by)', () => {
  assert.equal(H.birthYearOf({ age: 11 }, { eventDate: '2026-05-01' }), 2015);
  assert.equal(H.birthYearOf({ age: 10 }, { eventDate: '2026-05-01', eventEndDate: '' }), 2016);
});

test('birthYearOf : null sans by ni age valable', () => {
  assert.equal(H.birthYearOf({}, { eventDate: '2026-05-01' }), null);
  assert.equal(H.birthYearOf({ age: 0 }, { eventDate: '2026-05-01' }), null);
  assert.equal(H.birthYearOf({ age: 11 }, { eventDate: '' }), null);
  assert.equal(H.birthYearOf(null, null), null);
});

