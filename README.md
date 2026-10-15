# Code en clair

**Apprendre à coder en français.** La commande reste en anglais, tout le reste est
expliqué en français : ce qu'elle veut dire mot à mot, à quoi elle sert, comment la
taper, ce que le terminal te répond, et les pièges.

En ligne : **https://codeenclair.ways-ci.com**

## Pourquoi

Presque toutes les ressources pour apprendre à coder sont en anglais, vidéos
comprises. Avant de comprendre ce que fait une commande, il faut d'abord comprendre
la langue qui l'explique, et c'est souvent là qu'on abandonne. Code en clair enlève
cette marche.

## Ce qu'on y trouve

- **Des cartes de commandes** : terminal, Git, GitHub, VS Code, et d'autres mondes à venir
  (le web, Python, SQL, l'IA en vrai code, la mise en ligne).
- **Des cartes-mots** : les mots anglais du métier, traduits, avec leur prononciation
  et un bouton pour les écouter.
- **Des défis** : choisir la bonne commande ou la taper dans un terminal
  d'entraînement, avec l'explication de chaque erreur en français.
- **Ta feuille de route** : tu choisis par quoi commencer et dans quel ordre.
- **Des points, des niveaux, une série de jours et des badges**, pour revenir chaque jour.
- **Hors ligne** : après une première visite, l'outil marche sans connexion. Sur
  téléphone, « Ajouter à l'écran d'accueil » l'installe comme une application.

Tout est gratuit, sans compte. Ta progression reste dans ton navigateur.

## L'utiliser sur ton ordinateur

Tout tient dans quelques fichiers, sans installation :

```bash
git clone https://github.com/ways-ci/code-en-clair.git
cd code-en-clair
python -m http.server 8000
```

Puis ouvre http://localhost:8000 dans ton navigateur.

## Comment c'est rangé

| Fichier | Ce qu'il contient |
|---|---|
| `donnees.js` | **Tout le contenu** : les mondes, les cartes, les mots, les modèles de feuille de route. C'est ici qu'on ajoute une carte. |
| `app.js` | Le moteur : points, série, défis, recherche, feuille de route. |
| `style.css` | L'apparence. |
| `index.html` | La page. |
| `sw.js`, `manifest.json` | Le fonctionnement hors ligne et l'installation sur téléphone. |

## Contribuer

Une carte manque, une explication n'est pas claire, une faute s'est glissée ?
Lis [CONTRIBUTING.md](CONTRIBUTING.md) : tout passe par une proposition relue avant
publication.

## Licence

Libre, sous [licence MIT](LICENSE). Tu peux l'utiliser, le copier, le modifier et
le partager, y compris dans ton école ou ton entreprise.

Un projet offert à la communauté francophone par W.A.S GROUPE CI (WAYS), Abidjan.
