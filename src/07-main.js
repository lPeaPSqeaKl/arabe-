/* ====================================================================
 * 07 - Le plugin Obsidian : vue, commandes, blocs de code, réglages
 * ==================================================================== */
const VIEW_TYPE = 'atelier-arabe-view';
const DEFAULT_SETTINGS = {
  style: 'sci', showTr: true, showFr: true, arSize: 30, openLetters: false,
  flashFile: '5 - Flashcards/Atelier - mes phrases.md', lastSurah: 1,
  audio: true, tajwid: false, fixFolder: '4 - Références/Atelier - corrections', vocabFile: '4 - Références/Vocabulaire.md', textsFolder: '3 - Textes',
  myWords: {}, progress: null, lessons: {}, surahOrder: 'mushaf', wordColors: true, arFont: 'amiri', cardsFolder: '5 - Flashcards/Règles', srs: null, reciter: 'Alafasy_128kbps', audioRate: 1, audioRepeat: 1,
  writing: null, activity: null, uiSize: 'normal',
};
function emptyProgress() { return { byType: { case: { ok: 0, n: 0 }, mood: { ok: 0, n: 0 }, sens: { ok: 0, n: 0 }, phrase: { ok: 0, n: 0 } }, lem: {} }; }
/* polices arabes au choix : [id, nom dans la liste, description] */
const AR_FONTS = [
  ['amiri', 'Amiri Quran (conseillée pour le Coran)', 'Style des Corans imprimés. Tous les signes de récitation.'],
  ['scheherazade', 'Scheherazade New', 'Naskh classique, très lisible, grandes voyelles. Très bonne pour le Coran.'],
  ['naskh', 'Noto Naskh', 'Naskh moderne, celle des livres et des journaux d\'aujourd\'hui.'],
  ['amiri-classic', 'Amiri', 'Naskh élégant des livres anciens.'],
  ['lateef', 'Lateef', 'Naskh simple et aéré.'],
  ['ruqaa', 'Ruqʿa (écriture à la main)', 'Le style qu\'on utilise pour écrire à la main au quotidien. Utile pour lire une écriture manuscrite. Certains petits signes du Coran sont plus simples.'],
  ['maghribi', 'Maghribi (style marocain)', 'Écriture maghrébine, celle des manuscrits et des Corans du Maroc. Attention : dans ce style, le ف a souvent son point en dessous et le ق un seul point au-dessus.'],
  ['harmattan', 'Harmattan (style d\'Afrique de l\'Ouest)', 'Écriture des manuscrits d\'Afrique de l\'Ouest (Sénégal, Mali…), proche du maghribi mais plus simple à lire. Tous les signes du Coran.'],
  ['mirza', 'Mirza', 'Naskh aux formes rondes et anciennes, agréable à lire.'],
  ['kufi', 'Reem Kufi (coufique)', 'Le coufique : écriture anguleuse, la plus ancienne des Corans. Aujourd\'hui surtout pour les titres. Les petits signes du Coran sont pris dans Amiri Quran.'],
  ['kufam', 'Kufam (coufique moderne)', 'Coufique moderne et géométrique. Pour le plaisir des yeux plus que pour apprendre. Petits signes du Coran pris dans Amiri Quran.'],
  ['nastaliq', 'Nastaʿlīq (Noto Nastaliq)', 'Le style persan et ourdou : les mots descendent en diagonale. Très beau, plus difficile à lire pour débuter. Petits signes du Coran pris dans Amiri Quran.'],
  ['gulzar', 'Nastaʿlīq (Gulzar)', 'Un autre nastaʿlīq, plus calligraphique. Petits signes du Coran pris dans Amiri Quran.'],
  ['katibeh', 'Katibeh (manuscrit ancien)', 'Inspirée des manuscrits anciens, épaisse et décorative.'],
  ['rakkas', 'Rakkas (affiche)', 'Police d\'affiche, très grasse. Pour les titres, pas pour lire longtemps. Petits signes du Coran pris dans Amiri Quran.'],
  ['lalezar', 'Lalezar (affiche)', 'Police d\'affiche, ronde et grasse. Pour les titres, pas pour lire longtemps. Petits signes du Coran pris dans Amiri Quran.'],
  ['device', 'Police de l\'appareil', 'La police arabe de ton PC ou de ton iPad.'],
];
/* Ambiances : un seul fond pour tout l'atelier, choisi indépendamment du thème d'Obsidian */
const AMBIANCES = [['', 'Comme Obsidian'], ['nuit', 'Nuit (noir doux)'], ['sepia', 'Sépia (papier chaud)'], ['clair', 'Clair (blanc)']];
function ambianceOf(S) { return S.ambiance != null ? S.ambiance : (S.paper === true ? 'sepia' : ''); }
function applyAmbiance(el, a) { AMBIANCES.forEach(x => x[0] && el.classList.toggle('aa-amb-' + x[0], x[0] === a)); el.classList.remove('aa-paper'); }
const TAB_ICONS = { home: 'home', read: 'book-a', write: 'pencil', coran: 'book-open', alphabet: 'a-large-small', lessons: 'graduation-cap', rules: 'book-marked', review: 'layers', dict: 'library', analyse: 'scan-search', build: 'blocks', signs: 'flask-conical', quiz: 'target' };
const TABS = [
  ['home', 'Accueil', 'Ton tableau de bord du jour'], ['coran', 'Coran', 'Lire une sourate mot par mot'], ['alphabet', 'Alphabet', 'Les lettres et leur prononciation'], ['read', 'Lire', 'Apprendre à lire, des voyelles aux sourates'], ['write', 'Écrire', 'Apprendre à écrire les lettres et les mots'], ['lessons', 'Leçons', 'Parcours de grammaire guidé'], ['rules', 'Règles', 'Les règles expliquées simplement'], ['review', 'Révision', 'Réviser les cartes de chaque règle'], ['dict', 'Dictionnaire', 'Tous les mots du Coran'], ['analyse', 'Analyser', 'Analyser un texte arabe'],
  ['build', 'Construire', 'Construire une phrase'], ['signs', 'Signes', 'Laboratoire des signes'], ['quiz', 'Entraînement', 'S\'entraîner'],
];
/* 2.17 : 6 grands onglets ; chaque groupe a ses sous-onglets (rien n'a été supprimé) */
const TAB_GROUPS = [
  ['home', 'Accueil', 'home', 'Ton tableau de bord du jour', [['home', 'Accueil']]],
  ['coran', 'Coran', 'book-open', 'Lire une sourate mot par mot', [['coran', 'Coran']]],
  ['learn', 'Apprendre', 'graduation-cap', 'Alphabet, lecture, écriture, leçons et règles', [['alphabet', 'Alphabet'], ['read', 'Lire'], ['write', 'Écrire'], ['lessons', 'Leçons'], ['rules', 'Règles']]],
  ['revise', 'Réviser', 'layers', 'Cartes de révision et exercices', [['review', 'Cartes du jour'], ['quiz', 'Exercices']]],
  ['dict', 'Dictionnaire', 'library', 'Chercher un mot ou analyser un texte', [['dict', 'Chercher un mot'], ['analyse', 'Analyser un texte']]],
  ['build', 'Atelier', 'blocks', 'Construire une phrase, jouer avec les voyelles', [['build', 'Construire une phrase'], ['signs', 'Changer les voyelles']]],
];
function groupOf(tab) { return TAB_GROUPS.find(g => g[4].some(t => t[0] === tab)) || TAB_GROUPS[0]; }
function tabLabel(tab) { const g = groupOf(tab); const t = g[4].find(x => x[0] === tab); return g[4].length > 1 && t ? g[1] + ' › ' + t[1] : g[1]; }

class AtelierView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = TABS.some(t => t[0] === plugin.settings.lastTab) ? plugin.settings.lastTab : 'home';
    this.states = { coran: { surah: plugin.settings.lastSurah || 1, page: 0, resume: plugin.settings.lastVerse || 0 }, dict: {}, alphabet: {}, home: {}, read: {}, write: {}, lessons: plugin.settings.lessonPlace && plugin.settings.lessonPlace.open ? { open: plugin.settings.lessonPlace.open, step: plugin.settings.lessonPlace.step || 0, stepFor: plugin.settings.lessonPlace.open } : {}, rules: {}, review: {}, analyse: {}, build: {}, signs: {}, quiz: {}, settings: {} };
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Atelier arabe'; }
  getIcon() { return 'languages'; }
  async onOpen() {
    const root = this.contentEl;
    clear(root); root.classList.add('aa-root');
    this.nav = h(root, 'div', 'aa-tabs');
    this.sub = h(root, 'div', 'aa-subtabs-row');
    this.body = h(root, 'div', 'aa-body');
    h(this.body, 'p', 'aa-muted', 'Chargement du Coran…');
    try { const msg = this.body.firstChild; await this.plugin.data.init((d, n) => { msg.textContent = 'Premier lancement : téléchargement du Coran… ' + d + ' / ' + n; }); } catch (e) {
      clear(this.body); h(this.body, 'p', 'aa-warn', 'Impossible de lire les données du plugin (dossier data). Vérifie que le dossier .obsidian/plugins/atelier-arabe/data est complet. Détail : ' + e.message);
      return;
    }
    this.render();
    if (this.plugin.fresh && !this.plugin.settings.tourDone && this.plugin.settings.path) setTimeout(() => this.startTour(), 400);
    /* ordinateur : flèches ← → dans l'onglet Coran (sourate / versets suivants) */
    this.registerDomEvent(document, 'keydown', ev => {
      if (ev.altKey && ev.key === 'ArrowLeft' && this.back && this.back.length) { const t = ev.target; if (!(t && t.closest && t.closest('input, textarea'))) { ev.preventDefault(); this.goBack(); return; } }
      if (ev.key === 'Escape' && this.contentEl.classList.contains('aa-reading')) { setReading(this.contentEl, false); return; }
      if (this.tab !== 'coran' || ev.altKey || ev.ctrlKey || ev.metaKey || (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight')) return;
      const ws = (this.app || this.plugin.app || {}).workspace; if (ws && ws.activeLeaf && ws.activeLeaf !== this.leaf) return;
      const t = ev.target; if (t && (t.closest && t.closest('input, textarea, select, [contenteditable="true"]'))) return;
      if (!this.body || !this.body._aaSwipeGo) return;
      ev.preventDefault(); this.body._aaSwipeGo(ev.key === 'ArrowRight' ? 1 : -1);
    });
  }
  async onClose() { try { stopAudio(); } catch (e) { /* */ } clear(this.contentEl); }
  /* « ← Retour » : on garde l'endroit d'où l'on vient quand on suit un lien */
  pushBack() {
    if (!this.body) return;
    const st = Object.assign({}, this.states[this.tab]);
    if (this.tab === 'coran') { st.focus = 0; st.resume = this.plugin.settings.lastSurah === st.surah ? this.plugin.settings.lastVerse : 0; }
    (this.back = this.back || []).push({ tab: this.tab, st, top: this.contentEl.scrollTop || 0 });
    if (this.back.length > 20) this.back.shift();
  }
  goBack() {
    const b = (this.back || []).pop(); if (!b) return;
    this.tab = b.tab; this.states[b.tab] = b.st;
    if (this.plugin.settings.lastTab !== b.tab) { this.plugin.settings.lastTab = b.tab; this.plugin.saveData(this.plugin.settings); }
    this._lastTab = b.tab; this.render();
    if (b.tab !== 'coran') setTimeout(() => { try { this.contentEl.scrollTop = b.top; } catch (e) { /* */ } }, 60);
  }
  /* Visite guidée : 6 bulles qui montrent où est quoi (au premier lancement, puis à la demande) */
  startTour() {
    const steps = [
      [null, null, '👋 Bienvenue dans l\'Atelier arabe', 'Tout ce qu\'il faut pour apprendre à lire le Coran et l\'arabe, sans internet. Cette petite visite dure 30 secondes.'],
      ['home', '.aa-tabs', '🧭 Les grandes parties', 'En haut : **Accueil** (ton tableau du jour), **Coran**, **Apprendre** (alphabet, écriture, leçons, règles), **Réviser**, **Dictionnaire** et **Atelier**.'],
      ['home', '.aa-home-search', '🔎 Chercher', 'Tape un mot (كتاب, livre), une règle (génitif) ou une sourate (Yasin, 36) : tout se trouve ici.'],
      ['coran', '.aa-verses', '📖 Lire le Coran', '**Touche un mot** : son sens, sa racine, sa grammaire. Sous chaque verset, **▶** pour écouter et **⋯** pour la suite (analyse, signet, apprendre par cœur, recopier).'],
      ['coran', '.aa-quick', '⤢ 🧠 Lecture et mémoire', '**⤢** : lecture plein écran, avec la police (Aa), l\'ambiance (🌓) et le mode mushaf (📖). **🧠** : apprendre un verset par cœur.'],
      ['review', '.aa-body', '🃏 Réviser chaque jour', 'Quelques minutes par jour : les cartes reviennent juste avant que tu les oublies. C\'est le meilleur moyen de retenir les mots.'],
      ['settings', '.aa-settings-inview', '⚙ Réglages', 'Police arabe, ambiance, taille, récitateur, son hors ligne. Tu peux revoir cette visite depuis l\'Accueil. **Bon apprentissage !**'],
    ];
    let i = 0;
    const end = () => { document.querySelectorAll('.aa-tour, .aa-tour-target').forEach(e => e.classList.contains('aa-tour') ? e.remove() : e.classList.remove('aa-tour-target')); this.plugin.settings.tourDone = true; this.plugin.saveData(this.plugin.settings); };
    const show = () => {
      document.querySelectorAll('.aa-tour').forEach(e => e.remove()); this.contentEl.querySelectorAll('.aa-tour-target').forEach(e => e.classList.remove('aa-tour-target'));
      const [tab, sel, title, text] = steps[i];
      if (tab && this.tab !== tab) { this.back = []; this.setTab(tab); }
      const card = document.createElement('div'); card.className = 'aa-tour';
      this.contentEl.insertBefore(card, this.sub);
      h(card, 'div', 'aa-tour-n', (i + 1) + ' / ' + steps.length);
      h(card, 'div', 'aa-tour-t', title); mdText(card, 'div', 'aa-tour-x', text);
      const row = h(card, 'div', 'aa-actions');
      btn(row, 'Passer', end, 'aa-btn-quiet');
      if (i > 0) btn(row, '← Retour', () => { i--; show(); }, 'aa-btn-quiet');
      btn(row, i < steps.length - 1 ? 'Suivant →' : 'Terminer ✓', () => { if (i < steps.length - 1) { i++; show(); } else end(); }, 'mod-cta');
      setTimeout(() => { const t = sel && this.contentEl.querySelector(sel); if (t) t.classList.add('aa-tour-target'); try { this.contentEl.scrollTop = 0; } catch (e) { /* */ } }, 350);
    };
    show();
  }
  setTab(tab, opts) {
    this.tab = tab;
    if (tab !== 'settings') {
      const g = groupOf(tab)[0]; const ls = this.plugin.settings.lastSub || (this.plugin.settings.lastSub = {});
      if (this.plugin.settings.lastTab !== tab || ls[g] !== tab) { this.plugin.settings.lastTab = tab; ls[g] = tab; this.plugin.saveData(this.plugin.settings); }
    }
    if (tab === 'review' && !this.states.review.session) this.states.review.decks = null; // relit les notes du coffre
    if (opts) Object.assign(this.states[tab], opts);
    if (this.body && this.plugin.data.surahs) this.render();
  }
  render() {
    clear(this.nav);
    /* iPhone : les grands onglets tiennent sur une seule ligne d'icônes, en haut
     * (en bas, la barre flottante d'Obsidian les cachait) */
    const phone = document.body.classList.contains('is-phone') || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && (this.contentEl.clientWidth || 1000) < 600);
    this.contentEl.classList.toggle('aa-bottomnav', phone);
    if (this.contentEl.firstChild !== this.nav) this.contentEl.insertBefore(this.nav, this.contentEl.firstChild);
    applyAmbiance(this.contentEl, ambianceOf(this.plugin.settings));
    this.contentEl.classList.toggle('aa-nocolor', this.plugin.settings.wordColors === false);
    ensureFont(this.plugin.settings.arFont).catch(() => {});
    AR_FONTS.forEach(f => this.contentEl.classList.toggle('aa-font-' + f[0], (this.plugin.settings.arFont || 'amiri') === f[0]));
    this.contentEl.classList.toggle('aa-ui-l', this.plugin.settings.uiSize === 'grand');
    this.contentEl.classList.toggle('aa-ui-xl', this.plugin.settings.uiSize === 'tres-grand');
    this.contentEl.style.setProperty('--aa-ar-size', (this.plugin.settings.arSize || 30) + 'px');
    const cur = groupOf(this.tab);
    TAB_GROUPS.forEach(([gid, label, icon, title, subs]) => {
      const on = this.tab !== 'settings' && cur[0] === gid;
      const b = h(this.nav, 'button', 'aa-tab' + (on ? ' aa-on' : ''));
      if (typeof setIcon === 'function') { try { setIcon(h(b, 'span', 'aa-tab-ic'), icon); } catch (e) { /* */ } }
      h(b, 'span', 'aa-tab-lab', phone && gid === 'dict' ? 'Dico' : label);
      b.title = title;
      b.addEventListener('click', () => {
        this.back = [];
        const last = (this.plugin.settings.lastSub || {})[gid];
        this.setTab(subs.some(t => t[0] === last) ? last : subs[0][0]);
      });
    });
    const gear = document.createElement('button'); gear.className = 'aa-tab aa-tab-gear' + (this.tab === 'settings' ? ' aa-on' : '');
    if (phone) { this.nav.appendChild(gear); if (typeof setIcon === 'function') { try { setIcon(h(gear, 'span', 'aa-tab-ic'), 'settings'); } catch (e) { /* */ } } h(gear, 'span', 'aa-tab-lab', 'Réglages'); }
    else { this.nav.insertBefore(gear, this.nav.firstChild); h(gear, 'span', 'aa-tab-lab', '⚙'); } gear.setAttribute('aria-label', 'Réglages'); gear.title = 'Réglages de l\'atelier (police, taille, son, couleurs…)';
    gear.addEventListener('click', () => { if (this.tab !== 'settings') { this.pushBack(); this.setTab('settings'); } else this.goBack(); });
    { const on = this.nav.querySelector('.aa-tab.aa-on:not(.aa-tab-gear)'); if (on && this.nav.scrollWidth > this.nav.clientWidth) { try { this.nav.scrollLeft = on.offsetLeft - this.nav.clientWidth / 2 + on.offsetWidth / 2; } catch (e) { /* */ } } }
    const ctx = this.plugin.ctx(this);
    const st = this.states[this.tab];
    clear(this.body);
    clear(this.sub);
    if (this.tab !== 'settings' && cur[4].length > 1) {
      const sub = h(this.sub, 'div', 'aa-subtabs');
      cur[4].forEach(([id, lab]) => {
        const b = h(sub, 'button', 'aa-subtab' + (this.tab === id ? ' aa-on' : ''), lab);
        b.addEventListener('click', () => { if (this.tab !== id) { this.back = []; this.setTab(id); } });
      });
    }
    if (this.tab === 'home') renderHomeTab(ctx, this.body, st);
    else if (this.tab === 'write') renderWriteTab(ctx, this.body, st);
    else if (this.tab === 'read') renderReadTab(ctx, this.body, st);
    else if (this.tab === 'coran') renderQuranTab(ctx, this.body, st);
    else if (this.tab === 'dict') renderDictTab(ctx, this.body, st);
    else if (this.tab === 'alphabet') renderAlphabetTab(ctx, this.body, st);
    else if (this.tab === 'lessons') renderLessonsTab(ctx, this.body, st);
    else if (this.tab === 'rules') renderRulesTab(ctx, this.body, st);
    else if (this.tab === 'review') renderReviewTab(ctx, this.body, st);
    else if (this.tab === 'analyse') renderAnalyseTab(ctx, this.body, st);
    else if (this.tab === 'build') renderBuildTab(ctx, this.body, st);
    else if (this.tab === 'signs') renderSignsTab(ctx, this.body, st);
    else if (this.tab === 'settings') { h(this.body, 'h2', 'aa-set-title', '⚙ Réglages'); const box = h(this.body, 'div', 'aa-settings-inview'); fillSettings(box, this.plugin, false, ctx); }
    else renderQuizTab(ctx, this.body, st);
    if (this.back && this.back.length) {
      const last = this.back[this.back.length - 1];
      const lab = last.tab === 'settings' ? 'Réglages' : tabLabel(last.tab);
      const bb = document.createElement('button'); bb.className = 'aa-btn aa-btn-quiet aa-back'; bb.textContent = '← Retour' + (lab ? ' (' + lab + ')' : '');
      bb.addEventListener('click', ev => { ev.preventDefault(); this.goBack(); });
      this.body.insertBefore(bb, this.body.firstChild);
    }
    // l'aide du haut de l'onglet se replie : on l'ouvre seulement si on en a besoin (aussi pour les onglets qui s'affichent en deux temps)
    const wrapHelp = () => {
      const help = this.body.querySelector(':scope > .aa-help');
      if (!help) return false;
      const d = document.createElement('details'); d.className = 'aa-howto';
      h(d, 'summary', null, 'ⓘ Comment utiliser cet onglet');
      help.parentNode.insertBefore(d, help); d.appendChild(help);
      return true;
    };
    if (this._helpObs) { this._helpObs.disconnect(); this._helpObs = null; }
    wrapHelp();
    if (typeof MutationObserver !== 'undefined') {
      const ob = new MutationObserver(() => { if (this.body.querySelector(':scope > .aa-help')) wrapHelp(); });
      ob.observe(this.body, { childList: true }); this._helpObs = ob;
    }
    if (this.body.scrollTo && this.tab !== this._lastTab) { try { this.contentEl.scrollTop = 0; } catch (e) { /* */ } }
    this._lastTab = this.tab;
  }
}

class AtelierSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() { fillSettings(this.containerEl, this.plugin, true); }
}
/* les réglages : dans Obsidian (Réglages › Atelier arabe) et dans l'atelier (bouton ⚙) */
function fillSettings(el, plugin, inObsidian, ctx) {
  {
    clear(el);
    if (inObsidian) h(el, 'h2', null, 'Atelier arabe');
    h(el, 'p', null, 'Toutes les données (Coran, traductions, analyse grammaticale) sont dans le dossier du plugin. Rien de ce que tu fais n\'est envoyé sur internet. Seul le son (si « Son en ligne » est activé) est téléchargé quand tu appuies sur ▶ ou 🔊.');
    const p = plugin; const s = p.settings;
    h(el, 'h3', 'aa-set-h', 'Lecture du Coran');
    new Setting(el).setName('Translittération').setDesc('Savante (ā, ū, sh, j) ou « à la française » (ou, ch, dj).')
      .addDropdown(d => d.addOption('sci', 'savante : al-ḥamdu, shukr').addOption('fr', 'à la française : al-ḥamdou, choukr').setValue(s.style).onChange(async v => { s.style = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la translittération').addToggle(t => t.setValue(s.showTr).onChange(async v => { s.showTr = v; await p.saveSettings(); }));
    new Setting(el).setName('Affichage des versets').setDesc('Un long verset peut être coupé en morceaux aux signes de pause du Coran : chaque morceau a sa transcription juste en dessous. « Mot à mot » met sous chaque mot sa transcription et son sens.').addDropdown(d => { VERSE_LAYOUTS.forEach(([k, l]) => d.addOption(k, l)); d.setValue(s.verseLayout || 'auto').onChange(async v => { s.verseLayout = v; await p.saveSettings(); }); });
    new Setting(el).setName('Afficher la traduction française').setDesc('Traduction de Muhammad Hamidullah.').addToggle(t => t.setValue(s.showFr).onChange(async v => { s.showFr = v; await p.saveSettings(); }));
    new Setting(el).setName('Ordre des sourates').setDesc('Ordre du Coran (1 à 114, comme dans le livre), ou ordre de la révélation (de la première sourate révélée, al-ʿAlaq, à la dernière).')
      .addDropdown(d => d.addOption('mushaf', 'ordre du Coran').addOption('nuzul', 'ordre de la révélation').setValue(s.surahOrder || 'mushaf').onChange(async v => { s.surahOrder = v; await p.saveSettings(); p.refreshViews && p.refreshViews(); }));
    new Setting(el).setName('Couleurs de prononciation').setDesc('Colore les lettres muettes, les voyelles longues, la nasalisation (ghunna) et l\'écho (qalqala) dans le Coran et dans les blocs ```coran```.')
      .addToggle(t => t.setValue(!!s.tajwid).onChange(async v => { s.tajwid = v; await p.saveSettings(); }));
    new Setting(el).setName('Ouvrir « lettre par lettre » automatiquement').addToggle(t => t.setValue(s.openLetters).onChange(async v => { s.openLetters = v; await p.saveSettings(); }));
    h(el, 'h3', 'aa-set-h', 'Apparence');
    const fontSet = new Setting(el).setName('Police arabe').setDesc('Toutes ces polices sont incluses dans le plugin : elles marchent sans internet, sur PC, iPad et iPhone. « Amiri Quran » affiche le mieux les petits signes du Coran. Les polices décoratives (coufique, nastaʿlīq, affiche) sont belles mais plus difficiles à lire pour apprendre.');
    const preview = el.createDiv({ cls: 'aa-font-preview aa-root' });
    const showFont = v => { ensureFont(v).catch(() => {}); AR_FONTS.forEach(f => preview.classList.toggle('aa-font-' + f[0], v === f[0])); const f = AR_FONTS.find(x => x[0] === v) || AR_FONTS[0]; preview.empty(); const ar = preview.createDiv({ text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ · قُلْ هُوَ ٱللَّهُ أَحَدٌ' }); ar.className = 'aa-ar aa-font-preview-ar'; ar.setAttribute('dir', 'rtl'); ar.setAttribute('lang', 'ar'); const d = preview.createDiv({ text: f[2] }); d.style.cssText = 'font-size:12px;direction:ltr;text-align:left;color:var(--text-muted);font-family:var(--font-interface)'; };
    fontSet.addDropdown(d => { AR_FONTS.forEach(f => d.addOption(f[0], f[1])); d.setValue(s.arFont || 'amiri').onChange(async v => { s.arFont = v; showFont(v); await p.saveSettings(); p.refreshViews && p.refreshViews(); }); });
    showFont(s.arFont || 'amiri');
    new Setting(el).setName('Ambiance').setDesc('Les couleurs de tout l\'atelier. « Nuit » : noir doux, reposant le soir. « Sépia » : papier chaud, comme un livre. « Clair » : blanc. « Comme Obsidian » suit ton thème. Aussi dans la lecture plein écran (bouton 🌓).')
      .addDropdown(d => { AMBIANCES.forEach(a => d.addOption(a[0], a[1])); d.setValue(ambianceOf(s)).onChange(async v => { s.ambiance = v; s.paper = false; await p.saveSettings(); p.refreshViews && p.refreshViews(); }); });
    new Setting(el).setName('Couleurs des mots').setDesc('Dans le Coran : bleu = nom, rouge = verbe, gris = particule. Désactivé : texte d\'une seule couleur, plus reposant.')
      .addToggle(t => t.setValue(s.wordColors !== false).onChange(async v => { s.wordColors = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille du texte arabe').setDesc('En pixels (30 par défaut).')
      .addSlider(sl => sl.setLimits(20, 52, 2).setValue(s.arSize).setDynamicTooltip().onChange(async v => { s.arSize = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille de l\'interface').setDesc('« Très grande » est pratique sur téléphone. Chaque appareil garde son propre réglage.')
      .addDropdown(d => d.addOption('normal', 'normale').addOption('grand', 'grande').addOption('tres-grand', 'très grande').setValue(s.uiSize || 'normal').onChange(async v => { s.uiSize = v; await p.saveSettings(); }));
    h(el, 'h3', 'aa-set-h', 'Son');
    new Setting(el).setName('Son en ligne').setDesc('Récitation (Mishary Alafasy) et prononciation des mots depuis internet, seulement quand tu appuies sur ▶ ou 🔊. Désactivé : voix de l\'appareil uniquement.')
      .addToggle(t => t.setValue(s.audio).onChange(async v => { s.audio = v; await p.saveSettings(); }));
    new Setting(el).setName('Récitateur').setDesc('La voix qui récite les versets quand tu appuies sur ▶.')
      .addDropdown(d => { RECITERS.forEach(r => d.addOption(r[0], r[1])); d.setValue(s.reciter || 'Alafasy_128kbps').onChange(async v => { s.reciter = v; AUDIO.reciter = v; await p.saveSettings(); }); });
    new Setting(el).setName('Vitesse du son').setDesc('Plus lent pour bien entendre chaque lettre.')
      .addDropdown(d => { [['0.5', '0,5× (très lent)'], ['0.6', '0,6×'], ['0.75', '0,75× (lent)'], ['0.85', '0,85×'], ['1', '1× (normal)']].forEach(o => d.addOption(o[0], o[1])); d.setValue(String(s.audioRate || 1)).onChange(async v => { s.audioRate = +v; AUDIO.rate = +v; await p.saveSettings(); }); });
    if (ctx && typeof renderOfflineAudio === 'function') renderOfflineAudio(ctx, h(el, 'div', 'aa-set-offline'));
    new Setting(el).setName('Son gardé sur l\'appareil').setDesc('Le son des sourates que tu as gardées hors ligne (bouton dans l\'onglet Coran ou l\'Accueil).')
      .addButton(b => b.setButtonText('Effacer le son gardé').onClick(async () => { await p.dropAudio(); new Notice('Son effacé.'); }));
    h(el, 'h3', 'aa-set-h', 'Mes notes dans le coffre');
    new Setting(el).setName('Dossier de tes corrections').setDesc('Quand tu corriges ou complètes une explication, ta version est rangée ici. Le texte d\'origine du plugin n\'est jamais modifié.')
      .addText(t => t.setValue(s.fixFolder).onChange(async v => { s.fixFolder = v.trim() || DEFAULT_SETTINGS.fixFolder; await p.saveSettings(); }));
    new Setting(el).setName('Note de vocabulaire').setDesc('Le bouton « Ajouter à mon vocabulaire » ajoute une ligne au tableau de cette note.')
      .addText(t => t.setValue(s.vocabFile).onChange(async v => { s.vocabFile = v.trim() || DEFAULT_SETTINGS.vocabFile; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des textes du cours').setDesc('Les sourates qui ont une note dans ce dossier apparaissent dans « Mon cours ».')
      .addText(t => t.setValue(s.textsFolder).onChange(async v => { s.textsFolder = v.trim() || DEFAULT_SETTINGS.textsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des cartes de révision').setDesc('Les notes « Cartes - … » de ce dossier remplacent les paquets inclus dans le plugin (tes corrections gagnent). Sans ce dossier, l\'onglet Réviser utilise les paquets inclus : c\'est le cas sur iPad et iPhone.')
      .addText(t => t.setValue(s.cardsFolder || DEFAULT_SETTINGS.cardsFolder).onChange(async v => { s.cardsFolder = v.trim() || DEFAULT_SETTINGS.cardsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Fichier des flashcards').setDesc('Note où l\'atelier ajoute tes cartes (format Spaced Repetition « question :: réponse »).')
      .addText(t => t.setValue(s.flashFile).onChange(async v => { s.flashFile = v.trim() || DEFAULT_SETTINGS.flashFile; await p.saveSettings(); }));
    const src = h(el, 'div', 'aa-sources');
    h(src, 'h3', null, 'Sources et droits');
    [
      ['Texte du Coran : projet Tanzil (texte vérifié, non modifié).', 'https://tanzil.net'],
      ['Analyse des mots (racines, cas, formes) : Quranic Arabic Corpus, Kais Dukes, Université de Leeds, licence GNU GPL. Version corrigée par mustafa0x/quran-morphology.', 'https://corpus.quran.com'],
      ['Signes de pause (pour couper les longs versets) : texte uthmani de quranenc.com, via le paquet quran-json (CC BY-SA 4.0).', 'https://github.com/risan/quran-json'],
      ['Traduction française : Muhammad Hamidullah. Utilisée ici à des fins d\'étude, non commerciales ; les droits appartiennent à son auteur et à ses éditeurs.', ''],
      ['Polices arabes : Amiri et Amiri Quran (Khaled Hosny), Scheherazade New et Lateef (SIL Global), Noto Naskh Arabic (Noto Project), Aref Ruqaa, Bouazzi Maghribi (aleftypefoundry), Reem Kufi, Kufam, Harmattan (SIL Global), Mirza, Noto Nastaliq Urdu, Gulzar, Katibeh, Rakkas, Lalezar. Toutes sous SIL Open Font License 1.1.', 'https://github.com/aliftype/amiri'],
      ['Récitations : everyayah.com et quran.com, écoutées en ligne (rien n\'est copié dans le plugin).', 'https://everyayah.com'],
      ['Minutage mot par mot des récitateurs : quran-align (Collin Fair), licence CC BY 4.0.', 'https://github.com/cpfair/quran-align'],
    ].forEach(([t, u]) => { const d = h(src, 'p', 'aa-small'); d.appendChild(document.createTextNode(t + ' ')); if (u) { const a = h(d, 'a', null, u); a.href = u; } });
    h(src, 'p', 'aa-small aa-muted', 'Les définitions, explications, leçons et analyses automatiques (iʿrāb, prononciation) sont un outil d\'apprentissage : elles peuvent contenir des erreurs. Pour le Coran, vérifie toujours auprès d\'un enseignant.');
  }
}

class AtelierArabePlugin extends Plugin {
  async onload() {
    const raw = await this.loadData(); this.fresh = !raw;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, raw);
    if (!this.settings.progress) this.settings.progress = emptyProgress();
    if (!this.settings.myWords) this.settings.myWords = {};
    if (!this.settings.lessons) this.settings.lessons = {};
    AUDIO.reciter = this.settings.reciter || 'Alafasy_128kbps'; AUDIO.rate = this.settings.audioRate || 1; AUDIO.repeat = this.settings.audioRepeat == null ? 1 : this.settings.audioRepeat; AUDIO.follow = this.settings.followWords !== false;
    this.data = new QuranData(this.app, this.manifest.dir);
    fontEnv(this.app, this.manifest.dir); ensureFont(this.settings.arFont).catch(() => {});
    this.scanAudio();
    notify = (m) => new Notice(m);
    this.registerView(VIEW_TYPE, leaf => new AtelierView(leaf, this));
    this.addRibbonIcon('languages', 'Atelier arabe', () => this.openView());
    this.addCommand({ id: 'ouvrir', name: 'Ouvrir l\'atelier', callback: () => this.openView() });
    this.addCommand({ id: 'accueil', name: 'Accueil', callback: () => this.openView('home') });
    this.addCommand({ id: 'coran', name: 'Coran : reprendre ma lecture', callback: () => this.openView('coran') });
    this.addCommand({ id: 'alphabet', name: 'Apprendre › Alphabet', callback: () => this.openView('alphabet') });
    this.addCommand({ id: 'par-coeur', name: 'Coran : apprendre par cœur', callback: () => this.openView('coran', { hifz: { s: this.settings.lastSurah || 1, v: this.settings.lastVerse || 1, level: 0 } }) });
    this.addCommand({ id: 'polices', name: 'Apprendre › Comparer les polices', callback: () => this.openView('alphabet', { mode: 'fonts' }) });
    this.addCommand({ id: 'imprimer', name: 'Coran › Imprimer ou exporter une sourate (PDF, PNG)', callback: async () => { await this.openView('coran'); setTimeout(() => openPrintDialog(this.ctx(this.app.workspace.getLeavesOfType(VIEW_TYPE)[0].view), this.settings.lastSurah || 1), 300); } });
    this.addCommand({ id: 'lire', name: 'Apprendre › Lire (cours de lecture)', callback: () => this.openView('read') });
    this.addCommand({ id: 'ecrire', name: 'Apprendre › Écrire', callback: () => this.openView('write') });
    this.addCommand({ id: 'recopier', name: 'Apprendre › Recopier le Coran dans mon cahier', callback: () => this.openView('write', { copy: true, letter: null, word: null, unit: null, free: false }) });
    this.addCommand({ id: 'lecons', name: 'Apprendre › Leçons', callback: () => this.openView('lessons') });
    this.addCommand({ id: 'regles', name: 'Apprendre › Règles', callback: () => this.openView('rules') });
    this.addCommand({ id: 'revision', name: 'Réviser › Cartes du jour', callback: () => this.openView('review') });
    this.addCommand({ id: 'entrainement', name: 'Réviser › Exercices', callback: () => this.openView('quiz') });
    this.addCommand({ id: 'dictionnaire', name: 'Dictionnaire › Chercher un mot', callback: () => this.openView('dict') });
    this.addCommand({ id: 'analyser', name: 'Dictionnaire › Analyser un texte', callback: () => this.openView('analyse') });
    this.addCommand({ id: 'construire', name: 'Atelier › Construire une phrase', callback: () => this.openView('build') });
    this.addCommand({ id: 'signes', name: 'Atelier › Changer les voyelles', callback: () => this.openView('signs') });
    this.addCommand({ id: 'visite', name: 'Visite guidée de l\'atelier', callback: async () => { await this.openView('home'); const l = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; if (l && l.view && l.view.startTour) l.view.startTour(); } });
    this.addCommand({ id: 'reglages', name: 'Réglages de l\'atelier', callback: () => this.openView('settings') });
    this.addCommand({
      id: 'analyser-selection', name: 'Analyser le texte sélectionné',
      editorCallback: (editor) => { const t = editor.getSelection(); if (!t || !hasArabic(t)) { new Notice('Sélectionne d\'abord un texte arabe.'); return; } this.openView('analyse', { text: t }); },
    });
    this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor) => {
      const t = editor.getSelection();
      if (t && hasArabic(t)) menu.addItem(i => i.setTitle('Analyser avec l\'atelier arabe').setIcon('languages').onClick(() => this.openView('analyse', { text: t })));
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change', leaf => { if (leaf && leaf.view instanceof MarkdownView) this.lastMd = leaf; }));

    this.registerMarkdownCodeBlockProcessor('coran', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try {
        await this.data.init();
        const refs = parseRefs(src);
        if (!refs.length) { h(el, 'p', 'aa-warn', 'Écris une référence, par exemple : 1:1-7, 112 ou 2:255'); return; }
        for (const r of refs) await renderVerses(this.ctx(null), h(el, 'div'), r.s, r.from, r.to, { title: true, basmala: r.from === 1 && !r.to });
      } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.registerMarkdownCodeBlockProcessor('irab', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try {
        await this.data.init();
        const refs = parseRefs(src);
        if (!refs.length) { h(el, 'p', 'aa-warn', 'Écris un verset, par exemple : 1:2'); return; }
        for (const r of refs) for (let v = r.from; v <= (r.to || r.from); v++) {
          const d = await this.data.surah(r.s); const vv = d.v[v - 1]; if (!vv) continue;
          const box = h(el, 'div', 'aa-verse');
          const line = h(box, 'div', 'aa-verse-ar'); line.setAttribute('dir', 'rtl'); arSpan(line, vv[2].map(wordText).join(' ') + ' ﴿' + arNum(v) + '﴾');
          h(box, 'div', 'aa-verse-fr', r.s + ':' + v + ' ' + vv[0]);
          renderIrab(this.ctx(null), h(box, 'div', 'aa-struct'), vv[2], [r.s, v]);
        }
      } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.registerMarkdownCodeBlockProcessor('analyse-arabe', async (src, el) => {
      el.classList.add('aa-root', 'aa-embed');
      try { await this.data.init(); await analyseInto(this.ctx(null), h(el, 'div'), src); } catch (e) { h(el, 'p', 'aa-warn', 'Erreur : ' + e.message); }
    });
    this.addSettingTab(new AtelierSettingTab(this.app, this));
  }
  onunload() { try { stopAudio(); } catch (e) { /* */ } unloadFonts(); /* Obsidian ferme la vue tout seul */ }
  async saveSettings() {
    await this.saveData(this.settings);
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view && l.view.render && l.view.plugin.data.surahs && l.view.render());
  }
  ctx(view) {
    const self = this;
    return {
      data: this.data, settings: this.settings,
      save: () => this.saveData(this.settings),
      insertText: (t) => this.insertText(t),
      saveFile: async (dir, name, buf) => {
        try {
          const segs = dir.split('/'); for (let i = 1; i <= segs.length; i++) { const d = segs.slice(0, i).join('/'); if (!this.app.vault.getAbstractFileByPath(d)) await this.app.vault.createFolder(d); }
          const ext = name.match(/\.[a-z0-9]+$/i)[0]; let p = dir + '/' + name; let k = 2; while (this.app.vault.getAbstractFileByPath(p)) p = dir + '/' + name.slice(0, -ext.length) + ' ' + (k++) + ext;
          await this.app.vault.createBinary(p, buf); return p;
        } catch (e) { new Notice('Impossible de garder le fichier : ' + e.message); return null; }
      },
      saveImage: async (name, buf) => {
        try {
          const dir = 'Atelier arabe/Images';
          for (const d of ['Atelier arabe', dir]) if (!this.app.vault.getAbstractFileByPath(d)) await this.app.vault.createFolder(d);
          let p = dir + '/' + name; let k = 2; while (this.app.vault.getAbstractFileByPath(p)) p = dir + '/' + name.replace(/\.png$/, '') + '-' + (k++) + '.png';
          await this.app.vault.createBinary(p, buf); new Notice('Image gardée dans ' + p); return p;
        } catch (e) { new Notice('Impossible de garder l\'image : ' + e.message); return null; }
      },
      addFlashcard: (q, a) => this.addFlashcard(q, a),
      openQuran: (s, v) => this.openView('coran', { surah: s, page: 0, focus: v }),
      readNote: async (path) => { const f = this.app.vault.getAbstractFileByPath(path); return f ? await this.app.vault.read(f) : null; },
      editNote: (path, initial) => this.editNote(path, initial),
      openRule: (id) => this.openView('rules', { open: id, q: '' }),
      openTab: (tab, opts) => this.openView(tab, opts),
      startTour: view && view.startTour ? () => view.startTour() : null,
      vaultCardNotes: () => this.vaultCardNotes(),
      openLesson: (id) => this.openView('lessons', { open: id, run: null }),
      openDict: (id) => this.openView('dict', { entry: id, mode: 'search' }),
      openNote: (file) => this.app.workspace.getLeaf(false).openFile(file),
      openPath: (path) => { const f = this.app.vault.getAbstractFileByPath(path); if (f) this.app.workspace.getLeaf(false).openFile(f); else new Notice('Note introuvable : ' + path); },
      isMine: (id) => !!this.settings.myWords[id],
      myWordIds: () => Object.keys(this.settings.myWords).map(Number),
      addVocab: (id, ar, tr, gloss, where) => this.addVocab(id, ar, tr, gloss, where),
      courseSurahs: () => this.courseSurahs(),
      record: (id, good, type) => {
        const P = this.settings.progress; const t = P.byType[type] || (P.byType[type] = { ok: 0, n: 0 });
        t.n++; if (good) t.ok++;
        if (id >= 0) { const x = P.lem[id] || (P.lem[id] = { ok: 0, ko: 0 }); if (good) x.ok++; else x.ko++; }
        this.saveData(this.settings);
      },
      reviewList: () => Object.entries(this.settings.progress.lem).filter(([, x]) => x.ko > x.ok).map(([id, x]) => ({ id: +id, ok: x.ok, ko: x.ko })).sort((a, b) => (b.ko - b.ok) - (a.ko - a.ok)),
      resetProgress: () => { this.settings.progress = emptyProgress(); this.saveData(this.settings); },
      markActivity: (k) => {
        const A = this.settings.activity || (this.settings.activity = {}); const d = todayNum();
        const e = A[d] || (A[d] = {}); e[k] = (e[k] || 0) + 1;
        Object.keys(A).forEach(x => { if (+x < d - 400) delete A[x]; });
        this.saveData(this.settings);
      },
      refresh: () => this.refreshViews(),
      keepSurahAudio: (n, words, progress) => this.keepSurahAudio(n, words, progress),
      surahAudioStatus: (n) => this.surahAudioStatus(n),
      audioSummary: () => this.audioSummary(),
      dropAudio: () => this.dropAudio(),
      currentSurah: () => { const l = self.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; return l && l.view.states ? l.view.states.coran.surah : 1; },
    };
  }
  async openView(tab, opts) {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = ws.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    ws.revealLeaf(leaf);
    if (opts && opts.surah) { this.settings.lastSurah = opts.surah; this.saveData(this.settings); }
    if (tab && leaf.view && leaf.view.setTab) { if (leaf.view.pushBack) leaf.view.pushBack(); leaf.view.setTab(tab, opts); }
  }
  courseSurahs() {
    if (!this.data.surahs) return [];
    const norm = x => stripLat(x).replace(/[^a-z]/g, '');
    const names = this.data.surahs.map(s => norm(s[1]));
    const out = []; const seen = new Set();
    const folder = this.settings.textsFolder.replace(/\/$/, '') + '/';
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (!f.path.startsWith(folder)) continue;
      const b = norm(f.basename.replace(/^sourate\s*/i, '').replace(/\s+-\s.*$/, ''));
      const i = names.findIndex(n => n && (n === b || (b.length > 4 && n.startsWith(b))));
      if (i >= 0 && !seen.has(i)) { seen.add(i); out.push({ n: i + 1, label: this.data.surahs[i][1], file: f }); }
    }
    return out.sort((a, b) => a.n - b.n);
  }
  /* notes de cartes du coffre (« Cartes - … » dans le dossier des cartes) + la note de tes phrases */
  async vaultCardNotes() {
    const out = [];
    const folder = (this.settings.cardsFolder || DEFAULT_SETTINGS.cardsFolder).replace(/\/$/, '') + '/';
    for (const f of this.app.vault.getMarkdownFiles()) {
      if (f.path.startsWith(folder) && f.basename.startsWith('Cartes - ')) out.push({ path: f.path, text: await this.app.vault.cachedRead(f) });
    }
    const mine = this.app.vault.getAbstractFileByPath(this.settings.flashFile);
    if (mine && mine.extension === 'md') out.push({ path: mine.path, text: await this.app.vault.cachedRead(mine), mine: true });
    return out;
  }
  refreshViews() { this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach(l => l.view && l.view.render && l.view.plugin.data.surahs && l.view.render()); }
  /* ---------- son gardé sur l'appareil (dossier audio/ du plugin) ---------- */
  async scanAudio() {
    const ad = this.app.vault.adapter; const dir = this.manifest.dir; const base = dir + '/audio';
    AUDIO_CACHE.dir = dir; AUDIO_CACHE.res = p => ad.getResourcePath(p); AUDIO_CACHE.files = new Set();
    try {
      if (!(await ad.exists(base))) return;
      const top = await ad.list(base);
      for (const d of top.folders) { const m = await ad.list(d); m.files.forEach(f => AUDIO_CACHE.files.add(f.slice(dir.length + 1))); }
    } catch (e) { /* rien */ }
  }
  surahAudioStatus(n) {
    const rec = AUDIO.reciter || 'Alafasy_128kbps'; const nV = this.data.surahInfo(n)[5]; let k = 0;
    for (let v = 1; v <= nV; v++) if (AUDIO_CACHE.files.has(audioRelVerse(rec, n, v))) k++;
    return { verses: k, nV };
  }
  audioSummary() {
    const s = new Set(); AUDIO_CACHE.files.forEach(f => { const m = f.match(/\/(\d{3})(\d{3})\.mp3$/); if (m) s.add(+m[1]); });
    return { surahs: s.size, files: AUDIO_CACHE.files.size };
  }
  async keepSurahAudio(n, words, progress) {
    const ad = this.app.vault.adapter; const dir = this.manifest.dir; const rec = AUDIO.reciter || 'Alafasy_128kbps';
    const jobs = []; const nV = this.data.surahInfo(n)[5];
    for (let v = 1; v <= nV; v++) jobs.push([audioRelVerse(rec, n, v), 'https://everyayah.com/data/' + rec + '/' + pad3(n) + pad3(v) + '.mp3']);
    if (words) { const d = await this.data.surah(n); d.v.forEach((vv, vi) => vv[2].forEach((w, wi) => { const r = [n, vi + 1, wi + 1]; jobs.push([audioRelWord(r), 'https://audio.qurancdn.com/wbw/' + pad3(r[0]) + '_' + pad3(r[1]) + '_' + pad3(r[2]) + '.mp3']); })); }
    const todo = jobs.filter(j => !AUDIO_CACHE.files.has(j[0]));
    for (const f of ['audio', 'audio/' + rec, 'audio/wbw']) if (!(await ad.exists(dir + '/' + f))) await ad.mkdir(dir + '/' + f);
    let done = jobs.length - todo.length, failed = 0, offline = false, errRow = 0;
    if (progress) progress(done, jobs.length);
    const worker = async () => {
      while (todo.length && !offline) {
        const [rel, url] = todo.shift();
        try {
          const r = await requestUrl({ url, throw: false });
          if (r.status >= 200 && r.status < 300 && r.arrayBuffer && r.arrayBuffer.byteLength > 200) { await ad.writeBinary(dir + '/' + rel, r.arrayBuffer); AUDIO_CACHE.files.add(rel); errRow = 0; }
          else failed++;
        } catch (e) { failed++; if (++errRow >= 6) offline = true; }
        done++; if (progress) progress(done, jobs.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return { done, failed, offline };
  }
  async dropAudio() {
    const ad = this.app.vault.adapter; const base = this.manifest.dir + '/audio';
    try { if (await ad.exists(base)) await ad.rmdir(base, true); } catch (e) { new Notice('Impossible d\'effacer : ' + e.message); }
    await this.scanAudio();
  }
  async addVocab(id, ar, tr, gloss, where) {
    const path = this.settings.vocabFile;
    const f = this.app.vault.getAbstractFileByPath(path);
    this.settings.myWords[id] = Date.now(); await this.saveData(this.settings);
    if (!f) { new Notice('Mot gardé dans « Mon vocabulaire » de l\'atelier (la note ' + path + ' est introuvable).'); return; }
    const content = await this.app.vault.read(f);
    if (content.includes('| ' + ar + ' |')) { new Notice('Ce mot est déjà dans ta note de vocabulaire.'); return; }
    const row = '| ' + ar + ' | ' + tr + ' | ' + (gloss || '').replace(/\|/g, '/') + ' | Atelier' + (where ? ' (' + where + ')' : '') + ' |\n';
    await this.app.vault.modify(f, content.replace(/\n*$/, '\n') + row);
    new Notice('Ajouté à « ' + f.basename + ' »');
  }
  async editNote(path, initial) {
    let f = this.app.vault.getAbstractFileByPath(path);
    try {
      if (!f) {
        const dir = path.slice(0, path.lastIndexOf('/'));
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        f = await this.app.vault.create(path, initial);
        new Notice('Ta version a été créée : modifie-la, l\'original reste intact.');
      }
      await this.app.workspace.getLeaf('tab').openFile(f);
    } catch (e) { new Notice('Impossible de créer la note : ' + e.message); }
  }
  insertText(t) {
    let leaf = this.lastMd;
    const active = this.app.workspace.getActiveViewOfType(MarkdownView);
    const view = active || (leaf && leaf.view instanceof MarkdownView ? leaf.view : null) || (this.app.workspace.getLeavesOfType('markdown')[0] || {}).view;
    if (!view || !view.editor) { new Notice('Ouvre d\'abord une note (en mode édition) pour y insérer le texte.'); return; }
    view.editor.replaceSelection(t);
    new Notice('Ajouté dans « ' + (view.file ? view.file.basename : 'la note') + ' »');
  }
  async addFlashcard(q, a) {
    const path = this.settings.flashFile;
    const line = q.replace(/::/g, ':').replace(/\n/g, ' ') + ' :: ' + a.replace(/::/g, ':').replace(/\n/g, ' ') + '\n';
    let f = this.app.vault.getAbstractFileByPath(path);
    try {
      if (!f) {
        const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
        if (dir && !this.app.vault.getAbstractFileByPath(dir)) await this.app.vault.createFolder(dir);
        f = await this.app.vault.create(path, '# Atelier arabe – mes cartes\n\nCartes créées depuis l\'atelier arabe (plugin). Révision avec Spaced Repetition.\n\n#flashcards/arabe/phrases\n\n' + line);
      } else await this.app.vault.append(f, line);
      new Notice('Flashcard ajoutée dans « ' + path + ' »');
    } catch (e) { new Notice('Impossible d\'ajouter la flashcard : ' + e.message); }
  }
}
module.exports = AtelierArabePlugin;
