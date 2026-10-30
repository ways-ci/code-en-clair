/// <reference path="../pb_data/types.d.ts" />
/* Au démarrage, Google et GitHub se posent depuis les variables du serveur : les secrets ne sont jamais dans le dépôt.
   CEC_URL, CEC_GOOGLE_ID, CEC_GOOGLE_SECRET, CEC_GITHUB_ID, CEC_GITHUB_SECRET */
onBootstrap((e) => {
  e.next()

  const c = e.app.findCollectionByNameOrId("users")
  const fournisseurs = []
  for (const [nom, cle] of [["google", "GOOGLE"], ["github", "GITHUB"]]) {
    const id = $os.getenv("CEC_" + cle + "_ID"), secret = $os.getenv("CEC_" + cle + "_SECRET")
    if (id && secret) fournisseurs.push({ name: nom, clientId: id, clientSecret: secret })
  }
  c.oauth2.providers = fournisseurs
  e.app.save(c)

  const url = $os.getenv("CEC_URL")
  if (url) {
    const s = e.app.settings()
    s.meta.appURL = url
    e.app.save(s)
  }
  console.log("Code en clair : " + fournisseurs.length + " fournisseur(s) de connexion")
})
