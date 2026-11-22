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
  levres: [33, 136], dents: [61, 135], sifflantes: [74, 146], 'racine-dents': [73, 123], gencive: [88, 116],
  palais: [118, 117], nez: [128, 97], cote: [120, 152], voile: [158, 122], luette: [183, 139],
  jawf: [200, 156], 'gorge-haut': [200, 186], 'gorge-milieu': [200, 216], 'gorge-bas': [200, 249],
};
function articulationSvg(parent, zones, onZone) {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (p, tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; p.appendChild(e); return e; };
  const wrap = h(parent, 'div', 'aa-al-svgwrap');
  const svg = mk(wrap, 'svg', { viewBox: '10 0 310 310', class: 'aa-al-svg', role: 'img', 'aria-label': 'Schéma de la bouche et de la gorge, vu de profil' });
  const g = mk(svg, 'g', { class: 'aa-al-anat' });
  // tête et cou
  mk(g, 'path', { class: 'aa-al-skin', d: 'M120 12 C70 12 48 40 46 70 L44 84 C40 90 28 100 24 108 C22 113 28 116 38 117 L40 121 C35 124 35 129 40 131 L43 134 C37 137 37 143 43 146 L46 150 C44 162 46 176 58 186 C70 194 92 196 112 196 L140 200 C150 220 156 250 158 310 L236 310 C232 280 232 240 240 200 C270 180 286 150 280 110 C270 40 200 8 120 12 Z' });
  // fosses nasales
  mk(g, 'path', { class: 'aa-al-nose', d: 'M40 113 C62 95 110 85 160 89 C190 91 205 100 211 113 C192 109 176 107 168 111 C130 105 92 109 62 119 Z' });
  // bouche + gorge (cavité)
  mk(g, 'path', { class: 'aa-al-cavity', d: 'M58 124 C80 112 130 106 168 112 C184 116 193 128 194 142 C200 150 206 152 212 150 L212 300 L188 300 C186 270 184 240 182 210 C186 196 188 170 186 150 C180 136 160 128 130 128 C104 128 84 130 66 138 Z' });
  // langue
  mk(g, 'path', { class: 'aa-al-tongue', d: 'M64 141 C70 133 86 130 104 130 C132 128 160 131 174 142 C186 152 189 170 187 186 C186 196 184 202 182 208 C160 198 130 188 102 178 C84 171 72 162 64 150 Z' });
  // palais dur, voile, luette
  mk(g, 'path', { class: 'aa-al-line', d: 'M63 125 C70 117 80 113 96 111 C120 108 146 108 168 112 C182 116 191 126 194 140' });
  mk(g, 'ellipse', { class: 'aa-al-uvula', cx: 194, cy: 143, rx: 3, ry: 5 });
  // dents et lèvres
  mk(g, 'path', { class: 'aa-al-teeth', d: 'M57 118 L66 121 L64 133 L56 132 Z' });
  mk(g, 'path', { class: 'aa-al-teeth', d: 'M57 139 L64 138 L66 151 L58 152 Z' });
  mk(g, 'path', { class: 'aa-al-lip', d: 'M39 120 C48 117 56 119 58 124 C54 131 46 133 40 131 Z' });
  mk(g, 'path', { class: 'aa-al-lip', d: 'M42 143 C48 138 56 138 58 142 C56 150 48 153 44 151 Z' });
  // épiglotte, cordes vocales
  mk(g, 'path', { class: 'aa-al-line', d: 'M182 208 C186 198 192 194 197 196' });
  mk(g, 'path', { class: 'aa-al-line aa-al-folds', d: 'M186 258 L198 253 M212 258 L202 253' });
  // légendes anatomiques
  const lab = (x, y, t, anchor) => mk(g, 'text', { x, y, class: 'aa-al-lab', 'text-anchor': anchor || 'start' }, t);
  lab(150, 80, 'nez'); lab(176, 106, 'voile'); lab(110, 170, 'langue'); lab(18, 158, 'lèvres');
  lab(222, 190, 'gorge'); lab(244, 262, 'cordes vocales'); lab(222, 150, 'luette');
  // zones
  const marks = {};
  zones.forEach((z, i) => {
    const pos = AL_ZONE_POS[z.id]; if (!pos) return;
    const m = mk(svg, 'g', { class: 'aa-al-zone', tabindex: 0, role: 'button', 'data-zone': z.id });
    mk(m, 'title', {}, z.name);
    mk(m, 'circle', { cx: pos[0], cy: pos[1], r: 7.5 });
    mk(m, 'text', { x: pos[0], y: pos[1] + 3.2, 'text-anchor': 'middle' }, String(i + 1));
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
  const modes = [['letters', '🔤 Les lettres'], ['mouth', '👄 D\'où vient le son'], ['pairs', '👂 Sons à ne pas confondre'], ['quiz', '🎯 S\'entraîner']];
  state.mode = state.mode || 'letters';
  modes.forEach(([m, label]) => btn(bar, label, () => { state.mode = m; renderAlphabetTab(ctx, root, state); }, state.mode === m ? 'mod-cta' : 'aa-btn-quiet'));
  const body = h(root, 'div', 'aa-al-body');
  if (state.mode === 'pairs') return renderAlphaPairs(ctx, body, A);
  if (state.mode === 'quiz') return renderAlphaQuiz(ctx, body, A, state);

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
  const ft = h(c, 'table', 'aa-table aa-al-forms');
  const fh = h(ft, 'tr'); const fr = h(ft, 'tr');
  letterForms(L).forEach(([lab, f]) => { h(fh, 'th', null, lab); arSpan(h(fr, 'td'), f, 'aa-al-big'); });
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
  const bar = h(el, 'div', 'aa-actions');
  kinds.forEach(([k, l]) => btn(bar, l, () => { state.qk = k; state.q = null; clear(el); renderAlphaQuiz(ctx, el, A, state); }, state.qk === k ? 'mod-cta' : 'aa-btn-quiet'));
  state.score = state.score || { ok: 0, n: 0 };
  const sc = h(el, 'div', 'aa-muted aa-small', 'Score : ' + state.score.ok + ' / ' + state.score.n);
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
  const ans = h(box, 'div', 'aa-al-opts');
  const fb = h(box, 'div');
  let done = false;
  opts.forEach(o => {
    const b = btn(ans, o, () => {
      if (done) return; done = true;
      const ok = o === good; state.score.n++; if (ok) state.score.ok++;
      sc.textContent = 'Score : ' + state.score.ok + ' / ' + state.score.n;
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
