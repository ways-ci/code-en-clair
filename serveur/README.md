# Le serveur des comptes

Code en clair marche sans serveur. Les comptes, facultatifs, passent par
[PocketBase](https://pocketbase.io) : connexion avec Google ou GitHub seulement,
aucun mot de passe, aucun courriel envoyé.

- `pb_migrations/` : la collection des apprenants (adresse, prénom, progression)
  et ses règles : chacun ne voit et ne change que son propre compte.
- `pb_hooks/` : au démarrage, Google et GitHub se configurent depuis les
  variables du serveur. Aucun secret n'est dans ce dépôt.

## Essayer chez soi

```bash
# PocketBase 0.40 ou plus récent, téléchargé depuis github.com/pocketbase/pocketbase/releases
export CEC_GITHUB_ID=...  CEC_GITHUB_SECRET=...      # une application OAuth GitHub
export CEC_GOOGLE_ID=...  CEC_GOOGLE_SECRET=...      # un client OAuth Google
export CEC_URL=http://127.0.0.1:8090
pocketbase serve --migrationsDir serveur/pb_migrations --hooksDir serveur/pb_hooks --publicDir .
```

Puis ouvrir http://127.0.0.1:8090. L'adresse de retour à déclarer chez Google et
GitHub est `<adresse du site>/api/oauth2-redirect`.

Sans les variables d'un fournisseur, son bouton n'apparaît pas. Sans serveur du
tout, le bouton Compte n'apparaît pas et l'outil marche comme avant.
