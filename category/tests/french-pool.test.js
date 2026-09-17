// Tests du « pool français » (règle sqorz_stats / ranking) : un pilote est
// français si ≥1 engagement en course FR avec un club réel (groupName non vide
// et pas un code pays). Les codes pays sont les groupements des index
// UEC / UCI Mondiaux / Coupe du monde.
// Code extrait de index.html (pas recopié) ; norm vient de common.js.
// Usage : node --test tests/french-pool.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const commonSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'common.js'), 'utf8');
const SC = new Function('window', commonSrc + '\nreturn window.BmxCommon;')({});
function block(start, indent = '  ') {
  const i = src.indexOf(start);
  if (i < 0) throw new Error('marqueur introuvable : ' + start);
  const j = src.indexOf('\n' + indent + '}\n', i);
  if (j < 0) throw new Error('fin de bloc introuvable pour : ' + start);
  return src.slice(i, j + ('\n' + indent + '}\n').length);
}
const H = new Function('norm',
  block('function isFrAccount(account) {') + '\n' +
  block('function poolCountrySet(indexes) {') + '\n' +
  block('function frenchPoolSet(pilotsIndex, countries) {') +
  '\nreturn { isFrAccount, poolCountrySet, frenchPoolSet };'
)(SC.norm);

const frEv = (accountCode) => ({
  account: { accountCode },
  event: { eventId: 'E1', eventDate: '2025-01-01' },
  classes: [{ perpetualClassCode: '9GR', competitors: [
    { fn: 'Lizon', ln: 'GARNIER', gn: 'VIRE', rank: 1 },
    { fn: 'Max', ln: 'VANDER', gn: 'NED', rank: 2 },
    { fn: 'Dupont', ln: 'Marie', gn: '', rank: 3 },
    { fn: 'Ahmed', ln: 'Ben', gn: 'SUI', rank: 4 },
  ]}],
});

test('isFrAccount : comptes internationaux exclus, FR inclus', () => {
  assert.equal(H.isFrAccount({ accountCode: 'uec' }), false);
  assert.equal(H.isFrAccount({ accountCode: 'ucibmxworlds' }), false);
  assert.equal(H.isFrAccount({ accountCode: 'uciworldcup' }), false);
  assert.equal(H.isFrAccount({ accountCode: 'bmx14' }), true);
  assert.equal(H.isFrAccount({}), true);
  assert.equal(H.isFrAccount(null), true);
  assert.equal(H.isFrAccount(undefined), true);
});

test('poolCountrySet : codes pays issus des index UEC/UCI/WC', () => {
  const idx = { events: [{ classes: [{ competitors: [
    { groupName: 'ned' }, { gn: 'FRA' }, { groupName: ' NED ' }, {}
  ]}]}] };
  const set = H.poolCountrySet([idx, null, { events: [] }, undefined]);
  assert.deepEqual([...set].sort(), ['FRA', 'NED']);
  assert.equal(H.poolCountrySet([]).size, 0);
});

test('frenchPoolSet : club réel hors codes pays uniquement', () => {
  const countries = new Set(['NED', 'SUI']);
  const set = H.frenchPoolSet({ events: [frEv('bmx14')] }, countries);
  assert.equal(set.has('lizon garnier'), true, 'club FR inclus');
  assert.equal(set.has('max vander'), false, 'étranger (code pays) exclu');
  assert.equal(set.has('dupont marie'), false, 'groupName vide exclu');
  assert.equal(set.has('ahmed ben'), false, 'étranger (code pays) exclu');
});

test('frenchPoolSet : événements internationaux (UEC) non comptés comme clubs', () => {
  const countries = new Set();
  const set = H.frenchPoolSet({ events: [frEv('uec')] }, countries);
  assert.equal(set.size, 0, 'aucun club réel en événement UEC');
});

test('frenchPoolSet : clés = norm(fn + ln), insensible à la casse/accents', () => {
  const countries = new Set(['SUI']);
  const set = H.frenchPoolSet({ events: [{
    account: { accountCode: 'bmx14' },
    event: { eventId: 'E2', eventDate: '2025-06-01' },
    classes: [{ perpetualClassCode: 'Élite', competitors: [
      { firstName: 'Léo', lastName: 'Van-Der-Berg', groupName: 'BESANC' },
    ]}],
  }]}, countries);
  const key = SC.norm('Léo Van-Der-Berg');
  assert.ok(set.has(key), 'clé normalisée retrouvée en minuscules/accentué');
  assert.equal(set.size, 1);
});

test('frenchPoolSet : index absent → set vide', () => {
  assert.equal(H.frenchPoolSet(null, new Set()).size, 0);
});

test('frenchPoolSet : forme expansée (groupName+firstName) comme slim (fn/gn)', () => {
  const countries = new Set(['NED']);
  const slim = { events: [{ ...frEv('bmx14') }] };
  const expanded = { events: [{ ...frEv('bmx14') }] };
  // slim : fn/ln/gn (fraîchement chargé) ; expansé : firstName/lastName/groupName.
  const setSlim = H.frenchPoolSet(slim, countries);
  expanded.events[0].classes = [{ perpetualClassCode: '9GR', competitors: [
    { firstName: 'Lizon', lastName: 'GARNIER', groupName: 'VIRE' },
  ]}];
  const setExp = H.frenchPoolSet(expanded, countries);
  assert.equal(setSlim.has('lizon garnier'), true);
  assert.deepEqual([...setExp], ['lizon garnier']);
});