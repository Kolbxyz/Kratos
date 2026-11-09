// A step: reading cards (swipe or Continuer), then its questions. The verdict slides up in a sheet
// with the answer and its source. A missed question comes back once at the end.
import { parcoursDe } from "../contenu.js";
import { basculerFavori, estFavori, haptique, terminerEtape } from "../etat.js";
import { anime, calme, compter, el, esc, html, icone, lien, melange, pluriel, EMPH, STANDARD } from "../outils.js";
import { occupe, ouvrirCouche, retour } from "../nav.js";
import { confettis, remplacer, snackbar } from "../ui.js";
import { MASCOTTES, perso } from "../../perso.js";
import { rendreCarte } from "./commun.js";

const ESSAIS_MAX = 2;
const SEUIL_GLISSER = 80;

export function lancerSession(lecon, etape, depuis) {
  if (occupe()) return;
  const p = parcoursDe(lecon.parcours), m = MASCOTTES[lecon.parcours];
  const file = [
    ...etape.cartes.map((c, i) => ({ c, i })),
    ...melange(etape.exercices).map((e) => ({ e, essais: 0 })),
  ];
  const total = file.length;
  const etat = { faits: 0, premierCoup: 0, combo: 0, comboMax: 0 };

  const couche = el(`<section class="couche session" data-parcours="${esc(lecon.parcours)}" aria-label="${esc(etape.titre)}">
    <div class="session-barre">
      <button class="btn-icone" data-quitter aria-label="Quitter l'étape">${icone("close")}</button>
      <div class="progres-session" role="progressbar" aria-label="Progression de l'étape" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <span class="puce combo" aria-hidden="true">${icone("bolt", { plein: true })}<span></span></span>
    </div>
    <div class="scene"></div>
    <footer class="pied"><button class="btn grand large" data-action></button></footer>
    <div class="feuille" role="status"></div>
  </section>`);
  const $scene = couche.querySelector(".scene"), $btn = couche.querySelector("[data-action]"), $feuille = couche.querySelector(".feuille");
  const $progres = couche.querySelector(".progres-session"), $combo = couche.querySelector(".combo");
  let action = null;
  $btn.addEventListener("click", () => action?.());
  couche.querySelector("[data-quitter]").addEventListener("click", retour);
  ouvrirCouche(couche, { depuis });

  const pied = (libelle, desactive, fn) => { $btn.textContent = libelle; $btn.disabled = desactive; action = fn; };
  const avancer = () => {
    const k = Math.round((etat.faits / total) * 100);
    $progres.firstElementChild.style.transform = `scaleX(${k / 100})`;
    $progres.setAttribute("aria-valuenow", k);
  };
  const majCombo = () => {
    $combo.classList.toggle("on", etat.combo >= 2);
    $combo.lastElementChild.textContent = etat.combo;
  };

  function suivante() {
    avancer();
    const item = file.shift();
    if (!item) return fin();
    if (item.c) carte(item); else question(item);
    $scene.querySelector(".vue:not(.partante)")?.focus({ preventScroll: true });
  }

  function carte({ c, i }) {
    const ref = { lecon: lecon.id, etape: etape.id, carte: i };
    const vue = remplacer($scene, `
      <p class="surtitre">${icone("auto_stories")}Lecture · ${i + 1}/${etape.cartes.length}
        <button class="btn-icone" data-favori aria-pressed="${estFavori(ref)}" aria-label="Enregistrer la carte">${icone("bookmark", { plein: estFavori(ref) })}</button></p>
      <article class="carte-lecture">${rendreCarte(c, lecon)}</article>
      ${i === 0 ? `<p class="glisser">${icone("swipe_left")}Glissez vers la gauche pour continuer</p>` : ""}`);
    vue.querySelector("[data-favori]").addEventListener("click", (ev) => {
      const b = ev.currentTarget, oui = basculerFavori(ref);
      haptique.leger();
      b.setAttribute("aria-pressed", oui);
      b.firstElementChild.classList.toggle("plein", oui);
      snackbar(oui ? "Carte enregistrée dans la Bibliothèque" : "Carte retirée", { icon: "bookmark" });
    });
    const lire = () => { haptique.leger(); etat.faits++; suivante(); };
    glisserPourAvancer(vue.querySelector(".carte-lecture"), lire);
    pied("Continuer", false, lire);
  }

  function question(item) {
    const { e } = item;
    const trou = `<span class="trou" data-trou>&nbsp;</span>`;
    const enonce = {
      chiffre: `<h2 class="consigne">Quel chiffre manque ?</h2><div class="chiffre-q">${trou} ${esc(e.label)}<small>${esc(e.source.nom)}, ${esc(e.periode)}</small></div>`,
      citation: `<h2 class="consigne">Qui l'a dit ou écrit ?</h2><div class="citation-q">${icone("format_quote")}<blockquote>« ${esc(e.texte)} »</blockquote>${e.traduction ? "<small>(traduction)</small>" : ""}</div>`,
      trou: `<h2 class="consigne">Complétez la phrase</h2><p class="phrase">${esc(e.avant)}${trou}${esc(e.apres)}</p>`,
      ordre: `<h2 class="consigne">Remettez dans l'ordre chronologique</h2><div class="ordre-reponse" data-reponse></div>`,
    }[e.type];
    const choix = e.type === "ordre"
      ? `<div class="ordre-banque" data-choix>${desordonne(e.items.map((_, i) => i)).map((i) => `<button class="tuile" data-i="${i}">${icone("drag_indicator")}<span>${esc(e.items[i].texte)}</span></button>`).join("")}</div>`
      : `<div class="options" role="radiogroup" data-choix>${melange(e.choix).map((o) => `<button class="option" role="radio" aria-checked="false" data-v="${esc(o)}"><span class="radio"></span><span>${esc(o)}</span>${icone("check_circle", { cls: "marque" })}</button>`).join("")}</div>`;
    const vue = remplacer($scene, `
      ${item.essais ? `<p class="erreur-prec">${icone("replay")}Erreur précédente</p>` : `<p class="surtitre">${icone("edit_note")}Question</p>`}
      ${enonce}${choix}`);
    const $choix = vue.querySelector("[data-choix]"), $reponse = vue.querySelector("[data-reponse]"), $trou = vue.querySelector("[data-trou]");
    let choisi = null;
    const ordre = [];
    pied("Vérifier", true, verifier);

    $choix.addEventListener("click", (ev) => {
      const t = ev.target.closest("button:not(:disabled)");
      if (!t) return;
      haptique.leger();
      if (e.type === "ordre") return placer(t);
      $choix.querySelectorAll(".option").forEach((b) => b.setAttribute("aria-checked", b === t));
      choisi = t.dataset.v;
      if ($trou) { $trou.classList.add("rempli"); $trou.innerHTML = `<span>${esc(choisi)}</span>`; }
      $btn.disabled = false;
    });

    // The tile flies from the bank to its slot (FLIP); tapping a placed one sends it back.
    function placer(t) {
      if (t.classList.contains("place")) return;
      const i = Number(t.dataset.i), avant = t.getBoundingClientRect();
      ordre.push(i);
      t.classList.add("place");
      const place = html(`<button class="tuile" data-i="${i}"><span>${esc(e.items[i].texte)}</span></button>`).firstElementChild;
      $reponse.append(place);
      const apres = place.getBoundingClientRect();
      anime(place, [{ transform: `translate(${avant.left - apres.left}px, ${avant.top - apres.top}px)` }, { transform: "none" }], { duration: 360, easing: EMPH });
      $btn.disabled = ordre.length < e.items.length;
    }
    $reponse?.addEventListener("click", (ev) => {
      const t = ev.target.closest("button:not(:disabled)");
      if (!t) return;
      haptique.leger();
      const i = Number(t.dataset.i);
      ordre.splice(ordre.indexOf(i), 1);
      t.remove();
      const banque = $choix.querySelector(`[data-i="${i}"]`);
      banque.classList.remove("place");
      anime(banque, [{ opacity: 0.25 }, { opacity: 1 }], { duration: 200, easing: STANDARD });
      $btn.disabled = true;
    });

    function verifier() {
      pied("Vérifier", true, null);
      let juste;
      if (e.type === "ordre") {
        juste = ordre.every((i, rang) => i === rang);
        // The right order with its dates, each slot marked against the learner's answer.
        $reponse.innerHTML = e.items.map((it, rang) => `<button class="tuile ${ordre[rang] === rang ? "juste" : "faux"}" disabled><span>${esc(it.texte)}<span class="date">${esc(it.date)}</span></span></button>`).join("");
        $choix.hidden = true;
      } else {
        juste = choisi === e.reponse;
        $choix.querySelectorAll(".option").forEach((b) => {
          b.disabled = true;
          if (b.dataset.v === e.reponse) b.classList.add("juste");
          else if (b.dataset.v === choisi) { b.classList.add("faux"); b.querySelector(".marque").textContent = "cancel"; }
        });
        $trou?.classList.add(juste ? "juste" : "faux");
      }
      juste ? haptique.succes() : haptique.erreur();
      item.essais++;
      if (juste) {
        etat.faits++; etat.combo++; etat.comboMax = Math.max(etat.comboMax, etat.combo);
        if (item.essais === 1) etat.premierCoup++;
      } else {
        etat.combo = 0;
        if (item.essais < ESSAIS_MAX) file.push(item); else etat.faits++;
      }
      avancer();
      majCombo();
      verdict(e, juste, item.essais);
    }
  }

  function verdict(e, juste, essais) {
    const titre = juste ? (essais > 1 ? "Cette fois, oui" : "Bonne réponse") : "Pas tout à fait";
    const detail = juste ? (essais > 1 ? "Réponse retrouvée." : "+1 XP")
      : e.type === "ordre" ? "Le bon ordre est affiché, avec les dates."
      : `Réponse : <b>${esc(e.reponse)}</b>${essais < ESSAIS_MAX ? ". La question reviendra." : ""}`;
    const ref = e.type === "citation" ? e.oeuvre : e.type === "chiffre" ? `${e.source.nom}, ${e.periode}` : e.source.nom;
    $feuille.className = `feuille ${juste ? "ok" : "ko"}`;
    $feuille.innerHTML = `<div class="poignee"></div>
      <div class="haut"><div>
        <h2>${icone(juste ? "check_circle" : "cancel", { plein: true })}${titre}</h2>
        <p class="mot">${esc(m.nom)} : « ${esc(melange(juste ? m.juste : m.faux)[0])} »</p>
        <p class="detail">${detail}</p>
      </div>${perso(p, juste ? "joie" : "triste")}</div>
      <p class="src">Source : <a href="${lien(e.source.url)}" target="_blank" rel="noopener">${esc(ref)}</a>${e.source.secondaire ? `<em>${icone("warning")}Source secondaire, à recouper</em>` : ""}</p>
      <button class="btn grand large" data-continuer>Continuer</button>`;
    const $c = $feuille.querySelector("[data-continuer]");
    // Focus once the sheet is visible: a hidden element cannot take it.
    requestAnimationFrame(() => { $feuille.classList.add("ouverte"); $c.focus({ preventScroll: true }); });
    $c.addEventListener("click", () => { haptique.leger(); $feuille.classList.remove("ouverte"); suivante(); }, { once: true });
  }

  let finie = false;
  function fin() {
    if (finie) return;
    finie = true;
    const questions = etape.exercices.length;
    const { xp, nouveauJour, serie } = terminerEtape(etape, etat.premierCoup);
    const precision = questions ? Math.round((etat.premierCoup / questions) * 100) : null;
    haptique.succes();
    const vue = remplacer($scene, `
      <div class="resultats">
        ${perso(p, "joie")}
        <h2>${etape.revision ? "Leçon révisée" : "Étape terminée"}</h2>
        <p>${esc(etape.titre)}</p>
        <div class="stats3">
          <div class="stat xp" style="--i:0">${icone("bolt", { plein: true })}<b data-compte="${xp}">0</b><small>XP gagnés</small></div>
          ${precision === null
            ? `<div class="stat precision" style="--i:1">${icone("auto_stories")}<b data-compte="${etape.cartes.length}">0</b><small>Cartes lues</small></div>`
            : `<div class="stat precision" style="--i:1">${icone("target")}<b data-compte="${precision}" data-suffixe=" %">0</b><small>Précision</small></div>`}
          <div class="stat combo-max" style="--i:2">${icone("local_fire_department", { plein: true })}<b data-compte="${etat.comboMax}">0</b><small>Meilleur combo</small></div>
        </div>
        ${nouveauJour ? `<div class="serie-ligne"><span class="flamme">${icone("local_fire_department", { plein: true })}</span><div><b>${pluriel(serie, "jour")} de suite</b><span>${serie > 1 ? "Première étape du jour : série prolongée." : "Première étape du jour : la série démarre."}</span></div></div>` : ""}
      </div>`);
    setTimeout(() => vue.querySelectorAll("[data-compte]").forEach((b) => compter(b, Number(b.dataset.compte), { suffixe: b.dataset.suffixe ?? "" })), 300);
    confettis();
    pied("Continuer", false, () => {
      pied("Continuer", true, null);
      haptique.leger();
      retour();
      snackbar(nouveauJour ? `Série : ${pluriel(serie, "jour")} · +${xp} XP` : `+${xp} XP`, { icon: nouveauJour ? "local_fire_department" : "bolt" });
    });
  }

  suivante();
}

// The reading card follows the finger and advances past a left swipe.
function glisserPourAvancer(carte, avancer) {
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  carte.addEventListener("pointerdown", (ev) => {
    if (ev.button || ev.target.closest("a, button")) return;
    x0 = ev.clientX; y0 = ev.clientY; dx = 0; horizontal = null;
    carte.style.transition = "none";
  });
  carte.addEventListener("pointermove", (ev) => {
    if (x0 === null) return;
    const ddx = ev.clientX - x0, ddy = ev.clientY - y0;
    if (horizontal === null && Math.hypot(ddx, ddy) > 8) {
      horizontal = Math.abs(ddx) > Math.abs(ddy);
      if (horizontal) carte.setPointerCapture(ev.pointerId);
    }
    if (!horizontal) return;
    dx = Math.min(0, ddx);
    carte.style.transform = `translateX(${dx}px) rotate(${calme() ? 0 : dx / 60}deg)`;
    carte.style.opacity = 1 + dx / 500;
  });
  const lacher = () => {
    if (x0 === null) return;
    x0 = null;
    carte.style.transition = "transform 280ms cubic-bezier(.2,0,0,1), opacity 280ms cubic-bezier(.2,0,0,1)";
    if (horizontal && dx < -SEUIL_GLISSER) avancer();
    else { carte.style.transform = ""; carte.style.opacity = ""; }
  };
  carte.addEventListener("pointerup", lacher);
  carte.addEventListener("pointercancel", lacher);
}

// An ordering exercise never starts already in order.
function desordonne(a) {
  if (a.length < 2) return a;
  let b;
  do b = melange(a); while (b.every((v, i) => v === a[i]));
  return b;
}
