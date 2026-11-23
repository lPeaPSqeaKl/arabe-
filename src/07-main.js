/* ====================================================================
 * 07 - Le plugin Obsidian : vue, commandes, blocs de code, réglages
 * ==================================================================== */
const VIEW_TYPE = 'atelier-arabe-view';
const DEFAULT_SETTINGS = {
  style: 'sci', showTr: true, showFr: true, arSize: 30, openLetters: false,
  flashFile: '5 - Flashcards/Atelier - mes phrases.md', lastSurah: 1,
  audio: true, tajwid: false, fixFolder: '4 - Références/Atelier - corrections', vocabFile: '4 - Références/Vocabulaire.md', textsFolder: '3 - Textes',
  myWords: {}, progress: null, lessons: {}, surahOrder: 'mushaf', wordColors: true, arFont: 'amiri', cardsFolder: '5 - Flashcards/Règles', srs: null, reciter: 'Alafasy_128kbps', audioRate: 1, audioRepeat: 1,
};
function emptyProgress() { return { byType: { case: { ok: 0, n: 0 }, mood: { ok: 0, n: 0 }, sens: { ok: 0, n: 0 }, phrase: { ok: 0, n: 0 } }, lem: {} }; }
const TAB_ICONS = { coran: 'book-open', alphabet: 'a-large-small', lessons: 'graduation-cap', rules: 'book-marked', review: 'layers', dict: 'library', analyse: 'scan-search', build: 'blocks', signs: 'flask-conical', quiz: 'target' };
const TABS = [
  ['coran', 'Coran', 'Lire une sourate mot par mot'], ['alphabet', 'Alphabet', 'Les lettres et leur prononciation'], ['lessons', 'Leçons', 'Parcours de grammaire guidé'], ['rules', 'Règles', 'Les règles expliquées simplement'], ['review', 'Révision', 'Réviser les cartes de chaque règle'], ['dict', 'Dictionnaire', 'Tous les mots du Coran'], ['analyse', 'Analyser', 'Analyser un texte arabe'],
  ['build', 'Construire', 'Construire une phrase'], ['signs', 'Signes', 'Laboratoire des signes'], ['quiz', 'Entraînement', 'S\'entraîner'],
];

class AtelierView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.tab = 'coran';
    this.states = { coran: { surah: plugin.settings.lastSurah || 1, page: 0 }, dict: {}, alphabet: {}, lessons: {}, rules: {}, review: {}, analyse: {}, build: {}, signs: {}, quiz: {} };
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Atelier arabe'; }
  getIcon() { return 'languages'; }
  async onOpen() {
    const root = this.contentEl;
    clear(root); root.classList.add('aa-root');
    this.nav = h(root, 'div', 'aa-tabs');
    this.body = h(root, 'div', 'aa-body');
    h(this.body, 'p', 'aa-muted', 'Chargement du Coran…');
    try { const msg = this.body.firstChild; await this.plugin.data.init((d, n) => { msg.textContent = 'Premier lancement : téléchargement du Coran… ' + d + ' / ' + n; }); } catch (e) {
      clear(this.body); h(this.body, 'p', 'aa-warn', 'Impossible de lire les données du plugin (dossier data). Vérifie que le dossier .obsidian/plugins/atelier-arabe/data est complet. Détail : ' + e.message);
      return;
    }
    this.render();
  }
  async onClose() { try { stopAudio(); } catch (e) { /* */ } clear(this.contentEl); }
  setTab(tab, opts) {
    this.tab = tab;
    if (tab === 'review' && !this.states.review.session) this.states.review.decks = null; // relit les notes du coffre
    if (opts) Object.assign(this.states[tab], opts);
    if (this.body && this.plugin.data.surahs) this.render();
  }
  render() {
    clear(this.nav);
    this.contentEl.classList.toggle('aa-nocolor', this.plugin.settings.wordColors === false);
    this.contentEl.classList.toggle('aa-font-device', this.plugin.settings.arFont === 'device');
    TABS.forEach(([id, label, title]) => {
      const b = h(this.nav, 'button', 'aa-tab' + (this.tab === id ? ' aa-on' : ''));
      if (TAB_ICONS[id] && typeof setIcon === 'function') { try { setIcon(h(b, 'span', 'aa-tab-ic'), TAB_ICONS[id]); } catch (e) { /* */ } }
      h(b, 'span', 'aa-tab-lab', label);
      b.title = title;
      b.addEventListener('click', () => this.setTab(id));
    });
    const ctx = this.plugin.ctx(this);
    const st = this.states[this.tab];
    clear(this.body);
    if (this.tab === 'coran') renderQuranTab(ctx, this.body, st);
    else if (this.tab === 'dict') renderDictTab(ctx, this.body, st);
    else if (this.tab === 'alphabet') renderAlphabetTab(ctx, this.body, st);
    else if (this.tab === 'lessons') renderLessonsTab(ctx, this.body, st);
    else if (this.tab === 'rules') renderRulesTab(ctx, this.body, st);
    else if (this.tab === 'review') renderReviewTab(ctx, this.body, st);
    else if (this.tab === 'analyse') renderAnalyseTab(ctx, this.body, st);
    else if (this.tab === 'build') renderBuildTab(ctx, this.body, st);
    else if (this.tab === 'signs') renderSignsTab(ctx, this.body, st);
    else renderQuizTab(ctx, this.body, st);
    // l'aide du haut de l'onglet se replie : on l'ouvre seulement si on en a besoin
    const help = this.body.querySelector(':scope > .aa-help');
    if (help) {
      const d = document.createElement('details'); d.className = 'aa-howto';
      const sm = h(d, 'summary', null, 'ⓘ Comment utiliser cet onglet');
      help.parentNode.insertBefore(d, help); d.appendChild(help);
    }
    if (this.body.scrollTo && this.tab !== this._lastTab) { try { this.contentEl.scrollTop = 0; } catch (e) { /* */ } }
    this._lastTab = this.tab;
  }
}

class AtelierSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const el = this.containerEl; clear(el);
    h(el, 'h2', null, 'Atelier arabe');
    h(el, 'p', null, 'Toutes les données (Coran, traductions, analyse grammaticale) sont dans le dossier du plugin. Rien de ce que tu fais n\'est envoyé sur internet. Seul le son (si « Son en ligne » est activé) est téléchargé quand tu appuies sur ▶ ou 🔊.');
    const p = this.plugin; const s = p.settings;
    new Setting(el).setName('Translittération').setDesc('Savante (ā, ū, sh, j) ou « à la française » (ou, ch, dj).')
      .addDropdown(d => d.addOption('sci', 'savante : al-ḥamdu, shukr').addOption('fr', 'à la française : al-ḥamdou, choukr').setValue(s.style).onChange(async v => { s.style = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la translittération').addToggle(t => t.setValue(s.showTr).onChange(async v => { s.showTr = v; await p.saveSettings(); }));
    new Setting(el).setName('Afficher la traduction française').setDesc('Traduction de Muhammad Hamidullah.').addToggle(t => t.setValue(s.showFr).onChange(async v => { s.showFr = v; await p.saveSettings(); }));
    new Setting(el).setName('Ordre des sourates').setDesc('Ordre du Coran (1 à 114, comme dans le livre), ou ordre de la révélation (de la première sourate révélée, al-ʿAlaq, à la dernière).')
      .addDropdown(d => d.addOption('mushaf', 'ordre du Coran').addOption('nuzul', 'ordre de la révélation').setValue(s.surahOrder || 'mushaf').onChange(async v => { s.surahOrder = v; await p.saveSettings(); p.refreshViews && p.refreshViews(); }));
    new Setting(el).setName('Police arabe').setDesc('« Amiri Quran » est incluse dans le plugin : elle affiche correctement tous les petits signes du Coran, sur PC comme sur iPad.')
      .addDropdown(d => d.addOption('amiri', 'Amiri Quran (incluse)').addOption('device', 'police de l\'appareil').setValue(s.arFont || 'amiri').onChange(async v => { s.arFont = v; await p.saveSettings(); }));
    new Setting(el).setName('Couleurs des mots').setDesc('Dans le Coran : bleu = nom, rouge = verbe, gris = particule. Désactivé : texte d\'une seule couleur, plus reposant.')
      .addToggle(t => t.setValue(s.wordColors !== false).onChange(async v => { s.wordColors = v; await p.saveSettings(); }));
    new Setting(el).setName('Taille du texte arabe').setDesc('En pixels (30 par défaut).')
      .addSlider(sl => sl.setLimits(20, 48, 2).setValue(s.arSize).setDynamicTooltip().onChange(async v => { s.arSize = v; await p.saveSettings(); }));
    new Setting(el).setName('Couleurs de prononciation').setDesc('Colore les lettres muettes, les voyelles longues, la nasalisation (ghunna) et l\'écho (qalqala) dans le Coran et dans les blocs ```coran```.')
      .addToggle(t => t.setValue(!!s.tajwid).onChange(async v => { s.tajwid = v; await p.saveSettings(); }));
    new Setting(el).setName('Son en ligne').setDesc('Récitation (Mishary Alafasy) et prononciation des mots depuis internet, seulement quand tu appuies sur ▶ ou 🔊. Désactivé : voix de l\'appareil uniquement.')
      .addToggle(t => t.setValue(s.audio).onChange(async v => { s.audio = v; await p.saveSettings(); }));
    new Setting(el).setName('Dossier de tes corrections').setDesc('Quand tu corriges ou complètes une explication, ta version est rangée ici. Le texte d\'origine du plugin n\'est jamais modifié.')
      .addText(t => t.setValue(s.fixFolder).onChange(async v => { s.fixFolder = v.trim() || DEFAULT_SETTINGS.fixFolder; await p.saveSettings(); }));
    new Setting(el).setName('Note de vocabulaire').setDesc('Le bouton « Ajouter à mon vocabulaire » ajoute une ligne au tableau de cette note.')
      .addText(t => t.setValue(s.vocabFile).onChange(async v => { s.vocabFile = v.trim() || DEFAULT_SETTINGS.vocabFile; await p.saveSettings(); }));
    new Setting(el).setName('Dossier des textes du cours').setDesc('Les sourates qui ont une note dans ce dossier apparaissent dans « Mon cours ».')
      .addText(t => t.setValue(s.textsFolder).onChange(async v => { s.textsFolder = v.trim() || DEFAULT_SETTINGS.textsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Ouvrir « lettre par lettre » automatiquement').addToggle(t => t.setValue(s.openLetters).onChange(async v => { s.openLetters = v; await p.saveSettings(); }));
    const src = h(el, 'div', 'aa-sources');
    h(src, 'h3', null, 'Sources et droits');
    [
      ['Texte du Coran : projet Tanzil (texte vérifié, non modifié).', 'https://tanzil.net'],
      ['Analyse des mots (racines, cas, formes) : Quranic Arabic Corpus, Kais Dukes, Université de Leeds, licence GNU GPL. Version corrigée par mustafa0x/quran-morphology.', 'https://corpus.quran.com'],
      ['Traduction française : Muhammad Hamidullah. Utilisée ici à des fins d\'étude, non commerciales ; les droits appartiennent à son auteur et à ses éditeurs.', ''],
      ['Police arabe : Amiri Quran, Khaled Hosny, SIL Open Font License 1.1.', 'https://github.com/aliftype/amiri'],
      ['Récitations : everyayah.com et quran.com, écoutées en ligne (rien n\'est copié dans le plugin).', 'https://everyayah.com'],
    ].forEach(([t, u]) => { const d = h(src, 'p', 'aa-small'); d.appendChild(document.createTextNode(t + ' ')); if (u) { const a = h(d, 'a', null, u); a.href = u; } });
    h(src, 'p', 'aa-small aa-muted', 'Les définitions, explications, leçons et analyses automatiques (iʿrāb, prononciation) sont un outil d\'apprentissage : elles peuvent contenir des erreurs. Pour le Coran, vérifie toujours auprès d\'un enseignant.');
    new Setting(el).setName('Dossier des cartes de révision').setDesc('Les notes « Cartes - … » de ce dossier remplacent les paquets inclus dans le plugin (tes corrections gagnent). Sans ce dossier, l\'onglet Révision utilise les paquets inclus : c\'est le cas sur iPad et iPhone.')
      .addText(t => t.setValue(s.cardsFolder || DEFAULT_SETTINGS.cardsFolder).onChange(async v => { s.cardsFolder = v.trim() || DEFAULT_SETTINGS.cardsFolder; await p.saveSettings(); }));
    new Setting(el).setName('Fichier des flashcards').setDesc('Note où l\'atelier ajoute tes cartes (format Spaced Repetition « question :: réponse »).')
      .addText(t => t.setValue(s.flashFile).onChange(async v => { s.flashFile = v.trim() || DEFAULT_SETTINGS.flashFile; await p.saveSettings(); }));
  }
}

class AtelierArabePlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!this.settings.progress) this.settings.progress = emptyProgress();
    if (!this.settings.myWords) this.settings.myWords = {};
    if (!this.settings.lessons) this.settings.lessons = {};
    AUDIO.reciter = this.settings.reciter || 'Alafasy_128kbps'; AUDIO.rate = this.settings.audioRate || 1; AUDIO.repeat = this.settings.audioRepeat || 1;
    this.data = new QuranData(this.app, this.manifest.dir);
    notify = (m) => new Notice(m);
    this.registerView(VIEW_TYPE, leaf => new AtelierView(leaf, this));
    this.addRibbonIcon('languages', 'Atelier arabe', () => this.openView());
    this.addCommand({ id: 'ouvrir', name: 'Ouvrir l\'atelier', callback: () => this.openView() });
    this.addCommand({ id: 'alphabet', name: 'Alphabet et prononciation', callback: () => this.openView('alphabet') });
    this.addCommand({ id: 'lecons', name: 'Leçons de grammaire', callback: () => this.openView('lessons') });
    this.addCommand({ id: 'regles', name: 'Règles expliquées simplement', callback: () => this.openView('rules') });
    this.addCommand({ id: 'revision', name: 'Réviser mes cartes', callback: () => this.openView('review') });
    this.addCommand({ id: 'dictionnaire', name: 'Dictionnaire', callback: () => this.openView('dict') });
    this.addCommand({ id: 'construire', name: 'Construire une phrase', callback: () => this.openView('build') });
    this.addCommand({ id: 'signes', name: 'Laboratoire des signes', callback: () => this.openView('signs') });
    this.addCommand({ id: 'entrainement', name: 'Entraînement', callback: () => this.openView('quiz') });
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
  onunload() { /* Obsidian ferme la vue tout seul */ }
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
      addFlashcard: (q, a) => this.addFlashcard(q, a),
      openQuran: (s, v) => this.openView('coran', { surah: s, page: 0, focus: v }),
      readNote: async (path) => { const f = this.app.vault.getAbstractFileByPath(path); return f ? await this.app.vault.read(f) : null; },
      editNote: (path, initial) => this.editNote(path, initial),
      openRule: (id) => this.openView('rules', { open: id, q: '' }),
      openTab: (tab, opts) => this.openView(tab, opts),
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
      currentSurah: () => { const l = self.app.workspace.getLeavesOfType(VIEW_TYPE)[0]; return l && l.view.states ? l.view.states.coran.surah : 1; },
    };
  }
  async openView(tab, opts) {
    const ws = this.app.workspace;
    let leaf = ws.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = ws.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    ws.revealLeaf(leaf);
    if (opts && opts.surah) { this.settings.lastSurah = opts.surah; this.saveData(this.settings); }
    if (tab && leaf.view && leaf.view.setTab) leaf.view.setTab(tab, opts);
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
