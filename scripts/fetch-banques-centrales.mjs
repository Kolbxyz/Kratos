// Datasets behind the "Banques centrales" lesson. All automated, nothing typed by hand.
// Sources: ECB Data Portal (taux, bilan de l'Eurosystème), Federal Reserve data via FRED (taux effectif, bilan), Eurostat (HICP).
import { save } from "./lib/save.mjs";
import { eurostat } from "./lib/eurostat.mjs";

const ECB = "https://data-api.ecb.europa.eu/service/data";
const FRED = "https://fred.stlouisfed.org/graph/fredgraph.csv";

async function csv(url, colTemps, colValeur) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  const [tete, ...lignes] = (await res.text()).trim().split("\n");
  const cols = tete.split(",");
  const t = cols.indexOf(colTemps), v = cols.indexOf(colValeur);
  if (t < 0 || v < 0) throw new Error(`${url} : colonnes ${colTemps}/${colValeur} absentes`);
  return lignes.map((l) => { const f = l.split(","); return [f[t], f[v]]; }).filter(([, x]) => x !== "" && x !== ".");
}

const ANNEES = Array.from({ length: 2025 - 1999 + 1 }, (_, i) => 1999 + i);
const derniereDate = (paires) => paires.at(-1)[0];

// 1. Policy rates at 31 December of each year, plus the latest observation.
// ECB: deposit facility rate, series of dates of change; value in force on a date = last change on or before it.
const dfr = await csv(`${ECB}/FM/B.U2.EUR.4F.KR.DFR.LEV?format=csvdata&startPeriod=1999-01-01`, "TIME_PERIOD", "OBS_VALUE");
const enVigueur = (serie, date) => { let r = null; for (const [d, v] of serie) if (d <= date) r = Number(v); return r; };
// Fed: effective federal funds rate, daily (DFF); value = last daily observation on or before the date.
const dff = await csv(`${FRED}?id=DFF&cosd=1999-01-01`, "observation_date", "DFF");
const dernierDff = derniereDate(dff);
const dernierDfr = derniereDate(dfr);
const limite = dernierDff < dernierDfr ? dernierDff : dernierDfr;
const lignesTaux = [];
for (const [nom, serie] of [["BCE (taux de la facilité de dépôt)", dfr], ["Fed (taux effectif des fonds fédéraux)", dff]]) {
  for (const a of ANNEES) lignesTaux.push({ annee: a, banque: nom, taux: enVigueur(serie, `${a}-12-31`) });
}
const taux = [];
for (const nom of ["BCE (taux de la facilité de dépôt)", "Fed (taux effectif des fonds fédéraux)"]) taux.push(...lignesTaux.filter((l) => l.banque === nom));
await save("data/monnaie/taux-directeurs-bce-fed", taux, {
  titre: "Taux directeur de la BCE (facilité de dépôt) et taux effectif des fonds fédéraux, au 31 décembre, 1999-2025",
  producteur: "Banque centrale européenne (ECB Data Portal) ; Réserve fédérale, série DFF diffusée par la Federal Reserve Bank of St. Louis (FRED)",
  jeu: "ECB FM.B.U2.EUR.4F.KR.DFR.LEV (dates de modification) ; FRED DFF (taux effectif quotidien)",
  url: "https://data.ecb.europa.eu/data/datasets/FM/FM.B.U2.EUR.4F.KR.DFR.LEV",
  traitement: `Valeur en vigueur au 31 décembre de chaque année (dernière modification ou dernière observation quotidienne à cette date). Le taux de la facilité de dépôt de la BCE est celui qui rémunère les dépôts des banques auprès de l'Eurosystème ; en 1999 la série reflète la période de transition de janvier. Le taux effectif de la Fed est une moyenne pondérée des taux réellement pratiqués, il peut s'écarter de la fourchette cible. Dernières données disponibles au téléchargement : BCE ${dernierDfr}, Fed ${dernierDff}.`,
});
const derniers = { bce: enVigueur(dfr, limite), fed: Number(dff.at(-1)[1]) };
console.log("derniers taux", limite, derniers);

// 2. Balance sheets at year end: Eurosystem (weekly, millions EUR) and Fed (WALCL, weekly, millions USD), in trillions.
const eur = await csv(`${ECB}/ILM/W.U2.C.T000000.Z5.Z01?format=csvdata&startPeriod=1999-01-01`, "TIME_PERIOD", "OBS_VALUE");
const walcl = await csv(`${FRED}?id=WALCL&cosd=2002-01-01`, "observation_date", "WALCL");
// ECB weekly periods are "YYYY-Www": keep the last week of each year.
const dernierParAnnee = (paires) => { const m = new Map(); for (const [t, v] of paires) m.set(t.slice(0, 4), Number(v)); return m; };
const eurAn = dernierParAnnee(eur), fedAn = dernierParAnnee(walcl);
const bilans = [];
const fenetre = Array.from({ length: 2025 - 2002 + 1 }, (_, i) => 2002 + i);
for (const a of fenetre) if (eurAn.has(String(a))) bilans.push({ annee: a, banque: "Eurosystème (billions d'euros)", total_actifs: Math.round(eurAn.get(String(a)) / 1e4) / 100 });
for (const a of fenetre) if (fedAn.has(String(a))) bilans.push({ annee: a, banque: "Fed (billions de dollars)", total_actifs: Math.round(fedAn.get(String(a)) / 1e4) / 100 });
await save("data/monnaie/bilans-eurosysteme-fed", bilans, {
  titre: "Total des actifs de l'Eurosystème et de la Réserve fédérale, fin d'année, 2002-2025, en billions (milliers de milliards) d'unités monétaires",
  producteur: "Banque centrale européenne (ECB Data Portal, bilan consolidé de l'Eurosystème) ; Réserve fédérale (rapport H.4.1, série WALCL diffusée par FRED)",
  jeu: "ECB ILM.W.U2.C.T000000.Z5.Z01 (millions d'euros, hebdomadaire) ; FRED WALCL (millions de dollars, hebdomadaire)",
  url: "https://data.ecb.europa.eu/data/datasets/ILM/ILM.W.U2.C.T000000.Z5.Z01",
  traitement: `Dernière observation hebdomadaire de chaque année, divisée par un million (billions = milliers de milliards). Les deux courbes sont en devises différentes (euro, dollar), sans conversion : elles montrent chacune l'ordre de grandeur et la trajectoire, pas un écart en valeur commune. Dernière semaine disponible au téléchargement : Eurosystème ${eur.at(-1)[0]} = ${eur.at(-1)[1]} millions d'euros ; Fed ${walcl.at(-1)[0]} = ${walcl.at(-1)[1]} millions de dollars.`,
});
console.log("derniers bilans", eur.at(-1), walcl.at(-1));

// 3. Euro area HICP, annual average rate of change (Eurostat prc_hicp_aind), and the monthly peak (prc_hicp_manr).
const ipc = await eurostat("prc_hicp_aind", "geo=EA&coicop=CP00&unit=RCH_A_AVG");
const ipcRows = ipc.map((r) => ({ annee: Number(r.time), inflation: r.valeur })).filter((r) => r.annee >= 1999 && r.annee <= 2025).sort((a, b) => a.annee - b.annee);
await save("data/monnaie/inflation-zone-euro", ipcRows, {
  titre: "Inflation en zone euro (IPCH), variation annuelle moyenne en %, 1999-2025",
  producteur: "Eurostat",
  jeu: "prc_hicp_aind (indice des prix à la consommation harmonisé, taux de variation annuel moyen, zone euro, tous produits)",
  url: "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_aind/default/table",
  traitement: "Aucun : valeurs telles que publiées. Le groupe « EA » correspond à la zone euro dans sa composition changeante.",
});
const mens = await eurostat("prc_hicp_manr", "geo=EA&coicop=CP00&sinceTimePeriod=2021-01");
mens.sort((a, b) => a.time.localeCompare(b.time));
const pic = mens.reduce((m, r) => (r.valeur > m.valeur ? r : m));
console.log("pic mensuel IPCH EA", pic.time, pic.valeur, "dernier", mens.at(-1).time, mens.at(-1).valeur);
await save("data/monnaie/inflation-zone-euro-mensuelle-2021-2026", mens.map((r) => ({ mois: r.time, inflation: r.valeur })), {
  titre: "Inflation en zone euro (IPCH), variation annuelle mensuelle en %, depuis janvier 2021",
  producteur: "Eurostat",
  jeu: "prc_hicp_manr (taux de variation annuel, zone euro, tous produits)",
  url: "https://ec.europa.eu/eurostat/databrowser/view/prc_hicp_manr/default/table",
  traitement: "Aucun : valeurs telles que publiées. Sert à lire le pic de 2022 et le dernier mois disponible ; non tracée.",
});

// 4. Ten-year government bond yields (Maastricht convergence criterion series), annual average, France first.
const GEOS = { FR: "France", DE: "Allemagne", IT: "Italie" };
const rend = await eurostat("irt_lt_mcby_a", `int_rt=MCBY&${Object.keys(GEOS).map((g) => `geo=${g}`).join("&")}`);
const ordre = Object.values(GEOS);
const rendRows = rend.map((r) => ({ annee: Number(r.time), pays: GEOS[r.geo], rendement: r.valeur })).filter((r) => r.annee >= 2000 && r.annee <= 2025).sort((a, b) => ordre.indexOf(a.pays) - ordre.indexOf(b.pays) || a.annee - b.annee);
await save("data/monnaie/rendements-10-ans", rendRows, {
  titre: "Rendement des obligations d'État à 10 ans (critère de convergence de Maastricht), moyenne annuelle en %, 2000-2025",
  producteur: "Eurostat",
  jeu: "irt_lt_mcby_a (rendements des obligations d'État à long terme, critère de convergence de Maastricht, moyenne annuelle)",
  url: "https://ec.europa.eu/eurostat/databrowser/view/irt_lt_mcby_a/default/table",
  traitement: "Aucun : valeurs telles que publiées. Moyenne annuelle : elle lisse les pics de l'été 2011 et de juillet 2012.",
});
