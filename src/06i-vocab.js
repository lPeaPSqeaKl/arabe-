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
