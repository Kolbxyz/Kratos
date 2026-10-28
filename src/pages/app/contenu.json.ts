// Content of the training app: built from the same lessons as the site, fetched by the app to stay in sync.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { createHash } from "node:crypto";
import { PARCOURS } from "../../parcours";
import { FORMES } from "../../formes";
import { aRetenir, exercicesDe, type LeconBrute } from "../../lib/exercices";

export const GET: APIRoute = async () => {
  const racine = `${import.meta.env.SITE}${import.meta.env.BASE_URL}`.replace(/\/?$/, "/");
  const lecons = (await getCollection("lecons")).sort((a, b) => a.data.ordre - b.data.ordre);
  const brutes: LeconBrute[] = lecons.map((l) => ({
    id: l.id, parcours: l.data.parcours, body: l.body ?? "", url: `${racine}lecons/${l.id}/`,
  }));

  const contenu = {
    distant: `${racine}app/contenu.json`,
    parcours: Object.entries(PARCOURS).map(([id, p]) => ({ id, nom: p.nom, accroche: p.accroche, forme: FORMES[p.forme] })),
    lecons: lecons.map((l, i) => ({
      id: l.id,
      titre: l.data.titre,
      resume: l.data.resume,
      parcours: l.data.parcours,
      url: brutes[i].url,
      verifiee: l.data.verifie_le !== null,
      retenir: aRetenir(brutes[i].body),
      exercices: exercicesDe(brutes[i], brutes),
    })),
  };
  const version = createHash("sha1").update(JSON.stringify(contenu)).digest("hex").slice(0, 12);
  return new Response(JSON.stringify({ version, genere: new Date().toISOString(), ...contenu }), {
    headers: { "Content-Type": "application/json" },
  });
};
