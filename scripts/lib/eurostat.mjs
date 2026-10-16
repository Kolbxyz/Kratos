// Decodes an Eurostat JSON-stat response into flat rows, whatever its dimensions: one object per non-empty cell.
const API = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data";

export async function eurostat(dataset, query) {
  const res = await fetch(`${API}/${dataset}?format=JSON&lang=fr&${query}`);
  if (!res.ok) throw new Error(`Eurostat ${dataset} : ${res.status}`);
  const j = await res.json();
  // Row-major layout: the last dimension varies fastest.
  const strides = j.size.map((_, i) => j.size.slice(i + 1).reduce((a, b) => a * b, 1));
  const rows = [];
  for (const [flat, valeur] of Object.entries(j.value)) {
    const row = { valeur };
    j.id.forEach((dim, i) => {
      const position = Math.floor(Number(flat) / strides[i]) % j.size[i];
      row[dim] = Object.entries(j.dimension[dim].category.index).find(([, p]) => p === position)[0];
    });
    rows.push(row);
  }
  return rows;
}
