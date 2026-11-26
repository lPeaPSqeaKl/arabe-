/* ====================================================================
 * 06v - Les 30 parties (juz') : une page pour les voir toutes, suivre
 * son « tour du Coran » (une partie par jour = le Coran en un mois),
 * et un repère dans la lecture là où une nouvelle partie commence.
 * ==================================================================== */
function juzState(ctx) { const J = ctx.settings.juz || (ctx.settings.juz = {}); J.read = J.read || {}; J.tours = J.tours || 0; return J; }
function juzMarkRead(ctx, j, on) { const J = juzState(ctx); if (on) J.read[j] = todayNum(); else delete J.read[j]; ctx.save(); if (on && ctx.markActivity) ctx.markActivity('r'); }
const juzReadCount = ctx => Object.keys(juzState(ctx).read).length;

/* le repère dans la lecture : « ۞ Partie 3 · تِلْكَ ٱلرُّسُلُ » */
function juzMarker(ctx, container, j) {
  const m = h(container, 'div', 'aa-juz-mark');
  h(m, 'span', 'aa-juz-mark-line');
  const t = h(m, 'div', 'aa-juz-mark-t');
  const ar = h(t, 'span', 'aa-juz-mark-ar', '۞ ' + JUZ_NAMES[j - 1][0]); ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar');
  h(t, 'span', 'aa-juz-mark-fr', 'Début de la partie ' + j + ' sur 30 · ' + JUZ_NAMES[j - 1][1]);
  h(m, 'span', 'aa-juz-mark-line');
  const J = juzState(ctx);
  if (j > 1 && !J.read[j - 1]) {
    const b = btn(t, '✓ J\'ai fini la partie ' + (j - 1), () => { juzMarkRead(ctx, j - 1, true); b.replaceWith(h(null, 'span', 'aa-small aa-ok', '✓ Partie ' + (j - 1) + ' lue · ' + juzReadCount(ctx) + ' / 30')); }, 'aa-btn-quiet aa-small');
  }
  return m;
}

function renderJuz(ctx, root, state, back) {
  clear(root);
  btn(h(root, 'div', 'aa-actions'), '← Retour au Coran', back, 'aa-btn-quiet aa-own-back');
  h(root, 'h2', null, '📚 Les 30 parties du Coran');
  const help = h(root, 'details', 'aa-help-box'); h(help, 'summary', null, 'ⓘ C\'est quoi, une partie (juz\') ?');
  mdText(help, 'p', 'aa-help', 'Le Coran est coupé en **30 parties de même longueur**. En arabe : **juz\'** (جُزْء, « morceau »). Chaque partie porte le nom de ses **premiers mots** : la 30ᵉ s\'appelle *ʿAmma* parce qu\'elle commence par « عَمَّ » (sourate 78).');
  mdText(help, 'p', 'aa-help', 'Lire **une partie par jour**, c\'est lire **tout le Coran en un mois** (c\'est ce que beaucoup font pendant le Ramadan). Une demi-partie par jour : deux mois. Il n\'y a pas de course : coche une partie quand tu l\'as finie, à ton rythme.');
  mdText(help, 'p', 'aa-help aa-small', 'Les parties 4, 7 et 21 gardent leur nom traditionnel, même si dans le mushaf de Médine (celui de l\'atelier) elles commencent un verset plus loin.');
  const J = juzState(ctx); const n = juzReadCount(ctx);
  const here = juzOf(ctx.settings.lastSurah || 1, ctx.settings.lastVerse || 1);
  const next = (() => { for (let j = 1; j <= 30; j++) if (!J.read[j]) return j; return 0; })();
  /* mon tour du Coran */
  const tour = h(root, 'div', 'aa-juz-tour');
  const tt = h(tour, 'div', 'aa-juz-tour-tx');
  h(tt, 'b', null, n === 30 ? '🎉 Tu as lu tout le Coran !' : 'Mon tour du Coran : ' + n + ' / 30 parties');
  h(tt, 'div', 'aa-muted aa-small', n === 30 ? 'Qu\'Allah l\'accepte. Tu peux commencer un nouveau tour.' : n ? 'Encore ' + (30 - n) + ' partie' + (30 - n > 1 ? 's' : '') + '. À une partie par jour : ' + (30 - n) + ' jour' + (30 - n > 1 ? 's' : '') + '.' : 'Commence par la partie 1, ou par celle que tu préfères.');
  if (J.tours) h(tt, 'div', 'aa-small aa-juz-tours', '🏅 Tours terminés : ' + J.tours);
  const bar = h(tour, 'div', 'aa-juz-bar'); for (let j = 1; j <= 30; j++) { const c = h(bar, 'span', 'aa-juz-cell' + (J.read[j] ? ' is-read' : '') + (j === here ? ' is-here' : '')); c.title = 'Partie ' + j + (J.read[j] ? ' · lue' : ''); c.addEventListener('click', () => { const el = root.querySelector('[data-juz="' + j + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); }
  const ta = h(tour, 'div', 'aa-actions');
  if (n === 30) btn(ta, '🔄 Commencer un nouveau tour', () => { J.tours++; J.read = {}; ctx.save(); renderJuz(ctx, root, state, back); }, 'mod-cta');
  else {
    const go = J.read[here] ? next : here;
    const ls = ctx.settings.lastSurah, lv = ctx.settings.lastVerse || 1;
    if (go === here && ls) btn(ta, '▶ Reprendre la partie ' + go + ' (' + ctx.data.surahInfo(ls)[1] + ', verset ' + lv + ')', () => ctx.openQuran(ls, lv), 'mod-cta');
    else btn(ta, '▶ Lire la partie ' + go, () => ctx.openQuran(...JUZ_START[go - 1]), 'mod-cta');
  }
  const again = () => { const y = (root.closest('.aa-root') || {}).scrollTop; renderJuz(ctx, root, state, back); try { root.closest('.aa-root').scrollTop = y; } catch (e) { /* */ } };
  renderPlanBox(ctx, root, again);
  /* les 30 cartes */
  const grid = h(root, 'div', 'aa-juz-grid');
  for (let j = 1; j <= 30; j++) {
    const card = h(grid, 'div', 'aa-juz-card' + (J.read[j] ? ' is-read' : '') + (j === here ? ' is-here' : '')); card.dataset.juz = j;
    const top = h(card, 'div', 'aa-juz-top');
    starBadge(top, arNum(j), 'aa-juz-num').title = 'Partie ' + j;
    const nm = h(top, 'div', 'aa-juz-name');
    const ar = h(nm, 'div', 'aa-juz-ar', JUZ_NAMES[j - 1][0]); ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar');
    h(nm, 'div', 'aa-juz-tr', JUZ_NAMES[j - 1][1]);
    h(card, 'div', 'aa-small', juzSpan(ctx, j));
    const pc = juzPct(ctx, j);
    h(card, 'div', 'aa-muted aa-small', juzVerses(ctx, j) + ' versets' + (j === here ? ' · 📍 tu lis ici' : '') + (J.read[j] ? ' · ✓ lue' : pc ? ' · ' + pc + ' % lu' : ''));
    if (pc && !J.read[j]) { const pb = h(card, 'div', 'aa-juz-pct'); h(pb, 'div').style.width = pc + '%'; }
    const a = h(card, 'div', 'aa-juz-act');
    btn(a, 'Lire', () => ctx.openQuran(...JUZ_START[j - 1]), J.read[j] ? 'aa-btn-quiet' : '');
    btn(a, '🔊', () => playJuz(ctx, j), 'aa-btn-quiet').title = 'Écouter toute la partie (la récitation passe d\'une sourate à l\'autre)';
    btn(a, '🖨', () => openPrintDialog(ctx, JUZ_START[j - 1][0], { juz: j }), 'aa-btn-quiet').title = 'Imprimer cette partie (PDF ou images)';
    btn(a, J.read[j] ? '↺' : '✓ Lue', () => { const was = J.read[j]; juzMarkRead(ctx, j, !was); again(); undoToast(was ? 'Coche enlevée (partie ' + j + ').' : 'Partie ' + j + ' cochée.', () => { if (was) J.read[j] = was; else delete J.read[j]; ctx.save(); again(); }); }, 'aa-btn-quiet').title = J.read[j] ? 'Enlever la coche' : 'J\'ai fini de lire cette partie';
  }
  renderReadCalendar(ctx, h(root, 'div', 'aa-juz-calwrap'));
}

/* ---------- plan de lecture : une part par jour, en quarts de ḥizb ---------- */
const JUZ_PLANS = [[15, '2 parties par jour', '15 jours'], [30, '1 partie par jour', '1 mois'], [60, '½ partie par jour', '2 mois'], [120, '¼ de partie par jour', '4 mois'], [240, '1 quart de ḥizb par jour', '8 mois']];
/* la part d'aujourd'hui : du quart q au quart T-1 */
function planToday(ctx) {
  const P = juzState(ctx).plan; if (!P) return null;
  const d = todayNum() - P.start; const T = Math.min(240, Math.ceil((d + 1) * 240 / P.days));
  const q = P.q || 0; const per = 240 / P.days;
  const out = { day: d + 1, days: P.days, q, T, done: q >= T, finished: q >= 240, late: Math.max(0, Math.floor((T - q) / per - 1 + 1e-9)) };
  const a = Math.min(q, 239); const b = Math.max(a + 1, T);
  out.from = RUB_START[a]; out.toG = rubStartG(ctx, b) - 1; out.to = gToSV(ctx, out.toG); out.n = out.toG - rubStartG(ctx, a) + 1;
  return out;
}
function planLabel(ctx, p) { return svLabel(ctx, p.from) + ' → ' + svLabel(ctx, p.to) + ' (' + p.n + ' versets)'; }
/* appelée quand on lit : top = verset en haut de l'écran, seen = dernier verset visible */
function readingProgress(ctx, s, top, seen) {
  const J = juzState(ctx); const gT = gIndex(ctx, s, top), gS = gIndex(ctx, s, Math.max(top, seen || top)); let changed = false;
  const A = ctx.settings.activity || {}; const td = A[todayNum()];
  if (ctx.markActivity && !(td && td.q)) ctx.markActivity('q');
  // plan : on avance de quart en quart
  const P = J.plan;
  if (P) {
    for (let k = 0; k < 16 && (P.q || 0) < 240; k++) {
      const q = P.q || 0; const st = rubStartG(ctx, q), nx = rubStartG(ctx, q + 1);
      if ((gS >= nx - 1 && gT >= st - 5 && gT < nx) || (gT >= nx && gT < nx + 40)) { P.q = q + 1; changed = true; } else break;
    }
  }
  // parties : jusqu'où on a lu, et coche automatique à la fin
  const j = juzOf(s, top); const st = juzStartG(ctx, j), en = juzStartG(ctx, j + 1) - 1;
  J.from = J.from || {}; J.max = J.max || {};
  if (J.from[j] == null || gT < J.from[j]) { J.from[j] = gT; changed = true; }
  if (!J.max[j] || gS > J.max[j]) { J.max[j] = Math.min(gS, en); changed = true; }
  if (!J.read[j] && gS >= en && J.from[j] <= st + (en - st) * 0.15) { J.read[j] = todayNum(); changed = true; notify('✓ Partie ' + j + ' lue en entier : ' + juzReadCount(ctx) + ' / 30. Bravo !'); }
  if (changed) ctx.save();
}
const juzPct = (ctx, j) => { const J = juzState(ctx); if (J.read[j]) return 100; const m = J.max && J.max[j]; if (!m) return 0; const st = juzStartG(ctx, j), en = juzStartG(ctx, j + 1) - 1; return Math.max(0, Math.min(99, Math.round(100 * (m - st + 1) / (en - st + 1)))); };

function renderPlanBox(ctx, root, again) {
  const J = juzState(ctx); const box = h(root, 'div', 'aa-juz-plan');
  h(box, 'b', null, '📅 Mon plan de lecture');
  const p = planToday(ctx);
  if (!p) {
    h(box, 'div', 'aa-muted aa-small', 'Choisis ton rythme : chaque jour, l\'atelier te donne ta part à lire (l\'Accueil te la rappelle). Elle se coche toute seule quand tu arrives au bout.');
    const row = h(box, 'div', 'aa-juz-plan-opts');
    JUZ_PLANS.forEach(([d, lab, dur]) => { const b = btn(row, '', () => { J.plan = { start: todayNum(), days: d, q: 0 }; ctx.save(); again(); }, 'aa-btn-quiet'); h(b, 'b', null, lab); h(b, 'span', 'aa-muted aa-small', ' · ' + dur); });
    const dl = h(box, 'div', 'aa-juz-plan-date'); h(dl, 'span', 'aa-small', 'ou finir avant le : ');
    const inp = h(dl, 'input'); inp.type = 'date'; const t = new Date(); t.setDate(t.getDate() + 30); inp.value = t.toISOString().slice(0, 10);
    btn(dl, 'Commencer', () => { const dd = Math.round((new Date(inp.value + 'T12:00:00') - new Date()) / 864e5) + 1; if (!(dd >= 1)) { notify('Choisis une date dans le futur.'); return; } J.plan = { start: todayNum(), days: Math.min(2000, dd), q: 0 }; ctx.save(); again(); }, 'aa-btn-quiet');
    return;
  }
  if (p.finished) {
    h(box, 'div', null, '🎉 Plan terminé : tu as lu tout le Coran en ' + p.day + ' jour' + (p.day > 1 ? 's' : '') + ' !');
    btn(h(box, 'div', 'aa-actions'), 'Choisir un nouveau plan', () => { delete J.plan; ctx.save(); again(); }, 'mod-cta');
    return;
  }
  const pl = JUZ_PLANS.find(x => x[0] === p.days);
  h(box, 'div', 'aa-muted aa-small', (pl ? pl[1] : 'tout le Coran en ' + p.days + ' jours') + ' · jour ' + Math.min(p.day, p.days) + ' sur ' + p.days + ' · ' + Math.round(100 * p.q / 240) + ' % du Coran lu');
  const bar = h(box, 'div', 'aa-juz-plan-bar'); const f = h(bar, 'div', 'aa-juz-plan-fill'); f.style.width = (100 * p.q / 240) + '%'; const tg = h(bar, 'div', 'aa-juz-plan-target'); tg.style.left = (100 * Math.min(240, p.T) / 240) + '%';
  if (p.done) h(box, 'div', 'aa-ok', '✓ Ta part d\'aujourd\'hui est faite. À demain !');
  else {
    mdText(box, 'div', null, '**Aujourd\'hui :** ' + planLabel(ctx, p) + (p.late ? ' · en retard de ' + p.late + ' jour' + (p.late > 1 ? 's' : '') + ', pas grave : continue simplement.' : ''));
    const a = h(box, 'div', 'aa-actions');
    btn(a, '▶ Lire ma part du jour', () => ctx.openQuran(...p.from), 'mod-cta');
    btn(a, '✓ Je l\'ai lue', () => { const old = J.plan.q; J.plan.q = p.T; ctx.save(); again(); undoToast('Part du jour cochée.', () => { J.plan.q = old; ctx.save(); again(); }); }, 'aa-btn-quiet');
  }
  const m = h(box, 'div', 'aa-small'); const stop = h(m, 'a', 'aa-link aa-muted', 'Arrêter ce plan');
  stop.addEventListener('click', ev => { ev.preventDefault(); const old = J.plan; delete J.plan; ctx.save(); again(); undoToast('Plan arrêté.', () => { J.plan = old; ctx.save(); again(); }); });
}

/* mes jours de lecture du Coran (12 semaines) */
function renderReadCalendar(ctx, root) {
  const A = ctx.settings.activity || {}; const box = h(root, 'div', 'aa-juz-cal');
  h(box, 'b', null, '🗓️ Mes jours de lecture du Coran');
  const grid = h(box, 'div', 'aa-home-cal'); const t0 = todayNum(); const start = t0 - 77 - ((new Date().getDay() + 6) % 7);
  let n = 0;
  for (let d = start; d <= t0; d++) { const e = A[d]; const on = e && e.q; if (on) n++; const c = h(grid, 'span', 'aa-home-day' + (on ? ' aa-home-day-' + (on >= 20 ? 3 : on >= 5 ? 2 : 1) : '') + (d === t0 ? ' aa-home-today' : '')); c.title = on ? 'lu ce jour-là' : ''; }
  h(box, 'div', 'aa-muted aa-small', n ? n + ' jour' + (n > 1 ? 's' : '') + ' de lecture ces 12 dernières semaines.' : 'Chaque case = un jour. Elle se colore quand tu lis le Coran dans l\'atelier.');
}

/* écouter toute une partie : la récitation passe d'une sourate à l'autre */
function playJuz(ctx, j) {
  const segs = juzParts(ctx, j); let i = 0;
  const nextSeg = () => {
    if (i >= segs.length) { notify('Fin de la partie ' + j + '.'); return; }
    const sg = segs[i++]; const list = []; for (let v = sg.from; v <= sg.to; v++) list.push(v);
    ctx.openQuran(sg.s, sg.from);
    setTimeout(() => { playVerses(sg.s, list, v => { const el = document.querySelector('.aa-root [data-ref="' + sg.s + ':' + v + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, nextSeg); }, 500);
  };
  nextSeg();
}

/* repère discret à chaque quart de ḥizb : ۞ ¼ · ½ · ¾ */
let RUB_MAP = null;
function rubAt(s, v) { if (!RUB_MAP) { RUB_MAP = {}; RUB_START.forEach(([a, b], r) => { RUB_MAP[a + ':' + b] = r; }); } const r = RUB_MAP[s + ':' + v]; return r == null ? -1 : r; }
function rubMarker(container, r) {
  const q = r % 4, hz = Math.floor(r / 4) + 1, j = Math.floor(r / 8) + 1;
  const m = h(container, 'div', 'aa-rub-mark'); h(m, 'b', null, '۞');
  h(m, 'span', null, q === 0 ? 'Ḥizb ' + hz + ' · 2ᵉ moitié de la partie ' + j : ['', '¼', '½', '¾'][q] + ' du ḥizb ' + hz + ' (partie ' + j + ')');
  m.title = 'Un ḥizb = une demi-partie, coupé en 4 quarts. Repères traditionnels pour lire un peu chaque jour.';
  return m;
}

/* l'aide des raccourcis clavier (touche « ? ») */
const KEYS_HELP = [['?', 'montrer cette aide'], ['/', 'chercher (Accueil, Coran, Dictionnaire)'], ['1 à 6', 'aller aux grands onglets (Accueil, Coran, Apprendre…)'], ['← →', 'Coran : versets ou sourate suivants / précédents'], ['Espace', 'Coran : écouter, pause, reprendre'], ['Échap', 'fermer une fenêtre, ou revenir en arrière'], ['Alt + ←', 'revenir en arrière'], ['Espace puis 1 2 3 4', 'Cartes : voir la réponse, puis noter'], ['Z', 'Cartes : annuler la dernière réponse']];
function showKeysHelp(host) {
  host.querySelectorAll('.aa-keys-help').forEach(e => e.remove());
  const dlg = h(host, 'div', 'aa-imgdlg aa-keys-help'); const card = h(dlg, 'div', 'aa-imgdlg-card');
  const head = h(card, 'div', 'aa-imgdlg-head'); h(head, 'b', null, '⌨️ Raccourcis clavier'); btn(head, '✕', () => dlg.remove(), 'aa-btn-quiet');
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.remove(); });
  const t = h(card, 'table', 'aa-keys-tbl');
  KEYS_HELP.forEach(([k, d]) => { const r = h(t, 'tr'); const c = h(r, 'td'); k.split(' ').forEach(x => { if (/^(à|puis|\+)$/.test(x)) h(c, 'span', 'aa-muted', ' ' + x + ' '); else h(c, 'kbd', null, x); }); h(r, 'td', null, d); });
  h(card, 'p', 'aa-muted aa-small', 'Sur ordinateur seulement. Sur iPad et iPhone, glisse du doigt pour passer d\'un verset à l\'autre.');
}
