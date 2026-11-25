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
  if (state.hifz) { renderHifz(ctx, root, state, () => { state.hifz = null; renderQuranTab(ctx, root, state); }).catch(e => h(root, 'p', 'aa-warn', 'Erreur : ' + e.message)); return; }
  const data = ctx.data;
  const PAGE = 20;
  /* petit écran (iPhone) : une barre compacte, le reste se replie pour que le texte commence tout de suite */
  const small = (root.clientWidth || window.innerWidth || 1000) < 600;
  const bar = h(root, 'div', 'aa-toolbar' + (small ? ' aa-qsmall' : ''));
  const order = ctx.settings.surahOrder === 'nuzul' ? 'nuzul' : 'mushaf';
  const seq = surahSequence(order);
  const goSurah = n => { state.surah = n; state.page = 0; state.focus = 0; state.resume = 0; renderQuranTab(ctx, root, state); };
  rememberPlace(ctx, state.surah, state.focus || state.resume || (state.page || 0) * PAGE + 1);
  const f0 = small ? null : field(bar, 'Ordre');
  const orderSel = box => selectEl(box, [['mushaf', 'ordre du Coran'], ['nuzul', 'ordre de la révélation']], order, v => { ctx.settings.surahOrder = v; ctx.save(); renderQuranTab(ctx, root, state); });
  if (f0) orderSel(f0);
  const f1 = field(bar, 'Sourate');
  selectEl(f1, seq.map(n => { const s = data.surahInfo(n); return [n, (order === 'nuzul' ? rankFr(REVELATION_ORDER[n - 1]) + ' révélée · sourate ' : '') + n + '. ' + s[1] + ' — ' + s[2]]; }), state.surah, v => goSurah(+v));
  const info = data.surahInfo(state.surah); const nV = info[5];
  const pos = seq.indexOf(state.surah);
  const nav = h(bar, 'div', 'aa-actions aa-surah-nav');
  if (pos > 0) btn(nav, small ? '‹' : '← ' + data.surahInfo(seq[pos - 1])[1], () => goSurah(seq[pos - 1]), 'aa-btn-quiet').title = 'Sourate précédente (' + (order === 'nuzul' ? 'ordre de la révélation' : 'ordre du Coran') + ')';
  if (pos < seq.length - 1) btn(nav, small ? '›' : data.surahInfo(seq[pos + 1])[1] + ' →', () => goSurah(seq[pos + 1]), 'aa-btn-quiet').title = 'Sourate suivante (' + (order === 'nuzul' ? 'ordre de la révélation' : 'ordre du Coran') + ')';
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
  const opt = h(bar, 'details', 'aa-qopts' + (small ? '' : ' aa-qopts-wide')); opt.open = !small || !!state.optsOpen;
  h(opt, 'summary', null, small ? '⚙ Son et affichage' : (ctx.settings.audio !== false ? '🔊 Son et ' : '') + 'options d\'affichage');
  opt.addEventListener('toggle', () => { if (small) state.optsOpen = opt.open; });
  if (ctx.settings.audio !== false) renderReciteBar(ctx, root, opt, state, nV);
  if (small) { const fo = field(opt, 'Ordre des sourates'); fo.classList.add('aa-qorder'); orderSel(fo); }
  const tg = h(opt, 'div', 'aa-toggles');
  const quick = h(small ? opt : bar, 'div', 'aa-actions aa-quick');
  btn(quick, 'A−', () => setArSize(ctx, root, -2), 'aa-btn-quiet aa-asize').title = 'Texte arabe plus petit';
  btn(quick, 'A+', () => setArSize(ctx, root, +2), 'aa-btn-quiet aa-asize').title = 'Texte arabe plus grand';
  const quick2 = small ? h(bar, 'div', 'aa-actions aa-quick aa-quick-sm') : quick;
  if (small) opt.parentNode.insertBefore(quick2, opt);
  btn(quick2, small ? '⤢' : '⤢ Lecture', () => setReading(root.closest('.aa-root') || root, true, ctx), 'aa-btn-quiet').title = 'Plein écran : seulement le texte (Échap ou ✕ pour sortir)';
  btn(quick2, small ? '🧠' : '🧠 Par cœur', () => { state.hifz = { s: state.surah, v: Math.max(1, state.focus || (ctx.settings.lastSurah === state.surah ? ctx.settings.lastVerse : 1) || 1), level: 0 }; renderQuranTab(ctx, root, state); }, 'aa-btn-quiet').title = 'Apprendre par cœur, verset par verset ou toute la sourate';
  btn(quick2, small ? '🔎' : '🔎 Chercher', () => { state.searchOpen = !state.searchOpen; renderQuranTab(ctx, root, state); }, 'aa-btn-quiet' + (state.searchOpen ? ' aa-on' : '')).title = 'Chercher un mot dans tout le Coran';
  checkbox(tg, 'translittération', ctx.settings.showTr, v => { ctx.settings.showTr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'français', ctx.settings.showFr, v => { ctx.settings.showFr = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'couleurs des mots', ctx.settings.wordColors !== false, v => { ctx.settings.wordColors = v; ctx.save(); const r = root.closest && root.closest('.aa-root'); if (r) r.classList.toggle('aa-nocolor', !v); });
  checkbox(tg, '🎨 prononciation', !!ctx.settings.tajwid, v => { ctx.settings.tajwid = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, 'sans voyelles', !!ctx.settings.noVowels, v => { ctx.settings.noVowels = v; ctx.save(); renderQuranTab(ctx, root, state); });
  checkbox(tg, '📜 toute la sourate en continu', all, v => { ctx.settings.scrollAll = v; ctx.save(); state.focus = 0; state.resume = ctx.settings.lastSurah === state.surah ? ctx.settings.lastVerse : 0; renderQuranTab(ctx, root, state); });
  checkbox(tg, '✨ suivre le mot récité', ctx.settings.followWords !== false, v => { ctx.settings.followWords = v; AUDIO.follow = v; ctx.save(); });
  checkbox(tg, '👁 m\'entraîner à lire', !!ctx.settings.practice, v => { ctx.settings.practice = v; ctx.save(); const b = root.querySelector('.aa-verses'); if (b) b.classList.toggle('aa-practice', v); });
  {
    const lr = h(opt, 'label', 'aa-layout-row'); h(lr, 'span', null, 'Affichage des versets : ');
    const sel = h(lr, 'select', 'dropdown aa-layout-sel');
    VERSE_LAYOUTS.forEach(([k, l]) => { const o = h(sel, 'option', null, l); o.value = k; });
    sel.value = ctx.settings.verseLayout || 'auto';
    sel.addEventListener('change', () => { ctx.settings.verseLayout = sel.value; ctx.save(); renderQuranTab(ctx, root, state); });
  }
  const nBm = (ctx.settings.bookmarks || []).length;
  const side = small ? h(details(root, '📑 ' + (nBm ? 'Signets (' + nBm + '), ' : '') + 'mon cours, infos sur la sourate', !!state.sideOpen, 'aa-qmore'), 'div') : root;
  if (small) side.parentNode.addEventListener('toggle', () => { state.sideOpen = side.parentNode.open; });
  renderBookmarks(ctx, side, state, n => goSurah(n));
  const course = ctx.courseSurahs();
  if (course.length) {
    const cb = h(side, 'div', 'aa-course');
    h(cb, 'span', 'aa-muted', 'Mon cours : ');
    course.forEach(c => {
      const ch = h(cb, 'span', 'aa-chip' + (c.n === state.surah ? ' aa-chip-on' : ''), c.label);
      ch.addEventListener('click', () => { state.surah = c.n; state.page = 0; state.focus = 0; renderQuranTab(ctx, root, state); });
    });
    const mine = course.find(c => c.n === state.surah);
    if (mine) { const lk = h(cb, 'a', 'aa-link aa-small', '📝 ouvrir ma note « ' + mine.file.basename + ' »'); lk.addEventListener('click', ev => { ev.preventDefault(); ctx.openNote(mine.file); }); }
  }
  h(side, 'div', 'aa-muted aa-small aa-surah-info', 'Sourate ' + state.surah + ' · ' + info[5] + ' versets · révélée à ' + (info[4] === 'Médine' ? 'Médine' : 'La Mecque') + ' · ' + rankFr(REVELATION_ORDER[state.surah - 1]) + ' dans l\'ordre de la révélation');
  const kn = h(side, 'div', 'aa-surah-know');
  surahKnowledge(ctx, state.surah).then(k => {
    if (!k.total) return;
    progressBar2(kn, k.known / k.total, k.learning / k.total);
    const t = h(kn, 'div', 'aa-small aa-muted');
    t.appendChild(document.createTextNode('Tu connais ' + k.pct + ' % des mots de cette sourate' + (k.pctAll > k.pct ? ', et ' + (k.pctAll - k.pct) + ' % sont en cours d\'apprentissage' : '') + '. '));
    if (k.unknown.length) { const a = h(t, 'a', 'aa-link', '📖 Apprendre les mots de cette sourate (' + k.unknown.length + ' nouveaux)'); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openTab('review', { surahWords: state.surah, session: null, deck: null }); }); }
  }).catch(() => {});
  if (ctx.settings.tajwid) renderTajwidLegend(details(side, '🎨 Couleurs de prononciation : ce qu\'on prononce ou pas', true));
  mdText(side, 'p', 'aa-help', '**Clique sur un mot** pour voir ses morceaux, ses signes lettre par lettre, la raison de sa terminaison et les autres formes possibles. Couleurs : bleu = nom, rouge = verbe, gris = particule.');
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
    const nav = h(root, 'div', 'aa-pager');
    const top = () => { try { root.closest('.aa-root').scrollTop = 0; } catch (e) { /* */ } };
    if (state.page > 0) btn(nav, '← versets précédents', () => { state.page--; state.focus = 0; renderQuranTab(ctx, root, state); top(); });
    else if (pos > 0) btn(nav, '← ' + data.surahInfo(seq[pos - 1])[1], () => { goSurah(seq[pos - 1]); top(); }, 'aa-btn-quiet').title = 'Sourate précédente';
    if (state.page < pages - 1) btn(nav, 'versets suivants →', () => { state.page++; state.focus = 0; renderQuranTab(ctx, root, state); top(); });
    else if (pos < seq.length - 1) {
      const n2 = seq[pos + 1];
      const end = h(root, 'div', 'aa-scroll-end');
      h(end, 'div', 'aa-muted aa-small', 'Fin de la sourate ' + info[1] + '.');
      btn(end, 'Sourate suivante : ' + data.surahInfo(n2)[1] + ' →', () => { goSurah(n2); top(); }, 'mod-cta');
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
function setReading(rootEl, on, ctx) {
  rootEl.classList.toggle('aa-reading', on);
  let bar = rootEl.querySelector(':scope > .aa-reading-bar');
  if (on && !bar) {
    /* en haut, collée : en bas, la barre flottante d'Obsidian (iPhone, iPad) la cachait */
    bar = document.createElement('div'); bar.className = 'aa-reading-bar'; rootEl.insertBefore(bar, rootEl.firstChild);
    const body = rootEl.querySelector('.aa-body');
    const ctxRoot = body;
    btn(bar, 'A−', () => { const b = rootEl.querySelector('.aa-body button.aa-asize'); if (b) b.click(); }, 'aa-btn-quiet');
    btn(bar, 'A+', () => { const b = rootEl.querySelectorAll('.aa-body button.aa-asize')[1]; if (b) b.click(); }, 'aa-btn-quiet');
    /* petit choix de police, discret : un « Aa » qui ouvre la liste du système (iPhone, iPad, ordinateur) */
    if (ctx) {
      const S = ctx.settings;
      const wrap = h(bar, 'label', 'aa-rd-font'); wrap.title = 'Changer la police arabe';
      h(wrap, 'span', 'aa-rd-font-lab', 'Aa');
      const sel = h(wrap, 'select', 'aa-rd-font-sel');
      AR_FONTS.forEach(f => { const o = h(sel, 'option', null, f[1].replace(/ \(.*\)$/, '')); o.value = f[0]; });
      sel.value = S.arFont || 'amiri';
      const mb = btn(bar, S.verseLayout === 'mushaf' ? '☰' : '📖', () => {
        S.verseLayout = S.verseLayout === 'mushaf' ? (S.prevLayout || 'auto') : (S.prevLayout = S.verseLayout || 'auto', 'mushaf');
        ctx.save(); mb.textContent = S.verseLayout === 'mushaf' ? '☰' : '📖'; if (ctx.refresh) ctx.refresh();
      }, 'aa-btn-quiet');
      mb.title = 'Basculer : mushaf (versets à la suite) ou verset par verset';
      const aw = h(bar, 'label', 'aa-rd-font'); aw.title = 'Ambiance : nuit, sépia, clair';
      h(aw, 'span', 'aa-rd-font-lab', '🌓');
      const asel = h(aw, 'select', 'aa-rd-font-sel');
      AMBIANCES.forEach(a => { const o = h(asel, 'option', null, a[1]); o.value = a[0]; });
      asel.value = ambianceOf(S);
      asel.addEventListener('change', () => { S.ambiance = asel.value; S.paper = false; ctx.save(); applyAmbiance(rootEl, asel.value); });
      sel.addEventListener('change', () => {
        S.arFont = sel.value; ctx.save();
        ensureFont(sel.value).catch(() => {});
        AR_FONTS.forEach(f => rootEl.classList.toggle('aa-font-' + f[0], sel.value === f[0]));
      });
    }
    btn(bar, '✕', () => setReading(rootEl, false, ctx), 'aa-btn-quiet aa-rd-quit').title = 'Quitter la lecture (Échap)';
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
