# Release checklist

Copy into the release pull request description and tick each item.

## Build
- [ ] CI green on the release commit (all required jobs).
- [ ] Version updated (`versionName`/`versionCode`, `Cargo.toml`, `package.json`) to match the tag `vX.Y.Z`.
- [ ] Minified release build produced by CI; R8 mapping attached (Android).
- [ ] Artifact signature verified (`apksigner verify`) or checksums published (Rust).

## Behavior (Android)
- [ ] Gesture navigation and three-button navigation.
- [ ] Portrait and landscape; compact and expanded widths where supported.
- [ ] Light, dark and reduced-motion modes.
- [ ] TalkBack pass on primary screens; touch targets ≥ 48 dp.
- [ ] Predictive back on every changed screen.
- [ ] Fresh install and upgrade from the previous release (data migrations).

## Privacy and security
- [ ] No new permission, or the new permission is opt-in with a rationale screen.
- [ ] No new third-party call, or it is off by default and disclosed.
- [ ] No new log statement exposing URLs, tokens or personal data.
- [ ] Dependencies changed since the last release reviewed (`cargo deny`, `pip-audit`, `npm audit`).

## Cross-project
- [ ] Contract snapshots unchanged, or the paired repository is updated and released.

## Publication
- [ ] Release notes generated from labels or written in `docs/releases/vX.Y.Z.md`.
- [ ] No AI attribution in tag message or release notes.
