import { z } from 'zod'

export const UnitSystemSchema = z.enum(['metric', 'imperial'])

export type UnitSystem = z.infer<typeof UnitSystemSchema>

// ⚠️ Il canonico è **sempre metrico**: DB, API e motore di calcolo parlano kg, cm
// e g. Il sistema di misura è presentazione — si converte all'ultimo momento in
// uscita e al primo in ingresso. Convertire lo storage significherebbe perdere
// precisione a ogni salvataggio e riscrivere il motore.
const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54
const G_PER_OZ = 28.349523125
const IN_PER_FT = 12
const ML_PER_L = 1000

// Il sistema sceglie anche come si scrivono i numeri e le date: un'interfaccia
// che dice «79.4 lb» e sotto «1.850 kcal» non l'ha scelta nessuno.
export const localeOf = (system: UnitSystem): string => (system === 'imperial' ? 'en-US' : 'it-IT')

export const kgToLb = (kg: number): number => kg / KG_PER_LB
export const lbToKg = (lb: number): number => lb * KG_PER_LB
export const cmToIn = (cm: number): number => cm / CM_PER_IN
export const inToCm = (inches: number): number => inches * CM_PER_IN
export const gToOz = (g: number): number => g / G_PER_OZ
export const ozToG = (oz: number): number => oz * G_PER_OZ

// L'altezza in imperiale si scrive in piedi e pollici: 180 cm → 5' 11"
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cmToIn(cm))
  return { feet: Math.floor(totalInches / IN_PER_FT), inches: totalInches % IN_PER_FT }
}

export const feetInchesToCm = (feet: number, inches: number): number =>
  inToCm(feet * IN_PER_FT + inches)

export type PhysicalQuantity = 'body_weight' | 'length' | 'food_weight' | 'macro_weight' | 'volume'

// D-045: il volume dichiarato dall'utente («250 ml di latte»). Sta qui e non nei
// due parser perché i chiamanti sono due — `extractGrams` nel FE e
// `readGramsInName` nel BE — e la stessa regola scritta due volte diverge.
// Il litro si normalizza in ml: è la stessa grandezza in due scale.
// Il numero non può iniziare a metà di un decimale («1.5 l» ≠ «5 l»); niente
// lookbehind, che Hermes non garantisce.
// ⛔ AB6: la chiusura è `(?![\w-])` e non `\b`, perché `\b` accetta la lettera
// seguita da trattino — «100 L-carnitina» diventava 100 000 ml e lasciava
// «-carnitina» nella query. Un errore ×1000 in silenzio dentro un bilancio.
const VOLUME_IN_TEXT = /(?:^|[^\d.,])((\d+(?:[.,]\d+)?)\s*(ml|millilitri|litri|l)(?![\w-]))/gi

// ⛔ «1.250 ml» sono milleduecentocinquanta, non uno e un quarto: `.replace(',','.')`
// leggeva il separatore delle migliaia come decimale, un errore ×1000 al ribasso
// dentro un bilancio e plausibile a schermo. Migliaia = separatore preceduto da
// 1-3 cifre senza zero iniziale e seguito da esattamente 3; con 1-2 cifre resta
// un decimale, e «0,750 l» resta tre quarti di litro.
const THOUSANDS_GROUP = /^[1-9]\d{0,2}[.,]\d{3}$/

// esportata: la stessa regola vale per i grammi ricopiati nel nome dal modello
// (`readGramsInName` nel BE), e riscritta là era già divergente
export const readNumber = (raw: string): number =>
  THOUSANDS_GROUP.test(raw) ? Number(raw.replace(/[.,]/, '')) : Number(raw.replace(',', '.'))

// ⚠️ Due letture **diverse** non sono una lettura: `ml` resta null e il testo si
// ripulisce lo stesso, come fa `readGramsInName` con i grammi (R-44).
export function readVolumeMl(raw: string): { rest: string; ml: number | null } {
  const found = new Set<number>()
  let rest = raw
  for (const m of raw.matchAll(VOLUME_IN_TEXT)) {
    const n = readNumber(m[2])
    found.add(m[3].toLowerCase().startsWith('m') ? n : n * ML_PER_L)
    rest = rest.replace(m[1], ' ')
  }
  const [only] = [...found]
  return { rest, ml: found.size === 1 ? only : null }
}

// Il CONTEGGIO dichiarato: «2 pesche» sono due pesche, non due grammi.
//
// ⛔ Il confine è UNA CIFRA, ed è scelto perché non possa collidere col ramo del
// numero nudo, che nel parser del frontend è `\d{2,4}` e legge grammi. Con due
// confini che si toccano la stessa stringa avrebbe due letture, e quale vince
// dipenderebbe dall'ordine delle chiamate — cioè il difetto di R-44 costruito
// apposta. Così i due insiemi sono disgiunti per costruzione.
//
// ⚠️ Costo dichiarato: «12 mandorle» non è un conteggio, è un numero nudo. Per
// allargarlo bisogna toccare `\d{2,4}`, che è scritto per tenere fuori le
// percentuali e i numeri dentro i nomi — altra fetta, e con la sua misura.
//
// ⚠️ Il numero seguito da un'unità NON è un conteggio: «2 g», «2 ml», «2 l»
// restano quantità, e la loro lettura è quella di sempre.
const COUNT_IN_TEXT = /(?:^|[^\d.,])((\d)\s+(?![\d.,])(?!g\b|gr\b|grammi\b|ml\b|l\b|litri\b|millilitri\b|oz\b|once\b)(\p{L}))/giu

// ⚠️ Due letture **diverse** non sono una lettura: come `readVolumeMl` e
// `readGramsInName`, un conteggio ambiguo vale `null` e il testo si ripulisce
// lo stesso (R-44).
export function readCount(raw: string): { rest: string; count: number | null } {
  const found = new Set<number>()
  let rest = raw
  for (const m of raw.matchAll(COUNT_IN_TEXT)) {
    found.add(Number(m[2]))
    // si toglie SOLO la cifra: la parola che segue è il nome dell'alimento, ed
    // è quella su cui la ricerca deve poter lavorare
    rest = rest.replace(m[1], ` ${m[3]}`)
  }
  const [only] = [...found]
  return { rest: rest.replace(/\s+/g, ' ').trim(), count: found.size === 1 ? only : null }
}

// L'unità in cui la quantità si **mostra**, per sistema. I macro seguono il peso
// alimento in once: decisione dell'utente del 7 ago, coerenza sopra convenzione.
// D-045: il volume resta in ml in entrambi i sistemi — è ciò che l'utente ha
// dichiarato, e l'unità dichiarata non si riscrive.
const DISPLAY_UNITS: Record<PhysicalQuantity, Record<UnitSystem, string>> = {
  body_weight: { metric: 'kg', imperial: 'lb' },
  length: { metric: 'cm', imperial: 'in' },
  food_weight: { metric: 'g', imperial: 'oz' },
  macro_weight: { metric: 'g', imperial: 'oz' },
  volume: { metric: 'ml', imperial: 'ml' },
}

export const displayUnit = (quantity: PhysicalQuantity, system: UnitSystem): string =>
  DISPLAY_UNITS[quantity][system]

// AB7/D-049: l'esaustività è un'asserzione **sul tipo** — l'argomento deve
// essere `never` — e non l'assenza di un `default` sotto `strictNullChecks`.
// Una grandezza nuova rompe la compilazione qui, e se ci arriva a runtime da un
// confine non tipizzato non ricade in silenzio sulle once.
function assertNever(quantity: never): never {
  throw new Error(`Grandezza fisica non prevista: ${String(quantity)}`)
}

//
// canonico (kg/cm/g) → numero da mostrare, non arrotondato: arrotonda chi formatta
export function toDisplay(value: number, quantity: PhysicalQuantity, system: UnitSystem): number {
  if (system === 'metric') return value
  switch (quantity) {
    case 'body_weight':
      return kgToLb(value)
    case 'length':
      return cmToIn(value)
    case 'food_weight':
    case 'macro_weight':
      return gToOz(value)
    case 'volume':
      return value
    default:
      assertNever(quantity)
  }
}

// numero digitato dall'utente → canonico (kg/cm/g)
export function toCanonical(value: number, quantity: PhysicalQuantity, system: UnitSystem): number {
  if (system === 'metric') return value
  switch (quantity) {
    case 'body_weight':
      return lbToKg(value)
    case 'length':
      return inToCm(value)
    case 'food_weight':
    case 'macro_weight':
      return ozToG(value)
    case 'volume':
      return value
    default:
      assertNever(quantity)
  }
}
