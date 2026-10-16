// Layered layout for a small directed graph (who appoints whom, how a bill travels): roots on top, one row per depth.
export interface Noeud { id: string; nom: string; detail?: string }
export interface Lien { de: string; vers: string; verbe: string; source: string; url: string }
export interface NoeudPlace extends Noeud { x: number; y: number; lignes: string[] }
export interface Trait { d: string; mx: number; my: number }

export const LARGEUR = 152;
export const HAUTEUR = 64;
const ECART_X = 16;
const ECART_Y = 130; // row pitch: leaves 66px between boxes so an arrow and its badge both stay visible
const MARGE = 12;
const CARACTERES = 18; // characters per line at the node font size

function couper(texte: string): string[] {
  const lignes: string[] = [];
  for (const mot of texte.split(" ")) {
    const derniere = lignes.at(-1);
    if (derniere && derniere.length + 1 + mot.length <= CARACTERES) lignes[lignes.length - 1] = `${derniere} ${mot}`;
    else lignes.push(mot);
  }
  return lignes;
}

export function disposer(noeuds: Noeud[], liens: Lien[]) {
  const ids = new Set(noeuds.map((n) => n.id));
  for (const l of liens) for (const id of [l.de, l.vers]) if (!ids.has(id)) throw new Error(`schéma : nœud inconnu « ${id} »`);

  // A link that closes a cycle (HATVP checks the lobbyist who declares to it) is a back edge: it does not set depth,
  // so the cycle cannot push nodes down level after level and leave empty rows.
  const retour = new Set<Lien>();
  const etat = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
  const visite = (id: string) => {
    etat.set(id, 1);
    for (const l of liens) {
      if (l.de !== id) continue;
      if (etat.get(l.vers) === 1) retour.add(l);
      else if (!etat.has(l.vers)) visite(l.vers);
    }
    etat.set(id, 2);
  };
  for (const n of noeuds) if (!etat.has(n.id)) visite(n.id);

  // Depth = longest path from a root over the remaining links, which form a DAG.
  const profondeur = new Map(noeuds.map((n) => [n.id, 0]));
  for (let passe = 0; passe < noeuds.length; passe++) {
    for (const l of liens) if (!retour.has(l)) profondeur.set(l.vers, Math.max(profondeur.get(l.vers)!, profondeur.get(l.de)! + 1));
  }
  const niveaux: Noeud[][] = [];
  for (const n of noeuds) (niveaux[profondeur.get(n.id)!] ??= []).push(n);

  // One barycentre pass: each node sits under the average position of its parents, which removes most crossings.
  const rang = new Map<string, number>();
  niveaux.forEach((niveau, d) => {
    if (d > 0) {
      const centre = (n: Noeud) => {
        const parents = liens.filter((l) => l.vers === n.id && !retour.has(l)).map((l) => rang.get(l.de) ?? 0);
        return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : 0;
      };
      niveau.sort((a, b) => centre(a) - centre(b));
    }
    niveau.forEach((n, i) => rang.set(n.id, i));
  });

  const largeurMax = Math.max(...niveaux.map((n) => n.length));
  const largeurBase = MARGE * 2 + largeurMax * LARGEUR + (largeurMax - 1) * ECART_X;
  const hauteur = MARGE * 2 + niveaux.length * HAUTEUR + (niveaux.length - 1) * (ECART_Y - HAUTEUR);
  const places: NoeudPlace[] = niveaux.flatMap((niveau, d) => {
    const occupe = niveau.length * LARGEUR + (niveau.length - 1) * ECART_X;
    return niveau.map((n, i) => ({
      ...n,
      x: (largeurBase - occupe) / 2 + i * (LARGEUR + ECART_X),
      y: MARGE + d * ECART_Y,
      lignes: couper(n.nom),
    }));
  });
  const par = new Map(places.map((p) => [p.id, p]));

  // A link that skips a level would run through the boxes in between: it loops round the right-hand side instead.
  const saute = (l: Lien) => Math.abs(profondeur.get(l.vers)! - profondeur.get(l.de)!) > 1 && !retour.has(l);
  const droite = Math.max(...places.map((p) => p.x + LARGEUR));
  let contournements = 0;
  const traits: Trait[] = liens.map((l) => {
    const a = par.get(l.de)!;
    const b = par.get(l.vers)!;
    // Links between the same two boxes (either direction) fan out so that arrows and badges do not stack.
    const paires = liens.filter((m) => (m.de === l.de && m.vers === l.vers) || (m.de === l.vers && m.vers === l.de));
    const dx = (paires.indexOf(l) - (paires.length - 1) / 2) * 22;
    const remonte = b.y < a.y; // back edge: leaves the top of the lower box, enters the bottom of the upper one
    const x1 = a.x + LARGEUR / 2 + dx, y1 = remonte ? a.y : a.y + HAUTEUR;
    const x2 = b.x + LARGEUR / 2 + dx, y2 = remonte ? b.y + HAUTEUR : b.y;
    const sens = remonte ? 1 : -1;
    if (saute(l)) {
      // The curve peaks at 3/4 of its control point's offset, so the control point is pushed out to make the peak clear the boxes.
      const sommet = droite + 20 + 16 * contournements++;
      const xc = (x1 + x2) / 2;
      const ctrl = (sommet - 0.25 * xc) / 0.75;
      return { d: `M${x1} ${y1} C${ctrl} ${y1 + 30} ${ctrl} ${y2 - 30} ${x2} ${y2 + sens}`, mx: sommet, my: (y1 + y2) / 2 };
    }
    const milieu = (y1 + y2) / 2;
    return { d: `M${x1} ${y1} C${x1} ${milieu} ${x2} ${milieu} ${x2} ${y2 + sens}`, mx: (x1 + x2) / 2, my: milieu };
  });
  const largeur = contournements ? droite + 20 + 16 * contournements + MARGE : largeurBase;
  return { places, largeur, hauteur, traits };
}
