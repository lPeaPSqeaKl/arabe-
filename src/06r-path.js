/* ====================================================================
 * 06r - Le parcours en 5 niveaux, l'action « Aujourd'hui » de l'Accueil
 * et le premier écran « Commence ici ».
 * Chaque niveau a quelques étapes mesurées (leçons validées, quiz, par cœur…).
 * settings.path = { start } : le niveau choisi au premier lancement
 * (les niveaux d'avant comptent comme faits).
 * ==================================================================== */
const PATH_SHORT = [1, 112, 113, 114];
function courseDone(C, ids) { return ids.filter(id => C[id] && C[id].done).length; }
function courseNextOf(C, ids) { return ids.find(id => !(C[id] && C[id].done)); }
function readStore(ctx) { return COURSES.read.store(ctx); }
function surahHifzDone(ctx, s) {
  const H = ctx.settings.hifz || {}; const n = ctx.data.surahInfo(s)[5];
  for (let v = 1; v <= n; v++) if (!H[s + ':' + v]) return false;
  return true;
}
const PATH_LEVELS = [
  {
    ic: '🔤', title: 'Les lettres', goal: 'Reconnaître les 28 lettres, leur son et leurs formes.',
    items: [
      { t: 'Le quiz des lettres : 30 bonnes réponses', of: () => 30, n: ctx => Math.min(30, ctx.settings.alphaOk || 0), go: ctx => ctx.openTab('alphabet', { mode: 'quiz', qk: 'name', q: null }) },
      { t: 'Cours d\'écriture : leçons 1 à 4 (la ligne, les points, les attaches, les 4 formes)', of: () => 4, n: ctx => courseDone(wcState(ctx), ['c1', 'c2', 'c3', 'c4']), go: ctx => ctx.openTab('write', { course: courseNextOf(wcState(ctx), ['c1', 'c2', 'c3', 'c4']) || 'c1', cstep: 0, letter: null, unit: null, word: null, free: false, copy: false }) },
    ],
  },
  {
    ic: '📖', title: 'Lire', goal: 'Lire n\'importe quel mot du Coran avec ses voyelles et ses signes.',
    items: [
      { t: 'Cours de lecture : leçons 1 à 10', of: () => 10, n: ctx => courseDone(readStore(ctx), READ_COURSE.slice(0, 10).map(L => L.id)), go: ctx => ctx.openTab('read', { course: courseNextOf(readStore(ctx), READ_COURSE.slice(0, 10).map(L => L.id)) || 'r1', cstep: 0 }) },
    ],
  },
  {
    ic: '🌙', title: 'Les petites sourates', goal: 'Lire seul la Fātiḥa et les dernières sourates, et les retenir.',
    items: [
      { t: 'Cours de lecture : leçons 11 et 12 (la Fātiḥa, les petites sourates)', of: () => 2, n: ctx => courseDone(readStore(ctx), ['r11', 'r12']), go: ctx => ctx.openTab('read', { course: courseNextOf(readStore(ctx), ['r11', 'r12']) || 'r11', cstep: 0 }) },
      { t: 'Par cœur : la Fātiḥa et les sourates 112, 113, 114', of: () => 4, n: ctx => PATH_SHORT.filter(s => surahHifzDone(ctx, s)).length, go: ctx => { const s = PATH_SHORT.find(x => !surahHifzDone(ctx, x)) || 1; ctx.openTab('coran', { surah: s, page: 0, hifz: { s, v: 0, level: 0 } }); } },
    ],
  },
  {
    ic: '🎓', title: 'La grammaire', goal: 'Comprendre comment une phrase du Coran est construite.',
    items: [
      { t: 'Les 14 leçons de grammaire', of: () => LESSONS.length, n: ctx => { const LS = ctx.settings.lessons || {}; return LESSONS.filter(l => LS[l.id] && LS[l.id].done).length; }, go: ctx => { const LS = ctx.settings.lessons || {}; const l = LESSONS.find(x => !(LS[x.id] && LS[x.id].done)) || LESSONS[0]; ctx.openLesson(l.id); } },
    ],
  },
  {
    ic: '🕊', title: 'Lire seul', goal: 'Lire et comprendre seul, avec le dictionnaire en appui.',
    items: [
      { t: 'Les mots du Coran : 50 % acquis (cartes de mots)', of: () => 50, n: ctx => Math.min(50, Math.round(100 * quranCoverage(ctx).known)), go: ctx => ctx.openTab('review', { session: null, deck: null }) },
      { t: 'Par cœur : 100 versets', of: () => 100, n: ctx => Math.min(100, Object.keys(ctx.settings.hifz || {}).length), go: ctx => { const s = ctx.settings.lastSurah || 1; ctx.openTab('coran', { surah: s, page: 0, hifz: { s, v: 1, level: 0 } }); } },
    ],
  },
];
function pathStart(ctx) { const P = ctx.settings.path; return P && P.start ? P.start : 1; }
/* l'état de chaque niveau : fraction faite, terminé ou non */
function pathState(ctx) {
  const st = pathStart(ctx);
  const lv = PATH_LEVELS.map((L, i) => {
    if (i + 1 < st) return { L, i, frac: 1, done: true, skipped: true, items: [] };
    const items = L.items.map(it => { let n = 0, of = 1; try { n = it.n(ctx); of = it.of(ctx); } catch (e) { /* données pas prêtes */ } return { it, n, of, done: n >= of }; });
    const frac = items.reduce((a, x) => a + Math.min(1, x.n / x.of), 0) / items.length;
    return { L, i, frac, done: items.every(x => x.done), items };
  });
  const cur = lv.find(x => !x.done) || lv[lv.length - 1];
  return { lv, cur };
}

/* --- « Aujourd'hui » : une seule grande action, la suivante en dessous --- */
function renderToday(ctx, root) {
  const P = pathState(ctx); const cur = P.cur;
  const nextItem = cur.items.find(x => !x.done);
  const box = h(root, 'div', 'aa-today');
  const top = h(box, 'div', 'aa-today-top');
  h(top, 'span', 'aa-today-ic', '☀️'); h(top, 'b', null, 'Aujourd\'hui');
  h(top, 'span', 'aa-muted aa-small aa-today-lv', 'Niveau ' + (cur.i + 1) + ' · ' + cur.L.title);
  const steps = h(box, 'ol', 'aa-today-steps');
  const act = h(box, 'div', 'aa-today-act');
  const A = activityDays(ctx)[todayNum()] || {};
  const learnedToday = !!(A.l || A.r || A.w);
  const S = srsStore(ctx);
  const lessonLabel = nextItem ? nextItem.it.t : 'Tout le parcours est fait. Lis le Coran librement.';
  loadCardDecks(ctx).then(decks => {
    const n = todayCounts(S, decks);
    const revLeft = n.due + n.fresh; const mins = Math.max(2, Math.round(revLeft * 0.25));
    const s1 = h(steps, 'li', revLeft ? '' : 'aa-today-done');
    mdText(s1, 'span', null, revLeft ? '**Réviser ' + revLeft + ' carte' + (revLeft > 1 ? 's' : '') + '** (≈ ' + mins + ' min)' : 'Révision faite ✓');
    const s2 = h(steps, 'li', learnedToday ? 'aa-today-done' : '');
    mdText(s2, 'span', null, (learnedToday ? '✓ ' : '') + '**Avancer** : ' + lessonLabel);
    const nMj = murajaCountToday(ctx);
    if (nMj) { const s3 = h(steps, 'li'); mdText(s3, 'span', null, '**Réciter** ' + nMj + ' sourate' + (nMj > 1 ? 's' : '') + ' apprise' + (nMj > 1 ? 's' : '') + ' par cœur (révision)'); const a = h(s3, 'a', 'aa-link aa-small', ' → ouvrir'); a.addEventListener('click', ev => { ev.preventDefault(); const s = ctx.settings.lastSurah || 1; ctx.openTab('coran', { surah: s, hifz: { s, v: 1, level: 0 }, muraja: true }); }); }
    const pt = planToday(ctx);
    if (pt && !pt.finished) { const s4 = h(steps, 'li', pt.done ? 'aa-today-done' : ''); mdText(s4, 'span', null, pt.done ? '✓ Ta part du Coran est lue' : '**Lire ta part du Coran** : ' + planLabel(ctx, pt)); if (!pt.done) { const a = h(s4, 'a', 'aa-link aa-small', ' → lire'); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(...pt.from); }); } }
    const goLesson = () => nextItem ? nextItem.it.go(ctx) : ctx.openQuran(ctx.settings.lastSurah || 1, ctx.settings.lastVerse || 0);
    const goReview = () => ctx.openTab('review', { startNow: true, session: null, deck: null });
    if (revLeft) {
      btn(act, '▶  Réviser maintenant', goReview, 'mod-cta aa-fc-big');
      btn(act, 'Puis : avancer →', goLesson, 'aa-btn-quiet');
    } else btn(act, '▶  ' + (nextItem ? 'Avancer dans le niveau ' + (cur.i + 1) : 'Lire le Coran'), goLesson, 'mod-cta aa-fc-big');
  }).catch(() => { btn(act, '▶  Avancer', () => nextItem && nextItem.it.go(ctx), 'mod-cta aa-fc-big'); });
}

/* --- le parcours : 5 niveaux, on peut en ouvrir un pour voir ses étapes --- */
function renderPath(ctx, root, state, go) {
  const P = pathState(ctx);
  const sec = h(root, 'div', 'aa-home-block aa-path');
  const top = h(sec, 'div', 'aa-home-block-top'); h(top, 'h3', null, '🧭 Ton parcours');
  const ch = h(top, 'a', 'aa-link aa-small', 'Changer de point de départ'); ch.addEventListener('click', ev => { ev.preventDefault(); state.welcome = true; go(); });
  const row = h(sec, 'div', 'aa-path-row');
  const open = state.pathOpen != null ? state.pathOpen : P.cur.i;
  P.lv.forEach(x => {
    const c = h(row, 'button', 'aa-path-lv' + (x.done ? ' aa-path-done' : '') + (x === P.cur ? ' aa-path-cur' : '') + (x.i === open ? ' aa-on' : ''));
    const ring = h(c, 'span', 'aa-path-ring'); ring.style.setProperty('--p', Math.round(100 * x.frac)); h(ring, 'span', null, x.done ? '✓' : x.L.ic);
    h(c, 'span', 'aa-path-n', 'Niveau ' + (x.i + 1));
    h(c, 'span', 'aa-path-t', x.L.title);
    c.addEventListener('click', () => { state.pathOpen = x.i; go(); });
  });
  const x = P.lv[open];
  const det = h(sec, 'div', 'aa-path-det');
  mdText(det, 'p', null, '**' + x.L.ic + ' ' + x.L.title + '** : ' + x.L.goal + (x.skipped ? ' (passé : tu as choisi de commencer plus loin)' : ''));
  const items = x.skipped ? x.L.items.map(it => ({ it, n: 0, of: 1, done: false })) : x.items;
  items.forEach(y => {
    const r = h(det, 'div', 'aa-path-item' + (y.done ? ' aa-path-item-done' : ''));
    h(r, 'span', 'aa-path-check', y.done ? '✓' : '○');
    const t = h(r, 'div', 'aa-path-it'); h(t, 'div', null, y.it.t);
    if (!x.skipped) { const b = h(t, 'div', 'aa-lesson-progress aa-path-bar'); const f = h(b, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * Math.min(1, y.n / y.of)) + '%'; h(t, 'div', 'aa-muted aa-small', y.n + ' / ' + y.of); }
    btn(r, y.done ? 'Revoir' : 'Ouvrir', () => y.it.go(ctx), y.done ? 'aa-btn-quiet' : '');
  });
}

/* --- premier lancement : « Commence ici » --- */
function needsWelcome(ctx) {
  if (ctx.settings.path) return false;
  const A = ctx.settings.activity || {};
  return !Object.keys(A).length; // déjà utilisé : on ne dérange pas
}
function renderWelcome(ctx, root, state, go) {
  const box = h(root, 'div', 'aa-welcome');
  h(box, 'div', 'aa-welcome-ic', '👋');
  h(box, 'h2', null, ctx.settings.path ? 'Changer de point de départ' : 'Bienvenue ! Commence ici');
  mdText(box, 'p', 'aa-muted', 'L\'Atelier te guide **pas à pas**, en 5 niveaux : les lettres, lire, les petites sourates, la grammaire, puis lire seul. Dis-moi où tu en es : tu commences au bon endroit (tu pourras changer plus tard).');
  const CH = [
    [1, '🔤', 'Je ne connais pas encore les lettres', 'On commence par l\'alphabet et l\'écriture.'],
    [2, '📖', 'Je connais les lettres, mais je lis mal', 'Le cours de lecture : voyelles, signes, vrais mots du Coran.'],
    [4, '🎓', 'Je sais lire, je veux comprendre', 'La grammaire du Coran, pas à pas.'],
    [5, '🕊', 'Je lis et je comprends l\'arabe', 'Le Coran mot par mot, le par cœur, le dictionnaire et l\'analyse.'],
  ];
  const g = h(box, 'div', 'aa-welcome-choices');
  CH.forEach(([lv, ic, t, sub]) => {
    const c = h(g, 'button', 'aa-welcome-ch' + (pathStart(ctx) === lv && ctx.settings.path ? ' aa-on' : ''));
    h(c, 'span', 'aa-welcome-chic', ic);
    const tx = h(c, 'span', 'aa-welcome-chtx'); h(tx, 'b', null, t); h(tx, 'span', 'aa-muted aa-small', sub);
    c.addEventListener('click', () => {
      const first = !ctx.settings.path;
      ctx.settings.path = { start: lv }; ctx.save(); state.welcome = false; state.pathOpen = null; go();
      if (first && !ctx.settings.tourDone && ctx.startTour) setTimeout(() => ctx.startTour(), 300);
    });
  });
  const foot = h(box, 'div', 'aa-actions');
  if (ctx.settings.path) btn(foot, '← Retour', () => { state.welcome = false; go(); }, 'aa-btn-quiet');
  else btn(foot, 'Passer', () => { ctx.settings.path = { start: 1 }; ctx.save(); go(); }, 'aa-btn-quiet');
}
