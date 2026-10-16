// Datasets behind the "Vieillissement, travail et démocraties" lesson. All Eurostat, fetched, never typed by hand.
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";
import { PAYS, ISO3, geosFrDeIt as geos } from "./lib/pays.mjs";

// France first: the chart colours follow the order of first appearance.
function serie(rows, mesure) {
  return Object.keys(PAYS).flatMap((g) => rows.filter((r) => r.geo === g).sort((a, b) => a.time - b.time)
    .map((r) => ({ annee: Number(r.time), pays: PAYS[g], [mesure]: Math.round(r.valeur * 10) / 10 })));
}

async function ageMedianEtDependance() {
  const dep = "https://ec.europa.eu/eurostat/databrowser/view/demo_pjanind/default/table";
  const med = serie(await eurostat("demo_pjanind", `indic_de=MEDAGEPOP&${geos}&sinceTimePeriod=1990`), "age_median");
  const old = serie(await eurostat("demo_pjanind", `indic_de=OLDDEP1&${geos}&sinceTimePeriod=1990`), "rapport");
  for (const [nom, rows] of [["âge médian", med], ["rapport de dépendance", old]]) if (rows.length < 60) throw new Error(`Eurostat : série ${nom} trop courte`);
  const fin = Math.max(...med.map((r) => r.annee));
  await save("data/societe/age-median-fr-de-it", med, {
    titre: `Âge médian de la population, France, Allemagne et Italie, jusqu'en ${fin}`,
    producteur: "Eurostat", jeu: "demo_pjanind (indicateur MEDAGEPOP)", url: dep,
    traitement: "Âge médian au 1er janvier de chaque année, en années, arrondi à une décimale. Séries publiées par Eurostat, sans retraitement. Le début de série varie selon le pays, d'après la disponibilité publiée par Eurostat.",
  });
  await save("data/societe/rapport-dependance-fr-de-it", old, {
    titre: `Rapport de dépendance des personnes âgées, France, Allemagne et Italie, jusqu'en ${fin}`,
    producteur: "Eurostat", jeu: "demo_pjanind (indicateur OLDDEP1)", url: dep,
    traitement: "Nombre de personnes de 65 ans et plus pour 100 personnes de 15 à 64 ans, au 1er janvier, arrondi à une décimale.",
  });
  return old;
}

async function emploiSeniors() {
  const rows = serie(await eurostat("lfsi_emp_a", `age=Y55-64&sex=T&indic_em=EMP_LFS&unit=PC_POP&${geos}&sinceTimePeriod=2005`), "taux");
  if (rows.length < 40) throw new Error("Eurostat : série emploi des 55-64 ans trop courte");
  await save("data/societe/emploi-55-64-fr-de-it", rows, {
    titre: `Taux d'emploi des 55 à 64 ans, France, Allemagne et Italie, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "lfsi_emp_a (âge Y55-64, sexes confondus, indicateur EMP_LFS, % de la population)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/lfsi_emp_a/default/table",
    traitement: "Part des personnes de 55 à 64 ans en emploi au sens de l'enquête Forces de travail, en % de la population du même âge, arrondie à une décimale. Début de série variable selon le pays (France 2005, Allemagne et Italie 2009), d'après la disponibilité publiée par Eurostat.",
  });
  return rows;
}

async function depensesVieillesse() {
  const rows = serie(await eurostat("gov_10a_exp", `cofog99=GF1002&sector=S13&na_item=TE&unit=PC_GDP&${geos}&sinceTimePeriod=1995`), "part_pib");
  if (rows.length < 60) throw new Error("Eurostat : série dépenses de vieillesse trop courte");
  await save("data/societe/depenses-vieillesse-fr-de-it", rows, {
    titre: `Dépenses publiques de vieillesse, en % du PIB, France, Allemagne et Italie, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "gov_10a_exp (COFOG GF1002 « Vieillesse », administrations publiques S13, total des dépenses TE)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_exp/default/table",
    traitement: "Dépenses des administrations publiques classées en fonction « Vieillesse » (division 10.2 de la COFOG), en % du PIB, arrondies à une décimale. Début de série variable selon le pays (France 1995, Allemagne 2000, Italie 2001), d'après la disponibilité publiée par Eurostat.",
  });
  return rows;
}

// Share of people aged 65 and over among those aged 20 and over: a proxy for the weight of older people among adults, not the electorate.
async function partAdultes65() {
  const annee = 2025;
  const brut = await eurostat("demo_pjangroup", `sex=T&unit=NR&${geos}&time=${annee}&age=TOTAL&age=Y_LT5&age=Y5-9&age=Y10-14&age=Y15-19&age=Y65-69&age=Y70-74&age=Y75-79&age=Y80-84&age=Y_GE85`);
  const v = (g, a) => brut.find((r) => r.geo === g && r.age === a)?.valeur ?? (() => { throw new Error(`Eurostat : ${g} ${a} absent`); })();
  return Object.keys(PAYS).map((g) => {
    const adultes = v(g, "TOTAL") - ["Y_LT5", "Y5-9", "Y10-14", "Y15-19"].reduce((s, a) => s + v(g, a), 0);
    const vieux = ["Y65-69", "Y70-74", "Y75-79", "Y80-84", "Y_GE85"].reduce((s, a) => s + v(g, a), 0);
    return { g, valeur: Math.round((1000 * vieux) / adultes) / 10, annee };
  });
}

// One value per country on the map, one year for all (the build refuses a mix).
async function carteAgeMedian() {
  const annee = 2025;
  const geoList = Object.keys(ISO3).map((g) => `geo=${g}`).join("&");
  const brut = await eurostat("demo_pjanind", `indic_de=MEDAGEPOP&${geoList}&time=${annee}`);
  const rows = brut.filter((r) => ISO3[r.geo]).map((r) => ({ code: ISO3[r.geo], valeur: Math.round(r.valeur * 10) / 10, annee }))
    .sort((a, b) => b.valeur - a.valeur);
  if (rows.length < 30) throw new Error("Eurostat : trop peu de pays pour la carte de l'âge médian");
  await save("data/societe/age-median-europe-2025", rows, {
    titre: `Âge médian de la population des pays européens, ${annee}`,
    producteur: "Eurostat", jeu: "demo_pjanind (indicateur MEDAGEPOP)", url: "https://ec.europa.eu/eurostat/databrowser/view/demo_pjanind/default/table",
    traitement: `Âge médian au 1er janvier ${annee}, arrondi à une décimale, pour tous les pays du jeu publiés par Eurostat parmi ceux dessinés sur la carte.`,
  });
}

// Life expectancy at 65, both sexes, in years.
async function esperanceVie65() {
  const brut = await eurostat("demo_mlexpec", `age=Y65&sex=T&${geos}&sinceTimePeriod=2005`);
  const rows = serie(brut, "annees");
  if (rows.length < 40) throw new Error("Eurostat : série d'espérance de vie à 65 ans trop courte");
  await save("data/societe/esperance-vie-65-fr-de-it", rows, {
    titre: `Espérance de vie à 65 ans, France, Allemagne et Italie, 2005-${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "demo_mlexpec (âge Y65, sexes confondus, en années)", url: "https://ec.europa.eu/eurostat/databrowser/view/demo_mlexpec/default/table",
    traitement: "Nombre d'années qu'une personne de 65 ans peut espérer vivre selon les taux de mortalité de l'année, arrondi à une décimale.",
  });
}

// Share of people aged 65 and over in the total population, baseline projection of Eurostat (EUROPOP2023), for 2025, 2050 and 2100.
async function projection65() {
  const brut = await eurostat("proj_23np", `projection=BSL&sex=T&${geos}&time=2025&time=2050&time=2100&age=TOTAL&age=Y_GE65`);
  const part = (g, a) => {
    const v = (age) => brut.find((r) => r.geo === g && r.age === age && Number(r.time) === a)?.valeur;
    if (!v("TOTAL") || !v("Y_GE65")) throw new Error(`Eurostat : projection ${g} ${a} absente`);
    return Math.round((1000 * v("Y_GE65")) / v("TOTAL")) / 10;
  };
  const rows = Object.entries(PAYS).flatMap(([g, pays]) => [2025, 2050, 2100].map((a) => ({
    entite: pays, indicateur: `65 ans et plus dans la population en ${a}`, valeur: part(g, a), unite: "%", periode: String(a),
  })));
  await save("data/societe/projection-65-plus-fr-de-it", rows, {
    titre: "Part des 65 ans et plus dans la population, projection de référence d'Eurostat, France, Allemagne et Italie, 2025, 2050 et 2100",
    producteur: "Eurostat", jeu: "proj_23np (EUROPOP2023, projection de référence BSL, population au 1er janvier)", url: "https://ec.europa.eu/eurostat/databrowser/view/proj_23np/default/table",
    traitement: "Population de 65 ans et plus divisée par la population totale, au 1er janvier de l'année indiquée, en %, arrondie à une décimale. Il s'agit d'une projection de référence (BSL) : les années 2050 et 2100 sont des scénarios, non des observations.",
  });
}

const dependance = await ageMedianEtDependance();
await esperanceVie65();
await projection65();
const emploi = await emploiSeniors();
const depenses = await depensesVieillesse();
const adultes = await partAdultes65();
await carteAgeMedian();

// The five latest values side by side: every cell is a value saved above, never typed.
const dernier = (rows, pays, mesure) => rows.filter((r) => r.pays === pays).sort((a, b) => a.annee - b.annee).at(-1);
const comparatif = Object.entries(PAYS).flatMap(([g, pays]) => {
  const dep = dernier(dependance, pays, "rapport"), emp = dernier(emploi, pays, "taux"), dsp = dernier(depenses, pays, "part_pib");
  const adu = adultes.find((a) => a.g === g);
  return [
    { entite: pays, indicateur: "65 ans et plus parmi les 20 ans et plus", valeur: adu.valeur, unite: "%", periode: String(adu.annee) },
    { entite: pays, indicateur: "65 ans et plus pour 100 personnes de 15 à 64 ans", valeur: dep.rapport, unite: "pour 100", periode: String(dep.annee) },
    { entite: pays, indicateur: "Taux d'emploi des 55 à 64 ans", valeur: emp.taux, unite: "%", periode: String(emp.annee) },
    { entite: pays, indicateur: "Dépenses publiques de vieillesse", valeur: dsp.part_pib, unite: "% du PIB", periode: String(dsp.annee) },
  ];
});
await save("data/societe/comparatif-vieillissement-fr-de-it", comparatif, {
  titre: "Vieillissement, emploi des seniors et dépenses de vieillesse, France, Allemagne et Italie, dernière année publiée",
  producteur: "Eurostat", jeu: "demo_pjangroup (population par groupe d'âge), demo_pjanind (OLDDEP1), lfsi_emp_a (55-64 ans), gov_10a_exp (COFOG GF1002)",
  url: "https://ec.europa.eu/eurostat/databrowser/view/demo_pjangroup/default/table",
  traitement: "Part des 65 ans et plus parmi les 20 ans et plus : somme des groupes 65-69, 70-74, 75-79, 80-84 et 85 ans et plus, divisée par la population totale moins les moins de 20 ans, au 1er janvier 2025, arrondie à une décimale (indicateur de poids des âgés parmi les adultes, qui ne mesure pas le corps électoral). Les autres lignes reprennent la dernière année publiée des séries saisies par le même script.",
});
