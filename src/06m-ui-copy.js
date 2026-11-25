/* ====================================================================
 * 06m - Recopier dans mon cahier : un verset, morceau par morceau, en grand,
 * sur des lignes, dans la police choisie. Pour écrire à la main sur papier.
 * ==================================================================== */
const NON_JOIN_NEXT = 'اأإآٱدذرزوؤةءى';
/* « lettres détachées » : chaque lettre garde la forme qu'elle a dans le mot ; le petit trait (ـ, tatweel)
 * montre de quel côté elle s'attache : هـ ـو */
function detachLetters(word) {
  const gs = []; // lettre + ses signes
  for (const ch of word) { if (/[ً-ٰٟۖ-ۭٓ-ٕ]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); }
  let out = '';
  gs.forEach((g, i) => {
    out += g;
    if (i === gs.length - 1) return;
    const joins = !NON_JOIN_NEXT.includes(g[0]) && g[0] !== 'ـ';
    out += joins ? '\u0640 \u0640' : ' ';
  });
  return out;
}
function copyChunks(s, v, words) {
  let segs = verseSegments(s, v, words.length);
  const out = [];
  segs.forEach(([f, t]) => { for (let i = f; i < t; i += 4) { const e = Math.min(t, i + 4); if (t - e > 0 && t - e < 2) { out.push([i, t]); break; } out.push([i, e]); } });
  return out;
}
async function renderCopyMode(ctx, root, state, back) {
  clear(root);
  const S = ctx.settings; const W = writeState(ctx);
  const at = state.copyAt || W.copyAt || { s: S.lastSurah || 1, v: S.lastVerse || 1 };
  state.copyAt = at; state.copyChunk = state.copyChunk || 0;
  const top = h(root, 'div', 'aa-actions');
  btn(top, '← Écrire', back, 'aa-btn-quiet');
  h(root, 'h2', null, '📜 Recopier dans mon cahier');
  mdText(root, 'p', 'aa-help', 'Prends ton cahier. Le verset arrive **morceau par morceau**, en grand, sur des lignes, dans ta police. Recopie-le de **droite à gauche**, puis passe au morceau suivant. « Lettres détachées » montre chaque lettre avec la forme qu\'elle a dans le mot ; le petit trait ـ montre de quel côté elle s\'attache à sa voisine.');
  const data = ctx.data; const d = await data.surah(at.s); const nV = d.v.length;
  if (at.v > nV) at.v = nV;
  const bar = h(root, 'div', 'aa-toolbar aa-cp-bar');
  const f1 = field(bar, 'Sourate');
  selectEl(f1, surahSequence('mushaf').map(n => [n, n + '. ' + data.surahInfo(n)[1]]), at.s, v => { state.copyAt = { s: +v, v: 1 }; state.copyChunk = 0; renderCopyMode(ctx, root, state, back); });
  const f2 = field(bar, 'Verset');
  selectEl(f2, d.v.map((x, i) => [i + 1, String(i + 1)]), at.v, v => { state.copyAt = { s: at.s, v: +v }; state.copyChunk = 0; renderCopyMode(ctx, root, state, back); });
  const opt = h(root, 'div', 'aa-toggles');
  const redraw = () => renderCopyMode(ctx, root, state, back);
  checkbox(opt, 'sans voyelles', !!W.copyBare, v => { W.copyBare = v; ctx.save(); redraw(); });
  checkbox(opt, 'lettres détachées', !!W.copyDetach, v => { W.copyDetach = v; ctx.save(); redraw(); });
  checkbox(opt, 'tout le verset d\'un coup', !!W.copyWhole, v => { W.copyWhole = v; state.copyChunk = 0; ctx.save(); redraw(); });
  checkbox(opt, 'translittération et sens', W.copyHelp !== false, v => { W.copyHelp = v; ctx.save(); redraw(); });
  const sz = h(opt, 'span', 'aa-actions');
  btn(sz, 'A−', () => { W.copySize = Math.max(32, (W.copySize || 54) - 6); ctx.save(); redraw(); }, 'aa-btn-quiet aa-asize');
  btn(sz, 'A+', () => { W.copySize = Math.min(110, (W.copySize || 54) + 6); ctx.save(); redraw(); }, 'aa-btn-quiet aa-asize');

  const vv = d.v[at.v - 1]; const words = vv[2];
  const chunks = W.copyWhole ? [[0, words.length]] : copyChunks(at.s, at.v, words);
  if (state.copyChunk >= chunks.length) state.copyChunk = chunks.length - 1;
  const [f, t] = chunks[state.copyChunk];
  W.copyAt = { s: at.s, v: at.v }; ctx.save();
  h(root, 'div', 'aa-muted aa-small aa-cp-where', data.surahInfo(at.s)[1] + ' ' + at.s + ':' + at.v + (chunks.length > 1 ? ' · morceau ' + (state.copyChunk + 1) + ' / ' + chunks.length : ''));
  const sheet = h(root, 'div', 'aa-cp-sheet');
  sheet.style.setProperty('--aa-cp-size', (W.copySize || 54) + 'px');
  const line = h(sheet, 'div', 'aa-ar aa-cp-text' + (W.copyDetach ? ' aa-cp-detach' : '')); line.setAttribute('dir', 'rtl'); line.setAttribute('lang', 'ar');
  words.slice(f, t).forEach(w => { let x = wordText(w); if (W.copyBare) x = noVowels(x); if (W.copyDetach) x = detachLetters(x); h(line, 'span', 'aa-cp-w', x); line.appendChild(document.createTextNode(' ')); });
  if (t === words.length) h(line, 'span', 'aa-cp-w', '﴿' + arNum(at.v) + '﴾');
  if (W.copyHelp !== false) {
    h(sheet, 'div', 'aa-tr aa-cp-tr', translitTokens(words, S.style).slice(f, t).join(' '));
    if (f === 0 || chunks.length === 1) h(sheet, 'div', 'aa-muted aa-cp-fr', vv[0]);
  }
  const nav = h(root, 'div', 'aa-pager aa-cp-nav');
  const goTo = (s, v, c) => { state.copyAt = { s, v }; state.copyChunk = c; redraw(); };
  const prev = () => {
    if (state.copyChunk > 0) goTo(at.s, at.v, state.copyChunk - 1);
    else if (at.v > 1) goTo(at.s, at.v - 1, 99);
  };
  const next = () => {
    if (state.copyChunk < chunks.length - 1) return goTo(at.s, at.v, state.copyChunk + 1);
    W.copied = (W.copied || 0) + 1; ctx.save();
    if (at.v < nV) goTo(at.s, at.v + 1, 0);
    else if (at.s < 114) goTo(at.s + 1, 1, 0);
  };
  if (state.copyChunk > 0 || at.v > 1) btn(nav, '← précédent', prev, 'aa-btn-quiet');
  const last = state.copyChunk === chunks.length - 1;
  btn(nav, last ? '✓ Recopié, verset suivant →' : 'J\'ai recopié, morceau suivant →', next, 'mod-cta');
  onSwipe(sheet, dir => (dir > 0 ? next() : prev()));
  if (W.copied) h(root, 'div', 'aa-muted aa-small aa-cp-count', '📜 ' + W.copied + ' verset' + (W.copied > 1 ? 's' : '') + ' recopié' + (W.copied > 1 ? 's' : '') + ' dans ton cahier.');
}
