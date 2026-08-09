import { z } from 'zod'
import { EstimationSchema } from './meal-log'
import { BmrFormulaSchema, SlotPrescriptionSchema } from './plan'

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
  // what the plan prescribes here for the day type in force — a quotation
  prescriptions: z.array(SlotPrescriptionSchema),
  // R-08: true = il piano non prevede questo pasto in questa giornata (scelta
  // dichiarata); prescriptions vuote senza flag = cella da compilare
  unprescribed: z.boolean(),
  logged: z.boolean(),
  // R-33: voci in coda `unresolved_food` per questo slot — «registrato ma
  // incompleto» = logged && unresolvedCount > 0; il binario da solo mentiva
  unresolvedCount: z.number().int(),
})

// D-019: uno stato incompleto è una risposta valida — il motivo dichiarato con
// cui il giorno risponde 200 senza target. Un valore solo, il primo mancante
// nell'ordine di verifica: profilo → peso → piano → massa magra
export const BalanceReasonSchema = z.enum([
  'profile_missing',
  'weight_missing',
  'ffm_missing',
  'no_plan_for_date',
])

// R-01 + R-07: la derivazione del target, quattro termini come sul motore —
// basal → tdee(basal, activityFactor, activeKcal) → target − deficit. Il peso
// (e la massa magra con Cunningham) è la misura IN VIGORE alla data del
// calcolo, con data e id per poterla raggiungere: non è «l'ultimo valore noto»,
// e la differenza è il punto della primitiva (D-009: senza blocchi di
// plausibilità, la derivazione è l'unico modo di vedere un input assurdo)
export const DerivationSchema = z.object({
  basal: z.number(),
  bmrFormula: BmrFormulaSchema,
  weightKgUsed: z.number(),
  weightMeasuredAt: z.string().date(),
  weightMeasurementId: z.string().uuid(),
  // solo con Cunningham, altrimenti null
  ffmKgUsed: z.number().nullable(),
  ffmMeasuredAt: z.string().date().nullable(),
  ffmMeasurementId: z.string().uuid().nullable(),
  activityFactor: z.number(),
  activeKcal: z.number(),
  deficitKcal: z.number().int(),
})

export const DailyBalanceResponseSchema = z.object({
  date: z.string().date(),
  // null quando nessuna versione di piano copre la data (D-019)
  planId: z.string().uuid().nullable(),
  dayTypeCode: z.string().nullish(),
  kcal: z.object({
    consumed: UncertainValueSchema,
    // null con `reason`: il consumato resta vero, il target non si inventa
    target: z.number().nullable(),
    residual: z.number().nullable(),
  }),
  floorKcal: z.number().int().nullable(),
  reason: BalanceReasonSchema.nullish(),
  // null quando `reason` è valorizzato: senza tutti i termini non si mostra
  // una derivazione a metà
  derivation: DerivationSchema.nullable(),
  // macro grams: day totals never use food weight (§4.1)
  macros: z.object({
    protein: MacroBalanceSchema,
    carbs: MacroBalanceSchema,
    fat: MacroBalanceSchema,
    fiber: MacroBalanceSchema,
  }),
  estimatedCount: z.number().int(),
  // R-33 (D-018+D-022): voci del giorno ancora in coda di chiarimento — il
  // totale è parziale e sbaglia per difetto: il residuo vero è più basso
  unresolvedCount: z.number().int(),
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
  // R-33: un giorno con voci sospese non è un giorno basso
  unresolvedCount: z.number().int(),
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

export const DailyMealItemSchema = z.object({
  mealSlotLabel: z.string(),
  foodName: z.string(),
  gramsFood: z.number(),
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  estimation: EstimationSchema,
})

export const DailyMealsResponseSchema = z.object({
  date: z.string().date(),
  meals: z.array(DailyMealItemSchema),
})

export const DailyBalanceQuerySchema = z.object({ date: z.string().date() })
export const WeeklyBalanceQuerySchema = z.object({ endDate: z.string().date() })

export type BalanceReason = z.infer<typeof BalanceReasonSchema>
export type Derivation = z.infer<typeof DerivationSchema>
export type UncertainValue = z.infer<typeof UncertainValueSchema>
export type GuardrailObservation = z.infer<typeof GuardrailObservationSchema>
export type MacroBalance = z.infer<typeof MacroBalanceSchema>
export type SlotStatus = z.infer<typeof SlotStatusSchema>
export type WeeklyDay = z.infer<typeof WeeklyDaySchema>
export type DailyMealItem = z.infer<typeof DailyMealItemSchema>
export type DailyMealsResponse = z.infer<typeof DailyMealsResponseSchema>
export type DailyBalanceResponse = z.infer<typeof DailyBalanceResponseSchema>
export type WeeklyBalanceResponse = z.infer<typeof WeeklyBalanceResponseSchema>
