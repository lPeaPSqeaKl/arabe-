/* ====================================================================
 * 06d - Onglet Leçons : parcours de grammaire guidé
 * ==================================================================== */
function lessonState(ctx) { return ctx.settings.lessons || (ctx.settings.lessons = {}); }

function renderLessonsTab(ctx, root, state) {
  clear(root);
  if (state.open) { const L = LESSONS.find(l => l.id === state.open); if (L) return renderLesson(ctx, root, state, L); state.open = null; }
  const done = lessonState(ctx);
  const nDone = LESSONS.filter(l => done[l.id] && done[l.id].done).length;
  mdText(root, 'p', 'aa-help', 'Un **parcours de grammaire** en ' + LESSONS.length + ' leçons, toujours à partir de **vrais versets**. Chaque leçon se termine par des questions : à **70 %** de bonnes réponses, elle est validée ✓. Va dans l\'ordre : chaque leçon s\'appuie sur les précédentes.');
  const bar = h(root, 'div', 'aa-lesson-progress');
  const fill = h(bar, 'div', 'aa-lesson-fill'); fill.style.width = Math.round(100 * nDone / LESSONS.length) + '%';
  h(root, 'p', 'aa-muted aa-small', nDone + ' / ' + LESSONS.length + ' leçons validées');
  const next = LESSONS.find(l => !(done[l.id] && done[l.id].done));
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

async function renderLesson(ctx, root, state, L) {
  const k = LESSONS.indexOf(L);
  const nav = h(root, 'div', 'aa-actions');
  btn(nav, '← Toutes les leçons', () => { state.open = null; renderLessonsTab(ctx, root, state); }, 'aa-btn-quiet');
  const head = h(root, 'div', 'aa-lesson-head');
  h(head, 'div', 'aa-muted', 'Leçon ' + (k + 1) + ' sur ' + LESSONS.length + ' · ≈ ' + L.min + ' min');
  h(head, 'h2', null, L.title);
  arSpan(head, L.ar, 'aa-lesson-ar');
  const ess = (LESSON_RULES[L.id] || []).map(ruleById).filter(Boolean);
  if (ess.length) {
    const box = h(root, 'div', 'aa-lesson-simple');
    h(box, 'b', null, '🟢 L\'essentiel, en simple');
    const ul0 = h(box, 'ul');
    ess.forEach(r => { const li = h(ul0, 'li'); const a = h(li, 'a', 'aa-link aa-rule-link', r.title); mdText(li, 'span', null, ' : ' + r.one); a.addEventListener('click', e => { e.preventDefault(); const nx = li.nextSibling; if (nx && nx.classList && nx.classList.contains('aa-rule-inline')) { nx.remove(); return; } const hold = document.createElement('li'); hold.className = 'aa-rule-li'; li.parentNode.insertBefore(hold, li.nextSibling); const c = renderRuleCard(ctx, hold, r, { inline: true }); hold.classList.add('aa-rule-inline'); c.classList.remove('aa-rule-inline'); c.querySelector('.aa-actions button:last-child').onclick = () => hold.remove(); }); });
    h(box, 'div', 'aa-muted aa-small', 'Clique sur un nom de règle pour l\'explication complète. Dans la suite de la leçon, les mots soulignés en pointillé ouvrent aussi leur règle.');
  }
  const goal = h(root, 'div', 'aa-lesson-goal');
  h(goal, 'b', null, 'Objectifs');
  const ul = h(goal, 'ul'); L.goal.forEach(g => mdText(ul, 'li', null, g));
  if (L.rules && L.rules.length) {
    const r = h(goal, 'div', 'aa-small'); h(r, 'span', 'aa-muted', 'Fiches de ton coffre : ');
    L.rules.forEach((n, i) => { const a = h(r, 'a', 'aa-link', n); a.addEventListener('click', e => { e.preventDefault(); ctx.openPath('2 - Règles/' + n + '.md'); }); if (i < L.rules.length - 1) r.appendChild(document.createTextNode(' · ')); });
  }
  for (let si = 0; si < L.sections.length; si++) {
    const S = L.sections[si];
    const sec = h(root, 'div', 'aa-lesson-sec');
    h(sec, 'h3', null, (si + 1) + '. ' + S.t);
    if (S.md) S.md.split(/\n\n+/).forEach(par => {
      if (/^```/.test(par)) { const pre = h(sec, 'pre', 'aa-small'); pre.textContent = par.replace(/^```\w*\n?|```$/g, ''); return; }
      if (/^(- |\d\. )/m.test(par) && par.split('\n').every(l => /^(- |\d\. )/.test(l))) { const list = h(sec, /^\d/.test(par) ? 'ol' : 'ul'); par.split('\n').forEach(l => mdText(list, 'li', null, l.replace(/^(- |\d\. )/, ''))); return; }
      const lines = par.split('\n');
      const p = h(sec, 'div', 'aa-lesson-p');
      lines.forEach(l => { if (/^- /.test(l)) mdText(p, 'div', 'aa-lesson-li', '• ' + l.slice(2)); else if (/^\d\. /.test(l)) mdText(p, 'div', 'aa-lesson-li', l); else mdText(p, 'div', null, l); });
    });
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
  }
  const keep = h(root, 'div', 'aa-lesson-keep');
  h(keep, 'b', null, '📌 À retenir');
  const kl = h(keep, 'ul'); L.keep.forEach(x => mdText(kl, 'li', null, x));
  const kb = h(keep, 'div', 'aa-actions');
  btn(kb, 'Insérer le résumé dans la note', () => ctx.insertText('> [!abstract] ' + L.title + ' (' + L.ar + ')\n' + L.keep.map(x => '> - ' + x).join('\n') + '\n\n'), 'aa-btn-quiet');
  btn(kb, 'Créer des flashcards', () => { L.keep.forEach((x, i) => ctx.addFlashcard(L.title + ' — point ' + (i + 1), x.replace(/\*\*/g, ''))); }, 'aa-btn-quiet');

  linkTerms(ctx, root);
  h(root, 'h3', null, '✍️ Vérifie que tu as compris');
  const qbox = h(root, 'div', 'aa-quiz aa-lesson-quiz');
  if (!state.run || state.run.id !== L.id) state.run = { id: L.id, i: 0, ok: 0 };
  renderLessonQuestion(ctx, qbox, state, L, root);
}

async function renderLessonQuestion(ctx, box, state, L, root) {
  clear(box);
  const run = state.run; const n = L.practice.length;
  if (run.i >= n) {
    const pct = Math.round(100 * run.ok / n);
    const all = lessonState(ctx); const prev = all[L.id] || { done: false, best: 0 };
    const passed = pct >= 70;
    all[L.id] = { done: prev.done || passed, best: Math.max(prev.best, pct), date: new Date().toISOString().slice(0, 10) };
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
  }
  box.appendChild(fb);
}
