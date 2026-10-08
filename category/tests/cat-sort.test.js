// Tests du tri des catégories nationales : âge croissant (min, puis max pour
// les tranches partant du même âge), blocs U19 → U23 → Élite à la fin,
// ensuite 20″ avant cruiser, M avant F, codes inconnus en tout dernier.
// Code extrait de index.html (pas recopié).
// Usage : node --test tests/cat-sort.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(start, endMark) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf(endMark, i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + endMark.length);
}

const H = new Function(
  'const NAT_PREFIX = "nat:";\n' +
  block('const TRANCHE_AGES = {', '  };\n') +
  '\n' +
  block('function bracketOf(tk) {', '\n  }\n') +
  '\nlet catList = [];\n' +
  block('function sortCatList() {', '\n  }\n') +
  '\nreturn { sortCatList, __set: (list) => { catList = list.map(x => ({ ...x })); }, __codes: () => catList.map(x => x.code) };'
)();

test('sortCatList : âge croissant, élites à la fin, 20″ avant cruiser, M avant F', () => {
  H.__set([
    { code: 'nat:eh', name: 'Elite Homme', sex: 'M', format: '20p' },
    { code: 'nat:gU7', name: 'U7 Garçon', sex: 'M', format: '20p' },
    { code: 'nat:crM17-24', name: 'Cruiser Homme 17/24', sex: 'M', format: 'cruiser' },
    { code: 'nat:m17-24', name: 'Homme 17/24', sex: 'M', format: '20p' },
    { code: 'nat:gU11', name: 'U11 Garçon', sex: 'M', format: '20p' },
    { code: 'nat:fU11', name: 'U11 Fille', sex: 'F', format: '20p' },
    { code: 'nat:ef', name: 'Elite Femme', sex: 'F', format: '20p' },
    { code: 'XZZ', name: 'Inconnue' },
  ]);
  H.sortCatList();
  assert.deepEqual(H.__codes(), ['nat:gU7', 'nat:gU11', 'nat:fU11', 'nat:m17-24', 'nat:crM17-24', 'nat:eh', 'nat:ef', 'XZZ']);
});

test('sortCatList : même âge min → l’âge max départage (U7 avant U9)', () => {
  H.__set([
    { code: 'nat:gU9', name: 'U9 Garçon', sex: 'M', format: '20p' },
    { code: 'nat:fU7', name: 'U7 Fille', sex: 'F', format: '20p' },
    { code: 'nat:gU7', name: 'U7 Garçon', sex: 'M', format: '20p' },
    { code: 'nat:fU9', name: 'U9 Fille', sex: 'F', format: '20p' },
  ]);
  H.sortCatList();
  assert.deepEqual(H.__codes(), ['nat:gU7', 'nat:fU7', 'nat:gU9', 'nat:fU9'],
    'U7 (0-6) avant U9 (0-8), M avant F dans chaque tranche');
});

test('sortCatList : U19 (dont cruiser) → U23 → élite regroupés à la fin', () => {
  H.__set([
    { code: 'nat:eh', name: 'Elite Homme', sex: 'M', format: '20p' },
    { code: 'nat:u23f', name: 'U23 Femme', sex: 'F', format: '20p' },
    { code: 'nat:crU19F', name: 'Cruiser U19 Fille', sex: 'F', format: 'cruiser' },
    { code: 'nat:u19f', name: 'U19 Fille', sex: 'F', format: '20p' },
    { code: 'nat:u19h', name: 'U19 Homme', sex: 'M', format: '20p' },
    { code: 'nat:m17-24', name: 'Homme 17/24', sex: 'M', format: '20p' },
    { code: 'nat:u23h', name: 'U23 Homme', sex: 'M', format: '20p' },
    { code: 'nat:crU17G', name: 'Cruiser U17 Garçon', sex: 'M', format: 'cruiser' },
  ]);
  H.sortCatList();
  assert.deepEqual(H.__codes(), [
    'nat:crU17G',  // 15/16 : reste dans la suite par âge
    'nat:m17-24',  // 17/24
    'nat:u19h', 'nat:u19f', 'nat:crU19F', // bloc U19 (20″ puis cruiser)
    'nat:u23h', 'nat:u23f',               // bloc U23
    'nat:eh',                             // élite tout dernier (âge min 18 < U23)
  ]);
});
