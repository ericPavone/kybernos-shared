import { z } from 'zod'
import { MeasurementSampleSchema } from './measurement'
import { WorkoutLogInputSchema } from './workout-log'

// ⚠️ `MeasurementSampleSchema`, non `MeasurementInputSchema`: un campione fuori
// range non deve far fallire un import da 10.000 campioni. Lo scarta il service.
export const HealthMeasurementSampleSchema = MeasurementSampleSchema.extend({
  externalId: z.string().min(1).max(200),
})

export const HealthWorkoutSampleSchema = WorkoutLogInputSchema.omit({ sets: true }).extend({
  externalId: z.string().min(1).max(200),
})

export const HealthSamplesInputSchema = z.object({
  measurements: z.array(HealthMeasurementSampleSchema).max(10000).default([]),
  workouts: z.array(HealthWorkoutSampleSchema).max(10000).default([]),
})

export const HealthImportCountsSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
})

export const HealthImportResponseSchema = z.object({
  measurements: HealthImportCountsSchema,
  workouts: HealthImportCountsSchema,
})

export type HealthMeasurementSample = z.infer<typeof HealthMeasurementSampleSchema>
export type HealthWorkoutSample = z.infer<typeof HealthWorkoutSampleSchema>
export type HealthSamplesInput = z.infer<typeof HealthSamplesInputSchema>
export type HealthImportCounts = z.infer<typeof HealthImportCountsSchema>
export type HealthImportResponse = z.infer<typeof HealthImportResponseSchema>
