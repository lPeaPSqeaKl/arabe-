/* ====================================================================
 * 02c - Analyse grammaticale complète d'un verset (iʿrāb)
 * Déduite de la morphologie du corpus : rôles, liens entre les mots,
 * marque du cas. Fiable pour les phrases simples, indicative ailleurs.
 * ==================================================================== */

/* clé : [nom français, terme arabe, translittération, (vide), étiquette courte du lien] */
const IRAB_ROLES = {
  mubtada: ['sujet de la phrase nominale', 'مُبْتَدَأ', 'mubtadaʾ', '', 'sujet'],
  khabar: ['attribut : ce qu\'on dit du sujet', 'خَبَر', 'khabar', '', 'attribut'],
  khabarMuq: ['attribut placé en tête', 'خَبَر مُقَدَّم', 'khabar muqaddam', '', 'attribut'],
  mubtadaMuakh: ['sujet placé après l\'attribut', 'مُبْتَدَأ مُؤَخَّر', 'mubtadaʾ muʾakhkhar', '', 'sujet'],
  fail: ['sujet du verbe', 'فَاعِل', 'fāʿil', '', 'sujet'],
  naib: ['sujet du verbe passif', 'نَائِب فَاعِل', 'nāʾib fāʿil', '', 'sujet'],
  maful: ['complément d\'objet direct', 'مَفْعُول بِهِ', 'mafʿūl bihi', '', 'COD'],
  mutlaq: ['complément absolu (renforce le verbe)', 'مَفْعُول مُطْلَق', 'mafʿūl muṭlaq', '', 'renfort'],
  hal: ['complément d\'état (« comment ? »)', 'حَال', 'ḥāl', '', 'état'],
  zarf: ['complément de temps ou de lieu', 'ظَرْف', 'ẓarf', '', 'quand/où'],
  majrur: ['nom au génitif après une préposition', 'اِسْم مَجْرُور', 'majrūr', '', 'après prép.'],
  mudafIlayh: ['complément du nom (« … de … »)', 'مُضَاف إِلَيْه', 'muḍāf ilayh', '', 'de'],
  nat: ['adjectif : il qualifie le nom', 'نَعْت', 'naʿt', '', 'adjectif'],
  badal: ['apposition : il précise le mot d\'avant', 'بَدَل', 'badal', '', 'précise'],
  matuf: ['mot coordonné (relié par « et »)', 'مَعْطُوف', 'maʿṭūf', '', 'et'],
  ismInna: ['nom de inna (sujet, à l\'accusatif)', 'اِسْم إِنَّ', 'ism inna', '', 'nom de inna'],
  khabarInna: ['attribut de inna', 'خَبَر إِنَّ', 'khabar inna', '', 'attribut'],
  ismKana: ['sujet de kāna', 'اِسْم كَانَ', 'ism kāna', '', 'sujet'],
  khabarKana: ['attribut de kāna (à l\'accusatif)', 'خَبَر كَانَ', 'khabar kāna', '', 'attribut'],
  mustathna: ['ce qui est excepté (« sauf … »)', 'مُسْتَثْنَى', 'mustathnā', '', 'sauf'],
  munada: ['la personne qu\'on appelle (« ô … »)', 'مُنَادَى', 'munādā', '', 'ô'],
  fasl: ['pronom de séparation (insiste : « c\'est lui qui… »)', 'ضَمِير فَصْل', 'ḍamīr faṣl', '', ''],
  verb: ['verbe', 'فِعْل', 'fiʿl', '', ''],
  jar: ['préposition', 'حَرْف جَرّ', 'ḥarf jarr', '', ''],
  harf: ['particule', 'حَرْف', 'ḥarf', '', ''],
  inna: ['inna ou une de ses sœurs', 'حَرْف نَاسِخ', 'ḥarf nāsikh', '', ''],
  shart: ['mot de condition (« si, quiconque, ce que »)', 'اِسْم شَرْط', 'ism sharṭ', '', ''],
  istifham: ['mot interrogatif (« comment ? qui ? quoi ? »)', 'اِسْم اِسْتِفْهَام', 'ism istifhām', '', ''],
  rel: ['pronom relatif (« celui qui, ce que »)', 'اِسْم مَوْصُول', 'ism mawṣūl', '', 'qui'],
  inl: ['lettres isolées', 'حُرُوف مُقَطَّعَة', 'ḥurūf muqaṭṭaʿa', '', ''],
  noun: ['nom', 'اِسْم', 'ism', '', ''],
};
/* rôles assez sûrs pour servir de questions d'exercice */
const IRAB_SURE = ['mubtada', 'khabar', 'fail', 'maful', 'majrur', 'mudafIlayh', 'nat', 'ismInna', 'khabarInna', 'matuf'];

function irabRoleName(key) { const r = IRAB_ROLES[key] || IRAB_ROLES.noun; return R(r[0]); }

const IR_STRIP = /[ۖ-ۭٓ-ٕ]/g;
function lastVowel(text) {
  const t = (text || '').replace(IR_STRIP, '').replace(/ٰ/g, '');
  const m = t.match(/([ً-ْ]*)([^ً-ْ]?)([ً-ْ]*)$/);
  return { t, marks: (m && (m[3] || m[1])) || '', lastLetter: m ? m[2] : '' };
}

/* Marque du cas ou du mode (ʿalāmat al-iʿrāb) */
function irabMark(word, f, stemText) {
  const { t, marks } = lastVowel(stemText);
  const has = c => marks.indexOf(c) >= 0;
  const gn = f.gn || '';
  if (f.pos === 'N' && f.cas) {
    if (['PRON', 'DEM', 'REL'].includes(f.sub)) return 'mot invariable (mabnī) : sa forme ne change pas, on dit qu\'il est « à la place » d\'un ' + CASE_SHORT[f.cas];
    const plurM = /MP/.test(gn) || /ـ?[وي]نَ$/.test(t) && /[ُِ][وي]نَ$/.test(t);
    const dual = /D$/.test(gn);
    if (f.cas === 'NOM') {
      if (dual && /انِ?$/.test(t)) return 'l\'alif du duel (ـَانِ) — un duel au nominatif prend ـَانِ';
      if (plurM && /ونَ?$/.test(t)) return 'le wāw du pluriel (ـُونَ) — le pluriel masculin au nominatif prend ـُونَ';
      if (/[اى]$/.test(t) || /ىٰ?$/.test(stemText)) return 'ḍamma « estimée » : la voyelle ne peut pas se poser sur l\'alif final, on ne la voit pas';
      if (has('ٌ')) return 'le tanwīn ḍamma (ـٌ, -un) : nominatif + indéfini';
      if (has('ُ')) return 'la ḍamma (ـُ, -u) sur la dernière lettre';
    }
    if (f.cas === 'ACC') {
      if (dual && /يْنِ?$/.test(t)) return 'le yāʾ du duel (ـَيْنِ)';
      if (plurM && /ينَ?$/.test(t)) return 'le yāʾ du pluriel (ـِينَ) — à l\'accusatif et au génitif, le pluriel masculin prend ـِينَ';
      if (/FP/.test(gn) && (has('ِ') || has('ٍ'))) return 'la kasra à la place de la fatḥa : un pluriel féminin en ـَات ne prend jamais de fatḥa';
      if (/[اى]$/.test(t) && !has('ً')) return 'fatḥa « estimée » sur l\'alif final (invisible)';
      if (has('ً')) return 'le tanwīn fatḥa (ـً, -an) : accusatif + indéfini';
      if (has('َ')) return 'la fatḥa (ـَ, -a) sur la dernière lettre';
    }
    if (f.cas === 'GEN') {
      if (dual && /يْنِ?$/.test(t)) return 'le yāʾ du duel (ـَيْنِ)';
      if (plurM && /ينَ?$/.test(t)) return 'le yāʾ du pluriel (ـِينَ) — au génitif, le pluriel masculin prend ـِينَ';
      if (/[اى]$/.test(t)) return 'kasra « estimée » sur l\'alif final (invisible)';
      if (has('ٍ')) return 'le tanwīn kasra (ـٍ, -in) : génitif + indéfini';
      if (has('ِ')) return 'la kasra (ـِ, -i) sur la dernière lettre';
      if (has('َ')) return 'la fatḥa à la place de la kasra : ce nom est « diptote » (mamnūʿ min aṣ-ṣarf), il refuse le -i et le tanwīn';
    }
    if (/[يى]$/.test(t)) return CASE_SHORT[f.cas] + ' « estimé » : la voyelle ne se voit pas sur la lettre longue finale';
    return CASE_SHORT[f.cas] + ' (la voyelle finale est cachée par un pronom collé ou par la forme du mot)';
  }
  if (f.pos === 'V') {
    if (f.aspect === 'PERF') return 'le passé est invariable (mabnī) : sa fin ne dépend pas des autres mots';
    if (f.aspect === 'IMPV') return 'l\'impératif est invariable (mabnī) : il se termine comme l\'apocopé';
    const suffixed = word.some(s => parseFeats(s[1], s[2]).suff && parseFeats(s[1], s[2]).tags[0] === 'PRON');
    if (f.mood === 'IND') return /نَ$|نِ$/.test(t) && suffixed ? 'le nūn final (ـونَ / ـانِ / ـينَ) : il montre l\'indicatif' : 'la ḍamma (ـُ, -u) : indicatif, forme normale du présent';
    if (f.mood === 'SUBJ') return /[وا]ا?$/.test(t) && suffixed ? 'la chute du nūn (ـوا au lieu de ـونَ) : subjonctif' : 'la fatḥa (ـَ, -a) : subjonctif';
    if (f.mood === 'JUS') {
      if (has('ْ')) return 'le soukoun (ـْ) : apocopé';
      if (suffixed) return 'la chute du nūn (ـوا au lieu de ـونَ) : apocopé';
      return 'la voyelle longue finale tombe (ex. يَكُن au lieu de يَكُونُ) : apocopé';
    }
  }
  if (f.pos === 'P') return 'particule invariable (mabnī)';
  return '';
}

function irabWordInfo(word) {
  const st = stemOf(word);
  const pre = [], suf = [];
  word.forEach((s, k) => {
    const g = parseFeats(s[1], s[2]);
    if (k < st.idx) pre.push({ k, s, g }); else if (k > st.idx) suf.push({ k, s, g });
  });
  const det = pre.some(p => p.g.tags[0] === 'DET');
  const prep = pre.find(p => p.g.tags[0] === 'P') || null;
  const conj = pre.find(p => ['CONJ'].includes(p.g.tags[0])) || null;
  const voc = pre.find(p => p.g.tags[0] === 'VOC') || null;
  const pron = suf.filter(p => p.g.tags[0] === 'PRON');
  return { st, f: st.f, pre, suf, det, prep, conj, voc, pron };
}

function analyseIrab(words) {
  const N = words.length;
  const W = words.map(irabWordInfo);
  const out = W.map((x, i) => ({ i, key: 'noun', head: -1, guess: false, notes: [], att: [], group: null, mark: irabMark(words[i], x.f, x.st.seg[0]) }));
  const set = (i, key, head, guess, note) => { out[i].key = key; out[i].head = head === undefined ? -1 : head; out[i].guess = !!guess; if (note) out[i].notes.push(note); };
  const isDef = i => { const x = W[i]; return x.det || x.f.sub === 'PN' || x.pron.length > 0 || ['PRON', 'DEM', 'REL'].includes(x.f.sub); };
  const newClause = () => ({ verb: -1, vSubj: false, vPass: false, vObj: false, inna: -1, innaIsm: -1, innaKh: false, kana: -1, kanaIsm: -1, kanaKh: false, mub: -1, kh: false, khMuq: -1, muakh: false, voc: false, illa: false, rel: false, nats: [] });
  let C = newClause();
  let pendingPrep = -1, conjFlag = false, lastNom = -1, qawl = false;
  const groups = [];

  const finalize = () => {
    if (C.mub >= 0 && !C.kh) {
      const n = C.nats.filter(j => out[j].head === C.mub).pop();
      if (n !== undefined) { set(n, 'khabar', C.mub, true, R('Comme la phrase n\'a pas d\'autre attribut, ce mot défini est l\'attribut : « X **est** Y ».')); C.kh = true; }
    }
    if (C.khMuq >= 0 && !C.muakh) {
      const g = out[C.khMuq].group;
      if (g) { g.key = 'taalluq'; g.head = C.verb; g.text = R('Le groupe se rattache à un **verbe sous-entendu** (par exemple « je commence… »).'); }
    }
    if (C.verb >= 0 && !C.vSubj) out[C.verb].notes.push(R('Sujet : un **pronom sous-entendu** (« il », « elle »…), déjà contenu dans la forme du verbe.'));
  };
  const boundary = () => { finalize(); C = newClause(); pendingPrep = -1; };

  const groupRole = (p) => {
    // fonction d'un groupe « préposition + nom » (jār wa majrūr)
    const g = { key: 'taalluq', head: -1, text: '' };
    if (C.verb >= 0) { g.head = C.verb; g.text = R('Le groupe « préposition + nom » complète le **verbe** (il dit où, à qui, par quoi…).'); }
    else if (C.mub >= 0 && !C.kh) { g.key = 'khabar'; g.head = C.mub; C.kh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut** (khabar) : il dit ce qu\'on affirme du sujet.'); }
    else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { g.key = 'khabarInna'; g.head = C.innaIsm; C.innaKh = true; g.text = R('Le groupe « préposition + nom » est l\'**attribut de inna**.'); }
    else if (C.inna >= 0 && C.innaIsm < 0) { g.key = 'khabarInna'; g.head = C.inna; C.innaKh = true; g.text = R('Le groupe est l\'**attribut de inna placé en tête** : le nom de inna viendra après.'); }
    else if (C.kana >= 0 && !C.kanaKh) { g.key = 'khabarKana'; g.head = C.kana; C.kanaKh = true; g.text = R('Le groupe est l\'**attribut de kāna**.'); }
    else if (C.mub < 0 && C.khMuq < 0) { g.key = 'khabarMuq'; C.khMuq = p; g.text = R('Le groupe vient **en tête** : c\'est souvent l\'attribut placé avant le sujet (« à lui, il y a … », « pour eux, un châtiment »).'); }
    else g.text = R('Groupe « préposition + nom » : il complète ce qui précède.');
    out[p].group = g; groups.push(p);
  };

  for (let i = 0; i < N; i++) {
    const x = W[i]; const f = x.f; const o = out[i];
    // éléments collés
    x.pre.forEach(p => {
      const r = segmentRole(p.s, p.k, words[i]);
      o.att.push({ ar: p.s[0], label: r.label, text: r.text });
    });
    if (isInitials(words[i])) { set(i, 'inl'); boundary(); continue; }
    if (qawl && f.pos !== 'V') { boundary(); o.notes.push(R('Après « dire », une **nouvelle phrase** commence : ce qui est dit.')); }
    qawl = false;
    const hostAtt = (key, text) => x.pron.forEach(p => o.att.push({ ar: p.s[0], label: IRAB_ROLES[key][2], key, text }));
    if (x.conj) conjFlag = true;
    if (x.pre.some(p => ['REM', 'RSLT', 'SUP', 'CAUS', 'CIRC'].includes(p.g.tags[0]))) boundary();

    if (f.pos === 'P') {
      const sub = f.sub;
      if (sub === 'P') {
        set(i, 'jar');
        if (x.pron.length) { hostAtt('majrur', R('pronom au génitif après la préposition (majrūr)')); groupRole(i); }
        else pendingPrep = i;
      } else if (f.fam === 'إِنّ' || sub === 'ACC') {
        boundary(); set(i, 'inna'); C.inna = i;
        if (/^لَا/.test(x.st.seg[0])) o.notes.push(R('لَا de **négation absolue** : « il n\'y a aucun … » ; elle agit comme إِنَّ (nom à l\'accusatif sans tanwīn).'));
        if (x.pron.length) { hostAtt('ismInna', R('pronom collé : c\'est le nom de inna')); C.innaIsm = i; }
      } else if (sub === 'CONJ') { set(i, 'harf'); conjFlag = true; }
      else if (sub === 'EXP' || sub === 'RES') { set(i, 'harf'); C.illa = true; }
      else if (sub === 'VOC') { set(i, 'harf'); C.voc = true; }
      else {
        if (['COND', 'SUB', 'REM', 'INC', 'SUR', 'EXL'].includes(sub)) boundary();
        set(i, 'harf');
        if (x.pron.length) hostAtt('noun', 'pronom collé à la particule');
      }
      if (PARTICLES[sub]) o.notes.push(cap(PARTICLES[sub]) + '.');
      continue;
    }

    if (f.pos === 'V') {
      if (C.mub >= 0 && !C.kh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut** (khabar) du sujet ' + words[C.mub].map(s => s[0]).join('') + ' : une phrase verbale à l\'intérieur de la phrase nominale.')); o.khOf = C.mub; C.kh = true; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de inna**.')); o.khOf = C.innaIsm; C.innaKh = true; }
      else if (C.kana >= 0 && C.kanaIsm >= 0 && !C.kanaKh) { o.notes.push(R('Ce verbe et sa suite forment l\'**attribut de kāna**.')); o.khOf = C.kana; C.kanaKh = true; }
      else if (C.rel) o.notes.push(R('Ce verbe ouvre la **proposition relative** (ṣila) : « … qui a fait, qui fait ».'));
      const relBefore = C.rel;
      finalize(); C = newClause(); pendingPrep = -1;
      set(i, 'verb'); C.verb = i; C.vPass = f.pass;
      if (relBefore) C.vSubj = true; // le relatif est le sujet
      const subjSuffix = x.pron.find((p, k) => k === 0 && p.g.person === f.person && isSubjectSuffix(f, f.person));
      if (subjSuffix) { C.vSubj = true; o.att.push({ ar: subjSuffix.s[0], label: f.pass ? 'nāʾib fāʿil' : 'fāʿil', key: f.pass ? 'naib' : 'fail', text: R('terminaison de personne : c\'est le **sujet** (« ' + PERSONS[f.person][0] + ' »)') }); }
      else if (f.aspect === 'IMPV' || /^[12]/.test(f.person)) { C.vSubj = true; o.notes.push(R('Sujet : « ' + (PERSONS[f.person] ? PERSONS[f.person][0] : 'toi') + ' », contenu dans la forme du verbe (pronom sous-entendu).')); }
      x.pron.filter(p => p !== subjSuffix).forEach(p => { C.vObj = true; o.att.push({ ar: p.s[0], label: 'mafʿūl bihi', key: 'maful', text: R('pronom complément : « ' + (PRON_SUFFIX_FR[p.g.person] || '').split(' / ')[0] + ' » (COD)') }); });
      if (f.fam === 'كَان' || /^(كَان|لَيْس|أَصْبَح|ظَلّ|صَار|أَمْسَى)/.test(f.lem || '')) {
        C.kana = i;
        o.notes.push(R('**kāna et ses sœurs** (كَانَ، لَيْسَ، أَصْبَحَ…) : le sujet reste au nominatif, l\'**attribut passe à l\'accusatif**.'));
        if (subjSuffix) C.kanaIsm = i;
      }
      if (lemRoot(x) === 'قول') qawl = true;
      conjFlag = false;
      continue;
    }

    /* ---------------- noms ---------------- */
    const cas = f.cas; const sub = f.sub;
    const prevN = (() => { for (let j = i - 1; j >= 0; j--) { if (W[j].f.pos === 'N') return j; if (W[j].f.pos !== 'P' || W[j].f.sub !== 'CONJ') return -1; } return -1; })();
    const p1 = i > 0 && W[i - 1].f.pos === 'N' ? i - 1 : -1;
    const sameCase = j => j >= 0 && W[j].f.cas === cas;
    const agrees = j => j >= 0 && sameCase(j) && isDef(j) === isDef(i) && !['PRON', 'REL'].includes(W[j].f.sub);
    const firstOf = j => { while (j >= 0 && ['nat', 'badal'].includes(out[j].key) && out[j].head >= 0) j = out[j].head; return j; };
    const conjHere = conjFlag && !x.prep;
    let done = false;

    if (x.prep) {
      set(i, 'majrur', -1, false, R('Il est au génitif à cause de la préposition ' + x.prep.s[0] + ' collée devant lui.'));
      groupRole(i); done = true;
    } else if (pendingPrep >= 0 && (cas === 'GEN' || !cas)) {
      set(i, 'majrur', pendingPrep); groupRole(pendingPrep); pendingPrep = -1; done = true;
    } else if (sub === 'REL') {
      set(i, 'rel', p1 >= 0 ? p1 : -1, true); C.rel = true; done = true;
      if (p1 >= 0) o.notes.push(R('Il dépend de ' + wordText(words[p1]) + ' : « ' + wordText(words[p1]) + ' … **qui / que** … ».'));
      if (C.verb >= 0 && !C.vSubj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **sujet** au verbe.')); C.vSubj = true; }
      else if (C.verb >= 0 && !C.vObj) { o.notes.push(R('Ici, le relatif et sa phrase servent de **complément** au verbe.')); C.vObj = true; }
      else if (C.inna >= 0 && C.innaIsm < 0) { o.notes.push(R('Ici, le relatif est le **nom de inna** (« ceux qui… »).')); C.innaIsm = i; }
      else if (C.mub < 0 && C.verb < 0 && !conjHere && p1 < 0) { o.notes.push(R('Ici, le relatif ouvre la phrase : c\'est le **sujet** (« ceux qui… »).')); C.mub = i; }
    } else if (sub === 'PRON' && /^إيا/.test(x.st.seg[0].replace(/[ً-ْٰ]/g, ''))) {
      let v = -1; for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'maful', v, false, R('إِيَّا + pronom : complément d\'objet **placé avant le verbe** pour insister (« c\'est Toi que… »).'));
      done = true;
    } else if (W[i - 1] && W[i - 1].f.sub === 'DEM' && x.det) {
      set(i, 'badal', i - 1, false, R('Après un démonstratif, le nom avec ال dit **de quoi on parle** : هَٰذَا ٱلْكِتَٰبُ = « ce livre ».'));
      if (out[i - 1].key === 'mubtada') { C.nats.push(i); }
      done = true;
    } else if (C.voc && !cas) { set(i, 'munada'); C.voc = false; done = true; }
    else if (!cas && (sub === 'T' || sub === 'LOC')) {
      let v = C.verb; if (v < 0) for (let j = i + 1; j < N; j++) if (W[j].f.pos === 'V') { v = j; break; }
      set(i, 'zarf', v, false, R('Adverbe de temps ou de lieu : il situe l\'action (« quand, lorsque, là où »).')); done = true;
    } else if (sub === 'COND') { boundary(); set(i, 'shart', -1, false, R('Il ouvre une **condition** : le premier verbe est la condition, le second la réponse (souvent tous deux à l\'apocopé).')); done = true; }
    else if ((sub === 'INTG' || /^(كيف|أين|متى|أنى)$/.test(skeleton(x.st.seg[0]))) && !x.prep) { set(i, 'istifham'); done = true; }
    if (done) { lastNom = i; conjFlag = false; continue; }

    if (sub === 'PRON' || sub === 'DEM') {
      if (conjHere && (C.kh || C.innaKh || (C.verb >= 0 && C.vSubj))) boundary();
      if (C.mub < 0 && C.verb < 0 && C.inna < 0 && C.khMuq < 0) { set(i, 'mubtada'); C.mub = i; }
      else if ((C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) || (C.mub >= 0 && !C.kh && i + 1 < N && W[i + 1].f.cas === 'NOM' && W[i + 1].det)) set(i, 'fasl', -1, true);
      else if (C.mub >= 0 && !C.kh) { set(i, 'khabar', C.mub, true); C.kh = true; }
      else if (C.illa) { set(i, 'mustathna', -1, true); C.illa = false; }
      else if (C.verb >= 0 && !C.vSubj) { set(i, 'fail', C.verb, true); C.vSubj = true; }
      else if (C.khMuq >= 0 && !C.muakh) { set(i, 'mubtadaMuakh', C.khMuq, true); C.muakh = true; }
      else set(i, 'noun');
      lastNom = i; conjFlag = false; continue;
    }

    const looksAdj = sub === 'ADJ' || ((sub === 'ACT_PCPL' || sub === 'PASS_PCPL') && cas);
    let mHead = -1;
    if (conjHere) {
      for (let k = i - 1; k >= 0; k--) if (W[k].f.pos === 'N' && W[k].f.cas === cas && out[k].key !== 'mudafIlayh') { mHead = firstOf(k); break; }
      if (mHead < 0) for (let k = i - 1; k >= 0; k--) if (W[k].f.pos === 'N' && W[k].f.cas === cas) { mHead = k; break; }
    }
    if (C.voc && cas) { set(i, 'munada', -1, false); C.voc = false; }
    else if (mHead >= 0) set(i, 'matuf', mHead, false, R('Relié par « et » : il prend **le même cas** que ' + wordText(words[mHead]) + '.'));
    else if (p1 >= 0 && agrees(p1) && (looksAdj || (x.det && isDef(p1) && W[p1].f.sub !== 'DEM')) && !(out[p1].key === 'mubtada' && !x.det && !looksAdj)) {
      const head = out[p1].key === 'nat' && out[p1].head >= 0 ? out[p1].head : p1;
      const kind = W[p1].f.sub === 'PN' && !looksAdj ? 'badal' : 'nat';
      set(i, kind, head, kind === 'badal', R('Il suit ' + wordText(words[head]) + ' et le copie : **même cas, même défini/indéfini**' + (kind === 'nat' ? ', même genre et même nombre.' : '.')));
      if (out[head].key === 'mubtada' || head === C.mub) C.nats.push(i);
    }
    else if (cas === 'GEN') {
      if (p1 >= 0 && !W[p1].det && !W[p1].f.indef && !W[p1].pron.length && !['PRON', 'DEM', 'REL'].includes(W[p1].f.sub) && W[p1].f.pos === 'N') {
        set(i, 'mudafIlayh', p1, false, R('**Annexion** (iḍāfa) : ' + wordText(words[p1]) + ' (sans ال ni tanwīn) + ce mot au génitif = « ' + (W[p1].st.seg[3] >= 0 ? '…' : '') + ' de … ».'));
      } else set(i, 'noun', -1, true, R('Génitif sans préposition juste avant : il complète ou précise un mot plus haut (souvent la suite du verset précédent).'));
    }
    else if (cas === 'NOM') {
      if (C.verb >= 0 && !C.vSubj) { set(i, C.vPass ? 'naib' : 'fail', C.verb); C.vSubj = true; if (C.kana === C.verb) { o.key = 'ismKana'; C.kanaIsm = i; } }
      else if (C.kana >= 0 && C.kanaIsm < 0) { set(i, 'ismKana', C.kana); C.kanaIsm = i; }
      else if (C.inna >= 0 && C.innaIsm >= 0 && !C.innaKh) { set(i, 'khabarInna', C.innaIsm); C.innaKh = true; }
      else if (C.khMuq >= 0 && !C.muakh) { set(i, 'mubtadaMuakh', C.khMuq); C.muakh = true; }
      else if (C.mub >= 0 && !C.kh) { set(i, 'khabar', C.mub); C.kh = true; }
      else if (C.mub >= 0 && C.kh) set(i, 'khabar', C.mub, true, R('Un deuxième attribut : on dit encore autre chose du même sujet.'));
      else if (C.verb < 0 && C.inna < 0) { set(i, 'mubtada'); C.mub = i; }
      else set(i, 'noun', -1, true, R('Nominatif : sujet ou attribut d\'une petite phrase à l\'intérieur du verset.'));
    }
    else if (cas === 'ACC') {
      if (C.inna >= 0 && C.innaIsm < 0) { set(i, 'ismInna', C.inna); C.innaIsm = i; }
      else if (C.illa) { set(i, 'mustathna'); C.illa = false; }
      else if (C.kana >= 0 && !C.kanaKh) { set(i, 'khabarKana', C.kana); C.kanaKh = true; }
      else if (sub === 'T' || sub === 'LOC') set(i, 'zarf', C.verb, false);
      else if (C.verb >= 0 && !x.det && W[C.verb].st.seg[3] >= 0 && x.st.seg[3] >= 0 && lemRoot(W[C.verb]) && lemRoot(W[C.verb]) === lemRoot(x) && (sub === 'VN' || !sub)) set(i, 'mutlaq', C.verb, false, R('Nom verbal de la **même racine** que le verbe : il renforce l\'action (« il frappa une frappe » = il frappa fort).'));
      else if (C.verb >= 0 && !C.vObj && x.f.indef && groups.some(g => g > C.verb) && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true, R('Indéfini à l\'accusatif après le verbe et son complément : il dit **dans quel état** se fait l\'action (« en foule », « sincèrement »).'));
      else if (C.verb >= 0 && !C.vObj) { set(i, 'maful', C.verb, false); C.vObj = true; }
      else if (C.verb >= 0 && x.f.indef && (looksAdj || /P$/.test(f.gn || ''))) set(i, 'hal', C.verb, true);
      else if (C.verb >= 0) set(i, 'maful', C.verb, true, R('Deuxième complément à l\'accusatif (certains verbes en ont deux : « donner quelque chose à quelqu\'un »), ou complément d\'état.'));
      else set(i, 'noun', -1, true, R('Accusatif : complément (objet, état, temps…) d\'un verbe plus haut dans le passage.'));
    }
    else set(i, 'noun', -1, true);
    lastNom = i; conjFlag = false;
  }
  finalize();
  return out;
}
let IRAB_LEMMAS = null;
function lemRoot(x) { return IRAB_LEMMAS && x.st.seg[3] >= 0 && IRAB_LEMMAS[x.st.seg[3]] ? IRAB_LEMMAS[x.st.seg[3]][3] : ''; }

/* Phrase d'iʿrāb « à la manière des grammairiens », en français */
function irabSentence(words, res, k) {
  const r = res[k]; const x = irabWordInfo(words[k]); const role = IRAB_ROLES[r.key] || IRAB_ROLES.noun;
  let s = '**' + irabRoleName(r.key) + '** (' + role[2] + ', ' + role[1] + ')';
  if (r.guess) s += ' — *probable*';
  if (r.head >= 0 && role[4]) s += ', rattaché à ' + wordText(words[r.head]);
  if (x.f.pos === 'N' && x.f.cas) s += ' ; ' + CASE_SHORT[x.f.cas];
  if (x.f.pos === 'V') s += ' ; ' + ({ PERF: 'passé', IMPF: 'présent', IMPV: 'impératif' }[x.f.aspect] || '') + (x.f.mood ? ' ' + MOOD_SHORT[x.f.mood] : '') + (x.f.pass ? ', passif' : '');
  return s + '.';
}
