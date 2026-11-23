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
