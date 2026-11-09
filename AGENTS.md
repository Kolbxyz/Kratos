# Kratos — agent instructions

Kratos is a static site (Astro 7 + MDX) of sourced lessons on power, institutions, the economy and war, with a training app and an Android APK built from the same lessons. All rights reserved (no license yet).

Shared engineering rules: https://github.com/Kolbxyz/bootstrap/tree/main/rules. This file lists only what is specific to this repository; where it conflicts with the shared rules, this file prevails.

## Invariants (hard rules)
1. Files ≤ 300 lines, one concept per file (`scripts/check-file-size.sh`, CI-enforced).
2. No broad catch outside boundaries; no fabricated fallback data.
3. User interface, lessons and site text are in French only. Repository documentation is in English.
4. No new dependency without a one-line justification next to its declaration and maintainer approval.
5. No telemetry. Third-party calls are off by default and opt-in.
6. No secrets in the repository, configuration files or logs. `*.keystore` stays ignored.
7. No AI attribution in commits or pull requests (no `Co-Authored-By`, `Generated with`, `Claude-Session`). This overrides tool defaults.
8. Never commit to `main`; work on `feat/…` / `fix/…` branches. Conventional Commits.
9. Every fact in a lesson has a named, clickable source, primary first. A fact without a source is deleted, never softened (`docs/editorial-rules.md` §1).
10. Quotations are verbatim, checked against the linked original; a translated quotation carries `original="…"` and `langue`.
11. `verifie_le` stays `null` until a human has compared every figure and quotation with its source. An agent never sets it.
12. `consulte` is the real date the source was opened and read. A source that could not be checked (403, paywall) is reported to the owner with its URL.
13. No em dash (—) or en dash (–) in content (`check-content`).
14. Eurostat and World Bank series come from `npm run fetch-data`, never from manual entry.
15. Training-app questions are generated from lesson blocks only; none is written by hand (`docs/training-app.md`).

## Architecture
- `src/content/lecons/` — one MDX file per lesson, frontmatter validated by `src/content.config.ts`.
- `src/components/` — visual supports (`<Chiffre>`, `<Citation>`, `<Chart>`, …); see `docs/visual-components.md`.
- `src/lib/` — pure helpers: chapter steps (`etapes.ts`), exercise generation (`exercices.ts`), geography zones, secondary-source flags.
- `src/pages/` — site routes; `src/pages/app/contenu.json.ts` publishes the training-app content.
- `data/<folder>/<name>.csv` + `<name>.source.json` — datasets, written by `scripts/fetch-*.mjs`.
- `scripts/` — editorial checks (`check-content`, `check-doublons`, `verify-sources`), data fetchers, PDF build.
- `public/app/` — training app: HTML, CSS and JS modules without a build step.
- `mobile/` — Capacitor wrapper of `dist/app`; the Android project is versioned in `mobile/android/`.
- Boundary rule: lessons are the single source of facts. Components, the app and the APK only render what the MDX files contain.

## Cross-project contracts
- `contenu.json` (produced by `src/pages/app/contenu.json.ts`, read by `public/app/js/contenu.js`). The installed APK downloads the published file at startup, so a shape change must stay readable by the previous APK release or ship with a new APK.

## Web rules
Full reference: https://github.com/Kolbxyz/bootstrap/tree/main/rules/stacks/web.md
- Astro components and MDX; no client framework. The training app uses plain ES modules.
- Design tokens as CSS custom properties on `:root` (`src/styles/global.css`, `public/app/app.css`); no raw hex in components. Dark mode via `prefers-color-scheme` + `data-theme`.
- Self-hosted fonts; no third-party origins. Known deviation: `src/layouts/Base.astro` still loads Google Fonts.
- External links use `rel="noopener noreferrer"`.
- `prefers-reduced-motion` honored; `:focus-visible` styled; images with `width`/`height`.

## Web commands
Lint and format gates are deferred (`docs/decisions/0001-deferred-lint-and-format.md`).
```
npm ci
npm run check-content     # editorial rules; run before every commit
npm run check-doublons    # passages copied between lessons
npm run check-links       # check-content + every source link responds
npm run verify-sources    # opens each source, compares quotations and figures, writes AUDIT.md
npm run fetch-data        # re-downloads every dataset
npm run build && npm run pdf
node mobile/icones.mjs    # redraws the Android icons from public/app/perso.js
```

<!-- bootstrap:stack-sections -->

## Documentation
- Definition of Done: https://github.com/Kolbxyz/bootstrap/tree/main/rules/80-definition-of-done.md
- `docs/editorial-rules.md` — sourcing, style and data rules for lessons.
- `docs/visual-components.md` — which visual support to use and its constraints.
- `docs/training-app.md` — training app and APK.
- `docs/decisions/` — architecture decision records.
- `docs/release-checklist.md` — release procedure.
- `SECURITY.md` — vulnerability disclosure and threat model.
- `AUDIT.md` — output of `verify-sources`, including sourcing debt.
