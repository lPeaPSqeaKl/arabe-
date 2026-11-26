/* ====================================================================
 * 06g - Onglet Alphabet : les lettres, leur prononciation, et le schéma
 * de la bouche et de la gorge (d'où sort chaque son : makhārij).
 * Le texte est dans content/<langue>/alphabet.json (pas dans le code).
 * ==================================================================== */
function alphaData() { return (CONTENT[UI_LANG] && CONTENT[UI_LANG].alphabet) || CONTENT.fr.alphabet; }
const AL_ZWJ = '‍';
function letterForms(L) {
  if (L.l === 'ء') return [['seule', L.l]];
  if (!L.join) return [['seule', L.l], ['à la fin', AL_ZWJ + L.l]];
  return [['seule', L.l], ['au début', L.l + AL_ZWJ], ['au milieu', AL_ZWJ + L.l + AL_ZWJ], ['à la fin', AL_ZWJ + L.l]];
}
const AL_VOW = ['َ', 'ِ', 'ُ'];
function letterSyllables(L) {
  if (L.l === 'ا') return 'بَا';
  const b = L.l === 'ء' ? 'أ' : L.l;
  return AL_VOW.map(v => b + v).join(' ');
}

/* Coupe de profil de la tête (on regarde vers la gauche) avec les zones cliquables */
const AL_ZONE_POS = {
  levres: [30, 200], dents: [80, 202], sifflantes: [88, 220], 'racine-dents': [84, 182], gencive: [106, 172],
  palais: [146, 172], nez: [168, 150], cote: [140, 226], voile: [204, 184], luette: [226, 212],
  jawf: [257, 238], 'gorge-haut': [257, 264], 'gorge-milieu': [256, 290], 'gorge-bas': [255, 318],
};
function articulationSvg(parent, zones, onZone) {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (p, tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; p.appendChild(e); return e; };
  const uid = 'aal' + Math.random().toString(36).slice(2, 7);
  const wrap = h(parent, 'div', 'aa-al-svgwrap');
  const svg = mk(wrap, 'svg', { viewBox: '0 0 360 380', class: 'aa-al-svg', role: 'img', 'aria-label': 'Schéma de la bouche et de la gorge, vu de profil' });
  const defs = mk(svg, 'defs', {});
  const grad = (id, x1, y1, x2, y2, stops) => { const g = mk(defs, 'linearGradient', { id: uid + id, x1, y1, x2, y2 }); stops.forEach(([o, c, a]) => mk(g, 'stop', { offset: o, 'stop-color': c, 'stop-opacity': a == null ? 1 : a })); };
  grad('skin', '0', '0', '1', '1', [['0', '#f6d5c3'], ['1', '#e9b8a0']]);
  grad('tongue', '0', '0', '1', '1', [['0', '#f08a96'], ['1', '#c9566a']]);
  grad('air', '0', '0', '0', '1', [['0', '#7d3b4a'], ['1', '#5a2834']]);
  grad('nose', '0', '0', '1', '0', [['0', '#cfe0f5'], ['1', '#b9cdea']]);
  const rg = mk(defs, 'radialGradient', { id: uid + 'bg', cx: '.5', cy: '.45', r: '.6' });
  mk(rg, 'stop', { offset: '0', 'stop-color': 'var(--interactive-accent)', 'stop-opacity': '.10' });
  mk(rg, 'stop', { offset: '1', 'stop-color': 'var(--interactive-accent)', 'stop-opacity': '0' });
  const U = id => 'url(#' + uid + id + ')';
  const g = mk(svg, 'g', { class: 'aa-al-anat' });
  mk(g, 'circle', { cx: 190, cy: 190, r: 185, fill: U('bg') });
  // tête et cou
  mk(g, 'path', { class: 'aa-ad-skin', fill: U('skin'), d: 'M150 18 C95 18 62 52 60 98 C59 112 56 120 50 128 C44 138 34 150 28 160 C25 166 28 172 36 173 L46 174 C48 178 46 182 44 184 C38 188 38 194 44 196 L47 198 C40 202 40 210 47 213 C52 220 50 228 52 236 C54 250 66 258 84 260 C110 262 140 262 160 266 C168 290 172 330 172 380 L300 380 C296 340 296 300 306 270 C340 240 352 190 346 140 C336 60 260 16 150 18 Z' });
  // œil et oreille (discrets)
  mk(g, 'path', { class: 'aa-ad-face', d: 'M96 104 C104 98 116 98 124 104 C116 108 104 108 96 104 Z' });
  mk(g, 'path', { class: 'aa-ad-face', d: 'M96 92 C106 86 118 86 128 90' });
  mk(g, 'path', { class: 'aa-ad-face', d: 'M282 104 C298 98 310 110 306 128 C304 142 294 146 288 140' });
  // fosses nasales
  mk(g, 'path', { class: 'aa-ad-nose', fill: U('nose'), d: 'M48 172 C70 150 112 138 170 138 C214 138 246 148 268 172 C250 168 224 166 200 168 C152 162 102 164 64 178 Z' });
  // conduit d'air : bouche, gorge, trachée
  mk(g, 'path', { class: 'aa-ad-air', fill: U('air'), d: 'M62 194 C86 178 150 170 200 174 C226 180 240 196 242 214 C246 222 256 222 260 210 L262 176 C264 166 272 166 274 176 L276 380 L236 380 C236 330 232 300 230 286 C224 280 220 276 216 272 C180 262 120 244 80 238 C70 236 64 232 62 228 Z' });
  // langue
  mk(g, 'path', { class: 'aa-ad-tongue', fill: U('tongue'), d: 'M64 214 C70 200 90 194 116 193 C160 192 200 198 222 214 C238 228 242 250 238 272 C236 282 232 288 226 292 C200 288 150 270 112 256 C90 248 72 238 64 226 Z' });
  mk(g, 'path', { class: 'aa-ad-tongue-line', d: 'M92 212 C130 206 180 210 214 230' });
  // palais dur (os) et voile du palais + luette
  mk(g, 'path', { class: 'aa-ad-bone', d: 'M64 188 C74 176 92 170 116 168 C150 165 180 166 200 170' });
  mk(g, 'path', { class: 'aa-ad-velum', d: 'M200 170 C222 176 236 190 240 208' });
  mk(g, 'ellipse', { class: 'aa-ad-uvula', cx: 241, cy: 214, rx: 4, ry: 7 });
  // dents et lèvres
  mk(g, 'path', { class: 'aa-ad-teeth', d: 'M60 182 C64 180 70 182 72 186 L70 200 C66 202 62 201 60 199 Z' });
  mk(g, 'path', { class: 'aa-ad-teeth', d: 'M60 206 C64 204 70 205 71 208 L72 222 C68 224 63 223 61 221 Z' });
  mk(g, 'path', { class: 'aa-ad-lip', d: 'M42 184 C52 180 60 182 62 188 C60 196 52 198 44 196 C40 194 40 188 42 184 Z' });
  mk(g, 'path', { class: 'aa-ad-lip', d: 'M44 200 C52 198 60 200 62 206 C60 214 52 216 46 214 C42 210 42 204 44 200 Z' });
  // épiglotte, cordes vocales, anneaux de la trachée
  mk(g, 'path', { class: 'aa-ad-epi', d: 'M228 290 C234 276 244 268 254 270' });
  mk(g, 'path', { class: 'aa-ad-folds', d: 'M236 322 L252 317 M276 322 L260 317' });
  [342, 356, 370].forEach(y => mk(g, 'path', { class: 'aa-ad-ring', d: 'M238 ' + y + ' C250 ' + (y + 3) + ' 262 ' + (y + 3) + ' 274 ' + y }));
  // légendes
  const lab = (x, y, t, anchor, line) => { if (line) mk(g, 'path', { class: 'aa-ad-leader', d: line }); return mk(g, 'text', { x, y, class: 'aa-ad-lab', 'text-anchor': anchor || 'start' }, t); };
  lab(100, 156, 'nez');
  lab(170, 236, 'langue', 'middle');
  lab(6, 236, 'lèvres', 'start', 'M22 228 L36 210').classList.add('aa-ad-out');
  lab(318, 214, 'luette', 'start', 'M246 214 L314 214');
  lab(318, 266, 'gorge', 'start', 'M270 266 L314 266');
  lab(318, 322, 'cordes', 'start', 'M276 320 L314 320');
  lab(318, 334, 'vocales', 'start');
  // zones
  const marks = {};
  zones.forEach((z, i) => {
    const pos = AL_ZONE_POS[z.id]; if (!pos) return;
    const m = mk(svg, 'g', { class: 'aa-al-zone', tabindex: 0, role: 'button', 'data-zone': z.id, transform: 'translate(' + pos[0] + ' ' + pos[1] + ')' });
    mk(m, 'title', {}, z.name);
    mk(m, 'circle', { class: 'aa-al-halo', r: 14 });
    mk(m, 'circle', { class: 'aa-al-dot', r: 8.5 });
    mk(m, 'text', { y: 3.4, 'text-anchor': 'middle' }, String(i + 1));
    const go = (ev) => { ev.preventDefault(); ev.stopPropagation(); onZone(z.id); };
    m.addEventListener('click', go);
    m.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); });
    marks[z.id] = m;
  });
  return { wrap, light(ids) { Object.keys(marks).forEach(k => marks[k].classList.toggle('aa-on', ids.includes(k))); } };
}

function renderAlphabetTab(ctx, root, state) {
  clear(root);
  const A = alphaData();
  const zoneById = id => A.zones.find(z => z.id === id);
  mdText(root, 'p', 'aa-help', A.intro);
  const bar = h(root, 'div', 'aa-actions');
  const modes = [['letters', '🔤 Les lettres'], ['mouth', '👄 D\'où vient le son'], ['pairs', '👂 Sons à ne pas confondre'], ['fonts', '🖋 Comparer les polices'], ['quiz', '🎯 S\'entraîner']];
  state.mode = state.mode || 'letters';
  modes.forEach(([m, label]) => btn(bar, label, () => { state.mode = m; renderAlphabetTab(ctx, root, state); }, state.mode === m ? 'mod-cta' : 'aa-btn-quiet'));
  const body = h(root, 'div', 'aa-al-body');
  if (state.mode === 'pairs') return renderAlphaPairs(ctx, body, A);
  if (state.mode === 'quiz') return renderAlphaQuiz(ctx, body, A, state);
  if (state.mode === 'fonts') return renderAlphaFonts(ctx, body, A, state);

  const layout = h(body, 'div', 'aa-al-layout' + (state.mode === 'mouth' ? ' aa-al-mouthfirst' : ''));
  const left = h(layout, 'div', 'aa-al-left');
  const right = h(layout, 'div', 'aa-al-right');
  // grille des lettres (ordre de l'alphabet, de droite à gauche)
  const grid = h(left, 'div', 'aa-al-grid'); grid.setAttribute('dir', 'rtl');
  const cells = {};
  A.letters.forEach(L => {
    const c = h(grid, 'button', 'aa-al-cell' + (L.heavy ? ' aa-al-heavy' : ''));
    arSpan(c, L.l, 'aa-al-big');
    h(c, 'span', 'aa-al-cname', L.name);
    c.title = L.name + ' : ' + L.son;
    c.addEventListener('click', ev => { ev.preventDefault(); state.letter = L.l; state.zone = null; draw(); });
    cells[L.l] = c;
  });
  h(left, 'div', 'aa-muted aa-small', 'Lettres en couleur : lettres lourdes. Touche une lettre pour tout savoir sur elle.');
  // schéma
  const diag = h(state.mode === 'mouth' ? left : right, 'div', 'aa-al-diag');
  if (state.mode === 'mouth') left.insertBefore(diag, grid);
  h(diag, 'div', 'aa-al-diag-title', 'La bouche et la gorge, vues de profil');
  const svg = articulationSvg(diag, A.zones, id => { state.zone = state.zone === id ? null : id; state.letter = null; draw(); });
  const zl = h(diag, 'ol', 'aa-al-zlist');
  A.zones.forEach(z => { const li = h(zl, 'li'); const a = h(li, 'a', 'aa-link', z.name); a.addEventListener('click', ev => { ev.preventDefault(); state.zone = z.id; state.letter = null; draw(); }); li.dataset.zone = z.id; });
  const panel = h(right, 'div', 'aa-al-panel');
  if (state.mode === 'mouth') right.insertBefore(panel, right.firstChild);
  else right.insertBefore(panel, diag);

  const draw = () => {
    clear(panel);
    const L = state.letter ? A.letters.find(x => x.l === state.letter) : null;
    const zones = L ? L.z : state.zone ? [state.zone] : [];
    svg.light(zones);
    zl.querySelectorAll('li').forEach(li => li.classList.toggle('aa-on', zones.includes(li.dataset.zone)));
    Object.keys(cells).forEach(k => {
      const x = A.letters.find(y => y.l === k);
      cells[k].classList.toggle('aa-on', L ? k === L.l : !!state.zone && x.z.includes(state.zone));
      cells[k].classList.toggle('aa-dim', !L && !!state.zone && !x.z.includes(state.zone));
    });
    if (L) renderLetterCard(ctx, panel, L, A, id => { state.zone = id; state.letter = null; draw(); });
    else if (state.zone) renderZoneCard(ctx, panel, zoneById(state.zone), A, l => { state.letter = l; state.zone = null; draw(); });
    else {
      const p = h(panel, 'div', 'aa-al-card aa-muted');
      mdText(p, 'p', null, state.mode === 'mouth' ? 'Touche un **numéro** sur le schéma : tu verras quelles lettres sortent de là, et comment placer ta langue.' : 'Touche une **lettre** : sa prononciation, ses formes, d\'où vient le son, et un exemple du Coran à écouter.');
      mdText(p, 'p', 'aa-small', A.heavy);
      mdText(p, 'p', 'aa-small', A.noJoin);
    }
  };
  draw();
}

function renderLetterCard(ctx, parent, L, A, openZone) {
  useMark(ctx, 'letter', L.l);
  const c = h(parent, 'div', 'aa-al-card');
  const top = h(c, 'div', 'aa-al-top');
  arSpan(top, L.l, 'aa-al-huge');
  const id = h(top, 'div');
  h(id, 'div', 'aa-al-name', L.name + '  ·  ' + L.tr);
  arSpan(id, L.nameAr, 'aa-mid');
  const snd = h(id, 'div', 'aa-actions');
  btn(snd, '🔊 Le nom', () => speak(L.nameAr), 'aa-btn-quiet');
  btn(snd, '🔊 ' + (L.l === 'ا' ? 'bā' : L.tr.split(' ')[0] + 'a ' + L.tr.split(' ')[0] + 'i ' + L.tr.split(' ')[0] + 'u'), () => speak(letterSyllables(L)), 'aa-btn-quiet');
  const tags = h(c, 'div', 'aa-al-tags');
  if (L.heavy) h(tags, 'span', 'aa-al-tag aa-al-tag-heavy', 'lettre lourde');
  if (L.sun) h(tags, 'span', 'aa-al-tag', 'solaire : le l de al- est muet devant elle');
  else if (L.l !== 'ء' && L.l !== 'ا') h(tags, 'span', 'aa-al-tag', 'lunaire : on dit al- devant elle');
  if (!L.join && L.l !== 'ء') h(tags, 'span', 'aa-al-tag', 'ne s\'attache pas à gauche');
  if ('قطبجد'.includes(L.l)) h(tags, 'span', 'aa-al-tag', 'qalqala');
  mdText(c, 'p', 'aa-al-son', '**Le son :** ' + L.son);
  mdText(c, 'p', null, '**Comment faire :** ' + L.how);
  const zp = h(c, 'p'); h(zp, 'b', null, 'D\'où il sort : ');
  L.z.forEach((zid, i) => { const z = A.zones.find(x => x.id === zid); if (i) zp.appendChild(document.createTextNode(' + ')); const a = h(zp, 'a', 'aa-link', z.name.toLowerCase()); a.addEventListener('click', ev => { ev.preventDefault(); openZone(zid); }); });
  // formes
  h(c, 'h4', 'aa-al-fh', 'Ses 4 formes, avec un mot du Coran');
  mdText(c, 'p', 'aa-muted aa-small', L.join || L.l === 'ء'
    ? 'Une lettre change un peu de forme selon sa place : **seule**, **au début** (attachée à la lettre suivante), **au milieu** (attachée des deux côtés) ou **à la fin** (attachée à la lettre d\'avant). Cherche-la dans chaque mot.'
    : 'Cette lettre **ne s\'attache jamais à la lettre suivante**. Elle n\'a donc que 2 formes : au début elle garde sa forme seule, et au milieu elle a sa forme de fin. Cherche-la dans chaque mot.');
  const fg = h(c, 'div', 'aa-al-fgrid');
  const EXF = (typeof ALPHA_FORM_EX !== 'undefined' && ALPHA_FORM_EX[L.l]) || [];
  const F4 = L.join ? letterForms(L) : [['seule', L.l], ['au début', L.l], ['au milieu', L.l === 'ء' ? L.l : AL_ZWJ + L.l], ['à la fin', L.l === 'ء' ? L.l : AL_ZWJ + L.l]];
  F4.forEach(([lab, f], k) => {
    const cell = h(fg, 'div', 'aa-al-fcell');
    h(cell, 'div', 'aa-al-flab', lab);
    arSpan(cell, f, 'aa-al-big');
    const e = EXF[k];
    if (e && ctx.data && ctx.data.lemmas[e[1]]) {
      const w = h(cell, 'div', 'aa-al-fword'); arSpan(w, e[0], 'aa-mid');
      h(cell, 'div', 'aa-tr aa-small', translitPhrase([e[0]], ctx.settings.style));
      h(cell, 'div', 'aa-muted aa-small', '« ' + String(ctx.data.lemmas[e[1]][4]).split(/[;,]/)[0].trim() + ' »');
      cell.classList.add('aa-al-fclick'); cell.title = 'Écouter';
      cell.addEventListener('click', () => speak(e[0]));
    } else h(cell, 'div', 'aa-muted aa-small aa-al-fnone', L.l === 'ء' ? 'au milieu, la hamza se pose sur un support : ـأ ـؤ ـئ' : 'pas d\'exemple simple');
  });
  { const cf = h(c, 'div', 'aa-actions'); btn(cf, '🖋 Voir cette lettre dans toutes les polices', () => { if (ctx.openTab) ctx.openTab('alphabet', { mode: 'fonts', cmp: L.join ? [L.l, L.l + AL_ZWJ, AL_ZWJ + L.l + AL_ZWJ, AL_ZWJ + L.l].join('   ') : L.l + '   ' + AL_ZWJ + L.l }); }, 'aa-btn-quiet'); }
  if (L.l === 'ي') mdText(c, 'p', 'aa-muted aa-small', 'Dans le Coran, le **ي** à la fin d\'un mot s\'écrit souvent **sans ses deux points** : ى (on l\'appelle alif maqṣūra quand il se prononce ā).');
  // exemple
  const ex = h(c, 'div', 'aa-al-ex');
  h(ex, 'b', null, 'Exemple : ');
  arSpan(ex, L.ex[0], 'aa-mid');
  h(ex, 'span', 'aa-tr', ' ' + L.ex[1] + ' ');
  h(ex, 'span', null, '« ' + L.ex[2] + ' »');
  soundBtn(ex, () => speak(L.ex[0]));
  const near = (A.pairs || []).filter(p => p[0] === L.l || p[1] === L.l);
  if (near.length) {
    const np = h(c, 'p', 'aa-small'); h(np, 'b', null, 'À ne pas confondre avec : ');
    near.forEach((p, i) => { const o = p[0] === L.l ? p[1] : p[0]; if (i) np.appendChild(document.createTextNode(', ')); arSpan(np, o, 'aa-mid'); np.appendChild(document.createTextNode(' (' + p[2] + ')')); });
  }
  if (L.heavy || L.sun) {
    const rl = h(c, 'div', 'aa-actions');
    if (L.sun || L.l === 'ل') btn(rl, 'Règle : lettres solaires', () => ctx.openRule('solaires'), 'aa-btn-quiet');
    if ('قطبجد'.includes(L.l)) btn(rl, 'Règle : qalqala', () => ctx.openRule('qalqala'), 'aa-btn-quiet');
  }
  if ((L.l === 'ن' || L.l === 'م') && ctx.openRule) btn(h(c, 'div', 'aa-actions'), 'Règle : ghunna (le nez)', () => ctx.openRule('ghunna'), 'aa-btn-quiet');
  if (parent.scrollIntoView && window.innerWidth < 700) setTimeout(() => c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30);
}

function renderZoneCard(ctx, parent, z, A, openLetter) {
  useMark(ctx, 'zone', z.id);
  const c = h(parent, 'div', 'aa-al-card');
  const n = A.zones.indexOf(z) + 1;
  h(c, 'div', 'aa-al-name', n + '. ' + z.name);
  const ar = h(c, 'div'); arSpan(ar, z.ar, 'aa-mid'); h(ar, 'span', 'aa-tr', '  ' + z.tr);
  mdText(c, 'p', null, z.desc);
  mdText(c, 'p', null, '**Comment faire :** ' + z.how);
  const ls = A.letters.filter(L => L.z.includes(z.id));
  if (ls.length) {
    h(c, 'b', null, 'Les lettres qui sortent d\'ici :');
    const row = h(c, 'div', 'aa-al-zletters');
    ls.forEach(L => {
      const b = h(row, 'button', 'aa-al-cell' + (L.heavy ? ' aa-al-heavy' : ''));
      arSpan(b, L.l, 'aa-al-big'); h(b, 'span', 'aa-al-cname', L.name);
      b.addEventListener('click', ev => { ev.preventDefault(); openLetter(L.l); });
    });
    const s = h(c, 'div', 'aa-actions');
    btn(s, '🔊 Écouter ces lettres', () => speak(ls.filter(L => L.l !== 'ا').map(letterSyllables).join(' ، ')), 'aa-btn-quiet');
  }
  if (z.id === 'nez') btn(h(c, 'div', 'aa-actions'), 'Règle : ghunna', () => ctx.openRule('ghunna'), 'aa-btn-quiet');
  if (z.id === 'jawf') btn(h(c, 'div', 'aa-actions'), 'Règle : voyelles longues (madd)', () => ctx.openRule('madd'), 'aa-btn-quiet');
}

function renderAlphaPairs(ctx, el, A) {
  useMark(ctx, 'pairs', 1);
  mdText(el, 'p', 'aa-help', 'Ces lettres se ressemblent à l\'oreille pour un francophone, mais changent le sens du mot. Écoute les deux l\'une après l\'autre, puis répète.');
  const t = h(el, 'table', 'aa-table aa-al-pairs');
  const hr = h(t, 'tr'); ['', '', 'La différence', ''].forEach(x => h(hr, 'th', null, x));
  A.pairs.forEach(([a, b, d]) => {
    const La = A.letters.find(x => x.l === a), Lb = A.letters.find(x => x.l === b);
    const r = h(t, 'tr');
    [La, Lb].forEach(L => { const td = h(r, 'td'); arSpan(td, L.l, 'aa-al-big'); h(td, 'div', 'aa-small aa-muted', L.name); });
    const td = h(r, 'td'); h(td, 'div', null, d);
    h(td, 'div', 'aa-small aa-muted', La.son + '  /  ' + Lb.son);
    const s = h(r, 'td'); btn(s, '🔊', () => speak(letterSyllables(La) + ' ، ' + letterSyllables(Lb)), 'aa-btn-quiet aa-sound');
  });
  mdText(el, 'p', 'aa-muted aa-small', 'Le son vient de la voix de ton appareil. Sur iPad : Réglages › Accessibilité › Contenu énoncé › Voix › Arabe, pour installer une voix arabe.');
}

function renderAlphaQuiz(ctx, el, A, state) {
  const kinds = [['name', 'Quelle est cette lettre ?'], ['zone', 'D\'où sort ce son ?'], ['form', 'Retrouve la lettre dans le mot']];
  state.qk = state.qk || 'name';
  const bar = h(el, 'div', 'aa-actions aa-al-qbar');
  kinds.forEach(([k, l]) => btn(bar, l, () => { state.qk = k; state.q = null; clear(el); renderAlphaQuiz(ctx, el, A, state); }, state.qk === k ? 'mod-cta' : 'aa-btn-quiet'));
  // un score par exercice
  state.scores = state.scores || {}; const score = state.scores[state.qk] || (state.scores[state.qk] = { ok: 0, n: 0 });
  const sc = h(el, 'div', 'aa-muted aa-small', 'Score : ' + score.ok + ' / ' + score.n);
  const box = h(el, 'div', 'aa-al-card');
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const pool = A.letters.filter(L => L.l !== 'ء');
  const L = pick(pool);
  let question, good, opts;
  if (state.qk === 'zone') {
    const z = L.z.filter(x => x !== 'nez' && x !== 'jawf')[0] || L.z[0];
    good = A.zones.find(x => x.id === z).name;
    opts = shuffle([good].concat(shuffle(A.zones.filter(x => !L.z.includes(x.id) && x.id !== 'nez').map(x => x.name)).slice(0, 3)));
    question = 'D\'où sort le son de cette lettre ?';
  } else if (state.qk === 'form') {
    const forms = letterForms(L).slice(1);
    const f = forms.length ? pick(forms) : ['seule', L.l];
    good = L.name;
    const near = shuffle(pool.filter(x => x !== L)).slice(0, 3).map(x => x.name);
    opts = shuffle([good].concat(near));
    question = 'Quelle lettre est écrite ici (' + f[0] + ' du mot) ?';
    L._show = f[1];
  } else {
    good = L.name + ' (' + L.tr + ')';
    const sim = (A.pairs || []).filter(p => p.includes(L.l)).map(p => p[0] === L.l ? p[1] : p[0]);
    const others = shuffle(pool.filter(x => x !== L && !sim.includes(x.l))).slice(0, 3 - Math.min(sim.length, 2));
    opts = shuffle([good].concat(sim.slice(0, 2).map(l => { const x = A.letters.find(y => y.l === l); return x.name + ' (' + x.tr + ')'; }), others.map(x => x.name + ' (' + x.tr + ')')));
    question = 'Comment s\'appelle cette lettre, et quel son fait-elle ?';
  }
  h(box, 'p', null, question);
  arSpan(h(box, 'div', 'aa-al-qletter'), L._show || L.l, 'aa-al-huge');
  delete L._show;
  const ans = h(box, 'div', 'aa-al-opts' + (opts.some(o => o.length > 28) ? ' aa-al-long' : ''));
  const fb = h(box, 'div');
  let done = false;
  opts.forEach(o => {
    const b = btn(ans, o, () => {
      if (done) return; done = true;
      const ok = o === good; score.n++; if (ok) { score.ok++; const AQ = ctx.settings.alphaQ || (ctx.settings.alphaQ = {}); AQ[state.qk] = (AQ[state.qk] || 0) + 1; ctx.settings.alphaOk = (ctx.settings.alphaOk || 0) + 1; if (ctx.markActivity) ctx.markActivity('l'); else ctx.save(); }
      sc.textContent = 'Score : ' + score.ok + ' / ' + score.n;
      b.classList.add(ok ? 'aa-good' : 'aa-bad');
      ans.querySelectorAll('button').forEach(x => { if (x.textContent === good) x.classList.add('aa-good'); });
      mdText(fb, 'p', null, (ok ? '✅ Oui ! ' : '❌ C\'était **' + good + '**. ') + L.name + ' : ' + L.son + '.');
      const nx = h(fb, 'div', 'aa-actions');
      btn(nx, '🔊 Écouter', () => speak(letterSyllables(L)), 'aa-btn-quiet');
      btn(nx, 'Voir la fiche de la lettre', () => { state.mode = 'letters'; state.letter = L.l; ctx.openTab ? ctx.openTab('alphabet', { mode: 'letters', letter: L.l }) : null; }, 'aa-btn-quiet');
      btn(nx, 'Suivante →', () => { clear(el); renderAlphaQuiz(ctx, el, A, state); }, 'mod-cta');
    }, 'aa-btn-quiet');
  });
}

/* ---------- Comparer les polices : le même texte dans toutes les polices ---------- */
const FONT_GROUPS = [
  ['learn', '✍️ Pour apprendre et recopier', 'Le naskh : le style des livres et de l\'école. Lettres nettes, points bien placés. C\'est le modèle à recopier.', ['naskh', 'scheherazade', 'amiri', 'amiri-classic', 'lateef', 'mirza', 'harmattan']],
  ['hand', '🖊 L\'écriture à la main de tous les jours', 'Le ruqʿa : plus rapide et plus simple. Les points se lient souvent en un petit trait.', ['ruqaa']],
  ['art', '🎨 Pour le plaisir des yeux', 'Des styles d\'art : la forme des lettres change beaucoup. À regarder, pas encore à recopier.', ['maghribi', 'kufi', 'kufam', 'nastaliq', 'gulzar', 'katibeh', 'rakkas', 'lalezar']],
];
function renderAlphaFonts(ctx, body, A, state) {
  const S = ctx.settings;
  mdText(body, 'p', 'aa-muted', 'Le même texte dans **toutes les polices**. Regarde ce qui **ne change jamais** : le squelette de la lettre, le **nombre et la place des points**, et quelles lettres s\'attachent. Ce qui change : la hauteur, l\'épaisseur, les courbes.');
  const SAMPLES = [['بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'Bismillāh'], ['كِتَابٌ', 'kitāb (un livre)'], ['سَلَامٌ عَلَيْكُمْ', 'salām'], ['قُلْ هُوَ ٱللَّهُ أَحَدٌ', '112:1'], ['ب ت ث ن ي', 'les lettres à points'], ['ج ح خ ع غ', 'les lettres rondes'], ['ف ق', 'fā et qāf']];
  const bar = h(body, 'div', 'aa-al-cmpbar');
  const inp = h(bar, 'input', 'aa-input aa-al-cmpin'); inp.setAttribute('dir', 'rtl'); inp.placeholder = 'Tape un mot arabe…';
  inp.value = state.cmp || SAMPLES[0][0];
  const chips = h(body, 'div', 'aa-al-cmpchips');
  SAMPLES.forEach(([t, lab]) => { const b = btn(chips, lab, () => { inp.value = t; paint(); }, 'aa-btn-quiet'); b.title = t; });
  const opt = h(body, 'div', 'aa-toggles');
  let bare = !!state.cmpBare;
  checkbox(opt, 'sans voyelles (comme on écrit à la main)', bare, v => { bare = state.cmpBare = v; paint(); });
  const out = h(body, 'div');
  const paint = () => {
    state.cmp = inp.value; clear(out);
    const txt = bare ? noVowels(inp.value) : inp.value;
    FONT_GROUPS.forEach(([gid, title, what, ids]) => {
      h(out, 'h4', 'aa-al-cmph', title);
      h(out, 'p', 'aa-muted aa-small', what);
      const grid = h(out, 'div', 'aa-al-cmpgrid');
      ids.forEach(id => {
        const f = AR_FONTS.find(x => x[0] === id); if (!f) return;
        ensureFont(id).catch(() => {});
        const card = h(grid, 'div', 'aa-al-cmpcard aa-root aa-font-' + id + ((S.arFont || 'amiri') === id ? ' aa-al-cmpon' : ''));
        const top = h(card, 'div', 'aa-al-cmptop'); h(top, 'b', null, f[1].replace(/ \(.*\)$/, ''));
        if ((S.arFont || 'amiri') === id) h(top, 'span', 'aa-tag', 'ta police');
        const a = h(card, 'div', 'aa-ar aa-al-cmptxt', txt); a.setAttribute('dir', 'rtl'); a.setAttribute('lang', 'ar');
        h(card, 'div', 'aa-muted aa-small', f[2]);
        if ((S.arFont || 'amiri') !== id) btn(card, 'Utiliser cette police', () => { S.arFont = id; ctx.save(); if (ctx.refresh) ctx.refresh(); else paint(); }, 'aa-btn-quiet');
      });
    });
  };
  inp.addEventListener('input', () => { clearTimeout(inp._t); inp._t = setTimeout(paint, 250); });
  paint();
}
