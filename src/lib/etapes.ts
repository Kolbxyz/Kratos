// Splits a lesson into steps for the training app: one step per chapter (##), each made of reading
// cards (the lesson's own text, footnotes kept as links) followed by the questions on that chapter.
import { attrs, leurres, texteBrut, type Exercice, type LeconBrute } from "./exercices";
import { estSecondaire } from "./secondaire";

export type Carte =
  | { type: "texte"; titre?: string; html: string }
  | { type: "chiffre"; valeur: string; label: string; source: string; url: string; date: string; secondaire: boolean }
  | { type: "citation"; texte: string; auteur: string; oeuvre: string; url?: string; traduction: boolean; secondaire: boolean }
  | { type: "chrono"; items: { date: string; texte: string }[] }
  | { type: "positions"; items: { titre: string; sous_titre?: string; points: string[] }[] }
  | { type: "liste"; titre: string; items: string[] }
  | { type: "renvoi"; texte: string; url: string };

export interface Etape { id: string; titre: string; cartes: Carte[]; exercices: Exercice[] }

// A reading card holds about this many words before the next paragraph starts a new one.
const MOTS_PAR_CARTE = 110;
const EXOS_PAR_ETAPE = 8;
// Missing-word questions are added until a step has this many questions.
const EXOS_MIN = 4;
const VISUELS: Record<string, string> = {
  Chart: "Un graphique", Schema: "Un schéma", Comparatif: "Un comparatif", Carte: "Une carte",
  Hemicycle: "Un hémicycle", Pyramide: "Une pyramide",
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const urlDe = (note: string) => note.match(/https?:\/\/[^\s)>,;]+[^\s)>,;.]/)?.[0];

// Inline Markdown of the lessons to safe HTML: bold, italics, links, footnote calls.
function enLigne(md: string, notes: Map<string, string>): string {
  const reserve: string[] = [];
  const garde = (html: string) => `\u0000${reserve.push(html) - 1}\u0000`;
  let s = md
    .replace(/<\/?(strong|b)>/g, "**").replace(/<\/?(em|i)>/g, "*").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")
    .replace(/\[\^([^\]]+)\]/g, (_, id) => {
      const url = urlDe(notes.get(id) ?? "");
      return url ? garde(`<a class="note" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(texteBrut(notes.get(id)!).slice(0, 200))}">source</a>`) : "";
    })
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, t, u) => garde(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`));
  s = esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => reserve[Number(i)]);
}

// Positions and Timeline props are JS literals written by hand; read them as JSON or skip the block.
function litteral<T>(js: string): T | null {
  try {
    return JSON.parse(js.replace(/([{,]\s*)(\w+):/g, '$1"$2":').replace(/,(\s*[\]}])/g, "$1"));
  } catch { return null; }
}

export function etapesDe(lecon: LeconBrute, exercices: Exercice[]): Etape[] {
  const notes = new Map([...lecon.body.matchAll(/^\[\^([^\]]+)\]:\s*(.+)$/gm)].map((m) => [m[1], m[2]]));
  const lignes = lecon.body.split("\n");
  const etapes: (Omit<Etape, "exercices"> & { debut: number })[] = [];
  let etape = { id: `${lecon.id}:0`, titre: "Introduction", cartes: [] as Carte[], debut: 0 };
  let paquet: string[] = [];
  let titreCarte: string | undefined;
  let offset = 0;

  const vider = () => {
    if (paquet.length) etape.cartes.push({ type: "texte", titre: titreCarte, html: paquet.join("") });
    paquet = [];
    titreCarte = undefined;
  };
  const ajouterBloc = (html: string, mots: number) => {
    const actuels = paquet.join(" ").replace(/<[^>]+>/g, "").split(/\s+/).length;
    if (paquet.length && actuels + mots > MOTS_PAR_CARTE) vider();
    paquet.push(html);
  };
  const composant = (bloc: string) => {
    vider();
    const nom = bloc.match(/^<(\w+)/)![1];
    if (nom === "Chiffre") {
      const a = attrs(bloc.match(/^<Chiffre([\s\S]*?)\/>/)![1]);
      etape.cartes.push({ type: "chiffre", valeur: a.valeur, label: texteBrut(a.label), source: a.source, url: a.url, date: a.date, secondaire: estSecondaire(a.url) });
    } else if (nom === "Citation") {
      const m = bloc.match(/^<Citation((?:\s+\w+=(?:"[^"]*"|\{[^}]*\}))*)\s*>([\s\S]*?)<\/Citation>/);
      if (!m) return;
      const a = attrs(m[1]);
      etape.cartes.push({
        type: "citation", texte: texteBrut(m[2]), auteur: a.auteur, oeuvre: `${a.oeuvre}, ${a.annee}. ${a.reference}`,
        url: a.url, traduction: Boolean(a.original), secondaire: Boolean(a.url && estSecondaire(a.url)),
      });
    } else if (nom === "Timeline") {
      const items = litteral<{ date: string; texte: string }[]>(bloc.match(/items=\{(\[[\s\S]*\])\}/)?.[1] ?? "");
      if (items) etape.cartes.push({ type: "chrono", items: items.map((i) => ({ date: i.date, texte: texteBrut(i.texte) })) });
    } else if (nom === "Positions") {
      const items = litteral<{ titre: string; sous_titre?: string; points: string[] }[]>(bloc.match(/items=\{(\[[\s\S]*\])\}/)?.[1] ?? "");
      if (items) etape.cartes.push({ type: "positions", items: items.map((i) => ({ titre: i.titre, sous_titre: i.sous_titre, points: i.points.map(texteBrut) })) });
    } else if (nom === "ARetenir") {
      const items = [...bloc.matchAll(/^\s*(?:\d+\.|-)\s+(.+)$/gm)].map((m) => texteBrut(m[1]));
      etape.cartes.push({ type: "liste", titre: "À retenir", items });
    } else if (VISUELS[nom]) {
      const a = attrs(bloc.match(/^<\w+([\s\S]*?)\/?>/)?.[1] ?? "");
      const titre = a.titre ? ` : ${texteBrut(a.titre)}` : "";
      etape.cartes.push({ type: "renvoi", texte: `${VISUELS[nom]} accompagne ce passage dans la leçon${titre}.`, url: lecon.url });
    }
  };

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    const debutLigne = offset;
    offset += ligne.length + 1;
    const t = ligne.trim();
    if (!t) continue;
    if (/^import\s/.test(t) || /^\[\^[^\]]+\]:/.test(t) || /^<\/?div\b/.test(t) || /^<p class="note">/.test(t)) continue;
    if (t.startsWith("## ")) {
      vider();
      if (etape.cartes.length) etapes.push(etape);
      etape = { id: `${lecon.id}:${etapes.length + 1}`, titre: texteBrut(t.slice(3)), cartes: [], debut: debutLigne };
      continue;
    }
    if (t.startsWith("### ")) { vider(); titreCarte = texteBrut(t.slice(4)); continue; }
    const ouvrant = t.match(/^<([A-Z]\w*)/);
    if (ouvrant) {
      // Collect the whole component: up to its closing tag, or a self-closing end with balanced braces.
      const fin = new RegExp(`</${ouvrant[1]}>`);
      let bloc = ligne;
      const ferme = (b: string) => fin.test(b) || (/\/>\s*$/.test(b) && (b.match(/\{/g) ?? []).length === (b.match(/\}/g) ?? []).length);
      while (!ferme(bloc) && i + 1 < lignes.length) { i++; bloc += `\n${lignes[i]}`; offset += lignes[i].length + 1; }
      composant(bloc.trim());
      continue;
    }
    if (t.startsWith("|")) {
      const rangs = [t];
      while (lignes[i + 1]?.trim().startsWith("|")) { i++; offset += lignes[i].length + 1; rangs.push(lignes[i].trim()); }
      const cellules = rangs.filter((r) => !/^\|[\s:|-]+\|$/.test(r)).map((r) => r.slice(1, -1).split("|").map((c) => enLigne(c.trim(), notes)));
      const [tete, ...corps] = cellules;
      ajouterBloc(`<table><thead><tr>${tete.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${corps.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`, 60);
      continue;
    }
    if (/^(-|\d+\.)\s/.test(t)) {
      const ordonnee = /^\d/.test(t);
      const items = [t];
      while (/^\s*(-|\d+\.)\s/.test(lignes[i + 1] ?? "")) { i++; offset += lignes[i].length + 1; items.push(lignes[i].trim()); }
      const html = items.map((it) => `<li>${enLigne(it.replace(/^(-|\d+\.)\s+/, ""), notes)}</li>`).join("");
      ajouterBloc(ordonnee ? `<ol>${html}</ol>` : `<ul>${html}</ul>`, items.join(" ").split(/\s+/).length);
      continue;
    }
    // A paragraph (or a quoted block): lines until the next blank line or special line.
    const morceaux = [t];
    while (lignes[i + 1]?.trim() && !/^(#|<|\||-\s|\d+\.\s|\[\^)/.test(lignes[i + 1].trim())) { i++; offset += lignes[i].length + 1; morceaux.push(lignes[i].trim()); }
    const texte = morceaux.join(" ");
    const cite = texte.startsWith(">");
    const html = enLigne(cite ? texte.replace(/^>\s?/, "").replace(/\s>\s?/g, " ") : texte, notes);
    ajouterBloc(cite ? `<blockquote>${html}</blockquote>` : `<p>${html}</p>`, texte.split(/\s+/).length);
  }
  vider();
  if (etape.cartes.length) etapes.push(etape);

  const trous = etapes.map((e) => trousDe(e.cartes, lecon));
  const pools = {
    terme: trous.flat().filter((t) => t.genre === "terme").map((t) => t.reponse),
    pourcent: trous.flat().filter((t) => t.genre === "pourcent").map((t) => t.reponse),
    annee: trous.flat().filter((t) => t.genre === "annee").map((t) => t.reponse),
  };

  return etapes.map((e, k) => {
    const fin = etapes[k + 1]?.debut ?? Infinity;
    const debut = k === 0 ? -Infinity : e.debut;
    const exos = exercices.filter((x) => x.pos >= debut && x.pos < fin).slice(0, EXOS_PAR_ETAPE);
    // Bold key terms first, then figures; never two blanks in the same sentence.
    const candidats = [...trous[k]].sort((a, b) => Number(b.genre === "terme") - Number(a.genre === "terme"));
    const phrases = new Set<string>();
    for (const t of candidats) {
      if (exos.length >= EXOS_MIN) break;
      const phrase = t.avant + t.apres;
      if (phrases.has(phrase)) continue;
      const choix = leurres(t.reponse, [pools[t.genre].filter((v) => !phrase.includes(v))], () => true);
      if (choix.length < 3) continue;
      phrases.add(phrase);
      exos.push({ pos: 0, id: `${e.id}:trou:${exos.length}`, type: "trou", avant: t.avant, apres: t.apres, reponse: t.reponse, choix: [t.reponse, ...choix], source: t.source });
    }
    const { debut: _d, ...reste } = e;
    return { ...reste, exercices: exos };
  });
}

interface Trou { genre: "terme" | "pourcent" | "annee"; avant: string; apres: string; reponse: string; source: { nom: string; url: string; secondaire: boolean } }

const entites = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// Blankable spots in a step's text: bold terms, percentages and years, each in its own sentence.
function trousDe(cartes: Carte[], lecon: LeconBrute): Trou[] {
  const res: Trou[] = [];
  for (const c of cartes) {
    if (c.type !== "texte") continue;
    for (const bloc of c.html.match(/<p>[\s\S]*?<\/p>/g) ?? []) {
      const url = bloc.match(/<a class="note" href="([^"]+)"/)?.[1];
      const source = url
        ? { nom: "Source citée dans la leçon", url: entites(url), secondaire: estSecondaire(entites(url)) }
        : { nom: "La leçon et ses sources", url: lecon.url, secondaire: false };
      const texte = entites(bloc.replace(/<a class="note"[^>]*>source<\/a>/g, "").replace(/<strong>/g, "\u0001").replace(/<\/strong>/g, "\u0002").replace(/<[^>]+>/g, ""));
      for (const phrase of texte.split(/(?<=[.!?»])\s+(?=[A-ZÀ-Ý«])/)) {
        const nette = phrase.replace(/[\u0001\u0002]/g, "").trim();
        if (nette.length < 40 || nette.length > 260) continue;
        const gras = phrase.match(/\u0001([^\u0001\u0002]{3,40})\u0002/);
        // A bold key term: short, and not a figure (figures are blanked below with their own pool).
        if (gras && !/\d/.test(gras[1]) && gras[1].trim().split(/\s+/).length <= 5) {
          const [avant, apres] = [phrase.slice(0, gras.index), phrase.slice(gras.index! + gras[0].length)].map((s) => s.replace(/[\u0001\u0002]/g, ""));
          if (!avant.includes(gras[1]) && !apres.includes(gras[1])) res.push({ genre: "terme", avant: avant.trimStart(), apres: apres.trimEnd(), reponse: gras[1].trim(), source });
          continue;
        }
        const m = nette.match(/\b\d{1,3}(?:,\d+)? ?%/) ?? nette.match(/\b(1[5-9]\d\d|20[0-4]\d)\b/);
        if (!m) continue;
        const genre = m[0].includes("%") ? "pourcent" : "annee";
        res.push({ genre, avant: nette.slice(0, m.index), apres: nette.slice(m.index! + m[0].length), reponse: m[0].replace(/ %/, " %"), source });
      }
    }
  }
  return res;
}
