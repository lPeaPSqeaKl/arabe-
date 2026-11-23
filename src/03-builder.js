/* ====================================================================
 * 03 - Constructeur de phrases : vocabulaire, accords, conjugaison
 * ==================================================================== */
const F = AR.FATHA, D = AR.DAMMA, K = AR.KASRA, S = AR.SUKUN, SH = AR.SHADDA;
const VOWEL = { a: F, i: K, u: D };

// Noms : stem vocalisé sans la voyelle finale ; g = genre arabe ; fr = [nom, genre français]
const NOUNS = [
  { id: 'walad', ar: 'وَلَد', g: 'm', fr: ['garçon', 'm'] },
  { id: 'bint', ar: 'بِنْت', g: 'f', fr: ['fille', 'f'] },
  { id: 'talib', ar: 'طَالِب', g: 'm', fr: ['étudiant', 'm'] },
  { id: 'taliba', ar: 'طَالِبَة', g: 'f', fr: ['étudiante', 'f'] },
  { id: 'muallim', ar: 'مُعَلِّم', g: 'm', fr: ['enseignant', 'm'] },
  { id: 'muallima', ar: 'مُعَلِّمَة', g: 'f', fr: ['enseignante', 'f'] },
  { id: 'rajul', ar: 'رَجُل', g: 'm', fr: ['homme', 'm'] },
  { id: 'kitab', ar: 'كِتَاب', g: 'm', fr: ['livre', 'm'] },
  { id: 'dars', ar: 'دَرْس', g: 'm', fr: ['leçon', 'f'] },
  { id: 'risala', ar: 'رِسَالَة', g: 'f', fr: ['lettre', 'f'] },
  { id: 'qalam', ar: 'قَلَم', g: 'm', fr: ['stylo', 'm'] },
  { id: 'bayt', ar: 'بَيْت', g: 'm', fr: ['maison', 'f'] },
  { id: 'bab', ar: 'بَاب', g: 'm', fr: ['porte', 'f'] },
  { id: 'madrasa', ar: 'مَدْرَسَة', g: 'f', fr: ['école', 'f'] },
  { id: 'masjid', ar: 'مَسْجِد', g: 'm', fr: ['mosquée', 'f'] },
  { id: 'ghurfa', ar: 'غُرْفَة', g: 'f', fr: ['chambre', 'f'] },
  { id: 'hadiqa', ar: 'حَدِيقَة', g: 'f', fr: ['jardin', 'm'] },
  { id: 'sayyara', ar: 'سَيَّارَة', g: 'f', fr: ['voiture', 'f'] },
  { id: 'halib', ar: 'حَلِيب', g: 'm', fr: ['lait', 'm'] },
  { id: 'qahwa', ar: 'قَهْوَة', g: 'f', fr: ['café', 'm'] },
  { id: 'asir', ar: 'عَصِير', g: 'm', fr: ['jus', 'm'] },
  { id: 'taam', ar: 'طَعَام', g: 'm', fr: ['repas', 'm'] },
  { id: 'sawt', ar: 'صَوْت', g: 'm', fr: ['voix', 'f'] },
  { id: 'khabar', ar: 'خَبَر', g: 'm', fr: ['nouvelle', 'f'] },
  { id: 'sura', ar: 'صُورَة', g: 'f', fr: ['image', 'f'] },
  { id: 'muhammad', ar: 'مُحَمَّد', g: 'm', fr: ['Mohammed', 'm'], proper: true },
  { id: 'ahmad', ar: 'أَحْمَد', g: 'm', fr: ['Ahmed', 'm'], proper: true, diptote: true },
  { id: 'yusuf', ar: 'يُوسُف', g: 'm', fr: ['Youssef', 'm'], proper: true, diptote: true },
  { id: 'fatima', ar: 'فَاطِمَة', g: 'f', fr: ['Fatima', 'f'], proper: true, diptote: true },
  { id: 'maryam', ar: 'مَرْيَم', g: 'f', fr: ['Maryam', 'f'], proper: true, diptote: true },
  { id: 'allah', ar: 'اللَّه', g: 'm', fr: ['Allah', 'm'], proper: true, noTanwin: true, noSubjVerb: true },
];
const ADJS = [
  { id: 'kabir', ar: 'كَبِير', fr: ['grand', 'grande'], pre: true },
  { id: 'saghir', ar: 'صَغِير', fr: ['petit', 'petite'], pre: true },
  { id: 'jamil', ar: 'جَمِيل', fr: ['beau', 'belle', 'bel'], pre: true },
  { id: 'jadid', ar: 'جَدِيد', fr: ['nouveau', 'nouvelle', 'nouvel'], pre: true },
  { id: 'qadim', ar: 'قَدِيم', fr: ['ancien', 'ancienne'] },
  { id: 'mujtahid', ar: 'مُجْتَهِد', fr: ['travailleur', 'travailleuse'] },
  { id: 'said', ar: 'سَعِيد', fr: ['heureux', 'heureuse'] },
  { id: 'nazif', ar: 'نَظِيف', fr: ['propre', 'propre'] },
  { id: 'maftuh', ar: 'مَفْتُوح', fr: ['ouvert', 'ouverte'] },
  { id: 'hazin', ar: 'حَزِين', fr: ['triste', 'triste'] },
  { id: 'karim', ar: 'كَرِيم', fr: ['généreux', 'généreuse'] },
  { id: 'rahim', ar: 'رَحِيم', fr: ['miséricordieux', 'miséricordieuse'] },
  { id: 'mashghul', ar: 'مَشْغُول', fr: ['occupé', 'occupée'] },
];
// Verbes trilitères sains : r = radicales, pv = voyelle du passé, iv = voyelle du présent
const VERBS = [
  { id: 'kataba', r: 'كتب', pv: 'a', iv: 'u', tr: true, fr: { inf: 'écrire', pp: 'écrit', aux: 'a', pres: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'], fut: 'écrir' }, obj: ['risala', 'dars', 'kitab'] },
  { id: 'fataha', r: 'فتح', pv: 'a', iv: 'a', tr: true, fr: { inf: 'ouvrir', pp: 'ouvert', aux: 'a', pres: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'], fut: 'ouvrir' }, obj: ['bab', 'kitab'] },
  { id: 'shariba', r: 'شرب', pv: 'i', iv: 'a', tr: true, fr: { inf: 'boire', pp: 'bu', aux: 'a', pres: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'], fut: 'boir' }, obj: ['halib', 'qahwa', 'asir'] },
  { id: 'fahima', r: 'فهم', pv: 'i', iv: 'a', tr: true, fr: { inf: 'comprendre', pp: 'compris', aux: 'a', pres: ['comprends', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent'], fut: 'comprendr' }, obj: ['dars', 'khabar'] },
  { id: 'samia', r: 'سمع', pv: 'i', iv: 'a', tr: true, fr: { inf: 'entendre', pp: 'entendu', aux: 'a', pres: ['entends', 'entends', 'entend', 'entendons', 'entendez', 'entendent'], fut: 'entendr' }, obj: ['sawt', 'khabar'] },
  { id: 'arafa', r: 'عرف', pv: 'a', iv: 'i', tr: true, fr: { inf: 'connaître', pp: 'connu', aux: 'a', pres: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'], fut: 'connaîtr' }, obj: ['muallim', 'khabar'] },
  { id: 'hamala', r: 'حمل', pv: 'a', iv: 'i', tr: true, fr: { inf: 'porter', pp: 'porté', aux: 'a', pres: ['porte', 'portes', 'porte', 'portons', 'portez', 'portent'], fut: 'porter' }, obj: ['kitab', 'qalam'] },
  { id: 'talaba', r: 'طلب', pv: 'a', iv: 'u', tr: true, fr: { inf: 'demander', pp: 'demandé', aux: 'a', pres: ['demande', 'demandes', 'demande', 'demandons', 'demandez', 'demandent'], fut: 'demander' }, obj: ['taam', 'qahwa'] },
  { id: 'darasa', r: 'درس', pv: 'a', iv: 'u', tr: true, fr: { inf: 'étudier', pp: 'étudié', aux: 'a', pres: ['étudie', 'étudies', 'étudie', 'étudions', 'étudiez', 'étudient'], fut: 'étudier' }, obj: ['dars', 'kitab'] },
  { id: 'rasama', r: 'رسم', pv: 'a', iv: 'u', tr: true, fr: { inf: 'dessiner', pp: 'dessiné', aux: 'a', pres: ['dessine', 'dessines', 'dessine', 'dessinons', 'dessinez', 'dessinent'], fut: 'dessiner' }, obj: ['sura', 'bayt'] },
  { id: 'ghasala', r: 'غسل', pv: 'a', iv: 'i', tr: true, fr: { inf: 'laver', pp: 'lavé', aux: 'a', pres: ['lave', 'laves', 'lave', 'lavons', 'lavez', 'lavent'], fut: 'laver' }, obj: ['sayyara', 'bab'] },
  { id: 'abada', r: 'عبد', pv: 'a', iv: 'u', tr: true, fr: { inf: 'adorer', pp: 'adoré', aux: 'a', pres: ['adore', 'adores', 'adore', 'adorons', 'adorez', 'adorent'], fut: 'adorer' }, obj: ['allah'] },
  { id: 'hamida', r: 'حمد', pv: 'i', iv: 'a', tr: true, fr: { inf: 'louer', pp: 'loué', aux: 'a', pres: ['loue', 'loues', 'loue', 'louons', 'louez', 'louent'], fut: 'louer' }, obj: ['allah'] },
  { id: 'nasara', r: 'نصر', pv: 'a', iv: 'u', tr: true, fr: { inf: 'aider', pp: 'aidé', aux: 'a', pres: ['aide', 'aides', 'aide', 'aidons', 'aidez', 'aident'], fut: 'aider' }, obj: ['talib', 'rajul'] },
  { id: 'sanaa', r: 'صنع', pv: 'a', iv: 'a', tr: true, fr: { inf: 'fabriquer', pp: 'fabriqué', aux: 'a', pres: ['fabrique', 'fabriques', 'fabrique', 'fabriquons', 'fabriquez', 'fabriquent'], fut: 'fabriquer' }, obj: ['bab', 'taam'] },
  { id: 'dhahaba', r: 'ذهب', pv: 'a', iv: 'a', tr: false, prep: 'ila', fr: { inf: 'aller', pp: 'allé', aux: 'e', pres: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], fut: 'ir' } },
  { id: 'kharaja', r: 'خرج', pv: 'a', iv: 'u', tr: false, prep: 'min', fr: { inf: 'sortir', pp: 'sorti', aux: 'e', pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], fut: 'sortir' } },
  { id: 'rajaa', r: 'رجع', pv: 'a', iv: 'i', tr: false, prep: 'ila', fr: { inf: 'rentrer', pp: 'rentré', aux: 'e', pres: ['rentre', 'rentres', 'rentre', 'rentrons', 'rentrez', 'rentrent'], fut: 'rentrer' } },
  { id: 'laiba', r: 'لعب', pv: 'i', iv: 'a', tr: false, prep: 'fi', fr: { inf: 'jouer', pp: 'joué', aux: 'a', pres: ['joue', 'joues', 'joue', 'jouons', 'jouez', 'jouent'], fut: 'jouer' } },
  { id: 'dahika', r: 'ضحك', pv: 'i', iv: 'a', tr: false, prep: 'maa', fr: { inf: 'rire', pp: 'ri', aux: 'a', pres: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'], fut: 'rir' } },
  { id: 'qala', r: 'قول', hollow: 'w', tr: true, fr: { inf: 'dire', pp: 'dit', aux: 'a', pres: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], fut: 'dir' }, obj: ['khabar'], note: 'verbe **creux** (2e radicale و) : la voyelle longue ā / ū devient courte quand la syllabe se ferme (قَالَ → قُلْتُ, يَقُولُ → لَمْ يَقُلْ).' },
  { id: 'zara', r: 'زور', hollow: 'w', tr: true, fr: { inf: 'visiter', pp: 'visité', aux: 'a', pres: ['visite', 'visites', 'visite', 'visitons', 'visitez', 'visitent'], fut: 'visiter' }, obj: ['masjid', 'muallim', 'madrasa'], note: 'verbe **creux** (و) : زَارَ → زُرْتُ, يَزُورُ → لَمْ يَزُرْ.' },
  { id: 'nama', r: 'نوم', hollow: 'a', tr: false, prep: 'fi', fr: { inf: 'dormir', pp: 'dormi', aux: 'a', pres: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'], fut: 'dormir' }, note: 'verbe **creux** à présent en ā : نَامَ → نِمْتُ, يَنَامُ → لَمْ يَنَمْ.' },
  { id: 'sara', r: 'سير', hollow: 'y', tr: false, prep: 'ila', fr: { inf: 'marcher', pp: 'marché', aux: 'a', pres: ['marche', 'marches', 'marche', 'marchons', 'marchez', 'marchent'], fut: 'marcher' }, note: 'verbe **creux** (2e radicale ي) : سَارَ → سِرْتُ, يَسِيرُ → لَمْ يَسِرْ.' },
  { id: 'kana', r: 'كون', hollow: 'w', tr: false, prep: 'fi', fr: { inf: 'être', pp: 'été', aux: 'a', pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], fut: 'ser' }, note: 'كَانَ comme verbe « être (quelque part) » : verbe **creux**, كَانَ → كُنْتُ, يَكُونُ → لَمْ يَكُنْ (comme dans 112:4).' },
  { id: 'arsala', r: 'رسل', form: 4, tr: true, fr: { inf: 'envoyer', pp: 'envoyé', aux: 'a', pres: ['envoie', 'envoies', 'envoie', 'envoyons', 'envoyez', 'envoient'], fut: 'enverr' }, obj: ['risala', 'kitab'], note: 'verbe de **forme IV** (أَفْعَلَ) : أَ au passé, et le présent commence par **u** : يُرْسِلُ.' },
  { id: 'akhraja', r: 'خرج', form: 4, tr: true, fr: { inf: 'sortir', pp: 'sorti', aux: 'a', pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], fut: 'sortir' }, obj: ['kitab', 'qalam'], note: 'forme IV de خَرَجَ (sortir) : « faire sortir ». Présent يُخْرِجُ.' },
  { id: 'anzala', r: 'نزل', form: 4, tr: true, fr: { inf: 'descendre', pp: 'descendu', aux: 'a', pres: ['descends', 'descends', 'descend', 'descendons', 'descendez', 'descendent'], fut: 'descendr' }, obj: ['kitab'], note: 'forme IV de نَزَلَ : « faire descendre, révéler » (أَنْزَلَ ٱلْكِتَابَ). Présent يُنْزِلُ.' },
  { id: 'amana', r: 'أمن', form: 4, tr: false, prep: 'bi', prepFr: 'en', defPP: 'allah', fr: { inf: 'croire', pp: 'cru', aux: 'a', pres: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'], fut: 'croir' }, note: 'verbe de **forme IV** (racine أ م ن, « sécurité ») : on dit آمَنَ بِـ pour « croire en ». Hamza + alif s\'écrivent آ. Présent : يُؤْمِنُ.' },
  { id: 'nazala', r: 'نزل', pv: 'a', iv: 'i', tr: false, prep: 'min', fr: { inf: 'descendre', pp: 'descendu', aux: 'e', pres: ['descends', 'descends', 'descend', 'descendons', 'descendez', 'descendent'], fut: 'descendr' } },
];
const PREPS = [
  { id: 'fi', ar: 'فِي', fr: 'dans' }, { id: 'ila', ar: 'إِلَى', fr: 'à' }, { id: 'min', ar: 'مِنْ', fr: 'de' },
  { id: 'ala', ar: 'عَلَى', fr: 'sur' }, { id: 'maa', ar: 'مَعَ', fr: 'avec' }, { id: 'bi', ar: 'بِـ', fr: 'avec (au moyen de)', attached: true },
  { id: 'li', ar: 'لِـ', fr: 'pour', attached: true },
];
// Personnes : ar = pronom ; p = index de conjugaison française ; g = genre ; pl = pluriel
const PERS = [
  { id: 'anaM', ar: 'أَنَا', fr: 'je', em: 'moi', p: 0, g: 'm', label: 'أَنَا — je (homme)' },
  { id: 'anaF', ar: 'أَنَا', fr: 'je', em: 'moi', p: 0, g: 'f', label: 'أَنَا — je (femme)' },
  { id: 'anta', ar: 'أَنْتَ', fr: 'tu', em: 'toi', p: 1, g: 'm', label: 'أَنْتَ — tu (homme)' },
  { id: 'anti', ar: 'أَنْتِ', fr: 'tu', em: 'toi', p: 1, g: 'f', label: 'أَنْتِ — tu (femme)' },
  { id: 'huwa', ar: 'هُوَ', fr: 'il', em: 'lui', p: 2, g: 'm', label: 'هُوَ — il' },
  { id: 'hiya', ar: 'هِيَ', fr: 'elle', em: 'elle', p: 2, g: 'f', label: 'هِيَ — elle' },
  { id: 'nahnu', ar: 'نَحْنُ', fr: 'nous', em: 'nous', p: 3, g: 'm', pl: true, label: 'نَحْنُ — nous' },
  { id: 'antum', ar: 'أَنْتُمْ', fr: 'vous', em: 'vous', p: 4, g: 'm', pl: true, label: 'أَنْتُمْ — vous' },
  { id: 'hum', ar: 'هُمْ', fr: 'ils', em: 'eux', p: 5, g: 'm', pl: true, label: 'هُمْ — ils' },
];
const TENSES = [
  { id: 'past', label: 'Passé (il a fait)', ar: '' }, { id: 'pres', label: 'Présent (il fait)' }, { id: 'fut', label: 'Futur avec سَـ (il fera)' },
  { id: 'futS', label: 'Futur avec سَوْفَ (il fera, plus tard)' }, { id: 'negPastLam', label: 'Négation du passé : لَمْ + apocopé' }, { id: 'negPastMa', label: 'Négation du passé : مَا + passé' },
  { id: 'negPres', label: 'Négation du présent : لَا' }, { id: 'negFut', label: 'Négation du futur : لَنْ + subjonctif' }, { id: 'imp', label: 'Impératif (fais !)' }, { id: 'impNeg', label: 'Défense : لَا + apocopé (ne fais pas !)' },
];
const byId = (arr, id) => arr.find(x => x.id === id);

/* ---------- Noms : cas, définition ---------- */
function isSun(ch) { return SUN_LETTERS.includes(ch); }
function definite(stem) {
  if (stem === 'اللَّه') return stem;
  const first = stem[0];
  if (isSun(first)) return 'ال' + first + SH + stem.slice(1);
  return 'الْ' + stem;
}
function caseEnding(n, cas, def) {
  // n : nom ; def : true (ال) | false (indéfini) | 'construct' (1er terme d'annexion)
  const st = n.ar;
  if (n.id === 'allah') return st + { nom: D, acc: F, gen: K }[cas];
  if (n.proper) {
    if (n.diptote) return st + (cas === 'nom' ? D : F);
    return st + { nom: AR.DAMMATAN, acc: AR.FATHATAN + 'ا', gen: AR.KASRATAN }[cas];
  }
  if (def === true) return definite(st) + { nom: D, acc: F, gen: K }[cas];
  if (def === 'construct') return st + { nom: D, acc: F, gen: K }[cas];
  const endsTa = st.endsWith('ة');
  return st + { nom: AR.DAMMATAN, acc: AR.FATHATAN + (endsTa ? '' : 'ا'), gen: AR.KASRATAN }[cas];
}
function adjForm(a, gender, cas, def) {
  const st = gender === 'f' ? a.ar + F + 'ة' : a.ar;
  return caseEnding({ ar: st }, cas, def ? true : false);
}
function withPrep(prep, nounForm) {
  if (prep.id === 'bi') return 'بِ' + nounForm;
  if (prep.id === 'li') return nounForm.startsWith('ال') ? 'لِ' + nounForm.slice(1) : 'لِ' + nounForm;
  return null;
}

/* ---------- Verbes : conjugaison ---------- */
const HOLLOW_LONG = { w: 'و', y: 'ي', a: 'ا' };
const HOLLOW_SHORT = { w: D, y: K, a: F };
function isHamza(c) { return /[ءأإ]/.test(c); }
function form4Past(v, passive) {
  const [c1, c2, c3] = [...v.r];
  if (isHamza(c1)) return passive ? 'أُو' + c2 + K + c3 : 'آ' + c2 + F + c3;
  return passive ? 'أُ' + c1 + S + c2 + K + c3 : 'أَ' + c1 + S + c2 + F + c3;
}
function pastStem(v, passive) {
  if (v.form === 4) return form4Past(v, passive);
  const [c1, c2, c3] = [...v.r];
  return passive ? c1 + D + c2 + K + c3 : c1 + F + c2 + VOWEL[v.pv] + c3;
}
function conjPast(v, pid, passive) {
  return conjPast0(v, pid, passive).replace(/نْنَا$/, 'نَّا').replace(/نْنَ$/, 'نَّ');
}
function conjPast0(v, pid, passive) {
  if (v.hollow) {
    const [c1, , c3] = [...v.r];
    const third = ['huwa', 'hiya', 'hum'].includes(pid);
    const b = third ? c1 + (passive ? K + 'ي' : F + 'ا') + c3 : c1 + (passive ? K : (v.hollow === 'w' ? D : K)) + c3;
    switch (pid) {
      case 'huwa': return b + F;
      case 'hiya': return b + F + 'ت' + S;
      case 'hum': return b + D + 'وا';
      case 'anaM': case 'anaF': return b + S + 'ت' + D;
      case 'anta': return b + S + 'ت' + F;
      case 'anti': return b + S + 'ت' + K;
      case 'nahnu': return b + S + 'ن' + F + 'ا';
      case 'antum': return b + S + 'ت' + D + 'م' + S;
    }
  }
  const b = pastStem(v, passive);
  switch (pid) {
    case 'huwa': return b + F;
    case 'hiya': return b + F + 'ت' + S;
    case 'anaM': case 'anaF': return b + S + 'ت' + D;
    case 'anta': return b + S + 'ت' + F;
    case 'anti': return b + S + 'ت' + K;
    case 'nahnu': return b + S + 'ن' + F + 'ا';
    case 'antum': return b + S + 'ت' + D + 'م' + S;
    case 'hum': return b + D + 'وا';
  }
}
function conjPresent(v, pid, mood, passive) {
  const [c1, c2, c3] = [...v.r];
  const pre = { anaM: 'أ', anaF: 'أ', anta: 'ت', anti: 'ت', huwa: 'ي', hiya: 'ت', nahnu: 'ن', antum: 'ت', hum: 'ي' }[pid];
  let stem;
  const suffixed = ['anti', 'antum', 'hum'].includes(pid);
  if (v.hollow) {
    const shortJ = mood === 'jus' && !suffixed;
    const mid = passive ? (shortJ ? F : F + 'ا') : (shortJ ? HOLLOW_SHORT[v.hollow] : HOLLOW_SHORT[v.hollow] + HOLLOW_LONG[v.hollow]);
    stem = pre + (passive ? D : F) + c1 + mid + c3;
  } else if (v.form === 4) {
    if (isHamza(c1)) stem = (pre === 'أ' ? 'أُو' : pre + D + 'ؤْ') + c2 + (passive ? F : K) + c3;
    else stem = pre + D + c1 + S + c2 + (passive ? F : K) + c3;
  } else stem = pre + (passive ? D : F) + c1 + S + c2 + (passive ? F : VOWEL[v.iv]) + c3;
  if (pid === 'anti') return stem + K + (mood === 'ind' ? 'ين' + F : 'ي');
  if (pid === 'antum' || pid === 'hum') return stem + D + (mood === 'ind' ? 'ون' + F : 'وا');
  return stem + { ind: D, subj: F, jus: S }[mood];
}
function conjImperative(v, pid) {
  const j = conjPresent(v, pid, 'jus');
  if (v.hollow) return j.slice(2); // قُلْ, قُولِي, قُولُوا : pas besoin d'alif
  if (v.form === 4) { const [c1, c2, c3] = [...v.r]; const st = isHamza(c1) ? 'آ' + c2 + K + c3 : 'أَ' + c1 + S + c2 + K + c3; return st + (pid === 'anti' ? K + 'ي' : pid === 'antum' ? D + 'وا' : S); }
  const body = j.slice(2); // on enlève le préfixe تَ
  return 'ا' + body; // alif de liaison (prononcé u ou i en début de phrase)
}
function attachObj(verb, objGender) {
  let v = verb;
  if (v.endsWith('وا')) v = v.slice(0, -1);
  else if (v.endsWith('ت' + D + 'م' + S)) v = v.slice(0, -1) + D + 'و';
  const afterI = v.endsWith(K) || v.endsWith('ي');
  if (objGender === 'f') return v + 'ه' + F + 'ا';
  return v + 'ه' + (afterI ? K : D);
}
function verbForm(v, pid, tense, passive) {
  switch (tense) {
    case 'past': return { pre: '', v: conjPast(v, pid, passive), mood: 'past' };
    case 'pres': return { pre: '', v: conjPresent(v, pid, 'ind', passive), mood: 'ind' };
    case 'fut': return { pre: 'سَ', v: conjPresent(v, pid, 'ind', passive), mood: 'ind', attached: true };
    case 'futS': return { pre: 'سَوْفَ', v: conjPresent(v, pid, 'ind', passive), mood: 'ind' };
    case 'negPastLam': return { pre: 'لَمْ', v: conjPresent(v, pid, 'jus', passive), mood: 'jus' };
    case 'negPastMa': return { pre: 'مَا', v: conjPast(v, pid, passive), mood: 'past' };
    case 'negPres': return { pre: 'لَا', v: conjPresent(v, pid, 'ind', passive), mood: 'ind' };
    case 'negFut': return { pre: 'لَنْ', v: conjPresent(v, pid, 'subj', passive), mood: 'subj' };
    case 'imp': return { pre: '', v: conjImperative(v, pid), mood: 'imp' };
    case 'impNeg': return { pre: 'لَا', v: conjPresent(v, pid, 'jus'), mood: 'jus' };
  }
}

/* ---------- Français ---------- */
const VOW = /^[aeiouyéèêâîôûœh]/i;
function frJoin(tokens) {
  const t = tokens.filter(x => x !== '' && x != null);
  const out = [];
  for (let i = 0; i < t.length; i++) {
    let w = t[i]; const nx = t[i + 1] || '';
    if ((w === 'à' || w === 'de') && nx === 'le' && !VOW.test(t[i + 2] || '')) { out.push(w === 'à' ? 'au' : 'du'); i++; continue; }
    if (['je', 'ne', 'le', 'la', 'de', 'que', 'me', 'te'].includes(w) && VOW.test(nx) && !/^h(a|é|o)/i.test(nx === 'homme' ? 'x' : 'x')) { out.push(w[0] + "'" + nx); i++; continue; }
    out.push(w);
  }
  return out.join(' ').replace(/' /g, "'").replace(/\s+([?!])/g, ' $1');
}
function frNP(n, def, adj, adjGenderFr) {
  if (!n) return [];
  const g = n.fr[1];
  const noun = n.fr[0];
  let a = null, pre = false;
  if (adj) { a = g === 'f' ? adj.fr[1] : ((adj.fr[2] && VOW.test(noun)) ? adj.fr[2] : adj.fr[0]); pre = !!adj.pre; }
  const toks = [];
  if (!n.proper) toks.push(def ? (g === 'f' ? 'la' : 'le') : (g === 'f' ? 'une' : 'un'));
  if (a && pre) toks.push(a);
  toks.push(noun);
  if (a && !pre) toks.push(a);
  return toks;
}
function frAgree(word, g, pl) { return word + (g === 'f' ? 'e' : '') + (pl ? 's' : ''); }
function frAdjAgree(adj, g, pl) { let a = g === 'f' ? adj.fr[1] : adj.fr[0]; if (pl && !/[sx]$/.test(a)) a += 's'; return a; }

const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'], ETRE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], ETAIT = ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'];
const FUT_END = ['ai', 'as', 'a', 'ons', 'ez', 'ont'];
function frVerbPhrase(vfr, tense, p, g, pl, clitic, passive) {
  // renvoie la liste de jetons (sans le sujet)
  const neg = /^neg|impNeg/.test(tense);
  const T = [];
  const cl = clitic ? [clitic] : [];
  if (passive) {
    const pp = frAgree(vfr.pp, g, pl);
    if (tense === 'past' || tense === 'negPastLam' || tense === 'negPastMa') return neg ? ['n\'a', 'pas', 'été', pp].slice(0) : ['a', 'été', pp];
    if (tense === 'pres' || tense === 'negPres') return neg ? ['n\'est', 'pas', pp] : ['est', pp];
    return neg ? ['ne', 'sera', 'pas', pp] : ['sera', pp];
  }
  if (tense === 'imp' || tense === 'impNeg') {
    let f = vfr.pres[p];
    if (p === 1 && /es$/.test(f)) f = f.slice(0, -1);
    if (f === 'vas') f = 'va';
    if (tense === 'imp') return clitic ? [f + '-' + (clitic === "l'" ? (clitic === "l'" ? 'le' : clitic) : clitic)] : [f];
    return ['ne', ...cl, f, 'pas'];
  }
  if (tense === 'past' || tense === 'negPastLam' || tense === 'negPastMa') {
    const aux = vfr.aux === 'e' ? ETRE[p] : AVOIR[p];
    let pp = vfr.pp;
    if (vfr.aux === 'e') pp = frAgree(pp, g, pl);
    else if (clitic && clitic.g) pp = frAgree(pp, clitic.g === 'f' ? 'f' : 'm', false);
    const c = clitic ? [clitic.t] : [];
    return neg ? ['ne', ...c, aux, 'pas', pp] : [...c, aux, pp];
  }
  if (tense === 'pres' || tense === 'negPres') {
    const c = clitic ? [clitic.t] : [];
    return neg ? ['ne', ...c, vfr.pres[p], 'pas'] : [...c, vfr.pres[p]];
  }
  const fut = vfr.fut + FUT_END[p];
  const c = clitic ? [clitic.t] : [];
  return neg ? ['ne', ...c, fut, 'pas'] : [...c, fut];
}

/* ---------- Liaison entre les mots ---------- */
function applyLiaison(words) {
  const w = words.slice();
  for (let i = 0; i < w.length - 1; i++) {
    if (!w[i] || !w[i + 1]) continue;
    if (/^ا/.test(w[i + 1]) && w[i].endsWith(S)) {
      if (w[i] === 'مِنْ') w[i] = 'مِن' + F;
      else if (/مْ$/.test(w[i]) && /(هُمْ|تُمْ|كُمْ)$/.test(w[i])) w[i] = w[i].slice(0, -1) + D;
      else w[i] = w[i].slice(0, -1) + K;
    }
  }
  return w;
}

/* ---------- Construction d'une phrase ----------
 * cfg = { type: 'nominal' | 'verbal' | 'np', ... }
 * Renvoie { words: [{ar, role, why, gloss}], fr, notes: [], warn }
 */
function W(ar, role, why, gloss) { return { ar, role, why, gloss }; }

function buildNominal(c) {
  // c : subjKind ('noun'|'pron'), subj, subjDef, pron, pred ('adj'|'pp'), adj, prep, ppNoun, ppDef, mod ('none'|'kana'|'inna'|'laysa'|'laysaBi'), q
  const words = []; const notes = []; let warn = '';
  const n = c.subjKind === 'noun' ? byId(NOUNS, c.subj) : null;
  const P = c.subjKind === 'pron' ? byId(PERS.filter(x => !x.pl), c.pron) || PERS[4] : null;
  const g = n ? n.g : P.g; // genre arabe
  const gFr = n ? n.fr[1] : P.g;
  const def = n ? (n.proper ? true : c.subjDef) : true;
  const adj = byId(ADJS, c.adj) || ADJS[0];
  const prep = byId(PREPS, c.prep) || PREPS[0];
  const ppN = byId(NOUNS, c.ppNoun) || NOUNS[11];
  const mod = c.mod || 'none';
  const subjCase = mod === 'inna' ? 'acc' : 'nom';
  const predCase = (mod === 'kana' || mod === 'laysa') ? 'acc' : (mod === 'laysaBi' ? 'gen' : 'nom');
  const isPP = c.pred === 'pp';
  // --- groupe prépositionnel
  const ppWords = () => {
    const nf = caseEnding(ppN, 'gen', ppN.proper ? true : c.ppDef);
    const att = withPrep(prep, nf);
    if (att) return [W(att, 'pp', 'préposition ' + prep.ar + ' collée + nom au **génitif** (-i) : toute préposition met le nom suivant au génitif.', prep.fr + ' + ' + ppN.fr[0])];
    return [W(prep.ar, 'prep', 'préposition « ' + prep.fr + ' » : elle met le nom qui suit au génitif.', prep.fr),
      W(nf, 'gen', 'nom au **génitif** (' + (ppN.proper && ppN.diptote ? '-a, car c\'est un diptote' : (c.ppDef || ppN.proper ? '-i' : '-in')) + ') parce qu\'il suit la préposition ' + prep.ar + '.', ppN.fr[0])];
  };
  const frPP = () => [prep.id === 'bi' ? 'avec' : prep.fr, ...frNP(ppN, ppN.proper || c.ppDef)];
  // --- sujet indéfini + attribut adjectif : ce n'est pas une phrase !
  if (n && !def && !isPP) {
    const nf = caseEnding(n, 'nom', false); const af = adjForm(adj, g, 'nom', false);
    words.push(W(nf, 'subj', 'nom **indéfini** (tanwīn -un).', n.fr[0]), W(af, 'adj', 'adjectif indéfini : il copie le cas et le tanwīn du nom.', adj.fr[0]));
    warn = 'Attention : ce n\'est pas une phrase ! ' + nf + ' ' + af + ' veut dire « ' + frJoin(frNP(n, false, adj)) + ' ». Pour dire « ' + frJoin(['le', n.fr[0]]) + ' est ' + adj.fr[0] + ' », le sujet doit être **défini** (avec ال) et l\'attribut **indéfini** : ' + caseEnding(n, 'nom', true) + ' ' + af + '.';
    return { words, fr: cap(frJoin(frNP(n, false, adj))), notes, warn };
  }
  // --- sujet indéfini + groupe prépositionnel : « il y a … »
  if (n && !def && isPP) {
    const pw = ppWords();
    const sc = mod === 'inna' ? 'acc' : 'nom';
    const nf = caseEnding(n, sc, false);
    const head = [];
    if (mod === 'kana') head.push(W(g === 'f' ? 'كَانَتْ' : 'كَانَ', 'kana', 'كَانَ « était » : met la phrase au passé. Ici l\'ordre est inversé, mais le sujet reste au nominatif.', 'était'));
    if (mod === 'laysa' || mod === 'laysaBi') head.push(W(g === 'f' ? 'لَيْسَتْ' : 'لَيْسَ', 'kana', 'لَيْسَ « il n\'y a pas / n\'est pas ».', 'ne… pas'));
    if (mod === 'inna') head.push(W('إِنَّ', 'inna', 'إِنَّ « certes » : son nom passe à l\'**accusatif**, même s\'il est placé loin, après le groupe « où ».', 'certes'));
    if (c.q) head.unshift(W('هَلْ', 'q', 'هَلْ : transforme la phrase en question oui/non.', 'est-ce que'));
    words.push(...head, ...pw, W(nf, 'subj', (mod === 'inna' ? 'nom de إِنَّ, à l\'**accusatif indéfini** (-an).' : 'sujet **indéfini** au nominatif (-un). Un sujet indéfini se place **après** le « où » : on obtient « il y a … ».'), n.fr[0]));
    notes.push('En arabe, on ne commence pas une phrase par un nom indéfini : on dit « dans la maison [il y a] un garçon ».');
    const frBase = mod === 'kana' ? ['il', 'y', 'avait'] : (mod.startsWith('laysa') ? ['il', 'n\'y', 'a', 'pas'] : ['il', 'y', 'a']);
    let obj = frNP(n, false); if (mod.startsWith('laysa')) obj = ['de', n.fr[0]];
    let fr = frJoin([...(mod === 'inna' ? ['certes,'] : []), ...frBase, ...obj, ...frPP()]);
    if (c.q) fr = frJoin(['est-ce', 'qu\'' + frJoin(frBase), ...obj, ...frPP()]) + ' ?';
    return { words: fixLiaison(words), fr: cap(fr), notes, warn };
  }
  // --- cas général : sujet défini (ou pronom)
  const head = [];
  if (c.q) head.push(W('هَلْ', 'q', 'هَلْ : question oui / non. Devant ال, son soukoun devient kasra : هَلِ.', 'est-ce que'));
  let subjW = null;
  if (n) {
    const nf = caseEnding(n, subjCase, true);
    subjW = W(nf, 'subj', subjCase === 'acc' ? 'nom de إِنَّ : il passe à l\'**accusatif** (-a). إِنَّ ne change pas le sens, elle insiste : « certes ».' : (mod === 'kana' || mod.startsWith('laysa') ? 'nom de ' + (mod === 'kana' ? 'كَانَ' : 'لَيْسَ') + ' : il reste au **nominatif** (-u).' : 'sujet de la phrase nominale (**mubtadaʾ**) : défini et au **nominatif** (-u).') + (n.proper && n.diptote ? ' C\'est un nom propre **diptote** : jamais de tanwīn.' : '') + (n.proper && !n.diptote && n.id !== 'allah' ? ' Nom propre avec tanwīn.' : ''), n.fr[0]);
  }
  if (mod === 'kana') head.push(W(P ? kanaPron(P) : (g === 'f' ? 'كَانَتْ' : 'كَانَ'), 'kana', 'كَانَ « était » : met la phrase au passé, et son attribut passe à l\'**accusatif**.' + (P ? ' Avec un pronom, كَانَ se conjugue et le pronom disparaît.' : (g === 'f' ? ' ـَتْ car le sujet est féminin.' : '')), 'était'));
  if (mod === 'laysa' || mod === 'laysaBi') head.push(W(P ? laysaPron(P) : (g === 'f' ? 'لَيْسَتْ' : 'لَيْسَ'), 'kana', 'لَيْسَ « n\'est pas » : négation de la phrase nominale ; ' + (mod === 'laysaBi' ? 'ici l\'attribut est introduit par بِـ, donc au **génitif** : c\'est une négation plus forte, « pas du tout ».' : 'son attribut passe à l\'**accusatif**.'), 'n\'est pas'));
  if (mod === 'inna') head.push(W(P ? innaPron(P) : 'إِنَّ', 'inna', P ? 'إِنَّ + pronom suffixe : le pronom se colle à إِنَّ.' : 'إِنَّ « certes, en vérité » : renforce la phrase ; son nom passe à l\'accusatif, l\'attribut reste au nominatif.', 'certes'));
  words.push(...head);
  if (n) words.push(subjW);
  else if (mod === 'none') words.push(W(P.ar, 'subj', 'pronom personnel sujet : **invariable** (pas de cas visible).', P.fr));
  // attribut
  const predWords = [];
  if (isPP) predWords.push(...ppWords());
  else {
    let af;
    if (mod === 'laysaBi') af = 'بِ' + adjForm(adj, g, 'gen', false);
    else af = adjForm(adj, g, predCase, false);
    predWords.push(W(af, 'pred', 'attribut (**khabar**) : **indéfini** et ' + ({ nom: 'au **nominatif** (-un)', acc: 'à l\'**accusatif** (-an) à cause de ' + (mod === 'kana' ? 'كَانَ' : 'لَيْسَ'), gen: 'au **génitif** (-in) à cause de بِـ' }[predCase]) + '. Il s\'accorde en genre avec le sujet' + (g === 'f' ? ' (féminin : ـَة)' : '') + '.', adj.fr[g === 'f' ? 1 : 0]));
  }
  words.push(...predWords);
  // français
  const subjFr = n ? frNP(n, true) : [P.fr];
  const p = n ? 2 : P.p;
  let verb;
  if (mod === 'kana') verb = [ETAIT[p]]; else if (mod.startsWith('laysa')) verb = ['ne', ETRE[p], 'pas']; else verb = [ETRE[p]];
  const predFr = isPP ? frPP() : [frAdjAgree(adj, gFr, false)];
  let fr = frJoin([...subjFr, ...verb, ...(mod === 'laysaBi' ? ['du', 'tout'] : []), ...predFr]);
  if (mod === 'laysaBi') fr = frJoin([...subjFr, ...verb, ...predFr, 'du', 'tout']);
  if (mod === 'inna') fr = 'certes, ' + fr;
  if (c.q) fr = frJoin(['est-ce', 'que', ...subjFr, ...verb, ...predFr]) + ' ?';
  if (!isPP && !c.q) notes.push('Il n\'y a pas de verbe « être » au présent : الْوَلَدُ كَبِيرٌ = « le garçon [est] grand ».');
  return { words: fixLiaison(words), fr: cap(fr), notes, warn };
}
function kanaPron(P) { return { anaM: 'كُنْتُ', anaF: 'كُنْتُ', anta: 'كُنْتَ', anti: 'كُنْتِ', huwa: 'كَانَ', hiya: 'كَانَتْ' }[P.id]; }
function laysaPron(P) { return { anaM: 'لَسْتُ', anaF: 'لَسْتُ', anta: 'لَسْتَ', anti: 'لَسْتِ', huwa: 'لَيْسَ', hiya: 'لَيْسَتْ' }[P.id]; }
function innaPron(P) { return { anaM: 'إِنِّي', anaF: 'إِنِّي', anta: 'إِنَّكَ', anti: 'إِنَّكِ', huwa: 'إِنَّهُ', hiya: 'إِنَّهَا' }[P.id]; }
function fixLiaison(words) { const ar = applyLiaison(words.map(w => w.ar)); words.forEach((w, i) => w.ar = ar[i]); return words; }

function buildVerbal(c) {
  // c : verb, tense, subjKind ('noun'|'pron'), subj, subjDef, pron, emph, order ('vso'|'svo'), obj ('none'|'noun'|'pron'), objNoun, objDef, pp (bool), prep, ppNoun, ppDef, passive, inna, q, qad
  const v = byId(VERBS, c.verb) || VERBS[0];
  const words = []; const notes = []; let warn = '';
  let tense = c.tense || 'past';
  const isImp = tense === 'imp' || tense === 'impNeg';
  let P = byId(PERS, c.pron) || PERS[4];
  let n = c.subjKind === 'noun' && !isImp ? byId(NOUNS, c.subj) : null;
  if (n && n.noSubjVerb) n = byId(NOUNS, 'walad');
  if (isImp && !['anta', 'anti', 'antum'].includes(P.id)) P = PERS[2];
  const objN = byId(NOUNS, c.objNoun) || byId(NOUNS, (v.obj || ['kitab'])[0]);
  const hasObj = v.tr && c.obj !== 'none';
  const objPron = hasObj && c.obj === 'pron';
  const passive = !!c.passive && v.tr && hasObj && !objPron && !isImp;
  const prep = byId(PREPS, c.prep) || byId(PREPS, v.prep || 'fi');
  const ppN = byId(NOUNS, c.ppNoun) || NOUNS[13];
  // personne grammaticale du verbe
  let pid = n ? (n.g === 'f' ? 'hiya' : 'huwa') : P.id;
  if (passive) pid = objN.g === 'f' ? 'hiya' : 'huwa';
  const vf = verbForm(v, pid, tense, passive);
  let verbAr = vf.v;
  if (objPron) verbAr = attachObj(verbAr, objN.g);
  const verbFull = vf.attached ? vf.pre + verbAr : verbAr;
  const moodTxt = { past: 'passé (accompli)', ind: 'présent, mode **indicatif** (finale -u / ـونَ)', subj: 'mode **subjonctif** (finale -a / ـوا) à cause de لَنْ', jus: 'mode **apocopé** (soukoun / ـوا) à cause de ' + (tense === 'impNeg' ? 'لَا de défense' : 'لَمْ'), imp: '**impératif** : on part de l\'apocopé, on enlève le préfixe تَـ et on ajoute un alif de liaison' }[vf.mood];
  const personTxt = passive ? 'au **passif** (voyelles u-i : ' + conjPast(v, 'huwa', true) + ') : ce n\'est plus « quelqu\'un fait », mais « la chose est faite ».' : (n ? '3e personne du singulier (' + (n.g === 'f' ? 'féminin ـَتْ / تَـ, car le sujet est féminin' : 'masculin') + ') : quand le sujet nom vient **après** le verbe, le verbe reste au **singulier**.' : 'conjugué à la personne « ' + P.fr + ' » : la terminaison ou le préfixe contient déjà le sujet, pas besoin de pronom.');
  const verbWhy = 'verbe ' + v.r.split('').join('-') + ' « ' + v.fr.inf + ' » : ' + moodTxt + ' ; ' + personTxt + (objPron ? ' Le pronom complément ' + (objN.g === 'f' ? 'ـهَا (la)' : 'ـهُ (le)') + ' est collé à la fin.' : '');
  const verbW = W(verbFull, 'verb', verbWhy + (v.note ? ' — ' + cap(v.note) : ''), v.fr.inf);
  const head = [];
  if (c.q) head.push(W('هَلْ', 'q', 'هَلْ : question oui / non.', 'est-ce que'));
  if (c.qad && tense === 'past') head.push(W('قَدْ', 'part', 'قَدْ + passé : « déjà, bel et bien » — l\'action est accomplie et c\'est sûr.', 'déjà'));
  if (vf.pre && !vf.attached) head.push(W(vf.pre, 'part', { 'سَوْفَ': 'سَوْفَ : futur (souvent plus lointain que سَـ).', 'لَمْ': 'لَمْ : négation du **passé**, mais suivie du **présent à l\'apocopé** (soukoun final) !', 'مَا': 'مَا + passé : autre négation du passé, plus narrative.', 'لَا': tense === 'impNeg' ? 'لَا de défense + apocopé : « ne fais pas ! »' : 'لَا : négation du présent (le verbe reste à l\'indicatif).', 'لَنْ': 'لَنْ : négation du **futur** (« ne … jamais / pas ») ; le verbe passe au **subjonctif** (-a).' }[vf.pre], 'négation / futur'));
  const subjInna = c.inna && n;
  const subjW = n ? W(caseEnding(n, subjInna ? 'acc' : 'nom', n.proper ? true : c.subjDef), 'subj', subjInna ? 'sujet placé après إِنَّ : il passe à l\'**accusatif** (-a), et le verbe vient après lui.' : 'sujet du verbe (**fāʿil**) : au **nominatif** (-u' + (n.proper || c.subjDef ? '' : 'n') + ').' + (n.diptote ? ' Diptote : pas de tanwīn.' : ''), n.fr[0]) : null;
  const objW = hasObj && !objPron ? W(caseEnding(objN, passive ? 'nom' : 'acc', objN.proper ? true : c.objDef), passive ? 'subj' : 'obj', passive ? 'ancien complément devenu **sujet du passif** (nāʾib al-fāʿil) : il passe au **nominatif** (-u) !' : 'complément d\'objet direct (**mafʿūl bihi**) : à l\'**accusatif** (-a' + (objN.proper || c.objDef ? '' : 'n') + ').' + (!c.objDef && !objN.proper && !objN.ar.endsWith('ة') ? ' L\'alif final ne se prononce pas : il porte seulement le tanwīn -an.' : ''), objN.fr[0]) : null;
  const ppArr = [];
  if (c.pp) {
    const nf = caseEnding(ppN, 'gen', ppN.proper ? true : c.ppDef);
    const att = withPrep(prep, nf);
    if (att) ppArr.push(W(att, 'pp', 'préposition ' + prep.ar + ' collée + nom au **génitif**.', prep.fr + ' + ' + ppN.fr[0]));
    else ppArr.push(W(prep.ar, 'prep', 'préposition « ' + prep.fr + ' » → génitif.', prep.fr), W(nf, 'gen', 'nom au **génitif** après ' + prep.ar + '.', ppN.fr[0]));
  }
  words.push(...head);
  if (c.inna && n) words.push(W('إِنَّ', 'inna', 'إِنَّ « certes » devant une phrase verbale : le sujet passe devant le verbe et à l\'accusatif.', 'certes'), subjW, verbW);
  else if (n && c.order === 'svo' && !passive) { words.push(subjW, verbW); notes.push('Ordre sujet-verbe : la phrase devient **nominale** (le sujet est mis en avant). Au pluriel, le verbe s\'accorderait alors en nombre.'); }
  else {
    if (!n && c.emph && !isImp && !passive) words.push(W(P.ar, 'subj', 'pronom ajouté pour **insister** : « moi, j\'… ». Il n\'est pas obligatoire car le verbe contient déjà la personne.', P.fr));
    words.push(verbW);
    if (passive) { if (objW) words.push(objW); }
    else if (n) words.push(subjW);
  }
  if (objW && !passive) words.push(objW);
  words.push(...ppArr);
  // français
  const p = n ? 2 : P.p;
  const subjFr = passive ? frNP(objN, objN.proper || c.objDef) : (n ? frNP(n, n.proper || c.subjDef) : [P.fr]);
  const gSubj = passive ? objN.fr[1] : (n ? n.fr[1] : P.g);
  const clitic = objPron ? { t: objN.fr[1] === 'f' ? 'la' : 'le', g: objN.fr[1] } : null;
  let vp;
  if (isImp) {
    if (tense === 'imp') {
      let f = v.fr.pres[P.p]; if (P.p === 1 && /es$/.test(f)) f = f.slice(0, -1); if (f === 'vas') f = 'va';
      vp = [f + (clitic ? '-' + clitic.t : '')];
    } else vp = ['ne', ...(clitic ? [clitic.t] : []), (v.fr.pres[P.p]), 'pas'];
  } else vp = frVerbPhrase(v.fr, tense, passive ? 2 : p, gSubj, passive ? false : (!n && P.pl), clitic, passive);
  if (c.qad && tense === 'past' && !passive) { const i = vp.length - 1; vp.splice(i, 0, 'déjà'); }
  const objFr = hasObj && !objPron && !passive ? frNP(objN, objN.proper || c.objDef) : [];
  const ppFr = c.pp ? [v.prepFr && prep.id === v.prep ? v.prepFr : prep.id === 'bi' ? 'avec' : prep.fr, ...frNP(ppN, ppN.proper || c.ppDef)] : [];
  const emph = !n && c.emph && !isImp && !passive ? [P.em + ','] : [];
  let fr = frJoin([...emph, ...(isImp ? [] : subjFr), ...vp, ...objFr, ...ppFr]);
  if (c.inna && n) fr = 'certes, ' + fr;
  if (c.q) fr = frJoin(['est-ce', 'que', ...(isImp ? [] : subjFr), ...vp, ...objFr, ...ppFr]) + ' ?';
  if (tense === 'negPastLam') notes.push('Astuce : لَمْ + présent apocopé = « n\'a pas fait ». C\'est la négation du passé la plus courante en arabe littéraire (et dans le Coran : لَمْ يَلِدْ).');
  if (passive) notes.push('Au passif, l\'auteur de l\'action disparaît : on ne dit pas « par qui ».');
  if (!v.tr && c.obj && c.obj !== 'none') notes.push('Ce verbe est intransitif : il n\'a pas de complément d\'objet direct ; on utilise une préposition (' + (byId(PREPS, v.prep) || PREPS[0]).ar + ').');
  return { words: fixLiaison(words), fr: cap(fr), notes, warn, verb: v, pid };
}

function buildNP(c) {
  // groupe nominal : noun, def ('indef'|'def'|'idafa'), noun2, def2, adj (id|''), adjTarget (1|2), cas ('nom'|'acc'|'gen')
  const n = byId(NOUNS.filter(x => !x.proper), c.noun) || NOUNS[7];
  const n2 = byId(NOUNS, c.noun2) || NOUNS[2];
  const adj = c.adj ? byId(ADJS, c.adj) : null;
  const cas = c.cas || 'nom';
  const words = []; const notes = [];
  const casName = { nom: 'nominatif (-u)', acc: 'accusatif (-a)', gen: 'génitif (-i)' }[cas];
  if (c.def === 'idafa') {
    const d2 = n2.proper ? true : c.def2;
    words.push(W(caseEnding(n, cas, 'construct'), 'head', '1er terme de l\'**annexion** (iḍāfa) : **ni ال ni tanwīn**, mais il est défini grâce au 2e terme. Son cas dépend de sa place dans la phrase : ici ' + casName + '.', n.fr[0]));
    words.push(W(caseEnding(n2, 'gen', d2), 'gen', '2e terme de l\'annexion : **toujours au génitif** (« de … »)' + (n2.diptote ? ' ; diptote, donc -a sans tanwīn' : '') + '.', n2.fr[0]));
    if (adj) {
      const t2 = c.adjTarget === 2;
      const g = t2 ? n2.g : n.g;
      const af = adjForm(adj, g, t2 ? 'gen' : cas, t2 ? d2 : d2);
      words.push(W(af, 'adj', 'adjectif placé **après toute l\'annexion**. Il qualifie le ' + (t2 ? '2e' : '1er') + ' nom : il copie son cas (' + (t2 ? 'génitif' : casName) + '), son genre et sa définition' + (d2 ? ' (ال)' : ' (tanwīn)') + '. C\'est sa **voyelle finale** qui dit de quel nom il parle !', adj.fr[0]));
      notes.push('Change « l\'adjectif qualifie » : seule la dernière voyelle de l\'adjectif change, et pourtant le sens change ! كِتَابُ الطَّالِبِ الْكَبِيرُ = le grand livre de l\'étudiant ; كِتَابُ الطَّالِبِ الْكَبِيرِ = le livre du grand étudiant.');
    }
    let fr;
    const np1 = frNP(n, d2, adj && c.adjTarget !== 2 ? adj : null);
    const np2 = frNP(n2, d2, adj && c.adjTarget === 2 ? adj : null);
    fr = frJoin([...np1, 'de', ...np2]);
    return { words: fixLiaison(words), fr: cap(fr), notes };
  }
  const def = c.def === 'def';
  words.push(W(caseEnding(n, cas, def), 'head', (def ? 'nom **défini** par ال : une seule voyelle finale, jamais de tanwīn. ' : 'nom **indéfini** : le tanwīn (voyelle doublée) signifie « un, une ». ') + 'Cas : ' + casName + '.' + (cas === 'acc' && !def && !n.ar.endsWith('ة') ? ' À l\'accusatif indéfini, on ajoute un alif muet : ـًا.' : ''), n.fr[0]));
  if (adj) words.push(W(adjForm(adj, n.g, cas, def), 'adj', 'adjectif : il se place **après** le nom et copie **tout** : le cas, le genre' + (n.g === 'f' ? ' (féminin ـَة)' : '') + ' et la définition (' + (def ? 'ال' : 'tanwīn') + ').', adj.fr[0]));
  notes.push({ nom: 'Au nominatif, ce groupe peut être le sujet : « ' + frJoin(frNP(n, def, adj)) + ' est… ».', acc: 'À l\'accusatif, il peut être le complément d\'objet : « j\'ai vu ' + frJoin(frNP(n, def, adj)) + ' ».', gen: 'Au génitif, il suit une préposition : « dans ' + frJoin(frNP(n, def, adj)) + ' ».' }[cas]);
  return { words: fixLiaison(words), fr: cap(frJoin(frNP(n, def, adj))), notes };
}

function buildSentence(cfg) {
  if (cfg.type === 'verbal') return buildVerbal(cfg);
  if (cfg.type === 'np') return buildNP(cfg);
  return buildNominal(cfg);
}

/* « Comment j'aurais pu le dire autrement ? » : variantes automatiques */
function variantsOf(cfg) {
  const out = [];
  const add = (label, change, explain) => {
    const c = Object.assign({}, cfg, change);
    try { const r = buildSentence(c); out.push({ label, cfg: c, ar: r.words.map(w => w.ar).join(' '), fr: r.fr, explain }); } catch (e) { /* ignore */ }
  };
  if (cfg.type === 'nominal') {
    const mod = cfg.mod || 'none';
    if (mod !== 'none') add('Sans mot d\'introduction', { mod: 'none' }, 'la phrase de base : sujet et attribut au nominatif.');
    if (mod !== 'kana') add('Au passé avec كَانَ', { mod: 'kana' }, 'كَانَ met l\'attribut à l\'accusatif : -un devient -an.');
    if (mod !== 'inna') add('Avec insistance : إِنَّ', { mod: 'inna' }, 'إِنَّ met le sujet à l\'accusatif : -u devient -a.');
    if (mod !== 'laysa') add('À la forme négative : لَيْسَ', { mod: 'laysa' }, 'لَيْسَ met l\'attribut à l\'accusatif.');
    if (cfg.pred !== 'pp' && mod !== 'laysaBi') add('Négation renforcée : لَيْسَ … بِـ', { mod: 'laysaBi' }, 'avec بِـ, l\'attribut passe au génitif : -in.');
    if (!cfg.q) add('En question', { q: true }, 'هَلْ devant la phrase ; rien d\'autre ne change.');
    if (cfg.subjKind === 'noun' && cfg.pred !== 'pp') {
      const n = byId(NOUNS, cfg.subj);
      if (n && !n.proper) {
        const t = buildNP({ type: 'np', noun: n.id, def: 'def', adj: cfg.adj, cas: 'nom' });
        out.push({ label: 'Et si l\'adjectif avait ال ?', ar: t.words.map(w => w.ar).join(' '), fr: t.fr + ' (…)', explain: 'avec ال sur les deux mots, ce n\'est plus une phrase mais un groupe : « ' + t.fr.toLowerCase() + ' », qui attend la suite.', cfg: { type: 'np', noun: n.id, def: 'def', adj: cfg.adj, cas: 'nom' } });
        const sep = caseEnding(n, 'nom', true) + ' ' + (n.g === 'f' ? 'هِيَ' : 'هُوَ') + ' ' + adjForm(byId(ADJS, cfg.adj) || ADJS[0], n.g, 'nom', true);
        out.push({ label: 'Pronom de séparation', ar: sep, fr: 'C\'est ' + frJoin(frNP(n, true)).toLowerCase() + ' qui est ' + (n.fr[1] === 'f' ? 'la ' : 'le ') + ((byId(ADJS, cfg.adj) || ADJS[0]).fr[n.fr[1] === 'f' ? 1 : 0]) + ' (et pas un autre)', explain: 'un pronom هُوَ / هِيَ entre deux mots définis : la phrase redevient complète et insiste.', cfg: null });
      }
    }
    if (cfg.subjKind === 'noun' && cfg.subjDef === false) add('Avec un sujet défini', { subjDef: true }, 'avec ال, le sujet peut ouvrir la phrase.');
  } else if (cfg.type === 'verbal') {
    const t = cfg.tense || 'past';
    ['past', 'pres', 'fut', 'negPastLam', 'negFut'].filter(x => x !== t).forEach(x => add(byId(TENSES, x).label, { tense: x }, {
      past: 'le passé : la personne est à la fin du verbe.', pres: 'le présent : la personne est au début (préfixe) et la fin -u = indicatif.',
      fut: 'سَـ collé au présent = futur proche.', negPastLam: 'لَمْ + soukoun final : « n\'a pas ».', negFut: 'لَنْ + -a final : « ne … pas » au futur.',
    }[x]));
    if (cfg.subjKind === 'noun' && cfg.order !== 'svo' && !cfg.passive) add('Le sujet en premier', { order: 'svo' }, 'phrase nominale : on met le sujet en avant.');
    if (cfg.subjKind === 'noun' && !cfg.inna) add('Avec insistance : إِنَّ', { inna: true }, 'إِنَّ + sujet à l\'accusatif, puis le verbe.');
    if (cfg.subjKind === 'noun') add('Avec un pronom à la place du sujet', { subjKind: 'pron', pron: (byId(NOUNS, cfg.subj) || {}).g === 'f' ? 'hiya' : 'huwa' }, 'le sujet disparaît : il est contenu dans le verbe.');
    const v = byId(VERBS, cfg.verb);
    if (v && v.tr && cfg.obj === 'noun') add('Le complément remplacé par un pronom', { obj: 'pron' }, 'le complément devient un petit pronom collé au verbe : ـهُ / ـهَا.');
    if (v && v.tr && cfg.obj === 'noun' && !cfg.passive && !/imp/.test(t)) add('Au passif', { passive: true }, 'les voyelles du verbe deviennent u-i ; le complément devient sujet et passe au nominatif.');
    if (t === 'past' && !cfg.qad) add('Avec قَدْ', { qad: true }, 'قَدْ + passé : « déjà, bel et bien ».');
    if (!cfg.q) add('En question', { q: true }, 'هَلْ devant la phrase.');
  } else if (cfg.type === 'np') {
    ['nom', 'acc', 'gen'].filter(x => x !== cfg.cas).forEach(x => add({ nom: 'Au nominatif', acc: 'À l\'accusatif', gen: 'Au génitif' }[x], { cas: x }, 'seules les dernières voyelles changent.'));
    if (cfg.def !== 'def') add('Défini (avec ال)', { def: 'def' }, 'ال remplace le tanwīn.');
    if (cfg.def !== 'indef') add('Indéfini (tanwīn)', { def: 'indef' }, 'le tanwīn = « un, une ».');
    if (cfg.def !== 'idafa') add('Annexion « le … de … »', { def: 'idafa' }, 'le 1er nom perd ال et tanwīn, le 2e passe au génitif.');
    if (cfg.def === 'idafa' && cfg.adj) add('L\'adjectif qualifie l\'autre nom', { adjTarget: cfg.adjTarget === 2 ? 1 : 2 }, 'une seule voyelle change… et le sens aussi !');
  }
  return out;
}

/* Tableau de conjugaison complet d'un verbe */
function conjugationTable(vid) {
  const v = byId(VERBS, vid) || VERBS[0];
  const rows = PERS.filter(p => p.id !== 'anaF').map(p => ({
    p, past: conjPast(v, p.id), pres: conjPresent(v, p.id, 'ind'), subj: conjPresent(v, p.id, 'subj'), jus: conjPresent(v, p.id, 'jus'),
    imp: ['anta', 'anti', 'antum'].includes(p.id) ? conjImperative(v, p.id) : '',
  }));
  return { v, rows };
}
