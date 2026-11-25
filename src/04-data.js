/* ====================================================================
 * 04 - Données : chargement local du Coran (aucune connexion internet)
 * ==================================================================== */

const DATA_VERSION = '3';
const INDEX_FILE = 'index-1.json'; // changer le numéro si les données ou skeleton() changent
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
  /* Index de toutes les formes du Coran. Il est préparé à l'avance (data/INDEX_FILE, fait par
   * tools/build-index.js) : un seul fichier lu au lieu des 114 sourates. S'il manque, on le
   * télécharge une fois ; sans internet, on le reconstruit en lisant tout le Coran. */
  buildForms(progress) {
    if (this.forms) return Promise.resolve(this.forms);
    if (this.formsPromise) return this.formsPromise;
    this.formsPromise = (async () => {
      let idx = null;
      try { idx = await this.loadIndex(); } catch (e) { idx = null; }
      if (idx) this.useIndex(idx); else await this.scanForms(progress);
      return this.forms;
    })();
    this.formsPromise.catch(() => { this.formsPromise = null; });
    return this.formsPromise;
  }
  async loadIndex() {
    const ad = this.app.vault.adapter; const f = this.dir + '/data/' + INDEX_FILE;
    let txt = null;
    try { txt = await ad.read(f); } catch (e) { /* absent */ }
    if (!txt) {
      const r = await requestUrl({ url: DATA_URL + INDEX_FILE });
      txt = r.text;
      try { await ad.write(f, txt); } catch (e) { /* pas de copie locale */ }
    }
    return JSON.parse(txt);
  }
  /* versets qui se ressemblent (data/similar.json, fait par tools/build-similar.js) */
  async similar() {
    if (this._sim) return this._sim;
    const ad = this.app.vault.adapter; const f = this.dir + '/data/similar.json';
    let txt = null;
    try { txt = await ad.read(f); } catch (e) { /* absent */ }
    if (!txt) { const r = await requestUrl({ url: DATA_URL + 'similar.json' }); txt = r.text; try { await ad.write(f, txt); } catch (e) { /* */ } }
    this._sim = JSON.parse(txt); return this._sim;
  }
  useIndex(idx) {
    const unpack = x => [Math.floor(x / 1e6), Math.floor(x / 1e3) % 1000, x % 1000];
    const lazy = (obj) => { const c = new Map(); return { get(k) { if (c.has(k)) return c.get(k); const a = obj[k]; if (!a) return undefined; const r = a.map(unpack); c.set(k, r); return r; }, has(k) { return k in obj; } }; };
    const forms = new Map();
    for (const [key, list] of idx.f) { const m = new Map(); for (const [txt, n, ref, lid] of list) m.set(txt, { txt, n, ref: unpack(ref), lid }); forms.set(key, m); }
    const lemForms = new Map();
    for (const [lid, list] of idx.m) lemForms.set(+lid, new Map(list));
    this.forms = forms; this.pos = lazy(idx.p); this.lemRefs = lazy(idx.r); this.lemForms = lemForms;
  }
  async scanForms(progress) {
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
          if (e) e.n++; else m.set(txt, { txt, n: 1, ref: [s, vi + 1, wi + 1], lid });
        }));
        if (progress && s % 10 === 0) progress(s);
      }
      this.forms = forms; this.pos = pos; this.lemRefs = lemRefs; this.lemForms = lemForms;
  }
  /* Cherche des suites de mots du texte dans un même verset (pour choisir la bonne lecture) */
  async findRuns(words) {
    const keys = words.map(w => skeleton(w, true));
    const res = new Array(words.length).fill(null);
    let i = 0;
    while (i < words.length) {
      let best = null;
      for (const r of (this.pos.get(keys[i]) || []).slice(0, 4000)) {
        const v = (this.cache.get(r[0]) || await this.surah(r[0])).v[r[1] - 1][2];
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
