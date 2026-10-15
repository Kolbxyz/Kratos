import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// GitHub Pages serves a project site under /<repo>/, so every internal link goes through BASE_URL.
export default defineConfig({
  site: "https://kolbxyz.github.io",
  base: "/Power",
  trailingSlash: "always",
  markdown: {
    remarkRehype: { footnoteLabel: "Notes", footnoteBackLabel: "Retour au texte" },
  },
  integrations: [mdx()],
});
