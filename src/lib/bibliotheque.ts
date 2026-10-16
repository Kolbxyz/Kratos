// The library is derived from the lessons' `lectures:`: one entry per book, listing every lesson that recommends it.
import { getCollection } from "astro:content";
// @ts-expect-error plain .mjs shared with the fetch script
import { livreId } from "../../scripts/lib/livres.mjs";
import catalogue from "../../data/livres/catalogue.json";
import type { ParcoursId } from "../parcours";

export interface Livre {
  id: string;
  auteur: string;
  auteurs: string[];
  titre: string;
  annee: string;
  url?: string;
  parcours: ParcoursId;
  incontournable: boolean;
  lecons: { id: string; titre: string; parcours: ParcoursId; pourquoi: string }[];
  couverture?: string;
  sujets: string[];
  pages?: number | null;
  ol?: string;
}

type Enrichi = { couverture?: string; sujets: string[]; pages: number | null; ol: string };
const enrichis = catalogue as Record<string, Enrichi>;

// "A et B", "A, B" -> two authors; a trailing "(Institution)" stays attached to its name.
export const separeAuteurs = (a: string) => a.split(/, | et /).map((s) => s.trim()).filter(Boolean);
// Sort key: family name, i.e. the last word.
export const nomDeFamille = (a: string) => a.replace(/\(.*?\)/g, "").trim().split(" ").pop()!;

export async function getLivres(): Promise<Livre[]> {
  const lecons = (await getCollection("lecons")).sort((a, b) => a.data.ordre - b.data.ordre);
  const livres = new Map<string, Livre>();
  for (const l of lecons) {
    for (const r of l.data.lectures) {
      const id: string = livreId(r.auteur, r.titre);
      const lecon = { id: l.id, titre: l.data.titre, parcours: l.data.parcours, pourquoi: r.pourquoi };
      const existant = livres.get(id);
      if (existant) { existant.lecons.push(lecon); existant.incontournable ||= r.incontournable; continue; }
      livres.set(id, {
        id, auteur: r.auteur, auteurs: separeAuteurs(r.auteur), titre: r.titre, annee: String(r.annee), url: r.url,
        parcours: l.data.parcours, incontournable: r.incontournable, lecons: [lecon], ...enrichis[id],
        // Open Library subjects are user-entered: keep the readable English ones, drop tags like great_books_of_the_western_world.
        sujets: (enrichis[id]?.sujets ?? []).filter((s) => /^[\x20-\x7E]+$/.test(s) && !s.includes("_")),
      });
    }
  }
  return [...livres.values()];
}
