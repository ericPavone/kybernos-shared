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
})

export type MealLogInput = z.infer<typeof MealLogInputSchema>
export type MealListQuery = z.infer<typeof MealListQuerySchema>
export type MealLogResponse = z.infer<typeof MealLogResponseSchema>
