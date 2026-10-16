# Kratos

Leçons sourcées sur le pouvoir, les institutions, l'économie et la guerre. Site statique (Astro + MDX), hébergé sur GitHub Pages.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Site local sur http://localhost:4321/Power/ |
| `npm run check-content` | Règles éditoriales : pas de tiret long, données et citations référencées |
| `npm run check-links` | Idem, plus vérification de tous les liens de sources |
| `npm run fetch-data` | Retélécharge les séries Eurostat et Banque mondiale |
| `npm run build` | Construit le site et l'index de recherche |
| `npm run pdf` | Génère `dist/pdf/<leçon>.pdf` (après `build`) |

## Écrire une leçon

1. Créer `src/content/lecons/<identifiant>.mdx` en copiant une leçon existante.
2. Plan : accroche, idée centrale, histoire, données, penseurs, débat, à retenir.
3. Graphique : déposer `data/<dossier>/<nom>.csv` et `<nom>.source.json`, puis `<Chart src="<dossier>/<nom>" ... />`. Les autres supports (hémicycle, carte, comparatif, schéma) sont décrits dans `CLAUDE.md`, section 5.
4. Citation : `<Citation auteur oeuvre annee reference url>`, texte vérifié mot pour mot contre la source.
5. Laisser `verifie_le: null` jusqu'à la relecture humaine de chaque chiffre, puis indiquer la date.

Règle de style : aucun tiret long (—) ni demi-cadratin (–). `check-content` bloque la publication sinon.

## Déploiement

Chaque push sur `main` lance `.github/workflows/deploy.yml`. Dans les réglages du dépôt GitHub : Pages, Source = GitHub Actions.
