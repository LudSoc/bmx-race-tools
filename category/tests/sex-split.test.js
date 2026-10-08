// Non-mixité F/M : sexe dominant par vote majoritaire des engagements
// (codes mixtes X ignorés ; égalité ou aucun vote → null, exclu des groupes).
// Usage : node --test tests/sex-split.test.js
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
  block('function dominantSex(matches, sexOf) {') +
  '\nreturn { dominantSex };'
)();

test('dominantSex : majorité stricte, X ignorés', () => {
  const sexOf = code => ({ U15FR: 'F', CRF1729R: 'F', U15GR: 'M', U11: null }[code] ?? null);
  const mk = code => ({ cls: { perpetualClassCode: code } });
  assert.equal(H.dominantSex([mk('U15FR'), mk('CRF1729R'), mk('U15GR')], sexOf), 'F');
  assert.equal(H.dominantSex([mk('U15GR'), mk('U15GR'), mk('U15FR')], sexOf), 'M');
  assert.equal(H.dominantSex([mk('U11'), mk('U11')], sexOf), null);
  assert.equal(H.dominantSex([mk('U15FR'), mk('U15GR')], sexOf), null);
  assert.equal(H.dominantSex([], sexOf), null);
});
