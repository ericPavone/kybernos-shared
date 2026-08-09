import { normalizeForMatch } from './food-text'

// Risoluzione deterministica del nome di un alimento sui candidati della
// ricerca (E2): stessa semantica del parser FE (RF-69c, parse.ts) — alias
// esatto, poi nome esatto, poi candidato unico; il resto è ambiguo, mai un
// errore. I candidati arrivano già ordinati (dispensa personale prima, RF-21).

export type ResolvableFood = {
  name: string
  personal: boolean
  aliases?: { alias: string; gramsFood?: number | null }[] | null
}

export type FoodResolution<T extends ResolvableFood> =
  | { kind: 'resolved'; food: T; aliasGrams?: number }
  | { kind: 'ambiguous'; candidates: T[] }
  | { kind: 'unknown' }

// la lista lunga è ciò che ha affogato il modello finora: mai più di 4
export const MAX_AMBIGUOUS_CANDIDATES = 4

export function resolveFoodByName<T extends ResolvableFood>(
  query: string,
  candidates: T[],
): FoodResolution<T> {
  const wanted = normalizeForMatch(query)
  if (wanted.length === 0 || candidates.length === 0) {
    return { kind: 'unknown' }
  }

  for (const food of candidates) {
    const alias = (food.aliases ?? []).find((a) => normalizeForMatch(a.alias) === wanted)
    if (alias) {
      return { kind: 'resolved', food, ...(alias.gramsFood != null ? { aliasGrams: alias.gramsFood } : {}) }
    }
  }

  // gli esatti multipli sono omonimi per costruzione (stessa forma
  // normalizzata): un'ambiguità irrisolvibile per nome — il richiamo col
  // «nome esatto del candidato» resterebbe ambiguo per sempre. Vince il
  // personale (RF-21), poi l'ordine dei candidati (il rank della ricerca);
  // il set del banco stesso tratta gli omonimi del catalogo come equivalenti
  const exact = candidates.filter((f) => normalizeForMatch(f.name) === wanted)
  if (exact.length > 0) {
    return { kind: 'resolved', food: exact.find((f) => f.personal) ?? exact[0] }
  }

  if (candidates.length === 1) {
    return { kind: 'resolved', food: candidates[0] }
  }
  return { kind: 'ambiguous', candidates: candidates.slice(0, MAX_AMBIGUOUS_CANDIDATES) }
}
