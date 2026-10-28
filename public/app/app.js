// Training app: each lesson is a unit, each chapter a step (reading cards, then questions).
// Content comes from src/pages/app/contenu.json.ts. Progress lives on this device only (localStorage).
const CLE_CONTENU = "kratos-app-contenu";
const CLE_PROGRES = "kratos-app-progres";
const PAR_REVISION = 10;
// A missed question comes back once at the end of the step.
const ESSAIS_MAX = 2;
const XP_ETAPE = 10;
// Duolingo-like zigzag of the path, in px; mirrored on every other unit.
const ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44];
// Horizontal distance between the path's axis and the mascot standing beside it.
const COTE_MASCOTTE = 108;
const JOURS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

const $app = document.getElementById("app");
const $toast = document.getElementById("toast");
let contenu = null;
let ecran = "accueil";

const lireJSON = (cle) => { try { return JSON.parse(localStorage.getItem(cle) ?? "null"); } catch { return null; } };
const ecrireJSON = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch {} };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lien = (url) => (/^https?:\/\//.test(url) ? esc(url) : "#");
const melange = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const jour = (d = new Date()) => d.toLocaleDateString("sv");
const decale = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const vibre = (motif) => { try { navigator.vibrate?.(motif); } catch {} };
const forme = (d, cls = "") => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${esc(d)}"/></svg>`;

// Flat, rounded glyphs (24x24): the stroke in the fill colour rounds every corner.
const ICONES = {
  etoile: `<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/>`,
  livre: `<path d="M3.5 5c3-1 5.8-.6 8.5 1.3V20c-2.7-1.9-5.5-2.3-8.5-1.3zM20.5 5c-3-1-5.8-.6-8.5 1.3V20c2.7-1.9 5.5-2.3 8.5-1.3z"/>`,
  trophee: `<path d="M7 3.5h10v5a5 5 0 0 1-10 0zM7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10M12 13.5v3.5M8 20.5h8l-1-3.5H9z"/>`,
  feu: `<path d="M12 2c.8 3.6 5.5 5.6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.7 1.4-4.6 2.6-5.6.1 1.8.9 3 2 3.3C10.6 7.2 10.4 4.6 12 2z"/>`,
  eclair: `<path d="M13.5 2L4.5 13.5h6.2L9.5 22l9-11.5h-6.2z"/>`,
  cible: `<circle cx="12" cy="12" r="9" fill="none" stroke-width="3"/><circle cx="12" cy="12" r="3.5"/>`,
  croix: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>`,
  gauche: `<path d="M15 5l-7 7 7 7" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  droite: `<path d="M9 5l7 7-7 7" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
};
const ico = (nom) => `<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;

// One character per track: the track's shape as a body, with feet, arms, a face and an accessory.
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
function perso(parcours, humeur = "neutre", cls = "") {
  return `
    <svg class="perso ${cls}" viewBox="0 -16 120 140" data-parcours="${esc(parcours.id)}" aria-hidden="true">
      <g fill="none" stroke="var(--tone-d)" stroke-width="9" stroke-linecap="round">${BRAS[humeur]}</g>
      <ellipse cx="45" cy="113" rx="12" ry="7" fill="var(--tone-d)"/><ellipse cx="75" cy="113" rx="12" ry="7" fill="var(--tone-d)"/>
      <path transform="translate(10 8)" d="${esc(parcours.forme)}" fill="var(--tone)" stroke="var(--tone-d)" stroke-width="3"/>
      <ellipse cx="60" cy="84" rx="24" ry="16" fill="#fff" opacity=".2"/>
      <circle cx="33" cy="70" r="6" fill="#ff8fa3" opacity=".55"/><circle cx="87" cy="70" r="6" fill="#ff8fa3" opacity=".55"/>
      <g class="visage">${VISAGES[humeur]}</g>
      ${ACCESSOIRES[parcours.id] ?? ""}
    </svg>`;
}

// Progress: days practised (the streak is computed from them), XP, steps done.
const ancien = lireJSON(CLE_PROGRES) ?? {};
let progres = { xp: 0, jours: [], xpJour: {}, etapes: {}, revisions: {}, ...ancien };
if (ancien.serie?.dernier && !ancien.jours) {
  // Earlier versions stored only { n, dernier }: rebuild the days of that streak.
  progres.jours = Array.from({ length: ancien.serie.n }, (_, i) => jour(decale(new Date(ancien.serie.dernier), -i)));
}
const sauver = () => ecrireJSON(CLE_PROGRES, progres);

function serieActuelle() {
  const jours = new Set(progres.jours);
  let d = new Date();
  if (!jours.has(jour(d))) d = decale(d, -1);
  let n = 0;
  while (jours.has(jour(d))) { n++; d = decale(d, -1); }
  return n;
}
function meilleureSerie() {
  const jours = [...new Set(progres.jours)].sort();
  let best = 0, n = 0, prec = null;
  for (const j of jours) {
    n = prec && jour(decale(new Date(prec), 1)) === j ? n + 1 : 1;
    best = Math.max(best, n);
    prec = j;
  }
  return best;
}

const parcoursDe = (lecon) => contenu.parcours.find((p) => p.id === lecon.parcours);
const revision = (lecon) => ({
  id: `${lecon.id}:revision`, titre: "Révision de la leçon", revision: true, cartes: [],
  exercices: melange(lecon.etapes.flatMap((e) => e.exercices)).slice(0, PAR_REVISION),
});
const etapeFaite = (e) => (e.revision ? (progres.revisions[e.id] ?? 0) > 0 : Boolean(progres.etapes[e.id]));

function toast(texte) {
  $toast.textContent = texte;
  $toast.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { $toast.hidden = true; }, 2600);
}

// Content: bundled copy (or the last one downloaded), then the published one if it is newer.
async function charger() {
  const embarque = await fetch("contenu.json").then((r) => r.json()).catch(() => null);
  const cache = lireJSON(CLE_CONTENU);
  contenu = [embarque, cache].filter((c) => c?.lecons?.[0]?.etapes).sort((a, b) => b.genere.localeCompare(a.genere))[0] ?? null;
  if (!contenu) {
    $app.innerHTML = `<div class="fin"><h1>Contenu introuvable</h1><p>Connectez-vous à Internet puis relancez l'application.</p></div>`;
    return;
  }
  accueil();
  try {
    const distant = await fetch(contenu.distant, { cache: "no-store" }).then((r) => r.json());
    if (distant.lecons?.[0]?.etapes && distant.version !== contenu.version && distant.genere > contenu.genere) {
      contenu = distant;
      ecrireJSON(CLE_CONTENU, distant);
      if (ecran === "accueil") accueil();
      toast("Leçons mises à jour");
    }
  } catch {}
}

function barreHaut() {
  const serie = serieActuelle();
  const p0 = contenu.parcours[0];
  return `
    <header class="top">
      <span class="marque" data-parcours="${esc(p0.id)}">Kratos</span>
      <button class="stat feu ${serie ? "" : "eteint"}" data-serie aria-label="Série : ${serie} jours d'affilée">${ico("feu")}${serie}</button>
      <button class="stat xp ${progres.xp ? "" : "eteint"}" data-xp aria-label="${progres.xp} points d'expérience">${ico("eclair")}${progres.xp}<small>XP</small></button>
    </header>`;
}

function accueil() {
  ecran = "accueil";
  const unites = contenu.parcours.flatMap((p) => contenu.lecons.filter((l) => l.parcours === p.id));
  const toutes = unites.flatMap((l) => [...l.etapes, revision(l)].map((e) => [l, e]));
  const prochaine = toutes.find(([, e]) => !etapeFaite(e))?.[1].id;
  let u = 0;
  $app.innerHTML = `
    ${barreHaut()}
    <main class="chemin">
      ${contenu.parcours.map((p, s) => {
        const lecons = contenu.lecons.filter((l) => l.parcours === p.id);
        if (!lecons.length) return "";
        return `
          <div class="section" data-parcours="${esc(p.id)}"><span>Section ${s + 1} · ${esc(p.nom)}</span></div>
          ${lecons.map((l, iu) => {
            const sens = u++ % 2 ? -1 : 1;
            const noeuds = [...l.etapes, revision(l)];
            const iMascotte = Math.min(2, noeuds.length - 1);
            return `
              <section class="unite" data-parcours="${esc(p.id)}">
                <div class="banniere">
                  <div><small>Unité ${iu + 1} · ${l.etapes.length} étapes</small><h2>${esc(l.titre)}</h2></div>
                  <a class="guide" href="${lien(l.url)}" target="_blank" rel="noopener" aria-label="Lire la leçon sur le site">${ico("livre")}</a>
                </div>
                <ol class="noeuds">
                  ${noeuds.map((e, i) => {
                    const fait = etapeFaite(e);
                    const icone = e.revision ? "trophee" : e.exercices.length ? "etoile" : "livre";
                    const etats = [fait && (e.revision ? "or" : "fait"), e.id === prochaine && "actuel"].filter(Boolean).join(" ");
                    return `
                      <li class="noeud ${etats}" data-lecon="${esc(l.id)}" data-etape="${i}" style="--dx:${sens * ZIGZAG[i % ZIGZAG.length]}px;--cote:${-sens * COTE_MASCOTTE}px">
                        ${e.id === prochaine ? `<span class="bulle-start">${i ? "Continuer" : "Commencer"}</span>` : ""}
                        <button class="pastille" aria-label="${esc(e.titre)}">${ico(icone)}</button>
                        ${i === iMascotte ? perso(p, "neutre", "a-cote") : ""}
                      </li>`;
                  }).join("")}
                </ol>
              </section>`;
          }).join("")}`;
      }).join("")}
    </main>`;
  $app.querySelectorAll(".pastille").forEach((b) => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const li = b.closest(".noeud");
    if (li.querySelector(".carte")) return history.back();
    const lecon = contenu.lecons.find((l) => l.id === li.dataset.lecon);
    const i = Number(li.dataset.etape);
    carte(lecon, i < lecon.etapes.length ? lecon.etapes[i] : revision(lecon), i, li);
  }));
  $app.querySelector("[data-serie]").addEventListener("click", () => { history.pushState({ ecran: "serie" }, ""); ecranSerie(false); });
  $app.querySelector("[data-xp]").addEventListener("click", () => { history.pushState({ ecran: "serie" }, ""); ecranSerie(false, true); });
  $app.querySelector(".noeud.actuel")?.scrollIntoView({ block: "center" });
}

function fermerCarte() {
  document.querySelectorAll(".carte").forEach((c) => { c.parentElement.style.zIndex = ""; c.remove(); });
}

// The card has its own history entry so the Android back button closes it instead of the app.
function carte(lecon, etape, i, li) {
  if (document.querySelector(".carte")) { fermerCarte(); history.replaceState({ ecran: "carte" }, ""); }
  else history.pushState({ ecran: "carte" }, "");
  const fait = etapeFaite(etape);
  const q = etape.exercices.length;
  const meta = etape.revision
    ? `${q} questions sur toute la leçon`
    : `Étape ${i + 1} sur ${lecon.etapes.length} · ${etape.cartes.length} cartes${q ? ` · ${q} questions` : ""}`;
  li.style.zIndex = 3;
  li.insertAdjacentHTML("beforeend", `
    <div class="carte" role="dialog" aria-label="${esc(etape.titre)}">
      <small>${esc(lecon.titre)}</small>
      <h3>${esc(etape.titre)}</h3>
      <p>${meta}</p>
      <button class="btn blanc" data-go>${fait ? "Refaire" : "Commencer"} +${XP_ETAPE} XP</button>
    </div>`);
  const $carte = li.querySelector(".carte");
  $carte.addEventListener("click", (ev) => ev.stopPropagation());
  $carte.querySelector("[data-go]").addEventListener("click", () => { fermerCarte(); session(lecon, etape); });
  $carte.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

document.addEventListener("click", () => { if (document.querySelector(".carte")) history.back(); });

function session(lecon, etape) {
  ecran = "session";
  history.replaceState({ ecran }, "");
  const file = [
    ...etape.cartes.map((c) => ({ c })),
    ...melange(etape.exercices).map((e) => ({ e, essais: 0 })),
  ];
  const total = file.length;
  const etat = { faits: 0, premierCoup: 0, questions: etape.exercices.length, combo: 0 };

  const suivante = () => {
    if (!file.length) return fin(lecon, etape, etat);
    const item = file.shift();
    if (item.c) return lecture(lecon, item.c, etat, total, () => { etat.faits++; suivante(); });
    question(lecon, item, etat, total, (juste) => {
      item.essais++;
      if (juste) {
        etat.faits++;
        etat.combo++;
        if (item.essais === 1) etat.premierCoup++;
      } else {
        etat.combo = 0;
        if (item.essais < ESSAIS_MAX) file.push(item); else etat.faits++;
      }
      return { progression: etat.faits / total, combo: etat.combo };
    }, suivante);
  };
  suivante();
}

const combo = (n) => (n >= 2 ? `${ico("feu")}${n}` : "");
const barreSession = (etat, total) => `
  <div class="barre">
    <button class="fermer" aria-label="Quitter">${ico("croix")}</button>
    <div class="progres" role="progressbar" aria-valuenow="${Math.round((etat.faits / total) * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="--p:${(etat.faits / total) * 100}%"></span></div>
    <span class="combo">${combo(etat.combo)}</span>
  </div>`;
const sourceLigne = (nom, url, secondaire, suite = "") =>
  `<p class="src">${url ? `<a href="${lien(url)}" target="_blank" rel="noopener">${esc(nom)}</a>` : esc(nom)}${suite}${secondaire ? `<em> Source secondaire, à recouper.</em>` : ""}</p>`;

function rendreCarte(c, lecon) {
  switch (c.type) {
    case "texte": return `${c.titre ? `<h3>${esc(c.titre)}</h3>` : ""}<div class="prose">${c.html}</div>`;
    case "chiffre": return `<div class="gros-chiffre"><b>${esc(c.valeur)}</b><span>${esc(c.label)}</span></div>${sourceLigne(c.source, c.url, c.secondaire, `, ${esc(c.date)}`)}`;
    case "citation": return `<blockquote class="cite">« ${esc(c.texte)} »${c.traduction ? "<small>(traduction)</small>" : ""}</blockquote><p class="auteur">${esc(c.auteur)}</p>${sourceLigne(c.oeuvre, c.url, c.secondaire)}`;
    case "chrono": return `<ol class="chrono">${c.items.map((i) => `<li><b>${esc(i.date)}</b>${esc(i.texte)}</li>`).join("")}</ol>`;
    case "positions": return `<div class="positions">${c.items.map((i) => `<div><h4>${esc(i.titre)}${i.sous_titre ? `<small>${esc(i.sous_titre)}</small>` : ""}</h4><ul>${i.points.map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul></div>`).join("")}</div>`;
    case "liste": return `<h3>${esc(c.titre)}</h3><ol class="retenir">${c.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "renvoi": return `<p class="renvoi">${esc(c.texte)}</p><a class="btn contour-tone" href="${lien(c.url || lecon.url)}" target="_blank" rel="noopener">${ico("livre")}Voir dans la leçon</a>`;
    default: return "";
  }
}

function lecture(lecon, c, etat, total, continuer) {
  $app.innerHTML = `
    <div class="session" data-parcours="${esc(lecon.parcours)}">
      ${barreSession(etat, total)}
      <section class="question lecture-carte">${rendreCarte(c, lecon)}</section>
      <footer class="pied"><button class="btn" data-suite>Continuer</button></footer>
    </div>`;
  $app.querySelector(".fermer").addEventListener("click", () => history.back());
  const $suite = $app.querySelector("[data-suite]");
  $suite.addEventListener("click", continuer);
  $suite.focus({ preventScroll: true });
}

function question(lecon, item, etat, total, noter, suivante) {
  const { e } = item;
  const p = parcoursDe(lecon);
  const dialogue = (bulle) => `<div class="dialogue">${perso(p)}${bulle}</div>`;
  const enonce = {
    chiffre: `<p class="consigne">Quel chiffre manque ?</p>
      ${dialogue(`<div class="bulle"><span class="trou"></span>${esc(e.label)}<small>${esc(e.source.nom)}, ${esc(e.periode)}</small></div>`)}`,
    citation: `<p class="consigne">Qui l'a dit ou écrit ?</p>
      ${dialogue(`<blockquote class="bulle cite">« ${esc(e.texte)} »${e.traduction ? "<small>(traduction)</small>" : ""}</blockquote>`)}`,
    trou: `<p class="consigne">Complétez la phrase</p>
      ${dialogue(`<div class="bulle">${esc(e.avant)}<span class="trou"></span>${esc(e.apres)}</div>`)}`,
    ordre: `<p class="consigne">Remettez dans l'ordre chronologique</p><div class="reponse" data-reponse></div>`,
  }[e.type];
  const options = e.type === "ordre" ? melangeDesordonne(e.items.map((_, i) => i)) : melange(e.choix);

  $app.innerHTML = `
    <div class="session" data-parcours="${esc(lecon.parcours)}">
      ${barreSession(etat, total)}
      <section class="question">
        ${item.essais ? `<p class="erreur-prec">${ico("croix")}Erreur précédente</p>` : ""}
        ${enonce}
        <div class="choix" data-choix>
          ${options.map((o) => e.type === "ordre"
            ? `<button class="tuile" data-i="${o}">${esc(e.items[o].texte)}</button>`
            : `<button class="tuile" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}
        </div>
      </section>
      <footer class="pied"><button class="btn ok" data-verifier disabled>Vérifier</button></footer>
    </div>`;

  const $verifier = $app.querySelector("[data-verifier]");
  const $choix = $app.querySelector("[data-choix]");
  const $reponse = $app.querySelector("[data-reponse]");
  $app.querySelector(".fermer").addEventListener("click", () => history.back());
  let choisi = null;
  const ordre = [];

  $choix.addEventListener("click", (ev) => {
    const t = ev.target.closest(".tuile");
    if (!t || t.disabled) return;
    if (e.type === "ordre") {
      if (t.classList.contains("place")) return;
      const i = Number(t.dataset.i);
      ordre.push(i);
      t.classList.add("place");
      $reponse.insertAdjacentHTML("beforeend", `<button class="tuile" data-i="${i}">${esc(e.items[i].texte)}</button>`);
      $verifier.disabled = ordre.length < e.items.length;
    } else {
      $choix.querySelectorAll(".tuile").forEach((b) => b.setAttribute("aria-pressed", String(b === t)));
      choisi = t.dataset.v;
      $verifier.disabled = false;
    }
    vibre(8);
  });

  // Tapping a placed event sends it back to the bank.
  $reponse?.addEventListener("click", (ev) => {
    const t = ev.target.closest(".tuile");
    if (!t || t.disabled) return;
    const i = Number(t.dataset.i);
    ordre.splice(ordre.indexOf(i), 1);
    t.remove();
    $choix.querySelector(`[data-i="${i}"]`).classList.remove("place");
    $verifier.disabled = true;
  });

  $verifier.addEventListener("click", () => {
    let juste;
    if (e.type === "ordre") {
      juste = ordre.every((i, rang) => i === rang);
      // Show the right order with its dates, each slot marked against the learner's answer.
      $reponse.innerHTML = e.items.map((it, rang) =>
        `<button class="tuile ${ordre[rang] === rang ? "juste" : "faux"}" disabled>${esc(it.texte)}<span class="date">${esc(it.date)}</span></button>`).join("");
      $choix.hidden = true;
    } else {
      juste = choisi === e.reponse;
      $choix.querySelectorAll(".tuile").forEach((b) => {
        b.disabled = true;
        if (b.dataset.v === e.reponse) b.classList.add("juste");
        else if (b.dataset.v === choisi) b.classList.add("faux");
      });
    }
    $app.querySelector(".dialogue .perso")?.replaceWith(document.createRange().createContextualFragment(perso(p, juste ? "joie" : "triste")));
    vibre(juste ? 20 : [40, 60, 40]);
    const res = noter(juste);
    $app.querySelector(".progres span").style.setProperty("--p", `${res.progression * 100}%`);
    $app.querySelector(".combo").innerHTML = combo(res.combo);
    const detail = juste ? "" : e.type === "ordre" ? "Le bon ordre est affiché au-dessus." : `Réponse : ${esc(e.reponse)}`;
    const ref = e.type === "citation" ? e.oeuvre : e.type === "chiffre" ? `${e.source.nom}, ${e.periode}` : e.source.nom;
    const $pied = $app.querySelector(".pied");
    $pied.className = `pied ${juste ? "ok" : "ko"}`;
    $pied.innerHTML = `
      <p class="verdict"><span class="rond">${ico(juste ? "check" : "croix")}</span>${juste ? melange(["Bien joué !", "Exact !", "Parfait !", "Excellent !"])[0] : "Pas tout à fait"}</p>
      ${detail ? `<p class="detail">${detail}</p>` : ""}
      <p class="source">Source : <a href="${lien(e.source.url)}" target="_blank" rel="noopener">${esc(ref)}</a>${e.source.secondaire ? `<span class="sec">Source secondaire, à recouper.</span>` : ""}</p>
      <button class="btn ${juste ? "ok" : "ko"}" data-suite>Continuer</button>`;
    $pied.querySelector("[data-suite]").addEventListener("click", suivante);
    $pied.querySelector("[data-suite]").focus({ preventScroll: true });
  });
}

// An ordering exercise never starts already in order.
function melangeDesordonne(a) {
  if (a.length < 2) return a;
  let b;
  do b = melange(a); while (b.every((v, i) => v === a[i]));
  return b;
}

function fin(lecon, etape, etat) {
  ecran = "fin";
  const aujourdhui = jour();
  const nouveauJour = !progres.jours.includes(aujourdhui);
  const xp = XP_ETAPE + etat.premierCoup;
  progres.xp += xp;
  progres.xpJour[aujourdhui] = (progres.xpJour[aujourdhui] ?? 0) + xp;
  if (nouveauJour) progres.jours.push(aujourdhui);
  if (etape.revision) progres.revisions[etape.id] = (progres.revisions[etape.id] ?? 0) + 1;
  else progres.etapes[etape.id] = true;
  sauver();
  const precision = etat.questions ? Math.round((etat.premierCoup / etat.questions) * 100) : null;
  vibre([30, 50, 30, 50, 80]);

  $app.innerHTML = `
    <div class="fin" data-parcours="${esc(lecon.parcours)}">
      ${perso(parcoursDe(lecon), "joie", "grand")}
      <h1>${etape.revision ? "Leçon révisée !" : "Étape terminée !"}</h1>
      <div class="scores">
        <div class="score" style="--c:var(--or-d)"><b>XP gagnés</b><span>${ico("eclair")}${xp}</span></div>
        ${precision === null
          ? `<div class="score" style="--c:var(--tone)"><b>Lu</b><span>${ico("livre")}${etape.cartes.length}</span></div>`
          : `<div class="score" style="--c:var(--ok)"><b>Précision</b><span>${ico("cible")}${precision} %</span></div>`}
      </div>
      <button class="btn ok" data-retour>Continuer</button>
    </div>`;
  $app.querySelector("[data-retour]").addEventListener("click", () => (nouveauJour ? ecranSerie(true) : history.back()));
  confettis(contenu.parcours.map((x) => x.forme));
}

// Streak screen: shown after the first step of the day, or from the flame in the top bar.
function ecranSerie(celebration, versStats = false) {
  ecran = "serie";
  const serie = serieActuelle();
  const jours = new Set(progres.jours);
  const lundi = decale(new Date(), -((new Date().getDay() + 6) % 7));
  const semaine = Array.from({ length: 7 }, (_, i) => decale(lundi, i));
  let mois = new Date();
  mois.setDate(1);

  const rendreMois = () => {
    const titre = mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const vide = (mois.getDay() + 6) % 7;
    const n = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
    const cases = Array.from({ length: n }, (_, i) => {
      const d = new Date(mois.getFullYear(), mois.getMonth(), i + 1);
      const j = jour(d);
      const fait = jours.has(j);
      // Consecutive days are joined by a band, like Duolingo's streak calendar.
      const lieG = fait && jours.has(jour(decale(d, -1))) && d.getDay() !== 1 && i > 0;
      const lieD = fait && jours.has(jour(decale(d, 1))) && d.getDay() !== 0 && i < n - 1;
      return `<span class="jour ${fait ? "fait" : ""} ${lieG ? "lie-g" : ""} ${lieD ? "lie-d" : ""} ${j === jour() ? "auj" : ""}">${i + 1}</span>`;
    });
    return `
      <div class="mois-tete">
        <button data-mois="-1" aria-label="Mois précédent">${ico("gauche")}</button>
        <b>${esc(titre)}</b>
        <button data-mois="1" aria-label="Mois suivant">${ico("droite")}</button>
      </div>
      <div class="grille">${JOURS_SEMAINE.map((j) => `<span class="nom">${j}</span>`).join("")}${"<span></span>".repeat(vide)}${cases.join("")}</div>`;
  };

  const p0 = contenu.parcours[0];
  const etapesFaites = Object.keys(progres.etapes).length;
  $app.innerHTML = `
    <div class="ecran-serie">
      <div class="barre"><button class="fermer" aria-label="Fermer">${ico("croix")}</button></div>
      <div class="hero-serie ${serie ? "" : "eteint"}">
        <div><b>${serie}</b><span>${serie > 1 ? "jours d'affilée" : serie === 1 ? "jour de série" : "jour de série"}</span></div>
        <div class="flamme">${ico("feu")}</div>
      </div>
      <p class="message">${celebration
        ? (serie > 1 ? `Série prolongée ! Revenez demain pour passer à ${serie + 1} jours.` : "Première étape du jour : la série démarre.")
        : progres.jours.includes(jour()) ? "Étape du jour faite. Revenez demain pour continuer la série."
        : serie ? "Faites une étape aujourd'hui pour garder la série." : "Faites une étape pour démarrer une série."}</p>
      <div class="semaine">
        ${semaine.map((d, i) => `<div class="${jours.has(jour(d)) ? "fait" : ""} ${jour(d) === jour() ? "auj" : ""}"><small>${JOURS_SEMAINE[i]}</small><span>${jours.has(jour(d)) ? ico("check") : ""}</span></div>`).join("")}
      </div>
      <div class="calendrier" data-calendrier>${rendreMois()}</div>
      <h2 id="stats">Statistiques</h2>
      <div class="stats">
        <div>${ico("feu")}<b>${meilleureSerie()}</b><small>Meilleure série</small></div>
        <div>${ico("eclair")}<b>${progres.xp}</b><small>XP au total</small></div>
        <div>${ico("etoile")}<b>${etapesFaites}</b><small>Étapes terminées</small></div>
        <div>${ico("eclair")}<b>${progres.xpJour[jour()] ?? 0}</b><small>XP aujourd'hui</small></div>
      </div>
      <p class="aide"><b>XP</b> (points d'expérience) : ${XP_ETAPE} par étape terminée, plus 1 par bonne réponse du premier coup. La <b>série</b> compte les jours d'affilée où vous avez terminé au moins une étape.</p>
      ${celebration ? `<div class="pied-fixe" data-parcours="${esc(p0.id)}"><button class="btn ok" data-retour>Continuer</button></div>` : ""}
    </div>`;
  const $cal = $app.querySelector("[data-calendrier]");
  $cal.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-mois]");
    if (!b) return;
    mois = new Date(mois.getFullYear(), mois.getMonth() + Number(b.dataset.mois), 1);
    $cal.innerHTML = rendreMois();
  });
  $app.querySelector(".fermer").addEventListener("click", () => history.back());
  $app.querySelector("[data-retour]")?.addEventListener("click", () => history.back());
  if (versStats) $app.querySelector("#stats").scrollIntoView();
  else scrollTo(0, 0);
}

function confettis(formes) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const couleurs = ["var(--pouvoir)", "var(--institutions)", "var(--economie)", "var(--militaire)", "var(--societe)", "var(--or)"];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement("div");
    s.innerHTML = forme(formes[i % formes.length], "confetti");
    const c = s.firstChild;
    c.style.cssText = `left:${Math.random() * 100}vw;--c:${couleurs[i % couleurs.length]};--d:${1.6 + Math.random() * 1.8}s;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.4}s`;
    c.addEventListener("animationend", () => c.remove());
    document.body.append(c);
  }
}

// Android back button and the close buttons both go through history.
addEventListener("popstate", () => { fermerCarte(); if (ecran !== "accueil") accueil(); });

charger();
