import { describe, expect, it } from 'vitest'
import {
  DailyBalanceResponseSchema,
  DailyMealItemSchema,
  SlotSkipInputSchema,
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
  reason: null,
  derivation: {
    basal: 1700,
    bmrFormula: 'mifflin',
    weightKgUsed: 80,
    weightMeasuredAt: '2026-08-02',
    weightMeasurementId: uuid,
    ffmKgUsed: null,
    ffmMeasuredAt: null,
    ffmMeasurementId: null,
    activityFactor: 1.55,
    activeKcal: 300,
    activeKcalSource: 'declared',
    expectedActiveKcal: 400,
    workoutCount: 1,
    deficitKcal: 400,
  },
  macros: { protein: macro, carbs: macro, fat: macro, fiber: macro },
  estimatedCount: 1,
  unresolvedCount: 0,
  slots: [
    {
      mealSlotId: uuid,
      code: 'lunch',
      label: 'Pranzo',
      startsAt: '12:30',
      prescriptions: [
        { kind: 'carbs', amount: 120, unit: 'food_g' },
        { kind: 'vegetables', unit: 'free', note: 'a volontà' },
      ],
      unprescribed: false,
      logged: true,
      skipped: false,
      unresolvedCount: 0,
    },
  ],
  observations: [
    { guardrailCode: 'kcal_day', zone: 'soft', direction: 'above', certain: false, message: null },
  ],
}

const weeklyFixture = {
  endDate: '2026-08-04',
  days: [
    { date: '2026-08-03', kcal: uv, targetKcal: 2200, dayTypeCode: 'training', estimatedCount: 0, unresolvedCount: 0 },
  ],
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
  const unlogged = { date: '2026-08-01', kcal: null, targetKcal: null, dayTypeCode: null, estimatedCount: 0, unresolvedCount: 0 }

  it('accetta kcal null per un giorno non loggato', () => {
    expect(WeeklyDaySchema.safeParse(unlogged).success).toBe(true)
  })

  it('accetta kcal omesso perché nullish', () => {
    const { kcal: _kcal, ...senzaKcal } = unlogged
    expect(WeeklyDaySchema.safeParse(senzaKcal).success).toBe(true)
  })

  it('accetta target e day type valorizzati sul giorno con piano', () => {
    expect(
      WeeklyDaySchema.safeParse({ ...unlogged, targetKcal: 2200, dayTypeCode: 'rest' }).success,
    ).toBe(true)
  })

  it('rifiuta il giorno senza targetKcal: nullable, non opzionale', () => {
    const { targetKcal: _target, ...senzaTarget } = unlogged
    expect(WeeklyDaySchema.safeParse(senzaTarget).success).toBe(false)
  })

  it('rifiuta una data non valida', () => {
    expect(WeeklyDaySchema.safeParse({ ...unlogged, date: 'ieri' }).success).toBe(false)
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

  // R-48: è la distinzione per cui il campo esiste — «il tipo di giornata
  // prevede zero» e «il tipo di giornata non dice niente» non sono la stessa
  // affermazione, e collassate a 0 diventavano indistinguibili
  it('expectedActiveKcal distingue lo zero previsto dalla previsione assente', () => {
    const zero = { ...dailyFixture.derivation, expectedActiveKcal: 0 }
    const assente = { ...dailyFixture.derivation, expectedActiveKcal: null }

    expect(DailyBalanceResponseSchema.safeParse({ ...dailyFixture, derivation: zero }).success).toBe(true)
    expect(DailyBalanceResponseSchema.safeParse({ ...dailyFixture, derivation: assente }).success).toBe(true)
    expect(zero.expectedActiveKcal).not.toBe(assente.expectedActiveKcal)
  })

  // R-49: il conteggio non è opzionale — senza, lo stato «allenamento senza
  // kcal» non è rappresentabile e la didascalia resta falsa
  it('workoutCount è obbligatorio nella derivazione', () => {
    const { workoutCount: _workoutCount, ...senzaConteggio } = dailyFixture.derivation

    expect(
      DailyBalanceResponseSchema.safeParse({ ...dailyFixture, derivation: senzaConteggio }).success,
    ).toBe(false)
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
    eatenAt: '2026-08-20T13:10:00+02:00',
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

  // W0.1: l'ora non è facoltativa — è ciò che distingue una correzione da una
  // registrazione nuova
  it('rifiuta una voce senza ora', () => {
    const { eatenAt: _eatenAt, ...senzaOra } = mealItem
    expect(DailyMealItemSchema.safeParse(senzaOra).success).toBe(false)
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

  it('D-019: accetta reason globale con deltaVsTarget null e avgKcal vero', () => {
    expect(
      WeeklyBalanceResponseSchema.safeParse({
        ...weeklyFixture,
        reason: 'weight_missing',
        deltaVsTarget: null,
      }).success,
    ).toBe(true)
  })

  it('accetta reason omesso perché nullish (settimana completa)', () => {
    expect(WeeklyBalanceResponseSchema.safeParse(weeklyFixture).success).toBe(true)
  })

  it('rifiuta un reason fuori enum', () => {
    expect(
      WeeklyBalanceResponseSchema.safeParse({ ...weeklyFixture, reason: 'no_scale' }).success,
    ).toBe(false)
  })
})

describe('SlotSkipInputSchema', () => {
  const base = { mealSlotId: uuid, skipped: true }

  it('accetta una data che esiste', () => {
    expect(SlotSkipInputSchema.safeParse({ ...base, date: '2026-02-28' }).success).toBe(true)
  })

  // la forma non è la validità: una regex conta le cifre, non i giorni di febbraio
  it('rifiuta una data ben formata che non esiste', () => {
    expect(SlotSkipInputSchema.safeParse({ ...base, date: '2026-02-31' }).success).toBe(false)
    expect(SlotSkipInputSchema.safeParse({ ...base, date: '2026-13-45' }).success).toBe(false)
  })
})
