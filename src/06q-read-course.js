/* ====================================================================
 * 06q - Le cours de lecture : 12 leçons pour passer des lettres aux versets.
 * Même moteur que le cours d'écriture (06p). Schémas propres à la lecture :
 *  syl   : syllabes à toucher (voix de l'appareil), transcription cachable
 *  words : vrais mots du Coran (référence s:v:m) : on lit, puis on écoute le récitateur
 *  verse : un verset entier, mot par mot, avec la récitation
 *  pairs : deux lettres proches à ne pas confondre
 * Les quiz peuvent faire écouter : say (texte lu par l'appareil) ou ref (mot du Coran).
 * ==================================================================== */
const READ_COURSE = [
  {
    id: 'r1', title: "Les trois voyelles brèves", ar: 'الْحَرَكَاتُ', min: 20,
    steps: [
      { h: "Une lettre seule ne se lit pas", md: "En arabe, une lettre est **une consonne**. Pour la lire, il lui faut **une voyelle**, écrite comme un petit signe au-dessus ou au-dessous :\n- **fatḥa** ـَ (au-dessus) → **a** : بَ = **ba** ;\n- **kasra** ـِ (au-dessous) → **i** : بِ = **bi** ;\n- **ḍamma** ـُ (petit و au-dessus) → **ou** : بُ = **bou**.\n\nTouche chaque syllabe pour l'entendre. Essaie d'abord de la lire **toi-même**, puis vérifie.", viz: { t: 'syl', rows: [[['بَ', 'ba'], ['بِ', 'bi'], ['بُ', 'bu']], [['تَ', 'ta'], ['تِ', 'ti'], ['تُ', 'tu']], [['نَ', 'na'], ['نِ', 'ni'], ['نُ', 'nu']], [['مَ', 'ma'], ['مِ', 'mi'], ['مُ', 'mu']]] } },
      { h: "Le ou s'écrit u", md: "Dans les transcriptions de l'Atelier, le son **ou** s'écrit **u** (comme en latin) : بُ = **bu**, mais se dit « bou ». Le **a** de la fatḥa varie un peu : plus ouvert (« a ») après la plupart des lettres, plus sombre (presque « o ») après les lettres lourdes ص ض ط ظ ق خ غ.", viz: { t: 'syl', rows: [[['سَ', 'sa'], ['صَ', 'ṣa']], [['تَ', 'ta'], ['طَ', 'ṭa']], [['كَ', 'ka'], ['قَ', 'qa']]] } },
      { h: "Lire un mot : syllabe par syllabe", md: "Un mot se lit **de droite à gauche**, une syllabe après l'autre, sans s'arrêter. كَتَبَ = **ka-ta-ba** (il a écrit). Lis d'abord lentement, puis de plus en plus vite.", viz: { t: 'syl', rows: [[['كَتَبَ', 'kataba'], ['خَلَقَ', 'khalaqa'], ['عَلِمَ', 'ʿalima']], [['قَالَ', 'qāla'], ['لَكَ', 'laka'], ['لَهُ', 'lahu']]] } },
      { h: "Dans le Coran", md: "Des vrais mots du Coran. Lis-les, puis touche pour écouter le récitateur.", viz: { t: 'words', items: [['87:2:2', 'il a créé'], ['94:1:3', 'pour toi'], ['113:5:5', 'il a envié'], ['113:3:5', 'elle s\'est étendue']] } },
    ],
    quiz: [
      { q: "Comment se lit بِ ?", o: ['bi', 'ba', 'bu'], a: 0, why: "La kasra (sous la lettre) donne i.", say: 'بِ' },
      { q: "Quel signe donne le son ou ?", o: ["la ḍamma ـُ", "la fatḥa ـَ", "la kasra ـِ"], a: 0, why: "La ḍamma est un petit و : u (ou)." },
      { q: "Comment se lit كَتَبَ ?", o: ['kataba', 'kutubu', 'kitaba'], a: 0, why: "Trois fatḥa : ka-ta-ba." },
      { q: "Écoute : quelle syllabe entends-tu ?", o: ['مُ', 'مَ', 'مِ'], a: 0, why: "mu : une ḍamma.", say: 'مُ' },
      { q: "Où se place la kasra ?", o: ["Sous la lettre", "Sur la lettre", "À côté"], a: 0, why: "Fatḥa et ḍamma au-dessus, kasra en dessous." },
    ],
  },
  {
    id: 'r2', title: "Le soukoun : la syllabe fermée", ar: 'السُّكُونُ', min: 20,
    steps: [
      { h: "Le petit rond : pas de voyelle", md: "Le **sukūn** ـْ (un petit rond au-dessus) veut dire : **pas de voyelle**. La consonne se colle à la syllabe d'avant et la **ferme**.\n\nمِنْ = **min** (de) : mi + n. قُلْ = **qul** (dis !).", viz: { t: 'syl', rows: [[['بَبْ', 'bab'], ['بِبْ', 'bib'], ['بُبْ', 'bub']], [['مِنْ', 'min'], ['قُلْ', 'qul'], ['لَمْ', 'lam']], [['هُمْ', 'hum'], ['بَلْ', 'bal'], ['هَلْ', 'hal']]] } },
      { h: "Ne rajoute pas de voyelle", md: "Le piège des francophones : ajouter un petit « e » après la consonne fermée (« mine », « qoule »). Non : la consonne s'arrête net. **min**, pas « mine ».\n\nDans le Coran, le sukūn a souvent la forme d'un petit **chapeau** ou d'une demi-lune ; c'est le même signe.", viz: { t: 'words', items: [['109:1:1', 'dis !'], ['79:46:4', 'ne… pas'], ['78:3:2', 'eux'], ['82:9:2', 'mais plutôt'], ['79:15:1', 'est-ce que ?']] } },
      { h: "Des mots plus longs", md: "Coupe en syllabes : نَعْبُدُ = **naʿ-bu-du** (nous adorons). يَلِدْ = **ya-lid** (il engendre). Une syllabe fermée compte souvent un peu plus longtemps.", viz: { t: 'words', items: [['1:5:2', 'nous adorons'], ['112:3:2', 'il engendre'], ['112:3:4', 'il est engendré'], ['111:1:4', 'flamme']] } },
    ],
    quiz: [
      { q: "Que veut dire le petit rond ـْ ?", o: ["Pas de voyelle", "Un a long", "Lettre doublée"], a: 0, why: "C'est le sukūn : la syllabe se ferme." },
      { q: "Comment se lit مِنْ ?", o: ['min', 'mina', 'mine'], a: 0, why: "mi + n, sans voyelle après le n.", say: 'مِنْ' },
      { q: "Comment se lit قُلْ ?", o: ['qul', 'qala', 'qulu'], a: 0, why: "qu + l fermé." },
      { q: "Combien de syllabes dans نَعْبُدُ (naʿ-bu-du) ?", o: ['3', '2', '4'], a: 0, why: "naʿ (fermée) - bu - du." },
      { q: "Écoute : quel mot entends-tu ?", o: ['هَلْ', 'هُمْ', 'بَلْ'], a: 0, why: "hal : est-ce que ?", say: 'هَلْ' },
    ],
  },
  {
    id: 'r3', title: "Les voyelles longues", ar: 'حُرُوفُ الْمَدِّ', min: 25,
    steps: [
      { h: "ا و ي allongent la voyelle", md: "Trois lettres servent à **allonger** une voyelle (on les appelle lettres de prolongation) :\n- **ا** après une fatḥa → **ā** long : بَا = **bā** ;\n- **ي** après une kasra → **ī** long : بِي = **bī** ;\n- **و** après une ḍamma → **ū** long : بُو = **bū**.\n\nUne voyelle longue dure **deux temps** (deux fois la brève). Écoute la différence.", viz: { t: 'syl', rows: [[['بَ', 'ba'], ['بَا', 'bā']], [['بِ', 'bi'], ['بِي', 'bī']], [['بُ', 'bu'], ['بُو', 'bū']]] } },
      { h: "Brève ou longue : le sens change", md: "La longueur n'est pas un détail : elle change le mot. قَالَ (**qāla**, il a dit) n'est pas قَلَ. Lis lentement et **tiens** les voyelles longues.", viz: { t: 'syl', rows: [[['قَالَ', 'qāla'], ['نُور', 'nūr'], ['دِين', 'dīn']], [['كِتَاب', 'kitāb'], ['يَوْم', 'yawm'], ['بَيْت', 'bayt']]] } },
      { h: "Aw et ay : les diphtongues", md: "Quand و ou ي portent un **sukūn** après une **fatḥa**, ce n'est plus une voyelle longue mais une **diphtongue** : يَوْم = **yawm** (jour), بَيْت = **bayt** (maison).", viz: { t: 'words', items: [['1:4:2', 'jour'], ['1:7:4', 'sur eux'], ['114:4:3', 'le chuchoteur']] } },
      { h: "Dans le Coran", md: "Repère les voyelles longues, lis, puis écoute. Dans le Coran, le **ā** est parfois écrit par un **petit alif** au-dessus de la lettre (ـٰ) : on le lit long, exactement comme un alif (leçon 9).", viz: { t: 'words', items: [['83:13:5', 'il a dit'], ['109:6:4', 'religion'], ['88:4:2', 'un feu'], ['1:4:1', 'Maître']] } },
    ],
    quiz: [
      { q: "Comment se lit بُو ?", o: ['bū', 'bu', 'baw'], a: 0, why: "ḍamma + و = ū long." },
      { q: "Quelle lettre allonge le i ?", o: ['ي', 'ا', 'و'], a: 0, why: "kasra + ي = ī." },
      { q: "Combien de temps dure une voyelle longue ?", o: ["Deux temps", "Un temps", "Six temps"], a: 0, why: "Deux fois la brève (le madd du tajwīd peut allonger plus)." },
      { q: "Comment se lit يَوْم ?", o: ['yawm', 'yūm', 'yawmu'], a: 0, why: "fatḥa + و avec sukūn = aw." },
      { q: "Écoute : brève ou longue ?", o: ['بَا (longue)', 'بَ (brève)'], a: 0, why: "bā : on tient la voyelle.", say: 'بَا' },
    ],
  },
  {
    id: 'r4', title: "La shadda : la lettre doublée", ar: 'الشَّدَّةُ', min: 20,
    steps: [
      { h: "Le petit w : on appuie", md: "La **shadda** ـّ (un petit « w ») veut dire que la consonne est **doublée** : on la dit deux fois, une pour fermer la syllabe, une pour ouvrir la suivante.\n\nرَبَّ = **rab-ba**. إِنَّ = **in-na** (certes). On sent un petit arrêt appuyé.", viz: { t: 'syl', rows: [[['رَبَّ', 'rabba'], ['إِنَّ', 'inna'], ['ثُمَّ', 'thumma']], [['مُحَمَّد', 'muḥammad'], ['جَنَّة', 'janna'], ['كُلّ', 'kull']]] } },
      { h: "Avec sa voyelle", md: "La shadda porte aussi une voyelle : au-dessus pour a et u, au-dessous (ou juste sous la shadda) pour i. رَبِّ = **rab-bi** (mon Seigneur / Seigneur de).", viz: { t: 'words', items: [['1:2:3', 'Seigneur de'], ['78:17:1', 'certes'], ['78:5:1', 'puis'], ['111:1:5', 'et il a péri']] } },
      { h: "Ne l'oublie pas !", md: "Oublier la shadda change le mot : عَلَّمَ (**ʿallama**, il a enseigné) n'est pas عَلِمَ (**ʿalima**, il a su). Lis lentement et **double** bien.", viz: { t: 'syl', rows: [[['عَلِمَ', 'ʿalima'], ['عَلَّمَ', 'ʿallama']], [['كَسَرَ', 'kasara'], ['كَسَّرَ', 'kassara']]] } },
    ],
    quiz: [
      { q: "Que veut dire la shadda ـّ ?", o: ["La lettre est doublée", "Pas de voyelle", "Un ā long"], a: 0, why: "On prononce la consonne deux fois." },
      { q: "Comment se lit إِنَّ ?", o: ['inna', 'ina', 'innā'], a: 0, why: "in-na : n doublé." },
      { q: "Écoute : lequel entends-tu ?", o: ['عَلَّمَ', 'عَلِمَ'], a: 0, why: "ʿal-la-ma : le l est doublé.", say: 'عَلَّمَ' },
      { q: "Comment se lit ثُمَّ ?", o: ['thumma', 'thuma', 'tumma'], a: 0, why: "ث = th (comme en anglais « think »), m doublé." },
    ],
  },
  {
    id: 'r5', title: "Le tanwīn : -un, -an, -in", ar: 'التَّنْوِينُ', min: 20,
    steps: [
      { h: "Une voyelle doublée = un n en plus", md: "À la fin d'un nom, la voyelle peut être **doublée** : c'est le **tanwīn**. On ajoute un **n** qu'on n'écrit pas :\n- ـٌ → **-un** : كِتَابٌ = kitābun ;\n- ـً → **-an** : كِتَابًا = kitāban (avec un alif en plus, qui ne s'allonge pas) ;\n- ـٍ → **-in** : كِتَابٍ = kitābin.\n\nLe tanwīn veut dire « **un** » (un livre), pas « le ».", viz: { t: 'syl', rows: [[['كِتَابٌ', 'kitābun'], ['كِتَابًا', 'kitāban'], ['كِتَابٍ', 'kitābin']], [['نَارٌ', 'nārun'], ['نَارًا', 'nāran'], ['شَيْءٍ', 'shayʾin']]] } },
      { h: "Dans le Coran", md: "Lis, puis écoute. Remarque كُفُوًا : le alif à la fin ne s'entend pas comme un ā, il porte juste le **-an**.", viz: { t: 'words', items: [['90:20:2', 'un feu'], ['88:4:2', 'un feu (-an)'], ['78:29:2', 'chose (-in)'], ['112:4:4', 'égal (-an)'], ['113:3:3', 'obscurité']] } },
      { h: "Quand on s'arrête", md: "En fin de phrase, quand on s'arrête (waqf) : **-un** et **-in** se taisent (كِتَاب), et **-an** devient **ā** (كِتَابَا). C'est pour cela qu'on entend « kufuwā, aḥad » à la fin de la sourate 112.", viz: { t: 'verse', r: '112:4' } },
    ],
    quiz: [
      { q: "Comment se lit كِتَابٌ ?", o: ['kitābun', 'kitābu', 'kitāban'], a: 0, why: "Double ḍamma = -un." },
      { q: "Le tanwīn veut dire…", o: ["« un » (indéfini)", "« le » (défini)", "le pluriel"], a: 0, why: "C'est la marque de l'indéfini." },
      { q: "Écoute : quelle fin entends-tu ?", o: ['-in', '-un', '-an'], a: 0, why: "kitābin : double kasra.", say: 'كِتَابٍ' },
      { q: "À l'arrêt, نَارًا (nāran) se lit…", o: ['nārā', 'nāran', 'nār'], a: 0, why: "-an devient ā quand on s'arrête." },
    ],
  },
  {
    id: 'r6', title: "L'article : lettres lunaires et solaires", ar: 'الشَّمْسِيَّةُ وَالْقَمَرِيَّةُ', min: 25,
    steps: [
      { h: "ال = « le, la »", md: "L'article **ال** (al-) se colle au mot : كِتَاب (un livre) → ٱلْكِتَاب (**le** livre). Selon la lettre qui suit, on **entend** le l ou non.", viz: { t: 'cmp', items: [['ٱلْقَمَرُ', "al-qamaru : on entend le l (lettre lunaire)", null], ['ٱلشَّمْسُ', "ash-shamsu : le l disparaît (lettre solaire)", null]] } },
      { h: "Les 14 lettres solaires", md: "Devant **ت ث د ذ ر ز س ش ص ض ط ظ ل ن**, le l **ne se dit pas** : la lettre suivante est **doublée** (elle porte une shadda), et le l n'a **aucun signe**.\n\nAstuce : ces lettres se forment **avec le bout de la langue**, comme le l. Le l « se fond » dedans.", viz: { t: 'words', items: [['81:1:2', 'le soleil'], ['83:2:5', 'les gens'], ['1:7:9', 'les égarés'], ['1:4:3', 'le Jugement'], ['112:2:2', 'l\'Absolu']] } },
      { h: "Les 14 lettres lunaires", md: "Devant les autres lettres (ا ب ج ح خ ع غ ف ق ك م ه و ي), on **entend le l**, qui porte un **sukūn** : ٱلْ.\n\nPour retenir : la phrase **ابْغِ حَجَّكَ وَخَفْ عَقِيمَهُ** contient toutes les lettres lunaires.", viz: { t: 'words', items: [['1:2:1', 'la louange'], ['54:1:4', 'la lune'], ['113:1:4', 'l\'aube'], ['1:6:3', 'le droit'], ['96:3:3', 'le plus généreux']] } },
      { h: "Le truc infaillible : regarde le l", md: "- le l porte un **sukūn** (ٱلْ) → lettre **lunaire** → on dit **al** ;\n- le l n'a **rien** et la lettre suivante a une **shadda** → lettre **solaire** → on ne dit pas le l.\n\nTu n'as pas besoin d'apprendre la liste : le texte du Coran te le dit.", viz: { t: 'verse', r: '1:7' } },
    ],
    quiz: [
      { q: "Comment se lit ٱلشَّمْس ?", o: ['ash-shams', 'al-shams', 'al-ashams'], a: 0, why: "ش est solaire : le l disparaît, le sh est doublé." },
      { q: "Comment se lit ٱلْقَمَر ?", o: ['al-qamar', 'aq-qamar', 'qamar'], a: 0, why: "ق est lunaire : on entend le l." },
      { q: "Dans ٱلنَّاس, le l…", o: ["ne se prononce pas", "se prononce", "se double"], a: 0, why: "ن est solaire : an-nās." },
      { q: "Le l porte un sukūn (ٱلْ). La lettre suivante est…", o: ["lunaire", "solaire"], a: 0, why: "Sukūn sur le l = on le prononce = lunaire." },
      { q: "Écoute : comment lit-on l'article ?", o: ['ar-raḥīm', 'al-raḥīm'], a: 0, why: "ر est solaire.", ref: '1:1:4' },
    ],
  },
  {
    id: 'r7', title: "L'alif waṣla : enchaîner les mots", ar: 'هَمْزَةُ الْوَصْلِ', min: 20,
    steps: [
      { h: "Un alif qu'on saute", md: "Dans le Coran, beaucoup de mots commencent par **ٱ** : un alif avec un petit ṣ dessus (**alif waṣla**, « alif de liaison »).\n\n- au **début** de la lecture, on le prononce : ٱلْحَمْدُ = **al-ḥamdu** ;\n- quand on **enchaîne** avec le mot d'avant, on le **saute** : la voix glisse directement.", viz: { t: 'cmp', items: [['ٱللَّهُ', "seul : Allāhu", null], ['بِسْمِ ٱللَّهِ', "enchaîné : bismi-llāhi (pas « bismi Allāhi »)", null]] } },
      { h: "Écoute la liaison", md: "Écoute la basmala : « bis-mi-**llā**-hi **r**-raḥ-mā-ni **r**-ra-ḥīm ». Les alifs ٱ ne s'entendent pas : on passe de la fin d'un mot au début du suivant.", viz: { t: 'verse', r: '1:1' } },
      { h: "Le hamza de coupure, lui, se dit toujours", md: "À ne pas confondre avec **أ / إ** (alif avec une **hamza**) : ce son-là se dit **toujours**, même au milieu d'une phrase (un petit coup de gorge). أَحَدٌ = **aḥadun**, ٱهْدِنَا = **ihdinā** au début, mais **hdinā** enchaîné.", viz: { t: 'words', items: [['1:6:1', 'guide-nous (waṣla)'], ['113:1:2', 'je cherche refuge (hamza)'], ['96:1:1', 'lis ! (waṣla)'], ['1:7:3', 'tu as comblé (hamza)']] } },
    ],
    quiz: [
      { q: "ٱ (alif waṣla) en milieu de phrase…", o: ["ne se prononce pas", "se prononce toujours", "se double"], a: 0, why: "On enchaîne : la voix glisse." },
      { q: "Comment se lit بِسْمِ ٱللَّهِ ?", o: ['bismi-llāhi', 'bismi Allāhi', 'bism allāh'], a: 0, why: "Le ٱ de ٱللَّه se saute." },
      { q: "أ (avec hamza) se prononce…", o: ["toujours", "seulement au début", "jamais"], a: 0, why: "La hamza est une vraie consonne." },
      { q: "Écoute : le début de la Fātiḥa", o: ['bismi-llāhi r-raḥmāni r-raḥīm', 'bismi allāhi al-raḥmāni al-raḥīm'], a: 0, why: "Les alifs waṣla et les lām solaires ne s'entendent pas.", ref: '1:1:1' },
    ],
  },
  {
    id: 'r8', title: "ة, ى et la hamza à la lecture", ar: 'تَاءٌ وَأَلِفٌ وَهَمْزَةٌ', min: 20,
    steps: [
      { h: "Le tā' marbūṭa ة", md: "ة (un ه avec deux points) se trouve à la fin d'un nom (souvent féminin) :\n- quand on **enchaîne**, il se lit **t** : جَنَّةٍ عَالِيَةٍ = jannatin ʿāliyatin ;\n- quand on **s'arrête**, il se lit **h** léger, ou on finit sur **a** : جَنَّة = janna(h).", viz: { t: 'words', items: [['88:10:2', 'un jardin'], ['98:5:11', 'la prière']] } },
      { h: "Le alif maqṣūra ى", md: "ى ressemble à ي sans points : il se lit **ā** long, comme un alif. عَلَى = **ʿalā** (sur), هُدًى = **hudan** (une guidée), مُوسَىٰ = **Mūsā** (Moïse).", viz: { t: 'words', items: [['81:24:3', 'sur'], ['2:2:6', 'une guidée'], ['2:54:3', 'Moïse']] } },
      { h: "La hamza : un petit coup de gorge", md: "La **hamza** ء est une vraie consonne : un petit **arrêt de la voix**, comme entre les deux « o » de « oh oh ! ». Elle peut être posée sur ا و ي ou seule ; elle se lit **toujours** de la même façon. شَيْءٍ = **shay-ʾin**, جَآءَ = **jā-ʾa**.", viz: { t: 'words', items: [['78:29:2', 'chose'], ['110:1:2', 'est venu'], ['108:3:2', 'celui qui te hait'], ['113:1:2', 'je cherche refuge']] } },
    ],
    quiz: [
      { q: "ة quand on s'arrête dessus se lit…", o: ["h léger (ou a)", "t", "il ne se lit pas du tout"], a: 0, why: "t en liaison, h (ou a) à l'arrêt." },
      { q: "Comment se lit عَلَى ?", o: ['ʿalā', 'ʿalī', 'ʿalay'], a: 0, why: "ى = ā long." },
      { q: "La hamza ء est…", o: ["un petit arrêt de la voix", "une voyelle longue", "un signe muet"], a: 0, why: "C'est une consonne : le coup de glotte." },
      { q: "Écoute : comment finit ce mot ?", o: ['-ʾa (hamza)', '-a sans arrêt'], a: 0, why: "jā-ʾa : la hamza s'entend.", ref: '110:1:2' },
    ],
  },
  {
    id: 'r9', title: "Les petits signes du Coran", ar: 'عَلَامَاتُ الْمُصْحَفِ', min: 25,
    steps: [
      { h: "Le petit alif ـٰ", md: "Un **petit alif** au-dessus d'une lettre se lit comme un **ā long**. On le trouve dans des mots très fréquents : ٱللَّٰه, هَٰذَا (hādhā, ceci), ذَٰلِكَ (dhālika, cela), ٱلرَّحْمَٰن (ar-raḥmān).", viz: { t: 'words', items: [['83:17:3', 'ceci'], ['78:39:1', 'cela'], ['1:2:4', 'les mondes'], ['1:4:1', 'Maître']] } },
      { h: "La madda ٓ : on allonge plus", md: "Le signe **ٓ** (une petite vague) au-dessus d'une lettre longue veut dire : **allonge plus longtemps** (4 à 6 temps). C'est le **madd** du tajwīd. Écoute ٱلضَّآلِّينَ à la fin de la Fātiḥa : le ā est très long.", viz: { t: 'words', items: [['1:7:9', 'les égarés'], ['110:1:2', 'est venu'], ['111:1:2', 'les deux mains']] } },
      { h: "Les petits و et ي (la ṣila)", md: "Après le pronom **ـهُ / ـهِ** (lui, son), le Coran écrit parfois un **petit و** ou un **petit ي** : on allonge alors la voyelle. لَهُۥ = **lahū**.", viz: { t: 'verse', r: '112:4' } },
      { h: "Les lettres qu'on ne lit pas", md: "Certaines lettres n'ont **aucun signe** : on ne les prononce pas. Le plus courant : le **alif après le و du pluriel**, marqué d'un petit rond ۟ : كَانُوا۟ = **kānū** (ils étaient), le alif est muet.", viz: { t: 'words', items: [['2:10:11', 'ils étaient'], ['84:25:5', 'les bonnes œuvres']] } },
      { h: "Les signes de pause", md: "Au-dessus de la ligne, de petites lettres disent **où s'arrêter** :\n- **م** : arrêt obligatoire ;\n- **لا** : ne t'arrête pas ici ;\n- **ج** : arrêt permis ;\n- **صلى** : mieux vaut continuer ; **قلى** : mieux vaut s'arrêter ;\n- **∴ ∴** (trois points deux fois) : arrête-toi à l'un des deux, pas aux deux.\n\nLe mode « longs versets en morceaux » du Coran coupe les versets à ces signes.", viz: null },
    ],
    quiz: [
      { q: "Le petit alif ـٰ se lit…", o: ["ā long", "a bref", "il ne se lit pas"], a: 0, why: "Comme un alif ordinaire : هَٰذَا = hādhā." },
      { q: "La madda ٓ demande…", o: ["d'allonger plus longtemps", "de s'arrêter", "de doubler la lettre"], a: 0, why: "C'est le madd : 4 à 6 temps." },
      { q: "Dans كَانُوا۟, le alif final…", o: ["ne se prononce pas", "se prononce ā", "se prononce a"], a: 0, why: "Le petit rond ۟ = lettre muette." },
      { q: "Le signe لا au-dessus du texte veut dire…", o: ["ne t'arrête pas ici", "arrêt obligatoire", "fin du verset"], a: 0, why: "لا = « non » : pas d'arrêt." },
    ],
  },
  {
    id: 'r10', title: "Les lettres qu'on confond", ar: 'حُرُوفٌ مُتَشَابِهَةٌ', min: 25,
    steps: [
      { h: "Entendre la différence", md: "Six paires piègent les francophones. Écoute chaque lettre plusieurs fois, puis dis-la toi-même en exagérant. (Pour le détail de la bouche, va dans Apprendre › Alphabet › « Sons à ne pas confondre ».)", viz: { t: 'pairs', items: [['ه', 'h léger (souffle)', 'ح', 'ḥ (gorge serrée)'], ['أ', 'ʾ (coup de glotte)', 'ع', 'ʿ (gorge pressée)'], ['س', 's', 'ص', 'ṣ (s lourd)'], ['ت', 't', 'ط', 'ṭ (t lourd)'], ['ذ', 'dh (anglais « this »)', 'ز', 'z'], ['ك', 'k', 'ق', 'q (fond de la gorge)']] } },
      { h: "Les lettres lourdes", md: "**ص ض ط ظ** (et un peu **ق خ غ**) sont **lourdes** : la langue se creuse, le son vient du fond, et **les voyelles autour s'assombrissent** (le a sonne presque « o »). صِرَٰطَ = **ṣirāṭa** : écoute comme le ā est sombre.", viz: { t: 'words', items: [['1:7:1', 'chemin'], ['1:7:9', 'les égarés'], ['112:2:2', 'l\'Absolu']] } },
      { h: "Lire en regardant les points", md: "À l'œil, ce sont les **points** qui trompent : ب ت ث ن ي, ج ح خ, د ذ, ر ز, س ش, ص ض, ط ظ, ع غ, ف ق. Prends l'habitude de **regarder les points avant de lire** la lettre.", viz: { t: 'cmp', items: [['حَسَدَ', "ḥasada : il a envié", null], ['خَلَقَ', "khalaqa : il a créé", null], ['جَآءَ', "jāʾa : il est venu", null]] } },
    ],
    quiz: [
      { q: "Écoute : ه ou ح ?", o: ['ح', 'ه'], a: 0, why: "ḥ : la gorge est serrée.", say: 'حَ' },
      { q: "Quelle lettre est lourde ?", o: ['ص', 'س', 'ز'], a: 0, why: "ص est le s lourd." },
      { q: "Écoute : ك ou ق ?", o: ['ق', 'ك'], a: 0, why: "q : au fond de la gorge.", say: 'قَ' },
      { q: "Après une lettre lourde, le a sonne…", o: ["plus sombre (presque o)", "plus clair (presque è)", "pareil"], a: 0, why: "Les lettres lourdes assombrissent les voyelles." },
      { q: "ذ se prononce comme…", o: ["th dans « this »", "z", "d"], a: 0, why: "ذ = dh, comme l'anglais « this »." },
    ],
  },
  {
    id: 'r11', title: "Lire la Fātiḥa mot par mot", ar: 'قِرَاءَةُ الْفَاتِحَةِ', min: 30,
    steps: [
      { h: "La méthode", md: "Pour chaque verset :\n1. **Lis seul**, lentement, mot par mot (touche un mot pour l'entendre si tu bloques) ;\n2. **écoute** le verset entier en suivant le mot qui s'allume ;\n3. **relis** à voix haute, à la même vitesse que le récitateur.\n\nTu connais peut-être déjà la Fātiḥa par cœur : ici, l'objectif est de la **lire**, en regardant chaque signe.", viz: { t: 'verse', r: '1:1' } },
      { h: "Versets 2 à 4", md: "Repère : ٱلْحَمْدُ (l lunaire), رَبِّ (shadda), ٱلْعَٰلَمِينَ (petit alif), ٱلرَّحْمَٰنِ ٱلرَّحِيمِ (r solaire), مَٰلِكِ يَوْمِ ٱلدِّينِ (petit alif, aw, d solaire).", viz: { t: 'verse', r: '1:2' } },
      { h: "", md: "", viz: { t: 'verse', r: '1:3' } },
      { h: "", md: "", viz: { t: 'verse', r: '1:4' } },
      { h: "Versets 5 et 6", md: "إِيَّاكَ (shadda sur le ي), نَعْبُدُ (syllabe fermée naʿ), نَسْتَعِينُ (nas-ta-ʿī-nu), ٱهْدِنَا (waṣla), ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ (ṣ solaire et lourd, puis l lunaire).", viz: { t: 'verse', r: '1:5' } },
      { h: "", md: "", viz: { t: 'verse', r: '1:6' } },
      { h: "Verset 7", md: "Le plus long : prends ton temps. أَنْعَمْتَ (hamza), عَلَيْهِمْ (ay), ٱلْمَغْضُوبِ (ḍ lourd), وَلَا ٱلضَّآلِّينَ (madda très longue).", viz: { t: 'verse', r: '1:7' } },
    ],
    quiz: [
      { q: "Dans ٱلْحَمْدُ, le l…", o: ["se prononce", "ne se prononce pas"], a: 0, why: "ح est lunaire : al-ḥamdu." },
      { q: "Comment se lit نَسْتَعِينُ ?", o: ['nastaʿīnu', 'nasataʿinu', 'nustaʿanu'], a: 0, why: "nas (fermée) - ta - ʿī (long) - nu." },
      { q: "Quel mot a une madda très longue ?", o: ['ٱلضَّآلِّينَ', 'ٱلْحَمْدُ', 'نَعْبُدُ'], a: 0, why: "aḍ-ḍāāāllīn : le signe ٓ." },
      { q: "Écoute : quel mot ?", o: ['ٱهْدِنَا', 'ٱلْحَمْدُ', 'إِيَّاكَ'], a: 0, why: "ihdinā : guide-nous.", ref: '1:6:1' },
    ],
  },
  {
    id: 'r12', title: "Lire les petites sourates", ar: 'قِصَارُ السُّوَرِ', min: 30,
    steps: [
      { h: "Al-Ikhlāṣ (112)", md: "Tu as tous les outils. Lis seul, puis écoute. Repère le tanwīn أَحَدٌ et sa lecture à l'arrêt, et le petit و de لَّهُۥ.", viz: { t: 'verse', r: '112:1' } },
      { h: "", md: "", viz: { t: 'verse', r: '112:2' } },
      { h: "", md: "", viz: { t: 'verse', r: '112:3' } },
      { h: "Al-Falaq (113)", md: "Beaucoup de lettres proches : ق (falaq, ghāsiq, waqab), خ (khalaqa), ح (ḥāsid, ḥasad). Écoute bien.", viz: { t: 'verse', r: '113:1' } },
      { h: "", md: "", viz: { t: 'verse', r: '113:2' } },
      { h: "An-Nās (114)", md: "La sourate des ٱلنَّاسِ (an-nās : n solaire) : le mot revient 5 fois. Lis-la d'un trait à la fin.", viz: { t: 'verse', r: '114:1' } },
      { h: "Et ensuite ?", md: "Tu sais lire ! Pour continuer :\n- **Coran** : lis les petites sourates (Juz ʿAmma) avec « m'entraîner à lire » (la transcription se cache) ;\n- **Apprendre › Leçons** : comprendre ce que tu lis (la grammaire) ;\n- **Réviser** : les cartes des signes et des lettres ;\n- **Par cœur** : apprendre une sourate entière.\n\nDernière étape, plus tard : lire **sans voyelles**, comme les arabophones dans la vie de tous les jours. La grammaire et le vocabulaire t'y mèneront.", viz: null },
    ],
    quiz: [
      { q: "أَحَدٌ à l'arrêt se lit…", o: ['aḥad', 'aḥadun', 'aḥadā'], a: 0, why: "-un se tait quand on s'arrête." },
      { q: "Dans ٱلنَّاسِ, combien de fois entend-on le l de l'article ?", o: ["Aucune", "Une", "Deux"], a: 0, why: "ن est solaire : an-nās." },
      { q: "Écoute : quel mot ?", o: ['ٱلْفَلَقِ', 'خَلَقَ', 'وَقَبَ'], a: 0, why: "al-falaq : l'aube.", ref: '113:1:4' },
      { q: "Pour lire sans aide, quel mode du Coran cache la transcription ?", o: ["m'entraîner à lire", "mushaf", "sans voyelles"], a: 0, why: "« m'entraîner à lire » cache la transcription : tu lis seul." },
    ],
  },
];
