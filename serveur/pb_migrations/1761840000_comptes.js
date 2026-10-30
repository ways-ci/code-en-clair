/// <reference path="../pb_data/types.d.ts" />
/* Les comptes de Code en clair : connexion par Google ou GitHub seulement, aucun courriel envoyé.
   Chaque apprenant ne voit et ne change que son propre compte ; la progression est un seul bloc. */
migrate((app) => {
  const c = app.findCollectionByNameOrId("users")

  // Pas de mot de passe, pas de code par courriel : seulement Google et GitHub (les fournisseurs se posent au démarrage)
  c.passwordAuth.enabled = false
  c.otp.enabled = false
  c.mfa.enabled = false
  c.oauth2.enabled = true
  c.oauth2.mappedFields.name = "name"
  c.oauth2.mappedFields.avatarURL = ""

  // Ni photo, ni rien d'autre : l'adresse, un prénom facultatif et la progression
  c.fields.removeByName("avatar")
  c.fields.add(new JSONField({ name: "progression", maxSize: 2000000 }))

  // Un compte ne naît que d'une connexion Google ou GitHub, jamais d'un envoi direct
  c.createRule = '@request.context = "oauth2"'
  c.listRule = "id = @request.auth.id"
  c.viewRule = "id = @request.auth.id"
  // L'apprenant change son prénom et sa progression, jamais son adresse ni son état vérifié
  c.updateRule = "id = @request.auth.id && @request.body.email:isset = false && @request.body.verified:isset = false && @request.body.emailVisibility:isset = false && @request.body.password:isset = false"
  c.deleteRule = "id = @request.auth.id"
  c.authRule = ""
  c.manageRule = null
  app.save(c)

  // Derrière nginx : la vraie adresse du visiteur, pour la limite d'essais
  const s = app.settings()
  s.meta.appName = "Code en clair"
  s.rateLimits.enabled = true
  s.trustedProxy.headers = ["X-Real-IP"]
  app.save(s)
}, (app) => {
  const c = app.findCollectionByNameOrId("users")
  c.fields.removeByName("progression")
  app.save(c)
})
