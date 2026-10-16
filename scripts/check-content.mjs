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
// Encyclopedias, quote collections, popularisation and press are never cited: find the original they point to and cite that.
// (Wikisource is allowed: it transcribes the original text of a work, and the verifier compares quotes against it.)
const SECONDARY = /^(?:[a-z-]+\.)?(?:wikipedia|wikiquote|wikimedia|wikidata)\.org$|(?:^|\.)(?:herodote\.net|britannica\.com|reason\.com|pressbooks\.com|courthousenews\.com|lemonde\.fr|lefigaro\.fr|liberation\.fr|nytimes\.com|theguardian\.com|bbc\.com|reuters\.com|medium\.com|substack\.com|quora\.com|babelio\.com|goodreads\.com|citation-celebre\.com|evene\.fr)$|\.pressbooks\.pub$/i;
// Secondary sources are a last resort: a lesson may not lean on more than this many.
// Lower this ceiling as primary sources replace the secondary ones (state on 2026-10-16: highest lesson has 13).
const MAX_SECONDAIRES = 14;
const today = new Date().toISOString().slice(0, 10);
const HEDGES = /\b(peut-être|sans doute|probablement|vraisemblablement|il semble|semble-t-il|on dit que|certains pensent)\b/i;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
  const text = readFileSync(join(dir, file), "utf8");
  text.split("\n").forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    // House style: no em dash, and no en dash used as punctuation (en dash inside number ranges is also banned for consistency).
    if (/[—–]/.test(line.replace(/original="[^"]*"/g, ""))) errors.push(`${where}: tiret long ou demi-cadratin interdit`);
  });

  // Mirrors the schema limit so the error shows up here, before a slow build.
  const resume = text.match(/^resume: "(.*)"$/m)?.[1] ?? "";
  if (resume.length > 220) errors.push(`${file}: résumé de ${resume.length} caractères, maximum 220`);

  const prose = text.replace(/<Citation[\s\S]*?<\/Citation>/g, "").replace(/<p class="note">[\s\S]*?<\/p>/g, "");
  for (const m of prose.matchAll(new RegExp(HEDGES.source, "gi"))) errors.push(`${file}: formule d'incertitude « ${m[0]} » : sourcer le fait ou le retirer`);

  for (const m of text.matchAll(/consulte: "([^"]+)"/g)) if (m[1] > today) errors.push(`${file}: consulte ${m[1]} est dans le futur`);
  // A secondary source is tolerated only when declared (secondaire: true) in the frontmatter, to cross-check; shown as such on the page, including behind a <Chiffre> or a <Citation>.
  const declared = new Set([...text.replace(/\r\n/g, "\n").matchAll(/url: "([^"]+)"\n(?:\s+consulte: "[^"]*"\n)?(?:\s+primaire: (?:true|false)\n)?\s+secondaire: true/g)].map((m) => m[1]));
  let nSecondaires = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s)>\]"'<]+/g)) {
    const url = m[0].replace(/[.,;]+$/, "");
    let host = "";
    try { host = new URL(url).hostname; } catch {}
    if (!SECONDARY.test(host)) continue;
    if (![...declared].some((d) => d.startsWith(url))) errors.push(`${file}: source secondaire non déclarée (${host}) : ajouter « secondaire: true » à l'entrée de sources: ou la remplacer par la source primaire : ${url.slice(0, 90)}`);
  }
  nSecondaires = declared.size;
  if (nSecondaires > MAX_SECONDAIRES) errors.push(`${file}: ${nSecondaires} sources secondaires, maximum ${MAX_SECONDAIRES} : en remplacer par des sources primaires`);

  // Every footnote must carry its own link (the verifier opens it and compares the quotation).
  const body = text.replace(/\r\n/g, "\n");
  for (const m of body.matchAll(/^\[\^([^\]]+)\]:\s*([\s\S]*?)(?=\n\s*\n|\n\[\^|$)/gm)) {
    if (!/https?:\/\//.test(m[2]) && !/non retrouvés?/.test(m[2])) errors.push(`${file}: note [^${m[1]}] sans lien cliquable`);
  }
  // A lesson is not marked verified while it still cites a source read more than 12 months ago.
  if (/^verifie_le: \d/m.test(text) && /^\s+primaire: false/m.test(text)) errors.push(`${file}: verifie_le renseigné alors qu'une source n'est pas primaire`);

  for (const m of text.matchAll(/consulte: "([^"]+)"/g)) if (stale(m[1])) errors.push(`${file}: source consultée le ${m[1]}, plus de ${MAX_AGE_DAYS} jours : la revérifier`);

  for (const m of text.matchAll(/<Chiffre([\s\S]*?)\/>/g)) {
    for (const attr of ["valeur", "label", "source", "url", "date"]) {
      if (!new RegExp(`${attr}="[^"]+"`).test(m[1])) errors.push(`${file}: <Chiffre> sans ${attr}`);
    }
  }

  // Data-driven components: each src needs its CSV and its source file.
  for (const m of text.matchAll(/<(?:Chart|Hemicycle|Carte|Comparatif)\b[\s\S]*?src="([^"]+)"/g)) {
    for (const ext of [".csv", ".source.json"]) {
      if (!existsSync(join("data", m[1] + ext))) errors.push(`${file}: données manquantes data/${m[1]}${ext}`);
    }
  }

  // Every arrow of a <Schema> carries a source and a URL (the component also refuses to build without them).
  for (const m of text.matchAll(/<Schema[\s\S]*?\/>/g)) {
    for (const lien of m[0].matchAll(/\{[^{}]*\bde:[^{}]*\}/g)) {
      for (const attr of ["verbe", "source", "url"]) {
        if (!new RegExp(`\\b${attr}: "[^"]+"`).test(lien[0])) errors.push(`${file}: <Schema> lien sans ${attr} : ${lien[0].slice(0, 60)}`);
      }
    }
  }

  for (const m of text.matchAll(/<Citation([^>]*)>/g)) {
    for (const attr of ["auteur", "oeuvre", "annee", "reference"]) {
      if (!new RegExp(`${attr}="[^"]+"`).test(m[1])) errors.push(`${file}: <Citation> sans ${attr}`);
    }
  }

  for (const m of text.matchAll(/\burl: "([^"]+)"/g)) urls.add(m[1]);
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
