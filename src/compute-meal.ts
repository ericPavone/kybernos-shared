import { z } from 'zod'
import {
  DailyBalanceResponseSchema,
  GuardrailObservationSchema,
  SlotStatusSchema,
} from './balance'
import { MealLogInputSchema } from './meal-log'

export const ComputeMealInputSchema = z.object({
  items: z
    .array(MealLogInputSchema.pick({ foodId: true, gramsFood: true }).strict())
    .min(1)
    .max(20),
  mealSlotId: z.string().uuid().optional(),
  date: z.string().date().optional(),
})

export const ComputeMealItemSchema = z.object({
  foodId: z.string().uuid(),
  foodName: z.string(),
  gramsFood: z.number(),
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
})

// niente stato degli slot: mischierebbe voci reali e ipotetiche; l'unico slot
// rilevante per la proposta è nel campo dedicato `slot`
export const ProjectedDaySchema = DailyBalanceResponseSchema.omit({ slots: true })

export const ComputeMealResponseSchema = z.object({
  date: z.string().date(),
  items: z.array(ComputeMealItemSchema),
  // proposed items are weighed → the interval is degenerate, plain numbers
  meal: z.object({
    kcal: z.number(),
    proteinG: z.number(),
    carbsG: z.number(),
    fatG: z.number(),
    fiberG: z.number(),
  }),
  slot: SlotStatusSchema.omit({ logged: true }).nullable(),
  slotError: z.string().nullable(),
  projectedDay: ProjectedDaySchema.nullable(),
  projectedDayError: z.string().nullable(),
  observations: z.array(GuardrailObservationSchema),
})

export type ComputeMealInput = z.infer<typeof ComputeMealInputSchema>
export type ComputeMealItem = z.infer<typeof ComputeMealItemSchema>
export type ProjectedDay = z.infer<typeof ProjectedDaySchema>
export type ComputeMealResponse = z.infer<typeof ComputeMealResponseSchema>
