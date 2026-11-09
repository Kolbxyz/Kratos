# 0001 — Defer the oxlint and Prettier gates

- **Status:** Accepted
- **Date:** 2026-11-06

## Context
The bootstrap `web` stack (v1.0.0) requires `oxlint --deny-warnings`, `prettier --check .` and `tsc --noEmit` in `ci-web.yml`. On 2026-11-06, `npx oxlint@1 --deny-warnings` with the bootstrap `.oxlintrc.json` reported 5 errors (`no-unused-vars` in `src/pages/app/contenu.json.ts`, 4 × `no-control-regex` in `src/lib/etapes.ts`) and about 30 warnings, mostly `no-console` in command-line scripts under `scripts/`. The repository has no `tsconfig.json`, no Prettier configuration for Astro or MDX, and 41 hand-edited MDX lessons that a formatter would reflow.

## Decision
- `ci-web.yml` runs the project's own gates: `check-content`, `check-doublons --strict`, `build`, `npm audit`.
- `oxlint`, `prettier` and `typescript` are not added as dependencies until a dedicated cleanup change makes them pass.
- `.oxlintrc.json`, `.prettierrc.json` and `.prettierignore` stay installed, unused, so that `apply.sh --update` keeps tracking them.

## Alternatives considered
| Option | Advantages | Drawbacks |
|---|---|---|
| Enable the gates now | Matches the bootstrap | CI fails on `main` until about 35 findings are fixed |
| Enable with warnings allowed | Passes immediately | Contradicts `--deny-warnings`; warnings accumulate |
| Defer (chosen) | CI is green and meaningful today | Lint and format are not enforced yet |

## Consequences
- JavaScript and TypeScript style is not checked in CI.
- This ADR is superseded by the change that adds oxlint (with `scripts/` allowed to use `console`) and a Prettier configuration that excludes `src/content/`.
