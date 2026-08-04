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
export const ModulationMomentSchema = z.enum(['pre_workout', 'post_workout'])

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

export const CarbAllocationInputSchema = z.object({
  dayTypeCode: z.string().min(1).max(100),
  mealSlotCode: z.string().min(1).max(100),
  amountFoodG: z.number().nonnegative(),
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

export const WorkoutModulationInputSchema = z.object({
  moment: ModulationMomentSchema,
  dayTypeCode: z.string().min(1).max(100),
  excludedWorkoutKinds: z.array(z.string().max(100)).max(50).nullish(),
  carbAmountFoodG: z.number().nonnegative().nullish(),
  proteinG: z.number().nonnegative().nullish(),
  windowMin: z.number().int().positive().nullish(),
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
    carbAllocations: z.array(CarbAllocationInputSchema),
    dayTypeRules: z.array(DayTypeRuleInputSchema),
    workoutModulations: z.array(WorkoutModulationInputSchema).nullish(),
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
    for (const a of plan.carbAllocations) {
      if (!dayTypeCodes.has(a.dayTypeCode) || !slotCodes.has(a.mealSlotCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Allocation references unknown codes: ${a.dayTypeCode}/${a.mealSlotCode}`,
        })
      }
    }
    for (const r of plan.dayTypeRules) {
      if (!dayTypeCodes.has(r.dayTypeCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Rule references unknown day type: ${r.dayTypeCode}`,
        })
      }
    }
    for (const m of plan.workoutModulations ?? []) {
      if (!dayTypeCodes.has(m.dayTypeCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modulation references unknown day type: ${m.dayTypeCode}`,
        })
      }
    }
  })

export const MealSlotResponseSchema = MealSlotInputSchema.extend({ id: z.string().uuid() })
export const DayTypeResponseSchema = DayTypeInputSchema.extend({ id: z.string().uuid() })
export const CarbAllocationResponseSchema = CarbAllocationInputSchema.extend({
  id: z.string().uuid(),
})
export const DayTypeRuleResponseSchema = DayTypeRuleInputSchema.extend({ id: z.string().uuid() })
export const WorkoutModulationResponseSchema = WorkoutModulationInputSchema.extend({
  id: z.string().uuid(),
})

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
  carbAllocations: z.array(CarbAllocationResponseSchema),
  dayTypeRules: z.array(DayTypeRuleResponseSchema),
  workoutModulations: z.array(WorkoutModulationResponseSchema),
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
export type CarbAllocationInput = z.infer<typeof CarbAllocationInputSchema>
export type DayTypeRuleInput = z.infer<typeof DayTypeRuleInputSchema>
export type PlanInput = z.infer<typeof PlanInputSchema>
export type DayTypeOverrideResponse = z.infer<typeof DayTypeOverrideResponseSchema>
export type PlanSummaryResponse = z.infer<typeof PlanSummaryResponseSchema>
export type PlanResponse = z.infer<typeof PlanResponseSchema>
