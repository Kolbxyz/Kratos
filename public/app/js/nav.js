// Navigation stack. Every entry (a layer, or a tab other than Apprendre) has a history entry, so the
// web back button and Android's back gesture both pop it. On Android the gesture is forwarded by
// mobile/.../RetourPlugin.java while the stack is not empty (predictive back), otherwise the system
// handles back and leaves the app.
import { anime, cap, calme, natif, EMPH, SORTIE, STANDARD } from "./outils.js";

const pile = [];
let parGeste = false;
// Back presses already sent to history but not yet handled, so a double tap pops one screen only.
let enAttente = 0;
// A tap during an opening animation must not open a second layer.
let derniereOuverture = 0;
export function occupe() {
  const t = performance.now();
  if (t - derniereOuverture < 450) return true;
  derniereOuverture = t;
  return false;
}
const $app = () => document.getElementById("app");
const syncRetour = () => cap && natif("Retour", "activer", { actif: pile.length > 0 });

export const sommet = () => pile.at(-1);
export const retour = () => { if (pile.length > enAttente) { enAttente++; history.back(); } };

// entree: { el, fermer(animer) } — fermer runs after the entry left the stack.
export function pousser(entree) {
  history.pushState({ n: pile.length + 1 }, "");
  pile.push(entree);
  syncRetour();
}

// The history entry says how deep the stack should be: back pops down to it, forward is undone.
addEventListener("popstate", (ev) => {
  enAttente = Math.max(0, enAttente - 1);
  const n = ev.state?.n ?? 0;
  if (n > pile.length) return history.back();
  const sortis = [];
  while (pile.length > n) sortis.push(pile.pop());
  dispatchEvent(new Event("kratos:pile"));
  sortis.forEach((e) => e.fermer(!parGeste));
  parGeste = false;
  syncRetour();
});

// After a reload the stack is empty: drop the history entries left by the previous page.
export function nettoyerHistorique() {
  if (history.state?.n) history.go(-history.state.n);
}

// Container transform: the layer grows out of the element that opened it (a card, a button) and
// shrinks back into it when closed. The origin is found again by its data-cle if it was redrawn.
const visible = (x) => x?.isConnected && x.getClientRects().length > 0 && !x.closest("[hidden]");
function trouverOrigine(depuis, cle) {
  if (visible(depuis)) return depuis;
  return cle ? [...document.querySelectorAll(`[data-cle="${CSS.escape(cle)}"]`)].find(visible) ?? null : null;
}
function decoupe(cible) {
  const a = $app().getBoundingClientRect(), r = cible.getBoundingClientRect();
  const rayon = parseFloat(getComputedStyle(cible).borderTopLeftRadius) || 16;
  return `inset(${r.top - a.top}px ${a.right - r.right}px ${a.bottom - r.bottom}px ${r.left - a.left}px round ${rayon}px)`;
}
const PLEIN = "inset(0px 0px 0px 0px round 0px)";

export function ouvrirCouche(couche, { depuis = null, surFermeture = null } = {}) {
  const cle = depuis?.dataset.cle, avant = document.activeElement;
  // Measured before the layer is added, so opening does not force a layout of the new layer.
  const depart = depuis && decoupe(depuis);
  // What is under the layer leaves the focus order and the accessibility tree while it is open.
  const dessous = [...$app().children].filter((n) => !n.inert && !n.matches(".snackbar, .voile"));
  dessous.forEach((n) => (n.inert = true));
  couche.setAttribute("role", "dialog");
  couche.setAttribute("aria-modal", "true");
  couche.tabIndex = -1;
  $app().append(couche);
  if (depart) anime(couche, [{ clipPath: depart }, { clipPath: PLEIN }], { duration: 500, easing: EMPH });
  else anime(couche, [{ opacity: 0, transform: "translateY(32px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: EMPH });
  for (const enfant of couche.children) {
    anime(enfant, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: depart ? 90 : 0, easing: STANDARD, fill: "backwards" });
  }
  (couche.querySelector("[data-retour], [data-quitter]") ?? couche).focus({ preventScroll: true });
  pousser({
    el: couche,
    fermer: (animer) => {
      surFermeture?.();
      dessous.forEach((n) => (n.inert = false));
      const o = trouverOrigine(depuis, cle);
      (o ?? avant)?.focus?.({ preventScroll: true });
      const fini = () => couche.remove();
      if (!animer || calme()) {
        // The back gesture already moved the layer: finish from where it is.
        anime(couche, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: SORTIE }).finished.then(fini);
        return;
      }
      for (const enfant of couche.children) anime(enfant, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: SORTIE, fill: "forwards" });
      const fin = o ? { clipPath: decoupe(o) } : { clipPath: PLEIN, opacity: 0, transform: "translateY(32px)" };
      anime(couche, [{ clipPath: PLEIN, opacity: 1, transform: "none" }, fin], { duration: 380, easing: STANDARD, fill: "forwards" }).finished.then(fini);
    },
  });
}

// Escape goes back, like Android's back gesture (the web has no other way out of a layer).
addEventListener("keydown", (e) => { if (e.key === "Escape" && pile.length) retour(); });

// Predictive back: the top screen shrinks toward the gesture, then leaves or comes back.
function surRetour({ type, progres: p = 0, gauche = true }) {
  const x = sommet()?.el;
  if (!x) return;
  if (type === "progres" && !calme()) {
    // Only the transform changes per event; the corners are rounded once.
    if (!x.style.borderRadius) x.style.borderRadius = "28px";
    x.style.transform = `translateX(${(gauche ? 1 : -1) * p * 24}px) scale(${1 - p * 0.1})`;
  } else if (type === "annule") {
    const depart = x.style.transform || "none";
    x.style.transform = ""; x.style.borderRadius = "";
    anime(x, [{ transform: depart }, { transform: "none" }], { duration: 220, easing: STANDARD });
  } else if (type === "valide") {
    parGeste = Boolean(x.style.transform);
    retour();
  }
}
if (cap) cap.addListener("Retour", "retour", surRetour);
