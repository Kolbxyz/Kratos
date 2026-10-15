# Leçons de pouvoir

Site statique (Astro 7 + MDX) de leçons sourcées sur le pouvoir, les institutions, l'économie et la guerre. Français uniquement. Hébergé sur GitHub Pages.

## 1. Règle absolue : tout est sourcé, à jour, et le lecteur le voit

Ce site n'a de valeur que si chaque affirmation est vérifiable. Ces règles passent avant le style, la longueur et le délai.

| Règle | Concrètement |
| --- | --- |
| **Chaque fait a une source nommée et cliquable** | Chiffre, date, nom, vote, citation, record : une note `[^id]`, un `<Chiffre source url>`, une `<Citation url>` ou une entrée de `sources:` qui le couvre explicitement. Pas de source trouvée = la phrase est supprimée. |
| **Source primaire d'abord** | Texte officiel (Constitution, Légifrance, JO), institution (Assemblée nationale, Eurostat, Banque de France, AFT, INSEE, SIPRI, ministère), discours publié par l'émetteur. Presse et Wikipédia seulement pour recouper, jamais seules sur un chiffre clé. |
| **Chiffre le plus récent publié** | Avant d'écrire ou de modifier un chiffre, chercher la dernière publication de la source (trimestre, année, loi en vigueur). Écrire la période exacte : « au 1er trimestre 2026 », jamais « aujourd'hui » ni « récemment ». |
| **Pas de « peut-être »** | Interdits hors citations : peut-être, sans doute, probablement, vraisemblablement, il semble, on dit que, certains pensent. Soit le fait est sourcé et affirmé, soit il est retiré. Une controverse réelle s'écrit en nommant qui soutient quoi, avec sa source. |
| **Citations mot pour mot** | Vérifiées contre le texte original (lien direct vers le document). Traduction signalée « (traduction) » avec l'original en note. Aucune citation de mémoire, aucune citation apocryphe. |
| **Date de consultation réelle** | `consulte:` = le jour où la source a été ouverte et lue. `check-content` refuse une source consultée il y a plus de 12 mois : la revérifier, puis mettre la date à jour. |
| **Brouillon tant que non relu** | `verifie_le: null` jusqu'à ce qu'un humain ait comparé chaque chiffre et chaque citation à sa source. Ne jamais remplir ce champ à la place de l'humain. |
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
npm run build && npm run pdf
```
