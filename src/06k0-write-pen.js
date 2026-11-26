/* ====================================================================
 * 06k0 - Le chemin du stylo : comment la main trace vraiment la lettre
 * On part de la lettre dessinée par la police, on en tire la ligne du
 * milieu (le « squelette »), puis on la parcourt comme un stylo :
 * - chaque morceau attaché est écrit de droite à gauche, en partant du haut ;
 * - chaque morceau attaché est un seul trait : pour une dent ou une hampe, on monte et on
 *   redescend sur le même trait, sans lever le stylo ;
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
  // une voyelle ou un signe (absent du texte sans voyelles) n'est jamais un corps de lettre
  comps.forEach(c => { if (!bare || c.dot) return; let inB = 0; c.px.forEach(([x, y]) => { if (bare[y * w + x]) inB++; }); c.mark0 = inB < c.px.length * 0.3; });
  comps.forEach(c => { const small = (c.y1 - c.y0) < fs * 0.45 && (c.x1 - c.x0) < fs * 0.6; c.main = !(c.mark0 && small) && (c.n >= maxN * 0.3 || (c.y1 - c.y0) >= fs * 0.3); });
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
  // 3. le chemin : tout le morceau d'UN SEUL trait, sans lever le stylo (c'est ainsi qu'on écrit
  // un morceau attaché). Là où la main doit repasser sur l'encre (monter une dent et redescendre,
  // revenir d'une hampe), on double le trait le plus court possible (problème du « postier chinois »),
  // puis on suit le tracé de droite à gauche en gardant l'élan.
  const other = (e, at) => (e.a === at ? e.b : e.a);
  const oriented = (e, at) => (e.a === at ? e.chain : e.chain.slice().reverse());
  const dirOf = (chain, rev) => { const L = chain.length; const n = Math.max(1, Math.min(L - 1, Math.round(fs * 0.1))); const p0 = rev ? chain[L - 1] : chain[0], p1 = rev ? chain[L - 1 - n] : chain[n]; const dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  const degOf = n => n.edges.reduce((s, e) => s + (e.a === e.b ? 2 : 1), 0);
  const odd = nodes.filter(n => n.edges.length && degOf(n) % 2 === 1);
  const startScore = n => n.x - n.y * 1.3 + (n.end ? fs * 0.25 : 0);
  const withEdges = nodes.filter(n => n.edges.length);
  // départ : le bout le plus en haut à droite ; arrivée : le bout le plus à gauche (la queue du mot)
  const S = (odd.length ? odd : withEdges).reduce((a, b) => (startScore(b) > startScore(a) ? b : a));
  let E = null;
  if (odd.length) { const rest = odd.filter(n => n !== S); E = rest.reduce((a, b) => ((b.x - b.y * 0.2 - (b.end ? fs * 0.1 : 0)) < (a.x - a.y * 0.2 - (a.end ? fs * 0.1 : 0)) ? b : a)); }
  // plus courts chemins entre nœuds (Dijkstra, graphe minuscule)
  const sp = (from) => { const D = new Map([[from, 0]]); const P = new Map(); const Q = [from]; const done = new Set();
    while (Q.length) { Q.sort((a, b) => D.get(a) - D.get(b)); const u = Q.shift(); if (done.has(u)) continue; done.add(u);
      for (const e of nodes[u].edges) { const v = other(e, u); const nd = D.get(u) + e.len; if (!D.has(v) || nd < D.get(v)) { D.set(v, nd); P.set(v, e); Q.push(v); } } }
    return { D, P }; };
  const pairs = odd.filter(n => n !== S && n !== E).map(n => n.id);
  if (pairs.length) {
    const SP = new Map(pairs.map(id => [id, sp(id)]));
    const dist2 = (a, b) => { const d = SP.get(a).D.get(b); return d == null ? 1e9 : d; };
    let match = [];
    if (pairs.length <= 14) { // appariement optimal (petit nombre de bouts)
      const n = pairs.length; const memo = new Map();
      const best = (mask) => { if (mask === (1 << n) - 1) return [0, []]; if (memo.has(mask)) return memo.get(mask);
        let i = 0; while (mask & (1 << i)) i++; let r = [1e18, []];
        for (let j = i + 1; j < n; j++) if (!(mask & (1 << j))) { const [c, m] = best(mask | (1 << i) | (1 << j)); const t = c + dist2(pairs[i], pairs[j]); if (t < r[0]) r = [t, [[pairs[i], pairs[j]]].concat(m)]; }
        memo.set(mask, r); return r; };
      match = best(0)[1];
    } else { const left = pairs.slice(); while (left.length > 1) { const a = left.shift(); let bj = 0; left.forEach((b, j) => { if (dist2(a, b) < dist2(a, left[bj])) bj = j; }); match.push([a, left.splice(bj, 1)[0]]); } }
    // on double les traits du chemin entre chaque paire : la main y repassera
    for (const [a, b] of match) { const { P } = SP.get(a); let v = b; let guard = 0; while (v !== a && P.has(v) && guard++ < 1000) { const e = P.get(v); const u = other(e, v); addEdge(e.chain, e.a, e.b); v = u; } }
  }
  // parcours (Fleury) : on ne prend jamais un trait qui couperait le reste, sauf s'il n'y a que lui
  const live = new Set(edges);
  const reach = (from, skip) => { const seen = new Set([from]); const st = [from]; let k = 0; while (st.length) { const u = st.pop(); for (const e of nodes[u].edges) { if (!live.has(e) || e === skip) continue; k++; const v = other(e, u); if (!seen.has(v)) { seen.add(v); st.push(v); } } } return seen; };
  const isBridge = (e, at) => { if (e.a === e.b) return false; const before = reach(at, null).size; live.delete(e); const after = reach(at, null); live.add(e); const v = other(e, at); return !after.has(v) && before > 1; };
  const stroke = []; const push = (chain) => { for (const [x, y] of chain) { const l = stroke[stroke.length - 1]; if (l && l[0] === x && l[1] === y) continue; stroke.push([x, y, R(x, y)]); } };
  let cur = S.id; let dirIn = [-1, 0.3]; let guard = 0;
  while (live.size && guard++ < 5000) {
    const cand = nodes[cur].edges.filter(e => live.has(e));
    if (!cand.length) break;
    const ok = cand.filter(e => cand.length === 1 || !isBridge(e, cur));
    const pool = ok.length ? ok : cand;
    const info = pool.map(e => {
      let ch = oriented(e, cur);
      if (e.a === e.b) { const d1 = dirOf(e.chain, false), d2 = dirOf(e.chain, true); if (d2[0] * dirIn[0] + d2[1] * dirIn[1] > d1[0] * dirIn[0] + d1[1] * dirIn[1]) ch = e.chain.slice().reverse(); }
      const d = [0, 0]; { const L = ch.length; const n = Math.max(1, Math.min(L - 1, Math.round(fs * 0.1))); const dx = ch[n][0] - ch[0][0], dy = ch[n][1] - ch[0][1]; const l = Math.hypot(dx, dy) || 1; d[0] = dx / l; d[1] = dy / l; }
      const o = other(e, cur);
      // une dent / une hampe / un petit crochet : un aller-retour (deux copies du même trait)
      const twin = [...live].some(f => f !== e && f.chain === e.chain);
      const spur = twin && nodes[o].end;
      const score = (spur ? 3 : 0) + (d[0] * dirIn[0] + d[1] * dirIn[1]) * 1.2 - d[0] * 0.6 - (E && o === E.id && live.size > 1 ? 1 : 0);
      return { e, ch, o, score };
    }).sort((a, b) => b.score - a.score);
    const pick = info[0]; live.delete(pick.e); push(pick.ch);
    const L = pick.ch.length; const n = Math.max(1, Math.min(L - 1, Math.round(fs * 0.1))); const p1 = pick.ch[L - 1], p0 = pick.ch[L - 1 - n]; const dl = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1; dirIn = [(p1[0] - p0[0]) / dl, (p1[1] - p0[1]) / dl];
    cur = pick.o;
  }
  return stroke.length ? [stroke] : [];
}
