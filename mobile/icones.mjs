// Draws the launcher icons (legacy, round, adaptive foreground) from the Pouvoir character.
// Run from the repo root after changing public/app/perso.js: node mobile/icones.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { perso } from "../public/app/perso.js";
import { FORMES } from "../src/formes.ts";

const RES = new URL("./android/app/src/main/res/", import.meta.url).pathname;
const DENSITES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
// Same as ic_launcher_background.xml and --pouvoir / --pouvoir-d / --pouvoir-c in app.css.
const FOND = "#f3e6ff";
const svg = perso({ id: "pouvoir", forme: FORMES.soleil });
const page = (taille, contenu, forme) => `
  <style>
    html, body { margin: 0; background: transparent; }
    :root { --tone: #a560e8; --tone-d: #7e3fc0; }
    .icone { width: ${taille}px; height: ${taille}px; display: grid; place-items: center; overflow: hidden; background: ${forme ? FOND : "transparent"}; border-radius: ${forme === "rond" ? "50%" : forme === "carre" ? "22%" : "0"}; }
    svg { width: ${contenu}%; }
  </style>
  <div class="icone">${svg}</div>`;

const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
for (const [d, k] of Object.entries(DENSITES)) {
  mkdirSync(`${RES}mipmap-${d}`, { recursive: true });
  // Adaptive foreground: 108dp canvas, the character inside the 66dp safe zone.
  for (const [nom, taille, contenu, forme] of [
    ["ic_launcher_foreground", 108 * k, 58, null],
    ["ic_launcher", 48 * k, 80, "carre"],
    ["ic_launcher_round", 48 * k, 76, "rond"],
  ]) {
    await p.setViewportSize({ width: Math.round(taille), height: Math.round(taille) });
    await p.setContent(page(Math.round(taille), contenu, forme));
    await p.locator(".icone").screenshot({ path: `${RES}mipmap-${d}/${nom}.png`, omitBackground: true });
  }
}
await b.close();
console.log("Icônes écrites dans", RES);
