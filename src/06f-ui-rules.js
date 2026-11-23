/* ====================================================================
 * 06f - Onglet Règles + mots cliquables qui ouvrent la règle
 * ==================================================================== */
const LESSON_RULES = {
  racine: ['racine', 'scheme'], defini: ['defini', 'tanwin', 'solaires'], cas: ['cas', 'nominatif', 'accusatif', 'genitif', 'pluriel'],
  prep: ['prep', 'genitif'], idafa: ['idafa', 'genitif'], pronoms: ['pronoms'], nominale: ['nominale', 'sujet', 'attribut'], adjectif: ['adjectif'],
  passe: ['passe'], verbale: ['verbale', 'fail', 'maful'], present: ['present', 'modes'], imperatif: ['imperatif', 'modes'], inna: ['inna', 'kana'], irab: ['irab', 'cas'],
};
const ruleById = id => RULES.find(r => r.id === id);
let TERM_INDEX = null;
function termIndex() {
  if (TERM_INDEX) return TERM_INDEX;
  TERM_INDEX = [];
  RULES.forEach(r => r.terms.forEach(t => TERM_INDEX.push([stripLatTerm(t), r.id])));
  TERM_INDEX.sort((a, b) => b[0].length - a[0].length);
  return TERM_INDEX;
}
function stripLatTerm(s) { return String(s).toLowerCase().replace(/[’']/g, '\'').trim(); }
function findRuleFor(text) {
  const t = ' ' + stripLatTerm(text) + ' ';
  for (const [term, id] of termIndex()) {
    const i = t.indexOf(term);
    if (i < 0) continue;
    const before = t[i - 1], after = t[i + term.length];
    const isW = c => c && /[a-zà-ÿʿʾḍḥṣṭẓāīūḫ0-9]/i.test(c);
    if (!isW(before) && !isW(after)) return id;
  }
  return null;
}

/* Petite fiche (utilisée dans l'onglet et dans les leçons) */
function renderRuleCard(ctx, parent, r, opts) {
  opts = opts || {};
  const box = h(parent, 'div', 'aa-rule-card' + (opts.inline ? ' aa-rule-inline' : ''));
  const top = h(box, 'div', 'aa-rule-top');
  h(top, 'b', 'aa-rule-title', r.title);
  arSpan(top, r.ar, 'aa-rule-ar');
  mdText(box, 'div', 'aa-rule-one', '💡 ' + r.one);
  r.txt.split('\n').forEach(l => mdText(box, 'div', 'aa-rule-line', l));
  if (r.ex && r.ex.length) {
    const t = h(box, 'table', 'aa-table aa-rule-ex');
    r.ex.forEach(([ar, tr, fr]) => {
      const row = h(t, 'tr');
      const c = h(row, 'td'); arSpan(c, ar, 'aa-mid');
      h(row, 'td', 'aa-tr', tr);
      const d = h(row, 'td'); addBidi(d, fr);
      const s = h(row, 'td'); soundBtn(s, () => speak(ar), 'Écouter');
    });
  }
  if (r.ru) { const ru = h(box, 'div', 'aa-rule-ru'); addBidi(ru, r.ru); }
  if (opts.inline) {
    const a = h(box, 'div', 'aa-actions');
    if (ruleDoc(r.id)) { let dbox = null; btn(a, '📖 Explication détaillée', () => { if (dbox) { dbox.remove(); dbox = null; return; } dbox = h(document.createElement('div'), 'div'); box.insertBefore(dbox, a); renderRuleDetail(ctx, dbox, r); }, 'aa-btn-quiet'); }
    btn(a, 'Ouvrir dans l\'onglet Règles', () => ctx.openRule(r.id), 'aa-btn-quiet');
    btn(a, 'Fermer', () => box.remove(), 'aa-btn-quiet');
  } else {
    const dd = details(box, '📖 Explication détaillée', !!opts.openDetail, 'aa-doc-det');
    let done = false; const fill = () => { if (done) return; done = true; renderRuleDetail(ctx, dd, r); };
    if (dd.open) fill(); dd.addEventListener('toggle', () => { if (dd.open) fill(); });
    const ls = LESSONS.filter(L => (LESSON_RULES[L.id] || []).includes(r.id));
    if (ls.length) {
      const p = h(box, 'div', 'aa-small'); h(p, 'span', 'aa-muted', 'Pour s\'entraîner : ');
      ls.forEach((L, i) => { const lk = h(p, 'a', 'aa-link', 'Leçon ' + (LESSONS.indexOf(L) + 1) + ' : ' + L.title); lk.addEventListener('click', e => { e.preventDefault(); ctx.openLesson(L.id); }); if (i < ls.length - 1) p.appendChild(document.createTextNode(' · ')); });
    }
    const a = h(box, 'div', 'aa-actions');
    btn(a, 'Insérer dans la note', () => ctx.insertText('> [!tip] ' + r.title + ' (' + r.ar + ')\n> ' + r.one.replace(/\*\*/g, '') + '\n' + r.txt.split('\n').map(l => '> ' + l).join('\n') + '\n' + (r.ex || []).map(e => '> - ' + e[0] + ' (' + e[1] + ') : ' + e[2]).join('\n') + '\n\n'), 'aa-btn-quiet');
    btn(a, 'Créer une flashcard', () => ctx.addFlashcard(r.title + ' (' + r.ar + ')', r.one.replace(/\*\*/g, '')), 'aa-btn-quiet');
  }
  return box;
}

/* Rend cliquables les mots en gras qui correspondent à une règle */
function linkTerms(ctx, root) {
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('b').forEach(b => {
    if (b.classList.contains('aa-term') || b.closest('.aa-rule-card') || b.closest('button')) return;
    const id = findRuleFor(b.textContent); if (!id) return;
    b.classList.add('aa-term'); b.title = 'Voir l\'explication : ' + ruleById(id).title;
    b.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      const block = b.closest('li, .aa-lesson-p, .aa-rule-line, .aa-why, .aa-why-txt, .aa-lesson-note, p, div') || b.parentElement;
      const nxt = block.nextSibling;
      if (nxt && nxt.classList && nxt.classList.contains('aa-rule-inline') && nxt.dataset.rule === id) { nxt.remove(); return; }
      const holder = document.createElement('div');
      block.parentNode.insertBefore(holder, block.nextSibling);
      const card = renderRuleCard(ctx, holder, ruleById(id), { inline: true });
      card.dataset.rule = id;
      holder.replaceWith(card);
    });
  });
}

function renderRulesTab(ctx, root, state) {
  clear(root);
  mdText(root, 'p', 'aa-help', 'Toutes les règles **expliquées simplement**, avec des exemples tirés du Coran. Dans les leçons et dans l\'analyse, les **mots soulignés** ouvrent directement la bonne règle.');
  const inp = h(root, 'input', 'aa-input aa-search'); inp.type = 'search'; inp.placeholder = 'Chercher une règle : génitif, annexion, kāna, muet…';
  inp.value = state.q || '';
  const out = h(root, 'div');
  const draw = () => {
    clear(out);
    const q = stripLatTerm(inp.value);
    const list = RULES.filter(r => !q || stripLatTerm(r.title + ' ' + r.one + ' ' + r.terms.join(' ')).includes(q));
    if (!list.length) { h(out, 'p', 'aa-muted', 'Aucune règle trouvée.'); return; }
    RULE_GROUPS.forEach(([g, label]) => {
      const rs = list.filter(r => r.g === g); if (!rs.length) return;
      h(out, 'h3', null, label);
      if (g === 'lecture' && ctx.openTab) { const a = h(out, 'div', 'aa-actions'); btn(a, '🔤 L\'alphabet : prononcer chaque lettre, avec le schéma de la bouche et de la gorge', () => ctx.openTab('alphabet', { mode: 'letters' }), 'aa-btn-quiet'); }
      rs.forEach(r => {
        const d = details(out, r.title + '  —  ' + r.one.replace(/\*\*/g, ''), state.open === r.id || (!!q && list.length <= 2), 'aa-rule-det');
        d.dataset.rule = r.id;
        const sm = d.querySelector('summary'); sm.textContent = ''; const st = h(sm, 'b'); addBidi(st, r.title); const so = h(sm, 'div', 'aa-muted aa-small aa-rule-sum'); addBidi(so, r.one.replace(/\*\*/g, ''));
        let filled = false;
        const fill = () => { if (filled) return; filled = true; renderRuleCard(ctx, d, r, { openDetail: state.open === r.id }); };
        if (d.open) fill();
        d.addEventListener('toggle', () => { if (d.open) fill(); });
      });
    });
    if (state.open) { const el = out.querySelector('[data-rule="' + state.open + '"]'); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); }
  };
  inp.addEventListener('input', () => { state.q = inp.value; state.open = null; draw(); });
  draw();
}

/* ====================================================================
 * Explications détaillées (content/regles/*.md) et corrections non destructives
 * ==================================================================== */
function renderDocTable(parent, rows) {
  const t = h(parent, 'table', 'aa-table aa-doc-table');
  rows.forEach((row, ri) => {
    const tr = h(t, 'tr');
    row.forEach(c => {
      const cell = h(tr, ri ? 'td' : 'th');
      if (ri && hasArabic(c) && !/[a-zA-Zéèàù]/.test(c.replace(/\*\*/g, ''))) arSpan(cell, c.replace(/\*\*/g, ''), 'aa-mid');
      else mdText(cell, 'span', null, c);
    });
  });
}
/* Langue des explications : 'fr' (les fichiers content/<langue>/ ; ce qui manque est pris en français) */
let UI_LANG = 'fr';
function ruleDoc(id) { return ((RULE_DOCS[UI_LANG] || {})[id]) || ((RULE_DOCS.fr || {})[id]) || ''; }
/* Mini-markdown : ## titres, paragraphes, listes, tableaux, > encadrés, @coran s:v | mots | note */
function renderDoc(ctx, el, md) {
  md = String(md || '').replace(/^---\n[\s\S]*?\n---\n?/, '').replace(/%%[\s\S]*?%%/g, '');
  md = md.replace(/^#{2,3} [^\n]*russe[^\n]*\n[\s\S]*?(?=^#{1,3} |(?![\s\S]))/gim, '');
  const lines = md.split('\n'); const jobs = []; let para = []; let i = 0;
  const flush = () => { if (para.length) { const p = h(el, 'div', 'aa-doc-p'); para.forEach(l => mdText(p, 'div', null, l)); para = []; } };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { flush(); i++; continue; }
    if (/^#{1,3} /.test(l)) { flush(); mdText(el, /^### /.test(l) ? 'h5' : 'h4', 'aa-doc-h', l.replace(/^#+ /, '')); i++; continue; }
    if (/^@coran /.test(l)) {
      flush(); const m = l.slice(7).split('|').map(s => s.trim());
      const ph = h(el, 'div');
      if (typeof renderLessonExample === 'function' && ctx.data && ctx.data.surah) jobs.push(renderLessonExample(ctx, ph, { r: m[0], w: (m[1] || '').split(/[ ,]+/).map(Number).filter(Boolean), n: m[2] || '' }).catch(() => {}));
      i++; continue;
    }
    if (/^\|/.test(l)) {
      flush(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { if (!/^\|[\s\-:|]+\|?\s*$/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim())); i++; }
      renderDocTable(el, rows); continue;
    }
    if (/^(- |\d+\. )/.test(l)) {
      flush(); const ord = /^\d/.test(l); const list = h(el, ord ? 'ol' : 'ul', 'aa-doc-list');
      while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) { mdText(list, 'li', null, lines[i].replace(/^(- |\d+\. )/, '')); i++; }
      continue;
    }
    if (/^>/.test(l)) {
      flush(); const q = h(el, 'div', 'aa-doc-quote');
      while (i < lines.length && /^>/.test(lines[i])) { const x = lines[i].replace(/^> ?/, ''); if (x.trim()) mdText(q, 'div', null, x); i++; }
      continue;
    }
    para.push(l); i++;
  }
  flush();
  return Promise.all(jobs).then(() => linkTerms(ctx, el));
}
function ruleOverridePath(ctx, r) { return (ctx.settings.fixFolder || '4 - Références/Atelier - corrections').replace(/\/$/, '') + '/Règle - ' + r.title.replace(/[\\/:*?"<>|#^[\]]/g, '').replace(/\s+/g, ' ').trim() + '.md'; }

/* Explication détaillée, avec « ta version » si une note de correction existe */
async function renderRuleDetail(ctx, parent, r) {
  const box = h(parent, 'div', 'aa-doc');
  const orig = ruleDoc(r.id);
  let mine = null;
  try { mine = ctx.readNote ? await ctx.readNote(ruleOverridePath(ctx, r)) : null; } catch (e) { mine = null; }
  const bar = h(box, 'div', 'aa-actions aa-doc-bar');
  const body = h(box, 'div', 'aa-doc-body');
  let showMine = !!mine;
  const draw = () => {
    clear(body); clear(bar);
    if (mine) {
      btn(bar, '📝 Ta version', () => { showMine = true; draw(); }, showMine ? 'mod-cta' : 'aa-btn-quiet');
      btn(bar, '📖 Version d\'origine', () => { showMine = false; draw(); }, showMine ? 'aa-btn-quiet' : 'mod-cta');
    }
    if (ctx.editNote) btn(bar, mine ? '✏️ Modifier ta version' : '✏️ Corriger ou compléter cette explication', () => ctx.editNote(ruleOverridePath(ctx, r), '---\natelier: regle/' + r.id + '\n---\n%% Ta version de la règle « ' + r.title + ' ». Modifie librement ce texte : l\'atelier l\'affichera à la place de l\'original, qui reste intact (bouton « Version d\'origine »). Pour revenir à l\'original, supprime cette note. %%\n\n' + orig + '\n'), 'aa-btn-quiet');
    if (showMine && mine) h(body, 'div', 'aa-muted aa-small', 'Version tirée de ta note « ' + ruleOverridePath(ctx, r) + ' ».');
    if (!orig && !mine) { h(body, 'p', 'aa-muted', 'L\'explication détaillée de cette règle n\'est pas encore écrite.'); return; }
    renderDoc(ctx, body, showMine && mine ? mine : orig);
  };
  draw();
  return box;
}
