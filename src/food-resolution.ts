import { normalizeForMatch } from './food-text'

// Risoluzione deterministica del nome di un alimento sui candidati della
// ricerca (E2): stessa semantica del parser FE (RF-69c, parse.ts) — alias
// esatto, poi nome esatto, poi candidato unico; il resto è ambiguo, mai un
// errore. I candidati arrivano già ordinati (dispensa personale prima, RF-21).
//
// Le due regole stanno su assi diversi e si valutano in quest'ordine (D-028):
// la provenienza dice «l'abbiamo trovato?» ed è un veto (`trustSingleCandidate`),
// l'equivalenza nutrizionale dice «quale dei trovati?» (D-024b) e presuppone che
// i trovati siano la cosa giusta.

export type Per100 = { kcal: number; p: number; c: number; f: number }

export type ResolvableFood = {
  name: string
  personal: boolean
  per100: Per100
  aliases?: { alias: string; gramsFood?: number | null }[] | null
}

// D-024b/R-37: due candidati sono equivalenti quando rendono **identici a
// schermo** — kcal all'intero e macro a un decimale, le cifre che l'utente
// vede. Non è una tolleranza da tarare: è una proprietà dell'interfaccia, e
// una domanda fra due righe uguali non ha risposta. Il confronto è sulle sole
// cifre nutrizionali: la marca distingue sullo schermo ma non porta
// informazione nutrizionale, ed è l'attrito che D-024b vuole risparmiare.
const shown = (v: Per100): string =>
  [Math.round(v.kcal), ...[v.p, v.c, v.f].map((x) => Math.round(x * 10) / 10)].join('|')

export const sameNutrition = (a: Per100, b: Per100): boolean => shown(a) === shown(b)

const allEquivalent = (foods: readonly ResolvableFood[]): boolean =>
  foods.every((f) => sameNutrition(f.per100, foods[0].per100))

export type FoodResolution<T extends ResolvableFood> =
  | { kind: 'resolved'; food: T; aliasGrams?: number }
  | { kind: 'ambiguous'; candidates: T[] }
  | { kind: 'unknown' }

// la lista lunga è ciò che ha affogato il modello finora: mai più di 4
export const MAX_AMBIGUOUS_CANDIDATES = 4

// D-028: il candidato unico si accetta solo se la ricerca l'ha trovato con la
// query intera. Chi ha ripiegato sui token passa `false`: lì un solo risultato
// non è una certezza, è la povertà del catalogo — e senza questo la povertà
// produceva certezza invece di cautela.
export interface ResolveOptions {
  trustSingleCandidate?: boolean
}

export function resolveFoodByName<T extends ResolvableFood>(
  query: string,
  candidates: T[],
  { trustSingleCandidate = true }: ResolveOptions = {},
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

  // gli omonimi (stessa forma normalizzata del nome) si distinguono nei
  // numeri, non nel nome: equivalenti → si sceglie in silenzio, il personale
  // prima (RF-21); difformi → decide l'utente, perché scegliere per lui una
  // cosa che non è indifferente è D-018
  const exact = candidates.filter((f) => normalizeForMatch(f.name) === wanted)
  if (exact.length > 0) {
    // ⚠️ il personale vince prima dell'equivalenza (RF-21), o la domanda non
    // finisce mai: sul catalogo vero i quattro «Pane» differiscono nei numeri,
    // e tenerne uno in dispensa (D-024 punto 2) non zittirebbe la domanda —
    // l'attrito «una volta sola per alimento» diventerebbe «a ogni colazione»
    const personal = exact.find((f) => f.personal)
    if (personal) {
      return { kind: 'resolved', food: personal }
    }
    return allEquivalent(exact)
      ? { kind: 'resolved', food: exact[0] }
      : { kind: 'ambiguous', candidates: exact.slice(0, MAX_AMBIGUOUS_CANDIDATES) }
  }

  // nomi diversi ma stessi numeri: la domanda sarebbe due risposte allo stesso
  // numero. Solo dalla query intera: col fallback per token l'equivalenza dice
  // *quale*, non *se* — e il «se» qui non è stabilito (D-028 vince)
  if (trustSingleCandidate && allEquivalent(candidates)) {
    return { kind: 'resolved', food: candidates.find((f) => f.personal) ?? candidates[0] }
  }
  return { kind: 'ambiguous', candidates: candidates.slice(0, MAX_AMBIGUOUS_CANDIDATES) }
}
