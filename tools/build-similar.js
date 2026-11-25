/* Versets qui se ressemblent (mutashābihāt) : calculés à partir du texte du Coran.
 * Deux versets se ressemblent quand ils partagent une longue suite de mots (au moins 4)
 * qui fait au moins 60 % du plus long des deux. Résultat : data/similar.json
 *   { "s:v": [["s:v", pourcentage], ...] }  (trié, 8 au plus par verset) */
const fs = require('fs'); const path = require('path');
const D = path.join(__dirname, '..', 'data');
const norm = w => w.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const V = [];
for (let s = 1; s <= 114; s++) {
  const d = JSON.parse(fs.readFileSync(path.join(D, 's', String(s).padStart(3, '0') + '.json'), 'utf8'));
  d.v.forEach((x, i) => V.push({ r: s + ':' + (i + 1), w: x[2].map(w => norm(w.map(g => g[0]).join(''))) }));
}
const lcs = (a, b) => { // plus longue sous-suite commune (mots)
  const m = a.length, n = b.length; let prev = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) { const cur = new Array(n + 1).fill(0); for (let j = 1; j <= n; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]); prev = cur; }
  return prev[n];
};
const idx = new Map();
V.forEach((x, i) => { const seen = new Set(); for (let k = 0; k + 3 <= x.w.length; k++) { const g = x.w.slice(k, k + 3).join(' '); if (seen.has(g)) continue; seen.add(g); if (!idx.has(g)) idx.set(g, []); idx.get(g).push(i); } });
const out = {}; let pairs = 0;
V.forEach((x, i) => {
  if (x.w.length < 3) return;
  const cand = new Map();
  for (let k = 0; k + 3 <= x.w.length; k++) { const L = idx.get(x.w.slice(k, k + 3).join(' ')) || []; if (L.length > 400) continue; L.forEach(j => { if (j !== i) cand.set(j, (cand.get(j) || 0) + 1); }); }
  const res = [];
  cand.forEach((c, j) => {
    const y = V[j]; if (y.w.length < 3) return;
    const l = lcs(x.w, y.w); const p = l / Math.max(x.w.length, y.w.length);
    if ((l >= 4 && p >= 0.6) || (l >= 3 && p === 1)) res.push([y.r, Math.round(100 * p)]);
  });
  if (res.length) { res.sort((a, b) => b[1] - a[1]); out[x.r] = res.slice(0, 8); pairs += res.length; }
});
fs.writeFileSync(path.join(D, 'similar.json'), JSON.stringify(out));
console.log('versets avec des semblables :', Object.keys(out).length, '· paires :', pairs, '·', Math.round(fs.statSync(path.join(D, 'similar.json')).size / 1024), 'Ko');
