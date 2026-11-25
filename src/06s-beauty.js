/* ====================================================================
 * 06s - Beauté : en-tête de sourate orné, verset du jour, image d'un verset
 * ==================================================================== */
/* étoile à 8 branches (deux carrés), en SVG, avec un texte au centre */
function starBadge(parent, text, cls) {
  const NS = 'http://www.w3.org/2000/svg';
  const w = h(parent, 'span', 'aa-star' + (cls ? ' ' + cls : ''));
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
  [0, 45].forEach(r => { const q = document.createElementNS(NS, 'rect'); q.setAttribute('x', '18'); q.setAttribute('y', '18'); q.setAttribute('width', '64'); q.setAttribute('height', '64'); q.setAttribute('transform', 'rotate(' + r + ' 50 50)'); svg.appendChild(q); });
  const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', '27'); svg.appendChild(c);
  w.appendChild(svg);
  const t = h(w, 'span', 'aa-star-t', text); t.setAttribute('dir', 'rtl');
  return w;
}
/* l'en-tête orné d'une sourate (comme dans un mushaf) */
function surahHeader(container, info, n) {
  const t = h(container, 'div', 'aa-sh');
  const band = h(t, 'div', 'aa-sh-band');
  starBadge(band, arNum(n), 'aa-sh-num').title = 'Sourate ' + n;
  const name = h(band, 'div', 'aa-sh-name'); name.setAttribute('dir', 'rtl'); name.setAttribute('lang', 'ar');
  name.textContent = info[3];
  starBadge(band, arNum(info[5]), 'aa-sh-num').title = info[5] + ' versets';
  h(t, 'div', 'aa-sh-sub', info[1] + ' — ' + info[2]);
  return t;
}

/* --- le verset du jour : des versets connus et pas trop longs, un par jour --- */
const VERSE_OF_DAY = ['94:5', '13:28', '39:53', '65:3', '20:114', '49:13', '2:152', '2:186', '3:139', '29:69', '93:5', '3:8', '2:201', '17:24', '55:13', '112:1', '21:87', '40:60', '8:46', '16:97', '3:159', '28:24', '14:7', '33:41', '50:16', '6:162', '2:45', '2:153', '9:51', '93:3', '67:2', '4:28', '25:63', '31:18', '3:190', '1:5'];
function verseOfDayRef(day) { const r = VERSE_OF_DAY[((day % VERSE_OF_DAY.length) + VERSE_OF_DAY.length) % VERSE_OF_DAY.length]; return r.split(':').map(Number); }
async function renderVerseOfDay(ctx, root) {
  const [s, v] = verseOfDayRef(todayNum());
  const box = h(root, 'div', 'aa-vod');
  const top = h(box, 'div', 'aa-vod-top'); h(top, 'span', 'aa-vod-k', '✦ Le verset du jour');
  const d = await ctx.data.surah(s); const vv = d.v[v - 1]; if (!vv) { box.remove(); return; }
  const info = ctx.data.surahInfo(s);
  const ar = h(box, 'div', 'aa-vod-ar'); ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar');
  ar.textContent = vv[2].map(wordText).join(' ') + ' ﴿' + arNum(v) + '﴾';
  h(box, 'div', 'aa-vod-fr', '« ' + vv[0] + ' »');
  h(box, 'div', 'aa-muted aa-small aa-vod-ref', info[1] + ' (' + info[2] + ') · ' + s + ':' + v);
  const a = h(box, 'div', 'aa-actions aa-vod-act');
  if (ctx.settings.audio !== false) btn(a, '▶ Écouter', () => playVerse(s, v), 'aa-btn-quiet');
  btn(a, '📖 Lire autour', () => ctx.openQuran(s, v), 'aa-btn-quiet');
  btn(a, '🖼 Image', () => openVerseImage(ctx, s, v), 'aa-btn-quiet');
}

/* --- l'image d'un verset, à garder ou à partager --- */
function wrapLines(c, words, maxW) {
  const lines = []; let cur = '';
  words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  return lines;
}
const IMG_THEMES = {
  creme: { bg: '#f7f1e3', bg2: '#efe4cc', ink: '#2b2418', soft: '#6d5f48', gold: '#a8823e', name: 'Crème' },
  nuit: { bg: '#15181d', bg2: '#1f242b', ink: '#efe8d8', soft: '#b7ad98', gold: '#c9a45c', name: 'Nuit' },
  vert: { bg: '#123b33', bg2: '#0e2f29', ink: '#f3ecd9', soft: '#c8d6c9', gold: '#d4b46a', name: 'Émeraude' },
};
async function drawVerseImage(ctx, s, v, theme) {
  const T = IMG_THEMES[theme] || IMG_THEMES.creme;
  const d = await ctx.data.surah(s); const vv = d.v[v - 1]; const info = ctx.data.surahInfo(s);
  const W = 1080, H = 1350; const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const AR = '"Atelier Amiri Quran", serif'; const LAT = '"Inter", "Segoe UI", system-ui, sans-serif';
  try { await document.fonts.load('60px ' + AR, 'بسم'); } catch (e) { /* */ }
  // fond
  const g = c.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H / 2, H * 0.8); g.addColorStop(0, T.bg); g.addColorStop(1, T.bg2);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // cadre : deux filets et des étoiles aux coins
  c.strokeStyle = T.gold; c.lineWidth = 3; c.strokeRect(46, 46, W - 92, H - 92);
  c.lineWidth = 1.2; c.strokeRect(62, 62, W - 124, H - 124);
  const star = (x, y, r) => { c.save(); c.translate(x, y); c.fillStyle = T.gold; [0, Math.PI / 4].forEach(a => { c.save(); c.rotate(a); c.fillRect(-r, -r, 2 * r, 2 * r); c.restore(); }); c.fillStyle = T.bg; c.beginPath(); c.arc(0, 0, r * 0.55, 0, 7); c.fill(); c.restore(); };
  [[54, 54], [W - 54, 54], [54, H - 54], [W - 54, H - 54]].forEach(([x, y]) => star(x, y, 15));
  // le nom de la sourate en haut
  c.textAlign = 'center'; c.direction = 'rtl'; c.fillStyle = T.gold; c.font = '44px ' + AR; c.fillText(info[3], W / 2, 150);
  c.beginPath(); c.moveTo(W / 2 - 140, 182); c.lineTo(W / 2 + 140, 182); c.strokeStyle = T.gold; c.lineWidth = 1.2; c.stroke(); star(W / 2, 182, 7);
  // le verset : on réduit la taille jusqu'à ce qu'il tienne
  const words = vv[2].map(wordText); words[words.length - 1] += '\u00a0﴿' + arNum(v) + '﴾';
  let fs = 84, lines = [];
  const frWords = String(vv[0]).split(/\s+/);
  let ffs = 34, flines = [];
  for (; fs >= 34; fs -= 4) {
    c.font = fs + 'px ' + AR; c.direction = 'rtl'; lines = wrapLines(c, words, W - 220);
    ffs = Math.max(26, Math.min(36, Math.round(fs * 0.42))); c.font = ffs + 'px ' + LAT; c.direction = 'ltr'; flines = wrapLines(c, frWords, W - 240);
    const hAr = lines.length * fs * 1.75, hFr = flines.length * ffs * 1.45;
    if (hAr + hFr + 80 < H - 420) break;
  }
  const hAr = lines.length * fs * 1.75, hFr = flines.length * ffs * 1.45; let y = 240 + (H - 420 - (hAr + hFr + 80)) / 2 + fs * 1.2;
  c.fillStyle = T.ink; c.font = fs + 'px ' + AR; c.direction = 'rtl'; c.textAlign = 'center';
  lines.forEach(l => { c.fillText(l, W / 2, y); y += fs * 1.75; });
  y += 30 - fs * 0.5;
  c.fillStyle = T.soft; c.font = 'italic ' + ffs + 'px ' + LAT; c.direction = 'ltr';
  flines.forEach((l, i) => { c.fillText((i === 0 ? '« ' : '') + l + (i === flines.length - 1 ? ' »' : ''), W / 2, y); y += ffs * 1.45; });
  // la référence en bas
  c.fillStyle = T.gold; c.font = '30px ' + LAT; c.fillText(info[1] + ' · ' + s + ':' + v, W / 2, H - 120);
  c.fillStyle = T.soft; c.globalAlpha = .6; c.font = '20px ' + LAT; c.fillText('Atelier arabe', W / 2, H - 84); c.globalAlpha = 1;
  return cv;
}
function canvasBlob(cv) { return new Promise(res => cv.toBlob(b => res(b), 'image/png')); }
/* fenêtre d'aperçu : choisir le style, puis partager, garder dans le coffre ou télécharger */
async function openVerseImage(ctx, s, v) {
  document.querySelectorAll('.aa-imgdlg').forEach(e => e.remove());
  const host = document.querySelector('.aa-root') || document.body;
  const dlg = h(host, 'div', 'aa-imgdlg');
  const card = h(dlg, 'div', 'aa-imgdlg-card');
  const head = h(card, 'div', 'aa-imgdlg-head'); h(head, 'b', null, '🖼 Image du verset ' + s + ':' + v);
  btn(head, '✕', () => dlg.remove(), 'aa-btn-quiet');
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.remove(); });
  const themes = h(card, 'div', 'aa-actions');
  const prev = h(card, 'div', 'aa-imgdlg-prev');
  const act = h(card, 'div', 'aa-actions aa-imgdlg-act');
  let theme = ctx.settings.imgTheme || 'creme'; let cv = null;
  const paint = async () => {
    clear(prev); h(prev, 'p', 'aa-muted', 'Préparation…');
    themes.querySelectorAll('button').forEach(b => b.classList.toggle('aa-on', b.dataset.t === theme));
    cv = await drawVerseImage(ctx, s, v, theme); clear(prev); cv.className = 'aa-imgdlg-cv'; prev.appendChild(cv);
  };
  Object.entries(IMG_THEMES).forEach(([k, T]) => { const b = btn(themes, T.name, () => { theme = k; ctx.settings.imgTheme = k; ctx.save(); paint(); }, 'aa-btn-quiet'); b.dataset.t = k; });
  const fname = 'verset-' + s + '-' + v + '.png';
  if (navigator.share && navigator.canShare) btn(act, '↗ Partager', async () => {
    try { const b = await canvasBlob(cv); const f = new File([b], fname, { type: 'image/png' }); if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Verset ' + s + ':' + v }); else notify('Partage d\'image impossible sur cet appareil.'); } catch (e) { if (!e || e.name !== 'AbortError') notify('Partage impossible.'); }
  }, 'mod-cta');
  if (ctx.saveImage) btn(act, '💾 Garder dans mon coffre', async () => { const b = await canvasBlob(cv); const p = await ctx.saveImage(fname, await b.arrayBuffer()); if (p) notify('Image gardée : ' + p); }, navigator.share ? 'aa-btn-quiet' : 'mod-cta');
  btn(act, '⬇ Télécharger', async () => { const b = await canvasBlob(cv); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }, 'aa-btn-quiet');
  await paint();
}
