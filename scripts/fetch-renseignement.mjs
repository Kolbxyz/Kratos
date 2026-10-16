// Datasets behind the "Le renseignement et ses contrôles" lesson.
// Source: annual activity reports of the CNCTR (Commission nationale de contrôle des techniques de renseignement).
// The reports are PDFs with no open-data feed, so the figures are typed in from the pages named in `traitement`.
// The script fails if a report is no longer served at its URL, so a moved or replaced PDF is noticed instead of ignored.
import { save } from "./lib/save.mjs";

const RAPPORT_2025 = "https://cms.cnctr.fr/uploads/RAPPORT_CNCTR_2025_d5b15664a7.pdf";
const RAPPORT_2021 = "https://cms.cnctr.fr/uploads/RAPPORT_CNCTR_2021_interactif_30c40b93e6.pdf";
const PRODUCTEUR = "Commission nationale de contrôle des techniques de renseignement (CNCTR)";

async function verifier(url) {
  const res = await fetch(url, { method: "HEAD", headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) {
    throw new Error(`CNCTR : ${url} ne renvoie plus un PDF (${res.status})`);
  }
}
await verifier(RAPPORT_2025);
await verifier(RAPPORT_2021);

// Demandes de techniques de renseignement présentées au Premier ministre (techniques domestiques individualisées).
// 2017 à 2020 : rapport d'activité 2021, tableau général, PDF pages 61 et 62 (ligne « Ensemble des techniques de renseignement »).
// 2021 à 2025 : rapport d'activité 2025, tableau de la section 1.3.1, p. 38 (87 588 en 2021, identique au rapport 2021).
await save("data/renseignement/cnctr-demandes-par-annee", [
  { annee: 2017, demandes: 70390 },
  { annee: 2018, demandes: 73298 },
  { annee: 2019, demandes: 73543 },
  { annee: 2020, demandes: 79605 },
  { annee: 2021, demandes: 87588 },
  { annee: 2022, demandes: 89502 },
  { annee: 2023, demandes: 94902 },
  { annee: 2024, demandes: 98883 },
  { annee: 2025, demandes: 100813 },
], {
  titre: "Demandes de techniques de renseignement présentées au Premier ministre après avis de la CNCTR, 2017-2025",
  producteur: PRODUCTEUR,
  jeu: "Rapport d'activité 2025 (p. 38) et rapport d'activité 2021 (PDF p. 61 et 62)",
  url: RAPPORT_2025,
  traitement: "Saisie manuelle : 2021 à 2025 dans le tableau de la p. 38 du rapport 2025, 2017 à 2020 dans le tableau général du rapport 2021 (https://cms.cnctr.fr/uploads/RAPPORT_CNCTR_2021_interactif_30c40b93e6.pdf). Techniques domestiques individualisées : sans la technique de l'algorithme (L. 851-3), sans les transmissions entre services soumises à avis et sans la surveillance des communications électroniques internationales.",
});

// Trois techniques, rapport d'activité 2025, tableau des p. 43 et 44 (demandes par technique, 2021 à 2025).
const techniques = [
  ["Interceptions de sécurité (écoutes)", [12736, 12798, 13021, 14316, 14284]],
  ["Captations de paroles et d'images", [2138, 3314, 3802, 3912, 4189]],
  ["Recueil de données informatiques", [3758, 4260, 4493, 5715, 7900]],
];
const rows = [];
for (const [technique, valeurs] of techniques) {
  valeurs.forEach((demandes, i) => rows.push({ annee: 2021 + i, technique, demandes }));
}
await save("data/renseignement/cnctr-techniques-par-annee", rows, {
  titre: "Demandes d'interceptions de sécurité, de captations de paroles et d'images et de recueil de données informatiques, 2021-2025",
  producteur: PRODUCTEUR,
  jeu: "Rapport d'activité 2025, tableau de la répartition des demandes par technique, p. 43 et 44",
  url: RAPPORT_2025,
  traitement: "Saisie manuelle des trois lignes : interceptions de sécurité via le GIC (I de l'article L. 852-1), captations de paroles prononcées à titre privé et d'images dans un lieu privé (article L. 853-1), recueils et captations de données informatiques (article L. 853-2). Les autres techniques du tableau sont écartées.",
});

// Réclamations adressées à la CNCTR, rapport d'activité 2025, section 2.4.2, p. 67.
await save("data/renseignement/cnctr-reclamations-par-annee", [
  { annee: 2021, reclamations: 48 },
  { annee: 2022, reclamations: 49 },
  { annee: 2023, reclamations: 81 },
  { annee: 2024, reclamations: 87 },
  { annee: 2025, reclamations: 105 },
], {
  titre: "Réclamations de particuliers reçues par la CNCTR (article L. 833-4), 2021-2025",
  producteur: PRODUCTEUR,
  jeu: "Rapport d'activité 2025, section 2.4.2, p. 67",
  url: RAPPORT_2025,
  traitement: "Saisie manuelle de la ligne « Nombre de réclamations » du tableau de la p. 67.",
});

// Personnes surveillées, rapport d'activité 2025, tableau de la p. 34 (estimation avec marge d'incertitude de 10 %).
await save("data/renseignement/cnctr-personnes-surveillees", [
  { annee: 2021, personnes: 22958 },
  { annee: 2022, personnes: 20958 },
  { annee: 2023, personnes: 24209 },
  { annee: 2024, personnes: 24308 },
  { annee: 2025, personnes: 25332 },
], {
  titre: "Personnes ayant fait l'objet d'au moins une technique de renseignement, 2021-2025 (estimation de la CNCTR)",
  producteur: PRODUCTEUR,
  jeu: "Rapport d'activité 2025, tableau de la p. 34",
  url: RAPPORT_2025,
  traitement: "Saisie manuelle de la ligne « Nombre de personnes surveillées ». Estimation de la CNCTR, avec une marge d'incertitude de 10 % depuis l'origine (p. 33). Les accès aux données de connexion en temps différé qui se bornent à identifier un abonné ne sont pas comptés. Le chiffre 2025 intègre la correction d'une erreur de comptage qui, selon la CNCTR, aurait donné environ 800 personnes de moins sans correction.",
});
