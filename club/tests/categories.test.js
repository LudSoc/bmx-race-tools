// Noms des catégories (UEC → nom officiel via catRef, plus le code) + tri par niveau
// puis alphabétique, comme dans les autres outils (category_stats).
// Usage : node --test tests/categories.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n  }\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + '\n  }\n'.length);
}

const harness = [
  'const CODE_TO_GROUP = new Map();',
  'const CLASS_NAMES = {};',
  'let catRef = {',
  '  categories: { EH: { label: "Élite Homme", level: "national" }, U11GR: { label: "U11 Garçon", level: "regional" } },',
  '  categoriesUec: { B06: { label: "Boys 6", level: "uec" } },',
  '  categoriesUci: {},',
  '  categoriesWorldCup: {},',
  '};',
  'const REF_LEVEL_LABELS = { national: "National", regional: "Régional", uec: "UEC" };',
  'const LVL_ORDER = { regional: 0, national: 1, uec: 2, uci: 3 };',
  'const norm = s => s;',
  block('function refLevelFor(code) {'),
  block('function categoryLabel(code, className) {'),
  block('function buildCatsData(pilots) {'),
].join('\n') + '\nreturn { categoryLabel, buildCatsData };';
const H = new Function(harness)();

const PILOT = {
  key: 'x y', firstName: 'X', lastName: 'Y',
  matches: [
    { cls: { perpetualClassCode: 'B06', className: '6&7 (only national)' }, competitor: { rank: 1, firstName: 'X', lastName: 'Y' } },
    { cls: { perpetualClassCode: 'EH', className: 'Élite Homme' }, competitor: { rank: 2, firstName: 'X', lastName: 'Y' } },
    { cls: { perpetualClassCode: 'U11GR', className: 'U11 Garçon' }, competitor: { rank: 3, firstName: 'X', lastName: 'Y' } },
    { cls: { perpetualClassCode: 'CUSTOM', className: 'Catégorie locale' }, competitor: { rank: 4, firstName: 'X', lastName: 'Y' } },
  ],
};

test('UEC : le nom officiel remplace le code', () => {
  const cats = H.buildCatsData([PILOT]);
  const byCode = Object.fromEntries(cats.map(c => [c.code, c.label]));
  assert.equal(byCode.B06, 'Boys 6', 'B06 → « Boys 6 » (pas le code)');
  assert.equal(byCode.EH, 'Élite Homme');
  assert.equal(byCode.U11GR, 'U11 Garçon');
  assert.equal(byCode.CUSTOM, 'Catégorie locale', 'repli sur className si absent du référentiel');
  assert.ok(!cats.some(c => c.code === 'B06' && c.label === 'B06'), 'aucun libellé = code UEC');
});

test('tri : niveau d’abord (regional → national → uec), puis alphabétique', () => {
  const cats = H.buildCatsData([PILOT]);
  assert.deepEqual(cats.map(c => c.code), ['U11GR', 'EH', 'B06', 'CUSTOM']);
  assert.ok(cats.every(c => (c.level === 'regional' ? 0 : c.level === 'national' ? 1 : c.level === 'uec' ? 2 : 99) >= 0));
});

test('categoryLabel isolé : priorité groupe FR, puis CLASS_NAMES, puis catRef', () => {
  assert.equal(H.categoryLabel('U11GR', 'U11 Garçon'), 'U11 Garçon');
  assert.equal(H.categoryLabel('B06', ''), 'Boys 6');
  assert.equal(H.categoryLabel('INCONNU', 'Nom local'), 'Nom local');
  assert.equal(H.categoryLabel('', ''), '');
});