// Progrès: the streak, its calendar, the totals and the progress of each class.
import { avancement, contenu, leconsDe } from "../contenu.js";
import { haptique, meilleureSerie, progres, serieActuelle, XP_ETAPE } from "../etat.js";
import { anime, decale, esc, icone, jour, pluriel, EMPH } from "../outils.js";
import { barre } from "../ui.js";
import { perso } from "../../perso.js";
import { squelette } from "./commun.js";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

export function creer(section) {
  const { corps } = squelette(section, { titre: "Progrès", sur: "Série, calendrier, statistiques" });
  let mois = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  section.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-mois]");
    if (!b || b.disabled) return;
    haptique.leger();
    const sens = Number(b.dataset.mois);
    mois = new Date(mois.getFullYear(), mois.getMonth() + sens, 1);
    const cal = section.querySelector("[data-calendrier]");
    cal.innerHTML = calendrier(mois);
    anime(cal.querySelector(".calendrier"), [{ opacity: 0, transform: `translateX(${20 * sens}px)` }, { opacity: 1, transform: "none" }], { duration: 320, easing: EMPH });
  });

  return function rendre() {
    const serie = serieActuelle(), jours = new Set(progres.jours), auj = jour();
    const lundi = decale(new Date(), -((new Date().getDay() + 6) % 7));
    const message = jours.has(auj) ? "Étape du jour faite. Revenez demain pour continuer."
      : serie ? `Faites une étape aujourd'hui pour passer à ${pluriel(serie + 1, "jour")}.` : "Faites une étape pour démarrer une série.";
    corps.innerHTML = `
      <section class="serie-hero ${serie ? "" : "eteinte"}">
        <div><b>${serie}<small>${serie > 1 ? "jours de suite" : "jour de série"}</small></b><p>${message}</p></div>
        ${icone("local_fire_department", { cls: "flamme" })}
        <div class="semaine">${JOURS.map((n, i) => {
          const d = jour(decale(lundi, i));
          return `<div>${n}<i class="${jours.has(d) ? "fait" : ""} ${d === auj ? "auj" : ""}">${jours.has(d) ? icone("local_fire_department") : Number(d.slice(8))}</i></div>`;
        }).join("")}</div>
      </section>
      <section class="bloc-p" data-calendrier>${calendrier(mois)}</section>
      <div class="tuiles">
        <div class="tuile-stat">${icone("military_tech")}<b>${meilleureSerie()}</b><small>Meilleure série</small></div>
        <div class="tuile-stat">${icone("bolt", { plein: true })}<b>${progres.xp}</b><small>XP au total</small></div>
        <div class="tuile-stat">${icone("task_alt")}<b>${Object.keys(progres.etapes).length}</b><small>Étapes terminées</small></div>
        <div class="tuile-stat">${icone("calendar_month")}<b>${progres.xpJour[auj] ?? 0}</b><small>XP aujourd'hui</small></div>
      </div>
      <section class="bloc-p"><h2>Par classe</h2><div class="par-classe">${contenu.parcours.map((p) => {
        const a = avancement(leconsDe(p.id));
        return `<div data-parcours="${esc(p.id)}"><span class="av">${perso(p)}</span><div>${esc(p.nom)}${barre(a.total ? a.faites / a.total : 0)}</div><small>${a.faites}/${a.total}</small></div>`;
      }).join("")}</div></section>
      <p class="aide"><b>XP</b> : ${XP_ETAPE} par étape terminée, plus 1 par bonne réponse du premier coup. La <b>série</b> compte les jours d'affilée où vous avez terminé au moins une étape.</p>`;
  };
}

function calendrier(mois) {
  const jours = new Set(progres.jours), auj = new Date();
  const vide = (mois.getDay() + 6) % 7, n = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
  const ceMois = mois.getFullYear() === auj.getFullYear() && mois.getMonth() === auj.getMonth();
  const cases = Array.from({ length: n }, (_, i) => {
    const d = new Date(mois.getFullYear(), mois.getMonth(), i + 1), j = jour(d), fait = jours.has(j), col = (vide + i) % 7;
    // Consecutive days are joined by a band, cut at the edges of a week row.
    const debut = fait && (!jours.has(jour(decale(d, -1))) || col === 0 || i === 0);
    const fin = fait && (!jours.has(jour(decale(d, 1))) || col === 6 || i === n - 1);
    return `<span class="j ${fait ? "fait" : ""} ${debut ? "debut" : ""} ${fin ? "fin" : ""} ${j === jour() ? "auj" : ""} ${d > auj ? "futur" : ""}"><span>${i + 1}</span></span>`;
  });
  return `
    <div class="mois-tete">
      <button class="btn-icone" data-mois="-1" aria-label="Mois précédent">${icone("chevron_left")}</button>
      <b>${esc(mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</b>
      <button class="btn-icone" data-mois="1" aria-label="Mois suivant" ${ceMois ? "disabled" : ""}>${icone("chevron_right")}</button>
    </div>
    <div class="calendrier">${JOURS.map((j) => `<span class="nom">${j}</span>`).join("")}${"<span></span>".repeat(vide)}${cases.join("")}</div>`;
}
