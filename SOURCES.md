# Sources et droits

Le plugin Atelier arabe est un outil personnel d'apprentissage, gratuit et non commercial.

## Données incluses dans le dossier `data/`

| Contenu | Source | Conditions |
|---|---|---|
| Texte arabe du Coran (écriture uthmani) | [Projet Tanzil](https://tanzil.net), repris par le Quranic Arabic Corpus | Copie autorisée à condition de ne pas modifier le texte et de citer Tanzil avec un lien. Le texte n'est pas modifié ; il est seulement découpé en mots. |
| Analyse des mots : racines, lemmes, cas, modes, formes | [Quranic Arabic Corpus](https://corpus.quran.com), version 0.4, © Kais Dukes, Université de Leeds, licence GNU GPL ; avec les corrections de [mustafa0x/quran-morphology](https://github.com/mustafa0x/quran-morphology) | Utilisable dans une application en citant clairement le Quranic Arabic Corpus avec un lien vers corpus.quran.com. Les données sont réorganisées (format JSON) pour le plugin. |
| Traduction française | Muhammad Hamidullah, via [fawazahmed0/quran-api](https://github.com/fawazahmed0/quran-api) | Les droits appartiennent à l'auteur et à ses éditeurs. Utilisation ici non commerciale, à des fins d'étude. |
| Définitions françaises des 650 mots les plus fréquents | Écrites pour ce plugin | — |

## Police

**Amiri Quran**, © Khaled Hosny, sous [SIL Open Font License 1.1](https://openfontlicense.org) ([projet Amiri](https://github.com/aliftype/amiri)), incluse dans `css/fonts.css` via le paquet @fontsource/amiri-quran. Elle n'est pas vendue seule et garde son nom d'origine.

**Autres polices au choix** (réglage « Police arabe »), toutes sous [SIL Open Font License 1.1](https://openfontlicense.org), incluses dans `css/fonts.css` et `data/fonts/` via les paquets @fontsource, avec leur nom d'origine et sans être vendues seules : **Scheherazade New** et **Lateef** (© SIL Global), **Noto Naskh Arabic** (© The Noto Project Authors), **Amiri** (© The Amiri Project Authors), **Aref Ruqaa** (© The Aref Ruqaa Project Authors), **Bouazzi Maghribi** (© aleftypefoundry, [projet](https://github.com/aleftypefoundry/bouazzi-maghribi), nom réservé « Bouazzi Maghribi », gardé tel quel), **Harmattan** (© SIL Global), **Reem Kufi**, **Kufam**, **Mirza**, **Noto Nastaliq Urdu** (© The Noto Project Authors), **Gulzar**, **Katibeh**, **Rakkas**, **Lalezar** (© leurs auteurs respectifs, Google Fonts).

## Ordre de la révélation

Ordre traditionnel de l'édition égyptienne du Coran (1924), vérifié avec le paquet [quran-meta](https://www.npmjs.com/package/quran-meta).

## Son

Les récitations (everyayah.com, quran.com) ne sont pas copiées dans le plugin : elles sont écoutées en ligne, seulement quand on appuie sur ▶ ou 🔊.

Le minutage mot par mot des récitateurs (data/timing/, pour allumer le mot récité) vient de [quran-align](https://github.com/cpfair/quran-align) de Collin Fair, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Il a été converti par tools/build-timing.js (un nombre par mot, en centièmes de seconde).

## Avertissement

Les explications, leçons, définitions et analyses automatiques (iʿrāb, prononciation) servent à apprendre. Elles peuvent contenir des erreurs : pour le Coran, vérifie toujours auprès d'un enseignant.

Si tu es titulaire de droits sur l'un de ces contenus et souhaites qu'il soit retiré, ouvre une « issue » sur ce dépôt.

## Signes de pause (waqf)
Position des signes de pause du mushaf de Médine (ۖ ۗ ۚ ۘ), utilisée pour couper les longs versets en morceaux : tirée du texte uthmani du paquet [quran-json](https://github.com/risan/quran-json) (texte de [quranenc.com](https://quranenc.com), licence CC BY-SA 4.0). Fichier généré : `src/04d-pauses.gen.js`.

## Le geste d'écriture (ordre et sens des traits)
L'animation « Voir le geste » suit ces règles, prises dans des guides d'écriture et de calligraphie :
- chaque morceau attaché s'écrit sans lever le stylo, de droite à gauche ; on ne lève le stylo qu'après les six lettres qui ne s'attachent pas à gauche (ا د ذ ر ز و) : [OpenArabic, « Arabic Cursive »](https://openarabic.org/arabic-cursive/), [Noor World](https://noorworld.com/arabic-alphabet-practice-sheets/) ;
- le corps d'abord, puis les points de ce morceau, de droite à gauche : [OpenArabic](https://openarabic.org/arabic-cursive/), [Taalhammer, « How to write Arabic »](https://www.taalhammer.com/how-to-write-arabic/) ;
- le départ de chaque lettre et le sens des traits (ب ت ن : on part de la dent de droite ; ا de haut en bas) : [Taalhammer](https://www.taalhammer.com/how-to-write-arabic/), [Mamoun Sakkal, l'alphabet arabe](https://www.sakkal.com/articles/sakkal_arabic_alphabet.pdf) ;
- les formes en naskh (dents, tête du ع et du ح, jambe du م final, trait du haut du ك ajouté après) : [Arabic Calligraphy Apprentice](https://www.tumblr.com/arabiccalligraphyapprentice/tagged/practice).
Les voyelles et les signes sont posés à la toute fin, une fois le mot fini (pratique courante des cahiers d'écriture). Code : `src/06k0-write-pen.js`.
