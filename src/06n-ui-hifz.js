/* ====================================================================
 * 06n - Apprendre par cœur (ḥifẓ) : on écoute un verset plusieurs fois,
 * puis les mots se cachent petit à petit et on récite. Un toucher montre un mot.
 * ==================================================================== */
const HIFZ_LEVELS = [
  ['Tout visible', 'Écoute et lis en même temps, plusieurs fois.'],
  ['1 mot sur 3 caché', 'Récite : les mots cachés, tu les dis de mémoire.'],
  ['1 mot sur 2 caché', 'Encore moins d\'aide.'],
  ['Premières lettres', 'Seule la première lettre de chaque mot reste.'],
  ['Tout caché', 'Récite le verset en entier. Touche un mot si tu bloques.'],
];
function hifzHidden(level, i) {
  if (level === 1) return i % 3 === 1;
  if (level === 2) return i % 2 === 1;
  return level >= 3;
}
async function renderHifz(ctx, root, state, back) {
  clear(root);
  const S = ctx.settings; const data = ctx.data;
  const at = state.hifz; const H = S.hifz || (S.hifz = {});
  const d = await data.surah(at.s); const nV = d.v.length; if (at.v > nV) at.v = nV;
  const redraw = () => renderHifz(ctx, root, state, back);
  btn(h(root, 'div', 'aa-actions'), '← Retour au Coran', back, 'aa-btn-quiet');
  h(root, 'h2', null, '🧠 Apprendre par cœur');
  mdText(root, 'p', 'aa-help', '**1.** Écoute le verset plusieurs fois en le lisant. **2.** Passe au niveau suivant : des mots se cachent, tu les récites de mémoire. **3.** Au dernier niveau, tout est caché. Touche un mot caché pour le voir si tu bloques. Quand tu le sais, passe au verset suivant.');
  const bar = h(root, 'div', 'aa-toolbar');
  selectEl(field(bar, 'Sourate'), surahSequence('mushaf').map(n => [n, n + '. ' + data.surahInfo(n)[1]]), at.s, v => { state.hifz = { s: +v, v: 1, level: 0 }; redraw(); });
  selectEl(field(bar, 'Verset'), d.v.map((x, i) => [i + 1, String(i + 1) + (H[at.s + ':' + (i + 1)] ? ' ✓' : '')]), at.v, v => { state.hifz = { s: at.s, v: +v, level: 0 }; redraw(); });
  const rep = S.hifzRepeat || 3;
  selectEl(field(bar, 'Écouter'), [['1', '1 fois'], ['3', '3 fois'], ['5', '5 fois'], ['10', '10 fois']], String(rep), v => { S.hifzRepeat = +v; ctx.save(); redraw(); });
  const level = at.level || 0;
  const steps = h(root, 'div', 'aa-hz-steps');
  HIFZ_LEVELS.forEach((l, i) => { const b = h(steps, 'button', 'aa-hz-step' + (i === level ? ' aa-on' : i < level ? ' aa-hz-done' : ''), String(i + 1)); b.title = l[0]; b.addEventListener('click', () => { at.level = i; redraw(); }); });
  h(root, 'div', 'aa-hz-lev', HIFZ_LEVELS[level][0] + ' · ' + HIFZ_LEVELS[level][1]);
  const v = d.v[at.v - 1]; const words = v[2];
  const card = h(root, 'div', 'aa-hz-card');
  card.dataset.ref = at.s + ':' + at.v;
  const line = h(card, 'div', 'aa-ar aa-hz-text'); line.setAttribute('dir', 'rtl'); line.setAttribute('lang', 'ar');
  line.style.fontSize = Math.round((S.arSize || 30) * 1.15) + 'px';
  words.forEach((w, i) => {
    const t = wordText(w);
    const sp = h(line, 'span', 'aa-w aa-hz-w');
    const hide = hifzHidden(level, i);
    if (!hide) sp.textContent = t;
    else if (level === 3) { const gs = []; for (const ch of t) { if (/[\u064B-\u065F\u0670\u06D6-\u06ED]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); } const first = gs.slice(0, /^[\u0671\u0627]\u0644/.test(t) && gs.length > 3 ? 3 : 1).join(''); sp.textContent = first + 'ـ'; sp.classList.add('aa-hz-hint'); sp.dataset.full = t; }
    else { sp.textContent = t; sp.classList.add('aa-hz-hide'); }
    if (hide) sp.addEventListener('click', () => { if (sp.dataset.full) { sp.textContent = sp.dataset.full; sp.classList.remove('aa-hz-hint'); } sp.classList.remove('aa-hz-hide'); sp.classList.add('aa-hz-peek'); });
    line.appendChild(document.createTextNode(' '));
  });
  h(line, 'span', 'aa-hz-num', '﴿' + arNum(at.v) + '﴾');
  if (level <= 1 && S.showTr !== false) h(card, 'div', 'aa-tr aa-hz-tr', translitVerse(words, S.style));
  h(card, 'div', 'aa-muted aa-hz-fr', v[0]);
  const act = h(root, 'div', 'aa-actions aa-hz-act');
  if (S.audio !== false) btn(act, '▶ Écouter ' + rep + ' fois', () => { const old = AUDIO.repeat; AUDIO.repeat = rep; playVerse(at.s, at.v, () => { AUDIO.repeat = old; }); setTimeout(() => { AUDIO.repeat = old; }, 50); }, 'aa-btn-quiet');
  if (level > 0) btn(act, '👁 Vérifier', () => { line.querySelectorAll('.aa-hz-w').forEach(sp => { if (sp.dataset.full) sp.textContent = sp.dataset.full; sp.classList.remove('aa-hz-hide', 'aa-hz-hint'); sp.classList.add('aa-hz-peek'); }); }, 'aa-btn-quiet');
  if (level > 0) btn(act, '← Plus facile', () => { at.level = level - 1; redraw(); }, 'aa-btn-quiet');
  if (level < HIFZ_LEVELS.length - 1) btn(act, 'Niveau suivant →', () => { at.level = level + 1; redraw(); }, 'mod-cta');
  else btn(act, '✓ Je le sais, verset suivant →', () => {
    H[at.s + ':' + at.v] = todayNum(); ctx.save();
    if (at.v < nV) state.hifz = { s: at.s, v: at.v + 1, level: 0 }; else if (at.s < 114) state.hifz = { s: at.s + 1, v: 1, level: 0 };
    redraw();
  }, 'mod-cta');
  const known = Object.keys(H).filter(k => k.startsWith(at.s + ':')).length;
  if (known) h(root, 'div', 'aa-muted aa-small aa-hz-count', '🧠 ' + known + ' / ' + nV + ' versets de ' + data.surahInfo(at.s)[1] + ' appris par cœur.');
}
