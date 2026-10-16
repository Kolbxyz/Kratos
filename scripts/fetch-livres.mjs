// Enriches the library (built from the lessons' `lectures:`) with Open Library data: cover, subjects, page count.
// Source: Open Library (openlibrary.org), metadata CC0, covers by contributors. Output: data/livres/catalogue.json + public/couvertures/.
// Books Open Library cannot match with certainty get no entry: the site then shows a placeholder, never a wrong cover.
import { writeFile, readFile, access } from "node:fs/promises";
import { lecturesDesLecons, livreId } from "./lib/livres.mjs";
import { today } from "./lib/save.mjs";

const UA = { "user-agent": "cours-pouvoir bibliotheque (https://github.com/Kolbxyz/Power)" };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const normalise = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mots = (s) => normalise(s).split(/[^a-z0-9]+/).filter((m) => m.length > 2);

// "Théorie générale de l'emploi, chapitre 12" -> "Théorie générale de l'emploi" ; subtitle after ". " or ": " dropped.
const titreCourt = (t) => t.replace(/\(.*?\)/g, "").split(/\. |: |, chapitre|, chap\./)[0].trim();
const nomDeFamille = (a) => normalise(a.split(/ et | and |,/)[0].trim().split(" ").pop());

async function cherche(auteur, titre) {
  const t = titreCourt(titre);
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", t);
  url.searchParams.set("author", nomDeFamille(auteur));
  url.searchParams.set("limit", "5");
  url.searchParams.set("fields", "key,title,author_name,cover_i,subject,first_publish_year,number_of_pages_median");
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const motsTitre = mots(t);
  // Accept only a result whose author matches and whose title shares most of its words with ours.
  return (await res.json()).docs.find((d) => {
    const commun = mots(d.title).filter((m) => motsTitre.includes(m)).length;
    return d.author_name?.some((a) => normalise(a).includes(nomDeFamille(auteur))) && commun >= Math.ceil(motsTitre.length * 0.6);
  });
}

const livres = new Map();
for (const l of lecturesDesLecons()) livres.set(livreId(l.auteur, l.titre), l);

const catalogue = {};
for (const [id, l] of livres) {
  try {
    const d = await cherche(l.auteur, l.titre);
    if (!d) { console.log(`aucun résultat sûr : ${l.auteur}, ${l.titre}`); continue; }
    const entree = {
      ol: `https://openlibrary.org${d.key}`,
      sujets: (d.subject ?? []).filter((s) => s.length < 40 && !/^(accessible|protected|large type|in library|reading level|lending)/i.test(s)).slice(0, 6),
      pages: d.number_of_pages_median ?? null,
    };
    if (d.cover_i) {
      const img = await fetch(`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (img.ok) {
        await writeFile(`public/couvertures/${id}.jpg`, Buffer.from(await img.arrayBuffer()));
        entree.couverture = `${id}.jpg`;
      }
    }
    catalogue[id] = entree;
    console.log(`${entree.couverture ? "couverture" : "sans couverture"} : ${l.titre.slice(0, 60)}`);
  } catch (e) {
    console.warn(`échec : ${l.titre.slice(0, 60)} (${e.message})`);
  }
  await pause(400);
}

await writeFile("data/livres/catalogue.json", JSON.stringify(catalogue, null, 2) + "\n");
await writeFile("data/livres/catalogue.source.json", JSON.stringify({
  titre: "Couvertures et sujets des lectures de la bibliothèque",
  producteur: "Open Library (Internet Archive)",
  url: "https://openlibrary.org/developers/api",
  consulte: today,
  traitement: "Recherche par titre et nom d'auteur ; résultat retenu seulement si l'auteur et au moins 60 % des mots du titre correspondent. Titre, auteur, année et résumé viennent des leçons.",
}, null, 2) + "\n");
console.log(`${Object.keys(catalogue).length}/${livres.size} livres enrichis`);
