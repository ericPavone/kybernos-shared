import { z } from 'zod'

export const BmrFormulaSchema = z.enum(['cunningham', 'harris_benedict', 'mifflin'])
export const CarbUnitSchema = z.enum(['food_weight', 'macro_grams'])
export const PlanPrioritySchema = z.enum(['muscle', 'fat_loss', 'performance'])
export const DayTypeRuleConditionSchema = z.enum([
  'workout_kind_in',
  'workout_present',
  'weekday',
  'always',
])
export const SlotPrescriptionKindSchema = z.enum([
  'carbs',
  'protein',
  'fruit',
  'vegetables',
  'added_fat',
  'cheese',
  'cold_cuts',
  'other',
])
// food_g = peso alimento (citazione dal piano), macro_g = grammi di macro,
// free = prescrizione senza quantità («verdura a volontà»)
export const SlotPrescriptionUnitSchema = z.enum(['food_g', 'macro_g', 'free'])

export const MealSlotInputSchema = z.object({
  code: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  position: z.number().int().nonnegative(),
  allowedCategories: z.array(z.string().max(100)).max(50).nullish(),
  referenceFoodId: z.string().uuid().nullish(),
})

export const DayTypeInputSchema = z.object({
  code: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
})

const prescriptionKey = {
  dayTypeCode: z.string().min(1).max(100),
  mealSlotCode: z.string().min(1).max(100),
}

const prescriptionCore = {
  kind: SlotPrescriptionKindSchema,
  amount: z.number().nonnegative().nullish(),
  unit: SlotPrescriptionUnitSchema,
  note: z.string().max(200).nullish(),
}

// amount è valorizzato se e solo se l'unità non è `free` (stesso invariante del
// CHECK a DB): senza il discriminante peso alimento e grammi di macro sarebbero
// ambigui nella stessa riga (§4.1)
const refineFreeAmount = (
  p: { amount?: number | null; unit: z.infer<typeof SlotPrescriptionUnitSchema> },
  ctx: z.RefinementCtx,
) => {
  if ((p.unit === 'free') !== (p.amount == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'amount is required unless unit is «free», and forbidden when it is',
    })
  }
}

export const SlotPrescriptionSchema = z.object(prescriptionCore).superRefine(refineFreeAmount)

export const SlotPrescriptionInputSchema = z
  .object({ ...prescriptionKey, ...prescriptionCore })
  .superRefine(refineFreeAmount)

// La cella (slot × giornata) è l'unità di scrittura: si sostituisce intera, in
// una sola richiesta, come la settimana tipo con DayTypeRulesPutSchema. Scriverla
// riga per riga la lascerebbe a metà se una delle scritture fallisse.
export const SlotPrescriptionsPutSchema = z
  .object({
    ...prescriptionKey,
    prescriptions: z
      .array(SlotPrescriptionSchema)
      .max(SlotPrescriptionKindSchema.options.length),
  })
  .superRefine((cell, ctx) => {
    const seen = new Set<string>()
    for (const p of cell.prescriptions) {
      if (seen.has(p.kind)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate prescription kind: ${p.kind}` })
      }
      seen.add(p.kind)
    }
  })

export const DayTypeRuleInputSchema = z.object({
  dayTypeCode: z.string().min(1).max(100),
  position: z.number().int().nonnegative(),
  condition: DayTypeRuleConditionSchema,
  params: z.record(z.unknown()).nullish(),
})

// CR 4 ago 2026: slot, giornate e settimana tipo sono configurazione del piano
// attivo, sempre modificabile — il piano versionato resta la linea guida
export const MealSlotPatchSchema = z.object({
  label: z.string().min(1).max(200).nullish(),
  position: z.number().int().nonnegative().nullish(),
  allowedCategories: z.array(z.string().max(100)).max(50).nullish(),
  referenceFoodId: z.string().uuid().nullish(),
})

export const DayTypePatchSchema = z.object({
  label: z.string().min(1).max(200),
})

const planParams = {
  name: z.string().min(1).max(200),
  validFrom: z.string().date(),
  bmrFormula: BmrFormulaSchema,
  activityFactor: z.number().positive(),
  deficitKcal: z.number().int().nonnegative(),
  floorKcal: z.number().int().positive(),
  proteinGPerKg: z.number().positive(),
  fatGPerDay: z.number().int().positive(),
  carbUnit: CarbUnitSchema,
  priority: PlanPrioritySchema,
}

export const PlanInputSchema = z
  .object({
    ...planParams,
    mealSlots: z.array(MealSlotInputSchema).min(1),
    dayTypes: z.array(DayTypeInputSchema).min(1),
    slotPrescriptions: z.array(SlotPrescriptionInputSchema),
    dayTypeRules: z.array(DayTypeRuleInputSchema),
  })
  .superRefine((plan, ctx) => {
    const slotCodes = new Set(plan.mealSlots.map((s) => s.code))
    const dayTypeCodes = new Set(plan.dayTypes.map((d) => d.code))
    if (slotCodes.size !== plan.mealSlots.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate meal slot codes' })
    }
    if (dayTypeCodes.size !== plan.dayTypes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate day type codes' })
    }
    const seen = new Set<string>()
    for (const p of plan.slotPrescriptions) {
      if (!dayTypeCodes.has(p.dayTypeCode) || !slotCodes.has(p.mealSlotCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Prescription references unknown codes: ${p.dayTypeCode}/${p.mealSlotCode}`,
        })
      }
      const key = `${p.dayTypeCode}/${p.mealSlotCode}/${p.kind}`
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate prescription: ${key}` })
      }
      seen.add(key)
    }
    for (const r of plan.dayTypeRules) {
      if (!dayTypeCodes.has(r.dayTypeCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Rule references unknown day type: ${r.dayTypeCode}`,
        })
      }
    }
  })

export const MealSlotResponseSchema = MealSlotInputSchema.extend({ id: z.string().uuid() })
export const DayTypeResponseSchema = DayTypeInputSchema.extend({ id: z.string().uuid() })
export const SlotPrescriptionResponseSchema = z
  .object({ id: z.string().uuid(), ...prescriptionKey, ...prescriptionCore })
  .superRefine(refineFreeAmount)
export const DayTypeRuleResponseSchema = DayTypeRuleInputSchema.extend({ id: z.string().uuid() })

export const PlanSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  validFrom: z.string().date(),
  validTo: z.string().date().nullish(),
})

export const PlanResponseSchema = PlanSummaryResponseSchema.extend({
  bmrFormula: BmrFormulaSchema,
  activityFactor: z.number(),
  deficitKcal: z.number().int(),
  floorKcal: z.number().int(),
  proteinGPerKg: z.number(),
  fatGPerDay: z.number().int(),
  carbUnit: CarbUnitSchema,
  priority: PlanPrioritySchema,
  mealSlots: z.array(MealSlotResponseSchema),
  dayTypes: z.array(DayTypeResponseSchema),
  slotPrescriptions: z.array(SlotPrescriptionResponseSchema),
  dayTypeRules: z.array(DayTypeRuleResponseSchema),
})

export const DayTypeRulesPutSchema = z.array(DayTypeRuleInputSchema).max(50)

// manual override of the derived day type for a single date
export const DayTypeOverridePutSchema = z.object({ code: z.string().min(1).max(100) })
export const DayTypeOverrideResponseSchema = z.object({
  date: z.string().date(),
  code: z.string(),
})

export type MealSlotInput = z.infer<typeof MealSlotInputSchema>
export type MealSlotPatch = z.infer<typeof MealSlotPatchSchema>
export type DayTypeInput = z.infer<typeof DayTypeInputSchema>
export type DayTypePatch = z.infer<typeof DayTypePatchSchema>
export type SlotPrescriptionKind = z.infer<typeof SlotPrescriptionKindSchema>
export type SlotPrescriptionUnit = z.infer<typeof SlotPrescriptionUnitSchema>
export type SlotPrescription = z.infer<typeof SlotPrescriptionSchema>
export type SlotPrescriptionInput = z.infer<typeof SlotPrescriptionInputSchema>
export type SlotPrescriptionsPut = z.infer<typeof SlotPrescriptionsPutSchema>
export type SlotPrescriptionResponse = z.infer<typeof SlotPrescriptionResponseSchema>
export type DayTypeRuleInput = z.infer<typeof DayTypeRuleInputSchema>
export type PlanInput = z.infer<typeof PlanInputSchema>
export type DayTypeOverrideResponse = z.infer<typeof DayTypeOverrideResponseSchema>
export type PlanSummaryResponse = z.infer<typeof PlanSummaryResponseSchema>
export type PlanResponse = z.infer<typeof PlanResponseSchema>
