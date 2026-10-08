// Année de naissance fiche pilote : `by` (index récents) ou dérivée de `age`
// (anciens index sans `by` : by = année de l'épreuve − âge). Sans repli, le
// badge « 🎂 Né(e) en … » disparaît tant que l'index n'est pas régénéré.
// Usage : node --test tests/birth-year.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start, indent = '  ') {
  const i = html.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = html.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return html.slice(i, j + ('\n' + indent + '}\n').length);
}
const H = new Function(
  block('function birthYearOfMatch(m) {') +
  '\nreturn { birthYearOfMatch };'
)();

test('birthYearOfMatch : champ by prioritaire', () => {
  const m = { event: { eventDate: '2026-05-01' }, competitor: { by: 2015, age: 11 } };
  assert.equal(H.birthYearOfMatch(m), 2015);
});

test('birthYearOfMatch : repli age (anciens index sans by)', () => {
  const m = { event: { eventDate: '2026-05-01' }, competitor: { age: 11 } };
  assert.equal(H.birthYearOfMatch(m), 2015);
});

test('birthYearOfMatch : null sans by ni age valable', () => {
  assert.equal(H.birthYearOfMatch({ event: { eventDate: '2026-05-01' }, competitor: {} }), null);
  assert.equal(H.birthYearOfMatch({ event: { eventDate: '2026-05-01' }, competitor: { age: 0 } }), null);
  assert.equal(H.birthYearOfMatch({ event: { eventDate: '' }, competitor: { age: 11 } }), null);
  assert.equal(H.birthYearOfMatch(null), null);
});

test('birthYearOfMatch : UEC/UCI (groupName = pays, age parfois absent)', () => {
  const m = { event: { eventDate: '2025-07-29' }, account: { accountCode: 'ucibmxworlds' }, competitor: { firstName: 'Abel', lastName: 'POULOT', groupName: 'FRA' } };
  assert.equal(H.birthYearOfMatch(m), null);
});
