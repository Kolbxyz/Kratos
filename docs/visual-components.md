# Visual components

This document lists the visual supports in `src/components/`, what each one shows and the constraints it enforces. A support is chosen for what it shows, not for its effect.

Rules marked « build » fail the build or `check-content`. The others are writing rules, checked in review.

| Support | Shows | Input | Rule |
| --- | --- | --- | --- |
| `<Chiffre valeur label source url date />` | A key fact | Props | build: all 5 props are required |
| `<Citation auteur oeuvre annee reference url>` | A verbatim text | Text as children | build: `auteur`, `oeuvre`, `annee`, `reference` required |
| `<Timeline items />` | A chronology | `{ date, texte }[]` | Every date is sourced in the text or a note |
| `<Positions items />` | Doctrines side by side | `{ titre, sous_titre?, forme?, points }[]` | Every position names its author and source |
| `<Pyramide niveaux legende />` | A hierarchy (legal norms, command) | `{ nom, exemples }[]` | Sources cited in the legend |
| `<ARetenir>` | The final summary | List as children | No fact absent from the lesson body |
| `<Chart src kind x y />` | A time series or a ranking | CSV + `.source.json`, `kind` = `line` or `barX` | build: `check-content` requires both files |
| `<Hemicycle src titre unite? total? note? />` | A distribution of seats or headcount | CSV `groupe,sieges` | build: `total` checks the sum; the CSV and its `.source.json` must exist. `note` is added when the order is not the real seating |
| `<Carte src titre unite zone? plafond? />` | One value per country in Europe or the Middle East (`zone="moyen-orient"`) | CSV `code,valeur` (ISO alpha-3, codes per zone in `src/lib/zones.ts`) | build: known country code, data files present. Same year for every country, stated in the title. `plafond` caps the scale when an extreme value flattens it (the exact value stays in the tooltip and table) |
| `<Comparatif src titre />` | 2 or 3 entities across several indicators | CSV `entite,indicateur,valeur,unite,periode` | build: at most 3 entities (`--series-1..3`), one value per entity and indicator |
| `<Schema titre noeuds liens />` | Who appoints whom, how a procedure unfolds | `noeuds: { id, nom }[]`, `liens: { de, vers, verbe, source, url }[]` | build and `check-content`: every arrow carries `verbe`, `source` and `url`, listed and clickable below the diagram |

## Usage rules

- A support that repeats the adjacent text is removed. It is added only when it shows what prose cannot: a shape, an order, a gap.
- `<Hemicycle>`, `<Carte>` and `<Comparatif>` read snapshots (one value per entity, one date) produced by `scripts/fetch-instantanes.mjs`, run by `npm run fetch-data`. A source that cannot be automated (an institution's web page) is still fetched by that script, with a check that fails when the page changes, never by hand.
- `<Schema>` is used only for links established by a text that was read (an article of the Constitution, a law). No text read, no arrow. Légifrance links often return 403: the article is read on the Conseil constitutionnel site (anchor `#article_N`), and the owner is told when no primary source is accessible.
- The support's source is added to the lesson's `sources:` frontmatter, with `consulte:` set to the real date.
