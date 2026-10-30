/* Code en clair. La fenêtre de connexion revient ici (adresse imposée par le serveur des comptes) :
   on dit si c'est réussi, puis on la ferme. Le site principal, lui, a déjà reçu la connexion. */
if (location.hash.includes("failure")) {
  document.getElementById("titre").textContent = "La connexion n'a pas abouti";
  document.getElementById("texte").textContent = "Ferme cette fenêtre et réessaie depuis Code en clair.";
}
setTimeout(() => window.close(), 1500);
