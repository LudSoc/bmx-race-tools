// Tests du sélecteur d'année obligatoire (pas de vue « toutes les années »).
// Code extrait de index.html (pas recopié).
// Usage : node --test tests/category-year.test.js
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

const harnessSrc = [
  'let pilotsIndex = null, uecIndex = null, uciIndex = null, wcIndex = null;',
  'let rankYearSel = { value: "", options: [] };',
  block('function allIndexedEvents() {'),
  block('function dataYears() {'),
  block('function snapYearToData() {'),
].join('\n') + `\nreturn { allIndexedEvents, dataYears, snapYearToData,
  __set: (p, u, value, options) => { pilotsIndex = p; uecIndex = u; uciIndex = null; wcIndex = null; rankYearSel = { value, options: options.map(v => ({ value: v })) }; },
  __year: () => rankYearSel.value };`;
const H = new Function(harnessSrc)();

const FR = { events: [
  { event: { eventDate: '2026-05-10' }, account: {}, classes: [] },
  { event: { eventDate: '2025-06-08' }, account: {}, classes: [] },
  { event: { eventDate: '2024-07-07' }, account: {}, classes: [] },
  { event: { eventDate: '' }, account: {}, classes: [] },
] };
const UEC = { events: [
  { event: { eventDate: '2023-09-03' }, account: {}, classes: [] },
] };
const OPTS = ['2023', '2024', '2025', '2026'];

test('dataYears : FR + UEC, tri desc, dates invalides ignorées', () => {
  H.__set(FR, UEC, '', OPTS);
  assert.deepEqual(H.dataYears(), ['2026', '2025', '2024', '2023']);
});

test('dataYears : sans UEC (optionnel)', () => {
  H.__set(FR, null, '', OPTS);
  assert.deepEqual(H.dataYears(), ['2026', '2025', '2024']);
});

test('snapYearToData : garde un choix valable (?year=, choix utilisateur)', () => {
  H.__set(FR, UEC, '2024', OPTS);
  H.snapYearToData();
  assert.equal(H.__year(), '2024');
});

test('snapYearToData : vide → année la plus récente avec données', () => {
  H.__set(FR, UEC, '', OPTS);
  H.snapYearToData();
  assert.equal(H.__year(), '2026');
});

test('snapYearToData : année sans données → repli (ex. future sans course)', () => {
  H.__set({ events: [{ event: { eventDate: '2025-06-08' }, account: {}, classes: [] }] }, null, '2026', OPTS);
  H.snapYearToData();
  assert.equal(H.__year(), '2025');
});

test('snapYearToData : ne choisit que parmi les options du select', () => {
  H.__set({ events: [{ event: { eventDate: '2025-06-08' }, account: {}, classes: [] }] }, null, '', ['2026']);
  H.snapYearToData();
  assert.equal(H.__year(), '', '2025 absent des options → inchangé');
});
