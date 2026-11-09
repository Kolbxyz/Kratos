// One mascot per track (class), drawn on the track's shape: its own face, prop, idle motion and lines.
// Shared by the app and by mobile/icones.mjs (launcher icon). Body colours come from --m, --m-l and
// --m-d, set per [data-parcours] in app.css. Moods: neutre, joie, reflexion, triste.
const attr = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const ENCRE = "#221a2e";
const trait = (d, l = 3.2) => `<path d="${d}" fill="none" stroke="${ENCRE}" stroke-width="${l}" stroke-linecap="round" stroke-linejoin="round"/>`;
const oeil = (cx, cy, rx, ry, bx = 2.6, by = -3.6, r = 2.6) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${ENCRE}"/><circle cx="${cx + bx}" cy="${cy + by}" r="${r}" fill="#fff"/>`;
const etoile = (cx, cy, r) => `<path d="M${cx} ${cy - r}Q${cx} ${cy} ${cx + r} ${cy}Q${cx} ${cy} ${cx} ${cy + r}Q${cx} ${cy} ${cx - r} ${cy}Q${cx} ${cy} ${cx} ${cy - r}Z" fill="#fff"/>`;
const plissés = trait("M37 60q8-9 16 0M67 60q8-9 16 0", 3.8);
const bouche = (d) => `<path d="${d}" fill="${ENCRE}" stroke="${ENCRE}" stroke-width="2" stroke-linejoin="round"/>`;
const joues = `<ellipse cx="33" cy="72" rx="6.5" ry="4" fill="#ff7d9c" opacity=".5"/><ellipse cx="87" cy="72" rx="6.5" ry="4" fill="#ff7d9c" opacity=".5"/>`;

// Half-lidded eyes: the Prince looks at you from slightly above.
const miClos = (dy = 0, bx = 0) => `<path d="M37.5 ${56 + dy}h15a7.5 8.5 0 0 1-15 0zM67.5 ${56 + dy}h15a7.5 8.5 0 0 1-15 0z" fill="${ENCRE}"/>
  <circle cx="${48.5 + bx}" cy="${59.5 + dy}" r="2.2" fill="#fff"/><circle cx="${78.5 + bx}" cy="${59.5 + dy}" r="2.2" fill="#fff"/>`;
const lunettes = `<g fill="#fff" fill-opacity=".2" stroke="#1f2430" stroke-width="2.6"><circle cx="45" cy="58" r="11.5"/><circle cx="75" cy="58" r="11.5"/></g>${trait("M56.5 56q3.5-3 7 0", 2.6).replace(ENCRE, "#1f2430")}`;
const taches = `<g fill="#9a4a00" opacity=".45"><circle cx="30" cy="70" r="1.3"/><circle cx="34" cy="73.5" r="1.3"/><circle cx="28.5" cy="75" r="1.1"/><circle cx="90" cy="70" r="1.3"/><circle cx="86" cy="73.5" r="1.3"/><circle cx="91.5" cy="75" r="1.1"/></g>`;

const VISAGES = {
  pouvoir: {
    neutre: `${joues}${miClos()}${trait("M36 56h18M66 56h18", 3.4)}${trait("M67 46q8-6 16-2", 3)}${trait("M52 74q8 5 15-3")}`,
    joie: `${joues}${plissés}${trait("M67 45q8-6 16-2", 3)}${bouche("M50 70q10 12 20-2q-10 5-20 2z")}`,
    reflexion: `${joues}${miClos(0, 2.5)}${trait("M36 56h18M66 56h18", 3.4)}${trait("M37 47q8-3 15 0M67 44q8-5 16-1", 3)}${trait("M55 76q5-2 10 0")}`,
    triste: `${joues}${miClos(2)}${trait("M36 56l18 3M84 56l-18 3", 3.4)}${trait("M54 79q6-4 12 0")}`,
  },
  institutions: {
    neutre: `${joues}${oeil(45, 58, 4.8, 5.8, 1.8, -2.4, 1.8)}${oeil(75, 58, 4.8, 5.8, 1.8, -2.4, 1.8)}${lunettes}${trait("M55 75q5 2.5 10 0")}`,
    joie: `${joues}${trait("M40 60q5-6 10 0M70 60q5-6 10 0", 3.2)}${lunettes}${trait("M53 73q7 7 14 0")}`,
    reflexion: `${joues}${oeil(45, 55.5, 4.8, 5.8, 1.8, -2.4, 1.8)}${oeil(75, 55.5, 4.8, 5.8, 1.8, -2.4, 1.8)}${lunettes}${trait("M66 41q9-3 17 0", 3)}${trait("M56 76h8")}`,
    triste: `${joues}${oeil(45, 60, 4.4, 5, 1.6, -2, 1.6)}${oeil(75, 60, 4.4, 5, 1.6, -2, 1.6)}${lunettes}${trait("M35 42l12 3M85 42l-12 3", 3)}${trait("M55 78q5-3 10 0")}`,
  },
  economie: {
    neutre: `${joues}${oeil(45, 58, 6.5, 8)}${oeil(75, 58, 8.5, 10, 3.2, -4.4, 3.2)}${bouche("M50 70q10 11 20 0z")}<rect x="57.5" y="70" width="5" height="4" rx="1" fill="#fff"/>`,
    joie: `${joues}${trait("M38 59q7-7 14 0", 3.6)}${oeil(75, 58, 8.5, 10, 3.2, -4.4, 3.2)}${bouche("M48 69q12 15 24 0z")}<rect x="57" y="69" width="6" height="4.5" rx="1" fill="#fff"/><path d="M55 78q5-3.5 10 0q-5 3-10 0z" fill="#ff7d9c"/>`,
    reflexion: `${joues}${oeil(45, 56, 6.5, 8, 2.6, -4.4)}${oeil(75, 56, 8.5, 10, 3.2, -5.4, 3.2)}${trait("M54 76q6 3 12-1")}`,
    triste: `${joues}${oeil(45, 60, 6, 7)}${oeil(75, 60, 8, 9, 3, -3.6, 3)}${trait("M36 47l12-3", 3)}${trait("M52 79q4-3 8 0t8 0")}`,
  },
  militaire: {
    neutre: `${joues}${oeil(45, 59, 6.5, 7.5)}${oeil(75, 59, 6.5, 7.5)}${trait("M36 46l14 4.5M84 46l-14 4.5", 4.2)}${trait("M54 75q6 2 12 0", 3.4)}`,
    joie: `${joues}${trait("M38 61q7-8 14 0M68 61q7-8 14 0", 3.8)}${trait("M36 46l14 2M84 46l-14 2", 4.2)}${bouche("M50 70q10 12 20 0z")}`,
    reflexion: `${joues}${oeil(45, 59, 6.5, 7.5, -2.6)}${oeil(75, 59, 6.5, 7.5, -2.6)}${trait("M36 47l14 4", 4.2)}${trait("M70 44q7-3 14 0", 4)}${trait("M56 76h8", 3.4)}`,
    triste: `${joues}${oeil(45, 60, 6, 7)}${oeil(75, 60, 6, 7)}${trait("M37 48l13-3.5M83 48l-13-3.5", 4)}${trait("M54 78q6-3 12 0", 3.4)}<path d="M92 40q-3 5 0 7q3-2 0-7z" fill="#8fd3ff"/>`,
  },
  societe: {
    neutre: `${taches}${oeil(45, 58, 8.5, 10, 0, 0, 0)}${etoile(48.5, 54, 4)}<circle cx="42" cy="62.5" r="1.6" fill="#fff"/>${oeil(75, 58, 8.5, 10, 0, 0, 0)}${etoile(78.5, 54, 4)}<circle cx="72" cy="62.5" r="1.6" fill="#fff"/><ellipse cx="60" cy="75.5" rx="3.4" ry="3" fill="${ENCRE}"/>`,
    joie: `${taches}${plissés}${etoile(30, 50, 3.4).replace("#fff", "#ffe27a")}${etoile(91, 48, 3).replace("#fff", "#ffe27a")}${bouche("M52 71q8 10 16 0z")}<path d="M56 77q4-3 8 0q-4 2.5-8 0z" fill="#ff7d9c"/>`,
    reflexion: `${taches}${oeil(45, 56, 8.5, 10, 0, 0, 0)}${etoile(44, 51, 3.6)}${oeil(75, 56, 8.5, 10, 0, 0, 0)}${etoile(74, 51, 3.6)}<ellipse cx="60" cy="76" rx="2.4" ry="2.4" fill="${ENCRE}"/><circle cx="99" cy="38" r="2.6" fill="#fff" opacity=".85"/><circle cx="106" cy="29" r="3.6" fill="#fff" opacity=".85"/>`,
    triste: `${taches}${oeil(45, 59, 8, 9.5, 0, 0, 0)}${etoile(47.5, 55, 3.4)}${oeil(75, 59, 8, 9.5, 0, 0, 0)}${etoile(77.5, 55, 3.4)}<path d="M37 64q8 6 16 0M67 64q8 6 16 0" fill="#8fd3ff" opacity=".9"/>${trait("M55 78q5-3 10 0")}`,
  },
};

const BRAS = {
  neutre: "M24 76q-11 5-12 17M96 76q11 5 12 17",
  joie: "M24 72q-12-5-15-20M96 72q12-5 15-20",
  reflexion: "M24 76q-11 5-12 17M96 78q4 14-22 8",
  triste: "M24 78q-6 8-6 20M96 78q6 8 6 20",
};

// Props: drawn behind the body (cape) or in front (hats, glasses, medals).
const ACCESSOIRES = {
  pouvoir: {
    derriere: `<path d="M24 62Q12 110 28 124H92Q108 110 96 62Z" fill="#c2304f"/><path d="M28 124H92" stroke="#8f1d37" stroke-width="3" stroke-linecap="round"/>`,
    devant: `<g transform="rotate(-10 60 10)"><path d="M42 16l3-17 9 9 6-13 6 13 9-9 3 17z" fill="#ffcf3f" stroke="#d99a00" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="9" r="2.6" fill="#e84a5f"/><circle cx="46" cy="12" r="1.6" fill="#fff" opacity=".8"/></g>`,
  },
  institutions: {
    devant: `<rect x="45" y="-3" width="30" height="13" rx="3" fill="#1f2430"/><rect x="45" y="6" width="30" height="3.5" fill="#e3b23c"/>
      <path d="M44 96q16 6 32 0" fill="none" stroke="#1f2430" stroke-width="3" stroke-linecap="round"/><path d="M55 98.5h4.5v9a2.25 2.25 0 0 1-4.5 0zM60.5 98.5h4.5v9a2.25 2.25 0 0 1-4.5 0z" fill="#fff" stroke="#d5dde8" stroke-width="1"/>`,
  },
  economie: {
    devant: `<g transform="rotate(8 60 10)"><path d="M45 13q0-17 15-17t15 17z" fill="#25262b"/><rect x="45" y="7" width="30" height="5" fill="#c9a227"/><ellipse cx="60" cy="13" rx="22" ry="4.5" fill="#25262b"/></g>
      <circle cx="75" cy="58" r="12.5" fill="#fff" fill-opacity=".14" stroke="#e3b23c" stroke-width="2.8"/><path d="M87 63q6 16-3 30" fill="none" stroke="#e3b23c" stroke-width="1.6"/>`,
  },
  militaire: {
    devant: `<path d="M45 18l2-15h26l2 15z" fill="#2f3d5c"/><rect x="45.5" y="11" width="29" height="6" fill="#b3302a"/><circle cx="60" cy="7" r="2.6" fill="#ffcf3f"/>
      <path d="M41 18q19 8 38 0v3q-19 9-38 0z" fill="#161a24"/><path d="M73 82h8l-1.5 8h-5z" fill="#2f5fd0"/><circle cx="77" cy="94" r="5" fill="#ffcf3f" stroke="#d99a00" stroke-width="1.6"/>`,
  },
  societe: {
    devant: `<g transform="rotate(-12 56 10)"><ellipse cx="56" cy="11" rx="22" ry="7.5" fill="#2b2b3a"/><path d="M56 4v-5" stroke="#2b2b3a" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M27 84q33 13 66 0v8q-33 13-66 0z" fill="#2f6fd6"/><path d="M76 92l7 19h-9l-4-17z" fill="#2f6fd6"/><path d="M75 102h8M77 107h7" stroke="#fff" stroke-width="2" opacity=".7"/>`,
  },
};

// Who they are. Lines are encouragement only: they never state a fact.
export const MASCOTTES = {
  pouvoir: {
    nom: "Prince", role: "Couronne, cape et un sourire en coin",
    accueil: ["Comprendre le pouvoir, c'est déjà en avoir un peu.", "Une étape par jour : les empires se bâtissent ainsi.", "On conquiert ce chapitre ?"],
    juste: ["Parfait. Je n'en attendais pas moins.", "Voilà qui est digne d'un prince."],
    faux: ["Une défaite tactique. On y reviendra.", "Même les princes trébuchent."],
    fini: "Tout le royaume est conquis. Place aux révisions.",
  },
  institutions: {
    nom: "Thémis", role: "Toque, rabat et lunettes de juriste",
    accueil: ["Procédons dans l'ordre, une règle après l'autre.", "Chaque article a sa raison d'être.", "L'audience est ouverte."],
    juste: ["Exact. Rien à redire.", "Conforme au texte."],
    faux: ["Objection retenue : la question reviendra.", "Relisons les pièces du dossier."],
    fini: "Dossier complet. Il reste à réviser.",
  },
  economie: {
    nom: "Crésus", role: "Chapeau melon, monocle et dent du bonheur",
    accueil: ["Un chapitre par jour, et les intérêts se composent.", "Dix minutes investies, rendement garanti.", "Le marché ouvre, on y va ?"],
    juste: ["Excellent placement !", "Dividende encaissé."],
    faux: ["Petite perte, on se refait.", "Le marché corrige, nous aussi."],
    fini: "Portefeuille complet. On consolide ?",
  },
  militaire: {
    nom: "Bastion", role: "Képi, médaille et sourcils déterminés",
    accueil: ["Objectif du jour : un chapitre. En avant.", "Discipline et constance, c'est tout.", "Rassemblement, on reprend la mission."],
    juste: ["Cible atteinte !", "Mission accomplie."],
    faux: ["Repli, puis nouvel assaut.", "On tient la position et on recommence."],
    fini: "Toutes les positions sont prises. Exercices de maintien ?",
  },
  societe: {
    nom: "Plume", role: "Béret, écharpe et yeux qui pétillent",
    accueil: ["Et si on doutait un peu, ensemble ?", "Une question en amène toujours une autre.", "J'ai une idée à vous montrer aujourd'hui."],
    juste: ["Oh, joliment pensé !", "Vous voyez plus loin que la question."],
    faux: ["Bonne erreur : elle fait réfléchir.", "Hmm, regardons ça autrement."],
    fini: "Tout lu, tout pensé. On repense ?",
  },
};

let uid = 0;
export function perso(parcours, humeur = "neutre", cls = "") {
  const id = parcours.id, g = `pg${++uid}`, o = `po${uid}`;
  const a = ACCESSOIRES[id] ?? {};
  const main = humeur === "reflexion" ? `<circle cx="73" cy="85" r="5" style="fill:var(--m-l);stroke:var(--m-d)" stroke-width="2.5"/>` : "";
  return `<svg class="perso ${humeur} ${cls}" viewBox="0 -24 120 152" data-parcours="${attr(id)}" aria-hidden="true">
    <defs><radialGradient id="${g}" cx=".32" cy=".26" r=".85"><stop offset="0" style="stop-color:var(--m-l)"/><stop offset=".55" style="stop-color:var(--m)"/><stop offset="1" style="stop-color:var(--m-d)"/></radialGradient>
    <linearGradient id="${o}" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient></defs>
    <g class="corps">
      ${a.derriere ?? ""}
      <path d="M52 100l-4 14M68 100l4 14" style="stroke:var(--m-d)" stroke-width="7" stroke-linecap="round"/>
      <ellipse cx="46" cy="117" rx="10" ry="5.5" style="fill:var(--m-d)"/><ellipse cx="74" cy="117" rx="10" ry="5.5" style="fill:var(--m-d)"/>
      <path d="${BRAS[humeur]}" fill="none" style="stroke:var(--m-d)" stroke-width="8" stroke-linecap="round"/>
      <path transform="translate(10 8)" d="${attr(parcours.forme)}" fill="url(#${g})"/>
      <path transform="translate(10 8)" d="${attr(parcours.forme)}" fill="url(#${o})"/>
      <ellipse cx="60" cy="90" rx="20" ry="11" fill="#fff" opacity=".16"/>
      <g class="visage">${VISAGES[id]?.[humeur] ?? ""}</g>
      ${main}
      ${a.devant ?? ""}
    </g></svg>`;
}
