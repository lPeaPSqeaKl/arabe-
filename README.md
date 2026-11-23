# Atelier arabe

Plugin Obsidian en français pour apprendre l'arabe avec le Coran :

- **Accueil** : le tableau de bord du jour (jours d'affilée, cartes à faire, prochaine lettre à écrire, prochaine leçon, part du Coran que tu comprends, sourate par sourate), et les réglages de confort (taille du texte, récitateur, son hors ligne).
- **Écrire** : un cahier d'écriture en 14 unités. Pour chaque lettre : regarder le geste, tracer sur le modèle, tracer ses formes, puis l'écrire seul ; l'atelier compare le tracé au modèle et donne une note. Puis des mots du Coran, jusqu'à la Fātiḥa. Au doigt, au stylet (Apple Pencil) ou à la souris.
- **Coran** : les 114 sourates, chaque mot cliquable (morceaux, signes lettre par lettre, cas / mode et pourquoi, autres terminaisons, racine, autres versets), traduction française (Hamidullah), récitation, et **analyse grammaticale complète** de chaque verset (iʿrāb) avec un schéma des liens entre les mots.
- **Alphabet** : chaque lettre, sa prononciation, ses formes, et un schéma de la bouche et de la gorge qui montre d'où sort chaque son.
- **Ordre des sourates** : ordre du Coran ou ordre de la révélation.
- **Couleurs de prononciation** : lettres muettes, voyelles longues, nasalisation, qalqala, arrêt.
- **Règles** : 36 règles expliquées simplement, chacune avec une explication détaillée (pas à pas, exemples du Coran, pièges, exercice), ouvertes d'un clic depuis les leçons. Chaque explication peut être corrigée dans une note, sans toucher à l'original.
- **Vocabulaire du Coran** : tous les mots du Coran (4 776), du plus fréquent au plus rare, en 5 niveaux jusqu'à 100 % du texte (les 300 premiers en font déjà les trois quarts), en cartes, avec le son, la racine et un verset d'exemple ; et pour chaque sourate, « apprendre les mots de cette sourate ».
- **Hors ligne** : tout marche sans internet après le premier lancement ; le son d'une sourate (ou de toutes les sourates courtes) peut être gardé sur l'appareil.
- **Révision** : un paquet de cartes pour chaque règle (50 paquets, plus de 450 cartes : nominatif, prépositions, génitif, accusatif, phrase, verbe, lecture, tajwid), avec répétition espacée : chaque jour les cartes à revoir et quelques nouvelles. Les paquets sont inclus dans le plugin (donc aussi sur iPad et iPhone) ; si le coffre contient sa propre version d'un paquet (`5 - Flashcards/Règles/Cartes - …`), c'est elle qui est utilisée.
- **Leçons** : un parcours de grammaire en 14 leçons à partir de vrais versets, avec exercices.
- **Dictionnaire** : les 4 776 mots du Coran, recherche en arabe, français ou translittération, par racine, avec toutes les formes et tous les versets.
- **Analyser** un texte arabe, même sans voyelles.
- **Construire** des phrases et voir comment les dire autrement.
- **Signes** : laboratoire des voyelles.
- **Entraînement** avec suivi des progrès.

## Installation sur iPad / téléphone (BRAT)

1. Dans Obsidian : Paramètres → Plugins communautaires → Parcourir → installe et active **BRAT** (Obsidian42 - BRAT).
2. Paramètres → BRAT → **Add Beta plugin** → colle `lPeaPSqeaKl/arabe-` → **Add Plugin**.
3. Active **Atelier arabe** dans les plugins communautaires.
4. Au premier lancement, le plugin télécharge le Coran (environ 8 Mo), une seule fois. Ensuite tout marche hors ligne.

## Structure (pour corriger ou traduire)

Le texte des explications est séparé du code :

- `content/fr/regles/<règle>.md` : l'explication détaillée de chaque règle, en Markdown simple (`## titres`, listes, tableaux, `> encadrés`, et `@coran sourate:verset | n° des mots | note` pour un exemple tiré du Coran).
- `content/fr/cartes/<groupe>/Cartes - <règle>.md` : les cartes de révision, au format du plugin Spaced Repetition (`question` / ligne `?` / `réponse`, ou `question :: réponse`).
- `content/fr/alphabet.json` : les lettres, leur prononciation et les zones du schéma de la bouche.
- `css/style.css` : l'apparence (`css/fonts.css` contient la police arabe incluse).
- `src/` : le code, en morceaux numérotés. `build.sh` assemble le tout dans `main.js` (avec `node tools/content.js` pour le contenu).

Le plugin est entièrement en français et en arabe.

## Données et droits

Texte du Coran : projet [Tanzil](https://tanzil.net). Analyse morphologique : [Quranic Arabic Corpus](https://corpus.quran.com) (Kais Dukes, Université de Leeds, GNU GPL). Traduction française : Muhammad Hamidullah, utilisée à des fins d'étude non commerciales. Police arabe : Amiri Quran de Khaled Hosny (SIL Open Font License 1.1). Détails et conditions : [SOURCES.md](SOURCES.md).

Outil d'apprentissage : les analyses automatiques peuvent contenir des erreurs.
