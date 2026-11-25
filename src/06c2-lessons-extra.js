/* ====================================================================
 * 06c2 - Leçons de grammaire : un schéma par notion et des exercices variés
 * (vrai/faux, associer, remettre dans l'ordre). Ajoutés aux leçons de 06c.
 * Schémas : blocks = mots en blocs colorés avec leur rôle (de droite à gauche),
 *           root = la racine colorée dans chaque mot, big = cartes côte à côte.
 * Couleurs de rôle : v verbe, s sujet / nominatif, o complément / accusatif,
 *                    g génitif, a attribut, p petit mot, x neutre.
 * ==================================================================== */
const LESSON_EXTRA = {
  racine: {
    viz: [
      [0, { t: 'root', words: [['عَلِمَ', 'il a su', 'علم'], ['عَلَّمَ', 'il a enseigné', 'علم'], ['عِلْم', 'le savoir', 'علم'], ['عَالِم', 'un savant', 'علم'], ['مَعْلُوم', 'connu', 'علم']], cap: 'Les 3 lettres de la racine (en couleur) restent ; le moule change autour.' }],
      [2, { t: 'root', words: [['كَاتِب', 'celui qui écrit', 'كتب'], ['عَالِم', 'celui qui sait', 'علم'], ['كَافِر', 'celui qui renie', 'كفر'], ['خَالِق', 'celui qui crée', 'خلق']], cap: 'Le moule fāʿil : un ā après la 1re lettre, un i après la 2e.' }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : pour trouver un mot dans un dictionnaire arabe, on cherche sa première lettre.', a: false, why: 'Faux : on cherche sa **racine** (ex. مَعْلُوم se cherche à ع ل م).' },
      { k: 'match', q: 'Associe chaque mot à sa racine.', pairs: [['خَلَقَ', 'خ ل ق'], ['كَاتِب', 'ك ت ب'], ['عِلْم', 'ع ل م'], ['ٱقْرَأْ', 'ق ر أ']], why: 'Enlève voyelles, alif de prolongation et lettres ajoutées : il reste 3 consonnes.' },
      { k: 'mcq', q: 'Quel mot n\'a **pas** la même racine que les autres ?', o: ['قَلَم', 'عَلِمَ', 'عَالِم', 'عِلْم'], a: 0, why: 'قَلَم (le calame) vient de ق ل م ; les trois autres de ع ل م.' },
      { k: 'tf', q: 'Vrai ou faux : عَلَّمَ et عَلِمَ ont la même racine mais pas le même moule.', a: true, why: 'Même racine ع ل م ; la **chadda** du moule faʿʿala donne « faire savoir » = enseigner.' },
    ],
  },
  defini: {
    viz: [
      [0, { t: 'big', items: [['ٱلْكِتَابُ', 'défini : ال → le livre'], ['كِتَابٌ', 'indéfini : tanwīn → un livre'], ['ٱلْكِتَابٌ', '❌ impossible : les deux']] }],
      [2, { t: 'blocks', rows: [{ join: true, w: [['ٱل', 'l muet', 'p'], ['شَّمْسُ', 'ش doublé', 'x']], cap: 'ash-shamsu : lettre solaire' }, { join: true, w: [['ٱلْ', 'on entend le l', 'p'], ['قَمَرُ', '', 'x']], cap: 'al-qamaru : lettre lunaire' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : أَحَدٌ (aḥadun) est défini.', a: false, why: 'Le tanwīn -un marque un nom **indéfini** : « un, unique ».' },
      { k: 'match', q: 'Associe chaque mot à sa lecture.', pairs: [['ٱلنَّاسِ', 'an-nāsi'], ['ٱلْفَلَقِ', 'al-falaqi'], ['ٱلدِّينِ', 'ad-dīni'], ['ٱلْحَمْدُ', 'al-ḥamdu']], why: 'Lettre solaire (ن د) : pas de l. Lettre lunaire (ف ح) : on entend le l.' },
      { k: 'mcq', q: 'كِتَابُكَ (ton livre) est…', o: ['défini', 'indéfini'], a: 0, why: 'Le possessif ـكَ rend le nom **défini**, sans ال.' },
      { k: 'order', q: 'Remets dans l\'ordre : « Le Seigneur de l\'univers » (de droite à gauche).', words: ['رَبِّ', 'ٱلْعَٰلَمِينَ'], why: 'رَبِّ ٱلْعَٰلَمِينَ : le premier nom n\'a ni ال ni tanwīn, il est défini par le second.' },
    ],
  },
  cas: {
    viz: [
      [0, { t: 'big', items: [['ٱللَّهُ', '-u · nominatif · sujet'], ['ٱللَّهَ', '-a · accusatif · complément'], ['ٱللَّهِ', '-i · génitif · après « de », « à »']] }],
    ],
    more: [
      { k: 'match', q: 'Associe chaque fin au cas.', pairs: [['-u / -un', 'nominatif (rafʿ)'], ['-a / -an', 'accusatif (naṣb)'], ['-i / -in', 'génitif (jarr)']], why: 'u → nominatif, a → accusatif, i → génitif.' },
      { k: 'tf', q: 'Vrai ou faux : dans ٱلْحَمْدُ لِلَّهِ, le mot ٱللَّهِ est au génitif à cause de لِ.', a: true, why: 'Après une préposition (ici لِ, « à »), le nom est au **génitif** : -i.' },
      { k: 'mcq', q: 'ٱلْمُسْلِمُونَ / ٱلْمُسْلِمِينَ : la forme en -īna sert pour…', o: ['l\'accusatif et le génitif', 'le nominatif seulement', 'le féminin'], a: 0, why: 'Pluriel masculin : **-ūna** au nominatif, **-īna** à l\'accusatif et au génitif.' },
    ],
  },
  prep: {
    viz: [
      [0, { t: 'blocks', rows: [{ join: true, w: [['بِ', 'avec, par', 'p'], ['سْمِ', 'génitif -i', 'g']], cap: 'bismi : « au nom de »' }, { w: [['فِي', 'dans', 'p'], ['ٱلْأَرْضِ', 'génitif -i', 'g']], cap: 'fī l-arḍi : « sur la terre »' }, { w: [['مِن', 'de', 'p'], ['شَرِّ', 'génitif -i', 'g']], cap: 'min sharri : « contre le mal »' }] }],
    ],
    more: [
      { k: 'match', q: 'Associe chaque préposition à son sens.', pairs: [['فِي', 'dans'], ['مِنْ', 'de, depuis'], ['عَلَىٰ', 'sur'], ['إِلَىٰ', 'vers'], ['لِ', 'à, pour']], why: 'Ce sont les cinq prépositions les plus fréquentes du Coran.' },
      { k: 'tf', q: 'Vrai ou faux : après une préposition, le nom est toujours à l\'accusatif.', a: false, why: 'Après une préposition, le nom est au **génitif** (-i, -in, -īna).' },
      { k: 'mcq', q: 'عَلَيْهِمْ veut dire…', o: ['sur eux', 'vers eux', 'avec eux'], a: 0, why: 'عَلَىٰ (sur) + ـهِمْ (eux). Le ā devient ay devant un pronom.' },
    ],
  },
  idafa: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['رَبِّ', 'nom 1 : ni ال ni tanwīn', 's'], ['ٱلْعَٰلَمِينَ', 'nom 2 : génitif', 'g']], cap: 'le Seigneur de l\'univers' }, { w: [['يَوْمِ', 'nom 1', 's'], ['ٱلدِّينِ', 'nom 2 : génitif -i', 'g']], cap: 'le jour du Jugement' }, { join: true, w: [['رَبُّ', 'nom 1', 's'], ['كَ', 'pronom = nom 2', 'g']], cap: 'ton Seigneur : le possessif est une annexion' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : dans une annexion, le premier nom peut porter ال.', a: false, why: 'Le premier nom n\'a **ni ال ni tanwīn** : c\'est le second qui le rend défini.' },
      { k: 'order', q: 'Remets dans l\'ordre : « le Roi des gens » (de droite à gauche).', words: ['مَلِكِ', 'ٱلنَّاسِ'], why: 'مَلِكِ ٱلنَّاسِ (114:2) : le possédé d\'abord, puis le « possesseur » au génitif.' },
      { k: 'mcq', q: 'Dans رَبِّ ٱلْفَلَقِ, pourquoi ٱلْفَلَقِ finit-il par -i ?', o: ['c\'est le 2e nom d\'une annexion (génitif)', 'c\'est un sujet', 'c\'est un verbe'], a: 0, why: 'Le second nom d\'une annexion est **toujours au génitif**.' },
    ],
  },
  pronoms: {
    viz: [
      [0, { t: 'blocks', rows: [{ join: true, w: [['رَبُّ', 'Seigneur', 'x'], ['نَا', 'notre', 'g']], cap: 'notre Seigneur' }, { join: true, w: [['عَلَيْ', 'sur', 'p'], ['هِمْ', 'eux', 'g']], cap: 'sur eux' }, { join: true, w: [['نَعْبُدُ', 'nous adorons', 'v'], ['كَ', 'toi (complément)', 'o']], cap: 'nous T\'adorons : le pronom collé au verbe = complément' }] }],
    ],
    more: [
      { k: 'match', q: 'Associe chaque pronom collé à son sens.', pairs: [['ـكَ', 'ton, toi'], ['ـهُ', 'son, lui'], ['ـنَا', 'notre, nous'], ['ـهُمْ', 'leur, eux'], ['ـِي', 'mon, moi']], why: 'Les pronoms collés les plus fréquents.' },
      { k: 'tf', q: 'Vrai ou faux : dans بِهِ, ـهُ devient ـهِ à cause du i de بِ.', a: true, why: 'Après un **i** ou un **y**, hu devient **hi** : بِهِ, عَلَيْهِ.' },
      { k: 'mcq', q: 'Que veut dire رَبَّكَ ?', o: ['ton Seigneur', 'notre Seigneur', 'leur Seigneur'], a: 0, why: 'ـكَ = ton, toi (masculin).' },
      { k: 'tf', q: 'Vrai ou faux : un nom avec un pronom collé peut avoir aussi le tanwīn.', a: false, why: 'Le pronom collé rend le nom défini : **pas de tanwīn**.' },
    ],
  },
  nominale: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['ٱللَّهُ', 'sujet (mubtadaʾ) -u', 's'], ['ٱلصَّمَدُ', 'attribut (khabar) -u', 'a']], cap: '« Allah [est] l\'Absolu » : pas de verbe « être »' }, { w: [['هُوَ', 'sujet : lui', 's'], ['ٱللَّهُ', 'attribut', 'a'], ['أَحَدٌ', 'attribut 2', 'a']], cap: '« Il [est] Allah, Unique »' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : pour dire « Allah est grand », il faut un verbe « être » au présent.', a: false, why: 'Au présent, l\'arabe **n\'écrit pas** le verbe être : ٱللَّهُ أَكْبَرُ.' },
      { k: 'order', q: 'Remets dans l\'ordre : « Allah est l\'Absolu » (de droite à gauche).', words: ['ٱللَّهُ', 'ٱلصَّمَدُ'], why: 'Sujet puis attribut, tous deux au nominatif (-u).' },
      { k: 'mcq', q: 'Dans une phrase nominale simple, le sujet et l\'attribut sont…', o: ['au nominatif (-u)', 'à l\'accusatif (-a)', 'au génitif (-i)'], a: 0, why: 'Sans inna ni kāna, les deux sont au **nominatif**.' },
    ],
  },
  adjectif: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['ٱلصِّرَٰطَ', 'nom : défini · masc. · sing. · -a', 'o'], ['ٱلْمُسْتَقِيمَ', 'adjectif : pareil', 'o']], cap: 'le chemin droit : 4 accords (défini, genre, nombre, cas)' }, { w: [['ٱلرَّحْمَٰنِ', 'défini · -i', 'g'], ['ٱلرَّحِيمِ', 'défini · -i', 'g']], cap: 'le Tout-Miséricordieux, le Très-Miséricordieux' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : en arabe, l\'adjectif se place avant le nom.', a: false, why: 'L\'adjectif vient **après** le nom, comme souvent en français.' },
      { k: 'match', q: 'Associe le groupe à sa nature.', pairs: [['ٱلْكِتَابُ ٱلْكَبِيرُ', 'nom + adjectif : le grand livre'], ['ٱلْكِتَابُ كَبِيرٌ', 'phrase : le livre est grand']], why: 'Même ال des deux côtés → adjectif. ال sur le premier seulement → phrase nominale.' },
      { k: 'mcq', q: 'Quel adjectif va avec نَارٌ حَامِيَةٌ (un feu ardent) ?', o: ['حَامِيَةٌ : féminin, indéfini, -un', 'ٱلْحَامِيَةُ', 'حَامِيَةً'], a: 0, why: 'نَارٌ est féminin, indéfini, au nominatif : l\'adjectif fait pareil.' },
    ],
  },
  passe: {
    viz: [
      [0, { t: 'blocks', rows: [{ join: true, w: [['خَلَقَ', 'il a créé', 'v']], cap: 'la forme du dictionnaire : « il » au passé' }, { join: true, w: [['خَلَقْ', 'radical', 'v'], ['نَا', 'nous', 's']], cap: 'nous avons créé' }, { join: true, w: [['خَلَقْ', 'radical', 'v'], ['تَ', 'tu', 's']], cap: 'tu as créé' }, { join: true, w: [['خَلَقُ', 'radical', 'v'], ['وا', 'ils', 's']], cap: 'ils ont créé' }] }],
    ],
    more: [
      { k: 'match', q: 'Associe chaque fin au sujet.', pairs: [['ـتُ', 'je'], ['ـتَ', 'tu'], ['ـنَا', 'nous'], ['ـُوا', 'ils'], ['ـَتْ', 'elle']], why: 'Au passé, le sujet est **à la fin** du verbe.' },
      { k: 'tf', q: 'Vrai ou faux : أَنْعَمْتَ veut dire « tu as comblé ».', a: true, why: 'ـتَ à la fin = **tu** (masculin).' },
      { k: 'mcq', q: 'Comment dit-on « nous avons fait descendre » avec أَنزَلَ ?', o: ['أَنزَلْنَا', 'أَنزَلُوا', 'أَنزَلْتُ'], a: 0, why: 'ـنَا = nous : إِنَّآ أَنزَلْنَٰهُ (97:1).' },
    ],
  },
  verbale: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['كَتَبَ', 'verbe', 'v'], ['ٱلطَّالِبُ', 'sujet -u', 's'], ['ٱلدَّرْسَ', 'complément -a', 'o']], cap: 'l\'élève a écrit la leçon : verbe → sujet → complément' }, { w: [['خَلَقَ', 'verbe (sujet caché : il)', 'v'], ['ٱلْإِنسَٰنَ', 'complément -a', 'o']], cap: '96:2 : « Il a créé l\'homme »' }] }],
    ],
    more: [
      { k: 'order', q: 'Remets dans l\'ordre arabe : « Il a créé l\'homme » (de droite à gauche).', words: ['خَلَقَ', 'ٱلْإِنسَٰنَ'], why: 'Le verbe d\'abord, puis le complément à l\'accusatif (-a).' },
      { k: 'tf', q: 'Vrai ou faux : dans قَالَ ٱلنَّاسُ, le verbe est au singulier alors que le sujet est un pluriel.', a: true, why: 'Quand le verbe est **devant** son sujet, il reste au singulier.' },
      { k: 'mcq', q: 'Dans une phrase verbale, comment repère-t-on le sujet ?', o: ['il finit par -u (nominatif)', 'il finit par -a', 'il est toujours le premier mot'], a: 0, why: 'Le sujet est au **nominatif** ; le complément à l\'accusatif.' },
    ],
  },
  present: {
    viz: [
      [0, { t: 'blocks', rows: [{ join: true, w: [['يَ', 'il', 'p'], ['عْلَمُ', 'savoir · -u', 'v']], cap: 'il sait' }, { join: true, w: [['نَ', 'nous', 'p'], ['عْبُدُ', 'adorer · -u', 'v']], cap: 'nous adorons' }, { join: true, w: [['تَ', 'tu / elle', 'p'], ['عْلَمُ', '', 'v']], cap: 'tu sais' }, { join: true, w: [['أَ', 'je', 'p'], ['عْبُدُ', '', 'v']], cap: 'j\'adore' }] }],
      [3, { t: 'blocks', rows: [{ join: true, w: [['سَ', 'futur', 'x'], ['يَعْلَمُونَ', 'ils savent', 'v']], cap: 'ils sauront' }] }],
    ],
    more: [
      { k: 'match', q: 'Associe chaque préfixe à la personne.', pairs: [['أَـ', 'je'], ['نَـ', 'nous'], ['تَـ', 'tu (ou elle)'], ['يَـ', 'il']], why: 'Le petit mot « أَنَيْتُ » aide à les retenir : أ ن ي ت.' },
      { k: 'tf', q: 'Vrai ou faux : après لَمْ, le verbe perd son -u final (يَلِدْ).', a: true, why: 'لَمْ met le verbe à l\'**apocopé** : la fin se ferme (soukoun).' },
      { k: 'mcq', q: 'Que veut dire سَيَعْلَمُونَ ?', o: ['ils sauront', 'ils savaient', 'ils ont su'], a: 0, why: 'سَـ devant le présent = **futur**.' },
    ],
  },
  imperatif: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['تَقْرَأُ', 'tu lis', 'x']], cap: '1. on part du présent à « tu »' }, { w: [['قْرَأْ', 'sans préfixe, fin fermée', 'x']], cap: '2. on enlève تَـ et on ferme la fin' }, { w: [['ٱقْرَأْ', 'lis !', 'v']], cap: '3. on ajoute ٱ pour pouvoir commencer le mot' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : قُلْ (dis !) vient de تَقُولُ (tu dis).', a: true, why: 'On enlève تَـ, on ferme la fin, et le ū devient u : قُلْ.' },
      { k: 'mcq', q: 'Comment dit-on « Ne fais pas ! » ?', o: ['لَا + présent apocopé : لَا تَفْعَلْ', 'مَا + impératif', 'لَمْ + impératif'], a: 0, why: 'L\'impératif ne se nie pas : on utilise لَا + le présent apocopé.' },
      { k: 'order', q: 'Remets dans l\'ordre : « Guide-nous sur le chemin droit » (de droite à gauche).', words: ['ٱهْدِنَا', 'ٱلصِّرَٰطَ', 'ٱلْمُسْتَقِيمَ'], why: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ (1:6) : impératif + نَا, puis le complément et son adjectif.' },
      { k: 'match', q: 'Associe l\'impératif à son sens.', pairs: [['ٱقْرَأْ', 'lis !'], ['قُلْ', 'dis !'], ['ٱهْدِنَا', 'guide-nous !'], ['ٱعْبُدُوا', 'adorez !']], why: 'Ce sont des impératifs du Coran (96:1, 112:1, 1:6, 2:21).' },
    ],
  },
  inna: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['إِنَّ', 'certes', 'p'], ['ٱللَّهَ', 'nom de inna : -a', 'o'], ['غَفُورٌ', 'attribut : -u', 's']], cap: 'inna → le nom passe à l\'accusatif' }] }],
      [1, { t: 'blocks', rows: [{ w: [['كَانَ', 'il était', 'p'], ['ٱللَّهُ', 'nom de kāna : -u', 's'], ['غَفُورًا', 'attribut : -a', 'o']], cap: 'kāna → l\'attribut passe à l\'accusatif' }] }],
    ],
    more: [
      { k: 'tf', q: 'Vrai ou faux : après إِنَّ, le nom se met à l\'accusatif (-a).', a: true, why: 'inna → le **nom** à l\'accusatif ; l\'attribut reste au nominatif.' },
      { k: 'tf', q: 'Vrai ou faux : après كَانَ, l\'attribut reste au nominatif (-u).', a: false, why: 'kāna → l\'**attribut** passe à l\'accusatif : كَانَ ٱللَّهُ غَفُورًا.' },
      { k: 'match', q: 'Associe le mot à ce qu\'il change.', pairs: [['إِنَّ', 'le nom → -a'], ['كَانَ', 'l\'attribut → -a']], why: 'inna → le nom ; kāna → l\'attribut.' },
    ],
  },
  irab: {
    viz: [
      [0, { t: 'blocks', rows: [{ w: [['ٱلْحَمْدُ', 'sujet (mubtadaʾ) -u', 's'], ['لِلَّهِ', 'attribut : prép. + nom', 'a'], ['رَبِّ', 'qualifie Allah : -i', 'g'], ['ٱلْعَٰلَمِينَ', 'complément du nom : -īna', 'g']], cap: '1:2 « La louange est à Allah, Seigneur de l\'univers »' }] }],
    ],
    more: [
      { k: 'order', q: 'Remets dans l\'ordre le verset 1:5 (de droite à gauche).', words: ['إِيَّاكَ', 'نَعْبُدُ', 'وَإِيَّاكَ', 'نَسْتَعِينُ'], why: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ : le complément « Toi » est mis **devant** pour insister.' },
      { k: 'tf', q: 'Vrai ou faux : dans إِيَّاكَ نَعْبُدُ, إِيَّاكَ est le sujet.', a: false, why: 'إِيَّاكَ est le **complément** placé en tête ; le sujet (nous) est dans نَـ.' },
    ],
  },
};
/* on ajoute schémas et questions aux leçons */
LESSONS.forEach(L => {
  const X = LESSON_EXTRA[L.id]; if (!X) return;
  (X.viz || []).forEach(([i, v]) => { if (L.sections[i]) L.sections[i].viz = v; });
  // les nouvelles questions s'intercalent : une ancienne, une nouvelle…
  const old = L.practice.slice(); const add = (X.more || []).slice(); const out = [];
  while (old.length || add.length) { if (old.length) out.push(old.shift()); if (add.length) out.push(add.shift()); }
  L.practice = out;
});
