// Normalizzazione testuale per la ricerca alimenti (P1a): il catalogo FatSecret
// porta apostrofi tipografici (U+2019) e l'utente scrive quello dritto; la forma
// elisa («d'arachidi») e quella estesa («di arachidi») sono lo stesso nome.
// Coperta solo l'elisione di «di» → «d'»: le altre («l'», «all'») restano fuori
// finché il banco non le mostra.

const STOPWORDS = new Set([
  'di',
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'una',
  'uno',
  'del',
  'con',
  'al',
  'alla',
])

export const normalizeApostrophes = (s: string): string => s.replace(/[’‘ʼ]/g, "'")

const expandElision = (s: string): string => s.replace(/\bd'(?=\S)/gi, 'di ')

const contractElision = (s: string): string => s.replace(/\bdi (?=[aeiou])/gi, "d'")

// le varianti da passare alla ricerca SQL: la query com'è, più le forme
// elisa/estesa quando differiscono
export const searchVariants = (q: string): string[] => {
  const base = normalizeApostrophes(q.trim())
  return [...new Set([base, expandElision(base), contractElision(base)])].filter((v) => v.length > 0)
}

// forma canonica per il confronto esatto fra query e nome/alias: minuscole,
// apostrofi normalizzati, elisione estesa, stopword via (le stesse del parser
// deterministico FE, RF-69c)
export const normalizeForMatch = (s: string): string =>
  expandElision(normalizeApostrophes(s.toLowerCase()))
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .join(' ')
