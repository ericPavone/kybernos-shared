import { z } from 'zod'

export const SetLogInputSchema = z.object({
  exercise: z.string().min(1).max(200),
  loadKg: z.number().nonnegative(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  rir: z.number().nonnegative().nullish(),
})

export const WorkoutLogInputSchema = z.object({
  performedOn: z.string().date(),
  localTz: z.string().min(1).max(64),
  kind: z.string().min(1).max(100),
  durationMin: z.number().int().positive().nullish(),
  activeKcal: z.number().int().nonnegative().nullish(),
  sets: z.array(SetLogInputSchema).max(200).nullish(),
})

export const SetLogResponseSchema = SetLogInputSchema.extend({ id: z.string().uuid() })

// deve restare allineato all'`originEnum` del backend (drizzle/columns.ts): la
// sede autorevole e' quel `pgEnum`, che qui non e' importabile
export const OriginSchema = z.enum(['user', 'agent', 'healthkit', 'ocr', 'seed', 'system'])

export const WorkoutLogResponseSchema = z.object({
  id: z.string().uuid(),
  performedOn: z.string().date(),
  localTz: z.string(),
  kind: z.string(),
  durationMin: z.number().int().nullish(),
  activeKcal: z.number().int().nullish(),
  origin: OriginSchema,
  sets: z.array(SetLogResponseSchema),
})

export type SetLogInput = z.infer<typeof SetLogInputSchema>
export type WorkoutLogInput = z.infer<typeof WorkoutLogInputSchema>
export type Origin = z.infer<typeof OriginSchema>
export type WorkoutLogResponse = z.infer<typeof WorkoutLogResponseSchema>
