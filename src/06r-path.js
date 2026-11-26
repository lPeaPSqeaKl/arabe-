/* ====================================================================
 * 06r - Le parcours : 3 programmes selon ton niveau (je débute, je sais
 * lire, je parle arabe), 10 étapes chacun, chaque étape avec des tâches
 * vraiment mesurées dans tout l'Atelier (alphabet, écriture, lecture,
 * cartes, exercices, leçons, Coran mot à mot, analyse, par cœur…).
 * Aussi l'action « Aujourd'hui » de l'Accueil et l'écran « Commence ici ».
 * settings.path = { prog, from, start } : programme, étape de départ
 * (les étapes d'avant comptent comme faites), et l'ancien niveau
 * (start) qui sert encore à débloquer les cartes.
 * ==================================================================== */
const PATH_SHORT = [1, 112, 113, 114];
const JUZ_AMMA = []; for (let s = 78; s <= 114; s++) JUZ_AMMA.push(s);
function courseDone(C, ids) { return ids.filter(id => C[id] && C[id].done).length; }
function courseNextOf(C, ids) { return ids.find(id => !(C[id] && C[id].done)); }
function readStore(ctx) { return COURSES.read.store(ctx); }
function surahHifzDone(ctx, s) {
  const H = ctx.settings.hifz || {}; const n = ctx.data.surahInfo(s)[5];
  for (let v = 1; v <= n; v++) if (!H[s + ':' + v]) return false;
  return true;
}
/* --- les mesures --- */
const PM = {
  lessons: (ctx, ids) => { const LS = ctx.settings.lessons || {}; return ids.filter(id => LS[id] && LS[id].done).length; },
  read: (ctx, ids) => courseDone(readStore(ctx), ids),
  write: (ctx, ids) => courseDone(wcState(ctx), ids),
  alpha: (ctx, k) => (ctx.settings.alphaQ || {})[k] || (k === 'name' ? Math.min(ctx.settings.alphaOk || 0, 30) : 0),
  letters: (ctx, units) => { const W = writeState(ctx); let n = 0; WRITE_UNITS.forEach(u => { if (!units || units.includes(u.id)) u.letters.forEach(l => { if (letterLearned(W, l)) n++; }); }); return n; },
  lettersOf: units => WRITE_UNITS.filter(u => !units || units.includes(u.id)).reduce((a, u) => a + u.letters.length, 0),
  words: ctx => { const W = writeState(ctx); return Object.keys(W.w).filter(k => W.w[k] >= 60).length; },
  copied: ctx => writeState(ctx).copied || 0,
  cards: (ctx, pre) => { const C = srsStore(ctx).cards; let n = 0; for (const k in C) if (k.startsWith(pre) && C[k] && C[k][3] >= 1) n++; return n; },
  vocab: ctx => PM.cards(ctx, 'voc|'),
  cover: ctx => { try { return Math.round(100 * quranCoverage(ctx).known); } catch (e) { return 0; } },
  quiz: (ctx, p, lv) => (((ctx.settings.quizPath || {})[p] || {})[lv] >= QUIZ_PASS ? 1 : 0),
  hifzSurahs: (ctx, list) => { let n = 0; list.forEach(s => { try { if (surahHifzDone(ctx, s)) n++; } catch (e) { /* */ } }); return n; },
  hifzVerses: ctx => Object.keys(ctx.settings.hifz || {}).length,
  muraja: ctx => Object.keys(ctx.settings.muraja || {}).filter(s => (ctx.settings.muraja[s] || {}).last != null).length,
  juz: ctx => juzReadCount(ctx),
  plan: ctx => ((ctx.settings.juz || {}).plan ? 1 : 0),
  days: ctx => Object.keys(ctx.settings.activity || {}).length,
  notes: ctx => Object.keys(ctx.settings.verseNotes || {}).length,
  marks: ctx => (ctx.settings.bookmarks || []).length,
  used: (ctx, k) => usedN(ctx, k),
};
/* --- où aller --- */
const GO = {
  alpha: (mode, extra) => ctx => ctx.openTab('alphabet', Object.assign({ mode, q: null, letter: null }, extra || {})),
  quizA: qk => ctx => ctx.openTab('alphabet', { mode: 'quiz', qk, q: null }),
  write: ids => ctx => ctx.openTab('write', { course: courseNextOf(wcState(ctx), ids) || ids[0], cstep: 0, letter: null, unit: null, word: null, free: false, copy: false }),
  letters: units => ctx => { const W = writeState(ctx); const u = WRITE_UNITS.find(x => (!units || units.includes(x.id)) && x.letters.some(l => !letterLearned(W, l))) || WRITE_UNITS[0]; ctx.openTab('write', { course: null, unit: u.id, letter: null, word: null, free: false, copy: false }); },
  writeHome: ctx => ctx.openTab('write', { course: null, unit: null, letter: null, word: null, free: false, copy: false }),
  copy: ctx => ctx.openTab('write', { course: null, copy: true }),
  read: ids => ctx => ctx.openTab('read', { course: courseNextOf(readStore(ctx), ids) || ids[0], cstep: 0 }),
  lesson: ids => ctx => { const LS = ctx.settings.lessons || {}; ctx.openLesson(ids.find(id => !(LS[id] && LS[id].done)) || ids[0]); },
  deck: d => ctx => ctx.openTab('review', { deck: d, session: null }),
  review: ctx => ctx.openTab('review', { session: null, deck: null }),
  quiz: (p, lv) => ctx => { const P = QUIZ_PATHS.find(x => x.id === p); const i = P.levels.findIndex(L => L[0] === lv); ctx.openTab('quiz', { round: { path: p, lv: Math.max(0, i), i: 0, ok: 0, q: null, wrong: [] }, free: false }); },
  hifz: list => ctx => { const s = list.find(x => !surahHifzDone(ctx, x)) || list[0]; ctx.openTab('coran', { surah: s, page: 0, hifz: { s, v: 0, level: 0 } }); },
  hifzHere: ctx => { const s = ctx.settings.lastSurah || 1; ctx.openTab('coran', { surah: s, page: 0, hifz: { s, v: 1, level: 0 } }); },
  muraja: ctx => { const s = ctx.settings.lastSurah || 1; ctx.openTab('coran', { surah: s, hifz: { s, v: 1, level: 0 }, muraja: true }); },
  quran: s => ctx => ctx.openQuran(s || ctx.settings.lastSurah || 1, s ? 1 : (ctx.settings.lastVerse || 0)),
  juz: ctx => ctx.openTab('coran', { juzView: true, bmView: false }),
  dict: ctx => ctx.openTab('dict', {}),
  rules: ctx => ctx.openTab('rules', {}),
  analyse: ctx => ctx.openTab('analyse', {}),
  build: ctx => ctx.openTab('build', {}),
  signs: ctx => ctx.openTab('signs', {}),
  home: ctx => ctx.openTab('home', {}),
};
/* une tâche : t (texte), of (but), n (fait), go (ouvrir), how (comment faire, en une phrase) */
const T = (t, of, n, go, how) => ({ t, of: () => of, n: ctx => Math.min(of, n(ctx)), go, how });
const RC = (a, b) => READ_COURSE.slice(a - 1, b).map(L => L.id);
const WC = (a, b) => WRITE_COURSE.slice(a - 1, b).map(L => L.id);
const tRead = (a, b) => T('Cours de lecture : ' + (a === b ? 'leçon ' + a + ' « ' + READ_COURSE[a - 1].title + ' »' : 'leçons ' + a + ' à ' + b), b - a + 1, ctx => PM.read(ctx, RC(a, b)), GO.read(RC(a, b)), 'Apprendre › Lire. Chaque leçon se valide par son petit quiz (70 %).');
const tWrite = (a, b) => T('Cours d\'écriture : ' + (a === b ? 'leçon ' + a + ' « ' + WRITE_COURSE[a - 1].title + ' »' : 'leçons ' + a + ' à ' + b), b - a + 1, ctx => PM.write(ctx, WC(a, b)), GO.write(WC(a, b)), 'Apprendre › Écrire › le cours. Chaque leçon se valide par son quiz.');
const tLessons = ids => T(ids.length === 1 ? 'Leçon de grammaire « ' + LESSONS.find(l => l.id === ids[0]).title + ' »' : 'Leçons de grammaire : ' + ids.map(id => '« ' + LESSONS.find(l => l.id === id).title.split(' : ')[0] + ' »').join(', '), ids.length, ctx => PM.lessons(ctx, ids), GO.lesson(ids), 'Apprendre › Leçons. Une leçon est validée à la fin de ses exercices.');
const tQuiz = (p, lv, extra) => { const P = QUIZ_PATHS.find(x => x.id === p); const L = P.levels.find(x => x[0] === lv); return T('Exercice « ' + P.title + ' » · ' + L[1] + ' : 7 sur 10', 1, ctx => PM.quiz(ctx, p, lv), GO.quiz(p, lv), extra || 'Réviser › Exercices. 10 questions prises dans le Coran, 7 bonnes réponses pour valider.'); };
const tCards = (label, pre, of, deck) => T('Cartes « ' + label + ' » : ' + of + ' cartes vues', of, ctx => PM.cards(ctx, pre), deck ? GO.deck(deck) : GO.review, 'Réviser › Cartes du jour. Une carte compte dès que tu y as répondu une fois.');

const PROGRAMS = {
  debut: {
    ic: '🔤', title: 'Je débute', sub: 'Des lettres jusqu\'aux petites sourates et aux premiers mots du Coran.',
    stages: [
      { ic: '🔤', title: 'Les premières lettres', goal: 'Rencontrer les lettres, leur nom et leur son.', can: 'Tu reconnais une dizaine de lettres et tu sais dans quel sens on écrit.', items: [
        T('Ouvrir 10 fiches de lettres et les écouter', 10, ctx => PM.used(ctx, 'letter'), GO.alpha('letters'), 'Apprendre › Alphabet › Les lettres. Touche une lettre, puis 🔊.'),
        T('Quiz « Quelle est cette lettre ? » : 20 bonnes réponses', 20, ctx => PM.alpha(ctx, 'name'), GO.quizA('name'), 'Apprendre › Alphabet › 🎯 S\'entraîner.'),
        tWrite(1, 2),
        T('Écrire ب ت ث à la main (score ≥ 60)', 3, ctx => PM.letters(ctx, ['u1']), GO.letters(['u1']), 'Apprendre › Écrire › « Le petit bateau ». Trace au doigt ou au stylet.'),
      ] },
      { ic: '✍️', title: 'Les lettres attachées', goal: 'Voir comment les lettres se tiennent la main.', can: 'Tu retrouves une lettre au début, au milieu et à la fin d\'un mot.', items: [
        tWrite(3, 4),
        T('Quiz « Retrouve la lettre dans le mot » : 20 bonnes réponses', 20, ctx => PM.alpha(ctx, 'form'), GO.quizA('form'), 'Apprendre › Alphabet › 🎯 S\'entraîner.'),
        T('Écrire les lettres des familles 2 et 3', PM.lettersOf(['u2', 'u3']), ctx => PM.letters(ctx, ['u2', 'u3']), GO.letters(['u2', 'u3']), 'Apprendre › Écrire : chaque lettre bien écrite (≥ 60) se coche.'),
        T('Ouvrir les 28 fiches de lettres', 28, ctx => PM.used(ctx, 'letter'), GO.alpha('letters'), 'Apprendre › Alphabet › Les lettres.'),
      ] },
      { ic: '👄', title: 'D\'où viennent les sons', goal: 'Prononcer les sons qui n\'existent pas en français.', can: 'Tu sais d\'où sort chaque son et tu ne confonds plus ح et ه, س et ص.', items: [
        T('Visiter 8 endroits de la bouche', 8, ctx => PM.used(ctx, 'zone'), GO.alpha('mouth'), 'Apprendre › Alphabet › 👄 D\'où vient le son : touche une zone du schéma.'),
        T('Écouter les « Sons à ne pas confondre »', 1, ctx => PM.used(ctx, 'pairs'), GO.alpha('pairs'), 'Apprendre › Alphabet › 👂 Sons à ne pas confondre.'),
        T('Quiz « D\'où sort ce son ? » : 15 bonnes réponses', 15, ctx => PM.alpha(ctx, 'zone'), GO.quizA('zone'), 'Apprendre › Alphabet › 🎯 S\'entraîner.'),
        tCards('Lire et écrire', '4-lecture/', 15),
      ] },
      { ic: '📖', title: 'Les voyelles', goal: 'Lire une syllabe, puis un mot simple.', can: 'Tu lis les voyelles brèves et longues, le soukoun et la shadda.', items: [
        tRead(1, 4),
        tCards('Lire et écrire', '4-lecture/', 30),
        T('Écrire 14 lettres en tout', 14, ctx => PM.letters(ctx), GO.letters(null), 'Apprendre › Écrire.'),
        tWrite(5, 6),
      ] },
      { ic: '📖', title: 'Lire de vrais mots', goal: 'Lire les mots du Coran avec l\'article et les liaisons.', can: 'Tu lis ٱلرَّحْمَٰن, رَبِّ ٱلْعَٰلَمِين sans hésiter.', items: [
        tRead(5, 8),
        T('Écrire 5 mots entiers', 5, ctx => PM.words(ctx), GO.writeHome, 'Apprendre › Écrire : les mots en bas de chaque famille.'),
        T('Jouer avec les voyelles (Atelier › Changer les voyelles)', 1, ctx => PM.used(ctx, 'signs'), GO.signs, 'Change une voyelle et écoute comment le mot change.'),
        T('Ouvrir 15 mots du Coran (touche un mot)', 15, ctx => PM.used(ctx, 'word'), GO.quran(1), 'Coran : touche un mot pour voir son sens, sa lecture et l\'écouter.'),
      ] },
      { ic: '✨', title: 'Les signes du Coran', goal: 'Comprendre les petits signes du mushaf.', can: 'Tu lis le texte du Coran tel qu\'il est imprimé, avec ses signes.', items: [
        tRead(9, 10),
        tCards('Tajwid', '5-tajwid/', 10),
        T('Écrire les 28 lettres', PM.lettersOf(null), ctx => PM.letters(ctx), GO.letters(null), 'Apprendre › Écrire.'),
        tWrite(7, 8),
      ] },
      { ic: '🌙', title: 'Al-Fātiḥa', goal: 'Lire seul la Fātiḥa et la savoir par cœur.', can: 'Tu lis et récites la Fātiḥa en comprenant chaque mot.', items: [
        tRead(11, 11),
        T('Par cœur : la Fātiḥa', 1, ctx => PM.hifzSurahs(ctx, [1]), GO.hifz([1]), 'Coran › 🧠 Par cœur : on cache peu à peu les mots.'),
        tQuiz('sens', 'fatiha'),
        T('Recopier 7 versets dans ton cahier', 7, ctx => PM.copied(ctx), GO.copy, 'Apprendre › Écrire › 📜 Recopier le Coran : écris sur papier, puis coche.'),
      ] },
      { ic: '🌙', title: 'Les petites sourates', goal: 'Lire et retenir les trois dernières sourates.', can: 'Tu récites al-Ikhlāṣ, al-Falaq et an-Nās et tu les révises.', items: [
        tRead(12, 12),
        T('Par cœur : sourates 112, 113 et 114', 3, ctx => PM.hifzSurahs(ctx, [112, 113, 114]), GO.hifz([112, 113, 114]), 'Coran › 🧠 Par cœur.'),
        T('Réciter de mémoire 3 sourates (révision)', 3, ctx => PM.muraja(ctx), GO.muraja, 'Coran › 🧠 › Révision du par cœur : récite, puis dis comment ça s\'est passé.'),
        tWrite(9, 10),
      ] },
      { ic: '💬', title: 'Tes premiers mots du Coran', goal: 'Apprendre les mots qui reviennent le plus.', can: 'Tu connais les 100 mots les plus fréquents : un bon quart du Coran.', items: [
        T('Cartes de mots : 100 mots vus', 100, ctx => PM.vocab(ctx), GO.deck('vocab/1'), 'Réviser › Cartes du jour : 5 nouveaux mots par jour.'),
        tQuiz('sens', 'juz30'),
        T('Chercher 10 mots dans le dictionnaire', 10, ctx => PM.used(ctx, 'dict'), GO.dict, 'Dictionnaire : tape un mot en arabe ou en français.'),
        T('Venir 15 jours', 15, ctx => PM.days(ctx), null, 'Un peu chaque jour vaut mieux que beaucoup une fois. Chaque jour où tu apprends quelque chose compte.'),
      ] },
      { ic: '🎓', title: 'Premiers pas en grammaire', goal: 'Voir comment un mot arabe est fait.', can: 'Tu reconnais la racine d\'un mot, l\'article et les trois cas.', items: [
        tLessons(['racine', 'defini', 'cas']),
        tQuiz('case', 'fatiha'),
        T('Lire 5 fiches de règles', 5, ctx => PM.used(ctx, 'rule'), GO.rules, 'Apprendre › Règles : ouvre une règle pour la lire en entier.'),
        T('Par cœur : 5 autres sourates de Juz ʿAmma', 8, ctx => PM.hifzSurahs(ctx, JUZ_AMMA), GO.hifz(JUZ_AMMA.slice().reverse()), 'Coran › 🧠 Par cœur. Les sourates déjà sues comptent.'),
      ] },
    ],
  },
  lire: {
    ic: '📖', title: 'Je sais lire', sub: 'Comprendre ce que tu lis : vocabulaire, grammaire, par cœur et lecture régulière.',
    stages: [
      { ic: '🧭', title: 'Bien démarrer', goal: 'Revoir les signes du Coran et prendre un rythme de lecture.', can: 'Tu lis le mushaf sans hésiter et tu as un plan de lecture.', items: [
        tRead(9, 12),
        T('Choisir un plan de lecture du Coran', 1, ctx => PM.plan(ctx), GO.juz, 'Coran › 📚 Les 30 parties › Plan de lecture.'),
        tCards('Tajwid', '5-tajwid/', 15),
        T('Garder 3 versets en signet', 3, ctx => PM.marks(ctx), GO.quran(), 'Sous un verset : ☆ Signet.'),
      ] },
      { ic: '💬', title: 'Les mots de base', goal: 'Les 300 mots qui font la moitié du Coran.', can: 'Tu comprends une bonne partie des mots de chaque verset.', items: [
        T('Cartes de mots : 150 mots vus', 150, ctx => PM.vocab(ctx), GO.deck('vocab/1'), 'Réviser › Cartes du jour.'),
        tQuiz('sens', 'fatiha'),
        T('Ouvrir 25 mots dans le Coran', 25, ctx => PM.used(ctx, 'word'), GO.quran(), 'Coran : touche un mot.'),
        T('Chercher 15 mots dans le dictionnaire', 15, ctx => PM.used(ctx, 'dict'), GO.dict, 'Dictionnaire : regarde aussi « même racine ».'),
      ] },
      { ic: '🌱', title: 'Racines et noms', goal: 'Comprendre la racine, le moule et l\'article.', can: 'Devant un mot inconnu, tu trouves sa racine et devines son sens.', items: [
        tLessons(['racine', 'defini']),
        tCards('Racine et schème', '3-verbe/racine', 8),
        T('Lire 5 fiches de règles', 5, ctx => PM.used(ctx, 'rule'), GO.rules, 'Apprendre › Règles.'),
        T('Chercher 30 mots dans le dictionnaire', 30, ctx => PM.used(ctx, 'dict'), GO.dict, 'Dictionnaire.'),
      ] },
      { ic: '📐', title: 'Les trois cas', goal: 'Lire la fin des mots : -u, -a, -i.', can: 'Tu sais pourquoi un mot finit par -u, -a ou -i.', items: [
        tLessons(['cas', 'prep']),
        tQuiz('case', 'fatiha'), tQuiz('case', 'juz30'),
        tCards('Les cas', '1-cas/', 20),
      ] },
      { ic: '🧱', title: 'La phrase', goal: 'Construire et reconnaître les phrases simples.', can: 'Tu fais toi-même des phrases comme « le livre est grand ».', items: [
        tLessons(['idafa', 'pronoms', 'nominale', 'adjectif']),
        tQuiz('phrase', 'p1'),
        T('Construire 5 phrases', 5, ctx => PM.used(ctx, 'build'), GO.build, 'Atelier › Construire : choisis les mots, la phrase s\'écrit.'),
        tCards('La phrase', '2-phrase/', 20),
      ] },
      { ic: '⚙️', title: 'Le verbe', goal: 'Le passé, le présent et ses modes, l\'impératif.', can: 'Tu reconnais qui fait l\'action et à quel temps.', items: [
        tLessons(['passe', 'verbale', 'present', 'imperatif']),
        T('Ouvrir la conjugaison de 5 verbes', 5, ctx => PM.used(ctx, 'conj'), GO.build, 'Atelier › Construire, ou Dictionnaire › un verbe › conjugaison.'),
        tQuiz('mood', 'juz30'),
        tCards('Le verbe', '3-verbe/', 20),
      ] },
      { ic: '🧩', title: 'Analyser un verset', goal: 'Lire un verset entier comme un grammairien.', can: 'Tu expliques le rôle de chaque mot d\'un verset court.', items: [
        tLessons(['inna', 'irab']),
        T('Analyser 5 versets (🧩 Analyse de la phrase)', 5, ctx => PM.used(ctx, 'irab'), GO.quran(112), 'Coran : sous un verset, 🧩 Analyse de la phrase.'),
        tQuiz('role', 'juz30'),
        T('Analyser 3 textes', 3, ctx => PM.used(ctx, 'analyse'), GO.analyse, 'Dictionnaire › Analyser un texte : colle un passage.'),
      ] },
      { ic: '🌙', title: 'Juz ʿAmma par cœur', goal: 'Retenir les sourates de la dernière partie.', can: 'Tu récites 10 sourates et tu les gardes en mémoire.', items: [
        T('Par cœur : 10 sourates de Juz ʿAmma', 10, ctx => PM.hifzSurahs(ctx, JUZ_AMMA), GO.hifz(JUZ_AMMA.slice().reverse()), 'Coran › 🧠 Par cœur.'),
        T('Réciter de mémoire 5 sourates (révision)', 5, ctx => PM.muraja(ctx), GO.muraja, 'Coran › 🧠 › Révision du par cœur.'),
        T('Regarder les versets semblables de 3 versets', 3, ctx => PM.used(ctx, 'similar'), GO.quran(), 'Sous un verset : 🔁 Versets semblables. Pour ne pas les mélanger.'),
        T('Recopier 20 versets dans ton cahier', 20, ctx => PM.copied(ctx), GO.copy, 'Apprendre › Écrire › 📜 Recopier le Coran.'),
      ] },
      { ic: '📚', title: 'Lire régulièrement', goal: 'Lire le Coran chaque jour en comprenant.', can: 'Tu comprends 40 % des mots du Coran et tu lis chaque jour.', items: [
        T('Lire 3 parties (juz\') en entier', 3, ctx => PM.juz(ctx), GO.juz, 'Coran › 📚 Les 30 parties : une partie se coche quand tu arrives au bout.'),
        T('Mots du Coran : 40 % compris', 40, ctx => PM.cover(ctx), GO.review, 'Le % monte avec les cartes de mots.'),
        T('Écrire 5 remarques sous des versets', 5, ctx => PM.notes(ctx), GO.quran(), 'Sous un verset : 📝 Remarque.'),
        T('Venir 30 jours', 30, ctx => PM.days(ctx), null, 'Un peu chaque jour. Chaque jour où tu apprends quelque chose compte.'),
      ] },
      { ic: '🕊', title: 'Lire seul', goal: 'Lire et comprendre seul, avec le dictionnaire en appui.', can: 'Tu ouvres n\'importe quelle sourate et tu la suis seul.', items: [
        T('Mots du Coran : 60 % compris', 60, ctx => PM.cover(ctx), GO.review, 'Réviser › Cartes du jour.'),
        tQuiz('sens', 'all'), tQuiz('case', 'all'),
        T('Par cœur : 100 versets', 100, ctx => PM.hifzVerses(ctx), GO.hifzHere, 'Coran › 🧠 Par cœur.'),
        T('Lire 10 parties (juz\')', 10, ctx => PM.juz(ctx), GO.juz, 'Coran › 📚 Les 30 parties.'),
      ] },
    ],
  },
  avance: {
    ic: '🕊', title: 'Je parle arabe', sub: 'Pour qui comprend déjà l\'arabe : tajwīd, iʿrāb, vocabulaire du Coran, par cœur et un tour complet.',
    stages: [
      { ic: '🎙️', title: 'La récitation (tajwīd)', goal: 'Les règles de récitation, avec les couleurs.', can: 'Tu repères ghunna, qalqala, madd et waqf dans le mushaf.', items: [
        tRead(9, 9),
        tCards('Tajwid', '5-tajwid/', 30),
        T('Activer les couleurs de prononciation', 1, ctx => (ctx.settings.tajwid ? 1 : 0), GO.quran(), 'Coran : case 🎨 prononciation.'),
        T('Réciter de mémoire 3 sourates (révision)', 3, ctx => PM.muraja(ctx), GO.muraja, 'Coran › 🧠 › Révision du par cœur.'),
      ] },
      { ic: '📜', title: 'L\'écriture du Coran', goal: 'Le rasm uthmani : ce qui diffère de l\'arabe courant.', can: 'Tu lis l\'alif waṣla, le petit alif, ة ى et la hamza du mushaf.', items: [
        tRead(7, 8),
        tCards('Lire et écrire', '4-lecture/', 30),
        T('Recopier 20 versets dans ton cahier', 20, ctx => PM.copied(ctx), GO.copy, 'Apprendre › Écrire › 📜 Recopier le Coran (essaie « sans voyelles »).'),
        tWrite(10, 10),
      ] },
      { ic: '💬', title: 'Le vocabulaire du Coran', goal: 'Les mots du Coran qui ne sont pas ceux de tous les jours.', can: 'Tu comprends 70 % des mots, y compris les mots rares.', items: [
        tQuiz('sens', 'juz30'), tQuiz('sens', 'all'),
        T('Ouvrir 40 mots dans le Coran', 40, ctx => PM.used(ctx, 'word'), GO.quran(), 'Coran : touche un mot, regarde ses autres versets.'),
        T('Chercher 30 mots dans le dictionnaire', 30, ctx => PM.used(ctx, 'dict'), GO.dict, 'Dictionnaire : regarde la racine et tous les versets.'),
        T('Mots du Coran : 70 % compris', 70, ctx => PM.cover(ctx), GO.deck('vocab/7'), 'Réviser › cartes de mots (commence au niveau 2 ou 3).'),
      ] },
      { ic: '🧩', title: 'L\'iʿrāb', goal: 'Donner la fonction de chaque mot, comme dans un livre de naḥw.', can: 'Tu fais l\'iʿrāb d\'un verset et tu le compares à l\'analyse.', items: [
        tLessons(['cas', 'irab']),
        tQuiz('role', 'juz30'), tQuiz('role', 'all'),
        T('Analyser 15 versets (🧩 Analyse de la phrase)', 15, ctx => PM.used(ctx, 'irab'), GO.quran(), 'Coran : sous un verset, 🧩 Analyse de la phrase.'),
        tCards('La phrase', '2-phrase/', 30),
      ] },
      { ic: '⚙️', title: 'Verbes et modes', goal: 'Les modes du présent, le passif, les formes du verbe.', can: 'Tu expliques pourquoi un verbe finit par -u, -a ou sans voyelle.', items: [
        tLessons(['present', 'inna']),
        tQuiz('mood', 'juz30'), tQuiz('mood', 'all'),
        T('Ouvrir la conjugaison de 10 verbes', 10, ctx => PM.used(ctx, 'conj'), GO.build, 'Atelier › Construire, ou Dictionnaire › un verbe › conjugaison.'),
        tCards('Le verbe', '3-verbe/', 30),
      ] },
      { ic: '🔁', title: 'Versets qui se ressemblent', goal: 'Les mutashābihāt : les distinguer pour ne pas se tromper en récitant.', can: 'Tu sais où deux versets presque pareils diffèrent.', items: [
        T('Regarder les versets semblables de 15 versets', 15, ctx => PM.used(ctx, 'similar'), GO.quran(2), 'Sous un verset : 🔁 Versets semblables.'),
        T('Par cœur : 50 versets', 50, ctx => PM.hifzVerses(ctx), GO.hifzHere, 'Coran › 🧠 Par cœur.'),
        T('Écrire 10 remarques sous des versets', 10, ctx => PM.notes(ctx), GO.quran(), 'Sous un verset : 📝 Remarque (une différence, un mot rare…).'),
      ] },
      { ic: '🌙', title: 'Juz ʿAmma par cœur', goal: 'Toute la dernière partie, révisée régulièrement.', can: 'Tu récites 20 sourates de Juz ʿAmma.', items: [
        T('Par cœur : 20 sourates de Juz ʿAmma', 20, ctx => PM.hifzSurahs(ctx, JUZ_AMMA), GO.hifz(JUZ_AMMA.slice().reverse()), 'Coran › 🧠 Par cœur.'),
        T('Réciter de mémoire 15 sourates (révision)', 15, ctx => PM.muraja(ctx), GO.muraja, 'Coran › 🧠 › Révision du par cœur.'),
        T('Venir 30 jours', 30, ctx => PM.days(ctx), null, 'Un peu chaque jour. Chaque jour où tu apprends quelque chose compte.'),
      ] },
      { ic: '📚', title: 'Un tour du Coran (1)', goal: 'Lire tout le Coran en comprenant, à ton rythme.', can: 'Tu as lu le premier tiers du Coran.', items: [
        T('Choisir un plan de lecture', 1, ctx => PM.plan(ctx), GO.juz, 'Coran › 📚 Les 30 parties › Plan de lecture.'),
        T('Lire 10 parties (juz\')', 10, ctx => PM.juz(ctx), GO.juz, 'Les parties se cochent quand tu arrives au bout.'),
        T('Analyser 5 textes', 5, ctx => PM.used(ctx, 'analyse'), GO.analyse, 'Dictionnaire › Analyser un texte.'),
      ] },
      { ic: '📚', title: 'Un tour du Coran (2)', goal: 'Finir le tour complet.', can: 'Tu as lu tout le Coran, partie par partie.', items: [
        T('Lire les 30 parties', 30, ctx => PM.juz(ctx), GO.juz, 'Coran › 📚 Les 30 parties.'),
        T('Mots du Coran : 85 % compris', 85, ctx => PM.cover(ctx), GO.review, 'Réviser › cartes de mots.'),
        T('Venir 60 jours', 60, ctx => PM.days(ctx), null, 'Un peu chaque jour. Chaque jour où tu apprends quelque chose compte.'),
      ] },
      { ic: '🖋', title: 'Transmettre', goal: 'Partager ce que tu sais avec les autres.', can: 'Tu prépares des feuilles et des images pour apprendre à d\'autres.', items: [
        T('Imprimer 3 sourates ou parties', 3, ctx => PM.used(ctx, 'print'), GO.quran(), 'Coran › 🖨 Imprimer : PDF ou PNG, A4 ou A5.'),
        T('Faire 3 images de versets', 3, ctx => PM.used(ctx, 'image'), GO.quran(), 'Sous un verset : ⋯ › 🖼 Image du verset.'),
        T('Recopier 50 versets dans ton cahier', 50, ctx => PM.copied(ctx), GO.copy, 'Apprendre › Écrire › 📜 Recopier le Coran.'),
        T('Garder 10 versets en signet', 10, ctx => PM.marks(ctx), GO.quran(), 'Sous un verset : ☆ Signet.'),
      ] },
    ],
  },
};
/* le programme choisi (les anciens réglages : start 1-2 = je débute, 3-4 = je sais lire, 5 = je parle arabe) */
function pathConf(ctx) {
  const P = ctx.settings.path || {};
  if (P.prog && PROGRAMS[P.prog]) return { prog: P.prog, from: P.from || 0 };
  const st = P.start || 1;
  if (st >= 5) return { prog: 'avance', from: 0 };
  if (st >= 3) return { prog: 'lire', from: 0 };
  // ancien parcours en 5 niveaux : on reprend là où tu en étais
  try {
    const L1 = (ctx.settings.alphaOk || 0) >= 30 && PM.write(ctx, ['c1', 'c2', 'c3', 'c4']) >= 4;
    const L2 = PM.read(ctx, RC(1, 10)) >= 10;
    const L3 = PM.read(ctx, ['r11', 'r12']) >= 2 && PM.hifzSurahs(ctx, PATH_SHORT) >= 4;
    if (L2 && L3) return { prog: 'lire', from: 0 };
    if (L2) return { prog: 'debut', from: 6 };
    if (L1) return { prog: 'debut', from: 3 };
  } catch (e) { /* */ }
  return { prog: 'debut', from: st === 2 ? 3 : 0 };
}
function pathStart(ctx) { const P = ctx.settings.path; return P && P.start ? P.start : 1; }
/* l'état de chaque étape : fraction faite, terminée ou non */
function pathState(ctx) {
  const C = pathConf(ctx); const PR = PROGRAMS[C.prog];
  const lv = PR.stages.map((L, i) => {
    if (i < C.from) return { L, i, frac: 1, done: true, skipped: true, items: [] };
    const items = L.items.map(it => { let n = 0, of = 1; try { n = it.n(ctx); of = it.of(ctx); } catch (e) { /* données pas prêtes */ } return { it, n, of, done: n >= of }; });
    const frac = items.reduce((a, x) => a + Math.min(1, x.n / x.of), 0) / items.length;
    return { L, i, frac, done: items.every(x => x.done), items };
  });
  const cur = lv.find(x => !x.done) || lv[lv.length - 1];
  return { lv, cur, prog: C.prog, PR };
}

/* --- « Aujourd'hui » : une seule grande action, la suivante en dessous --- */
function renderToday(ctx, root) {
  const P = pathState(ctx); const cur = P.cur;
  const nextItem = cur.items.find(x => !x.done && x.it.go);
  const box = h(root, 'div', 'aa-today');
  const top = h(box, 'div', 'aa-today-top');
  h(top, 'span', 'aa-today-ic', '☀️'); h(top, 'b', null, 'Aujourd\'hui');
  h(top, 'span', 'aa-muted aa-small aa-today-lv', 'Étape ' + (cur.i + 1) + ' · ' + cur.L.title);
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
    } else btn(act, '▶  ' + (nextItem ? 'Avancer : étape ' + (cur.i + 1) : 'Lire le Coran'), goLesson, 'mod-cta aa-fc-big');
  }).catch(() => { btn(act, '▶  Avancer', () => nextItem && nextItem.it.go(ctx), 'mod-cta aa-fc-big'); });
}

/* --- le parcours : 10 étapes, on peut en ouvrir une pour voir ses tâches --- */
function renderPath(ctx, root, state, go) {
  const P = pathState(ctx);
  const sec = h(root, 'div', 'aa-home-block aa-path');
  const top = h(sec, 'div', 'aa-home-block-top'); h(top, 'h3', null, '🧭 Ton parcours');
  const ch = h(top, 'a', 'aa-link aa-small', 'Changer de programme'); ch.addEventListener('click', ev => { ev.preventDefault(); state.welcome = true; go(); });
  const all = P.lv.reduce((a, x) => a + x.frac, 0) / P.lv.length;
  const head = h(sec, 'div', 'aa-path-prog');
  mdText(head, 'span', null, P.PR.ic + ' **' + P.PR.title + '** · étape ' + (P.cur.i + 1) + ' sur ' + P.lv.length);
  const bar = h(head, 'div', 'aa-lesson-progress aa-path-allbar'); h(bar, 'div', 'aa-lesson-fill').style.width = Math.round(100 * all) + '%';
  h(head, 'span', 'aa-muted aa-small', Math.round(100 * all) + ' % du programme');
  const row = h(sec, 'div', 'aa-path-row aa-path-row10');
  const open = state.pathOpen != null && P.lv[state.pathOpen] ? state.pathOpen : P.cur.i;
  P.lv.forEach(x => {
    const c = h(row, 'button', 'aa-path-lv' + (x.done ? ' aa-path-done' : '') + (x === P.cur ? ' aa-path-cur' : '') + (x.i === open ? ' aa-on' : ''));
    c.title = x.L.title;
    const ring = h(c, 'span', 'aa-path-ring'); ring.style.setProperty('--p', Math.round(100 * x.frac)); h(ring, 'span', null, x.done ? '✓' : x.L.ic);
    h(c, 'span', 'aa-path-n', 'Étape ' + (x.i + 1));
    h(c, 'span', 'aa-path-t', x.L.title);
    c.addEventListener('click', () => { state.pathOpen = x.i; go(); });
  });
  const x = P.lv[open];
  const det = h(sec, 'div', 'aa-path-det');
  mdText(det, 'p', null, '**' + x.L.ic + ' Étape ' + (x.i + 1) + ' · ' + x.L.title + '** : ' + x.L.goal + (x.skipped ? ' (passée : tu as choisi de commencer plus loin)' : ''));
  mdText(det, 'p', 'aa-muted aa-small aa-path-can', '🎯 À la fin : ' + x.L.can);
  const items = x.skipped ? x.L.items.map(it => { let n = 0, of = 1; try { n = it.n(ctx); of = it.of(ctx); } catch (e) { /* */ } return { it, n, of, done: n >= of }; }) : x.items;
  items.forEach(y => {
    const r = h(det, 'div', 'aa-path-item' + (y.done ? ' aa-path-item-done' : ''));
    h(r, 'span', 'aa-path-check', y.done ? '✓' : '○');
    const t = h(r, 'div', 'aa-path-it'); h(t, 'div', null, y.it.t);
    if (y.it.how) h(t, 'div', 'aa-muted aa-small', y.it.how);
    if (y.of > 1) { const b = h(t, 'div', 'aa-lesson-progress aa-path-bar'); const f = h(b, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * Math.min(1, y.n / y.of)) + '%'; h(t, 'div', 'aa-muted aa-small', y.n + ' / ' + y.of); }
    if (y.it.go) btn(r, y.done ? 'Revoir' : 'Ouvrir', () => y.it.go(ctx), y.done ? 'aa-btn-quiet' : '');
  });
  if (x.done && !x.skipped && x.i < P.lv.length - 1) h(det, 'p', 'aa-ok aa-small', '✓ Étape réussie. Les révisions (cartes, par cœur) continuent dans « Aujourd\'hui ».');
}

/* --- premier lancement : « Commence ici » --- */
function needsWelcome(ctx) {
  if (ctx.settings.path) return false;
  const A = ctx.settings.activity || {};
  return !Object.keys(A).length; // déjà utilisé : on ne dérange pas
}
const PATH_CHOICES = [
  ['debut', 0, 1, '🔤', 'Je ne connais pas encore les lettres', 'Programme « Je débute », depuis l\'alphabet.'],
  ['debut', 3, 2, '✏️', 'Je connais les lettres, mais je lis mal', 'Programme « Je débute », à partir des voyelles (étape 4).'],
  ['lire', 0, 3, '📖', 'Je sais lire, je veux comprendre', 'Programme « Je sais lire » : mots, grammaire, par cœur.'],
  ['avance', 0, 5, '🕊', 'Je parle et je comprends l\'arabe', 'Programme « Je parle arabe » : tajwīd, iʿrāb, mots du Coran, un tour complet.'],
];
function renderWelcome(ctx, root, state, go) {
  const box = h(root, 'div', 'aa-welcome');
  h(box, 'div', 'aa-welcome-ic', '👋');
  h(box, 'h2', null, ctx.settings.path ? 'Changer de programme' : 'Bienvenue ! Commence ici');
  mdText(box, 'p', 'aa-muted', 'L\'Atelier te guide **pas à pas** avec un programme de **10 étapes** qui utilise tout l\'Atelier : lettres, écriture, lecture, cartes, exercices, leçons, Coran mot à mot, par cœur. Dis-moi où tu en es (tu pourras changer plus tard, ce que tu as fait reste compté).');
  const C = pathConf(ctx);
  const g = h(box, 'div', 'aa-welcome-choices');
  PATH_CHOICES.forEach(([prog, from, start, ic, t, sub]) => {
    const c = h(g, 'button', 'aa-welcome-ch' + (ctx.settings.path && C.prog === prog && C.from === from ? ' aa-on' : ''));
    h(c, 'span', 'aa-welcome-chic', ic);
    const tx = h(c, 'span', 'aa-welcome-chtx'); h(tx, 'b', null, t); h(tx, 'span', 'aa-muted aa-small', sub);
    c.addEventListener('click', () => {
      const first = !ctx.settings.path;
      ctx.settings.path = { prog, from, start }; ctx.save(); state.welcome = false; state.pathOpen = null; go();
      if (first && !ctx.settings.tourDone && ctx.startTour) setTimeout(() => ctx.startTour(), 300);
    });
  });
  const foot = h(box, 'div', 'aa-actions');
  if (ctx.settings.path) btn(foot, '← Retour', () => { state.welcome = false; go(); }, 'aa-btn-quiet');
  else btn(foot, 'Passer', () => { ctx.settings.path = { prog: 'debut', from: 0, start: 1 }; ctx.save(); go(); }, 'aa-btn-quiet');
}
