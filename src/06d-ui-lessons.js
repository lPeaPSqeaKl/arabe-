/* ====================================================================
 * 06d - Onglet Leçons : parcours de grammaire guidé
 * ==================================================================== */
function lessonState(ctx) { return ctx.settings.lessons || (ctx.settings.lessons = {}); }

function saveLessonPlace(ctx, state) {
  const o = ctx.settings.lessonPlace || {};
  const P = { open: state.open || null, step: state.step || 0, lastOpen: state.open || o.lastOpen || null, lastStep: state.open ? (state.step || 0) : (o.lastStep || 0) };
  if (o.open !== P.open || o.step !== P.step || o.lastOpen !== P.lastOpen || o.lastStep !== P.lastStep) { ctx.settings.lessonPlace = P; ctx.save(); }
}
function renderLessonsTab(ctx, root, state) {
  clear(root);
  saveLessonPlace(ctx, state);
  if (state.open) { const L = LESSONS.find(l => l.id === state.open); if (L) return renderLesson(ctx, root, state, L); state.open = null; }
  const done = lessonState(ctx);
  const nDone = LESSONS.filter(l => done[l.id] && done[l.id].done).length;
  mdText(root, 'p', 'aa-help', 'Un **parcours de grammaire** en ' + LESSONS.length + ' leçons, toujours à partir de **vrais versets**. Chaque leçon se termine par des questions : à **70 %** de bonnes réponses, elle est validée ✓. Va dans l\'ordre : chaque leçon s\'appuie sur les précédentes.');
  const bar = h(root, 'div', 'aa-lesson-progress');
  const fill = h(bar, 'div', 'aa-lesson-fill'); fill.style.width = Math.round(100 * nDone / LESSONS.length) + '%';
  h(root, 'p', 'aa-muted aa-small', nDone + ' / ' + LESSONS.length + ' leçons validées');
  const next = LESSONS.find(l => !(done[l.id] && done[l.id].done));
  if (next) {
    const pl = ctx.settings.lessonPlace || {}; const lk = LESSONS.indexOf(next) + 1;
    const resume = pl.lastOpen === next.id && pl.lastStep ? pl.lastStep : 0;
    const act = h(root, 'div', 'aa-actions aa-lesson-go');
    btn(act, '▶ ' + (resume ? 'Reprendre' : 'Commencer') + ' : leçon ' + lk + ' · ' + next.title, () => { state.open = next.id; state.q = null; state.step = resume; state.stepFor = next.id; renderLessonsTab(ctx, root, state); root.scrollTop = 0; }, 'mod-cta');
  }
  const grid = h(root, 'div', 'aa-lesson-grid');
  LESSONS.forEach((L, k) => {
    const st = done[L.id];
    const c = h(grid, 'div', 'aa-lesson-card' + (st && st.done ? ' aa-lesson-done' : '') + (L === next ? ' aa-lesson-next' : ''));
    const top = h(c, 'div', 'aa-lesson-top');
    h(top, 'span', 'aa-lesson-num', String(k + 1));
    if (st && st.done) h(top, 'span', 'aa-tag', '✓ validée · ' + st.best + ' %');
    else if (L === next) h(top, 'span', 'aa-tag', '→ à faire maintenant');
    else if (st) h(top, 'span', 'aa-muted aa-small', 'meilleur score : ' + st.best + ' %');
    h(c, 'div', 'aa-lesson-title', L.title);
    arSpan(c, L.ar, 'aa-lesson-ar');
    h(c, 'div', 'aa-muted aa-small', '≈ ' + L.min + ' min · ' + L.practice.length + ' questions');
    c.addEventListener('click', () => { state.open = L.id; state.q = null; renderLessonsTab(ctx, root, state); root.scrollTop = 0; });
  });
}

/* un verset d'exemple, mots surlignés cliquables */
async function renderLessonExample(ctx, parent, ex) {
  const [s, v] = ex.r.split(':').map(Number);
  const d = await ctx.data.surah(s); const vv = d.v[v - 1]; if (!vv) return;
  const words = vv[2];
  const box = h(parent, 'div', 'aa-lesson-ex');
  const line = h(box, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); line.style.fontSize = Math.max(24, ctx.settings.arSize - 2) + 'px';
  const tokens = translitTokens(words, ctx.settings.style);
  const detail = h(document.createElement('div'), 'div', 'aa-detail');
  const spans = [];
  words.forEach((w, wi) => {
    const hl = (ex.w || []).includes(wi + 1);
    const sp = arSpan(line, wordText(w), 'aa-w ' + (POS_CLASS[stemOf(w).f.pos] || '') + (hl ? ' aa-hl' : ''));
    sp.title = tokens[wi];
    sp.addEventListener('click', () => { spans.forEach(x => x.classList.remove('aa-w-sel')); sp.classList.add('aa-w-sel'); renderWordDetail(ctx, detail, words, wi, [s, v, wi + 1], vv); });
    spans.push(sp); line.appendChild(document.createTextNode(' '));
  });
  arSpan(line, '﴿' + arNum(v) + '﴾', 'aa-vnum');
  if (ctx.settings.showTr) h(box, 'div', 'aa-tr aa-verse-tr', tokens.join(' '));
  const fr = h(box, 'div', 'aa-verse-fr'); const lk = h(fr, 'a', 'aa-link aa-ref', ctx.data.surahInfo(s)[1] + ' ' + s + ':' + v); lk.addEventListener('click', e => { e.preventDefault(); ctx.openQuran(s, v); });
  fr.appendChild(document.createTextNode(' ' + vv[0]));
  if (ex.n) mdText(box, 'div', 'aa-lesson-note', '👉 ' + ex.n);
  const tools = h(box, 'div', 'aa-verse-tools');
  if (ctx.settings.audio !== false) btn(tools, '▶ Écouter', () => playVerse(s, v), 'aa-btn-quiet');
  const irBox = h(document.createElement('div'), 'div', 'aa-struct');
  btn(tools, '🧩 Analyse de la phrase', () => { if (irBox.firstChild) { clear(irBox); return; } renderIrab(ctx, irBox, words, [s, v], { onWord: wi => spans[wi].click() }); }, 'aa-btn-quiet');
  box.appendChild(irBox); box.appendChild(detail);
}

/* --- schémas de grammaire --- */
const ROLE_HUE = { v: '#c8665c', s: '#4f86c6', o: '#3e9e6b', g: '#8e63c7', a: '#c48a2c', p: '#7d8590', x: '#7d8590' };
function lessonViz(ctx, parent, v) {
  if (!v) return;
  const wrap = h(parent, 'div', 'aa-wc-viz aa-gv');
  if (v.t === 'big') return wcBig(wrap, v);
  if (v.t === 'root') {
    const g = h(wrap, 'div', 'aa-gv-roots'); g.setAttribute('dir', 'rtl');
    v.words.forEach(([w, sens, root]) => {
      const c = h(g, 'div', 'aa-gv-root');
      const a = h(c, 'div', 'aa-gv-rootar'); a.setAttribute('dir', 'rtl'); a.setAttribute('lang', 'ar');
      const R = [...(root || '')]; let k = 0;
      const gs = []; for (const ch of w) { if (/[ً-ْٰ]/.test(ch) && gs.length) gs[gs.length - 1] += ch; else gs.push(ch); }
      gs.forEach(gr => { const isR = k < R.length && gr[0] === R[k]; if (isR) k++; const s = h(a, 'span', isR ? 'aa-gv-rl' : 'aa-gv-ol', gr); void s; });
      h(c, 'div', 'aa-small', sens);
      if (root) h(c, 'div', 'aa-faint aa-small', [...root].join(' '));
    });
    if (v.cap) h(wrap, 'div', 'aa-muted aa-small aa-wc-cap', v.cap);
    return;
  }
  if (v.t === 'blocks') {
    v.rows.forEach(r => {
      const row = h(wrap, 'div', 'aa-gv-row' + (r.join ? ' aa-gv-join' : '')); row.setAttribute('dir', 'rtl');
      r.w.forEach(([ar, lab, hue]) => {
        const b = h(row, 'div', 'aa-gv-b'); b.style.setProperty('--hue', ROLE_HUE[hue] || ROLE_HUE.x);
        arSpan(b, ar, 'aa-gv-ar');
        if (lab) h(b, 'div', 'aa-gv-lab', lab);
      });
      if (r.cap) mdText(wrap, 'div', 'aa-muted aa-small aa-gv-cap', r.cap);
    });
  }
}

async function renderLesson(ctx, root, state, L) {
  const k = LESSONS.indexOf(L);
  const NS = L.sections.length; const KEEP = NS + 1, QUIZ = NS + 2;
  if (state.stepFor !== L.id) { state.step = 0; state.stepFor = L.id; }
  const step = Math.max(0, Math.min(QUIZ, state.step || 0));
  state.step = step; saveLessonPlace(ctx, state);
  const redraw = () => { clear(root); renderLesson(ctx, root, state, L); root.scrollTop = 0; try { root.closest('.view-content, .aa-root').scrollTop = 0; } catch (e) { /* */ } };
  const goStep = i => { state.step = i; redraw(); };
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Les leçons', () => { state.open = null; saveLessonPlace(ctx, state); renderLessonsTab(ctx, root, state); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', 'Leçon ' + (k + 1) + ' · ' + L.title);
  h(top, 'span', 'aa-muted aa-small aa-fc-left', step === 0 ? 'But' : step <= NS ? 'Étape ' + step + ' / ' + NS : step === KEEP ? 'L\'essentiel' : 'Exercices');
  const bar = h(root, 'div', 'aa-lesson-progress'); const fl = h(bar, 'div', 'aa-lesson-fill'); fl.style.width = Math.round(100 * step / QUIZ) + '%';
  const dots = h(root, 'div', 'aa-wc-dots');
  const labels = ['🎯'].concat(L.sections.map((s, i) => String(i + 1)), ['📌', '?']);
  labels.forEach((lab, i) => { const d = h(dots, 'button', 'aa-wc-dot' + (i === step ? ' aa-on' : i < step ? ' aa-wc-dot-done' : ''), lab); d.title = i === 0 ? 'Ce que tu vas apprendre' : i <= NS ? L.sections[i - 1].t : i === KEEP ? 'L\'essentiel' : 'Exercices'; d.addEventListener('click', () => goStep(i)); });
  const nav = () => {
    const n = h(root, 'div', 'aa-wc-nav');
    if (step > 0) btn(n, '← Précédent', () => goStep(step - 1), 'aa-btn-quiet');
    if (step < QUIZ) btn(n, step === 0 ? 'Commencer →' : step < NS ? 'Suivant →' : step === NS ? 'L\'essentiel →' : 'Les exercices →', () => goStep(step + 1), 'mod-cta');
  };
  if (step === 0) {
    const t = h(root, 'div', 'aa-wc-title'); h(t, 'h2', null, L.title); arSpan(t, L.ar, 'aa-wc-titlear');
    h(root, 'div', 'aa-muted aa-small', '≈ ' + L.min + ' min · ' + NS + ' étapes · ' + L.practice.length + ' exercices');
    h(root, 'h3', 'aa-wc-h', '🎯 Ce que tu vas apprendre');
    const ul = h(root, 'ul', 'aa-wc-list-ul'); L.goal.forEach(g => mdText(ul, 'li', null, g));
    if (L.rules && L.rules.length) {
      const r = h(root, 'div', 'aa-small'); h(r, 'span', 'aa-muted', 'Fiches de ton coffre : ');
      L.rules.forEach((n, i) => { const a = h(r, 'a', 'aa-link', n); a.addEventListener('click', e => { e.preventDefault(); ctx.openPath('2 - Règles/' + n + '.md'); }); if (i < L.rules.length - 1) r.appendChild(document.createTextNode(' · ')); });
    }
    nav(); linkTerms(ctx, root); return;
  }
  if (step <= NS) {
    const S = L.sections[step - 1];
    h(root, 'h3', 'aa-wc-h', S.t);
    const sec = h(root, 'div', 'aa-lesson-sec aa-wc-body');
    if (S.md) S.md.split(/\n\n+/).forEach(par => {
      if (/^```/.test(par)) { const pre = h(sec, 'pre', 'aa-small'); pre.textContent = par.replace(/^```\w*\n?|```$/g, ''); return; }
      if (/^(- |\d\. )/m.test(par) && par.split('\n').every(l => /^(- |\d\. )/.test(l))) { const list = h(sec, /^\d/.test(par) ? 'ol' : 'ul'); par.split('\n').forEach(l => mdText(list, 'li', null, l.replace(/^(- |\d\. )/, ''))); return; }
      const p = h(sec, 'div', 'aa-lesson-p');
      par.split('\n').forEach(l => { if (/^- /.test(l)) mdText(p, 'div', 'aa-lesson-li', '• ' + l.slice(2)); else if (/^\d\. /.test(l)) mdText(p, 'div', 'aa-lesson-li', l); else mdText(p, 'div', null, l); });
    });
    lessonViz(ctx, sec, S.viz);
    if (S.table) {
      const t = h(sec, 'table', 'aa-table aa-lesson-table');
      S.table.forEach((row, ri) => { const tr = h(t, 'tr'); row.forEach(c => { const cell = h(tr, ri ? 'td' : 'th'); if (ri && hasArabic(c) && !/[a-zéèà]/i.test(c)) arSpan(cell, c, 'aa-mid'); else addBidi(cell, c); }); });
    }
    if (S.ex) for (const ex of S.ex) await renderLessonExample(ctx, sec, ex);
    if (S.irab) {
      const [s, v] = S.irab.split(':').map(Number);
      const d = await ctx.data.surah(s); const vv = d.v[v - 1];
      const box = h(sec, 'div', 'aa-lesson-ex');
      const line = h(box, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); arSpan(line, vv[2].map(wordText).join(' ') + ' ﴿' + arNum(v) + '﴾');
      h(box, 'div', 'aa-verse-fr', s + ':' + v + ' ' + vv[0]);
      renderIrab(ctx, h(box, 'div', 'aa-struct'), vv[2], [s, v]);
    }
    nav(); linkTerms(ctx, root); return;
  }
  if (step === KEEP) {
    const keep = h(root, 'div', 'aa-lesson-keep');
    h(keep, 'b', null, '📌 L\'essentiel à retenir');
    const kl = h(keep, 'ul'); L.keep.forEach(x => mdText(kl, 'li', null, x));
    const ess = (LESSON_RULES[L.id] || []).map(ruleById).filter(Boolean);
    if (ess.length) {
      const box = h(root, 'div', 'aa-lesson-simple');
      h(box, 'b', null, '🟢 Les règles de cette leçon, en une phrase');
      const ul0 = h(box, 'ul');
      ess.forEach(r => { const li = h(ul0, 'li'); mdText(li, 'span', null, r.one + ' '); const a = h(li, 'a', 'aa-link aa-rule-link aa-more', 'la fiche'); a.title = r.title; a.addEventListener('click', e => { e.preventDefault(); ctx.openTab('rules', { open: r.id }); }); });
    }
    const kb = h(root, 'div', 'aa-actions');
    btn(kb, 'Insérer le résumé dans la note', () => ctx.insertText('> [!abstract] ' + L.title + ' (' + L.ar + ')\n' + L.keep.map(x => '> - ' + x).join('\n') + '\n\n'), 'aa-btn-quiet');
    nav(); linkTerms(ctx, root); return;
  }
  h(root, 'h3', 'aa-wc-h', '✍️ Vérifie que tu as compris');
  mdText(root, 'p', 'aa-muted', L.practice.length + ' exercices variés. À **70 %**, la leçon est validée ✓.');
  const qbox = h(root, 'div', 'aa-quiz aa-lesson-quiz');
  if (!state.run || state.run.id !== L.id) state.run = { id: L.id, i: 0, ok: 0 };
  await renderLessonQuestion(ctx, qbox, state, L, root);
  nav();
}

async function renderLessonQuestion(ctx, box, state, L, root) {
  clear(box);
  const run = state.run; const n = L.practice.length;
  if (run.i >= n) {
    const pct = Math.round(100 * run.ok / n);
    const all = lessonState(ctx); const prev = all[L.id] || { done: false, best: 0 };
    const passed = pct >= 70;
    all[L.id] = { done: prev.done || passed, best: Math.max(prev.best, pct), date: new Date().toISOString().slice(0, 10) };
    if (ctx.markActivity) ctx.markActivity('l');
    ctx.save();
    mdText(box, 'div', passed ? 'aa-ok' : 'aa-warn', (passed ? '✓ Leçon validée ! ' : 'Pas encore validée : ') + '**' + run.ok + ' / ' + n + '** (' + pct + ' %).' + (passed ? '' : ' Relis les exemples, puis recommence : il faut 70 %.'));
    const a = h(box, 'div', 'aa-actions');
    btn(a, 'Recommencer les questions', () => { state.run = { id: L.id, i: 0, ok: 0 }; renderLessonQuestion(ctx, box, state, L, root); }, 'aa-btn-quiet');
    const k = LESSONS.indexOf(L);
    if (k < LESSONS.length - 1) btn(a, 'Leçon suivante : ' + LESSONS[k + 1].title + ' →', () => { state.open = LESSONS[k + 1].id; state.run = null; renderLessonsTab(ctx, root, state); root.scrollTop = 0; }, 'mod-cta');
    else mdText(box, 'p', 'aa-why', '🎉 Tu as fini le parcours ! Continue avec l\'onglet **Entraînement** (exercice « rôle de ce mot ») et l\'analyse 🧩 des sourates de ton cours.');
    return;
  }
  const P = L.practice[run.i];
  h(box, 'div', 'aa-muted aa-small', 'Question ' + (run.i + 1) + ' / ' + n + ' · bonnes réponses : ' + run.ok);
  const fb = document.createElement('div'); fb.className = 'aa-quiz-fb';
  const finish = (good, why, extra) => {
    if (good) run.ok++;
    ctx.record(-1, good, 'lesson');
    mdText(fb, 'div', good ? 'aa-ok' : 'aa-warn', good ? '✓ Bravo !' : '✗ Pas tout à fait.');
    if (why) mdText(fb, 'div', 'aa-why', why);
    if (extra) extra(fb);
    linkTerms(ctx, fb);
    const nb = btn(fb, run.i + 1 < n ? 'Question suivante →' : 'Voir mon résultat →', () => { run.i++; renderLessonQuestion(ctx, box, state, L, root); }, 'mod-cta');
    nb.focus && nb.focus();
  };
  if (P.k === 'mcq') {
    mdText(box, 'div', 'aa-quiz-q', P.q);
    const order = shuffle(P.o.map((_, i) => i));
    const opts = h(box, 'div', 'aa-quiz-opts'); let done = false;
    order.forEach(oi => {
      const b = btn(opts, '', () => {
        if (done) return; done = true;
        opts.querySelectorAll('button').forEach((x, j) => { if (order[j] === P.a) x.classList.add('aa-good'); else if (x === b) x.classList.add('aa-bad'); });
        finish(oi === P.a, P.why);
      }, 'aa-quiz-opt');
      if (hasArabic(P.o[oi]) && !/[a-zé]/i.test(P.o[oi])) arSpan(b, P.o[oi], 'aa-mid'); else addBidi(b, P.o[oi]);
    });
  } else if (P.k === 'find') {
    mdText(box, 'div', 'aa-quiz-q', P.q);
    const [s, v] = P.r.split(':').map(Number);
    const d = await ctx.data.surah(s); const vv = d.v[v - 1]; const words = vv[2];
    IRAB_LEMMAS = ctx.data.lemmas; const res = analyseIrab(words);
    const info = words.map((w, wi) => { const x = irabWordInfo(w); return { words, wi, f: x.f, x, st: x.st, r: res[wi], root: x.st.seg[3] >= 0 ? (ctx.data.lemmas[x.st.seg[3]] || [])[3] || '' : '' }; });
    const goodSet = info.filter(i => { try { return P.test(i); } catch (e) { return false; } }).map(i => i.wi);
    const line = h(box, 'div', 'aa-verse-ar aa-find'); line.setAttribute('dir', 'rtl'); line.style.fontSize = ctx.settings.arSize + 'px';
    h(box, 'div', 'aa-muted aa-small', s + ':' + v + ' — ' + vv[0]);
    let done = false; const spans = [];
    words.forEach((w, wi) => {
      const sp = arSpan(line, wordText(w), 'aa-w aa-find-w');
      sp.addEventListener('click', () => {
        if (done) return; done = true;
        spans.forEach((x, j) => { if (goodSet.includes(j)) x.classList.add('aa-find-good'); });
        if (!goodSet.includes(wi)) sp.classList.add('aa-find-bad');
        finish(goodSet.includes(wi), P.why, fbEl => { const det = h(fbEl, 'div', 'aa-detail'); renderWordDetail(ctx, det, words, wi, [s, v, wi + 1], vv); });
      });
      spans.push(sp); line.appendChild(document.createTextNode(' '));
    });
  } else if (P.k === 'gen') {
    h(box, 'p', 'aa-muted', 'Préparation d\'une question sur un verset au hasard du Juz ʿAmma…');
    const q = await makeQuestion(ctx, { qtype: P.type, range: 'juz30' });
    clear(box);
    h(box, 'div', 'aa-muted aa-small', 'Question ' + (run.i + 1) + ' / ' + n + ' · bonnes réponses : ' + run.ok + ' · verset au hasard');
    h(box, 'div', 'aa-quiz-q', q.prompt);
    if (q.words) {
      const a = h(box, 'div', 'aa-verse-ar'); a.setAttribute('dir', 'rtl'); a.style.fontSize = ctx.settings.arSize + 'px';
      q.words.forEach((w, wi) => { arSpan(a, wordText(w), wi === q.wi ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
      h(box, 'div', 'aa-muted aa-small', q.ref[0] + ':' + q.ref[1] + ' — ' + q.verseFr);
    }
    const opts = h(box, 'div', 'aa-quiz-opts'); let done = false;
    q.options.forEach((o, i) => {
      const b = btn(opts, '', () => {
        if (done) return; done = true;
        opts.querySelectorAll('button').forEach((x, j) => { if (j === q.answer) x.classList.add('aa-good'); else if (j === i) x.classList.add('aa-bad'); });
        finish(i === q.answer, null, fbEl => { (q.explain || []).forEach(x => mdText(fbEl, 'div', 'aa-why', x)); if (!q.words) return; const det = h(fbEl, 'div', 'aa-detail'); renderWordDetail(ctx, det, q.words, q.wi, q.ref, null); });
      }, 'aa-quiz-opt');
      if (q.optAr) arSpan(b, o, 'aa-mid'); else b.textContent = o;
    });
  } else if (P.k === 'tf') {
    mdText(box, 'div', 'aa-quiz-q', P.q);
    const opts = h(box, 'div', 'aa-quiz-opts aa-tf'); let done = false;
    [[true, '✓ Vrai'], [false, '✗ Faux']].forEach(([val, lab]) => {
      const b = btn(opts, lab, () => {
        if (done) return; done = true;
        opts.querySelectorAll('button').forEach((x, j) => { if ((j === 0) === P.a) x.classList.add('aa-good'); else if (x === b) x.classList.add('aa-bad'); });
        finish(val === P.a, P.why);
      }, 'aa-quiz-opt');
    });
  } else if (P.k === 'match') {
    mdText(box, 'div', 'aa-quiz-q', P.q);
    mdText(box, 'div', 'aa-muted aa-small', 'Touche un élément à gauche, puis sa réponse à droite.');
    const g = h(box, 'div', 'aa-match');
    const colL = h(g, 'div', 'aa-match-col'); const colR = h(g, 'div', 'aa-match-col');
    const rights = shuffle(P.pairs.map((p, i) => i));
    let sel = null, errors = 0, left = P.pairs.length;
    const cell = (col, txt) => { const b = h(col, 'button', 'aa-match-c'); if (hasArabic(txt) && !/[a-zé]/i.test(txt)) arSpan(b, txt, 'aa-mid'); else addBidi(b, txt); return b; };
    const Ls = P.pairs.map(([a], i) => { const b = cell(colL, a); b.addEventListener('click', () => { if (b.disabled) return; Ls.forEach(x => x.classList.remove('aa-on')); b.classList.add('aa-on'); sel = i; }); return b; });
    rights.forEach(i => {
      const b = cell(colR, P.pairs[i][1]);
      b.addEventListener('click', () => {
        if (sel == null || b.disabled) return;
        if (sel === i) { b.disabled = true; Ls[i].disabled = true; b.classList.add('aa-good'); Ls[i].classList.add('aa-good'); Ls[i].classList.remove('aa-on'); sel = null; left--; if (!left) finish(errors === 0, P.why + (errors ? ' (' + errors + ' erreur' + (errors > 1 ? 's' : '') + ')' : '')); }
        else { errors++; b.classList.add('aa-bad'); setTimeout(() => b.classList.remove('aa-bad'), 600); }
      });
    });
  } else if (P.k === 'order') {
    mdText(box, 'div', 'aa-quiz-q', P.q);
    mdText(box, 'div', 'aa-muted aa-small', 'Touche les mots dans l\'ordre : le premier se place à droite.');
    const ans = h(box, 'div', 'aa-order-ans'); ans.setAttribute('dir', 'rtl');
    const pool = h(box, 'div', 'aa-order-pool'); pool.setAttribute('dir', 'rtl');
    let order = shuffle(P.words.map((w, i) => i)); if (order.every((x, i) => x === i) && order.length > 1) order = order.reverse();
    const picked = [];
    order.forEach(i => {
      const b = h(pool, 'button', 'aa-order-w'); arSpan(b, P.words[i], 'aa-mid');
      b.addEventListener('click', () => {
        if (b.disabled) return; b.disabled = true; b.classList.add('aa-order-used'); picked.push(i);
        const c = h(ans, 'span', 'aa-order-w aa-order-in'); arSpan(c, P.words[i], 'aa-mid');
        if (picked.length === P.words.length) {
          const good = picked.every((x, j) => P.words[x] === P.words[j]);
          ans.classList.add(good ? 'aa-good' : 'aa-bad');
          finish(good, (good ? '' : 'L\'ordre juste : **' + P.words.join(' ') + '**. ') + P.why);
        }
      });
    });
    btn(box, '↺ Recommencer', () => { if (picked.length === P.words.length) return; picked.length = 0; clear(ans); pool.querySelectorAll('button').forEach(b => { b.disabled = false; b.classList.remove('aa-order-used'); }); }, 'aa-btn-quiet aa-small');
  }
  box.appendChild(fb);
}
