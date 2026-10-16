// Fact gate: opens every cited source and checks that quoted text really appears in it.
// Usage: node scripts/verify-sources.mjs [--only slug] [--strict] [--refresh]
// Reads <Citation>, footnotes and <Chiffre> of each lesson, downloads the cited URL (cache in .cache/sources),
// and reports for each claim: OK (text found), ABSENT (page read, text not found), INACCESSIBLE (403, paywall, scanned PDF), NOLINK.
// ABSENT is a hard failure with --strict: the quote is wrong, translated without being flagged, or the page changed.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { parseHTML } from "linkedom";

const dir = "src/content/lecons";
const cacheDir = ".cache/sources";
mkdirSync(cacheDir, { recursive: true });
// Python runs from an empty directory so that nothing downloaded can shadow a module.
const emptyDir = mkdtempSync(join(tmpdir(), "pdf-"));
const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const strict = args.includes("--strict");
const refresh = args.includes("--refresh");

// Same normalisation on both sides: no case, no accents, no typographic variants, no punctuation, no spaces.
const norm = (s) =>
  s.replace(/&(?!\w+;)/g, " et ").replace(/(\w)-(tout|mêmes?|même)\b/gi, "$1$2").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "");

// Quotes of at least ~20 characters, « » or "" or “ ”, split on [...] / […] so each fragment is checked alone.
function quotes(text) {
  const out = [];
  for (const m of text.matchAll(/«\s*([^»]{15,}?)\s*»|“([^”]{15,})”|"([^"\n]{20,})"/g)) {
    const raw = (m[1] ?? m[2] ?? m[3]).replace(/\*/g, "");
    for (const frag of raw.split(/\[\s*(?:\.\.\.|…)\s*\]|\.\.\.|…/)) {
      // Bracketed editorial insertions like [l'] are removed rather than matched.
      const clean = frag.replace(/\[[^\]]*\]/g, "");
      if (clean.trim().split(/\s+/).length >= 7) out.push(frag.trim());
    }
  }
  return out;
}

function parseLesson(file) {
  const text = readFileSync(join(dir, file), "utf8").replace(/\r\n/g, "\n");
  const claims = [];
  const sources = [...(text.match(/^sources:\n([\s\S]*?)(?=^\w+:|^---)/m)?.[1] ?? "").matchAll(/titre: "([^"]+)"\n(?:\s+auteur: "[^"]*"\n)?\s+url: "([^"]+)"/g)].map((m) => ({ titre: m[1], url: m[2] }));
  for (const m of text.matchAll(/<Citation([^>]*)>([\s\S]*?)<\/Citation>/g)) {
    const url = m[1].match(/url="([^"]+)"/)?.[1];
    const auteur = m[1].match(/auteur="([^"]+)"/)?.[1] ?? "?";
    const original = m[1].match(/original="([^"]+)"/)?.[1]?.replaceAll("&quot;", '"');
    claims.push({ kind: "Citation", id: auteur, urls: url ? [url] : [], texts: [(original ?? m[2]).replace(/<[^>]+>/g, " ").trim()], whole: true, translated: Boolean(original) });
  }
  for (const m of text.matchAll(/^\[\^([^\]]+)\]:\s*([\s\S]*?)(?=\n\s*\n|\n\[\^|$)/gm)) {
    let urls = [...m[2].matchAll(/https?:\/\/[^\s)>\]"]+/g)].map((u) => u[0].replace(/[.,;]+$/, ""));
    // A note without a link is tied to the frontmatter source whose title it names.
    if (!urls.length) urls = sources.filter((s) => norm(m[2]).includes(norm(s.titre.split(/[,(:]/)[0])) && norm(s.titre.split(/[,(:]/)[0]).length >= 8).map((s) => s.url);
    claims.push({ kind: "Note", id: m[1], urls, texts: quotes(m[2]), whole: false, raw: m[2] });
  }
  for (const m of text.matchAll(/<Chiffre([\s\S]*?)\/>/g)) {
    const g = (k) => m[1].match(new RegExp(`${k}="([^"]+)"`))?.[1];
    claims.push({ kind: "Chiffre", id: g("valeur") ?? "?", urls: g("url") ? [g("url")] : [], numbers: g("valeur") });
  }
  return claims;
}

// ec.europa.eu press corner pages are rendered by JavaScript: read the same release from the public API.
function fetchUrl(url) {
  const m = url.match(/presscorner\/detail\/(\w\w)\/(ip|mex|speech|statement)_(\d\d)_(\d+)/i);
  return m ? `https://ec.europa.eu/commission/presscorner/api/documents?reference=${m[2].toUpperCase()}/${m[3]}/${m[4]}&language=${m[1]}` : url;
}

async function pageText(url) {
  const key = createHash("sha1").update(url).digest("hex");
  const path = join(cacheDir, key + ".json");
  if (!refresh && existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  let result;
  try {
    const res = await fetch(fetchUrl(url), { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (fact check)" }, signal: AbortSignal.timeout(40000) });
    if (!res.ok) result = { status: res.status, text: "" };
    else if (/pdf/i.test(res.headers.get("content-type") ?? "") || /\.pdf($|\?)/i.test(url)) {
      const pdfPath = join(cacheDir, key + ".pdf");
      writeFileSync(pdfPath, Buffer.from(await res.arrayBuffer()));
      const script = "import sys,pypdf;r=pypdf.PdfReader(sys.argv[1]);print(' '.join((p.extract_text() or '') for p in r.pages))";
      let text = "";
      try { text = execFileSync("python3", ["-E", "-c", script, join(process.cwd(), pdfPath)], { cwd: emptyDir, stdio: ["ignore", "pipe", "ignore"], maxBuffer: 1 << 29, timeout: 120000 }).toString(); } catch {}
      result = { status: 200, text, pdf: true };
    } else {
      // Old sites serve ISO-8859-1: decode as UTF-8 first and fall back to windows-1252 when the text is garbled.
      const buf = Buffer.from(await res.arrayBuffer());
      let html = buf.toString("utf8");
      if (html.includes("\uFFFD")) html = new TextDecoder("windows-1252").decode(buf);
      const { document } = parseHTML(html);
      document.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
      result = { status: 200, text: (document.documentElement?.textContent ?? "").length > 1000 ? document.documentElement.textContent : html };
    }
  } catch (e) {
    result = { status: 0, text: "", error: e.message };
  }
  // Failures are retried on the next run.
  if (result.status === 200 && norm(result.text).length > 500) writeFileSync(path, JSON.stringify(result));
  return result;
}

// Rough language test: share of French function words among common French and English ones.
const isFrench = (t) => { const fr = (t.match(/\b(le|la|les|des|est|une|dans|que|qui|du|au)\b/gi) ?? []).length; const en = (t.match(/\b(the|of|and|is|that|which|to|with)\b/gi) ?? []).length; return fr > en; };

const files = readdirSync(dir).filter((f) => f.endsWith(".mdx") && (!only || f.startsWith(only)));
const jobs = files.flatMap((file) => parseLesson(file).map((c) => ({ file, ...c })));
const urls = [...new Set(jobs.flatMap((j) => j.urls))];
// Warm the cache with a few parallel downloads.
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (next < urls.length) await pageText(urls[next++]); }));

const rows = [];
for (const j of jobs) {
  const add = (etat, detail) => rows.push({ file: j.file, kind: j.kind, id: j.id, etat, detail });
  if (j.kind === "Note" && !j.urls.length) { add("NOLINK", "note sans lien cliquable"); continue; }
  if (!j.urls.length) { add("NOLINK", "pas d'URL"); continue; }
  const pages = await Promise.all(j.urls.map(pageText));
  const readable = pages.filter((p) => p.status === 200 && norm(p.text).length > 500);
  if (!readable.length) { add("INACCESSIBLE", `${j.urls[0]} (${pages[0].status || pages[0].error}${pages[0].pdf ? ", PDF sans texte" : ""})`); continue; }
  // Consolidated legislation marks amendments as [X1 ...]: drop the markers before comparing.
  const haystack = readable.map((p) => norm(p.text.replace(/\[[A-Z]\d+/g, "").replace(/\[p\.\s*\d+\s*modifica\]/g, "")));
  // PDF text glues footnote numbers to the preceding word ("événements4 de"): compare against a copy without them too.
  const noFootnotes = readable.map((p) => norm(p.text.replace(/\[[A-Z]\d+/g, "").replace(/(?<=[a-zà-ÿ])\d{1,2}(?=[\s,.;:)])/gi, "")));
  const has = (s) => haystack.some((h) => h.includes(norm(s))) || noFootnotes.some((h) => h.includes(norm(s)));
  if (j.kind === "Chiffre") {
    const digits = (j.numbers.match(/\d[\d\s.,]*/g) ?? []).map((n) => n.replace(/[\s.,]/g, ""));
    const missing = digits.filter((d) => d.length >= 2 && !haystack.some((h) => h.includes(d) || h.replace(/[^0-9]/g, "").includes(d)));
    if (digits.length && missing.length === digits.length) add("ABSENT", `valeur « ${j.numbers} » introuvable dans ${j.urls[0]}`);
    else add("OK", "");
    continue;
  }
  if (!j.texts.length) { add("SANS_EXTRAIT", "source lisible mais aucun extrait entre guillemets à comparer : le fait n'est pas vérifiable par machine"); continue; }
  if (j.whole) {
    // A full quotation: compare the 3 longest sentences, so an ellipsis or a translation does not hide a wrong quote.
    const frags = j.texts[0].split(/(?<=[.;!?])\s+|\[\s*(?:\.\.\.|…)\s*\]/).filter((f) => norm(f).length >= 25);
    const bad = frags.filter((f) => !has(f));
    if (bad.length && !j.translated && readable.every((p) => !isFrench(p.text))) add("TRADUCTION", `citation en français, page source non française (${j.urls[0]}) : ajouter original="…" avec le texte exact`);
    else if (bad.length) add("ABSENT", `${bad.length}/${frags.length} phrases absentes de ${j.urls[0]} : « ${bad[0].slice(0, 90)}… »`);
    else add("OK", "");
    continue;
  }
  const bad = j.texts.filter((t) => !has(t));
  if (bad.length) add("ABSENT", `${bad.length}/${j.texts.length} extraits absents : « ${bad[0].slice(0, 90)} »`);
  else add("OK", "");
}

const count = (e) => rows.filter((r) => r.etat === e).length;
for (const r of rows.filter((r) => r.etat !== "OK")) console.log(`${r.etat.padEnd(12)} ${r.file} [${r.kind} ${r.id}] ${r.detail}`);
console.log(`\n${rows.length} contrôles : ${count("OK")} OK, ${count("SANS_EXTRAIT")} SANS_EXTRAIT, ${count("TRADUCTION")} TRADUCTION, ${count("ABSENT")} ABSENT, ${count("INACCESSIBLE")} INACCESSIBLE, ${count("NOLINK")} NOLINK`);
writeFileSync(join(cacheDir, "..", "verification.json"), JSON.stringify(rows, null, 1));

// Human-readable audit, committed at the repository root so the state of every lesson is visible.
const LABEL = { ABSENT: "Texte absent de la source (à corriger)", TRADUCTION: "Traduction sans original (ajouter original=)", NOLINK: "Note sans lien", INACCESSIBLE: "Source inaccessible (à lire à la main)", SANS_EXTRAIT: "Source lue, rien à comparer automatiquement" };
const par = Object.groupBy(rows, (r) => r.file);
let md = `# Audit des sources\n\nGénéré par \`node scripts/verify-sources.mjs\` le ${new Date().toISOString().slice(0, 10)}. ${rows.length} contrôles : ${count("OK")} confirmés dans la source, ${count("ABSENT")} absents, ${count("TRADUCTION")} traductions sans original, ${count("NOLINK")} notes sans lien, ${count("INACCESSIBLE")} sources inaccessibles, ${count("SANS_EXTRAIT")} sans extrait comparable.\n\nUn contrôle « confirmé » prouve que l'extrait entre guillemets existe dans la page citée, pas que la phrase de la leçon qui s'appuie dessus est exacte : \`verifie_le\` reste à remplir par un humain.\n`;
for (const [f, rs] of Object.entries(par).sort()) {
  const n = (e) => rs.filter((r) => r.etat === e).length;
  md += `\n## ${f}\n\n${n("OK")} confirmés sur ${rs.length}.\n`;
  for (const e of ["ABSENT", "TRADUCTION", "NOLINK", "INACCESSIBLE"]) for (const r of rs.filter((r) => r.etat === e)) md += `- **${LABEL[e]}** [${r.kind} ${r.id}] ${r.detail.replace(/\n/g, " ").slice(0, 220)}\n`;
}
if (!only) writeFileSync("AUDIT.md", md);
if (strict && (count("ABSENT") || count("NOLINK"))) process.exit(1);
