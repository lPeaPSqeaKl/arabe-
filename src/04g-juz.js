/* ====================================================================
 * 04g - Les 30 parties du Coran (juz'), découpage du mushaf de Médine.
 * Chaque partie porte le nom traditionnel de ses premiers mots.
 * ==================================================================== */
const JUZ_START = [[1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1]];
const JUZ_NAMES = [
  ['الٓمٓ', 'Alif Lām Mīm'], ['سَيَقُولُ', 'Sayaqūl'], ['تِلْكَ ٱلرُّسُلُ', 'Tilka r-rusul'], ['لَن تَنَالُوا۟', 'Lan tanālū'], ['وَٱلْمُحْصَنَٰتُ', 'Wal-muḥṣanāt'],
  ['لَا يُحِبُّ ٱللَّهُ', 'Lā yuḥibbu llāh'], ['وَإِذَا سَمِعُوا۟', 'Wa idhā samiʿū'], ['وَلَوْ أَنَّنَا', 'Wa law annanā'], ['قَالَ ٱلْمَلَأُ', 'Qāla l-malaʾ'], ['وَٱعْلَمُوٓا۟', 'Wa-ʿlamū'],
  ['يَعْتَذِرُونَ', 'Yaʿtadhirūn'], ['وَمَا مِن دَآبَّةٍ', 'Wa mā min dābba'], ['وَمَآ أُبَرِّئُ', 'Wa mā ubarriʾu'], ['رُبَمَا', 'Rubamā'], ['سُبْحَٰنَ ٱلَّذِىٓ', 'Subḥāna lladhī'],
  ['قَالَ أَلَمْ', 'Qāla a-lam'], ['ٱقْتَرَبَ', 'Iqtaraba'], ['قَدْ أَفْلَحَ', 'Qad aflaḥa'], ['وَقَالَ ٱلَّذِينَ', 'Wa qāla lladhīna'], ['أَمَّنْ خَلَقَ', 'A-mman khalaqa'],
  ['ٱتْلُ مَآ أُوحِىَ', 'Utlu mā ūḥiya'], ['وَمَن يَقْنُتْ', 'Wa man yaqnut'], ['وَمَا لِىَ', 'Wa mā liya'], ['فَمَنْ أَظْلَمُ', 'Fa-man aẓlamu'], ['إِلَيْهِ يُرَدُّ', 'Ilayhi yuraddu'],
  ['حمٓ', 'Ḥā Mīm'], ['قَالَ فَمَا خَطْبُكُمْ', 'Qāla fa-mā khaṭbukum'], ['قَدْ سَمِعَ ٱللَّهُ', 'Qad samiʿa llāh'], ['تَبَٰرَكَ ٱلَّذِى', 'Tabārak'], ['عَمَّ', 'ʿAmma'],
];
/* la partie (1 à 30) qui contient le verset s:v */
function juzOf(s, v) { let j = 1; JUZ_START.forEach(([a, b], i) => { if (s > a || (s === a && v >= b)) j = i + 1; }); return j; }
/* la partie j, sourate par sourate : [{ s, from, to }] */
function juzParts(ctx, j) {
  const [s1, v1] = JUZ_START[j - 1]; const nx = JUZ_START[j];
  const out = []; for (let s = s1; s <= (nx ? nx[0] : 114); s++) {
    const n = ctx.data.surahInfo(s)[5]; const from = s === s1 ? v1 : 1; let to = n;
    if (nx && s === nx[0]) { if (nx[1] === 1) break; to = nx[1] - 1; }
    out.push({ s, from, to });
  }
  return out;
}
const juzVerses = (ctx, j) => juzParts(ctx, j).reduce((a, p) => a + p.to - p.from + 1, 0);
const juzTitle = j => 'Juz\' ' + JUZ_NAMES[j - 1][1];
/* « de Al-Baqara 142 à Āl ʿImrān 92 » */
function juzSpan(ctx, j) {
  const P = juzParts(ctx, j); const a = P[0], b = P[P.length - 1]; const nm = s => ctx.data.surahInfo(s)[1];
  if (P.length === 1) return nm(a.s) + ' ' + a.from + '–' + a.to;
  return (a.from === 1 ? nm(a.s) : nm(a.s) + ' ' + a.from) + ' → ' + (b.to === ctx.data.surahInfo(b.s)[5] ? nm(b.s) : nm(b.s) + ' ' + b.to);
}
