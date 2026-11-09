// Everything the app remembers, on this device only (localStorage): progress, saved cards, settings.
import { cap, natif, decale, jour } from "./outils.js";

const CLE_PROGRES = "kratos-app-progres";
const CLE_FAVORIS = "kratos-app-favoris";
const CLE_REGLAGES = "kratos-app-reglages";

export const lireJSON = (cle) => { try { return JSON.parse(localStorage.getItem(cle) ?? "null"); } catch { return null; } };
export const ecrireJSON = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch {} };

export const XP_ETAPE = 10;

// Progress: days practised (the streak is computed from them), XP, steps and reviews done.
const VIDE = () => ({ xp: 0, jours: [], xpJour: {}, etapes: {}, revisions: {} });
const ancien = lireJSON(CLE_PROGRES) ?? {};
export const progres = { ...VIDE(), ...ancien };
if (ancien.serie?.dernier && !ancien.jours) {
  // Versions before 2026-10 stored only { n, dernier }: rebuild the days of that streak.
  progres.jours = Array.from({ length: ancien.serie.n }, (_, i) => jour(decale(new Date(`${ancien.serie.dernier}T12:00`), -i)));
  delete progres.serie;
}

// Saved reading cards: { lecon, etape, carte } references into the content.
export const favoris = lireJSON(CLE_FAVORIS) ?? [];

export const reglages = { theme: "systeme", calme: false, vibrations: true, classe: null, ...lireJSON(CLE_REGLAGES) };

// Screens subscribe to changes instead of calling each other.
const abonnes = new Set();
// Returns the function that unsubscribes.
export const surChangement = (fn) => { abonnes.add(fn); return () => abonnes.delete(fn); };
const annoncer = (quoi, detail) => abonnes.forEach((fn) => fn(quoi, detail));

export function sauverProgres(etapeFinie) { ecrireJSON(CLE_PROGRES, progres); annoncer("progres", etapeFinie); }
export function sauverReglages() { ecrireJSON(CLE_REGLAGES, reglages); annoncer("reglages"); }

export function reinitialiser() {
  Object.assign(progres, VIDE());
  favoris.length = 0;
  ecrireJSON(CLE_FAVORIS, favoris);
  sauverProgres();
}

const meme = (a, b) => a.lecon === b.lecon && a.etape === b.etape && a.carte === b.carte;
export const estFavori = (ref) => favoris.some((f) => meme(f, ref));
// Adds at the front, or at `rang` when undoing a removal.
export function basculerFavori(ref, rang = 0) {
  const i = favoris.findIndex((f) => meme(f, ref));
  if (i >= 0) favoris.splice(i, 1); else favoris.splice(rang, 0, ref);
  ecrireJSON(CLE_FAVORIS, favoris);
  annoncer("favoris");
  return i < 0;
}

export function serieActuelle() {
  const jours = new Set(progres.jours);
  let d = new Date();
  if (!jours.has(jour(d))) d = decale(d, -1);
  let n = 0;
  while (jours.has(jour(d))) { n++; d = decale(d, -1); }
  return n;
}

export function meilleureSerie() {
  let best = 0, n = 0, prec = null;
  for (const j of [...new Set(progres.jours)].sort()) {
    // Noon local time: a bare "YYYY-MM-DD" would parse as UTC midnight, the day before west of UTC.
    n = prec && jour(decale(new Date(`${prec}T12:00`), 1)) === j ? n + 1 : 1;
    best = Math.max(best, n);
    prec = j;
  }
  return best;
}

export const etapeFaite = (e) => (e.revision ? (progres.revisions[e.id] ?? 0) > 0 : Boolean(progres.etapes[e.id]));

// Records a finished step and returns what the results screen shows.
export function terminerEtape(etape, premierCoup) {
  const aujourdhui = jour();
  const nouveauJour = !progres.jours.includes(aujourdhui);
  const xp = XP_ETAPE + premierCoup;
  progres.xp += xp;
  progres.xpJour[aujourdhui] = (progres.xpJour[aujourdhui] ?? 0) + xp;
  if (nouveauJour) progres.jours.push(aujourdhui);
  if (etape.revision) progres.revisions[etape.id] = (progres.revisions[etape.id] ?? 0) + 1;
  else progres.etapes[etape.id] = true;
  sauverProgres(etape.id);
  return { xp, nouveauJour, serie: serieActuelle() };
}

const vibre = (motif) => { try { navigator.vibrate?.(motif); } catch {} };
const si = (fn) => () => reglages.vibrations && fn();
export const haptique = {
  leger: si(() => (cap ? natif("Haptics", "impact", { style: "LIGHT" }) : vibre(6))),
  moyen: si(() => (cap ? natif("Haptics", "impact", { style: "MEDIUM" }) : vibre(12))),
  succes: si(() => (cap ? natif("Haptics", "notification", { type: "SUCCESS" }) : vibre(20))),
  erreur: si(() => (cap ? natif("Haptics", "notification", { type: "ERROR" }) : vibre([40, 60, 40]))),
};
