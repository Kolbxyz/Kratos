// Training app: short quiz sessions built from the lessons (see src/lib/exercices.ts).
// Progress lives on this device only (localStorage): no account, no tracking.
const CLE_CONTENU = "kratos-app-contenu";
const CLE_PROGRES = "kratos-app-progres";
const PAR_SESSION = 10;
const ESSAIS_MAX = 3;
const NIVEAU_MAX = 3;
// Duolingo-like zigzag of the path, in px; mirrored on every other track.
const ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44];
// Horizontal distance between the path's axis and the mascot standing beside it.
const COTE_MASCOTTE = 105;

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
const hier = () => { const d = new Date(); d.setDate(d.getDate() - 1); return jour(d); };
const vibre = (motif) => { try { navigator.vibrate?.(motif); } catch {} };
const forme = (d, cls = "") => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${esc(d)}"/></svg>`;

// Flat, rounded glyphs (24x24): the stroke in the fill colour rounds every corner.
const ICONES = {
  etoile: `<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/>`,
  couronne: `<path d="M3 7.5l4.6 4L12 4.5l4.4 7 4.6-4-1.8 11.5H4.8z"/>`,
  livre: `<path d="M3.5 5c3-1 5.8-.6 8.5 1.3V20c-2.7-1.9-5.5-2.3-8.5-1.3zM20.5 5c-3-1-5.8-.6-8.5 1.3V20c2.7-1.9 5.5-2.3 8.5-1.3z"/>`,
  feu: `<path d="M12 2c.8 3.6 5.5 5.6 5.5 11.2a5.5 5.5 0 0 1-11 0c0-2.7 1.4-4.6 2.6-5.6.1 1.8.9 3 2 3.3C10.6 7.2 10.4 4.6 12 2z"/>`,
  eclair: `<path d="M13.5 2L4.5 13.5h6.2L9.5 22l9-11.5h-6.2z"/>`,
  cible: `<circle cx="12" cy="12" r="9" fill="none" stroke-width="3"/><circle cx="12" cy="12" r="3.5"/>`,
  croix: `<path d="M6 6l12 12M18 6L6 18" fill="none" stroke-width="3.2" stroke-linecap="round"/>`,
  check: `<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke-width="3.5" stroke-linecap="round"/>`,
};
const ico = (nom) => `<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;

// The track's shape with a face: the app's mascot. "joie" closes its eyes in a smile.
const mascotte = (d, humeur = "") => `
  <svg class="mascotte" viewBox="-4 -4 108 108" aria-hidden="true">
    <path class="corps" d="${esc(d)}"/>
    ${humeur === "joie"
      ? `<path d="M29 48q8-10 16 0M55 48q8-10 16 0" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>`
      : `<g class="yeux"><ellipse cx="37" cy="46" rx="8.5" ry="10.5" fill="#fff"/><ellipse cx="63" cy="46" rx="8.5" ry="10.5" fill="#fff"/>
         <circle cx="39.5" cy="48" r="4.8" fill="#1d1b17"/><circle cx="65.5" cy="48" r="4.8" fill="#1d1b17"/></g>`}
    <path d="M41 63q9 8 18 0" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <circle cx="26" cy="60" r="5.5" fill="#fff" opacity=".3"/><circle cx="74" cy="60" r="5.5" fill="#fff" opacity=".3"/>
  </svg>`;

let progres = { xp: 0, serie: { n: 0, dernier: null }, lecons: {}, ...lireJSON(CLE_PROGRES) };
const serieActuelle = () => ([jour(), hier()].includes(progres.serie.dernier) ? progres.serie.n : 0);
const parcoursDe = (lecon) => contenu.parcours.find((p) => p.id === lecon.parcours);

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
  contenu = [embarque, cache].filter(Boolean).sort((a, b) => b.genere.localeCompare(a.genere))[0] ?? null;
  if (!contenu) {
    $app.innerHTML = `<div class="fin"><h1>Contenu introuvable</h1><p>Connectez-vous à Internet puis relancez l'application.</p></div>`;
    return;
  }
  accueil();
  try {
    const distant = await fetch(contenu.distant, { cache: "no-store" }).then((r) => r.json());
    if (distant.version !== contenu.version && distant.genere > contenu.genere) {
      contenu = distant;
      ecrireJSON(CLE_CONTENU, distant);
      if (ecran === "accueil") accueil();
      toast("Leçons mises à jour");
    }
  } catch {}
}

function accueil() {
  ecran = "accueil";
  const chemin = contenu.parcours.flatMap((p) => contenu.lecons.filter((l) => l.parcours === p.id));
  const prochaine = chemin.find((l) => l.exercices.length && !progres.lecons[l.id]);
  const serie = serieActuelle();
  const p0 = contenu.parcours[0];
  $app.innerHTML = `
    <header class="top" data-parcours="${esc(p0.id)}">
      <span class="marque">${mascotte(p0.forme)}Kratos</span>
      <span class="stat feu ${serie ? "" : "eteint"}" aria-label="${serie} jours d'affilée">${ico("feu")}${serie}</span>
      <span class="stat xp ${progres.xp ? "" : "eteint"}" aria-label="${progres.xp} points d'expérience">${ico("eclair")}${progres.xp}</span>
    </header>
    <main class="chemin">
      ${contenu.parcours.map((p, u) => {
        const lecons = contenu.lecons.filter((l) => l.parcours === p.id);
        if (!lecons.length) return "";
        const sens = u % 2 ? -1 : 1;
        const iMascotte = Math.min(2, lecons.length - 1);
        return `
          <section class="unite" data-parcours="${esc(p.id)}">
            <div class="banniere">
              <div><small>Parcours ${u + 1} · ${lecons.length} leçons</small><h2>${esc(p.nom)}</h2></div>
              <a class="guide" href="${lien(p.url)}" target="_blank" rel="noopener" aria-label="Voir le parcours sur le site">${ico("livre")}</a>
            </div>
            <ol class="noeuds">
              ${lecons.map((l, i) => {
                const niveau = progres.lecons[l.id] ?? 0;
                const etats = [
                  !l.exercices.length && "vide",
                  l === prochaine && "actuel",
                  niveau >= NIVEAU_MAX && "couronne",
                  niveau > 0 && "fait",
                  niveau > 0 && niveau < NIVEAU_MAX && "anneau",
                ].filter(Boolean).join(" ");
                const icone = niveau >= NIVEAU_MAX ? "couronne" : l.exercices.length ? "etoile" : "livre";
                return `
                  <li class="noeud ${etats}" data-lecon="${esc(l.id)}" style="--dx:${sens * ZIGZAG[i % ZIGZAG.length]}px;--niveau:${niveau};--cote:${-sens * COTE_MASCOTTE}px">
                    ${l === prochaine ? `<span class="bulle-start">Commencer</span>` : ""}
                    <button class="pastille" aria-label="${esc(l.titre)}">${ico(icone)}</button>
                    ${i === iMascotte ? mascotte(p.forme) : ""}
                  </li>`;
              }).join("")}
            </ol>
          </section>`;
      }).join("")}
    </main>`;
  $app.querySelectorAll(".pastille").forEach((b) => b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    const li = b.closest(".noeud");
    if (li.querySelector(".carte")) return history.back();
    carte(contenu.lecons.find((l) => l.id === li.dataset.lecon), li);
  }));
  $app.querySelector(".noeud.actuel")?.scrollIntoView({ block: "center" });
}

function fermerCarte() {
  document.querySelectorAll(".carte").forEach((c) => { c.parentElement.style.zIndex = ""; c.remove(); });
}

// The card has its own history entry so the Android back button closes it instead of the app.
function carte(lecon, li) {
  if (document.querySelector(".carte")) { fermerCarte(); history.replaceState({ ecran: "carte" }, ""); }
  else history.pushState({ ecran: "carte" }, "");
  const niveau = progres.lecons[lecon.id] ?? 0;
  const n = Math.min(PAR_SESSION, lecon.exercices.length);
  const meta = n ? `Niveau ${niveau}/${NIVEAU_MAX} · ${n} questions` : "Pas encore de questions : à lire sur le site";
  li.style.zIndex = 3;
  li.insertAdjacentHTML("beforeend", `
    <div class="carte ${n ? "" : "grise"}" role="dialog" aria-label="${esc(lecon.titre)}">
      <h3>${esc(lecon.titre)}</h3>
      <p>${meta}${lecon.verifiee ? "" : " · relecture humaine en cours"}</p>
      <div class="actions">
        ${n ? `<button class="btn blanc" data-go>${niveau ? "S'entraîner" : "Commencer"} +10 XP</button>` : ""}
        <a class="btn contour" href="${lien(lecon.url)}" target="_blank" rel="noopener">${ico("livre")}Lire la leçon</a>
      </div>
    </div>`);
  const $carte = li.querySelector(".carte");
  $carte.addEventListener("click", (ev) => ev.stopPropagation());
  $carte.querySelector("[data-go]")?.addEventListener("click", () => { fermerCarte(); session(lecon); });
  $carte.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

document.addEventListener("click", () => { if (document.querySelector(".carte")) history.back(); });

function session(lecon) {
  ecran = "session";
  history.replaceState({ ecran }, "");
  const file = melange(lecon.exercices).slice(0, PAR_SESSION).map((e) => ({ e, essais: 0 }));
  const total = file.length;
  const etat = { faits: 0, premierCoup: 0, combo: 0 };

  const suivante = () => {
    if (!file.length) return fin(lecon, total, etat);
    const item = file.shift();
    question(lecon, item, etat, total, (juste) => {
      item.essais++;
      if (juste) {
        etat.faits++;
        etat.combo++;
        if (item.essais === 1) etat.premierCoup++;
      } else {
        etat.combo = 0;
        // A missed question comes back at the end of the session, like in Duolingo.
        if (item.essais < ESSAIS_MAX) file.push(item); else etat.faits++;
      }
      return { progression: etat.faits / total, combo: etat.combo };
    }, suivante);
  };
  suivante();
}

const combo = (n) => (n >= 2 ? `${ico("feu")}${n}` : "");

function question(lecon, { e }, etat, total, noter, suivante) {
  const corps = parcoursDe(lecon).forme;
  const enonce = {
    chiffre: `<p class="consigne">Quel chiffre manque ?</p>
      <div class="dialogue">${mascotte(corps)}<div class="bulle"><span class="trou"></span>${esc(e.label)}<small>${esc(e.source.nom)}, ${esc(e.periode)}</small></div></div>`,
    citation: `<p class="consigne">Qui l'a dit ou écrit ?</p>
      <div class="dialogue">${mascotte(corps)}<blockquote class="bulle cite" style="margin:0">« ${esc(e.texte)} »${e.traduction ? "<small>(traduction)</small>" : ""}</blockquote></div>`,
    ordre: `<p class="consigne">Remettez dans l'ordre chronologique</p><div class="reponse" data-reponse></div>`,
  }[e.type];
  const options = e.type === "ordre" ? melangeDesordonne(e.items.map((_, i) => i)) : melange(e.choix);

  $app.innerHTML = `
    <div class="session" data-parcours="${esc(lecon.parcours)}">
      <div class="barre">
        <button class="fermer" aria-label="Quitter la session">${ico("croix")}</button>
        <div class="progres" role="progressbar" aria-valuenow="${Math.round((etat.faits / total) * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="--p:${(etat.faits / total) * 100}%"></span></div>
        <span class="combo">${combo(etat.combo)}</span>
      </div>
      <section class="question">
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
    $pied.querySelector("[data-suite]").focus();
  });
}

// An ordering exercise never starts already in order.
function melangeDesordonne(a) {
  if (a.length < 2) return a;
  let b;
  do b = melange(a); while (b.every((v, i) => v === a[i]));
  return b;
}

function fin(lecon, total, etat) {
  ecran = "fin";
  const xp = 10 + etat.premierCoup;
  progres.xp += xp;
  progres.lecons[lecon.id] = Math.min(NIVEAU_MAX, (progres.lecons[lecon.id] ?? 0) + 1);
  if (progres.serie.dernier !== jour()) {
    progres.serie = { n: progres.serie.dernier === hier() ? progres.serie.n + 1 : 1, dernier: jour() };
  }
  ecrireJSON(CLE_PROGRES, progres);
  const precision = Math.round((etat.premierCoup / total) * 100);
  vibre([30, 50, 30, 50, 80]);

  $app.innerHTML = `
    <div class="fin" data-parcours="${esc(lecon.parcours)}">
      ${mascotte(parcoursDe(lecon).forme, "joie")}
      <h1>Session terminée !</h1>
      <div class="scores">
        <div class="score" style="--c:var(--or-d)"><b>XP gagnés</b><span>${ico("eclair")}${xp}</span></div>
        <div class="score" style="--c:var(--ok)"><b>Précision</b><span>${ico("cible")}${precision} %</span></div>
      </div>
      ${lecon.retenir.length ? `<p class="retenir-titre">À retenir</p><ol class="retenir">${lecon.retenir.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` : ""}
      <button class="btn ok" data-retour>Continuer</button>
    </div>`;
  $app.querySelector("[data-retour]").addEventListener("click", () => history.back());
  confettis(contenu.parcours.map((x) => x.forme));
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
