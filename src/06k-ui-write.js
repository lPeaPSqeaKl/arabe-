/* ====================================================================
 * 06k - Onglet Écrire : apprendre à tracer les lettres et les mots
 * Un cahier d'écriture : on regarde, on trace sur le modèle, puis on
 * écrit seul. L'atelier compare ton tracé au modèle et donne une note.
 * Tout se passe sur l'appareil (aucune connexion nécessaire).
 * ==================================================================== */
const WR_FONT = '"Atelier Amiri Quran", "Amiri Quran", "Amiri", "Geeza Pro", serif';
function writeState(ctx) { const W = ctx.settings.writing || (ctx.settings.writing = {}); if (!W.l) W.l = {}; if (!W.w) W.w = {}; return W; }
function letterLearned(W, l) { return !!(W.l[l] && W.l[l].s >= 60); }
function writeAllLetters() { const out = []; WRITE_UNITS.forEach(u => u.letters.forEach(l => out.push(l))); return out; }
function writeNext(W) {
  for (const u of WRITE_UNITS) for (const l of u.letters) if (!letterLearned(W, l)) return { unit: u, letter: l };
  for (const u of WRITE_UNITS) for (let i = 0; i < u.words.length; i++) if (!(W.w[u.words[i][0]] >= 60)) return { unit: u, word: i };
  return null;
}
function alphaLetter(l) { return (((CONTENT[UI_LANG] || CONTENT.fr || {}).alphabet || {}).letters || []).find(x => x.l === l) || null; }
function starsOf(score) { return score >= 80 ? '★★★' : score >= 60 ? '★★☆' : score >= 40 ? '★☆☆' : '☆☆☆'; }

/* ---------- le cahier : une zone où l'on écrit au doigt, au stylet ou à la souris ---------- */
function wrGrid(cv, cell) {
  const w = cv.width, hh = cv.height; const d = cv.getContext('2d').getImageData(0, 0, w, hh).data;
  const gw = Math.ceil(w / cell), gh = Math.ceil(hh / cell); const g = new Uint8Array(gw * gh);
  for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 90) g[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
  return { g, gw, gh };
}
function wrDilate(G, r) {
  if (r <= 0) return G;
  const { gw, gh } = G; const a = new Uint8Array(gw * gh), b = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) { let last = -1e9; for (let x = 0; x < gw; x++) { if (G.g[y * gw + x]) last = x; if (x - last <= r) a[y * gw + x] = 1; } last = 1e9; for (let x = gw - 1; x >= 0; x--) { if (G.g[y * gw + x]) last = x; if (last - x <= r) a[y * gw + x] = 1; } }
  for (let x = 0; x < gw; x++) { let last = -1e9; for (let y = 0; y < gh; y++) { if (a[y * gw + x]) last = y; if (y - last <= r) b[y * gw + x] = 1; } last = 1e9; for (let y = gh - 1; y >= 0; y--) { if (a[y * gw + x]) last = y; if (last - y <= r) b[y * gw + x] = 1; } }
  return { g: b, gw, gh };
}
function wrBox(G) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < G.gh; y++) for (let x = 0; x < G.gw; x++) if (G.g[y * G.gw + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}
/* note sur 100 : la part du modèle que ton tracé recouvre, et la part de ton tracé qui tombe sur le modèle */
function wrCompare(model, ink, rCover, rTol) {
  const id = wrDilate(ink, rCover), md = wrDilate(model, rTol);
  let m = 0, mc = 0, k = 0, kc = 0;
  for (let i = 0; i < model.g.length; i++) { if (model.g[i]) { m++; if (id.g[i]) mc++; } if (ink.g[i]) { k++; if (md.g[i]) kc++; } }
  if (!m || !k) return { score: 0, cover: 0, prec: 0 };
  const cover = mc / m, prec = kc / k; let f = 2 * cover * prec / Math.max(1e-6, cover + prec);
  const area = k / m; if (area > 1.6) f *= 1.6 / area; // trop d'encre : un gribouillis n'est pas une lettre
  return { score: Math.round(100 * Math.max(0, Math.min(1, (f - 0.35) / 0.55))), cover, prec, area };
}

function makeWritePad(ctx, parent, opts) {
  const pad = { strokes: [], text: opts.text || '', mode: opts.mode || 'trace', checked: false };
  const wrap = h(parent, 'div', 'aa-wr-pad aa-wr-' + pad.mode);
  const cv = h(wrap, 'canvas', 'aa-wr-canvas');
  const tools = h(parent, 'div', 'aa-wr-tools');
  const res = h(parent, 'div', 'aa-wr-res');
  let W = 0, H = 0, dpr = 1, lay = null, demoT = null;
  const g2 = () => cv.getContext('2d');
  const colors = () => { const cs = getComputedStyle(wrap); return { ink: cs.color || '#222', model: cs.getPropertyValue('--aa-wr-model').trim() || 'rgba(120,120,130,.22)', good: cs.getPropertyValue('--aa-acc').trim() || '#1f9a55', line: cs.getPropertyValue('--aa-wr-line').trim() || 'rgba(120,120,130,.45)' }; };
  function layout() {
    W = Math.max(240, Math.round(wrap.clientWidth || parent.clientWidth || 600));
    H = Math.round(Math.max(190, Math.min(320, W * (pad.text.length > 4 ? 0.42 : 0.55))));
    dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px';
    lay = null;
    if (!pad.text) return;
    const c = document.createElement('canvas').getContext('2d');
    const fit = fs => { c.font = fs + 'px ' + WR_FONT; c.direction = 'rtl'; c.textAlign = 'left'; const m = c.measureText(pad.text); return { m, bw: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, bh: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent }; };
    let fs = H * 0.5; let r = fit(fs);
    const s = Math.min((W * 0.86) / Math.max(1, r.bw), (H * 0.74) / Math.max(1, r.bh), 1.7);
    fs = Math.max(20, fs * s); r = fit(fs);
    const x = W / 2 + (r.m.actualBoundingBoxLeft - r.m.actualBoundingBoxRight) / 2;
    const y = H / 2 + (r.m.actualBoundingBoxAscent - r.m.actualBoundingBoxDescent) / 2;
    lay = { fs, x, y, lw: Math.max(5, fs * 0.055), left: x - r.m.actualBoundingBoxLeft, right: x + r.m.actualBoundingBoxRight };
  }
  function drawText(c, color, clipFrom) {
    if (!lay) return;
    c.save();
    if (clipFrom != null) { c.beginPath(); c.rect(clipFrom, 0, W, H); c.clip(); }
    c.font = lay.fs + 'px ' + WR_FONT; c.direction = 'rtl'; c.textAlign = 'left'; c.fillStyle = color; c.fillText(pad.text, lay.x, lay.y);
    c.restore();
  }
  function drawStrokes(c, color, strokes, lw) {
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of strokes) {
      if (s.length === 1) { c.beginPath(); c.arc(s[0][0], s[0][1], lw / 2, 0, 7); c.fill(); continue; }
      c.beginPath(); c.moveTo(s[0][0], s[0][1]); for (let i = 1; i < s.length; i++) c.lineTo(s[i][0], s[i][1]); c.stroke();
    }
    c.restore();
  }
  function redraw(o) {
    o = o || {};
    const c = g2(); const col = colors();
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const base = lay ? lay.y : H * 0.62;
    c.save(); c.strokeStyle = col.line; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(10, base); c.lineTo(W - 10, base); c.stroke(); c.restore();
    if (o.demo != null) drawText(c, col.ink, o.demo);
    else if (o.result) drawText(c, col.good, null);
    else if (pad.mode === 'trace' || pad.mode === 'view') drawText(c, col.model, null);
    c.save(); if (o.result) c.globalAlpha = .85;
    drawStrokes(c, col.ink, o.strokes || pad.strokes, lay ? lay.lw : 6);
    c.restore();
  }
  /* démonstration : la lettre apparaît de droite à gauche, dans le sens de l'écriture */
  /* le chemin du stylo, calculé une fois pour ce texte et cette taille */
  let plan = null, planKey = '';
  function getPlan() {
    const key = pad.text + '|' + W + 'x' + H;
    if (plan && planKey === key) return plan;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); drawText(g, '#000', null);
    const d = g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 110) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { plan = { strokes: [] }; planKey = key; return plan; }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(W - 1, x1 + 2); y1 = Math.min(H - 1, y1 + 2);
    const w = x1 - x0 + 1, hh = y1 - y0 + 1; const m = new Uint8Array(w * hh);
    for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) m[y * w + x] = d[((y + y0) * W + x + x0) * 4 + 3] > 110 ? 1 : 0;
    const pl = penPlan(m, w, hh, lay.fs);
    pl.strokes.forEach(s => { s.pts = s.pts.map(([x, y, r]) => [x + x0, y + y0, r]); });
    plan = pl; planKey = key; return plan;
  }
  /* démonstration : un stylo écrit le texte, trait par trait, dans le bon ordre et le bon sens */
  pad.demo = (slow) => {
    if (!lay) return; if (demoT) cancelAnimationFrame(demoT);
    const pl = getPlan(); if (!pl.strokes.length) return;
    const col = colors(); const accent = getComputedStyle(wrap).getPropertyValue('--interactive-accent').trim() || '#6a5acd';
    const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height; const mg = mask.getContext('2d'); mg.setTransform(dpr, 0, 0, dpr, 0, 0); mg.fillStyle = '#000'; mg.strokeStyle = '#000'; mg.lineCap = 'round';
    const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; const tg = tmp.getContext('2d');
    const showNum = pad.text.replace(/[ً-ٰٟۖ-ۭ]/g, '').length <= 3;
    const speed = Math.max(0.12, lay.fs / 900) * (slow ? 0.55 : 1); // pixels par milliseconde
    const labels = []; let si = 0, pi = 0, pause = 350, last = performance.now(), num = 0;
    const paint = (pen) => {
      const c = g2(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
      c.save(); c.strokeStyle = col.line; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(10, lay.y); c.lineTo(W - 10, lay.y); c.stroke(); c.restore();
      drawText(c, col.model, null);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, tmp.width, tmp.height); tg.globalCompositeOperation = 'source-over'; tg.setTransform(dpr, 0, 0, dpr, 0, 0); drawText(tg, col.ink, null);
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tmp, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      labels.forEach(([x, y, n]) => { c.save(); c.fillStyle = accent; c.beginPath(); c.arc(x, y, 11, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), x, y + 0.5); c.restore(); });
      if (pen) { c.save(); c.fillStyle = accent; c.globalAlpha = .9; c.beginPath(); c.arc(pen[0], pen[1], Math.max(5, lay.lw * 0.7), 0, 7); c.fill(); c.globalAlpha = .25; c.beginPath(); c.arc(pen[0], pen[1], Math.max(11, lay.lw * 1.5), 0, 7); c.fill(); c.restore(); }
    };
    const step = now => {
      let dt = now - last; last = now;
      if (pause > 0) { pause -= dt; dt = 0; }
      let budget = dt * speed; let pen = null;
      while (budget > 0 && si < pl.strokes.length) {
        const s = pl.strokes[si];
        if (pi === 0 && s.first && s.comp !== 'tiny') { num++; if (showNum && s.pts.length > 2) { const [x, y] = s.pts[0]; labels.push([x + 14, y - 14, num]); } }
        const p = s.pts[pi]; const q = pi > 0 ? s.pts[pi - 1] : p;
        mg.lineWidth = 2 * (p[2] + 1.3); mg.beginPath(); mg.moveTo(q[0], q[1]); mg.lineTo(p[0], p[1]); mg.stroke();
        mg.beginPath(); mg.arc(p[0], p[1], p[2] + 1.3, 0, 7); mg.fill();
        budget -= Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; pen = p; pi++;
        if (pi >= s.pts.length) { si++; pi = 0; const nx = pl.strokes[si]; if (nx && (nx.comp !== 'tiny' || !nx.first)) { pause = nx.first ? 380 : 220; break; } }
      }
      if (si < pl.strokes.length) { paint(pen || (pl.strokes[si].pts[Math.max(0, pi - 1)])); demoT = requestAnimationFrame(step); }
      else {
        demoT = null; mg.setTransform(1, 0, 0, 1, 0, 0); mg.fillRect(0, 0, mask.width, mask.height); paint(null);
        if (pad.mode !== 'view') setTimeout(() => { if (!pad.strokes.length && !pad.checked && !demoT) redraw(); }, 1600);
      }
    };
    paint(pl.strokes[0].pts[0]);
    demoT = requestAnimationFrame(step);
  };
  const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  let cur = null, penSeen = false;
  if (pad.mode !== 'view') {
    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen') penSeen = true;
      if (penSeen && e.pointerType === 'touch') return; // la paume posée sur l'iPad
      if (demoT) { cancelAnimationFrame(demoT); demoT = null; }
      if (pad.checked) { pad.checked = false; pad.strokes = []; clear(res); }
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      cur = [pt(e)]; pad.strokes.push(cur); redraw();
    });
    cv.addEventListener('pointermove', e => {
      if (!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach(x => cur.push(pt(x)));
      redraw();
    });
    const end = () => { cur = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') end(); });
    btn(tools, '↶ Annuler le trait', () => { pad.strokes.pop(); pad.checked = false; clear(res); redraw(); }, 'aa-btn-quiet');
    btn(tools, '✕ Effacer', () => { pad.strokes = []; pad.checked = false; clear(res); redraw(); }, 'aa-btn-quiet');
  }
  if (pad.text) { btn(tools, '▶ Voir le geste', () => { pad.strokes = []; pad.checked = false; clear(res); pad.demo(); }, 'aa-btn-quiet'); btn(tools, '🐢 Au ralenti', () => { pad.strokes = []; pad.checked = false; clear(res); pad.demo(true); }, 'aa-btn-quiet'); }
  if (pad.text && pad.mode !== 'view' && opts.onScore) btn(tools, '✓ Vérifier', () => pad.check(), 'mod-cta');
  pad.check = () => {
    if (!lay) return;
    if (!pad.strokes.length) { clear(res); h(res, 'div', 'aa-muted', 'Écris d\'abord dans le cadre.'); return; }
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const mc = mk(); drawText(mc.getContext('2d'), '#000', null);
    const cell = 3; const model = wrGrid(mc, cell);
    let strokes = pad.strokes;
    if (pad.mode === 'alone') { // écrit sans modèle : on remet ton tracé à la taille et à la place du modèle
      const c0 = mk(); drawStrokes(c0.getContext('2d'), '#000', strokes, lay.lw);
      const ib = wrBox(wrGrid(c0, cell)), mb = wrBox(model);
      if (mb && ib) {
        const mw = (mb.x1 - mb.x0 + 1) * cell, mh = (mb.y1 - mb.y0 + 1) * cell, iw = (ib.x1 - ib.x0 + 1) * cell, ih = (ib.y1 - ib.y0 + 1) * cell;
        // largeur et hauteur ajustées séparément, sans trop déformer (rapport limité à 1,6)
        const g = Math.sqrt((mw / iw) * (mh / ih)); const lim = v => Math.max(g / 1.6, Math.min(g * 1.6, v));
        const sx = Math.max(0.3, Math.min(4, lim(mw / iw))), sy = Math.max(0.3, Math.min(4, lim(mh / ih)));
        const cx = (ib.x0 + ib.x1 + 1) * cell / 2, cy = (ib.y0 + ib.y1 + 1) * cell / 2, mx = (mb.x0 + mb.x1 + 1) * cell / 2, my = (mb.y0 + mb.y1 + 1) * cell / 2;
        strokes = strokes.map(st => st.map(([x, y]) => [mx + (x - cx) * sx, my + (y - cy) * sy]));
      }
    }
    const ic = mk(); drawStrokes(ic.getContext('2d'), '#000', strokes, lay.lw);
    const ink = wrGrid(ic, cell);
    const r = wrCompare(model, ink, Math.max(1, Math.round(lay.fs * 0.035 / cell)), Math.max(1, Math.round(lay.fs * (pad.mode === 'alone' ? 0.055 : 0.045) / cell)));
    pad.checked = true;
    redraw({ result: true, strokes });
    clear(res);
    const row = h(res, 'div', 'aa-wr-score ' + (r.score >= 60 ? 'aa-wr-good' : r.score >= 40 ? 'aa-wr-mid' : 'aa-wr-low'));
    h(row, 'span', 'aa-wr-stars', starsOf(r.score)); h(row, 'b', null, r.score + ' / 100');
    let msg = r.score >= 80 ? 'Très bien tracé.' : r.score >= 60 ? 'Bien. La forme est reconnaissable.' : r.score >= 40 ? 'Presque : compare avec le modèle en vert.' : 'Pas encore : regarde le geste, puis réessaie.';
    if (r.score < 80 && r.cover < 0.6) msg += ' Il manque une partie de la lettre (un point ? la fin du trait ?).';
    else if (r.score < 80 && r.prec < 0.6) msg += ' Une partie de ton tracé sort du modèle.';
    h(row, 'span', 'aa-muted', msg);
    if (ctx.markActivity) ctx.markActivity('w');
    if (opts.onScore) opts.onScore(r.score, r);
  };
  pad.info = () => ({ lay, W, H });
  pad.plan = () => getPlan();
  pad.setText = t => { pad.text = t; pad.strokes = []; pad.checked = false; clear(res); layout(); redraw(); };
  const start = () => {
    layout(); redraw(); if (opts.autoDemo) setTimeout(() => pad.demo(), 300);
    // l'iPad tourne, la fenêtre change de taille : on garde le tracé à sa place
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (!wrap.isConnected) { ro.disconnect(); return; }
        const w0 = W, h0 = H; const nw = Math.round(wrap.clientWidth || 0);
        if (!nw || Math.abs(nw - w0) < 8) return;
        layout(); const kx = W / w0, ky = H / h0;
        pad.strokes = pad.strokes.map(s => s.map(([x, y]) => [x * kx, y * ky])); pad.checked = false; clear(res); redraw();
      });
      ro.observe(wrap);
    }
  };
  if (document.fonts && document.fonts.load) document.fonts.load('40px ' + WR_FONT, pad.text || 'ب').then(start, start); else start();
  return pad;
}

/* ---------- l'onglet ---------- */
function renderWriteTab(ctx, root, state) {
  clear(root);
  const go = () => renderWriteTab(ctx, root, state);
  if (state.letter) return renderWriteLetter(ctx, root, state, go);
  if (state.word) return renderWriteWord(ctx, root, state, go);
  if (state.unit) { const u = WRITE_UNITS.find(x => x.id === state.unit); if (u) return renderWriteUnit(ctx, root, state, u, go); state.unit = null; }
  if (state.free) return renderWriteFree(ctx, root, state, go);
  const W = writeState(ctx);
  const all = writeAllLetters(); const nL = all.filter(l => letterLearned(W, l)).length;
  const head = h(root, 'div', 'aa-wr-head');
  h(head, 'h2', null, '✍️ Apprendre à écrire');
  mdText(head, 'p', 'aa-muted', 'Un vrai cahier d\'écriture : pour chaque lettre, tu **regardes le geste**, tu **traces sur le modèle**, puis tu l\'**écris seul**. L\'atelier compare ton tracé au modèle et te donne une note. Une lettre est apprise quand tu l\'écris seul avec au moins **60 / 100**.');
  const bar = h(head, 'div', 'aa-lesson-progress'); const f = h(bar, 'div', 'aa-lesson-fill'); f.style.width = Math.round(100 * nL / all.length) + '%';
  h(head, 'div', 'aa-muted aa-small', nL + ' / ' + all.length + ' lettres apprises');
  const nx = writeNext(W);
  const act = h(head, 'div', 'aa-fc-start');
  if (nx && nx.letter) btn(act, '▶  Continuer : la lettre ' + nx.letter + (alphaLetter(nx.letter) ? ' (' + alphaLetter(nx.letter).name + ')' : ''), () => { state.unit = nx.unit.id; state.letter = nx.letter; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else if (nx) btn(act, '▶  Continuer : écrire « ' + nx.unit.words[nx.word][0] + ' »', () => { state.unit = nx.unit.id; state.word = [nx.unit.id, nx.word]; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else h(act, 'div', 'aa-ok', 'Tu as fait tout le parcours. Continue avec l\'écriture libre, ou refais les lettres pour améliorer tes notes.');
  btn(act, '✏️  Écriture libre', () => { state.free = true; go(); }, 'aa-fc-big2');
  const bas = details(root, '📏 Les règles de base de l\'écriture arabe', nL === 0);
  const ul = h(bas, 'ul', 'aa-wr-basics'); WRITE_BASICS.forEach(t => mdText(ul, 'li', null, t));
  const grid = h(root, 'div', 'aa-wr-units');
  WRITE_UNITS.forEach((u, k) => {
    const done = u.letters.filter(l => letterLearned(W, l)).length; const wd = u.words.filter(w => W.w[w[0]] >= 60).length;
    const c = h(grid, 'div', 'aa-wr-unit' + (u.letters.length && done === u.letters.length ? ' aa-wr-unit-done' : '') + (nx && nx.unit === u ? ' aa-wr-unit-next' : ''));
    const top = h(c, 'div', 'aa-lesson-top'); h(top, 'span', 'aa-lesson-num', String(k + 1)); if (nx && nx.unit === u) h(top, 'span', 'aa-tag', '→ maintenant');
    h(c, 'div', 'aa-lesson-title', u.title);
    const ls = h(c, 'div', 'aa-wr-chips'); ls.setAttribute('dir', 'rtl');
    (u.letters.length ? u.letters : u.words.slice(0, 2).map(w => w[0])).forEach(l => h(ls, 'span', 'aa-wr-chip' + (letterLearned(W, l) ? ' aa-wr-chip-ok' : ''), l));
    h(c, 'div', 'aa-muted aa-small', (u.letters.length ? done + ' / ' + u.letters.length + ' lettres · ' : '') + wd + ' / ' + u.words.length + ' mots');
    c.addEventListener('click', () => { state.unit = u.id; go(); });
  });
}

function renderWriteUnit(ctx, root, state, u, go) {
  const W = writeState(ctx);
  btn(h(root, 'div', 'aa-actions'), '← Toutes les unités', () => { state.unit = null; go(); }, 'aa-btn-quiet');
  h(root, 'h2', null, u.title);
  if (u.letters.length) {
    h(root, 'h3', 'aa-fc-group', 'Les lettres');
    const grid = h(root, 'div', 'aa-wr-letters');
    u.letters.forEach(l => {
      const A = alphaLetter(l); const st = W.l[l];
      const c = h(grid, 'div', 'aa-wr-lcard' + (letterLearned(W, l) ? ' aa-wr-lcard-ok' : ''));
      const g = h(c, 'div', 'aa-wr-lbig'); g.setAttribute('dir', 'rtl'); g.textContent = l;
      h(c, 'div', null, A ? A.name : (l === 'لا' ? 'lām-alif' : l === 'ة' ? 'tā marbūṭa' : l === 'ء' ? 'hamza' : ''));
      h(c, 'div', 'aa-muted aa-small', st ? (letterLearned(W, l) ? '✓ apprise · ' : '') + 'seul : ' + (st.s || 0) + ' / 100' : 'pas encore faite');
      c.addEventListener('click', () => { state.letter = l; state.step = 0; go(); });
    });
  }
  h(root, 'h3', 'aa-fc-group', u.letters.length ? 'Des mots avec ces lettres' : 'Les mots');
  const list = h(root, 'div', 'aa-wr-words');
  u.words.forEach((w, i) => {
    const r = h(list, 'div', 'aa-wr-wrow');
    const a = h(r, 'span', 'aa-wr-war'); a.setAttribute('dir', 'rtl'); a.textContent = w[0];
    const t = h(r, 'span', 'aa-wr-wtxt'); h(t, 'span', 'aa-tr', w[1]); h(t, 'span', 'aa-muted', ' · ' + w[2]);
    h(r, 'span', 'aa-muted aa-small', W.w[w[0]] != null ? (W.w[w[0]] >= 60 ? '✓ ' : '') + W.w[w[0]] + ' / 100' : '');
    r.addEventListener('click', () => { state.word = [u.id, i]; state.step = 0; go(); });
  });
  if (u.id === 'u14') h(root, 'p', 'aa-muted aa-small', 'On écrit ici l\'orthographe courante (الرَّحْمَنِ). Dans le Coran, le ā de الرَّحْمَٰنِ est noté par un petit alif ٰ au-dessus.');
}

/* une lettre : regarder, tracer, tracer ses formes, l'écrire seul */
function renderWriteLetter(ctx, root, state, go) {
  const l = state.letter; const Wd = WRITE_LETTERS[l] || { steps: [], tip: '' }; const A = alphaLetter(l); const W = writeState(ctx);
  const forms = writeForms(l);
  const ex = [{ t: l, m: 'trace', lab: 'Trace la lettre en suivant le modèle gris.' }, { t: l, m: 'trace', lab: 'Encore une fois, plus régulier.' }];
  forms.slice(1).forEach(([f, where]) => ex.push({ t: f, m: 'trace', lab: 'Trace la forme ' + where + ' : ' + f }));
  ex.push({ t: l, m: 'alone', lab: 'Maintenant, écris la lettre **seul**, sans modèle. Ensuite, appuie sur « Vérifier ».' });
  const n = ex.length; const step = state.step || 0;
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Retour', () => { state.letter = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', 'La lettre ' + (A ? A.name : l));
  h(top, 'span', 'aa-muted aa-small aa-fc-left', step === 0 ? 'Regarder' : 'Exercice ' + step + ' / ' + n);
  const bar = h(root, 'div', 'aa-lesson-progress'); const fl = h(bar, 'div', 'aa-lesson-fill'); fl.style.width = Math.round(100 * step / (n + 1)) + '%';
  if (step === 0) {
    const box = h(root, 'div', 'aa-wr-look');
    const big = h(box, 'div', 'aa-wr-look-pad');
    const pad = makeWritePad(ctx, big, { text: l, mode: 'view', autoDemo: true });
    const info = h(box, 'div', 'aa-wr-look-info');
    const nm = h(info, 'div', 'aa-wr-name'); h(nm, 'b', null, A ? A.name : l); if (A) { const s = h(nm, 'span', 'aa-ari'); s.setAttribute('dir', 'rtl'); s.textContent = '  ' + A.nameAr; }
    if (A) { const snd = h(info, 'div', 'aa-actions'); btn(snd, '🔊 Le nom', () => speak(A.nameAr), 'aa-btn-quiet'); h(snd, 'span', 'aa-muted aa-small', 'son : ' + A.son); }
    h(info, 'h4', null, 'Le geste');
    const ol = h(info, 'ol', 'aa-wr-steps'); Wd.steps.forEach(s => mdText(ol, 'li', null, s));
    if (Wd.tip) mdText(info, 'p', 'aa-wr-tip', '💡 ' + Wd.tip);
    h(root, 'h4', null, 'Ses formes dans un mot');
    const fr = h(root, 'div', 'aa-wr-forms');
    forms.forEach(([f, where]) => { const c = h(fr, 'div', 'aa-wr-form'); const a = h(c, 'div', 'aa-wr-form-ar'); a.setAttribute('dir', 'rtl'); a.textContent = f; h(c, 'div', 'aa-muted aa-small', where); });
    if (A && A.ex) { const e = h(root, 'p', 'aa-muted'); e.appendChild(document.createTextNode('Exemple : ')); const s = h(e, 'bdi', 'aa-ari aa-wr-exw'); s.setAttribute('dir', 'rtl'); s.textContent = A.ex[0]; e.appendChild(document.createTextNode('  ' + A.ex[1] + ' · ' + A.ex[2])); }
    btn(h(root, 'div', 'aa-fc-start'), 'Je m\'entraîne →', () => { state.step = 1; go(); }, 'mod-cta aa-fc-big');
    return pad;
  }
  if (step > n) {
    const st = W.l[l] || {};
    const end = h(root, 'div', 'aa-fc-end');
    h(end, 'div', 'aa-fc-end-ic', letterLearned(W, l) ? '🌿' : '✍️');
    h(end, 'h3', null, letterLearned(W, l) ? 'Lettre apprise' : 'Continue à t\'entraîner');
    h(end, 'p', 'aa-muted', 'Meilleure note en traçant : ' + (st.t || 0) + ' / 100 · écrite seul : ' + (st.s || 0) + ' / 100.' + (letterLearned(W, l) ? '' : ' Il faut au moins 60 seul pour la valider.'));
    const a = h(end, 'div', 'aa-fc-start');
    const nx = writeNext(W);
    if (nx && nx.letter && nx.letter !== l) btn(a, 'Lettre suivante : ' + nx.letter + ' →', () => { state.unit = nx.unit.id; state.letter = nx.letter; state.step = 0; go(); }, 'mod-cta aa-fc-big');
    btn(a, '↻ Refaire cette lettre', () => { state.step = 1; go(); }, 'aa-fc-big2');
    btn(a, 'Retour à l\'unité', () => { state.letter = null; go(); }, 'aa-btn-quiet');
    return;
  }
  const e = ex[step - 1];
  mdText(root, 'p', 'aa-wr-ask', e.lab);
  if (e.m === 'alone') { const nm = h(root, 'div', 'aa-muted aa-small'); nm.textContent = 'La lettre ' + (A ? A.name : l) + ', forme seule. Si tu bloques : « Voir le geste ».'; }
  const pad = makeWritePad(ctx, root, { text: e.t, mode: e.m, autoDemo: step === 1, onScore: sc => {
    const st = W.l[l] || (W.l[l] = { t: 0, s: 0, n: 0 });
    st.n++; if (e.m === 'alone') st.s = Math.max(st.s || 0, sc); else st.t = Math.max(st.t || 0, sc); st.d = todayNum();
    ctx.save();
    nav.style.display = '';
  } });
  const nav = h(root, 'div', 'aa-fc-start'); nav.style.display = 'none';
  btn(nav, step < n ? 'Exercice suivant →' : 'Terminer →', () => { state.step = step + 1; go(); }, 'mod-cta aa-fc-big');
  btn(nav, '↻ Réessayer', () => { pad.setText(e.t); nav.style.display = 'none'; }, 'aa-fc-big2');
  if (step < n) { const skip = h(root, 'p', 'aa-small'); const sk = h(skip, 'a', 'aa-link aa-muted', 'passer cet exercice'); sk.addEventListener('click', ev => { ev.preventDefault(); state.step = step + 1; go(); }); }
}

function renderWriteWord(ctx, root, state, go) {
  const [uid, i] = state.word; const u = WRITE_UNITS.find(x => x.id === uid); const w = u && u.words[i];
  if (!w) { state.word = null; return go(); }
  const W = writeState(ctx); const step = state.step || 0;
  const top = h(root, 'div', 'aa-fc-head');
  btn(top, '← Retour', () => { state.word = null; go(); }, 'aa-btn-quiet');
  h(top, 'span', 'aa-muted aa-small', u.title);
  h(top, 'span', 'aa-muted aa-small aa-fc-left', 'Mot ' + (i + 1) + ' / ' + u.words.length);
  const head = h(root, 'div', 'aa-wr-wordhead');
  const a = h(head, 'span', 'aa-wr-war'); a.setAttribute('dir', 'rtl'); a.textContent = w[0];
  h(head, 'span', 'aa-tr', w[1]); h(head, 'span', 'aa-muted', ' · ' + w[2]);
  soundBtn(head, () => speak(w[0]));
  mdText(root, 'p', 'aa-wr-ask', step === 0 ? 'Trace le mot sur le modèle : les lettres **attachées d\'un seul trait**, puis les points, puis les voyelles.' : 'Écris le mot **seul**, sans modèle (tu peux le lire en haut), puis « Vérifier ».');
  const nav = h(document.createElement('div'), 'div', 'aa-fc-start');
  const pad = makeWritePad(ctx, root, { text: w[0], mode: step === 0 ? 'trace' : 'alone', autoDemo: step === 0, onScore: sc => {
    if (step === 1) { W.w[w[0]] = Math.max(W.w[w[0]] || 0, sc); ctx.save(); }
    nav.style.display = '';
  } });
  root.appendChild(nav); nav.style.display = 'none';
  if (step === 0) btn(nav, 'Maintenant seul →', () => { state.step = 1; go(); }, 'mod-cta aa-fc-big');
  else if (i + 1 < u.words.length) btn(nav, 'Mot suivant →', () => { state.word = [uid, i + 1]; state.step = 0; go(); }, 'mod-cta aa-fc-big');
  else btn(nav, 'Retour à l\'unité', () => { state.word = null; go(); }, 'mod-cta aa-fc-big');
  btn(nav, '↻ Réessayer', () => { pad.setText(w[0]); nav.style.display = 'none'; }, 'aa-fc-big2');
  if (step === 0) { const s = h(root, 'p', 'aa-small'); const k = h(s, 'a', 'aa-link aa-muted', 'passer au tracé seul'); k.addEventListener('click', ev => { ev.preventDefault(); state.step = 1; go(); }); }
}

function renderWriteFree(ctx, root, state, go) {
  btn(h(root, 'div', 'aa-actions'), '← Retour', () => { state.free = false; go(); }, 'aa-btn-quiet');
  h(root, 'h2', null, '✏️ Écriture libre');
  mdText(root, 'p', 'aa-muted', 'Tape un mot arabe (ou choisis-en un) pour avoir un modèle, puis entraîne-toi. Laisse vide pour écrire sans modèle.');
  const row = h(root, 'div', 'aa-actions');
  const inp = h(row, 'input', 'aa-input aa-wr-input'); inp.type = 'text'; inp.setAttribute('dir', 'rtl'); inp.value = state.freeText != null ? state.freeText : 'بِسْمِ اللَّهِ';
  const modeSel = selectEl(row, [['trace', 'modèle visible'], ['alone', 'sans modèle']], state.freeMode || 'trace', v => { state.freeMode = v; go(); });
  const sug = h(root, 'div', 'aa-wr-chips aa-wr-sugg'); sug.setAttribute('dir', 'rtl');
  ['اللَّه', 'رَبّ', 'الرَّحِيم', 'قُلْ هُوَ اللَّهُ أَحَدٌ', 'سُبْحَانَ اللَّه', 'الْحَمْدُ لِلَّه'].forEach(t => { const c = h(sug, 'span', 'aa-wr-chip', t); c.addEventListener('click', () => { state.freeText = t; go(); }); });
  const pad = makeWritePad(ctx, root, { text: inp.value.trim(), mode: state.freeMode || 'trace', onScore: () => {} });
  inp.addEventListener('change', () => { state.freeText = inp.value; go(); });
  void modeSel; void pad;
}
