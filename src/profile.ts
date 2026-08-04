import { z } from 'zod'

export const HrZoneSchema = z.object({
  zone: z.number().int().min(1).max(5),
  minBpm: z.number().int().positive(),
  maxBpm: z.number().int().positive(),
})

export const ProfileInputSchema = z.object({
  sex: z.enum(['male', 'female']),
  birthDate: z.string().date(),
  heightCm: z.number().positive(),
  trainingYears: z.number().nonnegative().nullish(),
  disciplines: z.array(z.string().max(100)).max(50).nullish(),
  sessionsPerWeek: z.number().int().nonnegative().nullish(),
  hrMax: z.number().int().positive().nullish(),
  hrZones: z.array(HrZoneSchema).nullish(),
  stepTarget: z.number().int().positive().nullish(),
  limitations: z.array(z.string().max(500)).max(50).nullish(),
})

export const ProfileResponseSchema = ProfileInputSchema.extend({
  id: z.string().uuid(),
})

export type HrZone = z.infer<typeof HrZoneSchema>
export type ProfileInput = z.infer<typeof ProfileInputSchema>
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>
