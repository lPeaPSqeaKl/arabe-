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
  let left = Math.max(1, AUDIO.repeat || 1);
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
    if (i >= list.length) { if (onDone) onDone(); return; }
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
  btn(act, 'Insérer dans la note', () => ctx.insertText('- ' + summary + '\n'));
  if (lemRow) btn(act, ctx.isMine(st.seg[3]) ? '✓ Dans mon vocabulaire' : 'Ajouter à mon vocabulaire', (ev) => { ctx.addVocab(st.seg[3], txt, isInitials(word) ? tr : translitPhrase([txt], ctx.settings.style), e.gloss, ref ? ref[0] + ':' + ref[1] : ''); ev.target.textContent = '✓ Dans mon vocabulaire'; });
  btn(act, 'Créer une flashcard', () => ctx.addFlashcard(txt + (ref ? ' (' + ref[0] + ':' + ref[1] + ')' : ''), (e.gloss || e.title) + ' — ' + tr + (caseInfo ? ' — ' + caseInfo : '') + (e.why[0] ? ' — ' + e.why[0].replace(/\*\*/g, '') : '')));
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
    const line = h(box, 'div', 'aa-verse-ar' + (S.tajwid ? ' aa-tj-on' : '')); line.setAttribute('dir', 'rtl'); line.style.fontSize = S.arSize + 'px';
    const tokens = translitTokens(words, S.style);
    const tj = S.tajwid ? tajwidVerse(words) : null;
    const detail = h(document.createElement('div'), 'div', 'aa-detail');
    const spans = [];
    words.forEach((w, wi) => {
      const st = stemOf(w);
      const sp = arSpan(line, wordText(w), 'aa-w ' + (POS_CLASS[st.f.pos] || '') + (isInitials(w) ? ' aa-pos-inl' : '') + (st.seg[3] >= 0 && ctx.isMine(st.seg[3]) ? ' aa-mine' : ''));
      sp.title = tokens[wi];
      if (tj) { sp.textContent = ''; fillTajwid(sp, tj[wi]); }
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
    const tools = h(box, 'div', 'aa-verse-tools');
    const structBox = h(document.createElement('div'), 'div', 'aa-struct');
    btn(tools, '🧩 Analyse de la phrase', () => {
      if (structBox.firstChild) { clear(structBox); return; }
      renderIrab(ctx, structBox, words, [surahN, vn], { onWord: wi => spans[wi].click() });
    }, 'aa-btn-quiet');
    if (ctx.settings.audio !== false) btn(tools, '▶ Écouter le verset', () => playVerse(surahN, vn), 'aa-btn-quiet');
    box.dataset.verse = String(vn);
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
  linkTerms(ctx, el);
  mdText(el, 'p', 'aa-muted aa-small', 'Analyse **déduite automatiquement** de la morphologie du Coran (Quranic Arabic Corpus) : très fiable pour les cas, les annexions, les prépositions et les adjectifs ; les rôles marqués « probable » sont à vérifier dans un livre d\'iʿrāb pour les versets longs.');
  return res;
}
