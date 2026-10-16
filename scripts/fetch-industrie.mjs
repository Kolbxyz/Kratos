// Datasets behind the "Désindustrialisation et tertiarisation" lesson. Eurostat (employment by branch) and the World Bank (value added).
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";
import { PAYS, geosFrDeIt as geos } from "./lib/pays.mjs";

const ISO3 = { FR: "FRA", DE: "DEU", IT: "ITA" };
const SERVICES = ["G-I", "J", "K", "L", "M_N", "O-Q", "R-U"];
const urlEmploi = "https://ec.europa.eu/eurostat/databrowser/view/nama_10_a10_e/default/table";

// Share of employment (domestic concept, thousand persons) held by industry (NACE B-E) and by services (NACE G-U), per country and year.
async function emploi() {
  const branches = ["TOTAL", "B-E", ...SERVICES].map((b) => `nace_r2=${b}`).join("&");
  const brut = await eurostat("nama_10_a10_e", `unit=THS_PER&na_item=EMP_DC&${geos}&${branches}&sinceTimePeriod=1975`);
  const part = (pays, g, branchesCalcul) => {
    const annees = [...new Set(brut.filter((r) => r.geo === g && r.nace_r2 === "TOTAL").map((r) => Number(r.time)))].sort((a, b) => a - b);
    return annees.flatMap((a) => {
      const v = (b) => brut.find((r) => r.geo === g && r.nace_r2 === b && Number(r.time) === a)?.valeur;
      const parts = branchesCalcul.map(v);
      if (parts.some((x) => x == null) || v("TOTAL") == null) return [];
      return [{ annee: a, pays, part: Math.round((1000 * parts.reduce((s, x) => s + x, 0)) / v("TOTAL")) / 10 }];
    });
  };
  const industrie = Object.entries(PAYS).flatMap(([g, p]) => part(p, g, ["B-E"]));
  const services = Object.entries(PAYS).flatMap(([g, p]) => part(p, g, SERVICES));
  if (industrie.length < 60 || services.length < 60) throw new Error("Eurostat : séries d'emploi par branche trop courtes");
  const fin = Math.max(...industrie.map((r) => r.annee));
  const meta = { producteur: "Eurostat", jeu: "nama_10_a10_e (emploi, concept intérieur EMP_DC, milliers de personnes, branches NACE rév. 2)", url: urlEmploi };
  await save("data/economie/emploi-industrie-part-fr-de-it", industrie, {
    ...meta, titre: `Part de l'industrie (NACE B à E) dans l'emploi total, France, Allemagne et Italie, jusqu'en ${fin}`,
    traitement: "Emploi de la branche B à E (industries extractives, manufacturières, énergie, eau, déchets) divisé par l'emploi total, en %, arrondi à une décimale. La construction (F) n'est pas incluse. Début de série variable selon le pays, d'après la disponibilité publiée par Eurostat.",
  });
  await save("data/economie/emploi-services-part-fr-de-it", services, {
    ...meta, titre: `Part des services (NACE G à U) dans l'emploi total, France, Allemagne et Italie, jusqu'en ${fin}`,
    traitement: "Somme des branches G-I, J, K, L, M_N, O-Q et R-U (services marchands et non marchands, administration publique, éducation et santé comprises) divisée par l'emploi total, en %, arrondie à une décimale. Début de série variable selon le pays, d'après la disponibilité publiée par Eurostat.",
  });
  return { industrie, services };
}

// Manufacturing value added as a share of GDP, World Bank national accounts series, 1970 onwards.
async function valeurAjoutee() {
  const indicateur = "NV.IND.MANF.ZS";
  const res = await fetch(`https://api.worldbank.org/v2/country/${Object.values(ISO3).join(";")}/indicator/${indicateur}?format=json&per_page=500&date=1970:2025`);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const [, data] = await res.json();
  const rows = Object.entries(PAYS).flatMap(([g, pays]) => data.filter((d) => d.countryiso3code === ISO3[g] && d.value != null)
    .map((d) => ({ annee: Number(d.date), pays, part_pib: Math.round(d.value * 10) / 10 })).sort((a, b) => a.annee - b.annee));
  if (rows.length < 100) throw new Error("World Bank : séries de valeur ajoutée manufacturière trop courtes");
  await save("data/economie/industrie-manufacturiere-part-pib-fr-de-it", rows, {
    titre: `Valeur ajoutée de l'industrie manufacturière, en % du PIB, France, Allemagne et Italie, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Banque mondiale, comptes nationaux (données de la Banque mondiale et de l'OCDE)", jeu: indicateur,
    url: `https://data.worldbank.org/indicator/${indicateur}`,
    traitement: "Valeur ajoutée de l'industrie manufacturière en % du PIB, arrondie à une décimale. Début de série variable selon le pays (France 1970, Allemagne 1991, Italie 1990), d'après la disponibilité publiée par la Banque mondiale.",
  });
  return rows;
}

// Labour productivity: value added in volume (chain-linked 2020 euros) per person employed, industry (B-E) against the whole economy.
async function productivite() {
  const va = await eurostat("nama_10_a10", `unit=CLV20_MEUR&na_item=B1G&${geos}&nace_r2=B-E&nace_r2=TOTAL&sinceTimePeriod=2000`);
  const emp = await eurostat("nama_10_a10_e", `unit=THS_PER&na_item=EMP_DC&${geos}&nace_r2=B-E&nace_r2=TOTAL&sinceTimePeriod=2000`);
  const noms = { "B-E": "Industrie", TOTAL: "Ensemble de l'économie" };
  const prod = (g, n, a) => {
    const v = va.find((r) => r.geo === g && r.nace_r2 === n && Number(r.time) === a)?.valeur;
    const e = emp.find((r) => r.geo === g && r.nace_r2 === n && Number(r.time) === a)?.valeur;
    return v && e ? v / e : null;
  };
  const annees = [...new Set(va.map((r) => Number(r.time)))].sort((a, b) => a - b);
  const fin = Math.max(...annees.filter((a) => Object.keys(PAYS).every((g) => ["B-E", "TOTAL"].every((n) => prod(g, n, a)))));
  const indice = Object.keys(noms).flatMap((n) => annees.filter((a) => a <= fin).flatMap((a) => {
    const p0 = prod("FR", n, 2000), p = prod("FR", n, a);
    return p0 && p ? [{ annee: a, branche: noms[n], indice: Math.round((1000 * p) / p0) / 10 }] : [];
  }));
  await save("data/economie/productivite-france-industrie-ensemble", indice, {
    titre: `Productivité apparente du travail en France, industrie et ensemble de l'économie, base 100 en 2000, jusqu'en ${fin}`,
    producteur: "Eurostat", jeu: "nama_10_a10 (valeur ajoutée brute, volumes chaînés 2020, B1G) divisée par nama_10_a10_e (emploi, concept intérieur)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_a10/default/table",
    traitement: "Valeur ajoutée brute en volume (millions d'euros 2020) divisée par l'emploi en milliers de personnes, rebasée à 100 en 2000 par division par la valeur de l'année 2000, arrondie à une décimale. Mesure par personne en emploi (non par heure travaillée).",
  });
  const rows = Object.entries(PAYS).flatMap(([g, pays]) => Object.entries(noms).map(([n, nom]) => ({
    entite: pays, indicateur: `Productivité par emploi : ${nom.toLowerCase()}`,
    valeur: Math.round(1000 * (prod(g, n, fin) / prod(g, n, 2000) - 1)) / 10, unite: "% de hausse", periode: `2000-${fin}`,
  })));
  await save("data/economie/comparatif-productivite-fr-de-it", rows, {
    titre: `Hausse de la productivité apparente du travail, industrie et ensemble de l'économie, France, Allemagne et Italie, 2000-${fin}`,
    producteur: "Eurostat", jeu: "nama_10_a10 (B1G, volumes chaînés 2020) et nama_10_a10_e (EMP_DC)", url: "https://ec.europa.eu/eurostat/databrowser/view/nama_10_a10/default/table",
    traitement: `Hausse en % de la valeur ajoutée en volume par personne en emploi entre 2000 et ${fin}, arrondie à une décimale. Chaque ligne est calculée à partir des séries Eurostat de la branche B à E (industrie hors construction) ou du total.`,
  });
}

const { industrie, services } = await emploi();
await productivite();
const va = await valeurAjoutee();

// Latest common year for the side-by-side table: every cell comes from a series saved above.
const annee = 2024;
const val = (rows, pays, k) => rows.find((r) => r.pays === pays && r.annee === annee)?.[k] ?? (() => { throw new Error(`${pays} ${annee} absent`); })();
const comparatif = Object.values(PAYS).flatMap((pays) => [
  { entite: pays, indicateur: "Part de l'industrie dans l'emploi", valeur: val(industrie, pays, "part"), unite: "%", periode: String(annee) },
  { entite: pays, indicateur: "Part des services dans l'emploi", valeur: val(services, pays, "part"), unite: "%", periode: String(annee) },
  { entite: pays, indicateur: "Industrie manufacturière dans le PIB", valeur: val(va, pays, "part_pib"), unite: "% du PIB", periode: String(annee) },
]);
await save("data/economie/comparatif-industrie-fr-de-it-2024", comparatif, {
  titre: `Industrie et services dans l'emploi et la valeur ajoutée, France, Allemagne et Italie, ${annee}`,
  producteur: "Eurostat et Banque mondiale", jeu: "nama_10_a10_e (emploi par branche) ; NV.IND.MANF.ZS (valeur ajoutée manufacturière)",
  url: urlEmploi,
  traitement: `Année ${annee} pour toutes les lignes. Les valeurs reprennent les séries enregistrées par le même script (parts de l'emploi calculées à partir de nama_10_a10_e, valeur ajoutée de la Banque mondiale).`,
});
