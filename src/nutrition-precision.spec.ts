import { describe, expect, it } from 'vitest'
import { forPortion, roundedPer100 } from './nutrition-precision'

// i due Merluzzo Carbonaro del catalogo vero (Conad e Esselunga): stesso
// prodotto, due supermercati, e un decimo di grammo di differenza che nessuno
// ha misurato — la sorgente ha scritto 19,44 in una riga e 19,4 nell'altra
const CONAD = { kcal: 92, p: 19.44, c: 0, f: 0.8 }
const ESSELUNGA = { kcal: 92, p: 19.4, c: 0, f: 0.8 }

describe('roundedPer100', () => {
  it('porta il valore alla precisione del sistema: kcal intere, macro a un decimale', () => {
    expect(roundedPer100({ kcal: 91.6, p: 19.44, c: 0.04, f: 0.85 })).toEqual({
      kcal: 92,
      p: 19.4,
      c: 0,
      f: 0.9,
    })
  })

  it('è idempotente: un valore già alla precisione del sistema non si muove', () => {
    const once = roundedPer100(CONAD)

    expect(roundedPer100(once)).toEqual(once)
  })
})

describe('forPortion', () => {
  // D-033: è l'invariante della decisione. Prima, lo scalare fabbricava la
  // differenza: 19,44 × 2 = 38,88 → 38,9 contro 19,4 × 2 = 38,8
  it.each([30, 100, 200, 250, 333])(
    'i due Merluzzo Carbonaro rendono identici a %i g',
    (grams) => {
      expect(forPortion(CONAD, grams)).toEqual(forPortion(ESSELUNGA, grams))
    },
  )

  it('arrotondare prima di scalare non è arrotondare dopo', () => {
    const scalatoPoiArrotondato = Math.round(CONAD.p * 2 * 10) / 10

    expect(scalatoPoiArrotondato).toBe(38.9)
    expect(forPortion(CONAD, 200).p).toBe(38.8)
  })

  it('una differenza nutrizionale vera sopravvive alla porzione', () => {
    const a = { kcal: 55, p: 9, c: 5, f: 0 }
    const b = { kcal: 58, p: 9, c: 5, f: 0 }

    expect(forPortion(a, 200)).not.toEqual(forPortion(b, 200))
    // ...e sotto la porzione a cui si vede, la scelta non muove nessuna cifra
    expect(forPortion(a, 30)).toEqual(forPortion(b, 30))
  })

  it('la porzione scala le cifre, non solo la precisione', () => {
    expect(forPortion({ kcal: 92, p: 19.4, c: 0, f: 0.8 }, 50)).toEqual({
      kcal: 46,
      p: 9.7,
      c: 0,
      f: 0.4,
    })
  })
})
