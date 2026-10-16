// Datasets behind the "Guerre hybride et désinformation" lesson.
// Neither source publishes a machine-readable table, so each series is typed from a named page of the report
// and the script fails when the public page that announces the latest figure no longer says the same thing.
import { mkdir } from "node:fs/promises";
import { save } from "./lib/save.mjs";

const ANSSI_PAGE = "https://cyber.gouv.fr/actualites/panorama-de-la-cybermenace-2025/";
const ANSSI_PDF = "https://www.cert.ssi.gouv.fr/uploads/CERTFR-2026-CTI-002.pdf";
const EEAS_PDF = "https://www.eeas.europa.eu/sites/default/files/2026/documents/EEAS%204th%20Threat%20Report_web.pdf";

const normalise = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;|[  ]/g, " ").replace(/\s+/g, " ");

async function anssi() {
  const res = await fetch(ANSSI_PAGE);
  if (!res.ok) throw new Error(`ANSSI : ${res.status}`);
  const page = normalise(await res.text());
  // Latest year, read from the ANSSI announcement; a changed page makes the script fail instead of publishing stale numbers.
  if (!page.includes("1 366 incidents") || !page.includes("3 586 événements")) throw new Error("ANSSI : la page du Panorama 2025 a changé, revérifier les chiffres");
  const pdf = await fetch(ANSSI_PDF, { method: "HEAD" });
  if (!pdf.ok) throw new Error(`ANSSI PDF : ${pdf.status}`);
  // 2022 to 2024: Panorama de la cybermenace 2025, section « Éléments quantitatifs », page 7 du PDF :
  // « 1366 incidents [...] stable par rapport à 2024 (1361), après une croissance les années précédentes (1112 en 2023 et 831 en 2022) ».
  const rows = [
    { annee: 2022, incidents: 831 },
    { annee: 2023, incidents: 1112 },
    { annee: 2024, incidents: 1361 },
    { annee: 2025, incidents: 1366 },
  ];
  await save("data/hybride/anssi-incidents-2022-2025", rows, {
    titre: "Incidents de cybersécurité portés à la connaissance de l'ANSSI, 2022-2025",
    producteur: "Agence nationale de la sécurité des systèmes d'information (ANSSI)",
    jeu: "Panorama de la cybermenace 2025 (CERTFR-2026-CTI-002), publié le 11 mars 2026",
    url: ANSSI_PDF,
    traitement: "Saisie manuelle : les quatre valeurs sont énoncées dans une seule phrase de la section « Éléments quantitatifs » (page 7 du PDF). Un incident est un événement de sécurité confirmé ; les signalements (2 209 en 2025) ne sont pas comptés. Le script vérifie que la page d'annonce de l'ANSSI affiche toujours 1 366 incidents pour 2025.",
  });
}

async function eeas() {
  const pdf = await fetch(EEAS_PDF, { method: "HEAD" });
  if (!pdf.ok) throw new Error(`EEAS PDF : ${pdf.status}`);
  // 4th EEAS Report on FIMI Threats (March 2026), page 9 du PDF : « The EEAS detected and analysed 540 FIMI incidents between
  // January 1st and December 31st, 2025. Within this sample, 29% of incidents were attributed to Russia, while 6% were connected to China.
  // 65% of all incidents recorded remain unattributed ».
  const rows = [
    { attribution: "Non attribués (indices de coordination avec des réseaux russes ou chinois)", part: 65 },
    { attribution: "Attribués à la Russie", part: 29 },
    { attribution: "Rattachés à la Chine", part: 6 },
  ];
  await save("data/hybride/eeas-attribution-incidents-2025", rows, {
    titre: "Incidents de manipulation de l'information et d'ingérence étrangères (FIMI) détectés par le SEAE en 2025, selon l'attribution (540 incidents, en %)",
    producteur: "Service européen pour l'action extérieure (SEAE / EEAS)",
    jeu: "4th EEAS Report on Foreign Information Manipulation and Interference Threats, mars 2026",
    url: EEAS_PDF,
    traitement: "Saisie manuelle : 29 %, 6 % et 65 % sont énoncés dans le texte de la page 9 du PDF (total 100 %). Le périmètre est celui des incidents que le SEAE a détectés et codés du 1er janvier au 31 décembre 2025, pas l'ensemble des opérations menées dans le monde.",
  });
}

await mkdir("data/hybride", { recursive: true });
await anssi();
await eeas();
