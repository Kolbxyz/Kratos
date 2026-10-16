// Seat layout for a semicircular chamber: concentric rows, seats spread by angle so each group forms a wedge.
export interface Siege { x: number; y: number; groupe: number }

export function disposer(effectifs: number[], rInt = 0.5): { sieges: Siege[]; rayon: number } {
  const total = effectifs.reduce((a, b) => a + b, 0);
  // Row count grows with the square root of the chamber size so seat density stays constant.
  const rangs = Math.max(2, Math.round(Math.sqrt(total) / 2.4));
  const pas = (1 - rInt) / (rangs - 1);
  const rayons = Array.from({ length: rangs }, (_, i) => rInt + i * pas);
  const somme = rayons.reduce((a, b) => a + b, 0);

  // Seats per row proportional to its radius; rounding drift is absorbed by the outer row.
  const parRang = rayons.map((r) => Math.round((total * r) / somme));
  parRang[rangs - 1] += total - parRang.reduce((a, b) => a + b, 0);

  const bruts = rayons.flatMap((r, i) =>
    Array.from({ length: parRang[i] }, (_, k) => {
      const angle = Math.PI * (1 - (parRang[i] === 1 ? 0.5 : k / (parRang[i] - 1)));
      return { angle, r };
    }),
  );
  // Left to right, ties broken from the inner row outwards.
  bruts.sort((a, b) => b.angle - a.angle || a.r - b.r);

  const groupes = effectifs.flatMap((n, g) => Array<number>(n).fill(g));
  const sieges = bruts.map((s, i) => ({ x: s.r * Math.cos(s.angle), y: -s.r * Math.sin(s.angle), groupe: groupes[i] }));
  // Dot radius: largest that keeps neighbours apart on the tighter of the two axes.
  const rayon = Math.min(pas, (Math.PI * rayons[0]) / parRang[0]) * 0.42;
  return { sieges, rayon };
}
