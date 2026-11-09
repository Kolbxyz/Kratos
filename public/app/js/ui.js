// Shared Material 3 pieces: snackbar, confirmation dialog, confetti, progress shapes.
import { anime, calme, el, esc, icone, EMPH, SORTIE } from "./outils.js";
import { pousser, retour } from "./nav.js";

// Snackbar: one at a time, above the navigation bar, with an optional action.
let minuterie;
export function snackbar(texte, { icon = null, action = null } = {}) {
  document.querySelector(".snackbar")?.remove();
  const s = el(`<div class="snackbar" role="status">${icon ? icone(icon, { plein: true }) : ""}<span>${esc(texte)}</span>${action ? `<button class="btn texte">${esc(action.libelle)}</button>` : ""}</div>`);
  document.getElementById("app").append(s);
  const fermer = () => anime(s, [{ opacity: 1 }, { opacity: 0, transform: "scale(.96)" }], { duration: 160, easing: SORTIE, fill: "forwards" }).finished.then(() => s.remove());
  s.querySelector("button")?.addEventListener("click", () => { action.faire(); fermer(); });
  anime(s, [{ opacity: 0, transform: "translateY(24px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 360, easing: EMPH });
  clearTimeout(minuterie);
  minuterie = setTimeout(fermer, 4200);
}

// Basic dialog, on the navigation stack so back closes it. Resolves true when confirmed.
// Focus starts on Cancel; the rest of the app is inert while it is open.
export function confirmer({ icon, titre, texte, ok, danger = false }) {
  return new Promise((resoudre) => {
    const voile = el(`<div class="voile"><div class="dialogue" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-p">
      ${icone(icon, { cls: danger ? "danger" : "" })}<h2 id="dlg-t">${esc(titre)}</h2><p id="dlg-p">${esc(texte)}</p>
      <div class="actions"><button class="btn texte" data-non>Annuler</button><button class="btn texte ${danger ? "danger" : ""}" data-oui>${esc(ok)}</button></div></div></div>`);
    const $app = document.getElementById("app"), avant = document.activeElement;
    const dessous = [...$app.children].filter((n) => !n.inert);
    let reponse = false;
    dessous.forEach((n) => (n.inert = true));
    $app.append(voile);
    pousser({
      el: voile.firstElementChild,
      fermer: () => {
        dessous.forEach((n) => (n.inert = false));
        voile.classList.remove("ouvert");
        setTimeout(() => voile.remove(), 280);
        avant?.focus?.({ preventScroll: true });
        resoudre(reponse);
      },
    });
    voile.addEventListener("click", (e) => {
      if (e.target.closest("[data-oui]")) reponse = true;
      if (e.target === voile || e.target.closest("[data-oui], [data-non]")) retour();
    });
    requestAnimationFrame(() => voile.classList.add("ouvert"));
    voile.querySelector("[data-non]").focus();
  });
}

// Wavy progress line (Material 3 Expressive): the done part waves, the rest is a flat track.
export function vague(fraction) {
  const l = 300, h = 16, x = Math.max(6, Math.min(1, fraction) * l), amp = 3, periode = 22;
  let d = `M3 ${h / 2}`;
  for (let i = 3; i <= x; i += 2) d += `L${i} ${(h / 2 + amp * Math.sin((i / periode) * 2 * Math.PI)).toFixed(2)}`;
  return `<svg class="vague" viewBox="0 0 ${l} ${h}" preserveAspectRatio="none" aria-hidden="true">
    ${x < l - 10 ? `<path d="M${x + 8} ${h / 2}H${l - 3}" class="piste"/><circle cx="${l - 3}" cy="${h / 2}" r="2.5"/>` : ""}
    <path d="${d}"/></svg>`;
}

export const barre = (fraction) => `<span class="barre-lin" aria-hidden="true"><i style="width:${Math.round(Math.min(1, fraction) * 100)}%"></i></span>`;

// Confetti in the track colours: thrown up, slowed by air, fades out. No bounce.
export function confettis() {
  if (calme()) return;
  const $app = document.getElementById("app");
  const c = el(`<canvas class="confettis" aria-hidden="true"></canvas>`);
  $app.append(c);
  const r = $app.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = r.width * dpr; c.height = r.height * dpr;
  const ctx = c.getContext("2d");
  const css = getComputedStyle(document.documentElement);
  const couleurs = ["pouvoir", "institutions", "economie", "militaire", "societe", "or"].map((n) => css.getPropertyValue(`--m-${n}`).trim() || "#ffcf3f");
  const P = Array.from({ length: 90 }, () => ({
    x: r.width / 2 + (Math.random() - 0.5) * 80, y: r.height * 0.32,
    vx: (Math.random() - 0.5) * 10, vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
    c: couleurs[(Math.random() * couleurs.length) | 0], rond: Math.random() < 0.35,
  }));
  const t0 = performance.now();
  (function image(t) {
    const k = (t - t0) / 1900;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalAlpha = Math.max(0, 1 - k * k);
    for (const p of P) {
      p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.22; p.x += p.vx; p.y += p.vy; p.a += p.va;
      const cos = dpr * Math.cos(p.a), sin = dpr * Math.sin(p.a);
      ctx.setTransform(cos, sin, -sin, cos, dpr * p.x, dpr * p.y);
      ctx.fillStyle = p.c;
      if (p.rond) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    }
    if (k < 1) requestAnimationFrame(image); else c.remove();
  })(t0);
}

// Swaps the content of a container with a shared-axis X transition (old leaves left, new comes in).
export function remplacer(conteneur, contenuHtml, sens = 1) {
  const ancienne = conteneur.querySelector(":scope > .vue:not(.partante)");
  const vue = el(`<div class="vue" tabindex="-1">${contenuHtml}</div>`);
  conteneur.append(vue);
  if (ancienne) {
    ancienne.classList.add("partante");
    anime(ancienne, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${-30 * sens}px)` }], { duration: 160, easing: SORTIE, fill: "forwards" }).finished.then(() => ancienne.remove());
    anime(vue, [{ opacity: 0, transform: `translateX(${30 * sens}px)` }, { opacity: 1, transform: "none" }], { duration: 400, delay: 70, easing: EMPH, fill: "backwards" });
  }
  return vue;
}
