// ISO 3166-1 alpha-3 code to numeric id (the id used by world-atlas) and French name, for the countries drawn on each <Carte> zone.
type Pays = Record<string, { id: string; nom: string }>;

const EUROPE: Pays = {
  ALB: { id: "008", nom: "Albanie" }, AUT: { id: "040", nom: "Autriche" }, BLR: { id: "112", nom: "Biélorussie" },
  BEL: { id: "056", nom: "Belgique" }, BIH: { id: "070", nom: "Bosnie-Herzégovine" }, BGR: { id: "100", nom: "Bulgarie" },
  HRV: { id: "191", nom: "Croatie" }, CYP: { id: "196", nom: "Chypre" }, CZE: { id: "203", nom: "Tchéquie" },
  DNK: { id: "208", nom: "Danemark" }, EST: { id: "233", nom: "Estonie" }, FIN: { id: "246", nom: "Finlande" },
  FRA: { id: "250", nom: "France" }, DEU: { id: "276", nom: "Allemagne" }, GRC: { id: "300", nom: "Grèce" },
  HUN: { id: "348", nom: "Hongrie" }, ISL: { id: "352", nom: "Islande" }, IRL: { id: "372", nom: "Irlande" },
  ITA: { id: "380", nom: "Italie" }, LVA: { id: "428", nom: "Lettonie" }, LTU: { id: "440", nom: "Lituanie" },
  LUX: { id: "442", nom: "Luxembourg" }, MLT: { id: "470", nom: "Malte" }, MDA: { id: "498", nom: "Moldavie" },
  MNE: { id: "499", nom: "Monténégro" }, NLD: { id: "528", nom: "Pays-Bas" }, MKD: { id: "807", nom: "Macédoine du Nord" },
  NOR: { id: "578", nom: "Norvège" }, POL: { id: "616", nom: "Pologne" }, PRT: { id: "620", nom: "Portugal" },
  ROU: { id: "642", nom: "Roumanie" }, RUS: { id: "643", nom: "Russie" }, SRB: { id: "688", nom: "Serbie" },
  SVK: { id: "703", nom: "Slovaquie" }, SVN: { id: "705", nom: "Slovénie" }, ESP: { id: "724", nom: "Espagne" },
  SWE: { id: "752", nom: "Suède" }, CHE: { id: "756", nom: "Suisse" }, UKR: { id: "804", nom: "Ukraine" },
  GBR: { id: "826", nom: "Royaume-Uni" }, TUR: { id: "792", nom: "Turquie" },
};

// Palestine is the West Bank only at the 110m resolution of world-atlas: Gaza and Bahrain are too small to be drawn.
const MOYEN_ORIENT: Pays = {
  CYP: { id: "196", nom: "Chypre" }, EGY: { id: "818", nom: "Égypte" }, IRN: { id: "364", nom: "Iran" },
  IRQ: { id: "368", nom: "Irak" }, ISR: { id: "376", nom: "Israël" }, JOR: { id: "400", nom: "Jordanie" },
  KWT: { id: "414", nom: "Koweït" }, LBN: { id: "422", nom: "Liban" }, OMN: { id: "512", nom: "Oman" },
  PSE: { id: "275", nom: "Palestine" }, QAT: { id: "634", nom: "Qatar" }, SAU: { id: "682", nom: "Arabie saoudite" },
  SYR: { id: "760", nom: "Syrie" }, TUR: { id: "792", nom: "Turquie" }, ARE: { id: "784", nom: "Émirats arabes unis" },
  YEM: { id: "887", nom: "Yémen" },
};

export const ZONES = { europe: EUROPE, "moyen-orient": MOYEN_ORIENT } as const;
export type Zone = keyof typeof ZONES;
