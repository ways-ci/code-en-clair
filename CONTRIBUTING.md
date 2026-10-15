# Contribuer à Code en clair

Merci de vouloir aider. Une carte bien écrite peut éviter à des centaines de
personnes d'abandonner devant un message en anglais.

## Les trois règles

1. **La commande reste en anglais, tout le reste est en français.** Le sens mot à
   mot, l'usage, les pièges, les consignes : en français. Chaque mot anglais du
   métier va dans le lexique, avec sa prononciation.
2. **Avec tes mots.** Explique comme tu l'expliquerais à un ami. Ne copie pas et ne
   traduis pas mot pour mot la page d'un autre site : inspire-toi des références,
   puis écris la tienne. Les exemples de code courants (`git add README.md`) sont
   libres, bien sûr.
3. **Court et vrai.** Une idée par ligne. Chaque message d'erreur cité doit être
   celui que le terminal affiche vraiment : vérifie-le en le provoquant.

## Ajouter une carte

Tout se passe dans `donnees.js`. Copie une carte existante du même monde et change
ses textes :

```js
{id:"git-status", monde:"git", cmd:"git status", en:"git status",
 dit:"« git, où on en est ? »",
 sert:"Voir l'état de tes fichiers.",
 quand:"Avant chaque git add et chaque git commit.",
 lignes:[["git status","l'état complet"]],
 reponse:[["nothing to commit, working tree clean","Rien à enregistrer"]],
 pieges:[["fatal: not a git repository","Tu n'es pas dans un dossier suivi par Git."]],
 mots:["status"],
 cherche:"voir ce qui a change etat fichiers modifies",
 defi:{consigne:"Regarde où en sont tes fichiers.", ok:["^git status$"],
   fautes:[["^git statu$","Il manque le s final : status."]]}},
```

| Champ | Rôle |
|---|---|
| `id` | Identifiant unique, sans espace |
| `monde` | `terminal`, `git`, `github`, `vscode`… |
| `cmd` | La commande, en anglais, telle qu'on la tape |
| `en` | Ce que le bouton « Écouter » prononce |
| `dit` | Le sens mot à mot, en français |
| `sert`, `quand` | À quoi elle sert, quand on l'utilise |
| `lignes` | Exemples à taper, chacun avec sa note |
| `reponse` | Ce que le terminal répond, traduit |
| `pieges` | Les erreurs fréquentes et ce qu'elles veulent dire |
| `mots` | Les mots du lexique qu'elle emploie |
| `cherche` | Des mots français, sans accents, pour la recherche |
| `defi` | La consigne, les réponses acceptées (expressions régulières) et les erreurs expliquées |

Puis ajoute l'`id` de ta carte dans une étape de son monde (`mondes`, champ `etapes`).

## Vérifier avant de proposer

```bash
python -m http.server 8000
```

Ouvre http://localhost:8000, trouve ta carte par la recherche, ouvre-la, relève son
défi avec une bonne réponse puis avec une erreur. La console du navigateur (F12)
ne doit afficher aucune erreur.

## Proposer

Fais une *pull request* (« demande de fusion ») sur GitHub. L'équipe relit, corrige
si besoin, puis publie. Ton nom rejoint la liste des contributeurs.

En proposant, tu acceptes que ta contribution soit publiée sous la licence MIT du projet.
