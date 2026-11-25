/* ====================================================================
 * 06p - Affichage du cours d'écriture (données dans 06o)
 * Une étape à la fois, avec un schéma, puis un quiz (70 % pour valider).
 * ==================================================================== */
const WC_FONTS = {
  naskh: '"Atelier Noto Naskh", "Atelier Amiri Quran", serif', amiri: '"Atelier Amiri Quran", serif', ruqaa: '"Atelier Aref Ruqaa", "Atelier Amiri Quran", serif',
  maghribi: '"Bouazzi Maghribi", "Atelier Amiri Quran", serif', kufi: '"Atelier Reem Kufi", "Atelier Amiri Quran", serif', nastaliq: '"Atelier Noto Nastaliq", "Atelier Amiri Quran", serif',
};
const WC_FONT_NAMES = { naskh: 'Naskh (livres, école)', amiri: 'Naskh des Corans (calligraphié)', ruqaa: 'Ruqʿa (à la main)', maghribi: 'Maghribi (Maroc)', kufi: 'Coufique', nastaliq: 'Nastaʿlīq (persan)' };
function wcState(ctx) { const W = writeState(ctx); return W.course || (W.course = {}); }
function wcFont(el, id) { if (id !== 'amiri') ensureFont(id).catch(() => {}); el.style.fontFamily = WC_FONTS[id] || WC_FONTS.naskh; }
/* découpe un mot en morceaux attachés (après ا د ذ ر ز و ة ء… le mot se coupe) */
function wcPieces(word) {
  const gs = []; for (const ch of word) { if (/[ً-ٰٟۖ-ۭ]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); }
  const out = []; let cur = ''; gs.forEach(g => { cur += g; if (NON_JOIN_NEXT.includes(g[0]) || g[0] === 'ٱ') { out.push(cur); cur = ''; } }); if (cur) out.push(cur);
  return out;
}
function wcColors(el) { const cs = getComputedStyle(el); return { ink: cs.color || '#222', muted: cs.getPropertyValue('--text-muted').trim() || '#777', faint: cs.getPropertyValue('--text-faint').trim() || '#aaa', accent: cs.getPropertyValue('--interactive-accent').trim() || '#7852ee', line: cs.getPropertyValue('--background-modifier-border').trim() || '#ddd', soft: cs.getPropertyValue('--background-secondary').trim() || '#f4f4f4' }; }

/* --- le texte posé sur ses lignes --- */
function wcRuler(parent, v) {
  const box = h(parent, 'div', 'aa-wc-canvas'); const cv = h(box, 'canvas');
  const draw = () => {
    const W = Math.max(260, Math.min(720, box.clientWidth || 600)); const H = Math.round(Math.min(260, Math.max(170, W * 0.36)));
    const dpr = window.devicePixelRatio || 1; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); const col = wcColors(box);
    const font = fs => fs + 'px ' + WC_FONTS.naskh;
    c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    let fs = H * 0.42; c.font = font(fs); let m = c.measureText(v.text); const wmax = W - (v.zones ? 150 : 40);
    if (m.width > wmax) { fs *= wmax / m.width; c.font = font(fs); m = c.measureText(v.text); }
    const alif = c.measureText('ا').actualBoundingBoxAscent; const nun = Math.max(c.measureText('ن').actualBoundingBoxDescent, c.measureText('ج').actualBoundingBoxDescent * 0.8);
    const base = Math.round(H * 0.6); const top = base - alif, bot = base + nun;
    const cx = v.zones ? (W + 120) / 2 : W / 2;
    if (v.zones) {
      c.fillStyle = col.soft; c.fillRect(110, top, W - 120, base - top);
      c.globalAlpha = .55; c.fillRect(110, base, W - 120, bot - base); c.globalAlpha = 1;
      c.font = '12px ' + (getComputedStyle(box).fontFamily || 'sans-serif'); c.direction = 'ltr'; c.textAlign = 'left'; c.fillStyle = col.muted;
      c.fillText('au-dessus', 8, top + 14); c.fillText('hauteur du alif', 8, top - 4);
      c.fillText('ligne de base', 8, base - 5); c.fillText('sous la ligne', 8, base + 16);
      c.direction = 'rtl'; c.textAlign = 'center';
    }
    const line = (y, dash, w) => { c.save(); c.strokeStyle = col.faint; c.lineWidth = w || 1; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(v.zones ? 110 : 10, y); c.lineTo(W - 10, y); c.stroke(); c.restore(); };
    line(top, [3, 5]); line(base, null, 1.6); line(bot, [3, 5]);
    c.font = font(fs); c.fillStyle = col.ink; c.fillText(v.text, cx, base);
    if (v.arrow) { c.save(); c.strokeStyle = col.accent; c.fillStyle = col.accent; c.lineWidth = 2.5; const y = Math.max(16, top - 26); const x1 = cx + m.width / 2, x0 = cx - m.width / 2; c.beginPath(); c.moveTo(x1, y); c.lineTo(x0, y); c.stroke(); c.beginPath(); c.moveTo(x0 - 2, y); c.lineTo(x0 + 10, y - 6); c.lineTo(x0 + 10, y + 6); c.fill(); c.font = '12px sans-serif'; c.direction = 'ltr'; c.textAlign = 'center'; c.fillText('sens de l\'écriture', cx, y - 9); c.fillText('début', x1, y + 18); c.restore(); }
  };
  const go = () => draw(); (document.fonts && document.fonts.load ? ensureFont('naskh').then(() => document.fonts.load('40px ' + WC_FONTS.naskh, v.text)) : Promise.resolve()).then(go, go);
  setTimeout(go, 50);
}
/* --- le alif mesuré en points --- */
function wcAlifDots(parent) {
  const box = h(parent, 'div', 'aa-wc-canvas'); const cv = h(box, 'canvas');
  const draw = () => {
    const W = Math.max(260, Math.min(520, box.clientWidth || 400)), H = 240; const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); const col = wcColors(box);
    const base = 200; c.font = '190px ' + WC_FONTS.naskh; c.textBaseline = 'alphabetic'; c.textAlign = 'center'; c.direction = 'rtl';
    const mA = c.measureText('ا'); const hA = mA.actualBoundingBoxAscent; const top = base - hA;
    c.strokeStyle = col.faint; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(10, top); c.lineTo(W - 10, top); c.moveTo(10, base); c.lineTo(W - 10, base); c.stroke(); c.setLineDash([]);
    c.fillStyle = col.ink; c.fillText('ا', W * 0.62, base);
    const n = 5, d = hA / n; const x = W * 0.36;
    for (let i = 0; i < n; i++) { const y = base - d * (i + 0.5); c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = col.accent; c.globalAlpha = 0.85; c.fillRect(-d * 0.34, -d * 0.34, d * 0.68, d * 0.68); c.restore(); }
    c.fillStyle = col.muted; c.font = '13px sans-serif'; c.direction = 'ltr'; c.textAlign = 'left'; c.fillText('5 points', x + d * 0.6, top + hA / 2);
  };
  const go = () => draw(); ensureFont('naskh').then(() => document.fonts && document.fonts.load('80px ' + WC_FONTS.naskh, 'ا')).then(go, go);
  setTimeout(go, 50);
}
/* --- un mot coupé en morceaux --- */
const WC_HUES = ['#d0675e', '#4f86c6', '#3e9e6b', '#c48a2c', '#8e63c7', '#2f9aa8'];
function wcPiecesViz(parent, v) {
  const box = h(parent, 'div', 'aa-wc-pieces');
  const big = h(box, 'div', 'aa-wc-word'); big.setAttribute('dir', 'rtl'); big.textContent = v.text; wcFont(big, 'naskh');
  const row = h(box, 'div', 'aa-wc-prow'); row.setAttribute('dir', 'rtl');
  let k = 0; const words = v.text.split(/\s+/).filter(Boolean); let total = 0;
  words.forEach((w, wi) => {
    const wb = h(row, 'span', 'aa-wc-pword');
    const parts = v.letters ? wcLetters(w) : wcPieces(w); total += parts.length;
    parts.forEach(p => { const s = h(wb, 'span', 'aa-wc-piece', p); s.style.color = WC_HUES[k++ % WC_HUES.length]; wcFont(s, 'naskh'); });
    void wi;
  });
  h(box, 'div', 'aa-muted aa-small aa-wc-cap', v.letters ? 'Lettre par lettre (chaque couleur = une lettre, le trait ـ montre l\'attache)' : (words.length > 1 ? total + ' morceaux en tout · chaque couleur = un morceau tracé d\'un seul trait' : total + (total > 1 ? ' morceaux' : ' morceau') + ' · chaque couleur = un morceau tracé d\'un seul trait'));
}
function wcLetters(word) {
  const gs = []; for (const ch of word) { if (/[ً-ٰٟۖ-ۭ]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); }
  return gs.map((g, i) => { const prevJoins = i > 0 && !NON_JOIN_NEXT.includes(gs[i - 1][0]); const nextJoins = i < gs.length - 1 && !NON_JOIN_NEXT.includes(g[0]); return (prevJoins ? 'ـ' : '') + g + (nextJoins ? 'ـ' : ''); });
}
/* --- squelettes et points --- */
function wcSkel(parent, v) {
  const t = h(parent, 'div', 'aa-wc-skel');
  v.rows.forEach(([sk, letters]) => {
    const r = h(t, 'div', 'aa-wc-skrow');
    const a = h(r, 'span', 'aa-wc-sk', sk); wcFont(a, 'naskh');
    h(r, 'span', 'aa-wc-arrow', '→');
    const ls = h(r, 'span', 'aa-wc-sklet'); ls.setAttribute('dir', 'rtl');
    letters.forEach(l => { const s = h(ls, 'span', null, l); wcFont(s, 'naskh'); });
  });
}
/* --- les 4 formes --- */
function wcForms(parent, v) {
  const t = h(parent, 'div', 'aa-wc-forms');
  const head = h(t, 'div', 'aa-wc-frow aa-wc-fhead'); ['seule', 'début', 'milieu', 'fin'].forEach(x => h(head, 'span', 'aa-muted aa-small', x));
  v.letters.forEach(l => {
    const r = h(t, 'div', 'aa-wc-frow');
    const fs = writeForms(l); const by = {}; fs.forEach(([f, where]) => { by[where] = f; });
    ['seule', 'au début', 'au milieu', 'à la fin'].forEach(k => { const s = h(r, 'span', 'aa-wc-f', by[k] || '—'); if (by[k]) { s.setAttribute('dir', 'rtl'); wcFont(s, 'naskh'); } else s.classList.add('aa-muted'); });
  });
}
/* --- cartes côte à côte --- */
function wcCmp(parent, v) {
  const g = h(parent, 'div', 'aa-wc-cmp');
  v.items.forEach(([txt, lab, ok]) => {
    const c = h(g, 'div', 'aa-wc-card' + (ok === true ? ' aa-wc-ok' : ok === false ? ' aa-wc-bad' : ''));
    const a = h(c, 'div', 'aa-wc-cardar', txt); a.setAttribute('dir', 'rtl'); wcFont(a, 'naskh');
    h(c, 'div', 'aa-small', (ok === true ? '✅ ' : ok === false ? '❌ ' : '') + lab);
  });
}
function wcBig(parent, v) {
  const g = h(parent, 'div', 'aa-wc-cmp');
  v.items.forEach(([txt, lab]) => { const c = h(g, 'div', 'aa-wc-card'); const a = h(c, 'div', 'aa-wc-cardar', txt); a.setAttribute('dir', 'rtl'); wcFont(a, 'naskh'); h(c, 'div', 'aa-muted aa-small', lab); });
}
function wcMarks(parent, v) {
  const g = h(parent, 'div', 'aa-wc-cmp');
  v.items.forEach(([txt, name, say]) => {
    const c = h(g, 'div', 'aa-wc-card'); const a = h(c, 'div', 'aa-wc-cardar aa-wc-marks', txt); a.setAttribute('dir', 'rtl'); wcFont(a, 'amiri');
    h(c, 'div', null, name); h(c, 'div', 'aa-tr aa-small', say);
    const b = btn(c, '🔊', () => speak(txt), 'aa-btn-quiet aa-sound'); b.title = 'Écouter';
  });
}
function wcStyles(parent, v) {
  const g = h(parent, 'div', 'aa-wc-styles');
  v.fonts.forEach(id => { const c = h(g, 'div', 'aa-wc-card'); h(c, 'div', 'aa-muted aa-small', WC_FONT_NAMES[id] || id); const a = h(c, 'div', 'aa-wc-stylear', v.text); a.setAttribute('dir', 'rtl'); a.setAttribute('lang', 'ar'); wcFont(a, id); });
}
function wcViz(ctx, parent, v) {
  if (!v) return;
  const wrap = h(parent, 'div', 'aa-wc-viz');
  if (v.t === 'ruler') wcRuler(wrap, v);
  else if (v.t === 'alifdots') wcAlifDots(wrap);
  else if (v.t === 'pieces') wcPiecesViz(wrap, v);
  else if (v.t === 'skel') wcSkel(wrap, v);
  else if (v.t === 'forms') wcForms(wrap, v);
  else if (v.t === 'cmp') wcCmp(wrap, v);
  else if (v.t === 'big') wcBig(wrap, v);
  else if (v.t === 'marks') wcMarks(wrap, v);
  else if (v.t === 'styles') wcStyles(wrap, v);
  else if (v.t === 'syl') wcSyl(wrap, v);
  else if (v.t === 'words') wcWords(ctx, wrap, v);
  else if (v.t === 'verse') wcVerse(ctx, wrap, v);
  else if (v.t === 'pairs') wcPairs(wrap, v);
  else if (v.t === 'demo') makeWritePad(ctx, wrap, { text: v.text, mode: 'view', autoDemo: true });
  else if (v.t === 'trace') makeWritePad(ctx, wrap, { text: v.text, mode: 'trace', autoDemo: false, onScore: () => {} });
}

/* --- schémas du cours de lecture --- */
/* bouton « montrer la lecture » : la transcription est cachée pour que l'élève lise d'abord seul */
function wcTrToggle(wrap) {
  const b = btn(h(wrap, 'div', 'aa-wc-trbar'), '👁 Montrer la lecture', () => { const on = wrap.classList.toggle('aa-wc-trshow'); b.textContent = on ? '🙈 Cacher la lecture' : '👁 Montrer la lecture'; }, 'aa-btn-quiet aa-small');
  return b;
}
function wcSyl(parent, v) {
  const wrap = h(parent, 'div', 'aa-wc-syl');
  wcTrToggle(wrap);
  v.rows.forEach(row => {
    const r = h(wrap, 'div', 'aa-wc-sylrow'); r.setAttribute('dir', 'rtl');
    row.forEach(([ar, tr]) => {
      const c = h(r, 'button', 'aa-wc-sylc');
      arSpan(c, ar, 'aa-wc-sylar'); h(c, 'span', 'aa-tr aa-wc-tr', tr);
      c.addEventListener('click', () => { speak(ar); c.classList.add('aa-wc-seen'); });
    });
  });
  h(wrap, 'div', 'aa-muted aa-small aa-wc-cap', 'Lis d\'abord toi-même, puis touche pour entendre (voix de l\'appareil).');
}
function parseRef(r) { return String(r).split(':').map(Number); }
async function wcWords(ctx, parent, v) {
  const wrap = h(parent, 'div', 'aa-wc-syl');
  wcTrToggle(wrap);
  const g = h(wrap, 'div', 'aa-wc-wgrid'); g.setAttribute('dir', 'rtl');
  for (const [ref, sens] of v.items) {
    const [s, vn, wn] = parseRef(ref);
    const c = h(g, 'button', 'aa-wc-sylc aa-wc-wcard');
    try {
      const d = await ctx.data.surah(s); const words = d.v[vn - 1][2]; const w = words[wn - 1];
      const text = wordText(w); const tr = translitTokens(words, ctx.settings.style)[wn - 1];
      arSpan(c, text, 'aa-wc-sylar'); h(c, 'span', 'aa-tr aa-wc-tr', tr);
      h(c, 'span', 'aa-muted aa-small', sens); h(c, 'span', 'aa-faint aa-small', s + ':' + vn);
      c.addEventListener('click', () => { playWord([s, vn, wn], text, ctx); c.classList.add('aa-wc-seen'); });
    } catch (e) { h(c, 'span', 'aa-muted', ref); }
  }
  h(wrap, 'div', 'aa-muted aa-small aa-wc-cap', 'Lis le mot, puis touche-le pour entendre le récitateur.');
}
async function wcVerse(ctx, parent, v) {
  const [s, vn] = parseRef(v.r);
  const box = h(parent, 'div', 'aa-wc-verse'); box.setAttribute('data-ref', s + ':' + vn);
  try {
    const d = await ctx.data.surah(s); const vv = d.v[vn - 1]; const words = vv[2];
    const tokens = translitTokens(words, ctx.settings.style);
    const line = h(box, 'div', 'aa-verse-ar aa-wc-vline'); line.setAttribute('dir', 'rtl');
    words.forEach((w, wi) => {
      const sp = arSpan(line, wordText(w), 'aa-w'); sp.title = tokens[wi];
      sp.addEventListener('click', () => playWord([s, vn, wi + 1], wordText(w), ctx));
      line.appendChild(document.createTextNode(' '));
    });
    arSpan(line, '﴿' + arNum(vn) + '﴾', 'aa-vnum');
    const tr = h(box, 'div', 'aa-tr aa-verse-tr aa-wc-tr', tokens.join(' '));
    void tr;
    const fr = h(box, 'div', 'aa-verse-fr aa-muted'); fr.textContent = ctx.data.surahInfo(s)[1] + ' ' + s + ':' + vn + ' · ' + vv[0];
    const tools = h(box, 'div', 'aa-verse-tools');
    btn(tools, '▶ Écouter le verset', () => playVerse(s, vn), 'aa-btn-quiet');
    const t = btn(tools, '👁 Montrer la lecture', () => { const on = box.classList.toggle('aa-wc-trshow'); t.textContent = on ? '🙈 Cacher la lecture' : '👁 Montrer la lecture'; }, 'aa-btn-quiet');
    btn(tools, '📖 Ouvrir dans le Coran', () => ctx.openQuran(s, vn), 'aa-btn-quiet');
    h(box, 'div', 'aa-muted aa-small aa-wc-cap', 'Touche un mot pour l\'entendre seul.');
  } catch (e) { h(box, 'p', 'aa-warn', 'Verset introuvable : ' + v.r); }
}
function wcPairs(parent, v) {
  const g = h(parent, 'div', 'aa-wc-pairs');
  v.items.forEach(([a, ta, b, tb]) => {
    const row = h(g, 'div', 'aa-wc-pair'); row.setAttribute('dir', 'rtl');
    [[a, ta], [b, tb]].forEach(([l, t], i) => {
      if (i) h(row, 'span', 'aa-wc-vs', '≠');
      const c = h(row, 'button', 'aa-wc-sylc');
      arSpan(c, l, 'aa-wc-sylar'); h(c, 'span', 'aa-small', t);
      c.addEventListener('click', () => speak(l + 'َ ' + l + 'ِ ' + l + 'ُ'));
    });
  });
  h(parent, 'div', 'aa-muted aa-small aa-wc-cap', 'Touche une lettre : l\'appareil la dit avec a, i, u.');
}

/* --- les cours (écriture, lecture) : même moteur --- */
const COURSES = {
  write: {
    list: () => WRITE_COURSE, store: ctx => wcState(ctx), act: 'w',
    title: '📘 Le cours d\'écriture',
    intro: 'Les **règles** de l\'écriture arabe, expliquées pas à pas, avec des schémas et le geste animé. À faire **avant ou en même temps** que le cahier lettre par lettre.',
    ok: 'Bravo. Passe à la suite, ou entraîne-toi dans le cahier lettre par lettre.',
  },
  read: {
    list: () => READ_COURSE, act: 'r',
    store: ctx => { const R = ctx.settings.reading || (ctx.settings.reading = {}); return R.course || (R.course = {}); },
    title: '📖 Le cours de lecture',
    intro: 'De la première voyelle jusqu\'à lire **seul** une petite sourate. Chaque leçon : une règle simple, des syllabes à écouter, de **vrais mots du Coran**, puis un quiz.',
    ok: 'Bravo. Passe à la suite, ou va lire dans l\'onglet Coran.',
  },
};
function renderWriteCourseList(ctx, root, state, go) { return renderCourseList(ctx, root, state, go, COURSES.write); }
function renderWriteCourse(ctx, root, state, go) { return renderCourse(ctx, root, state, go, COURSES.write); }

/* --- la liste des leçons --- */
function renderCourseList(ctx, root, state, go, D) {
  const C = D.store(ctx); const LIST = D.list();
  const nDone = LIST.filter(L => C[L.id] && C[L.id].done).length;
  const sec = h(root, 'div', 'aa-wc-list');
  const head = h(sec, 'div', 'aa-wc-listhead');
  h(head, 'h3', 'aa-fc-group', D.title);
  h(head, 'span', 'aa-muted aa-small', nDone + ' / ' + LIST.length + ' leçons validées');
  mdText(sec, 'p', 'aa-muted', D.intro);
  const grid = h(sec, 'div', 'aa-lesson-grid');
  const next = LIST.find(L => !(C[L.id] && C[L.id].done));
  LIST.forEach((L, k) => {
    const st = C[L.id];
    const c = h(grid, 'div', 'aa-lesson-card' + (st && st.done ? ' aa-lesson-done' : '') + (L === next ? ' aa-lesson-next' : ''));
    const top = h(c, 'div', 'aa-lesson-top'); h(top, 'span', 'aa-lesson-num', String(k + 1));
    if (st && st.done) h(top, 'span', 'aa-tag', '✓ ' + st.best + ' %'); else if (L === next) h(top, 'span', 'aa-tag', '→ maintenant');
    h(c, 'div', 'aa-lesson-title', L.title);
    arSpan(c, L.ar, 'aa-lesson-ar');
    h(c, 'div', 'aa-muted aa-small', '≈ ' + L.min + ' min · ' + L.steps.length + ' étapes · ' + L.quiz.length + ' questions');
    c.addEventListener('click', () => { state.course = L.id; state.cstep = (C.place && C.place[0] === L.id) ? C.place[1] : 0; go(); });
  });
  return next;
}

/* --- une leçon : une étape à la fois, puis le quiz --- */
function renderCourse(ctx, root, state, go, D) {
  const LIST = D.list();
  const L = LIST.find(x => x.id === state.course); if (!L) { state.course = null; return go(); }
  const C = D.store(ctx); const k = LIST.indexOf(L);
  const n = L.steps.length; const step = Math.max(0, Math.min(n, state.cstep || 0));
  C.place = [L.id, step]; ctx.save();
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Le cours', () => { state.course = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', 'Leçon ' + (k + 1) + ' · ' + L.title);
  h(top, 'span', 'aa-muted aa-small aa-fc-left', step < n ? 'Étape ' + (step + 1) + ' / ' + n : 'Quiz');
  const bar = h(root, 'div', 'aa-lesson-progress'); const fl = h(bar, 'div', 'aa-lesson-fill'); fl.style.width = Math.round(100 * step / (n + 1)) + '%';
  const dots = h(root, 'div', 'aa-wc-dots');
  for (let i = 0; i <= n; i++) { const d = h(dots, 'button', 'aa-wc-dot' + (i === step ? ' aa-on' : i < step ? ' aa-wc-dot-done' : ''), i < n ? String(i + 1) : '?'); d.title = i < n ? (L.steps[i].h || 'Étape ' + (i + 1)) : 'Quiz'; d.addEventListener('click', () => { stopAudio(); state.cstep = i; go(); root.scrollTop = 0; }); }
  if (step < n) {
    const S = L.steps[step];
    if (step === 0) { const t = h(root, 'div', 'aa-wc-title'); h(t, 'h2', null, L.title); arSpan(t, L.ar, 'aa-wc-titlear'); }
    if (S.h) h(root, 'h3', 'aa-wc-h', S.h);
    if (S.md) { const body = h(root, 'div', 'aa-wc-body'); wcMdBlock(body, S.md); }
    wcViz(ctx, root, S.viz);
    if (S.copyBtn) btn(h(root, 'div', 'aa-actions'), '📜 Recopier le Coran dans mon cahier', () => { state.course = null; state.copy = true; go(); }, 'aa-btn-quiet');
    const nav = h(root, 'div', 'aa-wc-nav');
    if (step > 0) btn(nav, '← Précédent', () => { stopAudio(); state.cstep = step - 1; go(); root.scrollTop = 0; }, 'aa-btn-quiet');
    btn(nav, step < n - 1 ? 'Suivant →' : 'Le quiz →', () => { stopAudio(); state.cstep = step + 1; go(); root.scrollTop = 0; }, 'mod-cta');
    return;
  }
  // le quiz
  h(root, 'h3', 'aa-wc-h', '❓ Vérifie que tu as compris');
  mdText(root, 'p', 'aa-muted', 'Réponds à toutes les questions. À **70 %** de bonnes réponses, la leçon est validée ✓.');
  const ans = new Array(L.quiz.length).fill(null);
  const res = h(document.createElement('div'), 'div', 'aa-wc-res');
  L.quiz.forEach((Q, qi) => {
    const q = h(root, 'div', 'aa-wc-q');
    mdText(q, 'div', 'aa-wc-qtxt', (qi + 1) + '. ' + Q.q);
    if (Q.say || Q.ref) {
      const say = () => {
        if (Q.say) return speak(Q.say);
        const [s, v, w] = parseRef(Q.ref);
        ctx.data.surah(s).then(d => playWord([s, v, w], wordText(d.v[v - 1][2][w - 1]), ctx)).catch(() => {});
      };
      btn(h(q, 'div', 'aa-wc-qsay'), '🔊 Écouter', say, 'aa-btn-quiet');
    }
    // les réponses dans un ordre mélangé, mais toujours le même pour une question
    const order = Q.o.map((o, i) => i).sort((a, b) => ((a * 7 + qi * 3) % 5) - ((b * 7 + qi * 3) % 5));
    const opts = h(q, 'div', 'aa-wc-opts'); const fb = h(q, 'div', 'aa-wc-fb');
    order.forEach(i => {
      const o = Q.o[i]; const b = btn(opts, o, () => {
        if (ans[qi] != null) return; ans[qi] = i === Q.a;
        b.classList.add(i === Q.a ? 'aa-good' : 'aa-bad');
        opts.querySelectorAll('button').forEach((x, j) => { if (order[j] === Q.a) x.classList.add('aa-good'); x.disabled = true; });
        mdText(fb, 'div', null, (i === Q.a ? '✅ ' : '❌ ') + Q.why);
        if (ans.every(x => x != null)) finish();
      }, 'aa-btn-quiet aa-wc-opt');
      if (/[؀-ۿ]/.test(o)) { b.textContent = ''; mdText(b, 'span', null, o); b.classList.add('aa-wc-optar'); }
    });
  });
  root.appendChild(res);
  const finish = () => {
    clear(res);
    const good = ans.filter(Boolean).length; const pct = Math.round(100 * good / ans.length);
    const st = C[L.id] || (C[L.id] = { best: 0 }); st.best = Math.max(st.best || 0, pct); if (pct >= 70) st.done = true; st.d = todayNum(); ctx.save();
    if (ctx.markActivity) ctx.markActivity(D.act);
    const box = h(res, 'div', 'aa-fc-end');
    h(box, 'div', 'aa-fc-end-ic', pct >= 70 ? '🌿' : '📖');
    h(box, 'h3', null, (pct >= 70 ? 'Leçon validée : ' : 'Pas encore : ') + good + ' / ' + ans.length);
    h(box, 'p', 'aa-muted', pct >= 70 ? D.ok : 'Relis les étapes (les numéros en haut), puis refais le quiz.');
    const a = h(box, 'div', 'aa-fc-start');
    const nx = LIST[k + 1];
    if (pct >= 70 && nx) btn(a, 'Leçon suivante : ' + nx.title + ' →', () => { state.course = nx.id; state.cstep = 0; go(); root.scrollTop = 0; }, 'mod-cta aa-fc-big');
    btn(a, '↻ Refaire le quiz', () => go(), 'aa-fc-big2');
    btn(a, 'Revoir la leçon', () => { state.cstep = 0; go(); root.scrollTop = 0; }, 'aa-btn-quiet');
  };
}

/* --- l'onglet Apprendre › Lire --- */
function renderReadTab(ctx, root, state) {
  clear(root);
  const go = () => renderReadTab(ctx, root, state);
  if (state.course) return renderCourse(ctx, root, state, go, COURSES.read);
  const C = COURSES.read.store(ctx);
  const nx = READ_COURSE.find(L => !(C[L.id] && C[L.id].done));
  const act = h(root, 'div', 'aa-fc-start aa-wc-readstart');
  if (nx) btn(act, '▶  ' + (C.place ? 'Continuer' : 'Commencer') + ' : ' + nx.title, () => { state.course = nx.id; state.cstep = (C.place && C.place[0] === nx.id) ? C.place[1] : 0; go(); }, 'mod-cta aa-fc-big');
  else h(act, 'div', 'aa-ok', 'Tu as fini le cours de lecture. Ouvre le Coran et lis une sourate seul : tu en es capable.');
  btn(act, '📖  Lire dans le Coran', () => ctx.openTab('coran', {}), 'aa-fc-big2');
  renderCourseList(ctx, root, state, go, COURSES.read);
}
/* texte en paragraphes, listes « - » et « 1. » */
function wcMdBlock(parent, md) {
  let list = null, ltype = '';
  String(md).split('\n').forEach(line => {
    const m1 = line.match(/^- (.*)$/), m2 = line.match(/^(\d+)\. (.*)$/);
    if (m1 || m2) { const t = m1 ? 'ul' : 'ol'; if (!list || ltype !== t) { list = h(parent, t, 'aa-wc-list-ul'); ltype = t; } mdText(list, 'li', null, m1 ? m1[1] : m2[2]); return; }
    list = null; if (line.trim()) mdText(parent, 'p', null, line);
  });
}
