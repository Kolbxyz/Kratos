# Kratos

Kratos is a static website of sourced lessons, in French, on power, institutions, the economy and war, for readers who want every figure and quotation linked to its primary source.

## Features

- 41 lessons in 5 tracks: Pouvoir, Institutions et droit, Économie, Militaire et géopolitique, Esprit et société.
- Every fact is linked to a named source. Secondary sources are labeled « Source secondaire, à recouper ».
- Charts, maps, hemicycles and diagrams built from versioned datasets (`data/`), each with a `.source.json` naming its producer and consultation date.
- Full-text search (Pagefind) and one PDF per lesson.
- A training app (`/app/`) and an Android APK. Each chapter becomes a step of reading cards and questions generated from the lesson's own sourced blocks.

## Privacy

- The site and the app have no accounts, no analytics and no tracking.
- Training progress and settings are stored in the browser or the APK only (`localStorage`) and never leave the device.
- At startup, the APK downloads the published `contenu.json` from the site (`https://kolbxyz.xyz/Kratos/`), so new lessons appear without reinstalling. No user data is sent with that request.
- The site pages load fonts from Google Fonts (`src/layouts/Base.astro`), which exposes the reader's IP address to Google. The training app and the APK use self-hosted fonts only.

## Build

Node.js 22 (`.nvmrc`).

```
npm ci
npm run check-content
npm run check-doublons
npm run build
npm run pdf
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local site at http://localhost:4321/Kratos/ |
| `npm run check-content` | Editorial rules: no em or en dash, sourced notes, data files present, consultation dates under 12 months |
| `npm run check-links` | `check-content` plus an HTTP check of every source link |
| `npm run check-doublons` | Passages copied from one lesson to another |
| `npm run verify-sources` | Opens every cited source, compares quotations and figures, writes `AUDIT.md` |
| `npm run fetch-data` | Re-downloads every dataset (Eurostat, World Bank, institution snapshots) |
| `npm run build` | Builds the site and the search index into `dist/` |
| `npm run pdf` | Writes `dist/pdf/<lesson>.pdf` (after `build`; requires Playwright Chromium) |

After cloning, install the git hooks once:

```
scripts/setup-hooks.sh
```

## Deployment

| Workflow | Trigger | Result |
| --- | --- | --- |
| `deploy.yml` | Push to `main` | Checks, builds and publishes the site on GitHub Pages (Settings → Pages → Source: GitHub Actions) |
| `apk.yml` | Push to `main` touching the app or lessons | Builds the APK and publishes it in the `apk` release |
| `verifier-sources.yml` | Every Monday at 06:00 UTC | Runs `check-links` and `verify-sources --strict` |
| `ci-web.yml`, `hygiene.yml` | Pull requests and pushes to `main` | Editorial checks, build, file size, secret scan, commit policy |

## Contributing

Pull requests follow `AGENTS.md` and the shared rules at https://github.com/Kolbxyz/bootstrap/tree/main/rules. Commit and pull-request titles use Conventional Commits. Lessons follow `docs/editorial-rules.md` and `docs/visual-components.md`.

## License

No license has been chosen yet: all rights reserved. Quoted works and datasets remain under their own licenses, named in each source entry.
