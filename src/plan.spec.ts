import { describe, expect, it } from 'vitest'
import {
  DayTypeOverridePutSchema,
  DayTypeRulesPutSchema,
  MealSlotInputSchema,
  MealSlotPatchSchema,
  PlanInputSchema,
  SlotPrescriptionInputSchema,
  SlotPrescriptionsPutSchema,
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
  slotPrescriptions: [
    { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'carbs', amount: 100, unit: 'food_g' },
  ],
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

  it('rifiuta prescription con dayTypeCode ignoto con messaggio specifico', () => {
    const plan = {
      ...basePlan,
      slotPrescriptions: [
        { dayTypeCode: 'boh', mealSlotCode: 'lunch', kind: 'carbs', amount: 100, unit: 'food_g' },
      ],
    }
    expect(messagesOf(plan)).toContain('Prescription references unknown codes: boh/lunch')
  })

  it('rifiuta prescription con mealSlotCode ignoto', () => {
    const plan = {
      ...basePlan,
      slotPrescriptions: [
        { dayTypeCode: 'rest', mealSlotCode: 'boh', kind: 'carbs', amount: 100, unit: 'food_g' },
      ],
    }
    expect(messagesOf(plan)).toContain('Prescription references unknown codes: rest/boh')
  })

  it('rifiuta due prescrizioni con la stessa chiave (dayType, slot, kind)', () => {
    const plan = {
      ...basePlan,
      slotPrescriptions: [
        { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'carbs', amount: 100, unit: 'food_g' },
        { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'carbs', amount: 80, unit: 'food_g' },
      ],
    }
    expect(messagesOf(plan)).toContain('Duplicate prescription: rest/lunch/carbs')
  })

  it('accetta piu kind sullo stesso slot × giornata', () => {
    const plan = {
      ...basePlan,
      slotPrescriptions: [
        { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'carbs', amount: 100, unit: 'food_g' },
        { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'protein', amount: 30, unit: 'macro_g' },
        { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'vegetables', unit: 'free', note: 'a volontà' },
      ],
    }
    expect(PlanInputSchema.safeParse(plan).success).toBe(true)
  })

  it('rifiuta rule con dayTypeCode ignoto con messaggio specifico', () => {
    const plan = {
      ...basePlan,
      dayTypeRules: [{ dayTypeCode: 'boh', position: 0, condition: 'always' }],
    }
    expect(messagesOf(plan)).toContain('Rule references unknown day type: boh')
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
      slotPrescriptions: [
        { dayTypeCode: 'boh', mealSlotCode: 'lunch', kind: 'carbs', amount: 100, unit: 'food_g' },
      ],
      dayTypeRules: [{ dayTypeCode: 'mah', position: 0, condition: 'always' }],
    }
    const messages = messagesOf(plan)
    expect(messages).toHaveLength(3)
    expect(messages).toEqual(
      expect.arrayContaining([
        'Duplicate day type codes',
        'Prescription references unknown codes: boh/lunch',
        'Rule references unknown day type: mah',
      ]),
    )
  })

  it('rifiuta mealSlots vuoto', () => {
    expect(PlanInputSchema.safeParse({ ...basePlan, mealSlots: [] }).success).toBe(false)
  })
})

describe('SlotPrescriptionInputSchema', () => {
  const base = { dayTypeCode: 'rest', mealSlotCode: 'lunch', kind: 'carbs' }

  it('accetta una quantità con unità', () => {
    expect(SlotPrescriptionInputSchema.safeParse({ ...base, amount: 100, unit: 'food_g' }).success).toBe(true)
  })

  it('rifiuta amount con unit free', () => {
    expect(
      SlotPrescriptionInputSchema.safeParse({ ...base, amount: 100, unit: 'free' }).success,
    ).toBe(false)
  })

  it('rifiuta amount assente con unità diversa da free', () => {
    expect(SlotPrescriptionInputSchema.safeParse({ ...base, unit: 'macro_g' }).success).toBe(false)
  })

  it('accetta free senza amount, con nota', () => {
    expect(
      SlotPrescriptionInputSchema.safeParse({
        ...base,
        kind: 'vegetables',
        unit: 'free',
        note: 'a volontà',
      }).success,
    ).toBe(true)
  })

  it('rifiuta un kind fuori enum', () => {
    expect(
      SlotPrescriptionInputSchema.safeParse({ ...base, kind: 'boh', amount: 1, unit: 'food_g' }).success,
    ).toBe(false)
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

describe('SlotPrescriptionsPutSchema', () => {
  const cell = { dayTypeCode: 'rest', mealSlotCode: 'lunch' }

  it('accetta la cella intera, righe eterogenee comprese', () => {
    expect(
      SlotPrescriptionsPutSchema.safeParse({
        ...cell,
        prescriptions: [
          { kind: 'carbs', amount: 100, unit: 'food_g' },
          { kind: 'protein', amount: 30, unit: 'macro_g', note: 'magro' },
          { kind: 'vegetables', unit: 'free', note: 'a volontà' },
        ],
      }).success,
    ).toBe(true)
  })

  it('la cella vuota è valida: è il modo di svuotarla', () => {
    expect(SlotPrescriptionsPutSchema.safeParse({ ...cell, prescriptions: [] }).success).toBe(true)
  })

  // R-08: il marcatore «non previsto» pretende la cella vuota
  it('accetta unprescribed sulla cella vuota', () => {
    expect(
      SlotPrescriptionsPutSchema.safeParse({ ...cell, prescriptions: [], unprescribed: true }).success,
    ).toBe(true)
  })

  it('rifiuta unprescribed con prescrizioni nella cella', () => {
    expect(
      SlotPrescriptionsPutSchema.safeParse({
        ...cell,
        prescriptions: [{ kind: 'carbs', amount: 100, unit: 'food_g' }],
        unprescribed: true,
      }).success,
    ).toBe(false)
  })

  it('rifiuta due righe dello stesso kind', () => {
    const parsed = SlotPrescriptionsPutSchema.safeParse({
      ...cell,
      prescriptions: [
        { kind: 'carbs', amount: 100, unit: 'food_g' },
        { kind: 'carbs', amount: 80, unit: 'food_g' },
      ],
    })
    expect(parsed.success).toBe(false)
    expect(parsed.success ? [] : parsed.error.issues.map((i) => i.message)).toContain(
      'Duplicate prescription kind: carbs',
    )
  })

  it("rifiuta piu righe dei kind esistenti", () => {
    const prescriptions = Array.from({ length: 9 }, () => ({ kind: 'other', amount: 1, unit: 'macro_g' }))
    expect(SlotPrescriptionsPutSchema.safeParse({ ...cell, prescriptions }).success).toBe(false)
  })

  it("propaga l'invariante di free alle righe", () => {
    expect(
      SlotPrescriptionsPutSchema.safeParse({
        ...cell,
        prescriptions: [{ kind: 'carbs', amount: 100, unit: 'free' }],
      }).success,
    ).toBe(false)
  })
})
