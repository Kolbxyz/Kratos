// Repetition gate: finds passages that appear in several lessons (a lesson must link to another, not copy it).
// Usage: node scripts/check-doublons.mjs [--strict]   (strict: exit 1 above MAX_SHARED shared passages per pair)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/content/lecons";
const SHINGLE = 9; // consecutive words
const MAX_SHARED = 3; // passages shared by a pair of lessons before it is an error
const strict = process.argv.includes("--strict");

const words = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/<[^>]+>/g, " ").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

const seen = new Map(); // shingle -> Set(files)
const bodies = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
  // Body only: no frontmatter, no import lines, no footnote definitions (sources legitimately repeat).
  const body = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n").replace(/^---[\s\S]*?\n---\n/, "").replace(/^import .*$/gm, "").replace(/^\[\^[^\]]+\]:.*$/gm, "");
  const w = words(body);
  bodies[f] = w;
  for (let i = 0; i + SHINGLE <= w.length; i++) {
    const k = w.slice(i, i + SHINGLE).join(" ");
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k).add(f);
  }
}

const pairs = new Map(); // "a|b" -> {n, example}
for (const [k, files] of seen) {
  if (files.size < 2) continue;
  const list = [...files].sort();
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const key = `${list[i]}|${list[j]}`;
    const p = pairs.get(key) ?? { n: 0, example: k };
    p.n++;
    pairs.set(key, p);
  }
}

let bad = 0;
for (const [key, p] of [...pairs].sort((a, b) => b[1].n - a[1].n)) {
  // n counts overlapping shingles: a 20-word shared passage gives 12 shingles, so ~SHINGLE shingles = one extra word each.
  if (p.n < 6) continue;
  const [a, b] = key.split("|");
  console.log(`${String(p.n).padStart(4)} segments communs  ${a}  ~  ${b}\n      ex. « ${p.example} »`);
  if (p.n > MAX_SHARED * 6) bad++;
}
console.log(bad ? `\n${bad} paires de leçons avec trop de texte commun.` : "\nAucune paire de leçons avec trop de texte commun.");
if (strict && bad) process.exit(1);
