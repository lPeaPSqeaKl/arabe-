/* ====================================================================
 * 02 - Grammaire : explication des signes et des étiquettes du corpus
 * ==================================================================== */

const PERSONS = {
  '1S': ['je', 'я'], '1P': ['nous', 'мы'], '2MS': ['tu (homme)', 'ты (м.)'], '2FS': ['tu (femme)', 'ты (ж.)'],
  '2MP': ['vous (hommes)', 'вы (м.)'], '2FP': ['vous (femmes)', 'вы (ж.)'], '2D': ['vous deux', 'вы двое'], '2MD': ['vous deux', 'вы двое'], '2FD': ['vous deux (f.)', 'вы двое (ж.)'],
  '3MS': ['il', 'он'], '3FS': ['elle', 'она'], '3MP': ['ils', 'они (м.)'], '3FP': ['elles', 'они (ж.)'], '3D': ['eux deux', 'они двое'], '3MD': ['eux deux', 'они двое'], '3FD': ['elles deux', 'они двое (ж.)'],
};
const PRON_SUFFIX_FR = { '1S': 'moi / mon, ma', '1P': 'nous / notre', '2MS': 'toi / ton, ta', '2FS': 'toi (f.) / ton, ta', '2MP': 'vous / votre', '2FP': 'vous (f.) / votre', '2D': 'vous deux', '3MS': 'lui, le / son, sa', '3FS': 'elle, la / son, sa', '3MP': 'eux, les / leur', '3FP': 'elles, les / leur', '3D': 'eux deux / leur', '3MD': 'eux deux', '3FD': 'elles deux' };
const GN = { M: 'masculin', F: 'féminin', MS: 'masculin singulier', FS: 'féminin singulier', MP: 'masculin pluriel', FP: 'féminin pluriel', MD: 'masculin duel', FD: 'féminin duel', P: 'pluriel', D: 'duel', S: 'singulier' };
const CASES = {
  NOM: { ar: 'مَرْفُوع', tr: 'marfūʿ (rafʿ)', fr: 'nominatif', ru: 'именительный', sign: 'ـُ / ـٌ (-u / -un)', color: 'nom' },
  ACC: { ar: 'مَنْصُوب', tr: 'manṣūb (naṣb)', fr: 'accusatif', ru: 'винительный', sign: 'ـَ / ـً (-a / -an)', color: 'acc' },
  GEN: { ar: 'مَجْرُور', tr: 'majrūr (jarr)', fr: 'génitif', ru: 'родительный / предложный', sign: 'ـِ / ـٍ (-i / -in)', color: 'gen' },
};
const MOODS = {
  IND: { ar: 'مَرْفُوع', fr: 'indicatif', sign: 'ـُ (-u) ou ـونَ / ـينَ', why: 'c\'est le mode normal du présent : aucun petit mot ne le change.' },
  SUBJ: { ar: 'مَنْصُوب', fr: 'subjonctif', sign: 'ـَ (-a), et ـونَ devient ـوا', why: 'il suit un mot comme أَنْ (que), لَنْ (ne… jamais), كَيْ / لِـ (pour que), حَتَّى (jusqu\'à ce que).' },
  JUS: { ar: 'مَجْزُوم', fr: 'apocopé (jussif)', sign: 'ـْ (soukoun), et ـونَ devient ـوا', why: 'il suit لَمْ (ne… pas, au passé), لَمَّا, لَا d\'interdiction, لِـ d\'ordre, ou une condition (إِنْ).' },
};
const VERB_FORMS = {
  1: ['I', 'فَعَلَ', 'forme de base'],
  2: ['II', 'فَعَّلَ', 'shadda sur la 2e lettre : intensif ou « faire faire » (عَلِمَ savoir → عَلَّمَ enseigner)'],
  3: ['III', 'فَاعَلَ', 'alif après la 1re lettre : faire avec / envers quelqu\'un (قَتَلَ tuer → قَاتَلَ combattre)'],
  4: ['IV', 'أَفْعَلَ', 'préfixe أَ : « faire faire » (خَرَجَ sortir → أَخْرَجَ faire sortir)'],
  5: ['V', 'تَفَعَّلَ', 'تَ + forme II : le faire pour soi (عَلَّمَ enseigner → تَعَلَّمَ apprendre)'],
  6: ['VI', 'تَفَاعَلَ', 'تَ + forme III : réciprocité, « les uns les autres »'],
  7: ['VII', 'اِنْفَعَلَ', 'préfixe اِنْ : subir l\'action (قَلَبَ retourner → اِنْقَلَبَ se retourner)'],
  8: ['VIII', 'اِفْتَعَلَ', 'ت inséré après la 1re lettre : réfléchi, « pour soi » (هَدَى guider → اِهْتَدَى être bien guidé)'],
  9: ['IX', 'اِفْعَلَّ', 'couleurs et défauts (اِبْيَضَّ devenir blanc)'],
  10: ['X', 'اِسْتَفْعَلَ', 'préfixe اِسْتَ : demander, chercher (غَفَرَ pardonner → اِسْتَغْفَرَ demander pardon)'],
  11: ['XI', 'اِفْعَالَّ', 'couleurs (rare)'],
  12: ['XII', 'اِفْعَوْعَلَ', 'rare'],
};
const POS_NAMES = {
  PN: 'nom propre', PRON: 'pronom personnel', DEM: 'démonstratif', REL: 'pronom relatif', ADJ: 'adjectif', ACT_PCPL: 'participe actif (celui qui fait)',
  PASS_PCPL: 'participe passif (celui qui subit)', VN: 'nom verbal (maṣdar)', LOC: 'adverbe de lieu', T: 'adverbe de temps', COND: 'mot de condition', INTG: 'mot interrogatif',
};
const PARTICLES = {
  P: 'préposition : met le nom qui suit au génitif (jarr)', CONJ: 'conjonction de coordination (et, puis, ou…)', SUB: 'conjonction de subordination (que…)', NEG: 'négation',
  ACC: 'particule « inna et ses sœurs » : le nom qui suit passe à l\'accusatif', COND: 'particule de condition (si…)', RES: 'restriction (« ne … que »)', CERT: 'particule de certitude : devant un passé, « déjà, certes »',
  PRO: 'لَا d\'interdiction : « ne … pas ! » (verbe à l\'apocopé)', PREV: 'mā « qui empêche » : il annule l\'effet de inna', RET: 'rétractation : « mais plutôt, bien au contraire »', EXP: 'exception (sauf)',
  INTG: 'particule interrogative', AMD: 'correction : « mais »', EXL: 'explication : « quant à »', INT: 'interprétation : « c\'est-à-dire »', INC: 'particule de début (« jusqu\'à ce que… alors »)',
  FUT: 'particule du futur', EXH: 'exhortation : « pourquoi ne… pas ? »', SUR: 'surprise : « et voici que… »', ATT: 'attention : « attention ! voici… »', AVR: 'refus énergique : « non, jamais ! »',
  ANS: 'particule de réponse (oui, si…)', SUP: 'particule supplémentaire (insistance)', INL: 'lettres isolées du début de sourate (leur sens n\'est connu que d\'Allah)', EQ: 'équivalence : « que … ou … »', CIRC: 'circonstance', CAUS: 'cause', COM: 'accompagnement « avec »',
};
const PREFIX_EXPL = {
  'DET|ال': ['article', 'l\'article « le, la » (al-) : le mot devient défini, et il ne peut plus avoir de tanwīn'],
  'CONJ|و': ['et', 'وَ « et » : relie ce mot au précédent'], 'CONJ|ف': ['et alors', 'فَ « et (aussitôt), alors » : la suite vient juste après'],
  'REM|ف': ['alors', 'فَ de reprise : « or, alors »'], 'REM|و': ['et', 'وَ de reprise : ouvre une nouvelle phrase'], 'CIRC|و': ['alors que', 'وَ de circonstance : « alors que »'],
  'SUP|ف': ['donc', 'فَ de liaison (souvent dans la réponse d\'une condition)'], 'SUP|و': ['et', 'وَ d\'insistance'], 'RSLT|ف': ['alors, donc', 'فَ de résultat : « alors, donc »'], 'CAUS|ف': ['pour que', 'فَ de cause : « pour que » (verbe au subjonctif)'],
  'P|ب': ['par, avec', 'بِ préposition « par, avec, au nom de » : le nom qui suit passe au génitif (-i)'],
  'P|ل': ['à, pour', 'لِ préposition « à, pour » : le nom qui suit passe au génitif (-i) ; devant un pronom elle devient لَ'],
  'P|ك': ['comme', 'كَ préposition « comme » : le nom qui suit passe au génitif'], 'P|و': ['par (serment)', 'وَ du serment : « Par … ! », le nom qui suit est au génitif'],
  'P|ت': ['par (serment)', 'تَ du serment : « Par Allah ! » (تَاللَّهِ)'], 'EMPH|ل': ['certes', 'لَ d\'insistance : « certes, assurément »'],
  'PRP|ل': ['pour que', 'لِ de but : « pour que », le verbe passe au subjonctif (-a)'], 'IMPV|ل': ['qu\'il…', 'لِ d\'ordre : « qu\'il fasse… ! », le verbe passe à l\'apocopé (ـْ)'],
  'INTG|أ': ['est-ce que ?', 'أَ interrogatif : « est-ce que… ? »'], 'EQ|أ': ['que … ou', 'أَ d\'équivalence : « que … ou … »'], 'VOC|ي': ['ô !', 'يَا d\'appel : « ô ! »'],
  'ATT|ه': ['voici', 'هَا d\'attention (هَٰذَا = « ceci »)'], 'FUT|س': ['futur', 'سَ du futur : « va…, bientôt »'], 'COM|و': ['avec', 'وَ d\'accompagnement : « avec »'],
};

function parseFeats(pos, feats) {
  const t = (feats || '').split('|');
  const f = { pos, tags: t, sub: '', gn: '', person: '', cas: '', mood: '', aspect: '', pass: false, form: 0, indef: false, pref: t.includes('PREF'), suff: t.includes('SUFF'), lem: '', fam: '' };
  for (const x of t) {
    if (x.startsWith('LEM:')) f.lem = x.slice(4);
    else if (x.startsWith('FAM:')) f.fam = x.slice(4);
    else if (x.startsWith('MOOD:')) f.mood = x.slice(5);
    else if (x.startsWith('VF:')) f.form = +x.slice(3);
    else if (x === 'NOM' || x === 'ACC' && pos === 'N' || x === 'GEN') f.cas = x;
    else if (x === 'INDEF') f.indef = true;
    else if (x === 'PASS') f.pass = true;
    else if (x === 'PERF' || x === 'IMPF' || x === 'IMPV') f.aspect = x;
    else if (PERSONS[x] && !f.person) f.person = x;
    else if (GN[x] && !f.gn) f.gn = x;
    else if (POS_NAMES[x] && pos === 'N' && !f.sub) f.sub = x;
    else if (PARTICLES[x] && pos === 'P' && !f.sub && x !== 'PREF' && x !== 'SUFF') f.sub = x;
  }
  if (pos === 'P' && t[0] && PARTICLES[t[0]]) f.sub = t[0];
  if (pos === 'P' && t[0] === 'ACC') f.sub = 'ACC';
  if (pos === 'N' && t.includes('ACC') && !f.cas) f.cas = 'ACC';
  return f;
}

/* Rôle d'un segment à l'intérieur d'un mot */
function segmentRole(seg, idx, word) {
  const [text, pos, feats] = seg;
  const f = parseFeats(pos, feats);
  if (f.pref) {
    const key = f.tags[0] === 'DET' ? 'DET|ال' : f.tags[0] + '|' + (f.lem || '').replace(/[ً-ْٰ]/g, '').slice(0, 1);
    const e = PREFIX_EXPL[key];
    return { kind: 'pref', label: e ? e[0] : 'préfixe', text: e ? e[1] : 'préfixe (' + (PARTICLES[f.tags[0]] || f.tags[0]) + ')' };
  }
  if (f.suff) {
    if (f.tags[0] === 'PRON') {
      const host = word.find(s => !parseFeats(s[1], s[2]).pref && !parseFeats(s[1], s[2]).suff);
      const hf = host ? parseFeats(host[1], host[2]) : null;
      const firstSuffix = word.findIndex(s => parseFeats(s[1], s[2]).suff) === idx;
      if (hf && hf.pos === 'V' && firstSuffix && hf.person === f.person && isSubjectSuffix(hf, f.person)) {
        return { kind: 'subj', label: 'terminaison', text: 'terminaison de personne du verbe : « ' + PERSONS[f.person][0] + ' » (c\'est le sujet, collé au verbe)' };
      }
      const who = PRON_SUFFIX_FR[f.person] || f.person;
      if (hf && hf.pos === 'V') return { kind: 'obj', label: 'pronom COD', text: 'pronom complément collé au verbe : « ' + who.split(' / ')[0] + ' »' };
      if (hf && hf.pos === 'P') return { kind: 'pron', label: 'pronom', text: 'pronom collé à la préposition : « ' + who.split(' / ')[0] + ' »' };
      return { kind: 'poss', label: 'possessif', text: 'pronom possessif collé au nom : « ' + (who.split(' / ')[1] || who) + ' » (le nom est alors défini, sans tanwīn ni ال)' };
    }
    if (f.tags[0] === 'EMPH') return { kind: 'suff', label: 'insistance', text: 'nūn d\'insistance : renforce le verbe (« assurément… »)' };
    if (f.tags[0] === 'ADDR') return { kind: 'suff', label: 'adresse', text: 'ـكَ d\'adresse (dans ذَٰلِكَ, أُولَٰئِكَ) : indique à qui l\'on parle, sans sens de « toi »' };
    if (f.tags[0] === 'DIST') return { kind: 'suff', label: 'éloignement', text: 'لِ d\'éloignement : « cela, là-bas » (ذَٰلِكَ = celui-là)' };
    if (f.tags[0] === 'VOC') return { kind: 'suff', label: 'appel', text: 'ـمَّ d\'appel : اللَّهُمَّ = « ô Allah ! »' };
    if (f.tags[0] === 'ATT') return { kind: 'suff', label: 'attention', text: 'هَا d\'attention' };
    return { kind: 'suff', label: 'suffixe', text: 'suffixe' };
  }
  return { kind: 'stem', label: 'mot', text: '' };
}
function isSubjectSuffix(hf, person) {
  if (hf.aspect === 'PERF') return !['3MS', '3FS'].includes(person);
  if (hf.aspect === 'IMPF') return ['2FS', '2MP', '3MP', '2FP', '3FP', '2D', '3D', '3MD', '3FD', '2MD'].includes(person);
  if (hf.aspect === 'IMPV') return ['2FS', '2MP', '2FP', '2D', '2MD'].includes(person);
  return false;
}

function stemOf(word) {
  for (let i = 0; i < word.length; i++) {
    const f = parseFeats(word[i][1], word[i][2]);
    if (!f.pref && !f.suff) return { seg: word[i], idx: i, f };
  }
  return { seg: word[0], idx: 0, f: parseFeats(word[0][1], word[0][2]) };
}

/* Explication détaillée d'un mot du Coran, avec son contexte (mots voisins) */
function explainQuranWord(words, wi, lemmas) {
  const word = words[wi];
  const st = stemOf(word); const f = st.f;
  const lem = st.seg[3] >= 0 && lemmas ? lemmas[st.seg[3]] : null;
  const prev = wi > 0 ? words[wi - 1] : null;
  const prev2 = wi > 1 ? words[wi - 2] : null;
  const res = { title: '', gloss: lem ? lem[4] : '', lemma: lem ? lem[0] : '', root: lem ? lem[3] : '', count: lem ? lem[5] : 0, facts: [], why: [], tags: [], segs: [] };
  word.forEach((s, i) => res.segs.push(Object.assign({ ar: s[0] }, segmentRole(s, i, word))));
  const prepBefore = word.slice(0, st.idx).some(s => parseFeats(s[1], s[2]).tags[0] === 'P') || (prev && lastSegF(prev).pos === 'P' && lastSegF(prev).sub === 'P');
  const prepName = prepBefore ? (word.slice(0, st.idx).find(s => parseFeats(s[1], s[2]).tags[0] === 'P') || (prev ? prev[prev.length - 1] : null)) : null;

  if (f.pos === 'V') {
    res.title = 'Verbe';
    const asp = { PERF: 'accompli (passé)', IMPF: 'inaccompli (présent / futur)', IMPV: 'impératif (ordre)' }[f.aspect] || '';
    res.facts.push(['Temps', asp]);
    if (f.person) res.facts.push(['Personne', PERSONS[f.person][0] + ' · ' + PERSONS[f.person][1]]);
    if (f.pass) res.facts.push(['Voix', 'passive : le sujet subit l\'action (voyelle u au début)']);
    if (f.form) { const vf = VERB_FORMS[f.form]; if (vf) res.facts.push(['Forme', vf[0] + ' ' + vf[1] + ' — ' + vf[2]]); }
    if (f.mood) {
      const md = MOODS[f.mood];
      res.facts.push(['Mode', md.fr + ' (' + md.ar + ')']);
      res.why.push(moodReason(f.mood, word, prev, prev2));
    } else if (f.aspect === 'PERF') {
      res.why.push(R('Le passé arabe ne change pas selon les cas : sa fin indique la personne (ـَ il, ـَتْ elle, ـْتُ je, ـْتَ tu, ـْنَا nous, ـُوا ils…).', 'Прошедшее время не меняется по наклонениям : окончание показывает лицо (ـَ он, ـَتْ она, ـْتُ я, ـْتَ ты, ـْنَا мы, ـُوا они…).'));
    } else if (f.aspect === 'IMPV') {
      res.why.push(R('L\'impératif se forme sur l\'apocopé : il finit par un soukoun (ou perd sa dernière voyelle longue) — « fais ! ».', 'Повелительное наклонение образуется от усечённого : на конце сукӯн (или выпадает долгая гласная) — «делай!».'));
    }
    res.tags.push('verbe');
  } else if (f.pos === 'N') {
    const sub = f.sub;
    res.title = sub ? cap(POS_NAMES[sub]) : 'Nom';
    if (f.gn) res.facts.push(['Genre / nombre', GN[f.gn]]);
    if (f.person && sub === 'PRON') res.facts.push(['Personne', PERSONS[f.person][0] + ' · ' + PERSONS[f.person][1]]);
    const hasDet = word.some(s => parseFeats(s[1], s[2]).tags[0] === 'DET');
    const hasPoss = word.some((s, i) => i > st.idx && parseFeats(s[1], s[2]).tags[0] === 'PRON');
    if (f.indef) res.facts.push(['Défini ?', 'indéfini : il porte le tanwīn (« un, une »)']);
    else if (hasDet) res.facts.push(['Défini ?', 'défini par l\'article ال']);
    else if (hasPoss) res.facts.push(['Défini ?', 'défini par le pronom possessif collé']);
    else if (sub === 'PN') res.facts.push(['Défini ?', 'nom propre : défini par nature']);
    else if (prev && stemOf(prev).f.fam === 'إِنّ' && /^لَا$/.test(stemOf(prev).seg[0]) && f.cas === 'ACC') res.facts.push(['Défini ?', 'ni ال ni tanwīn : après لَا de négation absolue, le nom perd son tanwīn (« aucun … »)']);
    else if (f.cas && !['PRON', 'DEM', 'REL'].includes(sub) && words[wi + 1] && stemOf(words[wi + 1]).f.pos === 'N' && stemOf(words[wi + 1]).f.cas === 'GEN') res.facts.push(['Défini ?', 'défini par le nom qui le suit (1er terme d\'une annexion, « le … de … ») — donc ni ال ni tanwīn']);
    if (f.form && (sub === 'ACT_PCPL' || sub === 'PASS_PCPL' || sub === 'VN')) { const vf = VERB_FORMS[f.form]; if (vf) res.facts.push(['Tiré du verbe', 'forme ' + vf[0] + ' ' + vf[1]]); }
    if (f.cas) {
      const c = CASES[f.cas];
      res.facts.push(['Cas', c.fr + ' — ' + c.tr + ' ' + c.ar + ' · ' + c.ru]);
      res.why.push(caseReason(f, word, st, prev, prev2, prepBefore, prepName));
      const lastU = units(st.seg[0]).filter(u => u.b).pop();
      if (f.cas === 'GEN' && lastU && lastU.m.includes(AR.FATHA) && !/(ين|ات)$/.test(skeleton(st.seg[0]))) res.why.push(R('Il finit par -a alors qu\'il est au génitif : c\'est un **diptote** (nom propre étranger, schème أَفْعَل, certains pluriels…). Les diptotes n\'ont jamais de tanwīn et font leur génitif en -a.', 'Окончание -a в джарре : это **двухпадежное** имя (иностранное имя, модель أَفْعَل, некоторые множественные…) — без танвина, джарр на -a.'));
      if (/^(MP)$/.test(f.gn) && /ونَ?$|ونَ$/.test(st.seg[0])) res.why.push('Pluriel masculin « sain » : au nominatif il finit par ـُونَ (-ūna) au lieu de -u.');
      if (/^(MP)$/.test(f.gn) && /ينَ?$/.test(st.seg[0])) res.why.push('Pluriel masculin « sain » : à l\'accusatif et au génitif il finit par ـِينَ (-īna) au lieu de -a / -i.');
      if (/^(FP)$/.test(f.gn) && /ٰتِ|اتِ|ٰتٍ|اتٍ/.test(st.seg[0]) && f.cas === 'ACC') res.why.push('Pluriel féminin « sain » (ـَات) : son accusatif se fait en -i, comme le génitif !');
      res.tags.push(f.cas);
    } else if (['PRON', 'DEM', 'REL'].includes(sub)) {
      res.why.push(R('Ce mot est **invariable** (mabnī) : sa fin ne change jamais, quelle que soit sa fonction.', 'Это слово **несклоняемое** (мабнӣ) : его окончание никогда не меняется.'));
    }
  } else {
    res.title = 'Particule';
    if (f.sub && PARTICLES[f.sub]) res.facts.push(['Rôle', PARTICLES[f.sub]]);
    if (f.fam === 'إِنّ' && /^لَا$/.test(st.seg[0])) res.why.push('لَا de **négation absolue** (« il n\'y a aucun … ») : elle fonctionne comme إِنَّ, le nom qui suit passe à l\'**accusatif sans tanwīn** (لَا رَيْبَ = aucun doute).');
    else if (f.fam === 'إِنّ') res.why.push('« إِنَّ et ses sœurs » (إِنَّ، أَنَّ، كَأَنَّ، لَكِنَّ، لَيْتَ، لَعَلَّ) : le nom qui suit passe à l\'**accusatif** (-a).');
    if (f.fam === 'كَان') res.why.push('Cette négation fonctionne comme لَيْسَ : l\'attribut passe à l\'accusatif.');
    res.why.push(R('Les particules sont **invariables** : leur dernière voyelle ne change pas avec la fonction (sauf liaison, comme مِنْ → مِنَ devant ال).', 'Частицы **не изменяются** : их последняя гласная не зависит от роли (кроме слияния, например مِنْ → مِنَ перед ال).'));
  }
  return res;
}
function lastSegF(word) { const s = stemOf(word); return s.f; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

let EXPL_RU = false;
/* texte bilingue : le russe est ajouté après « ‖ » quand le réglage est activé */
function R(fr, ru) { return EXPL_RU && ru ? fr + ' ‖ ' + ru : fr; }

function caseReason(f, word, st, prev, prev2, prepBefore, prepSeg) {
  const pf = prev ? stemOf(prev).f : null;
  const ps = prev ? stemOf(prev).seg[0] : '';
  if (f.cas === 'GEN') {
    if (prepBefore) return R('Génitif **parce qu\'il suit une préposition** (' + (prepSeg ? prepSeg[0] : '') + ') : en arabe, toute préposition met le nom suivant au génitif, comme « в / о » + предложный en russe.', 'Родительный (джарр), **потому что стоит после предлога** (' + (prepSeg ? prepSeg[0] : '') + ') : любой предлог ставит следующее имя в джарр, как в русском «в / о» + предложный падеж.');
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un génitif).', 'Это **прилагательное** : оно повторяет падеж определяемого имени (здесь джарр).');
    if (pf && pf.pos === 'N' && pf.cas === 'GEN' && (pf.sub === 'PN' || prev.some(s => parseFeats(s[1], s[2]).tags[0] === 'DET'))) return R('Génitif **parce qu\'il suit un mot défini au génitif** qu\'il précise ou explique (adjectif ou apposition, naʿt / badal) : il en copie le cas.', 'Джарр, **потому что поясняет предыдущее определённое слово в джарре** (приложение, бадал / наʿт) и повторяет его падеж.');
    if (pf && pf.pos === 'N' && !pf.indef) return R('Génitif **parce qu\'il est le 2e terme d\'une annexion** (iḍāfa) : « le … **de** ce mot ». Comme le родительный russe : имя (кого?) Аллаха.', 'Джарр, **потому что это второй член идафы** (сопряжения) : «… **кого? чего?**», как русский родительный : «имя Аллаха».');
    return R('Génitif : soit 2e terme d\'une annexion (« … de … »), soit adjectif ou mot coordonné à un génitif.', 'Джарр : второй член идафы, или прилагательное / однородный член при слове в джарре.');
  }
  if (f.cas === 'ACC') {
    if (pf && pf.fam === 'إِنّ' && /^لَا$/.test(ps)) return R('Accusatif **parce qu\'il suit لَا de négation absolue** (lā nāfiya li-l-jins, « il n\'y a aucun … ») : elle agit comme إِنَّ, et le nom reste sans tanwīn.', 'Насб, **потому что стоит после لَا полного отрицания** («нет никакого …») : она действует как إِنَّ, имя без танвина.');
    if (pf && pf.fam === 'إِنّ') return R('Accusatif **parce qu\'il vient après ' + ps + '** (« إِنَّ et ses sœurs ») : c\'est le nom de inna, il passe à -a.', 'Насб, **потому что стоит после ' + ps + '** («инна и её сёстры») : это подлежащее инны, окончание -a.');
    if (pf && (pf.fam === 'كَان' || (pf.pos === 'V' && /^(كَان|لَيْس|أَصْبَح|ظَلّ)/.test(pf.lem || '')))) return R('Accusatif : probablement l\'**attribut de كَانَ / لَيْسَ** (ou d\'une de leurs « sœurs »).', 'Насб : вероятно, **сказуемое при كَانَ / لَيْسَ** (или их «сёстрах»).');
    if (f.sub === 'T' || f.sub === 'LOC') return R('Accusatif car c\'est un **complément de temps ou de lieu** (ẓarf) : « le jour où…, devant… ».', 'Насб, так как это **обстоятельство времени или места** (зарф) : «в день, когда…, перед…».');
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un accusatif).', 'Это **прилагательное** : оно повторяет падеж определяемого имени (здесь насб).');
    if (pf && pf.pos === 'P' && pf.sub === 'RES') return R('Accusatif après إِلَّا : c\'est ce qui est **excepté** (« sauf … »).', 'Насб после إِلَّا : это **исключаемое** («кроме …»).');
    if (pf && pf.pos === 'V') return R('Accusatif : très probablement le **complément d\'objet direct** du verbe (« qui ? quoi ? » → винительный).', 'Насб : скорее всего **прямое дополнение** глагола («кого? что?» → винительный).');
    if (prev2 && stemOf(prev2).f.pos === 'V') return R('Accusatif : probablement le **complément d\'objet** du verbe un peu avant (« qui ? quoi ? »).', 'Насб : вероятно, **дополнение** стоящего чуть раньше глагола («кого? что?»).');
    return R('Accusatif (naṣb) : complément d\'objet, de temps, de manière ou d\'état, ou nom de إِنَّ… La terminaison -a / -an le signale.', 'Насб : дополнение, обстоятельство времени, образа действия или состояния (хāль), подлежащее инны… Окончание -a / -an.');
  }
  if (f.cas === 'NOM') {
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un nominatif).', 'Это **прилагательное** : оно повторяет падеж определяемого имени (здесь рафʿ).');
    if (pf && pf.pos === 'V' && pf.pass) return R('Nominatif : c\'est le **sujet du verbe passif** (ce qui subit l\'action).', 'Рафʿ : это **подлежащее страдательного глагола** (то, над чем совершается действие).');
    if (pf && pf.pos === 'V') return R('Nominatif : très probablement le **sujet du verbe** (fāʿil), « qui ? » → именительный.', 'Рафʿ : скорее всего **подлежащее глагола** (фāʿиль), «кто?» → именительный.');
    if (pf && pf.fam === 'إِنّ') return R('Nominatif après إِنَّ… : c\'est l\'**attribut** (khabar) de inna, qui reste au nominatif.', 'Рафʿ после إِنَّ… : это **сказуемое** (хабар) инны, оно остаётся в рафʿе.');
    if (!prev) return R('Nominatif : il ouvre la phrase, c\'est probablement le **sujet d\'une phrase nominale** (mubtadaʾ) — une phrase sans verbe « être ».', 'Рафʿ : слово открывает фразу, это, вероятно, **подлежащее именного предложения** (мубтадаʾ) — предложения без глагола «быть», как «мальчик — большой».');
    return R('Nominatif (rafʿ) : sujet ou attribut d\'une phrase nominale, ou sujet d\'un verbe.', 'Рафʿ : подлежащее или сказуемое именного предложения, или подлежащее глагола.');
  }
  return '';
}

function moodReason(mood, word, prev, prev2) {
  const near = [prev, prev2].filter(Boolean).map(w => stemOf(w));
  const inWord = word.filter(s => parseFeats(s[1], s[2]).pref).map(s => parseFeats(s[1], s[2]));
  const md = MOODS[mood];
  if (mood === 'IND') return R('Finale -u : **indicatif**, ' + md.why, 'Окончание -u : **изъявительное наклонение** (марфӯʿ) — обычная форма настоящего времени, никакая частица её не меняет.');
  if (mood === 'SUBJ') {
    if (inWord.some(x => x.tags[0] === 'PRP' || x.tags[0] === 'CAUS')) return R('Finale -a : **subjonctif**, à cause du لِ / فَ « pour que » collé devant.', 'Окончание -a : **сослагательное** (мансӯб) из-за приставки لِ / فَ «чтобы».');
    const t = near.find(n => n.f.pos === 'P' && ['SUB', 'NEG', 'P'].includes(n.f.sub));
    if (t) return R('Finale -a (ou ـوا au lieu de ـونَ) : **subjonctif**, à cause de ' + t.seg[0] + ' juste avant.', 'Окончание -a (или ـوا вместо ـونَ) : **сослагательное** из-за ' + t.seg[0] + ' перед глаголом.');
    return R('Finale -a : **subjonctif** ; ' + md.why, 'Окончание -a : **сослагательное** — после أَنْ «чтобы», لَنْ «никогда не», كَيْ, حَتَّى.');
  }
  if (mood === 'JUS') {
    if (inWord.some(x => x.tags[0] === 'IMPV')) return R('Soukoun final : **apocopé**, à cause du لِ d\'ordre collé devant (« qu\'il… ! »).', 'Сукӯн на конце : **усечённое** (маджзӯм) из-за повелительной частицы لِ («пусть он…!»).');
    const t = near.find(n => n.f.pos === 'P' && ['NEG', 'PRO', 'COND'].includes(n.f.sub));
    if (t) return R('Soukoun final (ou ـوا au lieu de ـونَ) : **apocopé**, à cause de ' + t.seg[0] + ' juste avant.', 'Сукӯн на конце (или ـوا вместо ـونَ) : **усечённое** из-за ' + t.seg[0] + ' перед глаголом.');
    return R('Soukoun final : **apocopé** — souvent la réponse à un ordre ou à une condition (« fais…, tu obtiendras »).', 'Сукӯн на конце : **усечённое** — часто ответ на повеление или условие («сделай — получишь»).');
  }
  return '';
}

/* ---------- Explication des signes, lettre par lettre ---------- */
const MARK_INFO = {
  'َ': ['fatḥa', 'a court', 'petit trait au-dessus'], 'ُ': ['ḍamma', 'u court (ou)', 'petit waw au-dessus'], 'ِ': ['kasra', 'i court', 'petit trait en dessous'],
  'ْ': ['sukūn', 'pas de voyelle : la lettre est « fermée »', 'petit rond'], 'ّ': ['shadda', 'lettre doublée (bb, mm…)', 'petit w'],
  'ً': ['tanwīn fatḥ', '-an : indéfini à l\'accusatif', 'deux traits au-dessus'], 'ٌ': ['tanwīn ḍamm', '-un : indéfini au nominatif', 'deux ḍamma'], 'ٍ': ['tanwīn kasr', '-in : indéfini au génitif', 'deux traits en dessous'],
  'ٰ': ['petit alif (alif khanjariyya)', 'ā long, écrit en petit au-dessus de la lettre', 'petit alif vertical'], 'ٓ': ['madda', 'allonger la voyelle (2 à 6 temps en récitation)', 'vague'],
  'ٔ': ['hamza', 'ʾ : coupure de la voix', 'petite tête de ʿayn'], 'ٕ': ['hamza dessous', 'ʾi', ''],
  '۟': ['petit zéro', 'cette lettre s\'écrit mais ne se prononce pas', 'petit rond ovale'], '۠': ['petit zéro rectangulaire', 'lettre prononcée seulement à la pause', ''],
  'ۢ': ['petit mīm', 'iqlāb : le n se prononce m (devant ب)', 'petit m'], 'ۭ': ['petit mīm dessous', 'iqlāb : le n du tanwīn se prononce m', ''],
  'ۥ': ['petit waw', 'ū long après le pronom هُ (hū)', ''], 'ۦ': ['petit ya', 'ī long après le pronom هِ (hī)', ''], 'ۨ': ['petit nūn', 'n à prononcer', ''],
};

function describeUnits(word, opts) {
  opts = opts || {};
  const us = units(word);
  const lastIdx = (() => { for (let i = us.length - 1; i >= 0; i--) { if (us[i].b && us[i].b !== 'ا' && !(us[i].b === 'ى' && !vowelOf(us[i].m)) && !(us[i].m.includes(AR.SMALL_ZERO))) return i; } return us.length - 1; })();
  return us.map((u, i) => {
    const L = LETTERS[u.b] || [u.b, ''];
    const marks = [];
    for (const ch of u.m) {
      const mi = MARK_INFO[ch];
      if (mi) marks.push({ ch, name: mi[0], sound: mi[1] });
    }
    let note = '';
    if (u.b === 'ا' && i > 0 && !u.m && /[َ]/.test(us[i - 1].m)) note = 'allonge le a précédent : ā';
    if (u.b === 'ا' && i > 0 && !u.m && /[ً]/.test(us[i - 1].m)) note = 'alif « support » du tanwīn -an : il ne se prononce pas';
    if (u.b === 'و' && i > 0 && !/[ً-ْ]/.test(u.m) && /[ُ]/.test(us[i - 1].m)) note = 'allonge le u précédent : ū';
    if ((u.b === 'ي' || u.b === 'ى') && i > 0 && !/[ً-ّ]/.test(u.m) && /[ِ]/.test(us[i - 1].m)) note = 'allonge le i précédent : ī';
    if (u.b === 'ل' && i <= 2 && !vowelOf(u.m) && us[i + 1] && us[i + 1].m.includes(AR.SHADDA) && SUN_LETTERS.includes(us[i + 1].b)) note = 'lām de l\'article, muet devant une lettre solaire (on double la lettre suivante)';
    if (u.b === 'ٱ') note = 'alif de liaison : muet si un mot le précède';
    if (u.m.includes(AR.SHADDA) && i > 0 && us[i - 1].b === 'ل' && !vowelOf(us[i - 1].m) && SUN_LETTERS.includes(u.b)) note = 'shadda d\'assimilation : le l de ال se fond dans cette lettre solaire';
    return { b: u.b, m: u.m, name: L[0], sound: L[1], marks, note, isLast: i === lastIdx };
  });
}

/* Alternatives de la fin d'un nom ou d'un verbe : « et si on changeait ce signe ? » */
function endingAlternatives(stemText, f) {
  const us = units(stemText);
  let li = us.length - 1;
  let skippedYa = false;
  while (li > 0 && (us[li].b === 'ا' || us[li].b === 'ى') && !vowelOf(us[li].m)) { if (us[li].b === 'ى') skippedYa = true; li--; }
  if (skippedYa) return [];
  if (li < us.length - 1 && !(f.indef && f.cas === 'ACC')) return [];
  const last = us[li];
  if (!last) return [];
  const baseMarks = last.m.replace(/[ً-ِْ]/g, '');
  const head = joinUnits(us.slice(0, li));
  const mk = (marks, tail) => head + last.b + baseMarks + marks + (tail || '');
  const out = [];
  if (f.pos === 'N' && f.cas && !/^(MP|FP|MD|FD|P|D)$/.test(f.gn || '') && !['PRON', 'DEM', 'REL'].includes(f.sub)) {
    const taMarb = last.b === 'ة';
    if (f.indef) {
      out.push({ cas: 'NOM', ar: mk(AR.DAMMATAN), why: 'nominatif indéfini : sujet ou attribut — « un… »' });
      out.push({ cas: 'ACC', ar: mk(AR.FATHATAN, taMarb || last.b === 'ء' ? '' : 'ا'), why: 'accusatif indéfini : complément d\'objet, de temps, d\'état…' });
      out.push({ cas: 'GEN', ar: mk(AR.KASRATAN), why: 'génitif indéfini : après une préposition ou « de … »' });
    } else {
      out.push({ cas: 'NOM', ar: mk(AR.DAMMA), why: 'nominatif : sujet, attribut, sujet du verbe' });
      out.push({ cas: 'ACC', ar: mk(AR.FATHA), why: 'accusatif : complément d\'objet, nom de إِنَّ, attribut de كَانَ' });
      out.push({ cas: 'GEN', ar: mk(AR.KASRA), why: 'génitif : après une préposition, ou 2e terme « de … »' });
    }
  } else if (f.pos === 'V' && f.aspect === 'IMPF' && f.mood && ['1S', '1P', '2MS', '3MS', '3FS'].includes(f.person) && !/[اىوي]$/.test(skeleton(stemText))) {
    out.push({ cas: 'IND', ar: mk(AR.DAMMA), why: 'indicatif : « il fait » (phrase normale)' });
    out.push({ cas: 'SUBJ', ar: mk(AR.FATHA), why: 'subjonctif : après أَنْ « que », لَنْ « ne… jamais »' });
    out.push({ cas: 'JUS', ar: mk(AR.SUKUN), why: 'apocopé : après لَمْ « ne… pas (passé) », لَا d\'interdiction' });
  }
  return out;
}
