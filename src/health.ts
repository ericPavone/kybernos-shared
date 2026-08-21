import { z } from 'zod'
import { HealthDayInputSchema } from './health-day'
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
  // ⚠️ Gli aggregati giornalieri entrano da QUI e non da una rotta loro: sono la
  // terza specie di campione della stessa sincronizzazione, e separarli
  // vorrebbe dire due richieste che possono riuscire a metà. Il tetto è 90
  // giorni — al rientro nell'app si risincronizza il recente, non la storia.
  days: z.array(HealthDayInputSchema).max(90).default([]),
  // la sorgente la dichiara il client: domani Garmin scriverà sulle stesse
  // righe, e il server non saprebbe distinguere chi ha detto cosa
  source: z.enum(['healthkit']).default('healthkit'),
})

export const HealthImportCountsSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
})

export const HealthImportResponseSchema = z.object({
  measurements: HealthImportCountsSchema,
  workouts: HealthImportCountsSchema,
  // ⚠️ `skipped` qui vale zero per costruzione: una giornata si SOVRASCRIVE
  // (HealthKit corregge i suoi numeri per ore), quindi non c'è niente da
  // saltare. Il campo resta per non avere due forme di risposta
  days: HealthImportCountsSchema,
})

export type HealthMeasurementSample = z.infer<typeof HealthMeasurementSampleSchema>
export type HealthWorkoutSample = z.infer<typeof HealthWorkoutSampleSchema>
export type HealthSamplesInput = z.infer<typeof HealthSamplesInputSchema>
export type HealthImportCounts = z.infer<typeof HealthImportCountsSchema>
export type HealthImportResponse = z.infer<typeof HealthImportResponseSchema>
