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
  if (r.ru) { const ru = h(box, 'div', 'aa-rule-ru'); h(ru, 'span', null, '🇷🇺 '); addBidi(ru, r.ru); }
  if (opts.inline) {
    const a = h(box, 'div', 'aa-actions');
    btn(a, 'Ouvrir dans l\'onglet Règles', () => ctx.openRule(r.id), 'aa-btn-quiet');
    btn(a, 'Fermer', () => box.remove(), 'aa-btn-quiet');
  } else {
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
  mdText(root, 'p', 'aa-help', 'Toutes les règles **expliquées simplement**, avec des exemples et une comparaison avec le russe. Dans les leçons et dans l\'analyse, les **mots soulignés** ouvrent directement la bonne règle.');
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
      rs.forEach(r => {
        const d = details(out, r.title + '  —  ' + r.one.replace(/\*\*/g, ''), state.open === r.id || (!!q && list.length <= 2), 'aa-rule-det');
        d.dataset.rule = r.id;
        const sm = d.querySelector('summary'); sm.textContent = ''; const st = h(sm, 'b'); addBidi(st, r.title); const so = h(sm, 'div', 'aa-muted aa-small aa-rule-sum'); addBidi(so, r.one.replace(/\*\*/g, ''));
        let filled = false;
        const fill = () => { if (filled) return; filled = true; renderRuleCard(ctx, d, r); };
        if (d.open) fill();
        d.addEventListener('toggle', () => { if (d.open) fill(); });
      });
    });
    if (state.open) { const el = out.querySelector('[data-rule="' + state.open + '"]'); if (el && el.scrollIntoView) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); }
  };
  inp.addEventListener('input', () => { state.q = inp.value; state.open = null; draw(); });
  draw();
}
