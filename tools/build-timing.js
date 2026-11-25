/* Minutage mot par mot des récitateurs (quran-align, CC BY 4.0, github.com/cpfair/quran-align).
 * Usage : node tools/build-timing.js <dossier des .json de quran-align>
 * Produit data/timing/<récitateur>.json : { s: { "2": [[début mot 1, début mot 2, …, fin], …] } }
 * en centièmes de seconde, un nombre par mot du plugin (mots manquants : interpolés). */
const fs = require('fs'), path = require('path');
const src = process.argv[2];
const MAP = { Alafasy_128kbps: 'Alafasy_128kbps', Husary_128kbps: 'Husary_64kbps', Husary_Muallim_128kbps: 'Husary_Muallim_128kbps', Minshawy_Murattal_128kbps: 'Minshawy_Murattal_128kbps', Abdul_Basit_Murattal_192kbps: 'Abdul_Basit_Murattal_64kbps' };
const root = path.join(__dirname, '..'); const out = path.join(root, 'data/timing');
fs.mkdirSync(out, { recursive: true });
const counts = {};
for (let s = 1; s <= 114; s++) counts[s] = JSON.parse(fs.readFileSync(path.join(root, 'data/s', String(s).padStart(3, '0') + '.json'), 'utf8')).v.map(v => v[2].length);
for (const [mine, theirs] of Object.entries(MAP)) {
  const data = JSON.parse(fs.readFileSync(path.join(src, theirs + '.json'), 'utf8'));
  const res = {};
  for (let s = 1; s <= 114; s++) res[s] = counts[s].map(() => null);
  for (const e of data) {
    const n = counts[e.surah][e.ayah - 1]; const st = new Array(n).fill(null); let end = 0;
    for (const [a, b0, t0, t1] of e.segments) {
      const b = Math.min(b0, n); if (a >= n) continue;
      for (let i = a; i < b; i++) if (st[i] === null) st[i] = Math.round((t0 + (t1 - t0) * (i - a) / (b - a)) / 10);
      end = Math.max(end, Math.round(t1 / 10));
    }
    if (st[0] === null) st[0] = 0;
    for (let i = 1; i < n; i++) if (st[i] === null) { let j = i; while (j < n && st[j] === null) j++; const hi = j < n ? st[j] : end; for (let k = i; k < j; k++) st[k] = Math.round(st[i - 1] + (hi - st[i - 1]) * (k - i + 1) / (j - i + 1)); i = j - 1; }
    for (let i = 1; i < n; i++) if (st[i] < st[i - 1]) st[i] = st[i - 1];
    st.push(Math.max(end, st[n - 1]));
    res[e.surah][e.ayah - 1] = st;
  }
  fs.writeFileSync(path.join(out, mine + '.json'), JSON.stringify({ r: mine, from: theirs, s: res }));
  console.log(mine, (fs.statSync(path.join(out, mine + '.json')).size / 1024).toFixed(0) + ' Ko');
}
