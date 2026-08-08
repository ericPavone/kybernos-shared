import { z } from 'zod'
import { UnitSystemSchema } from './units'

export const HrZoneSchema = z.object({
  zone: z.number().int().min(1).max(5),
  minBpm: z.number().int().positive(),
  maxBpm: z.number().int().positive(),
})

// L'altezza non è un `MeasurementKind`: sta qui, ma il motivo del limite è lo
// stesso delle misure (vedi MEASUREMENT_RANGES).
export const HEIGHT_CM_RANGE = { min: 120, max: 230 }

export const ProfileInputSchema = z.object({
  sex: z.enum(['male', 'female']),
  birthDate: z.string().date(),
  heightCm: z.number().min(HEIGHT_CM_RANGE.min).max(HEIGHT_CM_RANGE.max),
  // presentazione, non dato: l'altezza resta in cm anche per chi la legge in piedi
  unitSystem: UnitSystemSchema.default('metric'),
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
