import { describe, expect, it } from 'vitest'
import {
  DayTypeOverridePutSchema,
  DayTypeRulesPutSchema,
  MealSlotInputSchema,
  MealSlotPatchSchema,
  PlanInputSchema,
} from './plan'


const basePlan = {
  name: 'Piano estivo',
  validFrom: '2026-08-01',
  bmrFormula: 'mifflin',
  activityFactor: 1.5,
  deficitKcal: 300,
  floorKcal: 1600,
  proteinGPerKg: 2,
  fatGPerDay: 60,
  carbUnit: 'food_weight',
  priority: 'fat_loss',
  mealSlots: [
    { code: 'lunch', label: 'Pranzo', position: 0 },
    { code: 'dinner', label: 'Cena', position: 1 },
  ],
  dayTypes: [
    { code: 'rest', label: 'Riposo' },
    { code: 'workout', label: 'Allenamento' },
  ],
  carbAllocations: [{ dayTypeCode: 'rest', mealSlotCode: 'lunch', amountFoodG: 100 }],
  dayTypeRules: [{ dayTypeCode: 'workout', position: 0, condition: 'workout_present' }],
}

const messagesOf = (input: unknown): string[] => {
  const parsed = PlanInputSchema.safeParse(input)
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message)
}

describe('PlanInputSchema', () => {
  it('accetta un piano valido con codes coerenti', () => {
    expect(PlanInputSchema.safeParse(basePlan).success).toBe(true)
  })

  it('rifiuta allocation con dayTypeCode ignoto con messaggio specifico', () => {
    const plan = {
      ...basePlan,
      carbAllocations: [{ dayTypeCode: 'boh', mealSlotCode: 'lunch', amountFoodG: 100 }],
    }
    expect(messagesOf(plan)).toContain('Allocation references unknown codes: boh/lunch')
  })

  it('rifiuta allocation con mealSlotCode ignoto', () => {
    const plan = {
      ...basePlan,
      carbAllocations: [{ dayTypeCode: 'rest', mealSlotCode: 'boh', amountFoodG: 100 }],
    }
    expect(messagesOf(plan)).toContain('Allocation references unknown codes: rest/boh')
  })

  it('rifiuta rule con dayTypeCode ignoto con messaggio specifico', () => {
    const plan = {
      ...basePlan,
      dayTypeRules: [{ dayTypeCode: 'boh', position: 0, condition: 'always' }],
    }
    expect(messagesOf(plan)).toContain('Rule references unknown day type: boh')
  })

  it('rifiuta modulation con dayTypeCode ignoto con messaggio specifico', () => {
    const plan = {
      ...basePlan,
      workoutModulations: [{ moment: 'pre_workout', dayTypeCode: 'boh' }],
    }
    expect(messagesOf(plan)).toContain('Modulation references unknown day type: boh')
  })

  it('rifiuta day type duplicati', () => {
    const plan = {
      ...basePlan,
      dayTypes: [
        { code: 'rest', label: 'Riposo' },
        { code: 'rest', label: 'Riposo 2' },
      ],
    }
    expect(messagesOf(plan)).toContain('Duplicate day type codes')
  })

  it('rifiuta meal slot duplicati', () => {
    const plan = {
      ...basePlan,
      mealSlots: [
        { code: 'lunch', label: 'Pranzo', position: 0 },
        { code: 'lunch', label: 'Pranzo bis', position: 1 },
      ],
    }
    expect(messagesOf(plan)).toContain('Duplicate meal slot codes')
  })

  it('raccoglie tutti gli errori simultanei del refine, non solo il primo', () => {
    const plan = {
      ...basePlan,
      dayTypes: [
        { code: 'rest', label: 'Riposo' },
        { code: 'rest', label: 'Riposo 2' },
      ],
      carbAllocations: [{ dayTypeCode: 'boh', mealSlotCode: 'lunch', amountFoodG: 100 }],
      dayTypeRules: [{ dayTypeCode: 'mah', position: 0, condition: 'always' }],
    }
    const messages = messagesOf(plan)
    expect(messages).toHaveLength(3)
    expect(messages).toEqual(
      expect.arrayContaining([
        'Duplicate day type codes',
        'Allocation references unknown codes: boh/lunch',
        'Rule references unknown day type: mah',
      ]),
    )
  })

  it('rifiuta mealSlots vuoto', () => {
    expect(PlanInputSchema.safeParse({ ...basePlan, mealSlots: [] }).success).toBe(false)
  })

  it('accetta workoutModulations null perché nullish', () => {
    expect(PlanInputSchema.safeParse({ ...basePlan, workoutModulations: null }).success).toBe(true)
  })
})

describe('MealSlotInputSchema', () => {
  it('accetta uno slot valido con campi opzionali null', () => {
    expect(
      MealSlotInputSchema.safeParse({
        code: 'lunch',
        label: 'Pranzo',
        position: 0,
        allowedCategories: null,
        referenceFoodId: null,
      }).success,
    ).toBe(true)
  })

  it('rifiuta code oltre 100 caratteri', () => {
    expect(
      MealSlotInputSchema.safeParse({ code: 'x'.repeat(101), label: 'L', position: 0 }).success,
    ).toBe(false)
  })

  it('rifiuta position negativa', () => {
    expect(
      MealSlotInputSchema.safeParse({ code: 'c', label: 'L', position: -1 }).success,
    ).toBe(false)
  })

  it('rifiuta allowedCategories con piu di 50 elementi', () => {
    expect(
      MealSlotInputSchema.safeParse({
        code: 'c',
        label: 'L',
        position: 0,
        allowedCategories: Array.from({ length: 51 }, (_, i) => `cat${i}`),
      }).success,
    ).toBe(false)
  })
})

describe('MealSlotPatchSchema', () => {
  it('accetta un patch parziale con solo label', () => {
    expect(MealSlotPatchSchema.safeParse({ label: 'Nuovo' }).success).toBe(true)
  })

  it('rifiuta label vuota', () => {
    expect(MealSlotPatchSchema.safeParse({ label: '' }).success).toBe(false)
  })

  it('accetta referenceFoodId null perché nullish', () => {
    expect(MealSlotPatchSchema.safeParse({ referenceFoodId: null }).success).toBe(true)
  })
})

describe('DayTypeRulesPutSchema', () => {
  it('accetta una lista di regole valida', () => {
    expect(
      DayTypeRulesPutSchema.safeParse([
        { dayTypeCode: 'rest', position: 0, condition: 'always', params: null },
      ]).success,
    ).toBe(true)
  })

  it('rifiuta piu di 50 regole', () => {
    const rules = Array.from({ length: 51 }, (_, i) => ({
      dayTypeCode: 'rest',
      position: i,
      condition: 'always',
    }))
    expect(DayTypeRulesPutSchema.safeParse(rules).success).toBe(false)
  })
})

describe('DayTypeOverridePutSchema', () => {
  it('accetta un code valido', () => {
    expect(DayTypeOverridePutSchema.parse({ code: 'rest' })).toEqual({ code: 'rest' })
  })

  it('rifiuta code vuoto', () => {
    expect(DayTypeOverridePutSchema.safeParse({ code: '' }).success).toBe(false)
  })

  it('rifiuta code oltre 100 caratteri', () => {
    expect(DayTypeOverridePutSchema.safeParse({ code: 'x'.repeat(101) }).success).toBe(false)
  })
})
