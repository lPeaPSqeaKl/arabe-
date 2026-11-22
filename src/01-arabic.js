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
