import { describe, expect, it } from 'vitest'
import {
  cmToFeetInches,
  displayUnit,
  feetInchesToCm,
  localeOf,
  readVolumeMl,
  toCanonical,
  toDisplay,
  UnitSystemSchema,
  type PhysicalQuantity,
} from './units'

describe('UnitSystemSchema', () => {
  it('ammette i due sistemi e rifiuta il resto', () => {
    expect(UnitSystemSchema.safeParse('metric').success).toBe(true)
    expect(UnitSystemSchema.safeParse('imperial').success).toBe(true)
    expect(UnitSystemSchema.safeParse('us').success).toBe(false)
  })
})

describe('localeOf', () => {
  it('lega il formato dei numeri al sistema di misura', () => {
    expect(localeOf('metric')).toBe('it-IT')
    expect(localeOf('imperial')).toBe('en-US')
  })
})

describe('toDisplay / toCanonical', () => {
  it('in metrico non tocca il valore', () => {
    expect(toDisplay(79.4, 'body_weight', 'metric')).toBe(79.4)
    expect(toCanonical(79.4, 'body_weight', 'metric')).toBe(79.4)
  })

  it('converte peso, lunghezza e peso alimento in imperiale', () => {
    expect(toDisplay(80, 'body_weight', 'imperial')).toBeCloseTo(176.37, 2)
    expect(toDisplay(180, 'length', 'imperial')).toBeCloseTo(70.87, 2)
    expect(toDisplay(100, 'food_weight', 'imperial')).toBeCloseTo(3.527, 3)
    expect(toDisplay(30, 'macro_weight', 'imperial')).toBeCloseTo(1.058, 3)
    // D-045: il volume resta in ml anche in imperiale — è l'unità che l'utente
    // ha dichiarato, e l'unità dichiarata non si riscrive
    expect(toDisplay(250, 'volume', 'imperial')).toBe(250)
    expect(toCanonical(250, 'volume', 'imperial')).toBe(250)
  })

  // il giro completo non deve spostare il dato: è la garanzia che serve, perché
  // il valore attraversa la conversione a ogni correzione dell'utente
  it('andata e ritorno restituisce il valore canonico', () => {
    for (const value of [30, 79.4, 100, 221]) {
      expect(toCanonical(toDisplay(value, 'body_weight', 'imperial'), 'body_weight', 'imperial')).toBeCloseTo(value, 10)
      expect(toCanonical(toDisplay(value, 'length', 'imperial'), 'length', 'imperial')).toBeCloseTo(value, 10)
      expect(toCanonical(toDisplay(value, 'food_weight', 'imperial'), 'food_weight', 'imperial')).toBeCloseTo(value, 10)
    }
  })
})

describe('displayUnit', () => {
  it('dà l’unità da stampare accanto al numero', () => {
    expect(displayUnit('body_weight', 'metric')).toBe('kg')
    expect(displayUnit('body_weight', 'imperial')).toBe('lb')
    expect(displayUnit('length', 'imperial')).toBe('in')
    expect(displayUnit('food_weight', 'imperial')).toBe('oz')
    expect(displayUnit('macro_weight', 'imperial')).toBe('oz')
  })
})

describe('altezza in piedi e pollici', () => {
  it('180 cm sono 5 piedi e 11 pollici', () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 })
  })

  it('arrotonda al pollice e non produce mai 12 pollici', () => {
    // 182,9 cm = 71,99 in: arrotondato è 72, cioè 6' 0" e non 5' 12"
    expect(cmToFeetInches(182.9)).toEqual({ feet: 6, inches: 0 })
  })

  it('torna indietro entro il mezzo pollice', () => {
    const { feet, inches } = cmToFeetInches(180)
    expect(feetInchesToCm(feet, inches)).toBeCloseTo(180.34, 2)
  })
})

// D-045: il volume dichiarato dall'utente. La regola sta qui perché i parser
// sono due — FE e BE — e la stessa regola scritta due volte diverge in silenzio.
describe('readVolumeMl', () => {
  it('riconosce ml e millilitri, e li toglie dal testo', () => {
    // lo spazio residuo non è un fatto: i chiamanti normalizzano
    expect(readVolumeMl('250 ml di latte')).toMatchObject({ ml: 250 })
    expect(readVolumeMl('250 ml di latte').rest.trim()).toBe('di latte')
    expect(readVolumeMl('250 millilitri di latte').ml).toBe(250)
  })

  it('normalizza i litri in ml: è la stessa grandezza in due scale', () => {
    expect(readVolumeMl('1 l di latte').ml).toBe(1000)
    expect(readVolumeMl('1,5 litri di acqua').ml).toBe(1500)
  })

  it('il numero non inizia a metà di un decimale ("1.5 l" non è "5 l")', () => {
    expect(readVolumeMl('1.5 l').ml).toBe(1500)
  })

  it('due letture diverse non sono una lettura, ma il testo si ripulisce lo stesso', () => {
    const { ml, rest } = readVolumeMl('250 ml latte e 500 ml acqua')
    expect(ml).toBeNull()
    expect(rest).not.toContain('ml')
  })

  it('due scritture della stessa quantità restano una lettura sola', () => {
    expect(readVolumeMl('1 l ossia 1000 ml').ml).toBe(1000)
  })

  // AB6: il `\b` accetta la `l` seguita da trattino, quindi «100 L-carnitina»
  // diventava 100 000 ml e lasciava «-carnitina» nella query. ⛔ Un errore ×1000
  // silenzio dentro un bilancio: è la classe che D-045 esiste per chiudere.
  // Non è nel catalogo (zero nomi «L-» su 22 944 righe), ma gli alimenti
  // personali li scrive l'utente
  it('una lettera attaccata a un trattino non è un litro', () => {
    expect(readVolumeMl('100 L-carnitina')).toEqual({ ml: null, rest: '100 L-carnitina' })
    expect(readVolumeMl('5 l-teanina').ml).toBeNull()
  })

  it('senza volume non tocca niente', () => {
    expect(readVolumeMl('pane 120 g')).toEqual({ ml: null, rest: 'pane 120 g' })
  })
})

// AB7/D-049: i due switch reggevano sull'assenza di `default` più
// `strictNullChecks` — una grandezza nuova non compilava, ma solo finché
// quella configurazione resta. L'asserzione è sul TIPO (l'argomento deve
// essere `never`), e non dipende da come è acceso il compilatore.
describe('le grandezze non previste', () => {
  it('toDisplay non ricade in silenzio sulle once', () => {
    expect(() => toDisplay(100, 'temperature' as PhysicalQuantity, 'imperial')).toThrow(
      'temperature',
    )
  })

  it('toCanonical nemmeno', () => {
    expect(() => toCanonical(100, 'temperature' as PhysicalQuantity, 'imperial')).toThrow(
      'temperature',
    )
  })
})

// Il separatore delle migliaia letto come decimale è un errore ×1000 al ribasso
// dentro un bilancio, ed è silenzioso: 1,25 ml è un numero plausibile.
describe('readVolumeMl e il separatore delle migliaia', () => {
  it('legge il punto delle migliaia come migliaia, non come decimale', () => {
    expect(readVolumeMl('1.250 ml').ml).toBe(1250)
    expect(readVolumeMl('2.000 ml').ml).toBe(2000)
  })

  it('tiene il decimale a una e due cifre', () => {
    expect(readVolumeMl('1,5 l').ml).toBe(1500)
    expect(readVolumeMl('0,5 l').ml).toBe(500)
    expect(readVolumeMl('1.75 l').ml).toBe(1750)
  })

  it('lo zero iniziale non è mai una migliaia', () => {
    expect(readVolumeMl('0,750 l').ml).toBe(750)
  })

  it('senza separatore non cambia niente', () => {
    expect(readVolumeMl('250 ml').ml).toBe(250)
  })
})
