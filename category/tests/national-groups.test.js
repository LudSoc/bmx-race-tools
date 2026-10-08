// Groupes nationaux : tranches d'âge, référentiel, validation des clés,
// portée du score par format (U17 ≢ Cruiser U17).
// - bracketOf : chaque tranche nationale a une borne [min, max] (Infinity
//   pour les tranches ouvertes) ; cruiser et 20″ partagent les mêmes bornes.
// - buildRefData : 39 tranches nationales, un seul couple (sexe, format)
//   par trancheKey, labels affichables + map des formats par code.
// - isValidCatCode : `nat:<trancheKey>` connu uniquement.
// - fmtOfCode/inScope : le score ne porte que sur le format de la vue.
// Usage : node --test tests/national-groups.test.js
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

const ref = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'stats', 'categories-ref.json'), 'utf8'));
const H = new Function(
  'const NAT_PREFIX = "nat:";\n' +
  'const EXCLUDED_TK = new Set(["sf", "sg"]);\n' +
  'const ELITE_TKS = new Set(["u19f", "u19h", "u23f", "u23h", "ef", "eh"]);\n' +
  'const FR_FOREIGN = new Set(["uec", "ucibmxworlds", "uciworldcup"]);\n' +
  block('const TRANCHE_AGES = {', '  };\n') +
  '\n' +
  block('function bracketOf(tk) {', '\n  }\n') +
  '\n' +
  block('function pickGroupLabel(entries) {', '\n  }\n') +
  '\n' +
  block('function buildRefData(cats) {', '\n  }\n') +
  '\n' +
  block('function withExtraGroups(nat) {', '\n  }\n') +
  '\nlet natCats = null;\n' +
  block('function isValidCatCode(code) {', '\n  }\n') +
  '\nlet codeFormat = null;\n' +
  block('function fmtOfCode(code) {', '\n  }\n') +
  '\n' +
  block('function inScope(fmt, catFormat) {', '\n  }\n') +
  '\nlet refCats = null;\n' +
  block('function eliteTrancheOf(accountCode, code) {', '\n  }\n') +
  '\nreturn { bracketOf, buildRefData, withExtraGroups, isValidCatCode, fmtOfCode, inScope, eliteTrancheOf, __setNat: (m) => { natCats = m; }, __setFmt: (m) => { codeFormat = m; }, __setRef: (r) => { refCats = r; } };'
)();

test('bracketOf : bornes jeunes, adultes, ouvertes', () => {
  assert.deepEqual(H.bracketOf('gU11'), [9, 10]);
  assert.deepEqual(H.bracketOf('fU15'), [13, 14]);
  assert.deepEqual(H.bracketOf('u19h'), [17, 18]);
  assert.deepEqual(H.bracketOf('u23f'), [19, 22]);
  assert.deepEqual(H.bracketOf('m17-24'), [17, 24]);
  assert.deepEqual(H.bracketOf('m30p'), [30, Infinity]);
  assert.deepEqual(H.bracketOf('crU15G'), [13, 14]);
  assert.deepEqual(H.bracketOf('crM17-24'), [17, 24]);
  assert.deepEqual(H.bracketOf('crF17-29'), [17, 29]);
  assert.equal(H.bracketOf('inconnu'), null);
});

test('buildRefData : 39 tranches (supercross exclu), sexe/format uniques, labels propres', () => {
  const { sex, fmt, nat } = H.buildRefData(ref.categories);
  assert.equal(nat.size, 39);
  assert.ok(!nat.has('sf') && !nat.has('sg'), 'supercross exclu (pas de catégorie nationale Annexe 3)');
  assert.ok(sex.size > 150);
  assert.ok(fmt.size > 150);
  assert.equal(fmt.get('U11G'), '20p');
  assert.equal(fmt.get('CRU15G'), 'cruiser');
  assert.equal(fmt.get('TT15'), 'tt');
  assert.equal(nat.get('gU11').label, 'U11 Garçon');
  assert.equal(nat.get('gU11').sex, 'M');
  assert.equal(nat.get('crF17-29').format, 'cruiser');
  for (const [tk, g] of nat) {
    assert.ok(g.label.includes(' '), `${tk} : libellé affichable (${g.label})`);
    assert.ok(!/provisoire/i.test(g.label), `${tk} : sans mention (provisoire)`);
    assert.ok(H.bracketOf(tk), `${tk} : tranche d'âge définie`);
  }
});

test('fmtOfCode/inScope : le score ne porte que sur le format de la vue', () => {
  const { fmt } = H.buildRefData(ref.categories);
  H.__setFmt(fmt);
  assert.equal(H.fmtOfCode('U17G'), '20p');
  assert.equal(H.fmtOfCode('CRU17G'), 'cruiser');
  assert.equal(H.fmtOfCode('TT15'), 'tt');
  assert.equal(H.fmtOfCode('CODE_INCONNU'), '20p');
  assert.equal(H.fmtOfCode(null), '20p');
  // Vue 20″ : cruiser et TT exclus → U17 ≢ Cruiser U17.
  assert.ok(H.inScope('20p', '20p'));
  assert.ok(!H.inScope('cruiser', '20p'));
  assert.ok(!H.inScope('tt', '20p'));
  // Vue cruiser : seul le cruiser score.
  assert.ok(H.inScope('cruiser', 'cruiser'));
  assert.ok(!H.inScope('20p', 'cruiser'));
  H.__setFmt(null);
  assert.equal(H.fmtOfCode('CRU17G'), '20p', 'repli sans référentiel');
});

test('eliteTrancheOf : U19/U23/Elite au niveau national+ uniquement', () => {
  H.__setRef(ref);
  // FR national : compte.
  assert.equal(H.eliteTrancheOf('ffc', 'EH'), 'eh');
  assert.equal(H.eliteTrancheOf('ffc', 'JH'), 'u19h');
  assert.equal(H.eliteTrancheOf('ffc', 'U23F'), 'u23f');
  // FR régional : ne compte pas (EHR/JHR = circuit régional).
  assert.equal(H.eliteTrancheOf('club-x', 'EHR'), null);
  assert.equal(H.eliteTrancheOf('club-x', 'JHR'), null);
  assert.equal(H.eliteTrancheOf('club-x', 'U19HR'), null);
  // Non-élite : jamais.
  assert.equal(H.eliteTrancheOf('ffc', 'H1724'), null);
  assert.equal(H.eliteTrancheOf('ffc', 'U11G'), null);
  // UEC : niveau international par construction.
  assert.equal(H.eliteTrancheOf('uec', 'ME'), 'eh');
  assert.equal(H.eliteTrancheOf('uec', 'WJ'), 'u19f');
  // Inconnu / sans ref.
  assert.equal(H.eliteTrancheOf('ffc', 'ZZZ'), null);
  H.__setRef(null);
  assert.equal(H.eliteTrancheOf('ffc', 'EH'), null);
});

test('withExtraGroups : U7 Fille/Garçon ajoutés (non nationaux), sans écraser', () => {
  const { nat } = H.buildRefData(ref.categories);
  assert.equal(nat.size, 39);
  const full = H.withExtraGroups(nat);
  assert.equal(full.size, 41);
  assert.deepEqual(full.get('fU7'), { label: 'U7 Fille', sex: 'F', format: '20p' });
  assert.deepEqual(full.get('gU7'), { label: 'U7 Garçon', sex: 'M', format: '20p' });
  assert.deepEqual(H.bracketOf('fU7'), [0, 6]);
  // Idempotent et non destructif.
  assert.equal(H.withExtraGroups(full).size, 41);
});

test('isValidCatCode : nat:<tranche> connu uniquement', () => {
  const { nat } = H.buildRefData(ref.categories);
  H.__setNat(H.withExtraGroups(nat));
  assert.ok(H.isValidCatCode('nat:gU11'));
  assert.ok(H.isValidCatCode('nat:fU7'), 'U7 ajoutée');
  assert.ok(!H.isValidCatCode('nat:zzz'));
  assert.ok(!H.isValidCatCode('by:2013:F'));
  assert.ok(!H.isValidCatCode('U11G'));
  assert.ok(!H.isValidCatCode(''));
  H.__setNat(null);
  assert.ok(!H.isValidCatCode('nat:gU11'));
});
