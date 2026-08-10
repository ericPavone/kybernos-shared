import { z } from 'zod'
import { DateRangeSchema } from './date-range'
import { PageRequestSchema } from './pagination'

export const MeasurementKindSchema = z.enum(['weight', 'ffm', 'body_fat', 'chest', 'waist', 'thigh', 'arm'])

export type MeasurementKind = z.infer<typeof MeasurementKindSchema>

// Un valore aritmeticamente valido ma fuori scala resta corretto in ogni calcolo
// che lo usa: 221 kg danno un target di 4.512 kcal senza che niente protesti.
export const MEASUREMENT_RANGES: Record<MeasurementKind, { min: number; max: number; unit: string }> = {
  weight: { min: 30, max: 250, unit: 'kg' },
  ffm: { min: 20, max: 200, unit: 'kg' },
  body_fat: { min: 3, max: 70, unit: '%' },
  chest: { min: 10, max: 200, unit: 'cm' },
  waist: { min: 10, max: 200, unit: 'cm' },
  thigh: { min: 10, max: 200, unit: 'cm' },
  arm: { min: 10, max: 200, unit: 'cm' },
}

export function isPlausibleMeasurement(kind: MeasurementKind, value: number): boolean {
  const range = MEASUREMENT_RANGES[kind]
  return value >= range.min && value <= range.max
}

// Struttura senza plausibilità: l'import Health la usa per validare il batch e
// scarta i campioni fuori range uno a uno, invece di rifiutare l'intero import.
export const MeasurementSampleSchema = z.object({
  kind: MeasurementKindSchema,
  value: z.number().positive(),
  measuredOn: z.string().date(),
  localTz: z.string().min(1).max(64),
})

export const MeasurementInputSchema = MeasurementSampleSchema.superRefine((m, ctx) => {
  if (!isPlausibleMeasurement(m.kind, m.value)) {
    const { min, max, unit } = MEASUREMENT_RANGES[m.kind]
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: `Value out of plausible range for ${m.kind}: ${min}-${max} ${unit}`,
    })
  }
})

// ⚠️ Senza plausibilità: le righe già a DB fuori range devono restare leggibili
// (il mapper REST fa un parse su ogni riga letta).
// R-29/R-35: stessa forma dei pasti — supersededBy sulla riga vecchia,
// corrected derivato sulla riga attiva
export const MeasurementResponseSchema = MeasurementSampleSchema.extend({
  id: z.string().uuid(),
  supersededBy: z.string().uuid().nullish(),
  corrected: z.boolean().default(false),
})

export const MeasurementFilterSchema = DateRangeSchema.extend({
  kind: MeasurementKindSchema.optional(),
})

export const MeasurementListQuerySchema = MeasurementFilterSchema.merge(PageRequestSchema)

export type MeasurementListQuery = z.infer<typeof MeasurementListQuerySchema>
export type MeasurementInput = z.infer<typeof MeasurementInputSchema>
export type MeasurementResponse = z.infer<typeof MeasurementResponseSchema>
export type MeasurementFilter = z.infer<typeof MeasurementFilterSchema>
