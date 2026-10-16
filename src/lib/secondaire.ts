// Hosts of encyclopedias, quote collections, popularisation and press: a source there is shown as secondary.
// Keep in sync with SECONDARY in scripts/check-content.mjs.
export const SECONDARY = /^(?:[a-z-]+\.)?(?:wikipedia|wikiquote|wikimedia|wikidata)\.org$|(?:^|\.)(?:herodote\.net|britannica\.com|reason\.com|courthousenews\.com|lemonde\.fr|lefigaro\.fr|liberation\.fr|nytimes\.com|theguardian\.com|bbc\.com|reuters\.com|medium\.com|substack\.com|quora\.com|babelio\.com|goodreads\.com|citation-celebre\.com|evene\.fr)$|\.pressbooks\.pub$/i;
export const estSecondaire = (url: string) => {
  try { return SECONDARY.test(new URL(url).hostname); } catch { return false; }
};
