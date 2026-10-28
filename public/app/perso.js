// One character per track: the track's shape as a body, with feet, arms, a face and an accessory.
// Shared by the app and by mobile/icones.mjs (launcher icon and splash). Colours come from the
// --tone / --tone-d custom properties of the [data-parcours] element.
const attr = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const ACCESSOIRES = {
  pouvoir: `<path d="M41 20l4-17 8 10 7-13 7 13 8-10 4 17z" fill="#ffc800" stroke="#e0a200" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="1" r="3" fill="#ff4b4b"/>`,
  institutions: `<path d="M60 88l-15-9v18zM60 88l15-9v18z" fill="#ffc800" stroke="#e0a200" stroke-width="3" stroke-linejoin="round"/><circle cx="60" cy="88" r="5" fill="#e0a200"/>`,
  economie: `<path d="M47 12V-12h26v24z" fill="#3c3c3c"/><rect x="47" y="3" width="26" height="6" fill="#ffc800"/><ellipse cx="60" cy="13" rx="25" ry="5" fill="#3c3c3c"/>`,
  militaire: `<path d="M30 36Q32 0 60 0t30 36z" fill="#6b7d36" stroke="#4e5c26" stroke-width="3" stroke-linejoin="round"/><path d="M26 36h68" stroke="#4e5c26" stroke-width="6" stroke-linecap="round"/>`,
  societe: `<g fill="none" stroke="#3c3c3c" stroke-width="3.5"><circle cx="46" cy="53" r="13"/><circle cx="74" cy="53" r="13"/><path d="M59 51q1-3 2 0"/></g>`,
};
const VISAGES = {
  neutre: `<ellipse cx="46" cy="53" rx="9.5" ry="11.5" fill="#fff"/><ellipse cx="74" cy="53" rx="9.5" ry="11.5" fill="#fff"/>
    <g class="pupilles"><circle cx="48" cy="56" r="5.5" fill="#1d1b17"/><circle cx="76" cy="56" r="5.5" fill="#1d1b17"/><circle cx="50" cy="53.5" r="2" fill="#fff"/><circle cx="78" cy="53.5" r="2" fill="#fff"/></g>
    <path d="M52 74q8 7 16 0" fill="none" stroke="#1d1b17" stroke-width="4" stroke-linecap="round"/>`,
  joie: `<path d="M37 56q9-11 18 0M65 56q9-11 18 0" fill="none" stroke="#1d1b17" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M47 69q13 20 26 0z" fill="#1d1b17" stroke="#1d1b17" stroke-width="3" stroke-linejoin="round"/><ellipse cx="60" cy="77" rx="6" ry="3.5" fill="#ff7a8a"/>`,
  triste: `<ellipse cx="46" cy="55" rx="9" ry="10" fill="#fff"/><ellipse cx="74" cy="55" rx="9" ry="10" fill="#fff"/>
    <circle cx="46" cy="58" r="5" fill="#1d1b17"/><circle cx="74" cy="58" r="5" fill="#1d1b17"/>
    <path d="M36 40l15 5M84 40l-15 5" stroke="#1d1b17" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 78q8-7 16 0" fill="none" stroke="#1d1b17" stroke-width="4" stroke-linecap="round"/>`,
};
const BRAS = {
  neutre: `<path d="M24 68q-12 4-14 16M96 68q12 4 14 16"/>`,
  joie: `<path d="M24 64q-12-6-14-22M96 64q12-6 14-22"/>`,
  triste: `<path d="M24 70q-8 8-8 20M96 70q8 8 8 20"/>`,
};

export function perso(parcours, humeur = "neutre", cls = "") {
  return `
    <svg class="perso ${humeur} ${cls}" viewBox="0 -16 120 140" data-parcours="${attr(parcours.id)}" aria-hidden="true">
      <g class="corps-entier">
        <g fill="none" stroke="var(--tone-d)" stroke-width="9" stroke-linecap="round">${BRAS[humeur]}</g>
        <ellipse cx="45" cy="113" rx="12" ry="7" fill="var(--tone-d)"/><ellipse cx="75" cy="113" rx="12" ry="7" fill="var(--tone-d)"/>
        <path transform="translate(10 8)" d="${attr(parcours.forme)}" fill="var(--tone)" stroke="var(--tone-d)" stroke-width="3"/>
        <ellipse cx="60" cy="84" rx="24" ry="16" fill="#fff" opacity=".2"/>
        <circle cx="33" cy="70" r="6" fill="#ff8fa3" opacity=".55"/><circle cx="87" cy="70" r="6" fill="#ff8fa3" opacity=".55"/>
        <g class="visage">${VISAGES[humeur]}</g>
        ${ACCESSOIRES[parcours.id] ?? ""}
      </g>
    </svg>`;
}
