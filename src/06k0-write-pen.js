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
function penPlan(mask, w, h, fs, bare) { // bare : le même texte sans voyelles (pour garder les voyelles pour la fin)
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
  smalls.forEach(s => { if (!bare) return; let inB = 0; s.px.forEach(([x, y]) => { if (bare[y * w + x]) inB++; }); s.mark = inB < s.px.length * 0.3; });
  // chaque morceau, puis ses points ; les voyelles et les signes à la toute fin, de droite à gauche
  const order = []; mains.forEach(m => { order.push(m); m.kids.filter(k => !k.mark).sort((a, b) => b.x1 - a.x1 || a.y0 - b.y0).forEach(k => order.push(k)); });
  smalls.filter(s => s.mark).sort((a, b) => b.x1 - a.x1 || a.y0 - b.y0).forEach(k => order.push(k));
  // on parcourt chaque morceau comme un stylo : graphe du squelette (bouts, croisements, traits),
  // puis un chemin qui fait les dents et les hampes en montant puis en redescendant, comme la main.
  const strokes = [];
  const R = (x, y) => Math.max(1, dist[y * w + x]);
  for (const c of order) {
    if (c.dot) { strokes.push({ pts: c.px.map(([x, y]) => [x, y, c.r]), first: true, comp: c.mark ? 'mark' : 'small' }); continue; }
    penWalk(c, w, isS, deg, fs, R).forEach((pts, k) => strokes.push({ pts, first: k === 0, comp: c.main ? 'main' : (c.mark ? 'mark' : 'small') }));
  }
  // on lisse un peu les traits (les escaliers de pixels)
  strokes.forEach(s => { const p = s.pts; if (p.length < 5) return; const q = p.map((pt, i) => { if (i === 0 || i === p.length - 1) return pt; const a = p[i - 1], b = p[i + 1]; return [(a[0] + 2 * pt[0] + b[0]) / 4, (a[1] + 2 * pt[1] + b[1]) / 4, pt[2]]; }); s.pts = q; });
  return { strokes: strokes.filter(s => s.pts.length) };
}

/* parcours d'un morceau : renvoie une liste de traits (chaque trait = [[x, y, r], …]) */
function penWalk(c, w, isS, deg, fs, R) {
  const key = (x, y) => y * w + x;
  const inC = new Set(c.px.map(([x, y]) => key(x, y)));
  const isNode = (x, y) => deg(x, y) !== 2;
  // 1. les nœuds : bouts (1 voisin) et croisements (3 voisins ou plus), regroupés s'ils se touchent
  const nodeOf = new Map(); const nodes = [];
  for (const [x, y] of c.px) {
    if (!isNode(x, y) || nodeOf.has(key(x, y))) continue;
    const id = nodes.length; const px = []; const st = [[x, y]]; nodeOf.set(key(x, y), id);
    while (st.length) { const [a, b] = st.pop(); px.push([a, b]); for (const [dx, dy] of N8) { const u = a + dx, v = b + dy, k = key(u, v); if (inC.has(k) && isNode(u, v) && !nodeOf.has(k)) { nodeOf.set(k, id); st.push([u, v]); } } }
    const cx = px.reduce((s, p) => s + p[0], 0) / px.length, cy = px.reduce((s, p) => s + p[1], 0) / px.length;
    nodes.push({ id, px, x: cx, y: cy, end: px.length === 1 && deg(x, y) === 1, edges: [] });
  }
  // 2. les traits entre nœuds
  const used = new Set(); const edges = [];
  const addEdge = (chain, a, b) => { const e = { id: edges.length, chain, a, b, len: chain.length, done: false }; edges.push(e); nodes[a].edges.push(e); if (b !== a) nodes[b].edges.push(e); };
  for (const n of nodes) for (const [sx, sy] of n.px) for (const [dx, dy] of N8) {
    const x1 = sx + dx, y1 = sy + dy, k1 = key(x1, y1);
    if (!inC.has(k1) || nodeOf.get(k1) === n.id || used.has(k1)) continue;
    if (nodeOf.has(k1)) { // deux nœuds collés
      const o = nodeOf.get(k1); if (o > n.id && !edges.some(e => (e.a === n.id && e.b === o) || (e.a === o && e.b === n.id))) addEdge([[sx, sy], [x1, y1]], n.id, o); continue;
    }
    const chain = [[sx, sy], [x1, y1]]; used.add(k1); let px = sx, py = sy, cx = x1, cy = y1, end = -1;
    for (let guard = 0; guard < 100000; guard++) {
      let nx = null;
      for (const [ex, ey] of N8) { const u = cx + ex, v = cy + ey, k = key(u, v); if (!inC.has(k) || (u === px && v === py)) continue; if (nodeOf.has(k) && !(chain.length === 2 && nodeOf.get(k) === n.id && u === sx && v === sy)) { if (chain.length > 2 || nodeOf.get(k) !== n.id) { nx = [u, v]; end = nodeOf.get(k); break; } } }
      if (nx) { chain.push(nx); break; }
      for (const [ex, ey] of N8) { const u = cx + ex, v = cy + ey, k = key(u, v); if (inC.has(k) && !used.has(k) && !nodeOf.has(k)) { nx = [u, v]; break; } }
      if (!nx) break;
      used.add(key(nx[0], nx[1])); chain.push(nx); px = cx; py = cy; [cx, cy] = nx;
    }
    if (end < 0) end = n.id;
    addEdge(chain, n.id, end);
  }
  // un anneau sans nœud (ه seul, la boucle d'un و parfois) : on le coupe en haut à droite
  const rest = c.px.filter(([x, y]) => !nodeOf.has(key(x, y)) && !used.has(key(x, y)));
  if (rest.length > 3) {
    const st0 = rest.reduce((a, b) => (b[0] - b[1] > a[0] - a[1] ? b : a));
    const id = nodes.length; nodes.push({ id, px: [st0], x: st0[0], y: st0[1], end: false, edges: [] });
    const chain = [st0]; const seen = new Set([key(st0[0], st0[1])]); let cur = st0;
    for (;;) { let nx = null; let best = -1e9; for (const [dx, dy] of N8) { const u = cur[0] + dx, v = cur[1] + dy, k = key(u, v); if (!inC.has(k) || seen.has(k) || nodeOf.has(k)) continue; const s = chain.length === 1 ? (-dx * 2 + dy) : 0; if (s > best) { best = s; nx = [u, v]; } } if (!nx) break; seen.add(key(nx[0], nx[1])); chain.push(nx); cur = nx; }
    chain.push(st0); addEdge(chain, id, id);
  }
  if (!edges.length) return c.px.length ? [c.px.map(([x, y]) => [x, y, R(x, y)])] : [];
  // 3. le chemin
  const dirOf = (chain, rev) => { const L = chain.length; const n = Math.max(1, Math.min(L - 1, Math.round(fs * 0.1))); const p0 = rev ? chain[L - 1] : chain[0], p1 = rev ? chain[L - 1 - n] : chain[n]; const dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const other = (e, at) => (e.a === at ? e.b : e.a);
  const oriented = (e, at) => (e.a === at ? e.chain : e.chain.slice().reverse());
  const subtreeOpen = (nodeId, from) => nodes[nodeId].edges.some(x => !x.done && x !== from);
  const strokes = []; let stroke = null; let dirIn = [-1, 0];
  const push = (chain) => { for (const [x, y] of chain) { const l = stroke[stroke.length - 1]; if (l && l[0] === x && l[1] === y) continue; stroke.push([x, y, R(x, y)]); } };
  const startScore = n => n.x - n.y * 1.3 + (n.end ? fs * 0.25 : 0);
  let cur = null;
  const left = () => edges.some(e => !e.done);
  while (left()) {
    if (cur == null) { // poser le stylo : un nœud avec un trait pas encore fait, le plus en haut à droite
      let best = null; for (const n of nodes) if (n.edges.some(e => !e.done)) { const s = startScore(n) + (n.edges.filter(e => !e.done).length === 1 ? fs * 0.2 : 0); if (!best || s > best.s) best = { n, s }; }
      cur = best.n.id; stroke = []; strokes.push(stroke); dirIn = [-1, 0.3];
    }
    const cand = nodes[cur].edges.filter(e => !e.done);
    if (!cand.length) { cur = null; continue; }
    const info = cand.map(e => {
      const o = other(e, cur); const ch = oriented(e, cur); const d = dirOf(ch, false);
      const deadEnd = o !== cur && nodes[o].end && !subtreeOpen(o, e);
      const up = (ch[ch.length - 1][1] - ch[0][1]) < -fs * 0.08; // le bout est plus haut : une dent ou une hampe
      const cont = d[0] * dirIn[0] + d[1] * dirIn[1];
      return { e, o, ch, d, deadEnd, up, cont, loop: o === cur };
    });
    let pick;
    const others = n => info.length - 1;
    // a) une dent ou une hampe : on monte et on redescend (seulement si autre chose reste à faire ici)
    pick = info.filter(i => i.deadEnd && i.up && i.e.len < fs * 1.1 && others() > 0).sort((a, b) => a.e.len - b.e.len)[0];
    if (pick) { pick.e.done = true; push(pick.ch); push(pick.ch.slice().reverse()); dirIn = dirOf(pick.ch, true).map(v => -v); dirIn = [ -Math.abs(dirIn[0]) || -1, 0 ]; continue; }
    // b) un petit crochet vers le bas, s'il reste d'autres traits ici : aller-retour aussi
    pick = info.filter(i => i.deadEnd && !i.up && i.e.len < fs * 0.25 && others() > 0)[0];
    if (pick) { pick.e.done = true; push(pick.ch); push(pick.ch.slice().reverse()); continue; }
    // c) une boucle (deux traits qui vont au même endroit, comme la tête du م ou du و) : on fait le tour et on revient ici
    const par = info.filter(i => !i.loop && info.some(j => j !== i && j.o === i.o && !j.loop));
    if (par.length >= 2) {
      // a : l'arc du haut (on monte d'abord), b : l'arc du bas
      const midY = i => i.ch[Math.floor(i.ch.length / 2)][1];
      const a = par.slice().sort((x, y) => midY(x) - midY(y))[0]; const b = par.find(j => j !== a && j.o === a.o);
      a.e.done = true; b.e.done = true; push(a.ch); push(b.ch.slice().reverse());
      if (info.length > 2) continue; // d'autres traits partent d'ici : on repart d'ici
      push(b.ch); cur = a.o; // sinon on repasse sur le bas de la boucle et on continue de l'autre côté
      const L = b.ch.length; const p1 = b.ch[L - 1], p0 = b.ch[Math.max(0, L - 4)]; const dl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1; dirIn = [(p1[0] - p0[0]) / dl, (p1[1] - p0[1]) / dl];
      continue;
    }
    pick = info.find(i => i.loop && info.length > 1);
    if (pick) { pick.e.done = true; push(pick.ch); continue; }
    // d) sinon on continue dans le sens de la main (vers la gauche, sans casser le mouvement) ; un bout libre en dernier
    info.forEach(i => { i.score = i.cont * 1.2 - i.d[0] * 0.6 + (i.deadEnd ? -0.8 : 0) + (i.loop ? 0.3 : 0); });
    pick = info.sort((a, b) => b.score - a.score)[0];
    pick.e.done = true; push(pick.ch);
    const L = pick.ch.length; const n = Math.max(1, Math.min(L - 1, Math.round(fs * 0.1))); const p1 = pick.ch[L - 1], p0 = pick.ch[L - 1 - n]; const dl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1; dirIn = [(p1[0] - p0[0]) / dl, (p1[1] - p0[1]) / dl];
    cur = pick.o;
    if (nodes[cur].end) cur = null; // au bout du trait : on lève le stylo
  }
  return strokes.filter(s => s.length);
}
