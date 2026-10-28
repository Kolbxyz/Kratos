// Turns a lesson's sourced blocks into quiz exercises for the training app (public/app/).
// Nothing is written by hand: every question comes from a <Chiffre>, <Citation> or <Timeline>
// already in the lesson, so it carries the same source and stays in sync with the text.
import { estSecondaire } from "./secondaire";

export interface SourceExo { nom: string; url: string; secondaire: boolean }
// `pos`: offset of the block in the lesson body, used to place the exercise in its chapter.
export type Exercice = { pos: number } & (
  | { id: string; type: "chiffre"; label: string; periode: string; reponse: string; choix: string[]; source: SourceExo }
  | { id: string; type: "citation"; texte: string; traduction: boolean; reponse: string; choix: string[]; oeuvre: string; source: SourceExo }
  | { id: string; type: "ordre"; items: { date: string; texte: string }[]; source: SourceExo }
  // A sentence of the lesson with one word or figure blanked (built in etapes.ts).
  | { id: string; type: "trou"; avant: string; apres: string; reponse: string; choix: string[]; source: SourceExo }
);

export interface LeconBrute { id: string; parcours: string; body: string; url: string }

const ATTRS = String.raw`((?:\s+\w+=(?:"[^"]*"|\{[^}]*\}))*)\s*`;
const RE_CHIFFRE = new RegExp(`<Chiffre${ATTRS}/>`, "g");
const RE_CITATION = new RegExp(`<Citation${ATTRS}>([\\s\\S]*?)</Citation>`, "g");
const RE_TIMELINE = /<Timeline items=\{\[([\s\S]*?)\]\}\s*\/>/g;
const RE_ITEM = /\{ date: "((?:[^"\\]|\\.)*)", texte: "((?:[^"\\]|\\.)*)" \}/g;
const RE_NOTE_DEF = /^\[\^([^\]]+)\]:\s*(.+)$/gm;
const RE_NOTE_REF = /\[\^([^\]]+)\](?!:)/g;
// A quote longer than this does not fit a phone screen; it is skipped, never cut.
const CITATION_MAX = 450;

export const attrs = (s: string) =>
  Object.fromEntries([...s.matchAll(/(\w+)=(?:"([^"]*)"|\{([^}]*)\})/g)].map((m) => [m[1], m[2] ?? m[3].replace(/^["']|["']$/g, "")]));

export const texteBrut = (s: string) =>
  s.replace(/<[^>]+>/g, "")
    .replace(RE_NOTE_REF, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*?|__?/g, "")
    .replace(/\s+/g, " ")
    .trim();

const unite = (valeur: string) => valeur.replace(/[\d\s.,+\-−]/g, "").toLowerCase();
const norme = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Three wrong answers: same lesson first, then same track, then everything; same unit preferred.
export function leurres(bonne: string, pools: string[][], memeType: (a: string) => boolean): string[] {
  const vus = new Set([norme(bonne)]);
  const pris: string[] = [];
  for (const filtre of [memeType, () => true]) {
    for (const pool of pools) {
      for (const v of pool) {
        if (pris.length === 3) return pris;
        if (vus.has(norme(v)) || !filtre(v)) continue;
        vus.add(norme(v));
        pris.push(v);
      }
    }
  }
  return pris;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// Sort key of a French date ("4 octobre 1958", "Mars 1973", "427 av. J.-C."); null if none can be read.
function cleDate(date: string, anneePrec: number | null): number | null {
  const d = date.toLowerCase();
  const a = d.match(/\b(\d{3,4})\b/);
  const mois = MOIS.findIndex((m) => new RegExp(`\\b${m}\\b`).test(d)) + 1;
  let annee = a ? Number(a[1]) * (/av\. j\.-c\./.test(d) ? -1 : 1) : null;
  if (annee === null && mois > 0) annee = anneePrec;
  if (annee === null) return null;
  const jour = Number(d.match(/^(\d{1,2})(?:er)?\b/)?.[1] ?? 0);
  return annee * 10000 + mois * 100 + jour;
}

// Footnotes cited right after a timeline ("Sources : ... [^id]") source its dates.
function sourceDesNotes(apres: string, notes: Map<string, string>): SourceExo | null {
  for (const m of apres.slice(0, 600).matchAll(RE_NOTE_REF)) {
    const note = notes.get(m[1]);
    const url = note?.match(/https?:\/\/[^\s)>,;]+[^\s)>,;.]/)?.[0];
    if (!note || !url) continue;
    const complet = texteBrut(note.slice(0, note.indexOf(url))).replace(/[\s(:,;]+$/, "");
    const nom = complet.length <= 140 ? complet : `${complet.slice(0, complet.lastIndexOf(" ", 140))}…`;
    return { nom, url, secondaire: estSecondaire(url) };
  }
  return null;
}

export function exercicesDe(lecon: LeconBrute, toutes: LeconBrute[]): Exercice[] {
  const chiffres = (l: LeconBrute) => [...l.body.matchAll(RE_CHIFFRE)].map((m) => attrs(m[1]));
  const auteurs = (l: LeconBrute) => [...l.body.matchAll(RE_CITATION)].map((m) => attrs(m[1]).auteur).filter(Boolean);
  const memeParcours = toutes.filter((l) => l.parcours === lecon.parcours && l.id !== lecon.id);
  const autres = toutes.filter((l) => l.parcours !== lecon.parcours);
  const exos: Exercice[] = [];

  const ici = [...lecon.body.matchAll(RE_CHIFFRE)].map((m) => ({ ...attrs(m[1]), pos: m.index! }));
  const poolsValeurs = [ici, memeParcours.flatMap(chiffres), autres.flatMap(chiffres)].map((p) => p.map((c) => c.valeur));
  ici.forEach((c, i) => {
    // A wrong answer quoted in the question itself would give it away or confuse.
    const choix = leurres(c.valeur, poolsValeurs.map((p) => p.filter((v) => !c.label.includes(v))), (v) => unite(v) === unite(c.valeur));
    if (choix.length < 3) return;
    exos.push({
      pos: c.pos, id: `${lecon.id}:chiffre:${i}`, type: "chiffre", label: texteBrut(c.label), periode: c.date, reponse: c.valeur,
      choix: [c.valeur, ...choix], source: { nom: c.source, url: c.url, secondaire: estSecondaire(c.url) },
    });
  });

  const poolsAuteurs = [auteurs(lecon), memeParcours.flatMap(auteurs), autres.flatMap(auteurs)];
  [...lecon.body.matchAll(RE_CITATION)].forEach((m, i) => {
    const a = attrs(m[1]);
    const texte = texteBrut(m[2]);
    if (!a.auteur || !a.url || texte.length > CITATION_MAX) return;
    const choix = leurres(a.auteur, poolsAuteurs, () => true);
    if (choix.length < 3) return;
    exos.push({
      pos: m.index!, id: `${lecon.id}:citation:${i}`, type: "citation", texte, traduction: Boolean(a.original), reponse: a.auteur,
      choix: [a.auteur, ...choix], oeuvre: `${a.oeuvre}, ${a.annee}. ${a.reference}`,
      source: { nom: a.oeuvre, url: a.url, secondaire: estSecondaire(a.url) },
    });
  });

  const notes = new Map([...lecon.body.matchAll(RE_NOTE_DEF)].map((m) => [m[1], m[2]]));
  [...lecon.body.matchAll(RE_TIMELINE)].forEach((m, t) => {
    const items = [...m[1].matchAll(RE_ITEM)].map((it) => ({ date: JSON.parse(`"${it[1]}"`), texte: texteBrut(JSON.parse(`"${it[2]}"`)) }));
    // Only timelines whose every date can be read and that run forward in time become ordering exercises.
    let prec: number | null = null;
    const cles: number[] = [];
    for (const it of items) {
      const k = cleDate(it.date, prec === null ? null : Math.trunc(prec / 10000));
      if (k === null || (prec !== null && k < prec)) return;
      cles.push(k);
      prec = k;
    }
    const distincts = items.filter((_, i) => i === 0 || cles[i] > cles[i - 1]);
    const source = sourceDesNotes(lecon.body.slice(m.index! + m[0].length), notes)
      ?? { nom: "Sources de la leçon", url: lecon.url, secondaire: false };
    for (let i = 0; i + 3 <= distincts.length && i < 8; i += 4) {
      exos.push({ pos: m.index!, id: `${lecon.id}:ordre:${t}:${i}`, type: "ordre", items: distincts.slice(i, i + 4), source });
    }
  });

  return exos;
}

// The numbered list of <ARetenir>, shown at the end of a session.
export const aRetenir = (body: string) =>
  [...(body.match(/<ARetenir>([\s\S]*?)<\/ARetenir>/)?.[1] ?? "").matchAll(/^\s*(?:\d+\.|-)\s+(.+)$/gm)].map((m) => texteBrut(m[1]));
