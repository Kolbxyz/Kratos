# Security policy

## Reporting a vulnerability

Vulnerabilities are reported privately through GitHub's **Report a vulnerability** button (Security tab). Public issues must not be used.

| Step | Target |
|---|---|
| Acknowledgement | within 7 days |
| Assessment | within 14 days |
| Coordinated disclosure | at most 90 days after the report |

There is no bug bounty.

## Supported versions

Only the latest release and `main` receive security fixes.

## Threat model

Kratos is a static site and an offline-first app. It has no server code, no accounts and no user data outside the reader's own device.

- **Assets:**
  - integrity of lesson content and published `contenu.json`, since the installed APK loads it at startup;
  - the GitHub Pages deployment and the `apk` release (write access through GitHub Actions);
  - the APK signing keystore (`ANDROID_DEBUG_KEYSTORE` repository secret; `*.keystore` is git-ignored);
  - training progress stored in the reader's `localStorage`.
- **Trust boundaries:**
  - repository ↔ CI: actions pinned by commit SHA, workflow permissions read-only except `deploy.yml` (Pages) and `apk.yml` (releases);
  - build ↔ third-party data sources: `scripts/fetch-*.mjs` download datasets that are committed and reviewed as CSV before publication;
  - APK ↔ site: the app downloads `contenu.json` over HTTPS from `https://kolbxyz.xyz/Kratos/` and inserts it as HTML (`innerHTML`), so the published file is trusted as much as the repository;
  - site pages ↔ Google Fonts (`src/layouts/Base.astro`).
- **Out of scope:** compromised or rooted reader devices, compromise of GitHub itself, accuracy disputes about lesson content (reported as ordinary issues).
