// A lesson: its chapters as steps, then the review. Opens out of the card that was tapped.
import { parcoursDe, revision } from "../contenu.js";
import { etapeFaite, haptique, progres, surChangement } from "../etat.js";
import { anime, el, esc, icone, lien, pluriel, EMPH } from "../outils.js";
import { occupe, ouvrirCouche, retour } from "../nav.js";
import { perso } from "../../perso.js";
import { ouvrirLecteur } from "./lecteur.js";
import { lancerSession } from "./session.js";

export function ouvrirLecon(l, depuis) {
  if (occupe()) return;
  const p = parcoursDe(l.parcours);
  const couche = el(`<section class="couche" data-parcours="${esc(l.parcours)}" aria-label="${esc(l.titre)}"><div class="defilement"></div><button class="btn fab" data-suite></button></section>`);
  const $defile = couche.querySelector(".defilement"), $fab = couche.querySelector("[data-suite]");
  const etapes = () => [...l.etapes, revision(l)];
  const suivante = () => etapes().find((e) => !etapeFaite(e)) ?? etapes().at(-1);

  const rendre = () => {
    const faites = l.etapes.filter(etapeFaite).length, actuelle = suivante();
    $defile.innerHTML = `
      <header class="tete-lecon">
        <div class="outils">
          <button class="btn-icone" data-retour aria-label="Retour">${icone("arrow_back")}</button>
          <span><button class="btn-icone" data-lire aria-label="Lire la leçon en entier">${icone("auto_stories")}</button><a class="btn-icone" href="${lien(l.url)}" target="_blank" rel="noopener" aria-label="Ouvrir la leçon sur le site">${icone("open_in_new")}</a></span>
        </div>
        <p class="classe-nom">${esc(p.nom)}</p>
        <h1>${esc(l.titre)}</h1>
        <p>${esc(l.resume)}</p>
        <div class="puces">
          <span class="puce">${icone("task_alt")}${faites}/${pluriel(l.etapes.length, "chapitre")}</span>
          <span class="puce">${icone(l.verifiee ? "verified" : "info")}${l.verifiee ? "Relue" : "En relecture"}</span>
        </div>
        ${perso(p, faites === l.etapes.length ? "joie" : "neutre")}
      </header>
      <ol class="chapitres">${etapes().map((e, i) => chapitre(e, i, e.id === actuelle.id)).join("")}</ol>`;
    const rev = progres.revisions[actuelle.id];
    $fab.innerHTML = `${icone(actuelle.revision ? "trophy" : "play_arrow", { plein: true })}${actuelle.revision ? (rev ? "Réviser encore" : "Réviser") : `Chapitre ${l.etapes.indexOf(actuelle) + 1}`}`;
    $fab.dataset.cle = `suite:${l.id}`;
  };

  const lancer = (etape, depuisEl) => {
    haptique.moyen();
    // A review draws new questions each time it starts.
    lancerSession(l, etape.revision ? revision(l) : etape, depuisEl);
  };
  couche.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-retour]")) return retour();
    if (ev.target.closest("[data-lire]")) return ouvrirLecteur(l, { depuis: ev.target.closest("[data-lire]") });
    if (ev.target.closest("[data-suite]")) return lancer(suivante(), $fab);
    const c = ev.target.closest("[data-etape]");
    if (c) lancer(etapes()[Number(c.dataset.etape)], c);
  });

  // Redrawn when a step ends, with the step just done filling in.
  const desabonner = surChangement((quoi, finie) => {
    if (quoi !== "progres") return;
    rendre();
    const n = finie && $defile.querySelector(`[data-id="${CSS.escape(finie)}"] .n`);
    if (n) anime(n, [{ transform: "scale(.5)", opacity: 0.3 }, { transform: "none", opacity: 1 }], { duration: 500, delay: 300, easing: EMPH, fill: "backwards" });
  });
  rendre();
  ouvrirCouche(couche, { depuis, surFermeture: desabonner });
}

function chapitre(e, i, actuel) {
  const fait = etapeFaite(e);
  const sous = e.revision
    ? `${pluriel(e.exercices.length, "question")} sur toute la leçon`
    : fait ? "Terminé" : actuel ? "À faire maintenant" : [pluriel(e.cartes.length, "carte"), e.exercices.length && pluriel(e.exercices.length, "question")].filter(Boolean).join(" · ");
  const pastille = fait ? icone(e.revision ? "trophy" : "check", { plein: e.revision }) : e.revision ? icone("trophy") : i + 1;
  return `<li><button class="chapitre ${fait ? "fait" : ""} ${actuel ? "actuel" : ""} ${e.revision ? "revision" : ""}" data-etape="${i}" data-id="${esc(e.id)}" data-cle="etape:${esc(e.id)}">
    <span class="n">${pastille}</span><span><span class="t">${esc(e.titre)}</span><span class="s">${sous}</span></span>${icone("chevron_right")}</button></li>`;
}
