import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// GitHub Pages serves a project site under /<repo>/, so every internal link goes through BASE_URL.
export default defineConfig({
  // The account's custom domain: kolbxyz.github.io redirects here, and that redirect carries no CORS header.
  site: "https://kolbxyz.xyz",
  base: "/Kratos",
  trailingSlash: "always",
  markdown: {
    remarkRehype: { footnoteLabel: "Notes", footnoteBackLabel: "Retour au texte" },
  },
  integrations: [mdx()],
});
