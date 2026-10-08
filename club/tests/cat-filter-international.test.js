// Filtre catégorie sur une catégorie purement internationale (fonctions extraites
// de index.html). Non-régression : la carte « Women U23 » (UCI) affiche N pilotes
// mais l'ancien code répondait « Aucun résultat » — la passe 0 appliquait le filtre
// catégorie au seul index FR, vidant l'identité du club (match international par nom).
// Usage : node --test tests/cat-filter-international.test.js
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
const harness = [
  'const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");',
  'const normClub = s => (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");',
  'const CODE_TO_GROUP = new Map([["U17FR", { key: "g:U17F" }], ["U15FR", { key: "g:U15F" }]]);',
  'let pilotsIndex = null, uecIndex = null, uciIndex = null, wcIndex = null;',
  'let selectedClubKey = null, catFilter = "", yearFilter = new Set();',
  block('function computeStats(matches) {'),
  block('function catFilterMatches(cls) {'),
  block('function buildPilotsData(ignoreCatFilter = false, ignoreYearFilter = false) {'),
].join('\n') + '\nreturn { buildPilotsData, catFilterMatches, __set: (s) => {'
  + ' pilotsIndex = s.fr; uciIndex = s.uci || null;'
  + ' selectedClubKey = s.club; catFilter = s.cat || ""; yearFilter = s.years || new Set(); } };';
const H = new Function(harness)();

const FR = { events: [{
  event: { eventId: 'fr1', eventDate: '2025-06-14' },
  classes: [
    { perpetualClassCode: 'U17FR', className: 'U17 Fille', competitors: [
      { firstName: 'Lea', lastName: 'A', groupName: 'BESANC', rank: 2 },
      { firstName: 'Mia', lastName: 'B', groupName: 'BESANC', rank: 5 },
    ] },
    { perpetualClassCode: 'U15FR', className: 'U15 Fille', competitors: [
      { firstName: 'Zoe', lastName: 'C', groupName: 'BESANC', rank: 1 },
      { firstName: 'Noe', lastName: 'D', groupName: 'BESANC', rank: 3 },
    ] },
  ],
}] };
const UCI = { events: [{
  event: { eventId: 'uci1', eventDate: '2025-08-02' },
  classes: [
    { perpetualClassCode: 'WU23', className: 'Women U23', competitors: [
      { firstName: 'Lea', lastName: 'A', rank: 4 },
      { firstName: 'Mia', lastName: 'B', rank: 7 },
      { firstName: 'Zoe', lastName: 'C', rank: 2 },
      { firstName: 'Noe', lastName: 'D', rank: 9 },
    ] },
  ],
}] };

test('catégorie UCI seule (WU23) : les 4 pilotes du club remontent', () => {
  H.__set({ fr: FR, uci: UCI, club: 'besanc', cat: 'WU23' });
  const pilots = H.buildPilotsData();
  assert.equal(pilots.length, 4, '4 pilotes, pas « aucun résultat »');
  for (const p of pilots) {
    assert.equal(p.matches.length, 1, p.name + ' : seul le match WU23');
    assert.equal(p.matches[0].cls.perpetualClassCode, 'WU23');
  }
});

test('sans filtre : FR + UCI cumulés', () => {
  H.__set({ fr: FR, uci: UCI, club: 'besanc' });
  const pilots = H.buildPilotsData();
  assert.equal(pilots.length, 4);
  for (const p of pilots) assert.equal(p.matches.length, 2, p.name + ' : 1 FR + 1 UCI');
});

test('filtre groupe FR (g:U17F) : toujours fonctionnel', () => {
  H.__set({ fr: FR, uci: UCI, club: 'besanc', cat: 'g:U17F' });
  const names = H.buildPilotsData().map(p => p.name).sort();
  assert.deepEqual(names, ['Lea A', 'Mia B']);
});

test('catFilterMatches : repli className si pas de perpetualClassCode', () => {
  H.__set({ fr: FR, uci: null, club: 'besanc', cat: 'Women U23' });
  assert.ok(H.catFilterMatches({ className: 'Women U23' }), 'match sur className');
  assert.ok(!H.catFilterMatches({ perpetualClassCode: 'WU23', className: 'Women U23' }), 'WU23 ≠ Women U23');
});
