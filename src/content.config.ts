import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const source = z.object({
  titre: z.string(),
  auteur: z.string(),
  url: z.url(),
  consulte: z.iso.date(),
  primaire: z.boolean().default(false),
});

const image = z.object({
  fichier: z.string(),
  legende: z.string(),
  auteur: z.string(),
  licence: z.string(),
  url: z.url(),
});

const lecons = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/lecons" }),
  schema: z.object({
    titre: z.string(),
    resume: z.string().max(220),
    parcours: z.enum(["pouvoir", "institutions", "economie", "militaire"]),
    ordre: z.number(),
    lecture_min: z.number().int().positive(),
    // A lesson is publishable only once a human has re-checked every figure against its source.
    verifie_le: z.iso.date().nullable(),
    images: z.array(image).default([]),
    sources: z.array(source).min(3),
  }),
});

export const collections = { lecons };
