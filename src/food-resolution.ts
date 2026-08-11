import { normalizeForMatch } from './food-text'
import { forPortion } from './nutrition-precision'
import type { Per100 } from './nutrition-precision'

// Risoluzione deterministica del nome di un alimento sui candidati della
// ricerca (E2): stessa semantica del parser FE (RF-69c, parse.ts) — alias
// esatto, poi nome esatto, poi candidato unico; il resto è ambiguo, mai un
// errore. I candidati arrivano già ordinati (dispensa personale prima, RF-21).
//
// Le due regole stanno su assi diversi e si valutano in quest'ordine (D-028):
// la provenienza dice «l'abbiamo trovato?» ed è un veto (`trustSingleCandidate`),
// l'equivalenza nutrizionale dice «quale dei trovati?» (D-024b) e presuppone che
// i trovati siano la cosa giusta.

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
//
// D-032: le cifre si rendono **sulla porzione**, non su 100 g. La decisione
// dell'utente riguarda la quantità che sta registrando: due candidati che a
// 100 g mostrano 55 e 58, su 30 g mostrano entrambi 17 — e a quella porzione
// la scelta non cambia nessun numero che l'utente vedrà mai. Non è una soglia
// nuova, è la stessa regola con l'operando giusto.
//
// D-033: e le cifre sono quelle di `forPortion`, arrotondate **prima** della
// scala. Senza, lo scalare fabbricava differenze dall'arrotondamento della
// fonte: i due Merluzzo Carbonaro (19,44 e 19,4) collassavano a 100 g e si
// separavano a 200 g per un decimo di grammo che nessuno ha misurato.
const shown = (v: Per100, grams: number): string => {
  const { kcal, p, c, f } = forPortion(v, grams)
  return [kcal, p, c, f].join('|')
}

export const sameNutrition = (a: Per100, b: Per100, grams = 100): boolean =>
  shown(a, grams) === shown(b, grams)

export type EquivalenceClass<T> = { food: T; size: number }

// D-032: gli equivalenti collassano **dentro** la lista, non solo come veto
// globale — due righe identiche in una lista non equivalente sono una domanda
// senza risposta possibile, che è ciò che D-024b dichiara illegittimo. Una
// riga per profilo nutrizionale, nell'ordine d'ingresso (la dispensa personale
// arriva già prima, RF-21); dentro la classe la riga personale vince, o
// «uno vale l'altro» potrebbe restituire una riga che non è l'alimento
// dell'utente.
export function equivalenceClasses<T extends ResolvableFood>(
  candidates: readonly T[],
  grams = 100,
): EquivalenceClass<T>[] {
  const classes: EquivalenceClass<T>[] = []
  for (const food of candidates) {
    const found = classes.find((c) => sameNutrition(c.food.per100, food.per100, grams))
    if (!found) {
      classes.push({ food, size: 1 })
      continue
    }
    found.size += 1
    if (food.personal && !found.food.personal) {
      found.food = food
    }
  }
  return classes
}

// D-032: chi risponde «non so quale, uno vale l'altro» ottiene questa riga —
// reale, mai una media (D-002). La scelta è deterministica e dichiarata: la
// prima riga della classe più numerosa, e **il personale vince comunque**
// (RF-21) — se l'utente ha adottato uno yogurt, dargli la riga di un altro
// perché quella classe è più numerosa svuoterebbe di senso l'adozione, che è
// il meccanismo con cui D-011 comincia a funzionare sui generici.
export function representativeOf<T extends ResolvableFood>(classes: readonly EquivalenceClass<T>[]): T {
  const personal = classes.find((c) => c.food.personal)
  return (personal ?? classes.reduce((a, b) => (b.size > a.size ? b : a))).food
}

export type FoodResolution<T extends ResolvableFood> =
  | { kind: 'resolved'; food: T; aliasGrams?: number }
  | { kind: 'ambiguous'; candidates: T[]; representative: T }
  | { kind: 'unknown' }

// la lista lunga è ciò che ha affogato il modello finora: mai più di 4 —
// D-032: quattro **profili nutrizionali distinti**, non quattro righe
export const MAX_AMBIGUOUS_CANDIDATES = 4

const ambiguous = <T extends ResolvableFood>(classes: EquivalenceClass<T>[]): FoodResolution<T> => {
  // il rappresentante si sceglie fra i profili **mostrati**: «uno vale l'altro»
  // non può restituire una riga che la domanda non offriva
  const kept = classes.slice(0, MAX_AMBIGUOUS_CANDIDATES)
  return { kind: 'ambiguous', candidates: kept.map((c) => c.food), representative: representativeOf(kept) }
}

// D-028: il candidato unico si accetta solo se la ricerca l'ha trovato con la
// query intera. Chi ha ripiegato sui token passa `false`: lì un solo risultato
// non è una certezza, è la povertà del catalogo — e senza questo la povertà
// produceva certezza invece di cautela.
export interface ResolveOptions {
  trustSingleCandidate?: boolean
  // D-032: la porzione su cui si valuta l'equivalenza. Assente = 100 g, che è
  // ciò che si può dire quando la quantità non è nota
  grams?: number | null
}

export function resolveFoodByName<T extends ResolvableFood>(
  query: string,
  candidates: T[],
  { trustSingleCandidate = true, grams }: ResolveOptions = {},
): FoodResolution<T> {
  const portion = grams ?? 100
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
    const classes = equivalenceClasses(exact, portion)
    return classes.length === 1 ? { kind: 'resolved', food: classes[0].food } : ambiguous(classes)
  }

  // nomi diversi ma stessi numeri: la domanda sarebbe due risposte allo stesso
  // numero. Solo dalla query intera: col fallback per token l'equivalenza dice
  // *quale*, non *se* — e il «se» qui non è stabilito (D-028 vince)
  const classes = equivalenceClasses(candidates, portion)
  if (trustSingleCandidate && classes.length === 1) {
    return { kind: 'resolved', food: classes[0].food }
  }
  return ambiguous(classes)
}
