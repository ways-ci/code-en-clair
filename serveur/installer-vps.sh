#!/usr/bin/env bash
# Installe (ou met à jour) les comptes de Code en clair sur un serveur Linux avec nginx, en root.
#   bash installer-vps.sh codeenclair.exemple.com
# Ce que fait le script, dans l'ordre :
#   1. récupère PocketBase (somme de contrôle vérifiée) et ce dépôt ;
#   2. demande les identifiants Google et GitHub (rien ne s'affiche à la frappe) s'ils ne sont pas déjà posés ;
#   3. lance PocketBase comme service, sous un utilisateur sans droits, écoutant seulement 127.0.0.1 ;
#   4. ouvre /api/ dans nginx, ferme la console d'administration au public, recopie le site ;
#   5. vérifie que l'adresse publique répond.
# Relancé plus tard, il met à jour le site, les règles et PocketBase, sans toucher aux comptes ni aux secrets.
set -euo pipefail

DOMAINE="${1:?Donne le nom du site, par exemple : bash installer-vps.sh codeenclair.ways-ci.com}"
VERSION_PB="0.40.6"
PORT=8095
RACINE=/opt/codeenclair-comptes
SITE=/var/www/codeenclair
SECRETS=/etc/codeenclair-comptes.env
DEPOT=https://github.com/ways-ci/code-en-clair.git

[ "$(id -u)" = 0 ] || { echo "À lancer en root."; exit 1; }
for outil in curl unzip git nginx sha256sum; do command -v $outil >/dev/null || { echo "Il manque : $outil (apt install $outil)"; exit 1; }; done

# Le port ne doit servir à rien d'autre (sauf à nous-mêmes, lors d'une mise à jour)
if ss -ltn | grep -q "127.0.0.1:$PORT " && ! systemctl is-active --quiet codeenclair-comptes; then
  echo "Le port $PORT est déjà pris par un autre programme : change PORT en tête du script."; exit 1
fi

echo "== 1. PocketBase $VERSION_PB et le dépôt"
id codeenclair >/dev/null 2>&1 || useradd --system --home "$RACINE" --shell /usr/sbin/nologin codeenclair
mkdir -p "$RACINE"
TMP=$(mktemp -d)
BASE="https://github.com/pocketbase/pocketbase/releases/download/v$VERSION_PB"
ZIP="pocketbase_${VERSION_PB}_linux_amd64.zip"
curl -fsSL "$BASE/$ZIP" -o "$TMP/$ZIP"
curl -fsSL "$BASE/checksums.txt" -o "$TMP/checksums.txt"
(cd "$TMP" && grep " $ZIP\$" checksums.txt | sha256sum -c -) || { echo "Somme de contrôle fausse : rien n'est installé."; exit 1; }
unzip -oq "$TMP/$ZIP" pocketbase -d "$TMP"
install -m 755 "$TMP/pocketbase" "$RACINE/pocketbase"
if [ -d "$RACINE/depot/.git" ]; then git -C "$RACINE/depot" pull -q; else git clone -q "$DEPOT" "$RACINE/depot"; fi
rm -rf "$TMP"
mkdir -p "$RACINE/pb_data"
chown -R codeenclair: "$RACINE"

echo "== 2. Identifiants Google et GitHub"
if [ ! -f "$SECRETS" ]; then
  read -rp  "GitHub, Client ID : " GH_ID;     read -rsp "GitHub, Client secret (invisible) : " GH_SECRET; echo
  read -rp  "Google, Client ID (Entrée pour plus tard) : " GO_ID
  GO_SECRET=""; [ -n "$GO_ID" ] && { read -rsp "Google, Client secret (invisible) : " GO_SECRET; echo; }
  umask 077
  cat > "$SECRETS" <<EOF
CEC_URL=https://$DOMAINE
CEC_GITHUB_ID=$GH_ID
CEC_GITHUB_SECRET=$GH_SECRET
CEC_GOOGLE_ID=$GO_ID
CEC_GOOGLE_SECRET=$GO_SECRET
EOF
  chmod 600 "$SECRETS"
  echo "Gardés dans $SECRETS (lisible par root seulement). Pour ajouter Google plus tard : modifier ce fichier puis systemctl restart codeenclair-comptes"
else
  echo "Déjà posés dans $SECRETS : inchangés."
fi

echo "== 3. Le service"
cat > /etc/systemd/system/codeenclair-comptes.service <<EOF
[Unit]
Description=Code en clair, les comptes
After=network.target

[Service]
User=codeenclair
Group=codeenclair
EnvironmentFile=$SECRETS
ExecStart=$RACINE/pocketbase serve --http 127.0.0.1:$PORT --dir $RACINE/pb_data --migrationsDir $RACINE/depot/serveur/pb_migrations --hooksDir $RACINE/depot/serveur/pb_hooks
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$RACINE/pb_data
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q codeenclair-comptes
systemctl restart codeenclair-comptes
sleep 3
systemctl is-active --quiet codeenclair-comptes || { journalctl -u codeenclair-comptes -n 30 --no-pager; echo "Le service ne démarre pas (journal ci-dessus)."; exit 1; }

# Le compte d'administration : créé une seule fois, mot de passe affiché une seule fois
if [ ! -f "$RACINE/.admin-cree" ]; then
  MDP=$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 24)
  runuser -u codeenclair -- "$RACINE/pocketbase" superuser upsert "admin@$DOMAINE" "$MDP" --dir "$RACINE/pb_data" >/dev/null
  touch "$RACINE/.admin-cree"
  echo "Administration : admin@$DOMAINE / $MDP   <- à noter MAINTENANT, il ne sera plus affiché"
  echo "Elle ne s'ouvre que par un tunnel depuis ton PC : ssh -L $PORT:127.0.0.1:$PORT <serveur>, puis http://127.0.0.1:$PORT/_/"
fi

echo "== 4. nginx et le site"
cat > /etc/nginx/snippets/codeenclair-comptes.conf <<EOF
# Les comptes de Code en clair (PocketBase sur 127.0.0.1:$PORT)
location /api/ {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header Connection '';
    proxy_buffering off;          # la connexion Google ou GitHub attend la réponse en direct
    proxy_read_timeout 360s;
    client_max_body_size 3m;
}
# La console d'administration n'est jamais publique
location /_/ { return 404; }
EOF
CONF=$(grep -l "server_name[^;]*$DOMAINE" /etc/nginx/sites-enabled/* | head -1)
[ -n "$CONF" ] || { echo "Aucun site nginx pour $DOMAINE dans /etc/nginx/sites-enabled."; exit 1; }
if ! grep -q "codeenclair-comptes.conf" "$CONF"; then
  cp "$CONF" "$CONF.avant-comptes"
  # Une seule inclusion, dans le bloc HTTPS (celui qui écoute le 443)
  awk -v ligne="    include snippets/codeenclair-comptes.conf;" '{print} !fait && /listen[^;]*443/ {print ligne; fait=1}' "$CONF.avant-comptes" > "$CONF"
  if ! nginx -t 2>/dev/null; then cp "$CONF.avant-comptes" "$CONF"; nginx -t; echo "nginx refuse : configuration d'origine remise."; exit 1; fi
fi
nginx -t 2>/dev/null && systemctl reload nginx
(cd "$RACINE/depot" && cp index.html style.css app.js donnees.js compte.js pocketbase.umd.js confidentialite.html sw.js manifest.json icone.svg "$SITE/")

echo "== 5. Contrôle"
REPONSE=$(curl -fsS "https://$DOMAINE/api/collections/users/auth-methods" || true)
echo "$REPONSE" | grep -q '"oauth2"' && echo "OK : les comptes répondent sur https://$DOMAINE" || { echo "L'adresse publique ne répond pas comme prévu :"; echo "$REPONSE" | head -c 300; exit 1; }
CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAINE/_/")
[ "$CODE" = 404 ] && echo "OK : la console d'administration est fermée au public" || echo "ATTENTION : /_/ répond $CODE, elle devrait répondre 404"
