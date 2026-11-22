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
