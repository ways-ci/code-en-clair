#!/usr/bin/env bash
# Met en ligne Code en clair sur https://codeenclair.ways-ci.com (serveur de WAYS).
# Avant : changer la même version dans index.html (?v=) et dans sw.js (VERSION), pour que les navigateurs rechargent.
set -e
scp -i ~/.ssh/id_ed25519_ways index.html style.css app.js donnees.js sw.js manifest.json icone.svg root@72.62.29.132:/var/www/codeenclair/
echo "OK : https://codeenclair.ways-ci.com"
