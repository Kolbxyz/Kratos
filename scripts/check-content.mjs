// Content gate: run before every commit and in CI. Exits non-zero on any violation.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = "src/content/lecons";
const errors = [];
const checkLinks = process.argv.includes("--links");
const urls = new Set();
// Sources must have been re-read within the last year, so the figures stay current.
const MAX_AGE_DAYS = 365;
const stale = (date) => (Date.now() - Date.parse(date)) / 86400000 > MAX_AGE_DAYS;
// Hedges hide unsourced claims. Quotes are exempt: the author's words stay as written.
const HEDGES = /\b(peut-être|sans doute|probablement|vraisemblablement|il semble|semble-t-il|on dit que|certains pensent)\b/i;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
  const text = readFileSync(join(dir, file), "utf8");
  text.split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    // House style: no em dash, and no en dash used as punctuation (en dash inside number ranges is also banned for consistency).
    if (/[—–]/.test(line)) errors.push(`${where}: tiret long ou demi-cadratin interdit`);
  });

  // Mirrors the schema limit so the error shows up here, before a slow build.
  const resume = text.match(/^resume: "(.*)"$/m)?.[1] ?? "";
  if (resume.length > 220) errors.push(`${file}: résumé de ${resume.length} caractères, maximum 220`);

  const prose = text.replace(/<Citation[\s\S]*?<\/Citation>/g, "").replace(/<p class="note">[\s\S]*?<\/p>/g, "");
  for (const m of prose.matchAll(new RegExp(HEDGES.source, "gi"))) errors.push(`${file}: formule d'incertitude « ${m[0]} » : sourcer le fait ou le retirer`);

  for (const m of text.matchAll(/consulte: "([^"]+)"/g)) if (stale(m[1])) errors.push(`${file}: source consultée le ${m[1]}, plus de ${MAX_AGE_DAYS} jours : la revérifier`);

  for (const m of text.matchAll(/<Chiffre([\s\S]*?)\/>/g)) {
    for (const attr of ["valeur", "label", "source", "url", "date"]) {
      if (!new RegExp(`${attr}="[^"]+"`).test(m[1])) errors.push(`${file}: <Chiffre> sans ${attr}`);
    }
  }

  for (const m of text.matchAll(/<Chart[\s\S]*?src="([^"]+)"/g)) {
    for (const ext of [".csv", ".source.json"]) {
      if (!existsSync(join("data", m[1] + ext))) errors.push(`${file}: données manquantes data/${m[1]}${ext}`);
    }
  }

  for (const m of text.matchAll(/<Citation([^>]*)>/g)) {
    for (const attr of ["auteur", "oeuvre", "annee", "reference"]) {
      if (!new RegExp(`${attr}="[^"]+"`).test(m[1])) errors.push(`${file}: <Citation> sans ${attr}`);
    }
  }

  for (const m of text.matchAll(/^\s+url: "([^"]+)"/gm)) urls.add(m[1]);
  for (const m of text.matchAll(/url="([^"]+)"/g)) urls.add(m[1]);
}

for (const f of readdirSync("data", { recursive: true }).filter((f) => f.endsWith(".source.json"))) {
  const meta = JSON.parse(readFileSync(join("data", f), "utf8"));
  for (const k of ["titre", "producteur", "url", "consulte"]) if (!meta[k]) errors.push(`data/${f}: champ ${k} manquant`);
  urls.add(meta.url);
  if (meta.consulte && stale(meta.consulte)) errors.push(`data/${f}: données téléchargées le ${meta.consulte}, relancer npm run fetch-data`);
}

if (checkLinks) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (link check)" }, signal: AbortSignal.timeout(20000) });
      // 401/403/429 come from anti-bot protection (Légifrance, DOI publishers), not from a dead link.
      if (res.status >= 400 && ![401, 403, 429].includes(res.status)) errors.push(`lien mort (${res.status}) : ${url}`);
      else if (res.status >= 400) console.warn(`avertissement (${res.status}, protection anti-robot) : ${url}`);
    } catch (e) {
      errors.push(`lien injoignable : ${url} (${e.message})`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Contenu valide${checkLinks ? `, ${urls.size} liens vérifiés` : ""}.`);
