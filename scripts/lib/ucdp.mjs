// Shared by the UCDP fetch scripts: zip and CSV readers, and the latest published version of a dataset.
import { inflateRawSync } from "node:zlib";

export const PAGE_UCDP = "https://ucdp.uu.se/downloads/";

// Latest published version of a dataset, read from the UCDP downloads page. `motif` holds one capture group for the version (e.g. "261" = 26.1).
export async function derniereVersion(motif, dossier) {
  const res = await fetch(PAGE_UCDP);
  if (!res.ok) throw new Error(`UCDP downloads : ${res.status}`);
  const html = await res.text();
  const versions = [...html.matchAll(motif)].map((m) => Number(m[1]));
  if (!versions.length) throw new Error(`UCDP : lien ${motif} introuvable, la page a changé`);
  const v = Math.max(...versions);
  return { v, url: `${PAGE_UCDP}${dossier(v)}`, version: `${String(v).slice(0, -1)}.${String(v).slice(-1)}` };
}

export async function telechargerCsv(info) {
  const res = await fetch(info.url);
  if (!res.ok) throw new Error(`UCDP ${info.version} : ${res.status} (${info.url})`);
  return lireCsv(lireZip(Buffer.from(await res.arrayBuffer())));
}

// Minimal zip reader for a small archive: central directory, then raw inflate of the first CSV entry.
export function lireZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("zip UCDP : fin de répertoire introuvable");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const methode = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const n = buf.readUInt16LE(p + 28), m = buf.readUInt16LE(p + 30), k = buf.readUInt16LE(p + 32);
    const offset = buf.readUInt32LE(p + 42);
    const nom = buf.toString("utf8", p + 46, p + 46 + n);
    if (nom.endsWith(".csv")) {
      const debut = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
      const data = buf.subarray(debut, debut + csize);
      if (methode !== 8 && methode !== 0) throw new Error(`zip UCDP : méthode ${methode} non prise en charge`);
      return (methode === 8 ? inflateRawSync(data) : data).toString("utf8");
    }
    p += 46 + n + m + k;
  }
  throw new Error("zip UCDP : aucun CSV");
}

// RFC 4180 reader (comma separated, quoted fields may hold commas and line breaks).
export function lireCsv(texte) {
  const lignes = [];
  let champ = "", ligne = [], guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"') { if (texte[i + 1] === '"') { champ += '"'; i++; } else guillemets = false; }
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ",") { ligne.push(champ); champ = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ); champ = "";
      if (ligne.length > 1 || ligne[0] !== "") lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== "" || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const [tete, ...corps] = lignes;
  return corps.map((l) => Object.fromEntries(tete.map((t, i) => [t, l[i]])));
}

