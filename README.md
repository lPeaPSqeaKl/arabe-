# Atelier arabe

Plugin Obsidian en français pour apprendre l'arabe avec le Coran :

- **Coran** : les 114 sourates, chaque mot cliquable (morceaux, signes lettre par lettre, cas / mode et pourquoi, autres terminaisons, racine, autres versets), traductions française (Hamidullah) et russe (Kouliev), récitation, et **analyse grammaticale complète** de chaque verset (iʿrāb) avec un schéma des liens entre les mots.
- **Alphabet** : chaque lettre, sa prononciation, ses formes, et un schéma de la bouche et de la gorge qui montre d'où sort chaque son.
- **Ordre des sourates** : ordre du Coran ou ordre de la révélation.
- **Couleurs de prononciation** : lettres muettes, voyelles longues, nasalisation, qalqala, arrêt.
- **Règles** : 36 règles expliquées simplement, chacune avec une explication détaillée (pas à pas, exemples du Coran, pièges, exercice), ouvertes d'un clic depuis les leçons. Chaque explication peut être corrigée dans une note, sans toucher à l'original.
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
- `content/fr/alphabet.json` : les lettres, leur prononciation et les zones du schéma de la bouche.
- Pour une autre langue, créer `content/ru/` avec les mêmes noms de fichiers : ce qui manque est pris en français.
- `css/style.css` : l'apparence (`css/fonts.css` contient la police arabe incluse).
- `src/` : le code, en morceaux numérotés. `build.sh` assemble le tout dans `main.js` (avec `node tools/content.js` pour le contenu).

Le plugin est entièrement en français. Le russe (traduction de Kouliev, explications et comparaisons) est une option, désactivée par défaut.

## Données et droits

Texte du Coran : projet [Tanzil](https://tanzil.net). Analyse morphologique : [Quranic Arabic Corpus](https://corpus.quran.com) (Kais Dukes, Université de Leeds, GNU GPL). Traductions : Muhammad Hamidullah (français), Elmir Kuliev (russe), utilisées à des fins d'étude non commerciales. Police arabe : Amiri Quran de Khaled Hosny (SIL Open Font License 1.1). Détails et conditions : [SOURCES.md](SOURCES.md).

Outil d'apprentissage : les analyses automatiques peuvent contenir des erreurs.
