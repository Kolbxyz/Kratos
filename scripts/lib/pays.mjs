// Shared by the Eurostat fetch scripts: the three countries compared in the lessons, and Eurostat geo codes mapped to the ISO alpha-3 codes of <Carte>.
export const PAYS = { FR: "France", DE: "Allemagne", IT: "Italie" };
export const geosFrDeIt = Object.keys(PAYS).map((g) => `geo=${g}`).join("&");
export const ISO3 = {
  AL: "ALB", AT: "AUT", BE: "BEL", BG: "BGR", BA: "BIH", CH: "CHE", CY: "CYP", CZ: "CZE", DE: "DEU", DK: "DNK", EE: "EST", EL: "GRC",
  ES: "ESP", FI: "FIN", FR: "FRA", HR: "HRV", HU: "HUN", IE: "IRL", IS: "ISL", IT: "ITA", LT: "LTU", LU: "LUX", LV: "LVA", MD: "MDA",
  ME: "MNE", MK: "MKD", MT: "MLT", NL: "NLD", NO: "NOR", PL: "POL", PT: "PRT", RO: "ROU", RS: "SRB", SE: "SWE", SI: "SVN", SK: "SVK", TR: "TUR", UA: "UKR",
};
