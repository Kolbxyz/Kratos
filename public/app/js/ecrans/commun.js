// Pieces several screens draw: top bar, class picker, lesson cards, number in the class shape.
import { contenu } from "../contenu.js";
import { reglages, sauverReglages, haptique } from "../etat.js";
import { calme, esc, icone, lien } from "../outils.js";
import { perso } from "../../perso.js";

const barreHaut = (titre, extra = "") => `<header class="barre-haut"><span class="petit-titre">${esc(titre)}</span>${extra}</header>`;
const grandTitre = (titre, sur) => `<div class="grand-titre"><small>${esc(sur)}</small><h1>${esc(titre)}</h1></div>`;

export const classeActuelle = () => {
  const ids = contenu.parcours.map((p) => p.id);
  return ids.includes(reglages.classe) ? reglages.classe : ids[0];
};
const nomCourt = (nom) => nom.split(/ et | /)[0];

// The class picker is drawn once per tab and only its state changes afterwards, so the chosen
// mascot can ease from its neutral face to its happy one.
const selecteurClasses = () => `<div class="classes" role="group" aria-label="Classe">${contenu.parcours.map((p) => `
  <button class="classe" data-classe="${esc(p.id)}" data-parcours="${esc(p.id)}" aria-pressed="${p.id === classeActuelle()}" aria-label="${esc(p.nom)}">
    <span class="av"><span class="humeur h-neutre">${perso(p)}</span><span class="humeur h-joie">${perso(p, "joie")}</span></span>${esc(nomCourt(p.nom))}</button>`).join("")}</div>`;

// Tab layout: top bar, large title, optional class picker, then the part each render replaces.
export function squelette(section, { titre, sur, classes = false }) {
  section.innerHTML = `${barreHaut(titre, `<span class="outils-haut" data-outils></span>`)}${grandTitre(titre, sur)}${classes ? selecteurClasses() : ""}<div data-corps></div>`;
  const rang = section.querySelector(".classes");
  if (rang) new ResizeObserver(() => centrerClasse(section)).observe(rang);
  return { corps: section.querySelector("[data-corps]"), outils: section.querySelector("[data-outils]") };
}

// Delegated handler for the class picker, wherever it is drawn.
export function surClasse(ev) {
  const b = ev.target.closest("[data-classe]");
  if (!b) return false;
  if (b.dataset.classe !== classeActuelle()) {
    haptique.leger();
    reglages.classe = b.dataset.classe;
    sauverReglages();
  }
  return true;
}
export function majClasses(racine) {
  racine.querySelectorAll("[data-classe]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.classe === classeActuelle()));
  centrerClasse(racine, true);
}
// Centres the current class in its row without scrolling the page itself.
export function centrerClasse(racine, doux = false) {
  const rang = racine.querySelector(".classes"), b = rang?.querySelector('[aria-pressed="true"]');
  if (b && rang.clientWidth) rang.scrollTo({ left: b.offsetLeft - (rang.clientWidth - b.offsetWidth) / 2, behavior: doux && !calme() ? "smooth" : "auto" });
}

export const formeNum = (forme, contenuHtml) => `<span class="forme-num"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${esc(forme)}"/></svg><span>${contenuHtml}</span></span>`;

const source = (nom, url, secondaire, suite = "") =>
  `<p class="src">Source : ${url ? `<a href="${lien(url)}" target="_blank" rel="noopener">${esc(nom)}</a>` : esc(nom)}${esc(suite)}${secondaire ? `<em>${icone("warning")}Source secondaire, à recouper</em>` : ""}</p>`;

// A lesson card, as built by src/lib/etapes.ts. Text cards hold the lesson's own HTML (built from
// the MDX at build time, so trusted); everything else is escaped.
export function rendreCarte(c, lecon, { titres = true } = {}) {
  switch (c.type) {
    case "texte": return `${titres && c.titre ? `<h3>${esc(c.titre)}</h3>` : ""}<div class="prose">${c.html}</div>`;
    case "chiffre": return `<div class="gros-chiffre"><b>${esc(c.valeur)}</b><span>${esc(c.label)}</span></div>${source(c.source, c.url, c.secondaire, `, ${c.date}`)}`;
    case "citation": return `<blockquote class="cite">« ${esc(c.texte)} »${c.traduction ? "<small>(traduction)</small>" : ""}</blockquote><p class="auteur">${esc(c.auteur)}</p>${source(c.oeuvre, c.url, c.secondaire)}`;
    case "chrono": return `<ol class="chrono">${c.items.map((i) => `<li><span><b>${esc(i.date)}</b>${esc(i.texte)}</span></li>`).join("")}</ol>`;
    case "positions": return `<div class="positions">${c.items.map((i) => `<div><h4>${esc(i.titre)}${i.sous_titre ? `<small>${esc(i.sous_titre)}</small>` : ""}</h4><ul>${i.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul></div>`).join("")}</div>`;
    case "liste": return `${titres ? `<h3>${esc(c.titre)}</h3>` : ""}<ol class="retenir">${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "renvoi": return `<p class="renvoi">${esc(c.texte)}</p><a class="btn contour" href="${lien(c.url || lecon.url)}" target="_blank" rel="noopener">${icone("bar_chart")}Voir dans la leçon</a>`;
    default: return "";
  }
}
