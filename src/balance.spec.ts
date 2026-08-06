import { describe, expect, it } from 'vitest'
import {
  DailyBalanceResponseSchema,
  DailyMealItemSchema,
  UncertainValueSchema,
  WeeklyBalanceResponseSchema,
  WeeklyDaySchema,
} from './balance'

const uv = { value: 100, min: 90, max: 110 }
const uuid = '11111111-1111-4111-8111-111111111111'

const macro = { consumed: uv, targetG: 150, residualG: 50 }

const dailyFixture = {
  date: '2026-08-04',
  planId: uuid,
  dayTypeCode: 'rest',
  kcal: { consumed: uv, target: 2000, residual: 500 },
  floorKcal: 1500,
  macros: { protein: macro, carbs: macro, fat: macro, fiber: macro },
  estimatedCount: 1,
  slots: [
    {
      mealSlotId: uuid,
      code: 'lunch',
      label: 'Pranzo',
      prescriptions: [
        { kind: 'carbs', amount: 120, unit: 'food_g' },
        { kind: 'vegetables', unit: 'free', note: 'a volontà' },
      ],
      logged: true,
    },
  ],
  observations: [
    { guardrailCode: 'kcal_day', zone: 'soft', direction: 'above', certain: false, message: null },
  ],
}

const weeklyFixture = {
  endDate: '2026-08-04',
  days: [{ date: '2026-08-03', kcal: uv, estimatedCount: 0 }],
  avgKcal: uv,
  deltaVsTarget: uv,
  avgProteinG: uv,
  daysLogged: 5,
  estimatedCount: 2,
  weightTrend: { firstKg: 80, lastKg: 79.5, deltaKg: -0.5 },
  observations: [],
}

describe('UncertainValueSchema', () => {
  it('accetta un valore con intervallo min/max', () => {
    expect(UncertainValueSchema.parse(uv)).toEqual(uv)
  })

  it('rifiuta un valore senza intervallo', () => {
    expect(UncertainValueSchema.safeParse({ value: 100 }).success).toBe(false)
  })
})

describe('WeeklyDaySchema', () => {
  it('accetta kcal null per un giorno non loggato', () => {
    expect(
      WeeklyDaySchema.safeParse({ date: '2026-08-01', kcal: null, estimatedCount: 0 }).success,
    ).toBe(true)
  })

  it('accetta kcal omesso perché nullish', () => {
    expect(WeeklyDaySchema.safeParse({ date: '2026-08-01', estimatedCount: 0 }).success).toBe(true)
  })

  it('rifiuta una data non valida', () => {
    expect(WeeklyDaySchema.safeParse({ date: 'ieri', estimatedCount: 0 }).success).toBe(false)
  })
})

describe('DailyBalanceResponseSchema', () => {
  it('accetta una fixture valida completa', () => {
    expect(DailyBalanceResponseSchema.safeParse(dailyFixture).success).toBe(true)
  })

  it('accetta dayTypeCode null perché nullish', () => {
    expect(
      DailyBalanceResponseSchema.safeParse({ ...dailyFixture, dayTypeCode: null }).success,
    ).toBe(true)
  })

  it('rifiuta una fixture senza il blocco macros', () => {
    const { macros: _macros, ...senzaMacros } = dailyFixture
    expect(DailyBalanceResponseSchema.safeParse(senzaMacros).success).toBe(false)
  })

  it('rifiuta un planId non uuid', () => {
    expect(
      DailyBalanceResponseSchema.safeParse({ ...dailyFixture, planId: 'non-uuid' }).success,
    ).toBe(false)
  })
})

describe('DailyMealItemSchema', () => {
  const mealItem = {
    mealSlotLabel: 'Pranzo',
    foodName: 'Riso',
    gramsFood: 80,
    kcal: 288,
    proteinG: 5.6,
    carbsG: 62.4,
    fatG: 0.7,
    estimation: 'weighed',
  }

  it('accetta una voce valida', () => {
    expect(DailyMealItemSchema.safeParse(mealItem).success).toBe(true)
  })

  it('rifiuta una estimation fuori enum', () => {
    expect(DailyMealItemSchema.safeParse({ ...mealItem, estimation: 'guessed' }).success).toBe(
      false,
    )
  })
})

describe('WeeklyBalanceResponseSchema', () => {
  it('accetta una fixture valida completa', () => {
    expect(WeeklyBalanceResponseSchema.safeParse(weeklyFixture).success).toBe(true)
  })

  it('accetta weightTrend null perché nullish', () => {
    expect(
      WeeklyBalanceResponseSchema.safeParse({ ...weeklyFixture, weightTrend: null }).success,
    ).toBe(true)
  })

  it('rifiuta avgKcal come numero nudo invece di UncertainValue', () => {
    expect(
      WeeklyBalanceResponseSchema.safeParse({ ...weeklyFixture, avgKcal: 2000 }).success,
    ).toBe(false)
  })
})
