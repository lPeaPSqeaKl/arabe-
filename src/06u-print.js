/* ====================================================================
 * 06u - Imprimer une sourate : belle mise en page A4 ou A5, sur autant de
 * pages que nécessaire, exportée en PDF (une image par page) ou en PNG.
 * Tout est dessiné dans un canvas : même rendu sur ordi, iPad et iPhone.
 * ==================================================================== */
const PRINT_FORMATS = { a4: { name: 'A4', w: 210, h: 297 }, a5: { name: 'A5', w: 148, h: 210 } };
const PRINT_DPI = 200;
const PRINT_SIZES = { s: ['Petit', 0.8], m: ['Moyen', 1], l: ['Grand', 1.25] };
const mm2px = mm => Math.round(mm / 25.4 * PRINT_DPI);

/* prépare toutes les pages ; renvoie une liste de fonctions qui dessinent chaque page */
async function layoutSurah(ctx, opt) {
  const F = PRINT_FORMATS[opt.format] || PRINT_FORMATS.a5; const T = themeColors(ctx, opt.theme);
  const W = mm2px(F.w), H = mm2px(F.h); const M = mm2px(F.w > 160 ? 18 : 13); // marge
  const k = (F.w / 148) * (PRINT_SIZES[opt.size] || PRINT_SIZES.m)[1];
  const AR = '"Atelier Amiri Quran", serif', LAT = '"Inter", "Segoe UI", system-ui, sans-serif';
  try { await document.fonts.load('60px ' + AR, 'بسم'); } catch (e) { /* */ }
  const s = opt.surah; const d = await ctx.data.surah(s); const info = ctx.data.surahInfo(s);
  const from = Math.max(1, opt.from || 1), to = Math.min(d.v.length, opt.to || d.v.length);
  const meas = document.createElement('canvas').getContext('2d');
  const fsAr = Math.round(46 * k * PRINT_DPI / 200), lhAr = Math.round(fsAr * 2.05);
  const fsFr = Math.round(22 * k * PRINT_DPI / 200), lhFr = Math.round(fsFr * 1.45);
  const fsTr = Math.round(19 * k * PRINT_DPI / 200), lhTr = Math.round(fsTr * 1.4);
  const x0 = M + mm2px(T.deco ? 7 : 4), x1 = W - M - mm2px(T.deco ? 7 : 4); const maxW = x1 - x0;
  const top0 = M + mm2px(T.deco ? 11 : 9), bottom = H - M - mm2px(T.deco ? 12 : 10);
  /* la suite des « lignes » à poser : chacune sait sa hauteur et comment se dessiner */
  const items = [];
  const wrap = (words, font, dir, max) => { meas.font = font; meas.direction = dir; const out = []; let cur = []; let wcur = 0; const sp = meas.measureText(' ').width;
    words.forEach(w => { const ww = meas.measureText(w).width; if (cur.length && wcur + sp + ww > max) { out.push(cur); cur = []; wcur = 0; } wcur += (cur.length ? sp : 0) + ww; cur.push(w); }); if (cur.length) out.push(cur); return out; };
  // en-tête orné (première page seulement si on part du verset 1)
  if (from === 1) items.push({ h: mm2px(30), head: true });
  if (from === 1 && s !== 1 && s !== 9) items.push({ h: Math.round(lhAr * 1.15), basmala: true });
  const arLine = (words, justify) => ({ h: lhAr, ar: words, justify });
  if (opt.content === 'ar') {
    // texte continu, comme dans un mushaf
    const all = []; for (let v = from; v <= to; v++) { const ws = d.v[v - 1][2].map(wordText); ws[ws.length - 1] += ' ﴿' + arNum(v) + '﴾'; all.push(...ws); }
    const lines = wrap(all, fsAr + 'px ' + AR, 'rtl', maxW);
    lines.forEach((l, i) => items.push(arLine(l, i < lines.length - 1)));
  } else {
    for (let v = from; v <= to; v++) {
      const vv = d.v[v - 1]; const ws = vv[2].map(wordText); ws[ws.length - 1] += ' ﴿' + arNum(v) + '﴾';
      const lines = wrap(ws, fsAr + 'px ' + AR, 'rtl', maxW);
      const block = [];
      lines.forEach((l, i) => block.push(arLine(l, i < lines.length - 1)));
      if (opt.content === 'tr' || opt.content === 'at') wrap(translitTokens(vv[2], ctx.settings.style), 'italic ' + fsTr + 'px ' + LAT, 'ltr', maxW).forEach(l => block.push({ h: lhTr, tr: l.join(' ') }));
      if (opt.content !== 'at') wrap((v + '. ' + vv[0]).split(/\s+/), fsFr + 'px ' + LAT, 'ltr', maxW).forEach(l => block.push({ h: lhFr, fr: l.join(' ') }));
      block[0].keep = block.length; // on évite de couper un verset court entre deux pages
      block.push({ h: Math.round(lhFr * 0.8), gap: true });
      items.push(...block);
    }
  }
  // répartir en pages
  const pages = []; let cur = []; let y = top0;
  items.forEach((it, i) => {
    let need = it.h; if (it.keep && it.keep <= 6) for (let j = 1; j < it.keep; j++) need += items[i + j].h;
    if ((y + need > bottom && cur.length) || (it.gap && y + it.h > bottom)) { pages.push(cur); cur = []; y = top0; if (it.gap) return; }
    cur.push([it, y]); y += it.h;
  });
  if (cur.length) pages.push(cur);
  const draw = (c, pi) => {
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    if (T.bg2 !== T.bg) { const g = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.75); g.addColorStop(0, T.bg); g.addColorStop(1, T.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    // cadre
    const { star } = drawFrame(c, W, H, M, T, mm2px(1));
    // haut de page : nom de la sourate ; bas : numéro de page
    c.textAlign = 'center'; c.fillStyle = T.soft; c.direction = 'ltr'; c.font = Math.round(fsFr * 0.75) + 'px ' + LAT;
    if (pi > 0 || from !== 1) c.fillText(info[1] + ' · ' + s, W / 2, M + mm2px(T.deco ? 9 : 6));
    c.fillText(String(pi + 1) + ' / ' + pages.length, W / 2, H - M - mm2px(T.deco ? 7 : 4));
    pages[pi].forEach(([it, y]) => {
      if (it.head) {
        const bx = x0, bw = maxW, by = y + mm2px(3), bh = mm2px(17);
        c.save(); c.fillStyle = T.bg2 === T.bg ? '#faf6ec' : T.bg2; c.fillRect(bx, by, bw, bh); c.restore();
        c.strokeStyle = T.gold; c.lineWidth = mm2px(0.5); c.strokeRect(bx, by, bw, bh); c.lineWidth = mm2px(0.2); c.strokeRect(bx + mm2px(1.2), by + mm2px(1.2), bw - mm2px(2.4), bh - mm2px(2.4));
        const sr = mm2px(5); star(bx + mm2px(10), by + bh / 2, sr); star(bx + bw - mm2px(10), by + bh / 2, sr);
        c.fillStyle = T.bg; c.font = Math.round(sr * 0.9) + 'px ' + AR; c.direction = 'rtl';
        c.fillStyle = T.gold; c.fillText(arNum(s), bx + mm2px(10), by + bh / 2 + sr * 0.32); c.fillText(arNum(info[5]), bx + bw - mm2px(10), by + bh / 2 + sr * 0.32);
        c.fillStyle = T.ink; c.font = Math.round(fsAr * 1.05) + 'px ' + AR; c.fillText(info[3], W / 2, by + bh * 0.68);
        c.direction = 'ltr'; c.fillStyle = T.soft; c.font = Math.round(fsFr * 0.85) + 'px ' + LAT; c.fillText(info[1] + ' — ' + info[2] + ' · ' + info[5] + ' versets', W / 2, by + bh + mm2px(6.5));
        return;
      }
      if (it.basmala) { c.fillStyle = T.ink; c.direction = 'rtl'; c.font = fsAr + 'px ' + AR; c.fillText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', W / 2, y + lhAr * 0.72); return; }
      if (it.ar) {
        c.fillStyle = T.ink; c.font = fsAr + 'px ' + AR; c.direction = 'rtl'; c.textAlign = 'right';
        const ws = it.ar.map(w => c.measureText(w).width); const tot = ws.reduce((a, b) => a + b, 0);
        const sp0 = c.measureText(' ').width; const sp = it.justify && it.ar.length > 1 ? Math.min(sp0 * 4, (maxW - tot) / (it.ar.length - 1)) : sp0;
        let x = it.justify ? x1 : W / 2 + (tot + sp * (it.ar.length - 1)) / 2;
        it.ar.forEach((w, i) => { c.fillText(w, x, y + lhAr * 0.68); x -= ws[i] + sp; });
        c.textAlign = 'center'; return;
      }
      if (it.tr) { c.fillStyle = T.soft; c.direction = 'ltr'; c.textAlign = 'center'; c.font = 'italic ' + fsTr + 'px ' + LAT; c.fillText(it.tr, W / 2, y + lhTr * 0.75); c.textAlign = 'center'; return; }
      if (it.fr) { c.fillStyle = T.soft; c.direction = 'ltr'; c.textAlign = 'center'; c.font = fsFr + 'px ' + LAT; c.fillText(it.fr, W / 2, y + lhFr * 0.75); c.textAlign = 'center'; }
    });
    c.fillStyle = T.soft; c.globalAlpha = .5; c.font = Math.round(fsFr * 0.6) + 'px ' + LAT; c.direction = 'ltr'; c.fillText('Atelier arabe', W / 2, H - M + mm2px(5)); c.globalAlpha = 1;
  };
  return { W, H, F, n: pages.length, draw, info };
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

/* la fenêtre « Imprimer la sourate » */
async function openPrintDialog(ctx, surah, from, to) {
  document.querySelectorAll('.aa-imgdlg').forEach(e => e.remove());
  const host = document.querySelector('.aa-root') || document.body;
  const dlg = h(host, 'div', 'aa-imgdlg'); const card = h(dlg, 'div', 'aa-imgdlg-card aa-print-card');
  const head = h(card, 'div', 'aa-imgdlg-head'); h(head, 'b', null, '🖨 Imprimer ou exporter une sourate');
  btn(head, '✕', () => dlg.remove(), 'aa-btn-quiet');
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.remove(); });
  const P = ctx.settings.print || (ctx.settings.print = { format: 'a5', content: 'fr', theme: 'auto', size: 'm' });
  const opt = { surah, from: from || 1, to: to || 0, format: P.format, content: P.content, theme: P.theme, size: P.size };
  const form = h(card, 'div', 'aa-print-form');
  const nV = ctx.data.surahInfo(surah)[5];
  const save = () => { P.format = opt.format; P.content = opt.content; P.theme = opt.theme; P.size = opt.size; ctx.save(); };
  selectEl(field(form, 'Sourate'), surahSequence('mushaf').map(n => [n, n + '. ' + ctx.data.surahInfo(n)[1]]), surah, v => { dlg.remove(); openPrintDialog(ctx, +v); });
  const rng = field(form, 'Versets'); const rr = h(rng, 'div', 'aa-print-range');
  const vopts = []; for (let i = 1; i <= nV; i++) vopts.push([i, String(i)]);
  selectEl(rr, vopts, opt.from, v => { opt.from = +v; if (opt.to && opt.to < opt.from) opt.to = 0; paint(); }); h(rr, 'span', 'aa-muted', ' à '); selectEl(rr, [[0, 'la fin']].concat(vopts), opt.to, v => { opt.to = +v; paint(); });
  selectEl(field(form, 'Format'), [['a5', 'A5 (petit livret)'], ['a4', 'A4']], opt.format, v => { opt.format = v; save(); paint(); });
  selectEl(field(form, 'Contenu'), [['ar', 'Arabe seul (comme un mushaf)'], ['fr', 'Arabe + français'], ['at', 'Arabe + lecture'], ['tr', 'Arabe + lecture + français']], opt.content, v => { opt.content = v; save(); paint(); });
  selectEl(field(form, 'Couleurs'), themeOptions(ctx, true), OLD_THEMES[opt.theme] || opt.theme, v => { opt.theme = v; save(); paint(); });
  selectEl(field(form, 'Taille du texte'), Object.entries(PRINT_SIZES).map(([k, t]) => [k, t[0]]), opt.size, v => { opt.size = v; save(); paint(); });
  const info = h(card, 'div', 'aa-muted aa-small aa-print-info');
  const prev = h(card, 'div', 'aa-print-prev');
  const act = h(card, 'div', 'aa-actions aa-imgdlg-act');
  const status = h(card, 'div', 'aa-muted aa-small');
  let L = null; let tick = 0;
  const paint = async () => {
    const my = ++tick; clear(prev); h(prev, 'p', 'aa-muted', 'Mise en page…');
    L = await layoutSurah(ctx, opt); if (my !== tick) return;
    clear(prev); info.textContent = L.n + ' page' + (L.n > 1 ? 's' : '') + ' ' + L.F.name + ' · ' + ({ ar: 'arabe seul', at: 'arabe et lecture' }[opt.content] || 'avec la traduction');
    for (let i = 0; i < Math.min(L.n, 2); i++) { const cv = pageCanvas(L, i); cv.className = 'aa-print-page'; prev.appendChild(cv); }
    if (L.n > 2) h(prev, 'div', 'aa-muted aa-small aa-print-more', '+ ' + (L.n - 2) + ' autre' + (L.n > 3 ? 's' : '') + ' page' + (L.n > 3 ? 's' : ''));
  };
  const baseName = () => { const i = ctx.data.surahInfo(surah); return 'Sourate ' + pad3(surah) + ' ' + i[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[ʿʾ'’]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '') + (opt.from > 1 || opt.to ? ' v' + opt.from + '-' + (opt.to || i[5]) : '') + ' (' + L.F.name + ')'; };
  const busy = async (lab, fn) => { act.querySelectorAll('button').forEach(b => { b.disabled = true; }); status.textContent = lab; try { await fn(); } catch (e) { status.textContent = 'Erreur : ' + e.message; } act.querySelectorAll('button').forEach(b => { b.disabled = false; }); };
  btn(act, '📄 PDF dans mon coffre', () => busy('Création du PDF…', async () => {
    const pdf = await surahPdf(L, (i, n) => { status.textContent = 'Création du PDF… page ' + i + ' / ' + n; });
    const p = ctx.saveFile ? await ctx.saveFile('Atelier arabe/Exports', baseName() + '.pdf', pdf.buffer) : null;
    status.textContent = p ? 'PDF gardé : ' + p + '. Ouvre-le pour l\'imprimer ou le partager.' : '';
    if (p && ctx.openPath) { const b = btn(status, 'Ouvrir le PDF', () => ctx.openPath(p), 'aa-btn-quiet'); void b; }
  }), 'mod-cta');
  btn(act, '🖼 Pages en PNG', () => busy('Création des images…', async () => {
    const dir = 'Atelier arabe/Exports/' + baseName(); let last = null;
    for (let i = 0; i < L.n; i++) { const cv = pageCanvas(L, i); const png = await canvasBytes(cv, 'image/png'); cv.width = cv.height = 1; last = ctx.saveFile ? await ctx.saveFile(dir, 'page-' + String(i + 1).padStart(2, '0') + '.png', png.buffer) : null; status.textContent = 'Image ' + (i + 1) + ' / ' + L.n; }
    status.textContent = last ? L.n + ' image' + (L.n > 1 ? 's' : '') + ' gardée' + (L.n > 1 ? 's' : '') + ' dans « ' + dir + ' ».' : '';
  }), 'aa-btn-quiet');
  if (navigator.share && navigator.canShare) btn(act, '↗ Partager le PDF', () => busy('Création du PDF…', async () => {
    const pdf = await surahPdf(L, (i, n) => { status.textContent = 'Création du PDF… page ' + i + ' / ' + n; });
    const f = new File([pdf], baseName() + '.pdf', { type: 'application/pdf' });
    status.textContent = '';
    if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: baseName() }).catch(() => {}); else status.textContent = 'Partage impossible ici : garde le PDF dans le coffre.';
  }), 'aa-btn-quiet');
  await paint();
}
