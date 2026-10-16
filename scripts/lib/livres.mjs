// Single definition of a book's identity and of how `lectures:` are read, shared by the site and the fetch script.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const livreId = (auteur, titre) =>
  `${auteur}-${titre}`
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

// Reads the `lectures:` block of every lesson (quoted strings are JSON-compatible) without a YAML dependency.
export function lecturesDesLecons(dir = "src/content/lecons") {
  const out = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const bloc = readFileSync(join(dir, f), "utf8").match(/^lectures:\n((?:(?: {2}| {0}- ).*\n)*)/m)?.[1] ?? "";
    for (const entree of bloc.split(/^ {2}- /m).slice(1)) {
      const champ = (k) => entree.match(new RegExp(`^ *(?:- )?${k}: (.+)$`, "m"))?.[1];
      const val = (k) => { const v = champ(k); return v === undefined ? undefined : v.startsWith('"') ? JSON.parse(v) : v; };
      out.push({ auteur: val("auteur"), titre: val("titre"), annee: val("annee"), url: val("url"), lecon: f.replace(/\.mdx$/, "") });
    }
  }
  return out;
}
