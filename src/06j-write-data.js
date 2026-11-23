/* ====================================================================
 * 06j - Données de l'onglet Écrire : comment tracer chaque lettre,
 * et les unités du parcours (lettres groupées par famille de formes).
 * steps : les gestes dans l'ordre · tip : le piège à éviter
 * join : false = la lettre ne s'attache jamais à la lettre suivante
 * ==================================================================== */
const WRITE_LETTERS = {
  'ب': { steps: ['Pars de la droite, un peu au-dessus de la ligne.', 'Descends doucement et trace un long trait **plat** vers la gauche, posé sur la ligne : un petit bateau.', 'Remonte un peu à gauche pour fermer le bateau.', 'À la fin seulement, ajoute **un point dessous**.'], tip: 'Le corps est large et plat. Le point vient toujours **après** le corps.' },
  'ت': { steps: ['Trace le même bateau que ب.', 'Ajoute **deux points au-dessus**, côte à côte, de droite à gauche.'], tip: 'Les deux points sont au milieu du bateau, pas au bout.' },
  'ث': { steps: ['Trace le même bateau que ب.', 'Ajoute **trois points au-dessus** : deux en bas, un au-dessus d\'eux (comme un petit triangle).'], tip: 'Sur papier, on écrit souvent les 3 points comme un petit « chapeau » ^.' },
  'ن': { steps: ['Pars en haut à droite.', 'Descends **sous la ligne** en arrondi, comme un bol.', 'Remonte à gauche.', 'Ajoute **un point au-dessus**, au milieu du bol.'], tip: 'Isolée ou à la fin, ن est plus **ronde et plus profonde** que ب. Au début et au milieu, elle ressemble à ب (point dessus).' },
  'ي': { steps: ['Pars en haut à droite, fais une petite vague vers la gauche.', 'Redescends en arrière vers la droite, sous la ligne.', 'Finis par une grande courbe vers la gauche (comme un s couché).', 'Ajoute **deux points dessous**.'], tip: 'Au début et au milieu, ي est une petite dent avec deux points dessous : يـ ـيـ.' },
  'ا': { steps: ['Pars **du haut** et trace un trait droit **vers le bas**, jusqu\'à la ligne.'], tip: 'Le alif est la lettre **la plus haute**. Il ne s\'attache **jamais** à la lettre qui suit.', join: false },
  'ل': { steps: ['Pars du haut, comme un alif.', 'Descends **sous la ligne**.', 'Tourne en arrondi vers la gauche et remonte un peu : un crochet.'], tip: 'Ne confonds pas avec ا : le lām descend sous la ligne et se termine par un crochet.' },
  'ك': { steps: ['Trace d\'abord le grand corps : un trait du haut vers le bas, puis un long trait plat vers la gauche, et remonte au bout.', 'Ajoute le **petit signe ء** à l\'intérieur (en fin de mot) ; au début et au milieu, on trace plutôt une barre en haut : كـ.'], tip: 'Au début et au milieu, le kāf a une **barre penchée en haut** : كـ ـكـ.' },
  'م': { steps: ['Fais une **petite boucle** ronde, sur la ligne (sens contraire des aiguilles d\'une montre).', 'Isolée ou à la fin : laisse tomber une **queue droite** sous la ligne.'], tip: 'La boucle est petite et bien fermée. Pas de point.' },
  'ج': { steps: ['Trace un petit trait en haut, de droite à gauche.', 'Repars en arrière et descends en grande courbe **sous la ligne**, comme un grand C ouvert à gauche.', 'Ajoute **un point** au milieu du ventre.'], tip: 'ج ح خ ont le même corps : seul le point change (dedans, rien, au-dessus).' },
  'ح': { steps: ['Même corps que ج : petit trait en haut, puis grande courbe sous la ligne.', '**Pas de point.**'], tip: 'Au début : حـ, juste la « tête » du corps, sans le grand ventre.' },
  'خ': { steps: ['Même corps que ج.', 'Ajoute **un point au-dessus**.'], tip: 'Le point est au-dessus de la tête, pas dedans.' },
  'د': { steps: ['Pars en haut, trace un petit trait penché vers le bas à gauche.', 'Puis un trait plat vers la droite, sur la ligne : un petit angle.'], tip: 'Petit et anguleux. Il ne s\'attache **jamais** à la lettre qui suit.', join: false },
  'ذ': { steps: ['Trace un د.', 'Ajoute **un point au-dessus**.'], tip: 'Ne s\'attache jamais à la lettre qui suit.', join: false },
  'ر': { steps: ['Pars sur la ligne et descends **sous la ligne** en courbe vers la gauche, comme une virgule.'], tip: 'ر plonge sous la ligne ; د reste posé dessus. Ne s\'attache jamais à la lettre qui suit.', join: false },
  'ز': { steps: ['Trace un ر.', 'Ajoute **un point au-dessus**.'], tip: 'Ne s\'attache jamais à la lettre qui suit.', join: false },
  'و': { steps: ['Fais une **petite boucle** sur la ligne.', 'Descends **sous la ligne** en courbe, comme un ر.'], tip: 'Une boucle + une queue de ر. Ne s\'attache jamais à la lettre qui suit.', join: false },
  'س': { steps: ['Trace **trois petites dents** de droite à gauche, sur la ligne.', 'Isolée ou à la fin : finis par un **grand bol** sous la ligne, comme ن.'], tip: 'Les dents sont petites et régulières. Au début : سـ, seulement les trois dents.' },
  'ش': { steps: ['Trace un س.', 'Ajoute **trois points au-dessus** (petit triangle).'], tip: 'Les 3 points sont au-dessus des dents.' },
  'ص': { steps: ['Fais une **boucle allongée** couchée vers la droite, comme un œuf posé sur la ligne.', 'Ajoute une petite dent à gauche.', 'Isolée ou à la fin : finis par le grand bol sous la ligne.'], tip: 'La boucle est fermée et allongée. Ne pas oublier la petite dent.' },
  'ض': { steps: ['Trace un ص.', 'Ajoute **un point au-dessus** de la boucle.'], tip: 'ض est la lettre qu\'on dit « propre à l\'arabe ».' },
  'ط': { steps: ['Trace le **grand trait vertical**, du haut vers le bas.', 'Sans lever le stylo, fais la **boucle allongée** posée sur la ligne, vers la droite, et reviens.'], tip: 'Beaucoup de gens font d\'abord la boucle puis le trait : les deux se font. L\'important est que le trait touche la boucle à gauche.' },
  'ظ': { steps: ['Trace un ط.', 'Ajoute **un point** à droite du trait vertical.'], tip: 'Le point est dans l\'angle, au-dessus de la boucle.' },
  'ع': { steps: ['Trace une **petite tête ouverte**, comme un c, en haut.', 'Repars vers la droite puis descends en grande courbe **sous la ligne**, comme pour ج.'], tip: 'Au milieu d\'un mot, la tête devient un petit triangle plein : ـعـ.' },
  'غ': { steps: ['Trace un ع.', 'Ajoute **un point au-dessus** de la tête.'], tip: 'Même forme que ع, avec un point.' },
  'ف': { steps: ['Fais une **petite boucle** ronde.', 'Puis un long trait plat vers la gauche sur la ligne, et remonte au bout.', 'Ajoute **un point au-dessus** de la boucle.'], tip: 'ف a un point, ق en a deux et descend plus bas.' },
  'ق': { steps: ['Fais une **petite boucle** ronde.', 'Isolée ou à la fin : descends en **bol profond** sous la ligne.', 'Ajoute **deux points au-dessus**.'], tip: 'Le bol de ق est rond et profond, comme celui de ن.' },
  'ه': { steps: ['Isolée : trace un **petit rond**, un peu aplati, sur la ligne.'], tip: 'ه change beaucoup : هـ au début (deux petites boucles), ـهـ au milieu, ـه à la fin.' },
  'ة': { steps: ['Trace un ه.', 'Ajoute **deux points au-dessus**.'], tip: 'Le tā marbūṭa n\'existe qu\'à la **fin** d\'un mot (ـة après une lettre attachée).', join: false, forms: ['ة', 'ـة'] },
  'ء': { steps: ['Trace une petite forme comme un **2 à l\'envers**, flottante, au-dessus de la ligne.'], tip: 'La hamza est petite. Elle est souvent posée sur un support : أ إ ؤ ئ.', join: false, forms: ['ء', 'أ', 'إ', 'ؤ', 'ئ'] },
  'لا': { steps: ['Trace le **lām** du haut vers le bas.', 'Au lieu de continuer, croise vers la droite, puis trace le **alif** penché qui remonte : une sorte de V.'], tip: 'ل + ا ne s\'écrivent jamais côte à côte : on fait toujours cette ligature لا.', join: false, forms: ['لا', 'ـلا'] },
};
/* le parcours : on avance par familles de lettres. words = mots à écrire (seulement avec les lettres déjà vues) */
const WRITE_UNITS = [
  { id: 'u1', title: 'Le petit bateau', letters: ['ب', 'ت', 'ث'], words: [['تَبَّتْ', 'tabbat', 'qu\'elles périssent (111:1)'], ['ثَبَّتَ', 'thabbata', 'il a affermi']] },
  { id: 'u2', title: 'Le bol et la vague', letters: ['ن', 'ي'], words: [['بَيْت', 'bayt', 'maison'], ['بَيْنَ', 'bayna', 'entre'], ['نَبِيّ', 'nabiyy', 'prophète']] },
  { id: 'u3', title: 'Les lettres hautes', letters: ['ا', 'ل', 'ك'], words: [['لَا', 'lā', 'non'], ['بَاب', 'bāb', 'porte'], ['كِتَاب', 'kitāb', 'livre'], ['تِلْكَ', 'tilka', 'celle-là']] },
  { id: 'u4', title: 'La petite boucle', letters: ['م'], words: [['مِنْ', 'min', 'de'], ['كَمَا', 'kamā', 'comme'], ['مَلِك', 'malik', 'roi'], ['لَمْ', 'lam', 'ne… pas']] },
  { id: 'u5', title: 'Le grand ventre', letters: ['ج', 'ح', 'خ'], words: [['جَنَّات', 'jannāt', 'jardins'], ['حَكِيم', 'ḥakīm', 'sage'], ['نَجْم', 'najm', 'étoile'], ['خَلِيل', 'khalīl', 'ami intime']] },
  { id: 'u6', title: 'Les petits angles', letters: ['د', 'ذ'], words: [['مُحَمَّد', 'muḥammad', 'Muhammad'], ['دِين', 'dīn', 'religion, jugement'], ['حَمْد', 'ḥamd', 'louange'], ['ذَلِكَ', 'dhālika', 'cela']] },
  { id: 'u7', title: 'Les lettres qui plongent', letters: ['ر', 'ز', 'و'], words: [['رَبّ', 'rabb', 'Seigneur'], ['رَحِيم', 'raḥīm', 'très miséricordieux'], ['نُور', 'nūr', 'lumière'], ['يَوْم', 'yawm', 'jour']] },
  { id: 'u8', title: 'Les dents', letters: ['س', 'ش'], words: [['بِسْمِ', 'bismi', 'au nom de'], ['نَاس', 'nās', 'les gens'], ['رَسُول', 'rasūl', 'messager'], ['شَمْس', 'shams', 'soleil']] },
  { id: 'u9', title: 'Les boucles couchées', letters: ['ص', 'ض', 'ط', 'ظ'], words: [['صِرَاط', 'ṣirāṭ', 'chemin'], ['صَبْر', 'ṣabr', 'patience'], ['ظُلْم', 'ẓulm', 'injustice'], ['ضَالِّين', 'ḍāllīn', 'égarés']] },
  { id: 'u10', title: 'L\'œil', letters: ['ع', 'غ'], words: [['عَلِيم', 'ʿalīm', 'qui sait tout'], ['عَالَمِين', 'ʿālamīn', 'les mondes'], ['غَيْب', 'ghayb', 'l\'invisible'], ['غَضَب', 'ghaḍab', 'colère']] },
  { id: 'u11', title: 'Les boucles rondes', letters: ['ف', 'ق'], words: [['قُلْ', 'qul', 'dis !'], ['فِي', 'fī', 'dans'], ['قَلْب', 'qalb', 'cœur'], ['فَلَق', 'falaq', 'aube']] },
  { id: 'u12', title: 'Le hā et le tā marbūṭa', letters: ['ه', 'ة'], words: [['اللَّه', 'allāh', 'Allah'], ['هُوَ', 'huwa', 'il, lui'], ['جَنَّة', 'janna', 'paradis'], ['رَحْمَة', 'raḥma', 'miséricorde']] },
  { id: 'u13', title: 'La hamza et lām-alif', letters: ['ء', 'لا'], words: [['أَحَد', 'aḥad', 'un, unique'], ['الْأَرْض', 'al-arḍ', 'la terre'], ['سَلَام', 'salām', 'paix'], ['مُؤْمِن', 'muʾmin', 'croyant']] },
  { id: 'u14', title: 'Écrire la Fātiḥa', letters: [], words: [['بِسْمِ اللَّهِ', 'bismi llāhi', 'au nom d\'Allah'], ['الرَّحْمَنِ الرَّحِيمِ', 'ar-raḥmāni r-raḥīm', 'le Tout Miséricordieux, le Très Miséricordieux'], ['الْحَمْدُ لِلَّهِ', 'al-ḥamdu lillāhi', 'la louange est à Allah'], ['رَبِّ الْعَالَمِينَ', 'rabbi l-ʿālamīn', 'Seigneur des mondes'], ['مَالِكِ يَوْمِ الدِّينِ', 'māliki yawmi d-dīn', 'Maître du jour du Jugement'], ['إِيَّاكَ نَعْبُدُ', 'iyyāka naʿbudu', 'c\'est Toi que nous adorons'], ['وَإِيَّاكَ نَسْتَعِينُ', 'wa-iyyāka nastaʿīn', 'et c\'est Toi dont nous implorons le secours'], ['اهْدِنَا الصِّرَاطَ', 'ihdinā ṣ-ṣirāṭa', 'guide-nous sur le chemin'], ['الْمُسْتَقِيمَ', 'al-mustaqīm', 'droit'], ['صِرَاطَ الَّذِينَ', 'ṣirāṭa lladhīna', 'le chemin de ceux'], ['أَنْعَمْتَ عَلَيْهِمْ', 'anʿamta ʿalayhim', 'que Tu as comblés'], ['غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ', 'ghayri l-maghḍūbi ʿalayhim', 'non pas de ceux qui ont encouru Ta colère'], ['وَلَا الضَّالِّينَ', 'wa-lā ḍ-ḍāllīn', 'ni des égarés']] },
];
const WRITE_BASICS = [
  'On écrit **de droite à gauche**, sur une **ligne de base** (le trait en pointillé).',
  'Dans chaque lettre, trace d\'abord **le corps**, puis les **points**, et à la toute fin les **voyelles** (petits signes).',
  'Les lettres d\'un mot **s\'attachent** entre elles par un trait sur la ligne. Six lettres ne s\'attachent **jamais à la suivante** : ا د ذ ر ز و.',
  'Chaque lettre a jusqu\'à **4 formes** : seule, au début, au milieu, à la fin. Le cœur de la lettre reste le même.',
  'Certaines lettres **montent** (ا ل ك ط), d\'autres **plongent sous la ligne** (ر ز و ن ي ج ح خ ع غ م ق س ش ص ض).',
  'Sur iPad, utilise de préférence l\'**Apple Pencil**. Sur téléphone, le doigt suffit : écris grand.',
];
/* les 4 formes d'une lettre, avec le trait d'union arabe (ـ) pour montrer les liaisons */
function writeForms(l) {
  const W = WRITE_LETTERS[l] || {};
  if (W.forms) return W.forms.map((f, i) => [f, i === 0 ? 'seule' : (W.forms.length === 2 ? 'à la fin' : 'sur un support')]);
  if (W.join === false) return [[l, 'seule'], ['ـ' + l, 'à la fin']];
  return [[l, 'seule'], [l + 'ـ', 'au début'], ['ـ' + l + 'ـ', 'au milieu'], ['ـ' + l, 'à la fin']];
}
