/* Code en clair. Le moteur de l'outil : points, série de jours, défis, recherche.
   Le contenu vit dans donnees.js. La progression est gardée dans ce navigateur. */

const D = window.DONNEES;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 .+]/g, " ");
const ic = (id, cls = "") => `<svg class="${cls}"><use href="#i-${id}"/></svg>`;
const CARTE = Object.fromEntries(D.cartes.map(c => [c.id, c]));
const MONDE = Object.fromEntries(D.mondes.map(m => [m.id, m]));
const COUL = {terminal:"green", git:"orange", github:"violet", vscode:"blue", linux:"green", web:"orange", typescript:"blue", react:"violet", php:"violet", python:"blue", sql:"violet", ia:"green", azure:"blue"};
/* La couleur d'un monde vient de COUL : une seule table, pour les tuiles, les bandeaux et les cartes */
const fondMonde = id => { const c = COUL[id] || "violet"; return `background:var(--${c});box-shadow:0 5px 0 var(--${c}-d)`; };
/* Les mondes où l'on écrit du code dans un fichier, et non une commande dans le terminal */
const MONDES_CODE = ["web","typescript","react","php","python","sql","ia"];
/* Le niveau d'une étape : troisième élément de [nom, [cartes], niveau] dans donnees.js */
const NIVEAU = {1:"Découvrir", 2:"Pratiquer", 3:"Maîtriser"};
const badgeNiveau = n => `<span class="niv niv${n || 1}">Niveau ${n || 1} · ${NIVEAU[n || 1]}</span>`;
const estCode = c => MONDES_CODE.includes(c.monde) || c.code === true;
const NIVEAUX = ["Débutant","Apprenti","Bricoleur","Artisan","Codeur","Bâtisseur","Développeur"];
const PAR_NIVEAU = 200;

/* ---------- Mémoire du navigateur ---------- */
const VIDE = {xp:0, actifs:[], minutes:{}, cartes:{}, mots:[], questions:[], sansFaute:false};
let E;
try { E = Object.assign({}, VIDE, JSON.parse(localStorage.getItem("mc-etat") || "{}")); } catch (e) { E = Object.assign({}, VIDE); }
function sauver(){ try { localStorage.setItem("mc-etat", JSON.stringify(E)); } catch (e) {} }
const jour = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const etatCarte = id => E.cartes[id] || (E.cartes[id] = {});

/* ---------- Progression ---------- */
const etoiles = id => { const c = E.cartes[id] || {}; return (c.vue?1:0) + (c.defi?1:0) + (c.sait==="ok"?1:0); };
const acquise = id => etoiles(id) >= 2;
const aRevoir = id => { const c = E.cartes[id] || {}; return c.sait === "ko" || (c.rate && !c.defi); };
function serie(){
  const set = new Set(E.actifs); let n = 0; const d = new Date();
  if (!set.has(jour(d))) d.setDate(d.getDate() - 1);
  while (set.has(jour(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function gagner(n, msg){
  E.xp += n;
  if (!E.actifs.includes(jour())) E.actifs.push(jour());
  sauver(); hud();
  const p = $("#pop"); p.textContent = "+" + n; p.classList.remove("show"); void p.offsetWidth; p.classList.add("show");
  if (msg) toast(msg);
}
const cartesDe = mondeId => D.cartes.filter(c => c.monde === mondeId);
/* La feuille de route : les mondes choisis, dans l'ordre choisi */
if (!E.feuille && E.xp > 0) { E.feuille = D.modeles[0].mondes.slice(); sauver(); }
const choisis = () => (E.feuille || []).map(id => MONDE[id]).filter(Boolean);
const ouvert = m => (E.feuille || []).includes(m.id);
function etapeCourante(){
  for (const m of choisis()) for (let i = 0; i < m.etapes.length; i++) if (m.etapes[i][1].some(id => !acquise(id))) return {m, e:m.etapes[i], i};
  return null;
}
function cartesOuvertes(){ return choisis().flatMap(m => cartesDe(m.id).map(c => c.id)); }

/* ---------- Barre du haut ---------- */
function hud(){
  const lvl = Math.floor(E.xp / PAR_NIVEAU), dedans = E.xp % PAR_NIVEAU;
  $("#hud-lvl").textContent = lvl + 1;
  $("#hud-lvl-name").textContent = NIVEAUX[Math.min(lvl, NIVEAUX.length - 1)];
  $("#hud-xp").textContent = `${dedans} / ${PAR_NIVEAU} points`;
  $("#hud-bar").style.width = (dedans / PAR_NIVEAU * 100) + "%";
  $("#hud-streak").textContent = serie();
}
let tt; function toast(m){ const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2000); }
function parler(mot){
  try { const u = new SpeechSynthesisUtterance(mot); u.lang = "en-US"; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  catch (e) { toast("La voix n'est pas disponible sur cet appareil."); }
}

/* ---------- Navigation ---------- */
function aller(id){
  document.querySelectorAll(".screen").forEach(s => s.classList.toggle("on", s.id === id));
  const onglet = {fiche:"mondes"}[id] || id;
  document.querySelectorAll(".tab").forEach(b => b.dataset.go === onglet ? b.setAttribute("aria-current","page") : b.removeAttribute("aria-current"));
  window.scrollTo({top:0});
}

/* ---------- Accueil ---------- */
function depart(){
  $("#accueil").innerHTML = `
  <div class="tile mission" style="margin-bottom:18px">
    <span class="deco">&gt;_</span>
    <span class="label">Bienvenue</span>
    <h1 class="big" style="max-width:none">Par quoi veux-tu commencer ?</h1>
    <p class="hello" style="max-width:60ch">Les commandes restent en anglais, tout le reste est en français. Choisis un chemin : tu pourras changer l'ordre quand tu veux.</p>
  </div>
  <div class="trio">${D.modeles.map(md => `
    <button class="tile card" data-modele="${md.id}" style="min-height:220px">
      <span class="mid">${esc(md.nom)}</span><span class="sub">${esc(md.desc)}</span>
      <div class="flow" style="margin-top:6px">${md.mondes.slice(0, 5).map((id, i) => `${i ? ic("arrow") : ""}<span class="tag">${esc(MONDE[id].nom)}</span>`).join("")}</div>
      <span class="btn go sm" style="margin-top:auto;align-self:flex-start">Choisir ce chemin</span>
    </button>`).join("")}
  </div>
  <div style="margin-top:18px"><button class="btn" data-go="parcours">${ic("road")} Composer mon propre ordre</button></div>`;
}

function accueil(){
  if (!E.feuille) return depart();
  const ec = etapeCourante();
  const col = ec ? (COUL[ec.m.id] || "green") : "green";
  const date = new Intl.DateTimeFormat("fr-FR", {weekday:"long", day:"numeric", month:"long"}).format(new Date());
  const min = E.minutes[jour()] || 0, s7 = serie();
  const lundi = new Date(); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  const semaine = ["L","M","M","J","V","S","D"].map((l, i) => { const d = new Date(lundi); d.setDate(lundi.getDate() + i); const k = jour(d); return `<div class="${E.actifs.includes(k)?"on":""} ${k===jour()?"today":""}">${l}<span></span></div>`; }).join("");
  const anneau = 132 - Math.min(1, min / 30) * 132;
  const badges = [
    ["term","Premier pas", D.cartes.some(c => (E.cartes[c.id]||{}).defi)],
    ["flame","3 jours", s7 >= 3],
    ["heart","Sans faute", E.sansFaute],
    ["cards","20 mots", E.mots.length >= 20],
    ["git","Maître Git", cartesDe("git").every(c => etoiles(c.id) === 3)]
  ];
  const revoir = D.cartes.filter(c => aRevoir(c.id)).slice(0, 4);
  const prochaine = ec && (ec.e[1].find(id => !acquise(id)) || ec.e[1][0]);
  const mission = ec ? `
    <div class="tile mission" style="background:var(--${col});border-color:var(--${col}-d);box-shadow:0 5px 0 var(--${col}-d)">
      <span class="deco">&gt;_</span>
      <span class="label">${date} · ${esc(ec.m.nom)} · 30 min</span>
      <h1 class="big">${esc(ec.e[0])}</h1>
      <div class="chips-cmd">${ec.e[1].map(id => `<code>${esc(CARTE[id].cmd)}</code>`).join("")}</div>
      <div class="seg">${ec.m.etapes.map(e => `<i class="${e[1].every(acquise) ? "on" : ""}"></i>`).join("")}</div>
      <span style="font-weight:700;display:flex;gap:10px;align-items:center;flex-wrap:wrap">Étape ${ec.i + 1} sur ${ec.m.etapes.length} du monde ${esc(ec.m.nom)} ${badgeNiveau(ec.e[2])}</span>
      <div class="row2">
        <button class="btn" style="color:var(--${col}-d);box-shadow:0 4px 0 var(--${col}-d)" data-fiche="${prochaine}">${E.xp ? "Continuer" : "Commencer"} ${ic("arrow")}</button>
        <button class="btn ghostw" style="box-shadow:0 4px 0 var(--${col}-d)" data-defi="etape">${ic("bolt")} Défi de l'étape</button>
      </div>
    </div>` : `
    <div class="tile mission">
      <span class="deco">&gt;_</span>
      <span class="label">${date}</span>
      <h1 class="big">Toutes tes cartes sont acquises</h1>
      <p class="hello">Les prochains mondes arrivent. En attendant, garde la main avec un défi de révision.</p>
      <div class="row2"><button class="btn" data-defi="revision">${ic("bolt")} Défi de révision</button><button class="btn ghostw" data-go="parcours">Ma feuille de route</button></div>
    </div>`;

  $("#accueil").innerHTML = `
  <div class="home">
    ${mission}
    <div class="tile ask">
      <span class="label">Que veux-tu faire ?</span>
      <form data-search><svg><use href="#i-search"/></svg><input name="q" type="search" autocomplete="off" placeholder="Écris en français…" aria-label="Que veux-tu faire ?"></form>
      <div class="qchips">
        ${["enregistrer mon travail","savoir où je suis","créer un dossier","envoyer sur GitHub","annuler mon dernier commit","voir ce qui a changé"].map(q => `<button class="qchip" data-q="${q}">${q}</button>`).join("")}
      </div>
    </div>

    <div class="tile streak">
      <div class="flame"><svg style="color:${s7 ? "var(--orange)" : "var(--grey)"}"><use href="#i-flame"/></svg><div><div class="mid">${s7 ? `${s7} jour${s7 > 1 ? "s" : ""} d'affilée` : "Ta série commence aujourd'hui"}</div><p class="sub">${s7 ? "Reviens demain pour la prolonger." : "Gagne tes premiers points pour l'allumer."}</p></div></div>
      <div class="week">${semaine}</div>
      <div class="ring">
        <svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="21" fill="none" stroke="var(--line)" stroke-width="7"/><circle cx="26" cy="26" r="21" fill="none" stroke="var(--green)" stroke-width="7" stroke-linecap="round" stroke-dasharray="132" stroke-dashoffset="${anneau}" transform="rotate(-90 26 26)"/></svg>
        <div><b>${min} min sur 30</b><p class="sub">objectif du jour</p></div>
      </div>
    </div>
  </div>

  <div class="row-head"><h2 class="mid">Ta feuille de route</h2><button class="btn sm" data-go="parcours">${ic("road")} Changer l'ordre</button></div>
  <div class="worlds">${choisis().map(m => carteMonde(m)).join("")}</div>

  <div class="trio" style="margin-top:22px">
    <div class="tile">
      <div class="row-head" style="margin:0 0 6px"><h3 class="mid">À revoir</h3><span class="sub">${revoir.length ? "touche pour revoir" : ""}</span></div>
      ${revoir.length ? revoir.map(c => `<div class="mini"><span class="tag">${esc(c.cmd)}</span><span class="sub" style="flex:1">${esc(c.sert)}</span><button class="btn sm" data-fiche="${c.id}">Revoir</button></div>`).join("")
        : `<p class="sub">Rien à revoir. Une carte arrive ici quand tu la marques « À revoir » ou quand un défi te résiste.</p>`}
    </div>
    <div class="tile">
      <div class="row-head" style="margin:0 0 12px"><h3 class="mid">Tes badges</h3><span class="sub">${badges.filter(b => b[2]).length} sur ${badges.length}</span></div>
      <div class="badges">${badges.map(b => `<div><div class="medal ${b[2] ? "" : "off"}"><svg><use href="#i-${b[0]}"/></svg></div>${b[1]}</div>`).join("")}</div>
    </div>
    <div class="tile">
      <div class="row-head" style="margin:0 0 6px"><h3 class="mid">Tes questions</h3>${E.questions.length ? `<button class="btn sm" data-envoyer>${ic("share")} Envoyer à l'équipe</button>` : ""}</div>
      ${E.questions.length ? E.questions.map((q, i) => `<div class="mini">${ic("chat")}<span style="flex:1;font-weight:600">${esc(q)}</span><button class="qdel" data-qdel="${i}" aria-label="Retirer cette question">${ic("x")}</button></div>`).join("")
        : `<p class="sub">Une question sans carte s'ajoute ici. Envoie-les à l'équipe : elle en fait des cartes.</p>`}
    </div>
  </div>`;
}

function carteMonde(m){
  const l = cartesDe(m.id);
  if (!l.length) return `<div class="world locked" aria-disabled="true"><div class="wi">${ic(m.icone)}</div><h3>${esc(m.nom)}</h3><p class="sub" style="color:oklch(1 0 0 / .9)">${esc(m.desc)}</p><div class="lockline">${ic("lock")} Bientôt : les cartes arrivent</div></div>`;
  const ok = l.filter(c => acquise(c.id)).length;
  return `<button class="world" style="${fondMonde(m.id)}" data-world="${m.id}"><div class="wi">${ic(m.icone)}</div><h3>${esc(m.nom)}</h3><p class="sub">${esc(m.desc)}</p><p style="font-weight:800">${ok} sur ${l.length} cartes</p><div class="xpbar"><i style="width:${Math.max(4, ok / l.length * 100)}%"></i></div></button>`;
}

/* ---------- Mondes et recherche ---------- */
let mondeCourant = (choisis().find(m => cartesDe(m.id).length) || MONDE.terminal).id;
function monde(id, liste, titre){
  if (!titre) mondeCourant = id;
  const m = MONDE[id];
  const cartes = liste || cartesDe(id);
  const ok = cartes.filter(c => acquise(c.id)).length;
  const tete = titre
    ? `<div class="wi">${ic("search")}</div><div><p class="label" style="color:oklch(1 0 0 / .8)">Ta recherche</p><h1 class="big">${esc(titre)}</h1></div>`
    : `<div class="wi">${ic(m.icone)}</div><div><p class="label" style="color:oklch(1 0 0 / .8)">Monde</p><h1 class="big">${m.nom}</h1><div class="xpbar" style="margin-top:8px"><i style="width:${Math.max(4, ok / cartes.length * 100)}%"></i></div></div>`;
  const h = $("#world-head");
  h.className = "world-head"; h.style.cssText = fondMonde(titre ? "vscode" : id);
  h.innerHTML = tete + `<div class="world-pick">${choisis().filter(x => cartesDe(x.id).length).map(x => `<button data-world="${x.id}" aria-pressed="${!titre && x.id === id}">${x.nom}</button>`).join("")}</div>`;
  const tuile = c => {
    const e = etoiles(c.id);
    const st = (E.cartes[c.id] || {}).sait === "ok" ? `<span class="st ok">je sais</span>` : aRevoir(c.id) ? `<span class="st ko">à revoir</span>` : e ? `<span class="st new">en cours</span>` : `<span class="st new">nouvelle</span>`;
    return `<button class="card" data-fiche="${c.id}"><span class="cmdbig">${esc(c.cmd)}</span><span style="font-weight:700">${esc(c.dit)}</span><span class="sub">${esc(c.sert)}</span><div class="state"><div class="stars">${[1,2,3].map(i => ic("star", i <= e ? "on" : "")).join("")}</div>${st}</div></button>`;
  };
  const vide = `<div class="tile empty"><div class="mid">Pas encore de carte pour ça.</div><p class="sub" style="margin-top:6px">Ta question est gardée sur l'accueil. Envoie-la à l'équipe : elle en fera une carte.</p><button class="btn go" style="margin-top:16px" data-go="accueil">Retour à l'accueil</button></div>`;
  const zone = $("#cards");
  if (!titre && m.etapes.length) {
    zone.className = "";
    zone.innerHTML = m.etapes.map((et, i) => {
      const fait = et[1].filter(acquise).length;
      return `<section class="etape"><div class="row-head" style="margin:22px 2px 12px"><h2 class="mid">Étape ${i + 1} · ${esc(et[0])}</h2><span style="display:flex;gap:10px;align-items:center">${badgeNiveau(et[2])}<span class="sub">${fait} sur ${et[1].length}</span></span></div>
        <div class="cards">${et[1].map(id => tuile(CARTE[id])).join("")}</div></section>`;
    }).join("");
  } else {
    zone.className = "cards";
    zone.innerHTML = cartes.length ? cartes.map(tuile).join("") : vide;
  }
  aller("mondes");
}
const VIDES = ["mon","mes","les","des","une","sur","dans","qui","que","est","pour","faire","veux","comment","avec","son","ses","the"];
function chercher(q){
  const mots = norm(q).split(/\s+/).filter(w => w.length > 2 && !VIDES.includes(w));
  const res = D.cartes.map(c => {
    const texte = norm([c.cherche, c.cmd, c.sert, c.dit, c.en].join(" "));
    return [c, mots.filter(w => texte.includes(w) || (w.length > 4 && texte.includes(w.slice(0, -1)))).length];
  }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  /* On ne garde que les cartes qui répondent le mieux, pour ne pas noyer la bonne */
  const meilleur = res.length ? res[0][1] : 0;
  const garde = res.filter(x => x[1] === meilleur).map(x => x[0]);
  if (!garde.length && q && !E.questions.includes(q)) { E.questions.unshift(q); sauver(); }
  monde(mondeCourant, garde.slice(0, 12), `« ${q} »`);
}

/* ---------- Carte d'une commande ---------- */
function carte(id){
  const c = CARTE[id], col = COUL[c.monde], e = etatCarte(id);
  if (!e.vue) { e.vue = true; gagner(1); }
  const t = [];
  t.push(`<div class="tile span2" ${c.boutons || c.touches ? "" : `style="grid-column:1/-1"`}><span class="label">${ic("bulb")}À quoi ça sert</span><p class="say-big">${esc(c.sert)}</p>${c.quand ? `<p class="quand">${esc(c.quand)}</p>` : ""}
    ${c.flux ? `<div class="flow">${c.flux.map((f, i) => `${i ? ic("arrow") : ""}<button class="tag ${f === id ? "here" : ""}" data-fiche="${f}" style="border:0">${esc(CARTE[f].cmd)}</button>`).join("")}</div>` : ""}</div>`);
  if (c.boutons || c.touches) t.push(`<div class="tile"><span class="label">${ic("mouse")}${c.boutons ? "Avec les boutons" : "Au clavier"}</span>
    ${c.touches ? `<p>${c.touches.map(k => `<span class="kbd">${esc(k)}</span>`).join(" + ")}</p>` : ""}${c.boutons ? `<p style="font-weight:600">${esc(c.boutons)}</p>` : ""}</div>`);
  const raccourci = /^(Ctrl|Tab)/.test(c.cmd);
  if (c.lignes) t.push(`<div class="tile span2"><span class="label">${ic(raccourci ? "mouse" : estCode(c) ? "code" : "term")}${raccourci ? "Le raccourci" : estCode(c) ? "Écris-le" : "Tape-la"}</span>
    <div class="term">${c.lignes.map(l => raccourci
      ? `<div class="tline"><code>${l[0].split(" + ").map(k => `<span class="kbd" style="background:transparent;color:inherit">${esc(k)}</span>`).join(" + ")}<small>${esc(l[1])}</small></code></div>`
      : `<div class="tline">${estCode(c) ? "" : `<span class="p">$</span>`}<code>${esc(l[0])}<small>${esc(l[1])}</small></code><button class="copy" data-copy="${esc(l[0])}">Copier</button></div>`).join("")}</div></div>`);
  if (c.reponse) t.push(`<div class="tile"><span class="label">${ic("chat")}${estCode(c) ? "Ce que tu vois" : "Le terminal te répond"}</span>
    <div class="trad">${c.reponse.map(r => `<div><code>${esc(r[0])}</code><span>${esc(r[1])}</span></div>`).join("")}</div></div>`);
  if (c.pieges) t.push(`<div class="tile span2"><span class="label">${ic("warn")}Les pièges</span>
    ${c.pieges.map(p => `<details class="trap"><summary>${ic("arrow")}<code>${esc(p[0])}</code></summary><p>${esc(p[1])}</p></details>`).join("")}</div>`);
  if (c.mots) t.push(`<div class="tile"><span class="label">${ic("cards")}Les mots de la carte</span>
    <div class="words">${c.mots.map(w => { const l = D.lexique.find(x => x.en === w); return l ? `<button class="word" data-speak="${esc(w)}">${esc(w)}<small>${esc(l.fr)}</small></button>` : ""; }).join("")}</div><p class="sub">Touche un mot pour l'écouter.</p></div>`);

  $("#fiche").innerHTML = `<div class="fiche">
    <div class="tile hero" style="background:var(--${col});box-shadow:0 5px 0 var(--${col}-d)">
      <span class="label">${MONDE[c.monde].nom}</span>
      <div class="cmdhuge">${esc(c.cmd)}</div>
      <div class="say">${esc(c.dit)}</div>
      <button class="speak" data-speak="${esc(c.en)}">${ic("sound")}<span>Écouter<small>${esc(c.en)}</small></span></button>
      <div class="two">
        <button class="btn light ${e.sait === "ok" ? "sel-ok" : ""}" data-sait="ok" data-k="${id}">Je sais</button>
        <button class="btn light ${e.sait === "ko" ? "sel-ko" : ""}" data-sait="ko" data-k="${id}">À revoir</button>
      </div>
      <button class="btn hot" data-defi="carte" data-k="${id}">${ic("bolt")} Relever le défi · +15</button>
      <div class="stars" style="justify-content:center">${[1,2,3].map(i => ic("star", i <= etoiles(id) ? "on" : "")).join("")}</div>
      ${/^https:\/\//.test(c.doc || "") ? `<a class="doc-off" href="${esc(c.doc)}" target="_blank" rel="noopener noreferrer">${ic("book")} La documentation officielle<small>${esc(new URL(c.doc).hostname)}</small></a>` : ""}
      ${/^https:\/\//.test(c.docFr || "") ? `<a class="doc-off" href="${esc(c.docFr)}" target="_blank" rel="noopener noreferrer">${ic("book")} En français<small>${esc(new URL(c.docFr).hostname)}</small></a>` : ""}
    </div>
    <div class="gridf">${t.join("")}</div>
  </div>`;
  aller("fiche");
}

/* ---------- Défis ---------- */
const melanger = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function qChoix(c){
  const autres = melanger(D.cartes.filter(x => x.id !== c.id && x.monde === c.monde)).slice(0, 3);
  while (autres.length < 3) autres.push(melanger(D.cartes.filter(x => x.id !== c.id && !autres.includes(x)))[0]);
  return {type:"choix", carte:c.id, q:`${estCode(c) ? "Quel code" : "Quelle commande"} sert à : ${c.sert.charAt(0).toLowerCase() + c.sert.slice(1)}`, opts:melanger([c.cmd, ...autres.map(x => x.cmd)]), ok:c.cmd, why:`${c.cmd} : ${c.dit}.`};
}
function qMot(c){
  const w = (c.mots || [])[0]; const l = w && D.lexique.find(x => x.en === w); if (!l) return null;
  const faux = melanger(D.lexique.filter(x => x.en !== w)).slice(0, 3).map(x => x.fr);
  return {type:"choix", carte:c.id, q:`« ${l.en} » (se dit ${l.pr}) veut dire…`, opts:melanger([l.fr, ...faux]), ok:l.fr, why:`${l.en} : ${l.def}`, mot:l.en};
}
function qTaper(c){ return c.defi ? {type:"taper", carte:c.id, q:c.defi.consigne, d:c.defi} : qChoix(c); }
let J = null;
function lancerDefi(ids, n = 6){
  let pool = melanger(ids);
  const prio = pool.filter(id => !acquise(id) || aRevoir(id));
  pool = [...new Set([...prio, ...pool])];
  const qs = [];
  for (let i = 0; qs.length < n && i < pool.length * 2; i++) {
    const c = CARTE[pool[i % pool.length]];
    const r = Math.random();
    const q = i >= pool.length ? (qMot(c) || qChoix(c)) : r < .55 ? qTaper(c) : r < .85 ? qChoix(c) : (qMot(c) || qChoix(c));
    qs.push(q);
  }
  J = {qs, i:0, coeurs:3, gagne:0, repondu:false};
  dessinerDefi(); aller("defis");
}
function dessinerDefi(){
  if (!J) { $("#defis").innerHTML = `<div class="tile end"><span class="label">Défis</span><h1 class="big" style="margin-top:6px">Prêt pour un défi ?</h1><p class="sub" style="margin-top:8px">Six questions sur tes cartes ouvertes. Trois cœurs.</p><button class="btn go" style="margin-top:20px" data-defi="libre">${ic("bolt")} Lancer</button></div>`; return; }
  if (J.i >= J.qs.length || J.coeurs === 0) {
    const fini = J.coeurs > 0, et = J.coeurs === 3 ? 3 : J.coeurs === 2 ? 2 : J.coeurs ? 1 : 0;
    if (fini && J.coeurs === 3 && J.qs.length >= 4 && !E.sansFaute) { E.sansFaute = true; sauver(); toast("Badge débloqué : Sans faute"); }
    $("#defis").innerHTML = `<div class="tile end"><span class="label">${fini ? "Défi terminé" : "Plus de cœurs"}</span>
      <h1 class="big" style="margin-top:6px">${fini ? `Bravo, ${J.gagne} points gagnés` : `${J.gagne} points gagnés, on recommence ?`}</h1>
      <div class="bigstars">${[1,2,3].map(i => ic("star", i <= et ? "" : "off")).join("")}</div>
      <p class="sub">${fini ? (et === 3 ? "Sans faute." : "Refais-le pour viser les trois étoiles.") : "Les cartes ratées t'attendent dans « À revoir »."}</p>
      <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap"><button class="btn" data-defi="libre">Nouveau défi</button><button class="btn go" data-go="accueil">Retour à l'accueil</button></div></div>`;
    J = null; return;
  }
  const q = J.qs[J.i]; J.repondu = false;
  const zone = q.type === "choix"
    ? `<div class="choices">${q.opts.map(o => `<button class="choice" data-choix="${esc(o)}">${esc(o)}</button>`).join("")}</div>`
    : `<div class="typebox"><pre id="tb"><span class="c">${estCode(CARTE[q.carte]) ? "// Éditeur d'entraînement : rien n'est exécuté, on vérifie." : "# Terminal d'entraînement : rien n'est exécuté, on vérifie."}</span></pre><form id="tbf"><span class="p">${estCode(CARTE[q.carte]) ? "›" : "$"}</span><input id="tbi" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="tape ta réponse, puis Entrée" aria-label="Ta réponse"></form></div>`;
  $("#defis").innerHTML = `<div class="game"><div>
    <div class="gbar"><div class="xpbar"><i style="width:${J.i / J.qs.length * 100}%"></i></div><div class="hearts">${[1,2,3].map(i => ic("heart", i > J.coeurs ? "lost" : "")).join("")}</div></div>
    <span class="label">Défi ${J.i + 1} sur ${J.qs.length} · ${q.type === "choix" ? "choisis" : "tape"}</span>
    <h1 class="q">${esc(q.q)}</h1>${zone}<div class="feedback" id="fb"></div></div>
    <div class="side-g">
      <div class="tile"><span class="label">Ce défi</span><div class="mid" style="margin-top:6px" id="j-gagne">+${J.gagne} points</div><p class="sub">10 par choix juste, 15 par commande tapée juste</p></div>
      <div class="tile"><span class="label">Un mot te bloque ?</span><p style="margin:6px 0 10px;font-weight:600">Ouvrir la carte ne compte pas comme une triche.</p><button class="btn sm" data-fiche="${q.carte}">${ic("cards")} Voir la carte</button></div>
    </div></div>`;
  if (q.type === "taper") { const i = $("#tbi"); i.focus({preventScroll:true}); $("#tbf").addEventListener("submit", ev => { ev.preventDefault(); verifierTape(i.value); }); }
}
function verdict(ok, texte, points){
  const fb = $("#fb");
  fb.className = "feedback " + (ok ? "ok" : "ko");
  fb.innerHTML = `${ic(ok ? "check" : "x")}<div><b>${ok ? "Juste !" : "Pas tout à fait"}</b><p>${esc(texte)}</p></div>${ok ? `<button class="btn go" data-suivant>Continuer</button>` : ""}`;
  fb.querySelector("svg").style.cssText = "width:34px;height:34px;flex:none";
  const q = J.qs[J.i], e = etatCarte(q.carte);
  if (ok) { J.repondu = true; J.gagne += points; e.defi = true; const jg = $("#j-gagne"); if (jg) jg.textContent = `+${J.gagne} points`; if (q.mot && !E.mots.includes(q.mot)) E.mots.push(q.mot); gagner(points); fb.querySelector("[data-suivant]").focus({preventScroll:true}); }
  else {
    e.rate = true; sauver();
    J.coeurs = Math.max(0, J.coeurs - 1);
    document.querySelectorAll(".hearts svg").forEach((h, i) => h.classList.toggle("lost", i >= J.coeurs));
    if (J.coeurs === 0) { fb.innerHTML += `<button class="btn" data-suivant>Voir le bilan</button>`; }
  }
}
function verifierTape(v){
  if (J.repondu) return;
  v = v.trim().replace(/\s+/g, " "); if (!v) return;
  const q = J.qs[J.i], d = q.d, tb = $("#tb"), fl = d.flags || "";
  tb.innerHTML += `\n<span class="p">${estCode(CARTE[q.carte]) ? "›" : "$"} </span>${esc(v)}`;
  if (d.ok.some(r => new RegExp(r, fl).test(v))) verdict(true, "Refais-la maintenant dans ton vrai terminal.", 15);
  else {
    const f = (d.fautes || []).find(r => new RegExp(r[0], fl).test(v));
    verdict(false, f ? f[1] : "Ce n'est pas la réponse attendue. Relis la consigne, ou ouvre la carte.");
  }
  $("#tbi").value = "";
}

/* ---------- Cartes-mots ---------- */
function paquet(q = ""){
  const n = norm(q);
  $("#deck").innerHTML = D.lexique.filter(l => !n || norm(l.en + " " + l.fr).includes(n)).map(l => `
    <div class="flip ${E.mots.includes(l.en) ? "" : ""}" role="button" tabindex="0" data-flip="${esc(l.en)}" aria-label="Retourner la carte ${esc(l.en)}"><div class="flip-in">
      <div class="face front"><b>${esc(l.en)}</b><span class="pr">se dit ${esc(l.pr)}</span><span class="hint2">${E.mots.includes(l.en) ? "Déjà vue · touche pour revoir" : "Touche pour voir en français · +2"}</span></div>
      <div class="face back"><span class="label" style="color:oklch(1 0 0 / .8)">${esc(l.en)}</span><b>${esc(l.fr)}</b><p>${esc(l.def)}</p></div>
    </div><button class="say-btn" data-speak="${esc(l.en)}" aria-label="Écouter ${esc(l.en)}">${ic("sound")}</button></div>`).join("") || `<p class="sub">Ce mot n'est pas encore dans tes cartes. Envoie-le à l'équipe.</p>`;
}

/* ---------- Parcours ---------- */
function parcours(){
  const f = E.feuille || D.modeles[0].mondes.slice();
  const dans = f.map(id => MONDE[id]).filter(Boolean);
  const hors = D.mondes.filter(m => !f.includes(m.id));
  const ligne = (m, i, inclus) => {
    const l = cartesDe(m.id), ok = l.filter(c => acquise(c.id)).length;
    return `<div class="mini" style="padding:12px 0">
      <span class="num" style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font:800 15px var(--mono);background:${inclus ? `var(--${COUL[m.id] || "violet"})` : "var(--bg)"};color:${inclus ? "#fff" : "var(--muted)"};flex:none">${inclus ? i + 1 : "+"}</span>
      <div style="flex:1;min-width:0"><b>${esc(m.nom)}</b><p class="sub">${esc(m.desc)} · ${l.length ? `${ok} sur ${l.length} cartes` : "bientôt"}</p></div>
      ${inclus ? `
        <button class="qdel" data-monter="${m.id}" aria-label="Monter ${esc(m.nom)}" ${i === 0 ? "disabled" : ""}><svg style="transform:rotate(-90deg)"><use href="#i-arrow"/></svg></button>
        <button class="qdel" data-descendre="${m.id}" aria-label="Descendre ${esc(m.nom)}" ${i === dans.length - 1 ? "disabled" : ""}><svg style="transform:rotate(90deg)"><use href="#i-arrow"/></svg></button>
        <button class="btn sm" data-retirer="${m.id}">Retirer</button>`
      : `<button class="btn sm go" data-ajouter="${m.id}">Ajouter</button>`}
    </div>`;
  };
  $("#parcours").innerHTML = `
    <div class="row-head" style="margin-top:0"><h1 class="big">Ma feuille de route</h1><span class="sub">Par quoi tu commences, puis dans quel ordre. Ta progression ne bouge pas.</span></div>
    <div class="tile" style="padding:22px 8px"><div class="road">${dans.map((m, i) => {
      const l = cartesDe(m.id), fini = l.length && l.every(c => acquise(c.id)), cour = etapeCourante() && etapeCourante().m.id === m.id;
      return `<div class="stop ${fini ? "done" : cour ? "cur" : ""}"><div class="node">${i + 1}</div><span class="when">${fini ? "acquis" : cour ? "en cours" : l.length ? "à venir" : "bientôt"}</span><h3>${esc(m.nom)}</h3></div>`;
    }).join("") || `<p class="sub" style="padding:0 16px">Ajoute au moins un monde ci-dessous.</p>`}</div></div>
    <div class="trio" style="grid-template-columns:1.3fr 1fr;margin-top:18px">
      <div class="tile">
        <div class="row-head" style="margin:0 0 6px"><h2 class="mid">Dans ma route</h2><span class="sub">les flèches changent l'ordre</span></div>
        ${dans.map((m, i) => ligne(m, i, true)).join("")}
      </div>
      <div class="tile">
        <div class="row-head" style="margin:0 0 6px"><h2 class="mid">Pas encore dedans</h2></div>
        ${hors.length ? hors.map(m => ligne(m, 0, false)).join("") : `<p class="sub">Tous les mondes sont dans ta route.</p>`}
        <div class="row-head" style="margin:22px 0 8px"><h2 class="mid">Repartir d'un modèle</h2></div>
        <div class="qchips">${D.modeles.map(md => `<button class="qchip" data-modele="${md.id}">${esc(md.nom)}</button>`).join("")}</div>
      </div>
    </div>`;
  document.querySelectorAll("#parcours .qdel svg").forEach(s => s.style.cssText += ";width:18px;height:18px");
}
function changerFeuille(fn){
  const f = (E.feuille || D.modeles[0].mondes).slice();
  fn(f); E.feuille = f; sauver(); parcours(); hud();
}

/* ---------- Événements ---------- */
let derniereAction = Date.now();
["click","keydown","touchstart"].forEach(t => document.addEventListener(t, () => derniereAction = Date.now(), {passive:true}));
setInterval(() => {
  if (document.visibilityState === "visible" && Date.now() - derniereAction < 120000) {
    E.minutes[jour()] = (E.minutes[jour()] || 0) + 1;
    if (!E.actifs.includes(jour())) E.actifs.push(jour());
    sauver(); hud();
    if ($("#accueil").classList.contains("on") && !document.activeElement.matches("input")) accueil();
  }
}, 60000);

document.addEventListener("click", ev => {
  const t = ev.target.closest("[data-go],[data-fiche],[data-q],[data-world],[data-speak],[data-copy],[data-sait],[data-choix],[data-suivant],[data-defi],[data-flip],[data-qdel],[data-envoyer],[data-modele],[data-monter],[data-descendre],[data-retirer],[data-ajouter]");
  if (!t) return;
  const d = t.dataset;
  if (d.speak !== undefined) { ev.stopPropagation(); return parler(d.speak); }
  if (d.flip !== undefined) {
    t.classList.toggle("on");
    if (t.classList.contains("on") && !E.mots.includes(d.flip)) { E.mots.push(d.flip); gagner(2); if (E.mots.length === 20) toast("Badge débloqué : 20 mots"); }
    return;
  }
  if (d.fiche) return carte(d.fiche);
  if (d.q) return chercher(d.q);
  if (d.world) return monde(d.world);
  if (d.go) {
    if (d.go === "accueil") accueil();
    if (d.go === "mondes") return monde(mondeCourant);
    if (d.go === "defis") dessinerDefi();
    if (d.go === "cartes") paquet($("#deck-q").value);
    if (d.go === "parcours") parcours();
    return aller(d.go);
  }
  if (d.copy !== undefined) { const ok = () => toast("Copié : " + d.copy); navigator.clipboard ? navigator.clipboard.writeText(d.copy).then(ok, () => toast("Copie impossible ici : sélectionne le texte")) : toast("Copie impossible ici : sélectionne le texte"); return; }
  if (d.sait) {
    const e = etatCarte(d.k), premier = e.sait !== "ok" && d.sait === "ok";
    e.sait = d.sait; if (d.sait === "ok") e.rate = false; sauver();
    if (premier) gagner(5, "Carte gagnée"); else if (d.sait === "ko") toast("Ajoutée à tes cartes à revoir");
    return carte(d.k);
  }
  if (d.defi) {
    if (d.defi === "carte") { const c = CARTE[d.k]; J = {qs:[qChoix(c), qTaper(c)], i:0, coeurs:3, gagne:0, repondu:false}; dessinerDefi(); return aller("defis"); }
    if (d.defi === "etape") { const ec = etapeCourante(); if (!ec) return lancerDefi(cartesOuvertes(), 8); return lancerDefi(ec.e[1], Math.max(4, Math.min(6, ec.e[1].length * 2))); }
    if (d.defi === "revision") return lancerDefi(cartesOuvertes(), 8);
    return lancerDefi(cartesOuvertes(), 6);
  }
  if (d.choix !== undefined) {
    if (J.repondu) return;
    const q = J.qs[J.i], bon = d.choix === q.ok;
    t.classList.add(bon ? "good" : "bad");
    if (bon) document.querySelectorAll(".choice").forEach(c => c.disabled = c !== t);
    return verdict(bon, bon ? q.why : "Essaie encore.", 10);
  }
  if (d.suivant !== undefined) { J.i++; return dessinerDefi(); }
  if (d.modele) { E.feuille = D.modeles.find(m => m.id === d.modele).mondes.slice(); sauver(); toast("Ta feuille de route est prête"); accueil(); return aller("accueil"); }
  if (d.monter) return changerFeuille(f => { const i = f.indexOf(d.monter); if (i > 0) [f[i-1], f[i]] = [f[i], f[i-1]]; });
  if (d.descendre) return changerFeuille(f => { const i = f.indexOf(d.descendre); if (i < f.length - 1) [f[i+1], f[i]] = [f[i], f[i+1]]; });
  if (d.retirer) return changerFeuille(f => { const i = f.indexOf(d.retirer); if (f.length > 1) f.splice(i, 1); else toast("Garde au moins un monde"); });
  if (d.ajouter) return changerFeuille(f => f.push(d.ajouter));
  if (d.qdel !== undefined) { E.questions.splice(+d.qdel, 1); sauver(); return accueil(); }
  if (d.envoyer !== undefined) {
    const texte = "Mes questions :\n" + E.questions.map(q => "- " + q).join("\n");
    if (navigator.share) navigator.share({text:texte}).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(texte).then(() => toast("Copié : envoie-les à l'équipe"), () => toast("Copie impossible ici"));
  }
});
document.addEventListener("keydown", ev => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches("[data-flip]")) { ev.preventDefault(); ev.target.click(); } });
document.addEventListener("submit", ev => {
  const f = ev.target.closest("[data-search]"); if (!f) return;
  ev.preventDefault(); const q = f.q.value.trim(); if (q) chercher(q);
});
$("#deck-q").addEventListener("input", ev => paquet(ev.target.value));

/* Le lien vers un guide complet n'apparaît que sur une installation qui en a un */
if (location.hostname === "guide.ways-ci.com") $("#lien-guide").hidden = false;

hud(); accueil(); dessinerDefi(); paquet(); parcours();

/* Hors ligne : l'outil reste utilisable sans connexion après une première visite */
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
