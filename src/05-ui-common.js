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
/* un petit message avec « ↶ Annuler », en haut de l'écran (en bas, la barre d'Obsidian le cacherait sur iPhone) */
let UNDO_EL = null;
function undoToast(msg, undo, ms) {
  if (UNDO_EL) { UNDO_EL.remove(); UNDO_EL = null; }
  const el = document.createElement('div'); el.className = 'aa-undo';
  const t = document.createElement('span'); t.textContent = msg; el.appendChild(t);
  const b = document.createElement('button'); b.className = 'aa-undo-btn'; b.textContent = '↶ Annuler';
  b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); el.remove(); if (UNDO_EL === el) UNDO_EL = null; try { undo(); } catch (e) { /* */ } });
  el.appendChild(b); document.body.appendChild(el); UNDO_EL = el;
  setTimeout(() => { el.classList.add('aa-undo-out'); setTimeout(() => { el.remove(); if (UNDO_EL === el) UNDO_EL = null; }, 400); }, ms || 7000);
  return el;
}

/* ---------- Son ---------- */
const pad3 = n => String(n).padStart(3, '0');
let currentAudio = null;
/* Voix de l'appareil. Sur iPad/iPhone, la synthèse vocale peut rester bloquée (après une récitation,
 * ou quand on enchaîne les clics) : on libère d'abord les sons du Coran, on la relance (resume),
 * on garde l'énoncé en mémoire, et si rien ne démarre on réessaie une fois. */
let SPEAK_U = null, SPEAK_T = 0;
function speak(text) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') { notify('La synthèse vocale n\'est pas disponible sur cet appareil.'); return; }
  // libérer les sons du Coran (lecture en cours et sons préparés à l'avance)
  try { if (currentAudio) currentAudio.pause(); } catch (e) { /* */ }
  try { PRELOAD.forEach(a => { try { if (a !== currentAudio) { a.removeAttribute('src'); a.load(); } } catch (e) { /* */ } }); PRELOAD.clear(); } catch (e) { /* */ }
  const clean = String(text || '').replace(/[ۖ-ۭ]/g, '');
  const go = (retry) => {
    try {
      const u = new SpeechSynthesisUtterance(clean); SPEAK_U = u;
      u.lang = 'ar-SA'; u.rate = 0.8 * (AUDIO.rate || 1);
      const v = (synth.getVoices() || []).find(x => /^ar/i.test(x.lang));
      if (v) { try { u.voice = v; } catch (e) { /* */ } }
      let started = false; u.onstart = () => { started = true; };
      const my = ++SPEAK_T;
      try { synth.resume(); } catch (e) { /* */ }
      synth.speak(u);
      setTimeout(() => {
        if (started || my !== SPEAK_T || synth.speaking) return;
        try { synth.cancel(); } catch (e) { /* */ }
        if (retry) go(false);
        else if (!v) notify('Pas de son : aucune voix arabe trouvée. Sur iPad/iPhone : Réglages › Accessibilité › Contenu énoncé › Voix › Arabe.');
      }, 1200);
    } catch (e) { notify('Son indisponible.'); }
  };
  if (synth.speaking || synth.pending) { try { synth.cancel(); } catch (e) { /* */ } setTimeout(() => go(true), 80); }
  else go(true);
}
/* Récitation : récitateur, vitesse et répétition (réglés dans l'onglet Coran) */
const RECITERS = [
  ['Alafasy_128kbps', 'Mishary al-ʿAfāsī (normal)'],
  ['Husary_128kbps', 'Maḥmūd al-Ḥuṣarī (lent et très clair)'],
  ['Husary_Muallim_128kbps', 'al-Ḥuṣarī, récitation pour apprendre (très lente)'],
  ['Minshawy_Murattal_128kbps', 'al-Minshāwī (lent)'],
  ['Abdul_Basit_Murattal_192kbps', 'ʿAbd al-Bāsiṭ (posé)'],
];
const AUDIO = { reciter: 'Alafasy_128kbps', rate: 1, repeat: 1, follow: true };
/* Suivre le mot récité : on utilise le vrai minutage mot par mot de chaque récitateur
 * (quran-align, CC BY 4.0, mesuré sur les mêmes fichiers everyayah), dans data/timing/<récitateur>.json,
 * téléchargé une fois puis gardé hors ligne. Sans ce fichier (pas encore chargé, pas d'internet),
 * on estime d'après la longueur de chaque mot (lettres, madd ٓ, pauses). */
let FOLLOW = null;
const TIMING = new Map(); // récitateur -> promesse ; TIMING_DATA : récitateur -> données
const TIMING_DATA = new Map();
function loadTiming(rec) {
  if (!rec || !FONT_ENV) return Promise.resolve(null);
  if (TIMING.has(rec)) return TIMING.get(rec);
  const p = (async () => {
    const ad = FONT_ENV.app.vault.adapter; const dir = FONT_ENV.dir + '/data/timing'; const f = dir + '/' + rec + '.json';
    let txt = null;
    try { txt = await ad.read(f); } catch (e) { /* absent : on le télécharge */ }
    if (!txt) {
      const r = await requestUrl({ url: DATA_URL + 'timing/' + rec + '.json' });
      txt = r.text;
      try { if (!(await ad.exists(dir))) await ad.mkdir(dir); await ad.write(f, txt); } catch (e) { /* pas de copie locale */ }
    }
    const d = JSON.parse(txt); TIMING_DATA.set(rec, d); return d;
  })();
  p.catch(() => TIMING.delete(rec));
  TIMING.set(rec, p);
  return p;
}
/* Quel récitateur joue vraiment ? (le fichier peut venir d'un autre si le premier manque) */
function reciterOfSrc(src) {
  let u = src || ''; try { u = decodeURIComponent(u); } catch (e) { /* */ }
  for (const [k] of RECITERS) if (u.includes('/' + k + '/')) return k;
  if (/verses\.quran\.com\/Alafasy\//.test(u)) return 'Alafasy_128kbps';
  return null;
}
function verseTiming(rec, s, v) { const d = rec && TIMING_DATA.get(rec); const a = d && d.s && d.s[s]; return a ? a[v - 1] : null; }
function wordWeight(t) {
  const base = (t.match(/[\u0621-\u064A\u0671-\u06D3]/g) || []).length;
  const madd = (t.match(/\u0653/g) || []).length * 3.5;
  const shadda = (t.match(/\u0651/g) || []).length * 0.6;
  const pause = /[\u06D6-\u06DB]/.test(t) ? 3 : 0;
  return Math.max(1.5, base + madd + shadda + pause + 1.2);
}
function followStop() { if (FOLLOW) { cancelAnimationFrame(FOLLOW.raf); FOLLOW.spans.forEach(sp => sp.classList.remove('aa-w-now')); FOLLOW = null; } }
function followVerse(s, v) {
  followStop();
  if (!AUDIO.follow) return;
  const box = document.querySelector('.aa-root [data-ref="' + s + ':' + v + '"]');
  if (!box) return;
  const spans = [...box.querySelectorAll('.aa-w')].filter(sp => !sp.closest('.aa-mv-panel'));
  if (!spans.length) return;
  const w = spans.map(sp => wordWeight(sp.textContent || '')); const tot = w.reduce((a, b) => a + b, 0);
  const cum = []; let c = 0; w.forEach(x => { c += x; cum.push(c / tot); });
  const me = { spans, raf: 0, cur: -1 }; FOLLOW = me;
  loadTiming(AUDIO.reciter || 'Alafasy_128kbps').catch(() => {});
  const tick = () => {
    if (FOLLOW !== me) return;
    const a = currentAudio;
    const rec = a && !a.paused ? reciterOfSrc(a.currentSrc || a.src) : null;
    if (rec && !TIMING.has(rec)) loadTiming(rec).catch(() => {}); // fichier de secours d'un autre récitateur
    const T = verseTiming(rec, s, v);
    if (T && T.length === spans.length + 1) {
      const t = a.currentTime * 100 + 8; // un tout petit peu en avance, pour que l'œil suive
      let i = 0; while (i + 1 < spans.length && T[i + 1] <= t) i++;
      if (i !== me.cur) { if (me.cur >= 0) spans[me.cur].classList.remove('aa-w-now'); spans[i].classList.add('aa-w-now'); me.cur = i; }
    } else if (a && a.duration && isFinite(a.duration) && !a.paused) {
      const lead = Math.min(0.4, a.duration * 0.05), tail = Math.min(0.6, a.duration * 0.08);
      const p = Math.max(0, Math.min(1, (a.currentTime - lead) / Math.max(0.1, a.duration - lead - tail)));
      let i = cum.findIndex(x => p <= x); if (i < 0) i = spans.length - 1;
      if (i !== me.cur) { if (me.cur >= 0) spans[me.cur].classList.remove('aa-w-now'); spans[i].classList.add('aa-w-now'); me.cur = i; }
    }
    me.raf = requestAnimationFrame(tick);
  };
  me.raf = requestAnimationFrame(tick);
}
function applyRate(a) { try { a.preservesPitch = true; a.mozPreservesPitch = true; a.webkitPreservesPitch = true; a.playbackRate = AUDIO.rate || 1; } catch (e) { /* */ } }
function setAudioRate(r) { AUDIO.rate = r; if (currentAudio) applyRate(currentAudio); }
let audioSeq = 0; // chaque nouvelle lecture annule la précédente
function stopAudio() { followStop(); if (typeof playerHide === 'function') playerHide(); audioSeq++; if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* */ } } try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* */ } }
/* préchargement : on prépare le son du verset suivant pendant que l'autre joue */
const PRELOAD = new Map(); let LAST_AUDIO = null;
function preloadUrl(u) {
  if (!u || PRELOAD.has(u)) return;
  if (LAST_AUDIO && LAST_AUDIO.u === u && !LAST_AUDIO.a.error) { PRELOAD.set(u, LAST_AUDIO.a); return; } // même verset répété : on garde le même son
  try { const a = new Audio(); a.preload = 'auto'; a.src = u; a.load(); PRELOAD.set(u, a); } catch (e) { return; }
  while (PRELOAD.size > 4) PRELOAD.delete(PRELOAD.keys().next().value);
}
function preloadVerse(s, v) { try { preloadUrl(verseUrls(s, v)[0]); } catch (e) { /* */ } }
function playUrl(urls, fallbackText, onEnd, keepSeq) {
  if (!keepSeq) stopAudio();
  const my = audioSeq;
  if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* */ } }
  const list = urls.slice();
  const tryNext = () => {
    if (my !== audioSeq) return;
    const u = list.shift();
    if (!u) { if (fallbackText) speak(fallbackText); else notify('Son indisponible (connexion internet nécessaire).'); return; }
    // le verset suivant a été préparé à l'avance : il démarre sans blanc
    let a = PRELOAD.get(u); PRELOAD.delete(u);
    if (a && !a.error) { try { a.currentTime = 0; } catch (e) { /* */ } } else a = new Audio(u);
    currentAudio = a; LAST_AUDIO = { u, a };
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
/* 2.28.3 : petit lecteur flottant (pause / reprendre / arrêter), visible pendant toute la récitation,
 * en haut à gauche sous les onglets (jamais en bas : la barre d'Obsidian le cacherait sur iPhone/iPad). */
const PLAYER = { el: null, timer: 0, idle: 0, onStop: null }; // onStop : remettre les boutons de la page à zéro
function playerHide() { if (PLAYER.timer) clearInterval(PLAYER.timer); PLAYER.timer = 0; if (PLAYER.el) PLAYER.el.remove(); PLAYER.el = null; }
function playerPlace() {
  const el = PLAYER.el; if (!el) return;
  const root = [...document.querySelectorAll('.aa-root')].find(r => r.offsetParent !== null);
  if (!root) { el.style.display = 'none'; return; }
  const rr = root.getBoundingClientRect(); const sc = root.closest('.view-content') || root.parentElement;
  const top0 = Math.max(rr.top, sc ? sc.getBoundingClientRect().top : 0, 0);
  const tabs = root.querySelector('.aa-tabs'); const tb = tabs && tabs.offsetParent !== null ? tabs.getBoundingClientRect() : null;
  el.style.display = '';
  el.style.top = Math.round((tb && tb.bottom > top0 ? tb.bottom : top0) + 8) + 'px';
  el.style.left = Math.round(Math.max(rr.left, 0) + 12) + 'px';
}
function playerShow() {
  if (!PLAYER.el) {
    const el = document.createElement('div'); el.className = 'aa-player';
    const pp = document.createElement('button'); pp.className = 'aa-player-pp';
    const st = document.createElement('button'); st.className = 'aa-player-stop'; st.textContent = '⏹ Arrêter'; st.title = 'Arrêter la récitation';
    pp.addEventListener('click', () => { const a = currentAudio; if (!a) return; if (a.paused) { const r = a.play(); if (r && r.catch) r.catch(() => {}); } else a.pause(); playerSync(); });
    st.addEventListener('click', () => { const f = PLAYER.onStop; PLAYER.onStop = null; stopAudio(); playerHide(); if (f) try { f(); } catch (e) { /* */ } });
    el.append(pp, st); document.body.appendChild(el); PLAYER.el = el;
  }
  PLAYER.idle = 0;
  if (!PLAYER.timer) PLAYER.timer = setInterval(playerSync, 400);
  playerSync();
}
function playerSync() {
  const el = PLAYER.el; if (!el) return;
  const a = currentAudio;
  // minuterie de sommeil
  if (AUDIO.sleepAt && Date.now() >= AUDIO.sleepAt) { AUDIO.sleepAt = 0; AUDIO.sleepMin = 0; const f = PLAYER.onStop; PLAYER.onStop = null; stopAudio(); playerHide(); if (f) try { f(); } catch (e) { /* */ } notify('⏾ Minuterie : la récitation s\'est arrêtée.'); return; }
  let zz = el.querySelector('.aa-player-zz'); if (AUDIO.sleepAt) { if (!zz) { zz = document.createElement('span'); zz.className = 'aa-player-zz'; el.appendChild(zz); } zz.textContent = '⏾ ' + Math.max(1, Math.ceil((AUDIO.sleepAt - Date.now()) / 60000)) + ' min'; } else if (zz) zz.remove();
  // fini (et rien d'autre ne suit) depuis plus de 2 s : on range le lecteur
  if (!a || a.ended || a.error) { PLAYER.idle += 400; if (PLAYER.idle > 2000) { playerHide(); return; } } else PLAYER.idle = 0;
  const pp = el.querySelector('.aa-player-pp'); const paused = a && a.paused && !a.ended;
  pp.textContent = paused ? '▶ Reprendre' : '⏸ Pause'; pp.title = paused ? 'Reprendre la récitation' : 'Mettre en pause';
  el.classList.toggle('aa-player-paused', !!paused);
  playerPlace();
}
let PLAY_NEXT = null; // [sourate, verset] qui viendra après : on le prépare à l'avance
/* Joue un verset (répété AUDIO.repeat fois), puis appelle onEnd */
function playVerse(s, v, onEnd, keepSeq) {
  let left = AUDIO.repeat === 0 ? (keepSeq ? 1 : Infinity) : Math.max(1, AUDIO.repeat || 1); // 0 = en boucle
  if (!keepSeq) { stopAudio(); PLAY_NEXT = null; }
  const my = audioSeq;
  playerShow();
  const once = () => { playUrl(verseUrls(s, v), null, () => { followStop(); if (my !== audioSeq) return; left--; if (left > 0) { preloadVerse(s, v); once(); } else if (onEnd) onEnd(); }, true); followVerse(s, v); if (left > 1) preloadVerse(s, v); else if (PLAY_NEXT) preloadVerse(PLAY_NEXT[0], PLAY_NEXT[1]); };
  once();
}
/* Joue une suite de versets ; onVerse(v) est appelé au début de chacun */
function playVerses(s, list, onVerse, onDone) {
  stopAudio();
  const my = audioSeq; let i = 0;
  const next = () => {
    if (my !== audioSeq) return;
    if (i >= list.length) { PLAY_NEXT = null; if (AUDIO.repeat === 0 && list.length) { i = 0; setTimeout(next, 250); return; } if (onDone) onDone(); return; }
    const v = list[i++]; if (onVerse) onVerse(v);
    PLAY_NEXT = i < list.length ? [s, list[i]] : (AUDIO.repeat === 0 && list.length ? [s, list[0]] : null);
    playVerse(s, v, next, true);
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
const VERSE_LAYOUTS = [['mushaf', 'mushaf : versets à la suite, comme un Coran imprimé'], ['auto', 'longs versets en morceaux (conseillé)'], ['ligne', 'tout sur une ligne'], ['morceaux', 'toujours en morceaux'], ['mot', 'mot à mot (arabe, transcription, sens)']];
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
  const jAt = v => { const k = JUZ_START.findIndex(([a, b]) => a === surahN && b === v); return k >= 0 ? k + 1 : 0; };
  if (from === 1 && jAt(1) > 1 && opts.juz) juzMarker(ctx, container, jAt(1));
  else if (from === 1 && opts.juz && rubAt(surahN, 1) > 0) rubMarker(container, rubAt(surahN, 1));
  if (opts.title) {
    surahHeader(container, info, surahN);
  }
  if (from === 1 && surahN !== 1 && surahN !== 9 && opts.basmala !== false) {
    const b = h(container, 'div', 'aa-basmala'); arSpan(b, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ');
  }
  if (S.verseLayout === 'mushaf' && !opts.noMushaf) return renderMushaf(ctx, container, d, surahN, from, to);
  for (let vn = from; vn <= to; vn++) {
    if (vn > 1 && opts.juz && jAt(vn)) juzMarker(ctx, container, jAt(vn));
    else if (vn > 1 && opts.juz && rubAt(surahN, vn) > 0) rubMarker(container, rubAt(surahN, vn));
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
    /* iPad / iPhone : les outils du verset restent rangés derrière « ⋯ » ; on les ouvre d'un toucher */
    const vtMore = btn(tools, '⋯', () => { const open = tools.classList.toggle('aa-vt-open'); vtMore.textContent = open ? '✕' : '⋯'; }, 'aa-btn-quiet aa-vt-more');
    vtMore.title = 'Outils du verset : analyse, écouter, signet, copier, remarque';
    const structBox = h(document.createElement('div'), 'div', 'aa-struct');
    btn(tools, '🧩 Analyse de la phrase', () => {
      if (structBox.firstChild) { clear(structBox); return; }
      renderIrab(ctx, structBox, words, [surahN, vn], { onWord: wi => spans[wi].click() });
    }, 'aa-btn-quiet');
    if (ctx.settings.audio !== false) btn(tools, '▶ Écouter le verset', () => playVerse(surahN, vn), 'aa-btn-quiet aa-vt-keep');
    box.dataset.verse = String(vn);
    {
      const on = isBookmarked(ctx, surahN, vn);
      const bm = btn(tools, on ? '★ Signet' : '☆ Signet', () => { const now = toggleBookmark(ctx, surahN, vn); bm.textContent = now ? '★ Signet' : '☆ Signet'; bm.classList.toggle('aa-bm-on', now); }, 'aa-btn-quiet' + (on ? ' aa-bm-on' : ''));
      bm.title = 'Garder ce verset dans « Mes signets » (en haut de l\'onglet Coran)';
    }
    const vText = () => words.map(wordText).join(' ') + '\n' + tokens.join(' ') + '\n« ' + v[0] + ' » (' + info[1] + ' ' + surahN + ':' + vn + ')';
    btn(tools, canShare() ? '↗ Partager' : 'Copier le verset', () => shareText(vText(), info[1] + ' ' + surahN + ':' + vn), 'aa-btn-quiet');
    { let simBox = null; btn(moreMenu(tools), '🔁 Versets qui se ressemblent', () => { if (simBox) { simBox.remove(); simBox = null; return; } simBox = h(document.createElement('div'), 'div', 'aa-sim-wrap'); tools.parentNode.insertBefore(simBox, tools.nextSibling); renderSimilar(ctx, simBox, surahN, vn).catch(() => {}); }, 'aa-btn-quiet'); }
    btn(moreMenu(tools), '🖼 Image à partager', () => openVerseImage(ctx, surahN, vn), 'aa-btn-quiet');
    if (ctx.openTab) btn(moreMenu(tools), '🧠 Apprendre par cœur', () => ctx.openTab('coran', { hifz: { s: surahN, v: vn, level: 0 } }), 'aa-btn-quiet');
    if (ctx.openTab) btn(moreMenu(tools), '📜 Recopier dans mon cahier', () => ctx.openTab('write', { copy: true, copyAt: { s: surahN, v: vn }, copyChunk: 0, letter: null, word: null, unit: null, free: false }), 'aa-btn-quiet');
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

/* Mode « mushaf » : les versets à la suite, comme dans un Coran imprimé. On touche un verset :
 * sa transcription et sa traduction s'ouvrent juste après lui, avec le détail mot par mot si on veut. */
function renderMushaf(ctx, container, d, surahN, from, to) {
  const S = ctx.settings;
  const para = h(container, 'div', 'aa-mushaf' + (S.tajwid ? ' aa-tj-on' : '')); para.setAttribute('dir', 'rtl'); para.setAttribute('lang', 'ar');
  para.style.fontSize = S.arSize + 'px';
  let open = null;
  const close = () => { if (open) { open.panel.remove(); open.span.classList.remove('aa-mv-on'); open = null; } };
  for (let vn = from; vn <= to; vn++) {
    const v = d.v[vn - 1]; const words = v[2];
    const vs = h(para, 'span', 'aa-mv'); vs.dataset.ref = surahN + ':' + vn; vs.dataset.verse = String(vn);
    const tj = S.tajwid ? tajwidVerse(words) : null;
    words.forEach((w, wi) => {
      const st = stemOf(w);
      const sp = h(vs, 'span', 'aa-w ' + (POS_CLASS[st.f.pos] || '') + (isInitials(w) ? ' aa-pos-inl' : ''));
      if (tj) fillTajwid(sp, tj[wi]); else sp.textContent = S.noVowels ? noVowels(wordText(w)) : wordText(w);
      vs.appendChild(document.createTextNode(' '));
    });
    h(vs, 'span', 'aa-mv-num', '﴿' + arNum(vn) + '﴾');
    vs.appendChild(document.createTextNode(' '));
    vs.addEventListener('click', () => {
      const same = open && open.span === vs; close(); if (same) return;
      const panel = document.createElement('div'); panel.className = 'aa-mv-panel'; panel.setAttribute('dir', 'ltr');
      vs.after(panel); vs.classList.add('aa-mv-on'); open = { panel, span: vs };
      if (S.showTr !== false) h(panel, 'div', 'aa-tr', translitVerse(words, S.style));
      const fr = h(panel, 'div', 'aa-mv-fr'); h(fr, 'span', 'aa-ref', surahN + ':' + vn + ' '); fr.appendChild(document.createTextNode(v[0]));
      const act = h(panel, 'div', 'aa-actions');
      if (S.audio !== false) btn(act, '▶ Écouter', () => playVerse(surahN, vn), 'aa-btn-quiet');
      btn(act, '🔎 Mot par mot', ev => { ev.target.remove(); const sub = h(panel, 'div', 'aa-mv-detail'); renderVerses(ctx, sub, surahN, vn, vn, { noMushaf: true }); }, 'aa-btn-quiet');
      btn(act, '✕', () => close(), 'aa-btn-quiet').title = 'Fermer';
      panel.addEventListener('click', ev => ev.stopPropagation());
    });
  }
}
