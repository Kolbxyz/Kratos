// Every data-driven component reads its figures through here, so a CSV never ships without its source file.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { csvParse, autoType } from "d3-dsv";

export interface SourceMeta {
  titre: string;
  producteur: string;
  jeu?: string;
  url: string;
  traitement?: string;
  consulte: string;
}

// Builds always run from the project root; import.meta.url points into the bundle, not the source tree.
const root = join(process.cwd(), "data");

export function charger(src: string) {
  const rows = csvParse(readFileSync(join(root, `${src}.csv`), "utf8"), autoType);
  const source: SourceMeta = JSON.parse(readFileSync(join(root, `${src}.source.json`), "utf8"));
  return { rows, source };
}

export const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

// Fails the build with the file name instead of rendering a blank figure.
export function exigerColonnes(src: string, rows: object[], colonnes: string[]) {
  const presentes = Object.keys(rows[0] ?? {});
  for (const c of colonnes) if (!presentes.includes(c)) throw new Error(`${src}.csv : colonne « ${c} » manquante`);
}
