# Editorial rules

This document defines how a Kratos lesson is sourced, written and illustrated with data. These rules take precedence over style, length and deadlines: the site has value only if every statement can be verified.

## 1. Sourcing

| Rule | Requirement |
| --- | --- |
| **Every fact has a named, clickable source** | A figure, date, name, vote, quotation or record is covered by a note `[^id]`, a `<Chiffre source url>`, a `<Citation url>` or an entry of `sources:` that states it explicitly. A sentence without a source is deleted. |
| **Primary source first** | Official text (Constitution, Légifrance, Journal officiel), institution (Assemblée nationale, Eurostat, Banque de France, AFT, INSEE, SIPRI, ministries), speech published by its author, scientific article (DOI), work in its original edition. Wikipedia, Wikiquote, Hérodote, press, online textbooks and blogs are secondary sources and are avoided. Wikipedia serves to locate the primary source through its bibliography. A secondary source is tolerated only when its `sources:` entry carries `secondaire: true`; the page then displays « Source secondaire, à recouper », including under a `<Chiffre>` or a `<Citation>`. `check-content` caps their number per lesson (`MAX_SECONDAIRES`, lowered as sources are replaced). Wikisource is accepted for the text of a work. |
| **One note, one link** | Every note `[^id]` ends with the URL of the exact page that contains the fact, not the site's home page. `check-content` rejects a note without a link unless it states « lien primaire non retrouvé le AAAA-MM-JJ » (visible debt, listed in `AUDIT.md`). |
| **Translation carries the original** | A translated `<Citation>` carries `original="…"` (exact text copied from the cited page) and `langue="en"`. `verify-sources` compares the original with the page. |
| **A truncated quotation keeps its meaning** | `[...]` never removes a negation, a condition or a subject. The whole sentence is checked before cutting. |
| **One fact, one lesson** | A figure or detailed analysis lives in a single lesson; others summarize it in one sentence and link to it (« voir la leçon … »). `check-doublons` reports copied passages. |
| **Latest published figure** | Before a figure is written or changed, the latest publication of its source is looked up (quarter, year, law in force). The exact period is written: « au 1er trimestre 2026 », never « aujourd'hui » or « récemment ». |
| **No hedging** | Outside quotations, these words are forbidden: peut-être, sans doute, probablement, vraisemblablement, il semble, on dit que, certains pensent. A fact is either sourced and stated, or removed. A real controversy names who holds which position, with a source. |
| **Verbatim quotations** | Checked against the original text through a direct link to the document. A translation is marked « (traduction) » with the original in a note. No quotation from memory, no apocryphal quotation. |
| **Real consultation date** | `consulte:` is the day the source was opened and read. `check-content` rejects a source consulted more than 12 months ago; it is re-checked and the date updated. |
| **Draft until reviewed** | `verifie_le: null` until a human has compared every figure and quotation with its source. This field is never filled in on behalf of the human. `npm run verify-sources` prepares the review (it opens every source, compares excerpts and writes `AUDIT.md`) but does not replace it: a « confirmed » quotation exists on the page, which does not prove that the lesson sentence relying on it is correct. |
| **Unverified material is disclosed** | An inaccessible source (403, paywall) is reported to the site owner with its URL, instead of presenting the figure as verified. |

## 2. Style

- No em dash (—) or en dash (–). Blocked by `check-content`.
- A lesson takes 30 to 60 minutes (6,000 to 12,000 words), split into `##` chapters (5 or more display the table of contents) and `###` sub-sections. Outline: hook, central idea, long history with dates and figures, data, thinkers, debate, key points.
- Register: realistic and detached, with no added moral judgment. Facts and mechanisms, not indignation.
- Density: every chapter brings dates, figures, names and at least one primary source or named study (author, year, sample, result).
- `lectures:` (frontmatter) lists reference books with author, year and contribution, displayed under « Pour aller plus loin ».
- The debate section presents positions without settling them.
- Key facts use `<Chiffre valeur label source url date />`. A `<Chiffre>` without source, URL or date does not compile.

## 3. Data and charts

- Every dataset is `data/<folder>/<name>.csv` plus `<name>.source.json` (title, producer, url, consulte, processing).
- Eurostat and World Bank series come from `npm run fetch-data`, never from manual entry.
- Manual entry (for example, uses of article 49.3) is allowed only when every row can be found in the cited source.
- Series palette: `--series-1..3` in `src/styles/global.css`, fixed order, France first.

## 4. Writing a lesson

1. Create `src/content/lecons/<id>.mdx` by copying an existing lesson.
2. Follow the outline in §2.
3. Add charts and other supports from `docs/visual-components.md`, with their source in `sources:`.
4. Run `npm run check-content` and `npm run check-doublons`.
5. Leave `verifie_le: null` until the human review is complete.
