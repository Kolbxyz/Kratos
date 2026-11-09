// Bibliothèque, for the current class: the lessons to read in full, the books the lessons recommend
// (the site's library, with its covers), and the reading cards saved during sessions.
import { contenu, lecon, leconsDe, parcoursDe, siteRacine } from "../contenu.js";
import { basculerFavori, favoris, haptique } from "../etat.js";
import { cap, el, esc, icone, lien, pluriel } from "../outils.js";
import { occupe, ouvrirCouche, retour } from "../nav.js";
import { snackbar } from "../ui.js";
import { classeActuelle, majClasses, rendreCarte, squelette, surClasse } from "./commun.js";
import { ouvrirLecteur } from "./lecteur.js";

const RAYONS = [
  { id: "lecons", nom: "Leçons", icon: "menu_book" },
  { id: "livres", nom: "Livres", icon: "book" },
  { id: "enregistres", nom: "Enregistrés", icon: "bookmark" },
];

// Books recommended by at least one lesson of the class; the essential ones first, then by date.
const livresDe = (classe) => (contenu.livres ?? [])
  .filter((b) => b.lecons.some((x) => lecon(x.id)?.parcours === classe))
  .sort((a, b) => Number(b.incontournable) - Number(a.incontournable) || String(a.annee).localeCompare(String(b.annee)));

export function creer(section) {
  const { corps } = squelette(section, { titre: "Bibliothèque", sur: "Lire, approfondir, retrouver", classes: true });
  let rayon = "lecons";
  let rendre;

  section.addEventListener("click", (ev) => {
    if (surClasse(ev)) return;
    const r = ev.target.closest("[data-rayon]");
    if (r) { haptique.leger(); rayon = r.dataset.rayon; return rendre(); }
    const retirer = ev.target.closest("[data-retirer]");
    if (retirer) {
      const rang = Number(retirer.dataset.retirer), ref = favoris[rang];
      basculerFavori(ref);
      return snackbar("Carte retirée", { icon: "bookmark", action: { libelle: "Annuler", faire: () => basculerFavori(ref, rang) } });
    }
    const livre = ev.target.closest("[data-livre]");
    if (livre) { haptique.leger(); return ouvrirLivre((contenu.livres ?? []).find((b) => b.id === livre.dataset.livre), livre); }
    const lire = ev.target.closest("[data-lire]");
    if (lire) { haptique.leger(); ouvrirLecteur(lecon(lire.dataset.lire), { depuis: lire, etape: lire.dataset.etape }); }
  });

  rendre = () => {
    const classe = classeActuelle();
    majClasses(section);
    corps.innerHTML = `
      <div class="segments biblio-segments" role="group" aria-label="Rayon">${RAYONS.map((r) => `
        <button data-rayon="${r.id}" aria-pressed="${r.id === rayon}">${icone(r.icon, { plein: r.id === rayon })}${r.nom}</button>`).join("")}</div>
      ${{ lecons: rayonLecons, livres: rayonLivres, enregistres: rayonEnregistres }[rayon](classe)}`;
  };
  return rendre;
}

const rayonLecons = (classe) => `<ul class="biblio-liste">${leconsDe(classe).map((l, i) => `
  <li><button class="livre-lecon" style="--i:${i}" data-lire="${esc(l.id)}" data-cle="lire:${esc(l.id)}">
    <b>${esc(l.titre)}</b><p>${esc(l.resume)}</p><small>${icone("auto_stories")}${pluriel(l.etapes.length, "chapitre")}</small></button></li>`).join("")}</ul>`;

function rayonLivres(classe) {
  const livres = livresDe(classe), p = parcoursDe(classe);
  if (!livres.length) return vide("book", "Pas encore de livres", "Les lectures conseillées par les leçons de cette classe apparaîtront ici.");
  return `<ul class="livres-grille">${livres.map((b, i) => `
    <li><button class="livre-tuile" style="--i:${i}" data-livre="${esc(b.id)}" data-cle="livre:${esc(b.id)}">
      ${couverture(b, p)}
      <b>${esc(titreCourt(b.titre))}</b><span class="auteur">${esc(b.auteur)}</span>
      <span class="puces"><span class="puce">${esc(b.annee)}</span>${b.incontournable ? `<span class="puce tonale">${icone("star", { plein: true })}Pour commencer</span>` : ""}</span>
    </button></li>`).join("")}</ul>`;
}

function rayonEnregistres(classe) {
  const cartes = favoris.map((f, i) => {
    const l = lecon(f.lecon), e = l?.etapes.find((x) => x.id === f.etape), c = e?.cartes[f.carte];
    return c && l.parcours === classe ? { i, l, e, c } : null;
  }).filter(Boolean);
  if (!cartes.length) return vide("bookmark", "Rien d'enregistré", "Pendant une étape, touchez le signet d'une carte de lecture pour la garder ici.");
  return `<ul class="biblio-liste">${cartes.map(({ i, l, e, c }) => `
    <li class="favori">
      <p class="de"><span>${esc(l.titre)} · ${esc(e.titre)}</span>
        <button class="btn-icone" data-lire="${esc(l.id)}" data-etape="${esc(e.id)}" aria-label="Lire le chapitre">${icone("auto_stories")}</button>
        <button class="btn-icone" data-retirer="${i}" aria-label="Retirer">${icone("bookmark", { plein: true })}</button></p>
      ${rendreCarte(c, l)}
    </li>`).join("")}</ul>`;
}

// A book's page: the cover, then why each lesson recommends it, with a way to read that lesson.
function ouvrirLivre(b, depuis) {
  if (!b || occupe()) return;
  const classe = classeActuelle(), p = parcoursDe(classe);
  const raisons = [...b.lecons].sort((x, y) => Number(lecon(y.id)?.parcours === classe) - Number(lecon(x.id)?.parcours === classe));
  const couche = el(`<section class="couche fiche-livre" data-parcours="${esc(classe)}" aria-label="${esc(b.titre)}"><div class="defilement">
    <header class="tete-livre">
      <button class="btn-icone" data-retour aria-label="Retour">${icone("arrow_back")}</button>
      ${couverture(b, p)}
      <h1>${esc(b.titre)}</h1>
      <p>${esc(b.auteur)}, ${esc(b.annee)}</p>
      ${b.incontournable ? `<span class="puce tonale">${icone("star", { plein: true })}Pour commencer</span>` : ""}
    </header>
    <div class="fiche-corps">
      <h2>${raisons.length > 1 ? `Conseillé dans ${raisons.length} leçons` : "Pourquoi le lire"}</h2>
      ${raisons.map((x) => {
        const l = lecon(x.id);
        return l ? `<article class="raison" data-parcours="${esc(l.parcours)}"><p>${esc(x.pourquoi)}</p>
          <button class="btn tonal" data-lire="${esc(l.id)}">${icone("auto_stories")}<span>${esc(l.titre)}</span></button></article>` : "";
      }).join("")}
      <div class="liens">
        ${b.url ? `<a class="btn" href="${lien(b.url)}" target="_blank" rel="noopener">${icone("open_in_new")}Lire le texte</a>` : ""}
        <a class="btn contour" href="${lien(`${siteRacine()}bibliotheque/${b.id}/`)}" target="_blank" rel="noopener">${icone("local_library")}Fiche sur le site</a>
      </div>
    </div></div></section>`);
  couche.addEventListener("click", (ev) => {
    if (ev.target.closest("[data-retour]")) return retour();
    const lire = ev.target.closest("[data-lire]");
    if (lire) { haptique.leger(); ouvrirLecteur(lecon(lire.dataset.lire), { depuis: lire }); }
  });
  ouvrirCouche(couche, { depuis });
}

// Cover from Open Library when the site has one (public/couvertures/), over a tonal cover in the
// class colour that also shows while it loads and stays when it cannot load. The APK bundles the
// files (see .github/workflows/apk.yml), so it looks there first; the web looks on the site first.
function couverture(b, p) {
  const sur = (base) => `${base}couvertures/${encodeURIComponent(b.couverture)}`;
  const [src, repli] = cap ? [sur(""), sur(siteRacine())] : [sur(siteRacine()), sur("")];
  return `<span class="couv">
    <span class="couv-auteur">${esc(b.auteur)}</span><span class="couv-titre">${esc(titreCourt(b.titre).split(/\. |: |, livre|, chapitre/)[0])}</span>
    <svg class="couv-forme" viewBox="0 0 100 100" aria-hidden="true"><path d="${esc(p.forme)}"/></svg>
    ${b.couverture ? `<img src="${esc(src)}" data-repli="${esc(repli)}" alt="Couverture : ${esc(b.titre)}" loading="lazy" decoding="async">` : ""}
  </span>`;
}
const titreCourt = (t) => t.split(/ \(/)[0];

// A cover that fails tries its other location, then leaves the tonal cover visible.
document.addEventListener("error", (ev) => {
  const img = ev.target;
  if (!(img instanceof HTMLImageElement) || !img.closest(".couv")) return;
  if (img.dataset.repli) { img.src = img.dataset.repli; delete img.dataset.repli; } else img.remove();
}, true);

const vide = (icon, titre, texte) => `<div class="vide">${icone(icon)}<b>${esc(titre)}</b><p>${esc(texte)}</p></div>`;
