'use strict';
/* Atelier arabe — plugin Obsidian (généré, ne pas modifier à la main) */
const { Plugin, ItemView, Notice, PluginSettingTab, Setting, MarkdownView, requestUrl, setIcon } = require('obsidian');
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
  '1S': ['je', ''], '1P': ['nous', ''], '2MS': ['tu (homme)', ''], '2FS': ['tu (femme)', ''],
  '2MP': ['vous (hommes)', ''], '2FP': ['vous (femmes)', ''], '2D': ['vous deux', ''], '2MD': ['vous deux', ''], '2FD': ['vous deux (f.)', ''],
  '3MS': ['il', ''], '3FS': ['elle', ''], '3MP': ['ils', ''], '3FP': ['elles', ''], '3D': ['eux deux', ''], '3MD': ['eux deux', ''], '3FD': ['elles deux', ''],
};
const PRON_SUFFIX_FR = { '1S': 'moi / mon, ma', '1P': 'nous / notre', '2MS': 'toi / ton, ta', '2FS': 'toi (f.) / ton, ta', '2MP': 'vous / votre', '2FP': 'vous (f.) / votre', '2D': 'vous deux', '3MS': 'lui, le / son, sa', '3FS': 'elle, la / son, sa', '3MP': 'eux, les / leur', '3FP': 'elles, les / leur', '3D': 'eux deux / leur', '3MD': 'eux deux', '3FD': 'elles deux' };
const GN = { M: 'masculin', F: 'féminin', MS: 'masculin singulier', FS: 'féminin singulier', MP: 'masculin pluriel', FP: 'féminin pluriel', MD: 'masculin duel', FD: 'féminin duel', P: 'pluriel', D: 'duel', S: 'singulier' };
const CASES = {
  NOM: { ar: 'مَرْفُوع', tr: 'marfūʿ (rafʿ)', fr: 'nominatif', sign: 'ـُ / ـٌ (-u / -un)', color: 'nom' },
  ACC: { ar: 'مَنْصُوب', tr: 'manṣūb (naṣb)', fr: 'accusatif', sign: 'ـَ / ـً (-a / -an)', color: 'acc' },
  GEN: { ar: 'مَجْرُور', tr: 'majrūr (jarr)', fr: 'génitif', sign: 'ـِ / ـٍ (-i / -in)', color: 'gen' },
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
      res.why.push(R('Le passé arabe ne change pas selon les cas : sa fin indique la personne (ـَ il, ـَتْ elle, ـْتُ je, ـْتَ tu, ـْنَا nous, ـُوا ils…).'));
    } else if (f.aspect === 'IMPV') {
      res.why.push(R('L\'impératif se forme sur l\'apocopé : il finit par un soukoun (ou perd sa dernière voyelle longue) — « fais ! ».'));
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
      res.facts.push(['Cas', c.fr + ' — ' + c.tr + ' ' + c.ar]);
      res.why.push(caseReason(f, word, st, prev, prev2, prepBefore, prepName));
      const lastU = units(st.seg[0]).filter(u => u.b).pop();
      if (f.cas === 'GEN' && lastU && lastU.m.includes(AR.FATHA) && !/(ين|ات)$/.test(skeleton(st.seg[0]))) res.why.push(R('Il finit par -a alors qu\'il est au génitif : c\'est un **diptote** (nom propre étranger, schème أَفْعَل, certains pluriels…). Les diptotes n\'ont jamais de tanwīn et font leur génitif en -a.'));
      if (/^(MP)$/.test(f.gn) && /ونَ?$|ونَ$/.test(st.seg[0])) res.why.push('Pluriel masculin « sain » : au nominatif il finit par ـُونَ (-ūna) au lieu de -u.');
      if (/^(MP)$/.test(f.gn) && /ينَ?$/.test(st.seg[0])) res.why.push('Pluriel masculin « sain » : à l\'accusatif et au génitif il finit par ـِينَ (-īna) au lieu de -a / -i.');
      if (/^(FP)$/.test(f.gn) && /ٰتِ|اتِ|ٰتٍ|اتٍ/.test(st.seg[0]) && f.cas === 'ACC') res.why.push('Pluriel féminin « sain » (ـَات) : son accusatif se fait en -i, comme le génitif !');
      res.tags.push(f.cas);
    } else if (['PRON', 'DEM', 'REL'].includes(sub)) {
      res.why.push(R('Ce mot est **invariable** (mabnī) : sa fin ne change jamais, quelle que soit sa fonction.'));
    }
  } else {
    res.title = 'Particule';
    if (f.sub && PARTICLES[f.sub]) res.facts.push(['Rôle', PARTICLES[f.sub]]);
    if (f.fam === 'إِنّ' && /^لَا$/.test(st.seg[0])) res.why.push('لَا de **négation absolue** (« il n\'y a aucun … ») : elle fonctionne comme إِنَّ, le nom qui suit passe à l\'**accusatif sans tanwīn** (لَا رَيْبَ = aucun doute).');
    else if (f.fam === 'إِنّ') res.why.push('« إِنَّ et ses sœurs » (إِنَّ، أَنَّ، كَأَنَّ، لَكِنَّ، لَيْتَ، لَعَلَّ) : le nom qui suit passe à l\'**accusatif** (-a).');
    if (f.fam === 'كَان') res.why.push('Cette négation fonctionne comme لَيْسَ : l\'attribut passe à l\'accusatif.');
    res.why.push(R('Les particules sont **invariables** : leur dernière voyelle ne change pas avec la fonction (sauf liaison, comme مِنْ → مِنَ devant ال).'));
  }
  return res;
}
function lastSegF(word) { const s = stemOf(word); return s.f; }
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

/* texte d'explication (le plugin est en français uniquement) */
function R(fr) { return fr; }

function caseReason(f, word, st, prev, prev2, prepBefore, prepSeg) {
  const pf = prev ? stemOf(prev).f : null;
  const ps = prev ? stemOf(prev).seg[0] : '';
  if (f.cas === 'GEN') {
    if (prepBefore) return R('Génitif **parce qu\'il suit une préposition** (' + (prepSeg ? prepSeg[0] : '') + ') : en arabe, toute préposition met le nom suivant au génitif.');
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un génitif).');
    if (pf && pf.pos === 'N' && pf.cas === 'GEN' && (pf.sub === 'PN' || prev.some(s => parseFeats(s[1], s[2]).tags[0] === 'DET'))) return R('Génitif **parce qu\'il suit un mot défini au génitif** qu\'il précise ou explique (adjectif ou apposition, naʿt / badal) : il en copie le cas.');
    if (pf && pf.pos === 'N' && !pf.indef) return R('Génitif **parce qu\'il est le 2e terme d\'une annexion** (iḍāfa) : « le … **de** ce mot ».');
    return R('Génitif : soit 2e terme d\'une annexion (« … de … »), soit adjectif ou mot coordonné à un génitif.');
  }
  if (f.cas === 'ACC') {
    if (pf && pf.fam === 'إِنّ' && /^لَا$/.test(ps)) return R('Accusatif **parce qu\'il suit لَا de négation absolue** (lā nāfiya li-l-jins, « il n\'y a aucun … ») : elle agit comme إِنَّ, et le nom reste sans tanwīn.');
    if (pf && pf.fam === 'إِنّ') return R('Accusatif **parce qu\'il vient après ' + ps + '** (« إِنَّ et ses sœurs ») : c\'est le nom de inna, il passe à -a.');
    if (pf && (pf.fam === 'كَان' || (pf.pos === 'V' && /^(كَان|لَيْس|أَصْبَح|ظَلّ)/.test(pf.lem || '')))) return R('Accusatif : probablement l\'**attribut de كَانَ / لَيْسَ** (ou d\'une de leurs « sœurs »).');
    if (f.sub === 'T' || f.sub === 'LOC') return R('Accusatif car c\'est un **complément de temps ou de lieu** (ẓarf) : « le jour où…, devant… ».');
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un accusatif).');
    if (pf && pf.pos === 'P' && pf.sub === 'RES') return R('Accusatif après إِلَّا : c\'est ce qui est **excepté** (« sauf … »).');
    if (pf && pf.pos === 'V') return R('');
    if (prev2 && stemOf(prev2).f.pos === 'V') return R('Accusatif : probablement le **complément d\'objet** du verbe un peu avant (« qui ? quoi ? »).');
    return R('Accusatif (naṣb) : complément d\'objet, de temps, de manière ou d\'état, ou nom de إِنَّ… La terminaison -a / -an le signale.');
  }
  if (f.cas === 'NOM') {
    if (f.sub === 'ADJ') return R('C\'est un **adjectif** : il copie le cas du nom qu\'il qualifie (ici un nominatif).');
    if (pf && pf.pos === 'V' && pf.pass) return R('Nominatif : c\'est le **sujet du verbe passif** (ce qui subit l\'action).');
    if (pf && pf.pos === 'V') return R('');
    if (pf && pf.fam === 'إِنّ') return R('Nominatif après إِنَّ… : c\'est l\'**attribut** (khabar) de inna, qui reste au nominatif.');
    if (!prev) return R('Nominatif : il ouvre la phrase, c\'est probablement le **sujet d\'une phrase nominale** (mubtadaʾ) — une phrase sans verbe « être ».');
    return R('Nominatif (rafʿ) : sujet ou attribut d\'une phrase nominale, ou sujet d\'un verbe.');
  }
  return '';
}

function moodReason(mood, word, prev, prev2) {
  const near = [prev, prev2].filter(Boolean).map(w => stemOf(w));
  const inWord = word.filter(s => parseFeats(s[1], s[2]).pref).map(s => parseFeats(s[1], s[2]));
  const md = MOODS[mood];
  if (mood === 'IND') return R('Finale -u : **indicatif**, ' + md.why);
  if (mood === 'SUBJ') {
    if (inWord.some(x => x.tags[0] === 'PRP' || x.tags[0] === 'CAUS')) return R('Finale -a : **subjonctif**, à cause du لِ / فَ « pour que » collé devant.');
    const t = near.find(n => n.f.pos === 'P' && ['SUB', 'NEG', 'P'].includes(n.f.sub));
    if (t) return R('Finale -a (ou ـوا au lieu de ـونَ) : **subjonctif**, à cause de ' + t.seg[0] + ' juste avant.');
    return R('Finale -a : **subjonctif** ; ' + md.why);
  }
  if (mood === 'JUS') {
    if (inWord.some(x => x.tags[0] === 'IMPV')) return R('Soukoun final : **apocopé**, à cause du لِ d\'ordre collé devant (« qu\'il… ! »).');
    const t = near.find(n => n.f.pos === 'P' && ['NEG', 'PRO', 'COND'].includes(n.f.sub));
    if (t) return R('Soukoun final (ou ـوا au lieu de ـونَ) : **apocopé**, à cause de ' + t.seg[0] + ' juste avant.');
    return R('Soukoun final : **apocopé** — souvent la réponse à un ordre ou à une condition (« fais…, tu obtiendras »).');
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

/* clé : [nom français, terme arabe, translittération, (vide), étiquette courte du lien] */
const IRAB_ROLES = {
  mubtada: ['sujet de la phrase nominale', 'مُبْتَدَأ', 'mubtadaʾ', '', 'sujet'],
  khabar: ['attribut : ce qu\'on dit du sujet', 'خَبَر', 'khabar', '', 'attribut'],
  khabarMuq: ['attribut placé en tête', 'خَبَر مُقَدَّم', 'khabar muqaddam', '', 'attribut'],
  mubtadaMuakh: ['sujet placé après l\'attribut', 'مُبْتَدَأ مُؤَخَّر', 'mubtadaʾ muʾakhkhar', '', 'sujet'],
  fail: ['sujet du verbe', 'فَاعِل', 'fāʿil', '', 'sujet'],
  naib: ['sujet du verbe passif', 'نَائِب فَاعِل', 'nāʾib fāʿil', '', 'sujet'],
  maful: ['complément d\'objet direct', 'مَفْعُول بِهِ', 'mafʿūl bihi', '', 'COD'],
  mutlaq: ['complément absolu (renforce le verbe)', 'مَفْعُول مُطْلَق', 'mafʿūl muṭlaq', '', 'renfort'],
  hal: ['complément d\'état (« comment ? »)', 'حَال', 'ḥāl', '', 'état'],
  zarf: ['complément de temps ou de lieu', 'ظَرْف', 'ẓarf', '', 'quand/où'],
  majrur: ['nom au génitif après une préposition', 'اِسْم مَجْرُور', 'majrūr', '', 'après prép.'],
  mudafIlayh: ['complément du nom (« … de … »)', 'مُضَاف إِلَيْه', 'muḍāf ilayh', '', 'de'],
  nat: ['adjectif : il qualifie le nom', 'نَعْت', 'naʿt', '', 'adjectif'],
  badal: ['apposition : il précise le mot d\'avant', 'بَدَل', 'badal', '', 'précise'],
  matuf: ['mot coordonné (relié par « et »)', 'مَعْطُوف', 'maʿṭūf', '', 'et'],
  ismInna: ['nom de inna (sujet, à l\'accusatif)', 'اِسْم إِنَّ', 'ism inna', '', 'nom de inna'],
  khabarInna: ['attribut de inna', 'خَبَر إِنَّ', 'khabar inna', '', 'attribut'],
  ismKana: ['sujet de kāna', 'اِسْم كَانَ', 'ism kāna', '', 'sujet'],
  khabarKana: ['attribut de kāna (à l\'accusatif)', 'خَبَر كَانَ', 'khabar kāna', '', 'attribut'],
  mustathna: ['ce qui est excepté (« sauf … »)', 'مُسْتَثْنَى', 'mustathnā', '', 'sauf'],
  munada: ['la personne qu\'on appelle (« ô … »)', 'مُنَادَى', 'munādā', '', 'ô'],
  fasl: ['pronom de séparation (insiste : « c\'est lui qui… »)', 'ضَمِير فَصْل', 'ḍamīr faṣl', '', ''],
  verb: ['verbe', 'فِعْل', 'fiʿl', '', ''],
  jar: ['préposition', 'حَرْف جَرّ', 'ḥarf jarr', '', ''],
  harf: ['particule', 'حَرْف', 'ḥarf', '', ''],
  inna: ['inna ou une de ses sœurs', 'حَرْف نَاسِخ', 'ḥarf nāsikh', '', ''],
  shart: ['mot de condition (« si, quiconque, ce que »)', 'اِسْم شَرْط', 'ism sharṭ', '', ''],
  istifham: ['mot interrogatif (« comment ? qui ? quoi ? »)', 'اِسْم اِسْتِفْهَام', 'ism istifhām', '', ''],
  rel: ['pronom relatif (« celui qui, ce que »)', 'اِسْم مَوْصُول', 'ism mawṣūl', '', 'qui'],
  inl: ['lettres isolées', 'حُرُوف مُقَطَّعَة', 'ḥurūf muqaṭṭaʿa', '', ''],
  noun: ['nom', 'اِسْم', 'ism', '', ''],
};
/* rôles assez sûrs pour servir de questions d'exercice */
const IRAB_SURE = ['mubtada', 'khabar', 'fail', 'maful', 'majrur', 'mudafIlayh', 'nat', 'ismInna', 'khabarInna', 'matuf'];

function irabRoleName(key) { const r = IRAB_ROLES[key] || IRAB_ROLES.noun; return R(r[0]); }

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
      if (n !== undefined) { set(n, 'khabar', C.mub, true, R('Comme la phrase n\'a pas d\'autre attribut, ce mot défini est l\'attribut : « X **est** Y ».')); C.kh = true; }
    }
    if (C.khMuq >= 0 && !C.muakh) {
      const g = out[C.khMuq].group;
      if (g) { g.key = 'taalluq'; g.head = C.verb; g.text = R('Le groupe se rattache à un **verbe sous-entendu** (par exemple « je commence… »).'); }
    }
    if (C.verb >= 0 && !C.vSubj) out[C.verb].notes.push(R('Sujet : un **pronom sous-entendu** (« il », « elle »…), déjà contenu dans la forme du verbe.'));
  };
  const boundary = () => { finalize(); C = newClause(); pendingPrep = -1; };

  const groupRole = (p) => {
    // fonction d'un groupe « préposition + nom » (jār wa majrūr)
    const g = { key: 'taalluq', head: -1, text: '' };
    if (C.verb >= 0) { g.head = C.verb; g.text = R('Le groupe « préposition + nom » complète le **verbe** (il dit où, à qui, par quoi…).'); }
    else if (C.mub >= 0 && !C.kh) { g.key = 'khabar'; g.head = C.mub; C.kh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut** (khabar) : il dit ce qu\'on affirme du sujet.'); }
    else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { g.key = 'khabarInna'; g.head = C.innaIsm; C.innaKh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut de inna**.'); }
    else if (C.inna >= 0 && C.innaIsm < 0) { g.key = 'khabarInna'; g.head = C.inna; C.innaKh = true; g.text = R('Le groupe est l\'**attribut de inna placé en tête** : le nom de inna viendra après.'); }
    else if (C.kana >= 0 && !C.kanaKh) { g.key = 'khabarKana'; g.head = C.kana; C.kanaKh = true; g.text = R('Le groupe est l\'**attribut de kāna**.'); }
    else if (C.mub < 0 && C.khMuq < 0) { g.key = 'khabarMuq'; C.khMuq = p; g.text = R('Le groupe vient **en tête** : c\'est souvent l\'attribut placé avant le sujet (« à lui, il y a … », « pour eux, un châtiment »).'); }
    else g.text = R('Groupe « préposition + nom » : il complète ce qui précède.');
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
    if (qawl && f.pos !== 'V') { boundary(); o.notes.push(R('Après « dire », une **nouvelle phrase** commence : ce qui est dit.')); }
    qawl = false;
    const hostAtt = (key, text) => x.pron.forEach(p => o.att.push({ ar: p.s[0], label: IRAB_ROLES[key][2], key, text }));
    if (x.conj) conjFlag = true;
    if (x.pre.some(p => ['REM', 'RSLT', 'SUP', 'CAUS', 'CIRC'].includes(p.g.tags[0]))) boundary();

    if (f.pos === 'P') {
      const sub = f.sub;
      if (sub === 'P') {
        set(i, 'jar');
        if (x.pron.length) { hostAtt('majrur', R('pronom au génitif après la préposition (majrūr)')); groupRole(i); }
        else pendingPrep = i;
      } else if (f.fam === 'إِنّ' || sub === 'ACC') {
        boundary(); set(i, 'inna'); C.inna = i;
        if (/^لَا/.test(x.st.seg[0])) o.notes.push(R('لَا de **négation absolue** : « il n\'y a aucun … » ; elle agit comme إِنَّ (nom à l\'accusatif sans tanwīn).'));
        if (x.pron.length) { hostAtt('ismInna', R('pronom collé : c\'est le nom de inna')); C.innaIsm = i; }
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
      if (C.mub >= 0 && !C.kh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut** (khabar) du sujet ' + words[C.mub].map(s => s[0]).join('') + ' : une phrase verbale à l\'intérieur de la phrase nominale.')); o.khOf = C.mub; C.kh = true; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de inna**.')); o.khOf = C.innaIsm; C.innaKh = true; }
      else if (C.kana >= 0 && C.kanaIsm >= 0 && !C.kanaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de kāna**.')); o.khOf = C.kana; C.kanaKh = true; }
      else if (C.rel) o.notes.push(R('Ce verbe ouvre la **proposition relative** (ṣila) : « … qui a fait, qui fait ».'));
      const relBefore = C.rel;
      finalize(); C = newClause(); pendingPrep = -1;
      set(i, 'verb'); C.verb = i; C.vPass = f.pass;
      if (relBefore) C.vSubj = true; // le relatif est le sujet
      const subjSuffix = x.pron.find((p, k) => k === 0 && p.g.person === f.person && isSubjectSuffix(f, f.person));
      if (subjSuffix) { C.vSubj = true; o.att.push({ ar: subjSuffix.s[0], label: f.pass ? 'nāʾib fāʿil' : 'fāʿil', key: f.pass ? 'naib' : 'fail', text: R('terminaison de personne : c\'est le **sujet** (« ' + PERSONS[f.person][0] + ' »)') }); }
      else if (f.aspect === 'IMPV' || /^[12]/.test(f.person)) { C.vSubj = true; o.notes.push(R('Sujet : « ' + (PERSONS[f.person] ? PERSONS[f.person][0] : 'toi') + ' », contenu dans la forme du verbe (pronom sous-entendu).')); }
      x.pron.filter(p => p !== subjSuffix).forEach(p => { C.vObj = true; o.att.push({ ar: p.s[0], label: 'mafʿūl bihi', key: 'maful', text: R('pronom complément : « ' + (PRON_SUFFIX_FR[p.g.person] || '').split(' / ')[0] + ' » (COD)') }); });
      if (f.fam === 'كَان' || /^(كَان|لَيْس|أَصْبَح|ظَلّ|صَار|أَمْسَى)/.test(f.lem || '')) {
        C.kana = i;
        o.notes.push(R('**kāna et ses sœurs** (كَانَ، لَيْسَ، أَصْبَحَ…) : le sujet reste au nominatif, l\'**attribut passe à l\'accusatif**.'));
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
      set(i, 'majrur', -1, false, R('Il est au génitif à cause de la préposition ' + x.prep.s[0] + ' collée devant lui.'));
      groupRole(i); done = true;
    } else if (pendingPrep >= 0 && (cas === 'GEN' || !cas)) {
      set(i, 'majrur', pendingPrep); groupRole(pendingPrep); pendingPrep = -1; done = true;
    } else if (sub === 'REL') {
      set(i, 'rel', p1 >= 0 ? p1 : -1, true); C.rel = true; done = true;
      if (p1 >= 0) o.notes.push(R('Il dépend de ' + wordText(words[p1]) + ' : « ' + wordText(words[p1]) + ' … **qui / que** … ».'));
      if (C.verb >= 0 && !C.vSubj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **sujet** au verbe.')); C.vSubj = true; }
      else if (C.verb >= 0 && !C.vObj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **complément** au verbe.')); C.vObj = true; }
      else if (C.inna >= 0 && C.innaIsm < 0) { o.notes.push(R('Ici, le relatif est le **nom de inna** (« ceux qui… »).')); C.innaIsm = i; }
      else if (C.mub < 0 && C.verb < 0 && !conjHere && p1 < 0) { o.notes.push(R('Ici, le relatif ouvre la phrase : c\'est le **sujet** (« ceux qui… »).')); C.mub = i; }
    } else if (sub === 'PRON' && /^إيا/.test(x.st.seg[0].replace(/[ً-ْٰ]/g, ''))) {
      let v = -1; for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'maful', v, false, R('إِيَّا + pronom : complément d\'objet **placé avant le verbe** pour insister (« c\'est Toi que… »).'));
      done = true;
    } else if (W[i - 1] && W[i - 1].f.sub === 'DEM' && x.det) {
      set(i, 'badal', i - 1, false, R('Après un démonstratif, le nom avec ال dit **de quoi on parle** : هَٰذَا ٱلْكِتَٰبُ = « ce livre ».'));
      if (out[i - 1].key === 'mubtada') { C.nats.push(i); }
      done = true;
    } else if (C.voc && !cas) { set(i, 'munada'); C.voc = false; done = true; }
    else if (!cas && (sub === 'T' || sub === 'LOC')) {
      let v = C.verb; if (v < 0) for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'zarf', v, false, R('Adverbe de temps ou de lieu : il situe l\'action (« quand, lorsque, là où »).')); done = true;
    } else if (sub === 'COND') { boundary(); set(i, 'shart', -1, false, R('Il ouvre une **condition** : le premier verbe est la condition, le second la réponse (souvent tous deux à l\'apocopé).')); done = true; }
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
    else if (mHead >= 0) set(i, 'matuf', mHead, false, R('Relié par « et » : il prend **le même cas** que ' + wordText(words[mHead]) + '.'));
    else if (p1 >= 0 && agrees(p1) && (looksAdj || (x.det && isDef(p1) && W[p1].f.sub !== 'DEM')) && !(out[p1].key === 'mubtada' && !x.det && !looksAdj)) {
      const head = out[p1].key === 'nat' && out[p1].head >= 0 ? out[p1].head : p1;
      const kind = W[p1].f.sub === 'PN' && !looksAdj ? 'badal' : 'nat';
      set(i, kind, head, kind === 'badal', R('Il suit ' + wordText(words[head]) + ' et le copie : **même cas, même défini/indéfini**' + (kind === 'nat' ? ', même genre et même nombre.' : '.')));
      if (out[head].key === 'mubtada' || head === C.mub) C.nats.push(i);
    }
    else if (cas === 'GEN') {
      if (p1 >= 0 && !W[p1].det && !W[p1].f.indef && !W[p1].pron.length && !['PRON', 'DEM', 'REL'].includes(W[p1].f.sub) && W[p1].f.pos === 'N') {
        set(i, 'mudafIlayh', p1, false, R('**Annexion** (iḍāfa) : ' + wordText(words[p1]) + ' (sans ال ni tanwīn) + ce mot au génitif = « ' + (W[p1].st.seg[3] >= 0 ? '…' : '') + ' de … ».'));
      } else set(i, 'noun', -1, true, R('Génitif sans préposition juste avant : il complète ou précise un mot plus haut (souvent la suite du verset précédent).'));
    }
    else if (cas === 'NOM') {
      if (C.verb >= 0 && !C.vSubj) { set(i, C.vPass ? 'naib' : 'fail', C.verb); C.vSubj = true; if (C.kana === C.verb) { o.key = 'ismKana'; C.kanaIsm = i; } }
      else if (C.kana >= 0 && C.kanaIsm < 0) { set(i, 'ismKana', C.kana); C.kanaIsm = i; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { set(i, 'khabarInna', C.innaIsm); C.innaKh = true; }
      else if (C.khMuq >= 0 && !C.muakh) { set(i, 'mubtadaMuakh', C.khMuq); C.muakh = true; }
      else if (C.mub >= 0 && !C.kh) { set(i, 'khabar', C.mub); C.kh = true; }
      else if (C.mub >= 0 && C.kh) set(i, 'khabar', C.mub, true, R('Un deuxième attribut : on dit encore autre chose du même sujet.'));
      else if (C.verb < 0 && C.inna < 0) { set(i, 'mubtada'); C.mub = i; }
      else set(i, 'noun', -1, true, R('Nominatif : sujet ou attribut d\'une petite phrase à l\'intérieur du verset.'));
    }
    else if (cas === 'ACC') {
      if (C.inna >= 0 && C.innaIsm < 0) { set(i, 'ismInna', C.inna); C.innaIsm = i; }
      else if (C.illa) { set(i, 'mustathna'); C.illa = false; }
      else if (C.kana >= 0 && !C.kanaKh) { set(i, 'khabarKana', C.kana); C.kanaKh = true; }
      else if (sub === 'T' || sub === 'LOC') set(i, 'zarf', C.verb, false);
      else if (C.verb >= 0 && !x.det && W[C.verb].st.seg[3] >= 0 && x.st.seg[3] >= 0 && lemRoot(W[C.verb]) && lemRoot(W[C.verb]) === lemRoot(x) && (sub === 'VN' || !sub)) set(i, 'mutlaq', C.verb, false, R('Nom verbal de la **même racine** que le verbe : il renforce l\'action (« il frappa une frappe » = il frappa fort).'));
      else if (C.verb >= 0 && !C.vObj && x.f.indef && groups.some(g => g > C.verb) && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true, R('Indéfini à l\'accusatif après le verbe et son complément : il dit **dans quel état** se fait l\'action (« en foule », « sincèrement »).'));
      else if (C.verb >= 0 && !C.vObj) { set(i, 'maful', C.verb, false); C.vObj = true; }
      else if (C.verb >= 0 && x.f.indef && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true);
      else if (C.verb >= 0) set(i, 'maful', C.verb, true, R('Deuxième complément à l\'accusatif (certains verbes en ont deux : « donner quelque chose à quelqu\'un »), ou complément d\'état.'));
      else set(i, 'noun', -1, true, R('Accusatif : complément (objet, état, temps…) d\'un verbe plus haut dans le passage.'));
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
 * 02d - Prononciation (tajwīd simplifié) : ce qu'on prononce ou pas
 * Lit les signes de récitation du texte coranique (۟ ٱ ٰ ٓ ۢ …)
 * ==================================================================== */
const TJ = {
  silent: ['ne se prononce pas', 'gris'],
  merge: ['se fond dans la lettre suivante (on ne l\'entend pas)', 'violet'],
  madd2: ['voyelle longue : 2 temps', 'orange'],
  madd: ['allongement long (madd) : 4 à 6 temps', 'rouge'],
  ghunna: ['nasalisation (ghunna) : le son passe par le nez, 2 temps', 'vert'],
  qalqala: ['écho (qalqala) : la lettre « rebondit » légèrement', 'bleu'],
};
const TJ_COMB = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06ED]/;
const TJ_VOWEL = /[\u064B-\u0650]/;
const TJ_SUK = /[\u0652\u06E1]/;
const TJ_QALQALA = 'قطبجد';
const TJ_IZHAR = 'ءأإؤئهعحغخ';

function tjClusters(text) {
  const out = [];
  for (const ch of text) {
    if ((TJ_COMB.test(ch) || ch === 'ۥ' || ch === 'ۦ') && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}
const tjBase = c => c ? c[0] : '';
const tjMarks = c => c ? c.slice(1) : '';

/* Pour chaque mot du verset : liste de { t, cls, tip } */
function tajwidVerse(words) {
  const W = words.map(w => tjClusters(wordText(w)));
  const flat = []; W.forEach((cs, wi) => cs.forEach((c, ci) => flat.push({ c, wi, ci })));
  const res = W.map(cs => cs.map(c => ({ t: c, cls: '', tip: '' })));
  const N = flat.length;
  const nextLetter = k => { for (let j = k + 1; j < N; j++) { const b = tjBase(flat[j].c); if (b === 'ٱ' && j + 1 < N) continue; if ((b === 'ا' || b === 'ى') && !tjMarks(flat[j].c) && j === k + 1) continue; if (tjMarks(flat[j].c).includes('۟')) continue; return flat[j]; } return null; };
  const set = (k, cls, tip) => { const r = res[flat[k].wi][flat[k].ci]; if (!r.cls) { r.cls = cls; r.tip = tip; } };
  // dernier groupe prononcé du verset (pour l'arrêt)
  let lastK = N - 1;
  while (lastK > 0 && (/[ٰ۟]/.test(tjMarks(flat[lastK].c)) && !/[َُِ]/.test(tjMarks(flat[lastK].c)) || (/^[اى]$/.test(flat[lastK].c) && /ً/.test(tjMarks(flat[lastK - 1].c))))) lastK--;

  for (let k = 0; k < N; k++) {
    const c = flat[k].c, b = tjBase(c), m = tjMarks(c);
    const prev = k > 0 && flat[k - 1].wi === flat[k].wi ? flat[k - 1].c : '';
    const nxt = k + 1 < N ? flat[k + 1] : null;
    const atEnd = k >= lastK;
    // 1) lettres muettes
    if (m.includes('۟') || m.includes('۠')) { set(k, 'silent', b === 'ا' ? 'alif muet (écrit mais jamais prononcé)' : 'lettre écrite mais non prononcée (petit rond ۟ au-dessus)'); continue; }
    if (b === 'ٱ') { if (k > 0) set(k, 'silent', 'alif de liaison (waṣla) : muet au milieu de la lecture, on enchaîne avec le mot d\'avant'); continue; }
    if ((b === 'ا' || b === 'ى') && !m && prev && /ً/.test(tjMarks(prev))) {
      if (atEnd || k === N - 1) set(k, 'madd2', 'à l\'arrêt (fin du verset), -an devient ā : on prononce cet alif');
      else set(k, 'silent', 'alif support du tanwīn -an : muet (on dit -an sans allonger)');
      continue;
    }
    // 2) allongements
    if (m.includes('ٓ')) { set(k, 'madd', 'signe ٓ (madda) : on allonge longtemps, 4 à 6 temps'); continue; }
    if ((b === 'ن' || b === 'م') && m.includes('ّ')) { set(k, 'ghunna', (b === 'ن' ? 'nūn' : 'mīm') + ' avec chadda : nasalisation (ghunna) de 2 temps'); continue; }
    // 3) nūn sākin / tanwīn et la lettre qui suit
    const tanwin = /[ًٌٍ]/.test(m);
    const nunSakin = b === 'ن' && !TJ_VOWEL.test(m) && !m.includes('ّ') && !m.includes('ٰ');
    if ((tanwin || nunSakin) && !atEnd) {
      const n = nextLetter(k); const nb = n ? tjBase(n.c) : '';
      if (m.includes('ۢ') || m.includes('ۭ')) { set(k, 'ghunna', 'iqlāb : le n devient m devant ب (petit م), avec nasalisation'); continue; }
      if (nb && !TJ_IZHAR.includes(nb)) {
        if ('لر'.includes(nb)) set(k, 'merge', 'idghām : le n' + (tanwin ? ' du tanwīn' : '') + ' se fond dans ' + nb + ' sans nasalisation');
        else if ('ينمو'.includes(nb)) set(k, 'ghunna', 'idghām avec ghunna : le n' + (tanwin ? ' du tanwīn' : '') + ' se fond dans ' + nb + ' en passant par le nez');
        else set(k, 'ghunna', 'ikhfāʾ : le n' + (tanwin ? ' du tanwīn' : '') + ' est « caché », à moitié prononcé par le nez devant ' + nb);
        continue;
      }
    }
    // 4) mīm sākin
    if (b === 'م' && !TJ_VOWEL.test(m) && !m.includes('ّ') && !atEnd) {
      const n = nextLetter(k); const nb = n ? tjBase(n.c) : '';
      if (nb === 'ب') { set(k, 'ghunna', 'ikhfāʾ shafawī : mīm devant ب, lèvres presque fermées, nasalisé'); continue; }
      if (nb === 'م') { set(k, 'ghunna', 'idghām : mīm qui se fond dans le mīm suivant, nasalisé'); continue; }
    }
    // 5) lettre assimilée (ال solaire, etc.)
    if (!m && 'اويى'.indexOf(b) < 0 && nxt && nxt.wi === flat[k].wi && tjMarks(nxt.c).includes('ّ')) { set(k, 'silent', b === 'ل' ? 'lām de l\'article devant une lettre solaire : muet, la lettre suivante est doublée' : 'lettre assimilée à la suivante (qui porte la chadda)'); continue; }
    if (!m && b === 'ل' && nxt && nxt.wi !== flat[k].wi) { /* rare */ }
    // 6) voyelles longues
    if (m.includes('ٰ')) { set(k, 'madd2', 'petit alif (ٰ) : on allonge en ā, 2 temps'); }
    else if (/[ۥۦ]/.test(m)) { set(k, 'madd2', 'petit و / ي après le pronom ـهُ / ـهِ : on allonge (hū / hī), 2 temps'); }
    else if (b === 'ا' && !m && prev && /َ/.test(tjMarks(prev))) { set(k, 'madd2', 'alif après fatḥa : ā long, 2 temps'); continue; }
    else if (b === 'و' && !TJ_VOWEL.test(m) && !TJ_SUK.test(m) && !m.includes('ّ') && prev && /ُ/.test(tjMarks(prev))) { set(k, 'madd2', 'wāw après ḍamma : ū long, 2 temps'); continue; }
    else if ((b === 'ي' || b === 'ى') && !TJ_VOWEL.test(m) && !TJ_SUK.test(m) && !m.includes('ّ') && prev && /ِ/.test(tjMarks(prev))) { set(k, 'madd2', 'yāʾ après kasra : ī long, 2 temps'); continue; }
    else if (b === 'ى' && !m && prev && /َ/.test(tjMarks(prev))) { set(k, 'madd2', 'alif maqṣūra après fatḥa : ā long, 2 temps'); continue; }
    // 7) qalqala
    if (TJ_QALQALA.includes(b) && (TJ_SUK.test(m) || (k === lastK && !m.includes('ّ')))) { set(k, 'qalqala', k === lastK ? 'qalqala forte : à l\'arrêt, cette lettre rebondit' : 'qalqala : lettre avec soukoun, elle rebondit légèrement'); continue; }
  }
  // l'arrêt en fin de verset
  if (N) {
    const k = lastK; const r = res[flat[k].wi][flat[k].ci];
    const m = tjMarks(flat[k].c);
    if (/[ٌٍُِ]/.test(m) || (/َ/.test(m) && !/[اى]/.test(tjBase(flat[k].c)))) {
      r.pause = tjBase(flat[k].c) === 'ة' ? 'à l\'arrêt (fin du verset), ة se prononce h et la voyelle finale tombe' : 'à l\'arrêt (fin du verset), on ne prononce pas la dernière voyelle';
    }
  }
  return res;
}

/* Remplit un élément avec le mot coloré ; ZWJ pour garder les lettres attachées */
function fillTajwid(el, segs) {
  const ZWJ = '‍';
  let buf = '';
  const flush = () => { if (buf) { el.appendChild(document.createTextNode(buf)); buf = ''; } };
  segs.forEach((s, i) => {
    if (!s.cls && !s.pause) { buf += s.t; return; }
    flush();
    const sp = document.createElement('span');
    sp.className = (s.cls ? 'aa-tj-' + s.cls : '') + (s.pause ? ' aa-tj-pause' : '');
    sp.textContent = (i > 0 ? ZWJ : '') + s.t + (i < segs.length - 1 ? ZWJ : '');
    sp.title = [s.tip, s.pause].filter(Boolean).join(' · ');
    el.appendChild(sp);
  });
  flush();
}
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
/* ====================================================================
 * 04 - Données : chargement local du Coran (aucune connexion internet)
 * ==================================================================== */

const DATA_VERSION = '3';
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
    applyLemmaFix(l);
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

/* Ordre de la révélation (nuzūl) : rang de chaque sourate (1 → 114), selon l'ordre
 * traditionnel de l'édition égyptienne du Coran (al-Azhar, 1924). C'est un ordre approché :
 * certaines sourates ont été révélées en plusieurs fois. */
const REVELATION_ORDER = [5,87,89,92,112,55,39,88,113,51,52,53,96,72,54,70,50,69,44,45,73,103,74,102,42,47,48,49,85,84,57,75,90,58,43,41,56,38,59,60,61,62,63,64,65,66,95,111,106,34,67,76,23,37,97,46,94,105,101,91,109,110,104,108,99,107,77,2,78,79,71,40,3,4,31,98,33,80,81,24,7,82,86,83,27,36,8,68,10,35,26,9,11,12,28,1,25,100,93,14,30,16,13,32,19,29,17,15,18,114,6,22,20,21];
/* Liste des numéros de sourates dans l'ordre choisi ('mushaf' ou 'nuzul') */
function surahSequence(order) {
  const a = []; for (let i = 1; i <= 114; i++) a.push(i);
  return order === 'nuzul' ? a.sort((x, y) => REVELATION_ORDER[x - 1] - REVELATION_ORDER[y - 1]) : a;
}
/* ====================================================================
 * 04b - Corrections du dictionnaire
 * v : verbes remis à leur forme de dictionnaire (passé, « il a … »),
 *     au lieu d'une forme conjuguée ou coupée prise dans le Coran.
 * g : noms propres, le nom arabe d'abord, le nom français entre parenthèses.
 * L'ancienne forme est gardée en l[9] pour que les cartes déjà révisées gardent leur identifiant.
 * ==================================================================== */
const LEMMA_FIX = {"v":{"176":"أَحَبَّ","194":"جَرَى","228":"عَقَلَ","253":"مَلَكَ","274":"أَرَى","281":"تَوَكَّلَ","300":"حَزَنَ","310":"ذاقَ","317":"بَيَّنَ","378":"أَغْنَى","406":"شَعَرَ","417":"جادَلَ","442":"فَتَنَ","452":"رَجا","487":"بَلا","495":"أَقْسَمَ","510":"فَقِهَ","520":"مَتَّعَ","538":"أَعادَ","544":"أَغْرَقَ","554":"تَفَكَّرَ","592":"أَفْسَدَ","606":"وَعَظَ","608":"غَلَبَ","619":"صَنَعَ","624":"لَقِيَ","628":"أَخْلَفَ","639":"حَلَّ","644":"أَعْتَدَ","665":"تَرَبَّصَ","682":"وَصَفَ","686":"أَيْقَنَ","693":"أَعْلَنَ","701":"أَنْظَرَ","705":"حَذِرَ","713":"أَخْزَى","714":"دَرَى","716":"حَلَفَ","723":"جَحَدَ","740":"قَرِبَ","742":"لَبَسَ","743":"هادَ","749":"نالَ","793":"وَصَلَ","801":"عاذَ","807":"أَضاعَ","817":"ثَبَّتَ","822":"أَوْلَجَ","836":"صَرَّفَ","846":"اسْتَقامَ","857":"اسْتَحْيا","860":"قَبِلَ","865":"فَرَّقَ","881":"آخَذَ","884":"ضاعَفَ","893":"سارَعَ","897":"تَساءَلَ","898":"اجْتَنَبَ","902":"خاضَ","907":"لَعِبَ","926":"نَطَقَ","930":"هَبَطَ","936":"طَمِعَ","945":"أَجابَ","948":"زالَ","957":"اخْتَصَمَ","960":"ازْدادَ","979":"انْتَظَرَ","980":"أَغْوَى","981":"عَجِبَ","982":"اسْتَضْعَفَ","987":"كادَ","993":"راوَدَ","995":"أَسْقَى","997":"اشْتَهَى","1007":"عَمِهَ","1035":"كَلَّفَ","1046":"دامَ","1050":"تَنازَعَ","1051":"اسْتَبْشَرَ","1063":"شاقَّ","1068":"وَزَرَ","1081":"أَمْطَرَ","1085":"نَقَصَ","1087":"ضَحِكَ","1105":"تَنَزَّلَ","1112":"نَقَضَ","1125":"صَفَحَ","1135":"ثَقِفَ","1140":"أَقْرَضَ","1172":"اسْتَفْتَى","1177":"بَلَّغَ","1179":"انْتَقَمَ","1183":"قَلَّبَ","1188":"مَلَأَ","1190":"اسْتَأْخَرَ","1200":"ظاهَرَ","1201":"أَجارَ","1203":"بايَعَ","1208":"شَدَّ","1228":"فَجَّرَ","1231":"انبَغَى","1234":"فَرَّ","1243":"رَكَعَ","1244":"فَرَقَ","1249":"أَثارَ","1251":"عَمَّرَ","1267":"تَطَهَّرَ","1270":"قَبَضَ","1272":"طَعِمَ","1275":"شَفَعَ","1282":"بَخَسَ","1283":"أَدَّى","1292":"دَرَسَ","1295":"اعْتَصَمَ","1303":"دَفَعَ","1310":"أَرْضَعَ","1311":"أَحْصَنَ","1312":"هَجَرَ","1314":"طَمَسَ","1320":"أَفْتَى","1327":"أَوْقَدَ","1328":"امْتَرَى","1329":"فَرَّطَ","1337":"جَهِلَ","1339":"أَجْرَمَ","1349":"نَصَحَ","1353":"أَبْلَغَ","1362":"بَطَشَ","1364":"خانَ","1367":"اعْتَذَرَ","1369":"بَكَى","1372":"سَيَّرَ","1373":"رَهِقَ","1381":"رَجَمَ","1393":"أَسْكَنَ","1394":"عَرَجَ","1422":"زَوَّجَ","1426":"اسْتَعانَ","1432":"سامَ","1433":"واعَدَ","1437":"حَرَّفَ","1438":"أَقَرَّ","1441":"قَفَّى","1445":"هاتِ","1449":"رَغِبَ","1457":"كَبَّرَ","1464":"حافَظَ","1470":"نَذَرَ","1484":"فَشِلَ","1487":"أَصَرَّ","1492":"دَرَأَ","1493":"خَوَّفَ","1498":"أَصْلَى","1501":"لَمَسَ","1507":"تَدَبَّرَ","1514":"غَيَّرَ","1525":"قَتَّلَ","1526":"صَلَّبَ","1530":"نَقَمَ","1545":"اقْتَرَفَ","1547":"خَرَصَ","1550":"ثَقُلَ","1552":"اسْتَقْدَمَ","1554":"أَغْشَى","1557":"نَحَتَ","1565":"اسْتَعاذَ","1573":"عَمَرَ","1575":"اسْتَحَبَّ","1580":"دَبَّرَ","1585":"أَجْمَعَ","1586":"تَبَوَّأَ","1595":"ارْتَقَبَ","1597":"تَكَلَّمَ","1599":"شَقِيَ","1608":"أَلْحَقَ","1618":"قَنَطَ","1622":"اسْتَعْتَبَ","1628":"حَلَّى","1638":"اهْتَزَّ","1639":"رَبا","1644":"غَضَّ","1651":"أَزْلَفَ","1671":"تَناجَى","1680":"رَهِبَ","1681":"ذَبَّحَ","1687":"اسْتَبْدَلَ","1696":"قَسا","1697":"تَشَقَّقَ","1698":"حَدَّثَ","1699":"اسْتَفْتَحَ","1701":"تَبَدَّلَ","1713":"زَلْزَلَ","1716":"أَنْكَحَ","1718":"فاءَ","1720":"سَرَّحَ","1725":"أَكَنَّ","1728":"أَفْرَغَ","1729":"فَسَدَ","1734":"كَسا","1738":"تَيَمَّمَ","1744":"سَئِمَ","1747":"حاسَبَ","1758":"كَفَلَ","1760":"لَوَى","1762":"ابْيَضَّ","1764":"عَنِتَ","1773":"انفَضَّ","1777":"أَقْسَطَ","1780":"اسْتَعَفَّ","1787":"مالَ","1796":"مَسَحَ","1804":"أَلِمَ","1806":"اسْتَخْفَى","1809":"أَحْضَرَ","1810":"حَرَصَ","1811":"عَدا","1813":"اسْتَنْكَفَ","1818":"عَزَّرَ","1825":"عَصَمَ","1833":"وَقَفَ","1835":"تَضَرَّعَ","1836":"طَرَدَ","1850":"اسْتَكْثَرَ","1859":"خَفَّ","1870":"أَرْجَى","1874":"سَحَرَ","1875":"لَقِفَ","1877":"تَطَيَّرَ","1880":"أَلْحَدَ","1885":"وَجِلَ","1887":"رَبَطَ","1890":"رَقَبَ","1891":"أَرْضَى","1895":"كَنَزَ","1900":"لَمَزَ","1908":"اعْتَرَفَ","1910":"وَطِئَ","1911":"غاظَ","1930":"أَتْرَفَ","1935":"لامَ","1954":"أَنْكَرَ","1955":"مَحا","1964":"خَفَضَ","1966":"جَأَرَ","1976":"وَزَنَ","1985":"نَشَرَ","1990":"أَحْدَثَ","1997":"اصْطَبَرَ","2002":"بَصُرَ","2003":"حَرَّقَ","2004":"نَسَفَ","2007":"رَكَضَ","2033":"وَزَعَ","2038":"أَبْدَأَ","2040":"انْتَشَرَ","2049":"ادَّعَى","2057":"كَوَّرَ","2059":"احْتَسَبَ","2066":"لاقَى","2073":"نَفَذَ","2084":"خادَعَ","2085":"خَدَعَ","2091":"سَفَكَ","2092":"ظَلَّلَ","2098":"تَظاهَرَ","2100":"تَعَلَّمَ","2103":"راعَى","2104":"اخْتَصَّ","2105":"نَسَخَ","2115":"صامَ","2116":"أَكْمَلَ","2118":"اخْتانَ","2119":"باشَرَ","2124":"أَحْصَرَ","2132":"زَلَّ","2136":"بَرَّ","2141":"عَضَلَ","2153":"هَزَمَ","2164":"مَحَقَ","2167":"اسْتَشْهَدَ","2171":"أَخْطَأَ","2176":"حَذَّرَ","2178":"قَنَتَ","2182":"أَبْرَأَ","2187":"اسْوَدَّ","2190":"عَضَّ","2197":"اسْتَكانَ","2201":"لانَ","2202":"نافَقَ","2203":"لَحِقَ","2228":"طاعَ","2229":"حَكَّمَ","2230":"حَرَّضَ","2233":"حَصِرَ","2242":"مَنَّى","2247":"راءَى","2248":"أَخْلَصَ","2250":"صَلَبَ","2251":"غَلا","2254":"تَعاوَنَ","2258":"أَغْرَى","2267":"صَمَّ","2270":"فاضَ","2275":"حَبَسَ","2284":"أَبْسَلَ","2285":"وَجَّهَ","2293":"سَبَّ","2295":"أَشْعَرَ","2296":"صَغا","2302":"اشْتَمَلَ","2310":"تَكَبَّرَ","2324":"عَرَشَ","2334":"لَهَثَ","2335":"اسْتَدْرَجَ","2341":"أَنْصَتَ","2344":"أَثْبَتَ","2345":"غَنِمَ","2347":"تَراءَى","2350":"جَنَحَ","2353":"أَثْخَنَ","2359":"شَفَى","2361":"رَحُبَ","2364":"بَعُدَ","2367":"غَلُظَ","2376":"أَسْلَفَ","2378":"تَعارَفَ","2380":"عَزَبَ","2383":"أَحْكَمَ","2385":"أَخْبَتَ","2387":"أَكْثَرَ","2388":"ابْتَأَسَ","2395":"أُهْرِعَ","2398":"الْتَفَتَ","2401":"خالَفَ","2403":"قَدِمَ","2408":"رَكَنَ","2419":"عَصَرَ","2424":"زَرَعَ","2428":"اكْتالَ","2430":"فَقَدَ","2462":"تَوارَى","2473":"تَبَّرَ","2479":"نَهَرَ","2482":"كالَ","2488":"كَرَّمَ","2489":"أَزْجَى","2492":"اجْتَمَعَ","2499":"هَيَّأَ","2501":"طَلَعَ","2502":"غَرَبَ","2508":"حاوَرَ","2513":"غادَرَ","2516":"أَدْحَضَ","2521":"صاحَبَ","2538":"انْتَبَذَ","2550":"ضَمَّ","2557":"تَخافَتَ","2558":"خَشَعَ","2566":"سَبَحَ","2572":"نَسَلَ","2575":"آذَنَ","2580":"عَظَّمَ","2587":"لَجَّ","2589":"جَلَدَ","2608":"رَتَّلَ","2617":"زَنَى","2618":"خَلَدَ","2622":"بَرَّزَ","2630":"اصْطَلَى","2631":"عَقَّبَ","2632":"اسْتَيْقَنَ","2634":"أَوْزَعَ","2640":"تَرَقَّبَ","2641":"ائْتَمَرَ","2642":"اسْتَأْجَرَ","2644":"شَقَّ","2653":"حُبِرَ","2665":"أَشْفَقَ","2666":"مَزَّقَ","2671":"بارَ","2674":"ذَلَّلَ","2681":"أَنْزَفَ","2693":"هاجَ","2701":"سَحَبَ","2705":"قَيَّضَ","2709":"قَسَمَ","2716":"عَيَّ","2734":"مارَ","2735":"دَعَّ","2747":"أَخْسَرَ","2752":"فَرَغَ","2753":"طَمَثَ","2756":"تَخَيَّرَ","2762":"حادَّ","2764":"فَسَحَ","2765":"نَشَزَ","2771":"أَدْهَنَ","2773":"دَكَّ","2777":"حَضَّ","2786":"مَهَّلَ","2787":"رَجَفَ","2803":"نَصَبَ","2812":"رَبِحَ","2817":"قَدَّسَ","2820":"انفَجَرَ","2830":"سَرَّ","2834":"تَفَجَّرَ","2835":"فادَى","2836":"أَشْرَبَ","2858":"نَعَقَ","2865":"أَطاقَ","2867":"رَشَدَ","2872":"حَلَقَ","2874":"تَزَوَّدَ","2881":"خالَطَ","2883":"طَهُرَ","2886":"آلَى","2892":"أَرْضَعَ","2895":"اسْتَرْضَعَ","2896":"عَرَّضَ","2905":"آدَ","2907":"تَسَنَّهَ","2908":"أَنْشَزَ","2909":"صارَ","2914":"احْتَرَقَ","2915":"أَغْمَضَ","2919":"تَخَبَّطَ","2922":"تَدايَنَ","2923":"أَدارَ","2924":"تَبايَعَ","2934":"أَعَزَّ","2935":"أَذَلَّ","2938":"أَعاذَ","2943":"ادَّخَرَ","2947":"ابْتَهَلَ","2954":"أَلا","2962":"داوَلَ","2965":"حَسَّ","2966":"أَصْعَدَ","2967":"أَهَمَّ","2971":"شاوَرَ","2972":"خَذَلَ","2975":"طَوَّقَ","2977":"حَمِدَ","2979":"صابَرَ","2980":"رابَطَ","2982":"عالَ","2989":"أَوْصَى","2992":"عاشَرَ","3000":"عَقَدَ","3001":"وَفَّقَ","3004":"اغْتَسَلَ","3009":"نَضِجَ","3010":"تَحاكَمَ","3018":"أَذاعَ","3019":"اسْتَنْبَطَ","3025":"قَصَرَ","3026":"غَفَلَ","3029":"بَتَّكَ","3041":"اصْطادَ","3047":"ذَكَّى","3048":"اسْتَقْسَمَ","3052":"غَسَلَ","3061":"تاهَ","3062":"طَوَّعَ","3063":"بَحَثَ","3064":"عَجَزَ","3069":"اسْتَحْفَظَ","3080":"عَقَّدَ","3095":"طارَ","3096":"تَضَرَّعَ","3102":"جَرَحَ","3103":"اسْتَهْوَى","3110":"اقْتَدَى","3123":"تَصَعَّدَ","3143":"فَتَّحَ","3147":"طَلَبَ","3149":"أَقَلَّ","3153":"أَوْعَدَ","3157":"اسْتَرْهَبَ","3163":"عَكَفَ","3169":"جَرَّ","3170":"أَشْمَتَ","3174":"انبَجَسَ","3176":"سَبَتَ","3178":"مَسَّكَ","3179":"نَتَقَ","3182":"أَثْقَلَ","3184":"أَقْصَرَ","3200":"تَواعَدَ","3201":"قَلَّلَ","3202":"ثَبَتَ","3205":"شَرَّدَ","3207":"أَرْهَبَ","3210":"ساحَ","3215":"خَلَّى","3218":"طَعَنَ","3227":"دانَ","3230":"ضاهَأَ","3235":"واطَأَ","3236":"تَثاقَلَ","3241":"تَرَدَّدَ","3245":"أَوْضَعَ","3249":"جَمَحَ","3261":"مَرَدَ","3262":"خَلَطَ","3278":"خَلَّفَ","3279":"تَخَلَّفَ","3285":"تَفَقَّهَ","3286":"وَلِيَ","3288":"انصَرَفَ","3291":"تَزَيَّنَ","3293":"زَيَّلَ","3294":"اسْتَنْبَأَ","3303":"ثَنَى","3309":"عَمَّى","3310":"ازْدَرَى","3315":"بَلِعَ","3316":"أَقْلَعَ","3336":"سَعِدَ","3340":"طَرَحَ","3341":"رَتَعَ","3345":"غَلَّقَ","3350":"أَكْبَرَ","3352":"صَبا","3357":"عَبَرَ","3360":"حَصَدَ","3362":"أَغاثَ","3365":"اسْتَخْلَصَ","3366":"مارَ","3369":"خَلَصَ","3370":"فَتِئَ","3372":"شَكا","3374":"تَحَسَّسَ","3377":"فَنَّدَ","3388":"سالَ","3392":"صَدَّدَ","3396":"تَجَرَّعَ","3397":"أَساغَ","3399":"اشْتَدَّ","3400":"جَزِعَ","3402":"اجْتَثَّ","3405":"جَنَبَ","3406":"شَخَصَ","3412":"سَكَّرَ","3423":"فَضَحَ","3428":"صَدَعَ","3431":"أَراحَ","3432":"سَرَحَ","3437":"أَسامَ","3441":"تَفَيَّأَ","3442":"دَسَّ","3467":"جاسَ","3474":"بَذَّرَ","3483":"قَفا","3487":"أَنْغَضَ","3494":"أَجْلَبَ","3496":"شارَكَ","3501":"تَهَجَّدَ","3507":"خَبا","3514":"خافَتَ","3520":"تَزاوَرَ","3521":"قَرَضَ","3528":"تَلَطَّفَ","3529":"أَعْثَرَ","3532":"مارَى","3534":"أَغْفَلَ","3537":"أَغاثَ","3538":"شَوَى","3539":"حَفَّ","3545":"ذَرا","3559":"ضَيَّفَ","3573":"ماجَ","3589":"هَزَّ","3590":"ساقَطَ","3597":"أَشارَ","3610":"أَزَّ","3620":"خَلَعَ","3623":"تَوَكَّأَ","3624":"هَشَّ","3633":"اصْطَنَعَ","3641":"خَيَّلَ","3655":"عَنا","3659":"ظَمِئَ","3666":"قَصَمَ","3667":"دَمَغَ","3669":"اسْتَحْسَرَ","3670":"فَتَرَ","3672":"فَتَقَ","3674":"كَلَأَ","3675":"صَحِبَ","3679":"نَكَسَ","3681":"نَفَشَ","3682":"فَهَّمَ","3685":"غاصَ","3696":"طَوَى","3700":"ذَهَلَ","3708":"صَهَرَ","3721":"وَجَبَ","3724":"دافَعَ","3725":"هَدَّمَ","3733":"نازَعَ","3734":"سَطا","3735":"سَلَبَ","3736":"اسْتَنْقَذَ","3741":"نَبَتَ","3752":"لَفَحَ","3755":"خَسَأَ","3761":"ائْتَلَى","3764":"اسْتَأْنَسَ","3769":"كاتَبَ","3778":"تَقَلَّبَ","3791":"تَسَلَّلَ","3808":"باتَ","3810":"قَتَرَ","3814":"عَبَأَ","3817":"عَبَّدَ","3830":"مَرِضَ","3831":"كَبْكَبَ","3834":"عَبِثَ","3843":"هامَ","3856":"نَكَّرَ","3859":"تَقاسَمَ","3867":"كَبَّ","3871":"اسْتَصْرَخَ","3891":"وَصَّلَ","3893":"بَطِرَ","3896":"ناءَ","3899":"قَلَبَ","3902":"خَطَّ","3907":"أَبْلَسَ","3908":"أَمْسَى","3913":"تَصَدَّعَ","3914":"مَهَدَ","3917":"صَعَّرَ","3919":"قَصَدَ","3929":"تَعَمَّدَ","3932":"دارَ","3933":"سَلَقَ","3938":"أَسَرَ","3940":"خَضَعَ","3941":"تَبَرَّجَ","3953":"وَدَعَ","3954":"اعْتَدَّ","3956":"عَزَلَ","3961":"جاوَرَ","3967":"أَوَّبَ","3972":"أَسالَ","3982":"جازَى","3983":"باعَدَ","3992":"صَعِدَ","4003":"اصْطَرَخَ","4005":"عَزَّزَ","4006":"سَلَخَ","4012":"امْتازَ","4013":"مَسَخَ","4015":"نَكَّسَ","4022":"تَسَمَّعَ","4026":"اسْتَسْخَرَ","4027":"تَناصَرَ","4034":"زَفَّ","4038":"فَدَى","4055":"ارْتَقَى","4061":"تَسَوَّرَ","4062":"أَشَطَّ","4063":"أَكْفَلَ","4075":"حَنِثَ","4084":"اقْشَعَرَّ","4088":"اشْتَمَزَ","4093":"أَشْرَقَ","4104":"فَوَّضَ","4105":"تَحاجَّ","4107":"سَجَرَ","4108":"مَرِحَ","4113":"اسْتَتَرَ","4116":"أَبْشَرَ","4121":"أَوْبَقَ","4123":"صارَ","4125":"نَشَّأَ","4130":"اتَّكَأَ","4131":"عَشا","4132":"أَبانَ","4134":"آسَفَ","4138":"لَذَّ","4139":"فَتَّرَ","4140":"أَبْرَمَ","4146":"غَلَى","4148":"عَتَلَ","4151":"اجْتَرَحَ","4153":"اسْتَنْسَخَ","4157":"تَجاوَزَ","4164":"تَغَيَّرَ","4179":"أَحْفَى","4181":"وَقَّرَ","4182":"شَغَلَ","4187":"تَزَيَّلَ","4199":"تَنابَزَ","4201":"تَجَسَّسَ","4202":"اغْتابَ","4205":"لاتَ","4214":"لَفَظَ","4215":"حادَ","4217":"أَطْغَى","4218":"امْتَلَأَ","4220":"نَقَّبَ","4229":"هَجَعَ","4231":"صَكَّ","4232":"فَرَشَ","4241":"أَلَتَ","4269":"أَزِفَ","4313":"رَجَّ","4315":"بَسَّ","4320":"صَدَّعَ","4332":"حَرَثَ","4334":"تَفَكَّهَ","4337":"أَوْرَى","4346":"اقْتَبَسَ","4347":"الْتَمَسَ","4349":"أَنَى","4353":"سابَقَ","4356":"ابْتَدَعَ","4358":"اشْتَكَى","4361":"تَفَسَّحَ","4363":"ناجَى","4366":"أَخْرَبَ","4367":"اعْتَبَرَ","4370":"أَوْجَفَ","4379":"عادَى","4383":"افْتَرَى","4392":"فارَقَ","4394":"حاضَ","4396":"أَعْظَمَ","4398":"ضَيَّقَ","4399":"تَعاسَرَ","4410":"تَمَيَّزَ","4414":"سَطَرَ","4422":"وَسَمَ","4424":"صَرَمَ","4425":"اسْتَثْنَى","4430":"تَلاوَمَ","4433":"أَزْلَقَ","4450":"صَلَّى","4454":"بَصَّرَ","4464":"أَوْفَضَ","4490":"تَبَتَّلَ","4505":"مَهَّدَ","4510":"أَثَرَ","4511":"أَبْقَى","4525":"حَرَّكَ","4531":"الْتَفَّ","4555":"فَرَجَ","4556":"وَقَّتَ","4613":"انكَدَرَ","4615":"عَطَّلَ","4617":"سَجَّرَ","4619":"كَشَطَ","4620":"سَعَّرَ","4627":"انفَطَرَ","4628":"انْتَثَرَ","4631":"اسْتَوْفَى","4638":"تَنافَسَ","4641":"تَغامَزَ","4644":"تَخَلَّى","4659":"أَمْهَلَ","4662":"أَقْرَأَ","4663":"تَجَنَّبَ","4667":"أَسْمَنَ","4674":"سَطَحَ","4679":"سَرَى","4682":"جابَ","4686":"تَحاضَّ","4690":"أَوْثَقَ","4713":"جَنَّبَ","4718":"قَهَرَ","4725":"سَفَعَ","4729":"صَدَرَ","4736":"وَسَطَ","4743":"زارَ","4761":"نَحَرَ"},"g":{"80":"Mūsā (Moïse)","146":"Firʿawn (Pharaon)","165":"Ibrāhīm (Abraham)","256":"Isrāʾīl (Israël)","257":"Nūḥ (Noé)","323":"Maryam (Marie)","392":"Yūsuf (Joseph)","393":"Lūṭ (Loth)","410":"ʿĪsā (Jésus)","492":"Hārūn (Aaron)","531":"at-Tawrāt (la Torah)","547":"Sulaymān (Salomon)","549":"Isḥāq (Isaac)","571":"Yaʿqūb (Jacob)","578":"Dāwūd (David)","697":"Ismāʿīl (Ismaël)","707":"al-Injīl (l'Évangile)","772":"al-Masīḥ (le Messie)","781":"Shuʿayb","804":"Hūd","1045":"Zakariyyā (Zacharie)","1288":"Yaḥyā (Jean)","1519":"Yūnus (Jonas)","1656":"Qārūn (Coré)","1700":"Jibrīl (Gabriel)","1727":"Jālūt (Goliath)","1812":"az-Zabūr (les Psaumes)","1841":"Ilyās (Élie)","2147":"Ṭālūt (Saül)","2286":"al-Yasaʿ (Élisée)","2542":"Idrīs","2839":"Mīkāl (Michel)","3105":"Āzar","3229":"ʿUzayr (Esdras)","136":"Jahannam (l'Enfer, la Géhenne)","405":"Thamūd","1235":"Hāmān","1518":"Ayyūb (Job)","1755":"ʿImrān","2655":"Luqmān"}};
function applyLemmaFix(L) {
  Object.keys(LEMMA_FIX.v).forEach(k => { const l = L[+k]; if (l && l[1] === 'V' && !l[9]) { l[9] = l[0]; l[0] = LEMMA_FIX.v[k]; } });
  Object.keys(LEMMA_FIX.g).forEach(k => { const l = L[+k]; if (l) l[4] = LEMMA_FIX.g[k]; });
}
/* Généré par tools : signes de pause (waqf) du mushaf de Médine, position dans le verset.
 * Source du texte : quran-json (CC BY-SA 4.0), texte uthmani de quranenc.com */
const PAUSES = {"2:2":[[4,"ۛ"],[5,"ۛ"]],"2:5":[[5,"ۖ"]],"2:7":[[6,"ۖ"],[9,"ۖ"]],"2:10":[[6,"ۖ"]],"2:13":[[12,"ۗ"]],"2:19":[[16,"ۚ"]],"2:20":[[4,"ۖ"],[13,"ۚ"],[19,"ۚ"]],"2:22":[[17,"ۖ"]],"2:24":[[11,"ۖ"]],"2:25":[[12,"ۖ"],[24,"ۖ"],[27,"ۖ"],[31,"ۖ"]],"2:26":[[11,"ۚ"],[19,"ۖ"],[28,"ۘ"],[34,"ۚ"]],"2:27":[[17,"ۚ"]],"2:28":[[6,"ۖ"]],"2:29":[[15,"ۚ"]],"2:30":[[9,"ۖ"],[22,"ۖ"]],"2:32":[[8,"ۖ"]],"2:33":[[4,"ۖ"]],"2:36":[[7,"ۖ"],[12,"ۖ"]],"2:37":[[7,"ۚ"]],"2:38":[[4,"ۖ"]],"2:39":[[7,"ۖ"]],"2:41":[[11,"ۖ"]],"2:44":[[8,"ۚ"]],"2:45":[[3,"ۚ"]],"2:49":[[12,"ۚ"]],"2:54":[[22,"ۚ"]],"2:57":[[7,"ۖ"],[12,"ۚ"]],"2:58":[[18,"ۚ"]],"2:60":[[8,"ۖ"],[13,"ۖ"],[18,"ۖ"]],"2:61":[[22,"ۖ"],[30,"ۚ"],[36,"ۗ"],[44,"ۚ"],[54,"ۚ"]],"2:64":[[5,"ۖ"]],"2:67":[[10,"ۖ"],[13,"ۖ"]],"2:68":[[8,"ۚ"],[20,"ۖ"]],"2:69":[[8,"ۚ"]],"2:71":[[16,"ۚ"],[20,"ۚ"]],"2:73":[[3,"ۚ"]],"2:74":[[11,"ۚ"],[18,"ۚ"],[25,"ۚ"],[32,"ۗ"]],"2:76":[[21,"ۚ"]],"2:79":[[15,"ۖ"]],"2:80":[[7,"ۚ"],[16,"ۖ"]],"2:81":[[1,"ۚ"],[10,"ۖ"]],"2:82":[[7,"ۖ"]],"2:85":[[22,"ۚ"],[27,"ۚ"],[38,"ۖ"],[44,"ۗ"]],"2:86":[[6,"ۖ"]],"2:87":[[8,"ۖ"],[16,"ۗ"]],"2:88":[[3,"ۚ"]],"2:89":[[22,"ۚ"]],"2:90":[[20,"ۖ"],[24,"ۚ"]],"2:91":[[20,"ۗ"]],"2:93":[[11,"ۖ"],[19,"ۚ"]],"2:95":[[6,"ۚ"]],"2:96":[[8,"ۚ"],[21,"ۗ"]],"2:99":[[5,"ۖ"]],"2:100":[[6,"ۚ"]],"2:102":[[7,"ۖ"],[23,"ۚ"],[34,"ۖ"],[42,"ۚ"],[51,"ۚ"],[56,"ۚ"],[66,"ۚ"],[71,"ۚ"]],"2:103":[[9,"ۚ"]],"2:104":[[9,"ۗ"]],"2:105":[[16,"ۚ"],[21,"ۚ"]],"2:106":[[11,"ۗ"]],"2:107":[[8,"ۗ"]],"2:108":[[10,"ۗ"]],"2:109":[[21,"ۖ"],[27,"ۗ"]],"2:110":[[4,"ۚ"],[12,"ۗ"]],"2:111":[[10,"ۗ"],[12,"ۗ"]],"2:112":[[1,"ۚ"]],"2:113":[[15,"ۗ"],[22,"ۚ"]],"2:114":[[13,"ۚ"],[21,"ۚ"]],"2:115":[[3,"ۚ"],[8,"ۚ"]],"2:116":[[4,"ۗ"],[5,"ۖ"],[11,"ۖ"]],"2:117":[[3,"ۖ"]],"2:118":[[10,"ۗ"],[17,"ۘ"],[19,"ۗ"]],"2:119":[[5,"ۖ"]],"2:120":[[9,"ۗ"],[15,"ۗ"]],"2:121":[[9,"ۗ"]],"2:124":[[6,"ۖ"],[11,"ۖ"],[14,"ۖ"]],"2:125":[[11,"ۖ"]],"2:126":[[18,"ۚ"],[28,"ۖ"]],"2:127":[[10,"ۖ"]],"2:128":[[13,"ۖ"]],"2:129":[[12,"ۖ"]],"2:130":[[9,"ۚ"],[13,"ۖ"]],"2:131":[[5,"ۖ"]],"2:133":[[14,"ۖ"]],"2:134":[[4,"ۖ"],[10,"ۖ"]],"2:135":[[6,"ۗ"],[11,"ۖ"]],"2:137":[[8,"ۖ"],[14,"ۖ"],[16,"ۚ"]],"2:138":[[7,"ۖ"]],"2:140":[[12,"ۗ"],[17,"ۗ"],[25,"ۗ"]],"2:141":[[4,"ۖ"],[10,"ۖ"]],"2:142":[[11,"ۚ"],[15,"ۚ"]],"2:143":[[12,"ۗ"],[27,"ۚ"],[35,"ۗ"],[40,"ۚ"]],"2:144":[[6,"ۖ"],[9,"ۚ"],[14,"ۚ"],[20,"ۗ"],[29,"ۗ"]],"2:145":[[10,"ۚ"],[14,"ۚ"],[19,"ۚ"]],"2:146":[[7,"ۖ"]],"2:148":[[4,"ۖ"],[6,"ۚ"],[13,"ۚ"]],"2:149":[[8,"ۖ"],[12,"ۗ"]],"2:150":[[8,"ۚ"]],"2:153":[[6,"ۚ"]],"2:154":[[8,"ۚ"]],"2:155":[[10,"ۗ"]],"2:157":[[6,"ۖ"]],"2:158":[[6,"ۖ"],[17,"ۚ"]],"2:163":[[3,"ۖ"]],"2:165":[[11,"ۖ"],[16,"ۗ"]],"2:167":[[12,"ۗ"],[18,"ۖ"]],"2:168":[[12,"ۚ"]],"2:170":[[14,"ۚ"]],"2:171":[[12,"ۚ"]],"2:173":[[12,"ۖ"],[21,"ۚ"]],"2:175":[[7,"ۚ"]],"2:176":[[6,"ۗ"]],"2:177":[[39,"ۖ"],[45,"ۗ"],[48,"ۖ"]],"2:178":[[8,"ۖ"],[14,"ۚ"],[25,"ۗ"],[30,"ۗ"]],"2:180":[[13,"ۖ"]],"2:182":[[12,"ۚ"]],"2:184":[[2,"ۚ"],[13,"ۚ"],[19,"ۖ"],[25,"ۚ"]],"2:185":[[12,"ۚ"],[17,"ۖ"],[27,"ۗ"]],"2:186":[[6,"ۖ"],[11,"ۖ"]],"2:187":[[7,"ۚ"],[13,"ۗ"],[23,"ۖ"],[30,"ۚ"],[42,"ۖ"],[47,"ۚ"],[53,"ۗ"],[58,"ۗ"]],"2:189":[[3,"ۖ"],[8,"ۗ"],[19,"ۗ"],[23,"ۚ"]],"2:190":[[8,"ۚ"]],"2:191":[[7,"ۚ"],[11,"ۚ"],[19,"ۖ"],[22,"ۗ"]],"2:193":[[8,"ۖ"]],"2:194":[[6,"ۚ"],[15,"ۚ"]],"2:195":[[10,"ۚ"]],"2:196":[[4,"ۚ"],[10,"ۖ"],[17,"ۚ"],[33,"ۚ"],[44,"ۚ"],[55,"ۗ"],[58,"ۗ"],[66,"ۚ"]],"2:197":[[3,"ۚ"],[15,"ۗ"],[21,"ۗ"],[26,"ۖ"]],"2:198":[[8,"ۚ"],[17,"ۖ"]],"2:199":[[8,"ۚ"]],"2:200":[[10,"ۗ"]],"2:202":[[5,"ۚ"]],"2:203":[[5,"ۚ"],[17,"ۖ"],[19,"ۗ"]],"2:205":[[10,"ۚ"]],"2:206":[[8,"ۚ"],[10,"ۖ"]],"2:207":[[8,"ۚ"]],"2:208":[[11,"ۚ"]],"2:210":[[13,"ۚ"]],"2:211":[[8,"ۗ"]],"2:212":[[9,"ۘ"],[14,"ۗ"]],"2:213":[[19,"ۚ"],[32,"ۖ"],[42,"ۗ"]],"2:214":[[12,"ۖ"],[25,"ۗ"]],"2:215":[[3,"ۖ"],[14,"ۗ"]],"2:216":[[6,"ۖ"],[13,"ۖ"],[20,"ۚ"]],"2:217":[[6,"ۖ"],[10,"ۚ"],[24,"ۚ"],[28,"ۗ"],[37,"ۚ"],[51,"ۖ"],[54,"ۖ"]],"2:218":[[13,"ۚ"]],"2:219":[[4,"ۖ"],[14,"ۗ"],[17,"ۖ"],[19,"ۗ"]],"2:220":[[3,"ۗ"],[6,"ۖ"],[10,"ۖ"],[13,"ۚ"],[18,"ۚ"],[22,"ۚ"]],"2:221":[[5,"ۚ"],[12,"ۗ"],[17,"ۚ"],[24,"ۗ"],[28,"ۖ"],[34,"ۖ"]],"2:222":[[3,"ۖ"],[14,"ۖ"],[21,"ۚ"]],"2:223":[[7,"ۖ"],[9,"ۚ"],[14,"ۗ"]],"2:224":[[11,"ۚ"]],"2:225":[[11,"ۗ"]],"2:226":[[7,"ۖ"]],"2:228":[[5,"ۚ"],[21,"ۚ"],[29,"ۚ"],[34,"ۚ"],[37,"ۗ"]],"2:229":[[2,"ۖ"],[7,"ۗ"],[22,"ۖ"],[34,"ۗ"],[39,"ۚ"]],"2:230":[[11,"ۗ"],[24,"ۗ"]],"2:231":[[10,"ۚ"],[14,"ۚ"],[20,"ۚ"],[25,"ۚ"],[37,"ۚ"]],"2:232":[[14,"ۗ"],[24,"ۗ"],[28,"ۚ"]],"2:233":[[5,"ۖ"],[10,"ۚ"],[16,"ۚ"],[21,"ۚ"],[29,"ۚ"],[33,"ۗ"],[43,"ۗ"],[56,"ۗ"]],"2:234":[[10,"ۖ"],[21,"ۗ"]],"2:235":[[13,"ۚ"],[26,"ۚ"],[34,"ۚ"],[42,"ۚ"]],"2:236":[[13,"ۚ"],[22,"ۖ"]],"2:237":[[22,"ۚ"],[26,"ۚ"],[30,"ۚ"]],"2:239":[[5,"ۖ"]],"2:240":[[12,"ۚ"],[24,"ۗ"]],"2:241":[[3,"ۖ"]],"2:243":[[17,"ۚ"]],"2:245":[[11,"ۚ"],[14,"ۜ"]],"2:246":[[21,"ۖ"],[30,"ۖ"],[43,"ۖ"],[51,"ۚ"]],"2:247":[[10,"ۚ"],[25,"ۚ"],[35,"ۖ"],[40,"ۚ"]],"2:248":[[22,"ۚ"]],"2:249":[[24,"ۚ"],[29,"ۚ"],[42,"ۚ"],[57,"ۗ"]],"2:251":[[13,"ۗ"]],"2:252":[[6,"ۚ"]],"2:253":[[6,"ۘ"],[10,"ۖ"],[13,"ۚ"],[21,"ۗ"],[42,"ۚ"]],"2:254":[[18,"ۗ"]],"2:255":[[7,"ۚ"],[12,"ۚ"],[19,"ۗ"],[26,"ۚ"],[32,"ۖ"],[40,"ۚ"],[44,"ۖ"],[47,"ۚ"]],"2:256":[[4,"ۖ"],[9,"ۚ"],[21,"ۗ"]],"2:257":[[9,"ۖ"],[18,"ۗ"],[21,"ۖ"]],"2:258":[[23,"ۖ"],[38,"ۗ"]],"2:259":[[16,"ۖ"],[22,"ۖ"],[25,"ۖ"],[31,"ۖ"],[42,"ۖ"],[48,"ۖ"],[56,"ۚ"]],"2:260":[[8,"ۖ"],[11,"ۖ"],[16,"ۖ"],[34,"ۚ"]],"2:261":[[17,"ۗ"],[21,"ۚ"]],"2:263":[[8,"ۗ"]],"2:264":[[18,"ۖ"],[27,"ۖ"],[33,"ۗ"]],"2:265":[[23,"ۗ"]],"2:266":[[28,"ۗ"]],"2:267":[[13,"ۖ"],[24,"ۚ"]],"2:268":[[5,"ۖ"],[10,"ۗ"]],"2:269":[[4,"ۚ"],[11,"ۗ"]],"2:270":[[11,"ۗ"]],"2:271":[[5,"ۖ"],[12,"ۚ"],[16,"ۗ"]],"2:272":[[8,"ۗ"],[13,"ۚ"],[19,"ۚ"]],"2:273":[[22,"ۗ"]],"2:275":[[13,"ۚ"],[20,"ۗ"],[25,"ۚ"],[37,"ۖ"],[42,"ۖ"]],"2:276":[[5,"ۗ"]],"2:279":[[8,"ۖ"]],"2:280":[[7,"ۚ"]],"2:281":[[6,"ۖ"]],"2:282":[[10,"ۚ"],[14,"ۚ"],[22,"ۚ"],[34,"ۚ"],[51,"ۚ"],[55,"ۖ"],[71,"ۚ"],[77,"ۚ"],[86,"ۚ"],[107,"ۗ"],[110,"ۚ"],[115,"ۚ"],[120,"ۗ"],[122,"ۖ"],[124,"ۗ"]],"2:283":[[9,"ۖ"],[20,"ۗ"],[23,"ۚ"],[28,"ۗ"]],"2:284":[[7,"ۗ"],[17,"ۖ"],[23,"ۗ"]],"2:285":[[8,"ۚ"],[20,"ۚ"],[23,"ۖ"]],"2:286":[[6,"ۚ"],[12,"ۗ"],[19,"ۚ"],[30,"ۚ"],[38,"ۖ"],[43,"ۚ"]],"3:4":[[6,"ۗ"],[14,"ۗ"]],"3:6":[[7,"ۚ"]],"3:7":[[13,"ۖ"],[26,"ۖ"],[31,"ۗ"],[41,"ۗ"]],"3:8":[[12,"ۚ"]],"3:9":[[8,"ۚ"]],"3:10":[[12,"ۖ"]],"3:11":[[6,"ۚ"],[11,"ۗ"]],"3:12":[[7,"ۖ"]],"3:13":[[7,"ۖ"],[18,"ۚ"],[23,"ۚ"]],"3:14":[[16,"ۗ"],[20,"ۖ"]],"3:15":[[5,"ۖ"],[21,"ۗ"]],"3:18":[[12,"ۚ"]],"3:19":[[5,"ۗ"],[18,"ۗ"]],"3:20":[[8,"ۗ"],[14,"ۚ"],[18,"ۖ"],[23,"ۗ"]],"3:24":[[9,"ۖ"]],"3:26":[[18,"ۖ"],[20,"ۖ"]],"3:27":[[8,"ۖ"],[16,"ۖ"]],"3:28":[[8,"ۖ"],[21,"ۗ"],[24,"ۗ"]],"3:29":[[10,"ۗ"],[17,"ۗ"]],"3:30":[[20,"ۗ"],[23,"ۗ"]],"3:31":[[11,"ۚ"]],"3:32":[[4,"ۖ"]],"3:34":[[4,"ۗ"]],"3:35":[[14,"ۖ"]],"3:36":[[14,"ۖ"]],"3:37":[[9,"ۖ"],[17,"ۖ"],[22,"ۖ"],[27,"ۖ"]],"3:38":[[4,"ۖ"],[12,"ۖ"]],"3:40":[[11,"ۖ"]],"3:41":[[5,"ۖ"],[14,"ۗ"]],"3:44":[[6,"ۚ"]],"3:47":[[9,"ۖ"],[15,"ۚ"]],"3:49":[[23,"ۖ"],[30,"ۖ"],[37,"ۚ"]],"3:50":[[12,"ۚ"]],"3:51":[[5,"ۚ"]],"3:52":[[10,"ۖ"]],"3:54":[[3,"ۖ"]],"3:55":[[21,"ۖ"]],"3:57":[[7,"ۗ"]],"3:59":[[7,"ۖ"]],"3:62":[[5,"ۚ"],[10,"ۚ"]],"3:64":[[25,"ۚ"]],"3:65":[[13,"ۚ"]],"3:66":[[14,"ۚ"]],"3:68":[[10,"ۗ"]],"3:73":[[21,"ۗ"],[29,"ۗ"]],"3:74":[[4,"ۗ"]],"3:75":[[22,"ۗ"]],"3:76":[[1,"ۚ"]],"3:78":[[23,"ۖ"]],"3:80":[[7,"ۚ"]],"3:81":[[19,"ۚ"],[25,"ۖ"],[27,"ۚ"]],"3:86":[[13,"ۚ"]],"3:91":[[16,"ۗ"]],"3:92":[[7,"ۚ"]],"3:93":[[17,"ۚ"]],"3:95":[[3,"ۗ"],[7,"ۖ"]],"3:97":[[5,"ۖ"],[9,"ۗ"],[18,"ۚ"]],"3:99":[[14,"ۗ"]],"3:101":[[9,"ۗ"]],"3:103":[[6,"ۚ"],[27,"ۗ"]],"3:104":[[11,"ۚ"]],"3:105":[[10,"ۚ"]],"3:106":[[5,"ۚ"]],"3:107":[[7,"ۖ"]],"3:108":[[6,"ۗ"]],"3:109":[[7,"ۚ"]],"3:110":[[12,"ۗ"],[19,"ۚ"]],"3:111":[[4,"ۖ"]],"3:112":[[20,"ۚ"],[30,"ۚ"]],"3:113":[[2,"ۗ"]],"3:114":[[12,"ۖ"]],"3:115":[[6,"ۗ"]],"3:116":[[12,"ۖ"],[15,"ۖ"]],"3:117":[[17,"ۚ"]],"3:118":[[23,"ۚ"],[27,"ۖ"]],"3:119":[[19,"ۚ"],[22,"ۗ"]],"3:120":[[9,"ۖ"],[16,"ۗ"]],"3:121":[[8,"ۗ"]],"3:122":[[8,"ۗ"]],"3:123":[[6,"ۖ"]],"3:125":[[1,"ۚ"]],"3:126":[[9,"ۗ"]],"3:129":[[7,"ۚ"],[13,"ۚ"]],"3:130":[[8,"ۖ"]],"3:134":[[10,"ۗ"]],"3:136":[[12,"ۚ"]],"3:140":[[8,"ۚ"],[20,"ۗ"]],"3:144":[[9,"ۚ"],[16,"ۚ"],[24,"ۚ"]],"3:145":[[10,"ۗ"],[22,"ۚ"]],"3:146":[[18,"ۗ"]],"3:148":[[7,"ۗ"]],"3:150":[[3,"ۖ"]],"3:151":[[14,"ۖ"],[16,"ۖ"]],"3:152":[[7,"ۖ"],[20,"ۚ"],[28,"ۚ"],[32,"ۖ"],[35,"ۗ"]],"3:153":[[21,"ۗ"]],"3:154":[[11,"ۖ"],[21,"ۖ"],[28,"ۗ"],[33,"ۗ"],[40,"ۖ"],[50,"ۗ"],[62,"ۖ"],[71,"ۚ"]],"3:155":[[13,"ۖ"],[17,"ۗ"]],"3:156":[[29,"ۗ"],[32,"ۗ"]],"3:159":[[6,"ۖ"],[14,"ۖ"],[21,"ۖ"],[26,"ۚ"]],"3:160":[[6,"ۖ"],[14,"ۗ"]],"3:161":[[5,"ۚ"],[12,"ۚ"]],"3:162":[[11,"ۖ"]],"3:163":[[4,"ۗ"]],"3:165":[[9,"ۖ"],[14,"ۗ"]],"3:167":[[3,"ۚ"],[12,"ۖ"],[17,"ۗ"],[23,"ۚ"],[29,"ۚ"]],"3:168":[[8,"ۗ"]],"3:169":[[8,"ۚ"]],"3:172":[[9,"ۚ"]],"3:174":[[11,"ۗ"]],"3:176":[[6,"ۚ"],[11,"ۚ"],[19,"ۖ"]],"3:177":[[9,"ۖ"]],"3:178":[[9,"ۚ"],[14,"ۖ"]],"3:179":[[14,"ۗ"],[27,"ۖ"],[30,"ۚ"]],"3:180":[[12,"ۖ"],[16,"ۖ"],[22,"ۗ"],[26,"ۗ"]],"3:181":[[11,"ۘ"]],"3:183":[[14,"ۗ"]],"3:185":[[4,"ۗ"],[9,"ۖ"],[17,"ۗ"]],"3:186":[[16,"ۚ"]],"3:187":[[18,"ۖ"]],"3:188":[[17,"ۖ"]],"3:189":[[4,"ۗ"]],"3:192":[[7,"ۖ"]],"3:193":[[10,"ۚ"]],"3:194":[[10,"ۖ"]],"3:195":[[13,"ۖ"],[16,"ۖ"],[39,"ۚ"]],"3:197":[[5,"ۖ"]],"3:198":[[16,"ۗ"]],"3:199":[[21,"ۚ"],[26,"ۗ"]],"4:1":[[17,"ۚ"],[23,"ۚ"]],"4:2":[[3,"ۖ"],[7,"ۖ"],[12,"ۚ"]],"4:3":[[15,"ۖ"],[24,"ۚ"]],"4:4":[[4,"ۚ"]],"4:6":[[13,"ۖ"],[19,"ۚ"],[23,"ۖ"],[28,"ۚ"],[34,"ۚ"]],"4:7":[[17,"ۚ"]],"4:10":[[11,"ۖ"]],"4:11":[[4,"ۖ"],[8,"ۚ"],[17,"ۖ"],[22,"ۚ"],[33,"ۚ"],[42,"ۚ"],[48,"ۚ"],[55,"ۗ"],[63,"ۚ"],[66,"ۗ"]],"4:12":[[10,"ۚ"],[18,"ۚ"],[25,"ۚ"],[34,"ۚ"],[42,"ۚ"],[49,"ۗ"],[64,"ۚ"],[73,"ۚ"],[82,"ۚ"],[85,"ۗ"]],"4:13":[[3,"ۚ"],[15,"ۚ"]],"4:15":[[9,"ۖ"]],"4:16":[[4,"ۖ"],[9,"ۗ"]],"4:17":[[16,"ۗ"]],"4:18":[[19,"ۚ"]],"4:19":[[10,"ۖ"],[21,"ۚ"],[23,"ۚ"]],"4:20":[[13,"ۚ"]],"4:22":[[11,"ۚ"]],"4:23":[[49,"ۗ"]],"4:24":[[7,"ۖ"],[10,"ۚ"],[21,"ۚ"],[28,"ۚ"],[37,"ۚ"]],"4:25":[[16,"ۚ"],[19,"ۚ"],[22,"ۚ"],[34,"ۚ"],[46,"ۚ"],[51,"ۚ"],[55,"ۗ"]],"4:26":[[11,"ۗ"]],"4:28":[[5,"ۚ"]],"4:29":[[15,"ۚ"],[18,"ۚ"]],"4:30":[[8,"ۚ"]],"4:32":[[9,"ۚ"],[13,"ۖ"],[17,"ۚ"],[21,"ۚ"]],"4:33":[[7,"ۚ"],[12,"ۚ"]],"4:34":[[14,"ۚ"],[21,"ۚ"],[29,"ۖ"],[35,"ۗ"]],"4:35":[[17,"ۗ"]],"4:36":[[6,"ۖ"],[24,"ۗ"]],"4:37":[[11,"ۗ"]],"4:38":[[11,"ۗ"]],"4:39":[[11,"ۚ"]],"4:40":[[6,"ۖ"]],"4:43":[[19,"ۚ"],[43,"ۗ"]],"4:45":[[3,"ۚ"]],"4:46":[[19,"ۚ"]],"4:47":[[24,"ۚ"]],"4:48":[[13,"ۚ"]],"4:49":[[6,"ۚ"]],"4:50":[[6,"ۖ"]],"4:52":[[4,"ۖ"]],"4:54":[[9,"ۖ"]],"4:55":[[8,"ۚ"]],"4:56":[[15,"ۗ"]],"4:57":[[13,"ۖ"],[17,"ۖ"]],"4:58":[[15,"ۚ"],[20,"ۗ"]],"4:59":[[10,"ۖ"],[24,"ۚ"]],"4:60":[[24,"ۖ"]],"4:64":[[8,"ۚ"]],"4:66":[[16,"ۖ"]],"4:69":[[15,"ۚ"]],"4:70":[[4,"ۚ"]],"4:74":[[9,"ۚ"]],"4:76":[[6,"ۖ"],[15,"ۖ"]],"4:77":[[26,"ۚ"],[37,"ۗ"]],"4:78":[[9,"ۗ"],[17,"ۖ"],[24,"ۚ"],[29,"ۖ"]],"4:79":[[6,"ۖ"],[12,"ۚ"],[15,"ۚ"]],"4:80":[[6,"ۖ"]],"4:81":[[12,"ۖ"],[16,"ۖ"],[21,"ۚ"]],"4:82":[[3,"ۚ"]],"4:83":[[9,"ۖ"],[21,"ۗ"]],"4:84":[[8,"ۚ"],[10,"ۖ"],[17,"ۚ"]],"4:85":[[8,"ۖ"],[16,"ۗ"]],"4:86":[[8,"ۗ"]],"4:87":[[5,"ۚ"],[12,"ۗ"]],"4:88":[[9,"ۚ"],[15,"ۖ"]],"4:89":[[7,"ۖ"],[16,"ۚ"],[22,"ۖ"]],"4:90":[[17,"ۚ"],[23,"ۚ"]],"4:91":[[14,"ۚ"],[26,"ۚ"]],"4:92":[[8,"ۚ"],[22,"ۚ"],[33,"ۖ"],[47,"ۖ"],[56,"ۗ"]],"4:94":[[25,"ۚ"],[33,"ۚ"]],"4:95":[[14,"ۚ"],[22,"ۚ"],[26,"ۚ"]],"4:96":[[4,"ۚ"]],"4:97":[[9,"ۖ"],[14,"ۚ"],[22,"ۚ"],[25,"ۖ"]],"4:99":[[6,"ۚ"]],"4:100":[[11,"ۚ"],[27,"ۗ"]],"4:101":[[17,"ۚ"]],"4:102":[[12,"ۖ"],[27,"ۗ"],[39,"ۚ"],[54,"ۖ"],[56,"ۗ"]],"4:103":[[9,"ۚ"],[13,"ۚ"]],"4:104":[[5,"ۖ"],[12,"ۖ"],[18,"ۗ"]],"4:105":[[11,"ۚ"]],"4:106":[[2,"ۖ"]],"4:107":[[6,"ۚ"]],"4:108":[[16,"ۚ"]],"4:111":[[7,"ۚ"]],"4:113":[[14,"ۖ"],[18,"ۚ"],[28,"ۚ"]],"4:114":[[16,"ۚ"]],"4:115":[[18,"ۖ"]],"4:116":[[13,"ۚ"]],"4:118":[[2,"ۘ"]],"4:119":[[10,"ۚ"]],"4:120":[[2,"ۖ"]],"4:122":[[13,"ۖ"],[16,"ۚ"]],"4:123":[[6,"ۗ"]],"4:125":[[13,"ۗ"]],"4:126":[[7,"ۚ"]],"4:127":[[3,"ۖ"],[31,"ۚ"]],"4:128":[[15,"ۚ"],[17,"ۗ"],[20,"ۚ"]],"4:129":[[8,"ۖ"],[14,"ۚ"]],"4:130":[[7,"ۚ"]],"4:131":[[7,"ۗ"],[18,"ۚ"],[28,"ۚ"]],"4:132":[[7,"ۚ"]],"4:133":[[7,"ۚ"]],"4:134":[[10,"ۚ"]],"4:135":[[14,"ۚ"],[22,"ۖ"],[27,"ۚ"]],"4:136":[[16,"ۚ"]],"4:139":[[7,"ۚ"]],"4:140":[[25,"ۗ"]],"4:141":[[24,"ۚ"],[29,"ۚ"]],"4:143":[[9,"ۚ"]],"4:144":[[10,"ۚ"]],"4:146":[[12,"ۖ"]],"4:147":[[7,"ۚ"]],"4:148":[[10,"ۚ"]],"4:151":[[4,"ۚ"]],"4:152":[[13,"ۚ"]],"4:153":[[9,"ۚ"],[22,"ۚ"],[33,"ۚ"]],"4:155":[[13,"ۚ"]],"4:157":[[16,"ۚ"],[23,"ۚ"],[31,"ۚ"]],"4:158":[[4,"ۚ"]],"4:159":[[9,"ۖ"]],"4:161":[[9,"ۚ"]],"4:162":[[14,"ۚ"],[16,"ۚ"]],"4:163":[[10,"ۚ"],[22,"ۚ"]],"4:164":[[10,"ۚ"]],"4:165":[[11,"ۚ"]],"4:166":[[6,"ۖ"],[8,"ۖ"],[10,"ۚ"]],"4:169":[[6,"ۚ"]],"4:170":[[11,"ۚ"],[19,"ۚ"]],"4:171":[[12,"ۚ"],[25,"ۖ"],[28,"ۖ"],[31,"ۚ"],[34,"ۚ"],[38,"ۖ"],[43,"ۘ"],[50,"ۗ"]],"4:172":[[10,"ۚ"]],"4:173":[[10,"ۖ"]],"4:176":[[6,"ۚ"],[18,"ۚ"],[25,"ۚ"],[32,"ۚ"],[41,"ۗ"],[46,"ۗ"]],"5:1":[[5,"ۚ"],[18,"ۗ"]],"5:2":[[23,"ۚ"],[26,"ۚ"],[37,"ۘ"],[41,"ۖ"],[46,"ۚ"],[48,"ۖ"]],"5:3":[[28,"ۚ"],[30,"ۗ"],[39,"ۚ"],[50,"ۚ"]],"5:4":[[4,"ۖ"],[17,"ۖ"],[25,"ۖ"],[27,"ۚ"]],"5:5":[[4,"ۖ"],[13,"ۖ"],[32,"ۗ"]],"5:6":[[17,"ۚ"],[21,"ۚ"],[46,"ۚ"]],"5:7":[[12,"ۖ"],[14,"ۚ"]],"5:8":[[8,"ۖ"],[15,"ۚ"],[19,"ۖ"],[21,"ۚ"]],"5:11":[[17,"ۖ"],[19,"ۚ"]],"5:12":[[11,"ۖ"],[15,"ۖ"],[36,"ۚ"]],"5:13":[[7,"ۖ"],[16,"ۚ"],[25,"ۖ"],[28,"ۚ"]],"5:14":[[19,"ۚ"]],"5:15":[[16,"ۚ"]],"5:17":[[10,"ۚ"],[28,"ۗ"],[34,"ۚ"],[37,"ۚ"]],"5:18":[[7,"ۚ"],[11,"ۖ"],[16,"ۚ"],[22,"ۚ"],[28,"ۖ"]],"5:19":[[19,"ۖ"],[23,"ۗ"]],"5:23":[[15,"ۚ"]],"5:25":[[8,"ۖ"]],"5:26":[[4,"ۛ"],[6,"ۛ"],[9,"ۚ"]],"5:27":[[18,"ۖ"]],"5:28":[[11,"ۖ"]],"5:29":[[10,"ۚ"]],"5:31":[[11,"ۚ"],[22,"ۖ"]],"5:32":[[27,"ۚ"]],"5:33":[[24,"ۚ"],[29,"ۖ"]],"5:34":[[8,"ۖ"]],"5:36":[[21,"ۖ"]],"5:37":[[9,"ۖ"]],"5:38":[[10,"ۗ"]],"5:39":[[10,"ۚ"]],"5:40":[[14,"ۗ"]],"5:41":[[16,"ۛ"],[19,"ۛ"],[26,"ۖ"],[31,"ۖ"],[40,"ۚ"],[50,"ۚ"],[58,"ۚ"],[62,"ۖ"]],"5:42":[[4,"ۚ"],[11,"ۖ"],[17,"ۖ"],[22,"ۚ"]],"5:43":[[12,"ۚ"]],"5:44":[[6,"ۚ"],[23,"ۚ"],[32,"ۚ"]],"5:45":[[16,"ۚ"],[22,"ۚ"]],"5:46":[[12,"ۖ"]],"5:47":[[7,"ۚ"]],"5:48":[[12,"ۖ"],[17,"ۖ"],[24,"ۚ"],[29,"ۚ"],[40,"ۖ"],[42,"ۚ"]],"5:49":[[18,"ۖ"],[28,"ۗ"]],"5:50":[[3,"ۚ"]],"5:51":[[8,"ۘ"],[11,"ۚ"],[16,"ۗ"]],"5:52":[[12,"ۚ"]],"5:53":[[11,"ۚ"]],"5:54":[[28,"ۚ"],[34,"ۚ"]],"5:57":[[18,"ۚ"]],"5:58":[[7,"ۚ"]],"5:60":[[9,"ۚ"],[20,"ۚ"]],"5:61":[[11,"ۚ"]],"5:62":[[9,"ۚ"]],"5:63":[[9,"ۚ"]],"5:64":[[5,"ۚ"],[10,"ۘ"],[16,"ۚ"],[26,"ۚ"],[33,"ۚ"],[39,"ۚ"],[43,"ۚ"]],"5:66":[[16,"ۚ"],[19,"ۖ"]],"5:67":[[8,"ۖ"],[14,"ۚ"],[18,"ۗ"]],"5:68":[[15,"ۗ"],[25,"ۖ"]],"5:70":[[8,"ۖ"]],"5:71":[[15,"ۚ"]],"5:72":[[10,"ۖ"],[18,"ۖ"],[29,"ۖ"]],"5:73":[[8,"ۘ"],[14,"ۚ"]],"5:74":[[5,"ۚ"]],"5:75":[[13,"ۖ"],[16,"ۗ"]],"5:76":[[12,"ۚ"]],"5:78":[[12,"ۚ"]],"5:79":[[6,"ۚ"]],"5:80":[[6,"ۚ"]],"5:82":[[9,"ۖ"],[18,"ۚ"]],"5:83":[[15,"ۖ"]],"5:85":[[11,"ۚ"]],"5:87":[[12,"ۚ"]],"5:88":[[6,"ۚ"]],"5:89":[[11,"ۖ"],[25,"ۖ"],[31,"ۚ"],[36,"ۚ"],[38,"ۚ"]],"5:91":[[17,"ۖ"]],"5:92":[[5,"ۚ"]],"5:93":[[21,"ۚ"]],"5:94":[[16,"ۚ"]],"5:95":[[8,"ۚ"],[37,"ۗ"],[41,"ۚ"],[46,"ۚ"]],"5:96":[[8,"ۖ"],[15,"ۗ"]],"5:97":[[11,"ۚ"]],"5:99":[[5,"ۗ"]],"5:100":[[9,"ۚ"]],"5:101":[[22,"ۗ"]],"5:103":[[18,"ۖ"]],"5:104":[[16,"ۚ"]],"5:105":[[5,"ۖ"],[11,"ۚ"]],"5:106":[[27,"ۚ"]],"5:108":[[14,"ۗ"],[17,"ۗ"]],"5:109":[[7,"ۖ"],[11,"ۖ"]],"5:110":[[20,"ۖ"],[26,"ۖ"],[38,"ۖ"],[42,"ۖ"],[46,"ۖ"]],"5:112":[[15,"ۖ"]],"5:114":[[18,"ۖ"]],"5:115":[[5,"ۖ"]],"5:116":[[15,"ۖ"],[26,"ۚ"],[31,"ۚ"],[40,"ۚ"]],"5:117":[[12,"ۚ"],[18,"ۖ"],[24,"ۚ"]],"5:118":[[4,"ۖ"]],"5:119":[[7,"ۚ"],[16,"ۖ"],[21,"ۚ"]],"5:120":[[6,"ۚ"]],"6:1":[[9,"ۖ"]],"6:2":[[8,"ۖ"],[11,"ۖ"]],"6:8":[[5,"ۖ"]],"6:12":[[6,"ۖ"],[8,"ۚ"],[12,"ۚ"],[19,"ۚ"]],"6:13":[[6,"ۚ"]],"6:14":[[12,"ۗ"],[20,"ۖ"]],"6:16":[[6,"ۚ"]],"6:17":[[9,"ۖ"]],"6:18":[[4,"ۚ"]],"6:19":[[5,"ۖ"],[7,"ۖ"],[10,"ۚ"],[18,"ۚ"],[25,"ۚ"],[28,"ۚ"]],"6:20":[[7,"ۘ"]],"6:21":[[10,"ۚ"]],"6:24":[[5,"ۚ"]],"6:25":[[4,"ۖ"],[13,"ۚ"],[20,"ۖ"]],"6:26":[[5,"ۖ"]],"6:28":[[8,"ۖ"]],"6:30":[[6,"ۚ"],[10,"ۚ"],[13,"ۚ"]],"6:31":[[6,"ۖ"],[22,"ۚ"]],"6:32":[[6,"ۖ"],[11,"ۚ"]],"6:33":[[6,"ۖ"]],"6:34":[[13,"ۚ"],[17,"ۚ"]],"6:35":[[18,"ۚ"],[24,"ۚ"]],"6:36":[[4,"ۘ"]],"6:37":[[7,"ۚ"]],"6:38":[[12,"ۚ"],[18,"ۚ"]],"6:39":[[7,"ۗ"]],"6:45":[[5,"ۚ"]],"6:46":[[16,"ۗ"]],"6:48":[[6,"ۖ"]],"6:50":[[15,"ۖ"],[21,"ۚ"],[26,"ۚ"]],"6:52":[[9,"ۖ"]],"6:53":[[11,"ۗ"]],"6:54":[[8,"ۖ"]],"6:56":[[10,"ۚ"]],"6:57":[[8,"ۚ"],[13,"ۚ"],[17,"ۖ"],[19,"ۖ"]],"6:58":[[11,"ۗ"]],"6:59":[[7,"ۚ"],[12,"ۚ"]],"6:60":[[14,"ۖ"]],"6:61":[[4,"ۖ"]],"6:62":[[6,"ۚ"]],"6:65":[[21,"ۗ"]],"6:66":[[5,"ۚ"]],"6:67":[[3,"ۚ"]],"6:68":[[13,"ۚ"]],"6:70":[[9,"ۚ"],[31,"ۗ"],[36,"ۖ"]],"6:71":[[29,"ۗ"],[35,"ۖ"]],"6:72":[[4,"ۚ"]],"6:73":[[6,"ۖ"],[10,"ۚ"],[12,"ۚ"],[18,"ۚ"],[21,"ۚ"]],"6:76":[[6,"ۖ"],[9,"ۖ"]],"6:77":[[7,"ۖ"]],"6:78":[[9,"ۖ"]],"6:79":[[8,"ۖ"]],"6:80":[[2,"ۚ"],[8,"ۚ"],[18,"ۚ"],[23,"ۚ"]],"6:81":[[15,"ۚ"],[19,"ۖ"]],"6:83":[[6,"ۚ"],[10,"ۗ"]],"6:84":[[4,"ۚ"],[6,"ۚ"],[10,"ۖ"],[18,"ۚ"]],"6:85":[[4,"ۖ"]],"6:86":[[4,"ۚ"]],"6:87":[[4,"ۖ"]],"6:88":[[9,"ۚ"]],"6:89":[[6,"ۚ"]],"6:90":[[4,"ۖ"],[6,"ۗ"],[11,"ۖ"]],"6:91":[[14,"ۗ"],[25,"ۖ"],[30,"ۖ"],[37,"ۖ"],[39,"ۖ"]],"6:92":[[13,"ۚ"],[18,"ۖ"]],"6:93":[[22,"ۗ"],[34,"ۖ"]],"6:94":[[12,"ۖ"],[21,"ۚ"]],"6:95":[[5,"ۖ"],[13,"ۚ"],[15,"ۖ"]],"6:96":[[8,"ۚ"]],"6:97":[[11,"ۗ"]],"6:98":[[8,"ۗ"]],"6:99":[[32,"ۗ"],[38,"ۚ"]],"6:100":[[5,"ۖ"],[11,"ۚ"]],"6:101":[[3,"ۖ"],[11,"ۖ"],[14,"ۖ"]],"6:102":[[3,"ۖ"],[7,"ۖ"],[11,"ۚ"]],"6:103":[[6,"ۖ"]],"6:104":[[5,"ۖ"],[8,"ۖ"],[11,"ۚ"]],"6:106":[[6,"ۖ"],[10,"ۖ"]],"6:107":[[5,"ۗ"],[9,"ۖ"]],"6:108":[[12,"ۗ"]],"6:109":[[9,"ۚ"],[14,"ۖ"]],"6:112":[[15,"ۚ"],[20,"ۖ"]],"6:114":[[10,"ۚ"],[19,"ۖ"]],"6:115":[[5,"ۚ"],[8,"ۚ"]],"6:116":[[10,"ۚ"]],"6:117":[[8,"ۖ"]],"6:119":[[19,"ۗ"],[25,"ۚ"]],"6:120":[[4,"ۚ"]],"6:121":[[10,"ۗ"],[16,"ۖ"]],"6:122":[[18,"ۚ"]],"6:123":[[9,"ۖ"]],"6:124":[[13,"ۘ"],[18,"ۗ"]],"6:125":[[8,"ۖ"],[20,"ۚ"]],"6:126":[[4,"ۗ"]],"6:127":[[5,"ۖ"]],"6:128":[[9,"ۖ"],[22,"ۚ"],[31,"ۚ"]],"6:130":[[14,"ۚ"],[18,"ۖ"]],"6:132":[[4,"ۚ"]],"6:133":[[4,"ۚ"]],"6:134":[[4,"ۖ"]],"6:135":[[7,"ۖ"],[14,"ۚ"]],"6:136":[[14,"ۖ"],[21,"ۖ"],[28,"ۗ"]],"6:137":[[12,"ۖ"],[17,"ۖ"]],"6:138":[[22,"ۚ"]],"6:139":[[11,"ۖ"],[17,"ۚ"],[19,"ۚ"]],"6:140":[[15,"ۚ"]],"6:141":[[16,"ۚ"],[25,"ۖ"],[27,"ۚ"]],"6:142":[[4,"ۚ"],[12,"ۚ"]],"6:143":[[2,"ۖ"],[8,"ۗ"],[18,"ۖ"]],"6:144":[[6,"ۗ"],[16,"ۖ"],[23,"ۚ"],[34,"ۚ"]],"6:145":[[29,"ۚ"]],"6:146":[[7,"ۖ"],[23,"ۚ"],[26,"ۖ"]],"6:148":[[14,"ۚ"],[22,"ۗ"],[29,"ۖ"]],"6:149":[[4,"ۖ"]],"6:150":[[9,"ۖ"],[14,"ۚ"]],"6:151":[[7,"ۖ"],[11,"ۖ"],[13,"ۖ"],[21,"ۖ"],[29,"ۖ"],[37,"ۚ"]],"6:152":[[11,"ۚ"],[15,"ۖ"],[20,"ۖ"],[27,"ۖ"],[30,"ۚ"]],"6:153":[[5,"ۖ"],[12,"ۚ"]],"6:157":[[10,"ۚ"],[17,"ۚ"],[25,"ۗ"]],"6:158":[[14,"ۗ"],[33,"ۗ"]],"6:159":[[10,"ۚ"]],"6:160":[[6,"ۖ"]],"6:161":[[12,"ۚ"]],"6:163":[[3,"ۖ"]],"6:164":[[9,"ۚ"],[15,"ۚ"],[20,"ۚ"]],"6:165":[[14,"ۗ"]],"7:3":[[11,"ۗ"]],"7:7":[[3,"ۖ"]],"7:8":[[3,"ۚ"]],"7:10":[[8,"ۗ"]],"7:12":[[7,"ۖ"]],"7:17":[[11,"ۖ"]],"7:18":[[5,"ۖ"]],"7:22":[[2,"ۚ"],[14,"ۖ"]],"7:24":[[5,"ۖ"]],"7:26":[[9,"ۖ"],[13,"ۚ"]],"7:27":[[15,"ۚ"],[23,"ۗ"]],"7:28":[[10,"ۗ"],[16,"ۖ"]],"7:29":[[4,"ۖ"],[13,"ۚ"]],"7:30":[[6,"ۚ"]],"7:31":[[11,"ۚ"]],"7:32":[[11,"ۚ"],[21,"ۗ"]],"7:34":[[3,"ۖ"]],"7:36":[[8,"ۖ"]],"7:37":[[10,"ۚ"],[15,"ۖ"],[28,"ۖ"]],"7:38":[[13,"ۖ"],[18,"ۖ"],[34,"ۖ"]],"7:40":[[20,"ۚ"]],"7:41":[[7,"ۚ"]],"7:42":[[12,"ۖ"]],"7:43":[[10,"ۖ"],[23,"ۖ"],[28,"ۖ"]],"7:44":[[18,"ۖ"],[20,"ۚ"]],"7:46":[[2,"ۚ"],[8,"ۚ"],[14,"ۚ"]],"7:49":[[7,"ۚ"]],"7:50":[[14,"ۚ"]],"7:51":[[8,"ۚ"]],"7:53":[[4,"ۚ"],[30,"ۚ"]],"7:54":[[14,"ۖ"],[24,"ۗ"],[28,"ۗ"]],"7:55":[[4,"ۚ"]],"7:56":[[9,"ۚ"]],"7:57":[[8,"ۖ"],[24,"ۚ"]],"7:58":[[6,"ۖ"],[12,"ۚ"]],"7:64":[[10,"ۚ"]],"7:65":[[4,"ۚ"],[13,"ۚ"]],"7:69":[[10,"ۚ"],[22,"ۖ"]],"7:71":[[8,"ۖ"],[20,"ۚ"]],"7:72":[[10,"ۖ"]],"7:73":[[4,"ۚ"],[13,"ۖ"],[18,"ۖ"],[23,"ۖ"],[28,"ۖ"]],"7:74":[[17,"ۖ"]],"7:75":[[17,"ۚ"]],"7:81":[[7,"ۚ"]],"7:82":[[10,"ۖ"]],"7:84":[[3,"ۖ"]],"7:85":[[4,"ۚ"],[13,"ۖ"],[18,"ۖ"],[31,"ۚ"]],"7:86":[[14,"ۚ"],[19,"ۖ"]],"7:87":[[16,"ۚ"]],"7:88":[[17,"ۚ"]],"7:89":[[14,"ۚ"],[25,"ۚ"],[30,"ۚ"],[33,"ۚ"]],"7:92":[[7,"ۚ"]],"7:93":[[10,"ۖ"]],"7:99":[[3,"ۚ"]],"7:100":[[13,"ۚ"]],"7:101":[[6,"ۚ"],[17,"ۚ"]],"7:102":[[5,"ۖ"]],"7:103":[[11,"ۖ"]],"7:105":[[9,"ۚ"]],"7:110":[[5,"ۖ"]],"7:116":[[2,"ۖ"]],"7:117":[[6,"ۖ"]],"7:123":[[8,"ۖ"],[17,"ۖ"]],"7:126":[[10,"ۚ"]],"7:127":[[13,"ۚ"]],"7:128":[[6,"ۖ"],[14,"ۖ"]],"7:129":[[10,"ۚ"]],"7:131":[[6,"ۖ"],[13,"ۗ"]],"7:134":[[12,"ۖ"]],"7:137":[[11,"ۖ"],[20,"ۖ"]],"7:138":[[11,"ۚ"],[19,"ۚ"]],"7:141":[[12,"ۚ"]],"7:142":[[11,"ۚ"]],"7:143":[[11,"ۚ"],[23,"ۚ"],[32,"ۚ"]],"7:145":[[17,"ۚ"]],"7:146":[[29,"ۚ"]],"7:147":[[7,"ۚ"]],"7:148":[[11,"ۚ"],[19,"ۘ"]],"7:150":[[12,"ۖ"],[15,"ۖ"],[22,"ۚ"]],"7:151":[[8,"ۖ"]],"7:152":[[12,"ۚ"]],"7:154":[[7,"ۖ"]],"7:155":[[6,"ۖ"],[17,"ۖ"],[22,"ۖ"],[33,"ۖ"],[38,"ۖ"]],"7:156":[[11,"ۚ"],[17,"ۖ"],[21,"ۚ"]],"7:157":[[30,"ۚ"]],"7:158":[[13,"ۖ"],[19,"ۖ"]],"7:160":[[5,"ۚ"],[15,"ۖ"],[20,"ۖ"],[25,"ۚ"],[32,"ۖ"],[37,"ۚ"]],"7:161":[[18,"ۚ"]],"7:163":[[22,"ۚ"]],"7:164":[[13,"ۖ"]],"7:167":[[12,"ۗ"]],"7:168":[[4,"ۖ"],[9,"ۖ"]],"7:169":[[18,"ۚ"],[33,"ۗ"],[38,"ۚ"]],"7:172":[[14,"ۖ"],[17,"ۚ"]],"7:173":[[11,"ۖ"]],"7:176":[[10,"ۚ"],[20,"ۚ"],[26,"ۚ"]],"7:178":[[5,"ۖ"]],"7:179":[[7,"ۖ"],[22,"ۚ"],[27,"ۚ"]],"7:180":[[5,"ۖ"],[10,"ۚ"]],"7:183":[[2,"ۚ"]],"7:184":[[2,"ۗ"],[6,"ۚ"]],"7:185":[[18,"ۖ"]],"7:186":[[6,"ۚ"]],"7:187":[[5,"ۖ"],[10,"ۖ"],[15,"ۚ"],[19,"ۚ"],[23,"ۗ"],[27,"ۖ"]],"7:188":[[11,"ۚ"],[21,"ۚ"]],"7:189":[[11,"ۖ"],[18,"ۖ"]],"7:190":[[8,"ۚ"]],"7:193":[[6,"ۚ"]],"7:194":[[8,"ۖ"]],"7:195":[[4,"ۖ"],[9,"ۖ"],[14,"ۖ"],[19,"ۗ"]],"7:196":[[6,"ۖ"]],"7:198":[[6,"ۖ"]],"7:200":[[7,"ۚ"]],"7:203":[[7,"ۚ"],[15,"ۚ"]],"8:1":[[3,"ۖ"],[7,"ۖ"],[12,"ۖ"]],"8:4":[[4,"ۚ"]],"8:10":[[8,"ۚ"],[14,"ۚ"]],"8:12":[[10,"ۚ"]],"8:13":[[5,"ۚ"]],"8:16":[[18,"ۖ"]],"8:17":[[5,"ۚ"],[17,"ۚ"]],"8:19":[[5,"ۖ"],[10,"ۖ"]],"8:23":[[6,"ۖ"]],"8:24":[[10,"ۖ"]],"8:25":[[8,"ۖ"]],"8:29":[[14,"ۗ"]],"8:30":[[10,"ۚ"],[13,"ۖ"]],"8:33":[[6,"ۚ"]],"8:34":[[13,"ۚ"]],"8:35":[[8,"ۚ"]],"8:36":[[9,"ۚ"],[16,"ۗ"]],"8:37":[[15,"ۚ"]],"8:39":[[9,"ۚ"]],"8:40":[[6,"ۚ"]],"8:41":[[28,"ۗ"]],"8:42":[[10,"ۚ"],[31,"ۗ"]],"8:43":[[6,"ۖ"],[16,"ۚ"]],"8:44":[[15,"ۗ"]],"8:46":[[8,"ۖ"],[9,"ۚ"]],"8:47":[[13,"ۚ"]],"8:48":[[15,"ۖ"],[33,"ۚ"]],"8:49":[[10,"ۗ"]],"8:52":[[6,"ۚ"],[12,"ۚ"]],"8:54":[[6,"ۚ"],[14,"ۚ"]],"8:58":[[9,"ۚ"]],"8:59":[[5,"ۚ"]],"8:60":[[21,"ۚ"]],"8:61":[[8,"ۚ"]],"8:62":[[7,"ۚ"]],"8:63":[[3,"ۚ"],[17,"ۚ"]],"8:65":[[6,"ۚ"],[13,"ۚ"]],"8:66":[[8,"ۚ"],[15,"ۚ"],[23,"ۗ"]],"8:67":[[11,"ۚ"],[17,"ۗ"]],"8:69":[[5,"ۚ"],[7,"ۚ"]],"8:70":[[21,"ۚ"]],"8:71":[[10,"ۗ"]],"8:72":[[17,"ۚ"],[29,"ۚ"],[41,"ۗ"]],"8:73":[[5,"ۚ"]],"8:74":[[14,"ۚ"]],"8:75":[[9,"ۚ"],[17,"ۚ"]],"9:3":[[15,"ۚ"],[20,"ۖ"],[27,"ۗ"]],"9:4":[[18,"ۚ"]],"9:5":[[14,"ۚ"],[22,"ۚ"]],"9:6":[[13,"ۚ"]],"9:7":[[14,"ۖ"],[19,"ۚ"]],"9:8":[[10,"ۚ"]],"9:9":[[8,"ۚ"]],"9:10":[[7,"ۚ"]],"9:11":[[9,"ۗ"]],"9:13":[[12,"ۚ"],[13,"ۚ"]],"9:15":[[3,"ۗ"],[8,"ۗ"]],"9:16":[[20,"ۚ"]],"9:17":[[11,"ۚ"]],"9:18":[[17,"ۖ"]],"9:19":[[15,"ۚ"],[19,"ۗ"]],"9:20":[[13,"ۚ"]],"9:22":[[3,"ۚ"]],"9:23":[[13,"ۚ"]],"9:24":[[28,"ۗ"]],"9:26":[[15,"ۚ"]],"9:27":[[9,"ۗ"]],"9:28":[[13,"ۚ"],[23,"ۚ"]],"9:30":[[10,"ۖ"],[13,"ۖ"],[19,"ۚ"],[21,"ۖ"]],"9:31":[[16,"ۖ"],[20,"ۚ"]],"9:34":[[16,"ۗ"]],"9:35":[[11,"ۖ"]],"9:36":[[18,"ۚ"],[21,"ۚ"],[25,"ۚ"],[31,"ۚ"]],"9:37":[[5,"ۖ"],[22,"ۚ"],[26,"ۗ"]],"9:38":[[15,"ۚ"],[20,"ۚ"]],"9:39":[[11,"ۗ"]],"9:40":[[23,"ۖ"],[36,"ۗ"],[40,"ۗ"]],"9:41":[[9,"ۚ"]],"9:42":[[11,"ۚ"]],"9:44":[[11,"ۗ"]],"9:47":[[14,"ۗ"]],"9:49":[[7,"ۚ"],[11,"ۗ"]],"9:50":[[4,"ۖ"]],"9:51":[[10,"ۚ"]],"9:52":[[7,"ۖ"],[18,"ۖ"]],"9:55":[[5,"ۚ"]],"9:60":[[16,"ۖ"],[19,"ۗ"]],"9:61":[[7,"ۚ"],[19,"ۚ"]],"9:63":[[13,"ۚ"]],"9:64":[[10,"ۚ"]],"9:65":[[7,"ۚ"]],"9:66":[[6,"ۚ"]],"9:67":[[5,"ۚ"],[12,"ۚ"],[15,"ۚ"]],"9:68":[[9,"ۚ"],[11,"ۚ"],[13,"ۖ"]],"9:69":[[23,"ۚ"],[29,"ۖ"]],"9:70":[[15,"ۚ"],[18,"ۖ"]],"9:71":[[5,"ۚ"],[17,"ۚ"],[20,"ۗ"]],"9:72":[[16,"ۚ"],[20,"ۚ"]],"9:73":[[7,"ۚ"],[9,"ۖ"]],"9:74":[[15,"ۚ"],[24,"ۚ"],[29,"ۖ"],[38,"ۚ"]],"9:80":[[15,"ۚ"],[20,"ۗ"]],"9:81":[[19,"ۗ"],[24,"ۚ"]],"9:83":[[17,"ۖ"]],"9:84":[[11,"ۖ"]],"9:85":[[4,"ۚ"]],"9:88":[[8,"ۚ"],[11,"ۖ"]],"9:89":[[10,"ۚ"]],"9:90":[[11,"ۚ"]],"9:91":[[18,"ۚ"],[23,"ۚ"]],"9:93":[[7,"ۚ"]],"9:94":[[5,"ۚ"],[16,"ۚ"]],"9:95":[[8,"ۖ"],[10,"ۖ"],[12,"ۖ"]],"9:96":[[4,"ۖ"]],"9:97":[[13,"ۗ"]],"9:98":[[10,"ۚ"],[13,"ۗ"]],"9:99":[[15,"ۚ"],[19,"ۚ"],[23,"ۚ"]],"9:100":[[22,"ۚ"]],"9:101":[[5,"ۖ"],[13,"ۖ"],[15,"ۚ"]],"9:102":[[13,"ۚ"]],"9:103":[[9,"ۖ"],[13,"ۗ"]],"9:105":[[7,"ۖ"]],"9:106":[[9,"ۗ"]],"9:107":[[15,"ۚ"],[20,"ۖ"]],"9:108":[[4,"ۚ"],[15,"ۚ"],[20,"ۚ"]],"9:109":[[22,"ۗ"]],"9:110":[[12,"ۗ"]],"9:111":[[10,"ۚ"],[16,"ۖ"],[23,"ۚ"],[28,"ۚ"],[33,"ۚ"]],"9:112":[[14,"ۗ"]],"9:114":[[18,"ۚ"]],"9:115":[[13,"ۚ"]],"9:116":[[6,"ۖ"],[8,"ۚ"]],"9:117":[[23,"ۚ"]],"9:118":[[26,"ۚ"]],"9:120":[[18,"ۚ"],[46,"ۚ"]],"9:122":[[5,"ۚ"]],"9:123":[[11,"ۚ"]],"9:124":[[11,"ۚ"]],"9:127":[[14,"ۚ"]],"9:129":[[9,"ۖ"],[11,"ۖ"]],"10:1":[[1,"ۚ"]],"10:2":[[20,"ۗ"]],"10:3":[[14,"ۖ"],[16,"ۖ"],[23,"ۚ"],[27,"ۚ"]],"10:4":[[3,"ۖ"],[6,"ۚ"],[17,"ۚ"]],"10:5":[[13,"ۚ"],[19,"ۚ"]],"10:9":[[8,"ۖ"]],"10:10":[[7,"ۚ"]],"10:11":[[10,"ۖ"]],"10:12":[[21,"ۚ"]],"10:13":[[13,"ۚ"]],"10:15":[[16,"ۚ"],[25,"ۖ"],[31,"ۖ"]],"10:16":[[10,"ۖ"],[16,"ۚ"]],"10:17":[[10,"ۚ"]],"10:18":[[14,"ۚ"],[25,"ۚ"]],"10:19":[[7,"ۚ"]],"10:20":[[7,"ۖ"]],"10:21":[[13,"ۚ"],[17,"ۚ"]],"10:22":[[6,"ۖ"]],"10:23":[[9,"ۗ"],[15,"ۖ"],[18,"ۖ"]],"10:24":[[38,"ۚ"]],"10:26":[[4,"ۖ"],[10,"ۚ"],[13,"ۖ"]],"10:27":[[8,"ۖ"],[14,"ۖ"],[21,"ۚ"],[24,"ۖ"]],"10:28":[[10,"ۚ"],[12,"ۖ"]],"10:30":[[6,"ۚ"],[11,"ۖ"]],"10:31":[[22,"ۚ"],[24,"ۚ"]],"10:32":[[4,"ۖ"],[9,"ۖ"]],"10:34":[[9,"ۚ"],[15,"ۖ"]],"10:35":[[8,"ۚ"],[12,"ۗ"],[25,"ۖ"]],"10:36":[[5,"ۚ"],[12,"ۚ"]],"10:38":[[3,"ۖ"]],"10:39":[[9,"ۚ"],[14,"ۖ"]],"10:40":[[9,"ۚ"]],"10:41":[[7,"ۖ"]],"10:42":[[4,"ۚ"]],"10:43":[[4,"ۚ"]],"10:45":[[11,"ۚ"]],"10:47":[[3,"ۖ"]],"10:49":[[11,"ۗ"],[14,"ۚ"]],"10:51":[[6,"ۚ"]],"10:53":[[3,"ۖ"],[8,"ۖ"]],"10:54":[[10,"ۗ"],[15,"ۖ"]],"10:55":[[7,"ۗ"]],"10:59":[[16,"ۖ"]],"10:60":[[9,"ۗ"]],"10:61":[[20,"ۚ"]],"10:64":[[7,"ۚ"],[11,"ۚ"]],"10:65":[[3,"ۘ"],[7,"ۚ"]],"10:66":[[9,"ۗ"],[17,"ۚ"]],"10:67":[[9,"ۚ"]],"10:68":[[4,"ۗ"],[5,"ۖ"],[7,"ۖ"],[14,"ۚ"],[19,"ۚ"]],"10:72":[[6,"ۖ"],[11,"ۖ"]],"10:73":[[12,"ۖ"]],"10:74":[[17,"ۚ"]],"10:77":[[6,"ۖ"]],"10:81":[[8,"ۖ"]],"10:83":[[14,"ۚ"]],"10:87":[[14,"ۗ"]],"10:88":[[16,"ۖ"]],"10:90":[[9,"ۖ"]],"10:92":[[7,"ۚ"]],"10:93":[[14,"ۚ"]],"10:94":[[13,"ۚ"]],"10:99":[[9,"ۚ"]],"10:100":[[8,"ۚ"]],"10:101":[[6,"ۚ"]],"10:102":[[9,"ۚ"]],"10:103":[[5,"ۚ"]],"10:104":[[21,"ۖ"]],"10:106":[[10,"ۖ"]],"10:107":[[9,"ۖ"],[15,"ۚ"],[21,"ۚ"]],"10:108":[[8,"ۖ"],[13,"ۖ"],[18,"ۖ"]],"10:109":[[8,"ۚ"]],"11:1":[[1,"ۚ"]],"11:2":[[4,"ۚ"]],"11:3":[[17,"ۖ"]],"11:4":[[3,"ۖ"]],"11:5":[[6,"ۚ"],[15,"ۚ"]],"11:6":[[12,"ۚ"]],"11:7":[[16,"ۗ"]],"11:8":[[10,"ۗ"]],"11:10":[[10,"ۚ"]],"11:12":[[19,"ۚ"],[22,"ۚ"]],"11:13":[[3,"ۖ"]],"11:14":[[13,"ۖ"]],"11:16":[[8,"ۖ"]],"11:17":[[15,"ۚ"],[18,"ۚ"],[25,"ۚ"],[30,"ۚ"]],"11:18":[[7,"ۚ"],[18,"ۚ"]],"11:20":[[14,"ۘ"],[17,"ۚ"]],"11:23":[[11,"ۖ"]],"11:24":[[6,"ۚ"],[9,"ۚ"]],"11:26":[[5,"ۖ"]],"11:29":[[5,"ۖ"],[10,"ۚ"],[15,"ۚ"]],"11:30":[[7,"ۚ"]],"11:31":[[22,"ۖ"]],"11:34":[[14,"ۚ"]],"11:35":[[3,"ۖ"]],"11:38":[[10,"ۚ"]],"11:40":[[21,"ۚ"]],"11:41":[[7,"ۚ"]],"11:43":[[7,"ۚ"],[17,"ۚ"]],"11:44":[[13,"ۖ"]],"11:46":[[6,"ۖ"],[10,"ۖ"],[17,"ۖ"]],"11:47":[[12,"ۖ"]],"11:48":[[11,"ۚ"]],"11:49":[[6,"ۖ"],[15,"ۖ"],[16,"ۖ"]],"11:50":[[4,"ۚ"],[13,"ۖ"]],"11:51":[[5,"ۖ"],[11,"ۚ"]],"11:54":[[7,"ۗ"]],"11:55":[[2,"ۖ"]],"11:56":[[6,"ۚ"],[13,"ۚ"]],"11:57":[[8,"ۚ"],[15,"ۚ"]],"11:59":[[2,"ۖ"]],"11:60":[[7,"ۗ"],[12,"ۗ"]],"11:61":[[4,"ۚ"],[13,"ۖ"],[23,"ۚ"]],"11:62":[[8,"ۖ"]],"11:63":[[18,"ۖ"]],"11:64":[[6,"ۖ"],[11,"ۖ"]],"11:65":[[7,"ۖ"]],"11:66":[[13,"ۚ"]],"11:68":[[4,"ۗ"],[9,"ۗ"]],"11:69":[[7,"ۖ"],[9,"ۖ"]],"11:70":[[10,"ۚ"]],"11:72":[[8,"ۖ"]],"11:73":[[5,"ۖ"],[11,"ۚ"]],"11:76":[[4,"ۖ"],[9,"ۖ"]],"11:78":[[9,"ۚ"],[16,"ۖ"],[22,"ۖ"]],"11:81":[[8,"ۖ"],[19,"ۖ"],[23,"ۚ"],[26,"ۚ"]],"11:83":[[3,"ۖ"]],"11:84":[[4,"ۚ"],[13,"ۖ"],[17,"ۖ"]],"11:85":[[5,"ۖ"]],"11:86":[[7,"ۚ"]],"11:87":[[16,"ۖ"]],"11:88":[[13,"ۚ"],[21,"ۚ"],[27,"ۚ"],[31,"ۚ"]],"11:89":[[17,"ۚ"]],"11:90":[[5,"ۚ"]],"11:91":[[11,"ۖ"],[14,"ۖ"]],"11:92":[[10,"ۖ"]],"11:93":[[6,"ۖ"],[15,"ۖ"]],"11:95":[[4,"ۗ"]],"11:97":[[6,"ۖ"]],"11:98":[[6,"ۖ"]],"11:99":[[6,"ۚ"]],"11:100":[[6,"ۖ"]],"11:101":[[5,"ۖ"],[20,"ۖ"]],"11:102":[[8,"ۚ"]],"11:103":[[8,"ۚ"]],"11:105":[[7,"ۚ"]],"11:107":[[10,"ۚ"]],"11:108":[[15,"ۖ"]],"11:109":[[7,"ۚ"],[15,"ۚ"]],"11:110":[[6,"ۚ"],[13,"ۚ"]],"11:111":[[6,"ۚ"]],"11:112":[[8,"ۚ"]],"11:114":[[7,"ۚ"],[11,"ۚ"]],"11:116":[[18,"ۗ"]],"11:118":[[7,"ۖ"]],"11:119":[[4,"ۚ"],[6,"ۗ"]],"11:120":[[10,"ۚ"]],"11:123":[[11,"ۚ"]],"12:1":[[1,"ۚ"]],"12:5":[[10,"ۖ"]],"12:6":[[21,"ۚ"]],"12:15":[[9,"ۚ"]],"12:17":[[11,"ۖ"]],"12:18":[[5,"ۚ"],[11,"ۖ"],[13,"ۖ"]],"12:19":[[6,"ۖ"],[10,"ۚ"],[12,"ۚ"]],"12:21":[[14,"ۚ"],[23,"ۚ"]],"12:22":[[6,"ۚ"]],"12:23":[[12,"ۚ"],[15,"ۖ"],[19,"ۖ"]],"12:24":[[3,"ۖ"],[10,"ۚ"],[15,"ۚ"]],"12:25":[[10,"ۚ"]],"12:26":[[5,"ۚ"]],"12:28":[[10,"ۖ"]],"12:29":[[4,"ۚ"],[6,"ۖ"]],"12:30":[[10,"ۖ"],[13,"ۖ"]],"12:31":[[16,"ۖ"]],"12:32":[[5,"ۖ"],[10,"ۖ"]],"12:33":[[8,"ۖ"]],"12:34":[[6,"ۚ"]],"12:36":[[4,"ۖ"],[10,"ۖ"],[21,"ۖ"],[23,"ۖ"]],"12:37":[[11,"ۚ"],[15,"ۚ"]],"12:38":[[6,"ۚ"],[14,"ۚ"]],"12:40":[[15,"ۚ"],[24,"ۚ"]],"12:41":[[7,"ۖ"],[14,"ۚ"]],"12:43":[[15,"ۖ"]],"12:44":[[3,"ۖ"]],"12:50":[[4,"ۖ"],[18,"ۚ"]],"12:51":[[8,"ۚ"],[16,"ۚ"]],"12:53":[[3,"ۚ"],[11,"ۚ"]],"12:54":[[6,"ۖ"]],"12:55":[[5,"ۖ"]],"12:56":[[9,"ۚ"],[13,"ۖ"]],"12:59":[[9,"ۚ"]],"12:64":[[14,"ۖ"]],"12:65":[[7,"ۖ"],[11,"ۖ"],[15,"ۖ"],[22,"ۖ"]],"12:66":[[15,"ۖ"]],"12:67":[[11,"ۖ"],[18,"ۖ"],[22,"ۖ"],[24,"ۖ"]],"12:68":[[20,"ۚ"]],"12:69":[[7,"ۖ"]],"12:75":[[8,"ۚ"]],"12:76":[[10,"ۚ"],[13,"ۖ"],[24,"ۚ"],[28,"ۗ"]],"12:77":[[9,"ۚ"],[16,"ۚ"],[20,"ۖ"]],"12:78":[[11,"ۖ"]],"12:80":[[5,"ۖ"],[23,"ۖ"],[34,"ۖ"]],"12:82":[[9,"ۖ"]],"12:83":[[6,"ۖ"],[8,"ۖ"],[14,"ۚ"]],"12:87":[[11,"ۖ"]],"12:88":[[17,"ۖ"]],"12:90":[[4,"ۖ"],[9,"ۖ"],[13,"ۖ"]],"12:92":[[5,"ۖ"],[8,"ۖ"]],"12:94":[[9,"ۖ"]],"12:96":[[9,"ۖ"]],"12:98":[[5,"ۖ"]],"12:100":[[7,"ۖ"],[18,"ۖ"],[37,"ۚ"],[42,"ۚ"]],"12:101":[[9,"ۚ"],[17,"ۖ"]],"12:102":[[6,"ۖ"]],"12:104":[[5,"ۚ"]],"12:108":[[6,"ۚ"],[11,"ۖ"]],"12:109":[[11,"ۗ"],[22,"ۗ"],[27,"ۚ"]],"12:110":[[13,"ۖ"]],"12:111":[[7,"ۗ"]],"13:1":[[1,"ۚ"],[4,"ۗ"]],"13:2":[[7,"ۖ"],[11,"ۖ"],[14,"ۖ"],[18,"ۚ"]],"13:3":[[8,"ۖ"],[15,"ۖ"],[18,"ۚ"]],"13:4":[[21,"ۚ"]],"13:5":[[11,"ۗ"],[15,"ۖ"],[19,"ۖ"],[22,"ۖ"]],"13:6":[[9,"ۗ"],[16,"ۖ"]],"13:7":[[9,"ۗ"],[12,"ۖ"]],"13:8":[[11,"ۚ"]],"13:11":[[11,"ۗ"],[21,"ۗ"],[29,"ۚ"]],"13:14":[[3,"ۚ"],[21,"ۚ"]],"13:16":[[7,"ۚ"],[18,"ۚ"],[28,"ۗ"],[37,"ۚ"]],"13:17":[[11,"ۖ"],[22,"ۚ"],[27,"ۚ"],[31,"ۖ"],[38,"ۚ"]],"13:18":[[4,"ۚ"],[19,"ۚ"],[25,"ۖ"]],"13:19":[[11,"ۚ"]],"13:23":[[9,"ۖ"]],"13:24":[[4,"ۚ"]],"13:26":[[6,"ۚ"]],"13:27":[[9,"ۚ"]],"13:28":[[6,"ۗ"]],"13:30":[[17,"ۚ"]],"13:31":[[14,"ۗ"],[18,"ۗ"],[29,"ۗ"],[46,"ۚ"]],"13:32":[[10,"ۖ"]],"13:33":[[8,"ۗ"],[13,"ۚ"],[24,"ۗ"],[32,"ۗ"]],"13:34":[[5,"ۖ"],[8,"ۖ"]],"13:35":[[5,"ۖ"],[9,"ۖ"],[12,"ۚ"],[16,"ۚ"]],"13:36":[[7,"ۖ"],[12,"ۚ"],[21,"ۚ"]],"13:38":[[9,"ۚ"],[18,"ۗ"]],"13:39":[[5,"ۖ"]],"13:41":[[8,"ۚ"],[13,"ۚ"]],"13:42":[[8,"ۖ"],[13,"ۗ"]],"13:43":[[5,"ۚ"]],"14:1":[[1,"ۚ"]],"14:2":[[9,"ۗ"]],"14:3":[[12,"ۚ"]],"14:4":[[9,"ۖ"],[16,"ۚ"]],"14:5":[[14,"ۚ"]],"14:6":[[20,"ۚ"]],"14:7":[[6,"ۖ"]],"14:9":[[17,"ۚ"]],"14:10":[[8,"ۖ"],[17,"ۚ"]],"14:11":[[16,"ۖ"],[25,"ۚ"]],"14:12":[[9,"ۚ"],[13,"ۚ"]],"14:13":[[11,"ۖ"]],"14:14":[[4,"ۚ"]],"14:17":[[12,"ۖ"]],"14:18":[[4,"ۖ"],[12,"ۖ"],[18,"ۚ"]],"14:19":[[8,"ۚ"]],"14:21":[[20,"ۚ"],[25,"ۖ"]],"14:22":[[12,"ۖ"],[23,"ۖ"],[27,"ۖ"],[39,"ۗ"]],"14:23":[[14,"ۖ"]],"14:25":[[6,"ۗ"]],"14:27":[[11,"ۖ"],[14,"ۚ"]],"14:29":[[2,"ۖ"]],"14:30":[[6,"ۗ"]],"14:32":[[15,"ۖ"],[22,"ۖ"]],"14:33":[[5,"ۖ"]],"14:34":[[5,"ۚ"],[11,"ۗ"]],"14:36":[[6,"ۖ"],[10,"ۖ"]],"14:38":[[7,"ۗ"]],"14:39":[[9,"ۚ"]],"14:40":[[6,"ۚ"]],"14:42":[[7,"ۚ"]],"14:43":[[7,"ۖ"]],"14:44":[[17,"ۗ"]],"14:47":[[6,"ۚ"]],"14:48":[[6,"ۖ"]],"14:51":[[6,"ۚ"]],"15:1":[[1,"ۚ"]],"15:3":[[5,"ۖ"]],"15:25":[[4,"ۚ"]],"15:85":[[8,"ۗ"],[11,"ۖ"]],"15:96":[[6,"ۚ"]],"16:1":[[5,"ۚ"]],"16:3":[[4,"ۚ"]],"16:5":[[2,"ۖ"]],"16:7":[[10,"ۚ"]],"16:8":[[5,"ۚ"]],"16:9":[[6,"ۚ"]],"16:10":[[6,"ۖ"]],"16:11":[[10,"ۚ"]],"16:12":[[6,"ۖ"],[9,"ۚ"]],"16:13":[[7,"ۚ"]],"16:14":[[12,"ۖ"]],"16:16":[[1,"ۚ"]],"16:17":[[5,"ۚ"]],"16:18":[[6,"ۗ"]],"16:21":[[3,"ۖ"]],"16:22":[[3,"ۚ"]],"16:23":[[9,"ۚ"]],"16:25":[[11,"ۗ"]],"16:27":[[11,"ۚ"]],"16:28":[[5,"ۖ"],[12,"ۚ"],[13,"ۚ"]],"16:29":[[5,"ۖ"]],"16:30":[[6,"ۚ"],[8,"ۗ"],[14,"ۚ"],[17,"ۚ"]],"16:31":[[7,"ۖ"],[11,"ۚ"]],"16:33":[[10,"ۚ"],[15,"ۚ"]],"16:35":[[21,"ۚ"],[26,"ۚ"]],"16:36":[[11,"ۖ"],[20,"ۚ"]],"16:37":[[10,"ۖ"]],"16:38":[[9,"ۚ"]],"16:41":[[12,"ۖ"],[15,"ۚ"]],"16:43":[[8,"ۖ"]],"16:44":[[2,"ۗ"]],"16:51":[[6,"ۖ"]],"16:52":[[8,"ۚ"]],"16:53":[[6,"ۖ"]],"16:55":[[3,"ۚ"]],"16:56":[[7,"ۗ"]],"16:59":[[8,"ۚ"],[15,"ۗ"]],"16:60":[[6,"ۖ"],[9,"ۚ"]],"16:61":[[15,"ۖ"]],"16:62":[[4,"ۚ"],[10,"ۚ"]],"16:65":[[10,"ۚ"]],"16:66":[[5,"ۖ"]],"16:67":[[9,"ۚ"]],"16:69":[[9,"ۚ"],[18,"ۚ"]],"16:70":[[4,"ۚ"],[16,"ۚ"]],"16:71":[[7,"ۚ"],[19,"ۚ"]],"16:72":[[15,"ۚ"]],"16:74":[[4,"ۚ"]],"16:75":[[19,"ۖ"],[21,"ۚ"],[23,"ۚ"]],"16:77":[[4,"ۚ"],[13,"ۚ"]],"16:79":[[12,"ۚ"]],"16:81":[[19,"ۚ"]],"16:86":[[14,"ۖ"]],"16:87":[[5,"ۖ"]],"16:89":[[9,"ۖ"],[14,"ۚ"]],"16:90":[[13,"ۚ"]],"16:91":[[15,"ۚ"]],"16:92":[[20,"ۚ"],[24,"ۚ"]],"16:93":[[13,"ۚ"]],"16:95":[[6,"ۚ"]],"16:96":[[7,"ۗ"]],"16:97":[[12,"ۖ"]],"16:101":[[13,"ۚ"]],"16:103":[[7,"ۗ"]],"16:105":[[8,"ۖ"]],"16:108":[[8,"ۖ"]],"16:115":[[12,"ۖ"]],"16:116":[[14,"ۚ"]],"16:118":[[9,"ۖ"]],"16:121":[[2,"ۚ"]],"16:122":[[4,"ۖ"]],"16:123":[[8,"ۖ"]],"16:124":[[7,"ۚ"]],"16:125":[[7,"ۖ"],[11,"ۚ"]],"16:126":[[7,"ۖ"]],"16:127":[[5,"ۚ"]],"17:1":[[17,"ۚ"]],"17:3":[[5,"ۚ"]],"17:5":[[14,"ۚ"]],"17:7":[[4,"ۖ"],[7,"ۚ"]],"17:8":[[4,"ۚ"],[7,"ۚ"]],"17:11":[[5,"ۖ"]],"17:12":[[4,"ۖ"],[19,"ۚ"]],"17:13":[[6,"ۖ"]],"17:15":[[5,"ۖ"],[10,"ۚ"],[15,"ۗ"]],"17:17":[[7,"ۗ"]],"17:20":[[7,"ۚ"]],"17:21":[[6,"ۚ"]],"17:23":[[8,"ۚ"]],"17:25":[[5,"ۚ"]],"17:27":[[5,"ۖ"]],"17:30":[[7,"ۚ"]],"17:31":[[5,"ۖ"],[8,"ۚ"]],"17:32":[[3,"ۖ"]],"17:33":[[8,"ۗ"],[19,"ۖ"]],"17:34":[[11,"ۚ"],[13,"ۖ"]],"17:35":[[7,"ۚ"]],"17:36":[[7,"ۚ"]],"17:37":[[5,"ۖ"]],"17:39":[[7,"ۗ"]],"17:40":[[7,"ۚ"]],"17:44":[[7,"ۚ"],[17,"ۚ"]],"17:46":[[9,"ۚ"]],"17:51":[[6,"ۚ"],[9,"ۖ"],[14,"ۚ"],[20,"ۖ"]],"17:53":[[6,"ۚ"],[10,"ۚ"]],"17:54":[[3,"ۖ"],[10,"ۚ"]],"17:55":[[6,"ۗ"],[12,"ۖ"]],"17:57":[[13,"ۚ"]],"17:58":[[13,"ۚ"]],"17:59":[[10,"ۚ"],[16,"ۚ"]],"17:60":[[7,"ۚ"],[19,"ۚ"]],"17:64":[[14,"ۚ"]],"17:65":[[6,"ۚ"]],"17:66":[[10,"ۚ"]],"17:67":[[10,"ۖ"],[15,"ۚ"]],"17:71":[[5,"ۖ"]],"17:73":[[10,"ۖ"]],"17:76":[[7,"ۖ"]],"17:77":[[7,"ۖ"]],"17:78":[[9,"ۖ"]],"17:81":[[5,"ۚ"]],"17:85":[[3,"ۖ"]],"17:87":[[4,"ۚ"]],"17:93":[[18,"ۗ"]],"17:96":[[6,"ۚ"]],"17:97":[[5,"ۖ"],[13,"ۖ"],[21,"ۖ"],[23,"ۖ"]],"17:100":[[11,"ۚ"]],"17:101":[[6,"ۖ"]],"17:105":[[4,"ۗ"]],"17:107":[[6,"ۚ"]],"17:110":[[6,"ۖ"],[12,"ۚ"]],"17:111":[[19,"ۖ"]],"18:5":[[7,"ۚ"],[12,"ۚ"]],"18:13":[[5,"ۚ"]],"18:14":[[15,"ۖ"]],"18:15":[[6,"ۖ"],[11,"ۖ"]],"18:17":[[18,"ۚ"],[22,"ۗ"],[27,"ۖ"]],"18:18":[[4,"ۚ"],[9,"ۖ"],[13,"ۚ"]],"18:19":[[4,"ۚ"],[9,"ۖ"],[15,"ۚ"]],"18:21":[[17,"ۖ"],[21,"ۖ"],[24,"ۚ"]],"18:22":[[10,"ۖ"],[14,"ۚ"],[22,"ۗ"]],"18:24":[[4,"ۚ"]],"18:26":[[5,"ۖ"],[9,"ۖ"],[12,"ۚ"]],"18:27":[[7,"ۖ"]],"18:28":[[10,"ۖ"],[18,"ۖ"]],"18:29":[[4,"ۖ"],[10,"ۚ"],[17,"ۚ"],[24,"ۚ"]],"18:31":[[24,"ۚ"]],"18:33":[[8,"ۚ"]],"18:39":[[12,"ۚ"]],"18:44":[[4,"ۚ"]],"18:45":[[17,"ۗ"]],"18:46":[[5,"ۖ"]],"18:48":[[10,"ۚ"]],"18:49":[[19,"ۚ"],[23,"ۗ"]],"18:50":[[15,"ۗ"],[23,"ۚ"]],"18:54":[[9,"ۚ"]],"18:56":[[6,"ۚ"],[13,"ۖ"]],"18:57":[[12,"ۚ"],[22,"ۖ"]],"18:58":[[4,"ۖ"],[11,"ۚ"]],"18:63":[[15,"ۚ"]],"18:64":[[5,"ۚ"]],"18:71":[[7,"ۖ"]],"18:76":[[8,"ۖ"]],"18:77":[[18,"ۖ"]],"18:78":[[5,"ۚ"]],"18:82":[[24,"ۚ"],[28,"ۚ"]],"18:83":[[4,"ۖ"]],"18:86":[[13,"ۖ"]],"18:88":[[8,"ۖ"]],"18:91":[[1,"ۖ"]],"18:96":[[3,"ۖ"],[10,"ۖ"]],"18:98":[[5,"ۖ"],[11,"ۖ"]],"18:99":[[6,"ۖ"]],"18:102":[[9,"ۚ"]],"18:110":[[11,"ۖ"]],"19:6":[[5,"ۖ"]],"19:10":[[5,"ۖ"]],"19:12":[[4,"ۖ"]],"19:13":[[4,"ۖ"]],"19:21":[[7,"ۖ"],[12,"ۚ"]],"19:26":[[4,"ۖ"]],"19:27":[[4,"ۖ"]],"19:29":[[2,"ۖ"]],"19:34":[[4,"ۖ"]],"19:35":[[7,"ۖ"],[8,"ۚ"]],"19:36":[[5,"ۚ"]],"19:37":[[4,"ۖ"]],"19:41":[[4,"ۚ"]],"19:44":[[4,"ۖ"]],"19:46":[[6,"ۖ"],[10,"ۖ"]],"19:47":[[3,"ۖ"],[6,"ۖ"]],"19:49":[[11,"ۖ"]],"19:51":[[4,"ۚ"]],"19:54":[[4,"ۚ"]],"19:56":[[4,"ۚ"]],"19:58":[[21,"ۚ"]],"19:59":[[8,"ۖ"]],"19:61":[[7,"ۚ"]],"19:62":[[6,"ۖ"]],"19:64":[[5,"ۖ"],[14,"ۚ"]],"19:65":[[8,"ۚ"]],"19:71":[[4,"ۚ"]],"19:75":[[9,"ۚ"]],"19:76":[[5,"ۗ"]],"19:79":[[1,"ۚ"]],"19:82":[[1,"ۚ"]],"19:84":[[3,"ۖ"]],"20:8":[[5,"ۖ"]],"20:21":[[4,"ۖ"]],"20:39":[[15,"ۚ"]],"20:40":[[9,"ۖ"],[17,"ۚ"],[24,"ۚ"]],"20:46":[[3,"ۖ"]],"20:47":[[11,"ۖ"],[16,"ۖ"]],"20:52":[[6,"ۖ"]],"20:54":[[3,"ۚ"]],"20:61":[[11,"ۖ"]],"20:64":[[5,"ۚ"]],"20:66":[[3,"ۖ"]],"20:69":[[7,"ۖ"],[11,"ۖ"]],"20:71":[[7,"ۖ"],[12,"ۖ"]],"20:72":[[10,"ۖ"],[14,"ۖ"]],"20:73":[[11,"ۗ"]],"20:76":[[8,"ۚ"]],"20:81":[[11,"ۖ"]],"20:86":[[6,"ۚ"],[13,"ۚ"]],"20:90":[[10,"ۖ"]],"20:93":[[2,"ۖ"]],"20:94":[[7,"ۖ"]],"20:97":[[10,"ۖ"],[15,"ۖ"],[22,"ۖ"]],"20:98":[[8,"ۚ"]],"20:99":[[8,"ۚ"]],"20:101":[[2,"ۖ"]],"20:102":[[4,"ۚ"]],"20:108":[[6,"ۖ"]],"20:111":[[4,"ۖ"]],"20:114":[[4,"ۗ"],[13,"ۖ"]],"20:121":[[11,"ۚ"]],"20:123":[[4,"ۖ"],[7,"ۖ"]],"20:126":[[5,"ۖ"]],"20:127":[[8,"ۚ"]],"20:128":[[11,"ۚ"]],"20:130":[[12,"ۖ"]],"20:131":[[14,"ۚ"]],"20:132":[[5,"ۖ"],[8,"ۖ"],[10,"ۗ"]],"20:133":[[6,"ۚ"]],"20:135":[[4,"ۖ"]],"21:3":[[2,"ۗ"],[11,"ۖ"]],"21:4":[[7,"ۖ"]],"21:6":[[6,"ۖ"]],"21:7":[[7,"ۖ"]],"21:10":[[6,"ۚ"]],"21:18":[[9,"ۚ"]],"21:19":[[5,"ۚ"]],"21:22":[[7,"ۚ"]],"21:24":[[5,"ۖ"],[8,"ۖ"],[15,"ۚ"],[20,"ۖ"]],"21:26":[[4,"ۗ"],[5,"ۚ"]],"21:29":[[10,"ۚ"]],"21:30":[[10,"ۖ"],[16,"ۚ"]],"21:32":[[4,"ۖ"]],"21:33":[[7,"ۖ"]],"21:34":[[6,"ۖ"]],"21:35":[[4,"ۗ"],[8,"ۖ"]],"21:37":[[4,"ۚ"]],"21:42":[[7,"ۚ"]],"21:43":[[6,"ۚ"]],"21:44":[[8,"ۗ"],[16,"ۚ"]],"21:45":[[4,"ۚ"]],"21:47":[[9,"ۖ"],[17,"ۗ"]],"21:50":[[4,"ۚ"]],"21:67":[[7,"ۚ"]],"21:72":[[5,"ۖ"]],"21:73":[[12,"ۖ"]],"21:74":[[11,"ۚ"]],"21:75":[[3,"ۖ"]],"21:77":[[6,"ۚ"]],"21:79":[[2,"ۚ"],[6,"ۚ"],[12,"ۚ"]],"21:80":[[7,"ۖ"]],"21:81":[[10,"ۚ"]],"21:82":[[9,"ۖ"]],"21:84":[[7,"ۖ"]],"21:85":[[4,"ۖ"]],"21:86":[[3,"ۖ"]],"21:88":[[5,"ۚ"]],"21:90":[[8,"ۚ"],[16,"ۖ"]],"21:93":[[3,"ۖ"]],"21:99":[[6,"ۖ"]],"21:102":[[3,"ۖ"]],"21:104":[[6,"ۚ"],[11,"ۚ"],[13,"ۚ"]],"21:108":[[8,"ۖ"]],"21:109":[[6,"ۖ"]],"21:112":[[4,"ۗ"]],"22:1":[[4,"ۚ"]],"22:5":[[26,"ۚ"],[40,"ۖ"],[55,"ۚ"]],"22:9":[[6,"ۖ"],[10,"ۖ"]],"22:11":[[7,"ۖ"],[12,"ۖ"],[21,"ۚ"]],"22:12":[[10,"ۚ"]],"22:13":[[6,"ۚ"]],"22:14":[[12,"ۚ"]],"22:17":[[16,"ۚ"]],"22:18":[[21,"ۖ"],[25,"ۗ"],[32,"ۚ"]],"22:19":[[5,"ۖ"]],"22:23":[[19,"ۖ"]],"22:25":[[16,"ۚ"]],"22:28":[[15,"ۖ"]],"22:30":[[1,"ۖ"],[10,"ۗ"],[17,"ۖ"]],"22:31":[[5,"ۚ"]],"22:32":[[1,"ۖ"]],"22:34":[[13,"ۗ"],[18,"ۗ"]],"22:36":[[9,"ۖ"],[14,"ۖ"],[22,"ۚ"]],"22:37":[[10,"ۚ"],[18,"ۗ"]],"22:38":[[6,"ۗ"]],"22:39":[[5,"ۚ"]],"22:40":[[11,"ۗ"],[27,"ۗ"],[31,"ۚ"]],"22:41":[[14,"ۗ"]],"22:44":[[2,"ۖ"],[4,"ۖ"],[8,"ۖ"]],"22:46":[[13,"ۖ"]],"22:47":[[6,"ۚ"]],"22:52":[[24,"ۗ"]],"22:53":[[11,"ۗ"]],"22:54":[[13,"ۗ"]],"22:56":[[5,"ۚ"]],"22:58":[[13,"ۚ"]],"22:59":[[3,"ۚ"]],"22:60":[[1,"ۖ"],[12,"ۚ"]],"22:63":[[11,"ۚ"]],"22:64":[[7,"ۚ"]],"22:65":[[22,"ۚ"]],"22:66":[[7,"ۗ"]],"22:67":[[6,"ۖ"],[10,"ۚ"],[13,"ۖ"]],"22:70":[[9,"ۚ"],[13,"ۚ"]],"22:71":[[14,"ۗ"]],"22:72":[[11,"ۖ"],[17,"ۗ"],[22,"ۚ"],[27,"ۖ"]],"22:73":[[6,"ۚ"],[18,"ۖ"],[25,"ۚ"]],"22:74":[[5,"ۚ"]],"22:75":[[7,"ۚ"]],"22:76":[[6,"ۚ"]],"22:78":[[5,"ۚ"],[14,"ۚ"],[17,"ۚ"],[32,"ۚ"],[40,"ۖ"]],"23:14":[[17,"ۚ"]],"23:18":[[8,"ۖ"]],"23:21":[[5,"ۖ"]],"23:23":[[14,"ۚ"]],"23:27":[[25,"ۖ"]],"23:32":[[12,"ۚ"]],"23:41":[[5,"ۚ"]],"23:44":[[4,"ۖ"],[10,"ۖ"],[15,"ۚ"]],"23:51":[[7,"ۖ"]],"23:53":[[4,"ۖ"]],"23:56":[[4,"ۚ"]],"23:62":[[5,"ۚ"]],"23:65":[[3,"ۖ"]],"23:70":[[4,"ۚ"]],"23:71":[[9,"ۚ"]],"23:72":[[6,"ۖ"]],"23:78":[[7,"ۚ"]],"23:80":[[8,"ۚ"]],"23:85":[[2,"ۚ"]],"23:87":[[2,"ۚ"]],"23:89":[[2,"ۚ"]],"23:91":[[10,"ۚ"],[20,"ۚ"]],"23:96":[[5,"ۚ"]],"23:100":[[5,"ۚ"],[6,"ۚ"],[10,"ۖ"]],"23:114":[[5,"ۖ"]],"23:116":[[4,"ۖ"]],"23:117":[[14,"ۚ"]],"24:2":[[8,"ۖ"],[21,"ۖ"]],"24:3":[[14,"ۚ"]],"24:4":[[16,"ۚ"]],"24:11":[[6,"ۚ"],[10,"ۖ"],[14,"ۚ"],[21,"ۚ"]],"24:13":[[5,"ۚ"]],"24:18":[[4,"ۚ"]],"24:19":[[15,"ۚ"]],"24:21":[[7,"ۚ"],[15,"ۚ"],[31,"ۗ"]],"24:22":[[15,"ۖ"],[17,"ۗ"],[23,"ۚ"]],"24:26":[[4,"ۖ"],[8,"ۚ"],[12,"ۖ"]],"24:27":[[13,"ۚ"]],"24:28":[[10,"ۖ"],[15,"ۖ"],[18,"ۚ"]],"24:29":[[11,"ۚ"]],"24:30":[[7,"ۚ"],[10,"ۚ"]],"24:31":[[14,"ۖ"],[18,"ۖ"],[62,"ۖ"],[70,"ۚ"]],"24:32":[[7,"ۚ"],[14,"ۗ"]],"24:33":[[10,"ۗ"],[21,"ۖ"],[27,"ۚ"],[39,"ۚ"]],"24:35":[[4,"ۚ"],[9,"ۖ"],[12,"ۖ"],[32,"ۚ"],[35,"ۚ"],[40,"ۚ"],[44,"ۗ"]],"24:38":[[8,"ۗ"]],"24:39":[[19,"ۗ"]],"24:40":[[13,"ۚ"],[23,"ۗ"]],"24:41":[[12,"ۖ"],[17,"ۗ"]],"24:42":[[4,"ۖ"]],"24:43":[[33,"ۖ"]],"24:44":[[4,"ۚ"]],"24:45":[[6,"ۖ"],[21,"ۚ"],[25,"ۚ"]],"24:46":[[4,"ۚ"]],"24:47":[[12,"ۚ"]],"24:50":[[12,"ۚ"]],"24:51":[[15,"ۚ"]],"24:53":[[7,"ۖ"],[10,"ۖ"],[12,"ۚ"]],"24:54":[[5,"ۖ"],[14,"ۖ"],[17,"ۚ"]],"24:55":[[26,"ۚ"],[31,"ۚ"]],"24:57":[[7,"ۚ"],[9,"ۖ"]],"24:58":[[14,"ۚ"],[27,"ۚ"],[30,"ۚ"],[36,"ۚ"],[41,"ۚ"],[46,"ۗ"]],"24:59":[[11,"ۚ"],[16,"ۗ"]],"24:60":[[16,"ۖ"],[20,"ۗ"]],"24:61":[[49,"ۚ"],[57,"ۚ"],[69,"ۚ"]],"24:62":[[16,"ۚ"],[24,"ۚ"],[35,"ۚ"]],"24:63":[[8,"ۚ"],[15,"ۚ"]],"24:64":[[7,"ۖ"],[18,"ۗ"]],"25:4":[[12,"ۖ"]],"25:6":[[8,"ۚ"]],"25:8":[[10,"ۚ"]],"25:11":[[3,"ۖ"]],"25:15":[[9,"ۚ"]],"25:16":[[5,"ۚ"]],"25:19":[[9,"ۚ"]],"25:20":[[12,"ۗ"],[17,"ۗ"]],"25:21":[[12,"ۗ"]],"25:26":[[4,"ۚ"]],"25:29":[[7,"ۗ"]],"25:31":[[7,"ۗ"]],"25:32":[[9,"ۚ"],[13,"ۖ"]],"25:37":[[9,"ۖ"]],"25:39":[[4,"ۖ"]],"25:40":[[8,"ۚ"],[11,"ۚ"]],"25:42":[[9,"ۚ"]],"25:44":[[7,"ۚ"]],"25:48":[[8,"ۚ"]],"25:54":[[9,"ۗ"]],"25:55":[[9,"ۗ"]],"25:58":[[8,"ۚ"]],"25:59":[[13,"ۖ"]],"25:65":[[7,"ۖ"]],"25:68":[[17,"ۚ"]],"25:70":[[12,"ۗ"]],"25:76":[[2,"ۚ"]],"25:77":[[7,"ۖ"]],"26:8":[[4,"ۖ"]],"26:11":[[2,"ۚ"]],"26:15":[[2,"ۖ"],[4,"ۖ"]],"26:24":[[6,"ۖ"]],"26:28":[[6,"ۖ"]],"26:49":[[7,"ۖ"],[14,"ۚ"]],"26:50":[[3,"ۖ"]],"26:59":[[1,"ۖ"]],"26:62":[[2,"ۖ"]],"26:63":[[7,"ۖ"]],"26:67":[[4,"ۖ"]],"26:103":[[4,"ۖ"]],"26:109":[[5,"ۖ"]],"26:113":[[5,"ۖ"]],"26:121":[[4,"ۖ"]],"26:127":[[5,"ۖ"]],"26:139":[[2,"ۚ"],[6,"ۖ"]],"26:145":[[5,"ۖ"]],"26:158":[[2,"ۚ"],[6,"ۖ"]],"26:164":[[5,"ۖ"]],"26:166":[[7,"ۚ"]],"26:173":[[3,"ۖ"]],"26:174":[[4,"ۖ"]],"26:180":[[5,"ۖ"]],"26:189":[[5,"ۚ"]],"26:190":[[4,"ۖ"]],"26:227":[[13,"ۗ"]],"27:1":[[1,"ۚ"]],"27:10":[[2,"ۚ"],[11,"ۚ"]],"27:12":[[9,"ۖ"],[15,"ۚ"]],"27:14":[[6,"ۚ"]],"27:15":[[5,"ۖ"]],"27:16":[[3,"ۖ"],[13,"ۖ"]],"27:34":[[11,"ۚ"]],"27:36":[[12,"ۚ"]],"27:39":[[12,"ۖ"]],"27:40":[[14,"ۚ"],[27,"ۖ"],[32,"ۖ"]],"27:42":[[5,"ۖ"],[8,"ۚ"]],"27:43":[[7,"ۖ"]],"27:44":[[4,"ۖ"],[11,"ۚ"],[17,"ۗ"]],"27:46":[[7,"ۖ"]],"27:47":[[5,"ۚ"],[9,"ۖ"]],"27:52":[[5,"ۚ"]],"27:55":[[7,"ۚ"]],"27:56":[[12,"ۖ"]],"27:58":[[3,"ۖ"]],"27:59":[[8,"ۗ"]],"27:60":[[20,"ۗ"],[23,"ۚ"]],"27:61":[[14,"ۗ"],[17,"ۚ"]],"27:62":[[10,"ۗ"],[13,"ۚ"]],"27:63":[[13,"ۗ"],[16,"ۚ"]],"27:64":[[10,"ۗ"],[13,"ۚ"]],"27:65":[[10,"ۚ"]],"27:66":[[5,"ۚ"],[10,"ۖ"]],"27:78":[[5,"ۚ"]],"27:79":[[3,"ۖ"]],"27:81":[[6,"ۖ"]],"27:86":[[9,"ۚ"]],"27:87":[[15,"ۚ"]],"27:88":[[8,"ۚ"],[14,"ۚ"]],"27:91":[[12,"ۖ"]],"27:92":[[3,"ۖ"],[8,"ۖ"]],"27:93":[[6,"ۚ"]],"28:4":[[15,"ۚ"]],"28:7":[[6,"ۖ"],[16,"ۖ"]],"28:8":[[7,"ۗ"]],"28:9":[[7,"ۖ"]],"28:10":[[5,"ۖ"]],"28:11":[[3,"ۖ"]],"28:14":[[7,"ۚ"]],"28:15":[[17,"ۖ"],[29,"ۖ"],[34,"ۖ"]],"28:16":[[9,"ۚ"]],"28:18":[[10,"ۚ"]],"28:19":[[18,"ۖ"]],"28:21":[[4,"ۖ"]],"28:23":[[15,"ۖ"],[18,"ۖ"],[24,"ۖ"]],"28:25":[[14,"ۚ"],[22,"ۖ"]],"28:26":[[4,"ۖ"]],"28:27":[[13,"ۖ"],[18,"ۖ"],[23,"ۚ"]],"28:28":[[4,"ۖ"],[10,"ۖ"]],"28:29":[[11,"ۖ"]],"28:31":[[3,"ۚ"],[12,"ۚ"],[16,"ۖ"]],"28:32":[[14,"ۖ"],[21,"ۚ"]],"28:34":[[10,"ۖ"]],"28:35":[[11,"ۚ"]],"28:37":[[14,"ۚ"]],"28:40":[[5,"ۖ"]],"28:41":[[5,"ۖ"]],"28:42":[[5,"ۖ"]],"28:45":[[6,"ۚ"]],"28:48":[[12,"ۚ"],[19,"ۖ"]],"28:50":[[8,"ۚ"],[17,"ۚ"]],"28:56":[[10,"ۚ"]],"28:57":[[8,"ۚ"]],"28:58":[[6,"ۖ"],[14,"ۖ"]],"28:59":[[13,"ۚ"]],"28:60":[[8,"ۚ"],[13,"ۚ"]],"28:63":[[12,"ۖ"],[14,"ۖ"]],"28:64":[[9,"ۚ"]],"28:68":[[5,"ۗ"],[9,"ۚ"]],"28:70":[[6,"ۖ"],[11,"ۖ"]],"28:71":[[17,"ۚ"]],"28:72":[[19,"ۚ"]],"28:76":[[8,"ۖ"],[24,"ۖ"]],"28:77":[[6,"ۖ"],[11,"ۖ"],[16,"ۖ"],[21,"ۖ"]],"28:78":[[6,"ۚ"],[23,"ۚ"]],"28:79":[[5,"ۖ"]],"28:80":[[12,"ۚ"]],"28:82":[[15,"ۖ"],[22,"ۖ"]],"28:83":[[12,"ۚ"]],"28:84":[[6,"ۖ"]],"28:85":[[8,"ۚ"]],"28:86":[[11,"ۖ"]],"28:87":[[9,"ۖ"],[12,"ۖ"]],"28:88":[[6,"ۘ"],[10,"ۚ"],[15,"ۚ"]],"29:3":[[5,"ۖ"]],"29:4":[[7,"ۚ"]],"29:5":[[9,"ۚ"]],"29:6":[[5,"ۚ"]],"29:8":[[4,"ۖ"],[15,"ۚ"]],"29:10":[[15,"ۖ"],[24,"ۚ"]],"29:12":[[16,"ۖ"]],"29:13":[[5,"ۖ"]],"29:16":[[7,"ۖ"]],"29:17":[[8,"ۚ"],[25,"ۖ"]],"29:18":[[7,"ۖ"]],"29:19":[[8,"ۚ"]],"29:20":[[8,"ۚ"],[13,"ۚ"]],"29:21":[[6,"ۖ"]],"29:22":[[8,"ۖ"]],"29:24":[[14,"ۚ"]],"29:25":[[12,"ۖ"]],"29:26":[[3,"ۘ"],[8,"ۖ"]],"29:27":[[13,"ۖ"]],"29:29":[[9,"ۖ"]],"29:31":[[11,"ۖ"]],"29:32":[[4,"ۚ"],[9,"ۖ"]],"29:33":[[10,"ۖ"]],"29:38":[[7,"ۖ"]],"29:39":[[3,"ۖ"]],"29:40":[[3,"ۖ"],[20,"ۚ"]],"29:41":[[11,"ۖ"],[16,"ۚ"]],"29:42":[[9,"ۚ"]],"29:43":[[4,"ۖ"]],"29:44":[[5,"ۚ"]],"29:45":[[8,"ۖ"],[14,"ۗ"],[17,"ۗ"]],"29:46":[[12,"ۖ"]],"29:47":[[4,"ۚ"],[9,"ۖ"],[14,"ۚ"]],"29:48":[[10,"ۖ"]],"29:49":[[9,"ۚ"]],"29:50":[[7,"ۚ"]],"29:51":[[8,"ۚ"]],"29:52":[[6,"ۖ"],[11,"ۗ"]],"29:53":[[7,"ۚ"]],"29:57":[[4,"ۖ"]],"29:58":[[14,"ۚ"]],"29:60":[[9,"ۚ"]],"29:61":[[11,"ۖ"]],"29:62":[[9,"ۚ"]],"29:63":[[15,"ۚ"],[18,"ۚ"]],"29:64":[[7,"ۚ"],[12,"ۚ"]],"29:66":[[4,"ۚ"]],"29:67":[[10,"ۚ"]],"29:68":[[12,"ۚ"]],"29:69":[[5,"ۚ"]],"30:4":[[3,"ۗ"],[9,"ۚ"]],"30:5":[[2,"ۚ"],[5,"ۖ"]],"30:6":[[2,"ۖ"]],"30:8":[[4,"ۗ"],[15,"ۗ"]],"30:9":[[11,"ۚ"],[24,"ۖ"]],"30:19":[[12,"ۚ"]],"30:21":[[14,"ۚ"]],"30:22":[[8,"ۚ"]],"30:23":[[8,"ۚ"]],"30:24":[[15,"ۚ"]],"30:25":[[7,"ۚ"]],"30:26":[[5,"ۖ"]],"30:27":[[9,"ۚ"],[15,"ۚ"]],"30:28":[[5,"ۖ"],[22,"ۚ"]],"30:29":[[7,"ۖ"],[12,"ۖ"]],"30:30":[[4,"ۚ"],[10,"ۚ"],[14,"ۚ"]],"30:32":[[6,"ۖ"]],"30:34":[[3,"ۚ"]],"30:36":[[6,"ۖ"]],"30:37":[[9,"ۚ"]],"30:38":[[7,"ۚ"],[13,"ۖ"]],"30:39":[[12,"ۖ"]],"30:40":[[9,"ۖ"],[18,"ۚ"]],"30:42":[[11,"ۚ"]],"30:43":[[14,"ۖ"]],"30:44":[[4,"ۖ"]],"30:45":[[7,"ۚ"]],"30:47":[[13,"ۖ"]],"30:48":[[18,"ۖ"]],"30:50":[[10,"ۚ"],[14,"ۖ"]],"30:53":[[6,"ۖ"]],"30:54":[[18,"ۚ"],[21,"ۚ"]],"30:55":[[9,"ۚ"]],"30:56":[[13,"ۖ"]],"30:58":[[9,"ۚ"]],"30:60":[[5,"ۖ"]],"31:5":[[5,"ۖ"]],"31:6":[[14,"ۚ"]],"31:7":[[13,"ۖ"]],"31:9":[[2,"ۖ"],[5,"ۚ"]],"31:10":[[5,"ۖ"],[17,"ۚ"]],"31:11":[[9,"ۚ"]],"31:12":[[7,"ۚ"],[12,"ۖ"]],"31:13":[[10,"ۖ"]],"31:15":[[13,"ۖ"],[17,"ۖ"],[22,"ۚ"]],"31:16":[[20,"ۚ"]],"31:17":[[12,"ۖ"]],"31:18":[[9,"ۖ"]],"31:19":[[6,"ۚ"]],"31:20":[[17,"ۗ"]],"31:21":[[14,"ۚ"]],"31:22":[[11,"ۗ"]],"31:23":[[5,"ۚ"],[10,"ۚ"]],"31:25":[[8,"ۚ"],[11,"ۚ"]],"31:26":[[5,"ۚ"]],"31:27":[[17,"ۚ"]],"31:28":[[7,"ۚ"]],"31:29":[[15,"ۖ"]],"31:31":[[12,"ۚ"]],"31:32":[[15,"ۚ"]],"31:33":[[18,"ۚ"],[22,"ۖ"]],"31:34":[[11,"ۖ"],[17,"ۖ"],[23,"ۚ"]],"32:3":[[3,"ۚ"]],"32:4":[[14,"ۖ"],[22,"ۚ"]],"32:7":[[5,"ۖ"]],"32:9":[[6,"ۖ"],[11,"ۚ"]],"32:10":[[9,"ۚ"]],"32:14":[[8,"ۖ"]],"32:18":[[6,"ۚ"]],"32:20":[[5,"ۖ"]],"32:22":[[9,"ۚ"]],"32:23":[[10,"ۖ"]],"32:24":[[7,"ۖ"]],"32:26":[[12,"ۚ"],[16,"ۚ"]],"32:27":[[15,"ۚ"]],"33:1":[[8,"ۚ"]],"33:2":[[6,"ۚ"]],"33:3":[[3,"ۚ"]],"33:4":[[8,"ۚ"],[15,"ۚ"],[19,"ۚ"],[22,"ۖ"]],"33:5":[[6,"ۚ"],[14,"ۚ"],[24,"ۚ"]],"33:6":[[5,"ۖ"],[7,"ۗ"],[24,"ۚ"]],"33:7":[[13,"ۖ"]],"33:8":[[4,"ۚ"]],"33:9":[[16,"ۚ"]],"33:13":[[10,"ۚ"],[21,"ۖ"]],"33:15":[[9,"ۚ"]],"33:17":[[15,"ۚ"]],"33:18":[[9,"ۖ"]],"33:19":[[2,"ۖ"],[15,"ۖ"],[24,"ۚ"],[30,"ۚ"]],"33:20":[[4,"ۖ"],[16,"ۖ"]],"33:22":[[13,"ۚ"]],"33:23":[[8,"ۖ"],[15,"ۖ"]],"33:24":[[11,"ۚ"]],"33:25":[[8,"ۚ"],[12,"ۚ"]],"33:27":[[7,"ۚ"]],"33:30":[[11,"ۚ"]],"33:32":[[8,"ۚ"]],"33:33":[[8,"ۖ"],[15,"ۚ"]],"33:34":[[9,"ۚ"]],"33:36":[[16,"ۗ"]],"33:37":[[25,"ۖ"],[44,"ۚ"]],"33:38":[[10,"ۖ"],[17,"ۚ"]],"33:39":[[10,"ۗ"]],"33:40":[[12,"ۗ"]],"33:43":[[10,"ۚ"]],"33:44":[[4,"ۚ"]],"33:48":[[9,"ۚ"]],"33:49":[[18,"ۖ"]],"33:50":[[43,"ۗ"],[57,"ۗ"]],"33:51":[[8,"ۖ"],[15,"ۚ"],[26,"ۚ"],[31,"ۚ"]],"33:52":[[19,"ۗ"]],"33:53":[[26,"ۚ"],[33,"ۖ"],[38,"ۚ"],[45,"ۚ"],[49,"ۚ"],[63,"ۚ"]],"33:55":[[21,"ۗ"],[23,"ۚ"]],"33:56":[[6,"ۚ"]],"33:59":[[11,"ۚ"],[17,"ۗ"]],"33:61":[[1,"ۖ"]],"33:62":[[7,"ۖ"]],"33:63":[[4,"ۖ"],[9,"ۚ"]],"33:65":[[3,"ۖ"]],"33:69":[[12,"ۚ"]],"33:71":[[6,"ۗ"]],"33:72":[[14,"ۖ"]],"33:73":[[11,"ۗ"]],"34:1":[[14,"ۚ"]],"34:2":[[15,"ۚ"]],"34:3":[[6,"ۖ"],[12,"ۖ"]],"34:4":[[5,"ۚ"]],"34:8":[[7,"ۗ"]],"34:9":[[11,"ۚ"],[22,"ۚ"]],"34:10":[[5,"ۖ"],[9,"ۖ"]],"34:11":[[6,"ۖ"],[8,"ۖ"]],"34:12":[[6,"ۖ"],[10,"ۖ"],[18,"ۖ"]],"34:13":[[11,"ۚ"],[15,"ۚ"]],"34:14":[[13,"ۖ"]],"34:15":[[6,"ۖ"],[10,"ۖ"],[16,"ۚ"]],"34:17":[[4,"ۖ"]],"34:18":[[12,"ۖ"]],"34:19":[[12,"ۚ"]],"34:21":[[16,"ۗ"]],"34:23":[[8,"ۚ"],[17,"ۖ"],[19,"ۖ"]],"34:24":[[6,"ۖ"],[8,"ۖ"]],"34:27":[[6,"ۖ"],[7,"ۚ"]],"34:31":[[11,"ۗ"]],"34:32":[[12,"ۖ"]],"34:33":[[17,"ۚ"],[22,"ۚ"],[28,"ۖ"]],"34:39":[[11,"ۚ"],[17,"ۖ"]],"34:41":[[6,"ۖ"],[10,"ۖ"]],"34:43":[[23,"ۚ"]],"34:44":[[5,"ۖ"]],"34:45":[[11,"ۖ"]],"34:46":[[4,"ۖ"],[11,"ۚ"],[15,"ۚ"]],"34:47":[[7,"ۖ"],[12,"ۖ"]],"34:50":[[7,"ۖ"],[13,"ۚ"]],"34:53":[[5,"ۖ"]],"34:54":[[10,"ۚ"]],"35:1":[[13,"ۚ"],[18,"ۚ"]],"35:2":[[9,"ۖ"],[16,"ۚ"]],"35:3":[[6,"ۚ"],[15,"ۚ"],[19,"ۖ"]],"35:4":[[7,"ۚ"]],"35:5":[[6,"ۖ"]],"35:6":[[6,"ۚ"]],"35:7":[[5,"ۖ"]],"35:8":[[7,"ۖ"],[15,"ۖ"],[20,"ۚ"]],"35:9":[[15,"ۚ"]],"35:10":[[7,"ۚ"],[14,"ۚ"],[20,"ۖ"]],"35:11":[[10,"ۚ"],[18,"ۚ"],[29,"ۚ"]],"35:12":[[11,"ۖ"],[19,"ۖ"]],"35:13":[[11,"ۖ"],[15,"ۚ"],[20,"ۚ"]],"35:14":[[10,"ۖ"],[14,"ۚ"]],"35:15":[[6,"ۖ"]],"35:18":[[5,"ۚ"],[18,"ۗ"],[26,"ۚ"],[31,"ۚ"]],"35:22":[[5,"ۚ"],[10,"ۖ"]],"35:24":[[5,"ۚ"]],"35:26":[[4,"ۖ"]],"35:27":[[13,"ۚ"]],"35:28":[[7,"ۗ"],[13,"ۗ"]],"35:30":[[5,"ۚ"]],"35:31":[[11,"ۗ"]],"35:32":[[7,"ۖ"],[17,"ۚ"]],"35:33":[[10,"ۖ"]],"35:34":[[7,"ۖ"]],"35:36":[[14,"ۚ"]],"35:37":[[11,"ۚ"],[20,"ۖ"]],"35:38":[[6,"ۚ"]],"35:39":[[6,"ۚ"],[10,"ۖ"],[18,"ۖ"]],"35:40":[[25,"ۚ"]],"35:41":[[7,"ۚ"],[15,"ۚ"]],"35:42":[[12,"ۖ"]],"35:43":[[5,"ۚ"],[11,"ۚ"],[16,"ۚ"],[21,"ۖ"]],"35:44":[[15,"ۚ"],[26,"ۚ"]],"35:45":[[17,"ۖ"]],"36:11":[[8,"ۖ"]],"36:12":[[8,"ۚ"]],"36:18":[[4,"ۖ"]],"36:19":[[5,"ۚ"]],"36:26":[[3,"ۖ"]],"36:30":[[3,"ۚ"]],"36:35":[[6,"ۚ"]],"36:38":[[4,"ۚ"]],"36:40":[[11,"ۚ"]],"36:52":[[6,"ۗ"]],"36:60":[[9,"ۖ"]],"36:61":[[2,"ۚ"]],"36:62":[[5,"ۖ"]],"36:68":[[5,"ۚ"]],"36:69":[[6,"ۚ"]],"36:73":[[4,"ۚ"]],"36:76":[[3,"ۘ"]],"36:78":[[5,"ۖ"]],"36:79":[[6,"ۖ"]],"36:81":[[10,"ۚ"]],"37:9":[[1,"ۖ"]],"37:11":[[7,"ۚ"]],"37:24":[[1,"ۖ"]],"37:30":[[6,"ۖ"]],"37:31":[[4,"ۖ"]],"37:102":[[15,"ۚ"],[20,"ۖ"]],"37:105":[[3,"ۚ"]],"37:113":[[4,"ۚ"]],"37:138":[[1,"ۚ"]],"37:158":[[5,"ۚ"]],"37:170":[[2,"ۖ"]],"38:1":[[1,"ۚ"]],"38:4":[[5,"ۖ"]],"38:5":[[4,"ۖ"]],"38:6":[[8,"ۖ"]],"38:8":[[5,"ۚ"],[11,"ۚ"]],"38:10":[[7,"ۖ"]],"38:13":[[5,"ۚ"]],"38:17":[[9,"ۖ"]],"38:19":[[2,"ۖ"]],"38:22":[[6,"ۖ"],[9,"ۖ"]],"38:24":[[7,"ۖ"],[23,"ۗ"]],"38:25":[[3,"ۖ"]],"38:26":[[17,"ۚ"]],"38:27":[[7,"ۚ"],[11,"ۚ"]],"38:30":[[3,"ۚ"]],"38:33":[[2,"ۖ"]],"38:35":[[12,"ۖ"]],"38:42":[[2,"ۖ"]],"38:44":[[7,"ۗ"],[10,"ۚ"]],"38:48":[[5,"ۖ"]],"38:49":[[2,"ۚ"]],"38:55":[[1,"ۚ"]],"38:59":[[7,"ۚ"]],"38:60":[[6,"ۖ"],[9,"ۖ"]],"38:65":[[4,"ۖ"]],"38:75":[[9,"ۖ"]],"39:3":[[4,"ۚ"],[25,"ۗ"]],"39:4":[[11,"ۚ"],[12,"ۖ"]],"39:5":[[4,"ۖ"],[12,"ۖ"],[15,"ۖ"],[19,"ۗ"]],"39:6":[[14,"ۚ"],[25,"ۚ"],[30,"ۖ"],[34,"ۖ"]],"39:7":[[6,"ۖ"],[10,"ۖ"],[14,"ۗ"],[19,"ۚ"],[27,"ۚ"]],"39:8":[[26,"ۚ"]],"39:9":[[12,"ۗ"],[20,"ۗ"]],"39:10":[[6,"ۚ"],[12,"ۗ"],[15,"ۗ"]],"39:15":[[5,"ۗ"],[14,"ۗ"]],"39:16":[[9,"ۚ"],[14,"ۚ"]],"39:17":[[10,"ۚ"]],"39:18":[[5,"ۚ"],[9,"ۖ"]],"39:20":[[14,"ۖ"]],"39:21":[[25,"ۚ"]],"39:22":[[10,"ۚ"],[16,"ۚ"]],"39:23":[[20,"ۚ"],[27,"ۚ"]],"39:24":[[7,"ۚ"]],"39:26":[[6,"ۖ"],[9,"ۚ"]],"39:29":[[13,"ۚ"],[15,"ۚ"]],"39:32":[[10,"ۚ"]],"39:34":[[5,"ۚ"]],"39:36":[[4,"ۖ"],[8,"ۚ"]],"39:37":[[7,"ۗ"]],"39:38":[[8,"ۚ"],[30,"ۚ"],[33,"ۖ"]],"39:39":[[7,"ۖ"]],"39:41":[[6,"ۖ"],[9,"ۖ"],[14,"ۖ"]],"39:42":[[10,"ۖ"],[20,"ۚ"]],"39:43":[[6,"ۚ"]],"39:44":[[4,"ۖ"],[8,"ۖ"]],"39:45":[[10,"ۖ"]],"39:47":[[17,"ۚ"]],"39:49":[[15,"ۚ"]],"39:51":[[4,"ۚ"]],"39:52":[[9,"ۚ"]],"39:53":[[11,"ۚ"],[16,"ۚ"]],"39:60":[[9,"ۚ"]],"39:62":[[4,"ۖ"]],"39:63":[[4,"ۗ"]],"39:67":[[13,"ۚ"]],"39:68":[[14,"ۖ"]],"39:71":[[6,"ۖ"],[26,"ۚ"]],"39:72":[[6,"ۖ"]],"39:73":[[7,"ۖ"]],"39:74":[[13,"ۖ"]],"39:75":[[9,"ۚ"],[12,"ۚ"]],"40:3":[[8,"ۖ"],[12,"ۖ"]],"40:5":[[7,"ۖ"],[12,"ۖ"],[18,"ۖ"]],"40:7":[[13,"ۖ"]],"40:8":[[12,"ۚ"]],"40:9":[[2,"ۚ"],[8,"ۚ"]],"40:12":[[11,"ۚ"]],"40:13":[[9,"ۚ"]],"40:16":[[3,"ۖ"],[9,"ۚ"],[12,"ۖ"]],"40:17":[[6,"ۚ"],[9,"ۚ"]],"40:18":[[8,"ۚ"]],"40:20":[[3,"ۖ"],[10,"ۗ"]],"40:21":[[12,"ۚ"]],"40:22":[[9,"ۚ"]],"40:25":[[13,"ۚ"]],"40:26":[[7,"ۖ"]],"40:28":[[19,"ۖ"],[24,"ۖ"],[31,"ۖ"]],"40:29":[[14,"ۚ"]],"40:31":[[9,"ۚ"]],"40:33":[[9,"ۗ"]],"40:34":[[13,"ۖ"],[23,"ۚ"]],"40:35":[[8,"ۖ"],[15,"ۚ"]],"40:37":[[9,"ۚ"],[17,"ۚ"]],"40:40":[[7,"ۖ"]],"40:44":[[4,"ۚ"],[8,"ۚ"]],"40:45":[[5,"ۖ"]],"40:46":[[5,"ۚ"]],"40:50":[[6,"ۖ"],[8,"ۚ"],[10,"ۗ"]],"40:52":[[5,"ۖ"]],"40:56":[[17,"ۚ"],[19,"ۖ"]],"40:58":[[10,"ۚ"]],"40:60":[[5,"ۚ"]],"40:61":[[9,"ۚ"]],"40:62":[[10,"ۖ"]],"40:64":[[14,"ۚ"],[17,"ۖ"]],"40:65":[[10,"ۗ"]],"40:67":[[20,"ۚ"],[25,"ۖ"]],"40:68":[[4,"ۖ"]],"40:70":[[7,"ۖ"]],"40:74":[[3,"ۖ"],[13,"ۚ"]],"40:76":[[5,"ۖ"]],"40:77":[[5,"ۚ"]],"40:78":[[14,"ۗ"],[23,"ۚ"]],"40:82":[[11,"ۚ"]],"40:85":[[7,"ۖ"],[14,"ۖ"]],"41:6":[[14,"ۗ"]],"41:9":[[11,"ۚ"]],"41:12":[[10,"ۚ"],[15,"ۚ"]],"41:14":[[12,"ۖ"]],"41:15":[[12,"ۖ"],[22,"ۖ"]],"41:16":[[13,"ۖ"],[16,"ۖ"]],"41:21":[[5,"ۖ"],[12,"ۚ"]],"41:24":[[5,"ۖ"]],"41:25":[[22,"ۖ"]],"41:28":[[5,"ۖ"]],"41:31":[[7,"ۖ"]],"41:34":[[5,"ۚ"]],"41:36":[[7,"ۖ"]],"41:37":[[6,"ۚ"]],"41:39":[[12,"ۚ"],[17,"ۚ"]],"41:40":[[8,"ۗ"],[19,"ۚ"]],"41:41":[[6,"ۖ"]],"41:42":[[9,"ۖ"]],"41:43":[[10,"ۚ"]],"41:44":[[8,"ۖ"],[10,"ۗ"],[16,"ۚ"],[25,"ۚ"]],"41:45":[[6,"ۚ"],[13,"ۚ"]],"41:46":[[4,"ۖ"],[7,"ۗ"]],"41:48":[[7,"ۖ"]],"41:50":[[23,"ۚ"]],"41:53":[[11,"ۗ"]],"41:54":[[7,"ۗ"]],"42:4":[[7,"ۖ"]],"42:5":[[5,"ۚ"],[13,"ۗ"]],"42:7":[[16,"ۚ"]],"42:8":[[12,"ۚ"]],"42:9":[[5,"ۖ"]],"42:10":[[8,"ۚ"]],"42:11":[[3,"ۚ"],[13,"ۚ"],[16,"ۖ"]],"42:12":[[4,"ۖ"],[9,"ۚ"]],"42:13":[[17,"ۖ"],[23,"ۚ"],[29,"ۚ"]],"42:14":[[10,"ۚ"],[20,"ۚ"]],"42:15":[[2,"ۖ"],[5,"ۖ"],[8,"ۖ"],[15,"ۖ"],[18,"ۖ"],[21,"ۖ"],[25,"ۖ"],[29,"ۖ"],[32,"ۖ"]],"42:17":[[6,"ۗ"]],"42:18":[[6,"ۖ"],[13,"ۗ"]],"42:19":[[6,"ۖ"]],"42:20":[[9,"ۖ"]],"42:21":[[12,"ۚ"],[17,"ۗ"]],"42:22":[[8,"ۗ"],[15,"ۖ"],[20,"ۚ"]],"42:23":[[9,"ۗ"],[18,"ۗ"],[25,"ۚ"]],"42:24":[[6,"ۖ"],[12,"ۗ"],[18,"ۚ"]],"42:26":[[8,"ۚ"]],"42:27":[[13,"ۚ"]],"42:28":[[10,"ۚ"]],"42:29":[[10,"ۚ"]],"42:31":[[5,"ۖ"]],"42:33":[[8,"ۚ"]],"42:36":[[7,"ۚ"]],"42:40":[[4,"ۖ"],[10,"ۚ"]],"42:42":[[11,"ۚ"]],"42:44":[[9,"ۗ"]],"42:45":[[10,"ۗ"],[21,"ۗ"]],"42:46":[[9,"ۗ"]],"42:47":[[12,"ۚ"]],"42:48":[[6,"ۖ"],[10,"ۗ"],[18,"ۖ"]],"42:49":[[4,"ۚ"],[7,"ۚ"]],"42:50":[[4,"ۖ"],[8,"ۚ"]],"42:51":[[19,"ۚ"]],"42:52":[[6,"ۚ"],[22,"ۚ"]],"42:53":[[10,"ۗ"]],"43:11":[[10,"ۚ"]],"43:15":[[5,"ۚ"]],"43:19":[[7,"ۚ"],[9,"ۚ"]],"43:20":[[6,"ۗ"],[11,"ۖ"]],"43:24":[[8,"ۖ"]],"43:25":[[2,"ۖ"]],"43:32":[[4,"ۚ"],[11,"ۚ"],[20,"ۗ"]],"43:35":[[1,"ۚ"],[8,"ۚ"]],"43:43":[[4,"ۖ"]],"43:44":[[4,"ۖ"]],"43:48":[[9,"ۖ"]],"43:51":[[15,"ۚ"]],"43:54":[[3,"ۚ"]],"43:58":[[5,"ۚ"],[10,"ۚ"]],"43:61":[[7,"ۚ"]],"43:62":[[3,"ۖ"]],"43:63":[[14,"ۖ"]],"43:64":[[6,"ۚ"]],"43:65":[[4,"ۖ"]],"43:71":[[6,"ۖ"],[12,"ۖ"]],"43:77":[[5,"ۖ"]],"43:80":[[7,"ۚ"]],"43:84":[[8,"ۚ"]],"43:87":[[6,"ۖ"]],"43:89":[[4,"ۚ"]],"44:3":[[5,"ۚ"]],"44:5":[[3,"ۚ"]],"44:6":[[3,"ۚ"]],"44:7":[[5,"ۖ"]],"44:8":[[6,"ۖ"]],"44:11":[[2,"ۖ"]],"44:15":[[4,"ۚ"]],"44:18":[[5,"ۖ"]],"44:19":[[5,"ۖ"]],"44:24":[[3,"ۖ"]],"44:28":[[1,"ۖ"]],"44:31":[[2,"ۚ"]],"44:37":[[9,"ۚ"]],"44:42":[[4,"ۚ"]],"44:56":[[7,"ۖ"]],"44:57":[[3,"ۚ"]],"45:6":[[6,"ۖ"]],"45:8":[[11,"ۖ"]],"45:9":[[7,"ۚ"]],"45:10":[[3,"ۖ"],[16,"ۖ"]],"45:11":[[2,"ۖ"]],"45:13":[[10,"ۚ"]],"45:15":[[4,"ۖ"],[7,"ۖ"]],"45:17":[[4,"ۖ"],[14,"ۚ"]],"45:19":[[7,"ۚ"],[12,"ۖ"]],"45:21":[[14,"ۚ"]],"45:23":[[22,"ۚ"]],"45:24":[[12,"ۚ"],[17,"ۖ"]],"45:27":[[4,"ۚ"]],"45:28":[[4,"ۚ"]],"45:29":[[5,"ۚ"]],"45:30":[[9,"ۚ"]],"45:35":[[9,"ۚ"]],"45:37":[[5,"ۖ"]],"46:3":[[10,"ۚ"]],"46:4":[[17,"ۖ"]],"46:8":[[3,"ۖ"],[12,"ۖ"],[17,"ۚ"],[22,"ۖ"]],"46:9":[[13,"ۖ"]],"46:10":[[18,"ۚ"]],"46:11":[[11,"ۚ"]],"46:12":[[6,"ۚ"]],"46:15":[[4,"ۖ"],[9,"ۖ"],[13,"ۚ"],[39,"ۖ"]],"46:16":[[13,"ۖ"]],"46:18":[[14,"ۖ"]],"46:19":[[4,"ۖ"]],"46:24":[[9,"ۚ"],[14,"ۖ"]],"46:25":[[10,"ۚ"]],"46:28":[[9,"ۖ"],[12,"ۚ"]],"46:29":[[12,"ۖ"]],"46:32":[[14,"ۚ"]],"46:33":[[16,"ۚ"],[17,"ۚ"]],"46:34":[[9,"ۖ"],[12,"ۚ"]],"46:35":[[10,"ۚ"],[21,"ۚ"],[22,"ۚ"]],"47:3":[[13,"ۚ"]],"47:4":[[20,"ۚ"],[21,"ۖ"],[30,"ۗ"]],"47:10":[[11,"ۖ"],[14,"ۖ"]],"47:12":[[12,"ۖ"]],"47:15":[[5,"ۖ"],[26,"ۖ"],[34,"ۖ"]],"47:16":[[16,"ۚ"]],"47:18":[[7,"ۖ"],[10,"ۚ"]],"47:19":[[10,"ۗ"]],"47:20":[[6,"ۖ"],[25,"ۖ"]],"47:21":[[3,"ۚ"]],"47:26":[[12,"ۖ"]],"47:30":[[5,"ۚ"],[9,"ۚ"]],"47:36":[[5,"ۚ"]],"47:38":[[10,"ۖ"],[16,"ۚ"],[20,"ۚ"]],"48:4":[[11,"ۗ"],[15,"ۚ"]],"48:5":[[13,"ۚ"]],"48:6":[[9,"ۚ"],[12,"ۖ"],[19,"ۖ"]],"48:7":[[4,"ۚ"]],"48:9":[[5,"ۚ"]],"48:10":[[10,"ۚ"],[16,"ۖ"]],"48:11":[[10,"ۚ"],[16,"ۚ"],[31,"ۚ"]],"48:14":[[4,"ۚ"],[10,"ۚ"]],"48:15":[[9,"ۖ"],[14,"ۚ"],[22,"ۖ"],[25,"ۚ"]],"48:16":[[13,"ۖ"],[19,"ۖ"]],"48:17":[[12,"ۗ"],[22,"ۖ"]],"48:19":[[3,"ۗ"]],"48:21":[[8,"ۚ"]],"48:23":[[7,"ۖ"]],"48:24":[[14,"ۚ"]],"48:25":[[12,"ۚ"],[26,"ۖ"],[32,"ۚ"]],"48:26":[[23,"ۚ"]],"48:27":[[6,"ۖ"],[18,"ۖ"]],"48:28":[[11,"ۚ"]],"48:29":[[3,"ۚ"],[10,"ۖ"],[18,"ۖ"],[24,"ۚ"],[28,"ۚ"],[44,"ۗ"]],"49:1":[[9,"ۖ"],[11,"ۚ"]],"49:3":[[13,"ۚ"]],"49:5":[[9,"ۚ"]],"49:7":[[5,"ۚ"],[25,"ۚ"]],"49:8":[[4,"ۚ"]],"49:9":[[7,"ۖ"],[20,"ۚ"],[26,"ۖ"]],"49:10":[[6,"ۚ"]],"49:11":[[22,"ۖ"],[28,"ۖ"],[33,"ۚ"]],"49:12":[[11,"ۖ"],[17,"ۚ"],[25,"ۚ"],[27,"ۚ"]],"49:13":[[11,"ۚ"],[16,"ۚ"]],"49:14":[[3,"ۖ"],[14,"ۖ"],[23,"ۚ"]],"49:15":[[15,"ۚ"]],"49:16":[[12,"ۚ"]],"49:17":[[4,"ۖ"],[9,"ۖ"]],"49:18":[[6,"ۚ"]],"50:1":[[1,"ۚ"]],"50:3":[[4,"ۖ"]],"50:4":[[6,"ۖ"]],"50:11":[[2,"ۖ"],[6,"ۚ"]],"50:14":[[4,"ۚ"]],"50:15":[[3,"ۚ"]],"50:16":[[8,"ۖ"]],"50:19":[[4,"ۖ"]],"50:20":[[3,"ۚ"]],"50:34":[[2,"ۖ"]],"50:42":[[4,"ۚ"]],"50:44":[[5,"ۚ"]],"50:45":[[4,"ۖ"],[8,"ۖ"]],"51:16":[[4,"ۚ"]],"51:21":[[2,"ۚ"]],"51:25":[[5,"ۖ"]],"51:28":[[3,"ۖ"],[6,"ۖ"]],"51:30":[[4,"ۖ"]],"51:46":[[4,"ۖ"]],"51:50":[[3,"ۖ"]],"51:51":[[6,"ۖ"]],"51:53":[[2,"ۚ"]],"52:16":[[7,"ۖ"]],"52:20":[[4,"ۖ"]],"52:21":[[14,"ۚ"]],"52:28":[[5,"ۖ"]],"52:32":[[4,"ۚ"]],"52:33":[[3,"ۚ"]],"52:36":[[4,"ۚ"]],"52:38":[[5,"ۖ"]],"52:42":[[3,"ۖ"]],"52:43":[[5,"ۚ"]],"52:48":[[5,"ۖ"]],"53:23":[[13,"ۚ"],[20,"ۖ"]],"53:28":[[5,"ۖ"],[9,"ۖ"]],"53:30":[[4,"ۚ"]],"53:32":[[7,"ۚ"],[11,"ۚ"],[24,"ۖ"],[27,"ۖ"]],"53:52":[[4,"ۖ"]],"54:3":[[3,"ۚ"]],"54:5":[[2,"ۖ"]],"54:6":[[2,"ۘ"]],"54:8":[[3,"ۖ"]],"54:28":[[5,"ۖ"]],"54:34":[[7,"ۖ"]],"54:35":[[3,"ۚ"]],"55:29":[[5,"ۚ"]],"55:33":[[12,"ۚ"]],"55:54":[[6,"ۚ"]],"57:1":[[6,"ۖ"]],"57:2":[[4,"ۖ"],[6,"ۖ"]],"57:3":[[5,"ۖ"]],"57:4":[[12,"ۖ"],[27,"ۖ"],[32,"ۚ"]],"57:5":[[4,"ۚ"]],"57:6":[[8,"ۚ"]],"57:7":[[8,"ۖ"]],"57:9":[[12,"ۚ"]],"57:10":[[11,"ۚ"],[20,"ۚ"],[29,"ۚ"],[33,"ۚ"]],"57:12":[[9,"ۖ"],[18,"ۚ"]],"57:13":[[15,"ۖ"]],"57:14":[[4,"ۖ"]],"57:15":[[9,"ۚ"],[11,"ۖ"],[13,"ۖ"]],"57:16":[[25,"ۖ"]],"57:17":[[7,"ۚ"]],"57:19":[[7,"ۖ"],[13,"ۖ"]],"57:20":[[13,"ۖ"],[25,"ۖ"],[33,"ۚ"]],"57:21":[[15,"ۚ"],[21,"ۚ"]],"57:22":[[16,"ۚ"]],"57:23":[[9,"ۗ"]],"57:24":[[5,"ۗ"]],"57:25":[[11,"ۖ"],[24,"ۚ"]],"57:26":[[9,"ۖ"],[11,"ۖ"]],"57:27":[[11,"ۖ"],[18,"ۚ"],[31,"ۖ"],[36,"ۖ"]],"57:28":[[18,"ۚ"]],"57:29":[[18,"ۚ"]],"58:1":[[14,"ۚ"]],"58:2":[[8,"ۖ"],[13,"ۚ"],[19,"ۚ"]],"58:3":[[14,"ۚ"],[17,"ۚ"]],"58:4":[[10,"ۖ"],[16,"ۚ"],[20,"ۚ"],[23,"ۗ"]],"58:5":[[11,"ۚ"],[15,"ۚ"]],"58:6":[[7,"ۚ"],[10,"ۚ"]],"58:7":[[11,"ۖ"],[36,"ۖ"],[42,"ۚ"]],"58:8":[[17,"ۖ"],[33,"ۚ"],[36,"ۖ"]],"58:9":[[14,"ۖ"]],"58:10":[[13,"ۚ"]],"58:11":[[13,"ۖ"],[26,"ۚ"]],"58:12":[[11,"ۚ"],[15,"ۚ"]],"58:13":[[7,"ۚ"],[20,"ۚ"]],"58:15":[[5,"ۖ"]],"58:17":[[9,"ۚ"],[12,"ۖ"]],"58:18":[[13,"ۚ"]],"58:19":[[6,"ۚ"],[9,"ۚ"]],"58:21":[[5,"ۚ"]],"58:22":[[21,"ۚ"],[29,"ۖ"],[37,"ۚ"],[42,"ۚ"],[45,"ۚ"]],"59:1":[[8,"ۖ"]],"59:2":[[12,"ۚ"],[16,"ۖ"],[28,"ۖ"],[32,"ۚ"]],"59:3":[[9,"ۖ"]],"59:4":[[5,"ۖ"]],"59:6":[[20,"ۚ"]],"59:7":[[23,"ۚ"],[31,"ۚ"],[33,"ۖ"]],"59:8":[[15,"ۚ"]],"59:9":[[24,"ۚ"]],"59:13":[[7,"ۚ"]],"59:14":[[11,"ۚ"],[14,"ۚ"],[18,"ۚ"]],"59:15":[[5,"ۖ"]],"59:17":[[7,"ۚ"]],"59:18":[[10,"ۖ"],[12,"ۚ"]],"59:19":[[7,"ۚ"]],"59:20":[[6,"ۚ"]],"59:21":[[12,"ۚ"]],"59:22":[[7,"ۖ"],[10,"ۖ"]],"59:23":[[15,"ۚ"]],"59:24":[[5,"ۖ"],[8,"ۚ"],[14,"ۖ"]],"60:1":[[32,"ۚ"],[41,"ۚ"]],"60:3":[[5,"ۚ"],[9,"ۚ"]],"60:4":[[45,"ۖ"]],"60:5":[[9,"ۖ"]],"60:6":[[12,"ۚ"]],"60:7":[[10,"ۚ"],[12,"ۚ"]],"60:8":[[17,"ۚ"]],"60:9":[[16,"ۚ"]],"60:10":[[8,"ۖ"],[11,"ۖ"],[18,"ۖ"],[26,"ۖ"],[29,"ۚ"],[37,"ۚ"],[47,"ۚ"],[52,"ۖ"]],"60:11":[[15,"ۚ"]],"60:12":[[34,"ۚ"]],"61:1":[[8,"ۖ"]],"61:5":[[13,"ۖ"],[18,"ۚ"]],"61:6":[[24,"ۖ"]],"61:7":[[11,"ۚ"]],"61:11":[[9,"ۚ"]],"61:12":[[14,"ۚ"]],"61:13":[[2,"ۖ"],[7,"ۗ"]],"61:14":[[16,"ۖ"],[21,"ۖ"],[28,"ۖ"]],"62:3":[[5,"ۚ"]],"62:4":[[6,"ۚ"]],"62:5":[[11,"ۚ"],[18,"ۚ"]],"62:7":[[6,"ۚ"]],"62:8":[[8,"ۖ"]],"62:9":[[15,"ۚ"]],"62:11":[[9,"ۚ"],[18,"ۚ"]],"63:1":[[8,"ۗ"]],"63:2":[[7,"ۚ"]],"63:4":[[4,"ۖ"],[8,"ۖ"],[11,"ۖ"],[15,"ۚ"],[18,"ۚ"],[20,"ۖ"]],"63:6":[[12,"ۚ"]],"63:7":[[12,"ۗ"]],"63:8":[[9,"ۚ"]],"63:9":[[11,"ۚ"]],"63:11":[[7,"ۚ"]],"64:1":[[8,"ۖ"],[12,"ۖ"]],"64:2":[[7,"ۚ"]],"64:3":[[7,"ۖ"]],"64:4":[[10,"ۚ"]],"64:6":[[11,"ۖ"],[13,"ۚ"]],"64:7":[[6,"ۚ"],[14,"ۚ"]],"64:8":[[6,"ۚ"]],"64:9":[[4,"ۖ"],[7,"ۗ"],[24,"ۚ"]],"64:10":[[9,"ۖ"]],"64:11":[[7,"ۗ"],[12,"ۚ"]],"64:12":[[4,"ۚ"]],"64:13":[[5,"ۚ"]],"64:14":[[10,"ۚ"]],"64:15":[[4,"ۚ"]],"64:16":[[9,"ۗ"]],"64:17":[[9,"ۚ"]],"65:1":[[9,"ۖ"],[12,"ۖ"],[23,"ۚ"],[26,"ۚ"],[33,"ۚ"]],"65:2":[[15,"ۚ"],[24,"ۚ"]],"65:3":[[5,"ۚ"],[11,"ۚ"],[15,"ۚ"]],"65:4":[[14,"ۚ"],[20,"ۚ"]],"65:5":[[5,"ۚ"]],"65:6":[[10,"ۚ"],[19,"ۚ"],[27,"ۖ"]],"65:7":[[5,"ۖ"],[13,"ۚ"],[20,"ۚ"]],"65:10":[[5,"ۖ"],[11,"ۚ"]],"65:11":[[15,"ۚ"],[29,"ۖ"]],"65:12":[[8,"ۖ"]],"66:1":[[8,"ۖ"],[11,"ۚ"]],"66:2":[[6,"ۚ"],[8,"ۖ"]],"66:3":[[18,"ۖ"],[25,"ۖ"]],"66:4":[[7,"ۖ"],[17,"ۖ"]],"66:7":[[6,"ۖ"]],"66:8":[[28,"ۖ"],[40,"ۖ"]],"66:9":[[7,"ۚ"],[9,"ۖ"]],"66:10":[[9,"ۖ"]],"67:2":[[8,"ۚ"]],"67:3":[[5,"ۖ"],[12,"ۖ"]],"67:5":[[8,"ۖ"]],"67:6":[[5,"ۖ"]],"67:8":[[4,"ۖ"]],"67:13":[[5,"ۖ"]],"67:15":[[12,"ۖ"]],"67:17":[[9,"ۖ"]],"67:19":[[7,"ۚ"],[11,"ۚ"]],"67:20":[[10,"ۚ"]],"67:21":[[7,"ۚ"]],"67:23":[[9,"ۚ"]],"67:29":[[7,"ۖ"]],"68:1":[[1,"ۚ"]],"68:33":[[2,"ۖ"],[5,"ۚ"]],"68:43":[[4,"ۖ"]],"68:44":[[5,"ۖ"]],"68:45":[[2,"ۚ"]],"69:7":[[7,"ۖ"]],"69:17":[[3,"ۚ"]],"69:41":[[4,"ۚ"]],"69:42":[[3,"ۚ"]],"70:11":[[1,"ۚ"]],"70:15":[[1,"ۖ"]],"70:39":[[1,"ۖ"]],"70:44":[[4,"ۚ"]],"71:4":[[8,"ۚ"],[15,"ۚ"]],"71:24":[[3,"ۖ"]],"71:28":[[10,"ۖ"]],"72:2":[[5,"ۖ"]],"72:9":[[6,"ۖ"]],"72:11":[[6,"ۖ"]],"72:13":[[6,"ۖ"]],"72:14":[[5,"ۖ"]],"72:17":[[2,"ۚ"]],"72:23":[[5,"ۚ"]],"73:18":[[3,"ۚ"]],"73:19":[[3,"ۖ"]],"73:20":[[15,"ۚ"],[19,"ۚ"],[25,"ۖ"],[30,"ۚ"],[48,"ۖ"],[52,"ۚ"],[60,"ۚ"],[72,"ۚ"],[74,"ۖ"]],"74:16":[[1,"ۖ"]],"74:31":[[6,"ۖ"],[38,"ۚ"],[46,"ۚ"],[52,"ۚ"]],"74:53":[[1,"ۖ"]],"74:56":[[6,"ۚ"]],"75:27":[[2,"ۜ"]],"76:13":[[4,"ۖ"]],"76:21":[[5,"ۖ"]],"76:28":[[4,"ۖ"]],"76:29":[[3,"ۖ"]],"76:30":[[6,"ۚ"]],"76:31":[[5,"ۚ"]],"77:38":[[3,"ۖ"]],"78:37":[[6,"ۖ"]],"78:38":[[5,"ۖ"]],"78:39":[[3,"ۖ"]],"79:27":[[5,"ۚ"]],"82:19":[[6,"ۖ"]],"83:14":[[1,"ۖ"],[2,"ۜ"]],"83:26":[[2,"ۚ"]],"84:15":[[1,"ۚ"]],"85:9":[[5,"ۚ"]],"85:11":[[11,"ۚ"]],"87:7":[[4,"ۚ"]],"89:17":[[1,"ۖ"]],"89:21":[[1,"ۖ"]],"89:23":[[3,"ۚ"]],"98:5":[[13,"ۚ"]],"98:6":[[12,"ۚ"]],"98:8":[[12,"ۖ"],[17,"ۚ"]],"104:4":[[1,"ۖ"]],"110:3":[[4,"ۚ"]]};
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
  try { navigator.clipboard.writeText(t).then(() => notify('Copié dans le presse-papiers'), () => notify('Impossible de copier')); } catch (e) { notify('Impossible de copier'); }
}
/* le texte sans voyelles (ni petits signes du Coran) : pour s'entraîner à lire comme dans un livre */
function noVowels(t) { return String(t).replace(/[\u064B-\u0652\u0670\u0653-\u0655\u06D6-\u06ED]/g, '').replace(/\u0671/g, '\u0627'); }
/* les actions moins fréquentes se rangent dans « ⋯ Plus » (une seule fois par barre) */
function moreMenu(parent) {
  if (parent._more) return parent._more;
  const d = h(parent, 'details', 'aa-more'); h(d, 'summary', 'aa-btn aa-btn-quiet', '⋯ Plus');
  const box = h(d, 'div', 'aa-more-box');
  d.addEventListener('click', ev => ev.stopPropagation());
  parent._more = box; return box;
}
/* iPad / iPhone : menu de partage du système ; ordinateur : copie */
function canShare() { try { return !!(navigator.share && window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; } }
function shareText(text, title) {
  if (canShare()) { navigator.share({ title, text }).catch(err => { if (!err || err.name !== 'AbortError') copyText(text); }); return; }
  copyText(text);
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
    u.lang = 'ar-SA'; u.rate = 0.8 * (AUDIO.rate || 1);
    const v = synth.getVoices().find(x => /^ar/i.test(x.lang));
    if (v) u.voice = v; else notify('Aucune voix arabe installée : la lecture peut être incorrecte.');
    synth.speak(u);
  } catch (e) { notify('Son indisponible.'); }
}
/* Récitation : récitateur, vitesse et répétition (réglés dans l'onglet Coran) */
const RECITERS = [
  ['Alafasy_128kbps', 'Mishary al-ʿAfāsī (normal)'],
  ['Husary_128kbps', 'Maḥmūd al-Ḥuṣarī (lent et très clair)'],
  ['Husary_Muallim_128kbps', 'al-Ḥuṣarī, récitation pour apprendre (très lente)'],
  ['Minshawy_Murattal_128kbps', 'al-Minshāwī (lent)'],
  ['Abdul_Basit_Murattal_192kbps', 'ʿAbd al-Bāsiṭ (posé)'],
];
const AUDIO = { reciter: 'Alafasy_128kbps', rate: 1, repeat: 1 };
function applyRate(a) { try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; a.playbackRate = AUDIO.rate || 1; } catch (e) { /* */ } }
function setAudioRate(r) { AUDIO.rate = r; if (currentAudio) applyRate(currentAudio); }
let audioSeq = 0; // chaque nouvelle lecture annule la précédente
function stopAudio() { audioSeq++; if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* */ } } try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* */ } }
function playUrl(urls, fallbackText, onEnd, keepSeq) {
  if (!keepSeq) stopAudio();
  const my = audioSeq;
  if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* */ } }
  const list = urls.slice();
  const tryNext = () => {
    if (my !== audioSeq) return;
    const u = list.shift();
    if (!u) { if (fallbackText) speak(fallbackText); else notify('Son indisponible (connexion internet nécessaire).'); return; }
    const a = new Audio(u); currentAudio = a;
    applyRate(a);
    a.addEventListener('error', tryNext, { once: true });
    a.addEventListener('loadedmetadata', () => applyRate(a), { once: true });
    if (onEnd) a.addEventListener('ended', () => { if (my === audioSeq) onEnd(); }, { once: true });
    const p = a.play(); if (p && p.catch) p.catch(() => {});
  };
  tryNext();
}
/* son gardé sur l'appareil (dossier audio/ du plugin) : utilisé en premier, sans internet */
const AUDIO_CACHE = { files: new Set(), dir: '', res: null };
function audioRelVerse(rec, s, v) { return 'audio/' + rec + '/' + pad3(s) + pad3(v) + '.mp3'; }
function audioRelWord(r) { return 'audio/wbw/' + pad3(r[0]) + '_' + pad3(r[1]) + '_' + pad3(r[2]) + '.mp3'; }
function cachedUrl(rel) { try { return AUDIO_CACHE.res && AUDIO_CACHE.files.has(rel) ? AUDIO_CACHE.res(AUDIO_CACHE.dir + '/' + rel) : null; } catch (e) { return null; } }
function verseUrls(s, v) {
  const f = pad3(s) + pad3(v) + '.mp3';
  const out = [];
  const loc = cachedUrl(audioRelVerse(AUDIO.reciter || 'Alafasy_128kbps', s, v)) || cachedUrl(audioRelVerse('Alafasy_128kbps', s, v));
  if (loc) out.push(loc);
  out.push('https://everyayah.com/data/' + (AUDIO.reciter || 'Alafasy_128kbps') + '/' + f);
  if (AUDIO.reciter !== 'Alafasy_128kbps') out.push('https://everyayah.com/data/Alafasy_128kbps/' + f);
  out.push('https://verses.quran.com/Alafasy/mp3/' + f);
  return out;
}
/* Joue un verset (répété AUDIO.repeat fois), puis appelle onEnd */
function playVerse(s, v, onEnd, keepSeq) {
  let left = AUDIO.repeat === 0 ? (keepSeq ? 1 : Infinity) : Math.max(1, AUDIO.repeat || 1); // 0 = en boucle
  if (!keepSeq) stopAudio();
  const my = audioSeq;
  const once = () => playUrl(verseUrls(s, v), null, () => { if (my !== audioSeq) return; left--; if (left > 0) setTimeout(once, 600); else if (onEnd) onEnd(); }, true);
  once();
}
/* Joue une suite de versets ; onVerse(v) est appelé au début de chacun */
function playVerses(s, list, onVerse, onDone) {
  stopAudio();
  const my = audioSeq; let i = 0;
  const next = () => {
    if (my !== audioSeq) return;
    if (i >= list.length) { if (AUDIO.repeat === 0 && list.length) { i = 0; setTimeout(next, 900); return; } if (onDone) onDone(); return; }
    const v = list[i++]; if (onVerse) onVerse(v);
    playVerse(s, v, () => setTimeout(next, 400), true);
  };
  next();
  return () => { if (my === audioSeq) stopAudio(); };
}
function playWord(ref, text, ctx) {
  const loc = ref && cachedUrl(audioRelWord(ref));
  if (loc) { playUrl([loc], text); return; }
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
  if (lemRow) { const lk = h(right, 'a', 'aa-link aa-small', '📖 Voir dans le dictionnaire'); lk.addEventListener('click', ev => { ev.preventDefault(); ctx.openDict(st.seg[3]); }); }
  if (isInitials(word)) mdText(el, 'p', 'aa-why', 'Ces lettres se lisent **par leur nom** : ' + initialsTranslit(word) + '. On les appelle « al-ḥurūf al-muqaṭṭaʿa » ; leur sens n\'est connu que d\'Allah.');

  // prononciation (couleurs)
  if (ctx.settings.tajwid && verse) {
    const segs = tajwidVerse(verse[2])[wi].filter(s => s.cls || s.pause);
    if (segs.length) {
      const tjd = details(el, '🎨 Prononciation de ce mot', true, 'aa-sec');
      const big = h(tjd, 'div', 'aa-verse-ar aa-tj-on aa-tj-big'); big.setAttribute('dir', 'rtl');
      fillTajwid(arSpan(big, '', 'aa-w'), tajwidVerse(verse[2])[wi]);
      const ul = h(tjd, 'ul', 'aa-why-list');
      segs.forEach(s => { const li = h(ul, 'li'); arSpan(li, s.t.replace(/ٱ/, 'ٱ'), 'aa-tj-' + (s.cls || 'pausech') + ' aa-mid'); li.appendChild(document.createTextNode(' : ' + [s.tip, s.pause].filter(Boolean).join(' ; '))); });
    }
  }
  // morceaux
  if (word.length > 1) {
    const row = h(details(el, 'Les morceaux du mot', true, 'aa-sec'), 'div', 'aa-segs');
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
    const ul = h(details(el, 'Pourquoi cette forme ?', true, 'aa-sec aa-sec-key'), 'ul', 'aa-why-list');
    e.why.forEach(w => mdText(ul, 'li', null, w));
  }
  // lettres
  const dl = details(el, 'Lettre par lettre : chaque signe et son son', ctx.settings.openLetters, 'aa-sec');
  renderTiles(dl, txt);
  // alternatives
  const alts = endingAlternatives(st.seg[0], st.f);
  if (alts.length) {
    const altd = details(el, 'Et si on changeait le dernier signe ?', false, 'aa-sec');
    const pre = word.slice(0, st.idx).map(s => s[0]).join(''); const post = word.slice(st.idx + 1).map(s => s[0]).join('');
    const box = h(altd, 'div', 'aa-alts');
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
    mdText(altd, 'p', 'aa-muted aa-small', 'Le sens du mot ne change pas : c\'est son **rôle dans la phrase** qui change. Seule la dernière voyelle le montre.');
  }
  // famille de la racine
  if (e.root && data.byRoot) {
    const fam = data.rootFamily(e.root, st.seg[3]);
    if (fam.length) {
      const d = details(el, 'La famille de la racine ' + e.root.split('').join(' ') + ' (' + fam.length + ' autres mots)', false, 'aa-sec');
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
    const d = details(el, 'Ce mot ailleurs dans le Coran', false, 'aa-sec');
    const box = h(d, 'div', 'aa-occ-box');
    d.addEventListener('toggle', () => { if (d.open && !box.firstChild) renderOccurrences(ctx, box, st.seg[3], ref); });
  }
  // actions
  const act = h(el, 'div', 'aa-actions');
  const caseInfo = e.facts.filter(f => ['Cas', 'Mode', 'Temps'].includes(f[0])).map(f => f[1].split(' — ')[0].split(' (')[0]).join(', ');
  const summary = txt + ' (' + tr + ') — ' + (e.gloss || e.title) + (caseInfo ? ' · ' + caseInfo : '') + (ref ? ' · Coran ' + ref[0] + ':' + ref[1] : '');
  btn(act, 'Copier', () => copyText(summary));
  btn(moreMenu(act), 'Insérer dans ma note Obsidian', () => ctx.insertText('- ' + summary + '\n'));
  if (lemRow) btn(act, ctx.isMine(st.seg[3]) ? '✓ Dans mon vocabulaire' : 'Ajouter à mon vocabulaire', (ev) => { ctx.addVocab(st.seg[3], txt, isInitials(word) ? tr : translitPhrase([txt], ctx.settings.style), e.gloss, ref ? ref[0] + ':' + ref[1] : ''); ev.target.textContent = '✓ Dans mon vocabulaire'; });
  btn(moreMenu(act), 'Ajouter à mes cartes de révision', () => ctx.addFlashcard(txt + (ref ? ' (' + ref[0] + ':' + ref[1] + ')' : ''), (e.gloss || e.title) + ' — ' + tr + (caseInfo ? ' — ' + caseInfo : '') + (e.why[0] ? ' — ' + e.why[0].replace(/\*\*/g, '') : '')));
  btn(act, 'Fermer', () => { clear(el); el.classList.remove('aa-detail-open'); }, 'aa-btn-quiet');
  linkTerms(ctx, el);
}

function renderTajwidLegend(parent) {
  const lg = h(parent, 'div', 'aa-tj-legend');
  Object.entries(TJ).forEach(([k, v]) => { const c = h(lg, 'span', 'aa-tj-chip'); h(c, 'span', 'aa-tj-dot aa-tjbg-' + k); h(c, 'span', null, v[0]); });
  const c = h(lg, 'span', 'aa-tj-chip'); h(c, 'span', 'aa-tj-dot aa-tj-pausedot'); h(c, 'span', null, 'souligné en pointillé : à l\'arrêt (fin du verset), la dernière voyelle ne se prononce pas');
  mdText(parent, 'p', 'aa-muted aa-small', 'Tout ce qui est en couleur normale se prononce normalement. **Touche un mot** pour voir l\'explication de chaque lettre colorée (rubrique « 🎨 Prononciation de ce mot »).');
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
/* Affichage des versets : 'auto' = les longs versets en morceaux, 'ligne', 'morceaux', 'mot' (mot à mot) */
const LONG_VERSE = 16;
/* Sens court d'un mot pour le « mot à mot ». Les petits mots (ما, لا, إن…) changent de sens selon leur rôle. */
const PART_GLOSS = { PRO: 'ne… pas (défense)', PREV: '(petit mot de liaison)', SUB: 'que, ce que', SUP: '(renforce)', NEG: 'ne… pas', EXP: 'sauf', INT: 'à savoir', INC: 'jusqu’à, même', EXH: 'pourquoi ne… pas ?', EXL: 'soit… soit', CERT: 'certes', CONJ: 'mais', RES: 'seulement', COND: 'si' };
function shortGloss(data, w) {
  const st = stemOf(w); const lid = st.seg[3]; const lem = lid >= 0 ? data.lemmas[lid] : null;
  if (!lem) return '';
  const sub = String(st.seg[2] || '').split('|')[0];
  if (lem[1] === 'P' && st.seg[1] === 'P' && lem[2] && sub && sub !== lem[2]) return PART_GLOSS[sub] || '';
  return lem[4] ? String(lem[4]).split(/[;,]/)[0].trim() : '';
}
const VERSE_LAYOUTS = [['auto', 'longs versets en morceaux (conseillé)'], ['ligne', 'tout sur une ligne'], ['morceaux', 'toujours en morceaux'], ['mot', 'mot à mot (arabe, transcription, sens)']];
function verseLayout(S, n) {
  const m = S.verseLayout || 'auto';
  if (m === 'auto') return n >= LONG_VERSE ? 'morceaux' : 'ligne';
  return m;
}
/* Découpe un verset aux signes de pause du mushaf (ۖ ۗ ۚ ۘ) ; les morceaux trop courts sont réunis */
function verseSegments(s, v, n) {
  const marks = (typeof PAUSES !== 'undefined' && PAUSES[s + ':' + v]) || [];
  const cuts = marks.filter(m => 'ۖۗۚۘ'.includes(m[1])).map(m => m[0]).filter(c => c > 0 && c < n);
  const segs = []; let start = 0;
  cuts.forEach(c => { if (c - start >= 3) { segs.push([start, c]); start = c; } });
  if (n - start < 3 && segs.length) segs[segs.length - 1][1] = n; else segs.push([start, n]);
  return segs;
}
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
    const tokens = translitTokens(words, S.style);
    const tj = S.tajwid ? tajwidVerse(words) : null;
    const detail = h(document.createElement('div'), 'div', 'aa-detail');
    const spans = [];
    const layout = verseLayout(S, words.length);
    const segs = layout === 'ligne' ? [[0, words.length]] : verseSegments(surahN, vn, words.length);
    const mkLine = parent => { const l = h(parent, 'div', 'aa-verse-ar' + (S.tajwid ? ' aa-tj-on' : '')); l.setAttribute('dir', 'rtl'); l.style.fontSize = S.arSize + 'px'; return l; };
    const mkWord = (parent, wi) => {
      const w = words[wi]; const st = stemOf(w);
      const sp = arSpan(parent, wordText(w), 'aa-w ' + (POS_CLASS[st.f.pos] || '') + (isInitials(w) ? ' aa-pos-inl' : '') + (st.seg[3] >= 0 && ctx.isMine(st.seg[3]) ? ' aa-mine' : ''));
      sp.title = tokens[wi] + (sp.classList.contains('aa-mine') ? ' · ✓ dans mon vocabulaire' : '');
      if (tj) { sp.textContent = ''; fillTajwid(sp, tj[wi]); }
      else if (S.noVowels) sp.textContent = noVowels(wordText(w));
      sp.addEventListener('click', () => {
        spans.forEach(x => x.classList.remove('aa-w-sel')); sp.classList.add('aa-w-sel');
        renderWordDetail(ctx, detail, words, wi, [surahN, vn, wi + 1], v);
        detail.scrollIntoView && detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      spans[wi] = sp;
      return sp;
    };
    const mkTr = (parent, from, to) => {
      const trl = h(parent, 'div', 'aa-tr aa-verse-tr'); trl.addEventListener('click', () => box.classList.add('aa-revealed'), true);
      for (let i = from; i < to; i++) { const s = h(trl, 'span', 'aa-trw', tokens[i]); s.addEventListener('click', () => { if (box.closest('.aa-practice')) return; spans[i].click(); }); trl.appendChild(document.createTextNode(' ')); }
      return trl;
    };
    const vnum = parent => arSpan(parent, '﴿' + arNum(vn) + '﴾', 'aa-vnum');
    if (layout === 'mot') {
      /* mot à mot : chaque mot avec sa transcription et son sens en dessous */
      const il = h(box, 'div', 'aa-ilin'); il.setAttribute('dir', 'rtl');
      il.addEventListener('click', () => box.classList.add('aa-revealed'), true);
      segs.forEach(([f, t], si) => {
        for (let wi = f; wi < t; wi++) {
          const c = h(il, 'div', 'aa-ic');
          const sp = mkWord(c, wi); if (S.tajwid) c.classList.add('aa-tj-on');
          if (S.showTr) h(c, 'div', 'aa-tr aa-ic-tr', tokens[wi]).setAttribute('dir', 'ltr');
          const g = isInitials(words[wi]) ? 'lettres' : shortGloss(data, words[wi]);
          h(c, 'div', 'aa-ic-fr', g || ' ').setAttribute('dir', 'ltr');
          c.addEventListener('click', ev => { if (ev.target !== sp) sp.click(); });
        }
        if (si < segs.length - 1) h(il, 'div', 'aa-ic-sep');
      });
      vnum(il);
    } else if (segs.length > 1) {
      /* verset long : un morceau par signe de pause, l'arabe et sa transcription l'un sous l'autre */
      const ch = h(box, 'div', 'aa-chunks');
      segs.forEach(([f, t], si) => {
        const c = h(ch, 'div', 'aa-chunk');
        const l = mkLine(c);
        for (let wi = f; wi < t; wi++) { mkWord(l, wi); l.appendChild(document.createTextNode(' ')); }
        if (si === segs.length - 1) vnum(l);
        if (S.showTr) mkTr(c, f, t);
      });
    } else {
      const line = mkLine(box);
      words.forEach((w, wi) => { mkWord(line, wi); line.appendChild(document.createTextNode(' ')); });
      vnum(line);
      if (S.showTr) mkTr(box, 0, words.length);
    }
    if (S.showFr) { const fr = h(box, 'div', 'aa-verse-fr'); fr.addEventListener('click', () => box.classList.add('aa-revealed')); h(fr, 'span', 'aa-ref', surahN + ':' + vn + ' '); fr.appendChild(document.createTextNode(v[0])); }
    const tools = h(box, 'div', 'aa-verse-tools');
    const structBox = h(document.createElement('div'), 'div', 'aa-struct');
    btn(tools, '🧩 Analyse de la phrase', () => {
      if (structBox.firstChild) { clear(structBox); return; }
      renderIrab(ctx, structBox, words, [surahN, vn], { onWord: wi => spans[wi].click() });
    }, 'aa-btn-quiet');
    if (ctx.settings.audio !== false) btn(tools, '▶ Écouter le verset', () => playVerse(surahN, vn), 'aa-btn-quiet');
    box.dataset.verse = String(vn);
    {
      const on = isBookmarked(ctx, surahN, vn);
      const bm = btn(tools, on ? '★ Signet' : '☆ Signet', () => { const now = toggleBookmark(ctx, surahN, vn); bm.textContent = now ? '★ Signet' : '☆ Signet'; bm.classList.toggle('aa-bm-on', now); }, 'aa-btn-quiet' + (on ? ' aa-bm-on' : ''));
      bm.title = 'Garder ce verset dans « Mes signets » (en haut de l\'onglet Coran)';
    }
    const vText = () => words.map(wordText).join(' ') + '\n' + tokens.join(' ') + '\n« ' + v[0] + ' » (' + info[1] + ' ' + surahN + ':' + vn + ')';
    btn(tools, canShare() ? '↗ Partager' : 'Copier le verset', () => shareText(vText(), info[1] + ' ' + surahN + ':' + vn), 'aa-btn-quiet');
    btn(moreMenu(tools), 'Insérer dans ma note Obsidian', () => ctx.insertText('> [!quote] ' + info[1] + ' ' + surahN + ':' + vn + '\n> ' + words.map(wordText).join(' ') + '\n> *' + tokens.join(' ') + '*\n> ' + v[0] + '\n\n'), 'aa-btn-quiet');
    const key = surahN + ':' + vn; const notes = S.verseNotes || {};
    const noteBox = h(box, 'div', 'aa-vnote' + (notes[key] ? '' : ' aa-hidden'));
    const paintNote = () => { clear(noteBox); noteBox.classList.toggle('aa-hidden', !(S.verseNotes || {})[key]); if ((S.verseNotes || {})[key]) { h(noteBox, 'span', 'aa-vnote-ic', '📝 '); noteBox.appendChild(document.createTextNode(S.verseNotes[key])); } };
    paintNote();
    btn(tools, notes[key] ? '📝 Ma remarque' : '📝 Remarque', ev => {
      if (box.querySelector('.aa-vnote-edit')) return;
      const ed = h(document.createElement('div'), 'div', 'aa-vnote-edit'); box.insertBefore(ed, noteBox.nextSibling);
      const ta = h(ed, 'textarea', 'aa-vnote-ta'); ta.rows = 3; ta.placeholder = 'Ta remarque sur ce verset (un mot appris, une question, un souvenir…)'; ta.value = (S.verseNotes || {})[key] || '';
      const row = h(ed, 'div', 'aa-actions');
      const done = () => { const t = ta.value.trim(); S.verseNotes = S.verseNotes || {}; if (t) S.verseNotes[key] = t; else delete S.verseNotes[key]; ctx.save(); ed.remove(); paintNote(); ev.target.textContent = t ? '📝 Ma remarque' : '📝 Remarque'; };
      btn(row, 'Enregistrer', done, 'mod-cta'); btn(row, 'Annuler', () => ed.remove(), 'aa-btn-quiet');
      setTimeout(() => { try { ta.focus(); } catch (e) { /* */ } }, 20);
    }, 'aa-btn-quiet').title = 'Écrire ta propre remarque sur ce verset';
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
  linkTerms(ctx, el);
  mdText(el, 'p', 'aa-muted aa-small', 'Analyse **déduite automatiquement** de la morphologie du Coran (Quranic Arabic Corpus) : très fiable pour les cas, les annexions, les prépositions et les adjectifs ; les rôles marqués « probable » sont à vérifier dans un livre d\'iʿrāb pour les versets longs.');
  return res;
}
/* ====================================================================
 * 06 - Onglets : Coran, Analyser, Construire, Signes, Entraînement
 * ==================================================================== */

/* ---------------------------- Coran ---------------------------- */
/* Barre de récitation : récitateur, vitesse, répétition, lecture de la page */
function renderReciteBar(ctx, root, bar, state, nV) {
  const S = ctx.settings;
  const box = h(bar, 'div', 'aa-recite');
  const f1 = field(box, 'Récitateur');
  selectEl(f1, RECITERS, S.reciter || 'Alafasy_128kbps', v => { S.reciter = v; AUDIO.reciter = v; ctx.save(); });
  const f2 = field(box, 'Vitesse');
  selectEl(f2, [['0.5', '0,5× (très lent)'], ['0.6', '0,6×'], ['0.75', '0,75× (lent)'], ['0.85', '0,85×'], ['1', '1× (normal)']], String(S.audioRate || 1), v => { S.audioRate = +v; setAudioRate(+v); ctx.save(); });
  const f3 = field(box, 'Répéter');
  selectEl(f3, [['1', '1 fois'], ['2', '2 fois'], ['3', '3 fois'], ['5', '5 fois'], ['0', '∞ en boucle']], String(S.audioRepeat == null ? 1 : S.audioRepeat), v => { S.audioRepeat = +v; AUDIO.repeat = +v; ctx.save(); });
  const act = h(box, 'div', 'aa-recite-act');
  const PAGE = 20; const from = S.scrollAll ? 1 : (state.page || 0) * PAGE + 1, to = S.scrollAll ? nV : Math.min(nV, from + PAGE - 1);
  const list = []; for (let v = from; v <= to; v++) list.push(v);
  const mark = v => { root.querySelectorAll('.aa-verse-playing').forEach(e => e.classList.remove('aa-verse-playing')); const el = v && root.querySelector('[data-verse="' + v + '"]'); if (el) { el.classList.add('aa-verse-playing'); el.scrollIntoView && el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  const play = btn(act, '▶ Écouter ' + (from === 1 && to === nV ? 'la sourate' : 'les versets ' + from + '–' + to), () => {
    play.style.display = 'none'; stop.style.display = '';
    playVerses(state.surah, list, mark, () => { mark(null); play.style.display = ''; stop.style.display = 'none'; });
  }, 'mod-cta');
  const stop = btn(act, '■ Arrêter', () => { stopAudio(); mark(null); play.style.display = ''; stop.style.display = 'none'; }, 'aa-btn-quiet');
  stop.style.display = 'none';
  if (ctx.keepSurahAudio) {
    const off = h(box, 'div', 'aa-offline aa-small');
    const paint = () => {
      clear(off); const st = ctx.surahAudioStatus(state.surah);
      if (st.verses >= st.nV) { h(off, 'span', 'aa-muted', '✓ Son de cette sourate gardé sur l\'appareil : il marche sans internet.'); return; }
      const b = btn(off, '⬇ Garder le son hors ligne', async () => {
        b.disabled = true;
        const r = await ctx.keepSurahAudio(state.surah, true, (d, n) => { b.textContent = 'Téléchargement… ' + d + ' / ' + n; });
        notify(r.offline ? 'Pas de connexion internet : réessaie plus tard.' : 'Son de la sourate gardé sur l\'appareil.' + (r.failed ? ' (' + r.failed + ' fichiers introuvables)' : ''));
        paint();
      }, 'aa-btn-quiet');
      h(off, 'span', 'aa-muted', ' versets et mots, pour ce récitateur' + (st.nV > 50 ? ' (sourate longue : plusieurs Mo)' : ''));
    };
    paint();
  }
}
const rankFr = n => n === 1 ? '1re' : n + 'e';
function renderQuranTab(ctx, root, state) {
  clear(root);
  const data = ctx.data;
  const PAGE = 20;
  const bar = h(root, 'div', 'aa-toolbar');
  const order = ctx.settings.surahOrder === 'nuzul' ? 'nuzul' : 'mushaf';
  const seq = surahSequence(order);
  const goSurah = n => { state.surah = n; state.page = 0; state.focus = 0; state.resume = 0; renderQuranTab(ctx, root, state); };
  rememberPlace(ctx, state.surah, state.focus || state.resume || (state.page || 0) * PAGE + 1);
  const f0 = field(bar, 'Ordre');
  selectEl(f0, [['mushaf', 'ordre du Coran'], ['nuzul', 'ordre de la révélation']], order, v => { ctx.settings.surahOrder = v; ctx.save(); renderQuranTab(ctx, root, state); });
  const f1 = field(bar, 'Sourate');
  selectEl(f1, seq.map(n => { const s = data.surahInfo(n); return [n, (order === 'nuzul' ? rankFr(REVELATION_ORDER[n - 1]) + ' révélée · sourate ' : '') + n + '. ' + s[1] + ' — ' + s[2]]; }), state.surah, v => goSurah(+v));
  const info = data.surahInfo(state.surah); const nV = info[5];
  const pos = seq.indexOf(state.surah);
  const nav = h(bar, 'div', 'aa-actions aa-surah-nav');
  if (pos > 0) btn(nav, '← ' + data.surahInfo(seq[pos - 1])[1], () => goSurah(seq[pos - 1]), 'aa-btn-quiet').title = 'Sourate précédente (' + (order === 'nuzul' ? 'ordre de la révélation' : 'ordre du Coran') + ')';
  if (pos < seq.length - 1) btn(nav, data.surahInfo(seq[pos + 1])[1] + ' →', () => goSurah(seq[pos + 1]), 'aa-btn-quiet').title = 'Sourate suivante (' + (order === 'nuzul' ? 'ordre de la révélation' : 'ordre du Coran') + ')';
  const all = !!ctx.settings.scrollAll;
  const pages = all ? 1 : Math.ceil(nV / PAGE);
  root._aaSwipeGo = dir => {
    if (dir > 0 && state.page < pages - 1) { state.page++; state.focus = 0; renderQuranTab(ctx, root, state); }
    else if (dir < 0 && state.page > 0) { state.page--; state.focus = 0; renderQuranTab(ctx, root, state); }
    else if (dir > 0 && pos < seq.length - 1) goSurah(seq[pos + 1]);
    else if (dir < 0 && pos > 0) goSurah(seq[pos - 1]);
    else return;
    try { root.closest('.aa-root').scrollTop = 0; } catch (e) { /* */ }
  };
  onSwipe(root, dir => { if (root._aaSwipeGo && root.querySelector('.aa-verses')) root._aaSwipeGo(dir); });
  if (all) state.page = 0;
  else if (state.focus || state.resume) state.page = Math.floor(((state.focus || state.resume) - 1) / PAGE);
  if (pages > 1) {
    const f2 = field(bar, 'Versets');
    const opts = []; for (let p = 0; p < pages; p++) opts.push([p, (p * PAGE + 1) + '–' + Math.min(nV, (p + 1) * PAGE)]);
    selectEl(f2, opts, state.page, v => { state.page = +v; state.focus = 0; renderQuranTab(ctx, root, state); });
  }
  /* petit écran (iPhone) : le son et les options se replient pour laisser la place au texte */
  const small = (root.clientWidth || window.innerWidth || 1000) < 600;
  const opt = h(bar, 'details', 'aa-qopts' + (small ? '' : ' aa-qopts-wide')); opt.open = !small || !!state.optsOpen;
  h(opt, 'summary', null, (ctx.settings.audio !== false ? '🔊 Son et ' : '') + 'options d\'affichage');
  opt.addEventListener('toggle', () => { if (small) state.optsOpen = opt.open; });
  if (ctx.settings.audio !== false) renderReciteBar(ctx, root, opt, state, nV);
  const tg = h(opt, 'div', 'aa-toggles');
  const quick = h(bar, 'div', 'aa-actions aa-quick');
  btn(quick, 'A−', () => setArSize(ctx, root, -2), 'aa-btn-quiet aa-asize').title = 'Texte arabe plus petit';
  btn(quick, 'A+', () => setArSize(ctx, root, +2), 'aa-btn-quiet aa-asize').title = 'Texte arabe plus grand';
  btn(quick, '⤢ Lecture', () => setReading(root.closest('.aa-root') || root, true), 'aa-btn-quiet').title = 'Plein écran : seulement le texte (Échap ou ✕ pour sortir)';
  btn(quick, '🔎 Chercher', () => { state.searchOpen = !state.searchOpen; renderQuranTab(ctx, root, state); }, 'aa-btn-quiet' + (state.searchOpen ? ' aa-on' : '')).title = 'Chercher un mot dans tout le Coran';
  checkbox(tg, 'translittération', ctx.settings.showTr, v => { ctx.settings.showTr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'français', ctx.settings.showFr, v => { ctx.settings.showFr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'couleurs des mots', ctx.settings.wordColors !== false, v => { ctx.settings.wordColors = v; ctx.save(); const r = root.closest && root.closest('.aa-root'); if (r) r.classList.toggle('aa-nocolor', !v); });
  checkbox(tg, '🎨 prononciation', !!ctx.settings.tajwid, v => { ctx.settings.tajwid = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'sans voyelles', !!ctx.settings.noVowels, v => { ctx.settings.noVowels = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, '📜 toute la sourate en continu', all, v => { ctx.settings.scrollAll = v; ctx.save(); state.focus = 0; state.resume = ctx.settings.lastSurah === state.surah ? ctx.settings.lastVerse : 0; renderQuranTab(ctx, root, state); });
  checkbox(tg, '👁 m\'entraîner à lire', !!ctx.settings.practice, v => { ctx.settings.practice = v; ctx.save(); const b = root.querySelector('.aa-verses'); if (b) b.classList.toggle('aa-practice', v); });
  {
    const lr = h(opt, 'label', 'aa-layout-row'); h(lr, 'span', null, 'Affichage des versets : ');
    const sel = h(lr, 'select', 'dropdown aa-layout-sel');
    VERSE_LAYOUTS.forEach(([k, l]) => { const o = h(sel, 'option', null, l); o.value = k; });
    sel.value = ctx.settings.verseLayout || 'auto';
    sel.addEventListener('change', () => { ctx.settings.verseLayout = sel.value; ctx.save(); renderQuranTab(ctx, root, state); });
  }
  renderBookmarks(ctx, root, state, n => goSurah(n));
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
  h(root, 'div', 'aa-muted aa-small aa-surah-info', 'Sourate ' + state.surah + ' · ' + info[5] + ' versets · révélée à ' + (info[4] === 'Médine' ? 'Médine' : 'La Mecque') + ' · ' + rankFr(REVELATION_ORDER[state.surah - 1]) + ' dans l\'ordre de la révélation');
  const kn = h(root, 'div', 'aa-surah-know');
  surahKnowledge(ctx, state.surah).then(k => {
    if (!k.total) return;
    progressBar2(kn, k.known / k.total, k.learning / k.total);
    const t = h(kn, 'div', 'aa-small aa-muted');
    t.appendChild(document.createTextNode('Tu connais ' + k.pct + ' % des mots de cette sourate' + (k.pctAll > k.pct ? ', et ' + (k.pctAll - k.pct) + ' % sont en cours d\'apprentissage' : '') + '. '));
    if (k.unknown.length) { const a = h(t, 'a', 'aa-link', '📖 Apprendre les mots de cette sourate (' + k.unknown.length + ' nouveaux)'); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openTab('review', { surahWords: state.surah, session: null, deck: null }); }); }
  }).catch(() => {});
  if (ctx.settings.tajwid) renderTajwidLegend(details(root, '🎨 Couleurs de prononciation : ce qu\'on prononce ou pas', true));
  mdText(root, 'p', 'aa-help', '**Clique sur un mot** pour voir ses morceaux, ses signes lettre par lettre, la raison de sa terminaison et les autres formes possibles. Couleurs : bleu = nom, rouge = verbe, gris = particule.');
  if (state.searchOpen) renderQuranSearch(ctx, root, state);
  const body = h(root, 'div', 'aa-verses' + (ctx.settings.practice ? ' aa-practice' : ''));
  if (all) return renderQuranScroll(ctx, root, body, state, nV);
  const from = state.page * PAGE + 1, to = Math.min(nV, from + PAGE - 1);
  renderVerses(ctx, body, state.surah, from, to, { title: true, basmala: from === 1 }).then(() => {
    if (state.focus) {
      const el = body.querySelector('[data-ref="' + state.surah + ':' + state.focus + '"]');
      if (el) { el.classList.add('aa-verse-focus'); el.scrollIntoView && el.scrollIntoView({ block: 'center' }); }
    } else if (state.resume > 1) {
      const el = body.querySelector('[data-ref="' + state.surah + ':' + state.resume + '"]');
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
    }
    state.resume = 0;
    watchReading(ctx, root, body, state);
    if (pages > 1) {
      const nav = h(root, 'div', 'aa-pager');
      if (state.page > 0) btn(nav, '← versets précédents', () => { state.page--; state.focus = 0; renderQuranTab(ctx, root, state); });
      if (state.page < pages - 1) btn(nav, 'versets suivants →', () => { state.page++; state.focus = 0; renderQuranTab(ctx, root, state); });
    }
  });
}

/* Lecture en continu : toute la sourate sur une seule page. Les versets arrivent par paquets
 * de 25 pendant qu'on descend, pour rester rapide sur iPhone même avec al-Baqara (286 versets). */
async function renderQuranScroll(ctx, root, body, state, nV) {
  const CH = 25; const s0 = state.surah;
  const target = state.focus || state.resume || 0;
  let done = 0;
  const more = async upto => {
    while (done < Math.min(nV, upto)) {
      const from = done + 1, to = Math.min(nV, done + CH);
      await renderVerses(ctx, body, s0, from, to, { title: from === 1, basmala: from === 1 });
      done = to;
      if (state.surah !== s0 || !body.isConnected) return false;
    }
    return true;
  };
  if (!(await more(Math.max(CH, target + 10)))) return;
  if (target) {
    const el = body.querySelector('[data-ref="' + s0 + ':' + target + '"]');
    if (el) { if (state.focus) el.classList.add('aa-verse-focus'); el.scrollIntoView && el.scrollIntoView({ block: state.focus ? 'center' : 'start' }); }
  }
  state.resume = 0;
  watchReading(ctx, root, body, state);
  const end = h(root, 'div', 'aa-scroll-end');
  const paintEnd = () => {
    clear(end);
    if (done < nV) { h(end, 'span', 'aa-muted aa-small', 'Versets ' + (done + 1) + ' à ' + nV + ' : ils arrivent quand tu descends…'); return; }
    const seq = surahSequence(ctx.settings.surahOrder === 'nuzul' ? 'nuzul' : 'mushaf'); const pos = seq.indexOf(s0);
    h(end, 'div', 'aa-muted aa-small', 'Fin de la sourate ' + ctx.data.surahInfo(s0)[1] + '.');
    if (pos < seq.length - 1) btn(end, 'Sourate suivante : ' + ctx.data.surahInfo(seq[pos + 1])[1] + ' →', () => { state.surah = seq[pos + 1]; state.page = 0; state.focus = 0; state.resume = 0; renderQuranTab(ctx, root, state); try { root.closest('.aa-root').scrollTop = 0; } catch (e) { /* */ } }, 'mod-cta');
  };
  paintEnd();
  if (done >= nV || typeof IntersectionObserver === 'undefined') { if (done < nV) { await more(nV); watchReading(ctx, root, body, state); paintEnd(); } return; }
  let busy = false;
  const io = new IntersectionObserver(async ents => {
    if (busy || !ents.some(e => e.isIntersecting)) return;
    busy = true;
    const ok = await more(done + CH);
    busy = false;
    if (!ok) { io.disconnect(); return; }
    watchReading(ctx, root, body, state); paintEnd();
    if (done >= nV) io.disconnect();
    else { io.unobserve(end); io.observe(end); }
  }, { rootMargin: '0px 0px 900px 0px' });
  io.observe(end);
}

/* ---------- confort : reprendre la lecture, glisser, signets ---------- */
let placeTimer = null;
function rememberPlace(ctx, s, v) {
  ctx.settings.lastSurah = s; ctx.settings.lastVerse = v || 1;
  clearTimeout(placeTimer); placeTimer = setTimeout(() => ctx.save(), 800);
}
/* le verset en haut de l'écran devient « l'endroit où j'en suis » */
function watchReading(ctx, root, body, state) {
  if (typeof IntersectionObserver === 'undefined') return;
  if (root._aaObs) root._aaObs.disconnect();
  const obs = new IntersectionObserver(entries => {
    const vis = entries.filter(e => e.isIntersecting).map(e => +e.target.dataset.verse).filter(Boolean);
    if (vis.length) rememberPlace(ctx, state.surah, Math.min(...vis));
  }, { rootMargin: '0px 0px -70% 0px' });
  body.querySelectorAll('.aa-verse').forEach(el => obs.observe(el));
  root._aaObs = obs;
}
/* glisser du doigt vers la gauche = suivant, vers la droite = précédent */
function onSwipe(el, cb) {
  if (el._aaSwipe) return; el._aaSwipe = true;
  let x0 = 0, y0 = 0, t0 = 0, ok = false;
  el.addEventListener('touchstart', e => {
    const t = e.touches[0]; if (e.touches.length !== 1) { ok = false; return; }
    const tg = e.target;
    ok = !(tg.closest && tg.closest('select, input, textarea, button, .aa-struct, .aa-irab, table, .aa-tabs, .aa-subtabs, .aa-wr-pad, canvas, svg, .aa-scroll-x'));
    x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
  }, { passive: true });
  el.addEventListener('touchend', e => {
    if (!ok) return; ok = false;
    const t = e.changedTouches[0]; const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Date.now() - t0 > 700 || Math.abs(dx) < 70 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    cb(dx < 0 ? 1 : -1);
  }, { passive: true });
}
function isBookmarked(ctx, s, v) { return (ctx.settings.bookmarks || []).some(b => b.s === s && b.v === v); }
function toggleBookmark(ctx, s, v) {
  const L = ctx.settings.bookmarks || (ctx.settings.bookmarks = []);
  const i = L.findIndex(b => b.s === s && b.v === v);
  if (i >= 0) L.splice(i, 1); else L.unshift({ s, v, d: Date.now() });
  ctx.save(); return i < 0;
}
function renderBookmarks(ctx, root, state, goSurah) {
  const L = ctx.settings.bookmarks || []; if (!L.length) return;
  const box = details(root, '★ Mes signets (' + L.length + ')', false);
  const list = h(box, 'div', 'aa-bm-list');
  L.forEach(b => {
    const row = h(list, 'div', 'aa-bm');
    const a = h(row, 'a', 'aa-link', b.s + ':' + b.v + ' · ' + ctx.data.surahInfo(b.s)[1]);
    a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(b.s, b.v); });
    const x = h(row, 'span', 'aa-bm-x', '✕'); x.title = 'Retirer ce signet';
    x.addEventListener('click', () => { toggleBookmark(ctx, b.s, b.v); renderQuranTab(ctx, root, state); });
  });
}

function setArSize(ctx, root, d) {
  const S = ctx.settings; S.arSize = Math.max(20, Math.min(56, (S.arSize || 30) + d));
  const r = root.closest ? (root.closest('.aa-root') || root) : root;
  r.style.setProperty('--aa-ar-size', S.arSize + 'px');
  r.querySelectorAll('.aa-verse-ar').forEach(el => { el.style.fontSize = S.arSize + 'px'; });
  ctx.save();
}
/* mode lecture : on cache tout sauf le texte */
function setReading(rootEl, on) {
  rootEl.classList.toggle('aa-reading', on);
  let bar = rootEl.querySelector(':scope > .aa-reading-bar');
  if (on && !bar) {
    bar = h(rootEl, 'div', 'aa-reading-bar');
    const body = rootEl.querySelector('.aa-body');
    const ctxRoot = body;
    btn(bar, 'A−', () => { const b = rootEl.querySelector('.aa-body button.aa-asize'); if (b) b.click(); }, 'aa-btn-quiet');
    btn(bar, 'A+', () => { const b = rootEl.querySelectorAll('.aa-body button.aa-asize')[1]; if (b) b.click(); }, 'aa-btn-quiet');
    btn(bar, '✕ Quitter la lecture', () => setReading(rootEl, false), 'aa-btn-quiet');
  }
  if (!on && bar) bar.remove();
}
/* chercher un mot (français ou arabe) dans tout le Coran */
function renderQuranSearch(ctx, root, state) {
  const box = h(root, 'div', 'aa-qsearch');
  const inp = h(box, 'input', 'aa-search'); inp.type = 'search'; inp.placeholder = 'un mot en français (miséricorde) ou en arabe (رحمة)…';
  inp.value = state.query || '';
  const out = h(box, 'div', 'aa-qsearch-out');
  let timer = null;
  const run = async () => {
    const q = inp.value.trim(); state.query = q; clear(out);
    if (q.length < 2) { h(out, 'p', 'aa-muted aa-small', 'Tape au moins 2 lettres.'); return; }
    const isAr = /[\u0600-\u06FF]/.test(q);
    const qa = stripAr(q).replace(/\s+/g, ' ').trim(), ql = stripLat(q);
    const wait = h(out, 'p', 'aa-muted aa-small', 'Recherche…');
    const res = []; let total = 0;
    for (let n = 1; n <= 114; n++) {
      const d = await ctx.data.surah(n);
      if (inp.value.trim() !== q) return; // on a tapé autre chose entre-temps
      d.v.forEach((v, i) => {
        const hit = isAr ? (' ' + stripAr(v[2].map(wordText).join(' ')) + ' ').includes(qa) : stripLat(v[0]).includes(ql);
        if (hit) { total++; if (res.length < 60) res.push([n, i + 1, v]); }
      });
    }
    wait.remove();
    h(out, 'p', 'aa-muted aa-small', total ? total + ' verset' + (total > 1 ? 's' : '') + (total > 60 ? ' (les 60 premiers)' : '') : 'Aucun verset trouvé.');
    res.forEach(([n, vn, v]) => {
      const r = h(out, 'div', 'aa-qres');
      const a = h(r, 'a', 'aa-link aa-small', ctx.data.surahInfo(n)[1] + ' ' + n + ':' + vn);
      const go = ev => { ev.preventDefault(); state.searchOpen = false; ctx.openQuran(n, vn); };
      a.addEventListener('click', go);
      const ar = arSpan(h(r, 'div', 'aa-qres-ar'), v[2].map(wordText).join(' '));
      const fr = h(r, 'div', 'aa-qres-fr aa-small');
      if (!isAr) {
        const t = v[0]; let norm = ''; const idx = [];
        for (let i = 0; i < t.length; i++) { const c = stripLat(t[i]); for (const x of c) { norm += x; idx.push(i); } }
        const k = norm.indexOf(ql);
        if (k >= 0) { const a0 = idx[k], a1 = idx[k + ql.length - 1] + 1; fr.appendChild(document.createTextNode(t.slice(0, a0))); h(fr, 'mark', null, t.slice(a0, a1)); fr.appendChild(document.createTextNode(t.slice(a1))); }
        else fr.textContent = t;
      } else fr.textContent = v[0];
      r.addEventListener('click', go);
    });
  };
  inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); });
  setTimeout(() => { try { inp.focus(); } catch (e) { /* */ } }, 30);
  if (state.query) run();
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
  btn(moreMenu(act), 'Insérer dans ma note Obsidian', () => ctx.insertText('- ' + arText + ' — *' + tr + '* — ' + r.fr + '\n'));
  btn(moreMenu(act), 'Ajouter à mes cartes de révision', () => ctx.addFlashcard(r.fr, arText + ' (' + tr + ')'));

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
    const d = details(root, 'Rappel : les 3 cas', false);
    const t = h(d, 'table', 'aa-table');
    const hr = h(t, 'tr'); ['Cas', 'Signe', 'Rôle'].forEach(x => h(hr, 'th', null, x));
    [['NOM', 'sujet, attribut, après كَانَ (son nom)'], ['ACC', 'complément d\'objet, après إِنَّ, attribut de كَانَ / لَيْسَ'], ['GEN', 'après une préposition, 2e nom d\'une annexion']].forEach(([k, role]) => {
      const rr = h(t, 'tr'); h(rr, 'td', null, CASES[k].fr + ' (' + CASES[k].tr + ')'); arSpan(h(rr, 'td'), CASES[k].sign); h(rr, 'td', null, role);
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

/* ---------- Exercices : un parcours guidé par niveaux (2.20) ---------- */
const QUIZ_PATHS = [
  { id: 'sens', ic: '💬', title: 'Le sens des mots', what: 'Un mot du Coran est surligné : choisis ce qu\'il veut dire.', after: null,
    levels: [['fatiha', 'Al-Fātiḥa'], ['juz30', 'Les petites sourates (Juz ʿAmma)'], ['all', 'Tout le Coran']] },
  { id: 'case', ic: '📐', title: 'Les trois cas : -u, -a, -i', what: 'Regarde la fin d\'un nom et le mot d\'avant : sujet (-u), complément (-a) ou après une préposition (-i) ?', after: 'cas',
    levels: [['fatiha', 'Al-Fātiḥa'], ['juz30', 'Les petites sourates (Juz ʿAmma)'], ['all', 'Tout le Coran']] },
  { id: 'phrase', ic: '🧱', title: 'La bonne phrase', what: 'Une phrase en français : choisis la bonne traduction en arabe.', after: 'nominale',
    levels: [['p1', 'Série 1'], ['p2', 'Série 2'], ['p3', 'Série 3']] },
  { id: 'mood', ic: '⚙️', title: 'Les modes du verbe au présent', what: 'Un verbe au présent : normal (-u), après « an, lan » (-a) ou après « lam, lā » (sans voyelle) ?', after: 'present',
    levels: [['juz30', 'Les petites sourates (Juz ʿAmma)'], ['all', 'Tout le Coran']] },
  { id: 'role', ic: '🧩', title: 'Le rôle du mot dans la phrase', what: 'Sujet, complément, attribut… : quel est le rôle du mot surligné ?', after: 'irab',
    levels: [['juz30', 'Les petites sourates (Juz ʿAmma)'], ['all', 'Tout le Coran']] },
];
const QUIZ_ROUND = 10, QUIZ_PASS = 7;
function quizBest(ctx) { return ctx.settings.quizPath || (ctx.settings.quizPath = {}); }
function lessonNum(id) { const k = LESSONS.findIndex(l => l.id === id); return k >= 0 ? k + 1 : null; }

function renderQuizTab(ctx, root, state) {
  clear(root);
  if (state.round) return renderQuizRound(ctx, root, state);
  if (state.free) return renderQuizFree(ctx, root, state);
  mdText(root, 'p', 'aa-help', 'Chaque exercice est un **parcours** en plusieurs niveaux, du plus facile (Al-Fātiḥa) au plus difficile (tout le Coran). Un niveau = **' + QUIZ_ROUND + ' questions** prises dans de vrais versets. Avec **' + QUIZ_PASS + ' bonnes réponses sur ' + QUIZ_ROUND + '**, le niveau est validé ✓. Après chaque réponse, tu vois l\'explication.');
  const B = quizBest(ctx); const LS = ctx.settings.lessons || {};
  const go = () => renderQuizTab(ctx, root, state);
  const start = (path, lv) => { state.round = { path: path.id, lv, i: 0, ok: 0, q: null, wrong: [] }; go(); root.scrollTop = 0; };
  /* le prochain niveau conseillé */
  let sug = null;
  for (const P of QUIZ_PATHS) {
    const ready = !P.after || (LS[P.after] && LS[P.after].done);
    const lv = P.levels.findIndex(L => !((B[P.id] || {})[L[0]] >= QUIZ_PASS));
    if (lv >= 0 && ready) { sug = [P, lv]; break; }
  }
  if (sug) {
    const act = h(root, 'div', 'aa-actions aa-lesson-go');
    btn(act, '▶ Continuer : ' + sug[0].title + ' · niveau ' + (sug[1] + 1), () => start(sug[0], sug[1]), 'mod-cta');
  }
  const grid = h(root, 'div', 'aa-qp-list');
  QUIZ_PATHS.forEach(P => {
    const bp = B[P.id] || {};
    const nOk = P.levels.filter(L => bp[L[0]] >= QUIZ_PASS).length;
    const c = h(grid, 'div', 'aa-qp' + (sug && sug[0] === P ? ' aa-qp-next' : '') + (nOk === P.levels.length ? ' aa-qp-done' : ''));
    const top = h(c, 'div', 'aa-qp-top');
    h(top, 'span', 'aa-qp-ic', P.ic); h(top, 'b', null, P.title);
    h(top, 'span', 'aa-muted aa-small aa-qp-count', nOk + ' / ' + P.levels.length + ' niveaux');
    h(c, 'div', 'aa-muted aa-small', P.what);
    if (P.after && !(LS[P.after] && LS[P.after].done) && lessonNum(P.after)) {
      const t = h(c, 'div', 'aa-qp-after aa-small');
      t.appendChild(document.createTextNode('Conseillé après la '));
      const a = h(t, 'a', 'aa-link', 'leçon ' + lessonNum(P.after)); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openLesson(P.after); });
      t.appendChild(document.createTextNode(' (tu peux essayer avant).'));
    }
    const lv = h(c, 'div', 'aa-qp-levels');
    P.levels.forEach((L, k) => {
      const best = bp[L[0]];
      const b = h(lv, 'button', 'aa-qp-lv' + (best >= QUIZ_PASS ? ' aa-qp-ok' : '') + (sug && sug[0] === P && sug[1] === k ? ' aa-qp-cur' : ''));
      h(b, 'span', 'aa-qp-lvn', best >= QUIZ_PASS ? '✓' : String(k + 1));
      const tx = h(b, 'span', 'aa-qp-lvt'); h(tx, 'span', null, L[1]);
      h(tx, 'span', 'aa-muted aa-small', best != null ? 'meilleur score : ' + best + ' / ' + QUIZ_ROUND : QUIZ_ROUND + ' questions');
      b.addEventListener('click', () => start(P, k));
    });
  });
  /* s'entraîner sur ses erreurs, son vocabulaire, ou librement */
  const more = h(root, 'div', 'aa-qp-more');
  const rv = (ctx.reviewList ? ctx.reviewList() : []).length;
  btn(more, '⟳ Mes mots à revoir' + (rv ? ' (' + rv + ')' : ''), () => { state.free = true; state.qtype = 'sens'; state.range = 'review'; state.q = null; go(); }, 'aa-btn-quiet');
  btn(more, '📚 Mon vocabulaire', () => { state.free = true; state.qtype = 'sens'; state.range = 'mine'; state.q = null; go(); }, 'aa-btn-quiet');
  btn(more, '🎲 Entraînement libre', () => { state.free = true; state.q = null; go(); }, 'aa-btn-quiet');
  renderProgress(ctx, details(root, '📈 Mes progrès', false), go);
}

/* une série de 10 questions */
function renderQuizRound(ctx, root, state) {
  const R = state.round; const P = QUIZ_PATHS.find(x => x.id === R.path); const L = P.levels[R.lv];
  const go = () => renderQuizTab(ctx, root, state);
  const head = h(root, 'div', 'aa-qp-head');
  btn(head, '← Tous les exercices', () => { state.round = null; go(); }, 'aa-btn-quiet');
  const tt = h(head, 'div', 'aa-qp-title'); h(tt, 'b', null, P.ic + ' ' + P.title); h(tt, 'span', 'aa-muted aa-small', ' · niveau ' + (R.lv + 1) + ' : ' + L[1]);
  const dots = h(root, 'div', 'aa-qp-dots');
  for (let k = 0; k < QUIZ_ROUND; k++) h(dots, 'span', 'aa-qp-dot' + (k < R.i ? (R.res && R.res[k] ? ' aa-qp-dot-ok' : ' aa-qp-dot-bad') : k === R.i ? ' aa-qp-dot-cur' : ''));
  if (R.i >= QUIZ_ROUND) return renderQuizEnd(ctx, root, state, P);
  h(root, 'div', 'aa-muted aa-small aa-qp-pos', 'Question ' + (R.i + 1) + ' sur ' + QUIZ_ROUND + ' · ' + R.ok + ' bonne' + (R.ok > 1 ? 's' : '') + ' réponse' + (R.ok > 1 ? 's' : ''));
  const box = h(root, 'div', 'aa-quiz');
  const sub = { qtype: P.id, range: L[0] };
  if (!R.q) { h(box, 'p', 'aa-muted', 'Préparation de la question…'); makeQuestion(ctx, sub).then(q => { R.q = q; if (state.round === R) go(); }); return; }
  renderQuizQuestion(ctx, box, R.q, P.id, good => {
    R.res = R.res || []; R.res[R.i] = good; if (good) R.ok++;
    const d = dots.children[R.i]; if (d) d.className = 'aa-qp-dot ' + (good ? 'aa-qp-dot-ok' : 'aa-qp-dot-bad');
  }, () => { R.i++; R.q = null; go(); }, R.i + 1 >= QUIZ_ROUND ? 'Voir mon résultat →' : 'Question suivante →');
}

function renderQuizEnd(ctx, root, state, P) {
  const R = state.round; const L = P.levels[R.lv]; const go = () => renderQuizTab(ctx, root, state);
  const B = quizBest(ctx); const bp = B[P.id] || (B[P.id] = {});
  if (!R.saved) { R.saved = true; if (!(bp[L[0]] >= R.ok)) bp[L[0]] = R.ok; ctx.save(); }
  const ok = R.ok >= QUIZ_PASS;
  const box = h(root, 'div', 'aa-quiz aa-qp-end');
  h(box, 'div', 'aa-qp-big', R.ok + ' / ' + QUIZ_ROUND);
  mdText(box, 'p', ok ? 'aa-ok' : 'aa-warn', ok ? '✓ **Niveau validé !** ' + (R.ok === QUIZ_ROUND ? 'Parfait, aucune erreur.' : 'Bravo.') : 'Pas encore validé : il faut ' + QUIZ_PASS + ' bonnes réponses. Relis l\'explication des erreurs, puis réessaie : les questions changent à chaque fois.');
  const act = h(box, 'div', 'aa-actions aa-qp-endact');
  const nextLv = R.lv + 1 < P.levels.length ? R.lv + 1 : -1;
  if (ok && nextLv >= 0) btn(act, '▶ Niveau suivant : ' + P.levels[nextLv][1], () => { state.round = { path: P.id, lv: nextLv, i: 0, ok: 0, q: null }; go(); }, 'mod-cta');
  btn(act, '🔁 Refaire ce niveau', () => { state.round = { path: P.id, lv: R.lv, i: 0, ok: 0, q: null }; go(); }, ok && nextLv >= 0 ? '' : 'mod-cta');
  btn(act, 'Tous les exercices', () => { state.round = null; go(); }, 'aa-btn-quiet');
  if (P.after && lessonNum(P.after) && !ok) { const t = h(box, 'p', 'aa-muted aa-small'); t.appendChild(document.createTextNode('Pour revoir la règle : ')); const a = h(t, 'a', 'aa-link', 'leçon ' + lessonNum(P.after)); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openLesson(P.after); }); }
}

/* une question (partagée par le parcours et l'entraînement libre) */
function renderQuizQuestion(ctx, box, q, qtype, onAnswer, onNext, nextLabel) {
  h(box, 'div', 'aa-quiz-q', q.prompt);
  if (q.words) {
    const a = h(box, 'div', 'aa-verse-ar'); a.setAttribute('dir', 'rtl'); a.style.fontSize = ctx.settings.arSize + 'px';
    q.words.forEach((w, wi) => { arSpan(a, wordText(w), wi === q.wi ? 'aa-hl' : ''); a.appendChild(document.createTextNode(' ')); });
    if (ctx.settings.showTr) { const tk = translitTokens(q.words, ctx.settings.style); const tr = h(box, 'div', 'aa-tr aa-verse-tr'); tk.forEach((t, i) => { h(tr, 'span', i === q.wi ? 'aa-hl-tr' : null, t); tr.appendChild(document.createTextNode(' ')); }); }
    h(box, 'div', 'aa-muted aa-small aa-quiz-ref', q.ref[0] + ':' + q.ref[1] + ' — ' + q.verseFr);
    const big = h(box, 'div', 'aa-quiz-word'); arSpan(big, wordText(q.words[q.wi]), 'aa-big');
  } else if (q.fr) {
    h(box, 'div', 'aa-quiz-fr', '« ' + q.fr + ' »');
  }
  const opts = h(box, 'div', 'aa-quiz-opts');
  const fb = h(box, 'div', 'aa-quiz-fb');
  q.options.forEach((o, i) => {
    const b = btn(opts, '', () => {
      if (q.done) return;
      q.done = true;
      const good = i === q.answer;
      if (q.words) { const lid = stemOf(q.words[q.wi]).seg[3]; if (lid >= 0) ctx.record(lid, good, qtype); }
      else ctx.record(-1, good, qtype);
      opts.querySelectorAll('button').forEach((x, k) => { if (k === q.answer) x.classList.add('aa-good'); else if (k === i) x.classList.add('aa-bad'); });
      mdText(fb, 'div', good ? 'aa-ok' : 'aa-warn', good ? '✓ Bravo !' : '✗ Pas tout à fait : la réponse est « ' + q.options[q.answer].replace(/\*\*/g, '') + ' ».');
      onAnswer(good);
      const nb = btn(h(fb, 'div', 'aa-actions aa-quiz-next'), nextLabel || 'Question suivante →', onNext, 'mod-cta');
      (q.explain || []).forEach(x => mdText(fb, 'div', 'aa-why', x));
      if (q.words) { const det = h(details(fb, '🔎 Tout sur ce mot', !good), 'div', 'aa-detail'); renderWordDetail(ctx, det, q.words, q.wi, q.ref, null); }
      try { nb.focus({ preventScroll: true }); } catch (e) { /* */ }
      fb.scrollIntoView && fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 'aa-quiz-opt');
    if (q.optAr) arSpan(b, o, 'aa-mid'); else b.textContent = o;
  });
}

function renderQuizFree(ctx, root, state) {
  state.score = state.score || { ok: 0, n: 0 };
  state.qtype = state.qtype || 'case'; state.range = state.range || 'juz30';
  btn(h(root, 'div', 'aa-qp-head'), '← Tous les exercices', () => { state.free = false; state.q = null; renderQuizTab(ctx, root, state); }, 'aa-btn-quiet');
  const bar = h(root, 'div', 'aa-toolbar');
  selectEl(field(bar, 'Exercice'), QUIZ_TYPES, state.qtype, v => { state.qtype = v; state.q = null; renderQuizTab(ctx, root, state); });
  if (state.qtype !== 'phrase') selectEl(field(bar, 'Textes'), QUIZ_RANGES, state.range, v => { state.range = v; state.q = null; renderQuizTab(ctx, root, state); });
  h(bar, 'div', 'aa-score', 'Score : ' + state.score.ok + ' / ' + state.score.n);
  if (state.notice) { mdText(root, 'p', 'aa-warn', state.notice); state.notice = null; }
  const box = h(root, 'div', 'aa-quiz');
  const next = async () => { state.q = await makeQuestion(ctx, state); renderQuizTab(ctx, root, state); };
  if (!state.q) { h(box, 'p', 'aa-muted', 'Préparation de la question…'); next(); return; }
  renderQuizQuestion(ctx, box, state.q, state.qtype, good => {
    state.score.n++; if (good) state.score.ok++;
    const sc = root.querySelector('.aa-score'); if (sc) sc.textContent = 'Score : ' + state.score.ok + ' / ' + state.score.n;
  }, next);
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
    const pool = data.lemmas.filter(l => l[5] >= 15 && l[4] && l[4] !== good && l[1] === st.f.pos && (l[2] === 'PN') === (data.lemmas[st.seg[3]][2] === 'PN'));
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
      const g = stripLat(l[4]); const d = stripLat(l[7]);
      const words = g.split(/[\s,;()…/]+/);
      const re = new RegExp('(^|[^a-z])' + ql.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (words.includes(ql)) score = 60000;
      else if (g.startsWith(ql)) score = 40000;
      else if (re.test(g)) score = 20000;
      else if (q.length >= 3 && re.test(d)) score = 5000;
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

function rememberWord(ctx, id) {
  const L = (ctx.settings.recentWords || []).filter(x => x !== id); L.unshift(id);
  ctx.settings.recentWords = L.slice(0, 12); ctx.save();
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
  const showEntry = (id) => { state.entry = id; rememberWord(ctx, id); renderDictEntry(ctx, entryEl, id, showEntry); listEl.querySelectorAll('.aa-dict-row').forEach(r => r.classList.toggle('aa-on', +r.dataset.id === id)); entryEl.scrollIntoView && window.innerWidth < 800 && entryEl.scrollIntoView({ block: 'start' }); };
  if (state.mode === 'search') {
    const bar = h(listEl, 'div', 'aa-toolbar');
    const inp = h(bar, 'input', 'aa-input-line aa-dict-q'); inp.type = 'search'; inp.placeholder = 'كتب · livre · kitāb'; if (state.q == null) state.q = ctx.settings.dictQ || ''; inp.value = state.q;
    selectEl(bar, [['all', 'tous'], ['N', 'noms'], ['V', 'verbes'], ['P', 'particules']], state.filter || 'all', v => { state.filter = v; renderDictTab(ctx, root, state); });
    const res = h(listEl, 'div');
    const run = () => {
      state.q = inp.value; clear(res);
      if (ctx.settings.dictQ !== state.q) { ctx.settings.dictQ = state.q; ctx.save(); }
      const recent = (ctx.settings.recentWords || []).filter(i => data.lemmas[i]);
      if (!state.q.trim() && recent.length) {
        h(res, 'div', 'aa-muted aa-small', 'Récemment vus :');
        const chips = h(res, 'div', 'aa-recent');
        recent.forEach(i => { const c = h(chips, 'span', 'aa-chip aa-recent-chip'); arSpan(c, data.lemmas[i][0]); h(c, 'span', 'aa-small aa-muted', ' ' + data.lemmas[i][4]); c.addEventListener('click', () => showEntry(i)); });
      }
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
  else { entryEl.classList.add('aa-dict-empty'); h(entryEl, 'p', 'aa-muted', 'Choisis un mot dans la liste pour voir sa fiche complète.'); }
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
  clear(el); el.classList.remove('aa-dict-empty');
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
  btn(moreMenu(act), 'Ajouter à mes cartes de révision', () => ctx.addFlashcard(l[0], l[4] + ' — ' + tr));
  btn(moreMenu(act), 'Insérer dans ma note Obsidian', () => ctx.insertText('- ' + l[0] + ' (' + tr + ') — ' + l[4] + (l[3] ? ' · racine ' + l[3] : '') + '\n'));
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
      { t: 'La dernière voyelle dit le rôle', md: 'En français, l\'ordre des mots dit qui fait quoi. En arabe (comme en latin ou en allemand), c\'est **la fin du mot** :\n\n- **Nominatif** (rafʿ) : **-u** / -un → le sujet, ou l\'attribut.\n- **Accusatif** (naṣb) : **-a** / -an → le complément d\'objet, et quelques autres.\n- **Génitif** (jarr) : **-i** / -in → après une préposition, ou complément du nom (« … de … »).\n\nExemple : ٱللَّهُ (Allāhu, sujet), ٱللَّهَ (Allāha, complément), ٱللَّهِ (Allāhi, après « de »). Même mot, même sens, rôle différent.',
        table: [['Cas', 'Défini', 'Indéfini', 'Quand ?'], ['nominatif', 'ٱلْكِتَابُ', 'كِتَابٌ', 'sujet, attribut'], ['accusatif', 'ٱلْكِتَابَ', 'كِتَابًا', 'complément d\'objet…'], ['génitif', 'ٱلْكِتَابِ', 'كِتَابٍ', 'après préposition, « de »']] },
      { t: 'Les trois cas dans la Fātiḥa', md: 'La Fātiḥa contient les trois cas. Clique sur chaque mot surligné et regarde la section « Pourquoi cette forme ? ».',
        ex: [{ r: '1:2', w: [1], n: 'ٱلْحَمْدُ : **-u**, nominatif. C\'est le sujet : « la louange (est) à Allah ».' }, { r: '1:6', w: [2], n: 'ٱلصِّرَٰطَ : **-a**, accusatif. C\'est le complément : « guide-nous **(sur) le chemin** ».' }, { r: '1:2', w: [3, 4], n: 'رَبِّ ٱلْعَٰلَمِينَ : **-i**, génitif. « Seigneur **de** l\'univers ».' }] },
      { t: 'Le pluriel en -ūna / -īna', md: 'Le pluriel masculin « sain » ne change pas de voyelle mais de **terminaison** : **ـُونَ** au nominatif, **ـِينَ** à l\'accusatif et au génitif. ٱلْكَٰفِرُونَ (nominatif, sourate 109) mais ٱلْعَٰلَمِينَ, ٱلضَّآلِّينَ (génitif, Fātiḥa).',
        ex: [{ r: '109:1', w: [3], n: 'ٱلْكَٰفِرُونَ : ـُونَ → nominatif (on s\'adresse à eux : « ô vous les… »).' }, { r: '1:7', w: [9], n: 'ٱلضَّآلِّينَ : ـِينَ → génitif.' }] },
      { t: 'Tester toi-même', md: 'Dans l\'onglet **Atelier › Changer les voyelles**, change la dernière voyelle d\'un mot et regarde ce que devient son rôle. Dans le détail d\'un mot du Coran, la partie « Et si on changeait le dernier signe ? » montre les trois cas côte à côte.' },
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
      { t: 'Pas de verbe « être » au présent', md: 'En arabe, on ne dit pas « est » au présent. On pose **deux mots au nominatif** :\n\n- le **sujet** (mubtadaʾ, المُبْتَدَأ), en général **défini** ;\n- l\'**attribut** (khabar, الخَبَر), ce qu\'on dit de lui, souvent **indéfini**.\n\nٱلْبَيْتُ كَبِيرٌ = « la maison (est) grande ». Si l\'attribut était défini, on lirait « la grande maison » : c\'est souvent le **tanwīn** de l\'attribut qui montre qu\'il y a une phrase.' },
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
    ess.forEach(r => { const li = h(ul0, 'li'); mdText(li, 'span', null, r.one + ' '); const a = h(li, 'a', 'aa-link aa-rule-link aa-more', 'en savoir plus'); a.title = r.title; a.addEventListener('click', e => { e.preventDefault(); const nx = li.nextSibling; if (nx && nx.classList && nx.classList.contains('aa-rule-inline')) { nx.remove(); return; } const hold = document.createElement('li'); hold.className = 'aa-rule-li'; li.parentNode.insertBefore(hold, li.nextSibling); const c = renderRuleCard(ctx, hold, r, { inline: true }); hold.classList.add('aa-rule-inline'); c.classList.remove('aa-rule-inline'); c.querySelector('.aa-actions button:last-child').onclick = () => hold.remove(); }); });
    h(box, 'div', 'aa-muted aa-small', 'Les mots soulignés en pointillé ouvrent leur règle.');
  }
  const goal = details(root, '🎯 Ce que tu vas apprendre', false, 'aa-sec aa-lesson-goal');
  const ul = h(goal, 'ul'); L.goal.forEach(g => mdText(ul, 'li', null, g));
  if (L.rules && L.rules.length) {
    const r = h(goal, 'div', 'aa-small'); h(r, 'span', 'aa-muted', 'Fiches de ton coffre : ');
    L.rules.forEach((n, i) => { const a = h(r, 'a', 'aa-link', n); a.addEventListener('click', e => { e.preventDefault(); ctx.openPath('2 - Règles/' + n + '.md'); }); if (i < L.rules.length - 1) r.appendChild(document.createTextNode(' · ')); });
  }
  const NS = L.sections.length;
  const stepBar = h(root, 'div', 'aa-steps');
  const steps = [];
  const openStep = (i, scroll) => {
    steps.forEach((d, j) => { d.open = j === i; });
    stepBar.querySelectorAll('.aa-step-dot').forEach((b, j) => { b.classList.toggle('aa-on', j === i); b.classList.toggle('aa-seen', j < i); });
    state.step = i; saveLessonPlace(ctx, state);
    if (scroll && steps[i] && steps[i].scrollIntoView) setTimeout(() => steps[i].scrollIntoView({ block: 'start', behavior: 'smooth' }), 30);
  };
  h(stepBar, 'span', 'aa-muted aa-small', 'Étapes :');
  for (let si = 0; si < NS; si++) { const b = h(stepBar, 'button', 'aa-step-dot', String(si + 1)); b.title = L.sections[si].t; b.addEventListener('click', ev => { ev.preventDefault(); openStep(si, true); }); }
  if (state.stepFor !== L.id) { state.step = 0; state.stepFor = L.id; }
  for (let si = 0; si < NS; si++) {
    const S = L.sections[si];
    const det = h(root, 'details', 'aa-step');
    const sm = h(det, 'summary'); h(sm, 'span', 'aa-step-n', String(si + 1)); h(sm, 'span', 'aa-step-t', S.t);
    det.addEventListener('toggle', () => { if (det.open && state.step !== si) openStep(si, false); });
    steps.push(det);
    const sec = h(det, 'div', 'aa-lesson-sec');
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
    const nx = h(sec, 'div', 'aa-actions aa-step-next');
    if (si < NS - 1) btn(nx, 'Étape suivante : ' + L.sections[si + 1].t + ' →', () => openStep(si + 1, true), 'mod-cta');
    else btn(nx, 'Fini ! Voir le résumé et les questions ↓', () => { steps[si].open = false; keepBox.scrollIntoView && keepBox.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 'mod-cta');
  }
  openStep(Math.min(state.step || 0, NS - 1), false);
  const keep = h(root, 'div', 'aa-lesson-keep'); const keepBox = keep;
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
  }
  box.appendChild(fb);
}
/* ====================================================================
 * 06e - Les règles expliquées simplement (onglet Règles)
 * one : en une phrase · txt : l'explication (phrases courtes) · ru : comparaison (français)
 * ex : [arabe, lecture, sens] · terms : mots qui ouvrent cette règle
 * ==================================================================== */
const RULE_GROUPS = [['mot', 'Le mot'], ['nom', 'Le nom et ses cas'], ['phrase', 'La phrase'], ['verbe', 'Le verbe'], ['lecture', 'La prononciation']];
const RULES = [
  { id: 'racine', g: 'mot', title: 'La racine', ar: 'الجَذْر',
    one: 'Presque chaque mot arabe est construit sur 3 consonnes qui portent une idée.',
    txt: 'Prends les lettres **ك ت ب** (k-t-b). Elles veulent dire « écrire ».\nTous les mots qui parlent d\'écriture ont ces 3 lettres, dans le même ordre.\nOn change seulement les voyelles et on ajoute des lettres autour.\nCes 3 lettres s\'appellent **la racine**.',
    ex: [['كَتَبَ', 'kataba', 'il a écrit'], ['كَاتِب', 'kātib', 'un écrivain'], ['كِتَاب', 'kitāb', 'un livre'], ['مَكْتُوب', 'maktūb', 'écrit']],
    terms: ['racine', 'racines'] },
  { id: 'scheme', g: 'mot', title: 'Le moule (schème)', ar: 'الوَزْن',
    one: 'Le moule, c\'est la forme dans laquelle on met la racine ; il donne la nuance du sens.',
    txt: 'Les grammairiens écrivent les moules avec les lettres **ف ع ل** à la place de la racine.\nExemple : le moule **fāʿil** (ā après la 1re lettre, i après la 2e) veut dire « celui qui fait ».\nOn verse n\'importe quelle racine dedans : k-t-b → kātib (celui qui écrit), ʿ-l-m → ʿālim (celui qui sait).',
    ex: [['كَاتِب', 'kātib', 'celui qui écrit'], ['عَالِم', 'ʿālim', 'celui qui sait'], ['مَكْتُوب', 'maktūb', 'ce qui est écrit (moule mafʿūl)']],
    terms: ['moule', 'moules', 'schème', 'fāʿil'] },
  { id: 'defini', g: 'nom', title: 'Défini : l\'article ال', ar: 'المَعْرِفَة',
    one: 'ال collé devant un nom veut dire « le, la ».',
    txt: 'كِتَاب = un livre. **ٱلْكِتَاب** = **le** livre.\nال se colle au mot, il ne s\'écrit jamais seul.\nUn nom avec ال n\'a **jamais** de tanwīn (le petit « n » à la fin).',
    ex: [['ٱلْحَمْدُ', 'al-ḥamdu', 'la louange'], ['ٱلْقَمَرُ', 'al-qamaru', 'la lune']],
    terms: ['défini', 'définis', 'définie', 'article'] },
  { id: 'tanwin', g: 'nom', title: 'Indéfini : le tanwīn', ar: 'التَّنْوِين',
    one: 'Le tanwīn est une voyelle doublée à la fin du mot ; on l\'entend comme un « n » et il veut dire « un, une ».',
    txt: 'On écrit la voyelle **deux fois** : ـٌ (-un), ـً (-an), ـٍ (-in).\nكِتَابٌ = kitābun = **un** livre.\nSoit ال au début, soit tanwīn à la fin : **jamais les deux**.',
    ex: [['أَحَدٌ', 'aḥadun', 'un, unique'], ['كِتَابًا', 'kitāban', 'un livre (complément)'], ['خُسْرٍ', 'khusrin', 'une perte (après préposition)']],
    terms: ['tanwīn', 'indéfini', 'indéfinis', 'indéfinie'] },
  { id: 'cas', g: 'nom', title: 'Les 3 cas : -u, -a, -i', ar: 'الإِعْرَاب',
    one: 'La dernière voyelle d\'un nom montre son rôle dans la phrase : -u, -a ou -i.',
    txt: 'Le sens du mot ne change pas. Seule sa **dernière voyelle** change.\n**-u** (nominatif) : c\'est le sujet, celui dont on parle.\n**-a** (accusatif) : c\'est le complément, ce qui subit l\'action.\n**-i** (génitif) : il vient après une préposition, ou il veut dire « de … ».',
    ex: [['ٱلْكِتَابُ', 'al-kitābu', 'le livre (sujet)'], ['ٱلْكِتَابَ', 'al-kitāba', 'le livre (complément)'], ['ٱلْكِتَابِ', 'al-kitābi', 'du livre / après préposition']],
    terms: ['cas', 'trois cas', '3 cas'] },
  { id: 'nominatif', g: 'nom', title: 'Le nominatif (-u)', ar: 'الرَّفْع',
    one: 'Le nominatif (finale -u) marque le sujet ou l\'attribut.',
    txt: 'Fin du mot : **ـُ** (-u), **ـٌ** (-un), ou **ـُونَ** pour un pluriel masculin.\nOn l\'utilise pour : le sujet d\'un verbe, le sujet d\'une phrase sans verbe, et ce qu\'on dit du sujet (l\'attribut).',
    ex: [['ٱلْحَمْدُ لِلَّهِ', 'al-ḥamdu lillāh', 'la louange (est) à Allah'], ['جَاءَ نَصْرُ ٱللَّهِ', 'jāʾa naṣru llāh', 'le secours d\'Allah vient']],
    terms: ['nominatif', 'nominatifs', 'rafʿ'] },
  { id: 'accusatif', g: 'nom', title: 'L\'accusatif (-a)', ar: 'النَّصْب',
    one: 'L\'accusatif (finale -a) marque surtout le complément d\'objet.',
    txt: 'Fin du mot : **ـَ** (-a), **ـً** (-an), ou **ـِينَ** au pluriel masculin.\nOn l\'utilise pour : le complément d\'objet (« qui ? quoi ? »), le nom après إِنَّ, l\'attribut après كَانَ, et pour dire quand, où, comment.',
    ex: [['ٱهْدِنَا ٱلصِّرَاطَ', 'ihdinā ṣ-ṣirāṭa', 'guide-nous (sur) le chemin'], ['إِنَّ ٱلْإِنْسَانَ', 'inna l-insāna', 'certes l\'homme']],
    terms: ['accusatif', 'accusatifs', 'naṣb'] },
  { id: 'genitif', g: 'nom', title: 'Le génitif (-i)', ar: 'الجَرّ',
    one: 'Le génitif (finale -i) vient après une préposition ou veut dire « de … ».',
    txt: 'Fin du mot : **ـِ** (-i), **ـٍ** (-in), ou **ـِينَ** au pluriel masculin.\nDeux cas seulement :\n1. après une **préposition** (فِي, مِنْ, بِ, لِ…) ;\n2. comme 2e mot de « le X **de** Y » (l\'annexion).',
    ex: [['بِسْمِ ٱللَّهِ', 'bismi llāh', 'au nom d\'Allah'], ['رَبِّ ٱلْعَالَمِينَ', 'rabbi l-ʿālamīn', 'Seigneur de l\'univers']],
    terms: ['génitif', 'génitifs', 'jarr', 'majrūr'] },
  { id: 'prep', g: 'nom', title: 'Les prépositions', ar: 'حُرُوف الجَرّ',
    one: 'Après une préposition (dans, de, à, sur…), le nom finit toujours par -i.',
    txt: 'Petits mots : **فِي** dans, **مِنْ** de, **إِلَى** vers, **عَلَى** sur, **عَنْ** loin de.\nUne seule lettre collée : **بِـ** par / avec, **لِـ** à / pour, **كَـ** comme.\nAprès elles : **-i** à la fin du nom. Toujours.',
    ex: [['فِي ٱلْبَيْتِ', 'fi l-bayti', 'dans la maison'], ['لِلَّهِ', 'lillāhi', 'à Allah'], ['عَلَيْهِمْ', 'ʿalayhim', 'sur eux']],
    terms: ['préposition', 'prépositions', 'préposition collée'] },
  { id: 'idafa', g: 'nom', title: 'L\'annexion : « le X de Y »', ar: 'الإِضَافَة',
    one: 'Pour dire « le X de Y », on colle deux noms : X sans ال ni tanwīn, puis Y au génitif (-i).',
    txt: 'Il n\'y a pas de mot pour « de ». On met les deux noms côte à côte.\n**1er mot** : pas de ال, pas de tanwīn.\n**2e mot** : toujours **-i** (génitif).\nكِتَابُ ٱلْوَلَدِ = le livre **de** l\'enfant.',
    ex: [['رَبِّ ٱلْعَالَمِينَ', 'rabbi l-ʿālamīn', 'le Seigneur de l\'univers'], ['يَوْمِ ٱلدِّينِ', 'yawmi d-dīn', 'le jour du Jugement'], ['نَصْرُ ٱللَّهِ', 'naṣru llāh', 'le secours d\'Allah']],
    terms: ['annexion', 'annexions', 'iḍāfa', 'complément du nom', 'muḍāf ilayh'] },
  { id: 'pronoms', g: 'nom', title: 'Les pronoms collés', ar: 'الضَّمَائِر المُتَّصِلَة',
    one: 'Un pronom peut se coller à la fin d\'un mot : sur un nom il veut dire « mon, ton, son… ».',
    txt: '**ـِي** mon · **ـكَ** ton · **ـهُ** son (à lui) · **ـهَا** son (à elle) · **ـنَا** notre · **ـكُمْ** votre · **ـهُمْ** leur.\nSur un **verbe**, ils veulent dire « me, te, le… » : ٱهْدِنَا = guide-**nous**.\nSur une **préposition** : لَهُ = à **lui**, عَلَيْهِمْ = sur **eux**.',
    ex: [['رَبُّكَ', 'rabbuka', 'ton Seigneur'], ['مَالُهُ', 'māluhu', 'sa fortune'], ['ٱهْدِنَا', 'ihdinā', 'guide-nous']],
    terms: ['pronom collé', 'pronoms collés', 'possessif', 'pronom'] },
  { id: 'adjectif', g: 'nom', title: 'L\'adjectif', ar: 'النَّعْت',
    one: 'L\'adjectif vient après le nom et copie tout : son cas, son ال ou son tanwīn, son genre, son nombre.',
    txt: 'En arabe, l\'adjectif est **après** le nom, comme souvent en français.\nIl est le « jumeau » du nom : même fin, même ال.\nبَيْتٌ كَبِيرٌ = une grande maison. ٱلْبَيْتُ ٱلْكَبِيرُ = la grande maison.',
    ex: [['ٱلصِّرَاطَ ٱلْمُسْتَقِيمَ', 'aṣ-ṣirāṭa l-mustaqīm', 'le chemin droit'], ['عَذَابٌ عَظِيمٌ', 'ʿadhābun ʿaẓīm', 'un châtiment immense']],
    terms: ['adjectif', 'adjectifs', 'naʿt'] },
  { id: 'pluriel', g: 'nom', title: 'Pluriel en -ūna / -īna', ar: 'جَمْع المُذَكَّر السَّالِم',
    one: 'Le pluriel masculin régulier finit par ـُونَ (sujet) ou ـِينَ (complément ou après préposition).',
    txt: 'Ici, ce n\'est pas la dernière voyelle qui change, c\'est **la fin entière** :\n**ـُونَ** (-ūna) au nominatif,\n**ـِينَ** (-īna) à l\'accusatif et au génitif.\nLe ن final reste toujours.',
    ex: [['ٱلْمُؤْمِنُونَ', 'al-muʾminūna', 'les croyants (sujet)'], ['ٱلْعَالَمِينَ', 'al-ʿālamīna', 'les mondes (après « de »)']],
    terms: ['pluriel masculin', 'ـُونَ', 'ـِينَ'] },
  { id: 'diptote', g: 'nom', title: 'Les noms « diptotes »', ar: 'المَمْنُوع مِنَ الصَّرْف',
    one: 'Certains noms (beaucoup de noms propres) refusent le tanwīn et le -i : ils mettent -a à la place.',
    txt: 'Ces noms n\'ont que deux fins au lieu de trois : -u et -a.\nAprès une préposition, ils prennent **-a** au lieu de -i.\nC\'est le cas de beaucoup de noms propres étrangers (إِبْرَاهِيمَ, مُوسَى…) et de certains pluriels.',
    ex: [['بِإِبْرَاهِيمَ', 'bi-ibrāhīma', 'avec Abraham (-a au lieu de -i)']],
    terms: ['diptote', 'diptotes'] },
  { id: 'nominale', g: 'phrase', title: 'La phrase nominale (sans verbe)', ar: 'الجُمْلَة الاِسْمِيَّة',
    one: 'Une phrase sans verbe : « sujet + ce qu\'on dit de lui », et on sous-entend « est ».',
    txt: 'En arabe, au présent, on ne dit pas « est ».\nOn met le **sujet**, puis ce qu\'on dit de lui (**l\'attribut**).\nLes deux finissent par **-u**.\nٱلْبَيْتُ كَبِيرٌ = la maison (est) grande.',
    ex: [['ٱللَّهُ ٱلصَّمَدُ', 'allāhu ṣ-ṣamad', 'Allah (est) l\'Absolu'], ['ٱلْحَمْدُ لِلَّهِ', 'al-ḥamdu lillāh', 'la louange (est) à Allah']],
    terms: ['phrase nominale', 'nominale'] },
  { id: 'sujet', g: 'phrase', title: 'Le sujet (mubtadaʾ)', ar: 'المُبْتَدَأ',
    one: 'Le mubtadaʾ est le mot dont on parle, au début d\'une phrase sans verbe.',
    txt: 'C\'est la réponse à « de quoi on parle ? ».\nIl est en général **défini** (avec ال, ou un nom propre, ou un pronom).\nIl finit par **-u**.',
    ex: [['ٱللَّهُ ٱلصَّمَدُ', 'allāhu ṣ-ṣamad', 'ٱللَّهُ est le sujet']],
    terms: ['sujet de la phrase nominale', 'mubtadaʾ', 'sujet'] },
  { id: 'attribut', g: 'phrase', title: 'L\'attribut (khabar)', ar: 'الخَبَر',
    one: 'Le khabar est ce qu\'on dit du sujet : c\'est l\'information nouvelle.',
    txt: 'Dans « la maison (est) grande », l\'attribut est « grande ».\nIl est souvent **indéfini** (avec tanwīn) : c\'est ce qui montre que c\'est une phrase, et pas « la grande maison ».\nL\'attribut peut aussi être un groupe avec une préposition : ٱلْحَمْدُ **لِلَّهِ**.',
    ex: [['ٱلْبَيْتُ كَبِيرٌ', 'al-baytu kabīr', 'la maison est grande'], ['لَيْلَةُ ٱلْقَدْرِ خَيْرٌ', 'laylatu l-qadri khayr', 'la nuit du Destin est meilleure']],
    terms: ['attribut', 'attributs', 'khabar'] },
  { id: 'verbale', g: 'phrase', title: 'La phrase verbale', ar: 'الجُمْلَة الفِعْلِيَّة',
    one: 'Une phrase qui commence par un verbe : verbe → sujet (-u) → complément (-a).',
    txt: 'L\'arabe aime commencer par le verbe.\nكَتَبَ ٱلْوَلَدُ ٱلدَّرْسَ = a écrit l\'enfant la leçon = l\'enfant a écrit la leçon.\nC\'est la fin des mots (-u, -a) qui dit qui fait quoi, pas l\'ordre.',
    ex: [['جَاءَ نَصْرُ ٱللَّهِ', 'jāʾa naṣru llāh', 'est venu le secours d\'Allah'], ['أَخْرَجَتِ ٱلْأَرْضُ أَثْقَالَهَا', 'akhrajati l-arḍu athqālahā', 'la terre a fait sortir ses fardeaux']],
    terms: ['phrase verbale', 'verbale'] },
  { id: 'fail', g: 'phrase', title: 'Le sujet du verbe (fāʿil)', ar: 'الفَاعِل',
    one: 'Le fāʿil est celui qui fait l\'action ; il finit par -u.',
    txt: 'Il vient en général **après** le verbe.\nSouvent, il n\'y a pas de mot séparé : le sujet est **dans la terminaison** du verbe (خَلَقْنَا = **nous** avons créé).',
    ex: [['فَعَلَ رَبُّكَ', 'faʿala rabbuka', 'ton Seigneur a agi'], ['خَلَقْنَا', 'khalaqnā', 'nous avons créé (sujet dans le verbe)']],
    terms: ['sujet du verbe', 'fāʿil'] },
  { id: 'maful', g: 'phrase', title: 'Le complément d\'objet (mafʿūl bihi)', ar: 'المَفْعُول بِهِ',
    one: 'Le mafʿūl bihi est ce qui subit l\'action ; il finit par -a.',
    txt: 'Il répond à « qui ? quoi ? » après le verbe.\nIl peut être un pronom collé au verbe : أَعْطَيْنَاكَ = nous **t\'**avons donné.\nPour insister, il peut passer devant : إِيَّاكَ نَعْبُدُ = c\'est **Toi** que nous adorons.',
    ex: [['خَلَقَ ٱلْإِنْسَانَ', 'khalaqa l-insāna', 'il a créé l\'homme'], ['إِيَّاكَ نَعْبُدُ', 'iyyāka naʿbudu', 'c\'est Toi que nous adorons']],
    terms: ['complément d\'objet', 'complément', 'compléments', 'COD', 'mafʿūl bihi'] },
  { id: 'inna', g: 'phrase', title: 'إِنَّ « certes » et ses sœurs', ar: 'إِنَّ وَأَخَوَاتُهَا',
    one: 'إِنَّ (certes) se met devant une phrase sans verbe et met son sujet à l\'accusatif (-a).',
    txt: 'Sans إِنَّ : ٱلْإِنْسَانُ فِي خُسْرٍ (l\'homme est en perdition).\nAvec إِنَّ : إِنَّ ٱلْإِنْسَانَ فِي خُسْرٍ — le sujet passe de **-u** à **-a**.\nL\'attribut, lui, reste à -u.\nMême effet avec أَنَّ (que), لَكِنَّ (mais), لَعَلَّ (peut-être), كَأَنَّ (comme si).',
    ex: [['إِنَّ ٱللَّهَ غَفُورٌ', 'inna llāha ghafūr', 'certes Allah est pardonneur']],
    terms: ['inna', 'إِنَّ', 'nom de inna', 'attribut de inna'] },
  { id: 'kana', g: 'phrase', title: 'كَانَ « était » et ses sœurs', ar: 'كَانَ وَأَخَوَاتُهَا',
    one: 'كَانَ (il était) garde le sujet à -u mais met l\'attribut à l\'accusatif (-a).',
    txt: 'Sans كَانَ : ٱللَّهُ غَفُورٌ.\nAvec كَانَ : كَانَ ٱللَّهُ **غَفُورًا** — c\'est l\'**attribut** qui passe à -a.\nC\'est l\'inverse de إِنَّ !\nMême effet avec لَيْسَ (ne pas être), أَصْبَحَ et صَارَ (devenir).',
    ex: [['كَانَ تَوَّابًا', 'kāna tawwābā', 'Il est toujours Accueillant au repentir']],
    terms: ['kāna', 'كَانَ', 'attribut de kāna', 'sujet de kāna'] },
  { id: 'hal', g: 'phrase', title: 'Le complément d\'état (ḥāl)', ar: 'الحَال',
    one: 'Le ḥāl dit comment est quelqu\'un pendant l\'action ; c\'est un nom indéfini en -an.',
    txt: 'Il répond à « dans quel état ? comment ? ».\nيَدْخُلُونَ أَفْوَاجًا = ils entrent **en foule**.',
    ex: [['ٱرْجِعِي رَاضِيَةً', 'irjiʿī rāḍiyatan', 'reviens, satisfaite']],
    terms: ['ḥāl', 'complément d\'état'] },
  { id: 'irab', g: 'phrase', title: 'L\'iʿrāb : analyser une phrase', ar: 'الإِعْرَاب',
    one: 'Faire l\'iʿrāb, c\'est dire pour chaque mot : ce qu\'il est, son rôle, son cas et pourquoi.',
    txt: 'Pour chaque mot, 4 questions :\n1. Nom, verbe ou particule ?\n2. Quel rôle ? (sujet, complément, après préposition…)\n3. Quelle fin ? (-u, -a, -i)\n4. Quel signe le montre ? (la voyelle, ou ـونَ / ـينَ…)\nLe bouton 🧩 **Analyse de la phrase** le fait pour toi.',
    ex: [], terms: ['iʿrāb', 'invariable', 'mabnī'] },
  { id: 'passe', g: 'verbe', title: 'Le verbe au passé', ar: 'المَاضِي',
    one: 'Le passé se forme avec des terminaisons : ـْتُ je, ـْتَ tu, ـَ il, ـَتْ elle, ـْنَا nous, ـُوا ils.',
    txt: 'Le dictionnaire donne le verbe à « il a fait » : كَتَبَ = il a écrit.\nPour les autres personnes, on ajoute une fin : كَتَبْتُ j\'ai écrit, كَتَبْنَا nous avons écrit.\nLa fin **est** le sujet : pas besoin de dire « je » ou « nous ».',
    ex: [['خَلَقْنَا', 'khalaqnā', 'nous avons créé'], ['أَنْعَمْتَ', 'anʿamta', 'tu as comblé']],
    terms: ['passé', 'verbe au passé'] },
  { id: 'present', g: 'verbe', title: 'Le verbe au présent', ar: 'المُضَارِع',
    one: 'Au présent, la personne se voit au début du verbe : أَ je, نَ nous, تَ tu, يَ il.',
    txt: 'Retiens le mot **أنيت** : أَ (je), نَ (nous), يَ (il), تَ (tu / elle).\nنَعْبُدُ = nous adorons. يَعْلَمُ = il sait.\nLa fin du verbe peut changer (voir « les modes »).',
    ex: [['نَعْبُدُ', 'naʿbudu', 'nous adorons'], ['أَعُوذُ', 'aʿūdhu', 'je cherche refuge']],
    terms: ['présent', 'verbe au présent'] },
  { id: 'modes', g: 'verbe', title: 'Les 3 modes du présent', ar: 'الرَّفْع وَالنَّصْب وَالجَزْم',
    one: 'La fin du verbe au présent change selon le petit mot devant : -u (normal), -a (après لَنْ, أَنْ), ـْ (après لَمْ, لَا « ne… pas ! »).',
    txt: '**Indicatif -u** : la forme normale. يَعْلَمُ = il sait.\n**Subjonctif -a** : après **أَنْ** (que) et **لَنْ** (ne… jamais). لَنْ يَقْدِرَ = il ne pourra pas.\n**Apocopé ـْ** (soukoun) : après **لَمْ** (ne… pas, au passé !) et **لَا** d\'interdiction. لَمْ يَلِدْ = Il n\'a pas engendré.',
    ru: 'Un peu comme le subjonctif français (« il faut qu\'il **vienne** ») : un petit mot devant change la forme du verbe.',
    ex: [['لَمْ يَلِدْ', 'lam yalid', 'Il n\'a pas engendré'], ['لَنْ يَقْدِرَ', 'lan yaqdira', 'il ne pourra pas']],
    terms: ['mode', 'modes', 'indicatif', 'subjonctif', 'apocopé', 'apocopés'] },
  { id: 'imperatif', g: 'verbe', title: 'L\'impératif', ar: 'الأَمْر',
    one: 'L\'impératif (« fais ! ») vient du présent : on enlève le تَـ du début et on met un soukoun à la fin.',
    txt: 'تَقْرَأُ (tu lis) → قْرَأْ → on ajoute ٱ devant car on ne peut pas commencer par un soukoun → **ٱقْرَأْ** (lis !).\nتَقُولُ → **قُلْ** (dis !).\nPour interdire : **لَا** + présent avec soukoun : لَا تَقُلْ = ne dis pas !',
    ex: [['ٱقْرَأْ', 'iqraʾ', 'lis !'], ['قُلْ', 'qul', 'dis !'], ['فَلَا تَقْهَرْ', 'fa-lā taqhar', 'n\'opprime pas !']],
    terms: ['impératif', 'impératifs', 'interdiction'] },
  { id: 'passif', g: 'verbe', title: 'Le passif', ar: 'المَبْنِيّ لِلْمَجْهُول',
    one: 'Au passif (« a été fait »), le verbe change ses voyelles : u-i au passé, yu-a au présent.',
    txt: 'كَتَبَ (il a écrit) → **كُتِبَ** (il a été écrit).\nيَكْتُبُ (il écrit) → **يُكْتَبُ** (il est écrit).\nCelui qui subit devient le sujet, avec -u.',
    ex: [['وَلَمْ يُولَدْ', 'wa lam yūlad', 'et Il n\'a pas été engendré']],
    terms: ['passif'] },
  { id: 'wasla', g: 'lecture', title: 'L\'alif de liaison ٱ', ar: 'هَمْزَة الوَصْل',
    one: 'ٱ (alif avec un petit ص) ne se prononce pas au milieu d\'une phrase : on enchaîne directement.',
    txt: 'Au début d\'une lecture, on le dit (a- ou i-).\nAu milieu, il disparaît : بِسْمِ ٱللَّهِ se lit **bismi llāh**, pas « bismi allāh ».',
    ru: 'Comme le « e » muet français qu\'on avale : « je l\'ai » au lieu de « je le ai ».',
    ex: [['بِسْمِ ٱللَّهِ', 'bismi llāhi', 'le ٱ est muet'], ['وَٱلْعَصْرِ', 'wa-l-ʿaṣri', 'le ٱ est muet']],
    terms: ['alif de liaison', 'waṣla'] },
  { id: 'solaires', g: 'lecture', title: 'Lettres solaires et lunaires', ar: 'الحُرُوف الشَّمْسِيَّة وَالقَمَرِيَّة',
    one: 'Devant 14 lettres « solaires », le l de ال ne se prononce pas et la lettre suivante est doublée.',
    txt: 'ٱلشَّمْس se lit **ash-shams** (pas al-shams).\nٱلْقَمَر se lit **al-qamar** (on entend le l).\nAstuce : s\'il y a une chadda (ّ) sur la lettre après ال, le l est muet.\nLes 14 solaires : ت ث د ذ ر ز س ش ص ض ط ظ ل ن.',
    ex: [['ٱلنَّاس', 'an-nās', 'les gens (n solaire)'], ['ٱلْكِتَاب', 'al-kitāb', 'le livre (k lunaire)']],
    terms: ['lettre solaire', 'lettres solaires', 'solaire', 'solaires', 'lunaire'] },
  { id: 'madd', g: 'lecture', title: 'Les voyelles longues (madd)', ar: 'المَدّ',
    one: 'ا و ي après la bonne voyelle allongent le son : ā, ū, ī (2 temps) ; avec le signe ٓ on allonge encore plus (4 à 6 temps).',
    txt: 'ـَا = ā, ـُو = ū, ـِي = ī : 2 temps (deux fois une voyelle courte).\nLe petit alif ٰ au-dessus d\'une lettre se lit aussi ā.\nLe signe **ٓ** (madda) demande un allongement long : 4 à 6 temps.',
    ex: [['ٱلضَّآلِّينَ', 'aḍ-ḍāāāllīn', 'madda : ā très long'], ['ٱلرَّحِيمِ', 'ar-raḥīm', 'ī long']],
    terms: ['voyelle longue', 'voyelles longues', 'madd', 'allongement'] },
  { id: 'ghunna', g: 'lecture', title: 'La nasalisation (ghunna)', ar: 'الغُنَّة',
    one: 'Sur un ن ou un م avec chadda, et sur certains n cachés, le son passe par le nez pendant 2 temps.',
    txt: 'إِنَّ : on tient le **nn** dans le nez.\nUn n sans voyelle (ou un tanwīn) devant certaines lettres est « caché » : on le dit à moitié, par le nez (ikhfāʾ).\nDevant ب, il devient m (iqlāb) : مِنۢ بَعْدِ se lit « mim baʿdi ».',
    ru: 'Comme les voyelles nasales françaises (« on », « an »), en tenant le son.',
    ex: [['إِنَّ', 'inna', 'nn nasal'], ['أَنْزَلْنَا', 'anzalnā', 'n caché devant ز']],
    terms: ['ghunna', 'nasalisation', 'idghām', 'ikhfāʾ', 'iqlāb'] },
  { id: 'qalqala', g: 'lecture', title: 'L\'écho (qalqala)', ar: 'القَلْقَلَة',
    one: 'Les lettres ق ط ب ج د avec un soukoun « rebondissent » : on entend un petit écho.',
    txt: 'Retiens le mot **قُطْبُ جَدٍّ** : ce sont ces 5 lettres.\nQuand elles ont un soukoun (ْ), ou à la fin d\'un verset, on les relâche avec un petit écho : أَحَدْ → « aḥad(e) ».',
    ex: [['أَحَدٌ', 'aḥad', 'à l\'arrêt : d avec écho'], ['ٱلْفَلَقِ', 'al-falaq', 'à l\'arrêt : q avec écho']],
    terms: ['qalqala', 'écho'] },
  { id: 'waqf', g: 'lecture', title: 'L\'arrêt en fin de verset (waqf)', ar: 'الوَقْف',
    one: 'Quand on s\'arrête (fin de verset), on ne prononce pas la dernière voyelle ni le tanwīn.',
    txt: 'ٱلْعَالَمِينَ → on dit **al-ʿālamīn** (sans le -a final).\nأَحَدٌ → **aḥad** (sans -un).\nException : -an devient **ā** : أَفْوَاجًا → afwājā.\nة devient **h** : رَاضِيَةً → rāḍiyah.',
    ex: [['ٱلرَّحِيمِ', 'ar-raḥīm', 'pas « ar-raḥīmi »']],
    terms: ['arrêt', 'waqf', 'pause'] },
  { id: 'muet', g: 'lecture', title: 'Les lettres muettes', ar: 'الحُرُوف الَّتِي لَا تُنْطَق',
    one: 'Certaines lettres s\'écrivent mais ne se disent pas ; dans le Coran, un petit rond ۟ au-dessus les signale.',
    txt: 'Le **petit rond ۟** au-dessus d\'une lettre = on ne la prononce pas : ءَامَنُوا۟ se lit **āmanū**.\nL\'**alif après le tanwīn -an** ne se dit pas (sauf à l\'arrêt) : كِتَابًا = kitāban.\nLe **ٱ** au milieu de la phrase, et le **l de ال** devant une lettre solaire.',
    ex: [['ءَامَنُوا۟', 'āmanū', 'le dernier alif est muet'], ['أُو۟لَٰٓئِكَ', 'ulāʾika', 'le و est muet']],
    terms: ['muet', 'muette', 'muets', 'muettes', 'ne se prononce pas'] },
];
/* ====================================================================
 * 06f - Onglet Règles + mots cliquables qui ouvrent la règle
 * ==================================================================== */
const LESSON_RULES = {
  racine: ['racine', 'scheme'], defini: ['defini', 'tanwin', 'solaires'], cas: ['cas', 'nominatif', 'accusatif', 'genitif', 'pluriel'],
  prep: ['prep', 'genitif'], idafa: ['idafa', 'genitif'], pronoms: ['pronoms'], nominale: ['nominale', 'sujet', 'attribut'], adjectif: ['adjectif'],
  passe: ['passe'], verbale: ['verbale', 'fail', 'maful'], present: ['present', 'modes'], imperatif: ['imperatif', 'modes'], inna: ['inna', 'kana'], irab: ['irab', 'cas'],
};
const ruleById = id => RULES.find(r => r.id === id);
let TERM_INDEX = null;
function termIndex() {
  if (TERM_INDEX) return TERM_INDEX;
  TERM_INDEX = [];
  RULES.forEach(r => r.terms.forEach(t => TERM_INDEX.push([stripLatTerm(t), r.id])));
  TERM_INDEX.sort((a, b) => b[0].length - a[0].length);
  return TERM_INDEX;
}
function stripLatTerm(s) { return String(s).toLowerCase().replace(/[’']/g, '\'').trim(); }
function findRuleFor(text) {
  const t = ' ' + stripLatTerm(text) + ' ';
  for (const [term, id] of termIndex()) {
    const i = t.indexOf(term);
    if (i < 0) continue;
    const before = t[i - 1], after = t[i + term.length];
    const isW = c => c && /[a-zà-ÿʿʾḍḥṣṭẓāīūḫ0-9]/i.test(c);
    if (!isW(before) && !isW(after)) return id;
  }
  return null;
}

/* Petite fiche (utilisée dans l'onglet et dans les leçons) */
function renderRuleCard(ctx, parent, r, opts) {
  opts = opts || {};
  const box = h(parent, 'div', 'aa-rule-card' + (opts.inline ? ' aa-rule-inline' : ''));
  const top = h(box, 'div', 'aa-rule-top');
  h(top, 'b', 'aa-rule-title', r.title);
  arSpan(top, r.ar, 'aa-rule-ar');
  mdText(box, 'div', 'aa-rule-one', '💡 ' + r.one);
  r.txt.split('\n').forEach(l => mdText(box, 'div', 'aa-rule-line', l));
  if (r.ex && r.ex.length) {
    const t = h(box, 'table', 'aa-table aa-rule-ex');
    r.ex.forEach(([ar, tr, fr]) => {
      const row = h(t, 'tr');
      const c = h(row, 'td'); arSpan(c, ar, 'aa-mid');
      h(row, 'td', 'aa-tr', tr);
      const d = h(row, 'td'); addBidi(d, fr);
      const s = h(row, 'td'); soundBtn(s, () => speak(ar), 'Écouter');
    });
  }
  if (r.ru) { const ru = h(box, 'div', 'aa-rule-ru'); addBidi(ru, r.ru); }
  if (opts.inline) {
    const a = h(box, 'div', 'aa-actions');
    if (ruleDoc(r.id)) { let dbox = null; btn(a, '📖 Explication détaillée', () => { if (dbox) { dbox.remove(); dbox = null; return; } dbox = h(document.createElement('div'), 'div'); box.insertBefore(dbox, a); renderRuleDetail(ctx, dbox, r); }, 'aa-btn-quiet'); }
    btn(a, 'Ouvrir la fiche complète (Apprendre › Règles)', () => ctx.openRule(r.id), 'aa-btn-quiet');
    btn(a, 'Fermer', () => box.remove(), 'aa-btn-quiet');
  } else {
    const dd = details(box, '📖 Explication détaillée', !!opts.openDetail, 'aa-doc-det');
    let done = false; const fill = () => { if (done) return; done = true; renderRuleDetail(ctx, dd, r); };
    if (dd.open) fill(); dd.addEventListener('toggle', () => { if (dd.open) fill(); });
    const ls = LESSONS.filter(L => (LESSON_RULES[L.id] || []).includes(r.id));
    if (ls.length) {
      const p = h(box, 'div', 'aa-small'); h(p, 'span', 'aa-muted', 'Pour s\'entraîner : ');
      ls.forEach((L, i) => { const lk = h(p, 'a', 'aa-link', 'Leçon ' + (LESSONS.indexOf(L) + 1) + ' : ' + L.title); lk.addEventListener('click', e => { e.preventDefault(); ctx.openLesson(L.id); }); if (i < ls.length - 1) p.appendChild(document.createTextNode(' · ')); });
    }
    const a = h(box, 'div', 'aa-actions');
    btn(moreMenu(a), 'Insérer dans ma note Obsidian', () => ctx.insertText('> [!tip] ' + r.title + ' (' + r.ar + ')\n> ' + r.one.replace(/\*\*/g, '') + '\n' + r.txt.split('\n').map(l => '> ' + l).join('\n') + '\n' + (r.ex || []).map(e => '> - ' + e[0] + ' (' + e[1] + ') : ' + e[2]).join('\n') + '\n\n'), 'aa-btn-quiet');
    btn(moreMenu(a), 'Ajouter à mes cartes de révision', () => ctx.addFlashcard(r.title + ' (' + r.ar + ')', r.one.replace(/\*\*/g, '')), 'aa-btn-quiet');
  }
  return box;
}

/* Rend cliquables les mots en gras qui correspondent à une règle */
function linkTerms(ctx, root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('b').forEach(b => {
    if (b.classList.contains('aa-term') || b.closest('.aa-rule-card') || b.closest('button')) return;
    const id = findRuleFor(b.textContent); if (!id) return;
    b.classList.add('aa-term'); b.title = 'Voir l\'explication : ' + ruleById(id).title;
    b.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const block = b.closest('li, .aa-lesson-p, .aa-rule-line, .aa-why, .aa-why-txt, .aa-lesson-note, p, div') || b.parentElement;
      const nxt = block.nextSibling;
      if (nxt && nxt.classList && nxt.classList.contains('aa-rule-inline') && nxt.dataset.rule === id) { nxt.remove(); return; }
      const holder = document.createElement('div');
      block.parentNode.insertBefore(holder, block.nextSibling);
      const card = renderRuleCard(ctx, holder, ruleById(id), { inline: true });
      card.dataset.rule = id;
      holder.replaceWith(card);
    });
  });
}

function renderRulesTab(ctx, root, state) {
  clear(root);
  mdText(root, 'p', 'aa-help', 'Toutes les règles **expliquées simplement**, avec des exemples tirés du Coran. Dans les leçons et dans l\'analyse, les **mots soulignés** ouvrent directement la bonne règle.');
  const inp = h(root, 'input', 'aa-input aa-search'); inp.type = 'search'; inp.placeholder = 'Chercher une règle : génitif, annexion, kāna, muet…';
  inp.value = state.q || '';
  const out = h(root, 'div');
  const draw = () => {
    clear(out);
    const q = stripLatTerm(inp.value);
    const list = RULES.filter(r => !q || stripLatTerm(r.title + ' ' + r.one + ' ' + r.terms.join(' ')).includes(q));
    if (!list.length) { h(out, 'p', 'aa-muted', 'Aucune règle trouvée.'); return; }
    RULE_GROUPS.forEach(([g, label]) => {
      const rs = list.filter(r => r.g === g); if (!rs.length) return;
      h(out, 'h3', null, label);
      if (g === 'lecture' && ctx.openTab) { const a = h(out, 'div', 'aa-actions'); btn(a, '🔤 L\'alphabet : prononcer chaque lettre, avec le schéma de la bouche et de la gorge', () => ctx.openTab('alphabet', { mode: 'letters' }), 'aa-btn-quiet'); }
      rs.forEach(r => {
        const d = details(out, r.title + '  —  ' + r.one.replace(/\*\*/g, ''), state.open === r.id || (!!q && list.length <= 2), 'aa-rule-det');
        d.dataset.rule = r.id;
        const sm = d.querySelector('summary'); sm.textContent = ''; const st = h(sm, 'b'); addBidi(st, r.title); const so = h(sm, 'div', 'aa-muted aa-small aa-rule-sum'); addBidi(so, r.one.replace(/\*\*/g, ''));
        let filled = false;
        const fill = () => { if (filled) return; filled = true; renderRuleCard(ctx, d, r, { openDetail: state.open === r.id }); };
        if (d.open) fill();
        d.addEventListener('toggle', () => { if (d.open) fill(); });
      });
    });
    if (state.open) { const el = out.querySelector('[data-rule="' + state.open + '"]'); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); }
  };
  inp.addEventListener('input', () => { state.q = inp.value; state.open = null; draw(); });
  draw();
}

/* ====================================================================
 * Explications détaillées (content/regles/*.md) et corrections non destructives
 * ==================================================================== */
function renderDocTable(parent, rows) {
  const t = h(parent, 'table', 'aa-table aa-doc-table');
  rows.forEach((row, ri) => {
    const tr = h(t, 'tr');
    row.forEach(c => {
      const cell = h(tr, ri ? 'td' : 'th');
      if (ri && hasArabic(c) && !/[a-zA-Zéèàù]/.test(c.replace(/\*\*/g, ''))) arSpan(cell, c.replace(/\*\*/g, ''), 'aa-mid');
      else mdText(cell, 'span', null, c);
    });
  });
}
/* Langue des explications : 'fr' (les fichiers content/<langue>/ ; ce qui manque est pris en français) */
let UI_LANG = 'fr';
function ruleDoc(id) { return ((RULE_DOCS[UI_LANG] || {})[id]) || ((RULE_DOCS.fr || {})[id]) || ''; }
/* Mini-markdown : ## titres, paragraphes, listes, tableaux, > encadrés, @coran s:v | mots | note */
function renderDoc(ctx, el, md) {
  md = String(md || '').replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/%%[\s\S]*?%%/g, '');
  md = md.replace(/^#{2,3} [^\n]*russe[^\n]*\n[\s\S]*?(?=^#{1,3} |(?![\s\S]))/gim, '');
  const lines = md.split('\n'); const jobs = []; let para = []; let i = 0;
  const flush = () => { if (para.length) { const p = h(el, 'div', 'aa-doc-p'); para.forEach(l => mdText(p, 'div', null, l)); para = []; } };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { flush(); i++; continue; }
    if (/^#{1,3} /.test(l)) { flush(); mdText(el, /^### /.test(l) ? 'h5' : 'h4', 'aa-doc-h', l.replace(/^#+ /, '')); i++; continue; }
    if (/^@coran /.test(l)) {
      flush(); const m = l.slice(7).split('|').map(s => s.trim());
      const ph = h(el, 'div');
      if (typeof renderLessonExample === 'function' && ctx.data && ctx.data.surah) jobs.push(renderLessonExample(ctx, ph, { r: m[0], w: (m[1] || '').split(/[ ,]+/).map(Number).filter(Boolean), n: m[2] || '' }).catch(() => {}));
      i++; continue;
    }
    if (/^\|/.test(l)) {
      flush(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s\-:|]+\|?\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim())); i++; }
      renderDocTable(el, rows); continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      flush(); const ord = /^\d/.test(l); const list = h(el, ord ? 'ol' : 'ul', 'aa-doc-list');
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) { mdText(list, 'li', null, lines[i].replace(/^(- |\d+\. )/, '')); i++; }
      continue;
    }
    if (/^>/.test(l)) {
      flush(); const q = h(el, 'div', 'aa-doc-quote');
      while (i < lines.length && /^>/.test(lines[i])) { const x = lines[i].replace(/^> ?/, ''); if (x.trim()) mdText(q, 'div', null, x); i++; }
      continue;
    }
    para.push(l); i++;
  }
  flush();
  return Promise.all(jobs).then(() => linkTerms(ctx, el));
}
function ruleOverridePath(ctx, r) { return (ctx.settings.fixFolder || '4 - Références/Atelier - corrections').replace(/\/$/, '') + '/Règle - ' + r.title.replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim() + '.md'; }

/* Explication détaillée, avec « ta version » si une note de correction existe */
async function renderRuleDetail(ctx, parent, r) {
  const box = h(parent, 'div', 'aa-doc');
  const orig = ruleDoc(r.id);
  let mine = null;
  try { mine = ctx.readNote ? await ctx.readNote(ruleOverridePath(ctx, r)) : null; } catch (e) { mine = null; }
  const bar = h(box, 'div', 'aa-actions aa-doc-bar');
  const body = h(box, 'div', 'aa-doc-body');
  let showMine = !!mine;
  const draw = () => {
    clear(body); clear(bar);
    if (mine) {
      btn(bar, '📝 Ta version', () => { showMine = true; draw(); }, showMine ? 'mod-cta' : 'aa-btn-quiet');
      btn(bar, '📖 Version d\'origine', () => { showMine = false; draw(); }, showMine ? 'aa-btn-quiet' : 'mod-cta');
    }
    if (ctx.editNote) btn(bar, mine ? '✏️ Modifier ta version' : '✏️ Corriger ou compléter cette explication', () => ctx.editNote(ruleOverridePath(ctx, r), '---\natelier: regle/' + r.id + '\n---\n%% Ta version de la règle « ' + r.title + ' ». Modifie librement ce texte : l\'atelier l\'affichera à la place de l\'original, qui reste intact (bouton « Version d\'origine »). Pour revenir à l\'original, supprime cette note. %%\n\n' + orig + '\n'), 'aa-btn-quiet');
    if (showMine && mine) h(body, 'div', 'aa-muted aa-small', 'Version tirée de ta note « ' + ruleOverridePath(ctx, r) + ' ».');
    if (!orig && !mine) { h(body, 'p', 'aa-muted', 'L\'explication détaillée de cette règle n\'est pas encore écrite.'); return; }
    renderDoc(ctx, body, showMine && mine ? mine : orig);
  };
  draw();
  return box;
}
/* ====================================================================
 * 06g - Onglet Alphabet : les lettres, leur prononciation, et le schéma
 * de la bouche et de la gorge (d'où sort chaque son : makhārij).
 * Le texte est dans content/<langue>/alphabet.json (pas dans le code).
 * ==================================================================== */
function alphaData() { return (CONTENT[UI_LANG] && CONTENT[UI_LANG].alphabet) || CONTENT.fr.alphabet; }
const AL_ZWJ = '‍';
function letterForms(L) {
  if (L.l === 'ء') return [['seule', L.l]];
  if (!L.join) return [['seule', L.l], ['à la fin', AL_ZWJ + L.l]];
  return [['seule', L.l], ['au début', L.l + AL_ZWJ], ['au milieu', AL_ZWJ + L.l + AL_ZWJ], ['à la fin', AL_ZWJ + L.l]];
}
const AL_VOW = ['َ', 'ِ', 'ُ'];
function letterSyllables(L) {
  if (L.l === 'ا') return 'بَا';
  const b = L.l === 'ء' ? 'أ' : L.l;
  return AL_VOW.map(v => b + v).join(' ');
}

/* Coupe de profil de la tête (on regarde vers la gauche) avec les zones cliquables */
const AL_ZONE_POS = {
  levres: [30, 200], dents: [80, 202], sifflantes: [88, 220], 'racine-dents': [84, 182], gencive: [106, 172],
  palais: [146, 172], nez: [168, 150], cote: [140, 226], voile: [204, 184], luette: [226, 212],
  jawf: [257, 238], 'gorge-haut': [257, 264], 'gorge-milieu': [256, 290], 'gorge-bas': [255, 318],
};
function articulationSvg(parent, zones, onZone) {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (p, tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; p.appendChild(e); return e; };
  const uid = 'aal' + Math.random().toString(36).slice(2, 7);
  const wrap = h(parent, 'div', 'aa-al-svgwrap');
  const svg = mk(wrap, 'svg', { viewBox: '0 0 360 380', class: 'aa-al-svg', role: 'img', 'aria-label': 'Schéma de la bouche et de la gorge, vu de profil' });
  const defs = mk(svg, 'defs', {});
  const grad = (id, x1, y1, x2, y2, stops) => { const g = mk(defs, 'linearGradient', { id: uid + id, x1, y1, x2, y2 }); stops.forEach(([o, c, a]) => mk(g, 'stop', { offset: o, 'stop-color': c, 'stop-opacity': a == null ? 1 : a })); };
  grad('skin', '0', '0', '1', '1', [['0', '#f6d5c3'], ['1', '#e9b8a0']]);
  grad('tongue', '0', '0', '1', '1', [['0', '#f08a96'], ['1', '#c9566a']]);
  grad('air', '0', '0', '0', '1', [['0', '#7d3b4a'], ['1', '#5a2834']]);
  grad('nose', '0', '0', '1', '0', [['0', '#cfe0f5'], ['1', '#b9cdea']]);
  const rg = mk(defs, 'radialGradient', { id: uid + 'bg', cx: '.5', cy: '.45', r: '.6' });
  mk(rg, 'stop', { offset: '0', 'stop-color': 'var(--interactive-accent)', 'stop-opacity': '.10' });
  mk(rg, 'stop', { offset: '1', 'stop-color': 'var(--interactive-accent)', 'stop-opacity': '0' });
  const U = id => 'url(#' + uid + id + ')';
  const g = mk(svg, 'g', { class: 'aa-al-anat' });
  mk(g, 'circle', { cx: 190, cy: 190, r: 185, fill: U('bg') });
  // tête et cou
  mk(g, 'path', { class: 'aa-ad-skin', fill: U('skin'), d: 'M150 18 C95 18 62 52 60 98 C59 112 56 120 50 128 C44 138 34 150 28 160 C25 166 28 172 36 173 L46 174 C48 178 46 182 44 184 C38 188 38 194 44 196 L47 198 C40 202 40 210 47 213 C52 220 50 228 52 236 C54 250 66 258 84 260 C110 262 140 262 160 266 C168 290 172 330 172 380 L300 380 C296 340 296 300 306 270 C340 240 352 190 346 140 C336 60 260 16 150 18 Z' });
  // œil et oreille (discrets)
  mk(g, 'path', { class: 'aa-ad-face', d: 'M96 104 C104 98 116 98 124 104 C116 108 104 108 96 104 Z' });
  mk(g, 'path', { class: 'aa-ad-face', d: 'M96 92 C106 86 118 86 128 90' });
  mk(g, 'path', { class: 'aa-ad-face', d: 'M282 104 C298 98 310 110 306 128 C304 142 294 146 288 140' });
  // fosses nasales
  mk(g, 'path', { class: 'aa-ad-nose', fill: U('nose'), d: 'M48 172 C70 150 112 138 170 138 C214 138 246 148 268 172 C250 168 224 166 200 168 C152 162 102 164 64 178 Z' });
  // conduit d'air : bouche, gorge, trachée
  mk(g, 'path', { class: 'aa-ad-air', fill: U('air'), d: 'M62 194 C86 178 150 170 200 174 C226 180 240 196 242 214 C246 222 256 222 260 210 L262 176 C264 166 272 166 274 176 L276 380 L236 380 C236 330 232 300 230 286 C224 280 220 276 216 272 C180 262 120 244 80 238 C70 236 64 232 62 228 Z' });
  // langue
  mk(g, 'path', { class: 'aa-ad-tongue', fill: U('tongue'), d: 'M64 214 C70 200 90 194 116 193 C160 192 200 198 222 214 C238 228 242 250 238 272 C236 282 232 288 226 292 C200 288 150 270 112 256 C90 248 72 238 64 226 Z' });
  mk(g, 'path', { class: 'aa-ad-tongue-line', d: 'M92 212 C130 206 180 210 214 230' });
  // palais dur (os) et voile du palais + luette
  mk(g, 'path', { class: 'aa-ad-bone', d: 'M64 188 C74 176 92 170 116 168 C150 165 180 166 200 170' });
  mk(g, 'path', { class: 'aa-ad-velum', d: 'M200 170 C222 176 236 190 240 208' });
  mk(g, 'ellipse', { class: 'aa-ad-uvula', cx: 241, cy: 214, rx: 4, ry: 7 });
  // dents et lèvres
  mk(g, 'path', { class: 'aa-ad-teeth', d: 'M60 182 C64 180 70 182 72 186 L70 200 C66 202 62 201 60 199 Z' });
  mk(g, 'path', { class: 'aa-ad-teeth', d: 'M60 206 C64 204 70 205 71 208 L72 222 C68 224 63 223 61 221 Z' });
  mk(g, 'path', { class: 'aa-ad-lip', d: 'M42 184 C52 180 60 182 62 188 C60 196 52 198 44 196 C40 194 40 188 42 184 Z' });
  mk(g, 'path', { class: 'aa-ad-lip', d: 'M44 200 C52 198 60 200 62 206 C60 214 52 216 46 214 C42 210 42 204 44 200 Z' });
  // épiglotte, cordes vocales, anneaux de la trachée
  mk(g, 'path', { class: 'aa-ad-epi', d: 'M228 290 C234 276 244 268 254 270' });
  mk(g, 'path', { class: 'aa-ad-folds', d: 'M236 322 L252 317 M276 322 L260 317' });
  [342, 356, 370].forEach(y => mk(g, 'path', { class: 'aa-ad-ring', d: 'M238 ' + y + ' C250 ' + (y + 3) + ' 262 ' + (y + 3) + ' 274 ' + y }));
  // légendes
  const lab = (x, y, t, anchor, line) => { if (line) mk(g, 'path', { class: 'aa-ad-leader', d: line }); return mk(g, 'text', { x, y, class: 'aa-ad-lab', 'text-anchor': anchor || 'start' }, t); };
  lab(100, 156, 'nez');
  lab(170, 236, 'langue', 'middle');
  lab(6, 236, 'lèvres', 'start', 'M22 228 L36 210').classList.add('aa-ad-out');
  lab(318, 214, 'luette', 'start', 'M246 214 L314 214');
  lab(318, 266, 'gorge', 'start', 'M270 266 L314 266');
  lab(318, 322, 'cordes', 'start', 'M276 320 L314 320');
  lab(318, 334, 'vocales', 'start');
  // zones
  const marks = {};
  zones.forEach((z, i) => {
    const pos = AL_ZONE_POS[z.id]; if (!pos) return;
    const m = mk(svg, 'g', { class: 'aa-al-zone', tabindex: 0, role: 'button', 'data-zone': z.id, transform: 'translate(' + pos[0] + ' ' + pos[1] + ')' });
    mk(m, 'title', {}, z.name);
    mk(m, 'circle', { class: 'aa-al-halo', r: 14 });
    mk(m, 'circle', { class: 'aa-al-dot', r: 8.5 });
    mk(m, 'text', { y: 3.4, 'text-anchor': 'middle' }, String(i + 1));
    const go = (ev) => { ev.preventDefault(); ev.stopPropagation(); onZone(z.id); };
    m.addEventListener('click', go);
    m.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
    marks[z.id] = m;
  });
  return { wrap, light(ids) { Object.keys(marks).forEach(k => marks[k].classList.toggle('aa-on', ids.includes(k))); } };
}

function renderAlphabetTab(ctx, root, state) {
  clear(root);
  const A = alphaData();
  const zoneById = id => A.zones.find(z => z.id === id);
  mdText(root, 'p', 'aa-help', A.intro);
  const bar = h(root, 'div', 'aa-actions');
  const modes = [['letters', '🔤 Les lettres'], ['mouth', '👄 D\'où vient le son'], ['pairs', '👂 Sons à ne pas confondre'], ['quiz', '🎯 S\'entraîner']];
  state.mode = state.mode || 'letters';
  modes.forEach(([m, label]) => btn(bar, label, () => { state.mode = m; renderAlphabetTab(ctx, root, state); }, state.mode === m ? 'mod-cta' : 'aa-btn-quiet'));
  const body = h(root, 'div', 'aa-al-body');
  if (state.mode === 'pairs') return renderAlphaPairs(ctx, body, A);
  if (state.mode === 'quiz') return renderAlphaQuiz(ctx, body, A, state);

  const layout = h(body, 'div', 'aa-al-layout' + (state.mode === 'mouth' ? ' aa-al-mouthfirst' : ''));
  const left = h(layout, 'div', 'aa-al-left');
  const right = h(layout, 'div', 'aa-al-right');
  // grille des lettres (ordre de l'alphabet, de droite à gauche)
  const grid = h(left, 'div', 'aa-al-grid'); grid.setAttribute('dir', 'rtl');
  const cells = {};
  A.letters.forEach(L => {
    const c = h(grid, 'button', 'aa-al-cell' + (L.heavy ? ' aa-al-heavy' : ''));
    arSpan(c, L.l, 'aa-al-big');
    h(c, 'span', 'aa-al-cname', L.name);
    c.title = L.name + ' : ' + L.son;
    c.addEventListener('click', ev => { ev.preventDefault(); state.letter = L.l; state.zone = null; draw(); });
    cells[L.l] = c;
  });
  h(left, 'div', 'aa-muted aa-small', 'Lettres en couleur : lettres lourdes. Touche une lettre pour tout savoir sur elle.');
  // schéma
  const diag = h(state.mode === 'mouth' ? left : right, 'div', 'aa-al-diag');
  if (state.mode === 'mouth') left.insertBefore(diag, grid);
  h(diag, 'div', 'aa-al-diag-title', 'La bouche et la gorge, vues de profil');
  const svg = articulationSvg(diag, A.zones, id => { state.zone = state.zone === id ? null : id; state.letter = null; draw(); });
  const zl = h(diag, 'ol', 'aa-al-zlist');
  A.zones.forEach(z => { const li = h(zl, 'li'); const a = h(li, 'a', 'aa-link', z.name); a.addEventListener('click', ev => { ev.preventDefault(); state.zone = z.id; state.letter = null; draw(); }); li.dataset.zone = z.id; });
  const panel = h(right, 'div', 'aa-al-panel');
  if (state.mode === 'mouth') right.insertBefore(panel, right.firstChild);
  else right.insertBefore(panel, diag);

  const draw = () => {
    clear(panel);
    const L = state.letter ? A.letters.find(x => x.l === state.letter) : null;
    const zones = L ? L.z : state.zone ? [state.zone] : [];
    svg.light(zones);
    zl.querySelectorAll('li').forEach(li => li.classList.toggle('aa-on', zones.includes(li.dataset.zone)));
    Object.keys(cells).forEach(k => {
      const x = A.letters.find(y => y.l === k);
      cells[k].classList.toggle('aa-on', L ? k === L.l : !!state.zone && x.z.includes(state.zone));
      cells[k].classList.toggle('aa-dim', !L && !!state.zone && !x.z.includes(state.zone));
    });
    if (L) renderLetterCard(ctx, panel, L, A, id => { state.zone = id; state.letter = null; draw(); });
    else if (state.zone) renderZoneCard(ctx, panel, zoneById(state.zone), A, l => { state.letter = l; state.zone = null; draw(); });
    else {
      const p = h(panel, 'div', 'aa-al-card aa-muted');
      mdText(p, 'p', null, state.mode === 'mouth' ? 'Touche un **numéro** sur le schéma : tu verras quelles lettres sortent de là, et comment placer ta langue.' : 'Touche une **lettre** : sa prononciation, ses formes, d\'où vient le son, et un exemple du Coran à écouter.');
      mdText(p, 'p', 'aa-small', A.heavy);
      mdText(p, 'p', 'aa-small', A.noJoin);
    }
  };
  draw();
}

function renderLetterCard(ctx, parent, L, A, openZone) {
  const c = h(parent, 'div', 'aa-al-card');
  const top = h(c, 'div', 'aa-al-top');
  arSpan(top, L.l, 'aa-al-huge');
  const id = h(top, 'div');
  h(id, 'div', 'aa-al-name', L.name + '  ·  ' + L.tr);
  arSpan(id, L.nameAr, 'aa-mid');
  const snd = h(id, 'div', 'aa-actions');
  btn(snd, '🔊 Le nom', () => speak(L.nameAr), 'aa-btn-quiet');
  btn(snd, '🔊 ' + (L.l === 'ا' ? 'bā' : L.tr.split(' ')[0] + 'a ' + L.tr.split(' ')[0] + 'i ' + L.tr.split(' ')[0] + 'u'), () => speak(letterSyllables(L)), 'aa-btn-quiet');
  const tags = h(c, 'div', 'aa-al-tags');
  if (L.heavy) h(tags, 'span', 'aa-al-tag aa-al-tag-heavy', 'lettre lourde');
  if (L.sun) h(tags, 'span', 'aa-al-tag', 'solaire : le l de al- est muet devant elle');
  else if (L.l !== 'ء' && L.l !== 'ا') h(tags, 'span', 'aa-al-tag', 'lunaire : on dit al- devant elle');
  if (!L.join && L.l !== 'ء') h(tags, 'span', 'aa-al-tag', 'ne s\'attache pas à gauche');
  if ('قطبجد'.includes(L.l)) h(tags, 'span', 'aa-al-tag', 'qalqala');
  mdText(c, 'p', 'aa-al-son', '**Le son :** ' + L.son);
  mdText(c, 'p', null, '**Comment faire :** ' + L.how);
  const zp = h(c, 'p'); h(zp, 'b', null, 'D\'où il sort : ');
  L.z.forEach((zid, i) => { const z = A.zones.find(x => x.id === zid); if (i) zp.appendChild(document.createTextNode(' + ')); const a = h(zp, 'a', 'aa-link', z.name.toLowerCase()); a.addEventListener('click', ev => { ev.preventDefault(); openZone(zid); }); });
  // formes
  h(c, 'h4', 'aa-al-fh', 'Ses 4 formes, avec un mot du Coran');
  mdText(c, 'p', 'aa-muted aa-small', L.join || L.l === 'ء'
    ? 'Une lettre change un peu de forme selon sa place : **seule**, **au début** (attachée à la lettre suivante), **au milieu** (attachée des deux côtés) ou **à la fin** (attachée à la lettre d\'avant). Cherche-la dans chaque mot.'
    : 'Cette lettre **ne s\'attache jamais à la lettre suivante**. Elle n\'a donc que 2 formes : au début elle garde sa forme seule, et au milieu elle a sa forme de fin. Cherche-la dans chaque mot.');
  const fg = h(c, 'div', 'aa-al-fgrid');
  const EXF = (typeof ALPHA_FORM_EX !== 'undefined' && ALPHA_FORM_EX[L.l]) || [];
  const F4 = L.join ? letterForms(L) : [['seule', L.l], ['au début', L.l], ['au milieu', L.l === 'ء' ? L.l : AL_ZWJ + L.l], ['à la fin', L.l === 'ء' ? L.l : AL_ZWJ + L.l]];
  F4.forEach(([lab, f], k) => {
    const cell = h(fg, 'div', 'aa-al-fcell');
    h(cell, 'div', 'aa-al-flab', lab);
    arSpan(cell, f, 'aa-al-big');
    const e = EXF[k];
    if (e && ctx.data && ctx.data.lemmas[e[1]]) {
      const w = h(cell, 'div', 'aa-al-fword'); arSpan(w, e[0], 'aa-mid');
      h(cell, 'div', 'aa-tr aa-small', translitPhrase([e[0]], ctx.settings.style));
      h(cell, 'div', 'aa-muted aa-small', '« ' + String(ctx.data.lemmas[e[1]][4]).split(/[;,]/)[0].trim() + ' »');
      cell.classList.add('aa-al-fclick'); cell.title = 'Écouter';
      cell.addEventListener('click', () => speak(e[0]));
    } else h(cell, 'div', 'aa-muted aa-small aa-al-fnone', L.l === 'ء' ? 'au milieu, la hamza se pose sur un support : ـأ ـؤ ـئ' : 'pas d\'exemple simple');
  });
  if (L.l === 'ي') mdText(c, 'p', 'aa-muted aa-small', 'Dans le Coran, le **ي** à la fin d\'un mot s\'écrit souvent **sans ses deux points** : ى (on l\'appelle alif maqṣūra quand il se prononce ā).');
  // exemple
  const ex = h(c, 'div', 'aa-al-ex');
  h(ex, 'b', null, 'Exemple : ');
  arSpan(ex, L.ex[0], 'aa-mid');
  h(ex, 'span', 'aa-tr', ' ' + L.ex[1] + ' ');
  h(ex, 'span', null, '« ' + L.ex[2] + ' »');
  soundBtn(ex, () => speak(L.ex[0]));
  const near = (A.pairs || []).filter(p => p[0] === L.l || p[1] === L.l);
  if (near.length) {
    const np = h(c, 'p', 'aa-small'); h(np, 'b', null, 'À ne pas confondre avec : ');
    near.forEach((p, i) => { const o = p[0] === L.l ? p[1] : p[0]; if (i) np.appendChild(document.createTextNode(', ')); arSpan(np, o, 'aa-mid'); np.appendChild(document.createTextNode(' (' + p[2] + ')')); });
  }
  if (L.heavy || L.sun) {
    const rl = h(c, 'div', 'aa-actions');
    if (L.sun || L.l === 'ل') btn(rl, 'Règle : lettres solaires', () => ctx.openRule('solaires'), 'aa-btn-quiet');
    if ('قطبجد'.includes(L.l)) btn(rl, 'Règle : qalqala', () => ctx.openRule('qalqala'), 'aa-btn-quiet');
  }
  if ((L.l === 'ن' || L.l === 'م') && ctx.openRule) btn(h(c, 'div', 'aa-actions'), 'Règle : ghunna (le nez)', () => ctx.openRule('ghunna'), 'aa-btn-quiet');
  if (parent.scrollIntoView && window.innerWidth < 700) setTimeout(() => c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
}

function renderZoneCard(ctx, parent, z, A, openLetter) {
  const c = h(parent, 'div', 'aa-al-card');
  const n = A.zones.indexOf(z) + 1;
  h(c, 'div', 'aa-al-name', n + '. ' + z.name);
  const ar = h(c, 'div'); arSpan(ar, z.ar, 'aa-mid'); h(ar, 'span', 'aa-tr', '  ' + z.tr);
  mdText(c, 'p', null, z.desc);
  mdText(c, 'p', null, '**Comment faire :** ' + z.how);
  const ls = A.letters.filter(L => L.z.includes(z.id));
  if (ls.length) {
    h(c, 'b', null, 'Les lettres qui sortent d\'ici :');
    const row = h(c, 'div', 'aa-al-zletters');
    ls.forEach(L => {
      const b = h(row, 'button', 'aa-al-cell' + (L.heavy ? ' aa-al-heavy' : ''));
      arSpan(b, L.l, 'aa-al-big'); h(b, 'span', 'aa-al-cname', L.name);
      b.addEventListener('click', ev => { ev.preventDefault(); openLetter(L.l); });
    });
    const s = h(c, 'div', 'aa-actions');
    btn(s, '🔊 Écouter ces lettres', () => speak(ls.filter(L => L.l !== 'ا').map(letterSyllables).join(' ، ')), 'aa-btn-quiet');
  }
  if (z.id === 'nez') btn(h(c, 'div', 'aa-actions'), 'Règle : ghunna', () => ctx.openRule('ghunna'), 'aa-btn-quiet');
  if (z.id === 'jawf') btn(h(c, 'div', 'aa-actions'), 'Règle : voyelles longues (madd)', () => ctx.openRule('madd'), 'aa-btn-quiet');
}

function renderAlphaPairs(ctx, el, A) {
  mdText(el, 'p', 'aa-help', 'Ces lettres se ressemblent à l\'oreille pour un francophone, mais changent le sens du mot. Écoute les deux l\'une après l\'autre, puis répète.');
  const t = h(el, 'table', 'aa-table aa-al-pairs');
  const hr = h(t, 'tr'); ['', '', 'La différence', ''].forEach(x => h(hr, 'th', null, x));
  A.pairs.forEach(([a, b, d]) => {
    const La = A.letters.find(x => x.l === a), Lb = A.letters.find(x => x.l === b);
    const r = h(t, 'tr');
    [La, Lb].forEach(L => { const td = h(r, 'td'); arSpan(td, L.l, 'aa-al-big'); h(td, 'div', 'aa-small aa-muted', L.name); });
    const td = h(r, 'td'); h(td, 'div', null, d);
    h(td, 'div', 'aa-small aa-muted', La.son + '  /  ' + Lb.son);
    const s = h(r, 'td'); btn(s, '🔊', () => speak(letterSyllables(La) + ' ، ' + letterSyllables(Lb)), 'aa-btn-quiet aa-sound');
  });
  mdText(el, 'p', 'aa-muted aa-small', 'Le son vient de la voix de ton appareil. Sur iPad : Réglages › Accessibilité › Contenu énoncé › Voix › Arabe, pour installer une voix arabe.');
}

function renderAlphaQuiz(ctx, el, A, state) {
  const kinds = [['name', 'Quelle est cette lettre ?'], ['zone', 'D\'où sort ce son ?'], ['form', 'Retrouve la lettre dans le mot']];
  state.qk = state.qk || 'name';
  const bar = h(el, 'div', 'aa-actions');
  kinds.forEach(([k, l]) => btn(bar, l, () => { state.qk = k; state.q = null; clear(el); renderAlphaQuiz(ctx, el, A, state); }, state.qk === k ? 'mod-cta' : 'aa-btn-quiet'));
  state.score = state.score || { ok: 0, n: 0 };
  const sc = h(el, 'div', 'aa-muted aa-small', 'Score : ' + state.score.ok + ' / ' + state.score.n);
  const box = h(el, 'div', 'aa-al-card');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const pool = A.letters.filter(L => L.l !== 'ء');
  const L = pick(pool);
  let question, good, opts;
  if (state.qk === 'zone') {
    const z = L.z.filter(x => x !== 'nez' && x !== 'jawf')[0] || L.z[0];
    good = A.zones.find(x => x.id === z).name;
    opts = shuffle([good].concat(shuffle(A.zones.filter(x => !L.z.includes(x.id) && x.id !== 'nez').map(x => x.name)).slice(0, 3)));
    question = 'D\'où sort le son de cette lettre ?';
  } else if (state.qk === 'form') {
    const forms = letterForms(L).slice(1);
    const f = forms.length ? pick(forms) : ['seule', L.l];
    good = L.name;
    const near = shuffle(pool.filter(x => x !== L)).slice(0, 3).map(x => x.name);
    opts = shuffle([good].concat(near));
    question = 'Quelle lettre est écrite ici (' + f[0] + ' du mot) ?';
    L._show = f[1];
  } else {
    good = L.name + ' (' + L.tr + ')';
    const sim = (A.pairs || []).filter(p => p.includes(L.l)).map(p => p[0] === L.l ? p[1] : p[0]);
    const others = shuffle(pool.filter(x => x !== L && !sim.includes(x.l))).slice(0, 3 - Math.min(sim.length, 2));
    opts = shuffle([good].concat(sim.slice(0, 2).map(l => { const x = A.letters.find(y => y.l === l); return x.name + ' (' + x.tr + ')'; }), others.map(x => x.name + ' (' + x.tr + ')')));
    question = 'Comment s\'appelle cette lettre, et quel son fait-elle ?';
  }
  h(box, 'p', null, question);
  arSpan(h(box, 'div', 'aa-al-qletter'), L._show || L.l, 'aa-al-huge');
  delete L._show;
  const ans = h(box, 'div', 'aa-al-opts');
  const fb = h(box, 'div');
  let done = false;
  opts.forEach(o => {
    const b = btn(ans, o, () => {
      if (done) return; done = true;
      const ok = o === good; state.score.n++; if (ok) state.score.ok++;
      sc.textContent = 'Score : ' + state.score.ok + ' / ' + state.score.n;
      b.classList.add(ok ? 'aa-good' : 'aa-bad');
      ans.querySelectorAll('button').forEach(x => { if (x.textContent === good) x.classList.add('aa-good'); });
      mdText(fb, 'p', null, (ok ? '✅ Oui ! ' : '❌ C\'était **' + good + '**. ') + L.name + ' : ' + L.son + '.');
      const nx = h(fb, 'div', 'aa-actions');
      btn(nx, '🔊 Écouter', () => speak(letterSyllables(L)), 'aa-btn-quiet');
      btn(nx, 'Voir la fiche de la lettre', () => { state.mode = 'letters'; state.letter = L.l; ctx.openTab ? ctx.openTab('alphabet', { mode: 'letters', letter: L.l }) : null; }, 'aa-btn-quiet');
      btn(nx, 'Suivante →', () => { clear(el); renderAlphaQuiz(ctx, el, A, state); }, 'mod-cta');
    }, 'aa-btn-quiet');
  });
}
/* Généré : pour chaque lettre, un mot du Coran par forme [seule, début, milieu, fin] = [mot, id du sens] */
const ALPHA_FORM_EX = {"ء":[["سَوْءٍ",913],["ءَامَنَ",18],null,["شَىْءٍ",38]],"ا":[["إِذَا",23],["إِنَّ",4],["قَالَ",5],["مَا",6]],"ب":[["عَذَابٌ",33],["بَلْ",88],["سَبِيلِ",60],["يُحِبُّ",176]],"ت":[["يَأْتِ",45],["تَجْرِى",194],["مُّسْتَقِيمٍ",298],["كَانَتْ",9]],"ث":[["حَرْثَ",660],["ثُمَّ",31],["أَكْثَرَ",130],["حَيْثُ",342]],"ج":[["حَرَجٌ",615],["جَعَلَ",30],["نَجْزِى",150],["يُولِجُ",822]],"ح":[["جُنَاحَ",411],["رَّحِيمٌ",94],["سِحْرٌ",368],["يُفْلِحُ",387]],"خ":[["أَخٌ",144],["خَيْرٌ",58],["يَخْلُقُ",56],["يُنفَخُ",508]],"د":[["أَرَادَ",78],["دُونِ",76],["يَهْدِى",75],["قَدْ",22]],"ذ":[["إِذْ",35],["إِذًا",346],["عَذَابَ",33],["أَخَذَ",87]],"ر":[["غَفُورٌ",111],["رَبِّ",11],["يُرِيدُ",78],["غَيْرَ",71]],"ز":[["فَازَ",1776],["رِزْقًا",202],["أُنزِلَ",57],["عَزِيزٌ",104]],"س":[["بَأْسٍ",413],["رَسُولٌ",32],["مُّسَمًّى",476],["لَيْسَ",112]],"ش":[["غَوَاشٍ",1864],["أَشَدُّ",343],["بَشَرٌ",305],["تَمْشِ",467]],"ص":[["قِصَاصٌ",1456],["صَبْرًا",596],["بَصِيرٌ",217],["نَقُصُّ",494]],"ض":[["مَّرَضٌ",655],["ضَلَّ",210],["فَضْلُ",122],["بَعْضٍ",66]],"ط":[["أَحَاطَ",545],["طِينٍ",709],["حَبِطَتْ",703],["يَبْسُطُ",577]],"ظ":[["شُوَاظٌ",4294],["أَظْلَمُ",568],["عَظِيمٌ",98],["حَفِيظٌ",717]],"ع":[["تَدْعُ",61],["عَلَى",8],["بَعْدِ",54],["مَعَ",64]],"غ":[["بَاغٍ",1708],["غَيْرُ",71],["بَغْتَةً",680],["بَلَغَ",278]],"ف":[["أَخَافُ",127],["فِى",3],["نَفْسٍ",36],["كَيْفَ",125]],"ق":[["فَوْقَ",265],["قُلْ",5],["يَقُولُ",5],["خَلَقَ",56]],"ك":[["تَرَكَ",271],["كَانَ",9],["حَكِيمٌ",106],["مُلْكُ",234]],"ل":[["أَنزَلَ",57],["لَا",2],["عَلِيمٌ",65],["كُلِّ",28]],"م":[["يَوْمَ",19],["مِن",0],["لَمَّا",70],["لَمْ",29]],"ن":[["أَن",17],["نَذِيرٌ",192],["عِندَ",55],["مِنَ",0]],"ه":[["كَرِهَ",553],["هَلْ",108],["ءَالِهَةً",73],["وَجْهِ",152]],"و":[["أَوْ",39],["وَعْدَ",231],["قَوْمًا",24],["لَوْ",53]],"ي":[["هُدًى",120],["يَعْلَمُ",25],["بَيْنَ",44],["إِلَى",14]]};
/* ====================================================================
 * 06h - Onglet Révision : les cartes de chaque règle, en répétition espacée
 * Les paquets sont dans content/fr/cartes/ (inclus dans le plugin, donc
 * aussi sur iPad et iPhone). Si le coffre contient des notes « Cartes - … »
 * dans le dossier des cartes, ta version remplace celle du plugin.
 * Format des notes (compatible Spaced Repetition) :
 *   question ⏎ ? ⏎ réponse   (bloc séparé par des lignes vides)
 *   question :: réponse      (une ligne)
 * ==================================================================== */
const CARD_GROUPS = [
  ['vocab', 'Vocabulaire du Coran', '📖'], ['1-cas', 'Les cas', '📐'], ['2-phrase', 'La phrase', '🧱'], ['3-verbe', 'Le verbe', '⚙️'],
  ['4-lecture', 'Lire et écrire', '✍️'], ['5-tajwid', 'Tajwid (réciter)', '🎙️'], ['mes', 'Mes cartes', '⭐'],
];
const FIRST_DECKS = ['nominatif', 'prepositions', 'genitif', 'accusatif', 'trois-cas'];

function cardHash(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0; return x.toString(36); }

function parseCardDeck(text, path) {
  text = String(text || '').replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/<!--SR:[^>]*-->/g, '');
  const tm = text.match(/^#(flashcards\/\S+)/m);
  const tag = tm ? tm[1] : '';
  const parts = tag.split('/');
  let id = parts.length > 3 ? parts.slice(3).join('/') : (tag || path || 'cartes');
  let group = parts.length > 4 ? parts[3] : 'mes';
  if (!CARD_GROUPS.some(g => g[0] === group)) group = 'mes';
  const tl = text.match(/^# (.+)$/m);
  let title = tl ? tl[1] : String(path || '').replace(/^.*\//, '').replace(/\.md$/, '');
  title = title.replace(/^🃏\s*/, '').replace(/( : cartes( de contraste)?|, cartes)$/, '').replace(/^Cartes - /, '').trim();
  const deck = { id, group, title, tag, path, cards: [] };
  const blocks = []; let cur = [];
  text.split('\n').forEach(l => { if (!l.trim()) { if (cur.length) blocks.push(cur); cur = []; } else cur.push(l); });
  if (cur.length) blocks.push(cur);
  let sec = '';
  for (let b of blocks) {
    if (/^#{2,3} /.test(b[0])) { sec = b[0].replace(/^#+ /, '').replace(/^\d+\.\s*/, ''); b = b.slice(1); if (!b.length) continue; }
    const qi = b.findIndex(l => l.trim() === '?' || l.trim() === '??');
    if (qi > 0) {
      const q = b.slice(0, qi).join('\n'), a = b.slice(qi + 1).join('\n');
      if (a.trim()) deck.cards.push({ id: id + '|' + cardHash(q), s: sec, q, a });
      continue;
    }
    for (const l of b) {
      if (/^#|^>|^←/.test(l) || !l.includes('::')) continue;
      const m = l.split(/:::?/); if (m.length < 2) continue;
      const q = m[0].trim(), a = m.slice(1).join(':').trim();
      if (q && a) deck.cards.push({ id: id + '|' + cardHash(q), s: sec, q, a });
    }
  }
  return deck;
}

/* tous les paquets : ceux du plugin, puis ceux du coffre (qui remplacent ceux du plugin de même nom) */
async function loadCardDecks(ctx) {
  const builtin = vocabDecks(ctx.data).concat(((CONTENT[UI_LANG] || {}).cartes || (CONTENT.fr || {}).cartes || []).map(x => parseCardDeck(x.text, x.path)));
  const byId = new Map(builtin.map(d => [d.id, d]));
  let mine = [];
  try { mine = ctx.vaultCardNotes ? await ctx.vaultCardNotes() : []; } catch (e) { mine = []; }
  for (const n of mine) {
    const d = parseCardDeck(n.text, n.path);
    if (!d.cards.length) continue;
    if (n.mine) { d.group = 'mes'; d.title = 'Mes phrases de l\'atelier'; d.id = 'mes/phrases'; d.cards.forEach(c => { c.id = 'mes/phrases|' + cardHash(c.q); }); }
    d.fromVault = true;
    byId.set(d.id, d);
  }
  const all = [...byId.values()];
  const gi = g => CARD_GROUPS.findIndex(x => x[0] === g);
  const fi = d => { const k = FIRST_DECKS.indexOf(d.id.split('/').pop()); return k < 0 ? 99 : k; };
  all.sort((a, b) => gi(a.group) - gi(b.group) || fi(a) - fi(b) || (a.vocab && b.vocab ? +a.id.split('/')[1] - +b.id.split('/')[1] : a.title.localeCompare(b.title, 'fr')));
  return all;
}

/* ---------- répétition espacée (inspirée de SM-2, comme Anki et Spaced Repetition) ---------- */
function todayNum() { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
function srsStore(ctx) {
  const s = ctx.settings.srs || (ctx.settings.srs = { cards: {}, day: 0, newToday: 0, newPerDay: 15 });
  if (!s.cards) s.cards = {};
  if (s.newPerDay == null) s.newPerDay = 15;
  if (s.vocabPerDay == null) s.vocabPerDay = 10;
  const t = todayNum(); if (s.day !== t) { s.day = t; s.newToday = 0; s.vocabToday = 0; s.doneToday = 0; }
  return s;
}
/* état d'une carte : [jour d'échéance, intervalle en jours, facilité ×100, nombre de révisions] */
function cardState(S, c) { return S.cards[c.id] || null; }
function isDue(S, c) { const st = cardState(S, c); return !!st && st[0] <= S.day; }
function nextState(st, grade, day) {
  let [, ivl, ease, reps] = st || [day, 0, 250, 0];
  if (grade === 0) { ease = Math.max(130, ease - 20); ivl = 0; }
  else if (!reps || ivl === 0) { ivl = grade === 1 ? 1 : grade === 2 ? (st && st[3] ? 1 : 2) : 4; if (grade === 3) ease += 15; }
  else if (grade === 1) { ease = Math.max(130, ease - 15); ivl = Math.max(ivl + 1, Math.round(ivl * 1.2)); }
  else if (grade === 2) { ivl = Math.max(ivl + 1, Math.round(ivl * ease / 100)); }
  else { ease += 15; ivl = Math.max(ivl + 2, Math.round(ivl * ease / 100 * 1.3)); }
  ivl = Math.min(ivl, 3650);
  return [day + ivl, ivl, ease, (reps || 0) + 1];
}
function newLeftOf(S) { return { rules: Math.max(0, S.newPerDay - (S.newToday || 0)), voc: Math.max(0, S.vocabPerDay - (S.vocabToday || 0)) }; }
/* nombre de cartes du jour, sur tous les paquets */
function todayCounts(S, decks) {
  let due = 0, freshR = 0, freshV = 0, total = 0;
  decks.forEach(d => { const c = deckCounts(S, d); due += c.due; total += c.total; if (d.vocab) freshV += c.fresh; else freshR += c.fresh; });
  const nl = newLeftOf(S);
  return { due, fresh: Math.min(nl.rules, freshR) + Math.min(nl.voc, freshV), total };
}
function ivlLabel(n) { if (n <= 0) return 'aujourd\'hui'; if (n === 1) return '1 jour'; if (n < 30) return n + ' jours'; if (n < 365) return Math.round(n / 30) + ' mois'; return Math.round(n / 365 * 10) / 10 + ' an' + (n >= 730 ? 's' : ''); }
function deckCounts(S, d) {
  let due = 0, fresh = 0, known = 0;
  for (const c of d.cards) { const st = cardState(S, c); if (!st) fresh++; else { if (st[0] <= S.day) due++; if (st[1] >= 7) known++; } }
  return { due, fresh, known, total: d.cards.length };
}

/* ---------- affichage du texte d'une carte : **gras**, *italique*, listes, arabe agrandi ---------- */
const AR_RUN_MD = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF](?:[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s*…]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])?/g;
/* **gras** et *italique* ; chaque passage arabe (même coupé par du gras) reste d'un seul bloc, pour garder l'ordre des mots */
function cardInline(parent, text) {
  text = String(text).replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/`([^`]+)`/g, '$1');
  let b = false, i = false;
  const emit = (box, str) => {
    let buf = '';
    const flush = () => { if (!buf) return; let el = box; if (b) el = h(el, 'b'); if (i) el = h(el, 'i'); el.appendChild(document.createTextNode(buf)); buf = ''; };
    for (let k = 0; k < str.length; k++) {
      if (str[k] === '*' && str[k + 1] === '*') { flush(); b = !b; k++; continue; }
      if (str[k] === '*' && (i || (str[k + 1] && str[k + 1] !== ' '))) { flush(); i = !i; continue; }
      buf += str[k];
    }
    flush();
  };
  let last = 0, m; AR_RUN_MD.lastIndex = 0;
  while ((m = AR_RUN_MD.exec(text))) {
    if (m.index > last) emit(parent, text.slice(last, m.index));
    const bd = h(parent, 'bdi', 'aa-ari'); bd.setAttribute('dir', 'rtl'); emit(bd, m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) emit(parent, text.slice(last));
}
function isArabicLine(l) { const t = l.replace(/[*\s\d().,;:/«»"'\-–—!?،؛]/g, ''); return !!t && hasArabic(t) && !/[a-zA-Zàâçéèêëîïôûùüÿœ]/.test(t); }
function renderCardText(parent, text) {
  const box = h(parent, 'div', 'aa-fc-text');
  let list = null;
  String(text).split('\n').forEach(l => {
    const m = l.match(/^\s*(- |\d+\. )(.*)$/);
    if (m) {
      const ord = /\d/.test(m[1]);
      if (!list || list.ord !== ord) { list = h(box, ord ? 'ol' : 'ul', 'aa-fc-list'); list.ord = ord; }
      cardInline(h(list, 'li'), m[2]); return;
    }
    list = null;
    if (isArabicLine(l)) { const d = h(box, 'div', 'aa-fc-arline'); d.setAttribute('dir', 'rtl'); d.textContent = l.replace(/\*/g, ''); return; }
    cardInline(h(box, 'div', 'aa-fc-line'), l);
  });
  return box;
}

/* ---------- l'onglet ---------- */
function renderReviewTab(ctx, root, state) {
  clear(root);
  onSwipe(root, () => { const b = root.querySelector('.aa-fc-reveal'); if (b) b.click(); }); // iPad / iPhone : glisser = voir la réponse
  const go = () => renderReviewTab(ctx, root, state);
  if (!state.decks) {
    h(root, 'p', 'aa-muted', 'Chargement des cartes…');
    loadCardDecks(ctx).then(d => { state.decks = d; go(); }).catch(e => { clear(root); h(root, 'p', 'aa-warn', 'Impossible de charger les cartes : ' + e.message); });
    return;
  }
  if (state.surahWords) {
    const n = state.surahWords; state.surahWords = null;
    h(root, 'p', 'aa-muted', 'Préparation des mots de la sourate…');
    makeSurahWordsSession(ctx, n, 15).then(ss => { state.session = ss; go(); }).catch(e => { clear(root); h(root, 'p', 'aa-warn', e.message); });
    return;
  }
  if (state.startNow) { state.startNow = false; state.session = makeSession(ctx, state.decks, null); }
  if (state.session) return renderReviewSession(ctx, root, state);
  if (state.deck) { const d = state.decks.find(x => x.id === state.deck); if (d) return renderReviewDeck(ctx, root, state, d); state.deck = null; }
  const S = srsStore(ctx);
  const howto = h(root, 'details', 'aa-howto'); h(howto, 'summary', null, 'ⓘ Comment utiliser cet onglet');
  mdText(howto, 'p', 'aa-help', 'Un **paquet de cartes pour chaque règle**. Chaque jour, l\'atelier te montre les cartes **à revoir** et quelques **nouvelles**. Lis la question, réponds **à voix haute** (la terminaison et la raison), puis retourne la carte et dis honnêtement si c\'était facile. Une carte bien sue revient de plus en plus tard. Tes progrès restent sur cet appareil.');
  const { due, fresh: freshToday, total } = todayCounts(S, state.decks);
  const today = h(root, 'div', 'aa-fc-today');
  const nums = h(today, 'div', 'aa-fc-nums');
  const n1 = h(nums, 'div', 'aa-fc-num'); h(n1, 'b', null, String(due)); h(n1, 'span', null, 'à revoir');
  const n2 = h(nums, 'div', 'aa-fc-num'); h(n2, 'b', null, String(freshToday)); h(n2, 'span', null, 'nouvelles aujourd\'hui');
  const n3 = h(nums, 'div', 'aa-fc-num'); h(n3, 'b', null, String(S.doneToday || 0)); h(n3, 'span', null, 'déjà faites');
  const act = h(today, 'div', 'aa-fc-start');
  if (due + freshToday > 0) btn(act, '▶  Réviser maintenant', () => { state.session = makeSession(ctx, state.decks, null); go(); }, 'mod-cta aa-fc-big');
  else h(act, 'div', 'aa-ok', 'Tout est à jour pour aujourd\'hui. Reviens demain, ou choisis un paquet pour t\'entraîner librement.');
  const set = h(today, 'div', 'aa-fc-set aa-muted aa-small');
  h(set, 'span', null, 'Nouvelles cartes de règles par jour : ');
  selectEl(set, [0, 5, 10, 15, 20, 30, 50].map(n => [n, String(n)]), S.newPerDay, v => { S.newPerDay = +v; ctx.save(); go(); });
  h(set, 'span', null, '  ·  nouveaux mots par jour : ');
  selectEl(set, [0, 5, 10, 15, 20, 30].map(n => [n, String(n)]), S.vocabPerDay, v => { S.vocabPerDay = +v; ctx.save(); go(); });

  CARD_GROUPS.forEach(([g, label, ic]) => {
    const deckCard = (grid, d) => {
      const c = deckCounts(S, d);
      const card = h(grid, 'div', 'aa-fc-deck' + (FIRST_DECKS.slice(0, 2).includes(d.id.split('/').pop()) ? ' aa-fc-star' : ''));
      const top = h(card, 'div', 'aa-fc-deck-top');
      h(top, 'span', 'aa-fc-deck-title', d.title);
      if (c.due) h(top, 'span', 'aa-fc-pill aa-fc-pill-due', c.due + ' à revoir');
      const bar = h(card, 'div', 'aa-lesson-progress'); const f = h(bar, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * (c.total - c.fresh) / Math.max(1, c.total)) + '%';
      h(card, 'div', 'aa-muted aa-small', (c.total - c.fresh) + ' / ' + c.total + (d.vocab ? ' mots vus' : ' cartes vues') + (c.known ? ' · ' + c.known + ' bien su' + (d.vocab ? 's' : 'es') : ''));
      if (d.vocab) h(card, 'div', 'aa-muted aa-small', (d.id === 'vocab/1' ? 'ces mots = ' : 'avec les paquets d\'avant : ') + d.cover + ' % du Coran');
      card.addEventListener('click', () => { state.deck = d.id; go(); });
    };
    const ds = state.decks.filter(d => d.group === g); if (!ds.length) return;
    if (g !== 'vocab') {
      if (!state._rulesHead || state._rulesHead.parentNode !== root) state._rulesHead = h(root, 'h3', 'aa-fc-group', '📚  Les règles en cartes');
      /* les paquets de règles : un bloc repliable par thème (ouvert s'il y a des cartes à revoir) */
      let due = 0, tot = 0, seen = 0; ds.forEach(d => { const c = deckCounts(S, d); due += c.due; tot += c.total; seen += c.total - c.fresh; });
      if (state.grpOpen == null) state.grpOpen = {};
      const box = h(root, 'details', 'aa-sec aa-fc-level aa-fc-grp');
      box.open = state.grpOpen[g] != null ? state.grpOpen[g] : due > 0;
      box.addEventListener('toggle', () => { state.grpOpen[g] = box.open; });
      const sum = h(box, 'summary', null, ic + '  ' + label);
      h(sum, 'span', 'aa-muted aa-small', '  ·  ' + ds.length + ' paquet' + (ds.length > 1 ? 's' : '') + ' · ' + seen + ' / ' + tot + ' cartes vues');
      if (due) h(sum, 'span', 'aa-fc-pill aa-fc-pill-due', due + ' à revoir');
      const grid = h(box, 'div', 'aa-fc-grid'); ds.forEach(d => deckCard(grid, d));
      return;
    }
    h(root, 'h3', 'aa-fc-group', ic + '  ' + label);
    if (g === 'vocab') mdText(root, 'p', 'aa-muted aa-small', '**Tous les mots du Coran** (' + ds.reduce((n, d) => n + d.cards.length, 0) + '), du plus courant au plus rare, en 5 niveaux. Le niveau 1 (300 mots) fait déjà les **trois quarts** du texte ; à la fin du niveau 5, tu as vu **100 %** des mots. Les nouveaux mots arrivent dans ta révision du jour (' + S.vocabPerDay + ' par jour), dans cet ordre. Pour une sourate précise : onglet Coran › « Apprendre les mots de cette sourate ».');
    if (g !== 'vocab' || ds.some(d => d.level == null)) { const grid = h(root, 'div', 'aa-fc-grid'); ds.forEach(d => deckCard(grid, d)); return; }
    /* vocabulaire : un bloc repliable par niveau ; on ouvre le niveau en cours */
    const levels = []; ds.forEach(d => { (levels[d.level] = levels[d.level] || []).push(d); });
    let cur = levels.findIndex(L => L && L.some(d => deckCounts(S, d).fresh > 0)); if (cur < 0) cur = 0;
    if (state.vocOpen == null) state.vocOpen = {};
    levels.forEach((L, lv) => {
      if (!L) return;
      const n = L.reduce((a, d) => a + d.cards.length, 0);
      const seen = L.reduce((a, d) => { const c = deckCounts(S, d); return a + c.total - c.fresh; }, 0);
      const box = h(root, 'details', 'aa-sec aa-fc-level');
      box.open = state.vocOpen[lv] != null ? state.vocOpen[lv] : lv === cur;
      box.addEventListener('toggle', () => { state.vocOpen[lv] = box.open; });
      const sum = h(box, 'summary', null, L[0].levelName);
      h(sum, 'span', 'aa-muted aa-small', '  ·  ' + n + ' mots · ' + seen + ' vus · jusqu\'à ' + L[L.length - 1].cover + ' % du Coran');
      const grid = h(box, 'div', 'aa-fc-grid'); L.forEach(d => deckCard(grid, d));
    });
  });
  h(root, 'p', 'aa-muted aa-small aa-fc-foot', state.decks.length + ' paquets · ' + total + ' cartes. Les cartes sont aussi dans ton coffre (5 - Flashcards/Règles) : si tu corriges une carte là-bas, l\'atelier prend ta version.');
}

function renderReviewDeck(ctx, root, state, d) {
  const go = () => renderReviewTab(ctx, root, state);
  const S = srsStore(ctx); const c = deckCounts(S, d);
  const back = h(root, 'div', 'aa-actions'); btn(back, '← Tous les paquets', () => { state.deck = null; go(); }, 'aa-btn-quiet');
  h(root, 'h2', 'aa-fc-title', d.title);
  h(root, 'p', 'aa-muted', c.total + ' cartes · ' + (c.total - c.fresh) + ' déjà vues · ' + c.due + ' à revoir aujourd\'hui');
  const a = h(root, 'div', 'aa-fc-start');
  const nl = newLeftOf(S); const newLeft = d.vocab ? nl.voc : nl.rules;
  if (d.vocab) h(root, 'p', 'aa-muted aa-small', 'Avec les mots jusqu\'à ce paquet, tu reconnais ' + d.cover + ' % des mots du Coran.');
  if (c.due + Math.min(c.fresh, newLeft) > 0) btn(a, '▶  Réviser ce paquet', () => { state.session = makeSession(ctx, [d], null); go(); }, 'mod-cta aa-fc-big');
  btn(a, '🔁  S\'entraîner sur tout le paquet', () => { state.session = makeSession(ctx, [d], 'all'); go(); }, 'aa-fc-big2');
  h(root, 'p', 'aa-muted aa-small', '« S\'entraîner sur tout le paquet » montre toutes les cartes dans le désordre, sans changer tes dates de révision.');
  const list = details(root, '📖 Lire toutes les cartes', false);
  let filled = false;
  list.addEventListener('toggle', () => {
    if (!list.open || filled) return; filled = true;
    let sec = null;
    d.cards.forEach(cd => {
      if (cd.s && cd.s !== sec) { sec = cd.s; h(list, 'h4', 'aa-fc-sec', sec); }
      const it = h(list, 'details', 'aa-fc-item');
      if (cd.voc != null) { const sm = h(it, 'summary', 'aa-voc-sum'); const w = h(sm, 'bdi', 'aa-ari aa-voc-sum-ar'); w.setAttribute('dir', 'rtl'); w.textContent = cd.q; h(sm, 'span', null, '  ' + cd.a); renderVocabBack(ctx, h(it, 'div', 'aa-fc-ans'), cd); return; }
      const sm = h(it, 'summary'); cardInline(sm, cd.q.split('\n')[0]);
      if (cd.q.includes('\n')) renderCardText(it, cd.q.split('\n').slice(1).join('\n'));
      renderCardText(h(it, 'div', 'aa-fc-ans'), cd.a);
    });
  });
  if (d.path) h(root, 'p', 'aa-muted aa-small', (d.fromVault ? 'Version de ton coffre : ' : 'Note dans ton coffre : ') + d.path);
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function makeSession(ctx, decks, mode) {
  const S = srsStore(ctx);
  const all = []; decks.forEach(d => d.cards.forEach(c => all.push({ c, d })));
  if (mode === 'all') return { cram: true, queue: shuffle(all.slice()), done: 0, total: all.length, again: 0 };
  const due = shuffle(all.filter(x => isDue(S, x.c)));
  const nl = newLeftOf(S);
  const fR = all.filter(x => !x.d.vocab && !cardState(S, x.c)).slice(0, nl.rules); // les nouvelles dans l'ordre du paquet
  const fV = all.filter(x => x.d.vocab && !cardState(S, x.c)).slice(0, nl.voc);
  const fresh = []; for (let a = 0, b = 0; a < fR.length || b < fV.length;) { if (a < fR.length) fresh.push(fR[a++]); if (b < fV.length) fresh.push(fV[b++]); }
  const queue = []; let i = 0, j = 0;
  while (i < due.length || j < fresh.length) { // on mélange : environ 1 nouvelle pour 3 à revoir
    for (let k = 0; k < 3 && i < due.length; k++) queue.push(due[i++]);
    if (j < fresh.length) queue.push(fresh[j++]);
  }
  return { queue, done: 0, total: queue.length, again: 0 };
}

function renderReviewSession(ctx, root, state) {
  const go = () => renderReviewTab(ctx, root, state);
  const ss = state.session; const S = srsStore(ctx);
  const head = h(root, 'div', 'aa-fc-head');
  btn(head, '← Arrêter', () => { state.session = null; go(); }, 'aa-btn-quiet');
  h(head, 'span', 'aa-muted aa-small', ss.cram ? 'Entraînement libre' : 'Révision du jour');
  h(head, 'span', 'aa-muted aa-small aa-fc-left', ss.queue.length + ' restante' + (ss.queue.length > 1 ? 's' : ''));
  const bar = h(root, 'div', 'aa-lesson-progress'); const f = h(bar, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * ss.done / Math.max(1, ss.done + ss.queue.length)) + '%';
  if (!ss.queue.length) {
    const end = h(root, 'div', 'aa-fc-end');
    h(end, 'div', 'aa-fc-end-ic', '🌿');
    h(end, 'h3', null, ss.cram ? 'Paquet terminé' : 'C\'est fini pour aujourd\'hui');
    h(end, 'p', 'aa-muted', ss.done + ' carte' + (ss.done > 1 ? 's' : '') + ' révisée' + (ss.done > 1 ? 's' : '') + (ss.again ? ', dont ' + ss.again + ' à revoir encore' : '') + '. Bravo.');
    btn(h(end, 'div', 'aa-fc-start'), 'Retour aux paquets', () => { state.session = null; go(); }, 'mod-cta aa-fc-big');
    return;
  }
  const x = ss.queue[0]; const c = x.c;
  const box = h(root, 'div', 'aa-fc-card');
  const meta = h(box, 'div', 'aa-fc-meta');
  h(meta, 'span', null, x.d.title + (c.s ? '  ·  ' + c.s : ''));
  if (!cardState(S, c) && !ss.cram) h(meta, 'span', 'aa-fc-pill', 'nouvelle');
  if (c.voc != null) renderVocabFront(ctx, h(box, 'div', 'aa-fc-q aa-voc-q'), c);
  else renderCardText(h(box, 'div', 'aa-fc-q'), c.q);
  const bottom = h(root, 'div', 'aa-fc-bottom');
  let shown = false;
  const grade = g => {
    if (!shown) return;
    ss.done++;
    if (!ss.cram) {
      const was = cardState(S, c);
      if (!was) { if (c.voc != null) S.vocabToday = (S.vocabToday || 0) + 1; else S.newToday = (S.newToday || 0) + 1; }
      if (ctx.markActivity) ctx.markActivity('c');
      S.cards[c.id] = nextState(was, g, S.day);
      S.doneToday = (S.doneToday || 0) + 1;
      ctx.save();
    }
    ss.queue.shift();
    if (g === 0) { ss.again++; ss.queue.splice(Math.min(3, ss.queue.length), 0, x); }
    go();
  };
  const reveal = () => {
    if (shown) return; shown = true;
    clear(bottom);
    h(box, 'div', 'aa-fc-sep');
    if (c.voc != null) renderVocabBack(ctx, h(box, 'div', 'aa-fc-a aa-voc-a'), c);
    else renderCardText(h(box, 'div', 'aa-fc-a'), c.a);
    const row = h(bottom, 'div', 'aa-fc-grades');
    const st = cardState(S, c);
    [[0, 'À revoir', 'aa-fc-g0'], [1, 'Difficile', 'aa-fc-g1'], [2, 'Bien', 'aa-fc-g2'], [3, 'Facile', 'aa-fc-g3']].forEach(([g, lab, cls]) => {
      const b = btn(row, '', () => grade(g), 'aa-fc-grade ' + cls);
      h(b, 'span', 'aa-fc-grade-lab', lab);
      h(b, 'span', 'aa-fc-grade-ivl', ss.cram ? '' : (g === 0 ? 'tout de suite' : ivlLabel(nextState(st, g, S.day)[1])));
    });
    h(bottom, 'p', 'aa-muted aa-small aa-fc-keys', 'Clavier : 1 2 3 4');
  };
  btn(bottom, 'Voir la réponse', reveal, 'mod-cta aa-fc-big aa-fc-reveal');
  h(bottom, 'p', 'aa-muted aa-small aa-fc-keys', 'Réponds d\'abord à voix haute. Clavier : espace');
  if (state._keys) document.removeEventListener('keydown', state._keys);
  state._keys = ev => {
    if (!root.isConnected || state.session !== ss || ss.queue[0] !== x) { document.removeEventListener('keydown', state._keys); return; }
    const tg = ev.target && ev.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
    if (!shown && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); reveal(); }
    else if (shown && /^[1-4]$/.test(ev.key)) { ev.preventDefault(); grade(+ev.key - 1); }
  };
  document.addEventListener('keydown', state._keys);
}
/* ====================================================================
 * 06i - Vocabulaire du Coran : cartes des mots les plus fréquents,
 * et ce que tu connais de chaque sourate.
 * Une carte de mot = un lemme du dictionnaire (data/lemmas.json).
 * Elle est « en cours » dès qu'elle a été vue, « acquise » quand elle
 * revient dans 7 jours ou plus.
 * ==================================================================== */
/* Tous les mots du Coran, du plus fréquent au plus rare, rangés en 5 niveaux.
 * [premier mot, dernier mot, taille des paquets, nom du niveau] */
const VOCAB_LEVELS = [
  [1, 300, 50, 'Niveau 1 · les mots de base'],
  [301, 1000, 50, 'Niveau 2 · les mots courants'],
  [1001, 2000, 100, 'Niveau 3 · les mots moins courants'],
  [2001, 3000, 100, 'Niveau 4 · les mots rares'],
  [3001, Infinity, 100, 'Niveau 5 · les mots très rares (jusqu\'à 100 %)'],
];
function vocabCardId(l) { return 'voc|' + cardHash((l[9] || l[0]) + '|' + l[1] + '|' + l[2]); }
/* identifiant de la carte du lemme n° li ; quelques mots s'écrivent pareil mais viennent
 * de deux racines (ex. جَواب « réponse » / « bassins ») : le plus rare reçoit sa racine en plus */
function vocabIdOf(data, li) {
  if (!data._vocIds) {
    const ids = new Array(data.lemmas.length), used = new Set();
    vocabRank(data).forEach(i => { const l = data.lemmas[i]; let id = vocabCardId(l); if (used.has(id)) id = 'voc|' + cardHash((l[9] || l[0]) + '|' + l[1] + '|' + l[2] + '|' + l[3]); used.add(id); ids[i] = id; });
    data._vocIds = ids;
  }
  return data._vocIds[li];
}
/* lemmes triés du plus fréquent au moins fréquent */
function vocabRank(data) {
  if (!data._vocRank) data._vocRank = data.lemmas.map((l, i) => i).sort((a, b) => data.lemmas[b][5] - data.lemmas[a][5] || a - b);
  return data._vocRank;
}
function vocabTotal(data) { if (!data._vocTot) data._vocTot = data.lemmas.reduce((s, l) => s + (l[5] || 0), 0); return data._vocTot; }
function vocabCard(data, li) { const l = data.lemmas[li]; return { id: vocabIdOf(data, li), s: '', q: l[0], a: l[4], voc: li }; }
function vocabDecks(data) {
  if (!data || !data.lemmas) return [];
  if (data._vocDecks) return data._vocDecks;
  const r = vocabRank(data); const out = []; const tot = vocabTotal(data); let cum = 0, n = 0;
  VOCAB_LEVELS.forEach(([a, b, size, name], lv) => {
    const end = Math.min(b, r.length);
    for (let k = a - 1; k < end; k += size) {
      const part = r.slice(k, Math.min(k + size, end));
      part.forEach(li => { cum += data.lemmas[li][5]; });
      const pct = 100 * cum / tot;
      out.push({ id: 'vocab/' + (++n), group: 'vocab', vocab: true, level: lv, levelName: name, title: 'Mots ' + (k + 1) + ' à ' + (k + part.length), cover: k + part.length >= r.length ? 100 : (pct > 99 ? Math.floor(pct * 10) / 10 : Math.round(pct)), cards: part.map(li => vocabCard(data, li)) });
    }
  });
  data._vocDecks = out;
  return out;
}
/* état de chaque lemme : 2 = acquis, 1 = en cours (vu, ou dans « mon vocabulaire ») */
function lemmaKnowledge(ctx) {
  const data = ctx.data; const S = srsStore(ctx);
  const out = new Map();
  for (let i = 0; i < data.lemmas.length; i++) {
    const st = S.cards[vocabIdOf(data, i)];
    if (st) out.set(i, st[1] >= 7 ? 2 : 1);
  }
  Object.keys(ctx.settings.myWords || {}).forEach(k => { const i = +k; if (!out.has(i)) out.set(i, 1); });
  return out;
}
/* part du Coran (en nombre de mots) que couvrent les lemmes connus */
function quranCoverage(ctx, K) {
  K = K || lemmaKnowledge(ctx); const L = ctx.data.lemmas; let a = 0, b = 0;
  K.forEach((v, i) => { if (v === 2) a += L[i][5]; else b += L[i][5]; });
  const t = vocabTotal(ctx.data);
  return { known: a / t, learning: b / t };
}
/* les lemmes de chaque mot d'une sourate (le cœur du mot, sans préfixe ni suffixe) */
async function surahLemmas(data, n) {
  if (!data._sl) data._sl = new Map();
  if (data._sl.has(n)) return data._sl.get(n);
  const d = await data.surah(n); const out = [];
  d.v.forEach((v, vi) => v[2].forEach((w, wi) => { const id = stemOf(w).seg[3]; out.push(id >= 0 ? id : -1); }));
  data._sl.set(n, out);
  return out;
}
async function surahKnowledge(ctx, n, K) {
  K = K || lemmaKnowledge(ctx);
  const ids = await surahLemmas(ctx.data, n);
  let total = 0, known = 0, learning = 0; const freq = new Map();
  ids.forEach(id => {
    if (id < 0) return; total++;
    const k = K.get(id); if (k === 2) known++; else if (k === 1) learning++;
    else freq.set(id, (freq.get(id) || 0) + 1);
  });
  const unknown = [...freq.entries()].sort((a, b) => b[1] - a[1] || ctx.data.lemmas[b[0]][5] - ctx.data.lemmas[a[0]][5]).map(x => x[0]);
  return { n, total, known, learning, unknown, pct: total ? Math.round(100 * known / total) : 0, pctAll: total ? Math.round(100 * (known + learning) / total) : 0 };
}
/* une séance « mots de cette sourate » : ceux à revoir, puis les nouveaux les plus utiles */
async function makeSurahWordsSession(ctx, n, max) {
  const data = ctx.data; const S = srsStore(ctx);
  const ids = [...new Set((await surahLemmas(data, n)).filter(i => i >= 0))];
  const d = { title: 'Mots de la sourate ' + data.surahInfo(n)[1], vocab: true };
  const due = shuffle(ids.map(i => vocabCard(data, i)).filter(c => isDue(S, c)).map(c => ({ c, d })));
  const k = await surahKnowledge(ctx, n);
  const fresh = k.unknown.slice(0, max || 15).map(i => ({ c: vocabCard(data, i), d, extra: true }));
  const queue = []; let i = 0, j = 0;
  while (i < due.length || j < fresh.length) { for (let q = 0; q < 3 && i < due.length; q++) queue.push(due[i++]); if (j < fresh.length) queue.push(fresh[j++]); }
  return { queue, done: 0, total: queue.length, again: 0 };
}
function progressBar2(parent, a, b, cls) {
  const bar = h(parent, 'div', 'aa-kbar' + (cls ? ' ' + cls : ''));
  const f1 = h(bar, 'div', 'aa-kbar-a'); f1.style.width = Math.round(100 * a) + '%';
  const f2 = h(bar, 'div', 'aa-kbar-b'); f2.style.width = Math.round(100 * b) + '%';
  return bar;
}

/* ---------- affichage d'une carte de mot ---------- */
function vocabExampleRef(l) {
  const refs = (l[6] || '').split(',').filter(Boolean).map(r => r.split(':').map(Number));
  if (!refs.length) return null;
  return refs.find(r => r[0] === 1) || refs.filter(r => r[0] >= 78).pop() || refs[0];
}
function renderVocabFront(ctx, el, c) {
  const l = ctx.data.lemmas[c.voc];
  const w = h(el, 'div', 'aa-voc-word'); w.setAttribute('dir', 'rtl'); w.textContent = l[0];
  const row = h(el, 'div', 'aa-voc-hint');
  h(row, 'span', 'aa-muted aa-small', lemmaType(l));
  const ref = vocabExampleRef(l);
  if (ctx.settings.audio !== false) soundBtn(row, ev => { ev && ev.stopPropagation && ev.stopPropagation(); playWord(ref, l[0], ctx); }, 'Écouter ce mot dans le Coran');
}
function renderVocabBack(ctx, el, c) {
  const data = ctx.data; const l = data.lemmas[c.voc];
  h(el, 'div', 'aa-voc-gloss', l[4]);
  const meta = h(el, 'div', 'aa-voc-meta aa-muted');
  const tr = lemmaTranslit(c.voc, data.lemmas); if (tr) h(meta, 'span', 'aa-tr', tr);
  if (l[3]) { const r = h(meta, 'span', null, 'racine '); const b = h(r, 'bdi', 'aa-ari'); b.setAttribute('dir', 'rtl'); b.textContent = l[3].split('').join(' '); }
  h(meta, 'span', null, l[5] + ' fois dans le Coran');
  if (l[7]) { const def = h(el, 'div', 'aa-voc-def'); cardInline(def, l[7].length > 260 ? l[7].slice(0, 260).replace(/\s+\S*$/, '') + '…' : l[7]); }
  const ref = vocabExampleRef(l);
  if (ref) {
    const ex = h(el, 'div', 'aa-voc-ex');
    data.surah(ref[0]).then(d => {
      const vv = d.v[ref[1] - 1]; if (!vv) return;
      const line = h(ex, 'div', 'aa-voc-ex-ar'); line.setAttribute('dir', 'rtl');
      vv[2].forEach((w, wi) => { arSpan(line, wordText(w), wi + 1 === ref[2] ? 'aa-voc-hl' : ''); line.appendChild(document.createTextNode(' ')); });
      const fr = h(ex, 'div', 'aa-voc-ex-fr aa-small'); fr.appendChild(document.createTextNode(vv[0] + ' '));
      const a = h(fr, 'a', 'aa-link', '(' + ref[0] + ':' + ref[1] + ')'); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(ref[0], ref[1]); });
    }).catch(() => {});
  }
}
/* ====================================================================
 * 06j - Données de l'onglet Écrire : comment tracer chaque lettre,
 * et les unités du parcours (lettres groupées par famille de formes).
 * steps : les gestes dans l'ordre · tip : le piège à éviter
 * join : false = la lettre ne s'attache jamais à la lettre suivante
 * ==================================================================== */
const WRITE_LETTERS = {
  'ب': { steps: ['Pars de la droite, un peu au-dessus de la ligne.', 'Descends doucement et trace un long trait **plat** vers la gauche, posé sur la ligne : un petit bateau.', 'Remonte un peu à gauche pour fermer le bateau.', 'À la fin seulement, ajoute **un point dessous**.'], tip: 'Le corps est large et plat. Le point vient toujours **après** le corps.' },
  'ت': { steps: ['Trace le même bateau que ب.', 'Ajoute **deux points au-dessus**, côte à côte, de droite à gauche.'], tip: 'Les deux points sont au milieu du bateau, pas au bout.' },
  'ث': { steps: ['Trace le même bateau que ب.', 'Ajoute **trois points au-dessus** : deux en bas, un au-dessus d\'eux (comme un petit triangle).'], tip: 'Sur papier, on écrit souvent les 3 points comme un petit « chapeau » ^.' },
  'ن': { steps: ['Pars en haut à droite.', 'Descends **sous la ligne** en arrondi, comme un bol.', 'Remonte à gauche.', 'Ajoute **un point au-dessus**, au milieu du bol.'], tip: 'Isolée ou à la fin, ن est plus **ronde et plus profonde** que ب. Au début et au milieu, elle ressemble à ب (point dessus).' },
  'ي': { steps: ['Pars en haut à droite, fais une petite vague vers la gauche.', 'Redescends en arrière vers la droite, sous la ligne.', 'Finis par une grande courbe vers la gauche (comme un s couché).', 'Ajoute **deux points dessous**.'], tip: 'Au début et au milieu, ي est une petite dent avec deux points dessous : يـ ـيـ.' },
  'ا': { steps: ['Pars **du haut** et trace un trait droit **vers le bas**, jusqu\'à la ligne.'], tip: 'Le alif est la lettre **la plus haute**. Il ne s\'attache **jamais** à la lettre qui suit.', join: false },
  'ل': { steps: ['Pars du haut, comme un alif.', 'Descends **sous la ligne**.', 'Tourne en arrondi vers la gauche et remonte un peu : un crochet.'], tip: 'Ne confonds pas avec ا : le lām descend sous la ligne et se termine par un crochet.' },
  'ك': { steps: ['Trace d\'abord le grand corps : un trait du haut vers le bas, puis un long trait plat vers la gauche, et remonte au bout.', 'Ajoute le **petit signe ء** à l\'intérieur (en fin de mot) ; au début et au milieu, on trace plutôt une barre en haut : كـ.'], tip: 'Au début et au milieu, le kāf a une **barre penchée en haut** : كـ ـكـ.' },
  'م': { steps: ['Fais une **petite boucle** ronde, sur la ligne (sens contraire des aiguilles d\'une montre).', 'Isolée ou à la fin : laisse tomber une **queue droite** sous la ligne.'], tip: 'La boucle est petite et bien fermée. Pas de point.' },
  'ج': { steps: ['Trace un petit trait en haut, de droite à gauche.', 'Repars en arrière et descends en grande courbe **sous la ligne**, comme un grand C ouvert à gauche.', 'Ajoute **un point** au milieu du ventre.'], tip: 'ج ح خ ont le même corps : seul le point change (dedans, rien, au-dessus).' },
  'ح': { steps: ['Même corps que ج : petit trait en haut, puis grande courbe sous la ligne.', '**Pas de point.**'], tip: 'Au début : حـ, juste la « tête » du corps, sans le grand ventre.' },
  'خ': { steps: ['Même corps que ج.', 'Ajoute **un point au-dessus**.'], tip: 'Le point est au-dessus de la tête, pas dedans.' },
  'د': { steps: ['Pars en haut, trace un petit trait penché vers le bas à gauche.', 'Puis un trait plat vers la droite, sur la ligne : un petit angle.'], tip: 'Petit et anguleux. Il ne s\'attache **jamais** à la lettre qui suit.', join: false },
  'ذ': { steps: ['Trace un د.', 'Ajoute **un point au-dessus**.'], tip: 'Ne s\'attache jamais à la lettre qui suit.', join: false },
  'ر': { steps: ['Pars sur la ligne et descends **sous la ligne** en courbe vers la gauche, comme une virgule.'], tip: 'ر plonge sous la ligne ; د reste posé dessus. Ne s\'attache jamais à la lettre qui suit.', join: false },
  'ز': { steps: ['Trace un ر.', 'Ajoute **un point au-dessus**.'], tip: 'Ne s\'attache jamais à la lettre qui suit.', join: false },
  'و': { steps: ['Fais une **petite boucle** sur la ligne.', 'Descends **sous la ligne** en courbe, comme un ر.'], tip: 'Une boucle + une queue de ر. Ne s\'attache jamais à la lettre qui suit.', join: false },
  'س': { steps: ['Trace **trois petites dents** de droite à gauche, sur la ligne.', 'Isolée ou à la fin : finis par un **grand bol** sous la ligne, comme ن.'], tip: 'Les dents sont petites et régulières. Au début : سـ, seulement les trois dents.' },
  'ش': { steps: ['Trace un س.', 'Ajoute **trois points au-dessus** (petit triangle).'], tip: 'Les 3 points sont au-dessus des dents.' },
  'ص': { steps: ['Fais une **boucle allongée** couchée vers la droite, comme un œuf posé sur la ligne.', 'Ajoute une petite dent à gauche.', 'Isolée ou à la fin : finis par le grand bol sous la ligne.'], tip: 'La boucle est fermée et allongée. Ne pas oublier la petite dent.' },
  'ض': { steps: ['Trace un ص.', 'Ajoute **un point au-dessus** de la boucle.'], tip: 'ض est la lettre qu\'on dit « propre à l\'arabe ».' },
  'ط': { steps: ['Trace le **grand trait vertical**, du haut vers le bas.', 'Sans lever le stylo, fais la **boucle allongée** posée sur la ligne, vers la droite, et reviens.'], tip: 'Beaucoup de gens font d\'abord la boucle puis le trait : les deux se font. L\'important est que le trait touche la boucle à gauche.' },
  'ظ': { steps: ['Trace un ط.', 'Ajoute **un point** à droite du trait vertical.'], tip: 'Le point est dans l\'angle, au-dessus de la boucle.' },
  'ع': { steps: ['Trace une **petite tête ouverte**, comme un c, en haut.', 'Repars vers la droite puis descends en grande courbe **sous la ligne**, comme pour ج.'], tip: 'Au milieu d\'un mot, la tête devient un petit triangle plein : ـعـ.' },
  'غ': { steps: ['Trace un ع.', 'Ajoute **un point au-dessus** de la tête.'], tip: 'Même forme que ع, avec un point.' },
  'ف': { steps: ['Fais une **petite boucle** ronde.', 'Puis un long trait plat vers la gauche sur la ligne, et remonte au bout.', 'Ajoute **un point au-dessus** de la boucle.'], tip: 'ف a un point, ق en a deux et descend plus bas.' },
  'ق': { steps: ['Fais une **petite boucle** ronde.', 'Isolée ou à la fin : descends en **bol profond** sous la ligne.', 'Ajoute **deux points au-dessus**.'], tip: 'Le bol de ق est rond et profond, comme celui de ن.' },
  'ه': { steps: ['Isolée : trace un **petit rond**, un peu aplati, sur la ligne.'], tip: 'ه change beaucoup : هـ au début (deux petites boucles), ـهـ au milieu, ـه à la fin.' },
  'ة': { steps: ['Trace un ه.', 'Ajoute **deux points au-dessus**.'], tip: 'Le tā marbūṭa n\'existe qu\'à la **fin** d\'un mot (ـة après une lettre attachée).', join: false, forms: ['ة', 'ـة'] },
  'ء': { steps: ['Trace une petite forme comme un **2 à l\'envers**, flottante, au-dessus de la ligne.'], tip: 'La hamza est petite. Elle est souvent posée sur un support : أ إ ؤ ئ.', join: false, forms: ['ء', 'أ', 'إ', 'ؤ', 'ئ'] },
  'لا': { steps: ['Trace le **lām** du haut vers le bas.', 'Au lieu de continuer, croise vers la droite, puis trace le **alif** penché qui remonte : une sorte de V.'], tip: 'ل + ا ne s\'écrivent jamais côte à côte : on fait toujours cette ligature لا.', join: false, forms: ['لا', 'ـلا'] },
};
/* le parcours : on avance par familles de lettres. words = mots à écrire (seulement avec les lettres déjà vues) */
const WRITE_UNITS = [
  { id: 'u1', title: 'Le petit bateau', letters: ['ب', 'ت', 'ث'], words: [['تَبَّتْ', 'tabbat', 'qu\'elles périssent (111:1)'], ['ثَبَّتَ', 'thabbata', 'il a affermi']] },
  { id: 'u2', title: 'Le bol et la vague', letters: ['ن', 'ي'], words: [['بَيْت', 'bayt', 'maison'], ['بَيْنَ', 'bayna', 'entre'], ['نَبِيّ', 'nabiyy', 'prophète']] },
  { id: 'u3', title: 'Les lettres hautes', letters: ['ا', 'ل', 'ك'], words: [['لَا', 'lā', 'non'], ['بَاب', 'bāb', 'porte'], ['كِتَاب', 'kitāb', 'livre'], ['تِلْكَ', 'tilka', 'celle-là']] },
  { id: 'u4', title: 'La petite boucle', letters: ['م'], words: [['مِنْ', 'min', 'de'], ['كَمَا', 'kamā', 'comme'], ['مَلِك', 'malik', 'roi'], ['لَمْ', 'lam', 'ne… pas']] },
  { id: 'u5', title: 'Le grand ventre', letters: ['ج', 'ح', 'خ'], words: [['جَنَّات', 'jannāt', 'jardins'], ['حَكِيم', 'ḥakīm', 'sage'], ['نَجْم', 'najm', 'étoile'], ['خَلِيل', 'khalīl', 'ami intime']] },
  { id: 'u6', title: 'Les petits angles', letters: ['د', 'ذ'], words: [['مُحَمَّد', 'muḥammad', 'Muhammad'], ['دِين', 'dīn', 'religion, jugement'], ['حَمْد', 'ḥamd', 'louange'], ['ذَلِكَ', 'dhālika', 'cela']] },
  { id: 'u7', title: 'Les lettres qui plongent', letters: ['ر', 'ز', 'و'], words: [['رَبّ', 'rabb', 'Seigneur'], ['رَحِيم', 'raḥīm', 'très miséricordieux'], ['نُور', 'nūr', 'lumière'], ['يَوْم', 'yawm', 'jour']] },
  { id: 'u8', title: 'Les dents', letters: ['س', 'ش'], words: [['بِسْمِ', 'bismi', 'au nom de'], ['نَاس', 'nās', 'les gens'], ['رَسُول', 'rasūl', 'messager'], ['شَمْس', 'shams', 'soleil']] },
  { id: 'u9', title: 'Les boucles couchées', letters: ['ص', 'ض', 'ط', 'ظ'], words: [['صِرَاط', 'ṣirāṭ', 'chemin'], ['صَبْر', 'ṣabr', 'patience'], ['ظُلْم', 'ẓulm', 'injustice'], ['ضَالِّين', 'ḍāllīn', 'égarés']] },
  { id: 'u10', title: 'L\'œil', letters: ['ع', 'غ'], words: [['عَلِيم', 'ʿalīm', 'qui sait tout'], ['عَالَمِين', 'ʿālamīn', 'les mondes'], ['غَيْب', 'ghayb', 'l\'invisible'], ['غَضَب', 'ghaḍab', 'colère']] },
  { id: 'u11', title: 'Les boucles rondes', letters: ['ف', 'ق'], words: [['قُلْ', 'qul', 'dis !'], ['فِي', 'fī', 'dans'], ['قَلْب', 'qalb', 'cœur'], ['فَلَق', 'falaq', 'aube']] },
  { id: 'u12', title: 'Le hā et le tā marbūṭa', letters: ['ه', 'ة'], words: [['اللَّه', 'allāh', 'Allah'], ['هُوَ', 'huwa', 'il, lui'], ['جَنَّة', 'janna', 'paradis'], ['رَحْمَة', 'raḥma', 'miséricorde']] },
  { id: 'u13', title: 'La hamza et lām-alif', letters: ['ء', 'لا'], words: [['أَحَد', 'aḥad', 'un, unique'], ['الْأَرْض', 'al-arḍ', 'la terre'], ['سَلَام', 'salām', 'paix'], ['مُؤْمِن', 'muʾmin', 'croyant']] },
  { id: 'u14', title: 'Écrire la Fātiḥa', letters: [], words: [['بِسْمِ اللَّهِ', 'bismi llāhi', 'au nom d\'Allah'], ['الرَّحْمَنِ الرَّحِيمِ', 'ar-raḥmāni r-raḥīm', 'le Tout Miséricordieux, le Très Miséricordieux'], ['الْحَمْدُ لِلَّهِ', 'al-ḥamdu lillāhi', 'la louange est à Allah'], ['رَبِّ الْعَالَمِينَ', 'rabbi l-ʿālamīn', 'Seigneur des mondes'], ['مَالِكِ يَوْمِ الدِّينِ', 'māliki yawmi d-dīn', 'Maître du jour du Jugement'], ['إِيَّاكَ نَعْبُدُ', 'iyyāka naʿbudu', 'c\'est Toi que nous adorons'], ['وَإِيَّاكَ نَسْتَعِينُ', 'wa-iyyāka nastaʿīn', 'et c\'est Toi dont nous implorons le secours'], ['اهْدِنَا الصِّرَاطَ', 'ihdinā ṣ-ṣirāṭa', 'guide-nous sur le chemin'], ['الْمُسْتَقِيمَ', 'al-mustaqīm', 'droit'], ['صِرَاطَ الَّذِينَ', 'ṣirāṭa lladhīna', 'le chemin de ceux'], ['أَنْعَمْتَ عَلَيْهِمْ', 'anʿamta ʿalayhim', 'que Tu as comblés'], ['غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ', 'ghayri l-maghḍūbi ʿalayhim', 'non pas de ceux qui ont encouru Ta colère'], ['وَلَا الضَّالِّينَ', 'wa-lā ḍ-ḍāllīn', 'ni des égarés']] },
];
const WRITE_BASICS = [
  'On écrit **de droite à gauche**, sur une **ligne de base** (le trait en pointillé).',
  'Dans chaque lettre, trace d\'abord **le corps**, puis les **points**, et à la toute fin les **voyelles** (petits signes).',
  'Les lettres d\'un mot **s\'attachent** entre elles par un trait sur la ligne. Six lettres ne s\'attachent **jamais à la suivante** : ا د ذ ر ز و.',
  'Chaque lettre a jusqu\'à **4 formes** : seule, au début, au milieu, à la fin. Le cœur de la lettre reste le même.',
  'Certaines lettres **montent** (ا ل ك ط), d\'autres **plongent sous la ligne** (ر ز و ن ي ج ح خ ع غ م ق س ش ص ض).',
  'Sur iPad, utilise de préférence l\'**Apple Pencil**. Sur téléphone, le doigt suffit : écris grand.',
];
/* les 4 formes d'une lettre, avec le trait d'union arabe (ـ) pour montrer les liaisons */
function writeForms(l) {
  const W = WRITE_LETTERS[l] || {};
  if (W.forms) return W.forms.map((f, i) => [f, i === 0 ? 'seule' : (W.forms.length === 2 ? 'à la fin' : 'sur un support')]);
  if (W.join === false) return [[l, 'seule'], ['ـ' + l, 'à la fin']];
  return [[l, 'seule'], [l + 'ـ', 'au début'], ['ـ' + l + 'ـ', 'au milieu'], ['ـ' + l, 'à la fin']];
}
/* ====================================================================
 * 06k - Onglet Écrire : apprendre à tracer les lettres et les mots
 * Un cahier d'écriture : on regarde, on trace sur le modèle, puis on
 * écrit seul. L'atelier compare ton tracé au modèle et donne une note.
 * Tout se passe sur l'appareil (aucune connexion nécessaire).
 * ==================================================================== */
const WR_FONT = '"Atelier Amiri Quran", "Amiri Quran", "Amiri", "Geeza Pro", serif';
function writeState(ctx) { const W = ctx.settings.writing || (ctx.settings.writing = {}); if (!W.l) W.l = {}; if (!W.w) W.w = {}; return W; }
function letterLearned(W, l) { return !!(W.l[l] && W.l[l].s >= 60); }
function writeAllLetters() { const out = []; WRITE_UNITS.forEach(u => u.letters.forEach(l => out.push(l))); return out; }
function writeNext(W) {
  for (const u of WRITE_UNITS) for (const l of u.letters) if (!letterLearned(W, l)) return { unit: u, letter: l };
  for (const u of WRITE_UNITS) for (let i = 0; i < u.words.length; i++) if (!(W.w[u.words[i][0]] >= 60)) return { unit: u, word: i };
  return null;
}
function alphaLetter(l) { return (((CONTENT[UI_LANG] || CONTENT.fr || {}).alphabet || {}).letters || []).find(x => x.l === l) || null; }
function starsOf(score) { return score >= 80 ? '★★★' : score >= 60 ? '★★☆' : score >= 40 ? '★☆☆' : '☆☆☆'; }

/* ---------- le cahier : une zone où l'on écrit au doigt, au stylet ou à la souris ---------- */
function wrGrid(cv, cell) {
  const w = cv.width, hh = cv.height; const d = cv.getContext('2d').getImageData(0, 0, w, hh).data;
  const gw = Math.ceil(w / cell), gh = Math.ceil(hh / cell); const g = new Uint8Array(gw * gh);
  for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 90) g[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
  return { g, gw, gh };
}
function wrDilate(G, r) {
  if (r <= 0) return G;
  const { gw, gh } = G; const a = new Uint8Array(gw * gh), b = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) { let last = -1e9; for (let x = 0; x < gw; x++) { if (G.g[y * gw + x]) last = x; if (x - last <= r) a[y * gw + x] = 1; } last = 1e9; for (let x = gw - 1; x >= 0; x--) { if (G.g[y * gw + x]) last = x; if (last - x <= r) a[y * gw + x] = 1; } }
  for (let x = 0; x < gw; x++) { let last = -1e9; for (let y = 0; y < gh; y++) { if (a[y * gw + x]) last = y; if (y - last <= r) b[y * gw + x] = 1; } last = 1e9; for (let y = gh - 1; y >= 0; y--) { if (a[y * gw + x]) last = y; if (last - y <= r) b[y * gw + x] = 1; } }
  return { g: b, gw, gh };
}
function wrBox(G) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < G.gh; y++) for (let x = 0; x < G.gw; x++) if (G.g[y * G.gw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
/* note sur 100 : la part du modèle que ton tracé recouvre, et la part de ton tracé qui tombe sur le modèle */
function wrCompare(model, ink, rCover, rTol) {
  const id = wrDilate(ink, rCover), md = wrDilate(model, rTol);
  let m = 0, mc = 0, k = 0, kc = 0;
  for (let i = 0; i < model.g.length; i++) { if (model.g[i]) { m++; if (id.g[i]) mc++; } if (ink.g[i]) { k++; if (md.g[i]) kc++; } }
  if (!m || !k) return { score: 0, cover: 0, prec: 0 };
  const cover = mc / m, prec = kc / k; let f = 2 * cover * prec / Math.max(1e-6, cover + prec);
  const area = k / m; if (area > 1.6) f *= 1.6 / area; // trop d'encre : un gribouillis n'est pas une lettre
  return { score: Math.round(100 * Math.max(0, Math.min(1, (f - 0.35) / 0.55))), cover, prec, area };
}

function makeWritePad(ctx, parent, opts) {
  const pad = { strokes: [], text: opts.text || '', mode: opts.mode || 'trace', checked: false };
  const wrap = h(parent, 'div', 'aa-wr-pad aa-wr-' + pad.mode);
  const cv = h(wrap, 'canvas', 'aa-wr-canvas');
  const tools = h(parent, 'div', 'aa-wr-tools');
  const res = h(parent, 'div', 'aa-wr-res');
  let W = 0, H = 0, dpr = 1, lay = null, demoT = null;
  const g2 = () => cv.getContext('2d');
  const colors = () => { const cs = getComputedStyle(wrap); return { ink: cs.color || '#222', model: cs.getPropertyValue('--aa-wr-model').trim() || 'rgba(120,120,130,.22)', good: cs.getPropertyValue('--aa-acc').trim() || '#1f9a55', line: cs.getPropertyValue('--aa-wr-line').trim() || 'rgba(120,120,130,.45)' }; };
  function layout() {
    W = Math.max(240, Math.round(wrap.clientWidth || parent.clientWidth || 600));
    H = Math.round(Math.max(190, Math.min(320, W * (pad.text.length > 4 ? 0.42 : 0.55))));
    dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
    lay = null;
    if (!pad.text) return;
    const c = document.createElement('canvas').getContext('2d');
    const fit = fs => { c.font = fs + 'px ' + WR_FONT; c.direction = 'rtl'; c.textAlign = 'left'; const m = c.measureText(pad.text); return { m, bw: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, bh: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent }; };
    let fs = H * 0.5; let r = fit(fs);
    const s = Math.min((W * 0.86) / Math.max(1, r.bw), (H * 0.74) / Math.max(1, r.bh), 1.7);
    fs = Math.max(20, fs * s); r = fit(fs);
    const x = W / 2 + (r.m.actualBoundingBoxLeft - r.m.actualBoundingBoxRight) / 2;
    const y = H / 2 + (r.m.actualBoundingBoxAscent - r.m.actualBoundingBoxDescent) / 2;
    lay = { fs, x, y, lw: Math.max(5, fs * 0.055), left: x - r.m.actualBoundingBoxLeft, right: x + r.m.actualBoundingBoxRight };
  }
  function drawText(c, color, clipFrom) {
    if (!lay) return;
    c.save();
    if (clipFrom != null) { c.beginPath(); c.rect(clipFrom, 0, W, H); c.clip(); }
    c.font = lay.fs + 'px ' + WR_FONT; c.direction = 'rtl'; c.textAlign = 'left'; c.fillStyle = color; c.fillText(pad.text, lay.x, lay.y);
    c.restore();
  }
  function drawStrokes(c, color, strokes, lw) {
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of strokes) {
      if (s.length === 1) { c.beginPath(); c.arc(s[0][0], s[0][1], lw / 2, 0, 7); c.fill(); continue; }
      c.beginPath(); c.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) c.lineTo(s[i][0], s[i][1]); c.stroke();
    }
    c.restore();
  }
  function redraw(o) {
    o = o || {};
    const c = g2(); const col = colors();
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const base = lay ? lay.y : H * 0.62;
    c.save(); c.strokeStyle = col.line; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(10, base); c.lineTo(W - 10, base); c.stroke(); c.restore();
    if (o.demo != null) drawText(c, col.ink, o.demo);
    else if (o.result) drawText(c, col.good, null);
    else if (pad.mode === 'trace' || pad.mode === 'view') drawText(c, col.model, null);
    c.save(); if (o.result) c.globalAlpha = .85;
    drawStrokes(c, col.ink, o.strokes || pad.strokes, lay ? lay.lw : 6);
    c.restore();
  }
  /* démonstration : la lettre apparaît de droite à gauche, dans le sens de l'écriture */
  /* le chemin du stylo, calculé une fois pour ce texte et cette taille */
  let plan = null, planKey = '';
  function getPlan() {
    const key = pad.text + '|' + W + 'x' + H;
    if (plan && planKey === key) return plan;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); drawText(g, '#000', null);
    const d = g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 110) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { plan = { strokes: [] }; planKey = key; return plan; }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const w = x1 - x0 + 1, hh = y1 - y0 + 1; const m = new Uint8Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) m[y * w + x] = d[((y + y0) * W + x + x0) * 4 + 3] > 110 ? 1 : 0;
    const pl = penPlan(m, w, hh, lay.fs);
    pl.strokes.forEach(s => { s.pts = s.pts.map(([x, y, r]) => [x + x0, y + y0, r]); });
    plan = pl; planKey = key; return plan;
  }
  /* démonstration : un stylo écrit le texte, trait par trait, dans le bon ordre et le bon sens */
  pad.demo = (slow) => {
    if (!lay) return; if (demoT) cancelAnimationFrame(demoT);
    const pl = getPlan(); if (!pl.strokes.length) return;
    const col = colors(); const accent = getComputedStyle(wrap).getPropertyValue('--interactive-accent').trim() || '#6a5acd';
    const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height; const mg = mask.getContext('2d'); mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.fillStyle = '#000'; mg.strokeStyle = '#000'; mg.lineCap = 'round';
    const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; const tg = tmp.getContext('2d');
    const showNum = pad.text.replace(/[ً-ٰٟۖ-ۭ]/g, '').length <= 3;
    const speed = Math.max(0.12, lay.fs / 900) * (slow ? 0.55 : 1); // pixels par milliseconde
    const labels = []; let si = 0, pi = 0, pause = 350, last = performance.now(), num = 0;
    const paint = (pen) => {
      const c = g2(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      c.save(); c.strokeStyle = col.line; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(10, lay.y); c.lineTo(W - 10, lay.y); c.stroke(); c.restore();
      drawText(c, col.model, null);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height); tg.globalCompositeOperation = 'source-over'; tg.setTransform(dpr, 0, 0, dpr, 0, 0); drawText(tg, col.ink, null);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tmp, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      labels.forEach(([x, y, n]) => { c.save(); c.fillStyle = accent; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, y + 0.5); c.restore(); });
      if (pen) { c.save(); c.fillStyle = accent; c.globalAlpha = .9; c.beginPath(); c.arc(pen[0], pen[1], Math.max(5, lay.lw * 0.7), 0, 7); c.fill(); c.globalAlpha = .25; c.beginPath(); c.arc(pen[0], pen[1], Math.max(11, lay.lw * 1.5), 0, 7); c.fill(); c.restore(); }
    };
    const step = now => {
      let dt = now - last; last = now;
      if (pause > 0) { pause -= dt; dt = 0; }
      let budget = dt * speed; let pen = null;
      while (budget > 0 && si < pl.strokes.length) {
        const s = pl.strokes[si];
        if (pi === 0 && s.first && s.comp !== 'tiny') { num++; if (showNum && s.pts.length > 2) { const [x, y] = s.pts[0]; labels.push([x + 14, y - 14, num]); } }
        const p = s.pts[pi]; const q = pi > 0 ? s.pts[pi - 1] : p;
        mg.lineWidth = 2 * (p[2] + 1.3); mg.beginPath(); mg.moveTo(q[0], q[1]); mg.lineTo(p[0], p[1]); mg.stroke();
        mg.beginPath(); mg.arc(p[0], p[1], p[2] + 1.3, 0, 7); mg.fill();
        budget -= Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; pen = p; pi++;
        if (pi >= s.pts.length) { si++; pi = 0; const nx = pl.strokes[si]; if (nx && (nx.comp !== 'tiny' || !nx.first)) { pause = nx.first ? 380 : 220; break; } }
      }
      if (si < pl.strokes.length) { paint(pen || (pl.strokes[si].pts[Math.max(0, pi - 1)])); demoT = requestAnimationFrame(step); }
      else {
        demoT = null; mg.setTransform(1, 0, 0, 1, 0, 0); mg.fillRect(0, 0, mask.width, mask.height); paint(null);
        if (pad.mode !== 'view') setTimeout(() => { if (!pad.strokes.length && !pad.checked && !demoT) redraw(); }, 1600);
      }
    };
    paint(pl.strokes[0].pts[0]);
    demoT = requestAnimationFrame(step);
  };
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  let cur = null, penSeen = false;
  if (pad.mode !== 'view') {
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen') penSeen = true;
      if (penSeen && e.pointerType === 'touch') return; // la paume posée sur l'iPad
      if (demoT) { cancelAnimationFrame(demoT); demoT = null; }
      if (pad.checked) { pad.checked = false; pad.strokes = []; clear(res); }
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      cur = [pt(e)]; pad.strokes.push(cur); redraw();
    });
    cv.addEventListener('pointermove', e => {
      if (!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(x => cur.push(pt(x)));
      redraw();
    });
    const end = () => { cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') end(); });
    btn(tools, '↶ Annuler le trait', () => { pad.strokes.pop(); pad.checked = false; clear(res); redraw(); }, 'aa-btn-quiet');
    btn(tools, '✕ Effacer', () => { pad.strokes = []; pad.checked = false; clear(res); redraw(); }, 'aa-btn-quiet');
  }
  if (pad.text) { btn(tools, '▶ Voir le geste', () => { pad.strokes = []; pad.checked = false; clear(res); pad.demo(); }, 'aa-btn-quiet'); btn(tools, '🐢 Au ralenti', () => { pad.strokes = []; pad.checked = false; clear(res); pad.demo(true); }, 'aa-btn-quiet'); }
  if (pad.text && pad.mode !== 'view' && opts.onScore) btn(tools, '✓ Vérifier', () => pad.check(), 'mod-cta');
  pad.check = () => {
    if (!lay) return;
    if (!pad.strokes.length) { clear(res); h(res, 'div', 'aa-muted', 'Écris d\'abord dans le cadre.'); return; }
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const mc = mk(); drawText(mc.getContext('2d'), '#000', null);
    const cell = 3; const model = wrGrid(mc, cell);
    let strokes = pad.strokes;
    if (pad.mode === 'alone') { // écrit sans modèle : on remet ton tracé à la taille et à la place du modèle
      const c0 = mk(); drawStrokes(c0.getContext('2d'), '#000', strokes, lay.lw);
      const ib = wrBox(wrGrid(c0, cell)), mb = wrBox(model);
      if (mb && ib) {
        const mw = (mb.x1 - mb.x0 + 1) * cell, mh = (mb.y1 - mb.y0 + 1) * cell, iw = (ib.x1 - ib.x0 + 1) * cell, ih = (ib.y1 - ib.y0 + 1) * cell;
        // largeur et hauteur ajustées séparément, sans trop déformer (rapport limité à 1,6)
        const g = Math.sqrt((mw / iw) * (mh / ih)); const lim = v => Math.max(g / 1.6, Math.min(g * 1.6, v));
        const sx = Math.max(0.3, Math.min(4, lim(mw / iw))), sy = Math.max(0.3, Math.min(4, lim(mh / ih)));
        const cx = (ib.x0 + ib.x1 + 1) * cell / 2, cy = (ib.y0 + ib.y1 + 1) * cell / 2, mx = (mb.x0 + mb.x1 + 1) * cell / 2, my = (mb.y0 + mb.y1 + 1) * cell / 2;
        strokes = strokes.map(st => st.map(([x, y]) => [mx + (x - cx) * sx, my + (y - cy) * sy]));
      }
    }
    const ic = mk(); drawStrokes(ic.getContext('2d'), '#000', strokes, lay.lw);
    const ink = wrGrid(ic, cell);
    const r = wrCompare(model, ink, Math.max(1, Math.round(lay.fs * 0.035 / cell)), Math.max(1, Math.round(lay.fs * (pad.mode === 'alone' ? 0.055 : 0.045) / cell)));
    pad.checked = true;
    redraw({ result: true, strokes });
    clear(res);
    const row = h(res, 'div', 'aa-wr-score ' + (r.score >= 60 ? 'aa-wr-good' : r.score >= 40 ? 'aa-wr-mid' : 'aa-wr-low'));
    h(row, 'span', 'aa-wr-stars', starsOf(r.score)); h(row, 'b', null, r.score + ' / 100');
    let msg = r.score >= 80 ? 'Très bien tracé.' : r.score >= 60 ? 'Bien. La forme est reconnaissable.' : r.score >= 40 ? 'Presque : compare avec le modèle en vert.' : 'Pas encore : regarde le geste, puis réessaie.';
    if (r.score < 80 && r.cover < 0.6) msg += ' Il manque une partie de la lettre (un point ? la fin du trait ?).';
    else if (r.score < 80 && r.prec < 0.6) msg += ' Une partie de ton tracé sort du modèle.';
    h(row, 'span', 'aa-muted', msg);
    if (ctx.markActivity) ctx.markActivity('w');
    if (opts.onScore) opts.onScore(r.score, r);
  };
  pad.info = () => ({ lay, W, H });
  pad.plan = () => getPlan();
  pad.setText = t => { pad.text = t; pad.strokes = []; pad.checked = false; clear(res); layout(); redraw(); };
  const start = () => {
    layout(); redraw(); if (opts.autoDemo) setTimeout(() => pad.demo(), 300);
    // l'iPad tourne, la fenêtre change de taille : on garde le tracé à sa place
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (!wrap.isConnected) { ro.disconnect(); return; }
        const w0 = W, h0 = H; const nw = Math.round(wrap.clientWidth || 0);
        if (!nw || Math.abs(nw - w0) < 8) return;
        layout(); const kx = W / w0, ky = H / h0;
        pad.strokes = pad.strokes.map(s => s.map(([x, y]) => [x * kx, y * ky])); pad.checked = false; clear(res); redraw();
      });
      ro.observe(wrap);
    }
  };
  if (document.fonts && document.fonts.load) document.fonts.load('40px ' + WR_FONT, pad.text || 'ب').then(start, start); else start();
  return pad;
}

/* ---------- l'onglet ---------- */
function renderWriteTab(ctx, root, state) {
  clear(root);
  const go = () => renderWriteTab(ctx, root, state);
  if (state.letter) return renderWriteLetter(ctx, root, state, go);
  if (state.word) return renderWriteWord(ctx, root, state, go);
  if (state.unit) { const u = WRITE_UNITS.find(x => x.id === state.unit); if (u) return renderWriteUnit(ctx, root, state, u, go); state.unit = null; }
  if (state.free) return renderWriteFree(ctx, root, state, go);
  const W = writeState(ctx);
  const all = writeAllLetters(); const nL = all.filter(l => letterLearned(W, l)).length;
  mdText(root, 'p', 'aa-help', 'Un vrai cahier d\'écriture : pour chaque lettre, tu **regardes le geste**, tu **traces sur le modèle**, puis tu l\'**écris seul**. L\'atelier compare ton tracé au modèle et te donne une note. Une lettre est apprise quand tu l\'écris seul avec au moins **60 / 100**.');
  const head = h(root, 'div', 'aa-wr-head');
  const bar = h(head, 'div', 'aa-lesson-progress'); const f = h(bar, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * nL / all.length) + '%';
  h(head, 'div', 'aa-muted aa-small', nL + ' / ' + all.length + ' lettres apprises');
  const nx = writeNext(W);
  const act = h(head, 'div', 'aa-fc-start');
  if (nx && nx.letter) btn(act, '▶  Continuer : la lettre ' + nx.letter + (alphaLetter(nx.letter) ? ' (' + alphaLetter(nx.letter).name + ')' : ''), () => { state.unit = nx.unit.id; state.letter = nx.letter; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else if (nx) btn(act, '▶  Continuer : écrire « ' + nx.unit.words[nx.word][0] + ' »', () => { state.unit = nx.unit.id; state.word = [nx.unit.id, nx.word]; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else h(act, 'div', 'aa-ok', 'Tu as fait tout le parcours. Continue avec l\'écriture libre, ou refais les lettres pour améliorer tes notes.');
  btn(act, '✏️  Écriture libre', () => { state.free = true; go(); }, 'aa-fc-big2');
  const bas = details(root, '📏 Les règles de base de l\'écriture arabe', nL === 0);
  const ul = h(bas, 'ul', 'aa-wr-basics'); WRITE_BASICS.forEach(t => mdText(ul, 'li', null, t));
  const grid = h(root, 'div', 'aa-wr-units');
  WRITE_UNITS.forEach((u, k) => {
    const done = u.letters.filter(l => letterLearned(W, l)).length; const wd = u.words.filter(w => W.w[w[0]] >= 60).length;
    const c = h(grid, 'div', 'aa-wr-unit' + (u.letters.length && done === u.letters.length ? ' aa-wr-unit-done' : '') + (nx && nx.unit === u ? ' aa-wr-unit-next' : ''));
    const top = h(c, 'div', 'aa-lesson-top'); h(top, 'span', 'aa-lesson-num', String(k + 1)); if (nx && nx.unit === u) h(top, 'span', 'aa-tag', '→ maintenant');
    h(c, 'div', 'aa-lesson-title', u.title);
    const ls = h(c, 'div', 'aa-wr-chips'); ls.setAttribute('dir', 'rtl');
    (u.letters.length ? u.letters : u.words.slice(0, 2).map(w => w[0])).forEach(l => h(ls, 'span', 'aa-wr-chip' + (letterLearned(W, l) ? ' aa-wr-chip-ok' : ''), l));
    h(c, 'div', 'aa-muted aa-small', (u.letters.length ? done + ' / ' + u.letters.length + ' lettres · ' : '') + wd + ' / ' + u.words.length + ' mots');
    c.addEventListener('click', () => { state.unit = u.id; go(); });
  });
}

function renderWriteUnit(ctx, root, state, u, go) {
  const W = writeState(ctx);
  btn(h(root, 'div', 'aa-actions'), '← Toutes les unités', () => { state.unit = null; go(); }, 'aa-btn-quiet');
  h(root, 'h2', null, u.title);
  if (u.letters.length) {
    h(root, 'h3', 'aa-fc-group', 'Les lettres');
    const grid = h(root, 'div', 'aa-wr-letters');
    u.letters.forEach(l => {
      const A = alphaLetter(l); const st = W.l[l];
      const c = h(grid, 'div', 'aa-wr-lcard' + (letterLearned(W, l) ? ' aa-wr-lcard-ok' : ''));
      const g = h(c, 'div', 'aa-wr-lbig'); g.setAttribute('dir', 'rtl'); g.textContent = l;
      h(c, 'div', null, A ? A.name : (l === 'لا' ? 'lām-alif' : l === 'ة' ? 'tā marbūṭa' : l === 'ء' ? 'hamza' : ''));
      h(c, 'div', 'aa-muted aa-small', st ? (letterLearned(W, l) ? '✓ apprise · ' : '') + 'seul : ' + (st.s || 0) + ' / 100' : 'pas encore faite');
      c.addEventListener('click', () => { state.letter = l; state.step = 0; go(); });
    });
  }
  h(root, 'h3', 'aa-fc-group', u.letters.length ? 'Des mots avec ces lettres' : 'Les mots');
  const list = h(root, 'div', 'aa-wr-words');
  u.words.forEach((w, i) => {
    const r = h(list, 'div', 'aa-wr-wrow');
    const a = h(r, 'span', 'aa-wr-war'); a.setAttribute('dir', 'rtl'); a.textContent = w[0];
    const t = h(r, 'span', 'aa-wr-wtxt'); h(t, 'span', 'aa-tr', w[1]); h(t, 'span', 'aa-muted', ' · ' + w[2]);
    h(r, 'span', 'aa-muted aa-small', W.w[w[0]] != null ? (W.w[w[0]] >= 60 ? '✓ ' : '') + W.w[w[0]] + ' / 100' : '');
    r.addEventListener('click', () => { state.word = [u.id, i]; state.step = 0; go(); });
  });
  if (u.id === 'u14') h(root, 'p', 'aa-muted aa-small', 'On écrit ici l\'orthographe courante (الرَّحْمَنِ). Dans le Coran, le ā de الرَّحْمَٰنِ est noté par un petit alif ٰ au-dessus.');
}

/* une lettre : regarder, tracer, tracer ses formes, l'écrire seul */
function renderWriteLetter(ctx, root, state, go) {
  const l = state.letter; const Wd = WRITE_LETTERS[l] || { steps: [], tip: '' }; const A = alphaLetter(l); const W = writeState(ctx);
  const forms = writeForms(l);
  const ex = [{ t: l, m: 'trace', lab: 'Trace la lettre en suivant le modèle gris.' }, { t: l, m: 'trace', lab: 'Encore une fois, plus régulier.' }];
  forms.slice(1).forEach(([f, where]) => ex.push({ t: f, m: 'trace', lab: 'Trace la forme ' + where + ' : ' + f }));
  ex.push({ t: l, m: 'alone', lab: 'Maintenant, écris la lettre **seul**, sans modèle. Ensuite, appuie sur « Vérifier ».' });
  const n = ex.length; const step = state.step || 0;
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Retour', () => { state.letter = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', 'La lettre ' + (A ? A.name : l));
  h(top, 'span', 'aa-muted aa-small aa-fc-left', step === 0 ? 'Regarder' : 'Exercice ' + step + ' / ' + n);
  const bar = h(root, 'div', 'aa-lesson-progress'); const fl = h(bar, 'div', 'aa-lesson-fill'); fl.style.width = Math.round(100 * step / (n + 1)) + '%';
  if (step === 0) {
    const box = h(root, 'div', 'aa-wr-look');
    const big = h(box, 'div', 'aa-wr-look-pad');
    const pad = makeWritePad(ctx, big, { text: l, mode: 'view', autoDemo: true });
    const info = h(box, 'div', 'aa-wr-look-info');
    const nm = h(info, 'div', 'aa-wr-name'); h(nm, 'b', null, A ? A.name : l); if (A) { const s = h(nm, 'span', 'aa-ari'); s.setAttribute('dir', 'rtl'); s.textContent = '  ' + A.nameAr; }
    if (A) { const snd = h(info, 'div', 'aa-actions'); btn(snd, '🔊 Le nom', () => speak(A.nameAr), 'aa-btn-quiet'); h(snd, 'span', 'aa-muted aa-small', 'son : ' + A.son); }
    h(info, 'h4', null, 'Le geste');
    const ol = h(info, 'ol', 'aa-wr-steps'); Wd.steps.forEach(s => mdText(ol, 'li', null, s));
    if (Wd.tip) mdText(info, 'p', 'aa-wr-tip', '💡 ' + Wd.tip);
    h(root, 'h4', null, 'Ses formes dans un mot');
    const fr = h(root, 'div', 'aa-wr-forms');
    forms.forEach(([f, where]) => { const c = h(fr, 'div', 'aa-wr-form'); const a = h(c, 'div', 'aa-wr-form-ar'); a.setAttribute('dir', 'rtl'); a.textContent = f; h(c, 'div', 'aa-muted aa-small', where); });
    if (A && A.ex) { const e = h(root, 'p', 'aa-muted'); e.appendChild(document.createTextNode('Exemple : ')); const s = h(e, 'bdi', 'aa-ari aa-wr-exw'); s.setAttribute('dir', 'rtl'); s.textContent = A.ex[0]; e.appendChild(document.createTextNode('  ' + A.ex[1] + ' · ' + A.ex[2])); }
    btn(h(root, 'div', 'aa-fc-start'), 'Je m\'entraîne →', () => { state.step = 1; go(); }, 'mod-cta aa-fc-big');
    return pad;
  }
  if (step > n) {
    const st = W.l[l] || {};
    const end = h(root, 'div', 'aa-fc-end');
    h(end, 'div', 'aa-fc-end-ic', letterLearned(W, l) ? '🌿' : '✍️');
    h(end, 'h3', null, letterLearned(W, l) ? 'Lettre apprise' : 'Continue à t\'entraîner');
    h(end, 'p', 'aa-muted', 'Meilleure note en traçant : ' + (st.t || 0) + ' / 100 · écrite seul : ' + (st.s || 0) + ' / 100.' + (letterLearned(W, l) ? '' : ' Il faut au moins 60 seul pour la valider.'));
    const a = h(end, 'div', 'aa-fc-start');
    const nx = writeNext(W);
    if (nx && nx.letter && nx.letter !== l) btn(a, 'Lettre suivante : ' + nx.letter + ' →', () => { state.unit = nx.unit.id; state.letter = nx.letter; state.step = 0; go(); }, 'mod-cta aa-fc-big');
    btn(a, '↻ Refaire cette lettre', () => { state.step = 1; go(); }, 'aa-fc-big2');
    btn(a, 'Retour à l\'unité', () => { state.letter = null; go(); }, 'aa-btn-quiet');
    return;
  }
  const e = ex[step - 1];
  mdText(root, 'p', 'aa-wr-ask', e.lab);
  if (e.m === 'alone') { const nm = h(root, 'div', 'aa-muted aa-small'); nm.textContent = 'La lettre ' + (A ? A.name : l) + ', forme seule. Si tu bloques : « Voir le geste ».'; }
  const pad = makeWritePad(ctx, root, { text: e.t, mode: e.m, autoDemo: step === 1, onScore: sc => {
    const st = W.l[l] || (W.l[l] = { t: 0, s: 0, n: 0 });
    st.n++; if (e.m === 'alone') st.s = Math.max(st.s || 0, sc); else st.t = Math.max(st.t || 0, sc); st.d = todayNum();
    ctx.save();
    nav.style.display = '';
  } });
  const nav = h(root, 'div', 'aa-fc-start'); nav.style.display = 'none';
  btn(nav, step < n ? 'Exercice suivant →' : 'Terminer →', () => { state.step = step + 1; go(); }, 'mod-cta aa-fc-big');
  btn(nav, '↻ Réessayer', () => { pad.setText(e.t); nav.style.display = 'none'; }, 'aa-fc-big2');
  if (step < n) { const skip = h(root, 'p', 'aa-small'); const sk = h(skip, 'a', 'aa-link aa-muted', 'passer cet exercice'); sk.addEventListener('click', ev => { ev.preventDefault(); state.step = step + 1; go(); }); }
}

function renderWriteWord(ctx, root, state, go) {
  const [uid, i] = state.word; const u = WRITE_UNITS.find(x => x.id === uid); const w = u && u.words[i];
  if (!w) { state.word = null; return go(); }
  const W = writeState(ctx); const step = state.step || 0;
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Retour', () => { state.word = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', u.title);
  h(top, 'span', 'aa-muted aa-small aa-fc-left', 'Mot ' + (i + 1) + ' / ' + u.words.length);
  const head = h(root, 'div', 'aa-wr-wordhead');
  const a = h(head, 'span', 'aa-wr-war'); a.setAttribute('dir', 'rtl'); a.textContent = w[0];
  h(head, 'span', 'aa-tr', w[1]); h(head, 'span', 'aa-muted', ' · ' + w[2]);
  soundBtn(head, () => speak(w[0]));
  mdText(root, 'p', 'aa-wr-ask', step === 0 ? 'Trace le mot sur le modèle : les lettres **attachées d\'un seul trait**, puis les points, puis les voyelles.' : 'Écris le mot **seul**, sans modèle (tu peux le lire en haut), puis « Vérifier ».');
  const nav = h(document.createElement('div'), 'div', 'aa-fc-start');
  const pad = makeWritePad(ctx, root, { text: w[0], mode: step === 0 ? 'trace' : 'alone', autoDemo: step === 0, onScore: sc => {
    if (step === 1) { W.w[w[0]] = Math.max(W.w[w[0]] || 0, sc); ctx.save(); }
    nav.style.display = '';
  } });
  root.appendChild(nav); nav.style.display = 'none';
  if (step === 0) btn(nav, 'Maintenant seul →', () => { state.step = 1; go(); }, 'mod-cta aa-fc-big');
  else if (i + 1 < u.words.length) btn(nav, 'Mot suivant →', () => { state.word = [uid, i + 1]; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else btn(nav, 'Retour à l\'unité', () => { state.word = null; go(); }, 'mod-cta aa-fc-big');
  btn(nav, '↻ Réessayer', () => { pad.setText(w[0]); nav.style.display = 'none'; }, 'aa-fc-big2');
  if (step === 0) { const s = h(root, 'p', 'aa-small'); const k = h(s, 'a', 'aa-link aa-muted', 'passer au tracé seul'); k.addEventListener('click', ev => { ev.preventDefault(); state.step = 1; go(); }); }
}

function renderWriteFree(ctx, root, state, go) {
  btn(h(root, 'div', 'aa-actions'), '← Retour', () => { state.free = false; go(); }, 'aa-btn-quiet');
  h(root, 'h2', null, '✏️ Écriture libre');
  mdText(root, 'p', 'aa-muted', 'Tape un mot arabe (ou choisis-en un) pour avoir un modèle, puis entraîne-toi. Laisse vide pour écrire sans modèle.');
  const row = h(root, 'div', 'aa-actions');
  const inp = h(row, 'input', 'aa-input aa-wr-input'); inp.type = 'text'; inp.setAttribute('dir', 'rtl'); inp.value = state.freeText != null ? state.freeText : 'بِسْمِ اللَّهِ';
  const modeSel = selectEl(row, [['trace', 'modèle visible'], ['alone', 'sans modèle']], state.freeMode || 'trace', v => { state.freeMode = v; go(); });
  const sug = h(root, 'div', 'aa-wr-chips aa-wr-sugg'); sug.setAttribute('dir', 'rtl');
  ['اللَّه', 'رَبّ', 'الرَّحِيم', 'قُلْ هُوَ اللَّهُ أَحَدٌ', 'سُبْحَانَ اللَّه', 'الْحَمْدُ لِلَّه'].forEach(t => { const c = h(sug, 'span', 'aa-wr-chip', t); c.addEventListener('click', () => { state.freeText = t; go(); }); });
  const pad = makeWritePad(ctx, root, { text: inp.value.trim(), mode: state.freeMode || 'trace', onScore: () => {} });
  inp.addEventListener('change', () => { state.freeText = inp.value; go(); });
  void modeSel; void pad;
}
/* ====================================================================
 * 06k0 - Le chemin du stylo : comment la main trace vraiment la lettre
 * On part de la lettre dessinée par la police, on en tire la ligne du
 * milieu (le « squelette »), puis on la parcourt comme un stylo :
 * - chaque morceau attaché est écrit de droite à gauche, en partant du haut ;
 * - les points et les voyelles viennent après le corps qu'ils accompagnent.
 * ==================================================================== */
const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/* amincit la forme jusqu'à une ligne d'un pixel (méthode de Zhang et Suen) */
function penThin(img, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : img[y * w + x];
  let changed = true; const del = [];
  for (let it = 0; changed && it < 200; it++) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!img[y * w + x]) continue;
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const B = p.reduce((s, v) => s + v, 0); if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++;
        if (A !== 1) continue;
        if (pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(y * w + x);
      }
      if (del.length) { changed = true; del.forEach(i => { img[i] = 0; }); }
    }
  }
  return img;
}
/* distance au bord (épaisseur du trait à chaque endroit) */
function penDist(img, w, h) {
  const d = new Float32Array(w * h); const INF = 1e6;
  for (let i = 0; i < w * h; i++) d[i] = img[i] ? INF : 0;
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], g(x - 1, y) + 1, g(x, y - 1) + 1, g(x - 1, y - 1) + 1.414, g(x + 1, y - 1) + 1.414); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], g(x + 1, y) + 1, g(x, y + 1) + 1, g(x + 1, y + 1) + 1.414, g(x - 1, y + 1) + 1.414); }
  return d;
}
/* mask : Uint8Array (1 = encre), w × h, fs = taille de la police (pour les seuils) */
function penPlan(mask, w, h, fs) {
  const dist = penDist(mask, w, h);
  const sk = penThin(Uint8Array.from(mask), w, h);
  const isS = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sk[y * w + x] === 1;
  const deg = (x, y) => N8.reduce((s, [dx, dy]) => s + (isS(x + dx, y + dy) ? 1 : 0), 0);
  // on coupe les petites barbes du squelette (dues aux angles de la police)
  const spur = Math.max(3, fs * 0.05);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isS(x, y) || deg(x, y) !== 1) continue;
    const path = [[x, y]]; let cx = x, cy = y, px = -1, py = -1, ok = false;
    while (path.length <= spur) {
      const nb = N8.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([a, b]) => isS(a, b) && !(a === px && b === py) && !path.some(q => q[0] === a && q[1] === b));
      if (nb.length !== 1) { ok = nb.length > 1; break; }
      px = cx; py = cy; [cx, cy] = nb[0];
      if (deg(cx, cy) > 2) { ok = true; break; }
      path.push([cx, cy]);
    }
    if (ok && path.length <= spur) path.forEach(([a, b]) => { sk[b * w + a] = 0; });
  }
  const DOTS = [];
  // les points (petits losanges) disparaissent presque à l'amincissement : on les remet comme un petit trait
  {
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || seen[i]) continue;
      const st = [i]; seen[i] = 1; const px = []; let sk1 = 0, rmax = 1, cx = 0, cy = 0;
      while (st.length) { const j = st.pop(); const x = j % w, y = (j / w) | 0; px.push([x, y]); if (sk[j] === 1) sk1++; rmax = Math.max(rmax, dist[j]); for (const [dx, dy] of N8) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < w && b < h && mask[b * w + a] && !seen[b * w + a]) { seen[b * w + a] = 1; st.push(b * w + a); } } }
      if (sk1 >= Math.max(4, rmax * 1.5)) continue;
      px.forEach(([x, y]) => { cx += x; cy += y; sk[y * w + x] = 0; }); cx /= px.length; cy /= px.length;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; px.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const r = Math.max(1, rmax * 0.8); const a0 = [cx + (x1 - cx) * 0.35, cy - (cy - y0) * 0.35], a1 = [cx - (cx - x0) * 0.35, cy + (y1 - cy) * 0.35];
      const dot = []; for (let k = 0; k <= 6; k++) dot.push([Math.round(a0[0] + (a1[0] - a0[0]) * k / 6), Math.round(a0[1] + (a1[1] - a0[1]) * k / 6)]);
      DOTS.push({ id: -1, px: dot, x0, x1, y0, y1, n: dot.length, dot: true, r });
    }
  }
  // morceaux séparés (corps, points, voyelles)
  const comp = new Int32Array(w * h).fill(-1); const comps0 = [];
  for (let i = 0; i < w * h; i++) {
    if (sk[i] !== 1 || comp[i] >= 0) continue;
    const id = comps0.length; const px = []; const st = [i]; comp[i] = id;
    while (st.length) { const j = st.pop(); const x = j % w, y = (j / w) | 0; px.push([x, y]); for (const [dx, dy] of N8) { const a = x + dx, b = y + dy; if (isS(a, b) && comp[b * w + a] < 0) { comp[b * w + a] = id; st.push(b * w + a); } } }
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; px.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    comps0.push({ id, px, x0, x1, y0, y1, n: px.length });
  }
  const comps = comps0.concat(DOTS);
  if (!comps.length) return { strokes: [] };
  const maxN = Math.max(...comps.map(c => c.n));
  comps.forEach(c => { c.main = c.n >= maxN * 0.3 || (c.y1 - c.y0) >= fs * 0.3; });
  const mains = comps.filter(c => c.main).sort((a, b) => b.x1 - a.x1);
  const smalls = comps.filter(c => !c.main);
  mains.forEach(m => { m.kids = []; });
  smalls.forEach(s => {
    const cx = (s.x0 + s.x1) / 2;
    let best = mains[0], bd = 1e9;
    mains.forEach(m => { const d = cx < m.x0 ? m.x0 - cx : cx > m.x1 ? cx - m.x1 : 0; if (d < bd) { bd = d; best = m; } });
    best.kids.push(s);
  });
  const order = []; mains.forEach(m => { order.push(m); m.kids.sort((a, b) => b.x1 - a.x1 || a.y0 - b.y0).forEach(k => order.push(k)); });
  // on parcourt chaque morceau comme un stylo
  const strokes = [];
  const R = (x, y) => Math.max(1, dist[y * w + x]);
  const startScore = (x, y) => x - y; // en haut à droite d'abord
  for (const c of order) {
    if (c.dot) { strokes.push({ pts: c.px.map(([x, y]) => [x, y, c.r]), first: true, comp: 'small' }); continue; }
    const left = new Set(c.px.map(([x, y]) => y * w + x));
    // départ : le point le plus en haut à droite ; une extrémité de trait est préférée si elle est presque aussi haute
    const bonus = (x, y) => startScore(x, y) + (deg(x, y) === 1 ? fs * 0.15 : 0);
    let cur = c.px.reduce((a, b) => bonus(b[0], b[1]) > bonus(a[0], a[1]) ? b : a);
    let seg = []; let first = true;
    while (left.size) {
      if (!cur) {
        // reprise : un pixel pas encore tracé, collé à ce qui est déjà tracé (une branche)
        let pick = null, ps = -1e9;
        for (const k of left) { const x = k % w, y = (k / w) | 0; const touch = N8.some(([dx, dy]) => isS(x + dx, y + dy) && !left.has((y + dy) * w + x + dx)); const s = (touch ? 1e6 : 0) + startScore(x, y) + (deg(x, y) === 1 ? 5e5 : 0); if (s > ps) { ps = s; pick = [x, y]; } }
        cur = pick; if (seg.length) strokes.push({ pts: seg, first, comp: (seg.length > Math.max(4, fs * 0.08) || first) ? (c.main ? 'main' : 'small') : 'tiny' });
        first = false; seg = [];
        // on part du point déjà tracé voisin, pour que le trait reste continu
        const nb = N8.map(([dx, dy]) => [cur[0] + dx, cur[1] + dy]).find(([a, b]) => isS(a, b) && !left.has(b * w + a));
        if (nb) seg.push([nb[0], nb[1], R(nb[0], nb[1])]);
      }
      const [x, y] = cur; left.delete(y * w + x); seg.push([x, y, R(x, y)]);
      const n = seg.length; const back = seg[Math.max(0, n - 5)];
      let dx0 = x - back[0], dy0 = y - back[1]; const dl = Math.hypot(dx0, dy0) || 1; dx0 /= dl; dy0 /= dl;
      let nx = null, nb = -1e9;
      for (const [ddx, ddy] of N8) { const a = x + ddx, b = y + ddy; if (!left.has(b * w + a)) continue; const l = Math.hypot(ddx, ddy); const s = n > 1 ? (ddx * dx0 + ddy * dy0) / l : (-ddx + ddy * 0.6) / l; if (s > nb) { nb = s; nx = [a, b]; } }
      if (nx) N8.forEach(([ddx, ddy]) => { const a = x + ddx, b = y + ddy; const k = b * w + a; if (left.has(k) && (a !== nx[0] || b !== nx[1]) && Math.abs(a - nx[0]) <= 1 && Math.abs(b - nx[1]) <= 1 && deg(a, b) <= 2) left.delete(k); });
      cur = nx;
    }
    if (seg.length) strokes.push({ pts: seg, first, comp: (seg.length > Math.max(4, fs * 0.08) || first) ? (c.main ? 'main' : 'small') : 'tiny' });
  }
  // on lisse un peu les traits (les escaliers de pixels)
  strokes.forEach(s => { const p = s.pts; if (p.length < 5) return; const q = p.map((pt, i) => { if (i === 0 || i === p.length - 1) return pt; const a = p[i - 1], b = p[i + 1]; return [(a[0] + 2 * pt[0] + b[0]) / 4, (a[1] + 2 * pt[1] + b[1]) / 4, pt[2]]; }); s.pts = q; });
  return { strokes: strokes.filter(s => s.pts.length) };
}
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
  const S = srsStore(ctx); const W = writeState(ctx); const K = lemmaKnowledge(ctx);
  const head = h(root, 'div', 'aa-home-head');
  h(head, 'div', 'aa-muted aa-small aa-home-date', frDate(new Date()));
  h(head, 'h2', null, 'As-salāmu ʿalaykum');
  // les trois chiffres
  const tiles = h(root, 'div', 'aa-home-tiles');
  const tile = (ic, big, lab, sub) => { const t = h(tiles, 'div', 'aa-home-tile'); h(t, 'div', 'aa-home-ic', ic); h(t, 'b', null, big); h(t, 'span', null, lab); if (sub) h(t, 'span', 'aa-muted aa-small', sub); return t; };
  const streak = streakOf(ctx); const A = activityDays(ctx); const today = A[todayNum()] || {};
  tile('🔥', String(streak), streak > 1 ? 'jours d\'affilée' : 'jour d\'affilée', today.c || today.w || today.l ? 'aujourd\'hui : fait ✓' : 'fais une révision pour continuer');
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
  const rc = h(todo, 'div', 'aa-home-card aa-home-main');
  const rt = h(rc, 'div', 'aa-home-card-top'); h(rt, 'span', 'aa-home-card-ic', '🃏'); h(rt, 'b', null, 'Révision du jour');
  const rl = h(rc, 'div', 'aa-muted aa-small', 'Calcul…');
  const ra = h(rc, 'div', 'aa-home-card-act');
  loadCardDecks(ctx).then(decks => {
    const n = todayCounts(S, decks); clear(rl);
    if (n.due + n.fresh) { mdText(rl, 'span', null, '**' + n.due + '** carte' + (n.due > 1 ? 's' : '') + ' à revoir · **' + n.fresh + '** nouvelle' + (n.fresh > 1 ? 's' : '') + ' (mots et règles)'); btn(ra, '▶ Réviser maintenant', () => ctx.openTab('review', { startNow: true, session: null, deck: null }), 'mod-cta'); }
    else { rl.textContent = 'Tout est à jour. ' + (S.doneToday ? S.doneToday + ' cartes faites aujourd\'hui. ' : '') + 'Bravo.'; btn(ra, 'Voir les paquets', () => ctx.openTab('review', { session: null, deck: null })); }
  }).catch(() => { rl.textContent = ''; });
  const nx = writeNext(W);
  if (nx) card('✍️', 'Écriture', nx.letter ? 'Prochaine lettre : **' + nx.letter + '**' + (alphaLetter(nx.letter) ? ' (' + alphaLetter(nx.letter).name + ')' : '') + ' · unité « ' + nx.unit.title + ' »' : 'Prochain mot : **' + nx.unit.words[nx.word][0] + '**', 'Continuer', () => ctx.openTab('write', nx.letter ? { unit: nx.unit.id, letter: nx.letter, step: 0, word: null, free: false } : { unit: nx.unit.id, word: [nx.unit.id, nx.word], step: 0, letter: null, free: false }));
  const LS = ctx.settings.lessons || {}; const nl = LESSONS.find(l => !(LS[l.id] && LS[l.id].done));
  const nDone = LESSONS.filter(l => LS[l.id] && LS[l.id].done).length;
  if (nl) card('🎓', 'Leçon de grammaire', 'Leçon ' + (LESSONS.indexOf(nl) + 1) + ' : **' + nl.title + '** · ' + nDone + ' / ' + LESSONS.length + ' validées', 'Ouvrir la leçon', () => ctx.openLesson(nl.id));
  else card('🎓', 'Leçons de grammaire', 'Les ' + LESSONS.length + ' leçons sont validées. Revois les règles quand tu veux.', 'Les règles', () => ctx.openTab('rules'));

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
  for (let d = start; d <= t0; d++) { const e = A[d]; const n = e ? (e.c || 0) + 2 * (e.w || 0) + 5 * (e.l || 0) : 0; const c = h(grid, 'span', 'aa-home-day' + (n ? ' aa-home-day-' + (n >= 40 ? 3 : n >= 15 ? 2 : 1) : '') + (d === t0 ? ' aa-home-today' : '')); c.title = n ? n + ' activités' : 'rien ce jour-là'; }
  h(ac, 'div', 'aa-muted aa-small', 'Chaque case = un jour (cartes, écriture, leçons). Un peu chaque jour vaut mieux que beaucoup une fois par semaine.');

  const set = h(root, 'div', 'aa-home-settings');
  btn(set, '⚙ Réglages : taille du texte, police, récitateur, son hors ligne', () => ctx.openTab('settings'), 'aa-btn-quiet');
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
/* ====================================================================
 * 07 - Le plugin Obsidian : vue, commandes, blocs de code, réglages
 * ==================================================================== */
const VIEW_TYPE = 'atelier-arabe-view';
const DEFAULT_SETTINGS = {
  style: 'sci', showTr: true, showFr: true, arSize: 30, openLetters: false,
  flashFile: '5 - Flashcards/Atelier - mes phrases.md', lastSurah: 1,
  audio: true, tajwid: false, fixFolder: '4 - Références/Atelier - corrections', vocabFile: '4 - Références/Vocabulaire.md', textsFolder: '3 - Textes',
  myWords: {}, progress: null, lessons: {}, surahOrder: 'mushaf', wordColors: true, arFont: 'amiri', cardsFolder: '5 - Flashcards/Règles', srs: null, reciter: 'Alafasy_128kbps', audioRate: 1, audioRepeat: 1,
  writing: null, activity: null, uiSize: 'normal',
};
function emptyProgress() { return { byType: { case: { ok: 0, n: 0 }, mood: { ok: 0, n: 0 }, sens: { ok: 0, n: 0 }, phrase: { ok: 0, n: 0 } }, lem: {} }; }
/* polices arabes au choix : [id, nom dans la liste, description] */
const AR_FONTS = [
  ['amiri', 'Amiri Quran (conseillée pour le Coran)', 'Style des Corans imprimés. Tous les signes de récitation.'],
  ['scheherazade', 'Scheherazade New', 'Naskh classique, très lisible, grandes voyelles. Très bonne pour le Coran.'],
  ['naskh', 'Noto Naskh', 'Naskh moderne, celle des livres et des journaux d\'aujourd\'hui.'],
  ['amiri-classic', 'Amiri', 'Naskh élégant des livres anciens.'],
  ['lateef', 'Lateef', 'Naskh simple et aéré.'],
  ['ruqaa', 'Ruqʿa (écriture à la main)', 'Le style qu\'on utilise pour écrire à la main au quotidien. Utile pour lire une écriture manuscrite. Certains petits signes du Coran sont plus simples.'],
  ['maghribi', 'Maghribi (style marocain)', 'Écriture maghrébine, celle des manuscrits et des Corans du Maroc. Attention : dans ce style, le ف a souvent son point en dessous et le ق un seul point au-dessus.'],
  ['harmattan', 'Harmattan (style d\'Afrique de l\'Ouest)', 'Écriture des manuscrits d\'Afrique de l\'Ouest (Sénégal, Mali…), proche du maghribi mais plus simple à lire. Tous les signes du Coran.'],
  ['mirza', 'Mirza', 'Naskh aux formes rondes et anciennes, agréable à lire.'],
  ['kufi', 'Reem Kufi (coufique)', 'Le coufique : écriture anguleuse, la plus ancienne des Corans. Aujourd\'hui surtout pour les titres. Les petits signes du Coran sont pris dans Amiri Quran.'],
  ['kufam', 'Kufam (coufique moderne)', 'Coufique moderne et géométrique. Pour le plaisir des yeux plus que pour apprendre. Petits signes du Coran pris dans Amiri Quran.'],
  ['nastaliq', 'Nastaʿlīq (Noto Nastaliq)', 'Le style persan et ourdou : les mots descendent en diagonale. Très beau, plus difficile à lire pour débuter. Petits signes du Coran pris dans Amiri Quran.'],
  ['gulzar', 'Nastaʿlīq (Gulzar)', 'Un autre nastaʿlīq, plus calligraphique. Petits signes du Coran pris dans Amiri Quran.'],
  ['katibeh', 'Katibeh (manuscrit ancien)', 'Inspirée des manuscrits anciens, épaisse et décorative.'],
  ['rakkas', 'Rakkas (affiche)', 'Police d\'affiche, très grasse. Pour les titres, pas pour lire longtemps. Petits signes du Coran pris dans Amiri Quran.'],
  ['lalezar', 'Lalezar (affiche)', 'Police d\'affiche, ronde et grasse. Pour les titres, pas pour lire longtemps. Petits signes du Coran pris dans Amiri Quran.'],
  ['device', 'Police de l\'appareil', 'La police arabe de ton PC ou de ton iPad.'],
];
const TAB_ICONS = { home: 'home', write: 'pencil', coran: 'book-open', alphabet: 'a-large-small', lessons: 'graduation-cap', rules: 'book-marked', review: 'layers', dict: 'library', analyse: 'scan-search', build: 'blocks', signs: 'flask-conical', quiz: 'target' };
const TABS = [
  ['home', 'Accueil', 'Ton tableau de bord du jour'], ['coran', 'Coran', 'Lire une sourate mot par mot'], ['alphabet', 'Alphabet', 'Les lettres et leur prononciation'], ['write', 'Écrire', 'Apprendre à écrire les lettres et les mots'], ['lessons', 'Leçons', 'Parcours de grammaire guidé'], ['rules', 'Règles', 'Les règles expliquées simplement'], ['review', 'Révision', 'Réviser les cartes de chaque règle'], ['dict', 'Dictionnaire', 'Tous les mots du Coran'], ['analyse', 'Analyser', 'Analyser un texte arabe'],
  ['build', 'Construire', 'Construire une phrase'], ['signs', 'Signes', 'Laboratoire des signes'], ['quiz', 'Entraînement', 'S\'entraîner'],
];
/* 2.17 : 6 grands onglets ; chaque groupe a ses sous-onglets (rien n'a été supprimé) */
const TAB_GROUPS = [
  ['home', 'Accueil', 'home', 'Ton tableau de bord du jour', [['home', 'Accueil']]],
  ['coran', 'Coran', 'book-open', 'Lire une sourate mot par mot', [['coran', 'Coran']]],
  ['learn', 'Apprendre', 'graduation-cap', 'Alphabet, écriture, leçons et règles', [['alphabet', 'Alphabet'], ['write', 'Écrire'], ['lessons', 'Leçons'], ['rules', 'Règles']]],
  ['revise', 'Réviser', 'layers', 'Cartes de révision et exercices', [['review', 'Cartes du jour'], ['quiz', 'Exercices']]],
  ['dict', 'Dictionnaire', 'library', 'Chercher un mot ou analyser un texte', [['dict', 'Chercher un mot'], ['analyse', 'Analyser un texte']]],
  ['build', 'Atelier', 'blocks', 'Construire une phrase, jouer avec les voyelles', [['build', 'Construire une phrase'], ['signs', 'Changer les voyelles']]],
];
function groupOf(tab) { return TAB_GROUPS.find(g => g[4].some(t => t[0] === tab)) || TAB_GROUPS[0]; }
function tabLabel(tab) { const g = groupOf(tab); const t = g[4].find(x => x[0] === tab); return g[4].length > 1 && t ? g[1] + ' › ' + t[1] : g[1]; }

class AtelierView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = TABS.some(t => t[0] === plugin.settings.lastTab) ? plugin.settings.lastTab : 'home';
    this.states = { coran: { surah: plugin.settings.lastSurah || 1, page: 0, resume: plugin.settings.lastVerse || 0 }, dict: {}, alphabet: {}, home: {}, write: {}, lessons: plugin.settings.lessonPlace && plugin.settings.lessonPlace.open ? { open: plugin.settings.lessonPlace.open, step: plugin.settings.lessonPlace.step || 0, stepFor: plugin.settings.lessonPlace.open } : {}, rules: {}, review: {}, analyse: {}, build: {}, signs: {}, quiz: {}, settings: {} };
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Atelier arabe'; }
  getIcon() { return 'languages'; }
  async onOpen() {
    const root = this.contentEl;
    clear(root); root.classList.add('aa-root');
    this.nav = h(root, 'div', 'aa-tabs');
    this.sub = h(root, 'div', 'aa-subtabs-row');
    this.body = h(root, 'div', 'aa-body');
    h(this.body, 'p', 'aa-muted', 'Chargement du Coran…');
    try { const msg = this.body.firstChild; await this.plugin.data.init((d, n) => { msg.textContent = 'Premier lancement : téléchargement du Coran… ' + d + ' / ' + n; }); } catch (e) {
      clear(this.body); h(this.body, 'p', 'aa-warn', 'Impossible de lire les données du plugin (dossier data). Vérifie que le dossier .obsidian/plugins/atelier-arabe/data est complet. Détail : ' + e.message);
      return;
    }
    this.render();
    /* ordinateur : flèches ← → dans l'onglet Coran (sourate / versets suivants) */
    this.registerDomEvent(document, 'keydown', ev => {
      if (ev.altKey && ev.key === 'ArrowLeft' && this.back && this.back.length) { const t = ev.target; if (!(t && t.closest && t.closest('input, textarea'))) { ev.preventDefault(); this.goBack(); return; } }
      if (ev.key === 'Escape' && this.contentEl.classList.contains('aa-reading')) { setReading(this.contentEl, false); return; }
      if (this.tab !== 'coran' || ev.altKey || ev.ctrlKey || ev.metaKey || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return;
      const ws = (this.app || this.plugin.app || {}).workspace; if (ws && ws.activeLeaf && ws.activeLeaf !== this.leaf) return;
      const t = ev.target; if (t && (t.closest && t.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (!this.body || !this.body._aaSwipeGo) return;
      ev.preventDefault(); this.body._aaSwipeGo(ev.key === 'ArrowRight' ? 1 : -1);
    });
  }
  async onClose() { try { stopAudio(); } catch (e) { /* */ } clear(this.contentEl); }
  /* « ← Retour » : on garde l'endroit d'où l'on vient quand on suit un lien */
  pushBack() {
    if (!this.body) return;
    const st = Object.assign({}, this.states[this.tab]);
    if (this.tab === 'coran') { st.focus = 0; st.resume = this.plugin.settings.lastSurah === st.surah ? this.plugin.settings.lastVerse : 0; }
    (this.back = this.back || []).push({ tab: this.tab, st, top: this.contentEl.scrollTop || 0 });
    if (this.back.length > 20) this.back.shift();
  }
  goBack() {
    const b = (this.back || []).pop(); if (!b) return;
    this.tab = b.tab; this.states[b.tab] = b.st;
    if (this.plugin.settings.lastTab !== b.tab) { this.plugin.settings.lastTab = b.tab; this.plugin.saveData(this.plugin.settings); }
    this._lastTab = b.tab; this.render();
    if (b.tab !== 'coran') setTimeout(() => { try { this.contentEl.scrollTop = b.top; } catch (e) { /* */ } }, 60);
  }
  setTab(tab, opts) {
    this.tab = tab;
    if (tab !== 'settings') {
      const g = groupOf(tab)[0]; const ls = this.plugin.settings.lastSub || (this.plugin.settings.lastSub = {});
      if (this.plugin.settings.lastTab !== tab || ls[g] !== tab) { this.plugin.settings.lastTab = tab; ls[g] = tab; this.plugin.saveData(this.plugin.settings); }
    }
    if (tab === 'review' && !this.states.review.session) this.states.review.decks = null; // relit les notes du coffre
    if (opts) Object.assign(this.states[tab], opts);
    if (this.body && this.plugin.data.surahs) this.render();
  }
  render() {
    clear(this.nav);
    this.contentEl.classList.toggle('aa-paper', this.plugin.settings.paper === true);
    this.contentEl.classList.toggle('aa-nocolor', this.plugin.settings.wordColors === false);
    AR_FONTS.forEach(f => this.contentEl.classList.toggle('aa-font-' + f[0], (this.plugin.settings.arFont || 'amiri') === f[0]));
    this.contentEl.classList.toggle('aa-ui-l', this.plugin.settings.uiSize === 'grand');
    this.contentEl.classList.toggle('aa-ui-xl', this.plugin.settings.uiSize === 'tres-grand');
    this.contentEl.style.setProperty('--aa-ar-size', (this.plugin.settings.arSize || 30) + 'px');
    const cur = groupOf(this.tab);
    TAB_GROUPS.forEach(([gid, label, icon, title, subs]) => {
      const on = this.tab !== 'settings' && cur[0] === gid;
      const b = h(this.nav, 'button', 'aa-tab' + (on ? ' aa-on' : ''));
      if (typeof setIcon === 'function') { try { setIcon(h(b, 'span', 'aa-tab-ic'), icon); } catch (e) { /* */ } }
      h(b, 'span', 'aa-tab-lab', label);
      b.title = title;
      b.addEventListener('click', () => {
        this.back = [];
        const last = (this.plugin.settings.lastSub || {})[gid];
        this.setTab(subs.some(t => t[0] === last) ? last : subs[0][0]);
      });
    });
    const gear = document.createElement('button'); gear.className = 'aa-tab aa-tab-gear' + (this.tab === 'settings' ? ' aa-on' : '');
    this.nav.insertBefore(gear, this.nav.firstChild);
    h(gear, 'span', 'aa-tab-lab', '⚙'); gear.setAttribute('aria-label', 'Réglages'); gear.title = 'Réglages de l\'atelier (police, taille, son, couleurs…)';
    gear.addEventListener('click', () => { if (this.tab !== 'settings') { this.pushBack(); this.setTab('settings'); } else this.goBack(); });
    { const on = this.nav.querySelector('.aa-tab.aa-on:not(.aa-tab-gear)'); if (on && this.nav.scrollWidth > this.nav.clientWidth) { try { this.nav.scrollLeft = on.offsetLeft - this.nav.clientWidth / 2 + on.offsetWidth / 2; } catch (e) { /* */ } } }
    const ctx = this.plugin.ctx(this);
    const st = this.states[this.tab];
    clear(this.body);
    clear(this.sub);
    if (this.tab !== 'settings' && cur[4].length > 1) {
      const sub = h(this.sub, 'div', 'aa-subtabs');
      cur[4].forEach(([id, lab]) => {
        const b = h(sub, 'button', 'aa-subtab' + (this.tab === id ? ' aa-on' : ''), lab);
        b.addEventListener('click', () => { if (this.tab !== id) { this.back = []; this.setTab(id); } });
      });
    }
    if (this.tab === 'home') renderHomeTab(ctx, this.body, st);
    else if (this.tab === 'write') renderWriteTab(ctx, this.body, st);
    else if (this.tab === 'coran') renderQuranTab(ctx, this.body, st);
    else if (this.tab === 'dict') renderDictTab(ctx, this.body, st);
    else if (this.tab === 'alphabet') renderAlphabetTab(ctx, this.body, st);
    else if (this.tab === 'lessons') renderLessonsTab(ctx, this.body, st);
    else if (this.tab === 'rules') renderRulesTab(ctx, this.body, st);
    else if (this.tab === 'review') renderReviewTab(ctx, this.body, st);
    else if (this.tab === 'analyse') renderAnalyseTab(ctx, this.body, st);
    else if (this.tab === 'build') renderBuildTab(ctx, this.body, st);
    else if (this.tab === 'signs') renderSignsTab(ctx, this.body, st);
    else if (this.tab === 'settings') { h(this.body, 'h2', 'aa-set-title', '⚙ Réglages'); const box = h(this.body, 'div', 'aa-settings-inview'); fillSettings(box, this.plugin, false, ctx); }
    else renderQuizTab(ctx, this.body, st);
    if (this.back && this.back.length) {
      const last = this.back[this.back.length - 1];
      const lab = last.tab === 'settings' ? 'Réglages' : tabLabel(last.tab);
      const bb = document.createElement('button'); bb.className = 'aa-btn aa-btn-quiet aa-back'; bb.textContent = '← Retour' + (lab ? ' (' + lab + ')' : '');
      bb.addEventListener('click', ev => { ev.preventDefault(); this.goBack(); });
      this.body.insertBefore(bb, this.body.firstChild);
    }
    // l'aide du haut de l'onglet se replie : on l'ouvre seulement si on en a besoin (aussi pour les onglets qui s'affichent en deux temps)
    const wrapHelp = () => {
      const help = this.body.querySelector(':scope > .aa-help');
      if (!help) return false;
      const d = document.createElement('details'); d.className = 'aa-howto';
      h(d, 'summary', null, 'ⓘ Comment utiliser cet onglet');
      help.parentNode.insertBefore(d, help); d.appendChild(help);
      return true;
    };
    if (this._helpObs) { this._helpObs.disconnect(); this._helpObs = null; }
    wrapHelp();
    if (typeof MutationObserver !== 'undefined') {
      const ob = new MutationObserver(() => { if (this.body.querySelector(':scope > .aa-help')) wrapHelp(); });
      ob.observe(this.body, { childList: true }); this._helpObs = ob;
    }
    if (this.body.scrollTo && this.tab !== this._lastTab) { try { this.contentEl.scrollTop = 0; } catch (e) { /* */ } }
    this._lastTab = this.tab;
  }
}

class AtelierSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() { fillSettings(this.containerEl, this.plugin, true); }
}
/* les réglages : dans Obsidian (Réglages › Atelier arabe) et dans l'atelier (bouton ⚙) */
function fillSettings(el, plugin, inObsidian, ctx) {
  {
    clear(el);
    if (inObsidian) h(el, 'h2', null, 'Atelier arabe');
    h(el, 'p', null, 'Toutes les données (Coran, traductions, analyse grammaticale) sont dans le dossier du plugin. Rien de ce que tu fais n\'est envoyé sur internet. Seul le son (si « Son en ligne » est activé) est téléchargé quand tu appuies sur ▶ ou 🔊.');
    const p = plugin; const s = p.settings;
    h(el, 'h3', 'aa-set-h', 'Lecture du Coran');
    new Setting(el).setName('Translittération').setDesc('Savante (ā, ū, sh, j) ou « à la française » (ou, ch, dj).')
      .addDropdown(d => d.addOption('sci', 'savante : al-ḥamdu, shukr').addOption('fr', 'à la française : al-ḥamdou, choukr').setValue(s.style).onChange(async v => { s.style = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la translittération').addToggle(t => t.setValue(s.showTr).onChange(async v => { s.showTr = v; await p.saveSettings(); }));
    new Setting(el).setName('Affichage des versets').setDesc('Un long verset peut être coupé en morceaux aux signes de pause du Coran : chaque morceau a sa transcription juste en dessous. « Mot à mot » met sous chaque mot sa transcription et son sens.').addDropdown(d => { VERSE_LAYOUTS.forEach(([k, l]) => d.addOption(k, l)); d.setValue(s.verseLayout || 'auto').onChange(async v => { s.verseLayout = v; await p.saveSettings(); }); });
    new Setting(el).setName('Afficher la traduction française').setDesc('Traduction de Muhammad Hamidullah.').addToggle(t => t.setValue(s.showFr).onChange(async v => { s.showFr = v; await p.saveSettings(); }));
    new Setting(el).setName('Ordre des sourates').setDesc('Ordre du Coran (1 à 114, comme dans le livre), ou ordre de la révélation (de la première sourate révélée, al-ʿAlaq, à la dernière).')
      .addDropdown(d => d.addOption('mushaf', 'ordre du Coran').addOption('nuzul', 'ordre de la révélation').setValue(s.surahOrder || 'mushaf').onChange(async v => { s.surahOrder = v; await p.saveSettings(); p.refreshViews && p.refreshViews(); }));
    new Setting(el).setName('Couleurs de prononciation').setDesc('Colore les lettres muettes, les voyelles longues, la nasalisation (ghunna) et l\'écho (qalqala) dans le Coran et dans les blocs ```coran```.')
      .addToggle(t => t.setValue(!!s.tajwid).onChange(async v => { s.tajwid = v; await p.saveSettings(); }));
    new Setting(el).setName('Ouvrir « lettre par lettre » automatiquement').addToggle(t => t.setValue(s.openLetters).onChange(async v => { s.openLetters = v; await p.saveSettings(); }));
    h(el, 'h3', 'aa-set-h', 'Apparence');
    const fontSet = new Setting(el).setName('Police arabe').setDesc('Toutes ces polices sont incluses dans le plugin : elles marchent sans internet, sur PC, iPad et iPhone. « Amiri Quran » affiche le mieux les petits signes du Coran. Les polices décoratives (coufique, nastaʿlīq, affiche) sont belles mais plus difficiles à lire pour apprendre.');
    const preview = el.createDiv({ cls: 'aa-font-preview aa-root' });
    const showFont = v => { AR_FONTS.forEach(f => preview.classList.toggle('aa-font-' + f[0], v === f[0])); const f = AR_FONTS.find(x => x[0] === v) || AR_FONTS[0]; preview.empty(); const ar = preview.createDiv({ text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ · قُلْ هُوَ ٱللَّهُ أَحَدٌ' }); ar.className = 'aa-ar aa-font-preview-ar'; ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar'); const d = preview.createDiv({ text: f[2] }); d.style.cssText = 'font-size:12px;direction:ltr;text-align:left;color:var(--text-muted);font-family:var(--font-interface)'; };
    fontSet.addDropdown(d => { AR_FONTS.forEach(f => d.addOption(f[0], f[1])); d.setValue(s.arFont || 'amiri').onChange(async v => { s.arFont = v; showFont(v); await p.saveSettings(); p.refreshViews && p.refreshViews(); }); });
    showFont(s.arFont || 'amiri');
    new Setting(el).setName('Fond « papier »').setDesc('Un fond crème (ou brun très sombre en thème sombre), plus doux pour les yeux quand tu lis longtemps.')
      .addToggle(t => t.setValue(s.paper === true).onChange(async v => { s.paper = v; await p.saveSettings(); p.refreshViews && p.refreshViews(); }));
    new Setting(el).setName('Couleurs des mots').setDesc('Dans le Coran : bleu = nom, rouge = verbe, gris = particule. Désactivé : texte d\'une seule couleur, plus reposant.')
      .addToggle(t => t.setValue(s.wordColors !== false).onChange(async v => { s.wordColors = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille du texte arabe').setDesc('En pixels (30 par défaut).')
      .addSlider(sl => sl.setLimits(20, 52, 2).setValue(s.arSize).setDynamicTooltip().onChange(async v => { s.arSize = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille de l\'interface').setDesc('« Très grande » est pratique sur téléphone. Chaque appareil garde son propre réglage.')
      .addDropdown(d => d.addOption('normal', 'normale').addOption('grand', 'grande').addOption('tres-grand', 'très grande').setValue(s.uiSize || 'normal').onChange(async v => { s.uiSize = v; await p.saveSettings(); }));
    h(el, 'h3', 'aa-set-h', 'Son');
    new Setting(el).setName('Son en ligne').setDesc('Récitation (Mishary Alafasy) et prononciation des mots depuis internet, seulement quand tu appuies sur ▶ ou 🔊. Désactivé : voix de l\'appareil uniquement.')
      .addToggle(t => t.setValue(s.audio).onChange(async v => { s.audio = v; await p.saveSettings(); }));
    new Setting(el).setName('Récitateur').setDesc('La voix qui récite les versets quand tu appuies sur ▶.')
      .addDropdown(d => { RECITERS.forEach(r => d.addOption(r[0], r[1])); d.setValue(s.reciter || 'Alafasy_128kbps').onChange(async v => { s.reciter = v; AUDIO.reciter = v; await p.saveSettings(); }); });
    new Setting(el).setName('Vitesse du son').setDesc('Plus lent pour bien entendre chaque lettre.')
      .addDropdown(d => { [['0.5', '0,5× (très lent)'], ['0.6', '0,6×'], ['0.75', '0,75× (lent)'], ['0.85', '0,85×'], ['1', '1× (normal)']].forEach(o => d.addOption(o[0], o[1])); d.setValue(String(s.audioRate || 1)).onChange(async v => { s.audioRate = +v; AUDIO.rate = +v; await p.saveSettings(); }); });
    if (ctx && typeof renderOfflineAudio === 'function') renderOfflineAudio(ctx, h(el, 'div', 'aa-set-offline'));
    new Setting(el).setName('Son gardé sur l\'appareil').setDesc('Le son des sourates que tu as gardées hors ligne (bouton dans l\'onglet Coran ou l\'Accueil).')
      .addButton(b => b.setButtonText('Effacer le son gardé').onClick(async () => { await p.dropAudio(); new Notice('Son effacé.'); }));
    h(el, 'h3', 'aa-set-h', 'Mes notes dans le coffre');
    new Setting(el).setName('Dossier de tes corrections').setDesc('Quand tu corriges ou complètes une explication, ta version est rangée ici. Le texte d\'origine du plugin n\'est jamais modifié.')
      .addText(t => t.setValue(s.fixFolder).onChange(async v => { s.fixFolder = v.trim() || DEFAULT_SETTINGS.fixFolder; await p.saveSettings(); }));
    new Setting(el).setName('Note de vocabulaire').setDesc('Le bouton « Ajouter à mon vocabulaire » ajoute une ligne au tableau de cette note.')
      .addText(t => t.setValue(s.vocabFile).onChange(async v => { s.vocabFile = v.trim() || DEFAULT_SETTINGS.vocabFile; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des textes du cours').setDesc('Les sourates qui ont une note dans ce dossier apparaissent dans « Mon cours ».')
      .addText(t => t.setValue(s.textsFolder).onChange(async v => { s.textsFolder = v.trim() || DEFAULT_SETTINGS.textsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des cartes de révision').setDesc('Les notes « Cartes - … » de ce dossier remplacent les paquets inclus dans le plugin (tes corrections gagnent). Sans ce dossier, l\'onglet Réviser utilise les paquets inclus : c\'est le cas sur iPad et iPhone.')
      .addText(t => t.setValue(s.cardsFolder || DEFAULT_SETTINGS.cardsFolder).onChange(async v => { s.cardsFolder = v.trim() || DEFAULT_SETTINGS.cardsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Fichier des flashcards').setDesc('Note où l\'atelier ajoute tes cartes (format Spaced Repetition « question :: réponse »).')
      .addText(t => t.setValue(s.flashFile).onChange(async v => { s.flashFile = v.trim() || DEFAULT_SETTINGS.flashFile; await p.saveSettings(); }));
    const src = h(el, 'div', 'aa-sources');
    h(src, 'h3', null, 'Sources et droits');
    [
      ['Texte du Coran : projet Tanzil (texte vérifié, non modifié).', 'https://tanzil.net'],
      ['Analyse des mots (racines, cas, formes) : Quranic Arabic Corpus, Kais Dukes, Université de Leeds, licence GNU GPL. Version corrigée par mustafa0x/quran-morphology.', 'https://corpus.quran.com'],
      ['Signes de pause (pour couper les longs versets) : texte uthmani de quranenc.com, via le paquet quran-json (CC BY-SA 4.0).', 'https://github.com/risan/quran-json'],
      ['Traduction française : Muhammad Hamidullah. Utilisée ici à des fins d\'étude, non commerciales ; les droits appartiennent à son auteur et à ses éditeurs.', ''],
      ['Polices arabes : Amiri et Amiri Quran (Khaled Hosny), Scheherazade New et Lateef (SIL Global), Noto Naskh Arabic (Noto Project), Aref Ruqaa, Bouazzi Maghribi (aleftypefoundry), Reem Kufi, Kufam, Harmattan (SIL Global), Mirza, Noto Nastaliq Urdu, Gulzar, Katibeh, Rakkas, Lalezar. Toutes sous SIL Open Font License 1.1.', 'https://github.com/aliftype/amiri'],
      ['Récitations : everyayah.com et quran.com, écoutées en ligne (rien n\'est copié dans le plugin).', 'https://everyayah.com'],
    ].forEach(([t, u]) => { const d = h(src, 'p', 'aa-small'); d.appendChild(document.createTextNode(t + ' ')); if (u) { const a = h(d, 'a', null, u); a.href = u; } });
    h(src, 'p', 'aa-small aa-muted', 'Les définitions, explications, leçons et analyses automatiques (iʿrāb, prononciation) sont un outil d\'apprentissage : elles peuvent contenir des erreurs. Pour le Coran, vérifie toujours auprès d\'un enseignant.');
  }
}

class AtelierArabePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.progress) this.settings.progress = emptyProgress();
    if (!this.settings.myWords) this.settings.myWords = {};
    if (!this.settings.lessons) this.settings.lessons = {};
    AUDIO.reciter = this.settings.reciter || 'Alafasy_128kbps'; AUDIO.rate = this.settings.audioRate || 1; AUDIO.repeat = this.settings.audioRepeat == null ? 1 : this.settings.audioRepeat;
    this.data = new QuranData(this.app, this.manifest.dir);
    this.scanAudio();
    notify = (m) => new Notice(m);
    this.registerView(VIEW_TYPE, leaf => new AtelierView(leaf, this));
    this.addRibbonIcon('languages', 'Atelier arabe', () => this.openView());
    this.addCommand({ id: 'ouvrir', name: 'Ouvrir l\'atelier', callback: () => this.openView() });
    this.addCommand({ id: 'accueil', name: 'Accueil (tableau de bord)', callback: () => this.openView('home') });
    this.addCommand({ id: 'ecrire', name: 'Apprendre à écrire', callback: () => this.openView('write') });
    this.addCommand({ id: 'alphabet', name: 'Alphabet et prononciation', callback: () => this.openView('alphabet') });
    this.addCommand({ id: 'lecons', name: 'Leçons de grammaire', callback: () => this.openView('lessons') });
    this.addCommand({ id: 'regles', name: 'Règles expliquées simplement', callback: () => this.openView('rules') });
    this.addCommand({ id: 'revision', name: 'Réviser mes cartes', callback: () => this.openView('review') });
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
      readNote: async (path) => { const f = this.app.vault.getAbstractFileByPath(path); return f ? await this.app.vault.read(f) : null; },
      editNote: (path, initial) => this.editNote(path, initial),
      openRule: (id) => this.openView('rules', { open: id, q: '' }),
      openTab: (tab, opts) => this.openView(tab, opts),
      vaultCardNotes: () => this.vaultCardNotes(),
      openLesson: (id) => this.openView('lessons', { open: id, run: null }),
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
      markActivity: (k) => {
        const A = this.settings.activity || (this.settings.activity = {}); const d = todayNum();
        const e = A[d] || (A[d] = {}); e[k] = (e[k] || 0) + 1;
        Object.keys(A).forEach(x => { if (+x < d - 400) delete A[x]; });
        this.saveData(this.settings);
      },
      refresh: () => this.refreshViews(),
      keepSurahAudio: (n, words, progress) => this.keepSurahAudio(n, words, progress),
      surahAudioStatus: (n) => this.surahAudioStatus(n),
      audioSummary: () => this.audioSummary(),
      dropAudio: () => this.dropAudio(),
      currentSurah: () => { const l = self.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; return l && l.view.states ? l.view.states.coran.surah : 1; },
    };
  }
  async openView(tab, opts) {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = ws.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    ws.revealLeaf(leaf);
    if (opts && opts.surah) { this.settings.lastSurah = opts.surah; this.saveData(this.settings); }
    if (tab && leaf.view && leaf.view.setTab) { if (leaf.view.pushBack) leaf.view.pushBack(); leaf.view.setTab(tab, opts); }
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
  /* notes de cartes du coffre (« Cartes - … » dans le dossier des cartes) + la note de tes phrases */
  async vaultCardNotes() {
    const out = [];
    const folder = (this.settings.cardsFolder || DEFAULT_SETTINGS.cardsFolder).replace(/\/$/, '') + '/';
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path.startsWith(folder) && f.basename.startsWith('Cartes - ')) out.push({ path: f.path, text: await this.app.vault.cachedRead(f) });
    }
    const mine = this.app.vault.getAbstractFileByPath(this.settings.flashFile);
    if (mine && mine.extension === 'md') out.push({ path: mine.path, text: await this.app.vault.cachedRead(mine), mine: true });
    return out;
  }
  refreshViews() { this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view && l.view.render && l.view.plugin.data.surahs && l.view.render()); }
  /* ---------- son gardé sur l'appareil (dossier audio/ du plugin) ---------- */
  async scanAudio() {
    const ad = this.app.vault.adapter; const dir = this.manifest.dir; const base = dir + '/audio';
    AUDIO_CACHE.dir = dir; AUDIO_CACHE.res = p => ad.getResourcePath(p); AUDIO_CACHE.files = new Set();
    try {
      if (!(await ad.exists(base))) return;
      const top = await ad.list(base);
      for (const d of top.folders) { const m = await ad.list(d); m.files.forEach(f => AUDIO_CACHE.files.add(f.slice(dir.length + 1))); }
    } catch (e) { /* rien */ }
  }
  surahAudioStatus(n) {
    const rec = AUDIO.reciter || 'Alafasy_128kbps'; const nV = this.data.surahInfo(n)[5]; let k = 0;
    for (let v = 1; v <= nV; v++) if (AUDIO_CACHE.files.has(audioRelVerse(rec, n, v))) k++;
    return { verses: k, nV };
  }
  audioSummary() {
    const s = new Set(); AUDIO_CACHE.files.forEach(f => { const m = f.match(/\/(\d{3})(\d{3})\.mp3$/); if (m) s.add(+m[1]); });
    return { surahs: s.size, files: AUDIO_CACHE.files.size };
  }
  async keepSurahAudio(n, words, progress) {
    const ad = this.app.vault.adapter; const dir = this.manifest.dir; const rec = AUDIO.reciter || 'Alafasy_128kbps';
    const jobs = []; const nV = this.data.surahInfo(n)[5];
    for (let v = 1; v <= nV; v++) jobs.push([audioRelVerse(rec, n, v), 'https://everyayah.com/data/' + rec + '/' + pad3(n) + pad3(v) + '.mp3']);
    if (words) { const d = await this.data.surah(n); d.v.forEach((vv, vi) => vv[2].forEach((w, wi) => { const r = [n, vi + 1, wi + 1]; jobs.push([audioRelWord(r), 'https://audio.qurancdn.com/wbw/' + pad3(r[0]) + '_' + pad3(r[1]) + '_' + pad3(r[2]) + '.mp3']); })); }
    const todo = jobs.filter(j => !AUDIO_CACHE.files.has(j[0]));
    for (const f of ['audio', 'audio/' + rec, 'audio/wbw']) if (!(await ad.exists(dir + '/' + f))) await ad.mkdir(dir + '/' + f);
    let done = jobs.length - todo.length, failed = 0, offline = false, errRow = 0;
    if (progress) progress(done, jobs.length);
    const worker = async () => {
      while (todo.length && !offline) {
        const [rel, url] = todo.shift();
        try {
          const r = await requestUrl({ url, throw: false });
          if (r.status >= 200 && r.status < 300 && r.arrayBuffer && r.arrayBuffer.byteLength > 200) { await ad.writeBinary(dir + '/' + rel, r.arrayBuffer); AUDIO_CACHE.files.add(rel); errRow = 0; }
          else failed++;
        } catch (e) { failed++; if (++errRow >= 6) offline = true; }
        done++; if (progress) progress(done, jobs.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { done, failed, offline };
  }
  async dropAudio() {
    const ad = this.app.vault.adapter; const base = this.manifest.dir + '/audio';
    try { if (await ad.exists(base)) await ad.rmdir(base, true); } catch (e) { new Notice('Impossible d\'effacer : ' + e.message); }
    await this.scanAudio();
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
  async editNote(path, initial) {
    let f = this.app.vault.getAbstractFileByPath(path);
    try {
      if (!f) {
        const dir = path.slice(0, path.lastIndexOf('/'));
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        f = await this.app.vault.create(path, initial);
        new Notice('Ta version a été créée : modifie-la, l\'original reste intact.');
      }
      await this.app.workspace.getLeaf('tab').openFile(f);
    } catch (e) { new Notice('Impossible de créer la note : ' + e.message); }
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
/* Généré par tools/content.js depuis content/ : ne pas modifier ici */
const RULE_DOCS = {"fr":{"accusatif":"## En bref\nL'**accusatif** (naṣb, النَّصْب, « le fait de dresser ») a la marque **-a** (ou -an, ou ـِينَ au pluriel masculin). C'est surtout le cas du **complément d'objet**, mais il a beaucoup d'autres usages.\n\n## Quand met-on l'accusatif ?\n1. **Le complément d'objet** (« qui ? quoi ? ») : خَلَقَ ٱلْإِنْسَانَ, « il a créé l'homme ».\n2. **Le nom après إِنَّ** et ses sœurs : إِنَّ ٱلْإِنْسَانَ لَفِي خُسْرٍ.\n3. **L'attribut après كَانَ** et ses sœurs : كَانَ تَوَّابًا.\n4. **Le complément de temps ou de lieu** : يَوْمَ ٱلْقِيَامَةِ, « le jour de la Résurrection ».\n5. **Le complément d'état** (ḥāl) : ٱرْجِعِي رَاضِيَةً, « reviens, satisfaite ».\n6. **Le complément absolu** qui renforce le verbe : زُلْزِلَتِ ٱلْأَرْضُ زِلْزَالَهَا, « la terre sera secouée de sa secousse ».\n7. **Ce qui est excepté** après إِلَّا dans une phrase positive.\n8. **Le nom après لَا** de négation absolue : لَا رَيْبَ, « aucun doute » (sans tanwīn).\n\n## Les marques\n| Type de nom | Marque | Exemple |\n|---|---|---|\n| singulier défini | ـَ | ٱلْكِتَابَ |\n| singulier indéfini | ـً + ا | كِتَابًا |\n| pluriel masculin | ـِينَ | ٱلْمُؤْمِنِينَ |\n| duel | ـَيْنِ | رَجُلَيْنِ |\n| pluriel féminin | ـِ / ـٍ (pas de -a !) | ٱلصَّالِحَاتِ |\n\n## Dans le Coran\n@coran 1:6 | 2,3 | ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ : complément du verbe « guide-nous », et son adjectif qui copie le -a.\n@coran 103:2 | 2 | ٱلْإِنسَٰنَ : -a à cause de إِنَّ.\n@coran 110:3 | 7 | تَوَّابًۢا : attribut de كَانَ, à l'accusatif (-an).\n@coran 110:2 | 2,7 | ٱلنَّاسَ (complément : « tu vois **les gens** ») et أَفْوَاجًا (état : « **en foule** »).\n\n## Les pièges\n- Le pluriel féminin en ـَات ne prend **jamais** -a : à l'accusatif il prend -i. وَعَمِلُوا ٱلصَّالِحَاتِ = « et ont fait les bonnes œuvres ».\n- Un verbe peut avoir **deux** compléments à l'accusatif : أَعْطَيْنَاكَ ٱلْكَوْثَرَ, « nous **t'**avons donné **l'Abondance** ».\n\n## Pour vérifier\n> Pourquoi ٱلنَّاسَ est-il à l'accusatif dans وَرَأَيْتَ ٱلنَّاسَ ?\n> Réponse : c'est le **complément** du verbe رَأَيْتَ (tu as vu) : tu as vu qui ? les gens.","adjectif":"## En bref\nL'**adjectif** (naʿt, النَّعْت) se place **après** le nom et le **copie** en tout : même cas, même ال ou même tanwīn, même genre, même nombre.\n\n## Les quatre accords\n1. **Le cas** : nom à -u → adjectif à -u ; nom à -i → adjectif à -i.\n2. **Défini / indéfini** : nom avec ال → adjectif avec ال ; nom avec tanwīn → adjectif avec tanwīn.\n3. **Le genre** : nom féminin → adjectif avec **ـة** (كَبِيرَة).\n4. **Le nombre** : singulier, duel ou pluriel. Mais un **pluriel de choses** se traite comme un **féminin singulier** : بُيُوتٌ كَبِيرَةٌ (de grandes maisons).\n\n| Groupe | Lecture | Sens |\n|---|---|---|\n| بَيْتٌ كَبِيرٌ | baytun kabīrun | une grande maison |\n| ٱلْبَيْتُ ٱلْكَبِيرُ | al-baytu l-kabīru | la grande maison |\n| فِي ٱلْبَيْتِ ٱلْكَبِيرِ | fi l-bayti l-kabīri | dans la grande maison |\n| مَدْرَسَةٌ كَبِيرَةٌ | madrasatun kabīratun | une grande école |\n\n## Adjectif ou phrase ?\nC'est la question la plus importante :\n- **défini + défini** (ٱلْبَيْتُ ٱلْكَبِيرُ) = un **groupe** : « la grande maison » ;\n- **défini + indéfini** (ٱلْبَيْتُ كَبِيرٌ) = une **phrase** : « la maison **est** grande ».\nLe ال (ou son absence) sur le deuxième mot fait toute la différence.\n\n## Dans le Coran\n@coran 1:6 | 2,3 | ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ : « le chemin droit », deux accusatifs avec ال.\n@coran 1:1 | 2,3,4 | ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ : deux adjectifs qui copient le génitif de ٱللَّه.\n@coran 2:7 | 11,12 | عَذَابٌ عَظِيمٌ : « un châtiment immense », deux nominatifs indéfinis.\n@coran 89:27 | 2,3 | ٱلنَّفْسُ ٱلْمُطْمَئِنَّةُ : « l'âme apaisée », féminin (ـة) comme نَفْس.\n\n## Plusieurs adjectifs\nOn peut en mettre plusieurs à la suite : ils copient tous le **même** nom. ٱلْعَلِيُّ ٱلْعَظِيمُ (le Très-Haut, l'Immense).\n\n## Avec une annexion\nL'adjectif se met **après tout le groupe**, et il copie le mot qu'il qualifie : بَيْتُ ٱللَّهِ ٱلْحَرَامُ — ٱلْحَرَامُ qualifie بَيْت (la Maison sacrée), donc il prend le -u de بَيْت.\n\n## Les pièges\n- Un nom avec un possessif est défini : son adjectif prend ال. رَبُّكَ ٱلْأَكْرَمُ = ton Seigneur le Très-Noble.\n- Les pluriels de personnes gardent un adjectif pluriel : رِجَالٌ صَالِحُونَ (des hommes vertueux).\n\n## Pour vérifier\n> ٱلرَّجُلُ صَالِحٌ ou ٱلرَّجُلُ ٱلصَّالِحُ : lequel veut dire « l'homme vertueux » ?\n> Réponse : **ٱلرَّجُلُ ٱلصَّالِحُ** (défini + défini). L'autre veut dire « l'homme est vertueux ».","attribut":"## En bref\nLe **khabar** (الخَبَر, « l'information ») est **ce qu'on dit du sujet** dans une phrase nominale. C'est l'information nouvelle. Il est au **nominatif** (sauf après كَانَ).\n\n## Pas à pas\n1. Trouve le sujet (le mot dont on parle).\n2. Demande-toi : « qu'est-ce qu'on dit de lui ? » → c'est l'attribut.\n3. Il est souvent **indéfini** (avec tanwīn) : c'est l'indice qu'il y a une phrase et pas un simple groupe.\n\n## Les quatre formes\n1. **Un mot** : ٱللَّهُ أَحَدٌ (Allah est unique).\n2. **Préposition + nom** : ٱلْحَمْدُ لِلَّهِ (la louange est **à Allah**).\n3. **Une phrase verbale** : ٱللَّهُ يَعْلَمُ (Allah **sait**).\n4. **Un adverbe de lieu ou de temps** : ٱلْجَنَّةُ تَحْتَ أَقْدَامِ ٱلْأُمَّهَاتِ (le paradis est **sous** les pieds des mères).\n\n## Dans le Coran\n@coran 112:2 | 2 | ٱلصَّمَدُ : l'attribut (« l'Absolu »).\n@coran 97:3 | 3 | خَيْرٌ : l'attribut, indéfini, « meilleure ».\n@coran 103:2 | 3,4 | لَفِى خُسْرٍ : l'attribut de إِنَّ est un groupe préposition + nom.\n\n## Après إِنَّ et كَانَ\n- Après **إِنَّ**, l'attribut **reste** au nominatif : إِنَّ ٱللَّهَ غَفُورٌ.\n- Après **كَانَ**, l'attribut passe à l'**accusatif** : كَانَ ٱللَّهُ غَفُورًا.\n\n## Les pièges\n- Un attribut défini (ٱللَّهُ ٱلصَّمَدُ) ressemble à un adjectif. Si la phrase n'a pas d'autre attribut, c'est bien l'attribut.\n- L'attribut peut venir **avant** le sujet : لَهُمْ عَذَابٌ.\n\n## Pour vérifier\n> Dans ٱلْبَيْتُ فِي ٱلْمَدِينَةِ, quel est l'attribut ?\n> Réponse : **فِي ٱلْمَدِينَةِ** (dans la ville) : « la maison est dans la ville ».","cas":"## En bref\nUn nom arabe a **trois cas**. On les voit à la **dernière voyelle** du mot : **-u**, **-a** ou **-i**. Le sens du mot ne change pas ; c'est son **rôle dans la phrase** qui change.\n\n## Pas à pas\n| Cas | Nom arabe | Fin | Avec tanwīn | Rôle principal |\n|---|---|---|---|---|\n| nominatif | rafʿ | -u ـُ | -un ـٌ | sujet, attribut |\n| accusatif | naṣb | -a ـَ | -an ـً | complément d'objet, et plusieurs autres |\n| génitif | jarr | -i ـِ | -in ـٍ | après une préposition, « de … » |\n\nPour trouver le cas d'un nom, pose-toi trois questions dans l'ordre :\n1. **Y a-t-il une préposition juste avant ?** (فِي, مِنْ, بِـ, لِـ…) → génitif.\n2. **Le mot d'avant est-il un nom sans ال ni tanwīn ?** → c'est « le … de ce mot » : génitif.\n3. **Sinon, que fait le mot ?** Sujet → nominatif. Complément du verbe → accusatif. Après إِنَّ → accusatif.\n\n## Un même mot, trois cas\n@coran 1:2 | 1 | ٱلْحَمْدُ : **-u**, c'est le sujet (« la louange est à Allah »).\n@coran 1:6 | 2 | ٱلصِّرَٰطَ : **-a**, c'est le complément (« guide-nous **le chemin** »).\n@coran 1:2 | 3,4 | رَبِّ ٱلْعَٰلَمِينَ : **-i**, « Seigneur **de** l'univers ».\n\n## Quand la fin n'est pas une simple voyelle\n- Pluriel masculin : **ـُونَ** (nominatif) / **ـِينَ** (accusatif et génitif).\n- Duel (deux choses) : **ـَانِ** / **ـَيْنِ**.\n- Pluriel féminin en ـَات : -u ou **-i** (jamais -a) : خَلَقَ ٱلسَّمَٰوَٰتِ, « il a créé les cieux », avec -i alors que c'est un complément.\n- Noms qui finissent par ى ou ا : la voyelle est **invisible** (on dit « estimée ») : هُدًى reste hudā dans les trois cas.\n- Noms diptotes : -a au lieu de -i.\n\n## Les mots qui ne changent jamais\nLes pronoms (هُوَ, أَنْتَ), les démonstratifs (هَٰذَا), les relatifs (ٱلَّذِي), les particules et les verbes au passé ont une fin **fixe**. On dit qu'ils sont **invariables** (mabnī). Ils ont quand même un rôle dans la phrase, mais sans voyelle qui le montre.\n\n## Pourquoi les cas sont si utiles\nGrâce aux cas, l'ordre des mots peut changer sans changer le sens. كَتَبَ ٱلْوَلَدُ ٱلدَّرْسَ et كَتَبَ ٱلدَّرْسَ ٱلْوَلَدُ veulent dire tous les deux « l'enfant a écrit la leçon » : ٱلْوَلَدُ a le **-u** du sujet.\n\n## Les pièges\n- À l'arrêt (fin de verset), on **ne prononce pas** la dernière voyelle : on lit rabbil-ʿālamīn, pas rabbil-ʿālamīna. Regarde l'écrit pour trouver le cas.\n- Le pronom collé cache parfois la fin : dans كِتَابِي (mon livre), on ne voit pas le cas.\n\n## Pour vérifier\n> Dans إِنَّ ٱللَّهَ غَفُورٌ, pourquoi ٱللَّهَ finit-il par -a ?\n> Réponse : parce qu'il vient après **إِنَّ**, qui met le nom suivant à l'accusatif. L'attribut غَفُورٌ, lui, reste à -u.","defini":"## En bref\nL'article **ال** (al-) collé devant un nom veut dire « le, la, les ». Il rend le nom **défini** : on parle d'une chose précise, connue.\n\n## Pas à pas\n1. ال s'écrit **collé** au mot, jamais seul : بَيْت (une maison) → **ٱلْبَيْت** (la maison).\n2. Il ne change pas avec le genre ou le nombre : ٱلْبَيْت (la maison), ٱلْبُيُوت (les maisons), ٱلْمَدْرَسَة (l'école).\n3. Un nom avec ال **perd son tanwīn** : كِتَابٌ (kitābun, un livre) → ٱلْكِتَابُ (al-kitābu, le livre). Jamais les deux à la fois.\n4. Le **a** de al- ne se prononce qu'en début de phrase. Au milieu, on enchaîne : بِسْمِ ٱللَّهِ = bismi **l**lāh (voir la règle « L'alif de liaison »).\n5. Devant 14 lettres « solaires », le **l** ne se prononce pas : ٱلشَّمْس = **ash**-shams (voir « Lettres solaires et lunaires »).\n\n## Les autres façons d'être défini\nUn nom peut être défini **sans** ال. Dans ces cas, il n'a pas non plus de tanwīn :\n- c'est un **nom propre** : مُحَمَّد, مَكَّة… (ٱللَّه est un cas à part : son ال fait partie du nom) ;\n- il porte un **pronom collé** : رَبُّكَ = ton Seigneur (défini : on sait de quel Seigneur on parle) ;\n- il est **suivi d'un complément du nom** : رَبُّ ٱلْعَالَمِينَ = le Seigneur de l'univers (voir « L'annexion ») ;\n- c'est un **pronom** (هُوَ il) ou un **démonstratif** (هَٰذَا ceci).\n\n## Dans le Coran\n@coran 1:2 | 1 | ٱلْحَمْدُ : « **la** louange » — avec ال, donc pas de tanwīn : on dit al-ḥamdu, pas al-ḥamdun.\n@coran 112:2 | 2 | ٱلصَّمَدُ : « **l'**Absolu ». Un seul ḍamma à la fin, car il a ال.\n@coran 97:3 | 2,3 | ٱلْقَدْرِ (défini) à côté de خَيْرٌ (indéfini, avec tanwīn).\n\n## Pourquoi c'est important ?\nLa différence défini / indéfini change le **sens de la phrase** :\n- ٱلْبَيْتُ ٱلْكَبِيرُ (défini + défini) = **la grande maison** : un simple groupe de mots ;\n- ٱلْبَيْتُ كَبِيرٌ (défini + indéfini) = **la maison est grande** : une phrase complète.\nC'est souvent le seul indice qui montre qu'il y a un « est » sous-entendu.\n\n## Les pièges\n- Ne confonds pas ال (article) avec un ا ل qui fait partie de la racine : أَلَمْ (n'est-ce pas ?) n'a pas d'article.\n- Après لِـ (pour), l'alif de ال tombe à l'écrit : لِ + ٱلْمُتَّقِينَ → **لِلْمُتَّقِينَ**.\n\n## Pour vérifier\n> كِتَابُهُ (son livre) : défini ou indéfini ?\n> Réponse : **défini**, grâce au pronom collé ـهُ. C'est pour ça qu'il n'a ni ال ni tanwīn.","diptote":"## En bref\nCertains noms n'ont que **deux** fins au lieu de trois : ils refusent le **tanwīn** et le **-i**. Au génitif, ils prennent **-a**. On les appelle « diptotes » (mamnūʿ min aṣ-ṣarf, المَمْنُوع مِنَ الصَّرْف, « empêchés de déclinaison complète »).\n\n## Pas à pas\n| Cas | Nom normal | Nom diptote |\n|---|---|---|\n| nominatif | مُحَمَّدٌ (-un) | إِبْرَاهِيمُ (-u) |\n| accusatif | مُحَمَّدًا (-an) | إِبْرَاهِيمَ (-a) |\n| génitif | مُحَمَّدٍ (-in) | إِبْرَاهِيمَ (**-a** !) |\n\n## Quels noms sont diptotes ?\n1. La plupart des **noms propres étrangers** : إِبْرَاهِيم, إِسْمَاعِيل, يَعْقُوب, يُوسُف, فِرْعَوْن.\n2. Les **noms propres féminins** ou en ـة : مَكَّة, فَاطِمَة.\n3. Les adjectifs sur le moule **أَفْعَل** (couleur, comparatif) : أَكْبَر (plus grand), أَسْوَد (noir).\n4. Certains **pluriels** sur des moules longs : مَسَاجِد (des mosquées), مَصَابِيح (des lampes).\n5. Les noms en **ـَاء** : أَوْلِيَاء, أَشْيَاء.\n\n## Quand ils redeviennent normaux\nDès qu'un diptote a **ال** ou est le **premier mot d'une annexion**, il reprend le -i : فِي ٱلْمَسَاجِدِ (dans les mosquées), بِأَحْسَنِ تَقْوِيمٍ.\n\n## Dans le Coran\n@coran 95:4 | 4,5,6 | فِىٓ أَحْسَنِ تَقْوِيمٍ : أَحْسَن (moule أَفْعَل) reprend le -i car il est 1er mot d'une annexion.\n\n## Les pièges\n- Dans l'atelier, quand un génitif finit par -a, la rubrique « Marque » l'explique : « fatḥa à la place de la kasra : nom diptote ».\n- Ne pas confondre avec l'accusatif : regarde le mot d'avant (une préposition ? → c'est un génitif diptote).\n\n## Pour vérifier\n> Lis : عَلَىٰ إِبْرَاهِيمَ.\n> Réponse : **ʿalā ibrāhīma** — génitif après عَلَى, mais -a car إِبْرَاهِيم est diptote.","fail":"## En bref\nLe **fāʿil** (الفَاعِل, « celui qui fait ») est le **sujet d'un verbe** : celui qui fait l'action. Il est au **nominatif** et vient **après** le verbe.\n\n## Deux façons d'exister\n1. **Un mot séparé**, après le verbe : جَاءَ نَصْرُ ٱللَّهِ (le secours d'Allah est venu).\n2. **Une terminaison** du verbe : خَلَقْنَا (**nous** avons créé), أَنْعَمْتَ (**tu** as comblé), قَالُوا (**ils** ont dit).\n3. Parfois **rien de visible** : le sujet est un « il » ou un « elle » sous-entendu. خَلَقَ = **il** a créé.\n\n## Au passif\nQuand le verbe est au passif (« a été fait »), le sujet est celui qui **subit** l'action. On l'appelle nāʾib fāʿil (« remplaçant du sujet ») : زُلْزِلَتِ ٱلْأَرْضُ, « la terre **a été** secouée ». Il est aussi au nominatif.\n\n## Dans le Coran\n@coran 110:1 | 3 | نَصْرُ : sujet du verbe جَآءَ.\n@coran 99:2 | 2 | ٱلْأَرْضُ : sujet du verbe أَخْرَجَتْ.\n@coran 90:4 | 2 | خَلَقْنَا : le sujet (« nous ») est la terminaison ـنَا.\n\n## Les pièges\n- Le sujet peut être séparé du verbe par un complément : أَلْهَاكُمُ ٱلتَّكَاثُرُ (102:1), « la course aux richesses **vous** distrait » : ـكُمْ (complément) est collé au verbe, et le sujet ٱلتَّكَاثُرُ vient après.\n\n## Pour vérifier\n> Qui fait l'action dans أَلْهَىٰكُمُ ٱلتَّكَاثُرُ ?\n> Réponse : **ٱلتَّكَاثُرُ** (la course aux richesses), au nominatif. ـكُمْ (vous) est le complément.","genitif":"## En bref\nLe **génitif** (jarr, الجَرّ, « le fait de tirer ») a la marque **-i** (ou -in, ou ـِينَ au pluriel masculin). Il n'a que **deux** emplois, faciles à reconnaître.\n\n## Les deux emplois\n1. **Après une préposition** : فِي ٱلْبَيْتِ (dans la maison), بِسْمِ ٱللَّهِ (au nom d'Allah), مِنْ شَرِّ (du mal).\n2. **Comme 2e mot de « le X de Y »** (l'annexion) : رَبِّ ٱلْعَالَمِينَ, « le Seigneur **de** l'univers ».\nEt bien sûr : un adjectif ou un mot relié par « et » à un génitif est aussi au génitif.\n\n## Les marques\n| Type de nom | Marque | Exemple |\n|---|---|---|\n| singulier défini | ـِ | ٱلْكِتَابِ |\n| singulier indéfini | ـٍ | كِتَابٍ |\n| pluriel masculin | ـِينَ | ٱلْعَالَمِينَ |\n| duel | ـَيْنِ | رَجُلَيْنِ |\n| nom diptote | ـَ (à la place de -i) | بِإِبْرَاهِيمَ |\n\n## Pas à pas : reconnaître un génitif\n1. Regarde la dernière voyelle : **-i** ? **-in** ? **ـِينَ** ?\n2. Regarde le mot d'avant : une **préposition** ? Ou un **nom sans ال ni tanwīn** ?\n3. Si oui aux deux, c'est un génitif. Tu peux traduire avec « de » ou avec la préposition.\n\n## Dans le Coran\n@coran 1:1 | 1,2 | بِسْمِ ٱللَّهِ : ٱسْم au génitif après بِـ, puis ٱللَّهِ au génitif car « le nom **d'**Allah ».\n@coran 1:4 | 1,2,3 | مَٰلِكِ يَوْمِ ٱلدِّينِ : une chaîne de génitifs, « Maître **du** jour **du** Jugement ».\n@coran 113:2 | 1,2 | مِن شَرِّ : شَرّ au génitif après مِنْ.\n\n## Les pièges\n- Dans « le X de Y », c'est **Y** qui est au génitif. **X**, lui, prend le cas de son rôle : نَصْرُ ٱللَّهِ, « le secours d'Allah », نَصْرُ est sujet (-u).\n- Le pronom collé à une préposition est aussi « au génitif », même si on ne le voit pas : عَلَيْهِمْ, لَهُ.\n\n## Pour vérifier\n> Pourquoi ٱلدِّينِ finit-il par -i dans يَوْمِ ٱلدِّينِ ?\n> Réponse : c'est le **2e mot** de l'annexion « le jour **du** Jugement ».","ghunna":"## En bref\nLa **ghunna** (الغُنَّة, nasalisation) est un son qui passe **par le nez**, comme le « n » qu'on tient en fermant la bouche : « nnnn ». Elle touche **ن** et **م**, et le **tanwīn** (-an, -in, -un, qui finit par un n). On la tient environ **2 temps**.\n\n## Pas à pas\n1. Une ن ou une م porte une **chadda** (نّ, مّ) ? Tiens le son dans le nez 2 temps : إِنَّ = in-nnna.\n2. Une **ن sans voyelle** (نْ) ou un **tanwīn** ? Regarde la lettre suivante et choisis l'une des 4 règles ci-dessous.\n3. Une **م sans voyelle** (مْ) ? Regarde si la suivante est ب ou م (règles du mīm).\n\n## Les 4 règles du nūn sākin et du tanwīn\n| Règle | Devant | On fait | Exemple |\n|---|---|---|---|\n| iẓhār (clair) | ء ه ع ح غ خ (lettres de la gorge) | n bien net, pas de nez | مِنْ عَلَقٍ |\n| idghām avec ghunna | ي ن م و | le n se fond dans la lettre, avec le nez | هُدًى مِّن |\n| idghām sans ghunna | ل ر | le n disparaît complètement | مِّن رَّبِّهِمْ |\n| iqlāb (changement) | ب | le n devient m, avec le nez | أَنۢبِئْهُم |\n| ikhfāʾ (caché) | les 15 autres lettres | n à moitié, dans le nez | أَنزَلْنَٰهُ |\n\nMoyen de retenir l'idghām : les lettres ي ن م و forment **يَنْمُو** (yanmū, « il pousse »).\n\n## Le mīm sākin (مْ)\n| Devant | Règle | Exemple |\n|---|---|---|\n| ب | ikhfāʾ shafawī : lèvres presque fermées, nez | تَرْمِيهِم بِحِجَارَةٍ |\n| م | idghām : les deux m se fondent, nez | لَهُم مَّا |\n| autre lettre | iẓhār : m bien net | عَلَيْهِمْ غَيْرِ |\n\n## Les signes du Coran qui aident\n- Un **petit م (ۢ ou ۭ)** sur un ن ou un tanwīn : c'est l'iqlāb, dis « m ».\n- Une **chadda sur la lettre suivante** (مِّن رَّبِّهِمْ) : c'est un idghām.\n- Pas de soukoun sur le ن (نـ sans ْ) devant une lettre sans chadda : c'est souvent un ikhfāʾ.\n\n## Dans le Coran\n@coran 97:1 | 1,2 | إِنَّآ أَنزَلْنَٰهُ : نّ avec chadda (ghunna) ; puis نْ devant ز : ikhfāʾ.\n@coran 2:5 | 3,4,5 | هُدًى مِّن رَّبِّهِمْ : tanwīn devant م (idghām avec ghunna), puis ن devant ر (idghām sans ghunna).\n@coran 96:2 | 3,4 | مِنْ عَلَقٍ : ن devant ع (lettre de la gorge) : iẓhār, n bien clair.\n@coran 2:33 | 3 | أَنۢبِئْهُم : petit م sur le ن devant ب : iqlāb, on dit « ambiʾhum ».\n@coran 114:4 | 4 | ٱلْخَنَّاسِ : نّ avec chadda : ghunna de 2 temps.\n\n## Les pièges\n- La ghunna se fait avec le **nez**, pas en ajoutant une voyelle.\n- Le tanwīn s'écrit comme une voyelle doublée (ـً ـٍ ـٌ), mais il **finit par un n** : c'est lui qui suit ces règles.\n- Avec « 🎨 prononciation », l'atelier met la ghunna en vert et les idghām sans ghunna en violet.\n\n## Pour vérifier\n> Que fait-on avec le tanwīn de جَنَّٰتٍ تَجْرِى (2:25) ?\n> Réponse : **ikhfāʾ** : ت ne fait pas partie des lettres de la gorge, ni de يَنْمُو, ni de ل ر ب, donc le n est « caché », à moitié prononcé par le nez.","hal":"## En bref\nLe **ḥāl** (الحَال, « l'état ») dit **dans quel état** est quelqu'un pendant l'action : « il est venu **en courant** », « reviens, **satisfaite** ». C'est en général un nom **indéfini** à l'**accusatif** (-an).\n\n## Pas à pas\n1. Trouve le verbe et celui qui fait l'action.\n2. Pose la question **« comment ? dans quel état ? »**.\n3. Le mot qui répond, indéfini et à l'accusatif, est le ḥāl.\n\nجَاءَ ٱلرَّجُلُ مُسْرِعًا = l'homme est venu **en se pressant**.\n\n## Dans le Coran\n@coran 89:28 | 4,5 | رَاضِيَةً مَّرْضِيَّةً : « reviens… **satisfaite et agréée** » : deux ḥāl au féminin (l'âme).\n@coran 110:2 | 7 | أَفْوَاجًا : « ils entrent… **en foule** ».\n\n## Le ḥāl peut être une phrase\nAvec **وَ** « alors que » : جَاءَ وَهُوَ يَضْحَكُ = il est venu **en riant** (« alors qu'il riait »).\n\n## Les pièges\n- Ne le confonds pas avec l'adjectif : l'adjectif copie le ال du nom (ٱلرَّجُلُ ٱلْمُسْرِعُ = l'homme pressé), le ḥāl reste **indéfini** (ٱلرَّجُلُ مُسْرِعًا = l'homme, pressé).\n- Ne le confonds pas avec le complément d'objet : le ḥāl décrit une **personne**, pas ce qui subit l'action.\n\n## Pour vérifier\n> Dans دَخَلَ ٱلطَّالِبُ فَرِحًا, que veut dire فَرِحًا ?\n> Réponse : « **joyeux** » : l'élève est entré, joyeux. C'est un ḥāl (indéfini, -an).","idafa":"## En bref\nPour dire « **le X de Y** », l'arabe n'a pas de mot pour « de ». On **colle deux noms** : le premier sans ال ni tanwīn, le second au **génitif**. Cela s'appelle l'**annexion** (iḍāfa, الإِضَافَة).\n\n## Pas à pas\nConstruisons « le livre de l'élève » :\n1. Le premier nom : كِتَاب. On lui **enlève** ال et tanwīn → كِتَابُ.\n2. Le second nom : ٱلطَّالِب. On le met au **génitif** → ٱلطَّالِبِ.\n3. On les met côte à côte : **كِتَابُ ٱلطَّالِبِ** (kitābu ṭ-ṭālibi) = le livre de l'élève.\n\n| Nom 1 (muḍāf) | Nom 2 (muḍāf ilayh) | Ensemble | Sens |\n|---|---|---|---|\n| رَبُّ | ٱلْعَالَمِينَ | رَبُّ ٱلْعَالَمِينَ | le Seigneur de l'univers |\n| يَوْمُ | ٱلدِّينِ | يَوْمُ ٱلدِّينِ | le jour du Jugement |\n| بَيْتُ | ٱللَّهِ | بَيْتُ ٱللَّهِ | la maison d'Allah |\n| رَسُولُ | ٱللَّهِ | رَسُولُ ٱللَّهِ | le messager d'Allah |\n\n## Les deux règles du premier nom\n1. **Pas de ال** : on ne dit jamais ٱلْكِتَابُ ٱلطَّالِبِ.\n2. **Pas de tanwīn** : on ne dit jamais كِتَابٌ ٱلطَّالِبِ.\nIl devient pourtant **défini** grâce au second nom : كِتَابُ ٱلطَّالِبِ = **le** livre de l'élève.\n\n## Le cas de chaque nom\n- Le **second** est **toujours** au génitif.\n- Le **premier** prend le cas de **son rôle** dans la phrase : sujet → -u, complément → -a, après préposition → -i.\n\n@coran 110:1 | 3,4 | نَصْرُ ٱللَّهِ : نَصْرُ est sujet (-u), ٱللَّهِ est au génitif.\n@coran 1:2 | 3,4 | رَبِّ ٱلْعَٰلَمِينَ : ici رَبِّ est lui-même au génitif, car il précise ٱللَّه qui suit une préposition.\n@coran 1:4 | 1,2,3 | مَٰلِكِ يَوْمِ ٱلدِّينِ : une **chaîne** : « le Maître **du** jour **du** Jugement ». يَوْمِ est à la fois 2e mot (de مَالِك) et 1er mot (de ٱلدِّين).\n@coran 105:1 | 6,7 | بِأَصْحَٰبِ ٱلْفِيلِ : « (envers) les gens **de** l'Éléphant ».\n\n## Le possessif est une annexion\nUn pronom collé à un nom joue le rôle du second mot : رَبُّكَ = « le Seigneur **de toi** » = ton Seigneur. C'est pour ça qu'il n'a ni ال ni tanwīn.\n\n## Les pièges\n- Un adjectif ne peut pas se glisser entre les deux noms : il se met **après** le second. بَيْتُ ٱللَّهِ ٱلْحَرَامُ = la Maison sacrée d'Allah (l'adjectif copie le cas du **premier** nom).\n- Le pluriel masculin perd son ن en premier terme : مُسْلِمُونَ → مُسْلِمُو مَكَّةَ (les musulmans de La Mecque).\n\n## Pour vérifier\n> Comment dire « la porte de la mosquée » (porte = بَاب, mosquée = مَسْجِد) ?\n> Réponse : **بَابُ ٱلْمَسْجِدِ** — premier mot sans ال ni tanwīn, second avec ال et au génitif.","imperatif":"## En bref\nL'**impératif** (al-amr, الأَمْر) sert à **donner un ordre** : « lis ! », « dis ! ». On le fabrique **à partir du présent** : on enlève la lettre du début et on met la fin au soukoun. Si le mot commence alors par deux consonnes, on ajoute un **alif de liaison** devant.\n\n## Pas à pas\n1. Pars du présent « tu » : تَقْرَأُ (tu lis).\n2. Enlève تَـ : قْرَأُ.\n3. Mets la fin au soukoun : قْرَأْ.\n4. Le mot commence par deux consonnes (q-r) : impossible à prononcer. On ajoute **ٱ** devant, prononcé **i** (ou **u** si le présent a -u au milieu) : **ٱقْرَأْ** (iqraʾ) = lis !\n\n## Le tableau\n| Pour qui | Fin | Exemple | Sens |\n|---|---|---|---|\n| toi (homme) | ـْ | ٱعْبُدْ | adore ! |\n| toi (femme) | ـِي | ٱعْبُدِي | adore ! |\n| vous | ـُوا | ٱعْبُدُوا | adorez ! |\n\nVoyelle du alif : **u** si le présent a -u au milieu (تَعْبُدُ → **u**ʿbud), sinon **i** (تَقْرَأُ → **i**qraʾ, تَجْلِسُ → **i**jlis).\n\n## Quand il n'y a pas de alif\nSi après avoir enlevé la lettre du début le mot commence déjà par une **voyelle**, pas besoin de alif :\n- تَقُولُ → **قُلْ** (dis !). Le و tombe car on ne peut pas avoir ū + soukoun.\n- تُصَلِّي → **صَلِّ** (prie !). Le ي final tombe.\n- تُعَلِّمُ → عَلِّمْ (enseigne !).\n\n## Dans le Coran\n@coran 96:1 | 1 | ٱقْرَأْ : impératif de يَقْرَأُ. Le premier mot révélé : « Lis ! ».\n@coran 112:1 | 1 | قُلْ : impératif de يَقُولُ, sans alif. « Dis ! ».\n@coran 108:2 | 1,3 | فَصَلِّ … وَٱنْحَرْ : deux ordres. صَلِّ a perdu son ي ; ٱنْحَرْ a un alif de liaison, muet ici après وَ.\n@coran 2:21 | 3 | ٱعْبُدُوا۟ : ordre au pluriel (-ū). Le alif final est muet.\n\n## Les pièges\n- Au milieu d'une phrase, le alif de l'impératif **ne se prononce pas** : وَٱنْحَرْ = wa-nḥar, pas « wa-inḥar ».\n- La défense (« ne fais pas ») n'est pas un impératif : c'est لَا + présent au jussif, لَا تَقُلْ (ne dis pas).\n- Adressé à Allah, l'impératif est une **prière**, pas un ordre : ٱهْدِنَا = guide-nous.\n\n## Pour vérifier\n> Quel est l'impératif de تَكْتُبُ (tu écris) ?\n> Réponse : **ٱكْتُبْ** (uktub) : on enlève تَـ, soukoun à la fin, alif devant avec **u** car le présent a -u au milieu.","inna":"## En bref\n**إِنَّ** (inna, « certes, vraiment ») se place devant une phrase nominale pour **insister**. Elle met le **sujet à l'accusatif** (-a). L'attribut reste au **nominatif** (-u).\n\n## Pas à pas\n1. Pars d'une phrase nominale : ٱلْإِنْسَانُ فِي خُسْرٍ (l'homme est en perdition).\n2. Ajoute إِنَّ devant.\n3. Le sujet passe de **-u** à **-a** : ٱلْإِنْسَانُ → **ٱلْإِنْسَانَ**.\n4. L'attribut ne bouge pas : فِي خُسْرٍ.\nRésultat : **إِنَّ ٱلْإِنْسَانَ لَفِي خُسْرٍ** (le لَـ ajouté devant l'attribut renforce encore : « certes, vraiment »).\n\n## Les sœurs de inna\nElles font **la même chose** au sujet :\n| Mot | Sens | Exemple |\n|---|---|---|\n| إِنَّ | certes | إِنَّ ٱللَّهَ غَفُورٌ |\n| أَنَّ | que (après « savoir, dire ») | أَنَّ ٱللَّهَ غَفُورٌ |\n| لَكِنَّ | mais | لَكِنَّ ٱللَّهَ غَفُورٌ |\n| كَأَنَّ | comme si | كَأَنَّهُمْ … |\n| لَعَلَّ | peut-être, afin que | لَعَلَّكُمْ تَتَّقُونَ |\n| لَيْتَ | si seulement | يَا لَيْتَنِي … |\nEt **لَا** de négation absolue (« aucun… ») : لَا رَيْبَ فِيهِ, « aucun doute en lui ». Ici le nom perd aussi son tanwīn.\n\n## Avec un pronom\nLe sujet de inna est souvent un **pronom collé** : إِنَّهُ (certes lui), إِنَّا (certes nous), إِنَّكَ (certes toi).\n\n## Dans le Coran\n@coran 103:2 | 1,2,3,4 | إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ : sujet à l'accusatif, attribut = préposition + nom.\n@coran 108:3 | 1,2,4 | إِنَّ شَانِئَكَ … ٱلْأَبْتَرُ : sujet شَانِئَ (-a), attribut ٱلْأَبْتَرُ (-u).\n@coran 108:1 | 1 | إِنَّآ = إِنَّ + نَا : « certes **nous** ». L'attribut est la phrase verbale qui suit.\n@coran 2:2 | 3,4 | لَا رَيْبَ : لَا de négation absolue, رَيْبَ à l'accusatif sans tanwīn.\n\n## Les pièges\n- Ne confonds pas **إِنَّ** (certes, avec chadda) et **إِنْ** (si, sans chadda) : إِنْ n'a pas cet effet.\n- **أَنْ** (que + verbe) n'est pas **أَنَّ** (que + nom) : أَنْ met le verbe au subjonctif.\n\n## Pour vérifier\n> Ajoute إِنَّ à ٱلْعِلْمُ نُورٌ (la science est une lumière).\n> Réponse : **إِنَّ ٱلْعِلْمَ نُورٌ** — le sujet passe à -a, l'attribut reste à -un.","irab":"## En bref\nFaire l'**iʿrāb** (الإِعْرَاب) d'une phrase, c'est expliquer **chaque mot** : ce qu'il est, son rôle, sa fin et pourquoi. C'est la méthode des grammairiens arabes depuis plus de mille ans.\n\n## Les 4 questions, mot par mot\n1. **Nom, verbe ou particule ?** (dans l'atelier : bleu, rouge ou gris)\n2. **Quel rôle ?** sujet, attribut, complément, après une préposition, complément du nom, adjectif…\n3. **Quelle fin ?** -u, -a, -i, ـْ (soukoun) — ou fin invariable.\n4. **Quel signe le montre ?** la voyelle, ـونَ / ـينَ, ـانِ / ـيْنِ, ou une voyelle « estimée » quand on ne peut pas la voir.\n\n## Exemple complet : ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَالَمِينَ\n| Mot | Nature | Rôle | Fin | Signe |\n|---|---|---|---|---|\n| ٱلْحَمْدُ | nom | sujet (mubtadaʾ) | nominatif | ḍamma |\n| لِـ | particule | préposition | invariable | — |\n| ٱللَّهِ | nom | après préposition | génitif | kasra |\n| رَبِّ | nom | précise ٱللَّه (apposition) | génitif | kasra |\n| ٱلْعَالَمِينَ | nom | complément du nom | génitif | ـِينَ |\nLe groupe لِلَّهِ est l'**attribut** : « la louange (est) à Allah ».\n\n## Mots invariables\nCertains mots ne changent jamais de fin : les particules, les pronoms, les démonstratifs, les relatifs, les verbes au passé et à l'impératif. On dit qu'ils sont **mabnī** (« bâtis »). Ils ont un rôle, mais pas de voyelle qui le montre : on dit qu'ils sont « à la place » d'un nominatif, d'un accusatif…\n\n## Les voyelles « estimées »\nQuand le mot finit par **ى** ou **ا** (هُدًى, مُوسَى), la voyelle de cas ne peut pas s'écrire. Elle existe quand même : on dit qu'elle est **estimée**. Le rôle du mot se déduit des autres mots.\n\n## Dans l'atelier\nLe bouton **🧩 Analyse de la phrase**, sous chaque verset, fait l'iʿrāb automatiquement : un schéma relie chaque mot à celui dont il dépend, puis chaque mot est expliqué avec ces 4 réponses.\n@coran 1:2 | 1,2,3,4 | Essaie : appuie sur 🧩 sous ce verset et compare avec le tableau ci-dessus.\n\n## Conseil de méthode\nCommence toujours par repérer **le verbe** (s'il y en a un), puis **les prépositions** : les noms qui les suivent sont faciles (génitif). Il reste ensuite peu de mots à analyser.\n\n## Pour vérifier\n> Fais l'iʿrāb de قُلْ (112:1).\n> Réponse : verbe, à l'**impératif**, invariable (fin en soukoun) ; son sujet est caché : « toi ».","kana":"## En bref\n**كَانَ** (kāna, « il était ») se place devant une phrase nominale pour la mettre **au passé** (ou dire « toujours »). Le **sujet reste au nominatif**, mais l'**attribut passe à l'accusatif** (-a). C'est l'inverse de إِنَّ.\n\n## Pas à pas\n1. Pars d'une phrase nominale : ٱللَّهُ غَفُورٌ (Allah est pardonneur).\n2. Ajoute كَانَ devant.\n3. Le sujet ne change pas : ٱللَّهُ.\n4. L'attribut passe à l'accusatif : غَفُورٌ → **غَفُورًا**.\nRésultat : **كَانَ ٱللَّهُ غَفُورًا**. Dans le Coran, avec Allah, كَانَ veut souvent dire « Il est **depuis toujours** ».\n\n## Les sœurs de kāna\n| Mot | Sens |\n|---|---|\n| كَانَ / يَكُونُ | être (passé / présent-futur) |\n| لَيْسَ | ne pas être |\n| أَصْبَحَ | devenir (au matin) |\n| صَارَ | devenir |\n| ظَلَّ | rester |\n| مَا زَالَ | ne pas cesser d'être |\n\n## كَانَ se conjugue\nC'est un vrai verbe : كُنْتُ (j'étais), كُنَّا (nous étions), كَانُوا (ils étaient), يَكُونُ (il est / sera), لَمْ يَكُنْ (il n'a pas été). Avec une terminaison de personne, le sujet est **dans** le verbe : كُنْتُ غَنِيًّا = j'étais riche.\n\n## Dans le Coran\n@coran 110:3 | 6,7 | كَانَ تَوَّابًۢا : attribut à l'accusatif (-an). « Il est toujours Accueillant au repentir. »\n@coran 112:4 | 2,4,5 | لَمْ يَكُن … كُفُوًا أَحَدٌ : يَكُن = كَانَ après لَمْ ; كُفُوًا attribut (-an), أَحَدٌ sujet (-un). Mot à mot : « n'a pas été égal à Lui quiconque ».\n\n## inna ou kāna ? Le moyen de s'en souvenir\n- **inna → le 1er mot** (le sujet) à l'accusatif.\n- **kāna → le 2e mot** (l'attribut) à l'accusatif.\nLes deux mettent un -a, mais pas sur le même mot.\n\n## Les pièges\n- Après لَمْ, يَكُونُ devient **يَكُنْ** puis souvent **يَكُ** : le و tombe.\n- L'attribut peut venir avant le sujet : لَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ.\n\n## Pour vérifier\n> Mets au passé avec كَانَ : ٱلْجَوُّ جَمِيلٌ (le temps est beau).\n> Réponse : **كَانَ ٱلْجَوُّ جَمِيلًا**.","madd":"## En bref\nLe **madd** (المَدّ, allongement) dit **combien de temps** on tient une voyelle longue. Un « temps » (ḥaraka) dure à peu près le temps de plier un doigt.\n- **Madd naturel** : 2 temps. C'est la voyelle longue normale : ā, ī, ū.\n- **Madd long** : 4 à 6 temps. Il est signalé dans le Coran par le petit signe **ٓ** (madda) au-dessus de la lettre.\n\n## Pas à pas\n1. Repère une voyelle longue : fatḥa + ا (ā), kasra + ي (ī), ḍamma + و (ū).\n2. Il n'y a pas de ٓ ? Tiens-la **2 temps** : مَٰلِكِ = mā-liki.\n3. Il y a un ٓ ? Tiens-la **4 à 6 temps** : ٱلضَّآلِّينَ = aḍ-ḍāāāāl-līn.\n4. Choisis une durée et **garde-la la même** dans toute ta lecture.\n\n## Les voyelles longues\n| Voyelle | Lettre | Exemple | Son |\n|---|---|---|---|\n| ā | ا ou ى ou ٰ (petit alif) | قَالَ, عَلَىٰ, ٱلرَّحْمَٰنِ | ā |\n| ī | ي après kasra | ٱلرَّحِيمِ | ī |\n| ū | و après ḍamma | يَقُولُ | ū |\n\nLe **petit alif ٰ** (alif suscrit) est un vrai ā : ٱلرَّحْمَٰنِ = ar-raḥ**mā**n.\n\n## Pourquoi un madd long ?\nLe signe ٓ arrive quand la voyelle longue est suivie :\n- d'une **hamza ء** dans le même mot (madd obligatoire, 4-5 temps) : سَوَآءٌ, جَآءَ ;\n- d'une hamza au **mot suivant** (madd permis, 4-5 temps) : إِنَّآ أَعْطَيْنَٰكَ ;\n- d'une **chadda ou d'un soukoun** (madd nécessaire, 6 temps) : ٱلضَّآلِّينَ ;\n- et au début de certaines sourates : الٓمٓ (alif-lāāām-mīīīm).\n\n## Le madd à l'arrêt\nEn fin de verset, la dernière voyelle tombe ; si une voyelle longue la précède, on peut l'allonger **2, 4 ou 6 temps** : ٱلرَّحِيمِ → ar-raḥīīm.\n\n## Dans le Coran\n@coran 1:7 | 9 | ٱلضَّآلِّينَ : ٓ puis chadda : madd de 6 temps.\n@coran 2:255 | 2,3 | لَآ إِلَٰهَ : ٓ sur لا car un mot commençant par إ suit : 4 temps. إِلَٰهَ a un petit alif : 2 temps.\n@coran 2:6 | 4 | سَوَآءٌ : ā + hamza dans le mot : 4 à 5 temps.\n@coran 1:4 | 1 | مَٰلِكِ : petit alif, madd naturel de 2 temps.\n\n## Les pièges\n- Un ا **sans voyelle avant lui** (le ا de ٱ, ou le ا après tanwīn -an) n'est pas un madd.\n- Ne raccourcis pas un madd naturel : قَالَ (qāla, il a dit) et قَلَّ (qalla, il a diminué) ne veulent pas dire la même chose.\n- Avec « 🎨 prononciation », l'atelier met les madd de 2 temps en orange, et ceux de 4 à 6 temps en rouge.\n\n## Pour vérifier\n> Combien de temps tient-on le ā de جَآءَ ?\n> Réponse : **4 à 5 temps** : il y a le signe ٓ (ā suivi d'une hamza dans le même mot).","maful":"## En bref\nLe **mafʿūl bihi** (المَفْعُول بِهِ, « ce sur quoi l'action est faite ») est le **complément d'objet direct** : ce qui subit l'action. Il est à l'**accusatif** (-a).\n\n## Pas à pas\n1. Trouve le verbe.\n2. Pose la question « qui ? quoi ? » après le verbe : خَلَقَ … ? → « il a créé **quoi** ? » → ٱلْإِنْسَانَ (l'homme).\n3. Ce mot est à l'accusatif : -a, -an, ـِينَ.\n\n## Trois formes\n1. **Un nom** : خَلَقَ ٱلْإِنْسَانَ.\n2. **Un pronom collé au verbe** : ٱهْدِنَا (guide-**nous**), أَنْزَلْنَاهُ (nous **l'**avons fait descendre).\n3. **Un pronom avec إِيَّا**, placé **avant** le verbe pour insister : إِيَّاكَ نَعْبُدُ (c'est **Toi** que nous adorons).\n\n## Deux compléments\nCertains verbes (donner, faire voir, enseigner…) ont **deux** compléments : أَعْطَيْنَاكَ ٱلْكَوْثَرَ = nous **t'**avons donné **l'Abondance**. عَلَّمَ ٱلْإِنْسَانَ مَا لَمْ يَعْلَمْ = il a enseigné **à l'homme** **ce qu'il ne savait pas**.\n\n## Dans le Coran\n@coran 96:2 | 2 | ٱلْإِنسَٰنَ : complément de خَلَقَ (il a créé l'homme).\n@coran 108:1 | 2,3 | أَعْطَيْنَٰكَ ٱلْكَوْثَرَ : deux compléments, ـكَ (te) et ٱلْكَوْثَرَ.\n@coran 1:5 | 1 | إِيَّاكَ : complément placé avant le verbe pour insister.\n\n## Les pièges\n- Les verbes qui se construisent avec une préposition n'ont pas de mafʿūl bihi direct : آمَنَ **بِـ** (croire **en**), le nom après بِـ est au génitif.\n- Le pluriel féminin à l'accusatif prend **-i** : عَمِلُوا ٱلصَّالِحَاتِ.\n\n## Pour vérifier\n> Dans يُحِبُّ ٱللَّهُ ٱلْمُحْسِنِينَ (Allah aime les bienfaisants), quel est le complément ?\n> Réponse : **ٱلْمُحْسِنِينَ**, à l'accusatif (ـِينَ). ٱللَّهُ est le sujet.","modes":"## En bref\nLe présent a **trois « modes »**, qu'on reconnaît à la **fin du verbe** :\n- **-u** : le mode normal (indicatif), يَعْلَمُ ;\n- **-a** : après أَنْ (que) et لَنْ (ne … jamais), c'est le **subjonctif**, يَعْلَمَ ;\n- **soukoun** : après لَمْ (ne … pas, au passé), لَا de défense, لِـ (qu'il…), ou dans un « si … alors », c'est le **jussif**, يَعْلَمْ.\nC'est le **petit mot devant** qui choisit la fin.\n\n## Pas à pas\n1. Repère un verbe au présent : يَلِدُ (il engendre).\n2. Regarde le petit mot juste avant.\n3. لَمْ devant → fin en soukoun : **لَمْ يَلِدْ** = il n'a pas engendré.\n4. أَنْ devant → fin en -a : أَنْ يَضْرِبَ = qu'il donne (un exemple).\n5. Rien de spécial devant → fin en -u : يَعْلَمُ.\n\n## Le tableau\n| Mode | Fin | Petit mot devant | Exemple | Sens |\n|---|---|---|---|---|\n| normal | ـُ | (rien) | يَعْلَمُ | il sait |\n| subjonctif | ـَ | أَنْ, لَنْ, كَيْ, لِـ (pour) | لَنْ يَعْلَمَ | il ne saura jamais |\n| jussif | ـْ | لَمْ, لَا (défense), لِـ (ordre), إِنْ (si) | لَمْ يَعْلَمْ | il n'a pas su |\n\n## Les verbes en -ūna, -īna\nAvec « ils / vous / tu (femme) », le subjonctif et le jussif **enlèvent le -na final** :\n- يَعْلَمُونَ (ils savent) → لَمْ يَعْلَمُوا (ils n'ont pas su) ;\n- تَصُومُونَ → أَنْ تَصُومُوا (que vous jeûniez).\nLe alif ajouté après le و ne se prononce pas.\n\n## Le « si … alors »\nDans une phrase avec مَنْ (celui qui) ou إِنْ (si), **les deux verbes** passent souvent au jussif : la condition et le résultat.\n\n## Dans le Coran\n@coran 112:3 | 1,2,3,4 | لَمْ يَلِدْ وَلَمْ يُولَدْ : deux jussifs après لَمْ. « Il n'a pas engendré et n'a pas été engendré ».\n@coran 4:28 | 3,4 | أَن يُخَفِّفَ : subjonctif (-a) après أَنْ. « Allah veut alléger (votre charge) ».\n@coran 99:7 | 1,2,6 | فَمَن يَعْمَلْ … يَرَهُۥ : jussif dans une condition. « Qui fait … le verra ».\n@coran 2:184 | 26,27 | وَأَن تَصُومُوا۟ : -na tombé après أَنْ. « Et que vous jeûniez (est meilleur) ».\n\n## Les pièges\n- **لَمْ + présent = passé** négatif. لَمْ يَلِدْ se traduit « il n'a pas engendré », pas « il n'engendre pas ».\n- Un verbe faible perd sa voyelle longue au jussif : يَكُونُ → لَمْ **يَكُنْ** ; يَرَى → لَمْ **يَرَ**.\n- Le soukoun final peut devenir **-i** pour éviter deux consonnes : لَمْ يَكُنِ ٱلَّذِينَ.\n- لَا peut **interdire** (jussif : لَا تَقُلْ, ne dis pas) ou simplement **nier** (normal : لَا يَعْلَمُونَ, ils ne savent pas). Regarde la fin du verbe.\n\n## Pour vérifier\n> Pourquoi يَعْلَمْ finit-il par un soukoun dans مَا لَمْ يَعْلَمْ (96:5) ?\n> Réponse : à cause de **لَمْ** devant : c'est le jussif, et le sens est au passé (« ce qu'il ne savait pas »).","muet":"## En bref\nCertaines lettres sont **écrites mais pas prononcées**. Dans le Coran, la plupart sont marquées par un **petit rond ۟** au-dessus (ou un petit rectangle ۠). Les autres se reconnaissent parce qu'elles n'ont **aucune voyelle** et ne forment pas de voyelle longue.\n\n## Pas à pas\n1. Une lettre a un **petit rond ۟** ? Ne la prononce pas : كَفَرُوا۟ = kafarū.\n2. Un **ٱ** au milieu de la phrase ? Muet (voir l'alif de liaison).\n3. Un **ل** de l'article devant une lettre avec chadda ? Muet (voir les lettres solaires).\n4. Un **ا après un tanwīn -an** (ـًا) ? Muet au milieu : -an, pas -ān.\n\n## Les cas les plus fréquents\n| Cas | Exemple | Lecture |\n|---|---|---|\n| alif après ـُوا (verbes au pluriel) | ءَامَنُوا۟ | āmanū |\n| و dans أُو۟لَٰٓئِكَ (ceux-là) | أُو۟لَٰٓئِكَ | ulāʾika |\n| alif de أَنَا۠ (moi) | أَنَا۠ | ana (court, sauf à l'arrêt) |\n| alif de liaison ٱ | وَٱلْأَرْضِ | wal-arḍi |\n| l de l'article (solaire) | ٱلشَّمْسُ | ash-shamsu |\n| alif du tanwīn -an | رِزْقًا | rizqan |\n\n## Pourquoi ces lettres ?\nL'écriture du Coran a été fixée très tôt, et elle garde de vieilles habitudes d'écriture. La lecture, elle, a été transmise **de bouche à oreille**. Les petits signes (۟, ٱ…) ont été ajoutés plus tard pour qu'on ne se trompe pas.\n\n## Dans le Coran\n@coran 2:5 | 1,6 | أُو۟لَٰٓئِكَ : le و avec le petit rond ne se prononce pas : ulāʾika.\n@coran 2:21 | 3 | ٱعْبُدُوا۟ : le alif final est muet : uʿbudū.\n@coran 20:12 | 2 | أَنَا۠ : le alif avec ۠ est muet au milieu : ana.\n@coran 2:25 | 18 | رِّزْقًا : le alif du tanwīn ne s'allonge pas : rizqan.\n\n## Les pièges\n- À l'**arrêt**, certains de ces alifs se prononcent : أَنَا۠ → anā, رِزْقًا → rizqā.\n- Ne confonds pas le petit rond ۟ (muet) avec le **soukoun ْ** (consonne sans voyelle, qu'on prononce !). Dans les mushafs de type Médine, le soukoun ressemble à un petit ح sans point.\n- Avec « 🎨 prononciation », l'atelier colore en gris toutes les lettres muettes.\n\n## Pour vérifier\n> Comment lit-on وَعَمِلُوا۟ ?\n> Réponse : **wa-ʿamilū** : le alif final (petit rond) ne se prononce pas.","nominale":"## En bref\nUne **phrase nominale** commence par un nom (ou un pronom) et n'a **pas de verbe « être »** au présent. Elle a deux parties : le **sujet** (mubtadaʾ, المُبْتَدَأ) et ce qu'on dit de lui, l'**attribut** (khabar, الخَبَر). Les deux sont au **nominatif**.\n\n## Pas à pas\nConstruisons « la maison est grande » :\n1. Le sujet, en général défini : **ٱلْبَيْتُ** (la maison).\n2. L'attribut, en général indéfini : **كَبِيرٌ** (grand).\n3. On les pose côte à côte, sans rien entre : **ٱلْبَيْتُ كَبِيرٌ** (al-baytu kabīrun). Le « est » est sous-entendu.\n\n## Les formes de l'attribut\nL'attribut peut être :\n| Forme | Exemple | Sens |\n|---|---|---|\n| un nom ou adjectif | ٱللَّهُ أَحَدٌ | Allah est unique |\n| un groupe préposition + nom | ٱلْحَمْدُ لِلَّهِ | la louange est à Allah |\n| une phrase verbale | ٱللَّهُ يَعْلَمُ | Allah, Il sait |\n| une autre phrase nominale | زَيْدٌ أَبُوهُ كَرِيمٌ | Zayd, son père est généreux |\n\n## L'attribut placé en tête\nQuand le sujet est **indéfini** et que l'attribut est un groupe avec une préposition, l'attribut passe **devant** :\n- لَهُمْ عَذَابٌ = « à eux, un châtiment » = **ils auront** un châtiment ;\n- فِي ٱلْبَيْتِ رَجُلٌ = « dans la maison, un homme » = **il y a** un homme dans la maison.\nC'est la façon arabe de dire « avoir » et « il y a ».\n\n## Dans le Coran\n@coran 112:2 | 1,2 | ٱللَّهُ ٱلصَّمَدُ : sujet + attribut, deux nominatifs.\n@coran 1:2 | 1,2 | ٱلْحَمْدُ لِلَّهِ : l'attribut est un groupe préposition + nom.\n@coran 97:3 | 1,2,3 | لَيْلَةُ ٱلْقَدْرِ خَيْرٌ : le sujet est une annexion (« la nuit du Destin »), l'attribut خَيْرٌ a le tanwīn.\n@coran 2:7 | 10,11,12 | وَلَهُمْ عَذَابٌ عَظِيمٌ : attribut en tête (لَهُمْ) + sujet indéfini (عَذَابٌ).\n\n## Au passé et au futur\nPour dire « était », on ajoute **كَانَ** (voir la règle kāna) : كَانَ ٱلْبَيْتُ كَبِيرًا. Pour insister (« certes »), on ajoute **إِنَّ** (voir la règle inna).\n\n## Les pièges\n- Défini + défini peut être un groupe (« la grande maison ») et non une phrase. Pour lever le doute, l'arabe ajoute parfois un pronom : ٱللَّهُ هُوَ ٱلْغَنِيُّ = « Allah, **c'est Lui** le Riche ».\n\n## Pour vérifier\n> Traduis : ٱلْكِتَابُ جَدِيدٌ (jadīd = nouveau).\n> Réponse : « **Le livre est nouveau.** » Sujet défini + attribut indéfini.","nominatif":"## En bref\nLe **nominatif** (rafʿ, الرَّفْع, « l'élévation ») est le cas du **sujet** et de l'**attribut**. Sa marque est **-u** (ou -un, ou ـُونَ au pluriel masculin).\n\n## Quand met-on le nominatif ?\n1. **Le sujet d'un verbe** (celui qui fait l'action) : جَاءَ نَصْرُ ٱللَّهِ, « le secours d'Allah est venu ».\n2. **Le sujet d'une phrase sans verbe** (mubtadaʾ) : ٱللَّهُ ٱلصَّمَدُ, « Allah est l'Absolu ».\n3. **L'attribut** de cette phrase (khabar) : ٱلصَّمَدُ dans l'exemple précédent.\n4. **L'attribut après إِنَّ** : إِنَّ ٱللَّهَ غَفُورٌ.\n5. **Le sujet après كَانَ** : كَانَ ٱللَّهُ غَفُورًا.\n6. **Le sujet d'un verbe passif** (ce qui subit) : إِذَا زُلْزِلَتِ ٱلْأَرْضُ, « quand la terre sera secouée ».\nEt un adjectif ou un mot relié par « et » à un nominatif est aussi au nominatif.\n\n## Les marques\n| Type de nom | Marque | Exemple |\n|---|---|---|\n| singulier défini | ـُ | ٱلْكِتَابُ |\n| singulier indéfini | ـٌ | كِتَابٌ |\n| pluriel masculin | ـُونَ | ٱلْمُؤْمِنُونَ |\n| duel | ـَانِ | رَجُلَانِ |\n| pluriel féminin | ـُ / ـٌ | ٱلصَّالِحَاتُ |\n| fin en ى | invisible | هُدًى |\n\n## Dans le Coran\n@coran 110:1 | 3 | نَصْرُ : sujet du verbe جَآءَ (est venu), donc -u.\n@coran 112:2 | 1,2 | ٱللَّهُ ٱلصَّمَدُ : sujet et attribut, deux nominatifs, sans verbe.\n@coran 99:2 | 2 | ٱلْأَرْضُ : sujet du verbe أَخْرَجَتْ (a fait sortir).\n@coran 109:1 | 3 | ٱلْكَٰفِرُونَ : il précise أَيُّهَا (« ô vous… »), qui est au nominatif : il le copie, d'où ـُونَ.\n\n## Les pièges\n- Le nominatif n'est **pas** forcément au début : dans la phrase verbale, le sujet vient **après** le verbe.\n- Un nom au début de la phrase n'est pas toujours au nominatif : après إِنَّ il passe à l'accusatif.\n\n## Pour vérifier\n> Dans ذَهَبَ ٱلرَّجُلُ (l'homme est parti), quel mot est au nominatif et pourquoi ?\n> Réponse : **ٱلرَّجُلُ**, car c'est le sujet du verbe ذَهَبَ.","passe":"## En bref\nLe **passé** (al-māḍī, المَاضِي) dit une action **terminée**. On part du verbe de base, qui veut dire « **il** a fait » (فَعَلَ), et on ajoute **une terminaison à la fin** pour changer de personne. Aucun petit mot devant : la personne est **collée au verbe**.\n\n## Pas à pas\n1. Prends la racine : ك ت ب (écrire).\n2. Mets-la dans le moule de base فَعَلَ : **كَتَبَ** = il a écrit. C'est la forme du dictionnaire.\n3. Pour une autre personne, enlève la dernière voyelle et ajoute la terminaison : كَتَبْ + تُ → **كَتَبْتُ** = j'ai écrit.\n4. Le sujet est déjà dans la terminaison : pas besoin de dire « je ». كَتَبْتُ suffit.\n\n## Le tableau à connaître\n| Personne | Terminaison | Exemple | Sens |\n|---|---|---|---|\n| il | ـَ | كَتَبَ | il a écrit |\n| elle | ـَتْ | كَتَبَتْ | elle a écrit |\n| tu (homme) | ـْتَ | كَتَبْتَ | tu as écrit |\n| tu (femme) | ـْتِ | كَتَبْتِ | tu as écrit |\n| je | ـْتُ | كَتَبْتُ | j'ai écrit |\n| ils | ـُوا | كَتَبُوا | ils ont écrit |\n| vous | ـْتُمْ | كَتَبْتُمْ | vous avez écrit |\n| nous | ـْنَا | كَتَبْنَا | nous avons écrit |\n\nAstuce : **tu / je** se ressemblent (-ta, -tu, -ti) ; seule la dernière voyelle change. Dans le Coran sans voyelles visibles, c'est le contexte qui tranche.\n\n## Le alif après ـُوا\nDans كَتَبُوا (ils ont écrit), le **alif final ne se prononce pas**. Dans le Coran il porte un petit rond : كَفَرُوا۟. C'est juste une marque d'écriture du pluriel.\n\n## Les verbes « faibles »\nSi la racine contient و ou ي, le verbe change un peu de forme :\n- قَالَ (il a dit), racine ق و ل : le و devient ā. Avec « je » : **قُلْتُ** (j'ai dit), le ā raccourcit.\n- كَانَ (il était), racine ك و ن : كُنْتُ, كُنْتُمْ.\n- جَآءَ (il est venu), racine ج ي ء.\nNe t'inquiète pas : l'atelier te donne la racine de chaque mot.\n\n## Dans le Coran\n@coran 96:2 | 1 | خَلَقَ : passé, « il a créé ». C'est la forme de base (il).\n@coran 1:7 | 3 | أَنْعَمْتَ : -ta = « tu ». « Ceux que Tu as comblés ».\n@coran 108:1 | 2 | أَعْطَيْنَٰكَ : -nā = « nous », puis ـكَ = « toi » (le complément). « Nous t'avons donné ».\n@coran 103:3 | 3,4 | ءَامَنُوا۟ وَعَمِلُوا۟ : -ū = « ils ». « ceux qui ont cru et ont fait (le bien) ».\n\n## Les pièges\n- **أَعْطَيْنَٰكَ** : deux terminaisons d'affilée. La première (-nā) est le **sujet**, la deuxième (-ka) le **complément**.\n- Un verbe au passé après إِذَا (quand) ou إِن (si) se traduit souvent au **présent ou au futur** : إِذَا جَآءَ = quand viendra.\n- Le **sujet nommé** se met après le verbe, et le verbe reste alors au singulier : قَالَ ٱلنَّاسُ (les gens ont dit), pas « qālū an-nās ».\n\n## Pour vérifier\n> Que veut dire كَتَبْنَا ? Et كَتَبَتْ ?\n> Réponse : **nous avons écrit** (-nā) ; **elle a écrit** (-at).","passif":"## En bref\nLe **passif** (al-majhūl, المَجْهُول, « celui qu'on ne nomme pas ») dit qu'une action **a été faite**, sans dire **par qui** : « il a été écrit ». On ne l'écrit pas avec un verbe « être » : on **change les voyelles** du verbe.\n- passé : **u – i** (كُتِبَ, kutiba) au lieu de a – a (كَتَبَ) ;\n- présent : **u – a** (يُكْتَبُ, yuktabu) au lieu de a – u (يَكْتُبُ).\n\n## Pas à pas\n1. Pars du verbe actif : كَتَبَ (il a écrit).\n2. Mets **u** sur la 1re lettre et **i** sur l'avant-dernière : **كُتِبَ** = il a été écrit, il a été prescrit.\n3. Ce qui était le complément devient le **sujet** (au nominatif) : كُتِبَ ٱلصِّيَامُ = le jeûne a été prescrit.\n4. Celui qui fait l'action disparaît : on ne sait pas (ou on ne dit pas) qui l'a fait.\n\n## Le tableau\n| | Actif | Passif |\n|---|---|---|\n| passé | كَتَبَ (il a écrit) | كُتِبَ (il a été écrit) |\n| présent | يَكْتُبُ (il écrit) | يُكْتَبُ (il est écrit) |\n| passé | خَلَقَ (il a créé) | خُلِقَ (il a été créé) |\n| présent | يَلِدُ (il engendre) | يُولَدُ (il est engendré) |\n| passé | رَزَقَ (il a pourvu) | رُزِقَ (il a été pourvu) |\n\n## Comment le reconnaître\n- **u au début d'un passé** : presque toujours un passif (كُتِبَ, خُلِقَ, زُلْزِلَتْ).\n- **يُـ … ـَـ** au présent : souvent passif (يُولَدُ, يُكْتَبُ). Attention, les formes II et IV ont aussi يُـ au début (يُعَلِّمُ, يُؤْمِنُ) : regarde la voyelle **avant la dernière lettre** (a = passif, i = actif).\n\n## Dans le Coran\n@coran 2:183 | 4,6 | كُتِبَ عَلَيْكُمُ ٱلصِّيَامُ : passif ; ٱلصِّيَامُ est le sujet. « Le jeûne vous a été prescrit ».\n@coran 112:3 | 3,4 | وَلَمْ يُولَدْ : passif au présent (jussif après لَمْ). « et Il n'a pas été engendré ».\n@coran 99:1 | 2,3 | زُلْزِلَتِ ٱلْأَرْضُ : passif, « la terre a été secouée ».\n@coran 4:28 | 6,7 | وَخُلِقَ ٱلْإِنسَٰنُ : passif, « l'homme a été créé (faible) ».\n\n## Les pièges\n- Le sujet du passif s'appelle **nāʾib al-fāʿil** (le « remplaçant du sujet ») : il est au **nominatif**, même si c'est logiquement l'objet.\n- Avec un verbe faible : قَالَ → **قِيلَ** (il a été dit), كَانَ n'a pas de passif.\n- Sans voyelles, كتب peut être actif ou passif : seules les voyelles du Coran tranchent.\n\n## Pour vérifier\n> Que veut dire خُلِقَ ? Qui est le sujet dans خُلِقَ ٱلْإِنسَٰنُ ?\n> Réponse : **il a été créé** (u – i) ; le sujet (remplaçant) est **ٱلْإِنسَٰنُ**, au nominatif.","pluriel":"## En bref\nLe pluriel masculin « régulier » (on dit « sain ») se fait en ajoutant **ـُونَ** (nominatif) ou **ـِينَ** (accusatif et génitif). Il sert surtout pour des **personnes**.\n\n## Pas à pas\n1. Prends le singulier : مُسْلِم (un musulman).\n2. Ajoute ـُونَ pour le sujet : **مُسْلِمُونَ** (muslimūna).\n3. Ajoute ـِينَ pour le complément ou après une préposition : **مُسْلِمِينَ** (muslimīna).\n4. Pas de tanwīn : le ن final remplace le tanwīn. Avec ال : ٱلْمُسْلِمُونَ, ٱلْمُسْلِمِينَ.\n\n| Cas | Forme | Exemple du Coran |\n|---|---|---|\n| nominatif | ـُونَ | ٱلْكَافِرُونَ (109:1) |\n| accusatif | ـِينَ | ٱلْمُتَّقِينَ |\n| génitif | ـِينَ | ٱلْعَالَمِينَ (1:2), ٱلضَّالِّينَ (1:7) |\n\n## Le duel (deux)\nL'arabe a une forme spéciale pour **deux** : ـَانِ (nominatif), ـَيْنِ (accusatif et génitif). رَجُلَانِ = deux hommes. Dans 111:1, يَدَا أَبِي لَهَبٍ = « les **deux mains** d'Abū Lahab » (le ن tombe devant le complément du nom).\n\n## Le pluriel féminin\nPour les noms en ـة, on remplace ـة par **ـَات** : مُسْلِمَة → مُسْلِمَات. Ce pluriel prend -u au nominatif et **-i** à l'accusatif et au génitif (jamais -a) : عَمِلُوا ٱلصَّالِحَاتِ.\n\n## Le pluriel « brisé »\nBeaucoup de noms font leur pluriel en **changeant l'intérieur** du mot : كِتَاب → كُتُب (livres), قَلْب → قُلُوب (cœurs), رَجُل → رِجَال (hommes). Ces pluriels-là prennent les voyelles normales -u, -a, -i. Il faut les apprendre avec le mot ; le Dictionnaire de l'atelier montre toutes les formes trouvées dans le Coran.\n\n## Dans le Coran\n@coran 1:2 | 4 | ٱلْعَٰلَمِينَ : ـِينَ, génitif (« Seigneur **des** mondes »).\n@coran 109:1 | 3 | ٱلْكَٰفِرُونَ : ـُونَ, nominatif (on s'adresse à eux).\n@coran 2:5 | 8 | ٱلْمُفْلِحُونَ : ـُونَ, attribut au nominatif (« ce sont eux **les gagnants** »).\n\n## Les pièges\n- À l'arrêt, on ne prononce pas le -a final : al-ʿālamīn, al-kāfirūn.\n- Devant un complément du nom, le ن tombe : مُسْلِمُو مَكَّةَ.\n\n## Pour vérifier\n> مِنَ ٱلْمُؤْمِنُونَ ou مِنَ ٱلْمُؤْمِنِينَ ?\n> Réponse : **مِنَ ٱلْمُؤْمِنِينَ** : après la préposition مِنْ, génitif → ـِينَ.","prep":"## En bref\nUne **préposition** (en arabe : ḥarf jarr, حَرْف جَرّ, « lettre qui tire ») relie un nom au reste de la phrase : dans, de, à, sur… Après **toute** préposition, le nom est au **génitif** (-i).\n\n## Les prépositions les plus fréquentes du Coran\n| Préposition | Sens | Exemple | Lecture |\n|---|---|---|---|\n| مِنْ | de (provenance), parmi | مِنْ شَرِّ | min sharri |\n| فِي | dans, en | فِي خُسْرٍ | fī khusrin |\n| عَلَى | sur, contre | عَلَى هُدًى | ʿalā hudan |\n| إِلَى | vers, jusqu'à | إِلَى رَبِّكِ | ilā rabbiki |\n| عَنْ | loin de, au sujet de | عَنْهُ | ʿanhu |\n| بِـ | par, avec, au nom de | بِسْمِ | bismi |\n| لِـ | à, pour | لِلَّهِ | lillāhi |\n| كَـ | comme | كَٱلْفَرَاشِ | kal-farāshi |\n| حَتَّى | jusqu'à | حَتَّى مَطْلَعِ | ḥattā maṭlaʿi |\n\n## Pas à pas\n1. Les prépositions d'**une seule lettre** (بِـ لِـ كَـ) se **collent** au mot : بِ + ٱسْمِ = بِسْمِ.\n2. Les autres s'écrivent **séparées** : فِي ٱلْبَيْتِ.\n3. Le nom qui suit prend **-i** (ou -in, ou ـِينَ).\n4. Le groupe « préposition + nom » sert ensuite à quelque chose dans la phrase : il complète un verbe (« il est entré **dans la maison** ») ou il sert d'attribut (« la louange **est à Allah** »).\n\n## Avec un pronom\nLes prépositions acceptent un pronom collé : لَهُ (à lui), عَلَيْهِمْ (sur eux), مِنْهُ (de lui), فِيهِ (en lui), بِهِ (par lui). Deux changements à connaître :\n- **لِـ** devient **لَـ** devant un pronom : لَهُ, لَكَ, لَهُمْ (mais لِي, « à moi »).\n- **عَلَى** et **إِلَى** deviennent **عَلَيْـ** et **إِلَيْـ** : عَلَيْهِمْ, إِلَيْكَ.\n- Après i ou y, ـهُ devient **ـهِ** : فِيهِ, بِهِ, عَلَيْهِ.\n\n## Dans le Coran\n@coran 1:2 | 2 | لِلَّهِ = لِـ + ٱللَّهِ : « à Allah ». L'alif de ٱللَّه tombe à l'écrit.\n@coran 103:2 | 3,4 | لَفِى خُسْرٍ : فِي + خُسْرٍ au génitif indéfini (-in).\n@coran 1:7 | 4 | عَلَيْهِمْ = عَلَى + هِمْ : « sur eux ».\n@coran 89:28 | 2,3 | إِلَىٰ رَبِّكِ : « vers ton Seigneur ».\n\n## Les pièges\n- وَ peut être « et » (conjonction) **ou** la préposition du **serment** « par… ! » : وَٱلْعَصْرِ = « **Par** le Temps ! », avec le génitif.\n- مِنْ devant ال prend une fatḥa pour se lier : مِنَ ٱللَّهِ (mina llāhi).\n\n## Pour vérifier\n> Lis et traduis : مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ (114:6).\n> Réponse : **mina l-jinnati wa n-nās**, « (parmi) les djinns et les hommes ». ٱلْجِنَّةِ au génitif après مِنْ, ٱلنَّاسِ au génitif car relié par « et ».","present":"## En bref\nLe **présent** (al-muḍāriʿ, المُضَارِع) dit ce qu'on **fait maintenant, d'habitude ou bientôt**. La personne est marquée **au début** par une lettre (أ ن ي ت), et parfois aussi à la fin. La voyelle finale normale est **-u**.\n\n## Pas à pas\n1. Prends la racine : ع ب د (adorer, servir).\n2. Mets-la dans le moule يَفْعُلُ : **يَعْبُدُ** = il adore.\n3. Change la **lettre du début** pour changer de personne : نَعْبُدُ = **nous** adorons.\n4. Pour « ils / vous », ajoute aussi une fin : يَعْبُدُونَ (ils adorent).\n\n## Les lettres du début : « أَنَيْتُ »\nPour les retenir, on dit **أَنَيْتُ** (anaytu) :\n| Lettre | Personne | Exemple |\n|---|---|---|\n| أَ | je | أَعْبُدُ |\n| نَ | nous | نَعْبُدُ |\n| يَ | il / ils | يَعْبُدُ / يَعْبُدُونَ |\n| تَ | tu / elle / vous | تَعْبُدُ / تَعْبُدُونَ |\n\n## Le tableau complet\n| Personne | Forme | Sens |\n|---|---|---|\n| je | أَعْبُدُ | j'adore |\n| tu (homme) | تَعْبُدُ | tu adores |\n| tu (femme) | تَعْبُدِينَ | tu adores |\n| il | يَعْبُدُ | il adore |\n| elle | تَعْبُدُ | elle adore |\n| nous | نَعْبُدُ | nous adorons |\n| vous | تَعْبُدُونَ | vous adorez |\n| ils | يَعْبُدُونَ | ils adorent |\n\n« tu » et « elle » ont la même forme (تَعْبُدُ) : le contexte décide.\n\n## La voyelle du milieu\nLe moule a trois variantes : يَفْعُلُ (يَعْبُدُ), يَفْعِلُ (يَضْرِبُ), يَفْعَلُ (يَعْلَمُ). Il n'y a pas de règle simple : on l'apprend avec chaque verbe. Le dictionnaire de l'atelier te montre la forme correcte.\n\n## Le futur\nPour un futur clair, on met **سَـ** (bientôt) ou **سَوْفَ** devant : سَيَعْلَمُونَ = ils sauront.\n\n## Dans le Coran\n@coran 1:5 | 2,4 | نَعْبُدُ / نَسْتَعِينُ : نَـ = « nous ». « C'est Toi que nous adorons, et Toi dont nous demandons l'aide ».\n@coran 2:3 | 2,4,8 | يُؤْمِنُونَ … يُقِيمُونَ … يُنفِقُونَ : يَـ + ـُونَ = « ils ». Trois actions habituelles.\n@coran 113:1 | 2 | أَعُوذُ : أَ = « je ». « Je cherche refuge ».\n\n## Les pièges\n- La fin **-ūna** (ils / vous) perd son **-na** après certains petits mots (لَمْ, أَنْ, لِـ) : voir la fiche des modes.\n- Au présent, la 1re lettre peut avoir **ḍamma** (يُـ) au lieu de fatḥa : يُؤْمِنُ, يُقِيمُ. C'est le cas des verbes « dérivés » (formes II, III, IV). La lettre veut toujours dire la même personne.\n- Ne confonds pas تَـ (tu / elle) avec un ت de la racine : regarde le schème.\n\n## Pour vérifier\n> Que veut dire يَعْلَمُونَ ? Et أَعْلَمُ ?\n> Réponse : **ils savent** (يَـ … ـُونَ) ; **je sais** (أَ).","pronoms":"## En bref\nLes pronoms « mon, ton, son, le, lui… » se **collent à la fin** du mot. Le même pronom change de sens selon ce qui le porte : un **nom** (mon, ton), un **verbe** (me, te) ou une **préposition** (moi, toi).\n\n## Le tableau complet\n| Pronom | Sur un nom | Sur un verbe | Sur une préposition |\n|---|---|---|---|\n| ـِي / ـنِي | mon, ma (كِتَابِي) | me (عَلَّمَنِي) | moi (لِي) |\n| ـكَ | ton (m.) (رَبُّكَ) | te (أَعْطَيْنَاكَ) | toi (لَكَ) |\n| ـكِ | ton (f.) (رَبِّكِ) | te | toi |\n| ـهُ | son (à lui) (مَالُهُ) | le (أَنْزَلْنَاهُ) | lui (لَهُ) |\n| ـهَا | son (à elle) (أَثْقَالَهَا) | la | elle (فِيهَا) |\n| ـنَا | notre (رَبَّنَا) | nous (ٱهْدِنَا) | nous (لَنَا) |\n| ـكُمْ | votre (دِينُكُمْ) | vous | vous (لَكُمْ) |\n| ـهُمْ | leur (رَبَّهُمْ) | les | eux (عَلَيْهِمْ) |\n| ـهُنَّ | leur (f.) | les (f.) | elles |\n\n## Pas à pas\n1. Repère la fin du mot : est-ce une de ces terminaisons ?\n2. Regarde le mot qui la porte : nom, verbe ou préposition ?\n3. Choisis la bonne colonne du tableau.\nAttention : sur un verbe au passé, ـتَ, ـتُ, ـنَا, ـوا sont des **terminaisons de sujet** (« tu, je, nous, ils »), pas des compléments. أَنْعَمْتَ = **tu** as comblé.\n\n## Les changements de prononciation\n- Après **i** ou **y**, ـهُ → **ـهِ** et ـهُمْ → **ـهِمْ** : فِيهِ, عَلَيْهِمْ, رَبِّهِمْ.\n- Dans le Coran, ـهُ entre deux voyelles s'allonge en **hū** (petit و ۥ) : لَهُۥ = lahū.\n- Pour « me » sur un verbe, on ajoute un ن : عَلَّمَنِي (il **m'**a enseigné), pas عَلَّمِي.\n\n## Dans le Coran\n@coran 1:6 | 1 | ٱهْدِنَا : « guide-**nous** » (pronom sur un verbe).\n@coran 108:2 | 2 | لِرَبِّكَ : « pour **ton** Seigneur » (pronom sur un nom).\n@coran 111:2 | 3,4 | عَنْهُ (de **lui**) et مَالُهُۥ (**sa** fortune).\n@coran 97:1 | 2 | أَنزَلْنَٰهُ : أَنْزَلْ + نَا (sujet : **nous**) + هُ (complément : **le**) = « nous **l'**avons fait descendre ».\n\n## Les pièges\n- Un nom avec un pronom possessif est **défini** : jamais de ال ni de tanwīn.\n- ـكَ et ـكِ s'écrivent pareil sans voyelles : seule la voyelle dit si on parle à un homme ou à une femme (89:28 رَبِّكِ s'adresse à l'âme, féminin).\n\n## Pour vérifier\n> Que veut dire رَبَّنَا ?\n> Réponse : « **notre** Seigneur » (souvent « ô notre Seigneur ! » dans les invocations).","qalqala":"## En bref\nLa **qalqala** (القَلْقَلَة, écho, rebond) touche 5 lettres : **ق ط ب ج د**. Quand l'une d'elles n'a **pas de voyelle** (soukoun), on la fait **rebondir** légèrement : un petit écho, sans ajouter de vraie voyelle. Pour retenir les lettres : **قُطْبُ جَدٍّ** (quṭbu jaddin).\n\n## Pourquoi ?\nCes 5 lettres « ferment » complètement la bouche ou la gorge. Sans voyelle, elles deviendraient presque inaudibles. Le rebond permet de les entendre.\n\n## Pas à pas\n1. Repère une lettre ق ط ب ج د.\n2. Elle porte un **soukoun ْ** ? Fais un petit rebond : يَلِدْ = yali**d·**.\n3. Elle est **la dernière lettre du verset** (à l'arrêt) ? Le rebond est plus fort : ٱلْفَلَقِ → al-fala**q·**.\n4. Elle porte une voyelle (a, i, u) ? Pas de qalqala, on lit normalement.\n\n## Les degrés\n| Où | Force | Exemple |\n|---|---|---|\n| au milieu d'un mot, avec soukoun | petit rebond | ٱقْرَأْ (iq·raʾ) |\n| à la fin d'un mot, avec soukoun | rebond moyen | لَمْ يَلِدْ |\n| à l'arrêt, en fin de verset | rebond fort | ٱلصَّمَدُ → aṣ-ṣamad· |\n| à l'arrêt, avec chadda | le plus fort | بِٱلْحَقِّ → bil-ḥaqq· |\n\n## Dans le Coran\n@coran 113:1 | 4 | ٱلْفَلَقِ : ق en fin de verset : qalqala forte à l'arrêt.\n@coran 112:3 | 2,4 | يَلِدْ … يُولَدْ : د avec soukoun : petit rebond.\n@coran 112:2 | 2 | ٱلصَّمَدُ : د en fin de verset : à l'arrêt, ṣamad· rebondit.\n@coran 96:1 | 1 | ٱقْرَأْ : ق avec soukoun au milieu du mot : iq·raʾ.\n\n## Les pièges\n- Le rebond ne doit pas devenir une voyelle : ne dis pas « yalidé » ni « falaqa ».\n- Seules ces 5 lettres font la qalqala. Un ك ou un ت avec soukoun n'en ont pas.\n- Avec « 🎨 prononciation », l'atelier colore la qalqala en bleu.\n\n## Pour vérifier\n> Dans وَقَبَ (113:3), où est la qalqala quand on s'arrête ?\n> Réponse : sur le **ب final** : à l'arrêt, la voyelle tombe (waqab·) et le ب rebondit.","racine":"## En bref\nUn mot arabe se construit presque toujours sur **trois consonnes**. Ces trois lettres portent une idée. On les appelle la **racine** (en arabe : jadhr, الجَذْر, « la racine de l'arbre »).\n\n## Pas à pas\n1. On prend trois consonnes, par exemple **ك ت ب** (k, t, b). Elles portent l'idée d'« écrire ».\n2. On les met dans un **moule** : on ajoute des voyelles entre elles, parfois une lettre devant, au milieu ou à la fin.\n3. Chaque moule donne un sens précis : celui qui fait, la chose faite, le lieu, l'action…\n4. Les trois lettres de la racine restent **dans le même ordre**, même quand d'autres lettres s'ajoutent autour.\n\n| Mot | Lecture | Sens | Ce qui s'ajoute |\n|---|---|---|---|\n| كَتَبَ | kataba | il a écrit | seulement des voyelles |\n| كَاتِب | kātib | celui qui écrit | un ا après la 1re lettre |\n| كِتَاب | kitāb | un livre | un ا avant la dernière lettre |\n| مَكْتَب | maktab | un bureau (le lieu où on écrit) | مَـ devant |\n| مَكْتُوب | maktūb | écrit (ce qui est écrit) | مَـ devant, و avant la fin |\n\n## Comment trouver la racine d'un mot\n1. Enlève ce qui est collé devant : **ال** (le), **وَ** (et), **بِ لِ فَ** (par, pour, alors).\n2. Enlève ce qui est collé derrière : les pronoms (**ـهُ ـكَ ـهُمْ**…), **ـة**, les fins de pluriel (**ـونَ ـِينَ ـَات**).\n3. Enlève les « lettres de service » qui servent souvent à faire les moules : **ا و ي** au milieu, **مـ** au début, **تـ** au début.\n4. Il reste en général **trois consonnes** : c'est la racine.\n\nExemple : ٱلْمُسْلِمُونَ → on enlève ال, مُـ et ـونَ → il reste **س ل م** (la paix, la soumission). On retrouve la même racine dans سَلَام (salām, la paix) et إِسْلَام (islām).\n\n## Dans le Coran\nLa première révélation (sourate 96) joue avec deux racines : **ق ر أ** (lire) et **ع ل م** (savoir).\n@coran 96:1 | 1 | ٱقْرَأْ : racine ق ر أ, « lis ! ». Le mot قُرْآن (Coran) a la même racine : « la lecture, ce qu'on récite ».\n@coran 96:5 | 1,5 | عَلَّمَ (il a enseigné) et يَعْلَمْ (il sait) : même racine ع ل م, deux moules différents.\n@coran 1:2 | 4 | ٱلْعَٰلَمِينَ (les mondes) : encore ع ل م. Les savants expliquent : le monde est « ce par quoi on connaît » le Créateur.\n\n## Les pièges\n- Une lettre **doublée** par la chadda (ّ) compte une seule fois dans la racine : عَلَّمَ → ع ل م.\n- Certaines racines contiennent **و** ou **ي** : ces lettres faibles peuvent disparaître ou se transformer. قَالَ (il a dit) vient de **ق و ل** : le و est devenu ا. قُلْ (dis !) n'a plus que deux lettres visibles.\n- Quelques mots très courts ou étrangers n'ont pas de racine claire (des noms propres, des particules comme فِي ou مِنْ).\n\n## Pour vérifier\n> Quelle est la racine de **مَسْجِد** (mosquée, « le lieu où l'on se prosterne ») ?\n> Réponse : on enlève مَـ (lieu) → **س ج د** (se prosterner). On la retrouve dans سَجَدَ (il s'est prosterné) et سُجُود (la prosternation).\n\nDans l'atelier, la fiche de chaque mot donne sa racine. Le **Dictionnaire** permet de chercher « par racine » pour voir toute la famille d'un coup.","scheme":"## En bref\nLe **moule** (en arabe : wazn, الوَزْن, « la pesée ») est la forme dans laquelle on verse une racine. La racine donne l'idée, le moule donne la nuance : qui fait, ce qui est fait, l'endroit, l'intensité.\n\n## Les lettres ف ع ل : le modèle\nPour parler des moules sans prendre une racine précise, les grammairiens utilisent les trois lettres **ف ع ل** (f, ʿ, l), qui veulent dire « faire ». Chaque fois qu'on lit **fāʿil**, **mafʿūl**, **fiʿāl**…, il faut remplacer f, ʿ, l par les trois lettres de la racine.\n\n| Moule | Sens du moule | Avec ك ت ب | Avec ع ل م |\n|---|---|---|---|\n| فَاعِل fāʿil | celui qui fait | كَاتِب kātib, écrivain | عَالِم ʿālim, savant |\n| مَفْعُول mafʿūl | celui qui subit, ce qui est fait | مَكْتُوب maktūb, écrit | مَعْلُوم maʿlūm, connu |\n| فِعَال fiʿāl | souvent un nom de chose | كِتَاب kitāb, livre | — |\n| مَفْعَل mafʿal | le lieu de l'action | مَكْتَب maktab, bureau | مَعْلَم maʿlam, repère |\n| فَعِيل faʿīl | une qualité durable | — | عَلِيم ʿalīm, Très-Savant |\n| فَعَّال faʿʿāl | celui qui fait beaucoup | — | عَلَّام ʿallām, qui sait tout |\n\n## Pas à pas : lire un moule\n1. Repère les trois lettres de la racine dans le mot.\n2. Regarde ce qui les entoure : voyelles longues, مَـ au début, chadda…\n3. Compare avec le tableau : tu sais déjà à moitié ce que veut dire le mot.\n\nExemple : **رَحِيم** (raḥīm). Racine ر ح م (la miséricorde). Moule **faʿīl** (qualité durable) → « celui qui est toujours miséricordieux ». À côté, **رَحْمَٰن** (raḥmān) est sur le moule **faʿlān** : une qualité débordante, immense. Les deux noms de la basmala sont donc deux moules différents de la même racine.\n\n## Dans le Coran\n@coran 1:1 | 3,4 | ٱلرَّحْمَٰنِ (moule faʿlān : miséricorde immense) et ٱلرَّحِيمِ (moule faʿīl : miséricorde constante).\n@coran 1:7 | 6,9 | ٱلْمَغْضُوبِ (moule mafʿūl : ceux qui ont subi la colère) et ٱلضَّآلِّينَ (moule fāʿil au pluriel : ceux qui s'égarent).\n@coran 109:1 | 3 | ٱلْكَٰفِرُونَ : moule fāʿil au pluriel, « ceux qui renient ».\n\n## Les verbes aussi ont des moules\nLes verbes ont dix moules principaux, appelés **formes** (I à X). La forme II double la lettre du milieu et donne souvent l'idée de « faire faire » : عَلِمَ (savoir) → **عَلَّمَ** (faire savoir = enseigner). La forme X ajoute اسْتَـ et donne souvent l'idée de « demander » : غَفَرَ (pardonner) → **ٱسْتَغْفَرَ** (demander pardon). La fiche de chaque verbe dans l'atelier indique sa forme.\n\n## Les pièges\n- Le même moule peut avoir plusieurs usages : فِعَال donne des noms (كِتَاب) mais aussi des pluriels (رِجَال, des hommes).\n- Avec une racine qui contient و ou ي, le moule semble « abîmé » : قَائِل (celui qui dit) est bien fāʿil de ق و ل, mais le و est devenu ئ.\n\n## Pour vérifier\n> Sur le moule fāʿil, que donne la racine ص ب ر (patienter) ?\n> Réponse : **صَابِر** (ṣābir), « celui qui patiente ». Au pluriel : ٱلصَّابِرُونَ / ٱلصَّابِرِينَ.","solaires":"## En bref\nL'article **ٱلْ** (« le, la ») se prononce **al-** devant 14 lettres (les lettres **lunaires**). Devant les 14 autres (les lettres **solaires**), le **l ne se prononce pas** : il se fond dans la lettre suivante, qui est **doublée** (elle porte une chadda ّ).\n- Lunaire : ٱلْقَمَرُ = **al-q**amaru (on entend le l, il porte un soukoun ْ).\n- Solaire : ٱلشَّمْسُ = **ash-sh**amsu (pas de l, la ش est doublée).\n\n## Pas à pas\n1. Repère l'article ٱلْ.\n2. Regarde la lettre juste après.\n3. Elle porte une **chadda ّ** ? Lettre solaire : saute le l et double la lettre. ٱلرَّحْمَٰنُ = ar-raḥmānu.\n4. Le ل porte un **soukoun ْ** ? Lettre lunaire : prononce al-. ٱلْحَمْدُ = al-ḥamdu.\n\n## Les deux familles\n| Lettres solaires (l muet) | Lettres lunaires (l prononcé) |\n|---|---|\n| ت ث د ذ ر ز س ش ص ض ط ظ ل ن | ء ب ج ح خ ع غ ف ق ك م ه و ي |\n\nMoyen de s'en souvenir : les lettres solaires se prononcent **avec le bout de la langue**, au même endroit que le l. Le l « disparaît » dans elles. Les lunaires se prononcent ailleurs (gorge, lèvres, fond de la bouche).\n\n## Dans le Coran\n@coran 1:3 | 1,2 | ٱلرَّحْمَٰنِ ٱلرَّحِيمِ : ر est solaire : ar-raḥmāni r-raḥīm.\n@coran 1:6 | 2,3 | ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ : ص solaire (aṣ-ṣirāṭa), م lunaire (al-mustaqīm).\n@coran 114:1 | 4 | ٱلنَّاسِ : ن solaire : an-nās.\n@coran 1:2 | 1 | ٱلْحَمْدُ : ح lunaire : al-ḥamdu.\n\n## Les pièges\n- Dans ٱللَّهُ, le ل de l'article et celui du mot se fondent : **Allāh**.\n- Au milieu de la phrase, le ٱ est aussi muet : وَٱلشَّمْسِ = wa-sh-shamsi.\n- Le l de l'article reste **écrit** même quand il est muet. Avec « 🎨 prononciation », l'atelier le colore en gris.\n\n## Pour vérifier\n> Comment lit-on ٱلنُّور et ٱلْكِتَاب ?\n> Réponse : **an-nūr** (ن solaire) et **al-kitāb** (ك lunaire).","sujet":"## En bref\nLe **mubtadaʾ** (المُبْتَدَأ, « ce par quoi on commence ») est le **sujet d'une phrase nominale** : le mot dont on parle. Il est au **nominatif** et en général **défini**.\n\n## Pas à pas\n1. Il ouvre la phrase (sauf quand l'attribut passe devant).\n2. Il est défini : avec ال, un nom propre, un pronom (هُوَ, أَنْتَ), un démonstratif (هَٰذَا, ذَٰلِكَ), ou un nom suivi d'un complément du nom.\n3. Il est au nominatif : -u, ـُونَ, ـَانِ.\n\n## Ce qui peut être mubtadaʾ\n| Type | Exemple | Sens |\n|---|---|---|\n| nom avec ال | ٱلْحَمْدُ لِلَّهِ | la louange (est) à Allah |\n| nom propre | ٱللَّهُ ٱلصَّمَدُ | Allah (est) l'Absolu |\n| pronom | هُوَ ٱللَّهُ | Il (est) Allah |\n| démonstratif | ذَٰلِكَ ٱلْكِتَابُ | c'est le Livre |\n| annexion | لَيْلَةُ ٱلْقَدْرِ خَيْرٌ | la nuit du Destin (est) meilleure |\n\n## Dans le Coran\n@coran 1:2 | 1 | ٱلْحَمْدُ : le sujet, au nominatif.\n@coran 112:1 | 2 | هُوَ : le pronom « Il » est le sujet de « Il est Allah ».\n@coran 2:2 | 1 | ذَٰلِكَ : le démonstratif « cela » ouvre la phrase.\n\n## Le sujet placé après\nQuand le sujet est **indéfini**, il vient **après** son attribut : لَهُمْ عَذَابٌ (pour eux, un châtiment). Il s'appelle alors « mubtadaʾ muʾakhkhar » (sujet retardé), mais il reste au nominatif.\n\n## Les pièges\n- Après إِنَّ, le sujet passe à l'**accusatif** : إِنَّ ٱلْإِنْسَانَ.\n- Ne le confonds pas avec le **sujet d'un verbe** (fāʿil), qui vient après le verbe.\n\n## Pour vérifier\n> Quel est le sujet dans وَرَبُّكَ ٱلْأَكْرَمُ (96:3) ?\n> Réponse : **رَبُّكَ** (ton Seigneur), défini par le pronom ـكَ. ٱلْأَكْرَمُ (le Très-Noble) est l'attribut.","tanwin":"## En bref\nLe **tanwīn** (التَّنْوِين) est une voyelle **écrite deux fois** à la fin d'un nom. On l'entend comme un **n** : -un, -an, -in. Il veut dire que le nom est **indéfini** : « un, une ».\n\n## Pas à pas\n| Signe | Lecture | Cas | Exemple |\n|---|---|---|---|\n| ـٌ | -un | nominatif | كِتَابٌ kitābun |\n| ـً | -an | accusatif | كِتَابًا kitāban |\n| ـٍ | -in | génitif | كِتَابٍ kitābin |\n\n1. Le **n** s'entend, mais on ne l'écrit pas avec la lettre ن : c'est le signe doublé qui le montre.\n2. Pour **-an**, on ajoute en général un **alif** après : كِتَابًا. Cet alif ne se prononce pas (sauf à l'arrêt, où -an devient ā).\n3. Pas d'alif après ـً quand le mot finit par **ة** (رَحْمَةً) ou par une hamza après alif (سَمَاءً).\n4. Un nom avec tanwīn n'a **jamais** ال, ni pronom collé.\n\n## Dans le Coran\n@coran 112:1 | 4 | أَحَدٌ (aḥadun) : « un, unique » — tanwīn -un.\n@coran 112:4 | 4,5 | كُفُوًا (kufuwan, -an avec l'alif muet) et أَحَدٌ (-un).\n@coran 103:2 | 4 | خُسْرٍ (khusrin) : tanwīn -in, après la préposition فِي.\n\n## À l'arrêt (fin de verset)\nQuand on s'arrête sur un mot avec tanwīn :\n- **-un** et **-in** disparaissent : أَحَدٌ se lit **aḥad** ;\n- **-an** devient **ā** : أَفْوَاجًا se lit **afwājā**.\nC'est pour cela que tu entends « qul huwa llāhu aḥad » et non « aḥadun ».\n\n## Le tanwīn et la lettre qui suit\nComme le tanwīn est un vrai son « n », il suit les règles de prononciation du n : devant certaines lettres il se fond, se cache ou devient m (voir « La nasalisation »). Exemple : هُدًى لِّلْمُتَّقِينَ se lit **hudal-lil**-muttaqīn : le n disparaît dans le l.\n\n## Les pièges\n- Certains noms n'acceptent **jamais** le tanwīn : les noms diptotes (voir « Les noms diptotes »), par exemple إِبْرَاهِيمُ.\n- ـً + ى : عَلَى هُدًى. Ici le ى est un support, on lit **hudan**.\n\n## Pour vérifier\n> Comment lire رَسُولًا ?\n> Réponse : **rasūlan** (« un messager », accusatif). L'alif final ne se lit pas, sauf à l'arrêt : rasūlā.","verbale":"## En bref\nUne **phrase verbale** commence par un **verbe**. L'ordre habituel est : **verbe → sujet (-u) → complément (-a)**.\n\n## Pas à pas\nConstruisons « l'enfant a écrit la leçon » :\n1. Le verbe : **كَتَبَ** (il a écrit).\n2. Le sujet, au nominatif : **ٱلْوَلَدُ** (l'enfant).\n3. Le complément, à l'accusatif : **ٱلدَّرْسَ** (la leçon).\n4. Ensemble : **كَتَبَ ٱلْوَلَدُ ٱلدَّرْسَ** = a écrit l'enfant la leçon.\n\n## L'ordre peut changer\nGrâce aux cas, on peut déplacer les mots : كَتَبَ ٱلدَّرْسَ ٱلْوَلَدُ veut dire la même chose. Le **-u** dit qui est le sujet, le **-a** dit qui est le complément. Mettre un mot en avant sert à **insister** : إِيَّاكَ نَعْبُدُ = c'est **Toi** que nous adorons.\n\n## L'accord du verbe\n- Quand le verbe est **avant** le sujet, il reste **au singulier** (il s'accorde seulement en genre) : جَاءَ ٱلرِّجَالُ (les hommes sont venus), جَاءَتِ ٱلنِّسَاءُ (les femmes sont venues).\n- Quand le sujet est **avant** le verbe, le verbe s'accorde complètement : ٱلرِّجَالُ جَاءُوا.\n\n## Le sujet caché\nSi le sujet est un pronom (je, tu, nous…), il n'y a pas de mot séparé : il est **dans la terminaison** du verbe. خَلَقْنَا = **nous** avons créé. رَأَيْتَ = **tu** as vu.\n\n## Dans le Coran\n@coran 110:1 | 2,3 | جَآءَ نَصْرُ ٱللَّهِ : verbe + sujet au nominatif.\n@coran 99:2 | 1,2,3 | وَأَخْرَجَتِ ٱلْأَرْضُ أَثْقَالَهَا : verbe + sujet (-u) + complément (-a). Le verbe est au féminin, comme ٱلْأَرْض.\n@coran 105:1 | 4,5 | فَعَلَ رَبُّكَ : « ton Seigneur a agi ».\n@coran 1:5 | 1,2 | إِيَّاكَ نَعْبُدُ : complément placé **avant** le verbe pour insister.\n\n## Les pièges\n- Le verbe ne s'accorde pas en nombre avec un sujet placé après : ne pas écrire جَاءُوا ٱلرِّجَالُ.\n- Un nom placé avant le verbe transforme la phrase en phrase nominale (le nom devient sujet, la phrase verbale devient son attribut).\n\n## Pour vérifier\n> Dans أَكَلَ ٱلتُّفَّاحَةَ ٱلْوَلَدُ, qui a mangé quoi ?\n> Réponse : **l'enfant** (ٱلْوَلَدُ, -u) a mangé **la pomme** (ٱلتُّفَّاحَةَ, -a).","waqf":"## En bref\nLe **waqf** (الوَقْف) est la façon de **s'arrêter** (en fin de verset ou pour respirer). Quand on s'arrête sur un mot, **sa dernière voyelle ne se prononce pas** : on finit sur une consonne (soukoun).\n- ٱلْعَٰلَمِينَ → al-ʿālamīn (le -a tombe) ;\n- أَحَدٌ → aḥad (le -un tombe) ;\n- ٱلْقَارِعَةُ → al-qāriʿah (ة devient h).\n\n## Pas à pas\n1. Tu t'arrêtes sur un mot ? Regarde sa fin.\n2. Voyelle courte (a, i, u) ou tanwīn -un / -in : **supprime-la**. ٱلرَّحِيمِ → ar-raḥīm.\n3. Tanwīn **-an** (ـًا) : remplace-le par **ā**. تَوَّابًا → tawwābā.\n4. **ة** (tāʾ marbūṭa) : dis **h**. ٱلْقَارِعَةُ → al-qāriʿah.\n5. Voyelle **longue** à la fin (ā, ī, ū) : garde-la. ٱلْأَعْلَى → al-aʿlā.\n\n## Le tableau\n| Fin écrite | À l'arrêt | Exemple |\n|---|---|---|\n| ـَ ـِ ـُ | soukoun | ٱلْكَوْثَرَ → al-kawthar |\n| ـٌ ـٍ | soukoun | أَحَدٌ → aḥad |\n| ـًا | ā | تَوَّابًا → tawwābā |\n| ـَةُ / ـَةٍ | h | ٱلْقَارِعَةُ → al-qāriʿah |\n| voyelle longue | inchangée | ٱلْأَعْلَىٰ → al-aʿlā |\n\n## Les signes d'arrêt dans le Coran\nAu-dessus du texte, de petits signes guident la respiration :\n| Signe | Sens |\n|---|---|\n| ۝ (fin de verset) | arrêt conseillé |\n| مـ | arrêt obligatoire (sinon le sens change) |\n| ۚ (ج) | arrêt permis |\n| ۖ (صلى) | continuer est mieux |\n| ۗ (قلى) | s'arrêter est mieux |\n| لا | ne pas s'arrêter ici |\n| ۛ ۛ (trois points, deux fois) | s'arrêter à l'un des deux, pas aux deux |\n\n## Dans le Coran\n@coran 1:2 | 4 | ٱلْعَٰلَمِينَ : à l'arrêt, al-ʿālamīn (le -a final tombe).\n@coran 112:4 | 5 | أَحَدٌ : à l'arrêt, aḥad.\n@coran 110:3 | 7 | تَوَّابًۢا : à l'arrêt, -an devient ā : tawwābā.\n@coran 101:1 | 1 | ٱلْقَارِعَةُ : ة à l'arrêt se prononce h : al-qāriʿah.\n\n## Les pièges\n- On ne s'arrête pas au milieu d'un mot, ni entre un mot et son article.\n- Si tu dois t'arrêter à un mauvais endroit (respiration), **reprends un ou deux mots avant**.\n- Les terminaisons de cas (-u, -a, -i) disparaissent à l'arrêt : c'est pour ça qu'on ne les entend pas en fin de verset.\n- Avec « 🎨 prononciation », l'atelier souligne en pointillé la voyelle qui tombe à l'arrêt.\n\n## Pour vérifier\n> Comment dit-on ٱلْقَدْرِ (97:1) en s'arrêtant ?\n> Réponse : **al-qadr** : le -i final tombe (et le ر garde son r).","wasla":"## En bref\nLe **alif de liaison** (hamzat al-waṣl, هَمْزَة الوَصْل) s'écrit **ٱ** dans le Coran (un alif avec un petit ص dessus). Il sert seulement à **commencer** un mot qui débute par deux consonnes. **Au début** de la lecture, on le prononce (a, i ou u). **Au milieu** d'une phrase, il est **muet** : on enchaîne directement avec le mot d'avant.\n\n## Pas à pas\n1. Repère le ٱ : ٱلْحَمْدُ.\n2. Tu commences la lecture par ce mot ? Prononce-le : **a**l-ḥamdu.\n3. Il y a un mot avant ? Saute le ٱ et colle la suite au mot d'avant : بِٱسْمِ = **bi-smi**, pas « bi-ismi ».\n4. Si le mot d'avant finit par une consonne (soukoun), ajoute une petite voyelle pour faire le pont, souvent **i** : قُلِ ٱللَّهُمَّ.\n\n## Quelle voyelle au début ?\n| Où | Voyelle | Exemple |\n|---|---|---|\n| article ٱلْ | a | ٱلْحَمْدُ = al-ḥamdu |\n| impératif avec -u au milieu | u | ٱعْبُدُوا = uʿbudū |\n| impératif avec -a / -i au milieu | i | ٱقْرَأْ = iqraʾ, ٱهْدِنَا = ihdinā |\n| quelques noms : ٱسْم, ٱبْن, ٱمْرَأَة | i | ٱسْمَ = isma |\n| verbes longs (formes VII à X) | i | ٱسْتَغْفِرْ = istaghfir |\n\n## Ne pas confondre avec أ\n- **أ / إ** (avec une hamza) : toujours prononcé, même au milieu : وَأَقِيمُوا = wa-**a**qīmū.\n- **ٱ** (alif de liaison) : muet au milieu : وَٱرْكَعُوا = wa-rkaʿū.\n\n## Dans le Coran\n@coran 1:6 | 1,2 | ٱهْدِنَا ٱلصِّرَٰطَ : début de verset, on dit **i**hdinā ; puis ٱلصِّرَٰطَ s'enchaîne : ihdina-ṣ-ṣirāṭa.\n@coran 96:1 | 1,2 | ٱقْرَأْ بِٱسْمِ : iqraʾ (prononcé) puis bi-smi (muet).\n@coran 2:43 | 3,5 | وَءَاتُوا۟ … وَٱرْكَعُوا۟ : ء se prononce (wa-ātū) ; ٱ ne se prononce pas (wa-rkaʿū).\n\n## Les pièges\n- Une voyelle longue avant ٱ **se raccourcit** à la prononciation : فِى ٱلْأَرْضِ = fi-l-arḍi (le ī devient i).\n- L'atelier, avec « 🎨 prononciation », colore en gris les ٱ muets.\n\n## Pour vérifier\n> Comment lit-on وَٱللَّهُ ?\n> Réponse : **wa-llāhu** : le ٱ est muet car il y a وَ avant."}};
const CONTENT = {"fr":{"cartes":[{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Accusatif.md","text":"---\ntype: flashcards\nrègle: L'accusatif (naṣb)\n---\n# 🃏 L'accusatif (naṣb) : cartes\n\n#flashcards/arabe/regles/1-cas/accusatif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Nominatif]] · [[Cartes - Complément d'objet]] · [[Cartes - Inna et ses sœurs]] · [[Cartes - Kana et ses sœurs]] · Règle complète : Atelier arabe › Règles › « L'accusatif »\n\n> [!tip] Le fil rouge de ce paquet\n> L'accusatif, c'est la fin **-a** (ـَ), ou **-an** (ـًا) sans ال. Son emploi le plus fréquent : le **complément d'objet** (« qui ? quoi ? » après le verbe).\n> Mais il a beaucoup d'autres emplois : après إِنَّ, l'attribut de كَانَ, le temps, l'état…\n\n## 1. Reconnaître l'accusatif\n\nQuelle est la marque de l'**accusatif** (naṣb) ?\n?\n- **-a** (fatḥa ـَ) avec ال : الْكِتَابَ (*al-kitāb**a***)\n- **-an** (tanwīn ـً + un alif) sans ال : كِتَابًا (*kitāb**an***)\n- **ـِينَ** au pluriel masculin ; **ـَيْنِ** au duel\nUn mot à l'accusatif est dit **manṣūb** (مَنْصُوب), « dressé ».\n\nPourquoi écrit-on un **alif** après le tanwīn -an : كِتَابًا ?\n?\nC'est une habitude d'écriture : le tanwīn -an porte en général un **alif** (ـًا).\nCet alif **ne se prononce pas** au milieu de la phrase : *kitāban*. À l'**arrêt**, -an devient **ā** : *kitābā*.\nPas d'alif après **ة** (رَحْمَةً) ni après une hamza précédée d'alif (سَمَاءً).\n\nCite **5 emplois** fréquents de l'accusatif.\n?\n1. **Complément d'objet** : خَلَقَ **الْإِنْسَانَ** (il a créé l'homme)\n2. **Sujet après إِنَّ** : إِنَّ **اللَّهَ** غَفُورٌ\n3. **Attribut après كَانَ** : كَانَ اللَّهُ **غَفُورًا**\n4. **Temps ou lieu** : **يَوْمَ** الْقِيَامَةِ (le jour de la Résurrection)\n5. **État** (ḥāl) : ارْجِعِي **رَاضِيَةً** (reviens, satisfaite)\nEt aussi : après لَا « aucun » (لَا رَيْبَ), après إِلَّا (« sauf »), le complément absolu.\n\n## 2. Pourquoi cette terminaison ?\n\nاهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ (1:6) : pourquoi الصِّرَاطَ et الْمُسْتَقِيمَ finissent-ils par **-a** ?\n?\n*ihdinā ṣ-ṣirāṭ**a** l-mustaqīm**a*** = « guide-nous sur le chemin droit ».\n- **الصِّرَاطَ** : guide-nous **quoi** ? le chemin. C'est le **complément** du verbe : accusatif -a.\n- **الْمُسْتَقِيمَ** : son **adjectif**, qui copie le -a.\n\nإِنَّ الْإِنْسَانَ لَفِي خُسْرٍ (103:2) : pourquoi الْإِنْسَانَ finit-il par **-a** alors que c'est le sujet ?\n?\nÀ cause de **إِنَّ** (« certes ») devant. إِنَّ met le **sujet** de la phrase nominale à l'accusatif.\nSans إِنَّ : الْإِنْسَانُ فِي خُسْرٍ (-u). Avec إِنَّ : **الْإِنْسَانَ** (-a).\n\nإِنَّهُ كَانَ تَوَّابًا (110:3) : pourquoi تَوَّابًا finit-il par **-an** ?\n?\n*innahu kāna tawwāb**an*** = « Il est toujours Accueillant au repentir ».\nتَوَّابًا est l'**attribut** de **كَانَ**. كَانَ met l'attribut à l'accusatif. Il est sans ال : **-an**.\n\nوَرَأَيْتَ النَّاسَ يَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا (110:2) : pourquoi النَّاسَ et أَفْوَاجًا ont-ils **-a / -an** ?\n?\n« Et tu as vu les gens entrer dans la religion d'Allah **en foule** ».\n- **النَّاسَ** (-a) : tu as vu **qui** ? les gens. **Complément** du verbe رَأَيْتَ.\n- **أَفْوَاجًا** (-an) : **comment** entrent-ils ? en foule. C'est un **ḥāl** (état) : accusatif indéfini.\n\nإِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ (108:1) : pourquoi الْكَوْثَرَ finit-il par **-a** ?\n?\n« Nous t'avons donné **l'Abondance** ».\nLe verbe « donner » a **deux** compléments : ـكَ (toi) et **الْكَوْثَرَ** (l'Abondance). Les deux sont à l'accusatif ; seul le second montre son -a.\n\nذَلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ (2:2) : pourquoi رَيْبَ finit-il par **-a** sans tanwīn ?\n?\n« Ce Livre, **aucun doute** en lui ».\nAprès **لَا** qui veut dire « **aucun** » (négation totale), le nom est à l'accusatif et **perd son tanwīn** : لَا رَيْبَ, pas لَا رَيْبًا.\n\nخَلَقَ اللَّهُ السَّمَاوَاتِ : complément d'objet, mais fin **-i**. Pourquoi ?\n?\nالسَّمَاوَاتِ (les cieux) est un **pluriel féminin** en ـَات.\nCe pluriel ne prend **jamais** -a : à l'accusatif, il prend **-i** (ou -in). C'est quand même un accusatif.\nMême chose : عَمِلُوا **الصَّالِحَاتِ** (ils ont fait les bonnes œuvres).\n\n## 3. Contrastes\n\nإِنَّ اللَّهَ غَفُورٌ / كَانَ اللَّهُ غَفُورًا : où va le -a dans chaque phrase ?\n?\n- Avec **إِنَّ** : le **1er mot** (le sujet) prend -a : **اللَّهَ**. L'attribut reste غَفُورٌ.\n- Avec **كَانَ** : le **2e mot** (l'attribut) prend -a : **غَفُورًا**. Le sujet reste اللَّهُ.\nMémo : **inna, le 1er ; kāna, le 2e**.\n\nالرَّجُلُ الْمُسْرِعُ / جَاءَ الرَّجُلُ مُسْرِعًا : quelle différence ?\n?\n- الرَّجُلُ **الْمُسْرِعُ** : adjectif (avec ال, copie le -u) : « **l'homme pressé** ».\n- جَاءَ الرَّجُلُ **مُسْرِعًا** : ḥāl (sans ال, à l'accusatif -an) : « l'homme est venu **en se pressant** ».\nL'adjectif décrit **toujours**, le ḥāl décrit l'état **pendant l'action**.\n\nيَوْمُ الدِّينِ / يَوْمَ الْقِيَامَةِ : pourquoi -u dans un cas et -a dans l'autre ?\n?\n- **يَوْمُ** الدِّينِ (-u) : quand « le jour » est sujet : « le Jour du Jugement est proche ».\n- **يَوْمَ** الْقِيَامَةِ (-a) : quand il veut dire « **le jour où**, au jour de » (complément de **temps**) : accusatif.\nLe complément de temps répond à « **quand ?** » et prend -a.\n\n## 4. Les pièges\n\nL'accusatif est-il toujours après le verbe ?\n?\n**Non.** On peut le mettre **avant** pour insister : **إِيَّاكَ** نَعْبُدُ = « c'est **Toi** (et nul autre) que nous adorons ».\nEt il peut être **collé** au verbe comme pronom : اهْدِ**نَا** (guide-**nous**), أَنْزَلْنَا**هُ** (nous **l'**avons fait descendre).\n\nآمَنُوا بِاللَّهِ : اللَّه est-il complément d'objet à l'accusatif ?\n?\n**Non.** Le verbe آمَنَ (croire) se construit avec **بِـ** (« croire **en** »). Après une préposition : **génitif** (-i).\nSeuls les verbes **sans préposition** ont un complément à l'accusatif.\n\nUn nom avec -a après une préposition (عَلَى إِبْرَاهِيمَ) est-il à l'accusatif ?\n?\n**Non**, c'est un **génitif** d'un nom **diptote** : il remplace -i par -a.\nRègle : regarde **le mot d'avant**. Préposition = génitif, même si la fin est -a.\n\n## 5. À toi de construire\n\nDis en arabe : « j'ai lu le livre » (j'ai lu = قَرَأْتُ).\n?\n**قَرَأْتُ الْكِتَابَ** (*qaraʾtu l-kitāba*).\nLe livre est le complément : accusatif -a.\n\nDis en arabe : « il a écrit une lettre » (il a écrit = كَتَبَ, lettre = رِسَالَة).\n?\n**كَتَبَ رِسَالَةً** (*kataba risālatan*).\nComplément sans ال : -an. Pas d'alif après ة.\n\nMets إِنَّ devant : الْعِلْمُ نُورٌ (la science est une lumière).\n?\n**إِنَّ الْعِلْمَ نُورٌ** (*inna l-ʿilma nūrun*).\nLe sujet passe à -a, l'attribut reste à -un.\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Diptotes.md","text":"---\ntype: flashcards\nrègle: Les noms diptotes\n---\n# 🃏 Les noms diptotes : cartes\n\n#flashcards/arabe/regles/1-cas/diptotes\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Génitif]] · [[Tableau 2 - Les trois cas]] · Règle complète : Atelier arabe › Règles › « Les noms diptotes »\n\n> [!tip] Le fil rouge de ce paquet\n> Un diptote n'a que **deux** fins : **-u** et **-a**. Il refuse le **-i** et le **tanwīn**. Au génitif, il prend **-a**.\n\nQu'est-ce qu'un nom **diptote** ?\n?\nUn nom qui n'a que **deux** fins au lieu de trois : **-u** (nominatif) et **-a** (accusatif **et** génitif).\nIl ne prend **jamais** de tanwīn. En arabe : mamnūʿ min aṣ-ṣarf (« empêché de déclinaison complète »).\n\nCompare مُحَمَّد (normal) et إِبْرَاهِيم (diptote) dans les trois cas.\n?\n- nominatif : مُحَمَّدٌ (-un) / إِبْرَاهِيمُ (-u)\n- accusatif : مُحَمَّدًا (-an) / إِبْرَاهِيمَ (-a)\n- génitif : مُحَمَّدٍ (-in) / إِبْرَاهِيمَ (**-a** !)\n\nQuels noms sont diptotes ? (5 familles)\n?\n1. Les **noms propres étrangers** : إِبْرَاهِيم, يُوسُف, فِرْعَوْن\n2. Les **noms propres féminins** ou en ـة : مَكَّة, فَاطِمَة\n3. Le moule **أَفْعَل** (couleur, « plus… ») : أَكْبَر, أَسْوَد\n4. Certains **pluriels longs** : مَسَاجِد, مَصَابِيح\n5. Les noms en **ـَاء** : أَشْيَاء, أَوْلِيَاء\n\nعَلَى إِبْرَاهِيمَ : quel cas ? Pourquoi -a ?\n?\n**Génitif**, à cause de la préposition عَلَى.\nLa fin est **-a** car إِبْرَاهِيم est diptote : il remplace le -i par -a. Ce n'est **pas** un accusatif.\n\nفِي مَكَّةَ ou فِي مَكَّةٍ ?\n?\n**فِي مَكَّةَ** (*fī makkata*). مَكَّة est un nom propre de lieu en ـة : diptote. Pas de -i, pas de tanwīn.\n\nمَعَ هِبَةٍ : هِبَة (un don) est-il diptote ?\n?\n**Non.** C'est un **nom commun**. Seuls les **noms propres** en ـة sont diptotes.\nOn dit donc مَعَ هِبَةٍ (*maʿa hibatin*), avec tanwīn.\n\nQuand un diptote reprend-il le **-i** ?\n?\nQuand il a **ال** ou quand il est le **1er mot d'une annexion** :\n- فِي **الْمَسَاجِدِ** (dans les mosquées)\n- فِي **أَحْسَنِ** تَقْوِيمٍ (95:4, « dans la plus belle forme »)\n\nComment ne pas confondre un génitif diptote avec un accusatif ?\n?\nRegarde **le mot d'avant** :\n- une **préposition** ou un nom (« de ») → génitif diptote : بِإِبْرَاهِيمَ\n- un **verbe** → accusatif : رَأَيْتُ إِبْرَاهِيمَ\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Génitif.md","text":"---\ntype: flashcards\nrègle: Le génitif (jarr)\n---\n# 🃏 Le génitif (jarr) : cartes\n\n#flashcards/arabe/regles/1-cas/genitif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Prépositions]] · [[Cartes - Annexion]] · [[Cartes - Les trois cas]] · Règle complète : Atelier arabe › Règles › « Le génitif »\n\n> [!tip] Le fil rouge de ce paquet\n> Le génitif, c'est la fin **-i** (ـِ). Il n'a que **deux** emplois : **après une préposition**, et comme **2e nom de « le X de Y »**.\n\n## 1. Reconnaître le génitif\n\nQuelle est la marque du **génitif** (jarr) ?\n?\n- **-i** (kasra ـِ) avec ال : الْكِتَابِ (*al-kitāb**i***)\n- **-in** (tanwīn ـٍ) sans ال : كِتَابٍ (*kitāb**in***)\n- **ـِينَ** au pluriel masculin : الْعَالَمِينَ\n- **ـَيْنِ** au duel : رَجُلَيْنِ\nUn mot au génitif est dit **majrūr** (مَجْرُور), « tiré ».\n\nQuels sont les **deux seuls** emplois du génitif ?\n?\n1. **Après une préposition** : فِي **الْبَيْتِ** (dans la maison).\n2. **2e nom de « le X de Y »** (l'annexion) : رَبُّ **الْعَالَمِينَ** (le Seigneur **des** mondes).\nPlus : l'adjectif ou le mot relié par « et » à un génitif.\n\nComment reconnaître un génitif en 2 regards ?\n?\n1. Regarde **la fin** du mot : -i ? -in ? ـِينَ ?\n2. Regarde **le mot d'avant** : une **préposition** ? ou un **nom sans ال ni tanwīn** ?\nOui aux deux : c'est un génitif. Traduis avec « de » ou avec la préposition.\n\n## 2. Pourquoi cette terminaison ?\n\nبِسْمِ اللَّهِ : pourquoi **les deux** mots finissent-ils par **-i** ?\n?\n*bism**i** llāh**i*** = « au nom d'Allah ».\n- **اسْمِ** (-i) : après la préposition **بِـ**.\n- **اللَّهِ** (-i) : c'est le « de » : le nom **d'**Allah (2e nom de l'annexion).\nDeux raisons différentes, la même fin.\n\nبِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ : pourquoi الرَّحْمَنِ et الرَّحِيمِ finissent-ils par **-i** ?\n?\nCe sont des **adjectifs** (ou des noms qui précisent) de **اللَّهِ**.\nاللَّهِ est au génitif, et l'adjectif **copie** le cas de son nom : donc -i, -i.\n\nمَالِكِ يَوْمِ الدِّينِ : pourquoi يَوْمِ et الدِّينِ finissent-ils par **-i** ?\n?\n*māliki yawm**i** d-dīn**i*** = « le Maître **du** jour **du** Jugement ».\nC'est une **chaîne** d'annexions : chaque mot est le « de » du mot d'avant.\n- يَوْمِ : le « de » de مَالِكِ, donc génitif.\n- الدِّينِ : le « de » de يَوْمِ, donc génitif.\n\nرَبِّ الْعَالَمِينَ : pourquoi **ـِينَ** à la fin ?\n?\n*rabbi l-ʿālam**īna*** = « Seigneur **des** mondes ».\nالْعَالَمِينَ est le 2e nom de l'annexion : génitif. C'est un pluriel masculin : son génitif est **ـِينَ**.\n(À l'arrêt, on dit *al-ʿālamīn*.)\n\nنَصْرُ اللَّهِ : pourquoi نَصْرُ a -u et اللَّهِ a -i ?\n?\nDans « le X de Y », **seul Y** est forcément au génitif : **اللَّهِ** (-i).\n**X** (نَصْرُ) prend le cas de **son rôle** dans la phrase. Dans جَاءَ نَصْرُ اللَّهِ, le secours est le **sujet** : -u.\n\nغَيْرِ الْمَغْضُوبِ عَلَيْهِمْ : pourquoi الْمَغْضُوبِ finit-il par **-i** ?\n?\n*ghayri l-maghḍūb**i** ʿalayhim* = « autres que ceux qui ont encouru la colère ».\nغَيْرُ (« autre que ») est un **nom**, toujours suivi d'un complément du nom. الْمَغْضُوبِ est ce **2e nom** de l'annexion (« autres **que** ceux… »), donc génitif.\n\nفِي أَحْسَنِ تَقْوِيمٍ (95:4) : pourquoi تَقْوِيمٍ finit-il par **-in** ?\n?\n*fī aḥsani taqwīm**in*** = « dans la plus belle forme ».\nتَقْوِيم est le **2e nom** de l'annexion (« la plus belle **de** forme »). Génitif sans ال : **-in**.\nأَحْسَنِ, lui, est au génitif à cause de فِي.\n\n## 3. Contrastes : -u, -a ou -i ?\n\nبَيْتُ اللَّهِ / إِلَى بَيْتِ اللَّهِ / رَأَيْتُ بَيْتَ اللَّهِ : pourquoi بَيْت change-t-il, mais pas اللَّهِ ?\n?\n- **بَيْتُ** اللَّهِ (-u) : sujet, nominatif (« la Maison d'Allah est… »).\n- إِلَى **بَيْتِ** اللَّهِ (-i) : après la préposition إِلَى, génitif.\n- رَأَيْتُ **بَيْتَ** اللَّهِ (-a) : complément de « j'ai vu », accusatif.\n**اللَّهِ** reste à -i les trois fois : c'est toujours le « de ».\n\nالْمُسْلِمُونَ / الْمُسْلِمِينَ : laquelle est au génitif ? Et à l'accusatif ?\n?\n- **الْمُسْلِمُونَ** (ـُونَ) : nominatif seulement.\n- **الْمُسْلِمِينَ** (ـِينَ) : génitif **et** accusatif (même forme).\nPour savoir lequel des deux, regarde le mot d'avant : préposition ou nom = génitif ; verbe = accusatif.\n\nعَلَى إِبْرَاهِيمَ : génitif ou accusatif ?\n?\n**Génitif**, car il y a la préposition عَلَى devant.\nLa fin est **-a** parce que إِبْرَاهِيم est un nom **diptote** : il refuse le -i. Ce n'est pas un accusatif.\n\n## 4. Les pièges\n\nDans « le X de Y », lequel des deux noms est au génitif ?\n?\n**Y**, le second : رَسُولُ **اللَّهِ** (le messager **d'**Allah).\nX (رَسُولُ) n'est pas forcément au génitif : il prend le cas de son rôle. Et X n'a **jamais** ال ni tanwīn.\n\nعَلَيْهِمْ, لَهُ, بِهِ : où est le génitif ?\n?\nLe **pronom collé** (ـهِمْ, ـهُ) est « au génitif », mais **on ne le voit pas** : un pronom a une fin fixe.\nOn dit qu'il est « à la place d'un génitif ».\n\nLe pluriel féminin en ـَات au génitif ?\n?\n**-i** / **-in**, comme un singulier : فِي الْجَنَّاتِ, مِنْ ثَمَرَاتٍ.\nAttention : il garde aussi **-i** à l'accusatif (jamais -a) : عَمِلُوا الصَّالِحَاتِ. Donc pour ce pluriel, -i ne suffit pas à dire « génitif ».\n\n## 5. À toi de construire\n\nDis en arabe : « la porte de la mosquée » (porte = بَاب, mosquée = مَسْجِد).\n?\n**بَابُ الْمَسْجِدِ** (*bābu l-masjidi*).\n1er nom sans ال ni tanwīn ; 2e nom avec ال, au génitif (-i).\n\nDis en arabe : « dans le livre d'Allah » (livre = كِتَاب).\n?\n**فِي كِتَابِ اللَّهِ** (*fī kitābi llāhi*).\nكِتَابِ : génitif (après فِي). اللَّهِ : génitif (le « de »).\n\nDis en arabe : « le Seigneur des croyants ».\n?\n**رَبُّ الْمُؤْمِنِينَ** (*rabbu l-muʾminīna*).\nLe 2e nom est un pluriel masculin au génitif : ـِينَ.\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Les trois cas.md","text":"---\ntype: flashcards\nrègle: Les trois cas (iʿrāb)\n---\n# 🃏 Les trois cas : cartes de contraste\n\n#flashcards/arabe/regles/1-cas/trois-cas\n\n← [[Règles - paquets de cartes]] · Paquets détaillés : [[Cartes - Nominatif]] · [[Cartes - Accusatif]] · [[Cartes - Génitif]] · [[Cartes - Prépositions]] · Tableau : [[Tableau 2 - Les trois cas]]\n\n> [!tip] Le fil rouge de ce paquet\n> Ce paquet mélange les trois cas pour t'entraîner à **choisir**. À chaque carte, suis la même méthode :\n> 1. Préposition juste avant ? → **-i**\n> 2. Nom sans ال ni tanwīn juste avant (« le … de ») ? → **-i**\n> 3. Sinon : sujet ou attribut → **-u** ; complément du verbe → **-a** ; après إِنَّ → **-a**.\n\n## 1. Le tableau de base\n\nLes trois cas : nom arabe, fin, et rôle principal ?\n?\n- **Nominatif** = rafʿ : **-u / -un** : sujet, attribut\n- **Accusatif** = naṣb : **-a / -an** : complément d'objet\n- **Génitif** = jarr : **-i / -in** : après préposition, « le X **de** Y »\n\nOù se voit le cas d'un nom arabe ?\n?\nÀ la **dernière voyelle** du mot (ou à la terminaison ـُونَ / ـِينَ, ـَانِ / ـَيْنِ).\nLe **sens** du mot ne change pas ; c'est son **rôle** dans la phrase qui change.\n\nLes 3 questions à se poser, dans l'ordre, pour trouver le cas d'un nom ?\n?\n1. Y a-t-il une **préposition** juste avant ? → génitif (-i).\n2. Le mot d'avant est-il un **nom sans ال ni tanwīn** ? → « le … de », génitif (-i).\n3. Sinon, **que fait le mot ?** Sujet / attribut → nominatif (-u). Complément du verbe → accusatif (-a). Après إِنَّ → accusatif (-a).\n\nPourquoi l'ordre des mots est-il libre en arabe ?\n?\nParce que les **cas** disent le rôle de chaque mot.\nكَتَبَ الْوَلَدُ الدَّرْسَ = كَتَبَ الدَّرْسَ الْوَلَدُ = « l'enfant a écrit la leçon ».\nLe -u montre le sujet, le -a montre le complément. L'ordre des mots peut changer, le sens reste.\n\n## 2. Un même mot, trois rôles\n\nLe mot الْبَيْت (la maison) : donne une phrase pour chaque cas.\n?\n- **الْبَيْتُ** كَبِيرٌ (-u) : « la maison est grande » : sujet.\n- رَأَيْتُ **الْبَيْتَ** (-a) : « j'ai vu la maison » : complément.\n- فِي **الْبَيْتِ** (-i) : « dans la maison » : après préposition.\n\nDans la Fatiha, trouve un exemple de chaque cas.\n?\n- **-u** : **الْحَمْدُ** لِلَّهِ : sujet de la phrase nominale.\n- **-a** : اهْدِنَا **الصِّرَاطَ** : complément du verbe « guide ».\n- **-i** : رَبِّ **الْعَالَمِينَ** ; مَالِكِ **يَوْمِ** الدِّينِ : « de ».\n\nاللَّهُ / اللَّهَ / اللَّهِ : dans quelle phrase trouve-t-on chacun ?\n?\n- **اللَّهُ** أَكْبَرُ : sujet (-u).\n- إِنَّ **اللَّهَ** غَفُورٌ : après إِنَّ (-a).\n- بِسْمِ **اللَّهِ** ; **لِلَّهِ** : « de » ou après préposition (-i).\n\nرَبُّ / رَبَّ / رَبِّ : trouve le cas.\n1. رَبُّكَ الْأَكْرَمُ\n2. اعْبُدُوا رَبَّكُمْ\n3. الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\n?\n1. **رَبُّكَ** (-u) : sujet, « ton Seigneur est le Très-Noble ».\n2. **رَبَّكُمْ** (-a) : complément, « adorez votre Seigneur ».\n3. **رَبِّ** (-i) : il précise اللَّهِ, qui est au génitif après لِـ.\n\n## 3. Analyse express\n\nجَاءَ نَصْرُ اللَّهِ : donne le cas de chaque nom.\n?\n- **نَصْرُ** : nominatif (-u), sujet de جَاءَ.\n- **اللَّهِ** : génitif (-i), « le secours **d'**Allah ».\n\nخَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ (96:2) : donne le cas de chaque nom.\n?\n« Il a créé l'homme d'une adhérence ».\n- **الْإِنْسَانَ** : accusatif (-a), complément de خَلَقَ.\n- **عَلَقٍ** : génitif (-in), après مِنْ.\n(Le sujet « il » est caché dans le verbe.)\n\nوَالْعَصْرِ إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ : donne le cas de chaque nom.\n?\n- **الْعَصْرِ** : génitif (-i), après le وَ du serment (« Par le Temps ! »).\n- **الْإِنْسَانَ** : accusatif (-a), après إِنَّ.\n- **خُسْرٍ** : génitif (-in), après فِي.\n\nيُحِبُّ اللَّهُ الْمُحْسِنِينَ : donne le cas de chaque nom.\n?\n« Allah aime les bienfaisants ».\n- **اللَّهُ** : nominatif (-u), sujet.\n- **الْمُحْسِنِينَ** : accusatif (ـِينَ), complément : Il aime **qui** ?\n\nلَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ (97:3) : donne le cas de chaque nom.\n?\n« La nuit du Destin est meilleure que mille mois ».\n- **لَيْلَةُ** : nominatif (-u), sujet.\n- **الْقَدْرِ** : génitif (-i), « la nuit **du** Destin ».\n- **خَيْرٌ** : nominatif (-un), attribut.\n- **أَلْفِ** : génitif (-i), après مِنْ.\n- **شَهْرٍ** : génitif (-in), « mille **de** mois ».\n\n## 4. Les fins spéciales\n\nPluriel masculin : quelle forme pour quel cas ?\n?\n- **ـُونَ** : nominatif seulement (الْمُؤْمِنُونَ)\n- **ـِينَ** : accusatif **et** génitif (الْمُؤْمِنِينَ)\n\nPluriel féminin en ـَات : quelle forme pour quel cas ?\n?\n- **-u / -un** : nominatif (الصَّالِحَاتُ)\n- **-i / -in** : accusatif **et** génitif (الصَّالِحَاتِ). **Jamais -a.**\n\nDiptote (ex. إِبْرَاهِيم) : quelle forme pour quel cas ?\n?\n- **-u** : nominatif (إِبْرَاهِيمُ)\n- **-a** : accusatif **et** génitif (إِبْرَاهِيمَ). **Jamais -i ni tanwīn.**\n(Il reprend -i s'il a ال ou s'il est le 1er mot d'une annexion.)\n\nQuels mots **ne changent jamais** de fin ?\n?\nLes **pronoms** (هُوَ), les **démonstratifs** (هَذَا), les **relatifs** (الَّذِي), les **particules** (فِي, إِنَّ) et les **verbes au passé**.\nOn les dit **mabnī** (« bâtis »). Ils ont un rôle, mais aucune voyelle ne le montre.\n\nPourquoi n'entend-on pas les cas en fin de verset ?\n?\nÀ l'**arrêt** (waqf), la dernière voyelle tombe : الْعَالَمِينَ → *al-ʿālamīn* ; أَحَدٌ → *aḥad*.\nLe cas reste **écrit**. Lis l'écrit, pas seulement l'oreille.\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Nominatif.md","text":"---\ntype: flashcards\nrègle: Le nominatif (rafʿ)\n---\n# 🃏 Le nominatif (rafʿ) : cartes\n\n#flashcards/arabe/regles/1-cas/nominatif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Les trois cas]] · [[Cartes - Accusatif]] · [[Cartes - Génitif]] · [[Tableau 2 - Les trois cas]] · Règle complète : Atelier arabe › Règles › « Le nominatif »\n\n> [!tip] Le fil rouge de ce paquet\n> Le nominatif, c'est la fin **-u** (ـُ). Il répond à la question **« qui fait l'action ? »** ou **« de qui parle-t-on ? »**.\n> Avant de retourner une carte, dis à voix haute **la terminaison** et **la raison**. La raison compte plus que la réponse.\n\n## 1. Reconnaître le nominatif\n\nQuelle est la marque du **nominatif** (rafʿ) sur un nom singulier ?\n?\n**-u** (ḍamma ـُ) si le nom a ال : الْكِتَابُ *al-kitāb**u*** (le livre).\n**-un** (tanwīn ـٌ) s'il n'a pas ال : كِتَابٌ *kitāb**un*** (un livre).\nUn mot au nominatif est dit **marfūʿ** (مَرْفُوع).\n\nQuelles sont les **6 places** où un nom est au nominatif ?\n?\n1. **Sujet d'un verbe** (celui qui fait) : جَاءَ **نَصْرُ** اللَّهِ\n2. **Sujet d'une phrase sans verbe** (mubtadaʾ) : **اللَّهُ** الصَّمَدُ\n3. **Attribut** de cette phrase (khabar) : اللَّهُ **الصَّمَدُ**\n4. **Attribut après إِنَّ** : إِنَّ اللَّهَ **غَفُورٌ**\n5. **Sujet après كَانَ** : كَانَ **اللَّهُ** غَفُورًا\n6. **Sujet d'un verbe passif** : زُلْزِلَتِ **الْأَرْضُ**\nEn plus : un adjectif ou un mot relié par « et » à un nominatif est aussi au nominatif.\n\nComment savoir vite si un nom est au nominatif ? (3 questions)\n?\nPose ces 3 questions **dans l'ordre** :\n1. Y a-t-il une **préposition** juste avant (فِي, مِنْ, بِـ, لِـ…) ? Si oui : génitif, pas nominatif.\n2. Le mot d'avant est-il un **nom sans ال ni tanwīn** ? Si oui : c'est « le … **de** ce mot », génitif.\n3. Sinon : le mot **fait l'action**, ou **on parle de lui**, ou c'est **ce qu'on dit de lui** ? Alors nominatif (-u).\n\n## 2. Pourquoi cette terminaison ?\n\nذَهَبَ الرَّجُلُ : pourquoi الرَّجُلُ finit-il par **-u** ?\n?\n*dhahaba r-rajul**u*** = « l'homme est parti ».\nQui est parti ? **l'homme**. C'est lui qui fait l'action, donc c'est le **sujet du verbe** (fāʿil). Le sujet prend **-u**.\n\nإِذَا جَاءَ نَصْرُ اللَّهِ (110:1) : pourquoi نَصْرُ finit-il par **-u** ?\n?\n*idhā jāʾa naṣr**u** llāhi* = « quand viendra le secours d'Allah ».\nQu'est-ce qui vient ? **le secours**. C'est le **sujet** du verbe جَاءَ, donc **-u**.\nEt اللَّهِ finit par -i parce que c'est le « de » : le secours **d'**Allah (génitif).\n\nاللَّهُ الصَّمَدُ (112:2) : pourquoi les **deux** mots finissent-ils par **-u** ?\n?\n*allāh**u** ṣ-ṣamad**u*** = « Allah est l'Absolu ». Il n'y a pas de verbe : c'est une **phrase nominale**.\n- اللَّهُ = le **sujet** (mubtadaʾ), celui dont on parle : -u\n- الصَّمَدُ = l'**attribut** (khabar), ce qu'on dit de lui : -u\nLes deux parties d'une phrase nominale sont au nominatif.\n\nالْحَمْدُ لِلَّهِ : pourquoi الْحَمْدُ finit-il par **-u** ?\n?\n*al-ḥamd**u** lillāhi* = « la louange est à Allah ».\nOn parle de quoi ? de **la louange**. C'est le **sujet** de la phrase nominale, donc **-u**.\n\nاللَّهُ أَحَدٌ : pourquoi أَحَدٌ finit-il par **-un** et pas par -u ?\n?\n*allāhu aḥad**un*** = « Allah est Un ».\nأَحَدٌ est l'**attribut**, donc nominatif. Mais il n'a **pas d'ال** : il est **indéfini**. Le -u devient alors le tanwīn **-un** (ـٌ).\nEn fin de verset, on s'arrête et on dit seulement *aḥad*.\n\nقَدْ أَفْلَحَ الْمُؤْمِنُونَ (23:1) : pourquoi **-ūna** et pas -u ?\n?\n*qad aflaḥa l-muʾmin**ūna*** = « les croyants ont réussi ».\nQui a réussi ? **les croyants** : c'est le **sujet**, donc nominatif.\nMais c'est un **pluriel masculin** : son nominatif s'écrit **ـُونَ** (-ūna) au lieu de -u.\n\nإِذَا زُلْزِلَتِ الْأَرْضُ (99:1) : la terre **subit** l'action. Pourquoi est-elle quand même au nominatif ?\n?\n*idhā zulzilati l-arḍ**u*** = « quand la terre sera secouée ».\nزُلْزِلَتْ est un verbe **passif** (« être secoué »). Au passif, ce qui subit devient le **sujet** (on l'appelle nāʾib al-fāʿil, « le remplaçant du sujet »). Donc **-u**.\nC'est pareil en français : dans « la terre est secouée », « la terre » est le sujet.\n\nوَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا (99:2) : quel mot est au nominatif ?\n?\n**الْأَرْضُ** (-u) : « la terre a fait sortir ses fardeaux ».\nQui fait sortir ? **la terre** : sujet du verbe أَخْرَجَتْ.\nأَثْقَالَهَا (-a) est le complément : ce qui est sorti.\n\nنَصْرُ اللَّهِ وَالْفَتْحُ : pourquoi الْفَتْحُ finit-il par **-u** ?\n?\n*naṣru llāhi wa-l-fatḥ**u*** = « le secours d'Allah et la victoire ».\nالْفَتْحُ est relié par **وَ (et)** à نَصْرُ, qui est sujet (-u). Un mot relié par « et » **copie le cas** du mot auquel il est relié : donc -u.\nAttention : il ne copie pas اللَّهِ (-i), qui n'est que le « de ».\n\nالرَّجُلُ الْكَرِيمُ ذَهَبَ : pourquoi الْكَرِيمُ finit-il aussi par **-u** ?\n?\n*ar-rajulu l-karīm**u** dhahaba* = « l'homme généreux est parti ».\nالْكَرِيمُ est un **adjectif**. L'adjectif **copie** son nom : même cas, même ال. Le nom الرَّجُلُ a -u, donc l'adjectif aussi.\n\nقُلْ يَا أَيُّهَا الْكَافِرُونَ (109:1) : pourquoi الْكَافِرُونَ et pas الْكَافِرِينَ ?\n?\n*yā ayyuhā l-kāfir**ūna*** = « ô vous, les mécréants ».\nQuand on **appelle** quelqu'un avec يَا أَيُّهَا, le nom qui suit est au **nominatif**. Pluriel masculin au nominatif : **ـُونَ**.\n\n## 3. Contrastes : -u, -a ou -i ?\n\nLe même mot dans les trois cas : donne الْكِتَاب au nominatif, à l'accusatif et au génitif.\n?\n- **الْكِتَابُ** (-u), nominatif : « **le livre** est nouveau » (sujet)\n- **الْكِتَابَ** (-a), accusatif : « j'ai lu **le livre** » (complément)\n- **الْكِتَابِ** (-i), génitif : « dans **le livre** » (après préposition)\nLe sens du mot ne change pas. Seul son **rôle** change, et la dernière voyelle le montre.\n\nكَتَبَ الْوَلَدُ الدَّرْسَ : qui a écrit quoi ? Comment le sait-on ?\n?\n**L'enfant** a écrit **la leçon**.\n- الْوَلَدُ a **-u** : c'est le sujet (celui qui écrit).\n- الدَّرْسَ a **-a** : c'est le complément (ce qui est écrit).\nSi on dit كَتَبَ الدَّرْسَ الْوَلَدُ, le sens est **le même**. C'est la terminaison qui décide, pas l'ordre.\n\nأَكَلَ التُّفَّاحَةَ الْوَلَدُ : qui a mangé quoi ?\n?\n**L'enfant** (الْوَلَدُ, -u) a mangé **la pomme** (التُّفَّاحَةَ, -a).\nLe sujet est à la fin, mais son **-u** le montre. La pomme a **-a** : c'est le complément.\n\nخَلَقَ اللَّهُ الْإِنْسَانَ : quel mot est au nominatif, lequel à l'accusatif ?\n?\n- **اللَّهُ** (-u), nominatif : qui crée ? Allah, le sujet.\n- **الْإِنْسَانَ** (-a), accusatif : qui est créé ? l'homme, le complément.\n\nTrouve le cas de اللَّه dans chaque phrase :\n1. اللَّهُ أَكْبَرُ\n2. إِنَّ اللَّهَ غَفُورٌ\n3. بِسْمِ اللَّهِ\n?\n1. **اللَّهُ** (-u), nominatif : sujet de « Allah est plus grand ».\n2. **اللَّهَ** (-a), accusatif : à cause de إِنَّ devant.\n3. **اللَّهِ** (-i), génitif : « le nom **d'**Allah ».\n\nإِنَّ اللَّهَ غَفُورٌ رَحِيمٌ : quels mots restent au nominatif ? Pourquoi ?\n?\n**غَفُورٌ رَحِيمٌ** (-un) : c'est l'**attribut** de إِنَّ, il reste au nominatif.\nLe **sujet** اللَّهَ, lui, passe à l'accusatif (-a) à cause de إِنَّ.\nMémo : **inna touche le 1er mot** (le sujet).\n\nكَانَ اللَّهُ غَفُورًا رَحِيمًا : quel mot reste au nominatif ?\n?\n**اللَّهُ** (-u) : le **sujet** de كَانَ reste au nominatif.\nC'est l'**attribut** (غَفُورًا رَحِيمًا, -an) qui passe à l'accusatif.\nMémo : **kāna touche le 2e mot** (l'attribut).\n\nالْبَيْتُ كَبِيرٌ ou الْبَيْتَ كَبِيرٌ : laquelle est correcte pour « la maison est grande » ?\n?\n**الْبَيْتُ كَبِيرٌ** (*al-bayt**u** kabīrun*).\nLa maison est le **sujet** de la phrase nominale : nominatif -u. On ne met -a que si إِنَّ est devant : إِنَّ الْبَيْتَ كَبِيرٌ.\n\n## 4. Les différentes formes du nominatif\n\nNominatif du **pluriel masculin** (« sain ») ?\n?\n**ـُونَ** (-ūna) : الْمُسْلِمُونَ, الْمُؤْمِنُونَ, الْكَافِرُونَ.\nÀ l'accusatif et au génitif, il devient **ـِينَ** (-īna) : الْمُؤْمِنِينَ.\n\nNominatif du **duel** (deux choses) ?\n?\n**ـَانِ** (-āni) : رَجُلَانِ = deux hommes (sujet).\nÀ l'accusatif et au génitif : **ـَيْنِ** (-ayni) : رَجُلَيْنِ.\n\nNominatif du **pluriel féminin** en ـَات ?\n?\n**-u** avec ال, **-un** sans ال : الصَّالِحَاتُ, مُسْلِمَاتٌ.\nCe pluriel n'a que deux fins : -u au nominatif, et **-i** à l'accusatif comme au génitif.\n\nComment voit-on le nominatif de **هُدًى** (une guidance) ?\n?\nOn ne le voit **pas**. Le mot finit par ى : la voyelle de cas ne peut pas s'écrire. On dit qu'elle est « **estimée** ».\nهُدًى se lit *hudan* dans les trois cas. On trouve son rôle grâce aux autres mots de la phrase.\n\nهُوَ, أَنْتَ, هَذَا peuvent-ils prendre la fin -u ?\n?\n**Non.** Les **pronoms**, les **démonstratifs** et les **relatifs** ont une fin **fixe** (on dit **mabnī**, « bâti »).\nDans هُوَ اللَّهُ (Il est Allah), هُوَ est bien le sujet, mais il ne montre aucun -u. On dit qu'il est « à la place d'un nominatif ».\n\n## 5. Les pièges\n\nLe nominatif est-il toujours le **premier mot** de la phrase ?\n?\n**Non.** Dans une **phrase verbale**, le sujet vient **après** le verbe : جَاءَ **نَصْرُ** اللَّهِ.\nIl peut même venir après un complément : أَلْهَاكُمُ **التَّكَاثُرُ** (102:1), « la course aux richesses vous distrait ».\n\nUn nom au début de la phrase est-il toujours au nominatif ?\n?\n**Non.** Après **إِنَّ** (et ses sœurs أَنَّ, لَكِنَّ, لَعَلَّ…), le premier nom passe à l'**accusatif** :\nالْإِنْسَانُ فِي خُسْرٍ devient إِنَّ **الْإِنْسَانَ** لَفِي خُسْرٍ.\n\nPourquoi n'entend-on pas le **-u** de الصَّمَدُ en fin de verset ?\n?\nParce qu'à l'**arrêt** (waqf), on ne prononce pas la dernière voyelle : on dit *aṣ-ṣamad*.\nLe -u est **écrit**, mais pas dit. Pour trouver le cas, regarde toujours l'**écrit**.\n\nDans الْحَمْدُ لِلَّهِ, l'attribut est « à Allah ». Pourquoi اللَّهِ n'est-il pas au nominatif ?\n?\nParce que l'attribut, c'est tout le **groupe** لِلَّهِ (préposition + nom).\nÀ l'intérieur de ce groupe, le nom obéit à la préposition : après لِـ, **génitif** (-i).\nRègle d'or : **la préposition gagne toujours** sur le nom qui la suit.\n\nفِي الْبَيْتِ رَجُلٌ (il y a un homme dans la maison) : pourquoi رَجُلٌ est-il au nominatif et pas au génitif ?\n?\nLa préposition فِي agit **seulement** sur le nom collé à elle : الْبَيْتِ (-i).\nرَجُلٌ est le **sujet** de la phrase (« un homme est dans la maison »). Il est indéfini, donc il vient **après** l'attribut. Sujet = nominatif : **-un**.\n\nجَاءَ الرِّجَالُ ou جَاءُوا الرِّجَالُ (les hommes sont venus) ?\n?\n**جَاءَ الرِّجَالُ**. Quand le verbe est **avant** le sujet, il reste au **singulier**. Le sujet الرِّجَالُ est au nominatif (-u).\nSi le sujet passe devant, le verbe s'accorde : الرِّجَالُ جَاءُوا.\n\n## 6. À toi de construire\n\nDis en arabe : « le livre est nouveau » (livre = كِتَاب, nouveau = جَدِيد).\n?\n**الْكِتَابُ جَدِيدٌ** (*al-kitābu jadīdun*).\nSujet avec ال (-u) + attribut sans ال (-un). Pas de verbe « être » au présent.\n\nDis en arabe : « l'homme est parti » (partir = ذَهَبَ, homme = رَجُل).\n?\n**ذَهَبَ الرَّجُلُ** (*dhahaba r-rajulu*).\nD'abord le verbe, puis le sujet au nominatif -u.\n\nDis en arabe : « les croyants sont venus » (venir = جَاءَ, croyant = مُؤْمِن).\n?\n**جَاءَ الْمُؤْمِنُونَ** (*jāʾa l-muʾminūna*).\nSujet au pluriel masculin : nominatif ـُونَ. Le verbe reste au singulier car il est avant le sujet.\n\nDis en arabe avec كَانَ : « la maison était grande » (grand = كَبِير).\n?\n**كَانَ الْبَيْتُ كَبِيرًا** (*kāna l-baytu kabīran*).\nLe sujet reste au nominatif (الْبَيْتُ, -u). L'attribut passe à l'accusatif (كَبِيرًا, -an).\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Pluriel et duel.md","text":"---\ntype: flashcards\nrègle: Le pluriel et le duel\n---\n# 🃏 Le pluriel et le duel : cartes\n\n#flashcards/arabe/regles/1-cas/pluriel-duel\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Les trois cas]] · Règle complète : Atelier arabe › Règles › « Le pluriel »\n\n> [!tip] Le fil rouge de ce paquet\n> Trois sortes de pluriel : **masculin** (ـُونَ / ـِينَ), **féminin** (ـَات), **brisé** (l'intérieur du mot change). Plus le **duel** pour « deux » (ـَانِ / ـَيْنِ).\n\n## Les formes\n\nComment fait-on le **pluriel masculin** (« sain ») ? Exemple avec مُسْلِم.\n?\nOn ajoute :\n- **ـُونَ** au nominatif : مُسْلِمُونَ (*muslimūna*)\n- **ـِينَ** à l'accusatif et au génitif : مُسْلِمِينَ (*muslimīna*)\nIl sert surtout pour des **personnes**. Pas de tanwīn : le ن final le remplace.\n\nComment fait-on le **pluriel féminin** ? Exemple avec مُسْلِمَة.\n?\nOn remplace ـة par **ـَات** : مُسْلِمَة → **مُسْلِمَات**.\nFins : **-u** au nominatif, **-i** à l'accusatif et au génitif (jamais -a).\n\nQu'est-ce qu'un **pluriel brisé** ? Trois exemples.\n?\nUn pluriel qui **change l'intérieur** du mot, sans terminaison spéciale :\n- كِتَاب → **كُتُب** (livres)\n- قَلْب → **قُلُوب** (cœurs)\n- رَجُل → **رِجَال** (hommes)\nIl prend les fins normales -u, -a, -i. Il faut l'apprendre avec le mot.\n\nQu'est-ce que le **duel** ? Ses deux formes ?\n?\nUne forme spéciale pour **deux** choses :\n- **ـَانِ** au nominatif : رَجُلَانِ (deux hommes)\n- **ـَيْنِ** à l'accusatif et au génitif : رَجُلَيْنِ\n\n## Pourquoi cette terminaison ?\n\nقُلْ يَا أَيُّهَا الْكَافِرُونَ (109:1) : pourquoi **ـُونَ** ?\n?\nOn **appelle** les gens (« ô vous… ») : le nom après يَا أَيُّهَا est au **nominatif**. Pluriel masculin au nominatif = ـُونَ.\n\nغَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ : pourquoi **ـِينَ** ?\n?\nالضَّالِّينَ (les égarés) est relié par « et » (وَلَا) à الْمَغْضُوبِ, qui est au **génitif**. Pluriel masculin au génitif = ـِينَ.\n\nوَعَمِلُوا الصَّالِحَاتِ (103:3) : complément d'objet, mais **-i**. Pourquoi ?\n?\nالصَّالِحَاتِ est un **pluriel féminin**. Ce pluriel n'a **jamais** -a : à l'accusatif, il prend **-i**.\nC'est bien un complément (« ils ont fait **les bonnes œuvres** »).\n\nتَبَّتْ يَدَا أَبِي لَهَبٍ (111:1) : pourquoi يَدَا et pas يَدَانِ ?\n?\nيَدَانِ = « deux mains » (duel). Devant un complément du nom (« **de** Abū Lahab »), le **ن** du duel **tombe** : يَدَا أَبِي لَهَبٍ.\nMême chose au pluriel : مُسْلِمُونَ → مُسْلِمُو مَكَّةَ (les musulmans de La Mecque).\n\n## Pièges\n\nمِنَ الْمُؤْمِنُونَ ou مِنَ الْمُؤْمِنِينَ ?\n?\n**مِنَ الْمُؤْمِنِينَ**. Après une préposition : génitif, donc ـِينَ.\n\nUn **pluriel de choses** prend quel adjectif ? Exemple « de grandes maisons ».\n?\nUn adjectif au **féminin singulier** : بُيُوتٌ **كَبِيرَةٌ**.\nMais un pluriel de **personnes** garde un adjectif pluriel : رِجَالٌ صَالِحُونَ.\n\nPourquoi n'entend-on pas le -a de ـُونَ / ـِينَ en fin de verset ?\n?\nÀ l'**arrêt**, la dernière voyelle tombe : *al-kāfirūn*, *al-ʿālamīn*. Mais on l'écrit toujours : الْكَافِرُونَ, الْعَالَمِينَ.\n"},{"path":"5 - Flashcards/Règles/1 - Les cas/Cartes - Prépositions.md","text":"---\ntype: flashcards\nrègle: Les prépositions (ḥurūf al-jarr)\n---\n# 🃏 Les prépositions : cartes\n\n#flashcards/arabe/regles/1-cas/prepositions\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Génitif]] · [[Cartes - Nominatif]] · [[Cartes - Les trois cas]] · Règle complète : Atelier arabe › Règles › « Les prépositions »\n\n> [!tip] Le fil rouge de ce paquet\n> **Une seule règle à retenir** : après **toute** préposition, le nom est au **génitif** (-i, -in ou ـِينَ).\n> La préposition n'agit que sur **le nom collé à elle**, pas sur le reste de la phrase.\n\n## 1. La règle\n\nAprès une préposition, à quel cas est le nom ?\n?\nToujours au **génitif** (jarr) :\n- **-i** avec ال : فِي الْبَيْتِ (*fi l-bayt**i***, dans la maison)\n- **-in** sans ال : فِي بَيْتٍ (*fī bayt**in***, dans une maison)\n- **ـِينَ** au pluriel masculin : مِنَ الْمُؤْمِنِينَ\n\nComment s'appelle une préposition en arabe, et que veut dire ce nom ?\n?\n**ḥarf jarr** (حَرْفُ جَرٍّ), « la lettre qui **tire** ».\nElle « tire » le nom suivant vers le bas, vers le **-i** (la kasra se met **sous** la lettre). Le génitif s'appelle d'ailleurs **jarr**.\n\nQuelles prépositions **se collent** au mot ? Lesquelles s'écrivent **séparées** ?\n?\n**Collées** (une seule lettre) : **بِـ** (par, avec), **لِـ** (à, pour), **كَـ** (comme), et **وَ** / **تَـ** du serment (« par… ! »).\nبِ + اسْمِ = **بِسْمِ** ; لِ + اللَّهِ = **لِلَّهِ**.\n**Séparées** : مِنْ, فِي, عَلَى, إِلَى, عَنْ, حَتَّى : فِي الْبَيْتِ.\n\n## 2. Le vocabulaire des prépositions\n\nمِنْ :: de (provenance), depuis, parmi — مِنْ شَرِّ (du mal de)\n\nفِي :: dans, en — فِي خُسْرٍ (dans la perte)\n\nعَلَى :: sur, contre, à la charge de — عَلَى هُدًى (sur une guidance)\n\nإِلَى :: vers, jusqu'à — إِلَى رَبِّكِ (vers ton Seigneur)\n\nعَنْ :: loin de, au sujet de — عَنْ صَلَاتِهِمْ (au sujet de leur prière)\n\nبِـ :: par, avec, au moyen de, au nom de — بِسْمِ اللَّهِ (au nom d'Allah)\n\nلِـ :: à, pour, appartenant à — لِلَّهِ (à Allah)\n\nكَـ :: comme — كَالْفَرَاشِ (comme les papillons)\n\nحَتَّى :: jusqu'à — حَتَّى مَطْلَعِ الْفَجْرِ (jusqu'au lever de l'aube)\n\nDis en arabe : « **dans** » / « **sur** » / « **vers** ».\n?\n- dans = **فِي** (*fī*)\n- sur = **عَلَى** (*ʿalā*)\n- vers = **إِلَى** (*ilā*)\n\nDis en arabe : « **de** (provenance) » / « **loin de, au sujet de** » / « **à, pour** ».\n?\n- de, depuis, parmi = **مِنْ** (*min*)\n- loin de, au sujet de = **عَنْ** (*ʿan*)\n- à, pour = **لِـ** (*li-*), collé au mot\n\nDis en arabe : « **par, avec, au nom de** » / « **comme** » / « **jusqu'à** ».\n?\n- par, avec = **بِـ** (*bi-*), collé au mot\n- comme = **كَـ** (*ka-*), collé au mot\n- jusqu'à = **حَتَّى** (*ḥattā*) ou إِلَى\n\n## 3. Pourquoi cette terminaison ?\n\nبِسْمِ اللَّهِ : pourquoi اسْم devient-il **بِسْمِ**, avec -i ?\n?\n*bism**i** llāh* = « au nom d'Allah ».\nبِـ est une **préposition** : le nom qui suit, اسْم, passe au génitif, donc **-i**.\nEt le ا de اسْم tombe à l'écrit : بِ + اسْمِ = بِسْمِ.\n\nإِنَّ الْإِنْسَانَ لَفِي خُسْرٍ (103:2) : pourquoi خُسْرٍ finit-il par **-in** ?\n?\n*la-fī khusr**in*** = « (est) dans la perte ».\nفِي est une **préposition** : génitif. خُسْر n'a pas d'ال, il est indéfini : le -i devient le tanwīn **-in** (ـٍ).\nLe لَـ devant فِي n'est pas une préposition : c'est un petit mot d'**insistance** (« vraiment »).\n\nالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ : pourquoi اللَّهِ, puis رَبِّ, finissent-ils par **-i** ?\n?\n- **اللَّهِ** (-i) : après la préposition **لِـ**, génitif.\n- **رَبِّ** (-i) : il précise **qui** est Allah (« Allah, le Seigneur… »). Un mot qui précise un nom **copie son cas** : donc -i aussi.\n- **الْعَالَمِينَ** (ـِينَ) : « le Seigneur **des** mondes », génitif du pluriel masculin.\n\nمِنْ شَرِّ مَا خَلَقَ (113:2) : pourquoi شَرِّ finit-il par **-i** ?\n?\n*min sharr**i** mā khalaq* = « contre le mal de ce qu'Il a créé ».\nمِنْ est une **préposition**, donc شَرّ est au génitif : -i.\nIl n'a pas de tanwīn car il est suivi de son « de » (مَا) : c'est une annexion.\n\nارْجِعِي إِلَى رَبِّكِ (89:28) : pourquoi رَبِّ a-t-il **-i** ?\n?\n*irjiʿī ilā rabb**i**ki* = « retourne vers ton Seigneur ».\nإِلَى est une **préposition** : génitif -i. Le ـكِ (ton, au féminin, car on parle à l'âme) se colle après le -i.\n\nمِنَ الْجِنَّةِ وَالنَّاسِ (114:6) : pourquoi النَّاسِ finit-il par **-i** alors qu'il n'y a pas de préposition juste avant ?\n?\n*mina l-jinnati wa-n-nās* = « parmi les djinns et les hommes ».\nالنَّاسِ est relié par **وَ (et)** à الْجِنَّةِ, qui est au génitif après مِنْ. Un mot relié par « et » **copie le cas** : donc -i.\n(À l'arrêt, on dit seulement *an-nās*.)\n\nوَالْعَصْرِ (103:1) : pourquoi الْعَصْرِ finit-il par **-i** ?\n?\n*wa-l-ʿaṣr**i*** = « **Par** le Temps ! »\nIci **وَ** ne veut pas dire « et » : c'est la préposition du **serment** (« je jure par… »). Après elle, génitif : -i.\nMême chose : وَالشَّمْسِ, وَاللَّيْلِ, وَالْفَجْرِ.\n\nاللَّهُمَّ صَلِّ عَلَى إِبْرَاهِيمَ : après عَلَى, pourquoi **-a** et pas -i ?\n?\n*ʿalā ibrāhīm**a***. C'est bien un **génitif** (après la préposition عَلَى).\nMais إِبْرَاهِيم est un nom **diptote** (nom propre étranger) : il refuse le -i et prend **-a** à la place, sans tanwīn.\nCe n'est donc **pas** un accusatif : regarde toujours le mot d'avant.\n\nمِنَ الْمُؤْمِنُونَ ou مِنَ الْمُؤْمِنِينَ ?\n?\n**مِنَ الْمُؤْمِنِينَ** (*mina l-muʾminīna*).\nAprès la préposition مِنْ : génitif. Pluriel masculin au génitif : **ـِينَ**, jamais ـُونَ.\n\nفِي الْبَيْتِ الْكَبِيرِ : pourquoi الْكَبِيرِ finit-il aussi par **-i** ?\n?\n*fi l-bayti l-kabīr**i*** = « dans la grande maison ».\nالْكَبِيرِ est l'**adjectif** de الْبَيْتِ. L'adjectif copie son nom : الْبَيْتِ est au génitif (après فِي), donc l'adjectif aussi.\n\n## 4. Contrastes : avec ou sans préposition\n\nالْبَيْتُ كَبِيرٌ / فِي الْبَيْتِ : pourquoi الْبَيْت change-t-il de fin ?\n?\n- **الْبَيْتُ** كَبِيرٌ (-u) : « **la maison** est grande ». C'est le sujet : nominatif.\n- فِي **الْبَيْتِ** (-i) : « **dans la maison** ». Il y a une préposition : génitif.\nMême mot, rôle différent, fin différente.\n\nرَأَيْتُ الْبَيْتَ / نَظَرْتُ إِلَى الْبَيْتِ : pourquoi -a puis -i ?\n?\n- رَأَيْتُ **الْبَيْتَ** (-a) : « j'ai vu **la maison** ». Complément direct du verbe : accusatif.\n- نَظَرْتُ إِلَى **الْبَيْتِ** (-i) : « j'ai regardé **vers** la maison ». Le verbe se construit avec إِلَى : le nom est au génitif.\n\nآمَنَ بِاللَّهِ (il a cru en Allah) : pourquoi اللَّهِ et pas اللَّهَ ?\n?\nLe verbe آمَنَ (croire) se construit avec la préposition **بِـ** (« croire **en** »).\nAprès بِـ : génitif, donc **اللَّهِ** (-i). Il n'y a pas de complément direct à l'accusatif.\nMême chose : أَعُوذُ **بِرَبِّ** الْفَلَقِ (je cherche refuge **auprès** du Seigneur de l'aube).\n\nالْبَيْتُ فِي الْمَدِينَةِ : quel est le sujet, quel est l'attribut ?\n?\n« La maison est dans la ville ».\n- Sujet : **الْبَيْتُ** (-u, nominatif).\n- Attribut : tout le groupe **فِي الْمَدِينَةِ**. À l'intérieur, الْمَدِينَةِ est au génitif (-i) à cause de فِي.\n\nلَهُمْ عَذَابٌ (ils auront un châtiment) : pourquoi عَذَابٌ est-il au **nominatif** ?\n?\nLa préposition لِـ agit **seulement** sur هُمْ (eux), collé à elle.\nعَذَابٌ est le **sujet** de la phrase : « un châtiment (est) à eux ». Il est indéfini, alors il vient **après**. Sujet = nominatif **-un**.\nC'est la façon arabe de dire « **avoir** » : لِي كِتَابٌ = j'ai un livre (« à moi, un livre »).\n\nفِي الْبَيْتِ رَجُلٌ : traduis, et donne le cas de chaque nom.\n?\n« **Il y a** un homme dans la maison ».\n- الْبَيْتِ (-i) : génitif, après فِي.\n- رَجُلٌ (-un) : nominatif, c'est le sujet (indéfini, placé après).\nC'est la façon arabe de dire « il y a ».\n\n## 5. Les petits changements d'écriture\n\nلِـ + الْ… : que devient l'écriture ? Exemple ?\n?\nL'alif de ال **tombe** : لِ + الْمُتَّقِينَ = **لِلْمُتَّقِينَ** (*lil-muttaqīn*).\nAvec اللَّه : لِ + اللَّهِ = **لِلَّهِ** (*lillāh*).\nAvec بِـ, l'alif **reste écrit** mais ne se prononce pas : بِالْحَقِّ (*bil-ḥaqq*).\n\nمِنْ + الْ… : pourquoi dit-on **مِنَ** اللَّهِ et pas مِنْ اللَّهِ ?\n?\nDeux consonnes sans voyelle se suivraient (n + l). On ajoute une petite voyelle pour faire le pont : avec مِنْ, c'est **a** : مِنَ اللَّهِ = *mina llāhi*.\nAvec عَنْ, c'est **i** : عَنِ الصَّلَاةِ = *ʿani ṣ-ṣalāti*.\n\nفِي + الْ… : comment prononce-t-on فِي الْأَرْضِ ?\n?\n*fi l-arḍi* : le ī long de فِي se **raccourcit** devant l'article, et l'alif de ال ne se prononce pas.\nOn écrit فِي, mais on dit *fi*.\n\nلِـ + pronom : que devient لِـ ? Exemples ?\n?\nDevant un pronom, **لِـ devient لَـ** (avec a) :\nلَهُ (à lui), لَهَا (à elle), لَكَ (à toi), لَنَا (à nous), لَهُمْ (à eux).\nUne exception : **لِي** (à moi).\n\nعَلَى et إِلَى + pronom : que deviennent-ils ?\n?\nLe ى devient **يْـ** : **عَلَيْـ** et **إِلَيْـ**.\nعَلَى + هِمْ = **عَلَيْهِمْ** (sur eux, Fatiha) ; إِلَى + كَ = **إِلَيْكَ** (vers toi).\n\nPourquoi dit-on فِيهِ, بِهِ, عَلَيْهِ (-hi) mais لَهُ, مِنْهُ (-hu) ?\n?\nAprès un son **i** ou **y**, le pronom ـهُ devient **ـهِ** (plus facile à dire) :\n- فِي + هُ = **فِيهِ** ; بِـ + هُ = **بِهِ** ; عَلَيْـ + هُ = **عَلَيْهِ**\n- mais لَـ + هُ = **لَهُ** ; مِنْ + هُ = **مِنْهُ** (pas de i avant)\nMême chose : عَلَيْهِمْ, بِهِمْ, mais لَهُمْ.\n\nمِنْ + ي (moi) et عَنْ + ي : que donnent-ils ?\n?\nLe ن se **double** : مِنْ + ي = **مِنِّي** (*minnī*, de moi) ; عَنْ + ي = **عَنِّي** (*ʿannī*, de moi, à mon sujet).\n\n## 6. Les pièges\n\nوَ veut-il toujours dire « et » ?\n?\n**Non.** Au début d'une sourate, devant un nom au génitif, c'est souvent le **serment** : « **Par**… ! »\nوَالْعَصْرِ = « Par le Temps ! » ; وَالضُّحَى = « Par le jour montant ! ».\nIndice : le nom qui suit est au **génitif** (-i), et il n'y a rien avant à quoi le relier.\n\nDans لَفِي خُسْرٍ, le لَـ est-il la préposition لِـ ?\n?\n**Non.** La préposition s'écrit **لِـ** (avec i) et veut dire « à, pour ».\n**لَـ** (avec a) devant l'attribut est un mot d'**insistance** : « vraiment, certes ». Il ne change pas le cas.\nIci, c'est **فِي** qui met خُسْرٍ au génitif.\n\nلِـ devant un **verbe** (لِيَعْبُدُوا) : est-ce une préposition ?\n?\nPas comme d'habitude : devant un verbe, لِـ veut dire « **pour que** » ou « **qu'il…** ».\nUn verbe ne prend **jamais** le génitif. Après ce لِـ, le verbe change de mode (subjonctif ou jussif), pas de cas.\n\nمَعَ, عِنْدَ, قَبْلَ, بَعْدَ, تَحْتَ : sont-ils des prépositions ?\n?\nPour les grammairiens arabes, ce sont des **noms de lieu ou de temps** (ẓarf), pas de vraies prépositions.\nMais pour toi, le résultat est le même : le nom qui suit est au **génitif** (car c'est « le … de »).\nمَعَ اللَّهِ (avec Allah) ; بَعْدَ الصَّلَاةِ (après la prière) ; تَحْتَ أَقْدَامِ الْأُمَّهَاتِ (sous les pieds des mères).\n\n## 7. À toi de construire\n\nDis en arabe : « dans la mosquée » (mosquée = مَسْجِد).\n?\n**فِي الْمَسْجِدِ** (*fi l-masjidi*).\nPréposition + nom avec ال au génitif (-i).\n\nDis en arabe : « d'une ville » (ville = مَدِينَة).\n?\n**مِنْ مَدِينَةٍ** (*min madīnatin*).\nNom sans ال : génitif indéfini, tanwīn **-in** (ـٍ).\n\nDis en arabe : « au nom du Seigneur » (Seigneur = رَبّ).\n?\n**بِاسْمِ الرَّبِّ** (*bi-smi r-rabbi*).\nاسْم au génitif après بِـ, puis الرَّبِّ au génitif car c'est le « de ».\n(La formule de la basmala, بِسْمِ, perd même son alif à l'écrit.)\n\nDis en arabe : « sur eux » et « à toi » (homme).\n?\n- sur eux = **عَلَيْهِمْ** (*ʿalayhim*)\n- à toi = **لَكَ** (*laka*)\n\nDis en arabe : « par les croyants » (croyant = مُؤْمِن).\n?\n**بِالْمُؤْمِنِينَ** (*bil-muʾminīna*).\nAprès بِـ : génitif. Pluriel masculin au génitif : ـِينَ.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Adjectif.md","text":"---\ntype: flashcards\nrègle: L'adjectif (naʿt)\n---\n# 🃏 L'adjectif (naʿt) : cartes\n\n#flashcards/arabe/regles/2-phrase/adjectif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Défini et indéfini]] · [[Cartes - Phrase nominale]] · Règle complète : Atelier arabe › Règles › « L'adjectif »\n\n> [!tip] Le fil rouge de ce paquet\n> L'adjectif vient **après** le nom et le **copie en tout** : cas, ال ou tanwīn, genre, nombre.\n\nOù se place l'adjectif arabe ? Que copie-t-il ?\n?\n**Après** le nom. Il copie **4 choses** :\n1. le **cas** (-u, -a, -i)\n2. **défini / indéfini** (ال ou tanwīn)\n3. le **genre** (ـة au féminin)\n4. le **nombre**\n\nDis : « une grande maison », « la grande maison », « dans la grande maison ».\n?\n- بَيْتٌ كَبِيرٌ (*baytun kabīrun*)\n- الْبَيْتُ الْكَبِيرُ (*al-baytu l-kabīru*)\n- فِي الْبَيْتِ الْكَبِيرِ (*fi l-bayti l-kabīri*)\nL'adjectif copie à chaque fois le cas et le ال.\n\nالرَّجُلُ صَالِحٌ ou الرَّجُلُ الصَّالِحُ : lequel = « l'homme vertueux » ?\n?\n**الرَّجُلُ الصَّالِحُ** (défini + défini) = l'homme vertueux (un groupe).\nالرَّجُلُ صَالِحٌ (défini + indéfini) = l'homme **est** vertueux (une phrase).\n\nالصِّرَاطَ الْمُسْتَقِيمَ : pourquoi -a sur les deux ?\n?\nالصِّرَاطَ est complément (accusatif -a). L'adjectif الْمُسْتَقِيمَ le **copie** : -a aussi.\n\nالنَّفْسُ الْمُطْمَئِنَّةُ (89:27) : pourquoi ـة sur l'adjectif ?\n?\nParce que نَفْس (l'âme) est **féminin**. L'adjectif prend donc ـة : الْمُطْمَئِنَّةُ, « l'âme apaisée ».\n\n« de grandes maisons » : بُيُوتٌ كَبِيرَةٌ. Pourquoi un féminin singulier ?\n?\nUn **pluriel de choses** se traite comme un **féminin singulier** pour l'accord.\nPour des **personnes**, on garde le pluriel : رِجَالٌ صَالِحُونَ.\n\nرَبُّكَ الْأَكْرَمُ : pourquoi l'adjectif a-t-il ال alors que رَبُّكَ n'en a pas ?\n?\nرَبُّكَ est **défini** (grâce au pronom ـكَ). Un nom défini demande un adjectif **avec ال**.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Annexion.md","text":"---\ntype: flashcards\nrègle: L'annexion (iḍāfa)\n---\n# 🃏 L'annexion (iḍāfa) : cartes\n\n#flashcards/arabe/regles/2-phrase/annexion\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Génitif]] · [[Cartes - Adjectif]] · Règle complète : Atelier arabe › Règles › « L'annexion »\n\n> [!tip] Le fil rouge de ce paquet\n> « **le X de Y** » = deux noms collés. **X** : sans ال ni tanwīn, cas selon son rôle. **Y** : toujours au **génitif**.\n\nComment dit-on « **le X de Y** » en arabe ?\n?\nOn **colle deux noms**, sans mot pour « de » :\n- 1er nom (X) : **sans ال ni tanwīn**\n- 2e nom (Y) : au **génitif**\nكِتَابُ الطَّالِبِ = le livre **de** l'élève.\n\nLes deux interdits du **premier** nom de l'annexion ?\n?\n1. **Pas de ال** : jamais الْكِتَابُ الطَّالِبِ.\n2. **Pas de tanwīn** : jamais كِتَابٌ الطَّالِبِ.\nIl devient pourtant **défini** grâce au second nom : « **le** livre de l'élève ».\n\nQuel est le cas de chaque nom de l'annexion ?\n?\n- Le **2e** : **toujours** génitif.\n- Le **1er** : le cas de **son rôle** : sujet -u, complément -a, après préposition -i.\nنَصْرُ اللَّهِ (sujet) ; إِلَى بَيْتِ اللَّهِ (après إِلَى) ; رَأَيْتُ بَيْتَ اللَّهِ (complément).\n\nConstruis « la porte de la mosquée » (بَاب, مَسْجِد).\n?\n**بَابُ الْمَسْجِدِ** (*bābu l-masjidi*).\n\nمَالِكِ يَوْمِ الدِّينِ : explique la chaîne.\n?\n« le Maître **du** jour **du** Jugement ».\nيَوْمِ est à la fois le 2e mot (de مَالِكِ) et le 1er mot (de الدِّينِ). Chaque mot après le premier est au **génitif**.\n\nPourquoi رَبُّكَ n'a-t-il ni ال ni tanwīn ?\n?\nParce que le pronom collé ـكَ joue le rôle du **2e nom** : رَبُّكَ = « le Seigneur **de toi** » = ton Seigneur.\nTout nom avec un possessif est une annexion.\n\nبَيْتُ اللَّهِ الْحَرَامُ : où se met l'adjectif ? Quel cas prend-il ?\n?\nL'adjectif se met **après tout le groupe** (jamais entre les deux noms).\nIl copie le nom qu'il qualifie : الْحَرَامُ qualifie بَيْت (« la Maison sacrée »), donc il prend le **-u** de بَيْتُ.\n\nQue devient مُسْلِمُونَ en premier terme d'annexion ?\n?\nLe **ن tombe** : مُسْلِمُو مَكَّةَ (les musulmans de La Mecque).\nMême chose au duel : يَدَانِ → يَدَا أَبِي لَهَبٍ (les deux mains d'Abū Lahab).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Attribut (khabar).md","text":"---\ntype: flashcards\nrègle: L'attribut (khabar)\n---\n# 🃏 L'attribut (khabar) : cartes\n\n#flashcards/arabe/regles/2-phrase/attribut-khabar\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Phrase nominale]] · [[Cartes - Sujet (mubtada)]] · [[Cartes - Kana et ses sœurs]] · Règle complète : Atelier arabe › Règles › « L'attribut (khabar) »\n\n> [!tip] Le fil rouge de ce paquet\n> Le **khabar** (« l'information ») = **ce qu'on dit du sujet**. Il est au **nominatif**, souvent **indéfini**. Seul كَانَ le fait passer à l'accusatif.\n\nQu'est-ce que le **khabar** ?\n?\nL'**attribut** de la phrase nominale : ce qu'on **dit du sujet**, l'information nouvelle. Son nom veut dire « l'information ».\nIl est au **nominatif** (sauf après كَانَ).\n\nComment trouver l'attribut en 2 étapes ?\n?\n1. Trouve le **sujet** (le mot dont on parle).\n2. Demande : « **qu'est-ce qu'on dit de lui ?** » La réponse est l'attribut.\nIndice : il est souvent **indéfini** (avec tanwīn).\n\nDans الْبَيْتُ فِي الْمَدِينَةِ, quel est l'attribut ?\n?\n**فِي الْمَدِينَةِ** (dans la ville) : tout le groupe préposition + nom.\n« La maison est dans la ville. » À l'intérieur du groupe, الْمَدِينَةِ est au génitif (à cause de فِي).\n\nاللَّهُ الصَّمَدُ (112:2) : الصَّمَدُ est défini. Est-ce un adjectif ou l'attribut ?\n?\nIci c'est l'**attribut** : « Allah **est** l'Absolu ». La phrase n'a pas d'autre attribut.\nUn attribut défini ressemble à un adjectif : regarde s'il y a un autre attribut dans la phrase.\n\nQue devient l'attribut après إِنَّ ? Et après كَانَ ?\n?\n- Après **إِنَّ** : il **reste** au nominatif : إِنَّ اللَّهَ **غَفُورٌ**.\n- Après **كَانَ** : il passe à l'**accusatif** : كَانَ اللَّهُ **غَفُورًا**.\n\nإِنَّ الْإِنْسَانَ لَفِي خُسْرٍ : quel est l'attribut ?\n?\n**لَفِي خُسْرٍ** (« vraiment dans la perte ») : un groupe préposition + nom. Le لَـ ajoute de l'insistance.\n\nL'attribut peut-il venir **avant** le sujet ?\n?\n**Oui**, quand le sujet est indéfini et que l'attribut est un groupe avec préposition :\n**لَهُمْ** عَذَابٌ (à eux, un châtiment) ; **فِي الْبَيْتِ** رَجُلٌ (dans la maison, un homme).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Complément d'objet.md","text":"---\ntype: flashcards\nrègle: Le complément d'objet (mafʿūl bihi)\n---\n# 🃏 Le complément d'objet (mafʿūl bihi) : cartes\n\n#flashcards/arabe/regles/2-phrase/complement-objet\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Accusatif]] · [[Cartes - Phrase verbale]] · [[Cartes - Pronoms collés]] · Règle complète : Atelier arabe › Règles › « Le complément d'objet »\n\n> [!tip] Le fil rouge de ce paquet\n> Le complément d'objet répond à **« qui ? quoi ? »** après le verbe. Il est à l'**accusatif** (-a).\n\nQu'est-ce que le **mafʿūl bihi** ? À quel cas ?\n?\nLe **complément d'objet direct** : ce qui subit l'action (« ce sur quoi l'action est faite »).\nIl est à l'**accusatif** : -a, -an, ـِينَ.\n\nComment trouver le complément d'objet ?\n?\n1. Trouve le verbe.\n2. Pose la question « **qui ? quoi ?** » : خَلَقَ… il a créé **quoi** ?\n3. La réponse (الْإِنْسَانَ) est le complément, à l'accusatif.\n\nSous quelles 3 formes peut-il apparaître ?\n?\n1. **Un nom** : خَلَقَ **الْإِنْسَانَ**\n2. **Un pronom collé au verbe** : اهْدِ**نَا** (guide-**nous**), أَنْزَلْنَا**هُ** (nous **l'**avons fait descendre)\n3. **إِيَّا + pronom**, placé avant pour insister : **إِيَّاكَ** نَعْبُدُ\n\nأَعْطَيْنَاكَ الْكَوْثَرَ : combien de compléments ?\n?\n**Deux** : ـكَ (toi) et **الْكَوْثَرَ** (l'Abondance). « Nous **t'**avons donné **l'Abondance**. »\nLes verbes « donner, enseigner, faire voir » ont souvent deux compléments.\n\nيُحِبُّ اللَّهُ الْمُحْسِنِينَ : quel est le complément ?\n?\n**الْمُحْسِنِينَ** (les bienfaisants), à l'accusatif ـِينَ. اللَّهُ est le sujet (-u).\n\nآمَنَ بِاللَّهِ : اللَّه est-il un complément d'objet ?\n?\n**Non**. Le verbe se construit avec **بِـ** : après une préposition, **génitif** (-i). Il n'y a pas de complément direct.\n\nعَمِلُوا الصَّالِحَاتِ : pourquoi le complément finit-il par -i ?\n?\nC'est un **pluriel féminin** (ـَات) : il ne prend jamais -a. À l'accusatif, il prend **-i**.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Défini et indéfini.md","text":"---\ntype: flashcards\nrègle: Défini et indéfini (l'article al)\n---\n# 🃏 Défini et indéfini : cartes\n\n#flashcards/arabe/regles/2-phrase/defini-indefini\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - L'article al et l'alif wasla]] · [[Cartes - Le tanwin]] · [[Cartes - Adjectif]] · Règle complète : Atelier arabe › Règles › « Défini et indéfini »\n\n> [!tip] Le fil rouge de ce paquet\n> **ال** = « le, la, les » (défini). **Tanwīn** = « un, une » (indéfini). **Jamais les deux** sur le même mot.\n\nQue fait l'article **ال** ?\n?\nIl rend le nom **défini** : « le, la, les ». بَيْت (une maison) → **الْبَيْت** (la maison).\nIl s'écrit **collé** et ne change pas avec le genre ou le nombre.\n\nPeut-on avoir ال et tanwīn sur le même mot ?\n?\n**Jamais.** كِتَابٌ (un livre, *kitābun*) → الْكِتَابُ (le livre, *al-kitābu*).\nAvec ال, il ne reste qu'**une** voyelle à la fin.\n\nCite 4 façons d'être défini **sans** ال.\n?\n1. **Nom propre** : مُحَمَّد, مَكَّة (اللَّه est à part : son ال fait partie du nom)\n2. **Pronom collé** : رَبُّكَ (ton Seigneur)\n3. **Suivi d'un complément du nom** : رَبُّ الْعَالَمِينَ\n4. **Pronom** ou **démonstratif** : هُوَ, هَذَا\n\nكِتَابُهُ (son livre) : défini ou indéfini ?\n?\n**Défini**, grâce au pronom collé ـهُ. C'est pour ça qu'il n'a ni ال ni tanwīn.\n\nPourquoi la différence défini / indéfini est-elle si importante ?\n?\nElle montre s'il y a un « est » caché :\n- الْبَيْتُ الْكَبِيرُ = **la grande maison** (groupe)\n- الْبَيْتُ كَبِيرٌ = **la maison est grande** (phrase)\n\nأَلَمْ (n'est-ce pas ?) contient-il l'article ?\n?\n**Non.** أَلَمْ = أَ (question) + لَمْ (ne… pas). Ce ا ل ne sont pas l'article.\n\nComment traduire ال et le tanwīn en français ?\n?\n**ال ≈ « le, la, les »** (une chose précise, connue).\n**Tanwīn ≈ « un, une »** (une chose quelconque).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Inna et ses sœurs.md","text":"---\ntype: flashcards\nrègle: Inna et ses sœurs\n---\n# 🃏 Inna et ses sœurs : cartes\n\n#flashcards/arabe/regles/2-phrase/inna\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Kana et ses sœurs]] · [[Cartes - Accusatif]] · Règle complète : Atelier arabe › Règles › « Inna et ses sœurs »\n\n> [!tip] Le fil rouge de ce paquet\n> **إِنَّ** se met devant une phrase nominale : le **sujet passe à -a**, l'**attribut reste à -u**. Mémo : **inna touche le 1er mot**.\n\nQue fait **إِنَّ** à une phrase nominale ?\n?\nElle ajoute « **certes, vraiment** » et met le **sujet à l'accusatif** (-a).\nL'attribut **reste au nominatif** (-u).\nاللَّهُ غَفُورٌ → إِنَّ **اللَّهَ** غَفُورٌ.\n\nAjoute إِنَّ à : الْعِلْمُ نُورٌ (la science est une lumière).\n?\n**إِنَّ الْعِلْمَ نُورٌ** (*inna l-ʿilma nūrun*). Le sujet passe à -a, l'attribut reste -un.\n\nLes sœurs de inna et leur sens ?\n?\n- **إِنَّ** : certes\n- **أَنَّ** : que (après « savoir, dire »)\n- **لَكِنَّ** : mais\n- **كَأَنَّ** : comme si\n- **لَعَلَّ** : peut-être, afin que\n- **لَيْتَ** : si seulement\nToutes mettent le sujet à l'accusatif.\n\nإِنَّ الْإِنْسَانَ لَفِي خُسْرٍ : analyse.\n?\n- **الْإِنْسَانَ** : sujet de إِنَّ, accusatif (-a).\n- **لَفِي خُسْرٍ** : attribut (préposition + nom) ; لَـ ajoute encore de l'insistance.\n\nإِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ (108:3) : pourquoi شَانِئَ a -a et الْأَبْتَرُ a -u ?\n?\n- **شَانِئَكَ** (ton ennemi) : sujet de إِنَّ → -a.\n- **الْأَبْتَرُ** (le sans-postérité) : attribut → reste -u.\n\nإِنَّا, إِنَّهُ, إِنَّكَ : que sont-ils ?\n?\nإِنَّ + un **pronom collé** qui est son sujet :\nإِنَّا = certes **nous** ; إِنَّهُ = certes **lui** ; إِنَّكَ = certes **toi**.\n\nلَا رَيْبَ فِيهِ : quel لَا est-ce ?\n?\nLe لَا de **négation absolue** (« aucun »). Il agit comme إِنَّ : le nom passe à l'accusatif **sans tanwīn** : لَا رَيْبَ (aucun doute).\n\nإِنَّ et إِنْ : quelle différence ?\n?\n- **إِنَّ** (avec chadda) = « certes » : sujet à l'accusatif.\n- **إِنْ** (sans chadda) = « si » : aucun effet sur le nom.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Iʿrab (analyse).md","text":"---\ntype: flashcards\nrègle: L'iʿrāb (analyser une phrase)\n---\n# 🃏 L'iʿrāb : analyser une phrase, cartes\n\n#flashcards/arabe/regles/2-phrase/irab\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Les trois cas]] · [[Tableau 7 - Analyse mot à mot de la Fatiha]] · Règle complète : Atelier arabe › Règles › « L'iʿrāb »\n\n> [!tip] Le fil rouge de ce paquet\n> Faire l'**iʿrāb**, c'est répondre à **4 questions** pour chaque mot : nature, rôle, fin, signe.\n\nQu'est-ce que faire l'**iʿrāb** d'une phrase ?\n?\nExpliquer **chaque mot** : ce qu'il est, son rôle, sa fin, et pourquoi.\nC'est la méthode des grammairiens arabes depuis plus de mille ans.\n\nLes **4 questions** de l'iʿrāb, mot par mot ?\n?\n1. **Nom, verbe ou particule ?**\n2. **Quel rôle ?** sujet, attribut, complément, après préposition, complément du nom, adjectif…\n3. **Quelle fin ?** -u, -a, -i, soukoun, ou fin fixe\n4. **Quel signe la montre ?** la voyelle, ـونَ / ـينَ, ـانِ / ـيْنِ, ou une voyelle « estimée »\n\nFais l'iʿrāb de الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.\n?\n- **الْحَمْدُ** : nom, sujet (mubtadaʾ), nominatif, ḍamma\n- **لِـ** : particule, préposition, fin fixe\n- **اللَّهِ** : nom, après préposition, génitif, kasra\n- **رَبِّ** : nom, précise اللَّه, génitif, kasra\n- **الْعَالَمِينَ** : nom, complément du nom, génitif, ـِينَ\nLe groupe لِلَّهِ est l'**attribut**.\n\nQuels mots sont **mabnī** (fin fixe) ?\n?\nLes **particules**, les **pronoms**, les **démonstratifs**, les **relatifs**, les verbes au **passé** et à l'**impératif**.\nIls ont un rôle, mais aucune voyelle ne le montre : on dit « à la place d'un nominatif, d'un accusatif… ».\n\nQu'est-ce qu'une voyelle « **estimée** » ?\n?\nUne voyelle de cas qu'on ne **peut pas écrire**, parce que le mot finit par **ى** ou **ا** : هُدًى, مُوسَى.\nElle existe quand même ; on déduit le rôle grâce aux autres mots.\n\nPar quoi commencer pour analyser une phrase ?\n?\n1. Repère **le verbe** (s'il y en a un).\n2. Repère **les prépositions** : les noms qui les suivent sont au génitif.\n3. Il reste peu de mots : sujet, complément, attribut.\n\nFais l'iʿrāb de قُلْ (112:1).\n?\n**Verbe** à l'**impératif**, fin fixe en **soukoun**. Son sujet est caché : « **toi** ».\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Kana et ses sœurs.md","text":"---\ntype: flashcards\nrègle: Kāna et ses sœurs\n---\n# 🃏 Kāna et ses sœurs : cartes\n\n#flashcards/arabe/regles/2-phrase/kana\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Inna et ses sœurs]] · [[Cartes - Attribut (khabar)]] · Règle complète : Atelier arabe › Règles › « Kāna et ses sœurs »\n\n> [!tip] Le fil rouge de ce paquet\n> **كَانَ** met la phrase au passé : le **sujet reste à -u**, l'**attribut passe à -a**. Mémo : **kāna touche le 2e mot**. C'est l'inverse de إِنَّ.\n\nQue fait **كَانَ** à une phrase nominale ?\n?\nElle la met au **passé** (« était ») ou dit « **toujours** ».\nLe **sujet reste au nominatif**, l'**attribut passe à l'accusatif** (-a / -an).\nاللَّهُ غَفُورٌ → كَانَ اللَّهُ **غَفُورًا**.\n\nMets au passé : الْجَوُّ جَمِيلٌ (le temps est beau).\n?\n**كَانَ الْجَوُّ جَمِيلًا** (*kāna l-jawwu jamīlan*).\n\ninna ou kāna : comment ne pas les confondre ?\n?\n- **inna → le 1er mot** (le sujet) à l'accusatif : إِنَّ **اللَّهَ** غَفُورٌ.\n- **kāna → le 2e mot** (l'attribut) à l'accusatif : كَانَ اللَّهُ **غَفُورًا**.\nLes deux mettent un -a, mais pas sur le même mot.\n\nإِنَّهُ كَانَ تَوَّابًا (110:3) : pourquoi تَوَّابًا ?\n?\nC'est l'**attribut** de كَانَ : accusatif indéfini **-an**. « Il est **toujours** Accueillant au repentir. »\n\nLes sœurs de kāna ?\n?\n- **لَيْسَ** : ne pas être\n- **أَصْبَحَ** / **صَارَ** : devenir\n- **ظَلَّ** : rester\n- **مَا زَالَ** : ne pas cesser d'être\nMême effet : attribut à l'accusatif.\n\nوَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ (112:4) : sujet ? attribut ?\n?\n- يَكُنْ = كَانَ (après لَمْ).\n- **كُفُوًا** (-an) : l'attribut, à l'accusatif.\n- **أَحَدٌ** (-un) : le sujet, au nominatif.\n« Nul n'est égal à Lui. » L'attribut vient avant le sujet ici.\n\nConjugue كَانَ : j'étais, nous étions, ils étaient.\n?\n**كُنْتُ** (j'étais), **كُنَّا** (nous étions), **كَانُوا** (ils étaient).\nPrésent : يَكُونُ ; après لَمْ : **لَمْ يَكُنْ** (le و tombe).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Phrase nominale.md","text":"---\ntype: flashcards\nrègle: La phrase nominale\n---\n# 🃏 La phrase nominale : cartes\n\n#flashcards/arabe/regles/2-phrase/phrase-nominale\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Sujet (mubtada)]] · [[Cartes - Attribut (khabar)]] · [[Cartes - Phrase verbale]] · Règle complète : Atelier arabe › Règles › « La phrase nominale »\n\n> [!tip] Le fil rouge de ce paquet\n> Une phrase nominale = **sujet + attribut**, **sans verbe « être »** au présent, et les deux au **nominatif**.\n\nQu'est-ce qu'une **phrase nominale** ?\n?\nUne phrase qui commence par un **nom** (ou un pronom), sans verbe « être » au présent.\nDeux parties, toutes deux au **nominatif** :\n- le **sujet** (mubtadaʾ) : ce dont on parle\n- l'**attribut** (khabar) : ce qu'on en dit\n\nConstruis « la maison est grande » (maison = بَيْت, grand = كَبِير).\n?\n**الْبَيْتُ كَبِيرٌ** (*al-baytu kabīrun*).\n1. Sujet défini : الْبَيْتُ (-u)\n2. Attribut indéfini : كَبِيرٌ (-un)\n3. Côte à côte, rien entre les deux : le « est » est sous-entendu.\n\nالْبَيْتُ الْكَبِيرُ et الْبَيْتُ كَبِيرٌ : quelle différence ?\n?\n- **الْبَيْتُ الْكَبِيرُ** (défini + défini) = « **la grande maison** » : un simple groupe, pas une phrase.\n- **الْبَيْتُ كَبِيرٌ** (défini + indéfini) = « la maison **est** grande » : une phrase complète.\nC'est le ال (ou son absence) sur le 2e mot qui fait la différence.\n\nQuelles **formes** peut prendre l'attribut ? (4)\n?\n1. Un **nom / adjectif** : اللَّهُ أَحَدٌ (Allah est Un)\n2. **Préposition + nom** : الْحَمْدُ لِلَّهِ (la louange est à Allah)\n3. Une **phrase verbale** : اللَّهُ يَعْلَمُ (Allah sait)\n4. Un **adverbe de lieu/temps** : الْجَنَّةُ تَحْتَ أَقْدَامِ الْأُمَّهَاتِ\n\nComment dit-on « **il y a** » et « **avoir** » avec une phrase nominale ?\n?\nOn met **préposition + nom** en tête, puis le sujet **indéfini** :\n- فِي الْبَيْتِ رَجُلٌ = il y a un homme dans la maison\n- لَهُمْ عَذَابٌ = ils auront un châtiment (« à eux, un châtiment »)\n- لِي كِتَابٌ = j'ai un livre\n\nلَيْلَةُ الْقَدْرِ خَيْرٌ (97:3) : sujet ? attribut ?\n?\n- Sujet : **لَيْلَةُ الْقَدْرِ** (« la nuit du Destin »), une annexion, -u sur لَيْلَةُ.\n- Attribut : **خَيْرٌ** (« meilleure »), indéfini, -un.\n\nComment mettre une phrase nominale au **passé** ? Et comment **insister** ?\n?\n- Passé : **كَانَ** devant ; l'attribut passe à l'accusatif : كَانَ الْبَيْتُ **كَبِيرًا**.\n- Insister (« certes ») : **إِنَّ** devant ; le sujet passe à l'accusatif : إِنَّ **الْبَيْتَ** كَبِيرٌ.\n\nPourquoi trouve-t-on parfois هُوَ entre deux mots définis : اللَّهُ هُوَ الْغَنِيُّ ?\n?\nPour montrer que c'est une **phrase** et pas un groupe. Sans هُوَ, اللَّهُ الْغَنِيُّ pourrait se lire « Allah le Riche ».\nAvec هُوَ : « Allah, **c'est Lui** le Riche ».\n\nTraduis : الْكِتَابُ جَدِيدٌ (jadīd = nouveau).\n?\n« **Le livre est nouveau.** » Sujet défini (-u) + attribut indéfini (-un).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Phrase verbale.md","text":"---\ntype: flashcards\nrègle: La phrase verbale\n---\n# 🃏 La phrase verbale : cartes\n\n#flashcards/arabe/regles/2-phrase/phrase-verbale\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Sujet du verbe (fail)]] · [[Cartes - Complément d'objet]] · [[Cartes - Phrase nominale]] · Règle complète : Atelier arabe › Règles › « La phrase verbale »\n\n> [!tip] Le fil rouge de ce paquet\n> Ordre habituel : **verbe → sujet (-u) → complément (-a)**. Les terminaisons permettent de changer l'ordre sans changer le sens.\n\nQuel est l'ordre habituel d'une **phrase verbale** ?\n?\n**Verbe → sujet (-u) → complément (-a)**.\nكَتَبَ الْوَلَدُ الدَّرْسَ = « a écrit l'enfant la leçon » = l'enfant a écrit la leçon.\n\nكَتَبَ الدَّرْسَ الْوَلَدُ : le sens change-t-il ?\n?\n**Non.** الْوَلَدُ a toujours -u (sujet), الدَّرْسَ a toujours -a (complément).\nC'est la terminaison qui décide, pas la place.\n\nPourquoi met-on parfois le complément **avant** le verbe : إِيَّاكَ نَعْبُدُ ?\n?\nPour **insister** : « c'est **Toi** (et personne d'autre) que nous adorons ».\nLe complément placé en tête attire toute l'attention.\n\nجَاءَ الرِّجَالُ ou جَاءُوا الرِّجَالُ ?\n?\n**جَاءَ الرِّجَالُ**. Quand le verbe est **avant** le sujet, il reste au **singulier** (il s'accorde seulement en genre : جَاءَتِ النِّسَاءُ).\nSi le sujet est avant : الرِّجَالُ **جَاءُوا** (accord complet).\n\nوَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا (99:2) : verbe, sujet, complément ?\n?\n- Verbe : **أَخْرَجَتْ** (elle a fait sortir), au féminin comme الْأَرْض.\n- Sujet : **الْأَرْضُ** (-u).\n- Complément : **أَثْقَالَهَا** (-a), « ses fardeaux ».\n\nخَلَقْنَا : où est le sujet ?\n?\n**Dans la terminaison** du verbe : ـنَا = « nous ». خَلَقْنَا = **nous** avons créé.\nQuand le sujet est un pronom (je, tu, nous…), il n'y a pas de mot séparé.\n\nQue se passe-t-il si un nom vient **avant** le verbe : اللَّهُ يَعْلَمُ ?\n?\nLa phrase devient une **phrase nominale** : اللَّهُ est le sujet (mubtadaʾ), et la phrase verbale يَعْلَمُ est son attribut.\n« Allah, Il sait. »\n\nأَكَلَ التُّفَّاحَةَ الْوَلَدُ : qui a mangé quoi ?\n?\n**L'enfant** (الْوَلَدُ, -u) a mangé **la pomme** (التُّفَّاحَةَ, -a).\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Pronoms collés.md","text":"---\ntype: flashcards\nrègle: Les pronoms collés\n---\n# 🃏 Les pronoms collés : cartes\n\n#flashcards/arabe/regles/2-phrase/pronoms\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Prépositions]] · [[Cartes - Le passé]] · Règle complète : Atelier arabe › Règles › « Les pronoms collés »\n\n> [!tip] Le fil rouge de ce paquet\n> Le même pronom change de sens selon ce qui le porte : sur un **nom** = « mon, ton… », sur un **verbe** = « me, te… », sur une **préposition** = « moi, toi… ».\n\nـكَ : que veut-il dire sur un nom, un verbe, une préposition ?\n?\n- nom : **ton** : رَبُّكَ (ton Seigneur)\n- verbe : **te** : أَعْطَيْنَاكَ (nous **t'**avons donné)\n- préposition : **toi** : لَكَ (à toi)\n\nDonne le sens de : ـي / ـهُ / ـهَا / ـنَا.\n?\n- **ـي** (ـنِي sur un verbe) : mon / me / moi\n- **ـهُ** : son (à lui) / le / lui\n- **ـهَا** : son (à elle) / la / elle\n- **ـنَا** : notre / nous / nous\n\nDonne le sens de : ـكُمْ / ـهُمْ / ـكِ.\n?\n- **ـكُمْ** : votre / vous\n- **ـهُمْ** : leur / les / eux\n- **ـكِ** : ton / te / toi, en parlant à une **femme**\n\nأَنْزَلْنَاهُ (97:1) : décompose.\n?\nأَنْزَلْ + **نَا** + **هُ**\n- ـنَا = **nous** (le sujet)\n- ـهُ = **le** (le complément)\n« **Nous l'**avons fait descendre. »\n\nPourquoi فِيهِ, عَلَيْهِمْ, رَبِّهِمْ (avec -hi) mais لَهُ, رَبُّهُمْ (avec -hu) ?\n?\nAprès un son **i** ou **y**, ـهُ devient **ـهِ** et ـهُمْ devient **ـهِمْ** : c'est plus facile à dire.\nSans i ou y avant : ـهُ / ـهُمْ restent.\n\nPourquoi عَلَّمَنِي et pas عَلَّمِي pour « il **m'**a enseigné » ?\n?\nSur un **verbe**, « me » s'écrit **ـنِي** : on ajoute un ن.\nSur un nom, « mon » est juste ـي : كِتَابِي (mon livre).\n\nأَنْعَمْتَ : ـتَ est-il un complément (« te ») ?\n?\n**Non.** Sur un verbe au passé, ـتَ, ـتُ, ـنَا, ـوا sont des **terminaisons de sujet** : أَنْعَمْتَ = **tu** as comblé.\n\nرَبَّنَا : que veut dire ce mot ?\n?\n« **notre** Seigneur », souvent « **ô notre Seigneur !** » dans les invocations.\n\nUn nom avec un pronom possessif peut-il avoir ال ?\n?\n**Non.** Il est déjà **défini** : jamais de ال ni de tanwīn. رَبُّكَ, pas الرَّبُّكَ.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Sujet (mubtada).md","text":"---\ntype: flashcards\nrègle: Le sujet de la phrase nominale (mubtadaʾ)\n---\n# 🃏 Le sujet de la phrase nominale (mubtadaʾ) : cartes\n\n#flashcards/arabe/regles/2-phrase/sujet-mubtada\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Phrase nominale]] · [[Cartes - Attribut (khabar)]] · [[Cartes - Sujet du verbe (fail)]] · Règle complète : Atelier arabe › Règles › « Le sujet (mubtadaʾ) »\n\n> [!tip] Le fil rouge de ce paquet\n> Le **mubtadaʾ** (« ce par quoi on commence ») = le mot **dont on parle** dans une phrase **sans verbe**. Il est au **nominatif** et en général **défini**.\n\nQu'est-ce que le **mubtadaʾ** ? À quel cas est-il ?\n?\nLe **sujet d'une phrase nominale** : le mot dont on parle. Son nom veut dire « ce par quoi on commence ».\nIl est au **nominatif** : -u, ـُونَ, ـَانِ.\n\nQuels mots peuvent être mubtadaʾ ? (5 types)\n?\nUn mot **défini** :\n- nom avec ال : **الْحَمْدُ** لِلَّهِ\n- nom propre : **اللَّهُ** الصَّمَدُ\n- pronom : **هُوَ** اللَّهُ\n- démonstratif : **ذَلِكَ** الْكِتَابُ\n- annexion : **لَيْلَةُ الْقَدْرِ** خَيْرٌ\n\nوَرَبُّكَ الْأَكْرَمُ (96:3) : quel est le sujet ?\n?\n**رَبُّكَ** (ton Seigneur), défini grâce au pronom ـكَ, au nominatif (-u).\nالْأَكْرَمُ (le Très-Noble) est l'attribut.\n\nلَهُمْ عَذَابٌ : où est le sujet ? Pourquoi est-il **après** ?\n?\nLe sujet est **عَذَابٌ** (un châtiment), au nominatif -un.\nIl est **indéfini** : dans ce cas, l'arabe le place **après** l'attribut (لَهُمْ). On l'appelle « sujet retardé ». Il reste au nominatif.\n\nLe mubtadaʾ et le fāʿil : quelle différence ?\n?\n- **mubtadaʾ** : sujet d'une phrase **sans verbe** ; il vient **en tête** : **اللَّهُ** أَحَدٌ.\n- **fāʿil** : sujet d'un **verbe** ; il vient **après** le verbe : جَاءَ **نَصْرُ** اللَّهِ.\nLes deux sont au nominatif.\n\nQue devient le mubtadaʾ après إِنَّ ?\n?\nIl passe à l'**accusatif** (-a) : الْإِنْسَانُ فِي خُسْرٍ → إِنَّ **الْإِنْسَانَ** لَفِي خُسْرٍ.\nAprès كَانَ, au contraire, il **reste** au nominatif.\n\nهُوَ اللَّهُ : هُوَ est sujet. Pourquoi ne voit-on pas de -u ?\n?\nهُوَ est un **pronom** : sa fin est **fixe** (mabnī). Il est sujet, mais aucune voyelle ne le montre.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - Sujet du verbe (fail).md","text":"---\ntype: flashcards\nrègle: Le sujet du verbe (fāʿil)\n---\n# 🃏 Le sujet du verbe (fāʿil) : cartes\n\n#flashcards/arabe/regles/2-phrase/sujet-fail\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Nominatif]] · [[Cartes - Phrase verbale]] · [[Cartes - Le passif]] · Règle complète : Atelier arabe › Règles › « Le sujet du verbe (fāʿil) »\n\n> [!tip] Le fil rouge de ce paquet\n> Le **fāʿil** (« celui qui fait ») = celui qui fait l'action. Il vient **après** le verbe, au **nominatif** (-u). Parfois il est caché dans la terminaison du verbe.\n\nQu'est-ce que le **fāʿil** ? Cas et place ?\n?\nLe **sujet d'un verbe** : celui qui fait l'action. Son nom veut dire « celui qui fait ».\nIl est au **nominatif** et vient **après** le verbe : جَاءَ **نَصْرُ** اللَّهِ.\n\nSous quelles 3 formes peut apparaître le fāʿil ?\n?\n1. **Un mot séparé**, après le verbe : جَاءَ **نَصْرُ** اللَّهِ.\n2. **Une terminaison** du verbe : خَلَقْ**نَا** (nous), أَنْعَمْ**تَ** (tu), قَالُ**وا** (ils).\n3. **Rien de visible** : « il » ou « elle » sous-entendu : خَلَقَ = **il** a créé.\n\nأَلْهَاكُمُ التَّكَاثُرُ (102:1) : qui fait l'action ?\n?\n**التَّكَاثُرُ** (la course aux richesses), au nominatif -u.\nـكُمْ (vous), collé au verbe, est le **complément** : « la course aux richesses **vous** distrait ».\n\nAu passif, comment s'appelle le sujet ? À quel cas ?\n?\n**nāʾib al-fāʿil** (« le remplaçant du sujet ») : celui qui **subit** l'action.\nIl est au **nominatif** : زُلْزِلَتِ **الْأَرْضُ** (la terre a été secouée).\n\nفَعَلَ رَبُّكَ (105:1) : pourquoi رَبُّ a-t-il -u ?\n?\n« Ton Seigneur a agi ». Qui a agi ? **ton Seigneur** : c'est le fāʿil, donc nominatif -u.\n\nأَنْعَمْتَ عَلَيْهِمْ : qui est le sujet ?\n?\n**« tu »**, caché dans la terminaison ـتَ : « (ceux) que **Tu** as comblés ».\nعَلَيْهِمْ (sur eux) est un groupe préposition + pronom.\n"},{"path":"5 - Flashcards/Règles/2 - La phrase/Cartes - État (hal).md","text":"---\ntype: flashcards\nrègle: Le complément d'état (ḥāl)\n---\n# 🃏 Le complément d'état (ḥāl) : cartes\n\n#flashcards/arabe/regles/2-phrase/hal\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Accusatif]] · [[Cartes - Adjectif]] · Règle complète : Atelier arabe › Règles › « Le ḥāl »\n\n> [!tip] Le fil rouge de ce paquet\n> Le **ḥāl** répond à « **dans quel état ? comment ?** » pendant l'action. Il est **indéfini** et à l'**accusatif** (-an).\n\nQu'est-ce que le **ḥāl** ?\n?\nUn mot qui dit **dans quel état** est quelqu'un **pendant** l'action : « il est venu **en courant** ».\nEn général : **indéfini** + **accusatif** (-an).\n\nجَاءَ الرَّجُلُ مُسْرِعًا : traduis et explique مُسْرِعًا.\n?\n« L'homme est venu **en se pressant** ».\nمُسْرِعًا répond à « comment est-il venu ? » : c'est un ḥāl, indéfini, -an.\n\nارْجِعِي إِلَى رَبِّكِ رَاضِيَةً مَرْضِيَّةً (89:28) : pourquoi -atan ?\n?\n« Retourne vers ton Seigneur, **satisfaite et agréée** ».\nDeux ḥāl : l'état de l'âme pendant le retour. Indéfinis, accusatif (-an, écrit ـَةً), au féminin comme l'âme.\n\nيَدْخُلُونَ فِي دِينِ اللَّهِ أَفْوَاجًا : rôle de أَفْوَاجًا ?\n?\nUn **ḥāl** : « ils entrent **en foule** » (comment entrent-ils ?). Accusatif -an.\n\nالرَّجُلُ الْمُسْرِعُ / الرَّجُلُ مُسْرِعًا : quelle différence ?\n?\n- **الْمُسْرِعُ** : adjectif, avec ال, copie le cas : « l'homme pressé ».\n- **مُسْرِعًا** : ḥāl, sans ال, accusatif : « l'homme, (étant) pressé ».\n\nLe ḥāl peut-il être une phrase ?\n?\n**Oui**, avec **وَ** « alors que » : جَاءَ **وَهُوَ يَضْحَكُ** = il est venu **en riant** (« alors qu'il riait »).\n\nدَخَلَ الطَّالِبُ فَرِحًا : que veut dire فَرِحًا ?\n?\n« **joyeux** » : l'élève est entré, joyeux. Ḥāl indéfini, -an.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - L'impératif.md","text":"---\ntype: flashcards\nrègle: L'impératif (al-amr)\n---\n# 🃏 L'impératif (al-amr) : cartes\n\n#flashcards/arabe/regles/3-verbe/imperatif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le présent]] · [[Cartes - L'article al et l'alif wasla]] · Règle complète : Atelier arabe › Règles › « L'impératif »\n\n> [!tip] Le fil rouge de ce paquet\n> Impératif = présent « tu » **sans sa lettre du début**, avec **soukoun** à la fin. Si ça commence par deux consonnes : on ajoute un **alif** devant.\n\nComment fabriquer l'impératif ? (4 étapes, avec تَقْرَأُ)\n?\n1. Présent « tu » : تَقْرَأُ (tu lis)\n2. On enlève تَـ : قْرَأُ\n3. Soukoun à la fin : قْرَأْ\n4. Deux consonnes au début (q-r) : on ajoute **ا** devant → **اقْرَأْ** (*iqraʾ*) = lis !\n\nQuelle voyelle pour l'alif de l'impératif : i ou u ?\n?\n- **u** si le présent a **u** au milieu : تَعْبُدُ → **اعْبُدْ** (*uʿbud*)\n- **i** sinon : تَقْرَأُ → **اقْرَأْ** (*iqraʾ*) ; تَجْلِسُ → اجْلِسْ (*ijlis*)\n\nImpératif : toi (homme), toi (femme), vous ?\n?\n- toi (h.) : **اعْبُدْ** (soukoun)\n- toi (f.) : **اعْبُدِي** (-ī)\n- vous : **اعْبُدُوا** (-ū)\n\nPourquoi قُلْ (dis !) n'a-t-il pas d'alif ?\n?\nتَقُولُ → on enlève تَـ : قُولُ commence déjà par une **voyelle** (qu-), pas besoin d'alif.\nLe و tombe car on ne peut pas avoir ū + soukoun : **قُلْ**.\n\nفَصَلِّ لِرَبِّكَ وَانْحَرْ (108:2) : deux impératifs. Explique.\n?\n- **صَلِّ** (prie !) : de تُصَلِّي, le ي final tombe.\n- **انْحَرْ** (sacrifie !) : alif de liaison, **muet** après وَ : *wa-nḥar*.\n\nاهْدِنَا : est-ce un ordre ?\n?\nGrammaticalement oui (impératif + نَا), mais adressé à Allah, c'est une **prière** : « **guide-nous** ».\n\n« Ne dis pas » : est-ce un impératif ?\n?\n**Non.** La défense = **لَا + présent au jussif** : لَا تَقُلْ (ne dis pas).\n\nImpératif de تَكْتُبُ (tu écris) ?\n?\n**اكْتُبْ** (*uktub*) : on enlève تَـ, soukoun final, alif avec **u** (présent en u au milieu).\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Le passif.md","text":"---\ntype: flashcards\nrègle: Le passif (al-majhūl)\n---\n# 🃏 Le passif (al-majhūl) : cartes\n\n#flashcards/arabe/regles/3-verbe/passif\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Nominatif]] · [[Cartes - Sujet du verbe (fail)]] · Règle complète : Atelier arabe › Règles › « Le passif »\n\n> [!tip] Le fil rouge de ce paquet\n> Le passif ne se fait pas avec « être » : on **change les voyelles**. Passé : **u – i** (كُتِبَ). Présent : **yu – a** (يُكْتَبُ). Ce qui subit devient **sujet**, au **nominatif**.\n\nComment forme-t-on le passif au **passé** ?\n?\n**u** sur la 1re lettre, **i** sur l'avant-dernière : كَتَبَ (il a écrit) → **كُتِبَ** (*kutiba*, il a été écrit).\n\nComment forme-t-on le passif au **présent** ?\n?\n**u** sur la lettre du début, **a** avant la dernière : يَكْتُبُ (il écrit) → **يُكْتَبُ** (*yuktabu*, il est écrit).\n\nكُتِبَ عَلَيْكُمُ الصِّيَامُ (2:183) : traduis. Pourquoi الصِّيَامُ a -u ?\n?\n« Le jeûne vous **a été prescrit** ».\nAu passif, ce qui subit devient le **sujet** (nāʾib al-fāʿil) : nominatif **-u**.\n\nQue veulent dire خُلِقَ et رُزِقَ ?\n?\n- **خُلِقَ** : il **a été créé** (de خَلَقَ)\n- **رُزِقَ** : il **a été pourvu** (de رَزَقَ)\n\nوَلَمْ يُولَدْ (112:3) : explique.\n?\n**يُولَدُ** = il est engendré (passif présent de يَلِدُ). Après لَمْ : jussif **يُولَدْ**.\n« et Il **n'a pas été engendré** ».\n\nComment reconnaître un passif ?\n?\n- **u au début d'un passé** : presque toujours passif (كُتِبَ, زُلْزِلَتْ).\n- **يُـ … a** au présent : souvent passif (يُولَدُ).\nAttention : les formes II et IV ont aussi يُـ (يُؤْمِنُ). Regarde la voyelle **avant la dernière lettre** : **a** = passif, **i** = actif.\n\nPassif de قَالَ (il a dit) ?\n?\n**قِيلَ** (*qīla*) = il a été dit. Verbe faible : la forme change davantage.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Le passé.md","text":"---\ntype: flashcards\nrègle: Le passé (al-māḍī)\n---\n# 🃏 Le passé (al-māḍī) : cartes\n\n#flashcards/arabe/regles/3-verbe/passe\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le présent]] · [[Cartes - Pronoms collés]] · Règle complète : Atelier arabe › Règles › « Le passé »\n\n> [!tip] Le fil rouge de ce paquet\n> Le passé = le verbe de base **فَعَلَ** (« **il** a fait ») + une **terminaison** pour la personne. La personne est **à la fin**.\n\nComment se forme le passé ?\n?\n1. On met la racine dans le moule **فَعَلَ** : كَتَبَ = **il** a écrit (forme du dictionnaire).\n2. Pour une autre personne, on ajoute une **terminaison** : كَتَبْ + تُ = **كَتَبْتُ** (j'ai écrit).\nLe sujet est dans la terminaison : pas besoin de « je ».\n\nTerminaisons du passé : il / elle / tu (m.) / tu (f.) / je.\n?\n- il : **ـَ** كَتَبَ\n- elle : **ـَتْ** كَتَبَتْ\n- tu (homme) : **ـْتَ** كَتَبْتَ\n- tu (femme) : **ـْتِ** كَتَبْتِ\n- je : **ـْتُ** كَتَبْتُ\n\nTerminaisons du passé : ils / vous / nous.\n?\n- ils : **ـُوا** كَتَبُوا (l'alif ne se prononce pas)\n- vous : **ـْتُمْ** كَتَبْتُمْ\n- nous : **ـْنَا** كَتَبْنَا\n\nQue veulent dire كَتَبْنَا et كَتَبَتْ ?\n?\n**nous avons écrit** (-nā) ; **elle a écrit** (-at).\n\nأَنْعَمْتَ (1:7) : quelle personne ?\n?\n**-ta** = « **tu** » : « (ceux que) **Tu** as comblés ».\nAttention : -ta (tu, homme), -ti (tu, femme), -tu (je) : seule la dernière voyelle change.\n\nأَعْطَيْنَاكَ : décompose.\n?\nأَعْطَيْ + **نَا** (sujet : **nous**) + **كَ** (complément : **toi**).\n« **Nous t'**avons donné. »\n\nقَالَ (il a dit) → « j'ai dit » ?\n?\n**قُلْتُ** (*qultu*). La racine est ق و ل : le ā de قَالَ **raccourcit** en u devant -tu.\nMême chose : كَانَ → كُنْتُ (j'étais).\n\nإِذَا جَاءَ نَصْرُ اللَّهِ : pourquoi traduit-on au futur ?\n?\nAprès **إِذَا** (quand) ou **إِنْ** (si), un verbe au passé se traduit souvent au **présent ou futur** : « **quand viendra** le secours d'Allah ».\n\nقَالَ النَّاسُ ou قَالُوا النَّاسُ ?\n?\n**قَالَ النَّاسُ**. Quand le sujet nommé est **après**, le verbe reste au **singulier**.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Le présent.md","text":"---\ntype: flashcards\nrègle: Le présent (al-muḍāriʿ)\n---\n# 🃏 Le présent (al-muḍāriʿ) : cartes\n\n#flashcards/arabe/regles/3-verbe/present\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le passé]] · [[Cartes - Les modes]] · [[Tableau 5 - Préfixes et particules]] · Règle complète : Atelier arabe › Règles › « Le présent »\n\n> [!tip] Le fil rouge de ce paquet\n> Au présent, la personne est marquée **au début** par une lettre : **أ ن ي ت** (« anaytu »). La fin normale est **-u**.\n\nComment se forme le présent ?\n?\n1. Racine dans le moule **يَفْعُلُ** : ع ب د → **يَعْبُدُ** (il adore).\n2. Pour changer de personne, on change la **lettre du début** : **نَ**عْبُدُ (nous adorons).\n3. Pour « ils, vous », on ajoute aussi une **fin** : يَعْبُدُونَ.\n\nLes 4 lettres du début du présent (« أَنَيْتُ ») ?\n?\n- **أَ** = je : أَعْبُدُ\n- **نَ** = nous : نَعْبُدُ\n- **يَ** = il / ils : يَعْبُدُ / يَعْبُدُونَ\n- **تَ** = tu / elle / vous : تَعْبُدُ / تَعْبُدُونَ\n\nإِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ : quelle personne ?\n?\n**nous** : la lettre **نَـ** au début. « C'est Toi que **nous** adorons, et Toi dont **nous** demandons l'aide. »\n\nQue veulent dire يَعْلَمُونَ et أَعْلَمُ ?\n?\n- **يَعْلَمُونَ** : **ils** savent (يَـ … ـُونَ)\n- **أَعْلَمُ** : **je** sais (أَ)\n\nأَعُوذُ بِرَبِّ الْفَلَقِ : quelle personne ?\n?\n**je** (أَ) : « **Je** cherche refuge auprès du Seigneur de l'aube ».\n\nتَعْبُدُ : « tu adores » ou « elle adore » ?\n?\n**Les deux** ont la même forme. C'est le **contexte** qui décide.\n\nComment dire le **futur** ?\n?\nOn met **سَـ** ou **سَوْفَ** devant le présent : **سَ**يَعْلَمُونَ = ils **sauront**.\n\nPourquoi يُؤْمِنُونَ commence-t-il par **يُـ** (u) et pas يَـ ?\n?\nC'est un verbe **dérivé** (formes II, III, IV) : la 1re lettre prend une **ḍamma**.\nLa lettre veut toujours dire la même personne : يُـ = il / ils.\n\nLa voyelle du milieu : يَعْبُدُ, يَضْرِبُ, يَعْلَمُ. Y a-t-il une règle ?\n?\n**Non**, pas de règle simple : u, i ou a s'apprend avec chaque verbe. Le dictionnaire de l'Atelier donne la bonne forme.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Les modes.md","text":"---\ntype: flashcards\nrègle: Les modes du présent\n---\n# 🃏 Les modes du présent : cartes\n\n#flashcards/arabe/regles/3-verbe/modes\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le présent]] · Règle complète : Atelier arabe › Règles › « Les modes »\n\n> [!tip] Le fil rouge de ce paquet\n> Comme les noms ont des cas, le présent a des **modes** : **-u** (normal), **-a** (subjonctif), **soukoun** (jussif). C'est le **petit mot devant** qui choisit.\n\nLes 3 modes du présent et leur fin ?\n?\n- **normal** (indicatif) : **-u** : يَعْلَمُ\n- **subjonctif** : **-a** : أَنْ يَعْلَمَ\n- **jussif** : **soukoun** : لَمْ يَعْلَمْ\n\nQuels petits mots donnent le **subjonctif** (-a) ?\n?\n**أَنْ** (que), **لَنْ** (ne… jamais), **كَيْ** / **لِـ** (pour que).\nلَنْ يَعْلَمَ = il ne saura jamais.\n\nQuels petits mots donnent le **jussif** (soukoun) ?\n?\n**لَمْ** (ne… pas, au passé), **لَا** de défense (ne… pas !), **لِـ** d'ordre (qu'il…), **إِنْ** (si).\nلَمْ يَعْلَمْ = il n'a pas su.\n\nلَمْ يَلِدْ وَلَمْ يُولَدْ (112:3) : pourquoi le soukoun ? Quel temps en français ?\n?\nÀ cause de **لَمْ** : jussif (soukoun).\n**لَمْ + présent = passé négatif** : « Il **n'a pas** engendré et **n'a pas été** engendré ».\n\nمَا لَمْ يَعْلَمْ (96:5) : pourquoi يَعْلَمْ finit-il par un soukoun ?\n?\nÀ cause de **لَمْ** devant : jussif, sens passé : « ce qu'il **ne savait pas** ».\n\nQue devient يَعْلَمُونَ après لَمْ ou أَنْ ?\n?\nLe **-na** final **tombe** : لَمْ يَعْلَمُوا (ils n'ont pas su) ; أَنْ تَصُومُوا (que vous jeûniez).\nL'alif ajouté après le و ne se prononce pas.\n\nلَمْ يَكُنْ : pourquoi pas لَمْ يَكُونْ ?\n?\nUn verbe **faible** perd sa voyelle longue au jussif : يَكُونُ → **يَكُنْ** ; يَرَى → لَمْ **يَرَ**.\n\nلَا تَقُلْ / لَا يَعْلَمُونَ : quelle différence ?\n?\n- لَا **تَقُلْ** (jussif) : **défense** : « ne dis pas ! »\n- لَا **يَعْلَمُونَ** (normal, -na gardé) : simple **négation** : « ils ne savent pas ».\nRegarde la **fin** du verbe.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Racine.md","text":"---\ntype: flashcards\nrègle: La racine\n---\n# 🃏 La racine : cartes\n\n#flashcards/arabe/regles/3-verbe/racine\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Schème (moule)]] · [[Tableau 6 - Racines de la Fatiha]] · Règle complète : Atelier arabe › Règles › « La racine »\n\n> [!tip] Le fil rouge de ce paquet\n> Presque chaque mot arabe repose sur **3 consonnes** qui portent une idée. Les voyelles et les lettres ajoutées autour donnent la nuance.\n\nQu'est-ce que la **racine** d'un mot arabe ?\n?\nEn général **trois consonnes**, toujours dans le même ordre, qui portent une **idée**.\nك ت ب = l'idée d'**écrire**. En arabe : jadhr (« la racine de l'arbre »).\n\nDonne 5 mots de la racine ك ت ب et leur sens.\n?\n- كَتَبَ (*kataba*) : il a écrit\n- كَاتِب (*kātib*) : celui qui écrit\n- كِتَاب (*kitāb*) : un livre\n- مَكْتَب (*maktab*) : un bureau (le lieu où l'on écrit)\n- مَكْتُوب (*maktūb*) : écrit, ce qui est écrit\n\nComment trouver la racine d'un mot ? (4 étapes)\n?\n1. Enlève ce qui est **devant** : ال, وَ, بِـ, لِـ, فَـ.\n2. Enlève ce qui est **derrière** : pronoms (ـهُ ـكَ…), ـة, ـونَ ـِينَ ـَات.\n3. Enlève les **lettres de service** : ا و ي au milieu, مـ ou تـ au début.\n4. Il reste en général **3 consonnes**.\n\nQuelle est la racine de الْمُسْلِمُونَ ?\n?\nOn enlève ال, مُـ et ـونَ : il reste **س ل م** (paix, soumission).\nMême famille : سَلَام (la paix), إِسْلَام (la soumission à Dieu).\n\nQuelle est la racine de مَسْجِد (mosquée) ?\n?\nOn enlève مَـ (le lieu) : **س ج د** (se prosterner).\nمَسْجِد = « le lieu où l'on se prosterne ». Même famille : سَجَدَ, سُجُود.\n\nعَلَّمَ : combien de lettres dans la racine ?\n?\n**Trois** : ع ل م (savoir). La lettre doublée par la chadda (لّ) ne compte **qu'une fois**.\n\nPourquoi قَالَ (il a dit) n'a-t-il que deux consonnes visibles ?\n?\nSa racine est **ق و ل** : le و est une lettre **faible** qui s'est transformée en ا.\nDans قُلْ (dis !), il a même disparu.\n\nComparaison avec le français ?\n?\nEn français aussi une partie du mot porte le sens : **écri**-re, **écri**-vain, **écri**-ture.\nMais en arabe, la racine est faite de **consonnes séparées**, et les voyelles se glissent **entre** elles : k**a**t**a**b**a**, k**i**t**ā**b.\n"},{"path":"5 - Flashcards/Règles/3 - Le verbe/Cartes - Schème (moule).md","text":"---\ntype: flashcards\nrègle: Le schème (moule)\n---\n# 🃏 Le schème (moule) : cartes\n\n#flashcards/arabe/regles/3-verbe/scheme\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Racine]] · Règle complète : Atelier arabe › Règles › « Le moule »\n\n> [!tip] Le fil rouge de ce paquet\n> La **racine** donne l'idée, le **moule** (wazn) donne la nuance. On écrit les moules avec les lettres **ف ع ل** : il suffit de les remplacer par la racine.\n\nPourquoi utilise-t-on les lettres **ف ع ل** pour parler des moules ?\n?\nElles servent de **modèle** (elles veulent dire « faire »). Pour lire **fāʿil**, remplace f, ʿ, l par les 3 lettres de la racine :\nfāʿil + ك ت ب = **كَاتِب** (kātib).\n\nMoule **fāʿil** (فَاعِل) : quel sens ? Deux exemples.\n?\n**Celui qui fait** l'action.\nكَاتِب (écrivain, celui qui écrit) ; عَالِم (savant, celui qui sait).\n\nMoule **mafʿūl** (مَفْعُول) : quel sens ? Deux exemples.\n?\n**Celui qui subit**, ce qui est fait.\nمَكْتُوب (écrit) ; مَعْلُوم (connu) ; الْمَغْضُوب (celui contre qui on est en colère).\n\nMoule **mafʿal** (مَفْعَل) : quel sens ?\n?\nLe **lieu** de l'action : مَكْتَب (bureau, lieu où l'on écrit).\n(Variante mafʿil : مَسْجِد, le lieu où l'on se prosterne.)\n\nMoules **faʿīl** et **faʿlān** : quelle différence ? Exemple de la basmala.\n?\nMême racine ر ح م (miséricorde) :\n- **رَحِيم** (faʿīl) : qualité **durable**, constante : toujours miséricordieux.\n- **رَحْمَن** (faʿlān) : qualité **débordante**, immense.\n\nMoule **faʿʿāl** (فَعَّال) : quel sens ?\n?\nCelui qui fait **beaucoup**, souvent : عَلَّام (qui sait tout), تَوَّاب (qui accueille sans cesse le repentir).\n\nForme II des verbes (lettre du milieu doublée) : quel sens ?\n?\nSouvent « **faire faire** » : عَلِمَ (savoir) → **عَلَّمَ** (faire savoir = enseigner).\n\nForme X (اسْتَـ) : quel sens ?\n?\nSouvent « **demander** » : غَفَرَ (pardonner) → **اسْتَغْفَرَ** (demander pardon) ; عَوْن (l'aide) → **اسْتَعَانَ** (demander l'aide) : نَسْتَعِينُ.\n\nSur le moule fāʿil, que donne ص ب ر (patienter) ?\n?\n**صَابِر** (*ṣābir*), « celui qui patiente ». Pluriel : الصَّابِرُونَ / الصَّابِرِينَ.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - L'alif maqsoura.md","text":"---\ntype: flashcards\nrègle: L'alif maqsoura\n---\n# 🃏 L'alif maqsoura : cartes\n\n#flashcards/arabe/regles/4-lecture/alif-maqsoura\n\n← [[Règles - paquets de cartes]] · Règle : [[L'alif maqsoura]]\n\nQu'est-ce que l'**alif maqsoura** (ى) ?\n?\nUn **ā long** écrit en fin de mot avec un yā' **sans points**. Il se lit comme un alif : **ā**.\n\nي ou ى : comment les distinguer ?\n?\n- **ي** (avec deux points) = **ī** ou **y**\n- **ى** (sans points, en fin de mot) = **ā**\n\nLis : عَلَى / الْأَعْلَى / تَعَالَى.\n?\n*ʿalā* (sur) · *al-aʿlā* (le Très-Haut) · *taʿālā* (exalté soit-Il).\n\nQue devient عَلَى devant un pronom ?\n?\nLe ى devient **يْـ** : عَلَى + هِمْ = **عَلَيْهِمْ**. Même chose pour إِلَى → إِلَيْكَ.\n\nهُدًى : comment lit-on la fin ?\n?\n*hudan* : le ى sert de **support** au tanwīn -an. Le cas est invisible (« estimé »).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - L'article al et l'alif wasla.md","text":"---\ntype: flashcards\nrègle: L'article al et l'alif wasla\n---\n# 🃏 L'article al et l'alif wasla : cartes\n\n#flashcards/arabe/regles/4-lecture/article-wasla\n\n← [[Règles - paquets de cartes]] · Règle : [[L'article al et l'alif wasla]] · Voir aussi : [[Cartes - Défini et indéfini]]\n\n> [!tip] Le fil rouge de ce paquet\n> L'alif de liaison **ٱ** ne sert qu'à **commencer**. Au début : on le prononce. Au milieu : il est **muet**, on enchaîne.\n\nQue veut dire ال ? Comment s'écrit-il ?\n?\n« **le, la, les** ». Il s'écrit **collé** au mot : الْحَمْدُ = *al-ḥamdu*.\n\nQu'est-ce que l'**alif wasla** (ٱ) ?\n?\nUn alif de **liaison** (hamzat al-waṣl), noté ٱ dans le Coran (petit ص dessus).\n- En **début** de lecture : on le prononce.\n- **Après un autre mot** : il est **muet**, on enchaîne.\n\nLis : بِسْمِ اللَّهِ.\n?\n*bismi **llāhi*** (pas « bismi allāhi ») : l'alif est muet, on enchaîne.\n\nLis : رَبِّ الْعَالَمِينَ / وَاللَّهُ.\n?\n*rabbi **l-ʿālamīn*** · *wa-**llāhu***.\n\nQuelle voyelle pour un alif wasla en **début** de lecture ?\n?\n- article ال : **a** : *al-ḥamdu*\n- impératif avec u au milieu : **u** : اعْبُدُوا = *uʿbudū*\n- autre impératif : **i** : اهْدِنَا = *ihdinā*, اقْرَأْ = *iqraʾ*\n- اسْم, ابْن, امْرَأَة : **i**\n\nLe mot d'avant finit par un soukoun : que fait-on devant ٱ ?\n?\nOn ajoute une petite voyelle de **pont**, souvent **i** : قُلِ اللَّهُمَّ (*quli llāhumma*).\nAvec مِنْ : **a** : مِنَ اللَّهِ (*mina llāh*).\n\nUne voyelle longue avant ٱ : que se passe-t-il ?\n?\nElle se **raccourcit** à la prononciation : فِي الْأَرْضِ = *fi l-arḍi*.\n\nQue devient l'alif de ال après لِـ ?\n?\nIl **tombe** à l'écrit : لِ + الْمُتَّقِينَ = **لِلْمُتَّقِينَ**.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - La chadda.md","text":"---\ntype: flashcards\nrègle: La chadda\n---\n# 🃏 La chadda : cartes\n\n#flashcards/arabe/regles/4-lecture/chadda\n\n← [[Règles - paquets de cartes]] · Règle : [[La chadda]]\n\nQue signifie la **chadda** ـّ ?\n?\nLa consonne est **doublée** : on la dit deux fois, comme soukoun + voyelle.\nرَبِّ = رَبْ + بِ = *rab-bi*.\n\nOù se place la voyelle avec la chadda ?\n?\n**ـَّ** (a) et **ـُّ** (u) au-dessus avec la chadda ; la kasra se met **sous la chadda** (ـِّ) ou sous la lettre.\n\nLis : إِيَّاكَ / الضَّالِّينَ / اللَّهِ.\n?\n*iy-yāka* · *aḍ-ḍāl-līn* · *al-lāhi*\n\nPourquoi trouve-t-on une chadda juste après الـ dans الرَّحْمَنِ ?\n?\nر est une lettre **solaire** : le l de l'article disparaît et la lettre suivante est **doublée** (*ar-raḥmān*).\n\nUne lettre avec chadda compte combien de fois dans la racine ?\n?\n**Une seule fois** : عَلَّمَ → racine ع ل م.\n\nUne chadda sur ن ou م : que fait-on ?\n?\nUne **ghunna** : on tient le son dans le **nez** 2 temps : إِنَّ (*in-nna*), ثُمَّ.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - La hamza.md","text":"---\ntype: flashcards\nrègle: La hamza\n---\n# 🃏 La hamza : cartes\n\n#flashcards/arabe/regles/4-lecture/hamza\n\n← [[Règles - paquets de cartes]] · Règle : [[La hamza]]\n\nQu'est-ce que la **hamza** (ء) ?\n?\nUn **coup de glotte** : le petit arrêt qu'on fait en français entre les deux « a » de « a-a ». Translittération : **ʾ**.\n\nLes supports de la hamza et quand on les utilise ?\n?\n- **أ** : sur alif, avec fatḥa ou ḍamma : أَعُوذُ\n- **إ** : sous l'alif, avec kasra : إِيَّاكَ\n- **ؤ** : sur wāw : مُؤْمِن\n- **ئ** : sur un yā' sans points : شَانِئَكَ\n- **ء** : seule : شَيْءٌ\n\nRègle simplifiée du support, au milieu du mot ?\n?\nOn compare la voyelle de la hamza et celle d'avant. La plus **forte** gagne :\n**kasra (ئ) > ḍamma (ؤ) > fatḥa (أ)** > soukoun.\n\nشَانِئَكَ : pourquoi le support ئ ?\n?\nKasra avant (نِ), fatḥa sur la hamza : la **kasra** gagne → **ئ**.\n\nأ (hamza) et ٱ (alif de liaison) : quelle différence ?\n?\n- **أ / إ** : toujours **prononcé**, même au milieu : وَأَقِيمُوا = *wa-aqīmū*.\n- **ٱ** : **muet** au milieu de la phrase : وَٱرْكَعُوا = *wa-rkaʿū*.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - La ligature lam-alif.md","text":"---\ntype: flashcards\nrègle: La ligature lam-alif\n---\n# 🃏 La ligature lam-alif : cartes\n\n#flashcards/arabe/regles/4-lecture/lam-alif\n\n← [[Règles - paquets de cartes]] · Règle : [[La ligature lam-alif]]\n\nQue se passe-t-il quand ل est suivi de ا ?\n?\nLes deux lettres forment **une seule figure** : **لا** (*lā*). On ne les écrit jamais côte à côte.\n\nForme de lam-alif isolée et attachée ?\n?\n- isolée / début : **لا**\n- attachée à la lettre d'avant : **ـلا**\n\nLam-alif avec hamza ou madda ?\n?\n**لأ**, **لإ**, **لآ**.\n\nLis : لَا إِلَٰهَ إِلَّا اللَّهُ.\n?\n*lā ilāha illa llāh* = « il n'y a de dieu qu'Allah ».\n\nLis : وَلَا الضَّالِّينَ.\n?\n*wa-lā ḍ-ḍāllīn* = « ni des égarés » (fin de la Fatiha).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Le petit alif.md","text":"---\ntype: flashcards\nrègle: Le petit alif\n---\n# 🃏 Le petit alif : cartes\n\n#flashcards/arabe/regles/4-lecture/petit-alif\n\n← [[Règles - paquets de cartes]] · Règle : [[Le petit alif]]\n\nQu'est-ce que le **petit alif** ـٰ ?\n?\nUn petit trait vertical au-dessus d'une lettre (*alif khanjariyya*). Il se lit comme un **ā long**, même si le grand alif n'est pas écrit.\n\nLis : الرَّحْمَٰنِ / إِلَٰهَ / هَٰذَا.\n?\n*ar-raḥ**mā**ni* · *i**lā**ha* · *hā**dhā*** (ceci).\n\nCombien de temps dure le petit alif ?\n?\n**2 temps**, comme un ā normal (madd naturel) : مَٰلِكِ = *mā-liki*.\n\nPourquoi le petit alif existe-t-il ?\n?\nL'écriture du Coran a été fixée très tôt, sans certains alifs. Le petit alif a été ajouté plus tard pour montrer qu'il faut lire **ā**.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Le soukoun.md","text":"---\ntype: flashcards\nrègle: Le soukoun\n---\n# 🃏 Le soukoun : cartes\n\n#flashcards/arabe/regles/4-lecture/soukoun\n\n← [[Règles - paquets de cartes]] · Règle : [[Le soukoun]]\n\nQue signifie le **soukoun** ـْ ?\n?\nUn petit rond au-dessus de la lettre : **pas de voyelle**. La consonne se prononce seule et se colle à la syllabe d'avant.\n\nLis et découpe : بِسْمِ.\n?\nbi-**s**-mi → **bis-mi**\n\nLis et découpe : الْحَمْدُ.\n?\nal-ḥa-**m**-du → **al-ḥam-du**\n\nLis et découpe : نَسْتَعِينُ.\n?\nna-**s**-ta-ʿī-nu → **nas-ta-ʿī-nu**\n\nQuel lien entre le soukoun et la chadda ?\n?\nLa **chadda** contient un soukoun caché : رَبِّ = رَبْ + بِ (*rab-bi*).\n\nQuel lien entre le soukoun et le verbe ?\n?\nLe **jussif** (après لَمْ) et l'**impératif** finissent par un soukoun : لَمْ يَلِدْ, اقْرَأْ.\nEt à l'**arrêt** (fin de verset), toute fin devient soukoun.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Le ta marbouta.md","text":"---\ntype: flashcards\nrègle: Le ta marbouta\n---\n# 🃏 Le ta marbouta : cartes\n\n#flashcards/arabe/regles/4-lecture/ta-marbouta\n\n← [[Règles - paquets de cartes]] · Règle : [[Le ta marbouta]]\n\nQu'est-ce que le **tā' marbūṭa** (ة) ?\n?\nUn **t** qui n'existe qu'**en fin de mot**. Il marque souvent le **féminin** : مُسْلِم → مُسْلِمَة.\n\nComment se prononce ة ?\n?\n- Quand on **enchaîne** : **t** : رَحْمَةُ اللَّهِ = *raḥmatu llāh*.\n- Quand on **s'arrête** : **a** (ou **ah**) : رَحْمَة = *raḥma* ; الْقَارِعَةُ = *al-qāriʿah*.\n\nComment ne pas confondre ة et ه ?\n?\n- **ة** = un ه avec **deux points** : un t.\n- **ه** (hā') = un vrai **h**, sans points.\n\nAprès ة, écrit-on un alif pour le tanwīn -an ?\n?\n**Non** : رَحْمَةً (*raḥmatan*), pas رَحْمَةًا.\n\nQue devient ة au pluriel féminin ?\n?\nOn la remplace par **ـَات** : مُسْلِمَة → **مُسْلِمَات**.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Le tanwin.md","text":"---\ntype: flashcards\nrègle: Le tanwin\n---\n# 🃏 Le tanwīn : cartes\n\n#flashcards/arabe/regles/4-lecture/tanwin\n\n← [[Règles - paquets de cartes]] · Règle : [[Le tanwin]] · [[Tableau 3 - Le tanwin]] · Voir aussi : [[Cartes - Les trois cas]]\n\n> [!tip] Le fil rouge de ce paquet\n> Tanwīn = voyelle **doublée** en fin de mot = un son **n** en plus = le nom est **indéfini** (« un, une »). Chaque tanwīn correspond à un cas.\n\nQu'est-ce que le **tanwīn** ?\n?\nUne voyelle **écrite deux fois** en fin de nom. On l'entend comme un **n** (sans écrire ن).\nIl veut dire que le nom est **indéfini** : « un, une ».\n\nLes 3 tanwīn : signe, son, cas ?\n?\n- ـٌ **-un** : **nominatif** : كِتَابٌ\n- ـً **-an** : **accusatif** : كِتَابًا\n- ـٍ **-in** : **génitif** : كِتَابٍ\n\nPourquoi un **alif** après ـً ? Exceptions ?\n?\nHabitude d'écriture : كِتَابًا. Cet alif ne se lit **pas** (sauf à l'arrêt : *kitābā*).\nPas d'alif après **ة** (رَحْمَةً) ni après **ـَاء** (سَمَاءً).\n\nQue devient le tanwīn à l'**arrêt** ?\n?\n- **-un** et **-in** disparaissent : أَحَدٌ → *aḥad*\n- **-an** devient **ā** : أَفْوَاجًا → *afwājā*\n\nPeut-on avoir ال et tanwīn ensemble ?\n?\n**Jamais.** Ni ال, ni pronom collé, ni complément du nom avec un tanwīn.\n\nأَحَدٌ / كُفُوًا / خُسْرٍ : quel cas, pourquoi ?\n?\n- **أَحَدٌ** (-un) : nominatif (attribut ou sujet)\n- **كُفُوًا** (-an) : accusatif (attribut de كَانَ, dans لَمْ يَكُنْ)\n- **خُسْرٍ** (-in) : génitif (après فِي)\n\nQuels noms ne prennent **jamais** le tanwīn ?\n?\nLes **diptotes** : إِبْرَاهِيمُ, مَكَّةَ, أَكْبَرُ…\n\nهُدًى لِلْمُتَّقِينَ : que devient le n du tanwīn ?\n?\nIl se **fond** dans le ل : *hudal-lil-muttaqīn*. Le tanwīn suit les règles du **n** (voir [[Cartes - Ghunna et nūn sākin]]).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les lettres emphatiques.md","text":"---\ntype: flashcards\nrègle: Les lettres emphatiques\n---\n# 🃏 Les lettres emphatiques : cartes\n\n#flashcards/arabe/regles/4-lecture/emphatiques\n\n← [[Règles - paquets de cartes]] · Règle : [[Les lettres emphatiques]]\n\nQu'est-ce qu'une lettre **emphatique** ?\n?\nUne lettre « **lourde** » : on recule la langue et on creuse la bouche. La voyelle voisine devient plus sombre (le **a** tire vers « o »).\n\nLes 4 grandes emphatiques et leur sœur « légère » ?\n?\n- س (s) → **ص** (ṣ)\n- د (d) → **ض** (ḍ)\n- ت (t) → **ط** (ṭ)\n- ذ (dh) → **ظ** (ẓ)\n\nQuelles autres lettres se prononcent aussi « lourdes » ?\n?\n**خ غ ق** (moins fortement que ص ض ط ظ).\n\nRepère les lettres lourdes dans الصِّرَاطَ.\n?\n**ص** et **ط** : *aṣ-ṣirāṭa*. Les deux a deviennent sombres.\n\nComment ne pas confondre سَ et صَ en lisant ?\n?\nس = s léger, langue en avant, *a* clair (« sa »).\nص = s lourd, langue reculée, *a* sombre (« ṣo »). Exemple : الْعَصْرِ (*al-ʿaṣr*).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les lettres qui ne se lient pas.md","text":"---\ntype: flashcards\nrègle: Les lettres qui ne se lient pas\n---\n# 🃏 Les lettres qui ne se lient pas : cartes\n\n#flashcards/arabe/regles/4-lecture/non-liantes\n\n← [[Règles - paquets de cartes]] · Règle : [[Les lettres qui ne se lient pas]]\n\nQuelles sont les 6 lettres qui ne s'attachent jamais à la lettre **suivante** ?\n?\n**ا د ذ ر ز و** (mot inventé pour s'en souvenir : « adh-dharzou »).\nElles s'attachent à la lettre **d'avant**, mais jamais à celle d'après.\n\nQue devient la lettre qui suit l'une de ces 6 lettres ?\n?\nElle prend sa forme de **début** (ou isolée), même au milieu du mot. Le mot a donc des « trous ».\n\nDans رَبِّ, pourquoi ر et ب sont-ils séparés ?\n?\nر fait partie des 6 lettres qui ne se lient **pas** à la suivante.\n\nDans الدِّينِ, pourquoi y a-t-il un trou après د ?\n?\nد ne se lie pas à la lettre suivante : le ي prend sa forme de début.\n\nCombien de « morceaux » dans وَإِيَّاكَ ? Pourquoi ?\n?\n**Trois** : و | إ | يّاك. و et ا (support de la hamza) ne se lient pas à la suivante.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les lettres solaires et lunaires.md","text":"---\ntype: flashcards\nrègle: Les lettres solaires et lunaires\n---\n# 🃏 Les lettres solaires et lunaires : cartes\n\n#flashcards/arabe/regles/4-lecture/solaires-lunaires\n\n← [[Règles - paquets de cartes]] · Règle : [[Les lettres solaires et lunaires]] · [[Tableau 4 - Lettres solaires et lunaires]]\n\nQue se passe-t-il devant une lettre **solaire** ?\n?\nLe **l** de ال ne se prononce **pas** et la lettre suivante est **doublée** (chadda) :\nالشَّمْسُ = ***ash-sh**amsu*.\n\nQue se passe-t-il devant une lettre **lunaire** ?\n?\nOn prononce **al-**, le ل porte un soukoun : الْقَمَرُ = ***al-q**amaru*.\n\nLes 14 lettres solaires ?\n?\n**ت ث د ذ ر ز س ش ص ض ط ظ ل ن**\n\nLes 14 lettres lunaires ?\n?\n**ء ب ج ح خ ع غ ف ق ك م ه و ي**\n(Moyen : « ابْغِ حَجَّكَ وَخَفْ عَقِيمَهُ » contient toutes les lunaires.)\n\nComment reconnaître solaire ou lunaire sans apprendre la liste ?\n?\n- Chadda sur la lettre après ال → **solaire**.\n- Soukoun sur le ل → **lunaire**.\nEt : les solaires se prononcent avec le **bout de la langue**, comme le l.\n\nD'où viennent les noms « solaire » et « lunaire » ?\n?\nالشَّمْس (*ash-shams*, le soleil) commence par une solaire ; الْقَمَر (*al-qamar*, la lune) par une lunaire.\n\nLis : الرَّحْمَنِ الرَّحِيمِ / الصِّرَاطَ الْمُسْتَقِيمَ.\n?\n*ar-raḥmāni r-raḥīm* (ر solaire) · *aṣ-ṣirāṭa l-mustaqīm* (ص solaire, م lunaire).\n\nLis : النُّور / الْكِتَاب.\n?\n*an-nūr* (ن solaire) · *al-kitāb* (ك lunaire).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les points qui distinguent les lettres.md","text":"---\ntype: flashcards\nrègle: Les points qui distinguent les lettres\n---\n# 🃏 Les points qui distinguent les lettres : cartes\n\n#flashcards/arabe/regles/4-lecture/points\n\n← [[Règles - paquets de cartes]] · Règle : [[Les points qui distinguent les lettres]]\n\nQu'est-ce qui distingue ب ت ث ن ?\n?\nSeulement les **points** : ب 1 dessous, ت 2 dessus, ث 3 dessus, ن 1 dessus. Même forme de « barque ».\n(Au début et au milieu, ي a aussi cette forme, avec 2 points dessous.)\n\nQu'est-ce qui distingue ج ح خ ?\n?\nج : 1 point **dedans/dessous** ; ح : **aucun** point ; خ : 1 point **dessus**.\n\nLes paires qui ne diffèrent que d'un point : د / ? ; ر / ? ; س / ? ; ص / ?\n?\n- د / **ذ** (d / dh)\n- ر / **ز** (r / z)\n- س / **ش** (s / sh, 3 points)\n- ص / **ض** (ṣ / ḍ)\n\nLes paires qui ne diffèrent que d'un point : ط / ? ; ع / ? ; ف / ?\n?\n- ط / **ظ** (ṭ / ẓ)\n- ع / **غ** (ʿ / gh)\n- ف (1 point) / **ق** (2 points)\n\nQuand ajoute-t-on les points en écrivant ?\n?\nOn trace d'abord **tout le mot**, puis on ajoute **les points** à la fin.\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les quatre formes des lettres.md","text":"---\ntype: flashcards\nrègle: Les quatre formes des lettres\n---\n# 🃏 Les quatre formes des lettres : cartes\n\n#flashcards/arabe/regles/4-lecture/quatre-formes\n\n← [[Règles - paquets de cartes]] · Règle : [[Les quatre formes des lettres]] · [[Alphabet complet]]\n\nQuelles sont les 4 formes possibles d'une lettre ?\n?\n**Isolée**, **début**, **milieu**, **fin** de mot.\nLa forme dépend de la **place** de la lettre et de ses voisines.\n\nDonne les 4 formes de ب.\n?\nisolée **ب** · début **بـ** · milieu **ـبـ** · fin **ـب**\n\nDonne les 4 formes de ع.\n?\nisolée **ع** · début **عـ** · milieu **ـعـ** · fin **ـع**\n\nDonne les 4 formes de ه.\n?\nisolée **ه** · début **هـ** · milieu **ـهـ** · fin **ـه**\n\nQue se passe-t-il en général au début et au milieu du mot ?\n?\nLa lettre est **raccourcie** : sa « queue » disparaît pour se lier à la lettre suivante.\n\nAssemble : نـ + ـبـ + ـت.\n?\n**نبت** (n-b-t).\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les voyelles courtes.md","text":"---\ntype: flashcards\nrègle: Les voyelles courtes\n---\n# 🃏 Les voyelles courtes : cartes\n\n#flashcards/arabe/regles/4-lecture/voyelles-courtes\n\n← [[Règles - paquets de cartes]] · Règle : [[Les voyelles courtes]] · [[Tableau 1 - Voyelles et signes]]\n\nLes 3 voyelles courtes : nom, place, son ?\n?\n- **fatḥa** ـَ : petit trait **au-dessus** : **a** (بَ = ba)\n- **kasra** ـِ : petit trait **en dessous** : **i** (بِ = bi)\n- **ḍamma** ـُ : petit و **au-dessus** : **ou / u** (بُ = bou)\n\nComment s'appellent les voyelles courtes en arabe ?\n?\n**ḥarakāt** (« mouvements ») : elles « mettent en mouvement » la consonne.\n\nOù trouve-t-on les voyelles écrites ? Où sont-elles absentes ?\n?\nToujours dans le **Coran** et les livres pour **débutants**.\nPresque jamais dans les journaux et les livres pour adultes : il faut les deviner.\n\nLis : رَبِّ / نَعْبُدُ.\n?\n- رَبِّ : *ra-bbi*\n- نَعْبُدُ : *na-ʿ-bu-du* → *naʿbudu*\n\nQuel lien entre les voyelles courtes et les cas ?\n?\nLa **dernière** voyelle d'un nom montre son cas : **ḍamma** = nominatif (-u), **fatḥa** = accusatif (-a), **kasra** = génitif (-i).\nVoir [[Cartes - Les trois cas]].\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Les voyelles longues.md","text":"---\ntype: flashcards\nrègle: Les voyelles longues\n---\n# 🃏 Les voyelles longues : cartes\n\n#flashcards/arabe/regles/4-lecture/voyelles-longues\n\n← [[Règles - paquets de cartes]] · Règle : [[Les voyelles longues]]\n\nComment écrit-on les 3 voyelles longues ?\n?\n- fatḥa + **ا** = **ā** : مَالِكِ (*māliki*)\n- ḍamma + **و** = **ū** : الْمَغْضُوبِ (*al-maghḍūbi*)\n- kasra + **ي** = **ī** : الرَّحِيمِ (*ar-raḥīmi*)\n\nCombien de temps dure une voyelle longue ?\n?\nÀ peu près **deux fois** une voyelle courte (2 « temps »).\nNe la raccourcis pas : قَالَ (*qāla*, il a dit) ≠ قَلَّ (*qalla*, il a diminué).\n\nQue donnent ـَوْ et ـَيْ ?\n?\nDes **diphtongues** :\n- ـَوْ = **aw** : يَوْمِ (*yawmi*)\n- ـَيْ = **ay** : عَلَيْهِمْ (*ʿalayhim*)\n\nQue signifie le signe **آ** (madda sur alif) ?\n?\n**ʾā** long (hamza + ā) : آمِين (*āmīn*), آمَنُوا (*āmanū*).\n\nQuelles sont les 3 façons d'écrire **ā** ?\n?\n- **ا** : قَالَ\n- **ى** en fin de mot (alif maqsoura) : عَلَى\n- **ـٰ** petit alif : الرَّحْمَٰنِ\n"},{"path":"5 - Flashcards/Règles/4 - Lire et écrire/Cartes - Sens de lecture et liaison.md","text":"---\ntype: flashcards\nrègle: Sens de lecture et liaison\n---\n# 🃏 Sens de lecture et liaison : cartes\n\n#flashcards/arabe/regles/4-lecture/sens-lecture\n\n← [[Règles - paquets de cartes]] · Règle : [[Sens de lecture et liaison]]\n\nDans quel sens lit-on et écrit-on l'arabe ?\n?\nDe **droite à gauche**. Le livre s'ouvre donc « à l'envers » pour un Français.\n\nComment s'écrivent les lettres d'un mot ?\n?\n**Attachées** les unes aux autres, comme une écriture cursive. On n'écrit pas lettre par lettre séparée.\n\nL'arabe a-t-il des majuscules ?\n?\n**Non.** Les noms propres s'écrivent comme les autres mots.\n\nDans quel sens lit-on les **chiffres** ?\n?\nDe **gauche à droite**, comme en français, même au milieu d'un texte arabe.\n\nLis بِسْمِ en partant de la droite.\n?\nبِ (*bi*) → سْ (*s*) → مِ (*mi*) = **bismi**.\n"},{"path":"5 - Flashcards/Règles/5 - Tajwid/Cartes - Ghunna et nūn sākin.md","text":"---\ntype: flashcards\nrègle: La ghunna et le nūn sākin\n---\n# 🃏 La ghunna et le nūn sākin : cartes\n\n#flashcards/arabe/regles/5-tajwid/ghunna\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le tanwin]] · Règle complète : Atelier arabe › Règles › « La nasalisation »\n\nQu'est-ce que la **ghunna** ?\n?\nUn son qui passe **par le nez**, comme un « nnnn » bouche fermée. Elle touche **ن**, **م** et le **tanwīn**. Durée : environ **2 temps**.\n\nنّ ou مّ (avec chadda) : que fait-on ?\n?\nOn tient le son dans le **nez** 2 temps : إِنَّ (*in-nna*), ثُمَّ.\n\nLes 4 règles du nūn sans voyelle (نْ) et du tanwīn ?\n?\n1. **iẓhār** (clair) : devant les lettres de la **gorge** ء ه ع ح غ خ\n2. **idghām** (fusion) : devant **ي ن م و** (avec nez) et **ل ر** (sans nez)\n3. **iqlāb** (changement) : devant **ب**, le n devient **m**\n4. **ikhfāʾ** (caché) : devant les **15 autres** lettres, n à moitié dans le nez\n\nMoyen de retenir les lettres de l'idghām avec ghunna ?\n?\n**يَنْمُو** (*yanmū*, « il pousse ») : ي ن م و.\n\nمِنْ عَلَقٍ : quelle règle ?\n?\n**iẓhār** : ن devant ع (lettre de la gorge) : le n est **bien net**.\n\nهُدًى مِنْ رَبِّهِمْ : deux règles. Lesquelles ?\n?\n- tanwīn devant **م** : **idghām avec ghunna** (*hudam-mir*)\n- ن devant **ر** : **idghām sans ghunna**, le n disparaît (*mir-rabbihim*)\n\nأَنْبِئْهُمْ (petit م sur le ن) : quelle règle ?\n?\n**iqlāb** : ن devant **ب** devient **m** : *ambiʾhum*.\n\nأَنْزَلْنَاهُ : quelle règle sur le نْ ?\n?\n**ikhfāʾ** : ن devant ز (ni gorge, ni يَنْمُو, ni ل ر ب) : n à moitié, par le nez.\n\nمْ (mīm sans voyelle) : les 3 règles ?\n?\n- devant **ب** : ikhfāʾ des lèvres (lèvres presque fermées, nez)\n- devant **م** : idghām (les deux m fusionnent)\n- devant les autres : iẓhār (m bien net)\n"},{"path":"5 - Flashcards/Règles/5 - Tajwid/Cartes - Lettres muettes.md","text":"---\ntype: flashcards\nrègle: Les lettres muettes\n---\n# 🃏 Les lettres muettes : cartes\n\n#flashcards/arabe/regles/5-tajwid/lettres-muettes\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - L'article al et l'alif wasla]] · Règle complète : Atelier arabe › Règles › « Les lettres muettes »\n\nComment reconnaître une lettre écrite mais **non prononcée** dans le Coran ?\n?\nElle porte souvent un **petit rond ۟** (ou un petit rectangle ۠), ou elle n'a **aucune** voyelle et ne forme pas de voyelle longue.\n\nLis : آمَنُوا۟ / كَفَرُوا۟.\n?\n*āmanū* · *kafarū* : l'alif final (petit rond) est **muet**. Il marque juste le pluriel.\n\nLis : أُو۟لَٰٓئِكَ.\n?\n*ulāʾika* (ceux-là) : le و avec le petit rond ne se prononce pas.\n\nLis : أَنَا۠.\n?\n*ana* (moi), court au milieu de la phrase ; *anā* à l'arrêt.\n\nPetit rond ۟ et soukoun ْ : quelle différence ?\n?\n- **۟** (petit rond, muet) : la lettre **ne se prononce pas**.\n- **ـْ** (soukoun) : la consonne **se prononce**, sans voyelle.\n\nCite 3 autres lettres souvent muettes.\n?\n- l'**alif wasla** ٱ au milieu : وَالْأَرْضِ = *wal-arḍi*\n- le **l** de l'article devant une solaire : الشَّمْسُ = *ash-shamsu*\n- l'**alif** du tanwīn -an : رِزْقًا = *rizqan*\n\nPourquoi le Coran garde-t-il ces lettres muettes ?\n?\nL'écriture a été fixée très tôt et garde de vieilles habitudes. La lecture, elle, s'est transmise **de bouche à oreille**. Les petits signes ont été ajoutés plus tard pour guider.\n"},{"path":"5 - Flashcards/Règles/5 - Tajwid/Cartes - Madd (allongement).md","text":"---\ntype: flashcards\nrègle: Le madd (allongement)\n---\n# 🃏 Le madd (allongement) : cartes\n\n#flashcards/arabe/regles/5-tajwid/madd\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Les voyelles longues]] · Règle complète : Atelier arabe › Règles › « Le madd »\n\nQu'est-ce que le **madd** ? Qu'est-ce qu'un « temps » ?\n?\nLe madd dit **combien de temps** on tient une voyelle longue.\nUn **temps** (ḥaraka) ≈ le temps de plier un doigt.\n\nMadd **naturel** : combien de temps ? Comment le reconnaître ?\n?\n**2 temps**. C'est la voyelle longue normale (ā, ī, ū) **sans** signe ٓ : مَٰلِكِ = *mā-liki*.\n\nMadd **long** : combien de temps ? Quel signe ?\n?\n**4 à 6 temps**. Signalé par le petit signe **ٓ** (madda) au-dessus de la lettre.\n\nQuand trouve-t-on le signe ٓ ? (3 cas)\n?\nLa voyelle longue est suivie :\n1. d'une **hamza dans le même mot** : جَآءَ, سَوَآءٌ (4-5 temps)\n2. d'une **hamza au mot suivant** : إِنَّآ أَعْطَيْنَاكَ (4-5 temps)\n3. d'une **chadda ou d'un soukoun** : الضَّآلِّينَ (6 temps)\n\nالضَّآلِّينَ : combien de temps sur le ā ? Pourquoi ?\n?\n**6 temps** : ٓ suivi d'une **chadda** (لّ) : madd « nécessaire ».\n\nCombien de temps tient-on le ā de جَآءَ ?\n?\n**4 à 5 temps** : ā suivi d'une hamza dans le même mot.\n\nUn ا après un tanwīn -an (كِتَابًا) est-il un madd ?\n?\n**Non.** Cet alif n'a pas de voyelle avant lui qui s'allonge : on dit *kitāban*, court.\n\nLe madd à l'arrêt (الرَّحِيمِ en fin de verset) ?\n?\nLa dernière voyelle tombe ; le ī d'avant peut s'allonger **2, 4 ou 6 temps** : *ar-raḥīīm*.\n"},{"path":"5 - Flashcards/Règles/5 - Tajwid/Cartes - Qalqala.md","text":"---\ntype: flashcards\nrègle: La qalqala (rebond)\n---\n# 🃏 La qalqala (rebond) : cartes\n\n#flashcards/arabe/regles/5-tajwid/qalqala\n\n← [[Règles - paquets de cartes]] · Règle complète : Atelier arabe › Règles › « La qalqala »\n\nQu'est-ce que la **qalqala** ?\n?\nUn petit **rebond** (écho) sur certaines lettres **sans voyelle** (soukoun), sans ajouter de vraie voyelle.\n\nQuelles sont les 5 lettres de la qalqala ? Moyen mnémotechnique ?\n?\n**ق ط ب ج د** : **قُطْبُ جَدٍّ** (*quṭbu jaddin*).\n\nPourquoi ces 5 lettres rebondissent-elles ?\n?\nElles **ferment** complètement la bouche ou la gorge. Sans voyelle, on ne les entendrait presque pas : le rebond les rend audibles.\n\nLes degrés de la qalqala ?\n?\n- milieu de mot, soukoun : **petit** rebond : اقْرَأْ (*iq·raʾ*)\n- fin de mot, soukoun : **moyen** : لَمْ يَلِدْ\n- à l'arrêt : **fort** : الصَّمَدُ → *aṣ-ṣamad·*\n- à l'arrêt avec chadda : **le plus fort** : بِالْحَقِّ → *bil-ḥaqq·*\n\nالْفَلَقِ (113:1) en fin de verset : que fait-on ?\n?\nÀ l'arrêt, le -i tombe et le **ق** rebondit fort : *al-falaq·*.\n\nErreur fréquente avec la qalqala ?\n?\nTransformer le rebond en voyelle : ne dis pas « yalidé » ni « falaqa ». C'est un écho, pas une syllabe.\n\nUn ك ou un ت avec soukoun font-ils la qalqala ?\n?\n**Non.** Seules **ق ط ب ج د**.\n"},{"path":"5 - Flashcards/Règles/5 - Tajwid/Cartes - Waqf (l'arrêt).md","text":"---\ntype: flashcards\nrègle: Le waqf (l'arrêt)\n---\n# 🃏 Le waqf (l'arrêt) : cartes\n\n#flashcards/arabe/regles/5-tajwid/waqf\n\n← [[Règles - paquets de cartes]] · Voir aussi : [[Cartes - Le tanwin]] · [[Cartes - Le ta marbouta]] · Règle complète : Atelier arabe › Règles › « Le waqf »\n\nQue se passe-t-il quand on **s'arrête** sur un mot ?\n?\nSa **dernière voyelle** ne se prononce pas : on finit sur une consonne (soukoun).\nالْعَالَمِينَ → *al-ʿālamīn*.\n\nÀ l'arrêt, que deviennent : -u / -a / -i ; -un / -in ; -an ?\n?\n- -u, -a, -i : **tombent** : الْكَوْثَرَ → *al-kawthar*\n- -un, -in : **tombent** : أَحَدٌ → *aḥad*\n- -an : devient **ā** : تَوَّابًا → *tawwābā*\n\nÀ l'arrêt, que devient ة ?\n?\n**h** : الْقَارِعَةُ → *al-qāriʿah*.\n\nÀ l'arrêt, que devient une voyelle **longue** finale ?\n?\nElle **reste** : الْأَعْلَى → *al-aʿlā*.\n\nComment dit-on الْقَدْرِ (97:1) en s'arrêtant ?\n?\n*al-qadr* : le -i final tombe.\n\nPourquoi le waqf compte-t-il pour la grammaire ?\n?\nLes terminaisons de **cas** disparaissent à l'arrêt. Pour connaître le cas d'un mot en fin de verset, il faut regarder l'**écrit**.\n\nSignes d'arrêt : مـ / لا / ج ?\n?\n- **مـ** : arrêt **obligatoire** (sinon le sens change)\n- **لا** : **ne pas** s'arrêter ici\n- **ج** : arrêt **permis**\n\nTu dois respirer au mauvais endroit : que fais-tu ?\n?\nTu **reprends un ou deux mots avant**, pour ne pas couper le sens.\n"}],"alphabet":{"intro":"L'arabe s'écrit **de droite à gauche** et compte **28 lettres** (plus la hamza ء). Presque toutes changent un peu de forme selon leur place dans le mot (début, milieu, fin), mais la lettre reste la même. Les voyelles courtes (a, i, u) ne sont pas des lettres : ce sont de petits signes au-dessus ou au-dessous.","heavy":"Les **lettres lourdes** (tafkhīm) se disent avec l'arrière de la langue levé vers le palais, la bouche un peu arrondie. Les voyelles autour d'elles sonnent plus graves : ṣa se rapproche de « so ». Il y en a 7 : خ ص ض غ ط ق ظ. Pour les retenir : **خُصَّ ضَغْطٍ قِظْ** (khuṣṣa ḍaghṭin qiẓ). Les 4 plus fortes, ص ض ط ظ, sont aussi appelées « emphatiques ».","noJoin":"Six lettres ne s'attachent **jamais à la lettre suivante** (à gauche) : ا د ذ ر ز و. Après elles, le mot continue avec une forme de début.","zones":[{"id":"jawf","name":"Le creux de la bouche et de la gorge","ar":"الجَوْف","tr":"al-jawf","desc":"Ce n'est pas un point précis : c'est tout l'espace vide de la bouche et de la gorge. Les voyelles longues ā, ī, ū y résonnent librement, sans que rien ne touche.","how":"Ouvre la bouche et laisse sortir l'air sans bloquer : ā (bouche ouverte), ī (sourire), ū (lèvres arrondies)."},{"id":"gorge-bas","name":"Le fond de la gorge (le plus bas, près de la poitrine)","ar":"أَقْصَى الحَلْق","tr":"aqṣā l-ḥalq","desc":"Tout en bas de la gorge, au niveau des cordes vocales. C'est là qu'on coupe la voix (hamza) ou qu'on souffle doucement (h).","how":"Dis « a-a » en coupant entre les deux : c'est la hamza. Souffle sur une vitre pour faire de la buée : c'est le hāʾ."},{"id":"gorge-milieu","name":"Le milieu de la gorge","ar":"وَسَط الحَلْق","tr":"wasaṭ al-ḥalq","desc":"Au milieu de la gorge, là où on serre les muscles du cou. Ces deux sons n'existent pas en français.","how":"Pour ḥ : souffle fort comme pour réchauffer tes mains, gorge serrée, sans racler. Pour ʿ : même endroit, mais avec la voix : comme un « a » étranglé."},{"id":"gorge-haut","name":"Le haut de la gorge (près de la bouche)","ar":"أَدْنَى الحَلْق","tr":"adnā l-ḥalq","desc":"En haut de la gorge, tout près du fond de la bouche. Ce sont des sons « raclés ».","how":"kh : comme la jota espagnole (« Juan ») ou le « ch » allemand de « Bach ». gh : comme le r grasseyé parisien, très au fond."},{"id":"luette","name":"Le fond de la langue, tout près de la luette","ar":"أَقْصَى اللِّسَان","tr":"aqṣā l-lisān","desc":"Le fond de la langue touche le haut, très en arrière, au niveau de la luette (le petit bout de chair qui pend au fond de la bouche).","how":"Dis « k » puis recule l'endroit le plus loin possible vers la gorge : c'est le qāf. Le son est sourd et lourd."},{"id":"voile","name":"Le fond de la langue et le palais mou","ar":"أَقْصَى اللِّسَان (أَسْفَل)","tr":"aqṣā l-lisān","desc":"Le dos de la langue touche le palais mou, un peu plus en avant que pour ق. C'est le « k » français.","how":"Dis « ka » : tu sens le dos de la langue toucher le haut, à l'arrière."},{"id":"palais","name":"Le milieu de la langue et le palais dur","ar":"وَسَط اللِّسَان","tr":"wasaṭ al-lisān","desc":"Le milieu de la langue monte vers le palais dur (la partie dure du « plafond » de la bouche).","how":"Dis « ya », « cha », « dja » : la langue se plaque au milieu du palais."},{"id":"cote","name":"Le côté de la langue et les molaires","ar":"حَافَة اللِّسَان","tr":"ḥāfat al-lisān","desc":"Le bord (un côté ou les deux) de la langue s'appuie contre les molaires du haut. C'est la lettre la plus difficile : l'arabe est appelé « la langue du ḍād ».","how":"Place les côtés de ta langue contre tes dents du fond, dis un « d » en gonflant l'arrière de la langue : le son devient lourd et un peu étouffé."},{"id":"gencive","name":"Le bout de la langue et la gencive du haut","ar":"طَرَف اللِّسَان","tr":"ṭaraf al-lisān","desc":"Le bout de la langue touche la petite bosse derrière les dents du haut (la gencive). Pour ل, ن, ر, l'endroit est presque le même.","how":"l comme en français ; n comme en français ; r roulé, un seul battement de langue (comme en espagnol « pero »)."},{"id":"racine-dents","name":"Le bout de la langue et la base des dents du haut","ar":"طَرَف اللِّسَان مَعَ أُصُول الثَّنَايَا","tr":"ṭaraf al-lisān","desc":"Le bout de la langue se pose juste à la base des incisives du haut, puis se décolle d'un coup.","how":"t et d comme en français. Pour ṭ, même place mais la langue est « creusée » et le son lourd."},{"id":"sifflantes","name":"Le bout de la langue près des incisives (sifflement)","ar":"طَرَف اللِّسَان (الصَّفِير)","tr":"ṭaraf al-lisān","desc":"Le bout de la langue s'approche des incisives sans les toucher : l'air siffle.","how":"s et z comme en français. Pour ṣ, même sifflement mais langue creusée et bouche plus ronde : le son est grave."},{"id":"dents","name":"Le bout de la langue entre les dents","ar":"طَرَف اللِّسَان مَعَ أَطْرَاف الثَّنَايَا","tr":"ṭaraf al-lisān","desc":"Le bout de la langue sort légèrement entre les dents du haut et du bas.","how":"Comme le « th » anglais : « think » pour ث, « this » pour ذ. ظ : même chose, en son lourd."},{"id":"levres","name":"Les lèvres","ar":"الشَّفَتَان","tr":"ash-shafatān","desc":"Les deux lèvres se touchent (ب, م), s'arrondissent (و), ou la lèvre du bas touche les dents du haut (ف).","how":"b, m, w et f comme en français."},{"id":"nez","name":"Le nez (la nasalisation)","ar":"الخَيْشُوم","tr":"al-khayshūm","desc":"Le son passe par le nez. Ce n'est pas une lettre, c'est la ghunna qui accompagne ن et م (avec chadda, ou cachés).","how":"Dis « nnnn » ou « mmmm » en bouchant ton nez avec les doigts : si le son s'arrête, c'est qu'il passait bien par le nez."}],"letters":[{"l":"ء","name":"hamza","tr":"ʾ","z":["gorge-bas"],"son":"une petite coupure de la voix","how":"Comme la petite pause dans « a‿a » ou « oh‿oh ». Elle se pose souvent sur un support : أ, إ, ؤ, ئ.","heavy":false,"join":false,"sun":false,"ex":["سَأَلَ","saʾala","il a demandé"],"nameAr":"هَمْزَة"},{"l":"ا","name":"alif","tr":"ā","z":["jawf"],"son":"un a long (ā)","how":"Seul, le alif ne se prononce pas comme une consonne : il allonge le a d'avant (qāla). Au début d'un mot, il porte une hamza (أ, إ) ou c'est un alif de liaison (ٱ).","heavy":false,"join":false,"sun":false,"ex":["قَالَ","qāla","il a dit"],"nameAr":"أَلِف"},{"l":"ب","name":"bāʾ","tr":"b","z":["levres"],"son":"b comme dans « bébé »","how":"Les deux lèvres se ferment puis s'ouvrent.","heavy":false,"join":true,"sun":false,"ex":["بَيْت","bayt","maison"],"nameAr":"بَاء"},{"l":"ت","name":"tāʾ","tr":"t","z":["racine-dents"],"son":"t comme dans « tapis »","how":"Le bout de la langue sur la base des dents du haut. Un t léger, pas soufflé.","heavy":false,"join":true,"sun":true,"ex":["تَوْبَة","tawba","repentir"],"nameAr":"تَاء"},{"l":"ث","name":"thāʾ","tr":"th","z":["dents"],"son":"th anglais de « think »","how":"Le bout de la langue entre les dents, on souffle sans voix. Ce n'est ni un s ni un t.","heavy":false,"join":true,"sun":true,"ex":["ثَلَاثَة","thalātha","trois"],"nameAr":"ثَاء"},{"l":"ج","name":"jīm","tr":"j","z":["palais"],"son":"dj comme dans « jean » à l'anglaise","how":"Le milieu de la langue sur le palais : « dj ». En Égypte on dit « g », mais dans la récitation c'est « dj ».","heavy":false,"join":true,"sun":false,"ex":["جَنَّة","janna","paradis, jardin"],"nameAr":"جِيم"},{"l":"ح","name":"ḥāʾ","tr":"ḥ","z":["gorge-milieu"],"son":"un h soufflé, gorge serrée","how":"Souffle fort comme pour réchauffer tes mains, en serrant le milieu de la gorge. Sans racler (sinon c'est خ).","heavy":false,"join":true,"sun":false,"ex":["رَحْمَة","raḥma","miséricorde"],"nameAr":"حَاء"},{"l":"خ","name":"khāʾ","tr":"kh","z":["gorge-haut"],"son":"jota espagnole, « ch » de « Bach »","how":"Racle légèrement le haut de la gorge, sans voix.","heavy":true,"join":true,"sun":false,"ex":["خَلَقَ","khalaqa","il a créé"],"nameAr":"خَاء"},{"l":"د","name":"dāl","tr":"d","z":["racine-dents"],"son":"d comme dans « dos »","how":"Comme le t, mais avec la voix.","heavy":false,"join":false,"sun":true,"ex":["دِين","dīn","religion, jugement"],"nameAr":"دَال"},{"l":"ذ","name":"dhāl","tr":"dh","z":["dents"],"son":"th anglais de « this »","how":"Comme ث, mais avec la voix. La langue reste entre les dents.","heavy":false,"join":false,"sun":true,"ex":["ذِكْر","dhikr","rappel"],"nameAr":"ذَال"},{"l":"ر","name":"rāʾ","tr":"r","z":["gencive"],"son":"r roulé, un seul battement","how":"Le bout de la langue tape une fois la gencive du haut (comme l'espagnol « pero »). Jamais le r français de la gorge.","heavy":false,"join":false,"sun":true,"ex":["رَبّ","rabb","Seigneur"],"nameAr":"رَاء"},{"l":"ز","name":"zāy","tr":"z","z":["sifflantes"],"son":"z comme dans « zéro »","how":"Le bout de la langue près des incisives, l'air siffle avec la voix.","heavy":false,"join":false,"sun":true,"ex":["زَكَاة","zakāh","aumône"],"nameAr":"زَاي"},{"l":"س","name":"sīn","tr":"s","z":["sifflantes"],"son":"s comme dans « sac »","how":"Toujours « s », même entre deux voyelles (jamais « z »).","heavy":false,"join":true,"sun":true,"ex":["سَلَام","salām","paix"],"nameAr":"سِين"},{"l":"ش","name":"shīn","tr":"sh","z":["palais"],"son":"ch comme dans « chat »","how":"Le milieu de la langue vers le palais, l'air se répand dans la bouche.","heavy":false,"join":true,"sun":true,"ex":["شَمْس","shams","soleil"],"nameAr":"شِين"},{"l":"ص","name":"ṣād","tr":"ṣ","z":["sifflantes"],"son":"un s lourd et grave","how":"Fais un s, mais creuse la langue (l'arrière monte) et arrondis un peu la bouche. Les voyelles autour sonnent plus sombres : ṣa ressemble à « so ».","heavy":true,"join":true,"sun":true,"ex":["صِرَاط","ṣirāṭ","chemin"],"nameAr":"صَاد"},{"l":"ض","name":"ḍād","tr":"ḍ","z":["cote"],"son":"un d lourd, fait sur le côté de la langue","how":"Le bord de la langue contre les molaires du haut, l'arrière de la langue gonflé. C'est la lettre propre à l'arabe.","heavy":true,"join":true,"sun":true,"ex":["ضَالِّين","ḍāllīn","égarés"],"nameAr":"ضَاد"},{"l":"ط","name":"ṭāʾ","tr":"ṭ","z":["racine-dents"],"son":"un t lourd et grave","how":"Fais un t, mais la langue est plaquée plus largement et l'arrière monte. Le son est sourd, sans souffle.","heavy":true,"join":true,"sun":true,"ex":["طَعَام","ṭaʿām","nourriture"],"nameAr":"طَاء"},{"l":"ظ","name":"ẓāʾ","tr":"ẓ","z":["dents"],"son":"un dh lourd","how":"Comme ذ (langue entre les dents) mais en son lourd, l'arrière de la langue levé.","heavy":true,"join":true,"sun":true,"ex":["ظُلْم","ẓulm","injustice"],"nameAr":"ظَاء"},{"l":"ع","name":"ʿayn","tr":"ʿ","z":["gorge-milieu"],"son":"un son de gorge serrée, avec la voix","how":"Serre le milieu de la gorge comme pour ḥ, mais fais vibrer la voix : un « a » étranglé. N'existe pas en français : écoute-le plusieurs fois.","heavy":false,"join":true,"sun":false,"ex":["عِلْم","ʿilm","savoir"],"nameAr":"عَيْن"},{"l":"غ","name":"ghayn","tr":"gh","z":["gorge-haut"],"son":"r grasseyé parisien, très au fond","how":"Comme le r de « Paris » dit très au fond de la gorge, avec la voix.","heavy":true,"join":true,"sun":false,"ex":["غَفُور","ghafūr","pardonneur"],"nameAr":"غَيْن"},{"l":"ف","name":"fāʾ","tr":"f","z":["levres"],"son":"f comme dans « fête »","how":"La lèvre du bas touche les dents du haut.","heavy":false,"join":true,"sun":false,"ex":["فَتْح","fatḥ","ouverture, victoire"],"nameAr":"فَاء"},{"l":"ق","name":"qāf","tr":"q","z":["luette"],"son":"un k très profond, près de la gorge","how":"Fais un k, mais le plus en arrière possible, au niveau de la luette. Pas de souffle.","heavy":true,"join":true,"sun":false,"ex":["قُرْءَان","qurʾān","Coran"],"nameAr":"قَاف"},{"l":"ك","name":"kāf","tr":"k","z":["voile"],"son":"k comme dans « kilo »","how":"Le dos de la langue contre le palais mou, avec un petit souffle.","heavy":false,"join":true,"sun":false,"ex":["كِتَاب","kitāb","livre"],"nameAr":"كَاف"},{"l":"ل","name":"lām","tr":"l","z":["gencive"],"son":"l comme dans « lune »","how":"Le bout de la langue sur la gencive du haut. Dans ٱللَّه (après a ou u), il devient lourd : « Allāh » à voix grave.","heavy":false,"join":true,"sun":true,"ex":["لَيْل","layl","nuit"],"nameAr":"لَام"},{"l":"م","name":"mīm","tr":"m","z":["levres","nez"],"son":"m comme dans « maman »","how":"Les lèvres fermées, le son passe par le nez.","heavy":false,"join":true,"sun":false,"ex":["مَلِك","malik","roi"],"nameAr":"مِيم"},{"l":"ن","name":"nūn","tr":"n","z":["gencive","nez"],"son":"n comme dans « nez »","how":"Le bout de la langue sur la gencive, le son passe par le nez. Voir les règles de la ghunna.","heavy":false,"join":true,"sun":true,"ex":["نُور","nūr","lumière"],"nameAr":"نُون"},{"l":"ه","name":"hāʾ","tr":"h","z":["gorge-bas"],"son":"un h aspiré, léger","how":"Le h anglais de « hello » : un souffle doux qui vient du bas de la gorge. Il se prononce toujours, même en fin de mot.","heavy":false,"join":true,"sun":false,"ex":["هُدًى","hudan","guidée"],"nameAr":"هَاء"},{"l":"و","name":"wāw","tr":"w / ū","z":["levres","jawf"],"son":"w comme dans « oui », ou ū long","how":"Avec une voyelle ou un soukoun, c'est une consonne (w). Après un u, il allonge : ū (« ou » long).","heavy":false,"join":false,"sun":false,"ex":["وَلَد","walad","enfant"],"nameAr":"وَاو"},{"l":"ي","name":"yāʾ","tr":"y / ī","z":["palais","jawf"],"son":"y comme dans « yoga », ou ī long","how":"Avec une voyelle ou un soukoun, c'est une consonne (y). Après un i, il allonge : ī (« i » long).","heavy":false,"join":true,"sun":false,"ex":["يَوْم","yawm","jour"],"nameAr":"يَاء"}],"pairs":[["س","ص","s léger / s lourd"],["ت","ط","t léger / t lourd"],["د","ض","d léger / d lourd"],["ذ","ظ","dh léger / dh lourd"],["ك","ق","k devant / k du fond"],["ه","ح","h doux / h serré"],["ح","خ","h serré / raclé"],["ء","ع","coupure / gorge serrée"],["ز","ذ","z / th de « this »"],["س","ث","s / th de « think »"]]}}};
