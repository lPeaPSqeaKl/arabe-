/* ====================================================================
 * 06w - Confort : page « Mes signets et remarques », « Quoi de neuf »,
 * ambiance selon l'heure, Accueil réglable.
 * ==================================================================== */

/* ---------- Mes signets et mes remarques, sur une seule page ---------- */
function renderBookmarksPage(ctx, root, state, back) {
  clear(root);
  btn(h(root, 'div', 'aa-actions'), '← Retour au Coran', back, 'aa-btn-quiet aa-own-back');
  h(root, 'h2', null, '★ Mes signets et mes remarques');
  const S = ctx.settings; const B = S.bookmarks || []; const N = S.verseNotes || {};
  const again = () => { const y = (root.closest('.aa-root') || {}).scrollTop; renderBookmarksPage(ctx, root, state, back); try { root.closest('.aa-root').scrollTop = y; } catch (e) { /* */ } };
  // tous les versets : signets + versets avec une remarque
  const keys = new Map();
  B.forEach(b => keys.set(b.s + ':' + b.v, { s: b.s, v: b.v, bm: b }));
  Object.keys(N).forEach(k => { const [s, v] = k.split(':').map(Number); if (!keys.has(k)) keys.set(k, { s, v }); keys.get(k).note = N[k]; });
  if (!keys.size) { mdText(root, 'p', 'aa-muted', 'Rien pour l\'instant. Sous chaque verset, **☆ Signet** garde le verset ici, et **📝 Remarque** te laisse écrire ce que tu veux (un mot appris, une question, un souvenir).'); return; }
  const sort = state.bmSort || 'recent';
  const bar = h(root, 'div', 'aa-seg-tabs');
  [['recent', 'Les plus récents'], ['coran', 'Dans l\'ordre du Coran'], ['notes', 'Avec une remarque']].forEach(([k, l]) => { const b = btn(bar, l, () => { state.bmSort = k; again(); }); if (sort === k) b.classList.add('aa-on'); });
  let list = [...keys.values()];
  if (sort === 'coran') list.sort((a, b) => a.s - b.s || a.v - b.v);
  else if (sort === 'notes') list = list.filter(x => x.note);
  else list.sort((a, b) => ((b.bm && b.bm.d) || 0) - ((a.bm && a.bm.d) || 0));
  h(root, 'p', 'aa-muted aa-small', B.length + ' signet' + (B.length > 1 ? 's' : '') + ' · ' + Object.keys(N).length + ' remarque' + (Object.keys(N).length > 1 ? 's' : ''));
  const wrap = h(root, 'div', 'aa-bmp');
  list.forEach(x => {
    const c = h(wrap, 'div', 'aa-bmp-card');
    const top = h(c, 'div', 'aa-bmp-top');
    const a = h(top, 'a', 'aa-link', (x.bm ? '★ ' : '📝 ') + ctx.data.surahInfo(x.s)[1] + ' ' + x.s + ':' + x.v); a.addEventListener('click', ev => { ev.preventDefault(); ctx.openQuran(x.s, x.v); });
    const tb = h(top, 'div', 'aa-bmp-tools');
    soundBtn(tb, () => playVerse(x.s, x.v), 'Écouter ce verset');
    if (x.bm) btn(tb, '✕', () => { const i = B.indexOf(x.bm); B.splice(i, 1); ctx.save(); again(); undoToast('Signet retiré.', () => { B.splice(Math.min(i, B.length), 0, x.bm); ctx.save(); again(); }); }, 'aa-btn-quiet').title = 'Retirer ce signet';
    const ar = h(c, 'div', 'aa-bmp-ar'); ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar');
    const fr = h(c, 'div', 'aa-bmp-fr aa-small');
    ctx.data.surah(x.s).then(d => { const vv = d.v[x.v - 1]; if (!vv) return; ar.textContent = vv[2].map(wordText).join(' ') + ' ﴿' + arNum(x.v) + '﴾'; fr.textContent = vv[0]; }).catch(() => {});
    const nb = h(c, 'div', 'aa-bmp-note');
    const paintNote = () => {
      clear(nb); const k = x.s + ':' + x.v; const t = (S.verseNotes || {})[k];
      if (t) { h(nb, 'div', 'aa-bmp-note-t', '📝 ' + t); }
      btn(nb, t ? '✎ Modifier ma remarque' : '📝 Ajouter une remarque', () => {
        clear(nb); const ta = h(nb, 'textarea', 'aa-vnote-ta'); ta.rows = 3; ta.value = t || ''; ta.placeholder = 'Ta remarque sur ce verset…';
        const r = h(nb, 'div', 'aa-actions');
        btn(r, 'Garder', () => { const v = ta.value.trim(); S.verseNotes = S.verseNotes || {}; if (v) S.verseNotes[k] = v; else delete S.verseNotes[k]; ctx.save(); paintNote(); }, 'mod-cta');
        btn(r, 'Annuler', paintNote, 'aa-btn-quiet'); ta.focus();
      }, 'aa-btn-quiet aa-small');
    };
    paintNote();
  });
  h(root, 'div', 'aa-bottom-space');
}

/* ---------- Quoi de neuf (une seule fois après une mise à jour) ---------- */
const WHATS_NEW = [
  ['2.40.6', ['✍️ « Voir le geste » : chaque morceau attaché est tracé d\'un seul trait, sans lever le stylo ; la main monte et redescend sur les dents ; les voyelles à la toute fin.']],
  ['2.40.5', ['🔊 Le son des lettres et des mots (voix de l\'appareil) remarche sur iPad et iPhone, même après une récitation.']],
  ['2.40.4', ['🎯 Alphabet › S\'entraîner : les réponses longues passent à la ligne, un score par exercice.']],
  ['2.40.3', ['🧠 Par cœur : choisis le récitateur directement.']],
  ['2.40.2', ['🎧 La récitation enchaîne les versets sans pause : le verset suivant est préparé à l\'avance.']],
  ['2.40.1', ['🖨 Impression : un seul bouton pour les 30 parties, et 📕 une couverture possible pour n\'importe quelle sourate.']],
  ['2.40.0', ['📅 **Plan de lecture** du Coran : choisis ton rythme, l\'Accueil te donne ta part du jour, elle se coche toute seule.', '📚 Les parties se cochent toutes seules quand tu arrives au bout ; repères ۞ des quarts de ḥizb ; « 🔊 » pour écouter une partie entière.', '🎯 Aller à un verset : tape « 2:255 » ou « Kursi » dans la recherche.', '🎧 Écoute : passage de A à B (en boucle pour apprendre), ⏭ enchaîner la suite, ⏾ minuterie.', '★ Une page pour tous tes **signets et remarques**.', '↶ **Annuler** après un clic, aussi dans les cartes (touche Z) ; résumé à la fin des cartes.', '🔍 Dictionnaire : recherches récentes et ☆ favoris. 🏠 Accueil réglable. 🌗 Ambiance selon l\'heure. ⌨️ Raccourcis (touche ?).']],
  ['2.39.0', ['📚 Les **30 parties** du Coran (juz\') et ton tour du Coran.']],
  ['2.38.0', ['🖨 Impression : couleurs de prononciation, mot à mot, plusieurs sourates, livret plié, lignes pour recopier.']],
  ['2.37.0', ['🎨 8 nouvelles ambiances décoratives ; l\'impression suit l\'ambiance.']],
  ['2.36.0', ['🖨 Imprimer une sourate en PDF ou PNG, A4 ou A5.']],
  ['2.35.0', ['🔁 Versets qui se ressemblent, et 📅 révision du par cœur.']],
];
const vNum = v => String(v || '0').split('.').reduce((a, x) => a * 1000 + (+x || 0), 0);
function maybeWhatsNew(ctx, host, version) {
  const S = ctx.settings; const seen = S.seenVersion;
  if (seen === version) return;
  S.seenVersion = version; ctx.save();
  if (!seen) return; // nouvelle installation : rien à annoncer
  const items = WHATS_NEW.filter(([v]) => vNum(v) > vNum(seen) && vNum(v) <= vNum(version));
  if (!items.length) return;
  const dlg = h(host, 'div', 'aa-imgdlg aa-whatsnew'); const card = h(dlg, 'div', 'aa-imgdlg-card');
  const head = h(card, 'div', 'aa-imgdlg-head'); h(head, 'b', null, '✨ Quoi de neuf dans l\'atelier'); btn(head, '✕', () => dlg.remove(), 'aa-btn-quiet');
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.remove(); });
  items.slice(0, 4).forEach(([v, L]) => { h(card, 'div', 'aa-muted aa-small aa-wn-v', 'Version ' + v); const ul = h(card, 'ul', 'aa-wn-list'); L.forEach(t => mdText(ul, 'li', null, t)); });
  btn(h(card, 'div', 'aa-actions'), 'Super, merci', () => dlg.remove(), 'mod-cta');
}

/* ---------- ambiance selon l'heure ---------- */
function ambianceAutoOf(S) { const A = S.ambAuto || {}; const hr = new Date().getHours(); const night = hr >= (A.from != null ? A.from : 20) || hr < (A.to != null ? A.to : 7); return night ? (A.night || 'nuit') : (A.day || 'sepia'); }

/* ---------- Accueil réglable ---------- */
const HOME_BLOCKS = [['today', '☀️ Aujourd\'hui'], ['search', '🔎 Recherche'], ['path', '🧭 Ton parcours'], ['vod', '🌙 Verset du jour'], ['tiles', '🔥 Les trois chiffres'], ['todo', '📖 Reprendre ma lecture'], ['quran', '📖 Ce que tu comprends du Coran'], ['cal', '🗓️ Tes 12 dernières semaines']];
function homeLayout(ctx) {
  const H = ctx.settings.home || {}; const order = (H.order || []).filter(k => HOME_BLOCKS.some(b => b[0] === k));
  HOME_BLOCKS.forEach(([k]) => { if (!order.includes(k)) order.push(k); });
  return { order, hidden: H.hidden || [] };
}
function renderHomeArrange(ctx, root, state, go) {
  const box = h(root, 'div', 'aa-home-arrange');
  h(box, 'b', null, '✎ Arranger l\'Accueil');
  h(box, 'div', 'aa-muted aa-small', 'Coche ce que tu veux voir, et change l\'ordre avec ↑ ↓.');
  const L = homeLayout(ctx); const H = ctx.settings.home || (ctx.settings.home = {});
  const save = () => { H.order = L.order; H.hidden = L.hidden; ctx.save(); go(); };
  L.order.forEach((k, i) => {
    const r = h(box, 'div', 'aa-home-arr-row'); const lab = HOME_BLOCKS.find(b => b[0] === k)[1];
    checkbox(r, lab, !L.hidden.includes(k), v => { L.hidden = v ? L.hidden.filter(x => x !== k) : L.hidden.concat(k); save(); });
    const ar = h(r, 'span', 'aa-home-arr-btns');
    const up = btn(ar, '↑', () => { [L.order[i - 1], L.order[i]] = [L.order[i], L.order[i - 1]]; save(); }, 'aa-btn-quiet'); up.disabled = i === 0;
    const dn = btn(ar, '↓', () => { [L.order[i + 1], L.order[i]] = [L.order[i], L.order[i + 1]]; save(); }, 'aa-btn-quiet'); dn.disabled = i === L.order.length - 1;
  });
  const a = h(box, 'div', 'aa-actions');
  btn(a, 'Terminé', () => { state.arrange = false; go(); }, 'mod-cta');
  btn(a, 'Tout remettre comme avant', () => { delete ctx.settings.home; ctx.save(); go(); }, 'aa-btn-quiet');
}
