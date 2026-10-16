// Snapshot datasets (one value per entity, one date) behind <Hemicycle>, <Carte> and <Comparatif>.
// Run through `npm run fetch-data`, never edit the generated CSV by hand.
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";

// Seat count per group, read from the Assemblée nationale's own list ("Nom du groupe (effectif)").
async function assemblee() {
  const url = "https://www2.assemblee-nationale.fr/deputes/liste/groupe-politique";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Assemblée nationale : ${res.status}`);
  const texte = (await res.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "\n");
  const rows = [...texte.matchAll(/^\s*([^\n(]+?)\s*\((\d+)\)\s*$/gm)]
    .map((m) => ({ groupe: m[1].replace(/&amp;/g, "&").replace(/&#039;/g, "'"), sieges: Number(m[2]) }))
    .sort((a, b) => b.sieges - a.sieges);
  if (rows.length < 5) throw new Error("Assemblée nationale : liste des groupes introuvable, la page a changé");
  await save("data/pouvoir/assemblee-groupes", rows, {
    titre: "Effectifs des groupes politiques de l'Assemblée nationale, XVIIe législature",
    producteur: "Assemblée nationale",
    jeu: "Liste des députés par groupe politique",
    url,
    traitement: "Effectifs tels que publiés.",
  });
}

// Latest SIPRI year for every European country on the map; the build refuses a mix of years.
async function depensesMilitairesEurope() {
  const codes = "ALB;AUT;BLR;BEL;BIH;BGR;HRV;CYP;CZE;DNK;EST;FIN;FRA;DEU;GRC;HUN;ISL;IRL;ITA;LVA;LTU;LUX;MLT;MDA;MNE;NLD;MKD;NOR;POL;PRT;ROU;RUS;SRB;SVK;SVN;ESP;SWE;CHE;UKR;GBR;TUR";
  const indicateur = "MS.MIL.XPND.GD.ZS";
  const res = await fetch(`https://api.worldbank.org/v2/country/${codes}/indicator/${indicateur}?format=json&per_page=500&date=2025`);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const [, data] = await res.json();
  const rows = data.filter((d) => d.value != null).map((d) => ({ code: d.countryiso3code, valeur: Math.round(d.value * 100) / 100, annee: Number(d.date) }))
    .sort((a, b) => b.valeur - a.valeur);
  await save("data/defense/depenses-militaires-europe-2025", rows, {
    titre: "Dépenses militaires des pays européens, en % du PIB, 2025",
    producteur: "SIPRI Military Expenditure Database, diffusé par la Banque mondiale",
    jeu: indicateur,
    url: `https://data.worldbank.org/indicator/${indicateur}`,
    traitement: "Arrondi à deux décimales. Année 2025 pour tous les pays du jeu.",
  });
}

// France, Germany and Italy on the three public-finance ratios the euro rules revolve around.
async function comparatifFinancesPubliques() {
  const pays = { FR: "France", DE: "Allemagne", IT: "Italie" };
  const mesures = {
    GD: { indicateur: "Dette publique brute", signe: 1 },
    B9: { indicateur: "Déficit public", signe: -1 }, // published as a balance: a deficit is negative
    D41PAY: { indicateur: "Intérêts de la dette", signe: 1 },
  };
  const annee = "2025";
  const brut = await eurostat("gov_10dd_edpt1", `unit=PC_GDP&sector=S13&freq=A&time=${annee}&${Object.keys(pays).map((g) => `geo=${g}`).join("&")}&${Object.keys(mesures).map((m) => `na_item=${m}`).join("&")}`);
  const rows = Object.keys(mesures).flatMap((m) => Object.keys(pays).map((g) => {
    const cell = brut.find((r) => r.na_item === m && r.geo === g);
    if (!cell) throw new Error(`Eurostat : pas de valeur pour ${g} / ${m} en ${annee}`);
    return { entite: pays[g], indicateur: mesures[m].indicateur, valeur: Math.round(cell.valeur * mesures[m].signe * 10) / 10, unite: "% du PIB", periode: annee };
  }));
  await save("data/economie/comparatif-finances-publiques-2025", rows, {
    titre: "Dette, déficit et intérêts des administrations publiques, en % du PIB, 2025",
    producteur: "Eurostat",
    jeu: "gov_10dd_edpt1 (secteur S13 ; postes GD, B9, D41PAY)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table",
    traitement: "Déficit = solde publié (B9) changé de signe. Arrondi à une décimale.",
  });
}

await assemblee();
await depensesMilitairesEurope();
await comparatifFinancesPubliques();
