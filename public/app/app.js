// Training app: short quiz sessions built from the lessons (see src/lib/exercices.ts).
// Progress lives on this device only (localStorage): no account, no tracking.
const CLE_CONTENU = "kratos-app-contenu";
const CLE_PROGRES = "kratos-app-progres";
const PAR_SESSION = 10;
const ESSAIS_MAX = 3;
const NIVEAU_MAX = 3;
// Duolingo-like zigzag of the path, in px.
const ZIGZAG = [0, 44, 70, 44, 0, -44, -70, -44];

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

let progres = { xp: 0, serie: { n: 0, dernier: null }, lecons: {}, ...lireJSON(CLE_PROGRES) };
const serieActuelle = () => ([jour(), hier()].includes(progres.serie.dernier) ? progres.serie.n : 0);

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
  let k = 0;
  $app.innerHTML = `
    <header class="top" data-parcours="${esc(contenu.parcours[0].id)}">
      <span class="marque">${forme(contenu.parcours[0].forme)}Kratos</span>
      <span class="stat feu ${serie ? "" : "eteint"}" title="Jours d'affilée">🔥 ${serie}</span>
      <span class="stat xp" title="Points d'expérience">⚡ ${progres.xp}</span>
    </header>
    <main class="chemin">
      ${contenu.parcours.map((p) => {
        const lecons = contenu.lecons.filter((l) => l.parcours === p.id);
        if (!lecons.length) return "";
        return `
          <section class="unite" data-parcours="${esc(p.id)}">
            <div class="banniere">${forme(p.forme)}<h2>${esc(p.nom)}</h2><p>${esc(p.accroche)}</p></div>
            <ol class="noeuds">
              ${lecons.map((l) => {
                const niveau = progres.lecons[l.id] ?? 0;
                const etat = !l.exercices.length ? "vide" : l === prochaine ? "actuel" : niveau >= NIVEAU_MAX ? "fait" : "";
                return `
                  <li class="noeud ${etat}" style="--dx:${ZIGZAG[k++ % ZIGZAG.length]}px">
                    <button class="pastille" data-lecon="${esc(l.id)}" aria-label="${esc(l.titre)}">${niveau >= NIVEAU_MAX ? "👑" : forme(p.forme)}</button>
                    ${niveau && niveau < NIVEAU_MAX ? `<span class="niveau">${niveau}/${NIVEAU_MAX}</span>` : ""}
                    <div class="titre-noeud">${esc(l.titre)}</div>
                  </li>`;
              }).join("")}
            </ol>
          </section>`;
      }).join("")}
    </main>`;
  $app.querySelectorAll("[data-lecon]").forEach((b) => b.addEventListener("click", () => fiche(contenu.lecons.find((l) => l.id === b.dataset.lecon))));
  $app.querySelector(".noeud.actuel")?.scrollIntoView({ block: "center" });
}

function fermerFeuille() { document.querySelectorAll(".voile, .feuille").forEach((e) => e.remove()); }

// The sheet has its own history entry so the Android back button closes it instead of the app.
function fiche(lecon) {
  fermerFeuille();
  history.pushState({ ecran: "fiche" }, "");
  const niveau = progres.lecons[lecon.id] ?? 0;
  const n = Math.min(PAR_SESSION, lecon.exercices.length);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="voile"></div>
    <div class="feuille" data-parcours="${esc(lecon.parcours)}" role="dialog" aria-label="${esc(lecon.titre)}">
      <h3>${esc(lecon.titre)}</h3>
      <div class="meta">
        <span class="chip">${n} questions</span>
        <span class="chip">Niveau ${niveau}/${NIVEAU_MAX}</span>
        ${lecon.verifiee ? "" : `<span class="chip warn">Relecture humaine en cours</span>`}
      </div>
      <p>${esc(lecon.resume)}</p>
      <div class="actions">
        ${n ? `<button class="btn" data-go>${niveau ? "S'entraîner" : "Commencer"}</button>` : ""}
        <a class="btn ghost" href="${lien(lecon.url)}" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">Lire la leçon</a>
      </div>
    </div>`);
  document.querySelector(".voile").addEventListener("click", () => history.back());
  document.querySelector("[data-go]")?.addEventListener("click", () => { fermerFeuille(); session(lecon); });
}

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

function question(lecon, { e }, etat, total, noter, suivante) {
  const enonce = {
    chiffre: `<p class="consigne">Quel chiffre manque ?</p>
      <div class="enonce"><span class="trou"></span>${esc(e.label)}<small>${esc(e.source.nom)}, ${esc(e.periode)}</small></div>`,
    citation: `<p class="consigne">Qui l'a dit ou écrit ?</p>
      <blockquote class="enonce cite">« ${esc(e.texte)} »${e.traduction ? "<small>(traduction)</small>" : ""}</blockquote>`,
    ordre: `<p class="consigne">Remettez dans l'ordre chronologique</p><div class="reponse" data-reponse></div>`,
  }[e.type];
  const options = e.type === "ordre" ? melangeDesordonne(e.items.map((_, i) => i)) : melange(e.choix);

  $app.innerHTML = `
    <div class="session" data-parcours="${esc(lecon.parcours)}">
      <div class="barre">
        <button class="fermer" aria-label="Quitter la session">✕</button>
        <div class="progres" role="progressbar" aria-valuenow="${Math.round((etat.faits / total) * 100)}" aria-valuemin="0" aria-valuemax="100"><span style="--p:${(etat.faits / total) * 100}%"></span></div>
        <span class="serie">${etat.combo >= 2 ? `🔥${etat.combo}` : ""}</span>
      </div>
      <section class="question">
        ${enonce}
        <div class="choix" data-choix>
          ${options.map((o) => e.type === "ordre"
            ? `<button class="tuile" data-i="${o}">${esc(e.items[o].texte)}</button>`
            : `<button class="tuile" data-v="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join("")}
        </div>
      </section>
      <footer class="pied"><button class="btn" data-verifier disabled>Vérifier</button></footer>
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
    const { progression, combo } = noter(juste);
    $app.querySelector(".progres span").style.setProperty("--p", `${progression * 100}%`);
    $app.querySelector(".serie").textContent = combo >= 2 ? `🔥${combo}` : "";
    const detail = juste ? "" : e.type === "ordre" ? "Le bon ordre est affiché au-dessus." : `Réponse : ${esc(e.reponse)}`;
    const ref = e.type === "citation" ? e.oeuvre : e.type === "chiffre" ? `${e.source.nom}, ${e.periode}` : e.source.nom;
    const $pied = $app.querySelector(".pied");
    $pied.className = `pied ${juste ? "ok" : "ko"}`;
    $pied.innerHTML = `
      <p class="verdict">${juste ? melange(["Bien joué !", "Exact !", "Parfait !", "Excellent !"])[0] : "Pas tout à fait"}</p>
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
  const p = contenu.parcours.find((x) => x.id === lecon.parcours);
  const precision = Math.round((etat.premierCoup / total) * 100);
  vibre([30, 50, 30, 50, 80]);

  $app.innerHTML = `
    <div class="fin" data-parcours="${esc(lecon.parcours)}">
      ${forme(p.forme)}
      <h1>Session terminée !</h1>
      <div class="scores">
        <div class="score" style="--c:var(--gold)"><b>XP gagnés</b><span>⚡ ${xp}</span></div>
        <div class="score" style="--c:var(--ok)"><b>Précision</b><span>🎯 ${precision} %</span></div>
      </div>
      ${lecon.retenir.length ? `<p class="retenir-titre">À retenir</p><ol class="retenir">${lecon.retenir.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` : ""}
      <button class="btn ok" data-retour>Continuer</button>
    </div>`;
  $app.querySelector("[data-retour]").addEventListener("click", () => history.back());
  confettis(contenu.parcours.map((x) => x.forme));
}

function confettis(formes) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const couleurs = ["var(--pouvoir)", "var(--institutions)", "var(--economie)", "var(--militaire)", "var(--societe)", "var(--gold)"];
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
addEventListener("popstate", () => { fermerFeuille(); if (ecran !== "accueil") accueil(); });

charger();
