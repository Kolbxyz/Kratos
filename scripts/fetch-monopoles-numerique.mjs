// Datasets behind the "Monopoles et numérique" lesson.
// 1. Fines: each amount is checked against the text of the Commission press release (press corner API) before it is written.
//    If a release changes or an amount no longer appears in it, the script fails instead of saving a stale figure.
// 2. Gatekeepers: core platform services per company, counted on the Commission DMA portal and checked against the total it states.
import { save } from "./lib/save.mjs";

const UA = { "user-agent": "Mozilla/5.0 (cours-pouvoir data fetch)" };
const PRESSE = (ref) => `https://ec.europa.eu/commission/presscorner/detail/en/${ref.toLowerCase().replaceAll("/", "_")}`;

async function communique(ref) {
  const res = await fetch(`https://ec.europa.eu/commission/presscorner/api/documents?reference=${encodeURIComponent(ref)}&language=en`, { headers: UA });
  if (!res.ok) throw new Error(`Commission ${ref} : ${res.status}`);
  const doc = await res.json();
  const html = doc.docuLanguageResource?.htmlContent ?? "";
  const texte = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;| /g, " ").replace(/&euro;/g, "€").replace(/\s+/g, " ");
  return { date: doc.eventDate, texte };
}

// Amounts in millions of euros, as decided by the Commission (later court rulings are described in the lesson, not applied here).
// "motif" must appear verbatim in the press release: it is the control that ties each row to its source.
const AMENDES = [
  { ref: "IP/17/1784", decision: "Google Shopping (art. 102, 2017)", cadre: "Article 102 TFUE", montant: 2424.495, motif: "€2 424 495 000" },
  { ref: "IP/18/4581", decision: "Google Android (art. 102, 2018)", cadre: "Article 102 TFUE", montant: 4342.865, motif: "€4 342 865 000" },
  { ref: "IP/19/1770", decision: "Google AdSense (art. 102, 2019)", cadre: "Article 102 TFUE", montant: 1494.459, motif: "€1 494 459 000" },
  { ref: "IP/24/5801", decision: "Meta Marketplace (art. 102, 2024)", cadre: "Article 102 TFUE", montant: 797.72, motif: "€797.72 million" },
  { ref: "IP/25/1992", decision: "Google technologie publicitaire (art. 102, 2025)", cadre: "Article 102 TFUE", montant: 2950, motif: "fined Google €2.95 billion" },
  { ref: "IP/25/1085", decision: "Apple, DMA (2025)", cadre: "Digital Markets Act", montant: 500, motif: "€500 million and €200 million respectively" },
  { ref: "IP/25/1085", decision: "Meta, DMA (2025)", cadre: "Digital Markets Act", montant: 200, motif: "€500 million and €200 million respectively" },
  { ref: "IP/26/1670", decision: "Google Search, DMA (2026)", cadre: "Digital Markets Act", montant: 460, motif: "fine of €460 million and a fine of €430 million" },
  { ref: "IP/26/1670", decision: "Google Play, DMA (2026)", cadre: "Digital Markets Act", montant: 430, motif: "fine of €460 million and a fine of €430 million" },
  { ref: "IP/25/2934", decision: "X, DSA (2025)", cadre: "Digital Services Act", montant: 120, motif: "fine of €120 million to X" },
];

const lignes = [];
const cache = new Map();
for (const a of AMENDES) {
  if (!cache.has(a.ref)) cache.set(a.ref, await communique(a.ref));
  const { date, texte } = cache.get(a.ref);
  if (!texte.includes(a.motif)) throw new Error(`${a.ref} : « ${a.motif} » absent du communiqué, vérifier le montant de ${a.decision}`);
  lignes.push({ decision: a.decision, cadre: a.cadre, montant: a.montant, date_communique: date });
}
lignes.sort((x, y) => y.montant - x.montant);
await save("data/numerique/amendes-commission-numerique", lignes, {
  titre: "Amendes de la Commission européenne contre des plateformes numériques, montant décidé (millions d'euros)",
  producteur: "Commission européenne (communiqués de presse)",
  jeu: "Communiqués IP/17/1784, IP/18/4581, IP/19/1770, IP/24/5801, IP/25/1085, IP/25/1992, IP/25/2934, IP/26/1670",
  url: PRESSE("IP/17/1784"),
  traitement:
    "Saisie manuelle de dix montants, chacun contrôlé par le script contre le texte du communiqué (échec si le montant n'y figure plus). Montants tels que décidés par la Commission, avant tout recours : l'amende Android a été ramenée à 4 125 millions par le Tribunal (14 septembre 2022) puis confirmée par la Cour de justice (2 juillet 2026), la décision AdSense a été annulée par le Tribunal (18 septembre 2024). L'amende de plus de 1,8 milliard contre Apple (4 mars 2024, communiqué IP/24/1161) est absente : le communiqué ne donne pas le montant exact. Communiqués : " +
    [...new Set(AMENDES.map((a) => a.ref))].map((r) => `${r} ${PRESSE(r)}`).join(" ; "),
});

// Gatekeepers portal: one "Case DMA.1000xx" line per designated core platform service, grouped under the company heading.
const PORTAIL = "https://digital-markets-act.ec.europa.eu/gatekeepers_en";
const res = await fetch(PORTAIL, { headers: UA });
if (!res.ok) throw new Error(`Portail DMA : ${res.status}`);
const page = (await res.text())
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, " ")
  .replace(/<\/(p|div|li|h\d|tr)>/g, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;|\u00a0/g, " ")
  .replace(/[ \t]+/g, " ");
const ENTREPRISES = ["Alphabet Inc.", "Amazon.com Inc.", "Apple Inc.", "Booking", "ByteDance Ltd.", "Meta Platforms, Inc.", "Microsoft Corporation"];
const NOMS = { "Alphabet Inc.": "Alphabet", "Amazon.com Inc.": "Amazon", "Apple Inc.": "Apple", Booking: "Booking", "ByteDance Ltd.": "ByteDance", "Meta Platforms, Inc.": "Meta", "Microsoft Corporation": "Microsoft" };
const debut = page.indexOf("Page contents", page.indexOf("Page contents") + 1);
const fin = page.indexOf("This site is managed by", debut);
if (debut < 0 || fin < 0) throw new Error("Portail DMA : structure de la page changée");
const corps = page.slice(debut, fin);
const positions = ENTREPRISES.map((e) => ({ e, i: corps.indexOf(`\n ${e}`) }));
for (const p of positions) if (p.i < 0) throw new Error(`Portail DMA : ${p.e} introuvable`);
positions.sort((a, b) => a.i - b.i);
const services = positions.map((p, k) => {
  const bloc = corps.slice(p.i, positions[k + 1]?.i ?? corps.length);
  return { entreprise: NOMS[p.e], services: (bloc.match(/Case DMA\.\d+/g) ?? []).length };
});
const total = services.reduce((n, s) => n + s.services, 0);
const annonce = Number(page.match(/In total, (\d+) core platform/)?.[1]);
if (total !== annonce) throw new Error(`Portail DMA : ${total} services comptés, ${annonce} annoncés`);
services.sort((a, b) => b.services - a.services);
await save("data/numerique/controleurs-acces-services", services, {
  titre: `Services de plateforme essentiels désignés au titre du DMA, par contrôleur d'accès (${total} au total)`,
  producteur: "Commission européenne, portail du règlement sur les marchés numériques",
  jeu: "Gatekeepers Portal",
  url: PORTAIL,
  traitement: `Comptage des lignes « Case DMA.xxxxx » sous chaque entreprise de la page. Le script échoue si le total diffère du nombre que la page annonce (${annonce}). Alphabet : 8 services, Meta : 5, Apple : 4, Amazon : 2, Microsoft : 2, Booking : 1, ByteDance : 1.`,
});
