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
  else if (v.t === 'demo') makeWritePad(ctx, wrap, { text: v.text, mode: 'view', autoDemo: true });
  else if (v.t === 'trace') makeWritePad(ctx, wrap, { text: v.text, mode: 'trace', autoDemo: false, onScore: () => {} });
}

/* --- la liste des leçons (dans l'onglet Écrire) --- */
function renderWriteCourseList(ctx, root, state, go) {
  const C = wcState(ctx);
  const nDone = WRITE_COURSE.filter(L => C[L.id] && C[L.id].done).length;
  const sec = h(root, 'div', 'aa-wc-list');
  const head = h(sec, 'div', 'aa-wc-listhead');
  h(head, 'h3', 'aa-fc-group', '📘 Le cours d\'écriture');
  h(head, 'span', 'aa-muted aa-small', nDone + ' / ' + WRITE_COURSE.length + ' leçons validées');
  mdText(sec, 'p', 'aa-muted', 'Les **règles** de l\'écriture arabe, expliquées pas à pas, avec des schémas et le geste animé. À faire **avant ou en même temps** que le cahier lettre par lettre.');
  const grid = h(sec, 'div', 'aa-lesson-grid');
  const next = WRITE_COURSE.find(L => !(C[L.id] && C[L.id].done));
  WRITE_COURSE.forEach((L, k) => {
    const st = C[L.id];
    const c = h(grid, 'div', 'aa-lesson-card' + (st && st.done ? ' aa-lesson-done' : '') + (L === next ? ' aa-lesson-next' : ''));
    const top = h(c, 'div', 'aa-lesson-top'); h(top, 'span', 'aa-lesson-num', String(k + 1));
    if (st && st.done) h(top, 'span', 'aa-tag', '✓ ' + st.best + ' %'); else if (L === next) h(top, 'span', 'aa-tag', '→ maintenant');
    h(c, 'div', 'aa-lesson-title', L.title);
    const a = arSpan(c, L.ar, 'aa-lesson-ar'); void a;
    h(c, 'div', 'aa-muted aa-small', '≈ ' + L.min + ' min · ' + L.steps.length + ' étapes · ' + L.quiz.length + ' questions');
    c.addEventListener('click', () => { state.course = L.id; state.cstep = (C.place && C.place[0] === L.id) ? C.place[1] : 0; go(); });
  });
  return next;
}

/* --- une leçon : une étape à la fois, puis le quiz --- */
function renderWriteCourse(ctx, root, state, go) {
  const L = WRITE_COURSE.find(x => x.id === state.course); if (!L) { state.course = null; return go(); }
  const C = wcState(ctx); const k = WRITE_COURSE.indexOf(L);
  const n = L.steps.length; let step = Math.max(0, Math.min(n, state.cstep || 0));
  C.place = [L.id, step]; ctx.save();
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Le cours', () => { state.course = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', 'Leçon ' + (k + 1) + ' · ' + L.title);
  h(top, 'span', 'aa-muted aa-small aa-fc-left', step < n ? 'Étape ' + (step + 1) + ' / ' + n : 'Quiz');
  const bar = h(root, 'div', 'aa-lesson-progress'); const fl = h(bar, 'div', 'aa-lesson-fill'); fl.style.width = Math.round(100 * step / (n + 1)) + '%';
  const dots = h(root, 'div', 'aa-wc-dots');
  for (let i = 0; i <= n; i++) { const d = h(dots, 'button', 'aa-wc-dot' + (i === step ? ' aa-on' : i < step ? ' aa-wc-dot-done' : ''), i < n ? String(i + 1) : '?'); d.title = i < n ? L.steps[i].h : 'Quiz'; d.addEventListener('click', () => { state.cstep = i; go(); root.scrollTop = 0; }); }
  if (step < n) {
    const S = L.steps[step];
    if (step === 0) { const t = h(root, 'div', 'aa-wc-title'); h(t, 'h2', null, L.title); arSpan(t, L.ar, 'aa-wc-titlear'); }
    h(root, 'h3', 'aa-wc-h', S.h);
    const body = h(root, 'div', 'aa-wc-body'); wcMdBlock(body, S.md);
    wcViz(ctx, root, S.viz);
    if (S.copyBtn) btn(h(root, 'div', 'aa-actions'), '📜 Recopier le Coran dans mon cahier', () => { state.course = null; state.copy = true; go(); }, 'aa-btn-quiet');
    const nav = h(root, 'div', 'aa-wc-nav');
    if (step > 0) btn(nav, '← Précédent', () => { state.cstep = step - 1; go(); root.scrollTop = 0; }, 'aa-btn-quiet');
    btn(nav, step < n - 1 ? 'Suivant →' : 'Le quiz →', () => { state.cstep = step + 1; go(); root.scrollTop = 0; }, 'mod-cta');
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
      if (/[\u0600-\u06FF]/.test(o)) { b.textContent = ''; mdText(b, 'span', null, o); b.classList.add('aa-wc-optar'); }
    });
  });
  root.appendChild(res);
  const finish = () => {
    clear(res);
    const good = ans.filter(Boolean).length; const pct = Math.round(100 * good / ans.length);
    const st = C[L.id] || (C[L.id] = { best: 0 }); st.best = Math.max(st.best || 0, pct); if (pct >= 70) st.done = true; st.d = todayNum(); ctx.save();
    if (ctx.markActivity) ctx.markActivity('w');
    const box = h(res, 'div', 'aa-fc-end');
    h(box, 'div', 'aa-fc-end-ic', pct >= 70 ? '🌿' : '✍️');
    h(box, 'h3', null, (pct >= 70 ? 'Leçon validée : ' : 'Pas encore : ') + good + ' / ' + ans.length);
    h(box, 'p', 'aa-muted', pct >= 70 ? 'Bravo. Passe à la suite, ou entraîne-toi dans le cahier lettre par lettre.' : 'Relis les étapes (les numéros en haut), puis refais le quiz.');
    const a = h(box, 'div', 'aa-fc-start');
    const nx = WRITE_COURSE[k + 1];
    if (pct >= 70 && nx) btn(a, 'Leçon suivante : ' + nx.title + ' →', () => { state.course = nx.id; state.cstep = 0; go(); root.scrollTop = 0; }, 'mod-cta aa-fc-big');
    btn(a, '↻ Refaire le quiz', () => go(), 'aa-fc-big2');
    btn(a, 'Revoir la leçon', () => { state.cstep = 0; go(); root.scrollTop = 0; }, 'aa-btn-quiet');
  };
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
