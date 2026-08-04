import { z } from 'zod'
import { MeasurementInputSchema } from './measurement'
import { WorkoutLogInputSchema } from './workout-log'

export const HealthMeasurementSampleSchema = MeasurementInputSchema.extend({
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
