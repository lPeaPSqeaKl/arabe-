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
const HIFZ_AUDIO = { old: null }; // répétition d'origine, remise après « toute la sourate »
async function renderHifz(ctx, root, state, back) {
  clear(root);
  const S = ctx.settings; const data = ctx.data;
  const at = state.hifz; const H = S.hifz || (S.hifz = {});
  if (!at) { state.muraja = false; return back(); }
  const d = await data.surah(at.s); const nV = d.v.length; if (at.v > nV) at.v = nV;
  const whole = at.v === 0; // 0 = toute la sourate
  if (HIFZ_AUDIO.old != null) { AUDIO.repeat = HIFZ_AUDIO.old; HIFZ_AUDIO.old = null; }
  const redraw = () => renderHifz(ctx, root, state, back);
  if (state.muraja) return renderMuraja(ctx, root, state, () => { state.muraja = false; redraw(); });
  btn(h(root, 'div', 'aa-actions'), '← Retour au Coran', back, 'aa-btn-quiet');
  h(root, 'h2', null, '🧠 Apprendre par cœur');
  { const nd = murajaCountToday(ctx); const mb = btn(h(root, 'div', 'aa-actions'), '📅 Ma révision du par cœur' + (nd ? ' · ' + nd + ' aujourd\'hui' : ''), () => { state.muraja = true; redraw(); }, nd ? 'mod-cta' : 'aa-btn-quiet'); mb.title = 'Les sourates déjà apprises reviennent ici, de plus en plus tard'; }
  if (at.review) mdText(root, 'p', 'aa-ok', '📅 **Révision** : récite sans regarder, puis dis comment ça s\'est passé (en bas).');
  mdText(root, 'p', 'aa-help', '**1.** Écoute plusieurs fois en lisant. **2.** Passe au niveau suivant : des mots se cachent, tu les récites de mémoire. **3.** Au dernier niveau, tout est caché. Touche un mot caché pour le voir si tu bloques. Tu peux travailler verset par verset, ou choisir **Toute la sourate** dans « Verset ».');
  const bar = h(root, 'div', 'aa-toolbar');
  selectEl(field(bar, 'Sourate'), surahSequence('mushaf').map(n => [n, n + '. ' + data.surahInfo(n)[1]]), at.s, v => { state.hifz = { s: +v, v: whole ? 0 : 1, level: 0 }; redraw(); });
  const allKnown = d.v.every((x, i) => H[at.s + ':' + (i + 1)]);
  selectEl(field(bar, 'Verset'), [[0, '📜 Toute la sourate' + (allKnown ? ' ✓' : '')]].concat(d.v.map((x, i) => [i + 1, String(i + 1) + (H[at.s + ':' + (i + 1)] ? ' ✓' : '')])), at.v, v => { state.hifz = { s: at.s, v: +v, level: 0 }; redraw(); });
  const rep = S.hifzRepeat || 3;
  selectEl(field(bar, 'Écouter'), [['1', '1 fois'], ['3', '3 fois'], ['5', '5 fois'], ['10', '10 fois']], String(rep), v => { S.hifzRepeat = +v; ctx.save(); redraw(); });
  if (S.audio !== false) selectEl(field(bar, 'Récitateur'), RECITERS, S.reciter || 'Alafasy_128kbps', v => { S.reciter = v; AUDIO.reciter = v; ctx.save(); loadTiming(v).catch(() => {}); }).title = 'Le récitateur (le mot récité s\'allume selon son vrai rythme)';
  const level = at.level || 0;
  const steps = h(root, 'div', 'aa-hz-steps');
  HIFZ_LEVELS.forEach((l, i) => { const b = h(steps, 'button', 'aa-hz-step' + (i === level ? ' aa-on' : i < level ? ' aa-hz-done' : ''), String(i + 1)); b.title = l[0]; b.addEventListener('click', () => { at.level = i; redraw(); }); });
  h(root, 'div', 'aa-hz-lev', HIFZ_LEVELS[level][0] + ' · ' + HIFZ_LEVELS[level][1].replace('le verset', whole ? 'la sourate' : 'le verset'));
  const card = h(root, 'div', 'aa-hz-card' + (whole ? ' aa-hz-whole' : ''));
  const line = h(card, 'div', 'aa-ar aa-hz-text'); line.setAttribute('dir', 'rtl'); line.setAttribute('lang', 'ar');
  line.style.fontSize = Math.round((S.arSize || 30) * (whole ? 1 : 1.15)) + 'px';
  const list = whole ? d.v.map((x, i) => i + 1) : [at.v];
  list.forEach(vn => {
    const box = whole ? h(line, 'span', 'aa-hz-v') : line;
    if (whole) box.dataset.ref = at.s + ':' + vn; else card.dataset.ref = at.s + ':' + vn;
    d.v[vn - 1][2].forEach((w, i) => {
      const t = wordText(w);
      const sp = h(box, 'span', 'aa-w aa-hz-w');
      const hide = hifzHidden(level, i);
      if (!hide) sp.textContent = t;
      else if (level === 3) { const gs = []; for (const ch of t) { if (/[ً-ٰٟۖ-ۭ]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); } const first = gs.slice(0, /^[ٱا]ل/.test(t) && gs.length > 3 ? 3 : 1).join(''); sp.textContent = first + 'ـ'; sp.classList.add('aa-hz-hint'); sp.dataset.full = t; }
      else { sp.textContent = t; sp.classList.add('aa-hz-hide'); }
      if (hide) sp.addEventListener('click', () => { if (sp.dataset.full) { sp.textContent = sp.dataset.full; sp.classList.remove('aa-hz-hint'); } sp.classList.remove('aa-hz-hide'); sp.classList.add('aa-hz-peek'); });
      box.appendChild(document.createTextNode(' '));
    });
    h(box, 'span', 'aa-hz-num', '﴿' + arNum(vn) + '﴾');
    box.appendChild(document.createTextNode(' '));
  });
  if (whole) {
    const det = h(card, 'details', 'aa-hz-fr'); h(det, 'summary', 'aa-muted', 'Sens en français');
    d.v.forEach((x, i) => h(det, 'p', 'aa-muted', (i + 1) + '. ' + x[0]));
  } else {
    const v = d.v[at.v - 1];
    if (level <= 1 && S.showTr !== false) h(card, 'div', 'aa-tr aa-hz-tr', translitVerse(v[2], S.style));
    h(card, 'div', 'aa-muted aa-hz-fr', v[0]);
  }
  if (!whole) { const simBox = h(root, 'details', 'aa-hz-sim'); const sm = h(simBox, 'summary', 'aa-muted aa-small', '🔁 Versets qui se ressemblent…'); let filled = false; ctx.data.similar().then(SIM => { const n = (SIM[at.s + ':' + at.v] || []).length; if (!n) { simBox.remove(); return; } sm.textContent = '⚠️ Attention : ' + n + ' verset' + (n > 1 ? 's' : '') + ' ressemble' + (n > 1 ? 'nt' : '') + ' à celui-ci (voir les différences)'; }).catch(() => simBox.remove()); simBox.addEventListener('toggle', () => { if (simBox.open && !filled) { filled = true; renderSimilar(ctx, simBox, at.s, at.v, { max: 4 }); } }); }
  const act = h(root, 'div', 'aa-actions aa-hz-act');
  if (S.audio !== false) {
    if (whole) btn(act, '▶ Écouter la sourate' + (rep > 1 ? ' ' + rep + ' fois' : ''), () => {
      if (HIFZ_AUDIO.old == null) HIFZ_AUDIO.old = AUDIO.repeat; AUDIO.repeat = 1; // chaque verset une fois, la sourate rep fois
      const seq = []; for (let k = 0; k < rep; k++) seq.push(...list);
      playVerses(at.s, seq, vn => { const el = line.querySelector('[data-ref="' + at.s + ':' + vn + '"]'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); },
        () => { if (HIFZ_AUDIO.old != null) { AUDIO.repeat = HIFZ_AUDIO.old; HIFZ_AUDIO.old = null; } });
    }, 'aa-btn-quiet');
    else btn(act, '▶ Écouter ' + rep + ' fois', () => { const old = AUDIO.repeat; AUDIO.repeat = rep; playVerse(at.s, at.v, () => { AUDIO.repeat = old; }); setTimeout(() => { AUDIO.repeat = old; }, 50); }, 'aa-btn-quiet');
  }
  if (level > 0) btn(act, '👁 Vérifier', () => { line.querySelectorAll('.aa-hz-w').forEach(sp => { if (sp.dataset.full) sp.textContent = sp.dataset.full; sp.classList.remove('aa-hz-hide', 'aa-hz-hint'); sp.classList.add('aa-hz-peek'); }); }, 'aa-btn-quiet');
  if (level > 0) btn(act, '← Plus facile', () => { at.level = level - 1; redraw(); }, 'aa-btn-quiet');
  if (level < HIFZ_LEVELS.length - 1) btn(act, 'Niveau suivant →', () => { at.level = level + 1; redraw(); }, 'mod-cta');
  else if (at.review) {
    const g = h(root, 'div', 'aa-actions aa-hz-act');
    [[2, '✓ Sans faute', 'mod-cta'], [1, '~ Avec des hésitations', 'aa-btn-quiet'], [0, '✗ J\'ai oublié', 'aa-btn-quiet']].forEach(([gr, lab, cl]) => btn(g, lab, () => { murajaGrade(ctx, at.s, gr); state.hifz = { s: at.s, v: at.v, level: 0 }; state.muraja = true; redraw(); }, cl));
  }
  else btn(act, whole ? '✓ Je la sais, sourate suivante →' : '✓ Je le sais, verset suivant →', () => {
    list.forEach(vn => { H[at.s + ':' + vn] = todayNum(); }); ctx.save();
    if (whole) { if (at.s < 114) state.hifz = { s: at.s + 1, v: 0, level: 0 }; }
    else if (at.v < nV) state.hifz = { s: at.s, v: at.v + 1, level: 0 }; else if (at.s < 114) state.hifz = { s: at.s + 1, v: 1, level: 0 };
    redraw();
  }, 'mod-cta');
  const known = Object.keys(H).filter(k => k.startsWith(at.s + ':')).length;
  if (known) h(root, 'div', 'aa-muted aa-small aa-hz-count', '🧠 ' + known + ' / ' + nV + ' versets de ' + data.surahInfo(at.s)[1] + ' appris par cœur.');
}
