// Tests des noms complets de clubs (clubs.json + helpers dans index.html).
// Format : « BMX BESANCON (BESANC) », repli code seul si inconnu.
// Usage : node --test tests/club-names.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start, indent = '') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
const harness = [
  block('const normClubCode = s =>'),
  'for (const [k, v] of Object.entries(__SEED)) clubFullNames.set(k, v);',
  block('function clubDisplayName(raw) {'),
].join('\n') + '\nreturn { normClubCode, clubDisplayName };';
const H = seed => new Function('__SEED', harness)(seed);

test('connu → « Nom (CODE) »', () => {
  const h = H({ besanc: 'BMX BESANCON' });
  assert.equal(h.clubDisplayName('BESANC'), 'BMX BESANCON (BESANC)');
});

test('inconnu → code seul', () => {
  const h = H({});
  assert.equal(h.clubDisplayName('EABORD'), 'EABORD');
});

test('chaîne vide → filtrée par filter(Boolean) en amont', () => {
  const h = H({ besanc: 'BMX BESANCON' });
  assert.equal(h.clubDisplayName(''), '');
  assert.ok(!h.clubDisplayName(''));
});

test('clubs.json : annuaire commun présent à la racine du monorepo', () => {
  const local = fs.readFileSync(path.join(__dirname, '..', '..', 'clubs.json'), 'utf8');
  const { mapping } = JSON.parse(local);
  assert.ok(mapping && Object.keys(mapping).length >= 200);
  assert.equal(mapping.BLAGNA.name, 'BLAGNAC BMX');
});
