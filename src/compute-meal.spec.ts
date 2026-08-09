import { describe, expect, it } from 'vitest'
import {
  ComputeMealInputSchema,
  ComputeMealResponseSchema,
  ProjectedDaySchema,
} from './compute-meal'

const uuid = '11111111-1111-4111-8111-111111111111'
const uv = { value: 100, min: 90, max: 110 }
const macro = { consumed: uv, targetG: 150, residualG: 50 }

const item = {
  foodId: uuid,
  foodName: 'Pane',
  gramsFood: 100,
  kcal: 265,
  proteinG: 9,
  carbsG: 49,
  fatG: 3.2,
}

const projectedDay = {
  date: '2026-08-05',
  planId: uuid,
  dayTypeCode: 'rest',
  kcal: { consumed: uv, target: 2000, residual: 500 },
  floorKcal: 1500,
  reason: null,
  derivation: null,
  macros: { protein: macro, carbs: macro, fat: macro, fiber: macro },
  estimatedCount: 0,
  unresolvedCount: 0,
  observations: [],
}

const responseFixture = {
  date: '2026-08-05',
  items: [item],
  meal: { kcal: 265, proteinG: 9, carbsG: 49, fatG: 3.2, fiberG: 2.7 },
  slot: null,
  slotError: null,
  projectedDay,
  projectedDayError: null,
  observations: [],
  allowed: true,
}

describe('ComputeMealInputSchema', () => {
  it('accetta items con mealSlotId e date opzionali omessi', () => {
    expect(
      ComputeMealInputSchema.safeParse({ items: [{ foodId: uuid, gramsFood: 80 }] }).success,
    ).toBe(true)
  })

  it('rifiuta items vuoti', () => {
    expect(ComputeMealInputSchema.safeParse({ items: [] }).success).toBe(false)
  })

  it('rifiuta gramsFood non positivo', () => {
    expect(
      ComputeMealInputSchema.safeParse({ items: [{ foodId: uuid, gramsFood: 0 }] }).success,
    ).toBe(false)
  })

  it('rifiuta campi ignoti dentro un item', () => {
    expect(
      ComputeMealInputSchema.safeParse({
        items: [{ foodId: uuid, gramsFood: 80, userId: 'evil' }],
      }).success,
    ).toBe(false)
  })
})

describe('ProjectedDaySchema', () => {
  it('accetta un giorno proiettato senza stato degli slot', () => {
    expect(ProjectedDaySchema.safeParse(projectedDay).success).toBe(true)
  })
})

describe('ComputeMealResponseSchema', () => {
  it('accetta una risposta completa', () => {
    expect(ComputeMealResponseSchema.safeParse(responseFixture).success).toBe(true)
  })

  it('accetta projectedDay null con il code di errore', () => {
    expect(
      ComputeMealResponseSchema.safeParse({
        ...responseFixture,
        projectedDay: null,
        projectedDayError: 'no_plan_for_date',
      }).success,
    ).toBe(true)
  })

  it('accetta uno slot senza logged', () => {
    const slot = {
      mealSlotId: uuid,
      code: 'dinner',
      label: 'Cena',
      prescriptions: [{ kind: 'carbs', amount: 120, unit: 'food_g' }],
      unprescribed: false,
    }
    expect(ComputeMealResponseSchema.safeParse({ ...responseFixture, slot }).success).toBe(true)
  })

  it('rifiuta un meal con macro come UncertainValue invece di numero', () => {
    expect(
      ComputeMealResponseSchema.safeParse({
        ...responseFixture,
        meal: { ...responseFixture.meal, kcal: uv },
      }).success,
    ).toBe(false)
  })

  // riguarda il proporre, non il registrare: senza il campo l'agente dovrebbe
  // dedurlo dalle osservazioni, ed è ciò che un secondo tool avrebbe duplicato
  it('pretende allowed: senza, la risposta non è valida', () => {
    const { allowed: _a, ...senza } = responseFixture
    expect(ComputeMealResponseSchema.safeParse(senza).success).toBe(false)
  })
})
