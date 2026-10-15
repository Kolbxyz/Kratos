// Decorative shapes in the spirit of the Material 3 Expressive shape library, drawn in a 100x100 box.
export type NomForme = "biscuit" | "soleil" | "trefle" | "fleur" | "arche" | "gemme" | "pilule";

// Scalloped circles: radius oscillates n times around the centre, peaks touching the box edge.
function festonne(n: number, amplitude: number) {
  const pts: string[] = [];
  const pas = 180;
  for (let i = 0; i < pas; i++) {
    const t = (i / pas) * 2 * Math.PI;
    const r = 50 - amplitude * 50 * (1 - Math.cos(n * t)) * 0.5;
    pts.push(`${(50 + r * Math.sin(t)).toFixed(1)} ${(50 - r * Math.cos(t)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const FORMES: Record<NomForme, string> = {
  biscuit: festonne(9, 0.14),
  soleil: festonne(12, 0.1),
  trefle: festonne(4, 0.4),
  fleur: festonne(6, 0.24),
  arche: "M0 50A50 50 0 0 1 100 50V88a12 12 0 0 1-12 12H12A12 12 0 0 1 0 88Z",
  gemme: "M50 2a10 10 0 0 1 8 4l36 38a10 10 0 0 1 0 12L58 94a10 10 0 0 1-16 0L6 56a10 10 0 0 1 0-12L42 6a10 10 0 0 1 8-4Z",
  pilule: "M30 8h40a22 22 0 0 1 0 44H30a22 22 0 0 1 0-44Z",
};
