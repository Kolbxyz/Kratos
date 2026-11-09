// Small helpers shared by every screen: escaping, dates, motion, haptics, icons.

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const lien = (url) => (/^https?:\/\//.test(url ?? "") ? esc(url) : "#");
export const html = (s) => document.createRange().createContextualFragment(s);
export const el = (s) => html(s).firstElementChild;
export const melange = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
};
export const jour = (d = new Date()) => d.toLocaleDateString("sv");
export const decale = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const pluriel = (n, un, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;

// Material Symbols Rounded, bundled as a subset (polices/): only the names listed there exist.
export const icone = (nom, { plein = false, cls = "" } = {}) => `<span class="ms ${plein ? "plein" : ""} ${cls}" aria-hidden="true">${nom}</span>`;

// Material 3 easings. The app never overshoots: everything decelerates into place.
export const EMPH = "cubic-bezier(0.05, 0.7, 0.1, 1)";
export const SORTIE = "cubic-bezier(0.3, 0, 0.8, 0.15)";
export const STANDARD = "cubic-bezier(0.2, 0, 0, 1)";

const systemeCalme = matchMedia("(prefers-reduced-motion: reduce)");
export const calme = () => systemeCalme.matches || document.documentElement.classList.contains("calme");
// Web Animations with the reduced-motion setting applied: the end state is reached at once.
export const anime = (cible, images, options) => cible.animate(images, calme() ? { ...options, duration: 1, delay: 0 } : options);

// Counts a number up, for scores landing on screen.
export function compter(cible, a, { de = 0, duree = 700, suffixe = "" } = {}) {
  if (calme() || de === a) { cible.textContent = a + suffixe; return; }
  const t0 = performance.now();
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / duree);
    cible.textContent = Math.round(de + (a - de) * (1 - (1 - k) ** 3)) + suffixe;
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

// Native bridge, present only in the Android app (Capacitor injects window.Capacitor).
export const cap = window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null;
export const natif = (plugin, methode, options) => cap?.nativePromise(plugin, methode, options).catch(() => {});
