// Apprendre: one class at a time. Its mascot, the step to resume, then the class programme.
import { avancement, leconsDe, lecon, parcoursDe, prochaine } from "../contenu.js";
import { etapeFaite, haptique, progres, serieActuelle } from "../etat.js";
import { esc, icone, pluriel } from "../outils.js";
import { barre, vague } from "../ui.js";
import { MASCOTTES, perso } from "../../perso.js";
import { classeActuelle, formeNum, majClasses, squelette, surClasse } from "./commun.js";
import { ouvrirLecon } from "./lecon.js";
import { lancerSession } from "./session.js";

// The mascot's line changes once a day, not at every redraw.
const duJour = (liste) => liste[Math.floor(Date.now() / 864e5) % liste.length];

export function creer(section) {
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const { corps, outils } = squelette(section, { titre: "Apprendre", sur: date.charAt(0).toUpperCase() + date.slice(1), classes: true });
  section.addEventListener("click", (ev) => {
    if (surClasse(ev)) return;
    const go = ev.target.closest("[data-go]");
    if (go) {
      haptique.moyen();
      const suite = prochaine(classeActuelle());
      if (suite) lancerSession(suite.lecon, suite.etape, go);
      return;
    }
    const ouvrir = ev.target.closest("[data-ouvrir]");
    if (ouvrir) { haptique.leger(); ouvrirLecon(lecon(ouvrir.dataset.ouvrir), ouvrir); }
  });

  return function rendre() {
    const classe = classeActuelle(), p = parcoursDe(classe), m = MASCOTTES[classe];
    const lecons = leconsDe(classe), total = avancement(lecons), suite = prochaine(classe);
    const serie = serieActuelle();
    outils.innerHTML = `
      <button class="puce feu ${serie ? "" : "eteinte"}" data-vers-onglet="progres" aria-label="Série : ${pluriel(serie, "jour")}">${icone("local_fire_department", { plein: true })}${serie}</button>
      <button class="puce xp ${progres.xp ? "" : "eteinte"}" data-vers-onglet="progres" aria-label="${progres.xp} XP">${icone("bolt", { plein: true })}${progres.xp}</button>`;
    majClasses(section);
    corps.innerHTML = `
      <section class="hero" data-parcours="${esc(classe)}">
        ${perso(p, suite ? "neutre" : "joie")}
        <p class="prof">${esc(m.nom)} · ${esc(p.nom)}</p>
        <p class="bulle">${esc(suite ? duJour(m.accueil) : m.fini)}</p>
        ${suite ? reprendre(suite) : ""}
      </section>
      <h2 class="titre-section">Programme<small>${total.faites}/${pluriel(total.total, "étape")}</small></h2>
      <ol class="programme">${lecons.map((l, i) => ligne(l, i, p.forme)).join("")}</ol>`;
  };
}

function reprendre({ lecon: l, etape, rang }) {
  const n = l.etapes.length, faites = l.etapes.filter(etapeFaite).length;
  const libelle = etape.revision ? "Révision de la leçon" : `Étape ${rang + 1} sur ${n} · ${etape.titre}`;
  return `
    <div class="reprendre" data-ouvrir="${esc(l.id)}" data-cle="lecon:${esc(l.id)}">
      <small>${icone("history")}${faites ? "Reprendre" : "Commencer"}</small>
      <b>${esc(l.titre)}</b><span class="etape">${esc(libelle)}</span>
      ${vague(faites / n)}
      <span class="ligne"><span class="compte">${faites}/${pluriel(n, "étape")}</span>
        <button class="btn" data-go data-cle="reprendre">${icone("play_arrow", { plein: true })}${faites ? "Continuer" : "Commencer"}</button></span>
    </div>`;
}

function ligne(l, i, forme) {
  const n = l.etapes.length, faites = l.etapes.filter(etapeFaite).length, finie = faites === n;
  const etat = finie ? "terminée" : faites ? `${faites} faites` : "à commencer";
  return `<li><button class="lecon-ligne ${finie ? "finie" : ""}" style="--i:${i}" data-ouvrir="${esc(l.id)}" data-cle="lecon:${esc(l.id)}">
    ${formeNum(forme, finie ? icone("check") : i + 1)}
    <span><b>${esc(l.titre)}</b><span class="meta">${pluriel(n, "chapitre")} · ${etat}</span>${barre(faites / n)}</span>
    ${icone(finie ? "check_circle" : "chevron_right", { plein: finie })}</button></li>`;
}
