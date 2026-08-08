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

export type PhysicalQuantity = 'body_weight' | 'length' | 'food_weight' | 'macro_weight'

// L'unità in cui la quantità si **mostra**, per sistema. I macro seguono il peso
// alimento in once: decisione dell'utente del 7 ago, coerenza sopra convenzione.
const DISPLAY_UNITS: Record<PhysicalQuantity, Record<UnitSystem, string>> = {
  body_weight: { metric: 'kg', imperial: 'lb' },
  length: { metric: 'cm', imperial: 'in' },
  food_weight: { metric: 'g', imperial: 'oz' },
  macro_weight: { metric: 'g', imperial: 'oz' },
}

export const displayUnit = (quantity: PhysicalQuantity, system: UnitSystem): string =>
  DISPLAY_UNITS[quantity][system]

// canonico (kg/cm/g) → numero da mostrare, non arrotondato: arrotonda chi formatta
export function toDisplay(value: number, quantity: PhysicalQuantity, system: UnitSystem): number {
  if (system === 'metric') return value
  switch (quantity) {
    case 'body_weight':
      return kgToLb(value)
    case 'length':
      return cmToIn(value)
    default:
      return gToOz(value)
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
    default:
      return ozToG(value)
  }
}
