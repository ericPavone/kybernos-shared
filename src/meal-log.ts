import { z } from 'zod'
import { DateRangeSchema } from './date-range'
import { PageRequestSchema } from './pagination'

export const EstimationSchema = z.enum(['weighed', 'estimated_visual', 'estimated_declared'])

export const MealListQuerySchema = DateRangeSchema.merge(PageRequestSchema)
export const ConfidenceSchema = z.enum(['high', 'medium', 'low'])

export const MealLogInputSchema = z.object({
  foodId: z.string().uuid(),
  // food weight as weighed — never macro grams
  gramsFood: z.number().positive(),
  mealSlotId: z.string().uuid(),
  eatenAt: z.string().datetime({ offset: true }),
  localTz: z.string().min(1).max(64),
  estimation: EstimationSchema.default('weighed'),
  confidence: ConfidenceSchema.nullish(),
})

export const MealLogResponseSchema = z.object({
  id: z.string().uuid(),
  // plan version in force at eatenAt (RF-53)
  planId: z.string().uuid(),
  mealSlotId: z.string().uuid(),
  foodId: z.string().uuid(),
  foodName: z.string(),
  gramsFood: z.number(),
  eatenAt: z.string().datetime({ offset: true }),
  localTz: z.string(),
  estimation: EstimationSchema,
  confidence: ConfidenceSchema.nullish(),
  // macro grams computed at log time from the food's per-100g values
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  // R-35: la riga vecchia punta a chi la sostituisce (le liste la escludono)
  supersededBy: z.string().uuid().nullish(),
  // ...e la riga attiva dice di essere il frutto di una correzione — derivato,
  // non a colonna: esiste una riga superseded che punta a questa
  corrected: z.boolean().default(false),
})

// R-34: multi-voce in una chiamata, esito per voce — una voce cattiva non
// affonda le altre. 201 sempre: l'esito, anche tutto-errori, vive in results[]
export const MealBatchInputSchema = z.object({
  entries: z.array(MealLogInputSchema).min(1).max(30),
})

const BatchMessageSchema = z.object({ code: z.string(), message: z.string() })

export const MealBatchEntryResultSchema = z.object({
  index: z.number().int().nonnegative(),
  status: z.enum(['logged', 'error']),
  meal: MealLogResponseSchema.nullish(),
  errors: z.array(BatchMessageSchema),
  // guardrail per voce: avvisa, mai blocca
  warnings: z.array(BatchMessageSchema),
})

export const MealBatchResponseSchema = z.object({
  results: z.array(MealBatchEntryResultSchema),
})

export type MealLogInput = z.infer<typeof MealLogInputSchema>
export type MealListQuery = z.infer<typeof MealListQuerySchema>
export type MealLogResponse = z.infer<typeof MealLogResponseSchema>
export type MealBatchInput = z.infer<typeof MealBatchInputSchema>
export type MealBatchEntryResult = z.infer<typeof MealBatchEntryResultSchema>
export type MealBatchResponse = z.infer<typeof MealBatchResponseSchema>
