'use strict';
/* Atelier arabe — plugin Obsidian (généré, ne pas modifier à la main) */
const { Plugin, ItemView, Notice, PluginSettingTab, Setting, MarkdownView, requestUrl } = require('obsidian');
/* ====================================================================
 * 01 - Outils pour l'écriture arabe : signes, découpage, translittération
 * ==================================================================== */

const AR = {
  FATHA: 'َ', DAMMA: 'ُ', KASRA: 'ِ', SUKUN: 'ْ', SHADDA: 'ّ',
  FATHATAN: 'ً', DAMMATAN: 'ٌ', KASRATAN: 'ٍ',
  DAGGER: 'ٰ', MADDA: 'ٓ', HAMZA_ABOVE: 'ٔ', HAMZA_BELOW: 'ٕ',
  SMALL_ZERO: '۟', SMALL_ZERO_RECT: '۠', SMALL_MEEM: 'ۢ', SMALL_LOW_MEEM: 'ۭ',
  SMALL_WAW: 'ۥ', SMALL_YA: 'ۦ', SMALL_NOON: 'ۨ', TATWEEL: 'ـ', WASLA: 'ٱ',
};

const SUN_LETTERS = 'تثدذرزسشصضطظلن';

// Tous les signes qui se posent sur une lettre (ils ne sont pas des lettres eux-mêmes)
function isMark(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 0x064B && c <= 0x065F) || c === 0x0670 || (c >= 0x06D6 && c <= 0x06ED && c !== 0x06E5 && c !== 0x06E6) || c === 0x06E5 || c === 0x06E6;
}
function isArabicLetter(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 0x0621 && c <= 0x064A) || c === 0x0671 || c === 0x0640;
}
function hasArabic(s) { return /[؀-ۿ]/.test(s || ''); }

// Découpe un mot en « unités » : une lettre + les signes posés dessus
function units(word) {
  const out = [];
  for (const ch of word) {
    if (isMark(ch) && out.length) out[out.length - 1].m += ch;
    else if (isMark(ch)) out.push({ b: '', m: ch });
    else out.push({ b: ch, m: '' });
  }
  return out;
}
function joinUnits(us) { return us.map(u => u.b + u.m).join(''); }

function vowelOf(m) {
  if (m.includes(AR.FATHA)) return 'a';
  if (m.includes(AR.DAMMA)) return 'u';
  if (m.includes(AR.KASRA)) return 'i';
  if (m.includes(AR.FATHATAN)) return 'an';
  if (m.includes(AR.DAMMATAN)) return 'un';
  if (m.includes(AR.KASRATAN)) return 'in';
  if (m.includes(AR.SUKUN)) return '0';
  return '';
}

/* ---------- Noms et sons des lettres ---------- */
const LETTERS = {
  'ا': ['alif', 'ā (voyelle longue) ou support de hamza'], 'ٱ': ['alif waṣla', 'alif de liaison : il ne se prononce pas au milieu d\'une phrase'],
  'أ': ['alif + hamza', 'ʾ : petite coupure de la voix (comme dans « a-ah »)'], 'إ': ['alif + hamza dessous', 'ʾi : coupure de la voix + i'],
  'آ': ['alif madda', 'ʾā : hamza + a long'], 'ء': ['hamza', 'ʾ : coupure de la voix'], 'ؤ': ['hamza sur waw', 'ʾ'], 'ئ': ['hamza sur ya', 'ʾ'],
  'ب': ['bāʾ', 'b'], 'ت': ['tāʾ', 't'], 'ث': ['thāʾ', 'th anglais de « think »'], 'ج': ['jīm', 'dj'], 'ح': ['ḥāʾ', 'ḥ : h soufflé du fond de la gorge'],
  'خ': ['khāʾ', 'kh : comme la jota espagnole'], 'د': ['dāl', 'd'], 'ذ': ['dhāl', 'dh : th anglais de « this »'], 'ر': ['rāʾ', 'r roulé'],
  'ز': ['zāy', 'z'], 'س': ['sīn', 's'], 'ش': ['shīn', 'ch'], 'ص': ['ṣād', 'ṣ : s lourd (emphatique)'], 'ض': ['ḍād', 'ḍ : d lourd'],
  'ط': ['ṭāʾ', 'ṭ : t lourd'], 'ظ': ['ẓāʾ', 'ẓ : dh lourd'], 'ع': ['ʿayn', 'ʿ : son de gorge serrée, propre à l\'arabe'], 'غ': ['ghayn', 'gh : r grasseyé parisien'],
  'ف': ['fāʾ', 'f'], 'ق': ['qāf', 'q : k du fond de la gorge'], 'ك': ['kāf', 'k'], 'ل': ['lām', 'l'], 'م': ['mīm', 'm'], 'ن': ['nūn', 'n'],
  'ه': ['hāʾ', 'h aspiré'], 'و': ['wāw', 'w, ou ū (voyelle longue)'], 'ي': ['yāʾ', 'y, ou ī (voyelle longue)'], 'ة': ['tāʾ marbūṭa', 't (prononcé seulement si une voyelle suit), marque souvent le féminin'],
  'ى': ['alif maqṣūra', 'ā en fin de mot (forme de ya sans points)'], 'ـ': ['trait de liaison', 'support : ici il porte une hamza ou un alif'],
};

const TR = {
  'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'ḥ', 'خ': 'kh', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k',
  'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ة': 't', 'ى': 'y', 'آ': 'ʾ',
};

/* ---------- Translittération ----------
 * phraseStart : le mot ouvre-t-il la phrase / le verset ? (sinon l'alif de liaison est muet)
 */
function translitWord(word, phraseStart) {
  word = (word || '').replace(/[ۖ-ۜ۝۞۩]/g, ''); // signes de pause
  const us = units(word).filter(u => u.b !== '' || u.m !== '');
  let out = '';
  const n = us.length;
  const skip = new Set();
  const noDouble = new Set();
  // Allah et ses formes
  const skel = us.map(u => u.b).join('');
  const allahIdx = skel.search(/[اٱ]?لله/);
  for (let i = 0; i < n; i++) {
    if (skip.has(i)) continue;
    const u = us[i]; const b = u.b; const m = u.m;
    const next = us[i + 1]; const next2 = us[i + 2];
    const isStart = i === 0;
    // --- formes d'Allah : ٱللَّه / لِلَّه / بِٱللَّه
    if (allahIdx >= 0 && i === allahIdx && /^[اٱ]?لله/.test(skel.slice(i))) {
      const startsAlif = b === 'ا' || b === 'ٱ';
      const prevOut = out;
      let k = i + (startsAlif ? 3 : 2); // index du ه
      const hUnit = us[k];
      if (!hUnit) { out += 'allāh'; break; }
      const pre = startsAlif ? ((isStart && phraseStart) ? 'a' : '') : (us[i].b === 'ل' ? 'li' : '');
      out += pre + 'llāh';
      const v = vowelOf(hUnit.m);
      if (v && v !== '0') out += v.replace('0', '');
      for (let j = i; j <= k; j++) skip.add(j);
      continue;
    }
    let cons = '';
    // --- l'alif
    if (b === 'ا' || b === 'ٱ') {
      if (m.includes(AR.SMALL_ZERO) || m.includes(AR.SMALL_ZERO_RECT)) continue; // alif muet (ـُوا۟)
      if (m.includes(AR.HAMZA_ABOVE)) { cons = isStart ? '' : 'ʾ'; }
      else if (isStart || (b === 'ٱ') || (i === 1 && isPrefixUnit(us[0]) && next && next.b === 'ل')) {
        // alif de liaison (hamzat al-waṣl)
        const isArticle = next && next.b === 'ل';
        if (isStart && phraseStart) {
          let v = 'i';
          if (isArticle) v = 'a';
          else if (us.length >= 4 && vowelOf(us[2].m) === 'u') v = 'u';
          out += v;
        }
        if (isArticle) {
          // article : al- / ar-r (lettre solaire)
          const lam = next; const after = us[i + 2];
          if (after && after.m.includes(AR.SHADDA) && !lam.m.includes(AR.SUKUN) && SUN_LETTERS.includes(after.b)) {
            skip.add(i + 1);
            const c = TR[after.b] || after.b;
            out += c + '-';
            noDouble.add(i + 2);
          } else if (lam.m.includes(AR.SUKUN) || !vowelOf(lam.m)) {
            skip.add(i + 1);
            out += 'l-';
          }
        }
        continue;
      } else {
        // alif après fatha : déjà allongé ; sinon (rare) on l'ignore
        continue;
      }
    } else if (b === 'ى') {
      if (vowelOf(m) === '' || m.includes(AR.DAGGER)) { if (/i$/.test(out)) out = out.slice(0, -1) + 'ī'; else if (!/ā$/.test(out)) out += 'ā'; continue; }
      cons = 'y';
    } else if (b === 'ـ') {
      cons = m.includes(AR.HAMZA_ABOVE) || m.includes(AR.HAMZA_BELOW) ? 'ʾ' : '';
    } else if (b === 'ة') {
      const v = vowelOf(m);
      if (!v || v === '0') continue;
      cons = 't';
    } else if ((b === 'و' || b === 'ي') && m.includes(AR.DAGGER) && !/[\u064B-\u0650]/.test(m)) {
      if (/a$/.test(out)) out = out.slice(0, -1); out += 'ā'; continue;
    } else if (b === 'و' || b === 'ي') {
      cons = TR[b];
    } else if ((b === 'أ' || b === 'إ' || b === 'آ') && isStart) {
      cons = '';
      if (b === 'آ') { out += 'ā'; continue; }
      if (!vowelOf(m)) out += b === 'إ' ? 'i' : 'a';
    } else if (b === 'ء' && isStart) {
      cons = '';
    } else if (b === 'ل' && i === 1 && isPrefixUnit(us[0]) && us[0].b === 'ل' && (vowelOf(m) === '' || vowelOf(m) === '0') && next) {
      // لِلْ… : li + article sans alif
      if (next.m.includes(AR.SHADDA) && SUN_LETTERS.includes(next.b)) { out += (TR[next.b] || '') + '-'; noDouble.add(i + 1); continue; }
      out += 'l-'; continue;
    } else {
      cons = TR[b] || '';
    }
    if ((b === 'أ' || b === 'إ' || b === 'ء') && !isStart && (/-$/.test(out) || (i === 1 && isPrefixUnit(us[0])))) { if (!/-$/.test(out)) out += '-'; cons = ''; }
    // nūn avec petit mīm (iqlāb) : se prononce m
    if (b === 'ن' && (m.includes(AR.SMALL_MEEM) || m.includes(AR.SMALL_LOW_MEEM))) cons = 'm';
    // shadda : consonne doublée
    if (m.includes(AR.SHADDA) && cons && !noDouble.has(i) && !isStart) out += cons;
    out += cons;
    // voyelle
    let v = vowelOf(m);
    if (m.includes(AR.DAGGER)) v = 'ā';
    if (v === 'a' && next) {
      if ((next.b === 'ا' || next.b === 'ى') && !/[\u064B-\u0651]/.test(next.m) && !next.m.includes(AR.HAMZA_ABOVE) && !(i === 0 && isPrefixUnit(u) && next2 && next2.b === 'ل')) {
        if (next.b === 'ا' && i + 1 === n - 1 && false) { /* */ }
        v = 'ā'; skip.add(i + 1);
      } else if ((next.b === 'و' || next.b === 'ي') && next.m.includes(AR.SUKUN)) {
        v = next.b === 'و' ? 'aw' : 'ay'; skip.add(i + 1);
      } else if ((next.b === 'ي' || next.b === 'و') && next.m === '' && next2 === undefined) {
        v = next.b === 'و' ? 'aw' : 'ay'; skip.add(i + 1);
      }
    } else if (v === 'i' && next && (next.b === 'ي' || next.b === 'ى') && !/[\u064B-\u0651]/.test(next.m)) {
      v = 'ī'; skip.add(i + 1);
    } else if (v === 'u' && next && next.b === 'و' && !/[\u064B-\u0651]/.test(next.m)) {
      v = 'ū'; skip.add(i + 1);
      if (next2 && next2.b === 'ا' && (i + 2 === n - 1 || next2.m.includes(AR.SMALL_ZERO))) skip.add(i + 2);
    }
    if (v === 'i' && m.includes(AR.SMALL_YA)) v = 'ī';
    if (v === 'u' && m.includes(AR.SMALL_WAW)) v = 'ū';
    if (v === 'a' && m.includes(AR.MADDA) && next && next.b !== 'ا') v = 'ā';
    if (v === 'an') {
      if (next && (next.b === 'ا' || next.b === 'ى') && !vowelOf(next.m)) skip.add(i + 1);
    }
    if (v === '0') v = '';
    out += v;
  }
  return out;
}

function isPrefixUnit(u) {
  return u && 'وفبكل'.includes(u.b) && /[\u064E\u0650]/.test(u.m);
}

function translitPhrase(words, style) {
  const parts = [];
  words.forEach((w, i) => parts.push(translitWord(w, i === 0)));
  // tanwin suivi d'un alif de liaison : on ajoute un i de liaison (waladuni l-…)
  for (let i = 0; i < parts.length - 1; i++) {
    if (/(un|an|in)$/.test(parts[i]) && /^[اٱ]/.test(words[i + 1])) parts[i] += 'i';
  }
  let s = parts.join(' ');
  if (style === 'fr') s = frenchStyle(s);
  return s;
}

function frenchStyle(s) {
  return s.replace(/sh/g, 'ch').replace(/ū/g, 'oû').replace(/u/g, 'ou').replace(/j/g, 'dj');
}

/* ---------- Normalisation pour la recherche ---------- */
function skeleton(w, daggerAsAlif) {
  let s = w || '';
  if (daggerAsAlif) s = s.replace(/ٰ/g, 'ا');
  s = s.replace(/[ً-ٰٟۖ-ۭـ]/g, '');
  s = s.replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '');
  s = s.replace(/اا/g, 'ا');
  return s;
}
function vowelSeq(w) {
  return (w || '').replace(/ٰ/g, '').replace(/[^ً-ْ]/g, '');
}
function vowelScore(a, b) {
  const x = vowelSeq(a), y = vowelSeq(b);
  if (!x) return 0;
  // plus longue sous-séquence commune
  const dp = Array(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    let prev = 0;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[y.length] / Math.max(x.length, y.length);
}
function splitWords(text) {
  return (text || '').replace(/[«»"“”(),.;:!?؟،۔]/g, ' ').split(/\s+/).filter(w => hasArabic(w));
}
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
/* ====================================================================
 * 02c - Analyse grammaticale complète d'un verset (iʿrāb)
 * Déduite de la morphologie du corpus : rôles, liens entre les mots,
 * marque du cas. Fiable pour les phrases simples, indicative ailleurs.
 * ==================================================================== */

/* clé : [nom français, terme arabe, translittération, russe, étiquette courte du lien] */
const IRAB_ROLES = {
  mubtada: ['sujet de la phrase nominale', 'مُبْتَدَأ', 'mubtadaʾ', 'подлежащее именного предложения', 'sujet'],
  khabar: ['attribut : ce qu\'on dit du sujet', 'خَبَر', 'khabar', 'сказуемое (хабар)', 'attribut'],
  khabarMuq: ['attribut placé en tête', 'خَبَر مُقَدَّم', 'khabar muqaddam', 'сказуемое, вынесенное вперёд', 'attribut'],
  mubtadaMuakh: ['sujet placé après l\'attribut', 'مُبْتَدَأ مُؤَخَّر', 'mubtadaʾ muʾakhkhar', 'подлежащее, стоящее после сказуемого', 'sujet'],
  fail: ['sujet du verbe', 'فَاعِل', 'fāʿil', 'подлежащее глагола (фāʿиль)', 'sujet'],
  naib: ['sujet du verbe passif', 'نَائِب فَاعِل', 'nāʾib fāʿil', 'подлежащее страдательного глагола', 'sujet'],
  maful: ['complément d\'objet direct', 'مَفْعُول بِهِ', 'mafʿūl bihi', 'прямое дополнение', 'COD'],
  mutlaq: ['complément absolu (renforce le verbe)', 'مَفْعُول مُطْلَق', 'mafʿūl muṭlaq', 'абсолютное дополнение', 'renfort'],
  hal: ['complément d\'état (« comment ? »)', 'حَال', 'ḥāl', 'обстоятельство состояния', 'état'],
  zarf: ['complément de temps ou de lieu', 'ظَرْف', 'ẓarf', 'обстоятельство времени / места', 'quand/où'],
  majrur: ['nom au génitif après une préposition', 'اِسْم مَجْرُور', 'majrūr', 'имя после предлога', 'après prép.'],
  mudafIlayh: ['complément du nom (« … de … »)', 'مُضَاف إِلَيْه', 'muḍāf ilayh', 'второй член идафы', 'de'],
  nat: ['adjectif : il qualifie le nom', 'نَعْت', 'naʿt', 'определение (прилагательное)', 'adjectif'],
  badal: ['apposition : il précise le mot d\'avant', 'بَدَل', 'badal', 'приложение', 'précise'],
  matuf: ['mot coordonné (relié par « et »)', 'مَعْطُوف', 'maʿṭūf', 'однородный член (через «и»)', 'et'],
  ismInna: ['nom de inna (sujet, à l\'accusatif)', 'اِسْم إِنَّ', 'ism inna', 'подлежащее при инна', 'nom de inna'],
  khabarInna: ['attribut de inna', 'خَبَر إِنَّ', 'khabar inna', 'сказуемое при инна', 'attribut'],
  ismKana: ['sujet de kāna', 'اِسْم كَانَ', 'ism kāna', 'подлежащее при кāна', 'sujet'],
  khabarKana: ['attribut de kāna (à l\'accusatif)', 'خَبَر كَانَ', 'khabar kāna', 'сказуемое при кāна', 'attribut'],
  mustathna: ['ce qui est excepté (« sauf … »)', 'مُسْتَثْنَى', 'mustathnā', 'исключаемое', 'sauf'],
  munada: ['la personne qu\'on appelle (« ô … »)', 'مُنَادَى', 'munādā', 'обращение', 'ô'],
  fasl: ['pronom de séparation (insiste : « c\'est lui qui… »)', 'ضَمِير فَصْل', 'ḍamīr faṣl', 'разделительное местоимение', ''],
  verb: ['verbe', 'فِعْل', 'fiʿl', 'глагол', ''],
  jar: ['préposition', 'حَرْف جَرّ', 'ḥarf jarr', 'предлог', ''],
  harf: ['particule', 'حَرْف', 'ḥarf', 'частица', ''],
  inna: ['inna ou une de ses sœurs', 'حَرْف نَاسِخ', 'ḥarf nāsikh', 'частица «инна и её сёстры»', ''],
  shart: ['mot de condition (« si, quiconque, ce que »)', 'اِسْم شَرْط', 'ism sharṭ', 'условное слово', ''],
  istifham: ['mot interrogatif (« comment ? qui ? quoi ? »)', 'اِسْم اِسْتِفْهَام', 'ism istifhām', 'вопросительное слово', ''],
  rel: ['pronom relatif (« celui qui, ce que »)', 'اِسْم مَوْصُول', 'ism mawṣūl', 'относительное местоимение', 'qui'],
  inl: ['lettres isolées', 'حُرُوف مُقَطَّعَة', 'ḥurūf muqaṭṭaʿa', 'отдельные буквы', ''],
  noun: ['nom', 'اِسْم', 'ism', 'имя', ''],
};
/* rôles assez sûrs pour servir de questions d'exercice */
const IRAB_SURE = ['mubtada', 'khabar', 'fail', 'maful', 'majrur', 'mudafIlayh', 'nat', 'ismInna', 'khabarInna', 'matuf'];

function irabRoleName(key) { const r = IRAB_ROLES[key] || IRAB_ROLES.noun; return R(r[0], r[3]); }

const IR_STRIP = /[ۖ-ۭٓ-ٕ]/g;
function lastVowel(text) {
  const t = (text || '').replace(IR_STRIP, '').replace(/ٰ/g, '');
  const m = t.match(/([ً-ْ]*)([^ً-ْ]?)([ً-ْ]*)$/);
  return { t, marks: (m && (m[3] || m[1])) || '', lastLetter: m ? m[2] : '' };
}

/* Marque du cas ou du mode (ʿalāmat al-iʿrāb) */
function irabMark(word, f, stemText) {
  const { t, marks } = lastVowel(stemText);
  const has = c => marks.indexOf(c) >= 0;
  const gn = f.gn || '';
  if (f.pos === 'N' && f.cas) {
    if (['PRON', 'DEM', 'REL'].includes(f.sub)) return 'mot invariable (mabnī) : sa forme ne change pas, on dit qu\'il est « à la place » d\'un ' + CASE_SHORT[f.cas];
    const plurM = /MP/.test(gn) || /ـ?[وي]نَ$/.test(t) && /[ُِ][وي]نَ$/.test(t);
    const dual = /D$/.test(gn);
    if (f.cas === 'NOM') {
      if (dual && /انِ?$/.test(t)) return 'l\'alif du duel (ـَانِ) — un duel au nominatif prend ـَانِ';
      if (plurM && /ونَ?$/.test(t)) return 'le wāw du pluriel (ـُونَ) — le pluriel masculin au nominatif prend ـُونَ';
      if (/[اى]$/.test(t) || /ىٰ?$/.test(stemText)) return 'ḍamma « estimée » : la voyelle ne peut pas se poser sur l\'alif final, on ne la voit pas';
      if (has('ٌ')) return 'le tanwīn ḍamma (ـٌ, -un) : nominatif + indéfini';
      if (has('ُ')) return 'la ḍamma (ـُ, -u) sur la dernière lettre';
    }
    if (f.cas === 'ACC') {
      if (dual && /يْنِ?$/.test(t)) return 'le yāʾ du duel (ـَيْنِ)';
      if (plurM && /ينَ?$/.test(t)) return 'le yāʾ du pluriel (ـِينَ) — à l\'accusatif et au génitif, le pluriel masculin prend ـِينَ';
      if (/FP/.test(gn) && (has('ِ') || has('ٍ'))) return 'la kasra à la place de la fatḥa : un pluriel féminin en ـَات ne prend jamais de fatḥa';
      if (/[اى]$/.test(t) && !has('ً')) return 'fatḥa « estimée » sur l\'alif final (invisible)';
      if (has('ً')) return 'le tanwīn fatḥa (ـً, -an) : accusatif + indéfini';
      if (has('َ')) return 'la fatḥa (ـَ, -a) sur la dernière lettre';
    }
    if (f.cas === 'GEN') {
      if (dual && /يْنِ?$/.test(t)) return 'le yāʾ du duel (ـَيْنِ)';
      if (plurM && /ينَ?$/.test(t)) return 'le yāʾ du pluriel (ـِينَ) — au génitif, le pluriel masculin prend ـِينَ';
      if (/[اى]$/.test(t)) return 'kasra « estimée » sur l\'alif final (invisible)';
      if (has('ٍ')) return 'le tanwīn kasra (ـٍ, -in) : génitif + indéfini';
      if (has('ِ')) return 'la kasra (ـِ, -i) sur la dernière lettre';
      if (has('َ')) return 'la fatḥa à la place de la kasra : ce nom est « diptote » (mamnūʿ min aṣ-ṣarf), il refuse le -i et le tanwīn';
    }
    if (/[يى]$/.test(t)) return CASE_SHORT[f.cas] + ' « estimé » : la voyelle ne se voit pas sur la lettre longue finale';
    return CASE_SHORT[f.cas] + ' (la voyelle finale est cachée par un pronom collé ou par la forme du mot)';
  }
  if (f.pos === 'V') {
    if (f.aspect === 'PERF') return 'le passé est invariable (mabnī) : sa fin ne dépend pas des autres mots';
    if (f.aspect === 'IMPV') return 'l\'impératif est invariable (mabnī) : il se termine comme l\'apocopé';
    const suffixed = word.some(s => parseFeats(s[1], s[2]).suff && parseFeats(s[1], s[2]).tags[0] === 'PRON');
    if (f.mood === 'IND') return /نَ$|نِ$/.test(t) && suffixed ? 'le nūn final (ـونَ / ـانِ / ـينَ) : il montre l\'indicatif' : 'la ḍamma (ـُ, -u) : indicatif, forme normale du présent';
    if (f.mood === 'SUBJ') return /[وا]ا?$/.test(t) && suffixed ? 'la chute du nūn (ـوا au lieu de ـونَ) : subjonctif' : 'la fatḥa (ـَ, -a) : subjonctif';
    if (f.mood === 'JUS') {
      if (has('ْ')) return 'le soukoun (ـْ) : apocopé';
      if (suffixed) return 'la chute du nūn (ـوا au lieu de ـونَ) : apocopé';
      return 'la voyelle longue finale tombe (ex. يَكُن au lieu de يَكُونُ) : apocopé';
    }
  }
  if (f.pos === 'P') return 'particule invariable (mabnī)';
  return '';
}

function irabWordInfo(word) {
  const st = stemOf(word);
  const pre = [], suf = [];
  word.forEach((s, k) => {
    const g = parseFeats(s[1], s[2]);
    if (k < st.idx) pre.push({ k, s, g }); else if (k > st.idx) suf.push({ k, s, g });
  });
  const det = pre.some(p => p.g.tags[0] === 'DET');
  const prep = pre.find(p => p.g.tags[0] === 'P') || null;
  const conj = pre.find(p => ['CONJ'].includes(p.g.tags[0])) || null;
  const voc = pre.find(p => p.g.tags[0] === 'VOC') || null;
  const pron = suf.filter(p => p.g.tags[0] === 'PRON');
  return { st, f: st.f, pre, suf, det, prep, conj, voc, pron };
}

function analyseIrab(words) {
  const N = words.length;
  const W = words.map(irabWordInfo);
  const out = W.map((x, i) => ({ i, key: 'noun', head: -1, guess: false, notes: [], att: [], group: null, mark: irabMark(words[i], x.f, x.st.seg[0]) }));
  const set = (i, key, head, guess, note) => { out[i].key = key; out[i].head = head === undefined ? -1 : head; out[i].guess = !!guess; if (note) out[i].notes.push(note); };
  const isDef = i => { const x = W[i]; return x.det || x.f.sub === 'PN' || x.pron.length > 0 || ['PRON', 'DEM', 'REL'].includes(x.f.sub); };
  const newClause = () => ({ verb: -1, vSubj: false, vPass: false, vObj: false, inna: -1, innaIsm: -1, innaKh: false, kana: -1, kanaIsm: -1, kanaKh: false, mub: -1, kh: false, khMuq: -1, muakh: false, voc: false, illa: false, rel: false, nats: [] });
  let C = newClause();
  let pendingPrep = -1, conjFlag = false, lastNom = -1, qawl = false;
  const groups = [];

  const finalize = () => {
    if (C.mub >= 0 && !C.kh) {
      const n = C.nats.filter(j => out[j].head === C.mub).pop();
      if (n !== undefined) { set(n, 'khabar', C.mub, true, R('Comme la phrase n\'a pas d\'autre attribut, ce mot défini est l\'attribut : « X **est** Y ».', 'Так как другого сказуемого нет, это определённое слово — сказуемое.')); C.kh = true; }
    }
    if (C.khMuq >= 0 && !C.muakh) {
      const g = out[C.khMuq].group;
      if (g) { g.key = 'taalluq'; g.head = C.verb; g.text = R('Le groupe se rattache à un **verbe sous-entendu** (par exemple « je commence… »).', 'Группа относится к **подразумеваемому глаголу** (например, «начинаю…»).'); }
    }
    if (C.verb >= 0 && !C.vSubj) out[C.verb].notes.push(R('Sujet : un **pronom sous-entendu** (« il », « elle »…), déjà contenu dans la forme du verbe.', 'Подлежащее — **подразумеваемое местоимение** («он», «она»…), заключённое в форме глагола.'));
  };
  const boundary = () => { finalize(); C = newClause(); pendingPrep = -1; };

  const groupRole = (p) => {
    // fonction d'un groupe « préposition + nom » (jār wa majrūr)
    const g = { key: 'taalluq', head: -1, text: '' };
    if (C.verb >= 0) { g.head = C.verb; g.text = R('Le groupe « préposition + nom » complète le **verbe** (il dit où, à qui, par quoi…).', 'Группа «предлог + имя» дополняет **глагол** (где, кому, чем…).'); }
    else if (C.mub >= 0 && !C.kh) { g.key = 'khabar'; g.head = C.mub; C.kh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut** (khabar) : il dit ce qu\'on affirme du sujet.', 'Группа «предлог + имя» — **сказуемое** (хабар) : она говорит, что утверждается о подлежащем.'); }
    else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { g.key = 'khabarInna'; g.head = C.innaIsm; C.innaKh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut de inna**.', 'Группа «предлог + имя» — **сказуемое при инна**.'); }
    else if (C.inna >= 0 && C.innaIsm < 0) { g.key = 'khabarInna'; g.head = C.inna; C.innaKh = true; g.text = R('Le groupe est l\'**attribut de inna placé en tête** : le nom de inna viendra après.', 'Группа — **сказуемое при инна, вынесенное вперёд** : подлежащее будет после.'); }
    else if (C.kana >= 0 && !C.kanaKh) { g.key = 'khabarKana'; g.head = C.kana; C.kanaKh = true; g.text = R('Le groupe est l\'**attribut de kāna**.', 'Группа — **сказуемое при кāна**.'); }
    else if (C.mub < 0 && C.khMuq < 0) { g.key = 'khabarMuq'; C.khMuq = p; g.text = R('Le groupe vient **en tête** : c\'est souvent l\'attribut placé avant le sujet (« à lui, il y a … », « pour eux, un châtiment »).', 'Группа стоит **в начале** : обычно это сказуемое перед подлежащим («у него есть…», «им — наказание»).'); }
    else g.text = R('Groupe « préposition + nom » : il complète ce qui précède.', 'Группа «предлог + имя» дополняет предыдущее.');
    out[p].group = g; groups.push(p);
  };

  for (let i = 0; i < N; i++) {
    const x = W[i]; const f = x.f; const o = out[i];
    // éléments collés
    x.pre.forEach(p => {
      const r = segmentRole(p.s, p.k, words[i]);
      o.att.push({ ar: p.s[0], label: r.label, text: r.text });
    });
    if (isInitials(words[i])) { set(i, 'inl'); boundary(); continue; }
    if (qawl && f.pos !== 'V') { boundary(); o.notes.push(R('Après « dire », une **nouvelle phrase** commence : ce qui est dit.', 'После «сказать» начинается **новое предложение** — сказанное.')); }
    qawl = false;
    const hostAtt = (key, text) => x.pron.forEach(p => o.att.push({ ar: p.s[0], label: IRAB_ROLES[key][2], key, text }));
    if (x.conj) conjFlag = true;
    if (x.pre.some(p => ['REM', 'RSLT', 'SUP', 'CAUS', 'CIRC'].includes(p.g.tags[0]))) boundary();

    if (f.pos === 'P') {
      const sub = f.sub;
      if (sub === 'P') {
        set(i, 'jar');
        if (x.pron.length) { hostAtt('majrur', R('pronom au génitif après la préposition (majrūr)', 'местоимение после предлога')); groupRole(i); }
        else pendingPrep = i;
      } else if (f.fam === 'إِنّ' || sub === 'ACC') {
        boundary(); set(i, 'inna'); C.inna = i;
        if (/^لَا/.test(x.st.seg[0])) o.notes.push(R('لَا de **négation absolue** : « il n\'y a aucun … » ; elle agit comme إِنَّ (nom à l\'accusatif sans tanwīn).', 'لَا **полного отрицания** : «нет никакого …» ; действует как إِنَّ.'));
        if (x.pron.length) { hostAtt('ismInna', R('pronom collé : c\'est le nom de inna', 'слитное местоимение — подлежащее при инна')); C.innaIsm = i; }
      } else if (sub === 'CONJ') { set(i, 'harf'); conjFlag = true; }
      else if (sub === 'EXP' || sub === 'RES') { set(i, 'harf'); C.illa = true; }
      else if (sub === 'VOC') { set(i, 'harf'); C.voc = true; }
      else {
        if (['COND', 'SUB', 'REM', 'INC', 'SUR', 'EXL'].includes(sub)) boundary();
        set(i, 'harf');
        if (x.pron.length) hostAtt('noun', 'pronom collé à la particule');
      }
      if (PARTICLES[sub]) o.notes.push(cap(PARTICLES[sub]) + '.');
      continue;
    }

    if (f.pos === 'V') {
      if (C.mub >= 0 && !C.kh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut** (khabar) du sujet ' + words[C.mub].map(s => s[0]).join('') + ' : une phrase verbale à l\'intérieur de la phrase nominale.', 'Этот глагол с продолжением — **сказуемое** (хабар) при подлежащем ' + wordText(words[C.mub]) + '.')); o.khOf = C.mub; C.kh = true; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de inna**.', 'Этот глагол с продолжением — **сказуемое при инна**.')); o.khOf = C.innaIsm; C.innaKh = true; }
      else if (C.kana >= 0 && C.kanaIsm >= 0 && !C.kanaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de kāna**.', 'Этот глагол с продолжением — **сказуемое при кāна**.')); o.khOf = C.kana; C.kanaKh = true; }
      else if (C.rel) o.notes.push(R('Ce verbe ouvre la **proposition relative** (ṣila) : « … qui a fait, qui fait ».', 'Глагол открывает **относительное придаточное** (сыла).'));
      const relBefore = C.rel;
      finalize(); C = newClause(); pendingPrep = -1;
      set(i, 'verb'); C.verb = i; C.vPass = f.pass;
      if (relBefore) C.vSubj = true; // le relatif est le sujet
      const subjSuffix = x.pron.find((p, k) => k === 0 && p.g.person === f.person && isSubjectSuffix(f, f.person));
      if (subjSuffix) { C.vSubj = true; o.att.push({ ar: subjSuffix.s[0], label: f.pass ? 'nāʾib fāʿil' : 'fāʿil', key: f.pass ? 'naib' : 'fail', text: R('terminaison de personne : c\'est le **sujet** (« ' + PERSONS[f.person][0] + ' »)', 'окончание лица — это **подлежащее**') }); }
      else if (f.aspect === 'IMPV' || /^[12]/.test(f.person)) { C.vSubj = true; o.notes.push(R('Sujet : « ' + (PERSONS[f.person] ? PERSONS[f.person][0] : 'toi') + ' », contenu dans la forme du verbe (pronom sous-entendu).', 'Подлежащее заключено в форме глагола.')); }
      x.pron.filter(p => p !== subjSuffix).forEach(p => { C.vObj = true; o.att.push({ ar: p.s[0], label: 'mafʿūl bihi', key: 'maful', text: R('pronom complément : « ' + (PRON_SUFFIX_FR[p.g.person] || '').split(' / ')[0] + ' » (COD)', 'местоимение-дополнение') }); });
      if (f.fam === 'كَان' || /^(كَان|لَيْس|أَصْبَح|ظَلّ|صَار|أَمْسَى)/.test(f.lem || '')) {
        C.kana = i;
        o.notes.push(R('**kāna et ses sœurs** (كَانَ، لَيْسَ، أَصْبَحَ…) : le sujet reste au nominatif, l\'**attribut passe à l\'accusatif**.', '**кāна и её сёстры** : подлежащее в рафʿе, **сказуемое в насбе**.'));
        if (subjSuffix) C.kanaIsm = i;
      }
      if (lemRoot(x) === 'قول') qawl = true;
      conjFlag = false;
      continue;
    }

    /* ---------------- noms ---------------- */
    const cas = f.cas; const sub = f.sub;
    const prevN = (() => { for (let j = i - 1; j >= 0; j--) { if (W[j].f.pos === 'N') return j; if (W[j].f.pos !== 'P' || W[j].f.sub !== 'CONJ') return -1; } return -1; })();
    const p1 = i > 0 && W[i - 1].f.pos === 'N' ? i - 1 : -1;
    const sameCase = j => j >= 0 && W[j].f.cas === cas;
    const agrees = j => j >= 0 && sameCase(j) && isDef(j) === isDef(i) && !['PRON', 'REL'].includes(W[j].f.sub);
    const firstOf = j => { while (j >= 0 && ['nat', 'badal'].includes(out[j].key) && out[j].head >= 0) j = out[j].head; return j; };
    const conjHere = conjFlag && !x.prep;
    let done = false;

    if (x.prep) {
      set(i, 'majrur', -1, false, R('Il est au génitif à cause de la préposition ' + x.prep.s[0] + ' collée devant lui.', 'Он в джарре из-за предлога ' + x.prep.s[0] + ', приставленного спереди.'));
      groupRole(i); done = true;
    } else if (pendingPrep >= 0 && (cas === 'GEN' || !cas)) {
      set(i, 'majrur', pendingPrep); groupRole(pendingPrep); pendingPrep = -1; done = true;
    } else if (sub === 'REL') {
      set(i, 'rel', p1 >= 0 ? p1 : -1, true); C.rel = true; done = true;
      if (p1 >= 0) o.notes.push(R('Il dépend de ' + wordText(words[p1]) + ' : « ' + wordText(words[p1]) + ' … **qui / que** … ».', 'Зависит от ' + wordText(words[p1]) + ' : «… который …».'));
      if (C.verb >= 0 && !C.vSubj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **sujet** au verbe.', 'Здесь относительное местоимение с придаточным — **подлежащее** глагола.')); C.vSubj = true; }
      else if (C.verb >= 0 && !C.vObj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **complément** au verbe.', 'Здесь относительное местоимение с придаточным — **дополнение** глагола.')); C.vObj = true; }
      else if (C.inna >= 0 && C.innaIsm < 0) { o.notes.push(R('Ici, le relatif est le **nom de inna** (« ceux qui… »).', 'Здесь относительное местоимение — **подлежащее при инна**.')); C.innaIsm = i; }
      else if (C.mub < 0 && C.verb < 0 && !conjHere && p1 < 0) { o.notes.push(R('Ici, le relatif ouvre la phrase : c\'est le **sujet** (« ceux qui… »).', 'Здесь относительное местоимение открывает фразу — **подлежащее**.')); C.mub = i; }
    } else if (sub === 'PRON' && /^إيا/.test(x.st.seg[0].replace(/[ً-ْٰ]/g, ''))) {
      let v = -1; for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'maful', v, false, R('إِيَّا + pronom : complément d\'objet **placé avant le verbe** pour insister (« c\'est Toi que… »).', 'إِيَّا + местоимение : дополнение, **вынесенное перед глаголом** для выделения («именно Тебе…»).'));
      done = true;
    } else if (W[i - 1] && W[i - 1].f.sub === 'DEM' && x.det) {
      set(i, 'badal', i - 1, false, R('Après un démonstratif, le nom avec ال dit **de quoi on parle** : هَٰذَا ٱلْكِتَٰبُ = « ce livre ».', 'После указательного местоимения имя с ال уточняет, **о чём речь**.'));
      if (out[i - 1].key === 'mubtada') { C.nats.push(i); }
      done = true;
    } else if (C.voc && !cas) { set(i, 'munada'); C.voc = false; done = true; }
    else if (!cas && (sub === 'T' || sub === 'LOC')) {
      let v = C.verb; if (v < 0) for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'zarf', v, false, R('Adverbe de temps ou de lieu : il situe l\'action (« quand, lorsque, là où »).', 'Наречие времени или места.')); done = true;
    } else if (sub === 'COND') { boundary(); set(i, 'shart', -1, false, R('Il ouvre une **condition** : le premier verbe est la condition, le second la réponse (souvent tous deux à l\'apocopé).', 'Открывает **условие** : первый глагол — условие, второй — ответ.')); done = true; }
    else if ((sub === 'INTG' || /^(كيف|أين|متى|أنى)$/.test(skeleton(x.st.seg[0]))) && !x.prep) { set(i, 'istifham'); done = true; }
    if (done) { lastNom = i; conjFlag = false; continue; }

    if (sub === 'PRON' || sub === 'DEM') {
      if (conjHere && (C.kh || C.innaKh || (C.verb >= 0 && C.vSubj))) boundary();
      if (C.mub < 0 && C.verb < 0 && C.inna < 0 && C.khMuq < 0) { set(i, 'mubtada'); C.mub = i; }
      else if ((C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) || (C.mub >= 0 && !C.kh && i + 1 < N && W[i + 1].f.cas === 'NOM' && W[i + 1].det)) set(i, 'fasl', -1, true);
      else if (C.mub >= 0 && !C.kh) { set(i, 'khabar', C.mub, true); C.kh = true; }
      else if (C.illa) { set(i, 'mustathna', -1, true); C.illa = false; }
      else if (C.verb >= 0 && !C.vSubj) { set(i, 'fail', C.verb, true); C.vSubj = true; }
      else if (C.khMuq >= 0 && !C.muakh) { set(i, 'mubtadaMuakh', C.khMuq, true); C.muakh = true; }
      else set(i, 'noun');
      lastNom = i; conjFlag = false; continue;
    }

    const looksAdj = sub === 'ADJ' || ((sub === 'ACT_PCPL' || sub === 'PASS_PCPL') && cas);
    let mHead = -1;
    if (conjHere) {
      for (let k = i - 1; k >= 0; k--) if (W[k].f.pos === 'N' && W[k].f.cas === cas && out[k].key !== 'mudafIlayh') { mHead = firstOf(k); break; }
      if (mHead < 0) for (let k = i - 1; k >= 0; k--) if (W[k].f.pos === 'N' && W[k].f.cas === cas) { mHead = k; break; }
    }
    if (C.voc && cas) { set(i, 'munada', -1, false); C.voc = false; }
    else if (mHead >= 0) set(i, 'matuf', mHead, false, R('Relié par « et » : il prend **le même cas** que ' + wordText(words[mHead]) + '.', 'Связан союзом «и» : стоит **в том же падеже**, что и ' + wordText(words[mHead]) + '.'));
    else if (p1 >= 0 && agrees(p1) && (looksAdj || (x.det && isDef(p1) && W[p1].f.sub !== 'DEM')) && !(out[p1].key === 'mubtada' && !x.det && !looksAdj)) {
      const head = out[p1].key === 'nat' && out[p1].head >= 0 ? out[p1].head : p1;
      const kind = W[p1].f.sub === 'PN' && !looksAdj ? 'badal' : 'nat';
      set(i, kind, head, kind === 'badal', R('Il suit ' + wordText(words[head]) + ' et le copie : **même cas, même défini/indéfini**' + (kind === 'nat' ? ', même genre et même nombre.' : '.'), 'Он следует за ' + wordText(words[head]) + ' и повторяет его падеж и определённость.'));
      if (out[head].key === 'mubtada' || head === C.mub) C.nats.push(i);
    }
    else if (cas === 'GEN') {
      if (p1 >= 0 && !W[p1].det && !W[p1].f.indef && !W[p1].pron.length && !['PRON', 'DEM', 'REL'].includes(W[p1].f.sub) && W[p1].f.pos === 'N') {
        set(i, 'mudafIlayh', p1, false, R('**Annexion** (iḍāfa) : ' + wordText(words[p1]) + ' (sans ال ni tanwīn) + ce mot au génitif = « ' + (W[p1].st.seg[3] >= 0 ? '…' : '') + ' de … ».', '**Идафа** : ' + wordText(words[p1]) + ' (без ال и танвина) + это слово в джарре = «… кого? чего?».'));
      } else set(i, 'noun', -1, true, R('Génitif sans préposition juste avant : il complète ou précise un mot plus haut (souvent la suite du verset précédent).', 'Джарр без предлога рядом : уточняет слово выше (часто из предыдущего аята).'));
    }
    else if (cas === 'NOM') {
      if (C.verb >= 0 && !C.vSubj) { set(i, C.vPass ? 'naib' : 'fail', C.verb); C.vSubj = true; if (C.kana === C.verb) { o.key = 'ismKana'; C.kanaIsm = i; } }
      else if (C.kana >= 0 && C.kanaIsm < 0) { set(i, 'ismKana', C.kana); C.kanaIsm = i; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { set(i, 'khabarInna', C.innaIsm); C.innaKh = true; }
      else if (C.khMuq >= 0 && !C.muakh) { set(i, 'mubtadaMuakh', C.khMuq); C.muakh = true; }
      else if (C.mub >= 0 && !C.kh) { set(i, 'khabar', C.mub); C.kh = true; }
      else if (C.mub >= 0 && C.kh) set(i, 'khabar', C.mub, true, R('Un deuxième attribut : on dit encore autre chose du même sujet.', 'Второе сказуемое при том же подлежащем.'));
      else if (C.verb < 0 && C.inna < 0) { set(i, 'mubtada'); C.mub = i; }
      else set(i, 'noun', -1, true, R('Nominatif : sujet ou attribut d\'une petite phrase à l\'intérieur du verset.', 'Рафʿ : подлежащее или сказуемое внутри аята.'));
    }
    else if (cas === 'ACC') {
      if (C.inna >= 0 && C.innaIsm < 0) { set(i, 'ismInna', C.inna); C.innaIsm = i; }
      else if (C.illa) { set(i, 'mustathna'); C.illa = false; }
      else if (C.kana >= 0 && !C.kanaKh) { set(i, 'khabarKana', C.kana); C.kanaKh = true; }
      else if (sub === 'T' || sub === 'LOC') set(i, 'zarf', C.verb, false);
      else if (C.verb >= 0 && !x.det && W[C.verb].st.seg[3] >= 0 && x.st.seg[3] >= 0 && lemRoot(W[C.verb]) && lemRoot(W[C.verb]) === lemRoot(x) && (sub === 'VN' || !sub)) set(i, 'mutlaq', C.verb, false, R('Nom verbal de la **même racine** que le verbe : il renforce l\'action (« il frappa une frappe » = il frappa fort).', 'Отглагольное имя **того же корня** — усиливает действие.'));
      else if (C.verb >= 0 && !C.vObj && x.f.indef && groups.some(g => g > C.verb) && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true, R('Indéfini à l\'accusatif après le verbe et son complément : il dit **dans quel état** se fait l\'action (« en foule », « sincèrement »).', 'Неопределённое имя в насбе : говорит, **в каком состоянии** совершается действие.'));
      else if (C.verb >= 0 && !C.vObj) { set(i, 'maful', C.verb, false); C.vObj = true; }
      else if (C.verb >= 0 && x.f.indef && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true);
      else if (C.verb >= 0) set(i, 'maful', C.verb, true, R('Deuxième complément à l\'accusatif (certains verbes en ont deux : « donner quelque chose à quelqu\'un »), ou complément d\'état.', 'Второе дополнение в насбе или обстоятельство состояния.'));
      else set(i, 'noun', -1, true, R('Accusatif : complément (objet, état, temps…) d\'un verbe plus haut dans le passage.', 'Насб : дополнение к глаголу выше.'));
    }
    else set(i, 'noun', -1, true);
    lastNom = i; conjFlag = false;
  }
  finalize();
  return out;
}
let IRAB_LEMMAS = null;
function lemRoot(x) { return IRAB_LEMMAS && x.st.seg[3] >= 0 && IRAB_LEMMAS[x.st.seg[3]] ? IRAB_LEMMAS[x.st.seg[3]][3] : ''; }

/* Phrase d'iʿrāb « à la manière des grammairiens », en français */
function irabSentence(words, res, k) {
  const r = res[k]; const x = irabWordInfo(words[k]); const role = IRAB_ROLES[r.key] || IRAB_ROLES.noun;
  let s = '**' + irabRoleName(r.key) + '** (' + role[2] + ', ' + role[1] + ')';
  if (r.guess) s += ' — *probable*';
  if (r.head >= 0 && role[4]) s += ', rattaché à ' + wordText(words[r.head]);
  if (x.f.pos === 'N' && x.f.cas) s += ' ; ' + CASE_SHORT[x.f.cas];
  if (x.f.pos === 'V') s += ' ; ' + ({ PERF: 'passé', IMPF: 'présent', IMPV: 'impératif' }[x.f.aspect] || '') + (x.f.mood ? ' ' + MOOD_SHORT[x.f.mood] : '') + (x.f.pass ? ', passif' : '');
  return s + '.';
}
/* ====================================================================
 * 03 - Constructeur de phrases : vocabulaire, accords, conjugaison
 * ==================================================================== */
const F = AR.FATHA, D = AR.DAMMA, K = AR.KASRA, S = AR.SUKUN, SH = AR.SHADDA;
const VOWEL = { a: F, i: K, u: D };

// Noms : stem vocalisé sans la voyelle finale ; g = genre arabe ; fr = [nom, genre français] ; ru
const NOUNS = [
  { id: 'walad', ar: 'وَلَد', g: 'm', fr: ['garçon', 'm'], ru: 'мальчик' },
  { id: 'bint', ar: 'بِنْت', g: 'f', fr: ['fille', 'f'], ru: 'девочка' },
  { id: 'talib', ar: 'طَالِب', g: 'm', fr: ['étudiant', 'm'], ru: 'студент' },
  { id: 'taliba', ar: 'طَالِبَة', g: 'f', fr: ['étudiante', 'f'], ru: 'студентка' },
  { id: 'muallim', ar: 'مُعَلِّم', g: 'm', fr: ['enseignant', 'm'], ru: 'учитель' },
  { id: 'muallima', ar: 'مُعَلِّمَة', g: 'f', fr: ['enseignante', 'f'], ru: 'учительница' },
  { id: 'rajul', ar: 'رَجُل', g: 'm', fr: ['homme', 'm'], ru: 'мужчина' },
  { id: 'kitab', ar: 'كِتَاب', g: 'm', fr: ['livre', 'm'], ru: 'книга' },
  { id: 'dars', ar: 'دَرْس', g: 'm', fr: ['leçon', 'f'], ru: 'урок' },
  { id: 'risala', ar: 'رِسَالَة', g: 'f', fr: ['lettre', 'f'], ru: 'письмо' },
  { id: 'qalam', ar: 'قَلَم', g: 'm', fr: ['stylo', 'm'], ru: 'ручка' },
  { id: 'bayt', ar: 'بَيْت', g: 'm', fr: ['maison', 'f'], ru: 'дом' },
  { id: 'bab', ar: 'بَاب', g: 'm', fr: ['porte', 'f'], ru: 'дверь' },
  { id: 'madrasa', ar: 'مَدْرَسَة', g: 'f', fr: ['école', 'f'], ru: 'школа' },
  { id: 'masjid', ar: 'مَسْجِد', g: 'm', fr: ['mosquée', 'f'], ru: 'мечеть' },
  { id: 'ghurfa', ar: 'غُرْفَة', g: 'f', fr: ['chambre', 'f'], ru: 'комната' },
  { id: 'hadiqa', ar: 'حَدِيقَة', g: 'f', fr: ['jardin', 'm'], ru: 'сад' },
  { id: 'sayyara', ar: 'سَيَّارَة', g: 'f', fr: ['voiture', 'f'], ru: 'машина' },
  { id: 'halib', ar: 'حَلِيب', g: 'm', fr: ['lait', 'm'], ru: 'молоко' },
  { id: 'qahwa', ar: 'قَهْوَة', g: 'f', fr: ['café', 'm'], ru: 'кофе' },
  { id: 'asir', ar: 'عَصِير', g: 'm', fr: ['jus', 'm'], ru: 'сок' },
  { id: 'taam', ar: 'طَعَام', g: 'm', fr: ['repas', 'm'], ru: 'еда' },
  { id: 'sawt', ar: 'صَوْت', g: 'm', fr: ['voix', 'f'], ru: 'голос' },
  { id: 'khabar', ar: 'خَبَر', g: 'm', fr: ['nouvelle', 'f'], ru: 'новость' },
  { id: 'sura', ar: 'صُورَة', g: 'f', fr: ['image', 'f'], ru: 'картина' },
  { id: 'muhammad', ar: 'مُحَمَّد', g: 'm', fr: ['Mohammed', 'm'], ru: 'Мухаммад', proper: true },
  { id: 'ahmad', ar: 'أَحْمَد', g: 'm', fr: ['Ahmed', 'm'], ru: 'Ахмад', proper: true, diptote: true },
  { id: 'yusuf', ar: 'يُوسُف', g: 'm', fr: ['Youssef', 'm'], ru: 'Юсуф', proper: true, diptote: true },
  { id: 'fatima', ar: 'فَاطِمَة', g: 'f', fr: ['Fatima', 'f'], ru: 'Фатима', proper: true, diptote: true },
  { id: 'maryam', ar: 'مَرْيَم', g: 'f', fr: ['Maryam', 'f'], ru: 'Марьям', proper: true, diptote: true },
  { id: 'allah', ar: 'اللَّه', g: 'm', fr: ['Allah', 'm'], ru: 'Аллах', proper: true, noTanwin: true, noSubjVerb: true },
];
const ADJS = [
  { id: 'kabir', ar: 'كَبِير', fr: ['grand', 'grande'], pre: true, ru: 'большой' },
  { id: 'saghir', ar: 'صَغِير', fr: ['petit', 'petite'], pre: true, ru: 'маленький' },
  { id: 'jamil', ar: 'جَمِيل', fr: ['beau', 'belle', 'bel'], pre: true, ru: 'красивый' },
  { id: 'jadid', ar: 'جَدِيد', fr: ['nouveau', 'nouvelle', 'nouvel'], pre: true, ru: 'новый' },
  { id: 'qadim', ar: 'قَدِيم', fr: ['ancien', 'ancienne'], ru: 'старый' },
  { id: 'mujtahid', ar: 'مُجْتَهِد', fr: ['travailleur', 'travailleuse'], ru: 'прилежный' },
  { id: 'said', ar: 'سَعِيد', fr: ['heureux', 'heureuse'], ru: 'счастливый' },
  { id: 'nazif', ar: 'نَظِيف', fr: ['propre', 'propre'], ru: 'чистый' },
  { id: 'maftuh', ar: 'مَفْتُوح', fr: ['ouvert', 'ouverte'], ru: 'открытый' },
  { id: 'hazin', ar: 'حَزِين', fr: ['triste', 'triste'], ru: 'грустный' },
  { id: 'karim', ar: 'كَرِيم', fr: ['généreux', 'généreuse'], ru: 'щедрый' },
  { id: 'rahim', ar: 'رَحِيم', fr: ['miséricordieux', 'miséricordieuse'], ru: 'милосердный' },
  { id: 'mashghul', ar: 'مَشْغُول', fr: ['occupé', 'occupée'], ru: 'занятый' },
];
// Verbes trilitères sains : r = radicales, pv = voyelle du passé, iv = voyelle du présent
const VERBS = [
  { id: 'kataba', r: 'كتب', pv: 'a', iv: 'u', tr: true, fr: { inf: 'écrire', pp: 'écrit', aux: 'a', pres: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'], fut: 'écrir' }, ru: 'писать', obj: ['risala', 'dars', 'kitab'] },
  { id: 'fataha', r: 'فتح', pv: 'a', iv: 'a', tr: true, fr: { inf: 'ouvrir', pp: 'ouvert', aux: 'a', pres: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'], fut: 'ouvrir' }, ru: 'открывать', obj: ['bab', 'kitab'] },
  { id: 'shariba', r: 'شرب', pv: 'i', iv: 'a', tr: true, fr: { inf: 'boire', pp: 'bu', aux: 'a', pres: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'], fut: 'boir' }, ru: 'пить', obj: ['halib', 'qahwa', 'asir'] },
  { id: 'fahima', r: 'فهم', pv: 'i', iv: 'a', tr: true, fr: { inf: 'comprendre', pp: 'compris', aux: 'a', pres: ['comprends', 'comprends', 'comprend', 'comprenons', 'comprenez', 'comprennent'], fut: 'comprendr' }, ru: 'понимать', obj: ['dars', 'khabar'] },
  { id: 'samia', r: 'سمع', pv: 'i', iv: 'a', tr: true, fr: { inf: 'entendre', pp: 'entendu', aux: 'a', pres: ['entends', 'entends', 'entend', 'entendons', 'entendez', 'entendent'], fut: 'entendr' }, ru: 'слышать', obj: ['sawt', 'khabar'] },
  { id: 'arafa', r: 'عرف', pv: 'a', iv: 'i', tr: true, fr: { inf: 'connaître', pp: 'connu', aux: 'a', pres: ['connais', 'connais', 'connaît', 'connaissons', 'connaissez', 'connaissent'], fut: 'connaîtr' }, ru: 'знать', obj: ['muallim', 'khabar'] },
  { id: 'hamala', r: 'حمل', pv: 'a', iv: 'i', tr: true, fr: { inf: 'porter', pp: 'porté', aux: 'a', pres: ['porte', 'portes', 'porte', 'portons', 'portez', 'portent'], fut: 'porter' }, ru: 'нести', obj: ['kitab', 'qalam'] },
  { id: 'talaba', r: 'طلب', pv: 'a', iv: 'u', tr: true, fr: { inf: 'demander', pp: 'demandé', aux: 'a', pres: ['demande', 'demandes', 'demande', 'demandons', 'demandez', 'demandent'], fut: 'demander' }, ru: 'просить', obj: ['taam', 'qahwa'] },
  { id: 'darasa', r: 'درس', pv: 'a', iv: 'u', tr: true, fr: { inf: 'étudier', pp: 'étudié', aux: 'a', pres: ['étudie', 'étudies', 'étudie', 'étudions', 'étudiez', 'étudient'], fut: 'étudier' }, ru: 'изучать', obj: ['dars', 'kitab'] },
  { id: 'rasama', r: 'رسم', pv: 'a', iv: 'u', tr: true, fr: { inf: 'dessiner', pp: 'dessiné', aux: 'a', pres: ['dessine', 'dessines', 'dessine', 'dessinons', 'dessinez', 'dessinent'], fut: 'dessiner' }, ru: 'рисовать', obj: ['sura', 'bayt'] },
  { id: 'ghasala', r: 'غسل', pv: 'a', iv: 'i', tr: true, fr: { inf: 'laver', pp: 'lavé', aux: 'a', pres: ['lave', 'laves', 'lave', 'lavons', 'lavez', 'lavent'], fut: 'laver' }, ru: 'мыть', obj: ['sayyara', 'bab'] },
  { id: 'abada', r: 'عبد', pv: 'a', iv: 'u', tr: true, fr: { inf: 'adorer', pp: 'adoré', aux: 'a', pres: ['adore', 'adores', 'adore', 'adorons', 'adorez', 'adorent'], fut: 'adorer' }, ru: 'поклоняться', obj: ['allah'] },
  { id: 'hamida', r: 'حمد', pv: 'i', iv: 'a', tr: true, fr: { inf: 'louer', pp: 'loué', aux: 'a', pres: ['loue', 'loues', 'loue', 'louons', 'louez', 'louent'], fut: 'louer' }, ru: 'восхвалять', obj: ['allah'] },
  { id: 'nasara', r: 'نصر', pv: 'a', iv: 'u', tr: true, fr: { inf: 'aider', pp: 'aidé', aux: 'a', pres: ['aide', 'aides', 'aide', 'aidons', 'aidez', 'aident'], fut: 'aider' }, ru: 'помогать', obj: ['talib', 'rajul'] },
  { id: 'sanaa', r: 'صنع', pv: 'a', iv: 'a', tr: true, fr: { inf: 'fabriquer', pp: 'fabriqué', aux: 'a', pres: ['fabrique', 'fabriques', 'fabrique', 'fabriquons', 'fabriquez', 'fabriquent'], fut: 'fabriquer' }, ru: 'делать', obj: ['bab', 'taam'] },
  { id: 'dhahaba', r: 'ذهب', pv: 'a', iv: 'a', tr: false, prep: 'ila', fr: { inf: 'aller', pp: 'allé', aux: 'e', pres: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], fut: 'ir' }, ru: 'идти' },
  { id: 'kharaja', r: 'خرج', pv: 'a', iv: 'u', tr: false, prep: 'min', fr: { inf: 'sortir', pp: 'sorti', aux: 'e', pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], fut: 'sortir' }, ru: 'выходить' },
  { id: 'rajaa', r: 'رجع', pv: 'a', iv: 'i', tr: false, prep: 'ila', fr: { inf: 'rentrer', pp: 'rentré', aux: 'e', pres: ['rentre', 'rentres', 'rentre', 'rentrons', 'rentrez', 'rentrent'], fut: 'rentrer' }, ru: 'возвращаться' },
  { id: 'laiba', r: 'لعب', pv: 'i', iv: 'a', tr: false, prep: 'fi', fr: { inf: 'jouer', pp: 'joué', aux: 'a', pres: ['joue', 'joues', 'joue', 'jouons', 'jouez', 'jouent'], fut: 'jouer' }, ru: 'играть' },
  { id: 'dahika', r: 'ضحك', pv: 'i', iv: 'a', tr: false, prep: 'maa', fr: { inf: 'rire', pp: 'ri', aux: 'a', pres: ['ris', 'ris', 'rit', 'rions', 'riez', 'rient'], fut: 'rir' }, ru: 'смеяться' },
  { id: 'qala', r: 'قول', hollow: 'w', tr: true, fr: { inf: 'dire', pp: 'dit', aux: 'a', pres: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'], fut: 'dir' }, ru: 'говорить', obj: ['khabar'], note: 'verbe **creux** (2e radicale و) : la voyelle longue ā / ū devient courte quand la syllabe se ferme (قَالَ → قُلْتُ, يَقُولُ → لَمْ يَقُلْ).' },
  { id: 'zara', r: 'زور', hollow: 'w', tr: true, fr: { inf: 'visiter', pp: 'visité', aux: 'a', pres: ['visite', 'visites', 'visite', 'visitons', 'visitez', 'visitent'], fut: 'visiter' }, ru: 'посещать', obj: ['masjid', 'muallim', 'madrasa'], note: 'verbe **creux** (و) : زَارَ → زُرْتُ, يَزُورُ → لَمْ يَزُرْ.' },
  { id: 'nama', r: 'نوم', hollow: 'a', tr: false, prep: 'fi', fr: { inf: 'dormir', pp: 'dormi', aux: 'a', pres: ['dors', 'dors', 'dort', 'dormons', 'dormez', 'dorment'], fut: 'dormir' }, ru: 'спать', note: 'verbe **creux** à présent en ā : نَامَ → نِمْتُ, يَنَامُ → لَمْ يَنَمْ.' },
  { id: 'sara', r: 'سير', hollow: 'y', tr: false, prep: 'ila', fr: { inf: 'marcher', pp: 'marché', aux: 'a', pres: ['marche', 'marches', 'marche', 'marchons', 'marchez', 'marchent'], fut: 'marcher' }, ru: 'идти', note: 'verbe **creux** (2e radicale ي) : سَارَ → سِرْتُ, يَسِيرُ → لَمْ يَسِرْ.' },
  { id: 'kana', r: 'كون', hollow: 'w', tr: false, prep: 'fi', fr: { inf: 'être', pp: 'été', aux: 'a', pres: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'], fut: 'ser' }, ru: 'быть', note: 'كَانَ comme verbe « être (quelque part) » : verbe **creux**, كَانَ → كُنْتُ, يَكُونُ → لَمْ يَكُنْ (comme dans 112:4).' },
  { id: 'arsala', r: 'رسل', form: 4, tr: true, fr: { inf: 'envoyer', pp: 'envoyé', aux: 'a', pres: ['envoie', 'envoies', 'envoie', 'envoyons', 'envoyez', 'envoient'], fut: 'enverr' }, ru: 'посылать', obj: ['risala', 'kitab'], note: 'verbe de **forme IV** (أَفْعَلَ) : أَ au passé, et le présent commence par **u** : يُرْسِلُ.' },
  { id: 'akhraja', r: 'خرج', form: 4, tr: true, fr: { inf: 'sortir', pp: 'sorti', aux: 'a', pres: ['sors', 'sors', 'sort', 'sortons', 'sortez', 'sortent'], fut: 'sortir' }, ru: 'выводить', obj: ['kitab', 'qalam'], note: 'forme IV de خَرَجَ (sortir) : « faire sortir ». Présent يُخْرِجُ.' },
  { id: 'anzala', r: 'نزل', form: 4, tr: true, fr: { inf: 'descendre', pp: 'descendu', aux: 'a', pres: ['descends', 'descends', 'descend', 'descendons', 'descendez', 'descendent'], fut: 'descendr' }, ru: 'ниспосылать', obj: ['kitab'], note: 'forme IV de نَزَلَ : « faire descendre, révéler » (أَنْزَلَ ٱلْكِتَابَ). Présent يُنْزِلُ.' },
  { id: 'amana', r: 'أمن', form: 4, tr: false, prep: 'bi', prepFr: 'en', defPP: 'allah', fr: { inf: 'croire', pp: 'cru', aux: 'a', pres: ['crois', 'crois', 'croit', 'croyons', 'croyez', 'croient'], fut: 'croir' }, ru: 'веровать', note: 'verbe de **forme IV** (racine أ م ن, « sécurité ») : on dit آمَنَ بِـ pour « croire en ». Hamza + alif s\'écrivent آ. Présent : يُؤْمِنُ.' },
  { id: 'nazala', r: 'نزل', pv: 'a', iv: 'i', tr: false, prep: 'min', fr: { inf: 'descendre', pp: 'descendu', aux: 'e', pres: ['descends', 'descends', 'descend', 'descendons', 'descendez', 'descendent'], fut: 'descendr' }, ru: 'спускаться' },
];
const PREPS = [
  { id: 'fi', ar: 'فِي', fr: 'dans', ru: 'в' }, { id: 'ila', ar: 'إِلَى', fr: 'à', ru: 'к / в' }, { id: 'min', ar: 'مِنْ', fr: 'de', ru: 'из' },
  { id: 'ala', ar: 'عَلَى', fr: 'sur', ru: 'на' }, { id: 'maa', ar: 'مَعَ', fr: 'avec', ru: 'с' }, { id: 'bi', ar: 'بِـ', fr: 'avec (au moyen de)', ru: '(творительный)', attached: true },
  { id: 'li', ar: 'لِـ', fr: 'pour', ru: 'для', attached: true },
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
  if (!isPP && !c.q) notes.push('Il n\'y a pas de verbe « être » au présent : الْوَلَدُ كَبِيرٌ = « le garçon [est] grand », comme en russe « мальчик — большой ».');
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
/* ====================================================================
 * 04 - Données : chargement local du Coran (aucune connexion internet)
 * ==================================================================== */

const DATA_VERSION = '2';
const DATA_URL = 'https://raw.githubusercontent.com/lPeaPSqeaKl/arabe-/main/data/';
const INL_NAMES = { 'ا': 'alif', 'ل': 'lām', 'م': 'mīm', 'ص': 'ṣād', 'ر': 'rā', 'ك': 'kāf', 'ه': 'hā', 'ي': 'yā', 'ع': 'ʿayn', 'ط': 'ṭā', 'س': 'sīn', 'ح': 'ḥā', 'ق': 'qāf', 'ن': 'nūn' };
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function arNum(n) { return String(n).replace(/\d/g, d => AR_DIGITS[d]); }

function wordText(w) { return w.map(g => g[0]).join(''); }
function isInitials(w) { return w.length === 1 && (w[0][2] || '').split('|')[0] === 'INL'; }
function initialsTranslit(w) { return skeleton(wordText(w)).split('').map(c => INL_NAMES[c] || c).join('-'); }

/* Translittération d'un verset du corpus (gère les lettres isolées الٓمٓ) */
function translitVerse(words, style) {
  const parts = []; let run = [];
  const flush = () => { if (run.length) { parts.push(translitPhrase(run, style)); run = []; } };
  for (const w of words) {
    if (isInitials(w)) { flush(); parts.push(initialsTranslit(w)); } else run.push(wordText(w));
  }
  flush();
  return parts.join(' ');
}
function translitTokens(words, style) {
  const t = translitVerse(words, style).split(' ');
  return t.length === words.length ? t : words.map(w => isInitials(w) ? initialsTranslit(w) : translitPhrase([wordText(w)], style));
}

class QuranData {
  constructor(app, dir) {
    this.app = app; this.dir = dir; this.cache = new Map();
    this.surahs = null; this.lemmas = null; this.byRoot = null; this.forms = null; this.formsPromise = null;
  }
  async readJSON(rel) {
    const txt = await this.app.vault.adapter.read(this.dir + '/data/' + rel);
    return JSON.parse(txt);
  }
  /* Sur iPad / installation par BRAT, le dossier data n'existe pas : on le télécharge une seule fois */
  async ensureData(progress) {
    const ad = this.app.vault.adapter; const base = this.dir + '/data';
    try { if ((await ad.read(base + '/version.txt')).trim() === DATA_VERSION) return; } catch (e) { /* absent */ }
    if (!(await ad.exists(base))) await ad.mkdir(base);
    if (!(await ad.exists(base + '/s'))) await ad.mkdir(base + '/s');
    const files = ['surahs.json', 'lemmas.json'];
    for (let i = 1; i <= 114; i++) files.push('s/' + String(i).padStart(3, '0') + '.json');
    let done = 0;
    const worker = async () => {
      while (files.length) {
        const f = files.shift();
        const r = await requestUrl({ url: DATA_URL + f });
        await ad.write(base + '/' + f, r.text);
        done++; if (progress) progress(done, 116);
      }
    };
    try { await Promise.all([worker(), worker(), worker(), worker()]); }
    catch (e) { throw new Error('Première installation : connexion internet nécessaire pour télécharger le Coran (' + e.message + ')'); }
    await ad.write(base + '/version.txt', DATA_VERSION);
  }
  async init(progress) {
    if (this.surahs) return;
    await this.ensureData(progress);
    const [s, l] = await Promise.all([this.readJSON('surahs.json'), this.readJSON('lemmas.json')]);
    this.surahs = s; this.lemmas = l;
    this.byRoot = new Map();
    l.forEach((x, i) => { if (x[3]) { if (!this.byRoot.has(x[3])) this.byRoot.set(x[3], []); this.byRoot.get(x[3]).push(i); } });
  }
  async surah(n) {
    if (this.cache.has(n)) return this.cache.get(n);
    const d = await this.readJSON('s/' + String(n).padStart(3, '0') + '.json');
    this.cache.set(n, d);
    return d;
  }
  surahInfo(n) { return this.surahs[n - 1]; }
  surahLabel(n) { const s = this.surahInfo(n); return n + '. ' + s[1] + ' — ' + s[2]; }
  rootFamily(root, exceptId) {
    return (this.byRoot.get(root) || []).filter(i => i !== exceptId).map(i => ({ id: i, l: this.lemmas[i] })).sort((a, b) => b.l[5] - a.l[5]);
  }
  allRefsOf(lemId) { return this.lemRefs ? (this.lemRefs.get(lemId) || []) : this.refsOf(lemId); }
  refsOf(lemId) {
    const l = this.lemmas[lemId];
    if (!l || !l[6]) return [];
    return l[6].split(',').map(r => r.split(':').map(Number));
  }
  /* Index de toutes les formes du Coran (construit une seule fois, à la demande) */
  buildForms(progress) {
    if (this.forms) return Promise.resolve(this.forms);
    if (this.formsPromise) return this.formsPromise;
    this.formsPromise = (async () => {
      const forms = new Map(); const pos = new Map(); const lemRefs = new Map(); const lemForms = new Map();
      for (let s = 1; s <= 114; s++) {
        const d = await this.surah(s);
        d.v.forEach((v, vi) => v[2].forEach((w, wi) => {
          const txt = wordText(w);
          const key = skeleton(txt, true);
          if (!key) return;
          if (!pos.has(key)) pos.set(key, []); pos.get(key).push([s, vi + 1, wi + 1]);
          const lid = stemOf(w).seg[3];
          if (lid >= 0) {
            if (!lemRefs.has(lid)) { lemRefs.set(lid, []); lemForms.set(lid, new Map()); }
            lemRefs.get(lid).push([s, vi + 1, wi + 1]);
            const fm = lemForms.get(lid); fm.set(txt, (fm.get(txt) || 0) + 1);
          }
          let m = forms.get(key);
          if (!m) { m = new Map(); forms.set(key, m); }
          const e = m.get(txt);
          if (e) e.n++; else m.set(txt, { txt, n: 1, ref: [s, vi + 1, wi + 1] });
        }));
        if (progress && s % 10 === 0) progress(s);
      }
      this.forms = forms; this.pos = pos; this.lemRefs = lemRefs; this.lemForms = lemForms;
      return forms;
    })();
    return this.formsPromise;
  }
  /* Cherche des suites de mots du texte dans un même verset (pour choisir la bonne lecture) */
  async findRuns(words) {
    const keys = words.map(w => skeleton(w, true));
    const res = new Array(words.length).fill(null);
    let i = 0;
    while (i < words.length) {
      let best = null;
      for (const r of (this.pos.get(keys[i]) || []).slice(0, 4000)) {
        const v = this.cache.get(r[0]).v[r[1] - 1][2];
        let k = 1;
        while (i + k < words.length && r[2] - 1 + k < v.length && skeleton(wordText(v[r[2] - 1 + k]), true) === keys[i + k]) k++;
        if (!best || k > best.k) best = { r, k, v };
        if (k === words.length - i) break;
      }
      if (best && best.k >= 2) {
        for (let j = 0; j < best.k; j++) res[i + j] = { txt: wordText(best.v[best.r[2] - 1 + j]), ref: [best.r[0], best.r[1], best.r[2] + j], run: best.k };
        i += best.k;
      } else i++;
    }
    return res;
  }
  /* Cherche un mot (voyellé ou non) dans le Coran ; renvoie les candidats triés */
  lookup(word) {
    if (!this.forms) return [];
    const tries = [];
    const sk = skeleton(word, true);
    tries.push({ key: sk, strip: '' });
    if (/^[وف]/.test(sk) && sk.length > 2) tries.push({ key: sk.slice(1), strip: sk[0] });
    const out = []; const seen = new Set();
    for (const t of tries) {
      const m = this.forms.get(t.key);
      if (!m) continue;
      for (const e of m.values()) {
        if (seen.has(e.txt)) continue; seen.add(e.txt);
        const exact = normalizeForCompare(e.txt) === normalizeForCompare(word);
        out.push(Object.assign({ score: (exact ? 1000 : 0) + vowelScore(word, e.txt) * 10 + Math.log(1 + e.n) - (t.strip ? 5 : 0), exact, strip: t.strip }, e));
      }
      if (out.length) break;
    }
    return out.sort((a, b) => b.score - a.score);
  }
}
function normalizeForCompare(w) {
  return (w || '').replace(/ٱ/g, 'ا').replace(/[ۡ]/g, 'ْ').replace(/[ۖ-ۜ۞۩۝]/g, '').replace(/ى(?=$)/, 'ى');
}
/* ====================================================================
 * 05 - Interface : outils communs + lecture du Coran mot par mot
 * ==================================================================== */

function h(parent, tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
/* texte avec **gras** */
function mdText(parent, tag, cls, text) {
  const e = h(parent, tag, cls);
  const both = String(text || '').split(' ‖ ');
  if (both.length > 1) { mdText(e, 'div', null, both[0]); mdText(e, 'div', 'aa-ru', both[1]); return e; }
  String(text || '').split(/\*\*/).forEach((part, i) => {
    if (!part) return;
    addBidi(i % 2 ? h(e, 'b') : e, part);
  });
  return e;
}
/* isole chaque passage arabe dans un texte français, pour que l'ordre d'affichage reste juste */
const AR_RUN = /[؀-ۿݐ-ݿࢠ-ࣿ](?:[؀-ۿݐ-ݿࢠ-ࣿ\s…]*[؀-ۿݐ-ݿࢠ-ࣿ])?/g;
function addBidi(el, text) {
  let last = 0; let m;
  AR_RUN.lastIndex = 0;
  while ((m = AR_RUN.exec(text))) {
    if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
    const b = document.createElement('bdi'); b.className = 'aa-ari'; b.setAttribute('dir', 'rtl'); b.textContent = m[0]; el.appendChild(b);
    last = m.index + m[0].length;
  }
  if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
}
function arSpan(parent, text, cls) {
  const e = h(parent, 'span', 'aa-ar' + (cls ? ' ' + cls : ''), text);
  e.setAttribute('dir', 'rtl'); e.setAttribute('lang', 'ar');
  return e;
}
function btn(parent, label, onClick, cls) {
  const b = h(parent, 'button', 'aa-btn' + (cls ? ' ' + cls : ''), label);
  b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); onClick(ev); });
  return b;
}
function selectEl(parent, options, value, onChange, cls) {
  const s = h(parent, 'select', 'aa-select dropdown' + (cls ? ' ' + cls : ''));
  for (const [v, label] of options) { const o = h(s, 'option', null, label); o.value = String(v); }
  s.value = String(value);
  s.addEventListener('change', () => onChange(s.value));
  return s;
}
function field(parent, label) {
  const f = h(parent, 'label', 'aa-field');
  h(f, 'span', 'aa-field-label', label);
  return f;
}
function checkbox(parent, label, value, onChange) {
  const f = h(parent, 'label', 'aa-check');
  const c = h(f, 'input'); c.type = 'checkbox'; c.checked = !!value;
  c.addEventListener('change', () => onChange(c.checked));
  h(f, 'span', null, label);
  return f;
}
function details(parent, title, open, cls) {
  const d = h(parent, 'details', 'aa-details' + (cls ? ' ' + cls : ''));
  if (open) d.open = true;
  h(d, 'summary', null, title);
  return d;
}
function copyText(t) {
  try { navigator.clipboard.writeText(t); notify('Copié dans le presse-papiers'); } catch (e) { notify('Impossible de copier'); }
}
let notify = (msg) => { try { console.log(msg); } catch (e) { /* */ } };

/* ---------- Son ---------- */
const pad3 = n => String(n).padStart(3, '0');
let currentAudio = null;
function speak(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) { notify('La synthèse vocale n\'est pas disponible sur cet appareil.'); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[ۖ-ۭ]/g, ''));
    u.lang = 'ar-SA'; u.rate = 0.8;
    const v = synth.getVoices().find(x => /^ar/i.test(x.lang));
    if (v) u.voice = v; else notify('Aucune voix arabe installée : la lecture peut être incorrecte.');
    synth.speak(u);
  } catch (e) { notify('Son indisponible.'); }
}
function playUrl(urls, fallbackText) {
  if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* */ } }
  const list = urls.slice();
  const tryNext = () => {
    const u = list.shift();
    if (!u) { if (fallbackText) speak(fallbackText); else notify('Son indisponible (connexion internet nécessaire).'); return; }
    const a = new Audio(u); currentAudio = a;
    a.addEventListener('error', tryNext, { once: true });
    const p = a.play(); if (p && p.catch) p.catch(() => {});
  };
  tryNext();
}
function playVerse(s, v) { playUrl(['https://everyayah.com/data/Alafasy_128kbps/' + pad3(s) + pad3(v) + '.mp3', 'https://verses.quran.com/Alafasy/mp3/' + pad3(s) + pad3(v) + '.mp3']); }
function playWord(ref, text, ctx) {
  if (ctx && ctx.settings.audio === false) { speak(text); return; }
  if (!ref) { speak(text); return; }
  playUrl(['https://audio.qurancdn.com/wbw/' + pad3(ref[0]) + '_' + pad3(ref[1]) + '_' + pad3(ref[2]) + '.mp3'], text);
}
function soundBtn(parent, onClick, title) { const b = btn(parent, '🔊', onClick, 'aa-btn-quiet aa-sound'); b.title = title || 'Écouter'; return b; }

const POS_CLASS = { N: 'aa-pos-n', V: 'aa-pos-v', P: 'aa-pos-p' };
const CASE_SHORT = { NOM: 'nominatif', ACC: 'accusatif', GEN: 'génitif' };
const MOOD_SHORT = { IND: 'indicatif', SUBJ: 'subjonctif', JUS: 'apocopé' };

function refStr(r) { return r[0] + ':' + r[1]; }

/* ---------- Petit résumé du rôle d'un mot (pour la « structure ») ---------- */
function shortRole(words, wi) {
  const st = stemOf(words[wi]); const f = st.f;
  if (isInitials(words[wi])) return { label: 'lettres isolées', cls: 'aa-role-p' };
  if (f.pos === 'V') {
    const asp = { PERF: 'verbe au passé', IMPF: 'verbe au présent', IMPV: 'verbe à l\'impératif' }[f.aspect] || 'verbe';
    return { label: asp + (f.mood ? ' · ' + MOOD_SHORT[f.mood] : '') + (f.pass ? ' · passif' : ''), cls: 'aa-role-v' };
  }
  if (f.pos === 'N') {
    const what = f.sub ? (POS_NAMES[f.sub] || 'nom').split(' (')[0] : 'nom';
    return { label: what + (f.cas ? ' · ' + CASE_SHORT[f.cas] : ''), cls: f.cas ? 'aa-role-' + f.cas.toLowerCase() : 'aa-role-n' };
  }
  return { label: (PARTICLES[f.sub] || 'particule').split(/[ :(]/)[0].replace('conjonction', 'conjonction') || 'particule', cls: 'aa-role-p' };
}
function sentenceKind(words) {
  for (let i = 0; i < words.length; i++) {
    const st = stemOf(words[i]); const f = st.f;
    if (isInitials(words[i])) continue;
    if (f.pos === 'P' && ['CONJ', 'REM'].includes(f.sub)) continue;
    if (f.pos === 'V') return 'Phrase **verbale** : elle commence par un verbe (ordre arabe habituel : verbe → sujet → complément).';
    if (f.pos === 'P' && f.fam === 'إِنّ') return 'Phrase **nominale** introduite par ' + st.seg[0] + ' : le nom qui suit est à l\'accusatif, l\'attribut au nominatif.';
    if (f.pos === 'P' && f.sub === 'NEG') continue;
    if (f.pos === 'P' && f.sub === 'P') return 'Phrase qui commence par une **préposition** : souvent « à X appartient… / dans X il y a… » (attribut placé en tête).';
    if (f.pos === 'N') return 'Phrase **nominale** : elle commence par un nom ou un pronom (sujet → attribut, sans verbe « être »).';
    return 'Phrase introduite par une particule (' + st.seg[0] + ').';
  }
  return '';
}

/* ====================================================================
 * Détail d'un mot du Coran
 * ==================================================================== */
function renderWordDetail(ctx, el, words, wi, ref, verse) {
  clear(el);
  el.addClass ? el.addClass('aa-detail-open') : el.classList.add('aa-detail-open');
  const data = ctx.data; const style = ctx.settings.style;
  const word = words[wi]; const txt = wordText(word);
  const e = explainQuranWord(words, wi, data.lemmas);
  const st = stemOf(word);
  const tr = translitTokens(words, style)[wi];

  const head = h(el, 'div', 'aa-dhead');
  const left = h(head, 'div', 'aa-dhead-main');
  arSpan(left, txt, 'aa-big');
  h(left, 'div', 'aa-tr', tr);
  soundBtn(left, () => playWord(ref, txt, ctx), 'Écouter ce mot');
  const right = h(head, 'div', 'aa-dhead-info');
  h(right, 'span', 'aa-badge ' + (POS_CLASS[st.f.pos] || ''), isInitials(word) ? 'Lettres isolées' : e.title);
  if (e.gloss) { const g = h(right, 'div', 'aa-gloss'); h(g, 'span', 'aa-muted', 'sens de base : '); h(g, 'b', null, e.gloss); }
  if (e.lemma) {
    const l = h(right, 'div', 'aa-lemma');
    h(l, 'span', 'aa-muted', 'forme de dictionnaire : '); arSpan(l, e.lemma);
    if (e.root) { h(l, 'span', 'aa-muted', ' · racine : '); arSpan(l, e.root.split('').join(' '), 'aa-rootl'); }
    if (e.count) h(l, 'span', 'aa-muted', ' · ' + e.count + ' fois dans le Coran');
  }
  const lemRow = st.seg[3] >= 0 ? data.lemmas[st.seg[3]] : null;
  if (lemRow && lemRow[7]) mdText(right, 'div', 'aa-def', lemRow[7]);
  if (lemRow && lemRow[8] && (ctx.settings.showRu || ctx.settings.ruExpl)) h(right, 'div', 'aa-ru', '🇷🇺 ' + lemRow[8]);
  if (lemRow) { const lk = h(right, 'a', 'aa-link aa-small', '📖 Voir dans le dictionnaire'); lk.addEventListener('click', ev => { ev.preventDefault(); ctx.openDict(st.seg[3]); }); }
  if (isInitials(word)) mdText(el, 'p', 'aa-why', 'Ces lettres se lisent **par leur nom** : ' + initialsTranslit(word) + '. On les appelle « al-ḥurūf al-muqaṭṭaʿa » ; leur sens n\'est connu que d\'Allah.');

  // morceaux
  if (word.length > 1) {
    h(el, 'h4', null, 'Les morceaux du mot');
    const row = h(el, 'div', 'aa-segs');
    e.segs.forEach(s => {
      const c = h(row, 'div', 'aa-seg aa-seg-' + s.kind);
      arSpan(c, s.ar);
      h(c, 'div', 'aa-seg-label', s.kind === 'stem' ? 'le mot lui-même' : s.label);
      if (s.text) h(c, 'div', 'aa-seg-text', s.text);
    });
  }
  // fiche
  if (e.facts.length) {
    const t = h(el, 'table', 'aa-facts');
    e.facts.forEach(([k, v]) => { const r = h(t, 'tr'); h(r, 'th', null, k); h(r, 'td', null, v); });
  }
  if (e.why.length) {
    h(el, 'h4', null, 'Pourquoi cette forme ?');
    const ul = h(el, 'ul', 'aa-why-list');
    e.why.forEach(w => mdText(ul, 'li', null, w));
  }
  // lettres
  const dl = details(el, 'Lettre par lettre : chaque signe et son son', ctx.settings.openLetters);
  renderTiles(dl, txt);
  // alternatives
  const alts = endingAlternatives(st.seg[0], st.f);
  if (alts.length) {
    h(el, 'h4', null, 'Et si on changeait le dernier signe ?');
    const pre = word.slice(0, st.idx).map(s => s[0]).join(''); const post = word.slice(st.idx + 1).map(s => s[0]).join('');
    const box = h(el, 'div', 'aa-alts');
    alts.forEach(a => {
      const full = pre + a.ar + post;
      const cur = a.ar === st.seg[0] || (st.f.cas === a.cas) || (st.f.mood === a.cas);
      const r = h(box, 'div', 'aa-alt' + (cur ? ' aa-alt-cur' : ''));
      arSpan(r, full, 'aa-mid');
      h(r, 'span', 'aa-tr', translitPhrase([full], style));
      const lab = h(r, 'span', 'aa-alt-why');
      const parts = a.why.split(' : ');
      h(lab, 'b', null, parts[0] + ' : ');
      lab.appendChild(document.createTextNode(parts.slice(1).join(' : ')));
      if (cur) h(r, 'span', 'aa-tag', '← c\'est la forme du verset');
    });
    mdText(el, 'p', 'aa-muted aa-small', 'Le sens du mot ne change pas : c\'est son **rôle dans la phrase** qui change. Seule la dernière voyelle le montre.');
  }
  // famille de la racine
  if (e.root && data.byRoot) {
    const fam = data.rootFamily(e.root, st.seg[3]);
    if (fam.length) {
      const d = details(el, 'La famille de la racine ' + e.root.split('').join(' ') + ' (' + fam.length + ' autres mots)', false);
      const grid = h(d, 'div', 'aa-family');
      fam.slice(0, 24).forEach(x => {
        const c = h(grid, 'div', 'aa-fam');
        arSpan(c, x.l[0]);
        h(c, 'div', 'aa-fam-g', x.l[4]);
        h(c, 'div', 'aa-muted aa-small', (x.l[1] === 'V' ? 'verbe' : x.l[1] === 'N' ? 'nom' : 'particule') + ' · ' + x.l[5] + '×');
        c.addEventListener('click', () => renderOccurrences(ctx, occ, x.id, null));
      });
      const occ = h(d, 'div', 'aa-occ-box');
    }
  }
  // autres occurrences
  if (st.seg[3] >= 0) {
    const d = details(el, 'Ce mot ailleurs dans le Coran', false);
    const box = h(d, 'div', 'aa-occ-box');
    d.addEventListener('toggle', () => { if (d.open && !box.firstChild) renderOccurrences(ctx, box, st.seg[3], ref); });
  }
  // actions
  const act = h(el, 'div', 'aa-actions');
  const caseInfo = e.facts.filter(f => ['Cas', 'Mode', 'Temps'].includes(f[0])).map(f => f[1].split(' — ')[0].split(' (')[0]).join(', ');
  const summary = txt + ' (' + tr + ') — ' + (e.gloss || e.title) + (caseInfo ? ' · ' + caseInfo : '') + (ref ? ' · Coran ' + ref[0] + ':' + ref[1] : '');
  btn(act, 'Copier', () => copyText(summary));
  btn(act, 'Insérer dans la note', () => ctx.insertText('- ' + summary + '\n'));
  if (lemRow) btn(act, ctx.isMine(st.seg[3]) ? '✓ Dans mon vocabulaire' : 'Ajouter à mon vocabulaire', (ev) => { ctx.addVocab(st.seg[3], txt, isInitials(word) ? tr : translitPhrase([txt], ctx.settings.style), e.gloss, ref ? ref[0] + ':' + ref[1] : ''); ev.target.textContent = '✓ Dans mon vocabulaire'; });
  btn(act, 'Créer une flashcard', () => ctx.addFlashcard(txt + (ref ? ' (' + ref[0] + ':' + ref[1] + ')' : ''), (e.gloss || e.title) + ' — ' + tr + (caseInfo ? ' — ' + caseInfo : '') + (e.why[0] ? ' — ' + e.why[0].replace(/\*\*/g, '') : '')));
  btn(act, 'Fermer', () => { clear(el); el.classList.remove('aa-detail-open'); }, 'aa-btn-quiet');
}

function renderTiles(parent, txt) {
  const row = h(parent, 'div', 'aa-tiles');
  row.setAttribute('dir', 'rtl');
  describeUnits(txt).forEach(u => {
    const t = h(row, 'div', 'aa-tile' + (u.isLast ? ' aa-tile-last' : ''));
    arSpan(t, (u.b === 'ـ' ? '' : u.b) + u.m, 'aa-tile-ar');
    const info = h(t, 'div', 'aa-tile-info'); info.setAttribute('dir', 'ltr');
    h(info, 'div', 'aa-tile-name', u.name);
    u.marks.forEach(m => h(info, 'div', 'aa-tile-mark', m.name + ' : ' + m.sound));
    if (!u.marks.length && u.sound && !u.note) h(info, 'div', 'aa-tile-mark aa-muted', u.sound);
    if (u.note) h(info, 'div', 'aa-tile-note', u.note);
    if (u.isLast) h(info, 'div', 'aa-tile-flag', 'dernière lettre : son signe donne le cas / le mode');
  });
}

async function renderOccurrences(ctx, box, lemId, curRef) {
  clear(box);
  const data = ctx.data; const l = data.lemmas[lemId];
  const refs = data.refsOf(lemId).filter(r => !curRef || r[0] !== curRef[0] || r[1] !== curRef[1]);
  const head = h(box, 'div', 'aa-occ-head');
  arSpan(head, l[0]); h(head, 'span', null, ' « ' + l[4] + ' » — ' + l[5] + ' fois dans le Coran' + (l[5] > 40 ? ' (40 premiers exemples)' : ''));
  const list = h(box, 'div', 'aa-occ-list');
  let shown = 0;
  const showMore = async (k) => {
    for (const r of refs.slice(shown, shown + k)) {
      const d = await data.surah(r[0]); const v = d.v[r[1] - 1]; if (!v) continue;
      const item = h(list, 'div', 'aa-occ');
      const a = h(item, 'div', 'aa-occ-ar'); a.setAttribute('dir', 'rtl');
      v[2].forEach((w, wi) => { arSpan(a, wordText(w), wi === r[2] - 1 ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
      const m = h(item, 'div', 'aa-occ-meta');
      const link = h(m, 'a', 'aa-link', data.surahInfo(r[0])[1] + ' ' + r[0] + ':' + r[1]);
      link.addEventListener('click', (ev) => { ev.preventDefault(); ctx.openQuran(r[0], r[1]); });
      h(m, 'span', 'aa-muted', ' — ' + v[0]);
    }
    shown += k;
    more.style.display = shown < refs.length ? '' : 'none';
  };
  const more = btn(box, 'Voir plus d\'exemples', () => showMore(6), 'aa-btn-quiet');
  await showMore(4);
}

/* ====================================================================
 * Affichage de versets (onglet Coran et bloc ```coran```)
 * ==================================================================== */
async function renderVerses(ctx, container, surahN, from, to, opts) {
  opts = opts || {};
  const data = ctx.data; const S = ctx.settings;
  const d = await data.surah(surahN);
  const info = data.surahInfo(surahN);
  to = Math.min(to || d.v.length, d.v.length); from = Math.max(1, from || 1);
  if (opts.title) {
    const t = h(container, 'div', 'aa-surah-title');
    arSpan(t, info[3], 'aa-mid');
    h(t, 'div', null, 'Sourate ' + surahN + ' · ' + info[1] + ' — ' + info[2] + ' · ' + info[4] + ' · ' + info[5] + ' versets');
  }
  if (from === 1 && surahN !== 1 && surahN !== 9 && opts.basmala !== false) {
    const b = h(container, 'div', 'aa-basmala'); arSpan(b, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
  }
  for (let vn = from; vn <= to; vn++) {
    const v = d.v[vn - 1]; const words = v[2];
    const box = h(container, 'div', 'aa-verse'); box.dataset.ref = surahN + ':' + vn;
    const line = h(box, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); line.style.fontSize = S.arSize + 'px';
    const tokens = translitTokens(words, S.style);
    const detail = h(document.createElement('div'), 'div', 'aa-detail');
    const spans = [];
    words.forEach((w, wi) => {
      const st = stemOf(w);
      const sp = arSpan(line, wordText(w), 'aa-w ' + (POS_CLASS[st.f.pos] || '') + (isInitials(w) ? ' aa-pos-inl' : '') + (st.seg[3] >= 0 && ctx.isMine(st.seg[3]) ? ' aa-mine' : ''));
      sp.title = tokens[wi];
      sp.addEventListener('click', () => {
        spans.forEach(x => x.classList.remove('aa-w-sel')); sp.classList.add('aa-w-sel');
        renderWordDetail(ctx, detail, words, wi, [surahN, vn, wi + 1], v);
        detail.scrollIntoView && detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      spans.push(sp);
      line.appendChild(document.createTextNode(' '));
    });
    arSpan(line, '﴿' + arNum(vn) + '﴾', 'aa-vnum');
    if (S.showTr) {
      const trl = h(box, 'div', 'aa-tr aa-verse-tr');
      tokens.forEach((t, i) => { const s = h(trl, 'span', 'aa-trw', t); s.addEventListener('click', () => spans[i].click()); trl.appendChild(document.createTextNode(' ')); });
    }
    if (S.showFr) { const fr = h(box, 'div', 'aa-verse-fr'); h(fr, 'span', 'aa-ref', surahN + ':' + vn + ' '); fr.appendChild(document.createTextNode(v[0])); }
    if (S.showRu && v[1]) h(box, 'div', 'aa-verse-ru', v[1]);
    const tools = h(box, 'div', 'aa-verse-tools');
    const structBox = h(document.createElement('div'), 'div', 'aa-struct');
    btn(tools, '🧩 Analyse de la phrase', () => {
      if (structBox.firstChild) { clear(structBox); return; }
      renderIrab(ctx, structBox, words, [surahN, vn], { onWord: wi => spans[wi].click() });
    }, 'aa-btn-quiet');
    if (ctx.settings.audio !== false) btn(tools, '▶ Écouter le verset', () => playVerse(surahN, vn), 'aa-btn-quiet');
    btn(tools, 'Copier le verset', () => copyText(words.map(wordText).join(' ') + '\n' + tokens.join(' ') + '\n' + v[0] + ' (' + surahN + ':' + vn + ')'), 'aa-btn-quiet');
    btn(tools, 'Insérer dans la note', () => ctx.insertText('> [!quote] ' + info[1] + ' ' + surahN + ':' + vn + '\n> ' + words.map(wordText).join(' ') + '\n> *' + tokens.join(' ') + '*\n> ' + v[0] + '\n\n'), 'aa-btn-quiet');
    box.appendChild(structBox);
    box.appendChild(detail);
  }
}

/* « 1:1-7 », « 112 », « 2:255 », « 2:1-5, 3:7 » */
function parseRefs(src) {
  const out = [];
  for (const part of String(src).split(/[,;\n]+/)) {
    const m = part.trim().match(/^(\d{1,3})(?::(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?$/);
    if (!m) continue;
    const s = +m[1]; if (s < 1 || s > 114) continue;
    out.push({ s, from: m[2] ? +m[2] : 1, to: m[3] ? +m[3] : (m[2] ? +m[2] : 0) });
  }
  return out;
}

/* ====================================================================
 * Analyse grammaticale complète (iʿrāb) avec schéma des liens
 * ==================================================================== */
function irabCls(words, r) {
  const f = stemOf(words[r.i]).f;
  if (f.pos === 'V') return 'aa-role-v';
  if (f.pos === 'P' || isInitials(words[r.i])) return 'aa-role-p';
  return f.cas ? 'aa-role-' + f.cas.toLowerCase() : 'aa-role-n';
}
function renderIrab(ctx, el, words, ref, opts) {
  opts = opts || {};
  IRAB_LEMMAS = ctx.data.lemmas;
  const res = analyseIrab(words);
  const kind = sentenceKind(words);
  if (kind) mdText(el, 'p', 'aa-why', kind);
  const wrap = h(el, 'div', 'aa-irab-wrap');
  const row = h(wrap, 'div', 'aa-irab-row'); row.setAttribute('dir', 'rtl');
  const boxes = []; const lines = [];
  res.forEach(r => {
    const role = IRAB_ROLES[r.key] || IRAB_ROLES.noun;
    const b = h(row, 'div', 'aa-irab-w ' + irabCls(words, r));
    arSpan(b, wordText(words[r.i]));
    const lab = h(b, 'div', 'aa-irab-lab', role[0].split(/ : | \(/)[0] + (r.guess ? ' ?' : '')); lab.setAttribute('dir', 'ltr');
    const t = h(b, 'div', 'aa-irab-term', role[2]); t.setAttribute('dir', 'ltr');
    const lid = stemOf(words[r.i]).seg[3];
    if (lid >= 0 && ctx.data.lemmas[lid] && ctx.data.lemmas[lid][4]) { const g = h(b, 'div', 'aa-struct-gloss', ctx.data.lemmas[lid][4]); g.setAttribute('dir', 'ltr'); }
    b.addEventListener('click', () => { boxes.forEach(x => x.classList.remove('aa-irab-sel')); b.classList.add('aa-irab-sel'); lines[r.i].classList.add('aa-irab-flash'); lines[r.i].scrollIntoView && lines[r.i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setTimeout(() => lines[r.i].classList.remove('aa-irab-flash'), 1200); });
    boxes.push(b);
  });
  // liens
  const links = [];
  res.forEach(r => {
    const role = IRAB_ROLES[r.key];
    if (r.head >= 0 && r.head !== r.i && role && role[4]) links.push({ a: r.i, b: r.head, label: role[4], guess: r.guess });
    if (r.group && r.group.head >= 0 && r.group.head !== r.i) links.push({ a: r.i, b: r.group.head, label: r.group.key === 'taalluq' ? 'complète' : (IRAB_ROLES[r.group.key] || [])[4] || '', guess: false, grp: true });
  });
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'aa-irab-svg'); wrap.insertBefore(svg, row);
  const draw = () => {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!row.offsetWidth) return;
    const cx = k => boxes[k].offsetLeft + boxes[k].offsetWidth / 2;
    const span = l => Math.abs(l.a - l.b);
    const maxSpan = links.reduce((m, l) => Math.max(m, Math.min(span(l), 6)), 1);
    const H = links.length ? 24 + maxSpan * 14 : 0;
    row.style.marginTop = H + 'px';
    svg.setAttribute('width', row.scrollWidth + 20); svg.setAttribute('height', H + 4);
    svg.style.width = (row.scrollWidth + 20) + 'px'; svg.style.height = (H + 4) + 'px';
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = '<marker id="aa-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>';
    svg.appendChild(defs);
    links.sort((x, y) => span(y) - span(x)).forEach(l => {
      const x1 = cx(l.a), x2 = cx(l.b) + (cx(l.a) > cx(l.b) ? 6 : -6); const y = H; const top = H - 14 - Math.min(span(l), 6) * 14;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', 'M' + x1 + ',' + y + ' C' + x1 + ',' + top + ' ' + x2 + ',' + top + ' ' + x2 + ',' + y);
      p.setAttribute('class', 'aa-irab-arc' + (l.guess ? ' aa-irab-guess' : '') + (l.grp ? ' aa-irab-grp' : ''));
      p.setAttribute('marker-end', 'url(#aa-arrow)');
      svg.appendChild(p);
      if (l.label) {
        const tx = document.createElementNS(NS, 'text');
        tx.setAttribute('x', (x1 + x2) / 2); tx.setAttribute('y', top + Math.min(span(l), 6) * 3 + 8); tx.setAttribute('class', 'aa-irab-arc-lab'); tx.setAttribute('text-anchor', 'middle');
        tx.textContent = l.label; svg.appendChild(tx);
      }
    });
  };
  let first = true; const draw0 = draw; const drawS = () => { draw0(); if (first && wrap.scrollWidth > wrap.clientWidth) { wrap.scrollLeft = wrap.scrollWidth; } first = false; };
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 0);
  raf(drawS);
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => draw()); ro.observe(row); }
  h(el, 'p', 'aa-muted aa-small', 'Les flèches vont du mot vers celui dont il dépend. Trait plein : lien sûr ; pointillé : lien probable. Couleurs : bleu = nominatif, vert = accusatif, orange = génitif, rouge = verbe, gris = particule.');

  // mot par mot
  h(el, 'h4', null, 'Mot par mot, comme les grammairiens (iʿrāb)');
  const list = h(el, 'div', 'aa-why-table');
  res.forEach(r => {
    const w = words[r.i];
    const line = h(list, 'div', 'aa-why-row aa-irab-line'); lines[r.i] = line;
    const a = h(line, 'div', 'aa-why-ar'); arSpan(a, wordText(w));
    h(a, 'div', 'aa-tr aa-small', translitTokens(words, ctx.settings.style)[r.i]);
    const t = h(line, 'div', 'aa-why-txt');
    mdText(t, 'div', null, irabSentence(words, res, r.i));
    if (r.mark) mdText(t, 'div', 'aa-small', '**Marque :** ' + r.mark + '.');
    r.att.filter(x => x.label !== 'mot').forEach(x => { const d = h(t, 'div', 'aa-small aa-irab-att'); arSpan(d, x.ar, 'aa-irab-att-ar'); mdText(d, 'span', null, ' ' + x.label + ' — ' + x.text); });
    if (r.group && r.group.text) mdText(t, 'div', 'aa-small aa-irab-grp-txt', '↳ ' + r.group.text);
    r.notes.forEach(n => mdText(t, 'div', 'aa-small aa-muted', n));
    if (opts.onWord) line.addEventListener('dblclick', () => opts.onWord(r.i));
  });
  mdText(el, 'p', 'aa-muted aa-small', 'Analyse **déduite automatiquement** de la morphologie du Coran (Quranic Arabic Corpus) : très fiable pour les cas, les annexions, les prépositions et les adjectifs ; les rôles marqués « probable » sont à vérifier dans un livre d\'iʿrāb pour les versets longs.');
  return res;
}
/* ====================================================================
 * 06 - Onglets : Coran, Analyser, Construire, Signes, Entraînement
 * ==================================================================== */

/* ---------------------------- Coran ---------------------------- */
function renderQuranTab(ctx, root, state) {
  clear(root);
  const data = ctx.data;
  const PAGE = 20;
  const bar = h(root, 'div', 'aa-toolbar');
  const f1 = field(bar, 'Sourate');
  selectEl(f1, data.surahs.map(s => [s[0], s[0] + '. ' + s[1] + ' — ' + s[2]]), state.surah, v => { state.surah = +v; state.page = 0; state.focus = 0; renderQuranTab(ctx, root, state); });
  const info = data.surahInfo(state.surah); const nV = info[5];
  const pages = Math.ceil(nV / PAGE);
  if (state.focus) state.page = Math.floor((state.focus - 1) / PAGE);
  if (pages > 1) {
    const f2 = field(bar, 'Versets');
    const opts = []; for (let p = 0; p < pages; p++) opts.push([p, (p * PAGE + 1) + '–' + Math.min(nV, (p + 1) * PAGE)]);
    selectEl(f2, opts, state.page, v => { state.page = +v; state.focus = 0; renderQuranTab(ctx, root, state); });
  }
  const tg = h(bar, 'div', 'aa-toggles');
  checkbox(tg, 'translittération', ctx.settings.showTr, v => { ctx.settings.showTr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'français', ctx.settings.showFr, v => { ctx.settings.showFr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'русский', ctx.settings.showRu, v => { ctx.settings.showRu = v; ctx.save(); renderQuranTab(ctx, root, state); });
  const course = ctx.courseSurahs();
  if (course.length) {
    const cb = h(root, 'div', 'aa-course');
    h(cb, 'span', 'aa-muted', 'Mon cours : ');
    course.forEach(c => {
      const ch = h(cb, 'span', 'aa-chip' + (c.n === state.surah ? ' aa-chip-on' : ''), c.label);
      ch.addEventListener('click', () => { state.surah = c.n; state.page = 0; state.focus = 0; renderQuranTab(ctx, root, state); });
    });
    const mine = course.find(c => c.n === state.surah);
    if (mine) { const lk = h(cb, 'a', 'aa-link aa-small', '📝 ouvrir ma note « ' + mine.file.basename + ' »'); lk.addEventListener('click', ev => { ev.preventDefault(); ctx.openNote(mine.file); }); }
  }
  mdText(root, 'p', 'aa-help', '**Clique sur un mot** pour voir ses morceaux, ses signes lettre par lettre, la raison de sa terminaison et les autres formes possibles. Couleurs : bleu = nom, rouge = verbe, gris = particule. Les mots **soulignés en pointillé** sont déjà dans ton vocabulaire.');
  const body = h(root, 'div', 'aa-verses');
  const from = state.page * PAGE + 1, to = Math.min(nV, from + PAGE - 1);
  renderVerses(ctx, body, state.surah, from, to, { title: true, basmala: from === 1 }).then(() => {
    if (state.focus) {
      const el = body.querySelector('[data-ref="' + state.surah + ':' + state.focus + '"]');
      if (el) { el.classList.add('aa-verse-focus'); el.scrollIntoView && el.scrollIntoView({ block: 'center' }); }
    }
    if (pages > 1) {
      const nav = h(root, 'div', 'aa-pager');
      if (state.page > 0) btn(nav, '← versets précédents', () => { state.page--; state.focus = 0; renderQuranTab(ctx, root, state); });
      if (state.page < pages - 1) btn(nav, 'versets suivants →', () => { state.page++; state.focus = 0; renderQuranTab(ctx, root, state); });
    }
  });
}

/* ---------------------------- Analyser ---------------------------- */
function renderAnalyseTab(ctx, root, state) {
  clear(root);
  mdText(root, 'p', 'aa-help', 'Colle ou tape un texte arabe (avec ou sans voyelles). Chaque mot est **cherché dans tout le Coran** : tu obtiens sa forme voyellée, son sens et son analyse complète.');
  const ta = h(root, 'textarea', 'aa-input'); ta.setAttribute('dir', 'rtl'); ta.rows = 3;
  if (!state.text) state.text = 'قل هو الله احد';
  ta.value = state.text;
  const bar = h(root, 'div', 'aa-actions');
  const out = h(root, 'div', 'aa-analyse-out');
  const go = () => { state.text = ta.value; analyseInto(ctx, out, ta.value); };
  btn(bar, 'Analyser', go, 'mod-cta');
  btn(bar, 'Effacer', () => { ta.value = ''; clear(out); }, 'aa-btn-quiet');
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) go(); });
  if (state.text) go();
}

async function analyseInto(ctx, out, text) {
  clear(out);
  const data = ctx.data; const style = ctx.settings.style;
  const words = splitWords(text).filter(w => hasArabic(w));
  if (!words.length) { h(out, 'p', 'aa-muted', 'Aucun mot arabe trouvé.'); return; }
  if (!data.forms) {
    const wait = h(out, 'p', 'aa-muted', 'Préparation de l\'index du Coran (une seule fois)…');
    await data.buildForms(s => { wait.textContent = 'Préparation de l\'index du Coran… sourate ' + s + ' / 114'; });
    wait.remove();
  }
  const sum = h(out, 'div', 'aa-analyse-sum');
  const line = h(sum, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); line.style.fontSize = ctx.settings.arSize + 'px';
  const trLine = h(sum, 'div', 'aa-tr aa-verse-tr');
  const cards = h(out, 'div', 'aa-cards');
  const chosen = [];
  const spans = [];
  const runs = words.length > 1 ? await data.findRuns(words) : [];
  if (runs.some(Boolean)) out.insertBefore(mdText(null, 'p', 'aa-ok', 'Ces mots se suivent dans le Coran : la lecture est choisie **d\'après le verset** où ils apparaissent ensemble.'), out.firstChild);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let cands = data.lookup(w);
    if (runs[i]) { const rr = runs[i]; const hit = cands.find(c => c.txt === rr.txt); const c0 = Object.assign({}, hit || { txt: rr.txt, n: 1 }, { ref: rr.ref }); cands = [c0, ...cands.filter(c => c.txt !== rr.txt)]; }
    chosen.push(cands[0] ? cands[0].txt : w);
    const sp = arSpan(line, cands[0] ? cands[0].txt : w, 'aa-w');
    line.appendChild(document.createTextNode(' '));
    spans.push(sp);
    const card = h(cards, 'div', 'aa-card');
    const det = h(card, 'div', 'aa-detail');
    sp.addEventListener('click', () => card.scrollIntoView && card.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    const show = async (c) => {
      clear(det);
      if (!c) {
        const hd = h(det, 'div', 'aa-dhead'); arSpan(hd, w, 'aa-big'); h(hd, 'div', 'aa-tr', translitPhrase([w], style));
        mdText(det, 'p', 'aa-warn', 'Ce mot (ou cette orthographe) **n\'est pas dans le Coran**. Voici au moins ses lettres et ses signes :');
        renderTiles(det, w);
        return;
      }
      const d = await data.surah(c.ref[0]); const v = d.v[c.ref[1] - 1];
      renderWordDetail(ctx, det, v[2], c.ref[2] - 1, c.ref, v);
      const ctxLine = h(det, 'div', 'aa-occ');
      const a = h(ctxLine, 'div', 'aa-occ-ar'); a.setAttribute('dir', 'rtl');
      v[2].forEach((x, wi) => { arSpan(a, wordText(x), wi === c.ref[2] - 1 ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
      const m = h(ctxLine, 'div', 'aa-occ-meta');
      h(m, 'span', 'aa-muted', 'Exemple du Coran (' + c.n + ' fois cette forme exacte) : ');
      const link = h(m, 'a', 'aa-link', data.surahInfo(c.ref[0])[1] + ' ' + c.ref[0] + ':' + c.ref[1]);
      link.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(c.ref[0], c.ref[1]); });
      h(m, 'div', 'aa-muted', v[0]);
    };
    if (cands.length > 1) {
      const alt = h(card, 'div', 'aa-cands');
      h(alt, 'span', 'aa-muted', (hasVowels(w) ? 'Autres lectures possibles : ' : 'Sans voyelles, ce mot peut se lire : '));
      cands.slice(0, 6).forEach((c, k) => {
        const ch = h(alt, 'span', 'aa-chip' + (k === 0 ? ' aa-chip-on' : ''));
        arSpan(ch, c.txt); h(ch, 'span', 'aa-muted aa-small', ' ' + c.n + '×');
        ch.addEventListener('click', () => {
          alt.querySelectorAll('.aa-chip').forEach(x => x.classList.remove('aa-chip-on')); ch.classList.add('aa-chip-on');
          sp.textContent = c.txt; chosen[i] = c.txt; trLine.textContent = translitPhrase(chosen, style); show(c);
        });
      });
      if (!hasVowels(w)) mdText(alt, 'div', 'aa-muted aa-small', 'Sans les voyelles, **seul le contexte** permet de choisir : c\'est exactement pour cela que le Coran est entièrement voyellé.');
    }
    card.insertBefore(det, card.firstChild);
    await show(cands[0]);
  }
  trLine.textContent = translitPhrase(chosen, style);
}
function hasVowels(w) { return /[ً-ْ]/.test(w); }

/* ---------------------------- Construire ---------------------------- */
const BUILD_DEFAULTS = {
  nominal: { type: 'nominal', subjKind: 'noun', subj: 'walad', subjDef: true, pron: 'huwa', pred: 'adj', adj: 'kabir', prep: 'fi', ppNoun: 'bayt', ppDef: true, mod: 'none', q: false },
  verbal: { type: 'verbal', verb: 'kataba', tense: 'past', subjKind: 'noun', subj: 'talib', subjDef: true, pron: 'huwa', order: 'vso', obj: 'noun', objNoun: 'risala', objDef: true, pp: false, prep: 'fi', ppNoun: 'madrasa', ppDef: true, passive: false, inna: false, qad: false, q: false },
  np: { type: 'np', noun: 'kitab', def: 'idafa', noun2: 'talib', adj: 'jadid', adjTarget: 1, cas: 'nom' },
};
const ROLE_NAMES = {
  subj: 'sujet', pred: 'attribut', adj: 'adjectif', verb: 'verbe', obj: 'complément', pp: 'préposition + nom', prep: 'préposition', gen: 'nom au génitif',
  kana: 'كَانَ / لَيْسَ', inna: 'إِنَّ', q: 'question', neg: 'négation', fut: 'futur', qad: 'قَدْ', emph: 'insistance', n1: '1er nom', n2: '2e nom',
};
const nounOpts = (list) => list.map(n => [n.id, n.ar + ' — ' + n.fr[0]]);

function renderBuildTab(ctx, root, state) {
  clear(root);
  if (!state.cfg) state.cfg = Object.assign({}, BUILD_DEFAULTS.nominal);
  const c = state.cfg;
  mdText(root, 'p', 'aa-help', 'Choisis les morceaux : la phrase se construit avec **les bonnes terminaisons**, et chaque mot explique **pourquoi** il a ce signe. En bas : comment on aurait pu la dire autrement.');
  const types = h(root, 'div', 'aa-seg-tabs');
  [['nominal', 'Phrase nominale (« X est Y »)'], ['verbal', 'Phrase verbale (« X fait Y »)'], ['np', 'Groupe de mots (« le livre de… »)']].forEach(([t, l]) => {
    const b = btn(types, l, () => { state.cfg = Object.assign({}, BUILD_DEFAULTS[t]); renderBuildTab(ctx, root, state); });
    if (c.type === t) b.classList.add('aa-on');
  });
  const form = h(root, 'div', 'aa-form');
  const set = (k) => (v) => { c[k] = v === 'true' ? true : v === 'false' ? false : (/^\d+$/.test(v) ? +v : v); renderBuildTab(ctx, root, state); };
  const sel = (label, k, opts) => selectEl(field(form, label), opts, c[k], set(k));
  const chk = (label, k) => checkbox(form, label, c[k], v => { c[k] = v; renderBuildTab(ctx, root, state); });
  const common = NOUNS.filter(n => !n.proper);
  if (c.type === 'nominal') {
    sel('Sujet', 'subjKind', [['noun', 'un nom'], ['pron', 'un pronom (je, tu, il…)']]);
    if (c.subjKind === 'noun') { sel('Nom', 'subj', nounOpts(NOUNS.filter(n => n.id !== 'allah'))); if (!byId(NOUNS, c.subj).proper) chk('avec ال (défini)', 'subjDef'); }
    else sel('Pronom', 'pron', PERS.filter(p => !p.pl).map(p => [p.id, p.label]));
    sel('Ce qu\'on dit du sujet', 'pred', [['adj', 'un adjectif (il est grand)'], ['pp', 'un lieu (il est dans…)']]);
    if (c.pred === 'adj') sel('Adjectif', 'adj', ADJS.map(a => [a.id, a.ar + ' — ' + a.fr[0]]));
    else { sel('Préposition', 'prep', PREPS.map(p => [p.id, p.ar + ' — ' + p.fr])); sel('Nom', 'ppNoun', nounOpts(NOUNS)); if (!byId(NOUNS, c.ppNoun).proper) chk('avec ال', 'ppDef'); }
    sel('Mot d\'introduction', 'mod', [['none', 'aucun (présent)'], ['kana', 'كَانَ — était'], ['inna', 'إِنَّ — certes'], ['laysa', 'لَيْسَ — n\'est pas'], ['laysaBi', 'لَيْسَ … بِـ — pas du tout']]);
    chk('en question (هَلْ)', 'q');
  } else if (c.type === 'verbal') {
    selectEl(field(form, 'Verbe'), VERBS.map(v => [v.id, conjPast(v, 'huwa') + ' — ' + v.fr.inf + (v.hollow ? ' (creux)' : v.form === 4 ? ' (forme IV)' : '')]), c.verb, val => {
      const nv = byId(VERBS, val); c.verb = val;
      if (nv.prep) c.prep = nv.prep;
      if (nv.defPP) { c.pp = true; c.ppNoun = nv.defPP; }
      if (!nv.tr) c.obj = 'none'; else if (c.obj === 'none') c.obj = 'noun';
      if (nv.obj) c.objNoun = nv.obj[0];
      renderBuildTab(ctx, root, state);
    });
    const v = byId(VERBS, c.verb);
    sel('Temps', 'tense', TENSES.map(t => [t.id, t.label]));
    const isImp = /^imp/.test(c.tense);
    if (isImp) sel('À qui ?', 'pron', PERS.filter(p => ['anta', 'anti', 'antum'].includes(p.id)).map(p => [p.id, p.label]));
    else {
      sel('Qui fait l\'action ?', 'subjKind', [['noun', 'un nom'], ['pron', 'un pronom']]);
      if (c.subjKind === 'noun') { sel('Sujet', 'subj', nounOpts(NOUNS.filter(n => !n.noSubjVerb))); if (!byId(NOUNS, c.subj).proper) chk('avec ال', 'subjDef'); sel('Ordre', 'order', [['vso', 'verbe d\'abord (habituel)'], ['svo', 'sujet d\'abord']]); }
      else sel('Pronom', 'pron', PERS.map(p => [p.id, p.label]));
    }
    if (v.tr) {
      sel('Complément', 'obj', [['noun', 'un nom'], ['pron', 'un pronom collé (le, la)'], ['none', 'aucun']]);
      if (c.obj !== 'none') { sel('Quoi ?', 'objNoun', nounOpts(NOUNS)); if (c.obj === 'noun' && !byId(NOUNS, c.objNoun).proper) chk('avec ال', 'objDef'); }
      if (c.obj === 'noun' && !isImp) chk('au passif (« a été … »)', 'passive');
    }
    chk('ajouter un lieu / une personne', 'pp');
    if (c.pp) { sel('Préposition', 'prep', PREPS.map(p => [p.id, p.ar + ' — ' + p.fr])); sel('Nom', 'ppNoun', nounOpts(NOUNS)); if (!byId(NOUNS, c.ppNoun).proper) chk('avec ال', 'ppDef'); }
    if (!isImp) { chk('avec إِنَّ', 'inna'); if (c.tense === 'past') chk('avec قَدْ', 'qad'); chk('en question', 'q'); }
  } else {
    sel('Nom', 'noun', nounOpts(common));
    sel('Forme', 'def', [['indef', 'indéfini : un livre'], ['def', 'défini : le livre'], ['idafa', 'annexion : le livre de…']]);
    if (c.def === 'idafa') sel('… de qui / de quoi ?', 'noun2', nounOpts(NOUNS));
    sel('Adjectif', 'adj', [['', 'aucun'], ...ADJS.map(a => [a.id, a.ar + ' — ' + a.fr[0]])]);
    if (c.def === 'idafa' && c.adj) sel('L\'adjectif qualifie', 'adjTarget', [[1, 'le 1er nom'], [2, 'le 2e nom']]);
    sel('Cas (rôle dans une phrase)', 'cas', [['nom', 'nominatif — sujet'], ['acc', 'accusatif — complément'], ['gen', 'génitif — après une préposition']]);
  }

  let r;
  try { r = buildSentence(c); } catch (e) { h(root, 'p', 'aa-warn', 'Combinaison impossible : ' + e.message); return; }
  const out = h(root, 'div', 'aa-build-out');
  const line = h(out, 'div', 'aa-build-ar'); line.setAttribute('dir', 'rtl'); line.style.fontSize = (ctx.settings.arSize + 6) + 'px';
  const arText = r.words.map(w => w.ar).join(' ');
  const tr = translitPhrase(r.words.map(w => w.ar), ctx.settings.style);
  const whyBox = h(document.createElement('div'), 'div');
  const rows = [];
  r.words.forEach((w, i) => {
    const sp = arSpan(line, w.ar, 'aa-bw aa-r-' + w.role);
    sp.title = (ROLE_NAMES[w.role] || w.role) + ' — ' + (w.gloss || '');
    sp.addEventListener('click', () => { rows.forEach(x => x.classList.remove('aa-row-hl')); rows[i].classList.add('aa-row-hl'); rows[i].scrollIntoView && rows[i].scrollIntoView({ block: 'nearest' }); });
    line.appendChild(document.createTextNode(' '));
  });
  h(out, 'div', 'aa-tr aa-build-tr', tr);
  h(out, 'div', 'aa-build-fr', r.fr);
  if (r.warn) mdText(out, 'div', 'aa-warn', r.warn);
  const act = h(out, 'div', 'aa-actions');
  soundBtn(act, () => speak(arText), 'Écouter (voix de l\'appareil)');
  btn(act, 'Copier', () => copyText(arText + '\n' + tr + '\n' + r.fr));
  btn(act, 'Insérer dans la note', () => ctx.insertText('- ' + arText + ' — *' + tr + '* — ' + r.fr + '\n'));
  btn(act, 'Créer une flashcard', () => ctx.addFlashcard(r.fr, arText + ' (' + tr + ')'));

  h(root, 'h4', null, 'Pourquoi chaque mot a cette forme');
  const tbl = h(root, 'div', 'aa-why-table');
  r.words.forEach(w => {
    const row = h(tbl, 'div', 'aa-why-row');
    const a = h(row, 'div', 'aa-why-ar'); arSpan(a, w.ar, 'aa-r-' + w.role);
    h(a, 'div', 'aa-tr aa-small', translitPhrase([w.ar], ctx.settings.style));
    const b = h(row, 'div', 'aa-why-txt');
    const hd = h(b, 'div'); h(hd, 'span', 'aa-badge aa-r-' + w.role + '-bg', ROLE_NAMES[w.role] || w.role); if (w.gloss) h(hd, 'span', 'aa-muted', ' « ' + w.gloss + ' »');
    mdText(b, 'div', null, w.why);
    rows.push(row);
  });
  if (r.notes && r.notes.length) { const ul = h(root, 'ul', 'aa-notes'); r.notes.forEach(n => mdText(ul, 'li', null, n)); }

  const vs = variantsOf(c);
  if (vs.length) {
    h(root, 'h4', null, 'Comment j\'aurais pu le dire autrement ?');
    const list = h(root, 'div', 'aa-variants');
    vs.forEach(v => {
      const it = h(list, 'div', 'aa-variant' + (v.cfg ? ' aa-click' : ''));
      h(it, 'div', 'aa-variant-label', v.label);
      arSpan(it, v.ar, 'aa-mid');
      h(it, 'div', 'aa-tr aa-small', translitPhrase(v.ar.split(' '), ctx.settings.style));
      h(it, 'div', 'aa-variant-fr', v.fr);
      mdText(it, 'div', 'aa-muted aa-small', v.explain);
      if (v.cfg) it.addEventListener('click', () => { state.cfg = Object.assign({}, BUILD_DEFAULTS[v.cfg.type], v.cfg); renderBuildTab(ctx, root, state); root.scrollIntoView && root.scrollIntoView({ block: 'start' }); });
    });
  }
  if (c.type === 'verbal' && byId(VERBS, c.verb).note) mdText(root, 'p', 'aa-help', '💡 ' + cap(byId(VERBS, c.verb).note));
  if (c.type === 'verbal') renderConjugation(ctx, details(root, 'Tableau de conjugaison de ' + conjPast(byId(VERBS, c.verb), 'huwa') + ' (' + byId(VERBS, c.verb).fr.inf + ')', false), c.verb);
  else if (c.type !== 'np') {
    const d = details(root, 'Rappel : les 3 cas, comme en russe', false);
    const t = h(d, 'table', 'aa-table');
    const hr = h(t, 'tr'); ['Cas', 'Signe', 'Rôle', 'En russe'].forEach(x => h(hr, 'th', null, x));
    [['NOM', 'sujet, attribut, après كَانَ (son nom)'], ['ACC', 'complément d\'objet, après إِنَّ, attribut de كَانَ / لَيْسَ'], ['GEN', 'après une préposition, 2e nom d\'une annexion']].forEach(([k, role]) => {
      const rr = h(t, 'tr'); h(rr, 'td', null, CASES[k].fr + ' (' + CASES[k].tr + ')'); arSpan(h(rr, 'td'), CASES[k].sign); h(rr, 'td', null, role); h(rr, 'td', null, CASES[k].ru);
    });
  }
}

function renderConjugation(ctx, parent, vid) {
  const ct = conjugationTable(vid);
  const t = h(parent, 'table', 'aa-table aa-conj');
  const hr = h(t, 'tr');
  ['Personne', 'Passé', 'Présent (-u)', 'Subjonctif (-a)', 'Apocopé (ـْ)', 'Impératif'].forEach(x => h(hr, 'th', null, x));
  ct.rows.forEach(r => {
    const tr = h(t, 'tr');
    const p = h(tr, 'td'); arSpan(p, r.p.ar); h(p, 'span', 'aa-muted aa-small', ' ' + r.p.fr + (r.p.id === 'anti' ? ' (f.)' : r.p.id === 'hiya' ? '' : ''));
    [r.past, r.pres, r.subj, r.jus, r.imp].forEach(x => { const td = h(tr, 'td'); if (x) { arSpan(td, x); h(td, 'div', 'aa-tr aa-small', translitPhrase([x], ctx.settings.style)); } });
  });
  mdText(parent, 'p', 'aa-muted aa-small', 'Au **passé**, la personne est à la **fin** du verbe. Au **présent**, elle est surtout au **début** (أَ نَ يَ تَ). Le subjonctif et l\'apocopé ne changent que la fin.');
}

/* ---------------------------- Signes ---------------------------- */
const SIGN_PAIRS = [
  { title: 'Une seule racine, beaucoup de sens : ك ت ب (écrire)', items: [
    ['كَتَبَ', 'il a écrit', 'trois fatḥa : verbe au passé, actif'], ['كُتِبَ', 'il a été écrit', 'u-i : le passif'], ['كَتَّبَ', 'il a fait écrire', 'shadda sur le t : forme II'],
    ['كَاتَبَ', 'il a correspondu avec', 'alif après le k : forme III'], ['كِتَابٌ', 'un livre', 'i-ā : un nom'], ['كُتُبٌ', 'des livres', 'u-u : pluriel brisé'],
    ['كَاتِبٌ', 'un écrivain', 'ā-i : celui qui fait (participe actif)'], ['مَكْتُوبٌ', 'écrit (ce qui est écrit)', 'ma-…-ū : celui qui subit (participe passif)'] ] },
  { title: 'م ل ك : roi, ange ou possesseur ? (Al-Fātiḥa 1:4)', items: [
    ['مَلِكٌ', 'un roi', 'a-i (مَلِكِ ٱلنَّاسِ, 114:2)'], ['مَلَكٌ', 'un ange', 'a-a'], ['مُلْكٌ', 'la royauté', 'u-soukoun (بِيَدِهِ ٱلْمُلْكُ, 67:1)'],
    ['مَالِكٌ', 'un possesseur, maître', 'ā-i (مَٰلِكِ يَوْمِ ٱلدِّينِ, 1:4)'], ['مَلَكَ', 'il a possédé', 'a-a-a : verbe au passé'] ] },
  { title: 'ع ل م : savoir', items: [
    ['عَلِمَ', 'il a su', 'a-i-a : passé'], ['عُلِمَ', 'il a été su', 'u-i : passif'], ['عَلَّمَ', 'il a enseigné', 'shadda : forme II, « faire savoir »'],
    ['عِلْمٌ', 'la science, le savoir', 'i-soukoun : nom'], ['عَالِمٌ', 'un savant', 'ā-i : celui qui sait'], ['عَالَمٌ', 'un monde', 'ā-a (ٱلْعَٰلَمِينَ, 1:2)'], ['عَلَمٌ', 'un drapeau, un repère', 'a-a'] ] },
  { title: 'La dernière voyelle d\'un nom = son rôle (le cas)', items: [
    ['ٱلْحَمْدُ', 'la louange (sujet)', '-u : nominatif — comme dans 1:2'], ['ٱلْحَمْدَ', 'la louange (complément)', '-a : accusatif'], ['ٱلْحَمْدِ', 'de la louange', '-i : génitif'],
    ['كِتَابٌ', 'un livre (sujet)', '-un : tanwīn = indéfini'], ['كِتَابًا', 'un livre (complément)', '-an (+ alif)'], ['كِتَابٍ', 'd\'un livre', '-in'], ['ٱلْكِتَابُ', 'le livre', 'ال remplace le tanwīn'] ] },
  { title: 'La dernière voyelle d\'un verbe au présent = son mode', items: [
    ['يَكْتُبُ', 'il écrit', '-u : indicatif (normal)'], ['لَنْ يَكْتُبَ', 'il n\'écrira jamais', '-a : subjonctif après لَنْ'], ['لَمْ يَكْتُبْ', 'il n\'a pas écrit', 'soukoun : apocopé après لَمْ (comme لَمْ يَلِدْ, 112:3)'],
    ['لَا تَكْتُبْ', 'n\'écris pas !', 'soukoun : لَا d\'interdiction'], ['ٱكْتُبْ', 'écris !', 'impératif'] ] },
  { title: 'Une voyelle change tout', items: [
    ['مَنْ', 'qui ?', 'fatḥa'], ['مِنْ', 'de, parmi', 'kasra'], ['إِنَّ', 'certes', 'kasra + shadda'], ['أَنَّ', 'que (+ nom)', 'fatḥa + shadda'], ['إِنْ', 'si', 'kasra, sans shadda'], ['أَنْ', 'que (+ verbe)', 'fatḥa, sans shadda'],
    ['ذَهَبَ', 'il est parti', 'verbe'], ['ذَهَبٌ', 'de l\'or', 'nom'], ['قَتَلَ', 'il a tué', 'a-a-a'], ['قُتِلَ', 'il a été tué', 'u-i : passif'], ['قَاتَلَ', 'il a combattu', 'ā : forme III'],
    ['جَنَّةٌ', 'un jardin, le paradis', 'a'], ['جِنَّةٌ', 'les djinns', 'i'], ['جُنَّةٌ', 'un bouclier', 'u'] ] },
];
const VOWEL_CHOICES = [['', '— aucun —'], ['َ', 'fatḥa  ـَ  (a)'], ['ُ', 'ḍamma  ـُ  (u)'], ['ِ', 'kasra  ـِ  (i)'], ['ْ', 'soukoun  ـْ'], ['ً', 'tanwīn  ـً  (-an)'], ['ٌ', 'tanwīn  ـٌ  (-un)'], ['ٍ', 'tanwīn  ـٍ  (-in)']];

function renderSignsTab(ctx, root, state) {
  clear(root);
  const style = ctx.settings.style;
  mdText(root, 'p', 'aa-help', 'Le **laboratoire des signes** : change une voyelle et regarde ce qui se passe. En haut, tu modifies un mot toi-même ; en dessous, des exemples où **un seul signe change le sens**.');
  // --- éditeur
  const ed = h(root, 'div', 'aa-lab');
  h(ed, 'h4', null, 'Mon mot');
  const inRow = h(ed, 'div', 'aa-actions');
  const inp = h(inRow, 'input', 'aa-input-line'); inp.type = 'text'; inp.setAttribute('dir', 'rtl'); inp.value = state.labWord || 'كَتَبَ';
  btn(inRow, 'Charger', () => { state.labWord = inp.value.trim(); renderSignsTab(ctx, root, state); });
  const us = units(state.labWord || 'كَتَبَ').filter(u => u.b && u.b !== ' ');
  const res = h(ed, 'div', 'aa-lab-res');
  const tiles = h(ed, 'div', 'aa-lab-tiles'); tiles.setAttribute('dir', 'rtl');
  const update = async () => {
    const w = joinUnits(us);
    state.labWord = w; inp.value = w;
    clear(res);
    arSpan(res, w, 'aa-big');
    h(res, 'div', 'aa-tr', translitPhrase([w], style));
    const found = h(res, 'div', 'aa-lab-found');
    if (!ctx.data.forms) { h(found, 'span', 'aa-muted', 'Recherche dans le Coran…'); await ctx.data.buildForms(); clear(found); }
    const c = ctx.data.lookup(w).filter(x => x.exact);
    if (c.length) {
      const d = await ctx.data.surah(c[0].ref[0]); const v = d.v[c[0].ref[1] - 1];
      const st = stemOf(v[2][c[0].ref[2] - 1]); const lem = st.seg[3] >= 0 ? ctx.data.lemmas[st.seg[3]] : null;
      mdText(found, 'div', 'aa-ok', '✓ Ce mot existe dans le Coran (' + c[0].n + ' fois)' + (lem ? ' : **' + lem[4] + '**' : '') + '.');
      const link = h(found, 'a', 'aa-link', 'Voir ' + ctx.data.surahInfo(c[0].ref[0])[1] + ' ' + refStr(c[0].ref));
      link.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(c[0].ref[0], c[0].ref[1]); });
    } else {
      const near = ctx.data.lookup(w).slice(0, 5);
      h(found, 'div', 'aa-muted', 'Cette forme exacte n\'est pas dans le Coran.' + (near.length ? ' Formes proches qui y sont :' : ''));
      const chips = h(found, 'div', 'aa-cands');
      near.forEach(n => { const ch = h(chips, 'span', 'aa-chip'); arSpan(ch, n.txt); ch.addEventListener('click', () => { state.labWord = n.txt; renderSignsTab(ctx, root, state); }); });
    }
  };
  us.forEach((u, i) => {
    const t = h(tiles, 'div', 'aa-lab-tile');
    const big = arSpan(t, u.b + u.m, 'aa-tile-ar');
    const ctl = h(t, 'div', 'aa-lab-ctl'); ctl.setAttribute('dir', 'ltr');
    h(ctl, 'div', 'aa-tile-name', (LETTERS[u.b] || [u.b])[0]);
    const cur = (u.m.match(/[ً-ِْ]/) || [''])[0];
    const s = selectEl(ctl, VOWEL_CHOICES, cur, v => { u.m = (u.m.includes(SH) ? SH : '') + v + u.m.replace(/[ً-ْ]/g, ''); big.textContent = u.b + u.m; update(); });
    checkbox(ctl, 'shadda ـّ', u.m.includes(SH), v => { u.m = (v ? SH : '') + u.m.replace(SH, ''); big.textContent = u.b + u.m; update(); });
  });
  update();
  // --- paires
  SIGN_PAIRS.forEach((g, gi) => {
    const d = details(root, g.title, gi === 0);
    const grid = h(d, 'div', 'aa-pairs');
    g.items.forEach(([ar, fr, why]) => {
      const c = h(grid, 'div', 'aa-pair');
      arSpan(c, ar, 'aa-mid');
      h(c, 'div', 'aa-tr', translitPhrase(ar.split(' '), style));
      h(c, 'div', 'aa-pair-fr', fr);
      h(c, 'div', 'aa-muted aa-small', why);
      c.addEventListener('click', () => { state.labWord = ar.split(' ').pop(); renderSignsTab(ctx, root, state); root.scrollIntoView && root.scrollIntoView({ block: 'start' }); });
    });
  });
  // --- tous les signes
  const d = details(root, 'Tous les signes (y compris les petits signes du Coran)', false);
  const t = h(d, 'table', 'aa-table');
  const hr = h(t, 'tr'); ['Signe', 'Nom', 'Effet', 'À quoi il ressemble'].forEach(x => h(hr, 'th', null, x));
  Object.entries(MARK_INFO).forEach(([ch, [name, eff, look]]) => {
    const r = h(t, 'tr'); arSpan(h(r, 'td'), 'ب' + ch, 'aa-mid'); h(r, 'td', null, name); h(r, 'td', null, eff); h(r, 'td', 'aa-muted', look);
  });
}

/* ---------------------------- Entraînement ---------------------------- */
const QUIZ_RANGES = [['review', '⟳ Mes mots à revoir (erreurs)'], ['mine', 'Mon vocabulaire'], ['juz30', 'Juz ʿAmma (sourates 78 à 114)'], ['fatiha', 'Al-Fātiḥa'], ['all', 'Tout le Coran'], ['cur', 'La sourate ouverte dans l\'onglet Coran']];
const QUIZ_TYPES = [['case', 'Quel est le cas de ce nom ?'], ['mood', 'Quel est le mode de ce verbe ?'], ['sens', 'Que veut dire ce mot ?'], ['role', 'Quel est le rôle de ce mot dans la phrase ?'], ['phrase', 'Quelle est la bonne phrase ?']];

function renderQuizTab(ctx, root, state) {
  clear(root);
  state.score = state.score || { ok: 0, n: 0 };
  state.qtype = state.qtype || 'case'; state.range = state.range || 'juz30';
  mdText(root, 'p', 'aa-help', 'Entraîne-toi avec de **vrais mots du Coran**. Après chaque réponse, tu vois l\'explication complète.');
  const bar = h(root, 'div', 'aa-toolbar');
  selectEl(field(bar, 'Exercice'), QUIZ_TYPES, state.qtype, v => { state.qtype = v; state.q = null; renderQuizTab(ctx, root, state); });
  if (state.qtype !== 'phrase') selectEl(field(bar, 'Textes'), QUIZ_RANGES, state.range, v => { state.range = v; state.q = null; renderQuizTab(ctx, root, state); });
  h(bar, 'div', 'aa-score', 'Score : ' + state.score.ok + ' / ' + state.score.n);
  if (state.notice) { mdText(root, 'p', 'aa-warn', state.notice); state.notice = null; }
  renderProgress(ctx, details(root, '📈 Mes progrès', false), () => renderQuizTab(ctx, root, state));
  const box = h(root, 'div', 'aa-quiz');
  const next = async () => { state.q = await makeQuestion(ctx, state); renderQuizTab(ctx, root, state); };
  if (!state.q) { h(box, 'p', 'aa-muted', 'Préparation de la question…'); next(); return; }
  const q = state.q;
  h(box, 'div', 'aa-quiz-q', q.prompt);
  if (q.words) {
    const a = h(box, 'div', 'aa-verse-ar'); a.setAttribute('dir', 'rtl'); a.style.fontSize = ctx.settings.arSize + 'px';
    q.words.forEach((w, wi) => { arSpan(a, wordText(w), wi === q.wi ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
    h(box, 'div', 'aa-muted aa-small', q.ref[0] + ':' + q.ref[1] + ' — ' + q.verseFr);
    const big = h(box, 'div', 'aa-quiz-word'); arSpan(big, wordText(q.words[q.wi]), 'aa-big');
  } else if (q.fr) {
    h(box, 'div', 'aa-quiz-fr', '« ' + q.fr + ' »');
  }
  const opts = h(box, 'div', 'aa-quiz-opts');
  const fb = h(box, 'div', 'aa-quiz-fb');
  q.options.forEach((o, i) => {
    const b = btn(opts, '', () => {
      if (q.done) return;
      q.done = true; state.score.n++;
      const good = i === q.answer;
      if (good) state.score.ok++;
      if (q.words) { const lid = stemOf(q.words[q.wi]).seg[3]; if (lid >= 0) ctx.record(lid, good, state.qtype); }
      else ctx.record(-1, good, state.qtype);
      opts.querySelectorAll('button').forEach((x, k) => { if (k === q.answer) x.classList.add('aa-good'); else if (k === i) x.classList.add('aa-bad'); });
      mdText(fb, 'div', good ? 'aa-ok' : 'aa-warn', good ? '✓ Bravo !' : '✗ Pas tout à fait : la réponse est « ' + q.options[q.answer].replace(/\*\*/g, '') + ' ».');
      (q.explain || []).forEach(x => mdText(fb, 'div', 'aa-why', x));
      if (q.words) { const det = h(fb, 'div', 'aa-detail'); renderWordDetail(ctx, det, q.words, q.wi, q.ref, null); }
      const nb = btn(fb, 'Question suivante →', next, 'mod-cta');
      nb.focus && nb.focus();
      root.querySelector('.aa-score').textContent = 'Score : ' + state.score.ok + ' / ' + state.score.n;
    }, 'aa-quiz-opt');
    if (q.optAr) arSpan(b, o, 'aa-mid'); else b.textContent = o;
  });
}

function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }

async function makeQuestion(ctx, state) {
  const data = ctx.data;
  if (state.qtype === 'phrase') return makePhraseQuestion();
  if (state.range === 'review' || state.range === 'mine') {
    const pool = state.range === 'review' ? ctx.reviewList().map(x => x.id) : ctx.myWordIds();
    if (!pool.length) { state.notice = state.range === 'review' ? 'Aucune erreur enregistrée pour l\'instant : questions prises dans le Juz ʿAmma.' : 'Ton vocabulaire de l\'atelier est vide : ajoute des mots avec le bouton « Ajouter à mon vocabulaire ». Questions prises dans le Juz ʿAmma.'; }
    for (let tries = 0; tries < 80 && pool.length; tries++) {
      const lid = pool[rnd(Math.min(pool.length, 25))];
      const refs = data.refsOf(lid); if (!refs.length) continue;
      const r = refs[rnd(refs.length)];
      const d = await data.surah(r[0]); const v = d.v[r[1] - 1]; if (!v) continue;
      const words = v[2]; const wi = r[2] - 1; const w = words[wi]; if (!w) continue;
      const f = stemOf(w).f;
      const ok = state.qtype === 'sens' || (state.qtype === 'role' && roleOk(ctx, words, wi)) || (state.qtype === 'case' && f.pos === 'N' && f.cas && !['PRON', 'DEM', 'REL'].includes(f.sub)) || (state.qtype === 'mood' && f.pos === 'V' && f.mood);
      if (!ok) continue;
      return buildWordQuestion(ctx, state, words, wi, r, v);
    }
    if (pool.length) state.notice = 'Tes mots à revoir ne conviennent pas à cet exercice : essaie « Que veut dire ce mot ? ». Questions prises dans le Juz ʿAmma.';
  }
  const range = state.range === 'fatiha' ? [1, 1] : state.range === 'all' ? [1, 114] : state.range === 'cur' ? [ctx.currentSurah(), ctx.currentSurah()] : [78, 114];
  for (let tries = 0; tries < 60; tries++) {
    const s = range[0] + rnd(range[1] - range[0] + 1);
    const d = await data.surah(s); const vi = rnd(d.v.length); const v = d.v[vi]; const words = v[2];
    const cands = [];
    words.forEach((w, wi) => {
      const f = stemOf(w).f;
      if (state.qtype === 'case' && f.pos === 'N' && f.cas && !['PRON', 'DEM', 'REL'].includes(f.sub)) cands.push(wi);
      if (state.qtype === 'mood' && f.pos === 'V' && f.mood) cands.push(wi);
      if (state.qtype === 'sens' && stemOf(w).seg[3] >= 0 && data.lemmas[stemOf(w).seg[3]][4]) cands.push(wi);
    });
    if (state.qtype === 'role') { IRAB_LEMMAS = data.lemmas; analyseIrab(words).forEach(r => { if (IRAB_SURE.includes(r.key) && !r.guess) cands.push(r.i); }); }
    if (!cands.length) continue;
    const wi = cands[rnd(cands.length)];
    return buildWordQuestion(ctx, state, words, wi, [s, vi + 1, wi + 1], v);
  }
  return makePhraseQuestion();
}
function buildWordQuestion(ctx, state, words, wi, ref, v) {
  const data = ctx.data;
  {
    const st = stemOf(words[wi]); const e = explainQuranWord(words, wi, data.lemmas);
    const base = { words, wi, ref: [ref[0], ref[1], wi + 1], verseFr: v[0] };
    if (state.qtype === 'case') {
      const keys = ['NOM', 'ACC', 'GEN'];
      return Object.assign(base, { prompt: 'Quel est le cas du mot surligné ? Regarde sa dernière voyelle… et ce qui le précède.', options: keys.map(k => CASES[k].fr + ' (' + CASES[k].sign + ')'), answer: keys.indexOf(st.f.cas), explain: e.why });
    }
    if (state.qtype === 'mood') {
      const keys = ['IND', 'SUBJ', 'JUS'];
      return Object.assign(base, { prompt: 'Ce verbe au présent est à quel mode ? Regarde sa fin et le mot juste avant.', options: keys.map(k => MOODS[k].fr + ' — ' + MOODS[k].sign), answer: keys.indexOf(st.f.mood), explain: e.why });
    }
    if (state.qtype === 'role') {
      IRAB_LEMMAS = data.lemmas; const res = analyseIrab(words); const r = res[wi];
      const keys = shuffle([r.key, ...shuffle(IRAB_SURE.filter(k => k !== r.key && !(k.startsWith('khabar') && r.key.startsWith('khabar')))).slice(0, 3)]);
      return Object.assign(base, { prompt: 'Quel est le rôle (la fonction) du mot surligné dans la phrase ?', options: keys.map(k => irabRoleName(k).split(' ‖ ')[0] + ' — ' + IRAB_ROLES[k][2]), answer: keys.indexOf(r.key), explain: [irabSentence(words, res, wi)].concat(r.notes).concat(r.mark ? ['**Marque :** ' + r.mark + '.'] : []) });
    }
    const good = data.lemmas[st.seg[3]][4];
    const pool = data.lemmas.filter(l => l[5] >= 15 && l[4] && l[4] !== good && l[1] === st.f.pos);
    const opts = shuffle([good, ...shuffle(pool.slice()).slice(0, 3).map(l => l[4])]);
    return Object.assign(base, { prompt: 'Que veut dire le mot surligné (sens de base) ?', options: opts, answer: opts.indexOf(good), explain: [] });
  }
  return makePhraseQuestion();
}

function roleOk(ctx, words, wi) { IRAB_LEMMAS = ctx.data.lemmas; const r = analyseIrab(words)[wi]; return IRAB_SURE.includes(r.key) && !r.guess; }
function corruptEnding(ar) {
  const swaps = { 'ُ': 'َ', 'َ': 'ِ', 'ِ': 'ُ', 'ٌ': 'ًا', 'ٍ': 'ٌ' };
  const m = ar.match(/([ًٌٍَُِ])(ا?)$/);
  if (!m) return null;
  let rep = swaps[m[1]];
  if (m[1] === 'ً') rep = 'ٌ';
  return ar.slice(0, ar.length - m[0].length) + rep;
}
function makePhraseQuestion() {
  for (let tries = 0; tries < 30; tries++) {
    const kind = ['nominal', 'verbal'][rnd(2)];
    const c = Object.assign({}, BUILD_DEFAULTS[kind]);
    if (kind === 'nominal') {
      Object.assign(c, { subj: NOUNS[rnd(25)].id, adj: ADJS[rnd(ADJS.length)].id, mod: ['none', 'kana', 'inna', 'laysa'][rnd(4)] });
    } else {
      const v = VERBS[rnd(VERBS.length)];
      Object.assign(c, { verb: v.id, tense: ['past', 'pres', 'negPastLam', 'negFut', 'fut'][rnd(5)], subj: NOUNS[rnd(25)].id, objNoun: v.obj ? v.obj[rnd(v.obj.length)] : 'kitab', obj: v.tr ? 'noun' : 'none', pp: !v.tr, ppNoun: ['bayt', 'madrasa', 'masjid', 'hadiqa'][rnd(4)], prep: v.prep || 'fi' });
    }
    let r; try { r = buildSentence(c); } catch (e) { continue; }
    if (r.warn) continue;
    const good = r.words.map(w => w.ar);
    const wrong = [];
    const idx = shuffle(good.map((_, i) => i));
    for (const i of idx) { const x = corruptEnding(good[i]); if (x) { const copy = good.slice(); copy[i] = x; wrong.push({ ar: copy.join(' '), i, w: r.words[i] }); } if (wrong.length === 2) break; }
    if (wrong.length < 2) continue;
    const all = shuffle([{ ar: good.join(' '), good: true }, ...wrong]);
    return {
      prompt: 'Laquelle de ces phrases veut dire :', fr: r.fr, optAr: true, options: all.map(x => x.ar), answer: all.findIndex(x => x.good),
      explain: wrong.map(x => 'Dans une mauvaise réponse, ' + x.w.ar + ' a la mauvaise fin. La bonne forme : ' + x.w.why),
    };
  }
  return { prompt: 'Erreur : aucune question.', options: ['—'], answer: 0 };
}

function renderProgress(ctx, el, refresh) {
  const P = ctx.settings.progress;
  const types = { case: 'cas', mood: 'modes', sens: 'sens des mots', role: 'rôles', lesson: 'leçons', phrase: 'phrases' };
  const tot = Object.values(P.byType).reduce((a, x) => ({ ok: a.ok + x.ok, n: a.n + x.n }), { ok: 0, n: 0 });
  if (!tot.n) { h(el, 'p', 'aa-muted', 'Pas encore de réponses enregistrées. Chaque réponse au quiz est mémorisée ici.'); return; }
  mdText(el, 'p', null, '**' + tot.n + '** réponses, **' + Math.round(100 * tot.ok / tot.n) + ' %** de bonnes réponses. Mots de ton vocabulaire : **' + ctx.myWordIds().length + '**.');
  const t = h(el, 'table', 'aa-table');
  const hr = h(t, 'tr'); ['Exercice', 'Réponses', 'Réussite'].forEach(x => h(hr, 'th', null, x));
  Object.entries(P.byType).forEach(([k, x]) => { if (!x.n) return; const r = h(t, 'tr'); h(r, 'td', null, types[k] || k); h(r, 'td', null, String(x.n)); h(r, 'td', null, Math.round(100 * x.ok / x.n) + ' %'); });
  const rev = ctx.reviewList();
  if (rev.length) {
    h(el, 'h4', null, 'Mots à revoir (' + rev.length + ')');
    const grid = h(el, 'div', 'aa-family');
    rev.slice(0, 30).forEach(x => {
      const l = ctx.data.lemmas[x.id];
      const c = h(grid, 'div', 'aa-fam');
      arSpan(c, l[0]); h(c, 'div', 'aa-fam-g', l[4]); h(c, 'div', 'aa-muted aa-small', '✗ ' + x.ko + ' · ✓ ' + x.ok);
      c.addEventListener('click', () => ctx.openDict(x.id));
    });
    mdText(el, 'p', 'aa-muted aa-small', 'Choisis « ⟳ Mes mots à revoir » dans **Textes** pour t\'entraîner sur eux. Un mot sort de la liste quand tu as plus de bonnes réponses que d\'erreurs.');
  }
  btn(el, 'Remettre à zéro', () => { ctx.resetProgress(); refresh(); }, 'aa-btn-quiet');
}
/* ====================================================================
 * 06b - Dictionnaire : tous les mots du Coran
 * ==================================================================== */
const AR_ALPHA = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
function stripAr(s) { return (s || '').replace(/[ً-ٰٟۖ-ۭ]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي'); }
function stripLat(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ'’\-]/g, ''); }
function lemmaType(l) {
  const sub = (l[2] || '').split('/');
  if (l[1] === 'V') { const f = (sub.find(x => x.startsWith('VF:')) || 'VF:1').slice(3); return 'verbe, forme ' + (VERB_FORMS[f] ? VERB_FORMS[f][0] : f); }
  if (l[1] === 'P') return 'particule' + (sub[0] && PARTICLES[sub[0]] ? ' — ' + PARTICLES[sub[0]].split(/[:(]/)[0].trim() : '');
  const k = sub.filter(x => POS_NAMES[x]);
  return k.length ? k.map(x => POS_NAMES[x].split(' (')[0]).join(', ') : 'nom';
}
let LEM_TR = null;
function lemmaTranslit(i, lemmas) {
  if (!LEM_TR) LEM_TR = new Array(lemmas.length);
  if (LEM_TR[i] == null) { try { LEM_TR[i] = translitPhrase([lemmas[i][0].replace(/([بتثجحخدذرزسشصضطظعغفقكلمنهوي])ا/g, '$1َا')]); } catch (e) { LEM_TR[i] = ''; } }
  return LEM_TR[i];
}

function dictSearch(data, q, filter) {
  const L = data.lemmas; const out = [];
  q = (q || '').trim();
  const isAr = hasArabic(q);
  const qa = stripAr(q).replace(/\s+/g, ''); const ql = stripLat(q);
  for (let i = 0; i < L.length; i++) {
    const l = L[i];
    if (filter && filter !== 'all' && l[1] !== filter) continue;
    let score = 0;
    if (!q) score = l[5];
    else if (isAr) {
      const sk = stripAr(l[0]);
      if (sk === qa) score = 100000;
      else if (l[3] && l[3].replace(/\s/g, '') === qa.replace(/ء/g, 'أ')) score = 50000;
      else if (l[3] && stripAr(l[3]) === qa) score = 50000;
      else if (sk.startsWith(qa)) score = 20000;
      else if (qa.length >= 2 && sk.includes(qa)) score = 5000;
      if (score) score += l[5];
    } else {
      const g = stripLat(l[4]); const d = stripLat(l[7]); const r = stripLat(l[8]);
      const words = g.split(/[\s,;()…/]+/);
      const re = new RegExp('(^|[^a-z])' + ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (words.includes(ql)) score = 60000;
      else if (g.startsWith(ql)) score = 40000;
      else if (re.test(g)) score = 20000;
      else if (q.length >= 3 && (re.test(d) || r.includes(ql))) score = 5000;
      else if (q.length >= 2 && stripLat(lemmaTranslit(i, L)).startsWith(ql)) score = 15000;
      if (score) score += l[5];
    }
    if (score) out.push([i, score]);
  }
  // un mot conjugué / avec préfixes : passer par l'index des formes du Coran
  if (isAr && data.forms && out.length < 3) {
    for (const c of data.lookup(q).slice(0, 3)) {
      const dd = data.cache.get(c.ref[0]); if (!dd) continue;
      const w = dd.v[c.ref[1] - 1][2][c.ref[2] - 1]; const lid = stemOf(w).seg[3];
      if (lid >= 0 && !out.some(x => x[0] === lid)) out.push([lid, 1]);
    }
  }
  return out.sort((a, b) => b[1] - a[1]).map(x => x[0]);
}

function renderDictTab(ctx, root, state) {
  clear(root);
  const data = ctx.data;
  if (!data.forms) {
    const p = h(root, 'p', 'aa-muted', 'Préparation du dictionnaire (une seule fois)…');
    data.buildForms(s => { p.textContent = 'Préparation du dictionnaire… sourate ' + s + ' / 114'; }).then(() => renderDictTab(ctx, root, state));
    return;
  }
  state.mode = state.mode || 'search';
  mdText(root, 'p', 'aa-help', 'Les **' + data.lemmas.length.toLocaleString('fr-FR') + ' mots** du Coran. Cherche en arabe (avec ou sans voyelles, même un mot conjugué), en français, en translittération ou par **racine** (ex. كتب).');
  const tabs = h(root, 'div', 'aa-seg-tabs');
  [['search', 'Rechercher'], ['roots', 'Par racine'], ['mine', 'Mon vocabulaire']].forEach(([k, l]) => {
    const b = btn(tabs, l, () => { state.mode = k; state.entry = null; renderDictTab(ctx, root, state); }); if (state.mode === k) b.classList.add('aa-on');
  });
  const cols = h(root, 'div', 'aa-dict');
  const listEl = h(cols, 'div', 'aa-dict-list');
  const entryEl = h(cols, 'div', 'aa-dict-entry');
  const showEntry = (id) => { state.entry = id; renderDictEntry(ctx, entryEl, id, showEntry); listEl.querySelectorAll('.aa-dict-row').forEach(r => r.classList.toggle('aa-on', +r.dataset.id === id)); entryEl.scrollIntoView && window.innerWidth < 800 && entryEl.scrollIntoView({ block: 'start' }); };
  if (state.mode === 'search') {
    const bar = h(listEl, 'div', 'aa-toolbar');
    const inp = h(bar, 'input', 'aa-input-line aa-dict-q'); inp.type = 'search'; inp.placeholder = 'كتب · livre · kitāb'; inp.value = state.q || '';
    selectEl(bar, [['all', 'tous'], ['N', 'noms'], ['V', 'verbes'], ['P', 'particules']], state.filter || 'all', v => { state.filter = v; renderDictTab(ctx, root, state); });
    const res = h(listEl, 'div');
    const run = () => {
      state.q = inp.value; clear(res);
      const ids = dictSearch(data, state.q, state.filter);
      h(res, 'div', 'aa-muted aa-small', state.q ? ids.length + ' résultat(s)' : 'Les mots les plus fréquents :');
      renderRows(ctx, h(res, 'div'), ids, 60, showEntry);
    };
    let timer = null;
    inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 250); });
    run();
  } else if (state.mode === 'roots') {
    const alpha = h(listEl, 'div', 'aa-alpha'); alpha.setAttribute('dir', 'rtl');
    state.letter = state.letter || 'ك';
    [...AR_ALPHA].forEach(ch => { const b = arSpan(alpha, ch, 'aa-alpha-l' + (ch === state.letter ? ' aa-on' : '')); b.addEventListener('click', () => { state.letter = ch; renderDictTab(ctx, root, state); }); });
    const roots = [...data.byRoot.keys()].filter(r => stripAr(r[0]) === state.letter || r[0] === state.letter).sort((a, b) => stripAr(a).localeCompare(stripAr(b), 'ar'));
    h(listEl, 'div', 'aa-muted aa-small', roots.length + ' racines commençant par ' + state.letter);
    const box = h(listEl, 'div', 'aa-roots');
    roots.forEach(r => {
      const ids = data.byRoot.get(r).slice().sort((a, b) => data.lemmas[b][5] - data.lemmas[a][5]);
      const d = h(box, 'details', 'aa-root-item');
      const sm = h(d, 'summary'); arSpan(sm, r.split('').join(' '), 'aa-mid'); h(sm, 'span', 'aa-muted aa-small', '  ' + (data.lemmas[ids[0]][4] || '') + ' · ' + ids.length + ' mot(s)');
      d.addEventListener('toggle', () => { if (d.open && d.children.length === 1) renderRows(ctx, h(d, 'div'), ids, 50, showEntry); });
    });
  } else {
    const ids = ctx.myWordIds();
    if (!ids.length) mdText(listEl, 'p', 'aa-muted', 'Aucun mot pour l\'instant. Clique **Ajouter à mon vocabulaire** sur un mot du Coran ou du dictionnaire.');
    renderRows(ctx, listEl, ids, 100, showEntry);
  }
  if (state.entry != null) showEntry(state.entry);
  else h(entryEl, 'p', 'aa-muted', 'Choisis un mot dans la liste pour voir sa fiche complète.');
}

function renderRows(ctx, parent, ids, limit, onPick) {
  const data = ctx.data; const box = h(parent, 'div'); let shown = 0;
  const more = () => {
    ids.slice(shown, shown + limit).forEach(id => {
      const l = data.lemmas[id];
      const r = h(box, 'div', 'aa-dict-row' + (ctx.isMine(id) ? ' aa-dict-mine' : '')); r.dataset.id = id;
      arSpan(r, l[0], 'aa-dict-ar');
      const t = h(r, 'div', 'aa-dict-txt');
      h(t, 'div', 'aa-dict-g', l[4] || '—');
      h(t, 'div', 'aa-muted aa-small', lemmaTranslit(id, data.lemmas) + ' · ' + lemmaType(l) + ' · ' + l[5] + '×');
      r.addEventListener('click', () => onPick(id));
    });
    shown += limit; mb.style.display = shown < ids.length ? '' : 'none';
  };
  const mb = btn(parent, 'Afficher plus', more, 'aa-btn-quiet');
  more();
}

function renderDictEntry(ctx, el, id, onPick) {
  clear(el);
  const data = ctx.data; const l = data.lemmas[id]; const style = ctx.settings.style;
  const tr = lemmaTranslit(id, data.lemmas);
  const head = h(el, 'div', 'aa-dhead');
  const left = h(head, 'div', 'aa-dhead-main');
  arSpan(left, l[0], 'aa-big'); h(left, 'div', 'aa-tr', style === 'fr' ? frenchStyle(tr) : tr);
  soundBtn(left, () => speak(l[0]), 'Écouter (voix de l\'appareil)');
  const right = h(head, 'div', 'aa-dhead-info');
  h(right, 'span', 'aa-badge ' + (POS_CLASS[l[1]] || ''), lemmaType(l));
  const g = h(right, 'div', 'aa-gloss'); h(g, 'b', null, l[4] || '—');
  if (l[3]) { const r = h(right, 'div', 'aa-lemma'); h(r, 'span', 'aa-muted', 'racine : '); arSpan(r, l[3].split('').join(' '), 'aa-rootl'); }
  h(right, 'div', 'aa-muted', l[5] + ' fois dans le Coran');
  h(el, 'h4', null, 'Définition');
  mdText(el, 'div', 'aa-def', l[7] || (l[4] ? cap(l[4]) + '.' : '—'));
  if (l[8]) h(el, 'div', 'aa-ru', '🇷🇺 ' + l[8]);
  if (!l[7]) h(el, 'p', 'aa-muted aa-small', 'Mot plus rare : le sens détaillé vient surtout de ses exemples ci-dessous (traduction de chaque verset).');
  if (l[1] === 'V') {
    const f = ((l[2] || '').split('/').find(x => x.startsWith('VF:')) || 'VF:1').slice(3);
    if (VERB_FORMS[f]) mdText(el, 'p', 'aa-small', '**Forme ' + VERB_FORMS[f][0] + '** (' + VERB_FORMS[f][1] + ') : ' + VERB_FORMS[f][2] + '.');
  }
  // formes
  const fm = data.lemForms && data.lemForms.get(id);
  if (fm && fm.size) {
    h(el, 'h4', null, 'Ses formes dans le Coran (' + fm.size + ')');
    const box = h(el, 'div', 'aa-cands');
    [...fm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([txt, n]) => {
      const c = h(box, 'span', 'aa-chip'); arSpan(c, txt); h(c, 'span', 'aa-muted aa-small', ' ' + n + '×');
      c.title = translitPhrase([txt], style);
      c.addEventListener('click', () => { const r = data.lookup(txt).find(x => x.txt === txt); if (r) ctx.openQuran(r.ref[0], r.ref[1]); });
    });
    h(el, 'p', 'aa-muted aa-small', 'Clique une forme pour la voir dans son verset. Les différences viennent des préfixes (وَ, ال, بِـ…), des pronoms collés et des terminaisons de cas ou de personne.');
  }
  // famille
  if (l[3]) {
    const fam = data.rootFamily(l[3], id);
    if (fam.length) {
      h(el, 'h4', null, 'Même racine (' + fam.length + ')');
      const grid = h(el, 'div', 'aa-family');
      fam.slice(0, 30).forEach(x => { const c = h(grid, 'div', 'aa-fam'); arSpan(c, x.l[0]); h(c, 'div', 'aa-fam-g', x.l[4]); h(c, 'div', 'aa-muted aa-small', x.l[5] + '×'); c.addEventListener('click', () => onPick(x.id)); });
    }
  }
  // actions
  const act = h(el, 'div', 'aa-actions');
  btn(act, ctx.isMine(id) ? '✓ Dans mon vocabulaire' : 'Ajouter à mon vocabulaire', (ev) => { ctx.addVocab(id, l[0], tr, l[4], ''); ev.target.textContent = '✓ Dans mon vocabulaire'; });
  btn(act, 'Créer une flashcard', () => ctx.addFlashcard(l[0], l[4] + ' — ' + tr + (l[8] ? ' — ' + l[8] : '')));
  btn(act, 'Insérer dans la note', () => ctx.insertText('- ' + l[0] + ' (' + tr + ') — ' + l[4] + (l[3] ? ' · racine ' + l[3] : '') + '\n'));
  // occurrences
  const refs = data.allRefsOf(id);
  h(el, 'h4', null, 'Tous les versets (' + refs.length + ')');
  const list = h(el, 'div', 'aa-occ-list');
  let shown = 0;
  const more = async () => {
    for (const r of refs.slice(shown, shown + 8)) {
      const d = await data.surah(r[0]); const v = d.v[r[1] - 1]; if (!v) continue;
      const item = h(list, 'div', 'aa-occ');
      const a = h(item, 'div', 'aa-occ-ar'); a.setAttribute('dir', 'rtl');
      v[2].forEach((w, wi) => { arSpan(a, wordText(w), wi === r[2] - 1 ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
      const m = h(item, 'div', 'aa-occ-meta');
      const link = h(m, 'a', 'aa-link', data.surahInfo(r[0])[1] + ' ' + r[0] + ':' + r[1]);
      link.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(r[0], r[1]); });
      h(m, 'span', 'aa-muted', ' — ' + v[0]);
      if (ctx.settings.showRu && v[1]) h(m, 'div', 'aa-verse-ru', v[1]);
    }
    shown += 8; mb.style.display = shown < refs.length ? '' : 'none';
  };
  const mb = btn(el, 'Voir plus de versets', more, 'aa-btn-quiet');
  more();
}
/* ====================================================================
 * 06c - Parcours de grammaire : le contenu des leçons
 * Chaque exemple est un vrai verset : r = référence, w = mots surlignés (1 = premier mot)
 * ==================================================================== */
const LESSONS = [
  {
    id: 'racine', title: 'Le mot arabe : une racine et un moule', ar: 'الجَذْر وَالوَزْن', min: 25,
    goal: ['comprendre que presque chaque mot vient d\'une **racine de 3 consonnes**', 'reconnaître une même racine dans des mots différents', 'deviner le sens d\'un mot nouveau grâce à sa racine'],
    sections: [
      { t: 'Trois consonnes qui portent un sens', md: 'En français, « enseigner », « savant » et « science » n\'ont rien de commun à l\'oreille. En arabe, ils partagent **les mêmes trois consonnes** : **ع ل م** (ʿ-l-m), l\'idée de **savoir**.\n\nCes trois lettres s\'appellent la **racine** (jadhr). On les glisse dans un **moule** (wazn) fait de voyelles et de lettres ajoutées, et le moule donne la nuance : celui qui fait, l\'action, le lieu, l\'intensité…',
        table: [['Mot', 'Moule', 'Sens'], ['عَلِمَ', 'faʿila', 'il a su'], ['عَلَّمَ', 'faʿʿala (lettre du milieu doublée)', 'il a fait savoir = il a enseigné'], ['عِلْم', 'fiʿl', 'le savoir, la science'], ['عَالِم', 'fāʿil (celui qui fait)', 'un savant'], ['ٱلْعَٰلَمِين', 'pluriel', 'les mondes, l\'univers (ce par quoi on connaît le Créateur)']] },
      { t: 'Dans la sourate Al-ʿAlaq', md: 'La toute première révélation joue avec ces racines. Clique sur les mots surlignés : la fiche montre la racine de chacun.',
        ex: [{ r: '96:4', w: [2], n: 'عَلَّمَ : « il a enseigné » (racine ع ل م, lettre du milieu doublée par la chadda).' }, { r: '96:5', w: [1, 5], n: 'عَلَّمَ … يَعْلَمْ : même racine, deux moules. « Il a enseigné à l\'homme ce qu\'il ne **savait** pas. »' }, { r: '96:1', w: [1, 5], n: 'ٱقْرَأْ (q-r-ʾ, lire : même racine que قُرْآن, « la lecture ») et خَلَقَ (kh-l-q, créer).' }] },
      { t: 'Le moule fāʿil : « celui qui fait »', md: 'Le moule **fāʿil** (une voyelle longue ā après la 1re lettre, un i après la 2e) donne **celui qui fait l\'action** : كَاتِب (kātib) celui qui écrit, عَالِم celui qui sait, كَافِر celui qui couvre / renie. Au pluriel masculin, il prend souvent ـُونَ / ـِينَ : ٱلْكَٰفِرُونَ, ٱلضَّآلِّينَ.',
        ex: [{ r: '109:1', w: [3], n: 'ٱلْكَٰفِرُونَ : racine ك ف ر, moule fāʿil + pluriel ـُونَ.' }, { r: '1:7', w: [9], n: 'ٱلضَّآلِّينَ : racine ض ل ل (s\'égarer), « ceux qui s\'égarent ».' }] },
    ],
    keep: ['Une racine = **3 consonnes** = une idée. Le moule (voyelles + lettres ajoutées) précise le sens.', 'Pour chercher un mot dans un dictionnaire arabe, on cherche **sa racine**, pas sa première lettre.', 'Dans l\'atelier, la fiche de chaque mot montre sa racine et ouvre **toute sa famille** (onglet Dictionnaire → « Par racine »).'],
    practice: [
      { k: 'mcq', q: 'Quelle est la racine du mot عَلَّمَ (il a enseigné) ?', o: ['ع ل م', 'ع ل ل', 'ل م ع', 'ع م ل'], a: 0, why: 'La chadda sur le lām double la lettre, mais la racine reste **ع ل م**.' },
      { k: 'find', r: '96:5', q: 'Clique sur un mot de la racine ع ل م (savoir).', test: i => i.root === 'علم', why: 'عَلَّمَ (il a enseigné) et يَعْلَمْ (il sait) viennent tous les deux de ع ل م.' },
      { k: 'mcq', q: 'Si كَتَبَ veut dire « il a écrit », que veut probablement dire كَاتِب (moule fāʿil) ?', o: ['celui qui écrit', 'le livre', 'il a été écrit', 'le bureau'], a: 0, why: 'Le moule **fāʿil** donne « celui qui fait » : كَاتِب = celui qui écrit, l\'écrivain.' },
      { k: 'find', r: '96:2', q: 'Clique sur le verbe de la racine خ ل ق (créer).', test: i => i.root === 'خلق', why: 'خَلَقَ = « il a créé ». Le mot خَلْق (la création) a la même racine.' },
      { k: 'mcq', q: 'Pourquoi ٱلْعَٰلَمِينَ (l\'univers) et عِلْم (la science) se ressemblent-ils ?', o: ['ils ont la même racine ع ل م', 'c\'est un hasard', 'ils ont le même moule', 'ce sont deux verbes'], a: 0, why: 'Même racine **ع ل م** : l\'univers est ce par quoi on « connaît » son Créateur.' },
    ],
  },
  {
    id: 'defini', title: 'Défini ou indéfini : ال et le tanwīn', ar: 'المَعْرِفَة وَالنَّكِرَة', min: 25, rules: ['L\'article al et l\'alif wasla', 'Le tanwin', 'Les lettres solaires et lunaires'],
    goal: ['reconnaître un nom **défini** (« le ») et **indéfini** (« un »)', 'savoir pourquoi un nom n\'a jamais à la fois ال et le tanwīn', 'lire l\'article devant les lettres solaires'],
    sections: [
      { t: 'Deux façons de marquer un nom', md: '- **Défini** (« le, la ») : l\'article **ال** (al-) collé devant le nom : ٱلْكِتَابُ = le livre.\n- **Indéfini** (« un, une ») : le **tanwīn**, une voyelle doublée à la fin qui se prononce avec un **n** : كِتَابٌ (kitābun) = un livre.\n\nRègle d\'or : **jamais les deux à la fois**. Soit ال, soit tanwīn. C\'est pour cela que ٱلصَّمَدُ finit par -u et non par -un.' },
      { t: 'Dans la sourate Al-Ikhlāṣ', md: 'Compare أَحَدٌ (aḥadun, avec tanwīn : « un, unique ») et ٱلصَّمَدُ (aṣ-ṣamadu, avec ال : « l\'Absolu »).',
        ex: [{ r: '112:1', w: [4], n: 'أَحَدٌ : deux ḍamma à la fin = tanwīn → **indéfini**, « unique ».' }, { r: '112:2', w: [2], n: 'ٱلصَّمَدُ : ال devant, une seule ḍamma à la fin → **défini**.' }, { r: '97:3', w: [3, 6], n: 'خَيْرٌ et شَهْرٍ : deux indéfinis (tanwīn -un et -in).' }] },
      { t: 'Le lām qui disparaît : lettres solaires', md: 'Devant 14 lettres dites **solaires** (ت ث د ذ ر ز س ش ص ض ط ظ ل ن), le lām de ال ne se prononce pas : la lettre suivante est **doublée** (chadda). ٱلشَّمْس se lit **ash-shams**, pas « al-shams ». Devant les autres lettres (**lunaires**), on entend le l : ٱلْقَمَر = **al-qamar**.\n\nAstuce : regarde le lām. S\'il porte un soukoun (ٱلْ) → lettre lunaire ; s\'il n\'a rien et que la lettre suivante a une chadda → lettre solaire.',
        ex: [{ r: '91:1', w: [1], n: 'وَٱلشَّمْسِ : « wa-sh-shamsi », le lām ne se lit pas.' }, { r: '1:2', w: [1], n: 'ٱلْحَمْدُ : « al-ḥamdu », ح est lunaire, on entend le l.' }] },
      { t: 'D\'autres mots sont définis sans ال', md: 'Un nom est aussi défini quand il est **un nom propre** (ٱللَّهُ est un cas à part : son ال fait partie du nom), quand il porte **un pronom possessif** (رَبُّكَ = ton Seigneur) ou quand il est **suivi d\'un complément du nom** (رَبِّ ٱلْعَٰلَمِينَ = le Seigneur de l\'univers). Ces noms-là n\'ont pas non plus de tanwīn.' },
    ],
    keep: ['ال = défini (« le ») ; tanwīn (ـٌ ـً ـٍ) = indéfini (« un »). **Jamais les deux.**', 'Devant une lettre solaire, ال se lit sans l et la lettre suivante est doublée.', 'Un nom avec un possessif (ـكَ, ـهُ…) ou suivi d\'un complément du nom est défini lui aussi.'],
    practice: [
      { k: 'find', r: '112:4', q: 'Clique sur un mot **indéfini** (avec tanwīn).', test: i => i.f.indef, why: 'كُفُوًا (-an) et أَحَدٌ (-un) portent le tanwīn : ils sont indéfinis.' },
      { k: 'find', r: '97:3', q: 'Clique sur le mot **défini par ال**.', test: i => i.x.det, why: 'ٱلْقَدْرِ porte l\'article ال.' },
      { k: 'mcq', q: 'Comment se lit ٱلنَّاس (les gens) ?', o: ['an-nās', 'al-nās', 'al-anās', 'nās'], a: 0, why: 'ن est une lettre **solaire** : le lām ne se lit pas et le nūn est doublé → **an-nās**.' },
      { k: 'mcq', q: 'Laquelle de ces formes est **impossible** ?', o: ['ٱلْكِتَابٌ', 'ٱلْكِتَابُ', 'كِتَابٌ', 'كِتَابُكَ'], a: 0, why: 'ٱلْكِتَابٌ a **à la fois** ال et le tanwīn : c\'est interdit.' },
      { k: 'mcq', q: 'رَبُّكَ (ton Seigneur) est…', o: ['défini, grâce au possessif ـكَ', 'indéfini, car il n\'a pas ال', 'ni l\'un ni l\'autre'], a: 0, why: 'Un nom suivi d\'un pronom possessif est **défini**, même sans ال.' },
    ],
  },
  {
    id: 'cas', title: 'Les trois cas : -u, -a, -i', ar: 'الرَّفْع وَالنَّصْب وَالجَرّ', min: 30,
    goal: ['connaître les **trois cas** du nom et leur voyelle finale', 'comprendre pourquoi la dernière voyelle change sans changer le sens du mot', 'repérer le cas d\'un nom dans un verset'],
    sections: [
      { t: 'La dernière voyelle dit le rôle', md: 'En français, l\'ordre des mots dit qui fait quoi. En arabe (comme en russe ou en latin), c\'est **la fin du mot** :\n\n- **Nominatif** (rafʿ) : **-u** / -un → le sujet, ou l\'attribut.\n- **Accusatif** (naṣb) : **-a** / -an → le complément d\'objet, et quelques autres.\n- **Génitif** (jarr) : **-i** / -in → après une préposition, ou complément du nom (« … de … »).\n\nComme en russe : книга (nominatif), книгу (accusatif), книги (génitif). Même mot, même sens, rôle différent.',
        table: [['Cas', 'Défini', 'Indéfini', 'Quand ?'], ['nominatif', 'ٱلْكِتَابُ', 'كِتَابٌ', 'sujet, attribut'], ['accusatif', 'ٱلْكِتَابَ', 'كِتَابًا', 'complément d\'objet…'], ['génitif', 'ٱلْكِتَابِ', 'كِتَابٍ', 'après préposition, « de »']] },
      { t: 'Les trois cas dans la Fātiḥa', md: 'La Fātiḥa contient les trois cas. Clique sur chaque mot surligné et regarde la section « Pourquoi cette forme ? ».',
        ex: [{ r: '1:2', w: [1], n: 'ٱلْحَمْدُ : **-u**, nominatif. C\'est le sujet : « la louange (est) à Allah ».' }, { r: '1:6', w: [2], n: 'ٱلصِّرَٰطَ : **-a**, accusatif. C\'est le complément : « guide-nous **(sur) le chemin** ».' }, { r: '1:2', w: [3, 4], n: 'رَبِّ ٱلْعَٰلَمِينَ : **-i**, génitif. « Seigneur **de** l\'univers ».' }] },
      { t: 'Le pluriel en -ūna / -īna', md: 'Le pluriel masculin « sain » ne change pas de voyelle mais de **terminaison** : **ـُونَ** au nominatif, **ـِينَ** à l\'accusatif et au génitif. ٱلْكَٰفِرُونَ (nominatif, sourate 109) mais ٱلْعَٰلَمِينَ, ٱلضَّآلِّينَ (génitif, Fātiḥa).',
        ex: [{ r: '109:1', w: [3], n: 'ٱلْكَٰفِرُونَ : ـُونَ → nominatif (on s\'adresse à eux : « ô vous les… »).' }, { r: '1:7', w: [9], n: 'ٱلضَّآلِّينَ : ـِينَ → génitif.' }] },
      { t: 'Tester toi-même', md: 'Dans l\'onglet **Signes**, change la dernière voyelle d\'un mot et regarde ce que devient son rôle. Dans le détail d\'un mot du Coran, la partie « Et si on changeait le dernier signe ? » montre les trois cas côte à côte.' },
    ],
    keep: ['**-u** nominatif (sujet), **-a** accusatif (objet), **-i** génitif (après préposition ou « de »).', 'Avec le tanwīn : -un, -an, -in.', 'Pluriel masculin : ـُونَ (nominatif) / ـِينَ (accusatif et génitif).'],
    practice: [
      { k: 'find', r: '1:2', q: 'Clique sur le mot au **nominatif**.', test: i => i.f.cas === 'NOM', why: 'ٱلْحَمْدُ finit par -u : nominatif, c\'est le sujet.' },
      { k: 'find', r: '1:6', q: 'Clique sur un mot à l\'**accusatif**.', test: i => i.f.cas === 'ACC', why: 'ٱلصِّرَٰطَ et ٱلْمُسْتَقِيمَ finissent par -a : accusatif.' },
      { k: 'mcq', q: 'ٱلْمُؤْمِنُونَ (les croyants) est à quel cas ?', o: ['nominatif', 'accusatif', 'génitif'], a: 0, why: 'La terminaison **ـُونَ** est celle du nominatif pluriel.' },
      { k: 'gen', type: 'case' }, { k: 'gen', type: 'case' },
    ],
  },
  {
    id: 'prep', title: 'Les prépositions et le génitif', ar: 'حُرُوف الجَرّ', min: 25,
    goal: ['connaître les **prépositions les plus fréquentes** du Coran', 'savoir qu\'une préposition met toujours le nom suivant au **génitif**', 'reconnaître une préposition collée au mot (بِـ، لِـ، كَـ)'],
    sections: [
      { t: 'Les petites prépositions', md: 'Une préposition met **toujours** le nom qui suit au **génitif** (-i). Certaines sont des mots à part, d\'autres sont **une seule lettre collée** au nom.',
        table: [['Préposition', 'Sens', 'Exemple'], ['بِـ', 'par, avec, au nom de', 'بِسْمِ = au nom de'], ['لِـ', 'à, pour', 'لِلَّهِ = à Allah'], ['كَـ', 'comme', 'كَٱلْفَرَاشِ = comme des papillons'], ['فِي', 'dans', 'فِي خُسْرٍ = dans la perte'], ['مِنْ', 'de (provenance), parmi', 'مِنْ شَرِّ = du mal de'], ['إِلَى', 'vers', 'إِلَىٰ رَبِّكِ = vers ton Seigneur'], ['عَلَى', 'sur', 'عَلَيْهِمْ = sur eux'], ['عَنْ', 'loin de, au sujet de', 'عَنْهُ = de lui']] },
      { t: 'Dans le Coran', md: 'Regarde comme le mot qui suit chaque préposition finit par -i.',
        ex: [{ r: '1:1', w: [1], n: 'بِسْمِ : بِـ collé à ٱسْم (nom), qui passe au génitif : ismi.' }, { r: '103:2', w: [3, 4], n: 'لَفِي خُسْرٍ : « (est) certes **dans** une perte » ; خُسْرٍ au génitif indéfini (-in).' }, { r: '113:2', w: [1, 2], n: 'مِن شَرِّ : « **du** mal », شَرِّ au génitif.' }, { r: '89:28', w: [2, 3], n: 'إِلَىٰ رَبِّكِ : « **vers** ton Seigneur ».' }] },
      { t: 'Préposition + pronom', md: 'Une préposition peut porter un pronom collé : عَلَيْهِمْ (sur eux), لَهُ (à lui), عَنْهُ (de lui), فِيهِ (en lui). Attention : لِـ devient **لَـ** devant un pronom (لَهُ, لَكَ), et عَلَى devient **عَلَيْـ** (عَلَيْهِمْ).',
        ex: [{ r: '1:7', w: [4], n: 'عَلَيْهِمْ = عَلَى + هِمْ (eux).' }, { r: '112:4', w: [3], n: 'لَهُۥ = لِـ + هُ (lui) : le l prend un a.' }] },
      { t: 'Pourquoi c\'est utile ?', md: 'Le groupe « préposition + nom » sert souvent d\'**attribut** dans une phrase sans verbe : ٱلْحَمْدُ لِلَّهِ = « la louange (est) **à Allah** ». Et quand il vient **en tête**, il veut souvent dire « il y a / à X appartient » : وَلَهُمْ عَذَابٌ = « et **pour eux** (il y a) un châtiment ».' },
    ],
    keep: ['Après une préposition : **génitif** (-i, -in, ـِينَ). Toujours.', 'بِـ لِـ كَـ sont collées au mot ; فِي مِنْ إِلَى عَلَى عَنْ sont séparées.', 'لِـ → لَـ et عَلَى → عَلَيْـ devant un pronom.'],
    practice: [
      { k: 'find', r: '113:1', q: 'Clique sur le mot qui contient une **préposition collée**.', test: i => !!i.x.prep, why: 'بِرَبِّ = بِـ (auprès de) + رَبِّ, au génitif.' },
      { k: 'find', r: '103:2', q: 'Clique sur le nom au **génitif à cause de la préposition**.', test: i => i.r.key === 'majrur', why: 'خُسْرٍ suit فِي : il est au génitif (-in).' },
      { k: 'mcq', q: 'Complète : فِي ٱلْبَيْتـ… (dans la maison)', o: ['ٱلْبَيْتِ', 'ٱلْبَيْتُ', 'ٱلْبَيْتَ', 'ٱلْبَيْتٌ'], a: 0, why: 'Après فِي, toujours le **génitif** : ٱلْبَيْتِ.' },
      { k: 'mcq', q: 'Que veut dire لَهُ ?', o: ['à lui', 'sur lui', 'de lui', 'avec lui'], a: 0, why: 'لَهُ = لِـ (à) + هُ (lui).' },
      { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'idafa', title: 'L\'annexion : « le Seigneur de l\'univers »', ar: 'الإِضَافَة', min: 30,
    goal: ['construire « le X de Y » à l\'arabe', 'connaître les **deux règles du premier mot** (ni ال ni tanwīn)', 'reconnaître les chaînes d\'annexions'],
    sections: [
      { t: 'Deux noms collés', md: 'Pour dire « le livre **de** l\'élève », l\'arabe ne met pas de « de ». Il colle deux noms :\n\n**كِتَابُ ٱلطَّالِبِ** (kitābu ṭ-ṭālibi)\n\n1. Le **premier** nom (muḍāf) : **ni ال, ni tanwīn**. Son cas dépend de son rôle dans la phrase.\n2. Le **second** (muḍāf ilayh) : **toujours au génitif**.\n\nLe premier mot devient défini grâce au second : كِتَابُ ٱلطَّالِبِ = « **le** livre de l\'élève ».' },
      { t: 'Dans la Fātiḥa', md: 'La Fātiḥa en est pleine.',
        ex: [{ r: '1:2', w: [3, 4], n: 'رَبِّ ٱلْعَٰلَمِينَ : « Seigneur **de** l\'univers ». رَبِّ n\'a ni ال ni tanwīn.' }, { r: '1:4', w: [1, 2, 3], n: 'مَٰلِكِ يَوْمِ ٱلدِّينِ : une **chaîne** : « Maître **du** jour **de** la rétribution ». يَوْمِ est à la fois 2e terme (de مَٰلِكِ) et 1er terme (de ٱلدِّينِ).' }, { r: '1:1', w: [1, 2], n: 'بِسْمِ ٱللَّهِ : « au nom **d\'**Allah ».' }] },
      { t: 'Dans la sourate An-Nās', md: 'Trois annexions de suite, avec le même second terme ٱلنَّاسِ (les hommes) :',
        ex: [{ r: '114:1', w: [3, 4], n: 'رَبِّ ٱلنَّاسِ : le Seigneur des hommes.' }, { r: '114:2', w: [1, 2], n: 'مَلِكِ ٱلنَّاسِ : le Roi des hommes.' }, { r: '114:3', w: [1, 2], n: 'إِلَٰهِ ٱلنَّاسِ : le Dieu des hommes.' }, { r: '110:1', w: [3, 4], n: 'نَصْرُ ٱللَّهِ : ici le premier terme est au **nominatif** (-u) car c\'est le sujet du verbe ; le second reste au génitif.' }] },
      { t: 'Le possessif est aussi une annexion', md: 'رَبُّكَ (ton Seigneur), رَبِّهِمْ (leur Seigneur) : le pronom collé joue le rôle du second terme. C\'est pour cela que رَبُّ y perd son tanwīn.' },
    ],
    keep: ['« le X de Y » = **X** (sans ال ni tanwīn) + **Y au génitif**.', 'Le cas du premier mot dépend de son rôle ; le second est **toujours** au génitif.', 'Un pronom possessif collé (ـكَ، ـهُ، ـهُمْ…) forme aussi une annexion.'],
    practice: [
      { k: 'find', r: '1:4', q: 'Clique sur un **complément du nom** (2e terme, au génitif).', test: i => i.r.key === 'mudafIlayh', why: 'يَوْمِ complète مَٰلِكِ, et ٱلدِّينِ complète يَوْمِ.' },
      { k: 'mcq', q: 'Comment dit-on « la porte de la maison » ?', o: ['بَابُ ٱلْبَيْتِ', 'ٱلْبَابُ ٱلْبَيْتِ', 'بَابٌ ٱلْبَيْتِ', 'بَابُ ٱلْبَيْتُ'], a: 0, why: 'Premier mot **sans ال ni tanwīn** (بَابُ), second au **génitif** (ٱلْبَيْتِ).' },
      { k: 'mcq', q: 'Dans نَصْرُ ٱللَّهِ (110:1), pourquoi نَصْرُ est-il au nominatif ?', o: ['parce qu\'il est le sujet du verbe جَاءَ', 'parce que c\'est une annexion', 'parce qu\'il suit une préposition'], a: 0, why: 'Le cas du **premier** terme dépend de son rôle : ici sujet de « vient » → nominatif.' },
      { k: 'find', r: '114:2', q: 'Clique sur le **premier terme** de l\'annexion (celui qui n\'a ni ال ni tanwīn).', test: i => i.wi === 0, why: 'مَلِكِ : sans ال ni tanwīn, il est complété par ٱلنَّاسِ.' },
      { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'pronoms', title: 'Les pronoms collés : ton, son, leur…', ar: 'الضَّمَائِر المُتَّصِلَة', min: 25,
    goal: ['connaître les **pronoms collés** les plus fréquents', 'savoir ce qu\'ils veulent dire selon le mot qui les porte (nom, verbe, préposition)'],
    sections: [
      { t: 'Le tableau à connaître', md: 'Les pronoms se collent à la fin du mot. Sur un **nom**, ils veulent dire « mon, ton, son… » ; sur un **verbe**, « me, te, le… » ; sur une **préposition**, « moi, toi, lui… ».',
        table: [['Pronom', 'Sur un nom', 'Sur un verbe', 'Exemple'], ['ـِي / ـنِي', 'mon', 'me', 'رَبِّي mon Seigneur'], ['ـكَ', 'ton (masc.)', 'te', 'رَبُّكَ ton Seigneur'], ['ـكِ', 'ton (fém.)', 'te', 'رَبِّكِ (89:28)'], ['ـهُ', 'son (à lui)', 'le', 'مَالُهُ sa fortune'], ['ـهَا', 'son (à elle)', 'la', 'أَثْقَالَهَا ses fardeaux'], ['ـنَا', 'notre', 'nous', 'ٱهْدِنَا guide-nous'], ['ـكُمْ', 'votre', 'vous', 'دِينُكُمْ votre religion'], ['ـهُمْ', 'leur', 'les', 'عَلَيْهِمْ sur eux']] },
      { t: 'Dans le Coran', md: 'Clique sur les mots : la partie « Les morceaux du mot » sépare le pronom.',
        ex: [{ r: '1:6', w: [1], n: 'ٱهْدِنَا : « guide-**nous** » (pronom sur un verbe).' }, { r: '108:2', w: [2], n: 'لِرَبِّكَ : لِـ + رَبِّ + **كَ** : « pour **ton** Seigneur ».' }, { r: '111:2', w: [3, 4], n: 'عَنْهُ … مَالُهُۥ : « **de lui** … **sa** fortune ».' }, { r: '99:2', w: [3], n: 'أَثْقَالَهَا : « **ses** fardeaux » (à elle, la terre).' }] },
      { t: 'Le hu qui devient hi', md: 'Après un **i** ou un **y**, ـهُ devient ـهِ et ـهُمْ devient ـهِمْ : عَلَيْهِمْ, فِيهِ, بِإِذْنِهِ. C\'est seulement pour la prononciation, le sens ne change pas.' },
    ],
    keep: ['Sur un nom : possessif (mon, ton…) ; sur un verbe : complément (me, te…) ; sur une préposition : moi, toi, lui…', 'ـهُ / ـهُمْ deviennent ـهِ / ـهِمْ après i ou y.', 'Un nom avec un possessif est défini : jamais de ال ni de tanwīn.'],
    practice: [
      { k: 'find', r: '108:2', q: 'Clique sur le mot qui porte un **pronom collé**.', test: i => i.x.pron.length > 0, why: 'لِرَبِّكَ se termine par ـكَ (ton).' },
      { k: 'mcq', q: 'Que veut dire رَبُّهُمْ ?', o: ['leur Seigneur', 'son Seigneur', 'notre Seigneur', 'votre Seigneur'], a: 0, why: 'ـهُمْ sur un nom = **leur**.' },
      { k: 'find', r: '111:2', q: 'Clique sur le **nom** qui porte un possessif (« sa … »).', test: i => i.x.pron.length > 0 && i.f.pos === 'N', why: 'مَالُهُۥ = « sa fortune » : مَالُ + هُ.' },
      { k: 'mcq', q: 'Dans ٱهْدِنَا (guide-nous), le ـنَا est…', o: ['un complément d\'objet (« nous »)', 'un possessif (« notre »)', 'le sujet du verbe'], a: 0, why: 'Sur un verbe à l\'impératif, ـنَا est le **complément** : « guide-**nous** ».' },
    ],
  },
  {
    id: 'nominale', title: 'La phrase nominale : « Allah est l\'Absolu »', ar: 'الجُمْلَة الاِسْمِيَّة', min: 30,
    goal: ['construire une phrase **sans verbe « être »**', 'reconnaître le **sujet** (mubtadaʾ) et l\'**attribut** (khabar)', 'savoir quand l\'attribut passe devant'],
    sections: [
      { t: 'Pas de verbe « être » au présent', md: 'En arabe, comme en russe (« Бог — един »), on ne dit pas « est » au présent. On pose **deux mots au nominatif** :\n\n- le **sujet** (mubtadaʾ), en général **défini** ;\n- l\'**attribut** (khabar), ce qu\'on dit de lui, souvent **indéfini**.\n\nٱلْبَيْتُ كَبِيرٌ = « la maison (est) grande ». Si l\'attribut était défini, on lirait « la grande maison » : c\'est souvent le **tanwīn** de l\'attribut qui montre qu\'il y a une phrase.' },
      { t: 'Dans le Coran', md: '',
        ex: [{ r: '112:2', w: [1, 2], n: 'ٱللَّهُ ٱلصَّمَدُ : « Allah (est) l\'Absolu ». Sujet + attribut, deux nominatifs.' }, { r: '97:3', w: [1, 2, 3], n: 'لَيْلَةُ ٱلْقَدْرِ خَيْرٌ : « la nuit du Destin (est) meilleure ». Le sujet est une annexion, l\'attribut خَيْرٌ a le tanwīn.' }, { r: '96:3', w: [2, 3], n: 'وَرَبُّكَ ٱلْأَكْرَمُ : « et ton Seigneur (est) le Très-Noble ».' }] },
      { t: 'Un attribut qui n\'est pas un nom', md: 'L\'attribut peut être un **groupe préposition + nom** : ٱلْحَمْدُ **لِلَّهِ** = « la louange (est) **à Allah** ». Il peut même être **toute une phrase verbale** : ٱللَّهُ يَعْلَمُ = « Allah, Il sait ».',
        ex: [{ r: '1:2', w: [1, 2], n: 'ٱلْحَمْدُ (sujet) + لِلَّهِ (attribut : préposition + nom).' }] },
      { t: 'L\'attribut en tête', md: 'Quand le sujet est **indéfini**, l\'arabe met souvent l\'attribut (préposition + nom) **devant** : لَهُمْ عَذَابٌ = « **pour eux**, un châtiment » = « ils auront un châtiment ». C\'est la manière arabe de dire « il y a ».',
        ex: [{ r: '2:7', w: [10, 11, 12], n: 'وَلَهُمْ عَذَابٌ عَظِيمٌ : « et **pour eux** (il y aura) un châtiment immense ».' }] },
      { t: 'Voir le schéma', md: 'Sous chaque verset, le bouton **🧩 Analyse de la phrase** dessine les liens : une flèche « attribut » va de l\'attribut vers le sujet.', irab: '112:2' },
    ],
    keep: ['Phrase nominale = **sujet + attribut**, tous deux au **nominatif**, sans verbe « être ».', 'Sujet souvent défini, attribut souvent indéfini (avec tanwīn).', 'Attribut = nom, groupe prépositionnel, ou phrase verbale. Avec un sujet indéfini, l\'attribut passe devant (« il y a »).'],
    practice: [
      { k: 'find', r: '112:2', q: 'Clique sur le **sujet** de la phrase.', test: i => i.r.key === 'mubtada', why: 'ٱللَّهُ ouvre la phrase : c\'est le sujet (mubtadaʾ).' },
      { k: 'find', r: '97:3', q: 'Clique sur l\'**attribut** (ce qu\'on dit de la nuit du Destin).', test: i => i.r.key === 'khabar', why: 'خَيْرٌ (« meilleure ») est l\'attribut, au nominatif indéfini.' },
      { k: 'mcq', q: 'Que veut dire ٱلْبَيْتُ كَبِيرٌ ?', o: ['La maison est grande.', 'La grande maison.', 'Une grande maison.'], a: 0, why: 'Défini + indéfini au nominatif = **phrase** : « la maison (est) grande ». « La grande maison » serait ٱلْبَيْتُ ٱلْكَبِيرُ.' },
      { k: 'mcq', q: 'Que veut dire لَهُ كِتَابٌ ?', o: ['Il a un livre.', 'Son livre.', 'Le livre est à moi.'], a: 0, why: 'Attribut en tête (لَهُ, « à lui ») + sujet indéfini (كِتَابٌ) : « à lui, un livre » = **il a un livre**.' },
      { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'adjectif', title: 'L\'adjectif copie son nom', ar: 'النَّعْت', min: 25,
    goal: ['placer l\'adjectif **après** le nom', 'faire l\'**accord** : cas, défini/indéfini, genre, nombre', 'distinguer « la maison grande » (adjectif) et « la maison est grande » (phrase)'],
    sections: [
      { t: 'Quatre accords', md: 'L\'adjectif se met **après** le nom et **copie** :\n\n1. son **cas** (-u, -a, -i) ;\n2. sa **définition** (ال ↔ ال, tanwīn ↔ tanwīn) ;\n3. son **genre** (ـَة au féminin) ;\n4. son **nombre** (singulier, duel, pluriel ; un pluriel de choses est traité comme un féminin singulier).\n\nبَيْتٌ كَبِيرٌ = une grande maison · ٱلْبَيْتُ ٱلْكَبِيرُ = la grande maison · فِي ٱلْبَيْتِ ٱلْكَبِيرِ = dans la grande maison.' },
      { t: 'Dans la Fātiḥa', md: '',
        ex: [{ r: '1:1', w: [2, 3, 4], n: 'ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ : deux adjectifs qui copient le génitif et l\'ال de ٱللَّهِ.' }, { r: '1:6', w: [2, 3], n: 'ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ : « le chemin droit », deux accusatifs définis.' }, { r: '2:7', w: [11, 12], n: 'عَذَابٌ عَظِيمٌ : « un châtiment immense », deux nominatifs indéfinis.' }, { r: '89:27', w: [2, 3], n: 'ٱلنَّفْسُ ٱلْمُطْمَئِنَّةُ : « l\'âme apaisée », féminin (ـَة) comme نَفْس.' }] },
      { t: 'Adjectif ou phrase ?', md: 'Tout se joue sur ال :\n\n- ٱلصِّرَاطُ ٱلْمُسْتَقِيمُ (défini + défini) = **le chemin droit** (adjectif) ;\n- ٱلصِّرَاطُ مُسْتَقِيمٌ (défini + indéfini) = **le chemin est droit** (phrase).' },
    ],
    keep: ['L\'adjectif vient **après** le nom.', 'Il copie : **cas, ال/tanwīn, genre, nombre**.', 'Défini + défini = groupe (« le chemin droit ») ; défini + indéfini = phrase (« le chemin est droit »).'],
    practice: [
      { k: 'find', r: '1:6', q: 'Clique sur l\'**adjectif**.', test: i => i.r.key === 'nat', why: 'ٱلْمُسْتَقِيمَ qualifie ٱلصِّرَٰطَ et copie son accusatif et son ال.' },
      { k: 'mcq', q: 'Complète : فِي ٱلْبَيْتِ … (dans la grande maison)', o: ['ٱلْكَبِيرِ', 'كَبِيرٍ', 'ٱلْكَبِيرُ', 'كَبِيرٌ'], a: 0, why: 'L\'adjectif copie le **génitif** et l\'**ال** : ٱلْكَبِيرِ.' },
      { k: 'mcq', q: 'Que veut dire ٱلرَّجُلُ صَالِحٌ ?', o: ['L\'homme est vertueux.', 'L\'homme vertueux.', 'Un homme vertueux.'], a: 0, why: 'Défini + **indéfini** : c\'est une phrase nominale (« … est … »).' },
      { k: 'find', r: '1:1', q: 'Clique sur un **adjectif** de la basmala.', test: i => i.r.key === 'nat', why: 'ٱلرَّحْمَٰنِ et ٱلرَّحِيمِ qualifient ٱللَّهِ.' },
      { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'passe', title: 'Le verbe au passé', ar: 'الفِعْل المَاضِي', min: 30,
    goal: ['reconnaître un verbe au passé', 'connaître les **terminaisons de personne** (je, tu, il, nous…)', 'comprendre que le sujet est souvent caché dans le verbe'],
    sections: [
      { t: 'La forme de base : « il a fait »', md: 'Le dictionnaire arabe ne donne pas l\'infinitif mais **« il a fait »** : فَعَلَ (faʿala), كَتَبَ (il a écrit), خَلَقَ (il a créé). Les autres personnes ajoutent une **terminaison** :',
        table: [['Personne', 'Terminaison', 'Exemple (خَلَقَ)'], ['il', 'ـَ', 'خَلَقَ'], ['elle', 'ـَتْ', 'خَلَقَتْ'], ['tu (m.)', 'ـْتَ', 'خَلَقْتَ'], ['tu (f.)', 'ـْتِ', 'خَلَقْتِ'], ['je', 'ـْتُ', 'خَلَقْتُ'], ['ils', 'ـُوا', 'خَلَقُوا'], ['vous', 'ـْتُمْ', 'خَلَقْتُمْ'], ['nous', 'ـْنَا', 'خَلَقْنَا']] },
      { t: 'Dans le Coran', md: '',
        ex: [{ r: '80:1', w: [1, 2], n: 'عَبَسَ وَتَوَلَّىٰ : « **il** s\'est renfrogné et s\'est détourné » (forme de base).' }, { r: '1:7', w: [3], n: 'أَنْعَمْتَ : « **tu** as comblé » (ـْتَ).' }, { r: '90:4', w: [2], n: 'خَلَقْنَا : « **nous** avons créé » (ـْنَا).' }, { r: '111:1', w: [1], n: 'تَبَّتْ : « qu\'elles périssent » (ـَتْ, féminin : les deux mains).' }, { r: '103:3', w: [3, 4], n: 'ءَامَنُوا۟ وَعَمِلُوا۟ : « **ils** ont cru et ont fait » (ـُوا ; l\'alif final ne se prononce pas).' }] },
      { t: 'Le sujet est dans le verbe', md: 'خَلَقْنَا suffit pour dire « **nous** avons créé ». Pas besoin de « nous » séparé : la terminaison **est** le sujet. Dans le schéma d\'analyse, la terminaison apparaît comme « fāʿil » (sujet) à l\'intérieur du mot.\n\nLe passé est **invariable** : sa fin ne change pas selon les mots qui l\'entourent (contrairement au présent, leçon 11). Pour conjuguer n\'importe quel verbe, ouvre l\'onglet **Construire** → tableau de conjugaison.' },
    ],
    keep: ['Le verbe de base est « il a fait » : فَعَلَ.', 'Terminaisons : ـَتْ elle, ـْتَ tu, ـْتُ je, ـُوا ils, ـْتُمْ vous, ـْنَا nous.', 'La terminaison est le sujet : pas besoin de pronom séparé.'],
    practice: [
      { k: 'find', r: '90:4', q: 'Clique sur le **verbe au passé**.', test: i => i.f.pos === 'V' && i.f.aspect === 'PERF', why: 'خَلَقْنَا : « nous avons créé ».' },
      { k: 'mcq', q: 'Que veut dire كَتَبْتُ ?', o: ['j\'ai écrit', 'tu as écrit', 'elle a écrit', 'nous avons écrit'], a: 0, why: 'ـْتُ = **je**.' },
      { k: 'mcq', q: 'أَنْعَمْتَ (1:7) : qui a comblé ?', o: ['toi (tu)', 'lui (il)', 'nous', 'eux'], a: 0, why: 'ـْتَ = **tu** (masculin) : on s\'adresse à Allah.' },
      { k: 'find', r: '103:3', q: 'Clique sur un verbe dont le sujet est « **ils** ».', test: i => i.f.pos === 'V' && /^3MP/.test(i.f.person), why: 'ءَامَنُوا۟, وَعَمِلُوا۟, وَتَوَاصَوْا۟ finissent par ـُوا (ils).' },
      { k: 'mcq', q: 'Comment dit-on « elle a écrit » ?', o: ['كَتَبَتْ', 'كَتَبْتُ', 'كَتَبُوا', 'كَتَبْنَا'], a: 0, why: 'Féminin : ـَتْ → كَتَبَتْ.' },
    ],
  },
  {
    id: 'verbale', title: 'La phrase verbale : qui fait quoi ?', ar: 'الجُمْلَة الفِعْلِيَّة', min: 30,
    goal: ['connaître l\'ordre **verbe → sujet → complément**', 'reconnaître le **sujet** (nominatif) et le **complément d\'objet** (accusatif)', 'savoir pourquoi le verbe reste au singulier devant un sujet pluriel'],
    sections: [
      { t: 'Le verbe d\'abord', md: 'L\'ordre habituel en arabe est : **verbe → sujet (-u) → complément (-a)**.\n\nكَتَبَ ٱلْوَلَدُ ٱلدَّرْسَ = « l\'enfant a écrit la leçon ».\n\nComme c\'est **la fin des mots** qui dit qui fait quoi, l\'ordre peut changer sans changer le sens : كَتَبَ ٱلدَّرْسَ ٱلْوَلَدُ veut toujours dire « l\'enfant a écrit la leçon ».' },
      { t: 'Dans le Coran', md: '',
        ex: [{ r: '110:1', w: [2, 3], n: 'جَآءَ نَصْرُ ٱللَّهِ : verbe (جَآءَ, il est venu) puis sujet au nominatif (نَصْرُ).' }, { r: '99:2', w: [1, 2, 3], n: 'وَأَخْرَجَتِ ٱلْأَرْضُ أَثْقَالَهَا : verbe + sujet (ٱلْأَرْضُ, -u) + complément (أَثْقَالَهَا, -a). « La terre a fait sortir ses fardeaux. »' }, { r: '105:1', w: [4, 5], n: 'فَعَلَ رَبُّكَ : « ton Seigneur a agi ».' }, { r: '110:2', w: [1, 2], n: 'وَرَأَيْتَ ٱلنَّاسَ : sujet caché dans le verbe (ـْتَ, tu) + complément ٱلنَّاسَ (-a).' }] },
      { t: 'Le verbe devant reste au singulier', md: 'Quand le verbe est **avant** son sujet, il reste **au singulier** (il s\'accorde seulement en genre) : جَاءَ ٱلرِّجَالُ = « les hommes sont venus » (et non جَاءُوا). Dans 99:2, أَخْرَجَتْ est au féminin car ٱلْأَرْض (la terre) est féminin.' },
      { t: 'Le complément mis en avant', md: 'Pour insister, le complément peut passer **devant** le verbe : إِيَّاكَ نَعْبُدُ = « c\'est **Toi** que nous adorons » (et personne d\'autre). إِيَّا sert de support au pronom ـكَ.',
        ex: [{ r: '1:5', w: [1, 2], n: 'إِيَّاكَ (complément, en tête pour insister) + نَعْبُدُ (verbe, sujet caché : nous).' }], irab: '99:2' },
    ],
    keep: ['Ordre habituel : **verbe → sujet (-u) → complément (-a)**.', 'Le verbe avant son sujet reste au singulier (accord en genre seulement).', 'Mettre le complément devant = insister : إِيَّاكَ نَعْبُدُ.'],
    practice: [
      { k: 'find', r: '110:1', q: 'Clique sur le **sujet** du verbe.', test: i => i.r.key === 'fail', why: 'نَصْرُ (au nominatif) est le sujet de جَآءَ : « le secours d\'Allah vient ».' },
      { k: 'find', r: '99:2', q: 'Clique sur le **complément d\'objet**.', test: i => i.r.key === 'maful', why: 'أَثْقَالَهَا (-a) : ce que la terre fait sortir.' },
      { k: 'mcq', q: 'Que veut dire كَتَبَ ٱلدَّرْسَ ٱلْوَلَدُ ?', o: ['L\'enfant a écrit la leçon.', 'La leçon a écrit l\'enfant.', 'L\'enfant de la leçon a écrit.'], a: 0, why: 'ٱلْوَلَدُ a le **-u** (sujet), ٱلدَّرْسَ le **-a** (complément) : l\'ordre ne change rien.' },
      { k: 'mcq', q: '« Les croyants sont venus » (verbe en tête) :', o: ['جَاءَ ٱلْمُؤْمِنُونَ', 'جَاءُوا ٱلْمُؤْمِنُونَ', 'جَاءَتِ ٱلْمُؤْمِنُونَ'], a: 0, why: 'Verbe **avant** le sujet → singulier : جَاءَ.' },
      { k: 'gen', type: 'role' }, { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'present', title: 'Le présent et ses trois modes', ar: 'الفِعْل المُضَارِع', min: 35,
    goal: ['reconnaître un verbe au présent (préfixes **أ ن ت ي**)', 'connaître les **trois modes** : indicatif -u, subjonctif -a, apocopé ـْ', 'savoir quels mots changent le mode (لَمْ, لَنْ, أَنْ, لَا d\'interdiction)'],
    sections: [
      { t: 'Les préfixes du présent', md: 'Au présent, la personne se lit **au début** du verbe : **أَ** je, **نَ** nous, **تَ** tu / elle, **يَ** il / ils. Pour s\'en souvenir : **أنيت** (« anaytu »).',
        table: [['Préfixe', 'Personne', 'Exemple (عَبَدَ, adorer)'], ['أَـ', 'je', 'أَعْبُدُ j\'adore'], ['نَـ', 'nous', 'نَعْبُدُ nous adorons'], ['تَـ', 'tu', 'تَعْبُدُ tu adores'], ['يَـ', 'il', 'يَعْبُدُ il adore'], ['تَـ … ـُونَ', 'vous', 'تَعْبُدُونَ vous adorez'], ['يَـ … ـُونَ', 'ils', 'يَعْبُدُونَ ils adorent']],
        ex: [{ r: '1:5', w: [2, 4], n: 'نَعْبُدُ … نَسْتَعِينُ : « **nous** adorons … **nous** demandons l\'aide » (préfixe نَـ).' }, { r: '109:2', w: [2, 4], n: 'أَعْبُدُ … تَعْبُدُونَ : « **j\'**adore … **vous** adorez ».' }] },
      { t: 'Trois fins possibles', md: 'Contrairement au passé, la fin du présent **change selon le mot d\'avant** :\n\n- **Indicatif** (-u, ou ـونَ) : la forme normale. يَعْلَمُ = il sait.\n- **Subjonctif** (-a, ou ـوا) : après **أَنْ** (que), **لَنْ** (ne… jamais, futur), **كَيْ / لِـ** (pour que). لَنْ يَقْدِرَ = il ne pourra pas.\n- **Apocopé** (soukoun ـْ, ou ـوا) : après **لَمْ** (passé nié), **لَا** d\'interdiction, **لِـ** d\'ordre, et dans les conditions. لَمْ يَلِدْ = il n\'a pas engendré.' },
      { t: 'Les trois modes dans le Coran', md: '',
        ex: [{ r: '96:5', w: [4, 5], n: 'لَمْ يَعْلَمْ : **لَمْ** + apocopé (soukoun) = « il ne savait pas ». Attention : لَمْ + présent = sens **passé** !' }, { r: '112:3', w: [1, 2, 3, 4], n: 'لَمْ يَلِدْ وَلَمْ يُولَدْ : deux apocopés : « Il n\'a pas engendré et n\'a pas été engendré ».' }, { r: '90:5', w: [2, 3, 4], n: 'أَن لَّن يَقْدِرَ : **لَنْ** + subjonctif (-a) = « que personne ne **pourra** ».' }, { r: '1:5', w: [2], n: 'نَعْبُدُ : rien devant → indicatif (-u).' }] },
      { t: 'Le futur', md: 'Pour le futur, on colle **سَـ** (bientôt) ou on met **سَوْفَ** devant l\'indicatif : سَيَعْلَمُونَ = « ils sauront ». Et pour nier le futur, **لَنْ + subjonctif**.' },
    ],
    keep: ['Présent : préfixes **أ ن ت ي** (je, nous, tu/elle, il).', '-u **indicatif** (normal) · -a **subjonctif** (après أَنْ, لَنْ) · ـْ **apocopé** (après لَمْ, لَا d\'interdiction).', 'لَمْ + apocopé = passé nié ; لَنْ + subjonctif = futur nié.'],
    practice: [
      { k: 'find', r: '112:3', q: 'Clique sur un verbe à l\'**apocopé**.', test: i => i.f.mood === 'JUS', why: 'يَلِدْ et يُولَدْ (soukoun) suivent لَمْ.' },
      { k: 'find', r: '90:5', q: 'Clique sur le verbe au **subjonctif**.', test: i => i.f.mood === 'SUBJ', why: 'يَقْدِرَ (-a) suit لَنْ.' },
      { k: 'mcq', q: 'Que veut dire لَمْ يَكْتُبْ ?', o: ['il n\'a pas écrit', 'il n\'écrira jamais', 'n\'écris pas !', 'il écrit'], a: 0, why: 'لَمْ + apocopé = **passé** nié.' },
      { k: 'mcq', q: 'Complète : لَنْ يَذْهَبـ… (il n\'ira pas)', o: ['يَذْهَبَ', 'يَذْهَبُ', 'يَذْهَبْ'], a: 0, why: 'Après لَنْ : **subjonctif** (-a).' },
      { k: 'gen', type: 'mood' }, { k: 'gen', type: 'mood' },
    ],
  },
  {
    id: 'imperatif', title: 'L\'impératif et l\'interdiction', ar: 'الأَمْر وَالنَّهْي', min: 25,
    goal: ['former et reconnaître l\'**impératif** (« fais ! »)', 'dire « **ne fais pas !** » avec لَا + apocopé'],
    sections: [
      { t: 'L\'impératif vient du présent', md: 'On part du présent à la 2e personne, on **enlève le préfixe**, et on met la fin à l\'apocopé :\n\nتَقْرَأُ (tu lis) → قْرَأْ → on ne peut pas commencer par un soukoun, alors on ajoute un **alif** : **ٱقْرَأْ** (iqraʾ) = lis !\n\nSi la 2e lettre a une voyelle, pas besoin d\'alif : تُسَبِّحُ → **سَبِّحْ** (glorifie !), تَقُولُ → **قُلْ** (dis !).',
        ex: [{ r: '96:1', w: [1], n: 'ٱقْرَأْ : « Lis ! », le premier mot révélé.' }, { r: '112:1', w: [1], n: 'قُلْ : « Dis ! » (de يَقُولُ, la voyelle longue tombe).' }, { r: '108:2', w: [1, 3], n: 'فَصَلِّ … وَٱنْحَرْ : « prie … et sacrifie ! ».' }, { r: '110:3', w: [1, 4], n: 'فَسَبِّحْ … وَٱسْتَغْفِرْهُ : « glorifie … et demande-Lui pardon ! » (avec le pronom ـهُ).' }] },
      { t: 'Au féminin et au pluriel', md: 'À une femme : ـِي (ٱرْجِعِي = reviens ! 89:28, adressé à l\'âme). À plusieurs : ـُوا (ٱعْبُدُوا = adorez !).',
        ex: [{ r: '89:28', w: [1], n: 'ٱرْجِعِىٓ : « reviens ! » (féminin, à l\'âme).' }] },
      { t: '« Ne fais pas ! »', md: 'L\'impératif ne se nie pas. Pour interdire, on dit **لَا + présent à l\'apocopé** : لَا تَقْهَرْ = « n\'opprime pas ! ».',
        ex: [{ r: '93:9', w: [3, 4], n: 'فَلَا تَقْهَرْ : « ne l\'opprime pas ! » (soukoun final).' }, { r: '93:10', w: [3, 4], n: 'فَلَا تَنْهَرْ : « ne le repousse pas ! ».' }] },
    ],
    keep: ['Impératif = présent sans préfixe + fin apocopée ; on ajoute ٱ si le mot commencerait par un soukoun.', 'Féminin ـِي, pluriel ـُوا.', 'Interdiction : **لَا + apocopé** (لَا تَفْعَلْ = ne fais pas !).'],
    practice: [
      { k: 'find', r: '108:2', q: 'Clique sur un verbe à l\'**impératif**.', test: i => i.f.aspect === 'IMPV', why: 'فَصَلِّ (prie) et وَٱنْحَرْ (sacrifie) sont des impératifs.' },
      { k: 'find', r: '93:9', q: 'Clique sur le verbe d\'**interdiction**.', test: i => i.f.mood === 'JUS', why: 'تَقْهَرْ (apocopé) après لَا : « n\'opprime pas ! ».' },
      { k: 'mcq', q: 'De تَكْتُبُ (tu écris), l\'impératif est…', o: ['ٱكْتُبْ', 'كْتُبُ', 'تَكْتُبْ', 'كَتَبَ'], a: 0, why: 'On enlève تَـ → كْتُبْ ; impossible de commencer par un soukoun → **ٱكْتُبْ**.' },
      { k: 'mcq', q: 'Que veut dire لَا تَقُلْ ?', o: ['ne dis pas !', 'il ne dit pas', 'dis !', 'tu n\'as pas dit'], a: 0, why: 'لَا + apocopé à la 2e personne = **interdiction**.' },
    ],
  },
  {
    id: 'inna', title: 'Inna et kāna : les mots qui changent les cas', ar: 'إِنَّ وَكَانَ', min: 35,
    goal: ['savoir ce que fait **إِنَّ** (et ses sœurs) : sujet à l\'**accusatif**', 'savoir ce que fait **كَانَ** (et ses sœurs) : attribut à l\'**accusatif**', 'ne plus les confondre'],
    sections: [
      { t: 'إِنَّ : « certes »', md: 'إِنَّ se place devant une phrase nominale pour **insister** (« certes, vraiment »). Elle met le **sujet à l\'accusatif** et laisse l\'**attribut au nominatif**.\n\nٱلْإِنْسَانُ فِي خُسْرٍ (l\'homme est en perdition) → إِنَّ ٱلْإِنْسَانَ لَفِي خُسْرٍ (sujet à l\'accusatif).\n\nSes « sœurs » font pareil : **أَنَّ** (que), **لَكِنَّ** (mais), **كَأَنَّ** (comme si), **لَعَلَّ** (peut-être), **لَيْتَ** (si seulement). Et **لَا de négation absolue** (لَا رَيْبَ = aucun doute).',
        ex: [{ r: '103:2', w: [1, 2, 3, 4], n: 'إِنَّ ٱلْإِنسَٰنَ (accusatif !) لَفِى خُسْرٍ (attribut). Le لَـ ajoute encore de l\'insistance.' }, { r: '108:3', w: [1, 2, 4], n: 'إِنَّ شَانِئَكَ … ٱلْأَبْتَرُ : sujet à l\'accusatif (-a), attribut au nominatif (-u).' }, { r: '108:1', w: [1], n: 'إِنَّآ = إِنَّ + نَا (nous) : le pronom collé est le sujet de inna.' }] },
      { t: 'كَانَ : « il était »', md: 'كَانَ (être, au passé) fait **l\'inverse** : le **sujet reste au nominatif**, et c\'est l\'**attribut qui passe à l\'accusatif**.\n\nٱللَّهُ تَوَّابٌ → كَانَ ٱللَّهُ تَوَّابًا (attribut à l\'accusatif) = Allah était (est toujours) Accueillant au repentir.\n\nSes sœurs : **لَيْسَ** (ne pas être), **أَصْبَحَ** (devenir), **صَارَ** (devenir), **ظَلَّ** (rester).',
        ex: [{ r: '110:3', w: [5, 6, 7], n: 'إِنَّهُۥ كَانَ تَوَّابًۢا : les deux à la fois ! ـهُ est le sujet de inna, et كَانَ تَوَّابًا (attribut à l\'accusatif) est son attribut.' }, { r: '112:4', w: [2, 4, 5], n: 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ : يَكُنْ (= كَانَ à l\'apocopé après لَمْ), كُفُوًا attribut (-an), أَحَدٌ sujet (-un). Mot à mot : « et n\'est pas égal à Lui quiconque ».' }] },
      { t: 'Le moyen mnémotechnique', md: '**inna → le nom** (le 1er) à l\'accusatif. **kāna → le khabar** (le 2e) à l\'accusatif. Les deux mettent un -a, mais pas sur le même mot.', irab: '103:2' },
    ],
    keep: ['**إِنَّ** + sujet à l\'**accusatif** + attribut au nominatif.', '**كَانَ** + sujet au nominatif + attribut à l\'**accusatif**.', 'Sœurs de inna : أَنَّ لَكِنَّ كَأَنَّ لَعَلَّ لَيْتَ ; sœurs de kāna : لَيْسَ أَصْبَحَ صَارَ ظَلَّ.'],
    practice: [
      { k: 'find', r: '103:2', q: 'Clique sur le **nom de inna** (le sujet passé à l\'accusatif).', test: i => i.r.key === 'ismInna', why: 'ٱلْإِنسَٰنَ a un -a à cause de إِنَّ.' },
      { k: 'find', r: '110:3', q: 'Clique sur l\'**attribut de kāna**.', test: i => i.r.key === 'khabarKana', why: 'تَوَّابًا (-an) est l\'attribut de كَانَ, à l\'accusatif.' },
      { k: 'mcq', q: 'Complète : إِنَّ ٱللَّهَ …', o: ['غَفُورٌ', 'غَفُورًا', 'غَفُورٍ'], a: 0, why: 'Après إِنَّ, l\'**attribut reste au nominatif** : غَفُورٌ.' },
      { k: 'mcq', q: 'Complète : كَانَ ٱللَّهُ …', o: ['غَفُورًا', 'غَفُورٌ', 'غَفُورٍ'], a: 0, why: 'Avec كَانَ, l\'**attribut passe à l\'accusatif** : غَفُورًا.' },
      { k: 'mcq', q: 'Que fait لَا dans لَا رَيْبَ فِيهِ (aucun doute en lui) ?', o: ['elle agit comme إِنَّ : nom à l\'accusatif sans tanwīn', 'elle met le verbe à l\'apocopé', 'elle n\'a aucun effet'], a: 0, why: 'C\'est le **لَا de négation absolue** : رَيْبَ à l\'accusatif, sans tanwīn.' },
      { k: 'gen', type: 'role' },
    ],
  },
  {
    id: 'irab', title: 'Lire un verset entier comme un grammairien', ar: 'الإِعْرَاب', min: 40,
    goal: ['enchaîner tout ce que tu as appris sur un **verset complet**', 'utiliser le schéma **🧩 Analyse de la phrase**', 'savoir dire pour chaque mot : son rôle, son cas, sa marque'],
    sections: [
      { t: 'La méthode en 4 questions', md: 'Pour chaque mot, les grammairiens arabes (l\'iʿrāb) répondent à quatre questions :\n\n1. **Nom, verbe ou particule ?** (couleur dans l\'atelier : bleu / rouge / gris)\n2. **Quel rôle ?** sujet, attribut, complément, après préposition, complément du nom, adjectif…\n3. **Quel cas ou quel mode ?** -u, -a, -i, ـْ\n4. **Quelle marque ?** la voyelle finale, ou ـونَ / ـينَ, ou une marque « estimée » quand la voyelle ne se voit pas (عَلَى هُدًى).\n\nExemple : « ٱلْحَمْدُ : mubtadaʾ (sujet), au nominatif, marque : la ḍamma ».' },
      { t: 'La Fātiḥa, verset 2', md: 'Lis le schéma de droite à gauche, puis la liste mot par mot.', irab: '1:2' },
      { t: 'La Fātiḥa, verset 5', md: 'Ici, le complément passe devant le verbe.', irab: '1:5' },
      { t: 'Sourate Al-Kawthar, verset 1', md: 'inna + un verbe avec deux compléments.', irab: '108:1' },
      { t: 'À toi', md: 'Ouvre une sourate de ton cours dans l\'onglet **Coran**, et pour chaque verset : essaie de dire le rôle de chaque mot **avant** d\'appuyer sur 🧩. Dans une note, tu peux aussi écrire un bloc :\n\n```irab\n1:2\n```\n\npour y afficher l\'analyse d\'un verset.' },
    ],
    keep: ['4 questions : nature, rôle, cas/mode, marque.', 'Le schéma relie chaque mot à celui dont il dépend.', 'Les rôles « probables » sont à vérifier : l\'atelier les déduit de la forme des mots.'],
    practice: [
      { k: 'find', r: '1:2', q: 'Clique sur le mot qui est **complément du nom** de رَبِّ.', test: i => i.r.key === 'mudafIlayh' && i.wi === 3, why: 'ٱلْعَٰلَمِينَ complète رَبِّ : « Seigneur **de** l\'univers ».' },
      { k: 'mcq', q: 'Dans ٱلْحَمْدُ لِلَّهِ, quel est l\'attribut ?', o: ['لِلَّهِ (préposition + nom)', 'ٱلْحَمْدُ', 'il n\'y en a pas'], a: 0, why: 'ٱلْحَمْدُ est le sujet ; لِلَّهِ (« à Allah ») est ce qu\'on dit de lui.' },
      { k: 'mcq', q: 'Pourquoi ٱلْعَٰلَمِينَ finit-il par ـِينَ et pas par -i ?', o: ['c\'est un pluriel masculin : au génitif il prend ـِينَ', 'c\'est un verbe', 'c\'est une erreur'], a: 0, why: 'Le pluriel masculin sain a ـُونَ au nominatif et **ـِينَ** à l\'accusatif et au génitif.' },
      { k: 'gen', type: 'role' }, { k: 'gen', type: 'role' }, { k: 'gen', type: 'case' },
    ],
  },
];
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
/* ====================================================================
 * 07 - Le plugin Obsidian : vue, commandes, blocs de code, réglages
 * ==================================================================== */
const VIEW_TYPE = 'atelier-arabe-view';
const DEFAULT_SETTINGS = {
  style: 'sci', showTr: true, showFr: true, showRu: true, arSize: 30, openLetters: false,
  flashFile: '5 - Flashcards/Atelier - mes phrases.md', lastSurah: 1,
  audio: true, ruExpl: false, vocabFile: '4 - Références/Vocabulaire.md', textsFolder: '3 - Textes',
  myWords: {}, progress: null, lessons: {},
};
function emptyProgress() { return { byType: { case: { ok: 0, n: 0 }, mood: { ok: 0, n: 0 }, sens: { ok: 0, n: 0 }, phrase: { ok: 0, n: 0 } }, lem: {} }; }
const TABS = [
  ['coran', 'Coran', 'Lire une sourate mot par mot'], ['lessons', 'Leçons', 'Parcours de grammaire guidé'], ['dict', 'Dictionnaire', 'Tous les mots du Coran'], ['analyse', 'Analyser', 'Analyser un texte arabe'],
  ['build', 'Construire', 'Construire une phrase'], ['signs', 'Signes', 'Laboratoire des signes'], ['quiz', 'Entraînement', 'S\'entraîner'],
];

class AtelierView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = 'coran';
    this.states = { coran: { surah: plugin.settings.lastSurah || 1, page: 0 }, dict: {}, lessons: {}, analyse: {}, build: {}, signs: {}, quiz: {} };
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Atelier arabe'; }
  getIcon() { return 'languages'; }
  async onOpen() {
    const root = this.contentEl;
    clear(root); root.classList.add('aa-root');
    this.nav = h(root, 'div', 'aa-tabs');
    this.body = h(root, 'div', 'aa-body');
    h(this.body, 'p', 'aa-muted', 'Chargement du Coran…');
    try { const msg = this.body.firstChild; await this.plugin.data.init((d, n) => { msg.textContent = 'Premier lancement : téléchargement du Coran… ' + d + ' / ' + n; }); } catch (e) {
      clear(this.body); h(this.body, 'p', 'aa-warn', 'Impossible de lire les données du plugin (dossier data). Vérifie que le dossier .obsidian/plugins/atelier-arabe/data est complet. Détail : ' + e.message);
      return;
    }
    this.render();
  }
  async onClose() { clear(this.contentEl); }
  setTab(tab, opts) {
    this.tab = tab;
    if (opts) Object.assign(this.states[tab], opts);
    if (this.body && this.plugin.data.surahs) this.render();
  }
  render() {
    clear(this.nav);
    TABS.forEach(([id, label, title]) => {
      const b = h(this.nav, 'button', 'aa-tab' + (this.tab === id ? ' aa-on' : ''), label);
      b.title = title;
      b.addEventListener('click', () => this.setTab(id));
    });
    const ctx = this.plugin.ctx(this);
    const st = this.states[this.tab];
    clear(this.body);
    if (this.tab === 'coran') renderQuranTab(ctx, this.body, st);
    else if (this.tab === 'dict') renderDictTab(ctx, this.body, st);
    else if (this.tab === 'lessons') renderLessonsTab(ctx, this.body, st);
    else if (this.tab === 'analyse') renderAnalyseTab(ctx, this.body, st);
    else if (this.tab === 'build') renderBuildTab(ctx, this.body, st);
    else if (this.tab === 'signs') renderSignsTab(ctx, this.body, st);
    else renderQuizTab(ctx, this.body, st);
  }
}

class AtelierSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const el = this.containerEl; clear(el);
    h(el, 'h2', null, 'Atelier arabe');
    h(el, 'p', null, 'Toutes les données (Coran, traductions, analyse grammaticale) sont dans le dossier du plugin : rien n\'est envoyé sur internet.');
    const p = this.plugin; const s = p.settings;
    new Setting(el).setName('Translittération').setDesc('Savante (ā, ū, sh, j) ou « à la française » (ou, ch, dj).')
      .addDropdown(d => d.addOption('sci', 'savante : al-ḥamdu, shukr').addOption('fr', 'à la française : al-ḥamdou, choukr').setValue(s.style).onChange(async v => { s.style = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la translittération').addToggle(t => t.setValue(s.showTr).onChange(async v => { s.showTr = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la traduction française').setDesc('Traduction de Muhammad Hamidullah.').addToggle(t => t.setValue(s.showFr).onChange(async v => { s.showFr = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la traduction russe').setDesc('Traduction d\'Elmir Kuliev (Кулиев).').addToggle(t => t.setValue(s.showRu).onChange(async v => { s.showRu = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille du texte arabe').setDesc('En pixels (30 par défaut).')
      .addSlider(sl => sl.setLimits(20, 48, 2).setValue(s.arSize).setDynamicTooltip().onChange(async v => { s.arSize = v; await p.saveSettings(); }));
    new Setting(el).setName('Explications aussi en russe').setDesc('Ajoute la version russe sous chaque explication de cas et de mode, et le sens russe des mots.')
      .addToggle(t => t.setValue(s.ruExpl).onChange(async v => { s.ruExpl = v; EXPL_RU = v; await p.saveSettings(); }));
    new Setting(el).setName('Son en ligne').setDesc('Récitation (Mishary Alafasy) et prononciation des mots depuis internet, seulement quand tu appuies sur ▶ ou 🔊. Désactivé : voix de l\'appareil uniquement.')
      .addToggle(t => t.setValue(s.audio).onChange(async v => { s.audio = v; await p.saveSettings(); }));
    new Setting(el).setName('Note de vocabulaire').setDesc('Le bouton « Ajouter à mon vocabulaire » ajoute une ligne au tableau de cette note.')
      .addText(t => t.setValue(s.vocabFile).onChange(async v => { s.vocabFile = v.trim() || DEFAULT_SETTINGS.vocabFile; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des textes du cours').setDesc('Les sourates qui ont une note dans ce dossier apparaissent dans « Mon cours ».')
      .addText(t => t.setValue(s.textsFolder).onChange(async v => { s.textsFolder = v.trim() || DEFAULT_SETTINGS.textsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Ouvrir « lettre par lettre » automatiquement').addToggle(t => t.setValue(s.openLetters).onChange(async v => { s.openLetters = v; await p.saveSettings(); }));
    new Setting(el).setName('Fichier des flashcards').setDesc('Note où l\'atelier ajoute tes cartes (format Spaced Repetition « question :: réponse »).')
      .addText(t => t.setValue(s.flashFile).onChange(async v => { s.flashFile = v.trim() || DEFAULT_SETTINGS.flashFile; await p.saveSettings(); }));
  }
}

class AtelierArabePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.progress) this.settings.progress = emptyProgress();
    if (!this.settings.myWords) this.settings.myWords = {};
    if (!this.settings.lessons) this.settings.lessons = {};
    EXPL_RU = !!this.settings.ruExpl;
    this.data = new QuranData(this.app, this.manifest.dir);
    notify = (m) => new Notice(m);
    this.registerView(VIEW_TYPE, leaf => new AtelierView(leaf, this));
    this.addRibbonIcon('languages', 'Atelier arabe', () => this.openView());
    this.addCommand({ id: 'ouvrir', name: 'Ouvrir l\'atelier', callback: () => this.openView() });
    this.addCommand({ id: 'lecons', name: 'Leçons de grammaire', callback: () => this.openView('lessons') });
    this.addCommand({ id: 'dictionnaire', name: 'Dictionnaire', callback: () => this.openView('dict') });
    this.addCommand({ id: 'construire', name: 'Construire une phrase', callback: () => this.openView('build') });
    this.addCommand({ id: 'signes', name: 'Laboratoire des signes', callback: () => this.openView('signs') });
    this.addCommand({ id: 'entrainement', name: 'Entraînement', callback: () => this.openView('quiz') });
    this.addCommand({
      id: 'analyser-selection', name: 'Analyser le texte sélectionné',
      editorCallback: (editor) => { const t = editor.getSelection(); if (!t || !hasArabic(t)) { new Notice('Sélectionne d\'abord un texte arabe.'); return; } this.openView('analyse', { text: t }); },
    });
    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
      const t = editor.getSelection();
      if (t && hasArabic(t)) menu.addItem(i => i.setTitle('Analyser avec l\'atelier arabe').setIcon('languages').onClick(() => this.openView('analyse', { text: t })));
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => { if (leaf && leaf.view instanceof MarkdownView) this.lastMd = leaf; }));

    this.registerMarkdownCodeBlockProcessor('coran', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try {
        await this.data.init();
        const refs = parseRefs(src);
        if (!refs.length) { h(el, 'p', 'aa-warn', 'Écris une référence, par exemple : 1:1-7, 112 ou 2:255'); return; }
        for (const r of refs) await renderVerses(this.ctx(null), h(el, 'div'), r.s, r.from, r.to, { title: true, basmala: r.from === 1 && !r.to });
      } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.registerMarkdownCodeBlockProcessor('irab', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try {
        await this.data.init();
        const refs = parseRefs(src);
        if (!refs.length) { h(el, 'p', 'aa-warn', 'Écris un verset, par exemple : 1:2'); return; }
        for (const r of refs) for (let v = r.from; v <= (r.to || r.from); v++) {
          const d = await this.data.surah(r.s); const vv = d.v[v - 1]; if (!vv) continue;
          const box = h(el, 'div', 'aa-verse');
          const line = h(box, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); arSpan(line, vv[2].map(wordText).join(' ') + ' ﴿' + arNum(v) + '﴾');
          h(box, 'div', 'aa-verse-fr', r.s + ':' + v + ' ' + vv[0]);
          renderIrab(this.ctx(null), h(box, 'div', 'aa-struct'), vv[2], [r.s, v]);
        }
      } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.registerMarkdownCodeBlockProcessor('analyse-arabe', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try { await this.data.init(); await analyseInto(this.ctx(null), h(el, 'div'), src); } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.addSettingTab(new AtelierSettingTab(this.app, this));
  }
  onunload() { /* Obsidian ferme la vue tout seul */ }
  async saveSettings() {
    await this.saveData(this.settings);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view && l.view.render && l.view.plugin.data.surahs && l.view.render());
  }
  ctx(view) {
    const self = this;
    return {
      data: this.data, settings: this.settings,
      save: () => this.saveData(this.settings),
      insertText: (t) => this.insertText(t),
      addFlashcard: (q, a) => this.addFlashcard(q, a),
      openQuran: (s, v) => this.openView('coran', { surah: s, page: 0, focus: v }),
      openDict: (id) => this.openView('dict', { entry: id, mode: 'search' }),
      openNote: (file) => this.app.workspace.getLeaf(false).openFile(file),
      openPath: (path) => { const f = this.app.vault.getAbstractFileByPath(path); if (f) this.app.workspace.getLeaf(false).openFile(f); else new Notice('Note introuvable : ' + path); },
      isMine: (id) => !!this.settings.myWords[id],
      myWordIds: () => Object.keys(this.settings.myWords).map(Number),
      addVocab: (id, ar, tr, gloss, where) => this.addVocab(id, ar, tr, gloss, where),
      courseSurahs: () => this.courseSurahs(),
      record: (id, good, type) => {
        const P = this.settings.progress; const t = P.byType[type] || (P.byType[type] = { ok: 0, n: 0 });
        t.n++; if (good) t.ok++;
        if (id >= 0) { const x = P.lem[id] || (P.lem[id] = { ok: 0, ko: 0 }); if (good) x.ok++; else x.ko++; }
        this.saveData(this.settings);
      },
      reviewList: () => Object.entries(this.settings.progress.lem).filter(([, x]) => x.ko > x.ok).map(([id, x]) => ({ id: +id, ok: x.ok, ko: x.ko })).sort((a, b) => (b.ko - b.ok) - (a.ko - a.ok)),
      resetProgress: () => { this.settings.progress = emptyProgress(); this.saveData(this.settings); },
      currentSurah: () => { const l = self.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; return l && l.view.states ? l.view.states.coran.surah : 1; },
    };
  }
  async openView(tab, opts) {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = ws.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    ws.revealLeaf(leaf);
    if (opts && opts.surah) { this.settings.lastSurah = opts.surah; this.saveData(this.settings); }
    if (tab && leaf.view && leaf.view.setTab) leaf.view.setTab(tab, opts);
  }
  courseSurahs() {
    if (!this.data.surahs) return [];
    const norm = x => stripLat(x).replace(/[^a-z]/g, '');
    const names = this.data.surahs.map(s => norm(s[1]));
    const out = []; const seen = new Set();
    const folder = this.settings.textsFolder.replace(/\/$/, '') + '/';
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(folder)) continue;
      const b = norm(f.basename.replace(/^sourate\s*/i, '').replace(/\s+-\s.*$/, ''));
      const i = names.findIndex(n => n && (n === b || (b.length > 4 && n.startsWith(b))));
      if (i >= 0 && !seen.has(i)) { seen.add(i); out.push({ n: i + 1, label: this.data.surahs[i][1], file: f }); }
    }
    return out.sort((a, b) => a.n - b.n);
  }
  async addVocab(id, ar, tr, gloss, where) {
    const path = this.settings.vocabFile;
    const f = this.app.vault.getAbstractFileByPath(path);
    this.settings.myWords[id] = Date.now(); await this.saveData(this.settings);
    if (!f) { new Notice('Mot gardé dans « Mon vocabulaire » de l\'atelier (la note ' + path + ' est introuvable).'); return; }
    const content = await this.app.vault.read(f);
    if (content.includes('| ' + ar + ' |')) { new Notice('Ce mot est déjà dans ta note de vocabulaire.'); return; }
    const row = '| ' + ar + ' | ' + tr + ' | ' + (gloss || '').replace(/\|/g, '/') + ' | Atelier' + (where ? ' (' + where + ')' : '') + ' |\n';
    await this.app.vault.modify(f, content.replace(/\n*$/, '\n') + row);
    new Notice('Ajouté à « ' + f.basename + ' »');
  }
  insertText(t) {
    let leaf = this.lastMd;
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    const view = active || (leaf && leaf.view instanceof MarkdownView ? leaf.view : null) || (this.app.workspace.getLeavesOfType('markdown')[0] || {}).view;
    if (!view || !view.editor) { new Notice('Ouvre d\'abord une note (en mode édition) pour y insérer le texte.'); return; }
    view.editor.replaceSelection(t);
    new Notice('Ajouté dans « ' + (view.file ? view.file.basename : 'la note') + ' »');
  }
  async addFlashcard(q, a) {
    const path = this.settings.flashFile;
    const line = q.replace(/::/g, ':').replace(/\n/g, ' ') + ' :: ' + a.replace(/::/g, ':').replace(/\n/g, ' ') + '\n';
    let f = this.app.vault.getAbstractFileByPath(path);
    try {
      if (!f) {
        const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        f = await this.app.vault.create(path, '# Atelier arabe – mes cartes\n\nCartes créées depuis l\'atelier arabe (plugin). Révision avec Spaced Repetition.\n\n#flashcards/arabe/phrases\n\n' + line);
      } else await this.app.vault.append(f, line);
      new Notice('Flashcard ajoutée dans « ' + path + ' »');
    } catch (e) { new Notice('Impossible d\'ajouter la flashcard : ' + e.message); }
  }
}
module.exports = AtelierArabePlugin;
