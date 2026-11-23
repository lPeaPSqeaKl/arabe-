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
