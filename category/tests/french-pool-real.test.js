// Validation du « pool français » sur les données réelles (pilots-index.json +
// index UEC/UCI/WC locaux). Vérifie la règle COUNTRIES du build sqorz_stats :
// 16524/17303 pilotes retenus environ, échantillon club réel inclus, étrangers
// exclus. Ignoré si les fichiers d'index sont absents (CI sans données).
// Usage : node --test tests/french-pool-real.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const hasData = fs.existsSync(path.join(__dirname, '..', '..', 'stats', 'pilots-index.json'));
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

const norm = SC.norm;
const pilotsSrc = path.join(__dirname, '..', '..', 'stats', 'pilots-index.json');
const intl = ['uec-index.json', 'uci-index.json', 'uci-worldcup-index.json']
  .map(f => path.join(__dirname, '..', '..', 'stats', f))
  .filter(fs.existsSync);

test('pool français réel : règle cherche-compatible, étrangers exclus',
  { skip: !hasData, timeout: 120000 }, () => {
    const pilots = JSON.parse(fs.readFileSync(pilotsSrc, 'utf8'));
    const countries = H.poolCountrySet(intl.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
    assert.ok(countries.size >= 60, 'codes pays des index internationaux');

    const french = H.frenchPoolSet(pilots, countries);
    assert.ok(french.size > 0);

    // Total des pilotes engagés en course FR (toute gn) vs pool français.
    const total = new Set();
    for (const ev of (pilots.events || [])) {
      for (const cls of (ev.classes || [])) {
        for (const c of (cls.competitors || [])) {
          const key = norm(((c.firstName || c.fn || '') + ' ' + (c.lastName || c.ln || '')).trim());
          if (key) total.add(key);
        }
      }
    }
    assert.ok(total.size > french.size,
      `des étrangers exclus (${total.size} engagés → ${french.size} français)`);

    // Échantillon : 1er engagé FR avec un club réel → retenu.
    let kept;
    outer:
    for (const ev of (pilots.events || [])) {
      if (!H.isFrAccount(ev.account)) continue;
      for (const cls of (ev.classes || [])) {
        for (const c of (cls.competitors || [])) {
          const gn = String(c.groupName || c.gn || '').trim().toUpperCase();
          if (gn && !countries.has(gn)) { kept = c; break outer; }
        }
      }
    }
    assert.ok(kept, 'un engagement FR avec club réel trouvé');
    assert.equal(french.has(norm(((kept.firstName || kept.fn || '') + ' ' + (kept.lastName || kept.ln || '')).trim())), true,
      'pilote à club français retenu');

    // Sans index internationaux (UEC/UCI/WC manquants) : les codes pays sont
    // comptés comme clubs → le pool gonfle (repli transitoire avant charges UEC).
    const bloated = H.frenchPoolSet(pilots, new Set());
    assert.ok(bloated.size > french.size, 'repli sans UEC/UCI/WC moins précis');
  });