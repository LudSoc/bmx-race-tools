// Tests du tri de la liste des catégories : niveau d'abord (régional → national
// → UEC → UCI), puis nom affiché alphabétique dans le niveau (repli code).
// Code extrait de index.html (pas recopié) ; refLevelFor simulé par niveaux.
// Usage : node --test tests/cat-sort.test.js
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
  'let catList = [];' +
  'const refLevels = {};' +
  'function refLevelFor(code) { return refLevels[code] || ""; }' +
  block('function sortCatList() {') +
  '\nreturn { sortCatList, __set: (list, lvls) => { catList = list.map(x => ({ ...x })); Object.keys(lvls).forEach(k => { refLevels[k] = lvls[k]; }); }, __codes: () => catList.map(x => x.code) };'
)();

test('sortCatList : niveaux d’abord, ordre régional→national→uec→uci, inconnus en fin', () => {
  H.__set([
    { code: 'EF', name: 'Elite Femme' },
    { code: '10FR', name: 'Fille 10 ans' },
    { code: 'G10', name: 'Garçon 10' },
    { code: 'uec:B11', name: 'Boys 11' },
    { code: 'uci:U10B_20', name: 'U10 Boys 20' },
    { code: 'XZZ', name: 'Inconnue' },
  ], {
    'EF': 'national', '10FR': 'regional', 'G10': 'national',
    'uec:B11': 'uec', 'uci:U10B_20': 'uci',
  });
  H.sortCatList();
  assert.equal(H.__codes()[0], '10FR', 'régional d’abord');
  assert.equal(H.__codes()[1], 'EF', 'national ensuite');
  assert.equal(H.__codes()[2], 'G10');
  assert.equal(H.__codes()[3], 'uec:B11', 'uec puis uci');
  assert.equal(H.__codes()[4], 'uci:U10B_20');
  assert.equal(H.__codes()[5], 'XZZ', 'niveau inconnu en fin');
});

test('sortCatList : ordre alphabétique du nom affiché dans un même niveau', () => {
  H.__set([
    { code: 'U7GR', name: 'U7 GARCON' },
    { code: 'EFR', name: 'ELITE FEMME' },
    { code: '10FR', name: 'FILLE 10 ANS' },
    { code: '7GR', name: 'GARCON 7 ANS' },
    { code: 'EHR', name: 'ÉLITE REGIONALE HOMME' },
  ], {
    'U7GR': 'regional', 'EFR': 'regional', '10FR': 'regional', '7GR': 'regional', 'EHR': 'regional',
  });
  H.sortCatList();
  assert.deepEqual(H.__codes(), ['EFR', 'EHR', '10FR', '7GR', 'U7GR'],
    '« élite » < « fille 10 » < « garçon 7 » < « u7 », accents ignorés');
});

test('sortCatList : mêmes noms → ordre par code ; sans nom → repli code', () => {
  H.__set([
    { code: 'CRH3039R', name: 'CRUISER HOMME 30/39' },
    { code: 'CRH3034R', name: 'CRUISER HOMME 30/39' },
    { code: 'NONAME', name: '' }, // nom manquant : tri par code
    { code: 'AAA', name: 'Z' },   // nom présent : AAA passe après Z ? non, Z > nom
  ], {
    'CRH3039R': 'regional', 'CRH3034R': 'regional', 'NONAME': 'regional', 'AAA': 'regional',
  });
  H.sortCatList();
  assert.deepEqual(H.__codes(), ['CRH3034R', 'CRH3039R', 'NONAME', 'AAA'],
    'même nom → codes CRH3034R < CRH3039R ; replis code « noname » < nom « z » (AAA)');
});