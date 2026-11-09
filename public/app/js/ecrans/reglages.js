// Réglages: theme, motion, vibrations, reset, and where the content comes from.
import { contenu, siteRacine } from "../contenu.js";
import { haptique, reglages, reinitialiser, sauverReglages } from "../etat.js";
import { esc, icone, lien, pluriel } from "../outils.js";
import { confirmer, snackbar } from "../ui.js";
import { squelette } from "./commun.js";

const THEMES = [["systeme", "Système"], ["clair", "Clair"], ["sombre", "Sombre"]];

export function creer(section) {
  const { corps } = squelette(section, { titre: "Réglages", sur: "Kratos" });
  section.addEventListener("click", async (ev) => {
    const t = ev.target.closest("[data-theme-choix]");
    if (t) { haptique.leger(); reglages.theme = t.dataset.themeChoix; return sauverReglages(); }
    const s = ev.target.closest("[data-reglage]");
    if (s) { reglages[s.dataset.reglage] = !reglages[s.dataset.reglage]; sauverReglages(); return haptique.leger(); }
    if (ev.target.closest("[data-reinitialiser]")) {
      const oui = await confirmer({ icon: "restart_alt", titre: "Réinitialiser la progression ?", danger: true, ok: "Réinitialiser",
        texte: "Votre XP, votre série, les étapes terminées et les cartes enregistrées seront effacés de cet appareil. Cette action est définitive." });
      if (oui) { reinitialiser(); snackbar("Progression effacée", { icon: "restart_alt" }); }
    }
  });

  // Rebuilt only when the content changes; otherwise the controls update in place, so the
  // switches animate and keep the focus.
  let construit = null;
  return function rendre() {
    if (construit === contenu.genere) {
      corps.querySelectorAll("[data-reglage]").forEach((b) => b.setAttribute("aria-checked", reglages[b.dataset.reglage]));
      corps.querySelectorAll("[data-theme-choix]").forEach((b) => b.setAttribute("aria-pressed", reglages.theme === b.dataset.themeChoix));
      return;
    }
    construit = contenu.genere;
    const date = new Date(contenu.genere).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const interrupteur = (cle, icon, titre, d) => `<button class="reglage" role="switch" aria-checked="${reglages[cle]}" data-reglage="${cle}">
      ${icone(icon)}<span><b>${titre}</b><span class="d">${d}</span></span><span class="interrupteur"></span></button>`;
    corps.innerHTML = `
      <div class="reglages">
        <h2>Affichage</h2>
        <div class="reglage">${icone("palette")}<span><b>Thème</b><span class="d">Clair, sombre ou comme le téléphone</span></span><span></span></div>
        <div class="reglage-theme"><div class="segments" role="group" aria-label="Thème">${THEMES.map(([id, nom]) => `<button data-theme-choix="${id}" aria-pressed="${reglages.theme === id}">${nom}</button>`).join("")}</div></div>
        ${interrupteur("calme", "animation", "Réduire les animations", "Transitions instantanées")}
        <h2>Entraînement</h2>
        ${interrupteur("vibrations", "vibration", "Vibrations", "À chaque réponse et à chaque étape")}
        <button class="reglage danger" data-reinitialiser>${icone("restart_alt")}<span><b>Réinitialiser la progression</b><span class="d">XP, série, étapes et cartes enregistrées</span></span><span></span></button>
        <h2>À propos</h2>
        <div class="reglage">${icone("update")}<span><b>Contenu</b><span class="d">${pluriel(contenu.lecons.length, "leçon")}, mis à jour le ${esc(date)}</span></span><span></span></div>
        <div class="reglage">${icone("verified")}<span><b>Sources</b><span class="d">Chaque réponse renvoie à la source de la leçon. Les sources secondaires sont signalées.</span></span><span></span></div>
        <a class="reglage" href="${lien(siteRacine())}" target="_blank" rel="noopener">${icone("menu_book")}<span><b>Lire les leçons sur le site</b><span class="d">Graphiques, schémas et notes complètes</span></span>${icone("open_in_new")}</a>
      </div>`;
  };
}
