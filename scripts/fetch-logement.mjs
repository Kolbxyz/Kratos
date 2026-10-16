// Datasets behind the "Pauvreté, logement et gentrification" lesson. All Eurostat, fetched, never typed by hand.
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";
import { PAYS, ISO3, geosFrDeIt as geos } from "./lib/pays.mjs";

const arrondi = (v) => Math.round(v * 10) / 10;

// At-risk-of-poverty rate: share of people below 60 % of the national median equivalised income.
async function tauxPauvrete() {
  const brut = await eurostat("ilc_li02", `statinfo=MED_EI&rskpovth=B_60&unit=PC&age=TOTAL&sex=T&${geos}&sinceTimePeriod=2005`);
  const rows = Object.keys(PAYS).flatMap((g) => brut.filter((r) => r.geo === g).sort((a, b) => a.time - b.time)
    .map((r) => ({ annee: Number(r.time), pays: PAYS[g], taux: arrondi(r.valeur) })));
  if (rows.length < 40) throw new Error("Eurostat : série du taux de pauvreté trop courte");
  await save("data/societe/taux-pauvrete-fr-de-it", rows, {
    titre: `Taux de pauvreté monétaire (seuil de 60 % du revenu médian), France, Allemagne et Italie, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "ilc_li02 (statinfo MED_EI, seuil B_60 « sous 60 % », % de la population, tous âges, sexes confondus ; enquête EU-SILC)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/ilc_li02/default/table",
    traitement: "Part de la population dont le revenu équivalent est inférieur à 60 % du revenu équivalent médian national, arrondie à une décimale. Début de série variable selon le pays, d'après la disponibilité publiée par Eurostat. Eurostat signale des ruptures de série (drapeau « b »), notamment pour la France en 2020 et en 2022.",
  });
}

// Housing cost overburden: share of people living in a household where housing costs exceed 40 % of disposable income.
async function surchargeLogement() {
  const tenures = { TOTAL: "Ensemble de la population", OWN_L: "Propriétaires avec crédit", RENT_MKT: "Locataires au prix du marché", RENT_FR: "Locataires à loyer réduit ou gratuit" };
  const brut = await eurostat("ilc_lvho07c", `${geos}&${Object.keys(tenures).map((t) => `tenure=${t}`).join("&")}&sinceTimePeriod=2022`);
  const annee = Math.max(...brut.filter((r) => r.valeur != null).map((r) => Number(r.time)));
  const rows = Object.entries(PAYS).flatMap(([g, pays]) => Object.entries(tenures).map(([t, nom]) => {
    const cell = brut.find((r) => r.geo === g && r.tenure === t && Number(r.time) === annee);
    if (!cell) throw new Error(`Eurostat : pas de valeur pour ${g} / ${t} en ${annee}`);
    return { entite: pays, indicateur: nom, valeur: arrondi(cell.valeur), unite: "%", periode: String(annee) };
  }));
  await save(`data/societe/comparatif-surcharge-logement-fr-de-it-${annee}`, rows, {
    titre: `Taux de surcharge des coûts du logement selon le statut d'occupation, France, Allemagne et Italie, ${annee}`,
    producteur: "Eurostat", jeu: "ilc_lvho07c (surcharge des coûts du logement par statut d'occupation, % de la population ; enquête EU-SILC)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho07c/default/table",
    traitement: `Part de la population vivant dans un ménage dont les coûts du logement dépassent 40 % du revenu disponible, selon le statut d'occupation du logement, année ${annee} pour tous les pays, arrondie à une décimale.`,
  });
  // Same indicator, all European countries of the map.
  const geoList = Object.keys(ISO3).map((g) => `geo=${g}`).join("&");
  const europe = await eurostat("ilc_lvho07c", `tenure=TOTAL&${geoList}&time=${annee}`);
  const carte = europe.filter((r) => ISO3[r.geo]).map((r) => ({ code: ISO3[r.geo], valeur: arrondi(r.valeur), annee })).sort((a, b) => b.valeur - a.valeur);
  if (carte.length < 25) throw new Error("Eurostat : trop peu de pays pour la carte de la surcharge du logement");
  await save(`data/societe/surcharge-logement-europe-${annee}`, carte, {
    titre: `Taux de surcharge des coûts du logement des pays européens, ${annee}`,
    producteur: "Eurostat", jeu: "ilc_lvho07c (tenure TOTAL)", url: "https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho07c/default/table",
    traitement: `Part de la population vivant dans un ménage dont les coûts du logement dépassent 40 % du revenu disponible, ensemble des statuts d'occupation, année ${annee}, arrondie à une décimale, pour les pays du jeu publiés par Eurostat parmi ceux dessinés sur la carte.`,
  });
  return annee;
}

// France: house prices, rents and overall consumer prices, rebased to 2015 = 100 by dividing each series by its own 2015 value.
async function prixFrance() {
  const hpi = await eurostat("prc_hpi_a", "geo=FR&unit=I15_A_AVG&purchase=TOTAL&sinceTimePeriod=2005");
  const hicp = await eurostat("prc_hicp_aind", "geo=FR&unit=INX_A_AVG&coicop=CP041&coicop=CP00&sinceTimePeriod=2005");
  const series = {
    "Prix des logements": hpi.map((r) => ({ a: Number(r.time), v: r.valeur })),
    "Loyers": hicp.filter((r) => r.coicop === "CP041").map((r) => ({ a: Number(r.time), v: r.valeur })),
    "Prix à la consommation (ensemble)": hicp.filter((r) => r.coicop === "CP00").map((r) => ({ a: Number(r.time), v: r.valeur })),
  };
  const rows = Object.entries(series).flatMap(([nom, s]) => {
    const base = s.find((x) => x.a === 2015)?.v;
    if (!base) throw new Error(`Eurostat : pas de valeur 2015 pour « ${nom} »`);
    return s.sort((x, y) => x.a - y.a).map((x) => ({ annee: x.a, indice: nom, valeur: arrondi((100 * x.v) / base) }));
  });
  await save("data/societe/prix-logements-loyers-france", rows, {
    titre: `Prix des logements, loyers et prix à la consommation en France, base 100 en 2015, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "prc_hpi_a (indice des prix des logements, total) ; prc_hicp_aind (IPCH : CP041 loyers effectifs, CP00 ensemble)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/prc_hpi_a/default/table",
    traitement: "Moyennes annuelles. Chaque série est rebasée à 100 en 2015 en la divisant par sa propre valeur de 2015, puis arrondie à une décimale, pour que les trois courbes partent du même point.",
  });
}

// Poverty rate by age group, latest year common to the three countries.
async function pauvreteParAge() {
  const ages = { Y_LT18: "Moins de 18 ans", "Y18-64": "18 à 64 ans", Y_GE65: "65 ans et plus" };
  const brut = await eurostat("ilc_li02", `statinfo=MED_EI&rskpovth=B_60&unit=PC&sex=T&${geos}&${Object.keys(ages).map((a) => `age=${a}`).join("&")}&sinceTimePeriod=2023`);
  const annee = Math.max(...brut.map((r) => Number(r.time)).filter((a) => Object.keys(PAYS).every((g) => Object.keys(ages).every((k) => brut.some((r) => r.geo === g && r.age === k && Number(r.time) === a)))));
  const rows = Object.entries(PAYS).flatMap(([g, pays]) => Object.entries(ages).map(([k, nom]) => ({
    entite: pays, indicateur: `Taux de pauvreté : ${nom.toLowerCase()}`, valeur: arrondi(brut.find((r) => r.geo === g && r.age === k && Number(r.time) === annee).valeur), unite: "%", periode: String(annee),
  })));
  await save(`data/societe/comparatif-pauvrete-age-fr-de-it-${annee}`, rows, {
    titre: `Taux de pauvreté monétaire par groupe d'âge, France, Allemagne et Italie, ${annee}`,
    producteur: "Eurostat", jeu: "ilc_li02 (seuil B_60, âges Y_LT18, Y18-64, Y_GE65 ; enquête EU-SILC)", url: "https://ec.europa.eu/eurostat/databrowser/view/ilc_li02/default/table",
    traitement: `Part de chaque groupe d'âge sous 60 % du revenu équivalent médian national, année ${annee}, arrondie à une décimale.`,
  });
  return annee;
}

// In-work at-risk-of-poverty rate, employed people aged 18 to 64.
async function pauvreteAuTravail() {
  const brut = await eurostat("ilc_iw01", `age=Y18-64&sex=T&wstatus=EMP&${geos}&sinceTimePeriod=2010`);
  const rows = Object.keys(PAYS).flatMap((g) => brut.filter((r) => r.geo === g).sort((a, b) => a.time - b.time)
    .map((r) => ({ annee: Number(r.time), pays: PAYS[g], taux: arrondi(r.valeur) })));
  if (rows.length < 40) throw new Error("Eurostat : série de la pauvreté au travail trop courte");
  await save("data/societe/pauvrete-au-travail-fr-de-it", rows, {
    titre: `Taux de pauvreté des personnes en emploi de 18 à 64 ans, France, Allemagne et Italie, jusqu'en ${Math.max(...rows.map((r) => r.annee))}`,
    producteur: "Eurostat", jeu: "ilc_iw01 (âge Y18-64, sexes confondus, statut EMP : personnes en emploi ; enquête EU-SILC)", url: "https://ec.europa.eu/eurostat/databrowser/view/ilc_iw01/default/table",
    traitement: "Part des personnes en emploi de 18 à 64 ans dont le revenu équivalent du ménage est sous 60 % du revenu équivalent médian national, arrondie à une décimale. Début de série variable selon le pays, d'après la disponibilité publiée par Eurostat.",
  });
}

await tauxPauvrete();
await pauvreteParAge();
await pauvreteAuTravail();
await surchargeLogement();
await prixFrance();
