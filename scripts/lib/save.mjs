// Shared by every fetch script: writes data/<dossier>/<nom>.csv and its .source.json, stamped with today's date.
import { writeFile } from "node:fs/promises";

export const today = new Date().toISOString().slice(0, 10);

// RFC 4180: a field holding a comma or a quote is wrapped in quotes (group names contain commas).
const champ = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : v);

export async function save(base, rows, meta) {
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => champ(r[c])).join(","))].join("\n") + "\n";
  await writeFile(`${base}.csv`, csv);
  await writeFile(`${base}.source.json`, JSON.stringify({ ...meta, consulte: today }, null, 2) + "\n");
  console.log(`${base}.csv: ${rows.length} lignes`);
}
