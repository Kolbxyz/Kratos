# Kratos

Site statique (Astro 7 + MDX) de leçons sourcées sur le pouvoir, les institutions, l'économie et la guerre. Français uniquement. Hébergé sur GitHub Pages.

## 1. Règle absolue : tout est sourcé, à jour, et le lecteur le voit

Ce site n'a de valeur que si chaque affirmation est vérifiable. Ces règles passent avant le style, la longueur et le délai.

| Règle | Concrètement |
| --- | --- |
| **Chaque fait a une source nommée et cliquable** | Chiffre, date, nom, vote, citation, record : une note `[^id]`, un `<Chiffre source url>`, une `<Citation url>` ou une entrée de `sources:` qui le couvre explicitement. Pas de source trouvée = la phrase est supprimée. |
| **Source primaire d'abord** | Texte officiel (Constitution, Légifrance, JO), institution (Assemblée nationale, Eurostat, Banque de France, AFT, INSEE, SIPRI, ministère), discours publié par l'émetteur, article scientifique (DOI), œuvre dans son édition d'origine. **Wikipédia, Wikiquote, Hérodote, presse, manuels en ligne et blogs sont des sources secondaires : à éviter le plus possible.** Wikipédia sert d'abord à trouver la source primaire (sa bibliographie). Une source secondaire n'est tolérée que si son entrée de `sources:` porte `secondaire: true` ; la page l'affiche (« Source secondaire, à recouper », y compris sous un `<Chiffre>` ou une `<Citation>`), et `check-content` plafonne leur nombre par leçon (`MAX_SECONDAIRES`, à abaisser au fil des remplacements). Wikisource est admis pour le texte d'une œuvre. |
| **Une note = un lien** | Chaque note `[^id]` se termine par l'URL de la page précise qui contient le fait (pas la page d'accueil du site). `check-content` refuse une note sans lien, sauf si elle écrit « lien primaire non retrouvé le AAAA-MM-JJ » (dette visible, listée dans `AUDIT.md`). |
| **Traduction = original** | Une `<Citation>` traduite porte `original="…"` (texte exact, copié de la page citée) et `langue="en"`. `verify-sources` compare l'original à la page. |
| **Une citation tronquée garde son sens** | `[...]` ne retire jamais une négation, une condition ou un sujet. Contrôler la phrase entière avant de couper. |
| **Un fait, une leçon** | Un chiffre ou une analyse détaillée vit dans une seule leçon ; les autres la résument en une phrase et renvoient vers elle (« voir la leçon … »). `check-doublons` signale les passages recopiés. |
| **Chiffre le plus récent publié** | Avant d'écrire ou de modifier un chiffre, chercher la dernière publication de la source (trimestre, année, loi en vigueur). Écrire la période exacte : « au 1er trimestre 2026 », jamais « aujourd'hui » ni « récemment ». |
| **Pas de « peut-être »** | Interdits hors citations : peut-être, sans doute, probablement, vraisemblablement, il semble, on dit que, certains pensent. Soit le fait est sourcé et affirmé, soit il est retiré. Une controverse réelle s'écrit en nommant qui soutient quoi, avec sa source. |
| **Citations mot pour mot** | Vérifiées contre le texte original (lien direct vers le document). Traduction signalée « (traduction) » avec l'original en note. Aucune citation de mémoire, aucune citation apocryphe. |
| **Date de consultation réelle** | `consulte:` = le jour où la source a été ouverte et lue. `check-content` refuse une source consultée il y a plus de 12 mois : la revérifier, puis mettre la date à jour. |
| **Brouillon tant que non relu** | `verifie_le: null` jusqu'à ce qu'un humain ait comparé chaque chiffre et chaque citation à sa source. Ne jamais remplir ce champ à la place de l'humain. `npm run verify-sources` prépare cette relecture (il ouvre chaque source et compare les extraits, résultat dans `AUDIT.md`) mais ne la remplace pas : une citation « confirmée » existe dans la page, cela ne prouve pas que la phrase de la leçon qui s'y appuie est juste. |
| **Ce qui n'a pas pu être vérifié est dit** | Source inaccessible (403, paywall) : le signaler au propriétaire du site dans la réponse, avec l'URL, au lieu de présenter le chiffre comme vérifié. |

## 2. Style

- Aucun tiret long (—) ni demi-cadratin (–). Bloqué par `check-content`.
- Leçon de 30 à 60 minutes (6 000 à 12 000 mots), découpée en chapitres `##` (5 ou plus : le sommaire apparaît), sous-parties `###`. Trame : accroche, idée centrale, histoire longue avec dates et chiffres, données, penseurs, débat, à retenir.
- Ton : réaliste, froid, sans morale ajoutée. Les faits et les mécanismes, pas l'indignation.
- Densité : chaque chapitre apporte des dates, des chiffres, des noms et au moins une source primaire ou une étude nommée (auteur, année, échantillon, résultat).
- `lectures:` (frontmatter) : les livres de référence, avec auteur, année et ce qu'ils apportent, affichés en « Pour aller plus loin ».
- Le débat expose les positions, il ne tranche pas.
- Faits marquants : `<Chiffre valeur label source url date />`. Un `<Chiffre>` sans source, URL ou date ne compile pas.

## 3. Données et graphiques

- `data/<dossier>/<nom>.csv` + `<nom>.source.json` (titre, producteur, url, consulte, traitement).
- Séries Eurostat et Banque mondiale : `npm run fetch-data`, jamais de saisie à la main.
- Saisie manuelle (ex. 49.3) : chaque ligne doit être retrouvable dans la source citée.
- Palette des séries : `--series-1..3` dans `global.css`, ordre fixe, France en premier.

## 4. Commandes

```bash
npm run check-content   # règles éditoriales, à lancer avant chaque commit
npm run check-links     # idem + chaque lien de source répond
npm run check-doublons  # passages recopiés d'une leçon à l'autre
npm run verify-sources  # ouvre chaque source citée, compare citations et chiffres, écrit AUDIT.md
npm run build && npm run pdf
```

## 4 bis. Application d'entraînement

- Questions générées par `src/lib/exercices.ts` à partir des `<Chiffre>`, `<Citation>` et `<Timeline>` des leçons : aucune question écrite à la main, chaque réponse affiche la source du bloc d'origine. Une chronologie ne devient exercice que si toutes ses dates se lisent et vont dans l'ordre.
- `src/pages/app/contenu.json.ts` publie le contenu ; `public/app/` est l'appli (HTML, CSS, JS sans build). Palette plus vive que le site (même teinte par parcours), chaque ton garde un contraste d'au moins 3:1 avec le texte blanc gras. Animations en sortie douce, sans rebond.
- APK : `mobile/` (Capacitor) emballe `dist/app`. `.github/workflows/apk.yml` le construit et le publie dans la release `apk`. L'appli installée télécharge le contenu publié au démarrage : une nouvelle leçon n'exige pas de réinstaller.

## 5. Supports visuels (`src/components/`)

Les règles marquées « build » font échouer le build ou `check-content`. Les autres sont des règles d'écriture, vérifiées à la relecture. Choisir le support d'après ce qu'il montre, pas d'après son effet.

| Support | Pour montrer | Entrée | Règle |
| --- | --- | --- | --- |
| `<Chiffre valeur label source url date />` | Un fait marquant | Props | build : les 5 props sont obligatoires |
| `<Citation auteur oeuvre annee reference url>` | Un texte mot pour mot | Texte en contenu | build : auteur, oeuvre, annee, reference obligatoires |
| `<Timeline items />` | Une chronologie | `{ date, texte }[]` | Chaque date est sourcée dans le texte ou une note |
| `<Positions items />` | Des doctrines côte à côte | `{ titre, sous_titre?, forme?, points }[]` | Chaque position nomme son auteur et sa source |
| `<Pyramide niveaux legende />` | Une hiérarchie (normes, commandement) | `{ nom, exemples }[]` | Sources citées dans la légende |
| `<ARetenir>` | La synthèse finale | Liste en contenu | Aucun fait absent du corps de la leçon |
| `<Chart src kind x y />` | Une série dans le temps ou un classement | CSV + `.source.json`, `kind` = `line` ou `barX` | build : `check-content` exige les 2 fichiers |
| `<Hemicycle src titre unite? total? note? />` | Une répartition de sièges ou d'effectifs | CSV `groupe,sieges` | build : `total` vérifie la somme, le CSV et son `.source.json` doivent exister. Ajouter `note` si l'ordre n'est pas la disposition réelle des places |
| `<Carte src titre unite zone? plafond? />` | Une valeur par pays en Europe ou au Moyen-Orient (`zone="moyen-orient"`) | CSV `code,valeur` (ISO alpha-3, codes par zone dans `src/lib/zones.ts`) | build : code pays connu, fichiers de données présents. Même année pour tous les pays, dite dans le titre. `plafond` quand une valeur extrême écrase l'échelle (la valeur exacte reste dans l'infobulle et le tableau) |
| `<Comparatif src titre />` | 2 ou 3 entités sur plusieurs indicateurs | CSV `entite,indicateur,valeur,unite,periode` | build : 3 entités au maximum (`--series-1..3`), une valeur par entité et indicateur |
| `<Schema titre noeuds liens />` | Qui nomme qui, comment une procédure s'enchaîne | `noeuds: { id, nom }[]`, `liens: { de, vers, verbe, source, url }[]` | build et `check-content` : chaque flèche porte `verbe`, `source` et `url`, listée et cliquable sous le schéma |

Règles d'usage :

- Un support qui répète le texte voisin ne sert à rien : l'ajouter quand il montre ce que la prose ne montre pas (une forme, un ordre, un écart).
- `<Hemicycle>`, `<Carte>` et `<Comparatif>` lisent des instantanés (une valeur par entité, une date). Ils sont produits par `scripts/fetch-instantanes.mjs`, lancé par `npm run fetch-data`. Une source qui n'est pas automatisable (page d'une institution) se récupère dans ce script avec un contrôle qui échoue si la page change, pas à la main.
- `<Schema>` ne sert que pour des liens établis par un texte lu (article de la Constitution, loi). Pas de texte lu, pas de flèche. Les liens Légifrance renvoient souvent 403 : lire l'article sur le site du Conseil constitutionnel (ancre `#article_N`) et le signaler si aucune source primaire n'est accessible.
- Ajouter la source du support dans `sources:` du frontmatter de la leçon, avec `consulte:` à la date réelle.
