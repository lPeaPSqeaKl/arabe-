/* ====================================================================
 * 06k0 - Le chemin du stylo : comment la main trace vraiment la lettre
 * On part de la lettre dessinée par la police, on en tire la ligne du
 * milieu (le « squelette »), puis on la parcourt comme un stylo :
 * - chaque morceau attaché est écrit de droite à gauche, en partant du haut ;
 * - les points et les voyelles viennent après le corps qu'ils accompagnent.
 * ==================================================================== */
const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/* amincit la forme jusqu'à une ligne d'un pixel (méthode de Zhang et Suen) */
function penThin(img, w, h) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : img[y * w + x];
  let changed = true; const del = [];
  for (let it = 0; changed && it < 200; it++) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!img[y * w + x]) continue;
        const p = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        const B = p.reduce((s, v) => s + v, 0); if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) A++;
        if (A !== 1) continue;
        if (pass === 0 ? (p[0] * p[2] * p[4] || p[2] * p[4] * p[6]) : (p[0] * p[2] * p[6] || p[0] * p[4] * p[6])) continue;
        del.push(y * w + x);
      }
      if (del.length) { changed = true; del.forEach(i => { img[i] = 0; }); }
    }
  }
  return img;
}
/* distance au bord (épaisseur du trait à chaque endroit) */
function penDist(img, w, h) {
  const d = new Float32Array(w * h); const INF = 1e6;
  for (let i = 0; i < w * h; i++) d[i] = img[i] ? INF : 0;
  const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : d[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], g(x - 1, y) + 1, g(x, y - 1) + 1, g(x - 1, y - 1) + 1.414, g(x + 1, y - 1) + 1.414); }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!d[i]) continue; d[i] = Math.min(d[i], g(x + 1, y) + 1, g(x, y + 1) + 1, g(x + 1, y + 1) + 1.414, g(x - 1, y + 1) + 1.414); }
  return d;
}
/* mask : Uint8Array (1 = encre), w × h, fs = taille de la police (pour les seuils) */
function penPlan(mask, w, h, fs) {
  const dist = penDist(mask, w, h);
  const sk = penThin(Uint8Array.from(mask), w, h);
  const isS = (x, y) => x >= 0 && y >= 0 && x < w && y < h && sk[y * w + x] === 1;
  const deg = (x, y) => N8.reduce((s, [dx, dy]) => s + (isS(x + dx, y + dy) ? 1 : 0), 0);
  // on coupe les petites barbes du squelette (dues aux angles de la police)
  const spur = Math.max(3, fs * 0.05);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isS(x, y) || deg(x, y) !== 1) continue;
    const path = [[x, y]]; let cx = x, cy = y, px = -1, py = -1, ok = false;
    while (path.length <= spur) {
      const nb = N8.map(([dx, dy]) => [cx + dx, cy + dy]).filter(([a, b]) => isS(a, b) && !(a === px && b === py) && !path.some(q => q[0] === a && q[1] === b));
      if (nb.length !== 1) { ok = nb.length > 1; break; }
      px = cx; py = cy; [cx, cy] = nb[0];
      if (deg(cx, cy) > 2) { ok = true; break; }
      path.push([cx, cy]);
    }
    if (ok && path.length <= spur) path.forEach(([a, b]) => { sk[b * w + a] = 0; });
  }
  const DOTS = [];
  // les points (petits losanges) disparaissent presque à l'amincissement : on les remet comme un petit trait
  {
    const seen = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || seen[i]) continue;
      const st = [i]; seen[i] = 1; const px = []; let sk1 = 0, rmax = 1, cx = 0, cy = 0;
      while (st.length) { const j = st.pop(); const x = j % w, y = (j / w) | 0; px.push([x, y]); if (sk[j] === 1) sk1++; rmax = Math.max(rmax, dist[j]); for (const [dx, dy] of N8) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < w && b < h && mask[b * w + a] && !seen[b * w + a]) { seen[b * w + a] = 1; st.push(b * w + a); } } }
      if (sk1 >= Math.max(4, rmax * 1.5)) continue;
      px.forEach(([x, y]) => { cx += x; cy += y; sk[y * w + x] = 0; }); cx /= px.length; cy /= px.length;
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; px.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const r = Math.max(1, rmax * 0.8); const a0 = [cx + (x1 - cx) * 0.35, cy - (cy - y0) * 0.35], a1 = [cx - (cx - x0) * 0.35, cy + (y1 - cy) * 0.35];
      const dot = []; for (let k = 0; k <= 6; k++) dot.push([Math.round(a0[0] + (a1[0] - a0[0]) * k / 6), Math.round(a0[1] + (a1[1] - a0[1]) * k / 6)]);
      DOTS.push({ id: -1, px: dot, x0, x1, y0, y1, n: dot.length, dot: true, r });
    }
  }
  // morceaux séparés (corps, points, voyelles)
  const comp = new Int32Array(w * h).fill(-1); const comps0 = [];
  for (let i = 0; i < w * h; i++) {
    if (sk[i] !== 1 || comp[i] >= 0) continue;
    const id = comps0.length; const px = []; const st = [i]; comp[i] = id;
    while (st.length) { const j = st.pop(); const x = j % w, y = (j / w) | 0; px.push([x, y]); for (const [dx, dy] of N8) { const a = x + dx, b = y + dy; if (isS(a, b) && comp[b * w + a] < 0) { comp[b * w + a] = id; st.push(b * w + a); } } }
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; px.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    comps0.push({ id, px, x0, x1, y0, y1, n: px.length });
  }
  const comps = comps0.concat(DOTS);
  if (!comps.length) return { strokes: [] };
  const maxN = Math.max(...comps.map(c => c.n));
  comps.forEach(c => { c.main = c.n >= maxN * 0.3 || (c.y1 - c.y0) >= fs * 0.3; });
  const mains = comps.filter(c => c.main).sort((a, b) => b.x1 - a.x1);
  const smalls = comps.filter(c => !c.main);
  mains.forEach(m => { m.kids = []; });
  smalls.forEach(s => {
    const cx = (s.x0 + s.x1) / 2;
    let best = mains[0], bd = 1e9;
    mains.forEach(m => { const d = cx < m.x0 ? m.x0 - cx : cx > m.x1 ? cx - m.x1 : 0; if (d < bd) { bd = d; best = m; } });
    best.kids.push(s);
  });
  const order = []; mains.forEach(m => { order.push(m); m.kids.sort((a, b) => b.x1 - a.x1 || a.y0 - b.y0).forEach(k => order.push(k)); });
  // on parcourt chaque morceau comme un stylo
  const strokes = [];
  const R = (x, y) => Math.max(1, dist[y * w + x]);
  const startScore = (x, y) => x - y; // en haut à droite d'abord
  for (const c of order) {
    if (c.dot) { strokes.push({ pts: c.px.map(([x, y]) => [x, y, c.r]), first: true, comp: 'small' }); continue; }
    const left = new Set(c.px.map(([x, y]) => y * w + x));
    // départ : le point le plus en haut à droite ; une extrémité de trait est préférée si elle est presque aussi haute
    const bonus = (x, y) => startScore(x, y) + (deg(x, y) === 1 ? fs * 0.15 : 0);
    let cur = c.px.reduce((a, b) => bonus(b[0], b[1]) > bonus(a[0], a[1]) ? b : a);
    let seg = []; let first = true;
    while (left.size) {
      if (!cur) {
        // reprise : un pixel pas encore tracé, collé à ce qui est déjà tracé (une branche)
        let pick = null, ps = -1e9;
        for (const k of left) { const x = k % w, y = (k / w) | 0; const touch = N8.some(([dx, dy]) => isS(x + dx, y + dy) && !left.has((y + dy) * w + x + dx)); const s = (touch ? 1e6 : 0) + startScore(x, y) + (deg(x, y) === 1 ? 5e5 : 0); if (s > ps) { ps = s; pick = [x, y]; } }
        cur = pick; if (seg.length) strokes.push({ pts: seg, first, comp: (seg.length > Math.max(4, fs * 0.08) || first) ? (c.main ? 'main' : 'small') : 'tiny' });
        first = false; seg = [];
        // on part du point déjà tracé voisin, pour que le trait reste continu
        const nb = N8.map(([dx, dy]) => [cur[0] + dx, cur[1] + dy]).find(([a, b]) => isS(a, b) && !left.has(b * w + a));
        if (nb) seg.push([nb[0], nb[1], R(nb[0], nb[1])]);
      }
      const [x, y] = cur; left.delete(y * w + x); seg.push([x, y, R(x, y)]);
      const n = seg.length; const back = seg[Math.max(0, n - 5)];
      let dx0 = x - back[0], dy0 = y - back[1]; const dl = Math.hypot(dx0, dy0) || 1; dx0 /= dl; dy0 /= dl;
      let nx = null, nb = -1e9;
      for (const [ddx, ddy] of N8) { const a = x + ddx, b = y + ddy; if (!left.has(b * w + a)) continue; const l = Math.hypot(ddx, ddy); const s = n > 1 ? (ddx * dx0 + ddy * dy0) / l : (-ddx + ddy * 0.6) / l; if (s > nb) { nb = s; nx = [a, b]; } }
      if (nx) N8.forEach(([ddx, ddy]) => { const a = x + ddx, b = y + ddy; const k = b * w + a; if (left.has(k) && (a !== nx[0] || b !== nx[1]) && Math.abs(a - nx[0]) <= 1 && Math.abs(b - nx[1]) <= 1 && deg(a, b) <= 2) left.delete(k); });
      cur = nx;
    }
    if (seg.length) strokes.push({ pts: seg, first, comp: (seg.length > Math.max(4, fs * 0.08) || first) ? (c.main ? 'main' : 'small') : 'tiny' });
  }
  // on lisse un peu les traits (les escaliers de pixels)
  strokes.forEach(s => { const p = s.pts; if (p.length < 5) return; const q = p.map((pt, i) => { if (i === 0 || i === p.length - 1) return pt; const a = p[i - 1], b = p[i + 1]; return [(a[0] + 2 * pt[0] + b[0]) / 4, (a[1] + 2 * pt[1] + b[1]) / 4, pt[2]]; }); s.pts = q; });
  return { strokes: strokes.filter(s => s.pts.length) };
}
