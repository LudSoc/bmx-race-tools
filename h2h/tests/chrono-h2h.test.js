// Tests du duel chronos H2H (transpondeur, par métrique).
// Le code testé est EXTRAIT de index.html (pas recopié) ; le socle vient de common.js.
// Usage : node --test tests/chrono-h2h.test.js  (uec-index.json doit exister côté sqorz-stats)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const workspace = path.join(root, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const commonSrc = fs.readFileSync(path.join(workspace, 'common.js'), 'utf8');
const SC = new Function('window', commonSrc + '\nreturn window.BmxCommon;')({});

function block(src, start, indent = '') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
function stmt(src, start) {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  return src.slice(i, src.indexOf(';', i) + 1);
}

const harnessSrc = [
  'const { isNotTimedPhase, num, escape } = __SC;',
  'let pilotA = null, pilotB = null;',
  "const STATS_BASE = 'https://example.invalid/';",
  block(html, 'const normClubCode = s =>'),
  "for (const [k, v] of Object.entries({ besanc: 'BMX BESANCON' })) clubFullNames.set(k, v);",
  block(html, 'function clubDisplayName(raw) {'),
  stmt(html, 'const CHRONO_METRICS ='),
  stmt(html, 'const fmtChrono ='),
  block(html, 'function bestChrono(details, key) {'),
  block(html, 'function chronoBests(details) {'),
  block(html, 'function computeChronoStats(confrontations) {'),
  block(html, 'function specialLabel(r) {'),
  block(html, 'function fmtDate(iso) {'),
  block(html, 'function eventNameCell(c) {'),
  block(html, 'function renderH2HTable(confrontations) {'),
  block(html, 'function renderChronoTable(confrontations, metric) {'),
  block(html, 'function renderViewSelector(chronoStats, activeView, rankCount, racesCount = 0) {'),
  block(html, 'function renderH2HHeader(stats, viewScore) {'),
  block(html, 'function raceKeyOf(d) {'),
  block(html, 'function phaseOrder(name) {'),
  block(html, 'function frPhase(name) {'),
  block(html, 'function sharedRaces(aDetails, bDetails) {'),
  block(html, 'function flattenSharedRaces(confrontations) {'),
  block(html, 'function renderRaceTable(races) {'),
  block(html, 'function specialLabel(r) {'),
  block(html, 'function renderSharedRaces(shared) {'),
  block(html, 'function filterConfrontations(confrontations, cat, year, sameRaceOnly) {'),
  block(html, 'function confrontationYears(confrontations) {'),
  block(html, 'function renderYearFilter(years, activeYear) {'),
].join('\n') + '\nreturn { CHRONO_METRICS, fmtChrono, bestChrono, chronoBests, computeChronoStats, renderH2HTable, renderRaceTable, flattenSharedRaces, renderChronoTable, renderViewSelector, renderH2HHeader, raceKeyOf, sharedRaces, phaseOrder, frPhase, specialLabel, renderSharedRaces, eventNameCell, filterConfrontations, confrontationYears, renderYearFilter, __setPilots: (a, b) => { pilotA = a; pilotB = b; } };';
const H = new Function('__SC', harnessSrc)(SC);

// --- bestChrono : règles d'exclusion ---
test('bestChrono : ignore DNF et temps ≤ 0', () => {
  const det = [
    { phaseName: 'Moto 1', result: 2, time: '35.100' },
    { phaseName: 'Moto 2', result: 100000, time: '30.000' }, // DNF : ignoré malgré un temps
    { phaseName: 'Finale', result: 4, time: '0' },           // temps nul : ignoré
    { phaseName: 'Semi', result: 1, time: '34.950' },
  ];
  assert.equal(H.bestChrono(det, 'time'), 34.95);
  assert.equal(H.bestChrono(det, 'hillTime'), null);
  assert.equal(H.bestChrono(null, 'time'), null);
});

test('chronoBests : les 3 métriques', () => {
  const det = [{ phaseName: 'Moto 1', result: 1, time: '35.100', hillTime: '2.600', corner2Time: '7.800' }];
  assert.deepEqual(H.chronoBests(det), { time: 35.1, corner2Time: 7.8, hillTime: 2.6 });
});

// --- computeChronoStats : agrégat ---
test('computeChronoStats : victoires, égalités, médiane, métriques sans duel exclues', () => {
  const confs = [
    { chronoA: { time: 35.0, hillTime: null, corner2Time: null }, chronoB: { time: 35.5, hillTime: null, corner2Time: null } },
    { chronoA: { time: 36.0, hillTime: 2.6, corner2Time: null }, chronoB: { time: 35.8, hillTime: 2.7, corner2Time: null } },
    { chronoA: { time: 35.2, hillTime: null, corner2Time: null }, chronoB: { time: 35.2, hillTime: null, corner2Time: null } },
    { chronoA: { time: null, hillTime: null, corner2Time: null }, chronoB: { time: 35.1, hillTime: null, corner2Time: null } },
  ];
  const stats = H.computeChronoStats(confs);
  assert.equal(stats.length, 2); // corner2Time sans duel → exclue
  const time = stats.find(s => s.key === 'time');
  assert.deepEqual([time.duels, time.winsA, time.winsB, time.ties], [3, 1, 1, 1]);
  assert.ok(Math.abs(time.medDelta - 0.2) < 1e-9, `médiane 0.2 (|0.5|, |0.2|, |0|) — obtenu ${time.medDelta}`);
  const hill = stats.find(s => s.key === 'hillTime');
  assert.deepEqual([hill.duels, hill.winsA, hill.winsB], [1, 1, 0]);
});

test('computeChronoStats : aucun duel → section masquée ([] )', () => {
  assert.deepEqual(H.computeChronoStats([{ chronoA: {}, chronoB: {} }]), []);
  assert.deepEqual(H.computeChronoStats([]), []);
});

// --- rendu : tableau rangs sans chrono + tableaux dédiés par métrique ---
test('renderH2HTable : rangs seuls, sans sous-ligne chrono', () => {
  H.__setPilots(
    { firstName: 'Alan', lastName: 'A' },
    { firstName: 'Benoit', lastName: 'B' });
  const out = H.renderH2HTable([{
    event: { eventName: 'CDF', eventDate: '2026-05-10', eventId: 'e1' },
    account: { accountCode: 'ffc' },
    cls: { className: 'U19', perpetualClassCode: 'U19' },
    rankA: 2, rankB: 4,
    chronoA: { time: 34.981, hillTime: null, corner2Time: null },
    chronoB: { time: 35.412, hillTime: null, corner2Time: null },
  }]);
  assert.ok(!out.includes('34.981'), 'pas de temps dans le tableau des rangs');
  assert.ok(out.includes('🥈') && out.includes('4e'));
});

test('renderChronoTable : un tableau par métrique, que les duels chronométrés', () => {
  H.__setPilots(
    { firstName: 'Alan', lastName: 'A' },
    { firstName: 'Benoit', lastName: 'B' });
  const confs = [{
    event: { eventName: 'CDF', eventDate: '2026-05-10', eventId: 'e1' },
    account: { accountCode: 'ffc' },
    cls: { className: 'U19', perpetualClassCode: 'U19' },
    rankA: 2, rankB: 4,
    chronoA: { time: 34.981, hillTime: 2.601, corner2Time: null },
    chronoB: { time: 35.412, hillTime: 2.633, corner2Time: null },
  }, {
    event: { eventName: 'Club', eventDate: '2026-04-01', eventId: 'e2' },
    account: { accountCode: 'club' },
    cls: { className: 'U19', perpetualClassCode: 'U19' },
    rankA: 1, rankB: 3,
    chronoA: { time: null, hillTime: null, corner2Time: null },
    chronoB: { time: null, hillTime: null, corner2Time: null },
  }];
  const timeTbl = H.renderChronoTable(confs, H.CHRONO_METRICS[0]);
  assert.ok(timeTbl.includes('34.981') && timeTbl.includes('35.412') && timeTbl.includes('0.431'));
  assert.ok(timeTbl.includes('1 duel'), 'compteur de duels dans le titre');
  assert.ok(timeTbl.includes('1 à 0'), 'total A à B dans le titre');
  assert.ok(!timeTbl.includes('Club'), 'la course non chronométrée est exclue');
  const hillTbl = H.renderChronoTable(confs, H.CHRONO_METRICS[2]);
  assert.ok(hillTbl.includes('2.601') && hillTbl.includes('2.633'));
  const splitTbl = H.renderChronoTable(confs, H.CHRONO_METRICS[1]);
  assert.equal(splitTbl, '', 'métrique sans duel → pas de tableau');
});

// --- sélecteur de vue : une pastille par tableau disponible ---
test('renderViewSelector : rangs toujours + métriques avec duels', () => {
  const chronoStats = [
    { key: 'time', label: '⏱️ Chrono', duels: 3, winsA: 2, winsB: 1, ties: 0, medDelta: 0.2 },
    { key: 'hillTime', label: '⏱️ Butte', duels: 1, winsA: 0, winsB: 1, ties: 0, medDelta: 0.05 },
  ];
  const out = H.renderViewSelector(chronoStats, 'rank', 12);
  assert.ok(out.includes('data-chrono-view="rank"'), 'pastille classement');
  assert.ok(out.includes('data-chrono-view="time"'), 'pastille chrono');
  assert.ok(out.includes('data-chrono-view="hillTime"'), 'pastille butte');
  assert.ok(!out.includes('corner2Time'), 'virage sans duel → pas de pastille');
  assert.ok(out.includes('(12)') && out.includes('(3)'), 'compteurs affichés');
  assert.ok(/data-chrono-view="rank" aria-pressed="true"/.test(out), 'vue active marquée');
  const outMetric = H.renderViewSelector(chronoStats, 'time', 12);
  assert.ok(/data-chrono-view="time" aria-pressed="true"/.test(outMetric));
});

test('renderViewSelector : absent sans duel chronométré', () => {
  assert.equal(H.renderViewSelector([], 'rank', 12), '');
});

// --- en-tête : le total suit le tableau choisi ---
test('renderH2HHeader : victoires en vue rangs, duels en vue chrono', () => {
  H.__setPilots(
    { firstName: 'Alan', lastName: 'A', groupName: 'Club X' },
    { firstName: 'Benoit', lastName: 'B', groupName: '' });
  const stats = { winsA: 15, winsB: 13, ties: 0, validCount: 28, total: 28, categories: [], firstDate: '2026-01-01', lastDate: '2026-06-01' };
  const rankHtml = H.renderH2HHeader(stats, null);
  assert.ok(rankHtml.includes('>15<') && rankHtml.includes('>13<'), 'total classements 15 à 13');
  assert.ok(rankHtml.includes('victoire(s)'));
  const chronoHtml = H.renderH2HHeader(stats, { winsA: 9, winsB: 6, caption: '⏱️ Chrono · 15 duels' });
  assert.ok(chronoHtml.includes('>9<') && chronoHtml.includes('>6<'), 'total chronos 9 à 6');
  assert.ok(chronoHtml.includes('15 duels') && !chronoHtml.includes('victoire(s)'));
});

// --- filtre année ---
const YEAR_CONFS = [
  { event: { eventDate: '2026-05-10' }, cls: { className: 'U19' }, rankA: 1, rankB: 2 },
  { event: { eventDate: '2025-06-08' }, cls: { className: 'U19' }, rankA: 3, rankB: 1 },
  { event: { eventDate: '2025-07-07' }, cls: { className: 'Elite' }, rankA: 2, rankB: 2 },
  { event: { eventDate: '' }, cls: { className: 'U19' }, rankA: 1, rankB: 5 },
];

test('filterConfrontations : catégorie + année combinables', () => {
  assert.equal(H.filterConfrontations(YEAR_CONFS, '', '').length, 4);
  assert.equal(H.filterConfrontations(YEAR_CONFS, '', '2025').length, 2);
  assert.equal(H.filterConfrontations(YEAR_CONFS, 'Elite', '').length, 1);
  assert.equal(H.filterConfrontations(YEAR_CONFS, 'U19', '2025').length, 1);
  assert.equal(H.filterConfrontations(YEAR_CONFS, '', '2024').length, 0);
});

test('phaseOrder : manches → éliminatoires → finale → super finale', () => {
  assert.equal(H.phaseOrder('Moto 1'), 0);
  assert.equal(H.phaseOrder('Manche 2'), 0);
  assert.equal(H.phaseOrder('Time Trial'), 0, 'qualif chrono d’abord');
  assert.equal(H.phaseOrder('Qualif 1'), 2, 'tours qualifs précoces');
  assert.equal(H.phaseOrder('Tour 1'), 2);
  assert.equal(H.phaseOrder('LastChance'), 5, 'sans espace aussi');
  assert.equal(H.phaseOrder('Last Chance'), 5);
  assert.equal(H.phaseOrder('1/16 de Finale'), 20);
  assert.equal(H.phaseOrder('1/8 Final'), 30, 'huitième, pas LA finale');
  assert.equal(H.phaseOrder('1/4 de Finale'), 40);
  assert.equal(H.phaseOrder('Quart de finale'), 40);
  assert.equal(H.phaseOrder('Demi Finale'), 50);
  assert.equal(H.phaseOrder('Demi-finale'), 50);
  assert.equal(H.phaseOrder('Finale'), 60);
  assert.equal(H.phaseOrder('Finale A'), 60);
  assert.equal(H.phaseOrder('Finale B'), 55, 'petite finale avant');
  assert.equal(H.phaseOrder('Super Final'), 70, 'super finale en dernier');
  assert.equal(H.phaseOrder('Truc inconnu'), 45);
  assert.equal(H.phaseOrder(''), 45);
  assert.ok(H.phaseOrder('Moto 3') < H.phaseOrder('1/2 Finale') &&
    H.phaseOrder('1/2 Finale') < H.phaseOrder('Finale') &&
    H.phaseOrder('Finale') < H.phaseOrder('Super Final'), 'ordre total');
});

test('frPhase : « Moto 1 » → « Manche 1 » en français', () => {
  assert.equal(H.frPhase('Moto 1'), 'Manche 1');
  assert.equal(H.frPhase('moto 2'), 'Manche 2', 'minuscule aussi');
  assert.equal(H.frPhase('Manche 3'), 'Manche 3', 'déjà en français : inchangé');
  assert.equal(H.frPhase('Finale'), 'Finale');
  assert.equal(H.frPhase(''), '');
});

test('sharedRaces : finale en premier, manches ensuite', () => {
  const out = H.sharedRaces(
    [{ phaseName: 'Super Final', phaseCode: 'TTF', raceName: 'SF', result: 1 },
     { phaseName: 'Time Trial', phaseCode: 'TT', raceName: 'TT', result: 1 }],
    [{ phaseName: 'Time Trial', phaseCode: 'TT', raceName: 'TT', result: 2 },
     { phaseName: 'Super Final', phaseCode: 'TTF', raceName: 'SF', result: 2 }]);
  assert.deepEqual(out.map(s => s.phase), ['Super Final', 'Time Trial']);
});

test('eventNameCell : CDM → uci.org, FR inchangé', () => {
  const HUB = 'https://www.uci.org/race-hub/2026-uci-bmx-racing-world-cup-round-5/1GY1HT3eUP3zffWTCOODIB';
  const wc = H.eventNameCell({ account: { accountCode: 'uciworldcup' }, event: { eventId: 'wc2026r5', eventName: 'Coupe du monde #5', url: HUB }, cls: {} });
  assert.ok(wc.includes(HUB) && wc.includes('target="_blank"'), 'lien uci.org : ' + wc);
  const wcNoUrl = H.eventNameCell({ account: { accountCode: 'uciworldcup' }, event: { eventId: 'wc2026r5', eventName: 'CDM' }, cls: {} });
  assert.ok(!wcNoUrl.includes('<a'), 'sans URL : texte seul');
  const fr = H.eventNameCell({ account: { accountCode: 'ffc' }, event: { eventId: 'evt1', eventName: 'CDF' }, cls: { perpetualClassCode: 'EH' } });
  assert.ok(fr.includes('https://our.sqorz.com/org/ffc/event/evt1/class/EH'), 'FR → Sqorz : ' + fr);
});

test('raceKeyOf / sharedRaces : même manche = même raceName + phaseCode', () => {
  const m1a = { phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 2 };
  const m1b = { phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 5 };
  const m1c = { phaseName: 'Manche 1', phaseCode: 'M1', raceName: '4', result: 1 };
  assert.equal(H.raceKeyOf(m1a), '3%M1');
  assert.equal(H.raceKeyOf({ phaseName: 'Manche 1', result: 2 }), null, 'sans raceName/phaseCode');
  assert.deepEqual(H.sharedRaces([m1a], [m1b]), [{ key: '3%M1', phase: 'Manche 1', a: 2, b: 5 }]);
  assert.deepEqual(H.sharedRaces([m1a], [m1c]), [], 'manches différentes');
  assert.deepEqual(H.sharedRaces([{ phaseName: 'Moto 1', result: 1 }], [{ phaseName: 'Moto 1', result: 2 }]), [], 'données UEC sans manches');
  assert.deepEqual(
    H.sharedRaces(
      [{ n: 'Manche 1', pc: 'M1', rn: '3', r: 2 }],
      [{ phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 5 }]),
    [{ key: '3%M1', phase: 'Manche 1', a: 2, b: 5 }], 'slim + expansé mélangés (index brut en mode chrono)');
  assert.deepEqual(
    H.sharedRaces(
      [{ phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 2 }],
      [{ phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 103000 }]),
    [], 'DNS exclu (pas sur la grille)');
  assert.equal(
    H.sharedRaces(
      [{ phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 100000 }],
      [{ phaseName: 'Manche 1', phaseCode: 'M1', raceName: '3', result: 4 }]).length,
    1, 'DNF inclus (a pris le départ)');
  assert.deepEqual(H.sharedRaces(null, [m1b]), [], 'détails absents');
  // Time Trial : runs en solo, jamais la même course (même en slim avec rn)
  assert.deepEqual(
    H.sharedRaces(
      [{ n: 'Time Trial', pc: 'TT', rn: 'TT53', r: 1 }],
      [{ n: 'Time Trial', pc: 'TT', rn: 'TT52', r: 1 }]),
    []);
});

test('renderSharedRaces : détail manche par manche, vainqueur en gras', () => {
  assert.equal(H.renderSharedRaces([]), '', 'vide');
  assert.equal(H.renderSharedRaces(null), '', 'null');
  const out = H.renderSharedRaces([
    { key: '3%M1', phase: 'Manche 1', a: 2, b: 5 },
    { key: '1%F', phase: 'Finale', a: 1, b: 3 },
  ]);
  assert.ok(out.includes('shared-races-row'), 'sous-ligne');
  assert.ok(out.includes('Manche 1') && out.includes('Finale'), 'phases nommées');
  assert.ok(out.includes('<b>2e</b>') && out.includes('<b>1er</b>'), 'vainqueurs en gras');
  assert.ok(!out.includes('<b>5e</b>') && !out.includes('<b>3e</b>'), 'perdants simples');
  const dnf = H.renderSharedRaces([{ key: '3%M1', phase: 'Manche 1', a: 100000, b: 4 }]);
  assert.ok(dnf.includes('DNF') && !dnf.includes('<b>'), 'abandon sans gras');
});

test('flattenSharedRaces : une ligne par manche, tri desc', () => {
  const confs = [
    { event: { eventDate: '2026-03-28', eventName: 'E1' }, account: {}, cls: { className: 'Elite' },
      shared: [{ key: '1%M1', phase: 'Manche 1', a: 2, b: 1 }] },
    { event: { eventDate: '2026-05-10', eventName: 'E2' }, account: {}, cls: { className: 'Elite' },
      shared: [{ key: '2%M2', phase: 'Manche 2', a: 4, b: 2 }, { key: '1%F', phase: 'Finale', a: 1, b: 3 }] },
    { event: { eventDate: '2026-04-18', eventName: 'E3' }, account: {}, cls: { className: 'Elite' }, shared: [] },
  ];
  const flat = H.flattenSharedRaces(confs);
  assert.equal(flat.length, 3, '2 + 1 manches, épreuve vide ignorée');
  assert.deepEqual(flat.map(r => r.phase), ['Finale', 'Manche 2', 'Manche 1'], 'date desc, finale d’abord');
  assert.equal(flat[0].a, 1, 'rangs conservés');
  const sameDay = H.flattenSharedRaces([{
    event: { eventDate: '2026-05-10', eventName: 'E' }, account: {}, cls: {},
    shared: [{ key: '1%F', phase: 'Finale', a: 1, b: 2 }, { key: '3%M1', phase: 'Manche 1', a: 2, b: 1 }],
  }]);
  assert.deepEqual(sameDay.map(r => r.phase), ['Finale', 'Manche 1'], 'même date : finale en premier');
  assert.deepEqual(H.flattenSharedRaces([]), []);
  assert.deepEqual(H.flattenSharedRaces(null), []);
});

test('renderRaceTable : manches + vainqueurs, vide si rien', () => {
  H.__setPilots({ firstName: 'Alan', lastName: 'A' }, { firstName: 'Ben', lastName: 'B' });
  assert.equal(H.renderRaceTable([]), '');
  const out = H.renderRaceTable([
    { event: { eventDate: '2026-05-10', eventName: 'E2' }, account: {}, cls: { className: 'Elite' }, phase: 'Finale', key: '1%F', a: 1, b: 3 },
    { event: { eventDate: '2026-05-10', eventName: 'E2' }, account: {}, cls: { className: 'Elite' }, phase: 'Manche 2', key: '2%M2', a: 4, b: 2 },
  ]);
  assert.ok(out.includes('<th>Course</th>'), 'colonne Course');
  assert.ok(out.includes('Finale') && out.includes('Manche 2'), 'phases listées');
  assert.ok(out.includes('🥇'), 'médaille 1er');
  const dnf = H.renderRaceTable([
    { event: { eventDate: '2026-05-10', eventName: 'E2' }, account: {}, cls: {}, phase: 'Manche 1', key: '1%M1', a: 100000, b: 4 },
  ]);
  assert.ok(dnf.includes('DNF'), 'abandon lisible');
});

test('renderViewSelector : pilule Manches quand il y a des manches', () => {
  const out = H.renderViewSelector([], 'rank', 9, 13);
  assert.ok(out.includes('data-chrono-view="races"'), 'pilule Manches');
  assert.ok(out.includes('(13)'), 'compte des manches');
  assert.ok(!H.renderViewSelector([], 'rank', 9, 0).includes('data-chrono-view="races"'), 'masquée à 0');
  assert.equal(H.renderViewSelector([], 'rank', 9), '', 'une seule vue = masqué (inchangé)');
});

test('filterConfrontations : même course uniquement', () => {
  const confs = [
    { cls: { className: 'Elite' }, event: { eventDate: '2026-05-01' }, shared: [{ key: '1%M1', phase: 'Manche 1', a: 1, b: 2 }] },
    { cls: { className: 'Elite' }, event: { eventDate: '2026-04-01' }, shared: [] },
    { cls: { className: 'U19' }, event: { eventDate: '2026-03-01' } },
  ];
  assert.equal(H.filterConfrontations(confs, '', '', true).length, 1, 'seule la manche partagée');
  assert.equal(H.filterConfrontations(confs, '', '', false).length, 3, 'sans filtre : tout');
  assert.equal(H.filterConfrontations(confs, '', '').length, 3, '4e arg optionnel (compat)');
  assert.equal(H.filterConfrontations(confs, 'U19', '', true).length, 0, 'combiné catégorie');
});

test('confrontationYears : années triées desc, sans date ignorée', () => {
  assert.deepEqual(H.confrontationYears(YEAR_CONFS), ['2026', '2025']);
  assert.deepEqual(H.confrontationYears([]), []);
});

test('renderYearFilter : select avec années, masqué si une seule', () => {
  const out = H.renderYearFilter(['2026', '2025'], '');
  assert.ok(out.includes('id="yearFilterSel"'), 'select présent');
  assert.ok(out.includes('<option value="2026">2026</option>'), 'option année');
  assert.ok(out.includes('<option value="">Toutes années</option>'), 'option toutes');
  const outSel = H.renderYearFilter(['2026', '2025'], '2025');
  assert.ok(outSel.includes('<option value="2025" selected>'), 'année active sélectionnée');
  assert.equal(H.renderYearFilter(['2026'], ''), '', 'masqué si une seule année');
  assert.equal(H.renderYearFilter([], ''), '', 'masqué sans confrontation');
});

// --- intégration sur le vrai index UEC (mode chrono du socle) ---
test('intégration UEC : duel chronométré réel entre deux pilotes', () => {
  const uec = JSON.parse(fs.readFileSync(path.join(workspace, 'stats', 'uec-index.json'), 'utf8'));
  SC.expandIndex(uec, { details: 'chrono', series: false });
  const norm = SC.norm;
  // Une classe avec ≥ 2 pilotes chronométrés sur `time`.
  let duel = null;
  for (const ev of uec.events) {
    for (const cls of ev.classes) {
      const timed = (cls.competitors || []).filter(c =>
        (c.competitorRankDetails || []).some(d => d.result < 100000 && parseFloat(d.time) > 0));
      if (timed.length >= 2) {
        const key = ev => norm((ev.firstName || '') + ' ' + (ev.lastName || ''));
        if (key(timed[0]) === key(timed[1])) continue;
        duel = { ev, cls, a: timed[0], b: timed[1] };
        break;
      }
    }
    if (duel) break;
  }
  assert.ok(duel, 'au moins un duel chronométré dans l’index UEC');
  const stats = H.computeChronoStats([{
    chronoA: H.chronoBests(duel.a.competitorRankDetails),
    chronoB: H.chronoBests(duel.b.competitorRankDetails),
  }]);
  const time = stats.find(s => s.key === 'time');
  assert.ok(time && time.duels === 1, '1 duel sur le temps complet');
  assert.ok(time.medDelta > 0, `écart médian > 0 (${time.medDelta})`);
});

test('intégration UEC : classes non chronométrées → détails vides (mode économe)', () => {
  const uec = JSON.parse(fs.readFileSync(path.join(workspace, 'stats', 'uec-index.json'), 'utf8'));
  SC.expandIndex(uec, { details: 'chrono', series: false });
  let empty = 0, kept = 0, droppedTimed = 0;
  for (const ev of uec.events) {
    for (const cls of ev.classes) {
      for (const c of cls.competitors || []) {
        const det = c.competitorRankDetails || [];
        if (!det.length) { empty++; continue; }
        kept++;
        if (det.some(d => d.time == null && d.hillTime == null && d.corner2Time == null)) droppedTimed++;
      }
    }
  }
  assert.ok(empty > 0, `${empty} pilotes sans phases chronométrées (rien stocké)`);
  assert.equal(droppedTimed, 0, 'aucune phase chronométrée perdue');
  assert.ok(kept > 0, `${kept} pilotes avec phases chronométrées`);
});

test('pied de page : toutes les sources citées (Sqorz, JSTiming, UCI)', () => {
  assert.ok(html.includes('>Sqorz</a> (France, Mondiaux)'), 'Sqorz France');
  assert.ok(html.includes('>JSTiming</a> (Europe UEC)'), 'JSTiming Europe UEC');
  assert.ok(html.includes('>UCI</a> (Coupe du monde)'), 'UCI Coupe du monde');
});
