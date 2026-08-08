import { describe, expect, it } from 'vitest'
import {
  cmToFeetInches,
  displayUnit,
  feetInchesToCm,
  localeOf,
  toCanonical,
  toDisplay,
  UnitSystemSchema,
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
