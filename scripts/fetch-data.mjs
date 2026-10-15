// Re-downloads every automated dataset so figures can be re-checked against their source at any time.
import { writeFile } from "node:fs/promises";

const today = new Date().toISOString().slice(0, 10);

async function save(base, rows, meta) {
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => r[c]).join(","))].join("\n") + "\n";
  await writeFile(`${base}.csv`, csv);
  await writeFile(`${base}.source.json`, JSON.stringify({ ...meta, consulte: today }, null, 2) + "\n");
  console.log(`${base}.csv: ${rows.length} lignes`);
}

async function eurostatDebt() {
  // France first: the first series takes the primary colour slot.
  const geos = { FR: "France", DE: "Allemagne", IT: "Italie" };
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1" +
    "?unit=PC_GDP&sector=S13&na_item=GD&freq=A&format=JSON&lang=fr&" +
    Object.keys(geos).map((g) => `geo=${g}`).join("&");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Eurostat ${res.status}`);
  const j = await res.json();
  const geoIdx = j.dimension.geo.category.index;
  const timeIdx = j.dimension.time.category.index;
  const nTime = Object.keys(timeIdx).length;
  const rows = [];
  for (const [geo, gi] of Object.entries(geoIdx)) {
    for (const [year, ti] of Object.entries(timeIdx)) {
      const v = j.value[gi * nTime + ti];
      if (v != null) rows.push({ annee: Number(year), pays: geos[geo], dette_pib: v });
    }
  }
  const order = Object.values(geos);
  rows.sort((a, b) => order.indexOf(a.pays) - order.indexOf(b.pays) || a.annee - b.annee);
  await save("data/dette/dette-pib", rows, {
    titre: "Dette publique brute au sens de Maastricht, en % du PIB",
    producteur: "Eurostat",
    jeu: "gov_10dd_edpt1 (secteur S13, administrations publiques)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10dd_edpt1/default/table",
    traitement: "Aucun : valeurs telles que publiées.",
  });
}

// One series per country; France first so it takes the primary colour slot.
async function worldBankSeries(indicator, countries, col, base, meta, from = 0, to = 9999) {
  const rows = [];
  for (const [iso, name] of Object.entries(countries)) {
    const res = await fetch(`https://api.worldbank.org/v2/country/${iso}/indicator/${indicator}?format=json&per_page=200`);
    if (!res.ok) throw new Error(`World Bank ${res.status}`);
    const [, data] = await res.json();
    for (const d of data) {
      if (d.value != null && Number(d.date) >= from && Number(d.date) <= to) rows.push({ annee: Number(d.date), pays: name, [col]: Math.round(d.value * 100) / 100 });
    }
  }
  const order = Object.values(countries);
  rows.sort((a, b) => order.indexOf(a.pays) - order.indexOf(b.pays) || a.annee - b.annee);
  await save(base, rows, { producteur: "Banque mondiale", jeu: indicator, url: `https://data.worldbank.org/indicator/${indicator}`, ...meta });
}

// Latest available year for each country, sorted for a ranked bar chart.
async function worldBankLatest(indicator, countries, col, base, meta) {
  const res = await fetch(`https://api.worldbank.org/v2/country/${Object.keys(countries).join(";")}/indicator/${indicator}?format=json&per_page=100&mrv=1`);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const [, data] = await res.json();
  const rows = data.filter((d) => d.value != null)
    .map((d) => ({ pays: countries[d.countryiso3code], [col]: Math.round(d.value * 100) / 100, annee: Number(d.date) }))
    .sort((a, b) => b[col] - a[col]);
  await save(base, rows, { producteur: "SIPRI Military Expenditure Database, diffusé par la Banque mondiale", jeu: indicator, url: `https://data.worldbank.org/indicator/${indicator}`, ...meta });
}

async function eurostatExpenditure() {
  const geos = { FR: "France", DE: "Allemagne", EU27_2020: "Union européenne (27)" };
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10a_main" +
    "?unit=PC_GDP&sector=S13&na_item=TE&freq=A&format=JSON&lang=fr&" +
    Object.keys(geos).map((g) => `geo=${g}`).join("&");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Eurostat ${res.status}`);
  const j = await res.json();
  const geoIdx = j.dimension.geo.category.index;
  const timeIdx = j.dimension.time.category.index;
  const nTime = Object.keys(timeIdx).length;
  const rows = [];
  for (const [geo, gi] of Object.entries(geoIdx)) {
    for (const [year, ti] of Object.entries(timeIdx)) {
      const v = j.value[gi * nTime + ti];
      if (v != null) rows.push({ annee: Number(year), pays: geos[geo], depenses_pib: v });
    }
  }
  const order = Object.values(geos);
  rows.sort((a, b) => order.indexOf(a.pays) - order.indexOf(b.pays) || a.annee - b.annee);
  await save("data/economie/depenses-publiques", rows, {
    titre: "Dépenses totales des administrations publiques, en % du PIB",
    producteur: "Eurostat",
    jeu: "gov_10a_main (secteur S13, poste TE)",
    url: "https://ec.europa.eu/eurostat/databrowser/view/gov_10a_main/default/table",
    traitement: "Aucun : valeurs telles que publiées.",
  });
}

// FRED monthly series averaged per year: the chart tells a decade-long story, not monthly noise.
async function fredFranc() {
  const res = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=EXFRUS");
  if (!res.ok) throw new Error(`FRED ${res.status}`);
  const byYear = {};
  for (const line of (await res.text()).trim().split("\n").slice(1)) {
    const [date, v] = line.split(",");
    if (v && v !== ".") (byYear[date.slice(0, 4)] ??= []).push(Number(v));
  }
  const rows = Object.entries(byYear)
    .filter(([, vs]) => vs.length === 12)
    .map(([y, vs]) => ({ annee: Number(y), francs_par_dollar: Math.round((vs.reduce((a, b) => a + b) / 12) * 100) / 100 }));
  await save("data/monnaie/franc-dollar", rows, {
    titre: "Francs français pour un dollar américain, moyenne annuelle",
    producteur: "Board of Governors of the Federal Reserve System, via FRED (Federal Reserve Bank of St. Louis)",
    jeu: "EXFRUS, taux de change mensuel",
    url: "https://fred.stlouisfed.org/series/EXFRUS",
    traitement: "Moyenne des 12 valeurs mensuelles de chaque année complète.",
  });
}

await eurostatDebt();
await worldBankSeries("MS.MIL.XPND.GD.ZS", { FRA: "France", DEU: "Allemagne", GBR: "Royaume-Uni" }, "depenses_pib", "data/defense/depenses-militaires-pib", {
  titre: "Dépenses militaires, en % du PIB",
  producteur: "SIPRI Military Expenditure Database, diffusé par la Banque mondiale",
  traitement: "Arrondi à deux décimales. Allemagne : RFA avant 1991.",
});
await worldBankSeries("FP.CPI.TOTL.ZG", { FRA: "France", DEU: "Allemagne", USA: "États-Unis" }, "inflation", "data/economie/inflation", {
  titre: "Inflation, prix à la consommation, variation annuelle en %",
  traitement: "Arrondi à deux décimales. Allemagne : RFA avant 1991.",
});
await worldBankSeries("NE.TRD.GNFS.ZS", { FRA: "France", CHN: "Chine", WLD: "Monde" }, "commerce_pib", "data/economie/ouverture-commerciale", {
  titre: "Commerce (exportations + importations de biens et services), en % du PIB",
  traitement: "Arrondi à deux décimales. Série arrêtée en 2024 : la valeur mondiale provisoire de 2025 (68,5 %) repose sur un agrégat encore incomplet.",
}, 1970, 2024);
await worldBankLatest("MS.MIL.XPND.GD.ZS", {
  POL: "Pologne", EST: "Estonie", LTU: "Lituanie", USA: "États-Unis", GRC: "Grèce", GBR: "Royaume-Uni",
  DEU: "Allemagne", FRA: "France", TUR: "Turquie", ITA: "Italie", CAN: "Canada", ESP: "Espagne",
}, "depenses_pib", "data/otan/depenses-militaires-allies", {
  titre: "Dépenses militaires de douze membres de l'OTAN, en % du PIB, dernière année disponible",
  traitement: "Arrondi à deux décimales. Sélection : les plus grandes armées de l'Alliance et le flanc est.",
});
await worldBankSeries("CM.MKT.LCAP.GD.ZS", { FRA: "France", USA: "États-Unis", DEU: "Allemagne" }, "capitalisation_pib", "data/bourse/capitalisation-pib", {
  titre: "Capitalisation boursière des sociétés nationales cotées, en % du PIB",
  producteur: "World Federation of Exchanges, diffusé par la Banque mondiale",
  traitement: "Arrondi à deux décimales. La série française publiée par la Banque mondiale s'arrête en 2018.",
});
await worldBankSeries("SP.DYN.TFRT.IN", { FRA: "France", ITA: "Italie", KOR: "Corée du Sud" }, "enfants_par_femme", "data/societe/fecondite", {
  titre: "Indice synthétique de fécondité (enfants par femme)",
  producteur: "Division de la population des Nations unies et offices statistiques nationaux, diffusé par la Banque mondiale",
  traitement: "Arrondi à deux décimales.",
});
await eurostatExpenditure();
await fredFranc();
