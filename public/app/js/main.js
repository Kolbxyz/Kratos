// Training app: each lesson is a unit of a class (track), each chapter a step (reading cards, then
// questions). Content comes from src/pages/app/contenu.json.ts; progress stays on this device.
// The shell holds four tabs; lessons, sessions and the reader open as layers above it (nav.js).
import { charger, mettreAJour } from "./contenu.js";
import { haptique, reglages, surChangement } from "./etat.js";
import { anime, calme, icone, EMPH, SORTIE } from "./outils.js";
import { nettoyerHistorique, pousser, retour, sommet } from "./nav.js";
import { snackbar } from "./ui.js";
import { classeActuelle } from "./ecrans/commun.js";
import * as apprendre from "./ecrans/apprendre.js";
import * as bibliotheque from "./ecrans/bibliotheque.js";
import * as progres from "./ecrans/progres.js";
import * as reglagesEcran from "./ecrans/reglages.js";

const ONGLETS = [
  { id: "apprendre", nom: "Apprendre", icon: "school", ecran: apprendre },
  { id: "bibliotheque", nom: "Bibliothèque", icon: "local_library", ecran: bibliotheque },
  { id: "progres", nom: "Progrès", icon: "local_fire_department", ecran: progres },
  { id: "reglages", nom: "Réglages", icon: "settings", ecran: reglagesEcran },
];
const $app = document.getElementById("app");
const section = (id) => document.getElementById(`onglet-${id}`);
const systemeSombre = matchMedia("(prefers-color-scheme: dark)");
let courant = "apprendre";

// Same rule as the inline script in index.html, which applies it before the first paint.
function appliquerReglages() {
  const theme = reglages.theme === "systeme" ? (systemeSombre.matches ? "sombre" : "clair") : reglages.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("calme", reglages.calme);
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
}

function monter() {
  $app.innerHTML = `
    <main class="onglets">${ONGLETS.map((o) => `<section class="onglet" id="onglet-${o.id}" aria-label="${o.nom}" ${o.id === courant ? "" : "hidden"}></section>`).join("")}</main>
    <nav class="nav" aria-label="Navigation principale">${ONGLETS.map((o) => `
      <button data-onglet="${o.id}" ${o.id === courant ? 'aria-current="page"' : ""}><span class="indic">${icone(o.icon)}</span>${o.nom}</button>`).join("")}</nav>`;
  for (const o of ONGLETS) {
    const s = section(o.id);
    o.rendre = o.ecran.creer(s);
    s.addEventListener("scroll", () => s.classList.toggle("defile", s.scrollTop > 24), { passive: true });
  }
  $app.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-onglet], [data-vers-onglet]");
    if (b) { haptique.leger(); allerA(b.dataset.onglet ?? b.dataset.versOnglet); }
  });
}

// A change (progress, settings, saved cards) marks every tab as stale; only the tab on screen is
// redrawn, and only once no layer covers it. The others are redrawn when they are shown.
const perimes = new Set();
const visibleAuDessus = () => !sommet() || sommet().onglet;
function rendreOnglet(id) {
  if (!perimes.delete(id)) return;
  const s = section(id), y = s.scrollTop;
  ONGLETS.find((o) => o.id === id).rendre();
  s.scrollTop = y;
}
function toutRendre() {
  $app.dataset.parcours = classeActuelle();
  ONGLETS.forEach((o) => perimes.add(o.id));
  if (visibleAuDessus()) rendreOnglet(courant);
}
// nav.js announces it before a closing layer shrinks back, so the tab under it is up to date.
addEventListener("kratos:pile", () => { if (visibleAuDessus()) rendreOnglet(courant); });

// Tabs other than Apprendre sit on the navigation stack, so back returns to Apprendre.
function allerA(id) {
  const surOnglet = sommet()?.onglet;
  if (id === courant) return section(id).scrollTo({ top: 0, behavior: calme() ? "auto" : "smooth" });
  if (id === "apprendre") return surOnglet ? retour() : montrer(id);
  if (!surOnglet) pousser({ onglet: true, get el() { return section(courant); }, fermer: () => montrer("apprendre") });
  montrer(id);
}

// Fade through: the old tab fades out quickly, the new one fades and settles in.
function montrer(id) {
  if (id === courant) return;
  const de = section(courant);
  courant = id;
  $app.querySelectorAll("[data-onglet]").forEach((b) => (b.dataset.onglet === id ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  anime(de, [{ opacity: 1 }, { opacity: 0 }], { duration: 90, easing: SORTIE }).finished.then(() => {
    rendreOnglet(courant);
    for (const o of ONGLETS) {
      const s = section(o.id);
      s.hidden = o.id !== courant;
      s.style.transform = ""; s.style.borderRadius = "";
    }
    anime(section(courant), [{ opacity: 0, transform: "scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: EMPH });
  });
}

async function demarrer() {
  nettoyerHistorique();
  appliquerReglages();
  systemeSombre.addEventListener("change", appliquerReglages);
  if (!(await charger())) {
    $app.innerHTML = `<div class="erreur-chargement">${icone("warning")}<h1>Contenu introuvable</h1><p>Connectez-vous à Internet puis relancez l'application.</p></div>`;
    return;
  }
  monter();
  toutRendre();
  surChangement((quoi) => { if (quoi === "reglages") appliquerReglages(); toutRendre(); });
  if (await mettreAJour()) { toutRendre(); snackbar("Leçons mises à jour", { icon: "update" }); }
}

demarrer();
