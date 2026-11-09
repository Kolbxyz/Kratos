// Lessons come from src/pages/app/contenu.json.ts: the copy bundled with the app (or the last one
// downloaded), then the published one when it is newer, so a new lesson needs no reinstall.
import { lireJSON, etapeFaite } from "./etat.js";
import { melange } from "./outils.js";

const CLE_CONTENU = "kratos-app-contenu";
// Date of the stored copy, kept apart so the 1.7 MB copy is parsed only when it is the newer one.
const CLE_GENERE = "kratos-app-contenu-genere";
const PAR_REVISION = 10;
const valide = (c) => Boolean(c?.lecons?.[0]?.etapes);

export let contenu = null;

export async function charger() {
  const embarque = await fetch("contenu.json").then((r) => r.json()).catch(() => null);
  let genereLocal = "";
  try { genereLocal = localStorage.getItem(CLE_GENERE) ?? ""; } catch {}
  const local = !valide(embarque) || genereLocal > embarque.genere ? lireJSON(CLE_CONTENU) : null;
  contenu = [embarque, local].filter(valide).sort((a, b) => b.genere.localeCompare(a.genere))[0] ?? null;
  return contenu;
}

// Resolves with true when a newer version was downloaded and is now in use.
export async function mettreAJour() {
  // On the site the bundled file is the published one: nothing newer to fetch.
  if (new URL(contenu.distant, location).href === new URL("contenu.json", location).href) return false;
  try {
    // no-cache revalidates: an unchanged file comes back as a cheap 304.
    const texte = await fetch(contenu.distant, { cache: "no-cache" }).then((r) => r.text());
    const distant = JSON.parse(texte);
    if (!valide(distant) || distant.version === contenu.version || distant.genere <= contenu.genere) return false;
    contenu = distant;
    try { localStorage.setItem(CLE_CONTENU, texte); localStorage.setItem(CLE_GENERE, distant.genere); } catch {}
    return true;
  } catch { return false; }
}

export const parcoursDe = (id) => contenu.parcours.find((p) => p.id === id);
export const leconsDe = (classe) => contenu.lecons.filter((l) => l.parcours === classe);
export const lecon = (id) => contenu.lecons.find((l) => l.id === id);
export const siteRacine = () => contenu.distant.replace(/app\/contenu\.json$/, "");

// A lesson review: 10 questions drawn from all its steps. Its id is stable so it can be marked done.
export const revision = (l) => ({
  id: `${l.id}:revision`, titre: "Révision de la leçon", revision: true, cartes: [],
  exercices: melange(l.etapes.flatMap((e) => e.exercices)).slice(0, PAR_REVISION),
});

export function avancement(lecons) {
  const etapes = lecons.flatMap((l) => l.etapes);
  return { faites: etapes.filter(etapeFaite).length, total: etapes.length };
}

// The next thing to do in a class: first unfinished step, else first unrevised lesson.
export function prochaine(classe) {
  for (const l of leconsDe(classe)) {
    const e = l.etapes.find((x) => !etapeFaite(x));
    if (e) return { lecon: l, etape: e, rang: l.etapes.indexOf(e) };
  }
  for (const l of leconsDe(classe)) {
    const r = revision(l);
    if (!etapeFaite(r)) return { lecon: l, etape: r, rang: l.etapes.length };
  }
  return null;
}
