/* ====================================================================
 * 06t - Pour ceux qui apprennent par cœur :
 *  - les versets qui se ressemblent (mutashābihāt), avec leurs différences ;
 *  - le plan de révision (murājaʿa) : chaque sourate apprise revient
 *    de plus en plus tard (1, 3, 7, 14, 30, 60, 120 jours).
 * ==================================================================== */
const SIM_NORM = w => w.replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
/* pour chaque mot de a : true s'il est aussi dans b, au même endroit de la phrase (plus longue sous-suite commune) */
function wordsInCommon(a, b) {
  const A = a.map(SIM_NORM), B = b.map(SIM_NORM); const m = A.length, n = B.length;
  const T = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) T[i][j] = A[i] === B[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
  const ka = new Array(m).fill(false), kb = new Array(n).fill(false); let i = 0, j = 0;
  while (i < m && j < n) { if (A[i] === B[j]) { ka[i] = kb[j] = true; i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++; }
  return [ka, kb];
}
function verseLineDiff(parent, words, same, cls) {
  const l = h(parent, 'div', 'aa-sim-ar ' + (cls || '')); l.setAttribute('dir', 'rtl'); l.setAttribute('lang', 'ar');
  words.forEach((w, i) => { h(l, 'span', same[i] ? null : 'aa-sim-diff', w); l.appendChild(document.createTextNode(' ')); });
  return l;
}
/* le panneau « versets qui se ressemblent » d'un verset */
async function renderSimilar(ctx, parent, s, v, opts) {
  opts = opts || {};
  const S = await ctx.data.similar(); const list = S[s + ':' + v] || [];
  if (!list.length) { if (!opts.quiet) h(parent, 'p', 'aa-muted aa-small', 'Aucun autre verset ne ressemble vraiment à celui-ci.'); return 0; }
  const box = h(parent, 'div', 'aa-sim');
  const me = (await ctx.data.surah(s)).v[v - 1][2].map(wordText);
  mdText(box, 'div', 'aa-small aa-muted', '🔁 **' + list.length + ' verset' + (list.length > 1 ? 's' : '') + ' qui se ressemble' + (list.length > 1 ? 'nt' : '') + '**. En couleur : ce qui change. C\'est là que la mémoire se trompe.');
  for (const [r, pct] of list.slice(0, opts.max || 8)) {
    const [s2, v2] = r.split(':').map(Number);
    const other = (await ctx.data.surah(s2)).v[v2 - 1][2].map(wordText);
    const [ka, kb] = wordsInCommon(me, other);
    const it = h(box, 'div', 'aa-sim-it');
    const head = h(it, 'div', 'aa-sim-head');
    const a = h(head, 'a', 'aa-link', ctx.data.surahInfo(s2)[1] + ' ' + r); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(s2, v2); });
    h(head, 'span', 'aa-muted aa-small', ' · ' + (pct === 100 ? 'identique' : pct + ' % pareil'));
    if (pct < 100) { verseLineDiff(it, me, ka, 'aa-sim-me'); h(it, 'div', 'aa-faint aa-small', '↑ ' + s + ':' + v + '   ↓ ' + r); }
    verseLineDiff(it, other, kb);
  }
  return list.length;
}

/* --- plan de révision du par cœur --- */
const MURAJA_STEPS = [1, 3, 7, 14, 30, 60, 120];
function hifzSurahs(ctx) {
  const H = ctx.settings.hifz || {}; const by = {};
  Object.keys(H).forEach(k => { const s = +k.split(':')[0]; (by[s] = by[s] || []).push(+k.split(':')[1]); });
  return by;
}
function murajaState(ctx) { return ctx.settings.muraja || (ctx.settings.muraja = {}); }
/* les sourates (ou parties) à réviser aujourd'hui */
function murajaDue(ctx) {
  const by = hifzSurahs(ctx); const M = murajaState(ctx); const H = ctx.settings.hifz || {}; const t = todayNum(); const out = [];
  Object.keys(by).forEach(s => {
    const st = M[s]; const first = Math.min(...by[s].map(v => H[s + ':' + v]));
    const due = st ? st.due : first + 1;
    out.push({ s: +s, verses: by[s].sort((a, b) => a - b), due, late: t - due, st });
  });
  return out.sort((a, b) => a.due - b.due);
}
function renderMuraja(ctx, root, state, back) {
  clear(root);
  btn(h(root, 'div', 'aa-actions'), '← Apprendre par cœur', back, 'aa-btn-quiet');
  h(root, 'h2', null, '📅 Ma révision du par cœur');
  mdText(root, 'p', 'aa-help', 'Ce qu\'on apprend par cœur s\'oublie si on ne le récite pas. Chaque sourate apprise revient ici **de plus en plus tard** : le lendemain, puis après 3 jours, une semaine, deux semaines, un mois… Récite-la **sans regarder** (tout est caché), puis dis honnêtement comment ça s\'est passé.');
  const all = murajaDue(ctx); const t = todayNum();
  if (!all.length) { mdText(root, 'p', 'aa-muted', 'Rien pour l\'instant : apprends d\'abord un verset ou une sourate (bouton **✓ Je le sais** au dernier niveau), il apparaîtra ici.'); return; }
  const today = all.filter(x => x.due <= t); const later = all.filter(x => x.due > t);
  h(root, 'h3', 'aa-fc-group', today.length ? '🔔 Aujourd\'hui (' + today.length + ')' : '✓ Rien à réviser aujourd\'hui');
  const row = (x, isToday) => {
    const info = ctx.data.surahInfo(x.s); const c = h(root, 'div', 'aa-mj-row' + (isToday ? ' aa-mj-today' : ''));
    const tx = h(c, 'div', 'aa-mj-tx'); h(tx, 'b', null, x.s + '. ' + info[1]);
    const whole = x.verses.length === info[5];
    h(tx, 'div', 'aa-muted aa-small', (whole ? 'toute la sourate' : x.verses.length + ' verset' + (x.verses.length > 1 ? 's' : '') + ' sur ' + info[5]) + ' · ' + (isToday ? (x.late > 0 ? 'en retard de ' + x.late + ' j' : 'aujourd\'hui') : 'dans ' + (x.due - t) + ' j'));
    if (isToday) btn(c, 'Réciter', () => { state.muraja = null; state.hifz = { s: x.s, v: whole ? 0 : x.verses[0], level: 4, review: true }; ctx.openTab('coran', { surah: x.s, hifz: state.hifz }); }, 'mod-cta');
    else btn(c, 'Réciter quand même', () => { state.muraja = null; state.hifz = { s: x.s, v: whole ? 0 : x.verses[0], level: 4, review: true }; ctx.openTab('coran', { surah: x.s, hifz: state.hifz }); }, 'aa-btn-quiet');
  };
  today.forEach(x => row(x, true));
  if (later.length) { h(root, 'h3', 'aa-fc-group', 'Plus tard'); later.forEach(x => row(x, false)); }
}
/* après une récitation de révision : programmer la suivante */
function murajaGrade(ctx, s, grade) {
  const M = murajaState(ctx); const st = M[s] || { k: 0 }; const t = todayNum();
  let k = st.k;
  if (grade === 2) k = Math.min(MURAJA_STEPS.length - 1, k + 1); else if (grade === 1) k = Math.max(0, k); else k = 0;
  M[s] = { k, due: t + MURAJA_STEPS[Math.max(0, k)], last: t, g: grade };
  ctx.save(); if (ctx.markActivity) ctx.markActivity('l');
}
function murajaCountToday(ctx) { const t = todayNum(); return murajaDue(ctx).filter(x => x.due <= t).length; }
