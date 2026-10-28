// Training app: each lesson is a unit, each chapter a step (reading cards, then questions).
// Content comes from src/pages/app/contenu.json.ts. Progress lives on this device only (localStorage).
// Screens are stacked layers (.couche) over the path, so they can slide in and out, and the Android
// back gesture can reveal the screen underneath (predictive back, see mobile/.../RetourPlugin.java).
import { perso } from "./perso.js";

const CLE_CONTENU = "kratos-app-contenu";
const CLE_PROGRES = "kratos-app-progres";
const PAR_REVISION = 10;
// A missed question comes back once at the end of the step.
const ESSAIS_MAX = 2;
const XP_ETAPE = 10;
// Duolingo-like zigzag of the path, in px; mirrored on every other unit.
const ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44];
// Horizontal distance between the path's axis and the mascot standing beside it.
const COTE_MASCOTTE = 108;
const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];
// Material 3 easings: emphasized decelerate (enter) and emphasized accelerate (exit).
const ENTREE = "cubic-bezier(0.05, 0.7, 0.1, 1)";
const SORTIE = "cubic-bezier(0.3, 0, 0.8, 0.15)";
const STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

const $app = document.getElementById("app");
const $toast = document.getElementById("toast");
let contenu = null;
let $accueil = null;
const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
const anime = (el, images, options) => (reduit ? { finished: Promise.resolve() } : el.animate(images, options));

const lireJSON = (cle) => { try { return JSON.parse(localStorage.getItem(cle) ?? "null"); } catch { return null; } };
const ecrireJSON = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lien = (url) => (/^https?:\/\//.test(url) ? esc(url) : "#");
const melange = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const jour = (d = new Date()) => d.toLocaleDateString("sv");
const decale = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const forme = (d, cls = "") => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${esc(d)}"/></svg>`;
const html = (s) => document.createRange().createContextualFragment(s);

// Native bridge, present only in the Android app (Capacitor injects window.Capacitor).
const cap = window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null;
const natif = (plugin, methode, options) => cap?.nativePromise(plugin, methode, options).catch(() => {});
const vibre = (motif) => { try { navigator.vibrate?.(motif); } catch {} };
const haptique = {
  leger: () => (cap ? natif("Haptics", "impact", { style: "LIGHT" }) : vibre(6)),
  moyen: () => (cap ? natif("Haptics", "impact", { style: "MEDIUM" }) : vibre(12)),
  succes: () => (cap ? natif("Haptics", "notification", { type: "SUCCESS" }) : vibre(20)),
  erreur: () => (cap ? natif("Haptics", "notification", { type: "ERROR" }) : vibre([40, 60, 40])),
};

// Flat, rounded glyphs (24x24): the stroke in the fill colour rounds every corner.
const ICONES = {
  etoile: `<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/>`,
  livre: `<path d="M3.5 5c3-1 5.8-.6 8.5 1.3V20c-2.7-1.9-5.5-2.3-8.5-1.3zM20.5 5c-3-1-5.8-.6-8.5 1.3V20c2.7-1.9 5.5-2.3 8.5-1.3z"/>`,
  trophee: `<path d="M7 3.5h10v5a5 5 0 0 1-10 0zM7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10M12 13.5v3.5M8 20.5h8l-1-3.5H9z"/>`,
  feu: `<path d="M12 2c.8 3.6 5.5 5.6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.7 1.4-4.6 2.6-5.6.1 1.8.9 3 2 3.3C10.6 7.2 10.4 4.6 12 2z"/>`,
  eclair: `<path d="M13.5 2L4.5 13.5h6.2L9.5 22l9-11.5h-6.2z"/>`,
  cible: `<circle cx="12" cy="12" r="9" fill="none" stroke-width="3"/><circle cx="12" cy="12" r="3.5"/>`,
  croix: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>`,
  gauche: `<path d="M15 5l-7 7 7 7" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  droite: `<path d="M9 5l7 7-7 7" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
};
const ico = (nom) => `<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;

// Progress: days practised (the streak is computed from them), XP, steps done.
const ancien = lireJSON(CLE_PROGRES) ?? {};
const progres = { xp: 0, jours: [], xpJour: {}, etapes: {}, revisions: {}, ...ancien };
if (ancien.serie?.dernier && !ancien.jours) {
  // Earlier versions stored only { n, dernier }: rebuild the days of that streak.
  progres.jours = Array.from({ length: ancien.serie.n }, (_, i) => jour(decale(new Date(ancien.serie.dernier), -i)));
}
const sauver = () => ecrireJSON(CLE_PROGRES, progres);

function serieActuelle() {
  const jours = new Set(progres.jours);
  let d = new Date();
  if (!jours.has(jour(d))) d = decale(d, -1);
  let n = 0;
  while (jours.has(jour(d))) { n++; d = decale(d, -1); }
  return n;
}
function meilleureSerie() {
  let best = 0, n = 0, prec = null;
  for (const j of [...new Set(progres.jours)].sort()) {
    n = prec && jour(decale(new Date(prec), 1)) === j ? n + 1 : 1;
    best = Math.max(best, n);
    prec = j;
  }
  return best;
}

const parcoursDe = (lecon) => contenu.parcours.find((p) => p.id === lecon.parcours);
const revision = (lecon) => ({
  id: `${lecon.id}:revision`, titre: "Révision de la leçon", revision: true, cartes: [],
  exercices: melange(lecon.etapes.flatMap((e) => e.exercices)).slice(0, PAR_REVISION),
});
const etapeFaite = (e) => (e.revision ? (progres.revisions[e.id] ?? 0) > 0 : Boolean(progres.etapes[e.id]));

function toast(texte) {
  $toast.textContent = texte;
  $toast.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { $toast.hidden = true; }, 2600);
}

// Counts a number up in an element, for scores that land on screen.
function compter(el, de, a, duree = 700) {
  if (reduit || de === a) { el.textContent = a; return; }
  const t0 = performance.now();
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / duree);
    el.textContent = Math.round(de + (a - de) * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

// ---------------------------------------------------------------------------------------------
// Navigation stack. Each entry is a layer (full screen) or the lesson card; each has a history
// entry so the web back button and Android's back both pop it.

const pile = [];
let gesteEnCours = false;
const sommet = () => pile.at(-1);
const dessous = () => (pile.length > 1 ? pile.at(-2).el : $accueil);
const syncRetour = () => cap && natif("Retour", "activer", { actif: pile.length > 0 });

function empiler(entree, { remplacer = false } = {}) {
  if (remplacer) { pile.pop()?.fermer(false); history.replaceState({ n: pile.length + 1 }, ""); }
  else history.pushState({ n: pile.length + 1 }, "");
  pile.push(entree);
  syncRetour();
}
const retour = () => history.back();
addEventListener("popstate", () => {
  const e = pile.pop();
  if (e) e.fermer(!gesteEnCours);
  gesteEnCours = false;
  syncRetour();
});

function couche(cls = "") {
  const el = document.createElement("div");
  el.className = `couche ${cls}`;
  $app.append(el);
  return el;
}

// Opens a full-screen layer over the current one (shared axis X, like Android screens).
function ouvrirCouche(cls, remplir, options) {
  const el = couche(cls);
  const sous = options?.remplacer ? dessous() : (pile.length ? sommet().el : $accueil);
  remplir(el);
  anime(el, [{ transform: "translateX(8%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: ENTREE });
  if (sous) anime(sous, [{ transform: "none", filter: "brightness(1)" }, { transform: "translateX(-6%)", filter: "brightness(.94)" }], { duration: 380, easing: ENTREE });
  empiler({
    el,
    // Called after the entry left the stack: what is now on top is the layer revealed.
    fermer: (avecAnimation) => {
      const sousEl = pile.length ? sommet().el : $accueil;
      if (!avecAnimation) {
        // The back gesture already moved the layer: finish from where it is.
        anime(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: SORTIE }).finished.then(() => el.remove());
        if (sousEl) { sousEl.style.transform = ""; sousEl.style.filter = ""; }
        return;
      }
      anime(el, [{ transform: "none", opacity: 1 }, { transform: "translateX(8%)", opacity: 0 }], { duration: 220, easing: SORTIE }).finished.then(() => el.remove());
      if (sousEl) anime(sousEl, [{ transform: "translateX(-6%)", filter: "brightness(.94)" }, { transform: "none", filter: "brightness(1)" }], { duration: 320, easing: ENTREE });
    },
  }, options);
  return el;
}

// Predictive back: the top layer shrinks toward the gesture while the one below slides back in.
function surRetour({ type, progres: p = 0, gauche = true }) {
  const e = sommet();
  if (!e) return;
  const el = e.el;
  const sous = e.carte ? null : dessous();
  if (type === "progres" && !reduit) {
    if (e.carte) { el.style.opacity = 1 - p * 0.6; el.style.transform = `translateX(calc(-50% - var(--dx))) scale(${1 - p * 0.08})`; return; }
    el.style.transform = `translateX(${(gauche ? 1 : -1) * p * 24}px) scale(${1 - p * 0.1})`;
    el.style.borderRadius = `${p * 32}px`;
    el.style.boxShadow = `0 ${p * 12}px ${p * 40}px rgb(0 0 0 / ${p * 0.25})`;
    if (sous) { sous.style.transform = `translateX(${-6 * (1 - p)}%)`; sous.style.filter = `brightness(${0.94 + 0.06 * p})`; }
  } else if (type === "annule") {
    for (const x of [el, sous].filter(Boolean)) {
      const depart = { transform: x.style.transform || "none", opacity: x.style.opacity || 1 };
      x.style.transform = ""; x.style.opacity = ""; x.style.borderRadius = ""; x.style.filter = ""; x.style.boxShadow = "";
      anime(x, [depart, { transform: e.carte ? "translateX(calc(-50% - var(--dx)))" : "none", opacity: 1 }], { duration: 200, easing: STANDARD });
    }
  } else if (type === "valide") {
    gesteEnCours = Boolean(el.style.transform);
    retour();
  }
}
if (cap) cap.addListener("Retour", "retour", surRetour);

// ---------------------------------------------------------------------------------------------

// Content: bundled copy (or the last one downloaded), then the published one if it is newer.
async function charger() {
  const embarque = await fetch("contenu.json").then((r) => r.json()).catch(() => null);
  const cache = lireJSON(CLE_CONTENU);
  contenu = [embarque, cache].filter((c) => c?.lecons?.[0]?.etapes).sort((a, b) => b.genere.localeCompare(a.genere))[0] ?? null;
  $accueil = couche("accueil");
  if (!contenu) {
    $accueil.innerHTML = `<div class="fin"><h1>Contenu introuvable</h1><p>Connectez-vous à Internet puis relancez l'application.</p></div>`;
    return;
  }
  accueil();
  try {
    const distant = await fetch(contenu.distant, { cache: "no-store" }).then((r) => r.json());
    if (distant.lecons?.[0]?.etapes && distant.version !== contenu.version && distant.genere > contenu.genere) {
      contenu = distant;
      ecrireJSON(CLE_CONTENU, distant);
      if (!pile.length) accueil();
      toast("Leçons mises à jour");
    }
  } catch {}
}

function accueil() {
  const defilement = $accueil.scrollTop;
  const unites = contenu.parcours.flatMap((p) => contenu.lecons.filter((l) => l.parcours === p.id));
  const prochaine = unites.flatMap((l) => [...l.etapes, revision(l)]).find((e) => !etapeFaite(e))?.id;
  const serie = serieActuelle();
  let u = 0;
  $accueil.innerHTML = `
    <header class="top">
      <span class="marque" data-parcours="${esc(contenu.parcours[0].id)}">Kratos</span>
      <button class="stat feu ${serie ? "" : "eteint"}" data-serie aria-label="Série : ${serie} jours d'affilée">${ico("feu")}${serie}</button>
      <button class="stat xp ${progres.xp ? "" : "eteint"}" data-xp aria-label="${progres.xp} points d'expérience">${ico("eclair")}${progres.xp}<small>XP</small></button>
    </header>
    <main class="chemin">
      ${contenu.parcours.map((p, s) => {
        const lecons = contenu.lecons.filter((l) => l.parcours === p.id);
        if (!lecons.length) return "";
        return `
          <div class="section" data-parcours="${esc(p.id)}"><span>Section ${s + 1} · ${esc(p.nom)}</span></div>
          ${lecons.map((l, iu) => {
            const sens = u++ % 2 ? -1 : 1;
            const noeuds = [...l.etapes, revision(l)];
            const iMascotte = Math.min(2, noeuds.length - 1);
            return `
              <section class="unite" data-parcours="${esc(p.id)}">
                <div class="banniere">
                  <div><small>Unité ${iu + 1} · ${l.etapes.length} étapes</small><h2>${esc(l.titre)}</h2></div>
                  <a class="guide" href="${lien(l.url)}" target="_blank" rel="noopener" aria-label="Lire la leçon sur le site">${ico("livre")}</a>
                </div>
                <ol class="noeuds">
                  ${noeuds.map((e, i) => {
                    const icone = e.revision ? "trophee" : e.exercices.length ? "etoile" : "livre";
                    const etats = [etapeFaite(e) && (e.revision ? "or" : "fait"), e.id === prochaine && "actuel"].filter(Boolean).join(" ");
                    return `
                      <li class="noeud ${etats}" data-lecon="${esc(l.id)}" data-etape="${i}" data-id="${esc(e.id)}" style="--dx:${sens * ZIGZAG[i % ZIGZAG.length]}px;--cote:${-sens * COTE_MASCOTTE}px">
                        ${e.id === prochaine ? `<span class="bulle-start">${i ? "Continuer" : "Commencer"}</span>` : ""}
                        <button class="pastille" aria-label="${esc(e.titre)}">${ico(icone)}</button>
                        ${i === iMascotte ? perso(p, "neutre", "a-cote") : ""}
                      </li>`;
                  }).join("")}
                </ol>
              </section>`;
          }).join("")}`;
      }).join("")}
    </main>`;
  $accueil.querySelectorAll(".pastille").forEach((b) => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const li = b.closest(".noeud");
    if (sommet()?.carte) return retour();
    haptique.leger();
    const lecon = contenu.lecons.find((l) => l.id === li.dataset.lecon);
    const i = Number(li.dataset.etape);
    carte(lecon, i < lecon.etapes.length ? lecon.etapes[i] : revision(lecon), i, li);
  }));
  $accueil.querySelector("[data-serie]").addEventListener("click", () => { haptique.leger(); ouvrirCouche("serie", (el) => ecranSerie(el, false)); });
  $accueil.querySelector("[data-xp]").addEventListener("click", () => { haptique.leger(); ouvrirCouche("serie", (el) => ecranSerie(el, false, true)); });
  if (defilement) $accueil.scrollTop = defilement;
  else $accueil.querySelector(".noeud.actuel")?.scrollIntoView({ block: "center" });
}

// The lesson card under a node, like Duolingo's.
function carte(lecon, etape, i, li) {
  const fait = etapeFaite(etape);
  const q = etape.exercices.length;
  const meta = etape.revision
    ? `${q} questions sur toute la leçon`
    : `Étape ${i + 1} sur ${lecon.etapes.length} · ${etape.cartes.length} cartes${q ? ` · ${q} questions` : ""}`;
  li.style.zIndex = 3;
  li.append(html(`
    <div class="carte" role="dialog" aria-label="${esc(etape.titre)}">
      <small>${esc(lecon.titre)}</small>
      <h3>${esc(etape.titre)}</h3>
      <p>${meta}</p>
      <button class="btn blanc" data-go>${fait ? "Refaire" : "Commencer"} +${XP_ETAPE} XP</button>
    </div>`));
  const el = li.querySelector(".carte");
  el.addEventListener("click", (ev) => ev.stopPropagation());
  el.querySelector("[data-go]").addEventListener("click", () => { haptique.moyen(); session(lecon, etape); });
  empiler({
    el, carte: true,
    fermer: (avecAnimation) => {
      li.style.zIndex = "";
      if (!avecAnimation) return el.remove();
      anime(el, [{ opacity: Number(el.style.opacity || 1) }, { opacity: 0, transform: "translateX(calc(-50% - var(--dx))) translateY(-6px) scale(.96)" }], { duration: 150, easing: SORTIE }).finished.then(() => el.remove());
    },
  });
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
document.addEventListener("click", () => { if (sommet()?.carte) retour(); });

// ---------------------------------------------------------------------------------------------
// A step: one layer with a persistent bar and footer; cards and questions slide through the middle.

function session(lecon, etape) {
  const file = [
    ...etape.cartes.map((c) => ({ c })),
    ...melange(etape.exercices).map((e) => ({ e, essais: 0 })),
  ];
  const total = file.length;
  const etat = { faits: 0, premierCoup: 0, questions: etape.exercices.length, combo: 0 };
  const p = parcoursDe(lecon);

  ouvrirCouche("session", (el) => {
    el.dataset.parcours = lecon.parcours;
    el.innerHTML = `
      <div class="barre">
        <button class="fermer" aria-label="Quitter">${ico("croix")}</button>
        <div class="progres" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div>
        <span class="combo"></span>
      </div>
      <div class="scene"></div>
      <footer class="pied"><div class="info" aria-live="polite"></div><button class="btn" data-action></button></footer>`;
    el.querySelector(".fermer").addEventListener("click", retour);
  }, { remplacer: true });
  const $s = sommet().el;
  const $scene = $s.querySelector(".scene");
  const $pied = $s.querySelector(".pied");
  const $info = $pied.querySelector(".info");
  const $btn = $pied.querySelector("[data-action]");
  const $barre = $s.querySelector(".progres span");
  const $combo = $s.querySelector(".combo");
  let action = null;
  $btn.addEventListener("click", () => action?.());

  const avancer = () => {
    $barre.style.width = `${(etat.faits / total) * 100}%`;
    $s.querySelector(".progres").setAttribute("aria-valuenow", Math.round((etat.faits / total) * 100));
  };
  const majCombo = () => {
    $combo.innerHTML = etat.combo >= 2 ? `${ico("feu")}${etat.combo}` : "";
    if (etat.combo >= 2) anime($combo, [{ transform: "scale(1.25)" }, { transform: "none" }], { duration: 300, easing: STANDARD });
  };
  const pied = (classe, texte, desactive, fn) => {
    $pied.className = `pied ${classe}`;
    $btn.className = `btn ${classe === "ok" ? "ok" : classe === "ko" ? "ko" : classe === "verif" ? "ok" : ""}`;
    $btn.textContent = texte;
    $btn.disabled = desactive;
    action = fn;
  };

  // Swaps the middle of the screen: the old view leaves left, the new one comes from the right.
  const montrer = (contenuHtml) => {
    const ancienne = $scene.querySelector(".vue");
    const vue = document.createElement("div");
    vue.className = "vue";
    vue.innerHTML = contenuHtml;
    $scene.append(vue);
    $s.scrollTop = 0;
    if (ancienne) {
      ancienne.classList.add("partante");
      anime(ancienne, [{ transform: "none", opacity: 1 }, { transform: "translateX(-40px)", opacity: 0 }], { duration: 180, easing: SORTIE }).finished.then(() => ancienne.remove());
      anime(vue, [{ transform: "translateX(40px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, delay: 80, easing: ENTREE, fill: "backwards" });
    }
    $info.innerHTML = "";
    return vue;
  };

  const suivante = () => {
    avancer();
    if (!file.length) return fin(lecon, etape, etat, { montrer, pied, $info });
    const item = file.shift();
    if (item.c) {
      montrer(`<section class="lecture-carte">${rendreCarte(item.c, lecon)}</section>`);
      pied("", "Continuer", false, () => { haptique.leger(); etat.faits++; suivante(); });
      return;
    }
    question(item);
  };

  function question(item) {
    const { e } = item;
    const dialogue = (bulle) => `<div class="dialogue">${perso(p)}${bulle}</div>`;
    const enonce = {
      chiffre: `<p class="consigne">Quel chiffre manque ?</p>
        ${dialogue(`<div class="bulle"><span class="trou"></span>${esc(e.label)}<small>${esc(e.source.nom)}, ${esc(e.periode)}</small></div>`)}`,
      citation: `<p class="consigne">Qui l'a dit ou écrit ?</p>
        ${dialogue(`<blockquote class="bulle cite">« ${esc(e.texte)} »${e.traduction ? "<small>(traduction)</small>" : ""}</blockquote>`)}`,
      trou: `<p class="consigne">Complétez la phrase</p>
        ${dialogue(`<div class="bulle">${esc(e.avant)}<span class="trou"></span>${esc(e.apres)}</div>`)}`,
      ordre: `<p class="consigne">Remettez dans l'ordre chronologique</p><div class="reponse" data-reponse></div>`,
    }[e.type];
    const options = e.type === "ordre" ? melangeDesordonne(e.items.map((_, i) => i)) : melange(e.choix);
    const vue = montrer(`
      <section class="question">
        ${item.essais ? `<p class="erreur-prec">${ico("croix")}Erreur précédente</p>` : ""}
        ${enonce}
        <div class="choix" data-choix>
          ${options.map((o) => e.type === "ordre"
            ? `<button class="tuile" data-i="${o}">${esc(e.items[o].texte)}</button>`
            : `<button class="tuile" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}
        </div>
      </section>`);
    const $choix = vue.querySelector("[data-choix]");
    const $reponse = vue.querySelector("[data-reponse]");
    let choisi = null;
    const ordre = [];
    pied("verif", "Vérifier", true, () => verifier());

    $choix.addEventListener("click", (ev) => {
      const t = ev.target.closest(".tuile");
      if (!t || t.disabled) return;
      haptique.leger();
      if (e.type === "ordre") {
        if (t.classList.contains("place")) return;
        const i = Number(t.dataset.i);
        ordre.push(i);
        // The tile flies from the bank to its slot (FLIP).
        const avant = t.getBoundingClientRect();
        t.classList.add("place");
        const nv = html(`<button class="tuile" data-i="${i}">${esc(e.items[i].texte)}</button>`).firstElementChild;
        $reponse.append(nv);
        const apres = nv.getBoundingClientRect();
        anime(nv, [{ transform: `translate(${avant.left - apres.left}px, ${avant.top - apres.top}px)` }, { transform: "none" }], { duration: 300, easing: STANDARD });
        $btn.disabled = ordre.length < e.items.length;
      } else {
        $choix.querySelectorAll(".tuile").forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
        choisi = t.dataset.v;
        $btn.disabled = false;
      }
    });

    // Tapping a placed event sends it back to the bank.
    $reponse?.addEventListener("click", (ev) => {
      const t = ev.target.closest(".tuile");
      if (!t || t.disabled) return;
      haptique.leger();
      const i = Number(t.dataset.i);
      ordre.splice(ordre.indexOf(i), 1);
      t.remove();
      const banque = $choix.querySelector(`[data-i="${i}"]`);
      banque.classList.remove("place");
      anime(banque, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 200, easing: STANDARD });
      $btn.disabled = true;
    });

    function verifier() {
      let juste;
      if (e.type === "ordre") {
        juste = ordre.every((i, rang) => i === rang);
        // Show the right order with its dates, each slot marked against the learner's answer.
        $reponse.innerHTML = e.items.map((it, rang) =>
          `<button class="tuile ${ordre[rang] === rang ? "juste" : "faux"}" disabled>${esc(it.texte)}<span class="date">${esc(it.date)}</span></button>`).join("");
        $choix.hidden = true;
      } else {
        juste = choisi === e.reponse;
        $choix.querySelectorAll(".tuile").forEach((b) => {
          b.disabled = true;
          if (b.dataset.v === e.reponse) b.classList.add("juste");
          else if (b.dataset.v === choisi) b.classList.add("faux");
        });
      }
      vue.querySelector(".dialogue .perso")?.replaceWith(html(perso(p, juste ? "joie" : "triste")));
      juste ? haptique.succes() : haptique.erreur();
      item.essais++;
      if (juste) {
        etat.faits++;
        etat.combo++;
        if (item.essais === 1) etat.premierCoup++;
      } else {
        etat.combo = 0;
        if (item.essais < ESSAIS_MAX) file.push(item); else etat.faits++;
      }
      avancer();
      if (juste) anime($barre, [{ filter: "brightness(1.25)" }, { filter: "none" }], { duration: 500, easing: STANDARD });
      majCombo();
      const detail = juste ? "" : e.type === "ordre" ? "Le bon ordre est affiché au-dessus." : `Réponse : ${esc(e.reponse)}`;
      const ref = e.type === "citation" ? e.oeuvre : e.type === "chiffre" ? `${e.source.nom}, ${e.periode}` : e.source.nom;
      $info.innerHTML = `
        <p class="verdict"><span class="rond">${ico(juste ? "check" : "croix")}</span>${juste ? melange(["Bien joué !", "Exact !", "Parfait !", "Excellent !"])[0] : "Pas tout à fait"}</p>
        ${detail ? `<p class="detail">${detail}</p>` : ""}
        <p class="source">Source : <a href="${lien(e.source.url)}" target="_blank" rel="noopener">${esc(ref)}</a>${e.source.secondaire ? `<span class="sec">Source secondaire, à recouper.</span>` : ""}</p>`;
      anime($info, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: ENTREE });
      pied(juste ? "ok" : "ko", "Continuer", false, () => { haptique.leger(); suivante(); });
      $btn.focus({ preventScroll: true });
    }
  }

  suivante();
}

function rendreCarte(c, lecon) {
  const source = (nom, url, secondaire, suite = "") =>
    `<p class="src">${url ? `<a href="${lien(url)}" target="_blank" rel="noopener">${esc(nom)}</a>` : esc(nom)}${suite}${secondaire ? `<em> Source secondaire, à recouper.</em>` : ""}</p>`;
  switch (c.type) {
    case "texte": return `${c.titre ? `<h3>${esc(c.titre)}</h3>` : ""}<div class="prose">${c.html}</div>`;
    case "chiffre": return `<div class="gros-chiffre"><b>${esc(c.valeur)}</b><span>${esc(c.label)}</span></div>${source(c.source, c.url, c.secondaire, `, ${esc(c.date)}`)}`;
    case "citation": return `<blockquote class="cite">« ${esc(c.texte)} »${c.traduction ? "<small>(traduction)</small>" : ""}</blockquote><p class="auteur">${esc(c.auteur)}</p>${source(c.oeuvre, c.url, c.secondaire)}`;
    case "chrono": return `<ol class="chrono">${c.items.map((i) => `<li><b>${esc(i.date)}</b>${esc(i.texte)}</li>`).join("")}</ol>`;
    case "positions": return `<div class="positions">${c.items.map((i) => `<div><h4>${esc(i.titre)}${i.sous_titre ? `<small>${esc(i.sous_titre)}</small>` : ""}</h4><ul>${i.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul></div>`).join("")}</div>`;
    case "liste": return `<h3>${esc(c.titre)}</h3><ol class="retenir">${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "renvoi": return `<p class="renvoi">${esc(c.texte)}</p><a class="btn contour-tone" href="${lien(c.url || lecon.url)}" target="_blank" rel="noopener">${ico("livre")}Voir dans la leçon</a>`;
    default: return "";
  }
}

// An ordering exercise never starts already in order.
function melangeDesordonne(a) {
  if (a.length < 2) return a;
  let b;
  do b = melange(a); while (b.every((v, i) => v === a[i]));
  return b;
}

function fin(lecon, etape, etat, { montrer, pied }) {
  const aujourdhui = jour();
  const nouveauJour = !progres.jours.includes(aujourdhui);
  const serieAvant = serieActuelle();
  const xp = XP_ETAPE + etat.premierCoup;
  progres.xp += xp;
  progres.xpJour[aujourdhui] = (progres.xpJour[aujourdhui] ?? 0) + xp;
  if (nouveauJour) progres.jours.push(aujourdhui);
  if (etape.revision) progres.revisions[etape.id] = (progres.revisions[etape.id] ?? 0) + 1;
  else progres.etapes[etape.id] = true;
  sauver();
  // Redraw the path underneath now, so going back reveals the step already done.
  accueil();
  const noeud = $accueil.querySelector(`[data-id="${CSS.escape(etape.id)}"]`);
  noeud?.classList.add("vient-detre-fait");
  const precision = etat.questions ? Math.round((etat.premierCoup / etat.questions) * 100) : null;
  haptique.succes();

  const vue = montrer(`
    <div class="fin">
      ${perso(parcoursDe(lecon), "joie", "grand")}
      <h1>${etape.revision ? "Leçon révisée !" : "Étape terminée !"}</h1>
      <div class="scores">
        <div class="score" style="--c:var(--or-d)"><b>XP gagnés</b><span>${ico("eclair")}<i data-xp>0</i></span></div>
        ${precision === null
          ? `<div class="score" style="--c:var(--tone)"><b>Lu</b><span>${ico("livre")}${etape.cartes.length}</span></div>`
          : `<div class="score" style="--c:var(--ok)"><b>Précision</b><span>${ico("cible")}<i data-precision>0</i> %</span></div>`}
      </div>
    </div>`);
  setTimeout(() => {
    compter(vue.querySelector("[data-xp]"), 0, xp);
    const $p = vue.querySelector("[data-precision]");
    if ($p) compter($p, 0, precision);
  }, 350);
  confettis(contenu.parcours.map((x) => x.forme));
  pied("ok", "Continuer", false, () => {
    haptique.leger();
    if (!nouveauJour) return retour();
    const v = montrer(`<div class="ecran-serie"></div>`);
    ecranSerie(v.firstElementChild, true, false, serieAvant);
    pied("ok", "Continuer", false, () => { haptique.leger(); retour(); });
  });
}

// Streak screen: after the first step of the day, or from the flame in the top bar.
function ecranSerie(el, celebration, versStats = false, serieAvant = null) {
  const serie = serieActuelle();
  const jours = new Set(progres.jours);
  const lundi = decale(new Date(), -((new Date().getDay() + 6) % 7));
  const semaine = Array.from({ length: 7 }, (_, i) => decale(lundi, i));
  let mois = new Date();
  mois.setDate(1);

  const rendreMois = () => {
    const titre = mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const vide = (mois.getDay() + 6) % 7;
    const n = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
    const cases = Array.from({ length: n }, (_, i) => {
      const d = new Date(mois.getFullYear(), mois.getMonth(), i + 1);
      const j = jour(d);
      const fait = jours.has(j);
      // Consecutive days are joined by a band, like Duolingo's streak calendar.
      const lieG = fait && jours.has(jour(decale(d, -1))) && d.getDay() !== 1 && i > 0;
      const lieD = fait && jours.has(jour(decale(d, 1))) && d.getDay() !== 0 && i < n - 1;
      return `<span class="jour ${fait ? "fait" : ""} ${lieG ? "lie-g" : ""} ${lieD ? "lie-d" : ""} ${j === jour() ? "auj" : ""}">${i + 1}</span>`;
    });
    return `
      <div class="mois-tete">
        <button data-mois="-1" aria-label="Mois précédent">${ico("gauche")}</button>
        <b>${esc(titre)}</b>
        <button data-mois="1" aria-label="Mois suivant">${ico("droite")}</button>
      </div>
      <div class="grille">${JOURS_SEMAINE.map((j) => `<span class="nom">${j}</span>`).join("")}${"<span></span>".repeat(vide)}${cases.join("")}</div>`;
  };

  const faitAujourdhui = jours.has(jour());
  el.innerHTML = `
    ${celebration ? "" : `<div class="barre"><button class="fermer" aria-label="Fermer">${ico("croix")}</button></div>`}
    <div class="hero-serie ${serie ? "" : "eteint"} ${celebration ? "celebre" : ""}">
      <div><b data-n>${serie}</b><span>${serie > 1 ? "jours d'affilée" : "jour de série"}</span></div>
      <div class="flamme">${ico("feu")}</div>
    </div>
    <p class="message">${celebration
      ? (serie > 1 ? `Série prolongée ! Revenez demain pour passer à ${serie + 1} jours.` : "Première étape du jour : la série démarre.")
      : faitAujourdhui ? "Étape du jour faite. Revenez demain pour continuer la série."
      : serie ? "Faites une étape aujourd'hui pour garder la série." : "Faites une étape pour démarrer une série."}</p>
    <div class="semaine">
      ${semaine.map((d, i) => `<div class="${jours.has(jour(d)) ? "fait" : ""} ${jour(d) === jour() ? "auj" : ""}"><small>${JOURS_SEMAINE[i]}</small><span>${jours.has(jour(d)) ? ico("check") : ""}</span></div>`).join("")}
    </div>
    <div class="calendrier" data-calendrier>${rendreMois()}</div>
    <h2 data-stats>Statistiques</h2>
    <div class="stats">
      <div>${ico("feu")}<b>${meilleureSerie()}</b><small>Meilleure série</small></div>
      <div>${ico("eclair")}<b>${progres.xp}</b><small>XP au total</small></div>
      <div>${ico("etoile")}<b>${Object.keys(progres.etapes).length}</b><small>Étapes terminées</small></div>
      <div>${ico("eclair")}<b>${progres.xpJour[jour()] ?? 0}</b><small>XP aujourd'hui</small></div>
    </div>
    <p class="aide"><b>XP</b> (points d'expérience) : ${XP_ETAPE} par étape terminée, plus 1 par bonne réponse du premier coup. La <b>série</b> compte les jours d'affilée où vous avez terminé au moins une étape.</p>`;
  const $cal = el.querySelector("[data-calendrier]");
  $cal.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-mois]");
    if (!b) return;
    haptique.leger();
    const sens = Number(b.dataset.mois);
    mois = new Date(mois.getFullYear(), mois.getMonth() + sens, 1);
    $cal.innerHTML = rendreMois();
    anime($cal.querySelector(".grille"), [{ transform: `translateX(${sens * 24}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 260, easing: ENTREE });
  });
  el.querySelector(".fermer")?.addEventListener("click", retour);
  if (celebration && serieAvant !== null) {
    compter(el.querySelector("[data-n]"), serieAvant, serie, 900);
    haptique.succes();
  }
  if (versStats) requestAnimationFrame(() => el.querySelector("[data-stats]").scrollIntoView());
}

function confettis(formes) {
  if (reduit) return;
  const couleurs = ["var(--pouvoir)", "var(--institutions)", "var(--economie)", "var(--militaire)", "var(--societe)", "var(--or)"];
  for (let i = 0; i < 36; i++) {
    const s = html(forme(formes[i % formes.length], "confetti")).firstElementChild;
    s.style.cssText = `left:${Math.random() * 100}vw;--c:${couleurs[i % couleurs.length]};--d:${1.6 + Math.random() * 1.8}s;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.4}s`;
    s.addEventListener("animationend", () => s.remove());
    document.body.append(s);
  }
}

charger();
