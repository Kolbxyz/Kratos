// Lobbying datasets behind the "Lobbying et HATVP" lesson.
// Source: open data of the Haute Autorité pour la transparence de la vie publique (répertoire des représentants d'intérêts, vues fusionnées).
// The zip holds an 8.7 GB CSV once unzipped, so it is streamed through zlib and never written to disk unpacked.
import { createReadStream, createWriteStream } from "node:fs";
import { open, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createInflateRaw } from "node:zlib";
import { save } from "./lib/save.mjs";

const ZIP_URL = "https://www.hatvp.fr/agora/opendata/csv/Vues_Fusionnees.zip";
const PAGE_URL = "https://www.data.gouv.fr/datasets/5d13692f634f41364f8929b8";
const ANNEES_COMPLETES = [2021, 2022, 2023, 2024, 2025];

async function telecharger() {
  const dest = join(tmpdir(), "hatvp-vues-fusionnees.zip");
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`HATVP open data : ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

// Minimal zip reader: central directory lookup (with zip64 extra field), then raw inflate of one entry.
async function ouvrirEntree(chemin, nom) {
  const { size } = await stat(chemin);
  const fh = await open(chemin, "r");
  const tail = Buffer.alloc(Math.min(size, 65557));
  await fh.read(tail, 0, tail.length, size - tail.length);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("zip HATVP : fin de répertoire introuvable");
  const count = tail.readUInt16LE(eocd + 10);
  const cdSize = tail.readUInt32LE(eocd + 12);
  const cdOffset = tail.readUInt32LE(eocd + 16);
  const cd = Buffer.alloc(cdSize);
  await fh.read(cd, 0, cdSize, cdOffset);
  let p = 0;
  for (let i = 0; i < count; i++) {
    const methode = cd.readUInt16LE(p + 10);
    let csize = cd.readUInt32LE(p + 20);
    let usize = cd.readUInt32LE(p + 24);
    const n = cd.readUInt16LE(p + 28), m = cd.readUInt16LE(p + 30), k = cd.readUInt16LE(p + 32);
    let offset = cd.readUInt32LE(p + 42);
    const entree = cd.toString("utf8", p + 46, p + 46 + n);
    if (entree === nom) {
      const extra = cd.subarray(p + 46 + n, p + 46 + n + m);
      for (let q = 0; q + 4 <= extra.length; ) {
        const id = extra.readUInt16LE(q), len = extra.readUInt16LE(q + 2);
        if (id === 1) {
          let r = q + 4;
          if (usize === 0xffffffff) { usize = Number(extra.readBigUInt64LE(r)); r += 8; }
          if (csize === 0xffffffff) { csize = Number(extra.readBigUInt64LE(r)); r += 8; }
          if (offset === 0xffffffff) offset = Number(extra.readBigUInt64LE(r));
        }
        q += 4 + len;
      }
      if (methode !== 8) throw new Error(`${nom} : méthode de compression ${methode} non prise en charge`);
      const local = Buffer.alloc(30);
      await fh.read(local, 0, 30, offset);
      const debut = offset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
      await fh.close();
      return createReadStream(chemin, { start: debut, end: debut + csize - 1 }).pipe(createInflateRaw());
    }
    p += 46 + n + m + k;
  }
  throw new Error(`zip HATVP : ${nom} absent`);
}

// RFC 4180 reader, semicolon-separated, quoted fields may hold line breaks. Calls onRow(fields) for every record.
async function lireCsv(flux, onRow) {
  flux.setEncoding("utf8");
  let champ = "", ligne = [], guillemets = false;
  for await (const bloc of flux) {
    for (let i = 0; i < bloc.length; i++) {
      const c = bloc[i];
      if (guillemets) {
        if (c === '"') { if (bloc[i + 1] === '"') { champ += '"'; i++; } else guillemets = false; }
        else champ += c;
      } else if (c === '"') guillemets = true;
      else if (c === ";") { ligne.push(champ); champ = ""; }
      else if (c === "\n") { ligne.push(champ.endsWith("\r") ? champ.slice(0, -1) : champ); champ = ""; onRow(ligne); ligne = []; }
      else champ += c;
    }
  }
  if (champ || ligne.length) { ligne.push(champ); onRow(ligne); }
}

const CIBLES = [
  ["Député, sénateur", "Parlementaires et collaborateurs"],
  ["Membre du Gouvernement", "Gouvernement et cabinets"],
  ["Agent de l", "Agents de l'État"],
  ["Titulaire d'un emploi à la décision", "Emplois à la décision du Gouvernement"],
  ["Collaborateur du Président de la République", "Collaborateurs du Président"],
  ["Élu ou membre de cabinet d'une collectivité", "Élus locaux et cabinets"],
];
const court = (r) => CIBLES.find(([debut]) => r.startsWith(debut))?.[1];

const meta = (titre, traitement) => ({
  titre,
  producteur: "Haute Autorité pour la transparence de la vie publique (HATVP)",
  jeu: "Répertoire des représentants d'intérêts, vues fusionnées (1_informations_generales.csv, 2_actions.csv)",
  url: PAGE_URL,
  traitement,
});

const zip = await telecharger();
try {
  // 1. Registrations: one row per entity (the file repeats an entity for every client and executive).
  const premieres = new Map();
  let h = null;
  await lireCsv(await ouvrirEntree(zip, "Vues_Fusionnees/1_informations_generales.csv"), (f) => {
    if (!h) { h = Object.fromEntries(f.map((n, i) => [n.replace(/^﻿/, ""), i])); return; }
    const id = f[h.representants_id];
    if (id !== undefined && !premieres.has(id)) premieres.set(id, f[h.date_premiere_publication].slice(6, 10));
  });
  const parAnnee = new Map();
  for (const a of premieres.values()) if (/^\d{4}$/.test(a)) parAnnee.set(a, (parAnnee.get(a) ?? 0) + 1);
  const annees = [...parAnnee.keys()].sort();
  await save("data/pouvoir/lobbying-inscriptions-par-annee", annees.filter((a) => a !== String(new Date().getFullYear())).map((a) => ({ annee: Number(a), nouveaux_inscrits: parAnnee.get(a) })), meta(
    "Représentants d'intérêts selon l'année de leur première publication au répertoire",
    "Une ligne par entité (identifiant representants_id), année de date_premiere_publication. Entités encore présentes dans le fichier, désinscrites comprises : les désinscriptions anciennes ne sont plus publiées, les premières années sont donc un minimum. Année en cours exclue (incomplète).",
  ));

  // 2. Activity sheets and targets, per accounting year (annee_fin), distinct activite_id.
  const fiches = new Map();
  const cibles = new Map();
  const vusCible = new Set();
  let ha = null;
  await lireCsv(await ouvrirEntree(zip, "Vues_Fusionnees/2_actions.csv"), (f) => {
    if (!ha) { ha = Object.fromEntries(f.map((n, i) => [n.replace(/^﻿/, ""), i])); return; }
    const a = f[ha.activite_id];
    if (!a) return;
    const annee = f[ha.annee_fin];
    fiches.set(a, annee);
    const r = f[ha.responsable_public];
    if (r && annee === "2025") {
      const cle = `${a}|${r}`;
      if (!vusCible.has(cle)) { vusCible.add(cle); cibles.set(r, (cibles.get(r) ?? 0) + 1); }
    }
  });
  const parExercice = new Map();
  for (const annee of fiches.values()) parExercice.set(annee, (parExercice.get(annee) ?? 0) + 1);
  await save("data/pouvoir/lobbying-fiches-par-annee", ANNEES_COMPLETES.map((a) => ({ annee: a, fiches: parExercice.get(String(a)) ?? 0 })), meta(
    "Fiches d'activités de représentation d'intérêts, par année d'exercice, 2021-2025",
    "Fiches distinctes (identifiant activite_id) rattachées à l'année de fin d'exercice (annee_fin). Décompte au jour du téléchargement : ne pas le comparer aux totaux des bilans annuels de la HATVP, arrêtés à une autre date. Années antérieures à 2021 écartées : le fichier ne publie plus les entités désinscrites depuis plus de cinq ans.",
  ));

  const lignes = [...cibles.entries()].map(([r, n]) => ({ cible: court(r), fiches: n, brut: r })).filter((l) => l.cible).sort((x, y) => y.fiches - x.fiches);
  if (lignes.length < 6) throw new Error("HATVP : catégories de responsables publics changées, mettre à jour CIBLES");
  await save("data/pouvoir/lobbying-cibles-2025", lignes.map(({ cible, fiches }) => ({ cible, fiches })), meta(
    "Fiches d'activités 2025 selon la catégorie de responsable public visée",
    "Couples distincts (fiche, catégorie de responsable public), exercices clos en 2025. Une fiche peut viser plusieurs catégories : les barres ne s'additionnent pas. Libellés raccourcis ; les six catégories les plus citées.",
  ));
} finally {
  await rm(zip, { force: true });
}

// Hand-entered from the HATVP analysis "La représentation des intérêts des GAFAM depuis 2020" (avril 2025): every figure is in its text.
const GAFAM = "https://hatvp.fr/wordpress/wp-content/uploads/2025/04/Analyse-RI-GAFAM-VF.pdf";
const gafam = (titre, traitement) => ({ titre, producteur: "Haute Autorité pour la transparence de la vie publique (HATVP)", jeu: "Analyse « La représentation des intérêts des GAFAM depuis 2020 »", url: GAFAM, traitement });
await save("data/pouvoir/lobbying-gafam-fiches", [
  { entreprise: "Google", fiches: 247 },
  { entreprise: "Amazon", fiches: 118 },
  { entreprise: "Facebook (Meta)", fiches: 85 },
  { entreprise: "Microsoft", fiches: 56 },
  { entreprise: "Apple", fiches: 27 },
], gafam("Fiches d'activités déclarées pour le compte des GAFAM, 2020-2024", "Saisie manuelle, une ligne par entreprise telle qu'écrite dans l'analyse (fiches déclarées en propre ou par des tiers, 2020-2024)."));
await save("data/pouvoir/lobbying-gafam-par-annee", [
  { annee: 2020, fiches: 88 },
  { annee: 2021, fiches: 100 },
  { annee: 2022, fiches: 158 },
  { annee: 2023, fiches: 187 },
], gafam("Fiches d'activités des cinq GAFAM réunis, par année, 2020-2023", "Saisie manuelle : les quatre totaux annuels cités dans l'analyse. 2024 n'y figure pas en total."));

// Hand-entered from the HATVP report "Représentation d'intérêts et transparence : chiffres et infos clés pour 2024" (juillet 2025), page 15.
await save("data/pouvoir/lobbying-types-actions-2024", [
  { action: "Transmettre des informations ou expertises pour convaincre", part: 25 },
  { action: "Organiser des discussions informelles ou rendez-vous", part: 23.5 },
  { action: "Transmettre des suggestions sur la rédaction d'une décision", part: 18.5 },
  { action: "Établir une correspondance régulière", part: 15.3 },
  { action: "Inviter ou organiser des événements", part: 6.5 },
  { action: "Convenir pour un tiers d'une entrevue", part: 4.4 },
  { action: "Organiser des auditions ou consultations formelles", part: 2.5 },
  { action: "Envoyer des pétitions, lettres ouvertes, tracts", part: 1.8 },
  { action: "Organiser des débats publics, marches, stratégies sur internet", part: 1.3 },
  { action: "Autres", part: 1.2 },
], {
  titre: "Types d'actions de représentation d'intérêts menées en 2024, en % des actions déclarées",
  producteur: "Haute Autorité pour la transparence de la vie publique (HATVP)",
  jeu: "Bilan 2024 des déclarations d'activités des représentants d'intérêts, page 15",
  url: "https://www.hatvp.fr/wordpress/wp-content/uploads/2025/09/HATVP_BILAN_RRI-2024_web.pdf",
  traitement: "Saisie manuelle : pourcentages tels que publiés, libellés raccourcis. Plusieurs types peuvent être déclarés dans une même fiche.",
});
