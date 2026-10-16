// Dataset behind the "Révolutions et dictatures" lesson.
// Source: V-Dem "Electoral democracy index" (v-dem.net, jeu de données v16, mars 2026), diffusé par Our World in Data.
// Licences : V-Dem CC BY-SA 4.0 (https://v-dem.net/data/the-v-dem-dataset/), Our World in Data CC BY (traitement).
import { save } from "./lib/save.mjs";

const PAGE = "https://ourworldindata.org/grapher/electoral-democracy-index";
const CSV = `${PAGE}.csv?v=1&csvType=full&useColumnShortNames=true`;
const COLONNE = "electdem_vdem__estimate_best";

const res = await fetch(CSV, { headers: { "user-agent": "Mozilla/5.0 (cours-pouvoir fetch)" } });
if (!res.ok) throw new Error(`Our World in Data : ${res.status}`);
const lignes = (await res.text()).trim().split(/\r?\n/);
const entete = lignes.shift().split(",");
const iEntite = entete.indexOf("entity");
const iAnnee = entete.indexOf("year");
const iValeur = entete.indexOf(COLONNE);
if ([iEntite, iAnnee, iValeur].includes(-1)) throw new Error("Our World in Data : colonnes changées, vérifier le fichier");

// [nom OWID, nom affiché, première année tracée]
const PAYS = [
  ["France", "France", 1789],
  ["Russia", "Russie (URSS comprise)", 1900],
  ["Iran", "Iran", 1900],
];

const rows = [];
for (const [owid, affiche, debut] of PAYS) {
  const serie = lignes
    .map((l) => l.split(","))
    .filter((c) => c[iEntite] === owid && c[iValeur] !== "" && Number(c[iAnnee]) >= debut)
    .map((c) => ({ annee: Number(c[iAnnee]), pays: affiche, indice: Number(c[iValeur]) }))
    .sort((a, b) => a.annee - b.annee);
  if (serie.length < 100) throw new Error(`${owid} : série trop courte (${serie.length} années)`);
  rows.push(...serie);
}

// Garde-fou : les valeurs citées dans la leçon doivent encore y être.
const val = (pays, annee) => rows.find((r) => r.pays === pays && r.annee === annee)?.indice;
const attendu = [["France", 1789, 0.256], ["France", 1793, 0.275], ["France", 1800, 0.118], ["Russie (URSS comprise)", 1917, 0.098], ["Russie (URSS comprise)", 1992, 0.498], ["Russie (URSS comprise)", 2025, 0.17], ["Iran", 1978, 0.11], ["Iran", 1979, 0.159], ["Iran", 1981, 0.121]];
for (const [p, a, v] of attendu) if (val(p, a) !== v) console.warn(`ATTENTION : ${p} ${a} = ${val(p, a)} (leçon : ${v}). Mettre la leçon à jour.`);

await save("data/regimes/revolutions-indice-democratie-electorale", rows, {
  titre: "Indice de démocratie électorale (V-Dem) : France depuis 1789, Russie et Iran depuis 1900",
  producteur: "V-Dem Institute (Université de Göteborg), jeu de données v16 (mars 2026), traité par Our World in Data",
  jeu: "Electoral democracy index (electdem_vdem__estimate_best), estimation centrale, de 0 à 1",
  url: PAGE,
  traitement: "Téléchargement du fichier complet, filtre sur trois entités (France depuis 1789, Russia et Iran depuis 1900), années sans valeur écartées. « Russia » désigne dans V-Dem le territoire russe, URSS comprise. L'indice mesure l'élection des dirigeants au suffrage étendu, des élections libres et équitables, et les libertés d'association et d'expression : c'est une estimation d'experts, pas un décompte d'événements. Licence V-Dem CC BY-SA 4.0, traitement Our World in Data CC BY.",
});
