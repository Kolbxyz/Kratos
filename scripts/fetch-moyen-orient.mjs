// Datasets behind the Middle East lessons. Source: UCDP (Uppsala Conflict Data Program), version read from the downloads page.
// "Moyen-Orient" is UCDP region 2. Deaths are the UCDP best estimate; a build fails if a top actor has no French label.
import { save } from "./lib/save.mjs";
import { PAGE_UCDP, derniereVersion, telechargerCsv } from "./lib/ucdp.mjs";

const REGION_MOYEN_ORIENT = "2";
const dansRegion = (r) => r.region.trim() === REGION_MOYEN_ORIENT;

const FR_ACTEURS = {
  IS: "État islamique",
  "Government of Syria": "Gouvernement syrien",
  "Government of Iraq": "Gouvernement irakien",
  PKK: "PKK",
  Hamas: "Hamas",
  "Syrian insurgents": "Insurgés syriens",
  "Government of Iran": "Gouvernement iranien",
  "Government of Yemen (North Yemen)": "Gouvernement du Yémen",
  "Government of Israel": "Gouvernement israélien",
};

async function jeu(motif, dossier) {
  const info = await derniereVersion(motif, dossier);
  return { ...info, rows: await telechargerCsv(info) };
}

// One-sided violence: deliberate killing of civilians by a government or an organised group (UCDP threshold: 25 deaths a year).
// Actors are chosen by their toll in rows coded only "Middle East"; the charted figure is their whole UCDP toll, because UCDP codes a
// group active on several regions (Islamic State from 2015) as one multi-region row that cannot be split.
async function violenceUnilaterale() {
  const d = await jeu(/nsos\/ucdp-onesided-(\d+)-csv\.zip/g, (v) => `nsos/ucdp-onesided-${v}-csv.zip`);
  for (const col of ["actor_name", "year", "best_fatality_estimate", "is_government_actor", "region"]) if (!(col in d.rows[0])) throw new Error(`UCDP one-sided : colonne ${col} absente`);
  const stricte = new Map();
  for (const r of d.rows.filter(dansRegion)) stricte.set(r.actor_name, (stricte.get(r.actor_name) ?? 0) + Number(r.best_fatality_estimate));
  const choisis = [...stricte.entries()].sort((a, b) => b[1] - a[1]).slice(0, 9);
  for (const [nom] of choisis) if (!FR_ACTEURS[nom]) throw new Error(`UCDP one-sided : acteur « ${nom} » sans libellé français`);
  const rows = choisis.map(([nom, dansLaRegion]) => {
    const lignes = d.rows.filter((r) => r.actor_name === nom);
    return {
      acteur: FR_ACTEURS[nom],
      type: lignes[0].is_government_actor === "1" ? "Gouvernement" : "Groupe non étatique",
      civils_tues: lignes.reduce((s, r) => s + Number(r.best_fatality_estimate), 0),
      dont_moyen_orient_seul: dansLaRegion,
      premiere_annee: Math.min(...lignes.map((r) => Number(r.year))),
      derniere_annee: Math.max(...lignes.map((r) => Number(r.year))),
    };
  }).sort((a, b) => b.civils_tues - a.civils_tues);
  await save("data/moyen-orient/ucdp-civils-tues-par-acteur", rows, {
    titre: `Civils tués délibérément par les principaux acteurs du Moyen-Orient, 1989-${Math.max(...rows.map((r) => r.derniere_annee))} (UCDP One-sided Violence ${d.version})`,
    producteur: "Uppsala Conflict Data Program (UCDP)",
    jeu: `UCDP One-sided Violence Dataset, version ${d.version}`,
    url: PAGE_UCDP,
    traitement: `Neuf acteurs retenus : ceux qui ont le plus de victimes dans les lignes codées uniquement « Moyen-Orient » (region = 2). Pour chacun, civils_tues = somme des estimations centrales (best_fatality_estimate) sur toutes ses lignes et toutes les années, quelle que soit la région ; dont_moyen_orient_seul = somme des seules lignes codées région 2. L'écart est important pour l'État islamique : l'UCDP code ses années 2015 à 2025 comme des lignes multi-régions, qu'on ne peut pas découper par pays. Définition UCDP : usage de la force armée contre des civils par le gouvernement d'un État ou par un groupe organisé, au moins 25 morts civils par acteur et par an, exécutions extrajudiciaires en détention exclues. Les civils tués dans les combats ou les bombardements sont comptés à part, comme morts au combat. Fichier : ${d.url}.`,
  });
}

// Battle-related deaths by country where the fighting took place, per year.
async function mortsAuCombat() {
  const d = await jeu(/brd\/ucdp-brd-conf-(\d+)-csv\.zip/g, (v) => `brd/ucdp-brd-conf-${v}-csv.zip`);
  for (const col of ["location_inc", "year", "bd_best", "region"]) if (!(col in d.rows[0])) throw new Error(`UCDP battle deaths : colonne ${col} absente`);
  const me = d.rows.filter(dansRegion);
  const lieux = { Syria: "Syrie", Iraq: "Irak", Israel: "Israël" };
  const derniere = Math.max(...me.map((r) => Number(r.year)));
  const rows = [];
  for (let y = 2000; y <= derniere; y++) {
    for (const [en, fr] of Object.entries(lieux)) {
      const morts = me.filter((r) => r.location_inc === en && Number(r.year) === y).reduce((s, r) => s + Number(r.bd_best), 0);
      rows.push({ annee: y, pays: fr, morts_au_combat: morts });
    }
  }
  await save("data/moyen-orient/ucdp-morts-au-combat-par-annee", rows, {
    titre: `Morts au combat par année, Syrie, Irak et Israël, 2000-${derniere} (UCDP Battle-Related Deaths ${d.version})`,
    producteur: "Uppsala Conflict Data Program (UCDP)",
    jeu: `UCDP Battle-Related Deaths Dataset, version ${d.version}, fichier par conflit`,
    url: PAGE_UCDP,
    traitement: `Somme des estimations centrales (bd_best) des conflits dont le pays d'incompatibilité (location_inc) est la Syrie, l'Irak ou Israël, par année. Une année sans conflit codé vaut 0. Définition UCDP : morts causées par les parties en guerre et directement liées au combat, y compris les civils tués dans les tirs croisés ou les bombardements ; les attaques délibérément dirigées contre des civils seules (violence unilatérale) et les morts indirectes (maladie, famine) n'y figurent pas. « Israël » regroupe les conflits avec le Hamas, le Hezbollah et les autres groupes palestiniens codés par l'UCDP. Fichier : ${d.url}.`,
  });
}

// Latest SIPRI year for the countries of the <Carte zone="moyen-orient">; countries SIPRI does not publish stay grey on the map.
async function depensesMilitaires() {
  const codes = "CYP;EGY;IRN;IRQ;ISR;JOR;KWT;LBN;OMN;PSE;QAT;SAU;SYR;TUR;ARE;YEM";
  const indicateur = "MS.MIL.XPND.GD.ZS";
  const annee = 2025;
  const res = await fetch(`https://api.worldbank.org/v2/country/${codes}/indicator/${indicateur}?format=json&per_page=500&date=${annee}`);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const [, data] = await res.json();
  const rows = data.filter((d) => d.value != null).map((d) => ({ code: d.countryiso3code, valeur: Math.round(d.value * 100) / 100, annee: Number(d.date) }))
    .sort((a, b) => b.valeur - a.valeur);
  if (rows.length < 8) throw new Error("World Bank : trop peu de pays du Moyen-Orient avec une valeur, vérifier l'année");
  await save("data/defense/depenses-militaires-moyen-orient-2025", rows, {
    titre: `Dépenses militaires des pays du Moyen-Orient, en % du PIB, ${annee}`,
    producteur: "SIPRI Military Expenditure Database, diffusé par la Banque mondiale",
    jeu: indicateur,
    url: `https://data.worldbank.org/indicator/${indicateur}`,
    traitement: `Arrondi à deux décimales. Année ${annee} pour tous les pays du jeu. Les pays sans valeur dans la série (Qatar, Émirats arabes unis, Yémen, Palestine, Syrie) ne sont pas dessinés avec une teinte.`,
  });
}

// Syrians who fled abroad (refugees by country of origin) and displaced inside Syria, year-end stock, UNHCR population statistics.
async function deplacesSyrie() {
  const res = await fetch("https://api.unhcr.org/population/v1/population/?limit=100&yearFrom=2012&yearTo=2025&coo=SYR&cf_type=ISO");
  if (!res.ok) throw new Error(`UNHCR ${res.status}`);
  const { items } = await res.json();
  const parAnnee = new Map(items.map((i) => [i.year, i]));
  const rows = [];
  for (let y = 2012; y <= 2025; y++) {
    const i = parAnnee.get(y);
    if (!i || i.refugees == null || i.idps == null) throw new Error(`UNHCR : année ${y} absente ou incomplète`);
    rows.push({ annee: y, categorie: "Réfugiés hors de Syrie", personnes: Number(i.refugees) });
    rows.push({ annee: y, categorie: "Déplacés à l'intérieur de la Syrie", personnes: Number(i.idps) });
  }
  await save("data/moyen-orient/unhcr-syriens-deplaces", rows, {
    titre: "Syriens réfugiés à l'étranger et déplacés internes, 2012-2025 (UNHCR)",
    producteur: "UNHCR, Refugee Data Finder (population statistics)",
    jeu: "UNHCR Population Statistics API, pays d'origine = Syrie, agrégat tous pays d'accueil",
    url: "https://www.unhcr.org/refugee-statistics/",
    traitement: "Stocks de fin d'année : champ refugees (réfugiés sous mandat du UNHCR, pays d'origine Syrie) et champ idps (personnes déplacées internes). L'année 2025 est la dernière publiée au moment de la consultation. Requête : https://api.unhcr.org/population/v1/population/?yearFrom=2012&yearTo=2025&coo=SYR&cf_type=ISO.",
  });
}

// Two kinds of deadly violence in Syria, year by year: battle-related deaths of state-based conflicts, and deaths in non-state conflicts
// (armed groups fighting each other). UCDP counts them separately, never twice. One-sided violence is left out here because its
// multi-country lines cannot be split by country (see the actor chart).
async function deuxConflitsSyrie() {
  const brd = await jeu(/brd\/ucdp-brd-conf-(\d+)-csv\.zip/g, (v) => `brd/ucdp-brd-conf-${v}-csv.zip`);
  const ns = await jeu(/nsos\/ucdp-nonstate-(\d+)-csv\.zip/g, (v) => `nsos/ucdp-nonstate-${v}-csv.zip`);
  const somme = (rows, filtre, champ, annee) => rows.filter((r) => Number(r.year) === annee && filtre(r)).reduce((t, r) => t + Number(r[champ]), 0);
  const fin = Math.max(...brd.rows.filter((r) => r.location_inc === "Syria").map((r) => Number(r.year)));
  const rows = [];
  for (let a = 2011; a <= fin; a++) {
    rows.push({ annee: a, type: "Conflits impliquant un État", morts: somme(brd.rows, (r) => r.location_inc === "Syria", "bd_best", a) });
    rows.push({ annee: a, type: "Conflits entre groupes armés non étatiques", morts: somme(ns.rows, (r) => r.location.trim() === "Syria", "best_fatality_estimate", a) });
  }
  await save("data/moyen-orient/ucdp-syrie-deux-types-de-conflit", rows, {
    titre: `Morts au combat en Syrie selon le type de conflit, 2011-${fin} (UCDP ${brd.version})`,
    producteur: "Uppsala Conflict Data Program (UCDP)",
    jeu: `UCDP Battle-Related Deaths ${brd.version} (fichier par conflit) et Non-state Conflict ${ns.version}`,
    url: PAGE_UCDP,
    traitement: `Somme des estimations centrales annuelles : morts au combat des conflits dont l'enjeu est la Syrie (location_inc = Syria) ; morts des conflits non étatiques dont le lieu est la Syrie seule. Les lignes non étatiques multi-pays sont exclues car l'UCDP ne les découpe pas par pays : la seconde série sous-estime donc les conflits qui débordent la Syrie. Les deux séries sont distinctes dans l'UCDP (un même mort n'est compté que dans un type). Fichiers : ${brd.url}, ${ns.url}.`,
  });
}

await violenceUnilaterale();
await deuxConflitsSyrie();
await mortsAuCombat();
await depensesMilitaires();
await deplacesSyrie();
