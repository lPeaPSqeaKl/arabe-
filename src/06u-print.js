/* ====================================================================
 * 06u - Imprimer une ou plusieurs sourates : belle mise en page A4 ou A5,
 * sur autant de pages que nécessaire, exportée en PDF (une image par page)
 * ou en PNG. Options : couleurs de prononciation, mot à mot, lignes pour
 * recopier, marge de reliure, couverture + sommaire, livret plié.
 * Tout est dessiné dans un canvas : même rendu sur ordi, iPad et iPhone.
 * ==================================================================== */
const PRINT_FORMATS = { a4: { name: 'A4', w: 210, h: 297 }, a5: { name: 'A5', w: 148, h: 210 } };
const PRINT_DPI = 200;
const PRINT_SIZES = { s: ['Petit', 0.8], m: ['Moyen', 1], l: ['Grand', 1.25] };
const mm2px = mm => Math.round(mm / 25.4 * PRINT_DPI);
const PRINT_TJ = { light: { merge: '#8e5bd0', madd2: '#e07b00', madd: '#d0312d', ghunna: '#1f9a55', qalqala: '#2b74d9' }, dark: { merge: '#c09cf5', madd2: '#ffa94d', madd: '#ff7a6e', ghunna: '#5fd896', qalqala: '#7fb2ff' } };
const PRINT_TJ_LEGEND = [['madd2', 'allongé 2 temps'], ['madd', 'allongé 4 à 6 temps'], ['ghunna', 'par le nez'], ['qalqala', 'écho'], ['merge', 'se fond'], ['silent', 'muet']];
/* le titre arabe d'une partie : « جُزْءُ عَمَّ » */
const juzAr = j => 'جُزْءُ ' + JUZ_NAMES[j - 1][0];

/* prépare toutes les pages ; renvoie le nombre de pages et une fonction qui dessine chacune */
async function layoutSurah(ctx, opt) {
  const booklet = opt.format === 'livret';
  const F = PRINT_FORMATS[booklet ? 'a5' : opt.format] || PRINT_FORMATS.a5; const T = themeColors(ctx, opt.theme);
  const W = mm2px(F.w), H = mm2px(F.h); const M = mm2px(F.w > 160 ? 18 : 13); // marge
  const k = (F.w / 148) * (PRINT_SIZES[opt.size] || PRINT_SIZES.m)[1];
  const AR = '"Atelier Amiri Quran", serif', LAT = '"Inter", "Segoe UI", system-ui, sans-serif';
  try { await document.fonts.load('60px ' + AR, 'بسم'); } catch (e) { /* */ }
  const meas = document.createElement('canvas').getContext('2d');
  const fsAr = Math.round(46 * k * PRINT_DPI / 200), lhAr = Math.round(fsAr * 2.05);
  const fsFr = Math.round(22 * k * PRINT_DPI / 200), lhFr = Math.round(fsFr * 1.45);
  const fsTr = Math.round(19 * k * PRINT_DPI / 200), lhTr = Math.round(fsTr * 1.4);
  const x0 = M + mm2px(T.deco ? 7 : 4), x1 = W - M - mm2px(T.deco ? 7 : 4); const maxW = x1 - x0;
  const top0 = M + mm2px(T.deco ? 11 : 9), bottom = H - M - mm2px(T.deco ? 12 : 10);
  const TJC = PRINT_TJ[T.dark ? 'dark' : 'light'];
  const withTr = opt.content === 'tr' || opt.content === 'at', withFr = opt.content === 'tr' || opt.content === 'fr';
  const wbw = withTr && opt.wbw; const tajwid = !!opt.tajwid; const copy = !!opt.copy;
  const continuous = opt.content === 'ar' && !copy; // arabe seul en texte continu, comme un mushaf
  /* ce qu'on imprime : une suite de morceaux { s, from, to } */
  const juz = opt.juz || 0; let segs;
  if (juz) segs = juzParts(ctx, juz);
  else if (opt.surahTo > opt.surah) { segs = []; for (let s = opt.surah; s <= opt.surahTo; s++) segs.push({ s, from: 1, to: ctx.data.surahInfo(s)[5] }); }
  else { const n = ctx.data.surahInfo(opt.surah)[5]; segs = [{ s: opt.surah, from: Math.max(1, opt.from || 1), to: Math.min(n, opt.to || n) }]; }
  const s1 = segs[0].s, s2 = segs[segs.length - 1].s; const multi = segs.length > 1;
  const fontAr = fsAr + 'px ' + AR, fontTr = 'italic ' + fsTr + 'px ' + LAT;
  /* coupe une suite de « jetons » en lignes ; chaque jeton a sa largeur w */
  const wrapTok = (toks, gap, max) => { const out = []; let cur = []; let wcur = 0; toks.forEach(t => { if (cur.length && wcur + gap + t.w > max) { out.push(cur); cur = []; wcur = 0; } wcur += (cur.length ? gap : 0) + t.w; cur.push(t); }); if (cur.length) out.push(cur); return out; };
  const wrap = (words, font, dir, max) => { meas.font = font; meas.direction = dir; return wrapTok(words.map(t => ({ t, w: meas.measureText(t).width })), meas.measureText(' ').width, max).map(l => l.map(x => x.t)); };
  meas.font = fontAr; meas.direction = 'rtl'; const spAr = meas.measureText(' ').width;
  /* jetons arabes d'un verset (avec couleurs de prononciation et lecture mot à mot si demandé) */
  const verseTokens = (vv, v) => {
    const segs = tajwid ? tajwidVerse(vv[2]) : null; const trs = wbw ? translitTokens(vv[2], ctx.settings.style) : null;
    const toks = vv[2].map((w, i) => {
      const t = wordText(w); meas.font = fontAr; meas.direction = 'rtl'; const wa = meas.measureText(t).width;
      const tok = { t, segs: segs ? segs[i] : null, wa, w: wa };
      if (trs) { meas.font = fontTr; meas.direction = 'ltr'; tok.tr = trs[i]; tok.w = Math.max(wa, meas.measureText(trs[i]).width); }
      return tok;
    });
    const num = '﴿' + arNum(v) + '﴾'; meas.font = fontAr; meas.direction = 'rtl'; const wn = meas.measureText(num).width;
    if (wbw) toks.push({ t: num, wa: wn, w: wn, num: true });
    else { const last = toks[toks.length - 1]; last.tail = ' ' + num; last.w += spAr + wn; }
    return toks;
  };
  const items = [];
  const pushVerseLines = (lines, block, h) => lines.forEach((l, i) => block.push({ h, ar: l, justify: !wbw && i < lines.length - 1 }));
  /* légende des couleurs, une seule fois au début */
  if (tajwid) items.push({ h: Math.round(lhFr * 2.3), legend: true });
  for (const sg of segs) {
    const s = sg.s, from = sg.from, to = sg.to; const d = await ctx.data.surah(s);
    if (from === 1) {
      const head = { h: mm2px(30), head: s, mark: s }; items.push(head);
      if (s !== 1 && s !== 9) items.push({ h: Math.round(lhAr * 1.15), basmala: true });
    } else items.push({ h: multi || juz ? Math.round(lhFr * 1.6) : 0, cont: s, from, mark: s });
    const first = items.length;
    if (continuous) {
      const all = []; for (let v = from; v <= to; v++) all.push(...verseTokens(d.v[v - 1], v));
      const lines = wrapTok(all, spAr, maxW);
      pushVerseLines(lines, items, lhAr);
      items.push({ h: Math.round(lhFr * 0.8), gap: true });
    } else {
      for (let v = from; v <= to; v++) {
        const vv = d.v[v - 1]; const toks = verseTokens(vv, v);
        const lines = wrapTok(toks, wbw ? mm2px(3.2) : spAr, maxW);
        const block = [];
        pushVerseLines(lines, block, wbw ? Math.round(lhAr * 0.9 + lhTr * 1.25) : lhAr);
        if (withTr && !wbw) wrap(translitTokens(vv[2], ctx.settings.style), fontTr, 'ltr', maxW).forEach(l => block.push({ h: lhTr, tr: l.join(' ') }));
        if (withFr) wrap((v + '. ' + vv[0]).split(/\s+/), fsFr + 'px ' + LAT, 'ltr', maxW).forEach(l => block.push({ h: lhFr, fr: l.join(' ') }));
        if (copy) { block.push({ h: Math.round(lhFr * 0.3), gap: true }); for (let i = 0; i < Math.max(1, lines.length); i++) block.push({ h: Math.round(lhAr * 0.9), rule: true }); }
        block[0].keep = block.length; // on évite de couper un verset court entre deux pages
        block.push({ h: Math.round(lhFr * 0.8), gap: true });
        items.push(...block);
      }
    }
    // le titre ne reste jamais seul en bas de page : on le garde avec le début du texte
    if (from === 1) items[first - (s !== 1 && s !== 9 ? 2 : 1)].keep = (s !== 1 && s !== 9 ? 2 : 1) + Math.min(3, items.length - first);
    else if (items[first - 1].h) items[first - 1].keep = 1 + Math.min(3, items.length - first);
  }
  // répartir en pages
  const pages = []; let cur = []; let y = top0; let curS = s1; const pageS = []; const startPage = {};
  items.forEach((it, i) => {
    let need = it.h; if (it.keep && it.keep <= 8) for (let j = 1; j < it.keep && items[i + j]; j++) need += items[i + j].h;
    if ((y + need > bottom && cur.length) || (it.gap && y + it.h > bottom)) { pages.push(cur); pageS.push(curS); cur = []; y = top0; if (it.gap) return; }
    if (it.mark) { curS = it.mark; if (!(it.mark in startPage)) startPage[it.mark] = pages.length; }
    if (it.h) { cur.push([it, y]); y += it.h; }
  });
  if (cur.length) { pages.push(cur); pageS.push(curS); }
  /* couverture et sommaire */
  const front = []; // pages avant le texte : fonctions de dessin
  const cover = (multi || juz) && opt.cover !== false;
  const tocRows = segs.map(x => x.s);
  const tocLh = Math.round(fsFr * 1.75); const tocTop = top0 + mm2px(16); const perToc = Math.max(5, Math.floor((bottom - tocTop) / tocLh));
  const tocPages = cover && multi ? Math.ceil(tocRows.length / perToc) : 0;
  const offset = (cover ? 1 : 0) + tocPages; const total = offset + pages.length;
  const titleFr = juz ? juzTitle(juz) : multi ? 'Sourates ' + s1 + ' à ' + s2 : ctx.data.surahInfo(s1)[1];
  const titleAr = juz ? juzAr(juz) : multi ? ctx.data.surahInfo(s1)[3] + ' … ' + ctx.data.surahInfo(s2)[3] : ctx.data.surahInfo(s1)[3];
  const subtitle = juz ? 'Partie ' + juz + ' sur 30 du Coran · ' + juzSpan(ctx, juz) : (s2 - s1 + 1) + ' sourates';
  /* fond, cadre, marge de reliure */
  const background = (c, pn) => {
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    if (T.bg2 !== T.bg) { const g = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.75); g.addColorStop(0, T.bg); g.addColorStop(1, T.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    // marge de reliure : le côté du dos est plus large (dos à droite pour un livre arabe)
    if (opt.gutter) { const g = mm2px(4); const recto = pn % 2 === 0; const spineRight = (opt.dir !== 'ltr') === recto; c.translate(spineRight ? -g : g, 0); }
    return drawFrame(c, W, H, M, T, mm2px(1));
  };
  const footer = (c, pn) => {
    c.textAlign = 'center'; c.direction = 'ltr'; c.fillStyle = T.soft; c.font = Math.round(fsFr * 0.75) + 'px ' + LAT;
    c.fillText(String(pn + 1) + ' / ' + total, W / 2, H - M - mm2px(T.deco ? 7 : 4));
    c.globalAlpha = .5; c.font = Math.round(fsFr * 0.6) + 'px ' + LAT; c.fillText('Atelier arabe', W / 2, H - M + mm2px(5)); c.globalAlpha = 1;
  };
  if (cover) {
    front.push((c, pn) => {
      const { star } = background(c, pn); const cx = W / 2;
      c.textAlign = 'center'; c.direction = 'rtl'; c.fillStyle = T.gold;
      const r = mm2px(9); star(cx, H * 0.27, r);
      c.fillStyle = T.ink; c.font = Math.round(fsAr * 1.9) + 'px ' + AR; c.fillText(titleAr, cx, H * 0.45);
      c.direction = 'ltr'; c.font = '600 ' + Math.round(fsFr * 1.9) + 'px ' + LAT; c.fillText(titleFr, cx, H * 0.55);
      c.fillStyle = T.soft; c.font = Math.round(fsFr * 1.05) + 'px ' + LAT;
      c.fillText(subtitle, cx, H * 0.6);
      const what = { ar: 'texte arabe', fr: 'arabe et traduction française', at: wbw ? 'arabe et lecture mot à mot' : 'arabe et lecture', tr: (wbw ? 'arabe, lecture mot à mot' : 'arabe, lecture') + ' et traduction' }[opt.content] + (tajwid ? ' · couleurs de prononciation' : '');
      c.fillText(what, cx, H * 0.635);
      c.strokeStyle = T.gold; c.lineWidth = mm2px(0.3); c.beginPath(); c.moveTo(cx - mm2px(22), H * 0.5); c.lineTo(cx + mm2px(22), H * 0.5); c.stroke();
      c.globalAlpha = .6; c.font = Math.round(fsFr * 0.8) + 'px ' + LAT; c.fillText('Atelier arabe', cx, H - M - mm2px(T.deco ? 9 : 6)); c.globalAlpha = 1;
    });
    for (let tp = 0; tp < tocPages; tp++) front.push((c, pn) => {
      background(c, pn);
      c.textAlign = 'center'; c.direction = 'ltr'; c.fillStyle = T.ink; c.font = '600 ' + Math.round(fsFr * 1.3) + 'px ' + LAT;
      c.fillText(tp ? 'Sommaire (suite)' : 'Sommaire', W / 2, top0 + mm2px(6));
      tocRows.slice(tp * perToc, (tp + 1) * perToc).forEach((s, i) => {
        const info = ctx.data.surahInfo(s); const y = tocTop + i * tocLh + tocLh * 0.7;
        c.direction = 'ltr'; c.textAlign = 'left'; c.fillStyle = T.soft; c.font = Math.round(fsFr * 0.9) + 'px ' + LAT; c.fillText(String(s), x0, y);
        c.fillStyle = T.ink; c.font = fsFr + 'px ' + LAT; const nx = x0 + mm2px(9); const sg = segs[tp * perToc + i]; const lab = info[1] + (sg.from > 1 || sg.to < info[5] ? ' (v. ' + sg.from + '–' + sg.to + ')' : ''); c.fillText(lab, nx, y); const nw = c.measureText(lab).width;
        c.textAlign = 'right'; c.fillStyle = T.gold; c.font = '600 ' + fsFr + 'px ' + LAT; const pg = String(offset + (startPage[s] || 0) + 1); c.fillText(pg, x1, y); const pw = c.measureText(pg).width;
        c.direction = 'rtl'; c.fillStyle = T.soft; c.font = Math.round(fsFr * 1.25) + 'px ' + AR; const aw = c.measureText(info[3]).width; const ax = x1 - pw - mm2px(5); c.fillText(info[3], ax, y);
        // pointillés entre le nom et le numéro
        c.fillStyle = T.soft; c.globalAlpha = .45; for (let x = nx + nw + mm2px(3); x < ax - aw - mm2px(3); x += mm2px(2)) { c.beginPath(); c.arc(x, y - mm2px(0.6), mm2px(0.25), 0, 7); c.fill(); } c.globalAlpha = 1;
      });
      footer(c, pn);
    });
  }
  /* un mot arabe, avec ses couleurs de prononciation : on dessine le mot entier, puis on repeint chaque morceau coloré (découpé par largeur) */
  const drawWord = (c, tok, xr, yb) => {
    c.font = fontAr; c.direction = 'rtl'; c.textAlign = 'right'; c.fillStyle = T.ink; c.fillText(tok.t + (tok.tail || ''), xr, yb);
    if (!tok.segs) return;
    const ZWJ = '‍'; let pre = '';
    tok.segs.forEach((sg, i) => {
      const a = pre ? c.measureText(pre + ZWJ).width : 0; pre += sg.t; const b = c.measureText(pre + (i < tok.segs.length - 1 ? ZWJ : '')).width;
      if (!sg.cls) return;
      c.save(); c.beginPath(); c.rect(xr - b - 1, yb - lhAr, b - a + 2, lhAr * 1.4); c.clip();
      if (sg.cls === 'silent') { c.fillStyle = T.bg; c.fillText(tok.t, xr, yb); c.globalAlpha = .4; c.fillStyle = T.soft; } else c.fillStyle = TJC[sg.cls] || T.ink;
      c.fillText(tok.t, xr, yb); c.restore();
    });
  };
  const draw = (c, pn) => {
    if (pn < offset) { front[pn](c, pn); return; }
    const pi = pn - offset;
    const { star } = background(c, pn);
    // haut de page : nom de la sourate ; bas : numéro de page
    const sNow = pageS[pi]; const infoNow = ctx.data.surahInfo(sNow);
    c.textAlign = 'center'; c.fillStyle = T.soft; c.direction = 'ltr'; c.font = Math.round(fsFr * 0.75) + 'px ' + LAT;
    if (!pages[pi].some(([it]) => it.head)) c.fillText(infoNow[1] + ' · ' + sNow, W / 2, M + mm2px(T.deco ? 9 : 6));
    footer(c, pn);
    pages[pi].forEach(([it, y]) => {
      if (it.head) {
        const s = it.head; const info = ctx.data.surahInfo(s);
        const bx = x0, bw = maxW, by = y + mm2px(3), bh = mm2px(17);
        c.save(); c.fillStyle = T.bg2 === T.bg ? '#faf6ec' : T.bg2; c.fillRect(bx, by, bw, bh); c.restore();
        c.strokeStyle = T.gold; c.lineWidth = mm2px(0.5); c.strokeRect(bx, by, bw, bh); c.lineWidth = mm2px(0.2); c.strokeRect(bx + mm2px(1.2), by + mm2px(1.2), bw - mm2px(2.4), bh - mm2px(2.4));
        const sr = mm2px(5); star(bx + mm2px(10), by + bh / 2, sr); star(bx + bw - mm2px(10), by + bh / 2, sr);
        c.textAlign = 'center'; c.font = Math.round(sr * 0.9) + 'px ' + AR; c.direction = 'rtl';
        c.fillStyle = T.gold; c.fillText(arNum(s), bx + mm2px(10), by + bh / 2 + sr * 0.32); c.fillText(arNum(info[5]), bx + bw - mm2px(10), by + bh / 2 + sr * 0.32);
        c.fillStyle = T.ink; c.font = Math.round(fsAr * 1.05) + 'px ' + AR; c.fillText(info[3], W / 2, by + bh * 0.68);
        c.direction = 'ltr'; c.fillStyle = T.soft; c.font = Math.round(fsFr * 0.85) + 'px ' + LAT; c.fillText(info[1] + ' — ' + info[2] + ' · ' + info[5] + ' versets', W / 2, by + bh + mm2px(6.5));
        return;
      }
      if (it.legend) {
        c.font = Math.round(fsFr * 0.8) + 'px ' + LAT; c.direction = 'ltr'; c.textAlign = 'left';
        const parts = PRINT_TJ_LEGEND.map(([k2, lab]) => ({ k2, lab, w: mm2px(4) + c.measureText(lab).width + mm2px(4) }));
        const lines = wrapTok(parts, 0, maxW); const lh = fsFr * 1.25; const y0 = y + (it.h - lh * lines.length) / 2 - fsFr * 0.25;
        lines.forEach((l, li) => {
          let x = W / 2 - l.reduce((a, p) => a + p.w, 0) / 2; const yy = y0 + lh * (li + 1);
          l.forEach(p => { c.fillStyle = p.k2 === 'silent' ? T.soft : TJC[p.k2]; if (p.k2 === 'silent') c.globalAlpha = .5; c.beginPath(); c.arc(x + mm2px(1.3), yy - mm2px(1.1), mm2px(1.3), 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = T.soft; c.fillText(p.lab, x + mm2px(3.4), yy); x += p.w; });
        });
        c.textAlign = 'center'; return;
      }
      if (it.cont) { c.textAlign = 'center'; c.direction = 'ltr'; c.fillStyle = T.gold; c.font = '600 ' + Math.round(fsFr * 0.9) + 'px ' + LAT; c.fillText('✦ ' + ctx.data.surahInfo(it.cont)[1] + ' · à partir du verset ' + it.from + ' ✦', W / 2, y + it.h * 0.6); return; }
      if (it.basmala) { c.textAlign = 'center'; c.fillStyle = T.ink; c.direction = 'rtl'; c.font = fontAr; c.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', W / 2, y + lhAr * 0.72); return; }
      if (it.ar) {
        const toks = it.ar; const gap0 = wbw ? mm2px(3.2) : spAr;
        const tot = toks.reduce((a, t) => a + t.w, 0);
        const gap = it.justify && toks.length > 1 ? Math.min(gap0 * 4, (maxW - tot) / (toks.length - 1)) : gap0;
        let x = it.justify ? x1 : W / 2 + (tot + gap * (toks.length - 1)) / 2;
        toks.forEach(t => {
          if (wbw) {
            const cx = x - t.w / 2;
            drawWord(c, t, cx + t.wa / 2, y + lhAr * 0.6);
            if (t.tr) { c.font = fontTr; c.direction = 'ltr'; c.textAlign = 'center'; c.fillStyle = T.soft; c.fillText(t.tr, cx, y + lhAr * 0.9 + lhTr * 0.55); }
          } else drawWord(c, t, x, y + lhAr * 0.68);
          x -= t.w + gap;
        });
        c.textAlign = 'center'; return;
      }
      if (it.rule) { c.strokeStyle = T.soft; c.globalAlpha = .35; c.lineWidth = Math.max(1, mm2px(0.15)); c.beginPath(); c.moveTo(x0, y + it.h * 0.78); c.lineTo(x1, y + it.h * 0.78); c.stroke(); c.globalAlpha = 1; return; }
      if (it.tr) { c.fillStyle = T.soft; c.direction = 'ltr'; c.textAlign = 'center'; c.font = fontTr; c.fillText(it.tr, W / 2, y + lhTr * 0.75); return; }
      if (it.fr) { c.fillStyle = T.soft; c.direction = 'ltr'; c.textAlign = 'center'; c.font = fsFr + 'px ' + LAT; c.fillText(it.fr, W / 2, y + lhFr * 0.75); }
    });
  };
  const drawPage = (c, pn) => { c.save(); draw(c, pn); c.restore(); };
  const L = { W, H, F, n: total, draw: drawPage, title: titleFr, booklet, multi };
  /* livret : les pages A5 sont rangées deux par deux sur des feuilles A4 couchées, dans l'ordre qui permet de plier */
  if (booklet) {
    const N = Math.ceil(total / 4) * 4; const blank = (c) => { c.fillStyle = T.bg; c.fillRect(0, 0, W, H); };
    const pg = (c, p) => { if (p < total) drawPage(c, p); else blank(c); };
    const sides = [];
    for (let s = 0; s < N / 4; s++) {
      const fr = opt.dir === 'ltr' ? [N - 1 - 2 * s, 2 * s] : [2 * s, N - 1 - 2 * s];
      const bk = opt.dir === 'ltr' ? [2 * s + 1, N - 2 - 2 * s] : [N - 2 - 2 * s, 2 * s + 1];
      sides.push(fr, bk);
    }
    L.sheet = { W: 2 * W, H, F: { name: 'A4', w: 297, h: 210 }, n: sides.length, sheets: N / 4,
      draw: (c, i) => { const [a, b] = sides[i]; c.save(); pg(c, a); c.restore(); c.save(); c.translate(W, 0); c.beginPath(); c.rect(0, 0, W, H); c.clip(); pg(c, b); c.restore(); c.save(); c.strokeStyle = T.soft; c.globalAlpha = .25; c.setLineDash([mm2px(1.5), mm2px(1.5)]); c.beginPath(); c.moveTo(W, 0); c.lineTo(W, mm2px(6)); c.moveTo(W, H - mm2px(6)); c.lineTo(W, H); c.stroke(); c.restore(); } };
  }
  return L;
}
function pageCanvas(L, i) { const cv = document.createElement('canvas'); cv.width = L.W; cv.height = L.H; L.draw(cv.getContext('2d'), i); return cv; }
function canvasBytes(cv, type, q) { return new Promise(res => cv.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), type, q)); }

/* un PDF très simple : chaque page = une image JPEG pleine page */
async function surahPdf(L, progress) {
  const enc = new TextEncoder(); const parts = []; let len = 0; const offs = [];
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const pw = (L.F.w / 25.4 * 72).toFixed(2), ph = (L.F.h / 25.4 * 72).toFixed(2);
  const n = L.n; const obj = i => { offs[i] = len; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1); push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n');
  const kids = []; for (let i = 0; i < n; i++) kids.push((3 + 3 * i) + ' 0 R');
  obj(2); push('2 0 obj << /Type /Pages /Count ' + n + ' /Kids [' + kids.join(' ') + '] >> endobj\n');
  for (let i = 0; i < n; i++) {
    const cv = pageCanvas(L, i); const jpg = await canvasBytes(cv, 'image/jpeg', 0.9); cv.width = cv.height = 1;
    const p = 3 + 3 * i, im = p + 1, ct = p + 2;
    obj(p); push(p + ' 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im' + i + ' ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >> endobj\n');
    obj(im); push(im + ' 0 obj << /Type /XObject /Subtype /Image /Width ' + L.W + ' /Height ' + L.H + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); push(jpg); push('\nendstream endobj\n');
    const cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im' + i + ' Do Q';
    obj(ct); push(ct + ' 0 obj << /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream endobj\n');
    if (progress) progress(i + 1, n);
  }
  const total = 3 + 3 * n; const xref = len;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n'; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  push(x + 'trailer << /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
  const out = new Uint8Array(len); let o = 0; parts.forEach(b => { out.set(b, o); o += b.length; }); return out;
}

/* la fenêtre « Imprimer » ; here = { from, to } : les versets affichés à l'écran */
async function openPrintDialog(ctx, surah, here) {
  document.querySelectorAll('.aa-imgdlg').forEach(e => e.remove());
  const host = document.querySelector('.aa-root') || document.body;
  const dlg = h(host, 'div', 'aa-imgdlg'); const card = h(dlg, 'div', 'aa-imgdlg-card aa-print-card');
  const head = h(card, 'div', 'aa-imgdlg-head'); h(head, 'b', null, '🖨 Imprimer ou exporter');
  btn(head, '✕', () => dlg.remove(), 'aa-btn-quiet');
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.remove(); });
  const P = ctx.settings.print || (ctx.settings.print = {});
  const D = { format: 'a5', content: 'fr', theme: 'auto', size: 'm', tajwid: false, wbw: false, copy: false, gutter: false, dir: 'rtl', cover: true };
  Object.keys(D).forEach(k2 => { if (P[k2] === undefined) P[k2] = D[k2]; });
  const opt = { surah, surahTo: 0, from: 1, to: 0, juz: here && here.juz || 0 }; Object.keys(D).forEach(k2 => { opt[k2] = P[k2]; });
  const KEEP = Object.keys(D); const save = () => { KEEP.forEach(k2 => { P[k2] = opt[k2]; }); ctx.save(); };
  const form = h(card, 'div', 'aa-print-form');
  const nOf = s => ctx.data.surahInfo(s)[5];
  /* raccourcis */
  const quick = h(form, 'div', 'aa-print-quick');
  const sOpts = surahSequence('mushaf').map(n => [n, n + '. ' + ctx.data.surahInfo(n)[1]]);
  let rangeBox;
  const pick = (a, b, f, t) => { opt.juz = 0; opt.surah = a; opt.surahTo = b || 0; opt.from = f || 1; opt.to = t || 0; buildRange(); paint(); };
  const pickJuz = j => { opt.juz = j; buildRange(); paint(); };
  btn(quick, '📖 Toute la sourate', () => pick(surah), 'aa-btn-quiet');
  if (here && (here.from > 1 || here.to < nOf(surah))) btn(quick, '👁 Ce que je lis (versets ' + here.from + ' à ' + here.to + ')', () => pick(surah, 0, here.from, here.to), 'aa-btn-quiet');
  btn(quick, '📚 Juz\' ʿAmma : les sourates courtes', () => pickJuz(30), 'aa-btn-quiet').title = 'La 30ᵉ et dernière partie du Coran : sourates 78 à 114';
  btn(quick, '📚 Une des 30 parties…', () => pickJuz(opt.juz || juzOf(surah, here && here.from || 1)), 'aa-btn-quiet').title = 'Le Coran est découpé en 30 parties de même longueur (juz\')';
  rangeBox = h(form, 'div', 'aa-print-rangebox');
  const buildRange = () => {
    clear(rangeBox);
    if (opt.juz) {
      selectEl(field(rangeBox, 'Partie du Coran (juz\')'), JUZ_NAMES.map((x, i) => [i + 1, (i + 1) + '. ' + x[1]]), opt.juz, v => { opt.juz = +v; buildRange(); paint(); });
      h(field(rangeBox, 'Contient'), 'div', 'aa-print-juzspan', juzSpan(ctx, opt.juz) + ' · ' + juzVerses(ctx, opt.juz) + ' versets');
      checkbox(h(rangeBox, 'div', 'aa-print-cover'), '📕 Couverture et sommaire au début', opt.cover, v => { opt.cover = v; save(); paint(); });
      return;
    }
    const a = field(rangeBox, 'Sourate'); selectEl(a, sOpts, opt.surah, v => { opt.surah = +v; if (opt.surahTo && opt.surahTo <= opt.surah) opt.surahTo = 0; opt.from = 1; opt.to = 0; buildRange(); paint(); });
    selectEl(field(rangeBox, 'Jusqu\'à'), [[0, 'cette sourate seulement']].concat(sOpts.filter(([n]) => n > opt.surah)), opt.surahTo, v => { opt.surahTo = +v; opt.from = 1; opt.to = 0; buildRange(); paint(); });
    if (opt.surahTo) { checkbox(h(rangeBox, 'div', 'aa-print-cover'), '📕 Couverture et sommaire au début', opt.cover, v => { opt.cover = v; save(); paint(); }); return; }
    const nV = nOf(opt.surah); const rr = h(field(rangeBox, 'Versets'), 'div', 'aa-print-range');
    const vopts = []; for (let i = 1; i <= nV; i++) vopts.push([i, String(i)]);
    selectEl(rr, vopts, opt.from, v => { opt.from = +v; if (opt.to && opt.to < opt.from) opt.to = 0; paint(); }); h(rr, 'span', 'aa-muted', ' à '); selectEl(rr, [[0, 'la fin']].concat(vopts), opt.to, v => { opt.to = +v; paint(); });
  };
  buildRange();
  selectEl(field(form, 'Format'), [['a5', 'A5 (petit livre)'], ['a4', 'A4'], ['livret', 'Livret plié : pages A5 imprimées sur A4']], opt.format, v => { opt.format = v; save(); refreshOpts(); paint(); });
  selectEl(field(form, 'Contenu'), [['ar', 'Arabe seul (comme un mushaf)'], ['fr', 'Arabe + français'], ['at', 'Arabe + lecture'], ['tr', 'Arabe + lecture + français']], opt.content, v => { opt.content = v; save(); refreshOpts(); paint(); });
  selectEl(field(form, 'Couleurs'), themeOptions(ctx, true), OLD_THEMES[opt.theme] || opt.theme, v => { opt.theme = v; save(); paint(); });
  selectEl(field(form, 'Taille du texte'), Object.entries(PRINT_SIZES).map(([k2, t]) => [k2, t[0]]), opt.size, v => { opt.size = v; save(); paint(); });
  const more = h(form, 'div', 'aa-print-more-opts');
  const refreshOpts = () => {
    clear(more);
    checkbox(more, '🎨 Couleurs de prononciation (tajwīd)', opt.tajwid, v => { opt.tajwid = v; save(); paint(); });
    if (opt.content === 'at' || opt.content === 'tr') checkbox(more, '🔤 Lecture sous chaque mot (mot à mot)', opt.wbw, v => { opt.wbw = v; save(); paint(); });
    checkbox(more, '✍️ Lignes vides pour recopier chaque verset', opt.copy, v => { opt.copy = v; save(); paint(); });
    if (opt.format !== 'livret') checkbox(more, '📎 Marge plus large côté reliure', opt.gutter, v => { opt.gutter = v; save(); refreshOpts(); paint(); });
    if (opt.format === 'livret' || opt.gutter) selectEl(field(more, 'Sens du livre'), [['rtl', 'comme un livre arabe (on tourne vers la gauche)'], ['ltr', 'comme un livre français']], opt.dir, v => { opt.dir = v; save(); paint(); });
  };
  refreshOpts();
  const info = h(card, 'div', 'aa-muted aa-small aa-print-info');
  const prev = h(card, 'div', 'aa-print-prev');
  const act = h(card, 'div', 'aa-actions aa-imgdlg-act');
  const status = h(card, 'div', 'aa-muted aa-small');
  let L = null; let tick = 0;
  const out = () => L.sheet || L; // ce qu'on exporte : les pages, ou les feuilles du livret
  const paint = async () => {
    const my = ++tick; clear(prev); h(prev, 'p', 'aa-muted', 'Mise en page…');
    const nl = await layoutSurah(ctx, opt); if (my !== tick) return; L = nl;
    clear(prev);
    const what = ({ ar: 'arabe seul', at: 'arabe et lecture', fr: 'avec la traduction', tr: 'avec lecture et traduction' })[opt.content];
    info.textContent = L.n + ' page' + (L.n > 1 ? 's' : '') + ' A5'.replace('A5', L.F.name) + ' · ' + what + (L.booklet ? ' → ' + L.sheet.sheets + ' feuille' + (L.sheet.sheets > 1 ? 's' : '') + ' A4 recto verso' : '');
    if (L.booklet) mdText(prev, 'p', 'aa-small aa-print-howto', '**Comment faire le livret :** imprime le PDF en **recto verso, retourner sur le bord court**, à 100 % (sans « ajuster »). Pose les feuilles l\'une sur l\'autre dans l\'ordre, plie-les ensemble en deux et agrafe au milieu.');
    const O = out();
    for (let i = 0; i < Math.min(O.n, 2); i++) { const cv = pageCanvas(O, i); cv.className = 'aa-print-page' + (L.booklet ? ' aa-print-sheet' : ''); prev.appendChild(cv); }
    if (O.n > 2) h(prev, 'div', 'aa-muted aa-small aa-print-more', '+ ' + (O.n - 2) + ' autre' + (O.n > 3 ? 's' : '') + (L.booklet ? ' face' : ' page') + (O.n > 3 ? 's' : ''));
  };
  const clean = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʿʾ'’]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  const baseName = () => {
    const i = ctx.data.surahInfo(opt.surah);
    const name = opt.juz ? 'Partie ' + String(opt.juz).padStart(2, '0') + ' ' + clean(juzTitle(opt.juz)) : opt.surahTo ? 'Sourates ' + opt.surah + '-' + opt.surahTo : 'Sourate ' + pad3(opt.surah) + ' ' + clean(i[1]) + (opt.from > 1 || opt.to ? ' v' + opt.from + '-' + (opt.to || i[5]) : '');
    return name + ' (' + (L.booklet ? 'livret A5' : L.F.name) + ')';
  };
  const busy = async (lab, fn) => { act.querySelectorAll('button').forEach(b => { b.disabled = true; }); status.textContent = lab; try { await fn(); } catch (e) { status.textContent = 'Erreur : ' + e.message; } act.querySelectorAll('button').forEach(b => { b.disabled = false; }); };
  btn(act, '📄 PDF dans mon coffre', () => busy('Création du PDF…', async () => {
    const pdf = await surahPdf(out(), (i, n) => { status.textContent = 'Création du PDF… page ' + i + ' / ' + n; });
    const p = ctx.saveFile ? await ctx.saveFile('Atelier arabe/Exports', baseName() + '.pdf', pdf.buffer) : null;
    status.textContent = p ? 'PDF gardé : ' + p + '. Ouvre-le pour l\'imprimer ou le partager.' : '';
    if (p && ctx.openPath) btn(status, 'Ouvrir le PDF', () => ctx.openPath(p), 'aa-btn-quiet');
  }), 'mod-cta');
  btn(act, '🖼 Pages en PNG', () => busy('Création des images…', async () => {
    const O = out(); const dir = 'Atelier arabe/Exports/' + baseName(); let last = null;
    for (let i = 0; i < O.n; i++) { const cv = pageCanvas(O, i); const png = await canvasBytes(cv, 'image/png'); cv.width = cv.height = 1; last = ctx.saveFile ? await ctx.saveFile(dir, (L.booklet ? 'feuille-' + String((i >> 1) + 1).padStart(2, '0') + (i % 2 ? '-verso' : '-recto') : 'page-' + String(i + 1).padStart(2, '0')) + '.png', png.buffer) : null; status.textContent = 'Image ' + (i + 1) + ' / ' + O.n; }
    status.textContent = last ? O.n + ' image' + (O.n > 1 ? 's' : '') + ' gardée' + (O.n > 1 ? 's' : '') + ' dans « ' + dir + ' ».' : '';
  }), 'aa-btn-quiet');
  if (navigator.share && navigator.canShare) btn(act, '↗ Partager le PDF', () => busy('Création du PDF…', async () => {
    const pdf = await surahPdf(out(), (i, n) => { status.textContent = 'Création du PDF… page ' + i + ' / ' + n; });
    const f = new File([pdf], baseName() + '.pdf', { type: 'application/pdf' });
    status.textContent = '';
    if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: baseName() }).catch(() => {}); else status.textContent = 'Partage impossible ici : garde le PDF dans le coffre.';
  }), 'aa-btn-quiet');
  await paint();
}
