// Datasets behind the "Pourquoi les guerres commencent" lesson.
// Sources: UCDP/PRIO Armed Conflict Dataset (Uppsala Conflict Data Program and PRIO), and SIPRI military expenditure via the World Bank API.
import { save } from "./lib/save.mjs";
import { PAGE_UCDP, derniereVersion, telechargerCsv } from "./lib/ucdp.mjs";

const urlUcdp = () => derniereVersion(/ucdpprio\/ucdp-prio-acd-(\d+)-csv\.zip/g, (v) => `ucdpprio/ucdp-prio-acd-${v}-csv.zip`);

async function ucdp() {
  const { url, version } = await urlUcdp();
  const rows = await telechargerCsv({ url, version });
  for (const col of ["conflict_id", "year", "type_of_conflict"]) if (!(col in rows[0])) throw new Error(`UCDP : colonne ${col} absente, le format a changé`);

  // type_of_conflict: 1 extrasystemic, 2 interstate, 3 internal, 4 internationalized internal.
  const parAnnee = new Map();
  for (const r of rows) {
    const y = Number(r.year);
    if (!parAnnee.has(y)) parAnnee.set(y, { tous: new Set(), entre_etats: new Set() });
    parAnnee.get(y).tous.add(r.conflict_id);
    if (r.type_of_conflict === "2") parAnnee.get(y).entre_etats.add(r.conflict_id);
  }
  const annees = [...parAnnee.keys()].sort((a, b) => a - b);
  const derniere = annees.at(-1);
  const meta = {
    producteur: "Uppsala Conflict Data Program (UCDP) et Peace Research Institute Oslo (PRIO)",
    jeu: `UCDP/PRIO Armed Conflict Dataset, version ${version}`,
    url: PAGE_UCDP,
    traitement: `Conflits armés étatiques distincts (identifiant conflict_id), décomptés par année civile de 1946 à ${derniere}. Définition UCDP : incompatibilité portant sur le gouvernement ou un territoire, usage de la force armée entre deux parties dont l'une au moins est le gouvernement d'un État, au moins 25 morts au combat dans l'année. Fichier téléchargé : ${url}.`,
  };
  await save("data/guerres/ucdp-conflits-par-annee", annees.map((a) => ({ annee: a, conflits: parAnnee.get(a).tous.size })), {
    ...meta,
    titre: `Nombre de conflits armés étatiques par année, 1946-${derniere} (UCDP/PRIO ${version})`,
  });
  await save("data/guerres/ucdp-conflits-entre-etats", annees.map((a) => ({ annee: a, conflits: parAnnee.get(a).entre_etats.size })), {
    ...meta,
    titre: `Nombre de conflits armés entre États (type 2 d'UCDP) par année, 1946-${derniere} (UCDP/PRIO ${version})`,
    traitement: `${meta.traitement} Seuls les conflits codés « interstate » (type_of_conflict = 2) sont comptés.`,
  });
}

// World military expenditure as a share of GDP, SIPRI series republished by the World Bank.
async function depensesMondiales() {
  const indicateur = "MS.MIL.XPND.GD.ZS";
  const res = await fetch(`https://api.worldbank.org/v2/country/WLD/indicator/${indicateur}?format=json&per_page=100&date=1988:2025`);
  if (!res.ok) throw new Error(`World Bank ${res.status}`);
  const [, data] = await res.json();
  const rows = data.filter((d) => d.value != null).map((d) => ({ annee: Number(d.date), part_du_pib: Math.round(d.value * 100) / 100 }))
    .sort((a, b) => a.annee - b.annee);
  if (rows.length < 30) throw new Error("World Bank : série mondiale incomplète");
  await save("data/guerres/depenses-militaires-monde", rows, {
    titre: `Dépenses militaires mondiales, en % du PIB, 1988-${rows.at(-1).annee}`,
    producteur: "SIPRI Military Expenditure Database, diffusé par la Banque mondiale",
    jeu: indicateur,
    url: `https://data.worldbank.org/indicator/${indicateur}?locations=1W`,
    traitement: "Agrégat « Monde » de la Banque mondiale, arrondi à deux décimales. Années 1988 à 2025 (la série SIPRI publiée par la Banque mondiale commence en 1988).",
  });
}

await ucdp();
await depensesMondiales();
