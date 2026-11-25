const fs = require('fs'); const P = process.argv[2];
const L = JSON.parse(fs.readFileSync(P + '/data/lemmas.json'));
const A = JSON.parse(fs.readFileSync(P + '/content/fr/alphabet.json'));
const NOJOIN = new Set([...'اأإآدذرزوؤءة']);
const HAR = /[ً-ْ]/; const OK = /^[ء-يً-ْ]+$/;
const cnt = new Map();
for (let s = 1; s <= 114; s++) {
  const d = JSON.parse(fs.readFileSync(P + '/data/s/' + String(s).padStart(3, '0') + '.json'));
  for (const v of d.v) for (const w of v[2]) {
    if (w.length !== 1) continue; // un seul morceau : pas de préfixe ni de pronom collé
    const g = w[0]; const t = g[0]; const lid = g[3];
    if (lid < 0 || !OK.test(t) || !L[lid][4] || L[lid][2] === 'PN') continue;
    const k = t; const e = cnt.get(k) || { t, lid, n: 0 }; e.n++; cnt.set(k, e);
  }
}
// une forme bien voyellée : chaque lettre (sauf voyelles longues/fin) suivie d'un signe
function voweled(t) { const b = [...t]; let letters = 0, marks = 0; b.forEach(c => HAR.test(c) ? marks++ : letters++); return marks >= letters - 1; }
const words = [...cnt.values()].filter(e => voweled(e.t)).sort((a, b) => b.n - a.n);
function base(t) { return [...t].filter(c => !HAR.test(c)); }
function formsIn(t, letter, alt) {
  const b = base(t); const out = new Set();
  const same = c => c === letter || (letter === 'ا' && 'اأإآ'.includes(c)) || (alt && letter === 'ي' && c === 'ى');
  b.forEach((c, i) => {
    if (!same(c)) return;
    const prevJ = i > 0 && !NOJOIN.has(b[i - 1]);
    const last = i === b.length - 1;
    out.add(prevJ ? (last ? 3 : 2) : (last ? 0 : 1));
  });
  return out;
}
const res = {}; const used = new Set();
for (const Lt of A.letters) {
  const l = Lt.l; const ex = [null, null, null, null];
  for (const want of [0, 1, 2, 3]) {
    for (const e of words) {
      const n = base(e.t).length; if (n < 2 || n > 6) continue;
      if (used.has(e.t) || /sperme|support du pronom/.test(L[e.lid][4])) continue;
      if (formsIn(e.t, l).has(want)) { ex[want] = [e.t, e.lid]; used.add(e.t); break; }
    }
    if (!ex[want] && l === 'ي') for (const e of words) { const n = base(e.t).length; if (n < 2 || n > 6 || used.has(e.t)) continue; if (formsIn(e.t, l, true).has(want)) { ex[want] = [e.t, e.lid]; used.add(e.t); break; } }
  }
  res[l] = ex;
}
console.log('/* Généré : pour chaque lettre, un mot du Coran par forme [seule, début, milieu, fin] = [mot, id du sens] */\nconst ALPHA_FORM_EX = ' + JSON.stringify(res) + ';');
