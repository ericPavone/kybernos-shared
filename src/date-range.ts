import { z } from 'zod'

export const DateRangeSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export type DateRange = z.infer<typeof DateRangeSchema>
