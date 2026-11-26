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
    h(card, 'div', 'aa-muted aa-small', juzVerses(ctx, j) + ' versets' + (j === here ? ' · 📍 tu lis ici' : '') + (J.read[j] ? ' · ✓ lue' : ''));
    const a = h(card, 'div', 'aa-juz-act');
    btn(a, 'Lire', () => ctx.openQuran(...JUZ_START[j - 1]), J.read[j] ? 'aa-btn-quiet' : '');
    btn(a, '🖨', () => openPrintDialog(ctx, JUZ_START[j - 1][0], { juz: j }), 'aa-btn-quiet').title = 'Imprimer cette partie (PDF ou images)';
    btn(a, J.read[j] ? '↺' : '✓ Lue', () => { juzMarkRead(ctx, j, !J.read[j]); renderJuz(ctx, root, state, back); const el = root.querySelector('[data-juz="' + j + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }, 'aa-btn-quiet').title = J.read[j] ? 'Enlever la coche' : 'J\'ai fini de lire cette partie';
  }
}
