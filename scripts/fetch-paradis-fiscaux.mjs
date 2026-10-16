// Datasets behind the "Paradis fiscaux" lesson.
// Eurostat series are fetched; the Tørsløv-Wier-Zucman table is transcribed by hand because it exists only as a PDF table.
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";

const DATASET = "gov_10a_taxag";
const PAGE = "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_taxag/default/table";

// Eurostat geo code to ISO 3166-1 alpha-3, for the countries the Eurostat table reports.
const ISO3 = {
  BE: "BEL", BG: "BGR", CZ: "CZE", DK: "DNK", DE: "DEU", EE: "EST", IE: "IRL", EL: "GRC", ES: "ESP", FR: "FRA", HR: "HRV",
  IT: "ITA", CY: "CYP", LV: "LVA", LT: "LTU", LU: "LUX", HU: "HUN", MT: "MLT", NL: "NLD", AT: "AUT", PL: "POL", PT: "PRT",
  RO: "ROU", SI: "SVN", SK: "SVK", FI: "FIN", SE: "SWE", IS: "ISL", NO: "NOR", CH: "CHE",
};
const arrondi = (v) => Math.round(v * 10) / 10;

// Corporate income tax receipts (ESA 2010 item D51B, general government) as a share of GDP, one value per country.
async function carte() {
  const annee = 2024;
  const brut = await eurostat(DATASET, `freq=A&unit=PC_GDP&sector=S13&na_item=D51B&time=${annee}`);
  const rows = brut.filter((r) => ISO3[r.geo]).map((r) => ({ code: ISO3[r.geo], valeur: arrondi(r.valeur), annee }))
    .sort((a, b) => b.valeur - a.valeur);
  if (rows.length < 20) throw new Error("Eurostat D51B : moins de 20 pays, le jeu a changé");
  await save("data/fiscalite/is-recettes-europe-2024", rows, {
    titre: "Recettes de l'impôt sur les bénéfices des sociétés, en % du PIB, 2024",
    producteur: "Eurostat, comptes nationaux des administrations publiques",
    jeu: `${DATASET} (secteur S13, poste D51B, unité PC_GDP, année ${annee})`,
    url: PAGE,
    traitement: "Arrondi à une décimale. L'Allemagne, l'Espagne et la Hongrie ne publient pas le poste D51B dans ce jeu : elles n'apparaissent pas.",
  });
}

// Same item over time for three countries whose corporate tax receipts diverge.
async function serie() {
  const pays = { FR: "France", IE: "Irlande", LU: "Luxembourg" };
  const brut = await eurostat(DATASET, `freq=A&unit=PC_GDP&sector=S13&na_item=D51B&sinceTimePeriod=2005&${Object.keys(pays).map((g) => `geo=${g}`).join("&")}`);
  const rows = brut.map((r) => ({ annee: Number(r.time), pays: pays[r.geo], recettes_is_pib: arrondi(r.valeur) }))
    .sort((a, b) => a.pays.localeCompare(b.pays) || a.annee - b.annee);
  if (rows.length < 40) throw new Error("Eurostat D51B : séries incomplètes");
  await save("data/fiscalite/is-recettes-serie", rows, {
    titre: "Recettes de l'impôt sur les bénéfices des sociétés, en % du PIB, France, Irlande et Luxembourg, 2005 à 2024",
    producteur: "Eurostat, comptes nationaux des administrations publiques",
    jeu: `${DATASET} (secteur S13, poste D51B, unité PC_GDP)`,
    url: PAGE,
    traitement: "Arrondi à une décimale. Le dénominateur est le PIB de chaque pays, lui-même affecté par les profits des multinationales (Tørsløv, Wier et Zucman, 2018, rév. 2020).",
  });
}

// Table 2 of Tørsløv, Wier, Zucman (NBER WP 24701, rev. April 2020), 2015, current billion US$. "Shifted profits" is negative for a haven
// (profits received). Every figure below is a line of that printed table.
const TWZ = {
  titre: "The Missing Profits of Nations, tableau 2 : profits transférés, estimations par pays (2015)",
  producteur: "Thomas Tørsløv, Ludvig Wier, Gabriel Zucman, NBER Working Paper 24701 (juin 2018, révisé en avril 2020)",
  url: "https://www.nber.org/system/files/working_papers/w24701/w24701.pdf",
};
async function transferts() {
  const havres = [
    ["Irlande", 106], ["Îles des Caraïbes", 97], ["Singapour", 70], ["Suisse", 58], ["Pays-Bas", 57], ["Luxembourg", 47],
    ["Porto Rico", 42], ["Hong Kong", 39], ["Bermudes", 24], ["Belgique", 13], ["Malte", 12],
  ];
  await save("data/fiscalite/profits-recus-par-havre-2015", havres.map(([havre, milliards_usd]) => ({ havre, milliards_usd })), {
    ...TWZ,
    jeu: "Colonne « Shifted profits » du tableau 2, valeurs négatives prises en valeur absolue (profits reçus)",
    traitement: "Saisie manuelle des onze lignes de havres du tableau, en milliards de dollars courants de 2015. Les auteurs précisent que l'attribution à un havre précis comporte une marge d'erreur, sans effet sur le total mondial.",
  });
  const pays = { France: [32, 21], Allemagne: [55, 28], Italie: [23, 19] };
  const rows = Object.entries(pays).flatMap(([entite, [profits, perte]]) => [
    { entite, indicateur: "Profits transférés vers les paradis fiscaux", valeur: profits, unite: "milliards USD", periode: "2015" },
    { entite, indicateur: "Perte de recettes d'IS due au transfert", valeur: perte, unite: "% des recettes collectées", periode: "2015" },
  ]);
  await save("data/fiscalite/comparatif-transferts-2015", rows, {
    ...TWZ,
    jeu: "Colonnes « Shifted profits » et « Corp. tax revenue loss/gain (% collected) » du tableau 2, lignes France, Germany, Italy",
    traitement: "Saisie manuelle de trois lignes du tableau. Estimations de modèle pour 2015, pas des montants observés.",
  });
}

await carte();
await serie();
await transferts();
