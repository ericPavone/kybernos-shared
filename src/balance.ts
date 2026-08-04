import { z } from 'zod'

// balances never expose a bare number: every total carries its interval
export const UncertainValueSchema = z.object({
  value: z.number(),
  min: z.number(),
  max: z.number(),
})

export const GuardrailObservationSchema = z.object({
  guardrailCode: z.string(),
  zone: z.enum(['soft', 'hard']),
  direction: z.enum(['below', 'above']),
  // false when the interval crosses the threshold (RF-69b)
  certain: z.boolean(),
  message: z.string().nullish(),
})

export const MacroBalanceSchema = z.object({
  consumed: UncertainValueSchema,
  targetG: z.number().nullish(),
  residualG: z.number().nullish(),
})

export const SlotStatusSchema = z.object({
  mealSlotId: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  // prescribed carb allocation, food weight — a quotation from the plan
  allocationFoodG: z.number().nullish(),
  logged: z.boolean(),
})

export const DailyBalanceResponseSchema = z.object({
  date: z.string().date(),
  planId: z.string().uuid(),
  dayTypeCode: z.string().nullish(),
  kcal: z.object({
    consumed: UncertainValueSchema,
    target: z.number(),
    residual: z.number(),
  }),
  // macro grams: day totals never use food weight (§4.1)
  macros: z.object({
    protein: MacroBalanceSchema,
    carbs: MacroBalanceSchema,
    fat: MacroBalanceSchema,
    fiber: MacroBalanceSchema,
  }),
  estimatedCount: z.number().int(),
  slots: z.array(SlotStatusSchema),
  observations: z.array(GuardrailObservationSchema),
})

export const WeightTrendSchema = z.object({
  firstKg: z.number(),
  lastKg: z.number(),
  deltaKg: z.number(),
})

// one entry per day of the window; kcal null = unlogged day (missing data, not zero)
export const WeeklyDaySchema = z.object({
  date: z.string().date(),
  kcal: UncertainValueSchema.nullish(),
  estimatedCount: z.number().int(),
})

export const WeeklyBalanceResponseSchema = z.object({
  endDate: z.string().date(),
  days: z.array(WeeklyDaySchema),
  avgKcal: UncertainValueSchema,
  deltaVsTarget: UncertainValueSchema,
  avgProteinG: UncertainValueSchema,
  daysLogged: z.number().int(),
  estimatedCount: z.number().int(),
  weightTrend: WeightTrendSchema.nullish(),
  observations: z.array(GuardrailObservationSchema),
})

export const DailyBalanceQuerySchema = z.object({ date: z.string().date() })
export const WeeklyBalanceQuerySchema = z.object({ endDate: z.string().date() })

export type UncertainValue = z.infer<typeof UncertainValueSchema>
export type GuardrailObservation = z.infer<typeof GuardrailObservationSchema>
export type MacroBalance = z.infer<typeof MacroBalanceSchema>
export type SlotStatus = z.infer<typeof SlotStatusSchema>
export type WeeklyDay = z.infer<typeof WeeklyDaySchema>
export type DailyBalanceResponse = z.infer<typeof DailyBalanceResponseSchema>
export type WeeklyBalanceResponse = z.infer<typeof WeeklyBalanceResponseSchema>
