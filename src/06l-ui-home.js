/* ====================================================================
 * 06l - Onglet Accueil : le tableau de bord du jour
 * série de jours, cartes du jour, écriture, leçon, ce que tu connais
 * du Coran, et les réglages de confort.
 * ==================================================================== */
const SHORT_SURAHS = [1, 112, 113, 114, 108, 103, 110, 97, 105, 106, 107, 109, 111, 99, 100, 101, 102, 104, 95, 94, 93, 92, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 96, 98];
function activityDays(ctx) { return ctx.settings.activity || {}; }
function streakOf(ctx) {
  const A = activityDays(ctx); let d = todayNum(); if (!A[d]) d--; let n = 0;
  while (A[d]) { n++; d--; }
  return n;
}
function frDate(d) { try { return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return d.toDateString(); } }

function renderHomeTab(ctx, root, state) {
  clear(root);
  const go = () => renderHomeTab(ctx, root, state);
  if (state.view === 'surahs') return renderSurahProgress(ctx, root, state, go);
  if (state.welcome || needsWelcome(ctx)) return renderWelcome(ctx, root, state, go);
  const S = srsStore(ctx); const W = writeState(ctx); const K = lemmaKnowledge(ctx);
  const head = h(root, 'div', 'aa-home-head');
  h(head, 'div', 'aa-muted aa-small aa-home-date', frDate(new Date()));
  h(head, 'h2', null, 'As-salāmu ʿalaykum');
  renderToday(ctx, root);
  renderHomeSearch(ctx, root, state);
  renderPath(ctx, root, state, go);
  // les trois chiffres
  const tiles = h(root, 'div', 'aa-home-tiles');
  const tile = (ic, big, lab, sub) => { const t = h(tiles, 'div', 'aa-home-tile'); h(t, 'div', 'aa-home-ic', ic); h(t, 'b', null, big); h(t, 'span', null, lab); if (sub) h(t, 'span', 'aa-muted aa-small', sub); return t; };
  const streak = streakOf(ctx); const A = activityDays(ctx); const today = A[todayNum()] || {};
  tile('🔥', String(streak), streak > 1 ? 'jours d\'affilée' : 'jour d\'affilée', today.c || today.w || today.l || today.r ? 'aujourd\'hui : fait ✓' : 'fais une révision pour continuer');
  const cov = quranCoverage(ctx, K);
  tile('📖', Math.round(100 * cov.known) + ' %', 'des mots du Coran acquis', Math.round(100 * cov.learning) ? '+ ' + Math.round(100 * cov.learning) + ' % en cours' : 'grâce aux cartes de mots');
  tile('✍️', writeAllLetters().filter(l => letterLearned(W, l)).length + ' / ' + writeAllLetters().length, 'lettres écrites seul');

  // les choses à faire aujourd'hui
  const todo = h(root, 'div', 'aa-home-todo');
  const card = (ic, title, line, label, fn, main) => {
    const c = h(todo, 'div', 'aa-home-card' + (main ? ' aa-home-main' : ''));
    const t = h(c, 'div', 'aa-home-card-top'); h(t, 'span', 'aa-home-card-ic', ic); h(t, 'b', null, title);
    if (line) mdText(c, 'div', 'aa-muted aa-small', line);
    if (label) btn(h(c, 'div', 'aa-home-card-act'), label, fn, main ? 'mod-cta' : '');
    return c;
  };
  {
    /* reprendre la lecture du Coran là où on s'était arrêté */
    const ls = ctx.settings.lastSurah || 1; const lv = ctx.settings.lastVerse || 0; const inf = ctx.data.surahInfo(ls);
    const BM = ctx.settings.bookmarks || [];
    const c = card('📖', lv ? 'Reprendre ma lecture' : 'Lire le Coran', lv ? '**' + inf[1] + '** (' + inf[2] + ') · verset ' + ls + ':' + lv + ' sur ' + inf[5] : 'Commence par **' + inf[1] + '**, mot par mot.', lv ? '▶ Continuer' : 'Ouvrir', () => ctx.openQuran(ls, lv));
    if (BM.length) {
      const bl = h(c, 'div', 'aa-home-bms');
      h(bl, 'span', 'aa-muted aa-small', '★ ');
      BM.slice(0, 3).forEach(b => { const a = h(bl, 'a', 'aa-link aa-small', b.s + ':' + b.v); a.title = ctx.data.surahInfo(b.s)[1]; a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(b.s, b.v); }); bl.appendChild(document.createTextNode(' ')); });
    }
  }
  // mon Coran
  const qc = h(root, 'div', 'aa-home-block');
  const qt = h(qc, 'div', 'aa-home-block-top'); h(qt, 'h3', null, '📖 Ce que tu comprends du Coran');
  const lk = h(qt, 'a', 'aa-link aa-small', 'Toutes les sourates →'); lk.addEventListener('click', ev => { ev.preventDefault(); state.view = 'surahs'; go(); });
  progressBar2(qc, cov.known, cov.learning, 'aa-kbar-big');
  mdText(qc, 'p', 'aa-muted aa-small', 'Sur tous les mots du Coran, tu en reconnais **' + Math.round(100 * cov.known) + ' %** (vert foncé) et tu en apprends ' + Math.round(100 * cov.learning) + ' % (vert clair). Un mot compte comme acquis quand sa carte revient dans 7 jours ou plus.');
  const list = h(qc, 'div', 'aa-home-surahs');
  (async () => {
    const rows = [];
    for (const n of SHORT_SURAHS) rows.push(await surahKnowledge(ctx, n, K));
    const best = [rows[0]].concat(rows.slice(1).sort((a, b) => b.pctAll - a.pctAll || a.total - b.total).slice(0, 5));
    best.forEach(k => surahRow(ctx, list, k));
  })().catch(() => {});

  // activité des 12 dernières semaines
  const ac = h(root, 'div', 'aa-home-block');
  h(ac, 'h3', null, '🗓️ Tes 12 dernières semaines');
  const grid = h(ac, 'div', 'aa-home-cal'); const t0 = todayNum();
  const start = t0 - 77 - ((new Date().getDay() + 6) % 7); // 12 semaines, en commençant un lundi
  for (let d = start; d <= t0; d++) { const e = A[d]; const n = e ? (e.c || 0) + 2 * (e.w || 0) + 5 * ((e.l || 0) + (e.r || 0)) : 0; const c = h(grid, 'span', 'aa-home-day' + (n ? ' aa-home-day-' + (n >= 40 ? 3 : n >= 15 ? 2 : 1) : '') + (d === t0 ? ' aa-home-today' : '')); c.title = n ? n + ' activités' : 'rien ce jour-là'; }
  h(ac, 'div', 'aa-muted aa-small', 'Chaque case = un jour (cartes, écriture, leçons). Un peu chaque jour vaut mieux que beaucoup une fois par semaine.');

  const set = h(root, 'div', 'aa-home-settings');
  btn(set, '⚙ Réglages : taille du texte, police, récitateur, son hors ligne', () => ctx.openTab('settings'), 'aa-btn-quiet');
  if (ctx.startTour) btn(set, '🧭 Revoir la visite guidée', () => ctx.startTour(), 'aa-btn-quiet');
}

function surahRow(ctx, parent, k) {
  const info = ctx.data.surahInfo(k.n);
  const r = h(parent, 'div', 'aa-home-srow');
  const nm = h(r, 'div', 'aa-home-sname'); h(nm, 'b', null, k.n + '. ' + info[1]); h(nm, 'span', 'aa-muted aa-small', ' ' + info[2]);
  const b = h(r, 'div', 'aa-home-sbar'); progressBar2(b, k.known / Math.max(1, k.total), k.learning / Math.max(1, k.total));
  h(r, 'span', 'aa-home-spct', k.pctAll + ' %');
  r.title = k.total + ' mots · ' + k.known + ' acquis · ' + k.learning + ' en cours';
  r.addEventListener('click', () => ctx.openQuran(k.n, 0));
  return r;
}

function renderSurahProgress(ctx, root, state, go) {
  btn(h(root, 'div', 'aa-actions'), '← Accueil', () => { state.view = null; go(); }, 'aa-btn-quiet');
  h(root, 'h2', null, '📖 Ma progression, sourate par sourate');
  mdText(root, 'p', 'aa-muted', 'Pour chaque sourate : la part de ses mots que tu connais (vert foncé = acquis, vert clair = en cours). Touche une sourate pour la lire ; dans l\'onglet Coran, « Apprendre les mots de cette sourate » te donne ses mots en cartes.');
  const bar = h(root, 'div', 'aa-actions');
  const sort = state.sort || 'mushaf';
  selectEl(bar, [['mushaf', 'ordre du Coran'], ['best', 'les mieux comprises d\'abord'], ['short', 'les plus courtes d\'abord']], sort, v => { state.sort = v; go(); });
  const wait = h(root, 'p', 'aa-muted', 'Calcul…');
  const list = h(root, 'div', 'aa-home-surahs aa-home-surahs-all');
  const K = lemmaKnowledge(ctx);
  (async () => {
    const rows = [];
    for (let n = 1; n <= 114; n++) { rows.push(await surahKnowledge(ctx, n, K)); if (n % 10 === 0) wait.textContent = 'Calcul… ' + n + ' / 114'; }
    wait.remove();
    if (sort === 'best') rows.sort((a, b) => b.pctAll - a.pctAll || a.total - b.total);
    else if (sort === 'short') rows.sort((a, b) => a.total - b.total);
    rows.forEach(k => surahRow(ctx, list, k));
  })().catch(e => { wait.textContent = 'Erreur : ' + e.message; });
}

/* réglages de confort (aussi dans les réglages du plugin) */
function renderComfort(ctx, box, go) {
  const S = ctx.settings;
  const r1 = h(field(box, 'Taille de l\'arabe'), 'div', 'aa-home-sizer');
  const m = btn(r1, '−', () => { S.arSize = Math.max(20, (S.arSize || 30) - 2); ctx.save(); ctx.refresh && ctx.refresh(); lab.textContent = S.arSize + ' px'; }, 'aa-btn-quiet');
  const lab = h(r1, 'span', 'aa-home-size', (S.arSize || 30) + ' px');
  btn(r1, '+', () => { S.arSize = Math.min(52, (S.arSize || 30) + 2); ctx.save(); ctx.refresh && ctx.refresh(); lab.textContent = S.arSize + ' px'; }, 'aa-btn-quiet');
  void m;
  const r2 = field(box, 'Taille de l\'interface');
  selectEl(r2, [['normal', 'normale'], ['grand', 'grande'], ['tres-grand', 'très grande (téléphone)']], S.uiSize || 'normal', v => { S.uiSize = v; ctx.save(); ctx.refresh && ctx.refresh(); });
  const r3 = field(box, 'Récitateur');
  selectEl(r3, RECITERS, S.reciter || 'Alafasy_128kbps', v => { S.reciter = v; AUDIO.reciter = v; ctx.save(); });
  const r4 = field(box, 'Vitesse du son');
  selectEl(r4, [['0.5', '0,5× (très lent)'], ['0.6', '0,6×'], ['0.75', '0,75× (lent)'], ['0.85', '0,85×'], ['1', '1× (normal)']], String(S.audioRate || 1), v => { S.audioRate = +v; setAudioRate(+v); ctx.save(); });
  const r5 = field(box, 'Couleurs des mots');
  checkbox(r5, 'nom bleu, verbe rouge', S.wordColors !== false, v => { S.wordColors = v; ctx.save(); ctx.refresh && ctx.refresh(); });
  renderOfflineAudio(ctx, box);
}
function renderOfflineAudio(ctx, box) {
  if (ctx.keepSurahAudio) {
    h(box, 'h4', null, '🎧 Son hors ligne');
    mdText(box, 'p', 'aa-muted aa-small', 'Sans internet, le plugin marche déjà entièrement (Coran, traduction, dictionnaire, règles, cartes, écriture). Seul le **son** vient d\'internet. Tu peux garder sur l\'appareil le son d\'une sourate (bouton dans l\'onglet Coran), ou d\'un coup celui des **sourates courtes** (78 à 114, environ 50 Mo par récitateur, avec la prononciation de chaque mot).');
    const st = h(box, 'div', 'aa-muted aa-small');
    const paint = () => { const k = ctx.audioSummary(); st.textContent = k.surahs ? 'Gardé sur cet appareil : ' + k.surahs + ' sourate' + (k.surahs > 1 ? 's' : '') + ' (' + k.files + ' fichiers).' : 'Rien n\'est gardé pour l\'instant.'; };
    paint();
    const act = h(box, 'div', 'aa-actions');
    const b = btn(act, '⬇ Garder le son des sourates courtes', async () => {
      b.disabled = true; let fail = 0;
      const list = []; for (let n = 78; n <= 114; n++) list.push(n); list.unshift(1);
      for (let i = 0; i < list.length; i++) {
        const r = await ctx.keepSurahAudio(list[i], true, (d, n) => { b.textContent = 'Sourate ' + list[i] + ' (' + (i + 1) + ' / ' + list.length + ') : ' + d + ' / ' + n; });
        fail += r.failed; if (r.offline) { notify('Pas de connexion internet : téléchargement arrêté.'); break; }
      }
      b.disabled = false; b.textContent = '⬇ Garder le son des sourates courtes'; paint();
      notify('Son gardé sur l\'appareil.' + (fail ? ' (' + fail + ' fichiers introuvables)' : ''));
    }, 'mod-cta');
    btn(act, '🗑 Effacer le son gardé', async () => { await ctx.dropAudio(); paint(); notify('Son effacé de l\'appareil.'); }, 'aa-btn-quiet');
  }
}

/* Recherche unique de l'Accueil : un mot, une règle, une leçon ou une sourate, au même endroit */
function homeSearch(ctx, q) {
  const data = ctx.data; const out = { surahs: [], rules: [], lessons: [], words: [] };
  q = (q || '').trim(); if (!q) return out;
  const ql = stripLat(q); const isAr = hasArabic(q); const qa = stripAr(q).replace(/\s+/g, '');
  const num = /^\d{1,3}$/.test(q) ? +q : 0;
  for (let n = 1; n <= 114; n++) {
    const s = data.surahInfo(n); let sc = 0;
    if (num === n) sc = 100;
    else if (!isAr && ql.length >= 2) { const a = stripLat(s[1]).replace(/^(al|an|ar|as|at|ad|adh|az|ash|ath|ay)\s*/, ''); if (stripLat(s[1]).startsWith(ql) || a.startsWith(ql)) sc = 80; else if (stripLat(s[1]).includes(ql) || (ql.length >= 3 && stripLat(s[2]).includes(ql))) sc = 50; }
    else if (isAr && qa.length >= 2 && stripAr(s[3]).replace(/\s+/g, '').includes(qa)) sc = 60;
    if (sc) out.surahs.push([n, sc]);
  }
  out.surahs = out.surahs.sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  if (!isAr && ql.length >= 3) {
    out.rules = RULES.filter(r => stripLat(r.title).includes(ql) || (r.terms || []).some(t => stripLat(t).includes(ql)) || stripLat(r.one).includes(ql)).slice(0, 4);
    out.lessons = LESSONS.filter(l => stripLat(l.title).includes(ql)).slice(0, 3);
  } else if (isAr) {
    out.rules = RULES.filter(r => r.ar && stripAr(r.ar).replace(/\s+/g, '').includes(qa)).slice(0, 3);
  }
  if (!num) out.words = dictSearch(data, q).slice(0, 6);
  return out;
}
function renderHomeSearch(ctx, root, state) {
  const box = h(root, 'div', 'aa-home-search');
  const inp = h(box, 'input', 'aa-input-line aa-hs-in'); inp.type = 'search';
  inp.placeholder = '🔎 Chercher : un mot (كتاب, livre), une règle (génitif), une sourate (Yasin, 36)…';
  inp.value = state.hq || '';
  const res = h(box, 'div', 'aa-hs-res');
  const row = (parent, ic, title, sub, go, ar) => { const r = h(parent, 'div', 'aa-hs-row'); h(r, 'span', 'aa-hs-ic', ic); const t = h(r, 'div', 'aa-hs-t'); const b = h(t, 'b', null, title); if (ar) { b.appendChild(document.createTextNode(' ')); arSpan(b, ar); } if (sub) h(t, 'div', 'aa-muted aa-small', sub); r.addEventListener('click', go); return r; };
  const run = () => {
    state.hq = inp.value; clear(res);
    const q = inp.value.trim(); if (!q) return;
    const R = homeSearch(ctx, q); const data = ctx.data;
    const grp = (lab) => h(res, 'div', 'aa-hs-grp', lab);
    if (R.surahs.length) { grp('Sourates'); R.surahs.forEach(n => { const s = data.surahInfo(n); row(res, '📖', n + '. ' + s[1], s[2] + ' · ' + s[5] + ' versets', () => ctx.openTab('coran', { surah: n, page: 0, focus: 0, resume: 0 })); }); }
    if (R.rules.length) { grp('Règles'); R.rules.forEach(r => row(res, '📏', r.title, r.one.replace(/\*\*/g, ''), () => ctx.openTab('rules', { open: r.id, q: '' }), r.ar)); }
    if (R.lessons.length) { grp('Leçons'); R.lessons.forEach(l => row(res, '🎓', l.title, '≈ ' + l.min + ' min', () => ctx.openTab('lessons', { open: l.id, step: 0, stepFor: l.id }), l.ar)); }
    if (R.words.length) { grp('Mots du Coran'); R.words.forEach(i => { const l = data.lemmas[i]; row(res, '📚', '', l[4] + ' · ' + l[5] + '× dans le Coran', () => ctx.openTab('dict', { mode: 'search', q, entry: i }), l[0]); }); }
    if (!res.firstChild) h(res, 'div', 'aa-muted aa-small', 'Rien trouvé. Essaie en arabe, en français ou en translittération (kitab).');
  };
  let timer = null;
  inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });
  if (inp.value) run();
}
