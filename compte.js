/* Code en clair. Le compte, facultatif : connexion par Google ou GitHub, aucun courriel envoyé.
   La progression reste d'abord dans ce navigateur ; connecté, elle part aussi vers le compte. */

// La copie personnelle (guide.ways-ci.com) n'a pas de serveur de comptes : rien n'y est demandé
const PB = window.PocketBase && location.hostname !== "guide.ways-ci.com" ? new PocketBase(location.origin) : null;
const C = {fournisseurs:[], etat:"", minuterie:0, ouvert:false};   // etat : "ok", "attente" ou "" (pas connecté)
const connecte = () => !!(PB && PB.authStore.isValid && PB.authStore.record);

/* ---------- La fusion : deux progressions se rencontrent, aucun progrès ne se perd ---------- */
function fusionner(a, b){
  a = a || {}; b = b || {};
  const union = (x, y) => [...new Set([...(x || []), ...(y || [])])];
  const r = Object.assign({}, VIDE, b, a);
  r.xp = Math.max(a.xp || 0, b.xp || 0);
  r.actifs = union(a.actifs, b.actifs).sort();
  r.mots = union(a.mots, b.mots);
  r.questions = union(a.questions, b.questions);
  r.sansFaute = !!(a.sansFaute || b.sansFaute);
  r.minutes = {};
  for (const k of union(Object.keys(a.minutes || {}), Object.keys(b.minutes || {}))) r.minutes[k] = Math.max((a.minutes || {})[k] || 0, (b.minutes || {})[k] || 0);
  r.cartes = {};
  for (const id of union(Object.keys(a.cartes || {}), Object.keys(b.cartes || {}))) {
    const x = (a.cartes || {})[id] || {}, y = (b.cartes || {})[id] || {}, c = {};
    if (x.vue || y.vue) c.vue = true;
    if (x.defi || y.defi) c.defi = true;
    // « Je sais » gagne sur « À revoir » : c'est le progrès le plus récent qu'on garde
    if (x.sait === "ok" || y.sait === "ok") c.sait = "ok"; else if (x.sait || y.sait) c.sait = x.sait || y.sait;
    if ((x.rate || y.rate) && !c.defi && c.sait !== "ok") c.rate = true;
    r.cartes[id] = c;
  }
  // La feuille de route ne se mélange pas : la plus récente l'emporte
  r.feuille = (a.maj || 0) >= (b.maj || 0) ? (a.feuille || b.feuille) : (b.feuille || a.feuille);
  r.maj = Math.max(a.maj || 0, b.maj || 0);
  return r;
}

/* ---------- Chaque sauvegarde part aussi vers le compte, quelques secondes plus tard ---------- */
const sauverLocal = sauver;
sauver = function(){
  E.maj = Date.now();
  sauverLocal();
  if (connecte()) { clearTimeout(C.minuterie); C.minuterie = setTimeout(synchroniser, 4000); }
};

let enCours = null;
function synchroniser(){
  if (!connecte()) return Promise.resolve();
  if (enCours) return enCours;
  const id = PB.authStore.record.id;
  enCours = PB.collection("users").getOne(id)
    .then(fiche => {
      const avant = JSON.stringify(E);
      E = fusionner(E, fiche.progression);
      sauverLocal();
      if (JSON.stringify(E) !== avant) redessiner();
      return PB.collection("users").update(id, {progression:E});
    })
    .then(() => { C.etat = "ok"; C.derniere = new Date(); })
    .catch(err => {
      // Le compte a été supprimé ailleurs, ou la session a expiré : on se déconnecte, la progression reste ici
      if (err && (err.status === 401 || err.status === 403 || err.status === 404)) { PB.authStore.clear(); C.etat = ""; toast("Tu as été déconnecté : ta progression reste sur cet appareil"); }
      else C.etat = "attente";
    })
    .finally(() => { enCours = null; marque(); if ($("#compte").classList.contains("on")) ecranCompte(); });
  return enCours;
}
window.addEventListener("online", () => synchroniser());

function redessiner(){ hud(); accueil(); parcours(); paquet($("#deck-q").value); }

/* ---------- Se connecter ---------- */
// Pas d'async ici : Safari bloque la fenêtre du fournisseur si elle ne s'ouvre pas dans le geste même
function connecter(fournisseur){
  PB.collection("users").authWithOAuth2({provider:fournisseur})
    .then(() => synchroniser())
    .then(() => { toast("Ta progression est sauvegardée dans ton compte"); ecranCompte(); marque(); })
    .catch(err => {
      if (!navigator.onLine) return toast("Pas de réseau : ta progression reste sur cet appareil");
      if (err && err.isAbort) return;
      toast("La connexion n'a pas abouti. Réessaie dans un instant.");
    });
}

/* ---------- L'écran Compte ---------- */
const NOMS = {google:"Google", github:"GitHub"};
const boutonsConnexion = () => C.fournisseurs.length
  ? C.fournisseurs.map(f => `<button class="btn connexion" data-connecter="${esc(f)}">${ic(f === "github" ? "github" : "google")} Continuer avec ${NOMS[f] || esc(f)}</button>`).join("")
  : `<p class="sub">La connexion n'est pas disponible pour le moment. Ta progression reste sur cet appareil.</p>`;

function ecranCompte(){
  const el = $("#compte");
  if (!connecte()) {
    el.innerHTML = `
    <div class="compte">
      <div class="tile">
        <span class="label">Ton compte</span>
        <h1 class="big">Garde ta progression</h1>
        <p class="sub" style="max-width:60ch">Connecte-toi pour retrouver tes points, ta série et ta feuille de route sur ton téléphone comme sur ton ordinateur. Sans compte, tout marche pareil : ta progression reste sur cet appareil.</p>
        <div class="connexions">${boutonsConnexion()}</div>
        <p class="sub petit">Nous gardons ton adresse, ton prénom et ta progression, rien d'autre. Aucun courriel ne t'est envoyé. <a href="confidentialite.html">Confidentialité</a></p>
      </div>
    </div>`;
    return;
  }
  const r = PB.authStore.record;
  const etat = C.etat === "attente" ? "En attente du réseau : ta progression partira dès qu'il revient"
    : C.derniere ? `Sauvegardée à ${C.derniere.toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"})}` : "Sauvegarde en cours…";
  el.innerHTML = `
  <div class="compte">
    <div class="tile">
      <span class="label">Ton compte</span>
      <h1 class="big">${r.name ? `Bonjour ${esc(r.name.split(" ")[0])}` : "Ton compte"}</h1>
      <p class="sub">Connecté avec ${esc(r.email)}</p>
      <p class="etat-sauvegarde ${C.etat === "attente" ? "attente" : ""}">${ic(C.etat === "attente" ? "cloud" : "check")} ${etat}</p>
      <div class="connexions">
        <button class="btn" data-deconnecter>Se déconnecter</button>
      </div>
      <p class="sub petit">En te déconnectant, ta progression reste sur cet appareil. <a href="confidentialite.html">Confidentialité</a></p>
    </div>
    <div class="tile danger">
      <h2 class="mid">Supprimer mon compte</h2>
      <p class="sub">Ton adresse et ta progression sont effacées de nos serveurs. Cet appareil garde sa copie.</p>
      ${C.ouvert ? `<div class="connexions"><button class="btn hot" data-supprimer>Oui, supprimer définitivement</button><button class="btn" data-annuler>Annuler</button></div>`
        : `<div class="connexions"><button class="btn" data-confirmer>Supprimer mon compte</button></div>`}
    </div>
  </div>`;
}

/* Le petit signe dans la barre du haut : connecté et sauvegardé, ou en attente */
function marque(){
  const b = $("#btn-compte"); if (!b) return;
  b.classList.toggle("on", connecte());
  b.classList.toggle("attente", connecte() && C.etat === "attente");
  b.title = connecte() ? (C.etat === "attente" ? "Compte : en attente du réseau" : "Compte : progression sauvegardée") : "Garde ta progression";
}

/* ---------- Le bandeau « Garde ta progression », sur l'accueil, après quelques cartes ---------- */
const accueilSansBandeau = accueil;
accueil = function(){
  accueilSansBandeau();
  const ferme = E.bandeau && Date.now() - E.bandeau < 7 * 86400000;
  if (connecte() || ferme || E.xp < 30 || !C.fournisseurs.length) return;
  $("#accueil").insertAdjacentHTML("afterbegin", `
  <div class="tile bandeau">
    ${ic("cloud")}
    <div style="flex:1;min-width:200px"><b>Garde ta progression</b><p class="sub">Retrouve tes points sur ton téléphone et ton ordinateur. Connexion avec Google ou GitHub, sans mot de passe.</p></div>
    <button class="btn go sm" data-go-compte>Me connecter</button>
    <button class="qdel" data-fermer-bandeau aria-label="Plus tard">${ic("x")}</button>
  </div>`);
};

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-go-compte],[data-connecter],[data-deconnecter],[data-confirmer],[data-annuler],[data-supprimer],[data-fermer-bandeau]");
  if (!t) return;
  const d = t.dataset;
  if (d.goCompte !== undefined) { C.ouvert = false; ecranCompte(); return aller("compte"); }
  if (d.connecter) return connecter(d.connecter);
  if (d.fermerBandeau !== undefined) { E.bandeau = Date.now(); sauver(); return accueil(); }
  if (d.deconnecter !== undefined) { PB.authStore.clear(); C.etat = ""; marque(); ecranCompte(); return toast("Déconnecté : ta progression reste sur cet appareil"); }
  if (d.confirmer !== undefined) { C.ouvert = true; return ecranCompte(); }
  if (d.annuler !== undefined) { C.ouvert = false; return ecranCompte(); }
  if (d.supprimer !== undefined) {
    t.disabled = true;
    PB.collection("users").delete(PB.authStore.record.id)
      .then(() => { PB.authStore.clear(); C.ouvert = false; C.etat = ""; marque(); ecranCompte(); toast("Ton compte est supprimé"); })
      .catch(() => { t.disabled = false; toast(navigator.onLine ? "La suppression n'a pas abouti. Réessaie." : "Pas de réseau : réessaie quand il revient"); });
  }
});

/* ---------- Au démarrage ---------- */
// Le bouton Compte n'apparaît que là où un serveur de comptes répond (ou si l'on est déjà connecté, même hors ligne)
if (PB) {
  if (connecte()) { $("#btn-compte").hidden = false; marque(); }
  PB.collection("users").listAuthMethods()
    .then(m => {
      C.fournisseurs = ((m.oauth2 && m.oauth2.enabled && m.oauth2.providers) || []).map(p => p.name).filter(n => NOMS[n]);
      if (C.fournisseurs.length || connecte()) $("#btn-compte").hidden = false;
      if ($("#accueil").classList.contains("on")) accueil();
    })
    .catch(() => {});
  // Prolonge la session si possible ; dans tous les cas la synchronisation part (elle sait déconnecter un compte disparu)
  if (connecte()) PB.collection("users").authRefresh().catch(() => {}).then(() => synchroniser());
}
