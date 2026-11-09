// Reader: a whole lesson, chapter after chapter, without questions. Each chapter ends with a way
// to practise it. Text cards are the lesson's own words (src/lib/etapes.ts), so nothing is added.
import { esc, el, icone, lien } from "../outils.js";
import { haptique } from "../etat.js";
import { occupe, ouvrirCouche, retour } from "../nav.js";
import { rendreCarte } from "./commun.js";
import { lancerSession } from "./session.js";

export function ouvrirLecteur(l, { depuis = null, etape = null } = {}) {
  if (occupe()) return;
  const couche = el(`<section class="couche lecteur" data-parcours="${esc(l.parcours)}" aria-label="${esc(l.titre)}">
    <div class="lecteur-barre">
      <button class="btn-icone" data-retour aria-label="Retour">${icone("arrow_back")}</button>
      <b>${esc(l.titre)}</b>
      <a class="btn-icone" href="${lien(l.url)}" target="_blank" rel="noopener" aria-label="Ouvrir la leçon sur le site">${icone("open_in_new")}</a>
      <span class="avance"></span>
    </div>
    <div class="defilement">
      <h1>${esc(l.titre)}</h1>
      <p class="resume">${esc(l.resume)}</p>
      ${l.etapes.map((e, i) => `
        <section id="lire-${esc(e.id)}">
          <h2><small>${i + 1}</small>${esc(e.titre)}</h2>
          ${e.cartes.map((c) => `<div class="bloc ${c.type === "texte" ? "" : "encadre"}">${rendreCarte(c, l)}</div>`).join("")}
          ${e.exercices.length ? `<button class="btn tonal entrainer" data-etape="${i}" data-cle="lire:${esc(e.id)}">${icone("edit_note")}S'entraîner sur ce chapitre</button>` : ""}
        </section>`).join("")}
    </div>
  </section>`);
  const $defile = couche.querySelector(".defilement"), $avance = couche.querySelector(".avance");
  couche.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-retour]")) return retour();
    const b = ev.target.closest("[data-etape]");
    if (b) { haptique.moyen(); lancerSession(l, l.etapes[Number(b.dataset.etape)], b); }
  });
  // Reading progress, measured once per frame at most.
  let image = 0;
  $defile.addEventListener("scroll", () => {
    if (image) return;
    image = requestAnimationFrame(() => {
      image = 0;
      const max = $defile.scrollHeight - $defile.clientHeight;
      $avance.style.transform = `scaleX(${max > 0 ? $defile.scrollTop / max : 0})`;
    });
  }, { passive: true });
  ouvrirCouche(couche, { depuis });
  if (etape) couche.querySelector(`#lire-${CSS.escape(etape)}`)?.scrollIntoView({ block: "start" });
}
