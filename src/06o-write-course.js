/* ====================================================================
 * 06o - Le cours d'écriture : 10 leçons avec explications, schémas et quiz.
 * Chaque leçon : des étapes (titre, texte, un schéma « viz »), puis un quiz.
 * Types de schéma (dessinés par 06p) :
 *  ruler  : le texte posé sur ses lignes (haut, ligne de base, bas), avec les zones
 *  alifdots : le alif mesuré en points
 *  pieces : un mot coupé en morceaux attachés, en couleurs
 *  skel   : les squelettes communs et les lettres qu'on obtient avec les points
 *  forms  : les 4 formes de quelques lettres
 *  cmp    : des cartes côte à côte (✅ / ❌ / neutre)
 *  styles : le même texte dans plusieurs styles d'écriture
 *  demo   : le geste animé ; trace : un cadre pour tracer sur le modèle
 *  marks  : une lettre avec chaque signe, et son nom
 * ==================================================================== */
const WRITE_COURSE = [
  {
    id: 'c1', title: "La ligne et le sens de l'écriture", ar: 'السَّطْرُ', min: 15,
    steps: [
      { h: "De droite à gauche", md: "L'arabe s'écrit et se lit **de droite à gauche**. Chaque ligne commence au bord **droit** de la page, et chaque mot commence par sa lettre la plus à droite.\n\nUn cahier arabe s'ouvre donc « à l'envers » pour nous : la première page est celle qui, en français, serait la dernière.\n\nBonne nouvelle si tu es droitier : ta main avance vers la gauche, donc elle ne passe **jamais sur l'encre fraîche**.", viz: { t: 'ruler', text: 'بِسْمِ ٱللَّهِ', arrow: true } },
      { h: "La ligne de base", md: "Toutes les lettres s'appuient sur **une ligne invisible**, la ligne de base (en pointillé dans l'Atelier). C'est sur elle que les lettres se **posent** et que passe le **trait qui les attache**.\n\nPar rapport à cette ligne, il y a **3 zones** :\n- **au-dessus** : la hampe des lettres hautes (ا ل ك ط ظ), les points et les voyelles du haut ;\n- **sur la ligne** : le corps de la plupart des lettres ;\n- **en dessous** : la queue des lettres qui « plongent » (ر ز و ن ي ج ح خ ع غ م ق س ش ص ض…), les points et la voyelle du bas.", viz: { t: 'ruler', text: 'ا ب ن ج', zones: true } },
      { h: "Mesurer avec le point", md: "Les calligraphes ne mesurent pas en millimètres : ils mesurent avec **le point** (نُقْطَة nuqṭa), le petit losange que fait le calame quand on le pose.\n\nEn **naskh** (l'écriture des livres et des Corans imprimés), le **alif mesure environ 5 points** de haut. Toutes les autres lettres se règlent sur lui : le corps du ب est à peu près **aussi long que le alif est haut**, une voyelle fait environ **un tiers** du alif.\n\nTu n'as pas besoin d'être aussi précis. Retiens l'idée : **le alif est ta règle**. Si ton alif est grand, toute ta ligne est grande.", viz: { t: 'alifdots' } },
      { h: "Préparer son cahier", md: "Pour bien commencer :\n- prends un cahier à **grands carreaux** (ou des lignes espacées d'au moins 1 cm) ;\n- pose les lettres **sur une ligne épaisse** : c'est ta ligne de base ;\n- fais monter le alif jusqu'à **la ligne épaisse du dessus** (environ 8 mm) ;\n- laisse les queues descendre d'environ **la moitié** de cet espace ;\n- saute **une ligne sur deux** au début : les queues et les voyelles ont besoin de place.\n\nUn simple stylo ou un crayon suffit. Plus tard, un **feutre à pointe biseautée** (2 à 4 mm) donne les pleins et les déliés du naskh, si tu le tiens toujours avec la même inclinaison.", viz: { t: 'ruler', text: 'كَتَبَ', zones: true } },
      { h: "Regarde la main écrire", md: "Observe le stylo : il **part du haut à droite**, avance vers la gauche, se lève, puis revient poser **les points** et enfin **les voyelles**. On y reviendra dans chaque leçon.\n\nAppuie sur « 🐢 Au ralenti » pour bien suivre.", viz: { t: 'demo', text: 'بِسْمِ' } },
    ],
    quiz: [
      { q: "Où commence une ligne d'arabe ?", o: ["Au bord droit de la page", "Au bord gauche de la page", "Au milieu"], a: 0, why: "On écrit de droite à gauche." },
      { q: "Sur quoi les lettres se posent-elles ?", o: ["Sur la ligne de base", "Sous la ligne", "Sur la ligne du haut"], a: 0, why: "La ligne de base porte le corps des lettres et le trait qui les attache." },
      { q: "Laquelle de ces lettres monte le plus haut ?", o: ["ا", "ب", "ن"], a: 0, why: "Le alif est la lettre la plus haute : c'est la règle de toute la ligne." },
      { q: "Quelle lettre plonge sous la ligne ?", o: ["ر", "ا", "ب"], a: 0, why: "Le rā' descend sous la ligne, comme une virgule." },
      { q: "En naskh, le alif mesure environ…", o: ["5 points", "1 point", "15 points"], a: 0, why: "Environ 5 points : c'est l'unité de mesure de toutes les lettres." },
    ],
  },
  {
    id: 'c2', title: "Le squelette et les points", ar: 'الرَّسْمُ وَالنُّقَطُ', min: 20,
    steps: [
      { h: "28 lettres, mais peu de formes", md: "L'arabe a 28 lettres, mais beaucoup **partagent le même corps** (on dit le même squelette, رَسْم rasm). Seuls **les points** les distinguent.\n\nAu tout début de l'islam, on écrivait même souvent **sans les points** : les lecteurs reconnaissaient les mots. Les points ont été généralisés ensuite pour éviter les erreurs.\n\nRegarde : à gauche le squelette nu, à droite les lettres qu'on obtient en ajoutant des points.", viz: { t: 'skel', rows: [['ٮـ', ['بـ', 'تـ', 'ثـ', 'نـ', 'يـ']], ['ح', ['ج', 'ح', 'خ']], ['د', ['د', 'ذ']], ['ر', ['ر', 'ز']], ['س', ['س', 'ش']], ['ص', ['ص', 'ض']], ['ط', ['ط', 'ظ']], ['ع', ['ع', 'غ']], ['ڡـ', ['فـ', 'قـ']]] } },
      { h: "Le corps d'abord, les points ensuite", md: "Règle d'or : on trace **tout le corps** d'un morceau attaché **d'un seul mouvement**, sans lever le stylo. **Ensuite seulement** on revient poser les points, de droite à gauche. Les **voyelles** viennent **en tout dernier**, quand le mot entier est fini.\n\nPourquoi ? Parce que la main garde son élan, et que les lettres attachées restent bien régulières. Si tu poses les points en même temps, ton trait devient haché.", viz: { t: 'demo', text: 'بَيْت' } },
      { h: "Comment faire un point", md: "En naskh, le point n'est **pas un rond** : c'est un **petit losange** penché, fait d'une petite pression du stylo, de haut à droite vers le bas à gauche.\n\n- **2 points** : côte à côte, sur une même ligne ;\n- **3 points** : deux en bas, un au-dessus d'eux (un petit triangle), pour ث et ش.\n\nLes points se placent **au milieu de la lettre** qu'ils accompagnent, pas au-dessus de sa voisine.", viz: { t: 'big', items: [['ب', 'un point dessous'], ['ت', 'deux points dessus'], ['ث', 'trois points en triangle'], ['ي', 'deux points dessous']] } },
      { h: "À la main, les points se simplifient", md: "Quand on écrit vite, à la main (style **ruqʿa**), les points changent d'aspect :\n- **2 points** deviennent un **petit trait** ‐ ;\n- **3 points** deviennent un **petit chapeau** ^.\n\nTu le verras chez les arabophones. Pour apprendre, garde les vrais points du naskh : ils sont plus clairs.", viz: { t: 'styles', text: 'تَثْبِيت شَيْء', fonts: ['naskh', 'ruqaa'] } },
    ],
    quiz: [
      { q: "Qu'est-ce qui distingue ب ت ث au début d'un mot ?", o: ["Seulement les points", "La hauteur", "Le sens d'écriture"], a: 0, why: "Même squelette ٮـ : 1 point dessous, 2 dessus, 3 dessus." },
      { q: "Dans quel ordre écrit-on un morceau de mot ?", o: ["Corps, puis points, puis voyelles", "Points, puis corps", "Voyelles, puis corps"], a: 0, why: "Le corps d'un seul geste, puis les points, et les voyelles à la toute fin." },
      { q: "Quelle lettre a trois points au-dessus ?", o: ["ش", "س", "ص"], a: 0, why: "ش = le squelette de س + trois points." },
      { q: "Quelle lettre a le même corps que ج, sans aucun point ?", o: ["ح", "خ", "ع"], a: 0, why: "ج (point dedans), ح (aucun point), خ (point au-dessus)." },
      { q: "En écriture rapide (ruqʿa), deux points deviennent souvent…", o: ["un petit trait", "un rond", "rien du tout"], a: 0, why: "Deux points → un petit trait, trois points → un petit chapeau." },
    ],
  },
  {
    id: 'c3', title: "Attacher les lettres", ar: 'الْوَصْلُ', min: 20,
    steps: [
      { h: "Une écriture attachée", md: "L'arabe est **toujours attaché**, même dans les livres imprimés. Les lettres d'un mot se relient par **un petit trait posé sur la ligne de base**.\n\nUn mot peut donc être **un seul morceau** tracé d'un trait, comme كَتَبَ (il a écrit).", viz: { t: 'pieces', text: 'كَتَبَ' } },
      { h: "Les 6 lettres qui ne donnent pas la main", md: "Six lettres **ne s'attachent jamais à la lettre qui suit** (celle de gauche) : **ا د ذ ر ز و**.\n\nElles s'attachent à la lettre d'avant si elle le permet, mais **après elles, le mot se coupe** : on lève le stylo et la lettre suivante recommence comme un début de mot.\n\nMoyen mnémotechnique : ces six lettres « **ne donnent pas la main** » à gauche. (Il faut y ajouter ة, ء et les supports de hamza أ إ ؤ.)", viz: { t: 'pieces', text: 'دَرَسَ وَرْدَة' } },
      { h: "Compter les morceaux", md: "Avant d'écrire un mot, regarde **combien de morceaux** il a. Chaque morceau se trace **d'un seul trait**, puis on lève le stylo.\n\nExemple : ٱلرَّحْمَٰنِ = ا | لر | حمن : **3 morceaux**. Le ر ne donne pas la main, alors le ح repart comme un début de mot.", viz: { t: 'pieces', text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' } },
      { h: "Les espaces", md: "Il y a **deux sortes d'espaces** :\n- un **petit espace** entre deux morceaux **d'un même mot** (après ا د ذ ر ز و) ;\n- un **espace plus grand** entre **deux mots**.\n\nSi tu les fais de la même taille, ton texte devient difficile à lire : on ne sait plus où finit un mot.", viz: { t: 'cmp', items: [['قَالَ رَبُّ', "Petit espace dans un mot, grand entre les mots", true], ['قَا لَ رَ بُّ', "Espaces trop réguliers : on ne voit plus les mots", false]] } },
      { h: "Le trait d'allongement", md: "On peut **allonger le trait d'attache** pour l'élégance ou pour remplir une ligne : c'est le **tatwīl** (ou kashīda) ـ.\n\nLe tatwīl ne se met **qu'entre deux lettres attachées**, jamais après ا د ذ ر ز و. Sans excès : un mot très étiré devient étrange.", viz: { t: 'cmp', items: [['بسم', "Normal", null], ['بســم', "Allongé (tatwīl)", null]] } },
    ],
    quiz: [
      { q: "Combien de morceaux dans le mot دار (maison) ?", o: ["3", "1", "2"], a: 0, why: "د et ا ne donnent pas la main, et ر finit le mot : د | ا | ر." },
      { q: "Combien de morceaux dans كتب ?", o: ["1", "2", "3"], a: 0, why: "ك, ت et ب s'attachent toutes : un seul trait." },
      { q: "Combien de morceaux dans رسول (messager) ?", o: ["3", "2", "4"], a: 0, why: "ر | سو | ل : le ر puis le و coupent le mot." },
      { q: "Laquelle de ces lettres ne s'attache jamais à la suivante ?", o: ["ز", "س", "م"], a: 0, why: "ا د ذ ر ز و ne donnent pas la main à gauche." },
      { q: "Où peut-on mettre un tatwīl ـ ?", o: ["Entre deux lettres attachées", "Après un و", "Au début d'un mot"], a: 0, why: "Il allonge le trait d'attache : il faut deux lettres qui s'attachent." },
    ],
  },
  {
    id: 'c4', title: "Les quatre formes d'une lettre", ar: 'أَشْكَالُ الْحُرُوفِ', min: 20,
    steps: [
      { h: "Pourquoi 4 formes ?", md: "Une lettre change un peu de forme selon **ses voisines** :\n- **seule** : rien ne la touche ;\n- **au début** : attachée seulement à **gauche** (vers la lettre suivante) ;\n- **au milieu** : attachée **des deux côtés** ;\n- **à la fin** : attachée seulement à **droite** (à la lettre d'avant).\n\nLe **cœur** de la lettre ne change pas : c'est ce qui permet de la reconnaître.", viz: { t: 'forms', letters: ['ب', 'ج', 'م'] } },
      { h: "La recette", md: "Pour presque toutes les lettres :\n- **début** = la lettre **sans sa queue**, qui part vers la gauche ;\n- **milieu** = le début, avec en plus le trait qui arrive de droite ;\n- **fin** = la lettre **seule**, avec le trait qui arrive de droite.\n\nRegarde ن et س : au début et au milieu, le grand bol **disparaît**. Il ne reste qu'une petite dent (ن) ou trois dents (س).", viz: { t: 'forms', letters: ['ن', 'س', 'ي'] } },
      { h: "Celles qui changent beaucoup", md: "Quelques lettres changent plus que les autres. Apprends-les bien :\n- **ع غ** : la tête est **ouverte** au début (عـ), devient un **petit triangle fermé** au milieu et à la fin (ـعـ ـع) ;\n- **ه** : quatre visages très différents : ه هـ ـهـ ـه ;\n- **ك** : au début et au milieu, une **barre penchée** en haut (كـ ـكـ) ;\n- **ي** : une petite dent au début et au milieu, une grande courbe à la fin.", viz: { t: 'forms', letters: ['ع', 'ه', 'ك'] } },
      { h: "Les lettres qui ne donnent pas la main", md: "ا د ذ ر ز و n'ont que **deux formes** : **seule** et **à la fin**, puisqu'elles ne s'attachent jamais à gauche. Leur forme reste presque la même : le trait arrive simplement de la droite.", viz: { t: 'forms', letters: ['د', 'ر', 'و'] } },
    ],
    quiz: [
      { q: "Dans كتب, le ت est en forme…", o: ["milieu", "début", "fin"], a: 0, why: "Il est attaché à ك (à droite) et à ب (à gauche)." },
      { q: "Au début d'un mot, ن ressemble à…", o: ["une petite dent avec un point dessus", "un grand bol", "un rond"], a: 0, why: "Le bol disparaît : نـ = une dent, un point dessus." },
      { q: "Quelle forme de ع est un petit triangle fermé ?", o: ["ـعـ (milieu)", "عـ (début)", "ع (seule)"], a: 0, why: "La tête est ouverte au début, fermée au milieu et à la fin." },
      { q: "Combien de formes a le د ?", o: ["2", "4", "1"], a: 0, why: "Seule et à la fin : il ne s'attache jamais à gauche." },
      { q: "Quelle lettre a la forme هـ au début d'un mot ?", o: ["ه", "ع", "م"], a: 0, why: "Le hā' a quatre formes très différentes : ه هـ ـهـ ـه." },
    ],
  },
  {
    id: 'c5', title: "Les dents et les bols", ar: 'الْأَسْنَانُ', min: 20,
    steps: [
      { h: "La dent", md: "Au début et au milieu d'un mot, ب ت ث ن ي se réduisent à **une petite dent** (نَبْرَة nabra) : un petit trait qui monte d'environ **un point** au-dessus de la ligne et redescend.\n\nLa main fait : **monter – redescendre – avancer**. Regarde bien le geste : sur chaque dent, le stylo monte puis revient sur ses pas.", viz: { t: 'demo', text: 'بَيْن' } },
      { h: "Les dents de س", md: "Le س a **trois dents** régulières, **sans aucun point**. Les dents du س sont un peu plus petites et serrées que les dents des lettres à points.\n\nQuand plusieurs dents se suivent, ce sont **les points** qui disent quelle lettre est où. Regarde نَسْتَعِينُ (c'est Toi dont nous implorons le secours, 1:5) : ن (1 dent), س (3 dents), ت (1 dent), ع, ي (1 dent), ن final.", viz: { t: 'pieces', text: 'نَسْتَعِينُ', letters: true } },
      { h: "Plat ou rond : ب ou ن à la fin", md: "À la fin d'un mot, ne confonds pas :\n- **ب ت ث** : un corps **long et plat**, posé sur la ligne (un bateau) ;\n- **ن** : un **bol rond et profond**, qui descend sous la ligne ;\n- **ي** : une **grande courbe** en S couché, sous la ligne, avec deux points dessous.", viz: { t: 'ruler', text: 'كِتَاب   مِن   فِي', zones: true } },
      { h: "Les bols de س ش ص ض ق", md: "Seules ou à la fin, ces lettres finissent par **le même grand bol** que ن : rond, profond, il remonte un peu à gauche. Au début et au milieu, ce bol disparaît.", viz: { t: 'ruler', text: 'نَاس  ٱلْأَرْض  حَقّ', zones: true } },
      { h: "À toi", md: "Trace le mot sur le modèle. Pense : **monter-redescendre** à chaque dent, puis les points.", viz: { t: 'trace', text: 'بَيْن' } },
    ],
    quiz: [
      { q: "Combien de dents a le س ?", o: ["3", "1", "2"], a: 0, why: "Trois dents régulières, sans point." },
      { q: "Au milieu d'un mot, ي ressemble à…", o: ["une dent avec deux points dessous", "une grande courbe", "un rond"], a: 0, why: "ـيـ : une dent, deux points dessous." },
      { q: "À la fin d'un mot, quelle lettre a un bol profond ?", o: ["ن", "ب", "ت"], a: 0, why: "ب et ت sont plates ; ن est un bol rond et profond." },
      { q: "Qu'est-ce qui permet de savoir quelle dent est quelle lettre ?", o: ["Les points", "La couleur", "La hauteur"], a: 0, why: "Toutes les dents se ressemblent : ce sont les points qui parlent." },
    ],
  },
  {
    id: 'c6', title: "Les lettres qui montent et qui plongent", ar: 'الصَّاعِدُ وَالنَّازِلُ', min: 20,
    steps: [
      { h: "Les lettres hautes", md: "Cinq lettres montent jusqu'à la hauteur du alif : **ا ل ك ط ظ** (pour ك, c'est sa barre du haut). On les trace **de haut en bas**.\n\nGarde-les **toutes à la même hauteur** : c'est ce qui donne une ligne régulière et belle.", viz: { t: 'ruler', text: 'كَلَّا طَالِب', zones: true } },
      { h: "La hampe au milieu d'un mot", md: "Quand ل ou ط arrivent au milieu d'un mot, la main vient de la ligne de base. Elle **monte la hampe** puis **redescend sur le même trait** et continue. Regarde le geste au ralenti.", viz: { t: 'demo', text: 'عِلْم' } },
      { h: "Les lettres qui plongent", md: "Sous la ligne, trois familles :\n- **petite descente**, comme une virgule : **ر ز و** ;\n- **le bol** : **ن ي س ش ص ض ق** (seules ou à la fin) ;\n- **la grande courbe** : **ج ح خ ع غ** (seules ou à la fin), qui descend le plus bas.\n\nEt **م** seul ou à la fin, avec sa petite **queue droite**.", viz: { t: 'ruler', text: 'رَبّ  نُون  حَجّ  قَلَم', zones: true } },
      { h: "Les lettres qui s'empilent", md: "Dans les Corans et la belle calligraphie, certaines lettres **s'empilent** : avant ج ح خ et parfois م, la lettre d'avant est **posée plus haut**, et le mot descend en escalier (مُحَمَّد, لِلَّهِ).\n\nC'est beau, mais **pas obligatoire** : en écriture d'école, tout reste sur la ligne. Commence par la version simple.", viz: { t: 'styles', text: 'مُحَمَّد  يَحْمَدُ', fonts: ['naskh', 'amiri'] } },
    ],
    quiz: [
      { q: "Laquelle de ces lettres monte jusqu'à la hauteur du alif ?", o: ["ط", "ص", "ع"], a: 0, why: "ا ل ك ط ظ sont les lettres hautes." },
      { q: "Dans quel sens trace-t-on le alif ?", o: ["Du haut vers le bas", "Du bas vers le haut", "De gauche à droite"], a: 0, why: "Les hampes se tracent de haut en bas." },
      { q: "Quelle lettre descend le plus bas sous la ligne ?", o: ["ح (seul)", "ر", "د"], a: 0, why: "La grande courbe de ج ح خ ع غ est la plus profonde ; ر fait une petite virgule, د ne descend pas." },
      { q: "Les lettres empilées (مُحَمَّد en escalier) sont…", o: ["belles mais pas obligatoires", "obligatoires", "une faute"], a: 0, why: "En écriture d'école, on peut tout garder sur la ligne." },
    ],
  },
  {
    id: 'c7', title: "Les voyelles et les petits signes", ar: 'الْحَرَكَاتُ', min: 25,
    steps: [
      { h: "Quand et où", md: "Les voyelles (حَرَكَات) se tracent **en dernier**, quand tout le mot est fini (corps puis points).\n\nElles sont **petites** (environ un tiers du alif) et se placent **au-dessus ou au-dessous du corps de leur lettre**, pas au-dessus du trait d'attache. Toutes se tracent **de haut en bas** ou **de droite à gauche**, comme le reste.", viz: { t: 'demo', text: 'كَتَبَ' } },
      { h: "Les trois voyelles brèves et le soukoun", md: "- **fatḥa** َ : un petit trait **penché** au-dessus (son a) ;\n- **kasra** ِ : le même trait **au-dessous** (son i) ;\n- **ḍamma** ُ : un **petit و** au-dessus (son ou) ;\n- **sukūn** ْ : un **petit rond** au-dessus : pas de voyelle.", viz: { t: 'marks', items: [['بَ', 'fatḥa', 'ba'], ['بِ', 'kasra', 'bi'], ['بُ', 'ḍamma', 'bou'], ['بْ', 'sukūn', 'b (sans voyelle)']] } },
      { h: "La shadda", md: "La **shadda** ّ (un petit « w ») veut dire que la consonne est **doublée**. On la trace **avant** la voyelle de la lettre :\n- la **fatḥa** et la **ḍamma** se mettent **au-dessus de la shadda** ;\n- la **kasra** se met **sous la lettre**, ou tout près **sous la shadda** (les deux se voient : les Corans imprimés la mettent souvent sous la shadda).", viz: { t: 'marks', items: [['رَبَّ', 'shadda + fatḥa', 'rabba'], ['رَبُّ', 'shadda + ḍamma', 'rabbou'], ['رَبِّ', 'shadda + kasra', 'rabbi']] } },
      { h: "Le tanwīn", md: "Le **tanwīn** double la voyelle et ajoute un **n** à la prononciation : ً (an) ٍ (in) ٌ (oun).\n\nAttention au **tanwīn en a** : on ajoute en général **un alif** à la fin du mot (كِتَابًا), sauf après **ة** (رَحْمَةً) et après **ء** précédé d'un alif (سَمَاءً). Ce alif ne se prononce pas comme un ā : il porte juste le « an ».", viz: { t: 'marks', items: [['كِتَابًا', 'tanwīn fatḥ + alif', 'kitāban'], ['كِتَابٌ', 'tanwīn ḍamm', 'kitāboun'], ['كِتَابٍ', 'tanwīn kasr', 'kitābin'], ['رَحْمَةً', 'après ة : pas de alif', 'raḥmatan']] } },
      { h: "Les signes du Coran", md: "Le Coran ajoute d'autres petits signes, que l'on recopie quand on écrit un verset :\n- **madda** آ : un alif qui s'allonge (ā long, souvent après une hamza) ;\n- **alif waṣla** ٱ : un alif qu'on ne prononce pas quand on enchaîne ;\n- **petit alif** ٰ (alif suscrit) : un ā long écrit en petit, comme dans ٱلرَّحْمَٰنِ.\n\nDans la vie de tous les jours, les arabophones écrivent **presque sans voyelles**. Le Coran, lui, est **entièrement vocalisé**.", viz: { t: 'cmp', items: [['ٱلرَّحْمَٰنِ', "Coran : tout est noté", null], ['الرحمن', "Écriture courante : sans voyelles", null]] } },
    ],
    quiz: [
      { q: "Quand trace-t-on les voyelles ?", o: ["À la toute fin du mot", "Avant le corps", "Avant les points"], a: 0, why: "Corps, puis points, puis voyelles." },
      { q: "Quel signe est un petit و au-dessus de la lettre ?", o: ["ḍamma ُ", "fatḥa َ", "sukūn ْ"], a: 0, why: "La ḍamma (son ou) est un petit و." },
      { q: "Avec une shadda, où va la fatḥa ?", o: ["Au-dessus de la shadda", "Sous la lettre", "À côté"], a: 0, why: "Fatḥa et ḍamma au-dessus de la shadda ; la kasra en dessous." },
      { q: "Comment écrit-on « un livre » avec le tanwīn en a ?", o: ["كِتَابًا", "كِتَابً", "كِتَابَن"], a: 0, why: "On ajoute un alif qui porte le tanwīn." },
      { q: "Le petit rond ْ au-dessus d'une lettre veut dire…", o: ["pas de voyelle", "un ā long", "lettre doublée"], a: 0, why: "C'est le sukūn." },
    ],
  },
  {
    id: 'c8', title: "Les lettres pièges", ar: 'حُرُوفٌ دَقِيقَةٌ', min: 25,
    steps: [
      { h: "Lām-alif : toujours ensemble", md: "Quand ل est suivi de ا, on n'écrit **jamais** les deux côte à côte : on fait **une seule forme**, la ligature **لا** (comme un V qui se croise).\n\nC'est la seule ligature **obligatoire** de l'arabe. Elle compte quand même pour **deux lettres**.", viz: { t: 'cmp', items: [['لا', "Juste : la ligature", true], ['ل‌ا', "Faux : ل et ا côte à côte", false]] } },
      { h: "ة, ت ou ه ?", md: "Le **tā' marbūṭa** ة ressemble à un ه avec **deux points**. On le trouve **seulement à la fin** d'un mot (souvent des noms féminins : رَحْمَة, جَنَّة).\n\n- quand on enchaîne, il se prononce **t** ;\n- quand on s'arrête dessus, il se prononce **a** (ou un léger **h**).\n\nNe le remplace pas par ت (un t « ouvert », qui peut être partout) ni par ه (sans points).", viz: { t: 'cmp', items: [['رَحْمَة', "ة : tā' marbūṭa (fin de mot)", true], ['بَيْت', "ت : le t ordinaire", null], ['وَجْه', "ه : le hā' (sans points)", null]] } },
      { h: "ى ou ي ?", md: "Le **alif maqṣūra** ى ressemble au ي final mais **n'a pas de points**. Il ne vient **qu'à la fin** d'un mot et se prononce **ā** : عَلَى (sur), مُوسَى (Moïse), هُدًى (guidée).\n\nAttention : en Égypte et chez beaucoup de gens, on écrit le ي final **sans points** à la main. Dans le Coran et dans tes exercices, fais bien la différence.", viz: { t: 'cmp', items: [['عَلَى', "ى : alif maqṣūra (ā), sans points", true], ['فِي', "ي : yā' (ī), deux points dessous", true]] } },
      { h: "La hamza et ses sièges", md: "La **hamza** ء (un petit coup de glotte) s'écrit souvent **sur un support** :\n- sur un **alif** : أ (dessus) ou إ (dessous, avec un i) — au début d'un mot, c'est toujours un alif : أَحَد, إِيمَان ;\n- sur un **و** : ؤ (مُؤْمِن) ;\n- sur une **dent sans points** : ئ (سُئِلَ) ;\n- **seule**, sur la ligne : ء (شَيْء, سَمَاء).\n\nLa règle complète dépend des voyelles autour. Pour l'instant, **recopie le modèle** : tu la sentiras peu à peu.", viz: { t: 'big', items: [['أَحَد', 'sur alif'], ['إِيمَان', 'sous alif'], ['مُؤْمِن', 'sur و'], ['سُئِلَ', 'sur une dent'], ['سَمَاء', 'seule']] } },
      { h: "L'article ال et le nom d'Allah", md: "L'article **ال** s'écrit **toujours**, même quand le ل ne se prononce pas (devant les « lettres solaires ») : ٱلشَّمْس se dit ash-shams, mais on écrit bien le ل, et la **shadda** va sur la lettre suivante.\n\nLe nom **ٱللَّه** s'écrit avec **deux lām**, une **shadda** et souvent un **petit alif** au-dessus : ا + ل + ل + ه. Prends le temps de le tracer lentement.", viz: { t: 'demo', text: 'ٱللَّهُ' } },
    ],
    quiz: [
      { q: "Comment écrit-on ل suivi de ا ?", o: ["لا (ligature)", "ل puis ا séparés", "ال"], a: 0, why: "La ligature lām-alif est obligatoire." },
      { q: "Où peut-on trouver ة ?", o: ["Seulement à la fin d'un mot", "N'importe où", "Seulement au début"], a: 0, why: "Le tā' marbūṭa ne vient qu'en fin de mot." },
      { q: "Lequel se prononce ā, sans points ?", o: ["ى", "ي", "ة"], a: 0, why: "Le alif maqṣūra : عَلَى, مُوسَى." },
      { q: "Au début d'un mot, la hamza s'écrit sur…", o: ["un alif (أ ou إ)", "un و", "une dent"], a: 0, why: "Au début d'un mot, la hamza est toujours sur un alif." },
      { q: "Dans ٱلشَّمْس, le ل de l'article…", o: ["s'écrit mais ne se prononce pas", "ne s'écrit pas", "se prononce"], a: 0, why: "Devant une lettre solaire, on écrit le ل et on double la lettre suivante (shadda)." },
    ],
  },
  {
    id: 'c9', title: "Écrire un mot pas à pas", ar: 'كِتَابَةُ كَلِمَةٍ', min: 25,
    steps: [
      { h: "La méthode en 4 temps", md: "Pour n'importe quel mot :\n1. **Regarde et coupe** : combien de morceaux ? (après ا د ذ ر ز و, on coupe) ;\n2. **Trace chaque morceau d'un trait**, de droite à gauche, sans lever le stylo ;\n3. **Pose les points**, de droite à gauche ;\n4. **Ajoute les signes** : d'abord la shadda, puis les voyelles, puis les autres signes.\n\nPrenons ٱلرَّحِيمِ (le Très Miséricordieux).", viz: { t: 'pieces', text: 'ٱلرَّحِيمِ' } },
      { h: "Regarde le geste entier", md: "Observe les 4 temps : **ا**, puis le morceau **لر**, puis le morceau **حيم** d'un seul trait, puis les **deux points** du ي, et enfin la **shadda** et les **voyelles**.", viz: { t: 'demo', text: 'ٱلرَّحِيمِ' } },
      { h: "À toi : trace sur le modèle", md: "Trace en suivant le modèle gris. Ne cherche pas la vitesse : cherche **un trait continu** dans chaque morceau.", viz: { t: 'trace', text: 'ٱلرَّحِيمِ' } },
      { h: "La basmala", md: "Maintenant la phrase par laquelle on commence tout : **بِسْمِ ٱللَّهِ** (au nom d'Allah). Compte d'abord les morceaux (بسم = 1, ٱللَّه = 2 : ا | للّه), puis trace.", viz: { t: 'trace', text: 'بِسْمِ ٱللَّهِ' } },
      { h: "Et sur papier", md: "Le mieux reste **le papier** : ouvre « 📜 Recopier le Coran dans mon cahier » (dans l'onglet Écrire). L'Atelier te montre un verset en grand, morceau par morceau, et tu le recopies à la main.\n\nConseils :\n- écris **grand** au début (le alif d'au moins 1 cm) ;\n- **une ligne sur deux** ;\n- compare ensuite avec le modèle : hauteur des hampes, place des points, régularité des dents.", viz: null, copyBtn: true },
    ],
    quiz: [
      { q: "Première étape avant d'écrire un mot ?", o: ["Compter ses morceaux", "Poser les voyelles", "Écrire le dernier morceau"], a: 0, why: "Regarder et couper : après ا د ذ ر ز و, on coupe." },
      { q: "Combien de morceaux dans ٱلرَّحِيمِ ?", o: ["3", "1", "2"], a: 0, why: "ا | لر | حيم." },
      { q: "Dans un morceau, on lève le stylo…", o: ["à la fin du morceau seulement", "après chaque lettre", "jamais"], a: 0, why: "Un morceau = un seul trait ; on lève le stylo ensuite pour les points." },
      { q: "Quel signe trace-t-on en premier parmi les signes ?", o: ["La shadda", "La kasra", "Le sukūn"], a: 0, why: "La shadda d'abord, puis la voyelle qui va avec." },
    ],
  },
  {
    id: 'c10', title: "Les styles d'écriture", ar: 'الْخُطُوطُ', min: 20,
    steps: [
      { h: "Le naskh : le modèle", md: "Le **naskh** (نَسْخ, « copie ») est l'écriture **des livres, des journaux et des Corans imprimés**. Lettres nettes, points bien placés : c'est **le modèle à apprendre** et celui de l'Atelier.", viz: { t: 'styles', text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', fonts: ['naskh'] } },
      { h: "Le ruqʿa : la main de tous les jours", md: "Au Moyen-Orient, quand on écrit vite à la main, on utilise le **ruqʿa** (رُقْعَة) :\n- plus petit, presque tout **sur la ligne** ;\n- les **dents de س disparaissent** (un simple trait) ;\n- **2 points → un trait**, **3 points → un chapeau** ;\n- les queues sont **courtes**.\n\nApprends à **le lire** : c'est l'écriture des lettres, des notes et des tableaux d'école.", viz: { t: 'styles', text: 'شَمْس  سَلَامٌ عَلَيْكُمْ', fonts: ['naskh', 'ruqaa'] } },
      { h: "Le maghribi : l'écriture du Maroc", md: "Au **Maghreb** et en Afrique de l'Ouest, les manuscrits et beaucoup de Corans sont en **maghribi**. Formes rondes, grandes courbes… et une différence importante :\n- le **fā'** a **un point dessous** : ڢ ;\n- le **qāf** a **un seul point dessus** : ڧ.\n\nSi tu lis un Coran marocain, pense-y !", viz: { t: 'styles', text: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', fonts: ['naskh', 'maghribi'] } },
      { h: "Le coufique et le nastaʿlīq", md: "Deux styles d'art à connaître :\n- le **coufique** : anguleux et géométrique, la plus ancienne écriture des Corans ; aujourd'hui pour les titres et les décorations ;\n- le **nastaʿlīq** : le style persan et ourdou, où les mots **descendent en diagonale**.\n\nÀ admirer, pas encore à recopier. Tu peux tous les voir dans Apprendre › Alphabet › « 🖋 Comparer les polices ».", viz: { t: 'styles', text: 'بِسْمِ ٱللَّهِ', fonts: ['kufi', 'nastaliq'] } },
    ],
    quiz: [
      { q: "Quel style apprend-on en premier ?", o: ["Le naskh", "Le coufique", "Le nastaʿlīq"], a: 0, why: "Le naskh est le modèle des livres et des Corans imprimés." },
      { q: "En ruqʿa, les dents du س…", o: ["deviennent un simple trait", "sont plus grandes", "ont des points"], a: 0, why: "Le ruqʿa simplifie : le س n'a plus de dents." },
      { q: "En maghribi, le fā' a…", o: ["un point dessous", "deux points dessus", "aucun point"], a: 0, why: "ڢ : un point dessous ; et le qāf un seul point dessus." },
      { q: "Quel style fait descendre les mots en diagonale ?", o: ["Le nastaʿlīq", "Le naskh", "Le ruqʿa"], a: 0, why: "Le nastaʿlīq, le style persan et ourdou." },
    ],
  },
];
