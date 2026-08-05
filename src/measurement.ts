import { z } from 'zod'
import { DateRangeSchema } from './date-range'
import { PageRequestSchema } from './pagination'

export const MeasurementKindSchema = z.enum(['weight', 'ffm', 'body_fat', 'chest', 'waist', 'thigh', 'arm'])

export const MeasurementInputSchema = z.object({
  kind: MeasurementKindSchema,
  value: z.number().positive(),
  measuredOn: z.string().date(),
  localTz: z.string().min(1).max(64),
})

export const MeasurementResponseSchema = MeasurementInputSchema.extend({
  id: z.string().uuid(),
})

export const MeasurementFilterSchema = DateRangeSchema.extend({
  kind: MeasurementKindSchema.optional(),
})

export const MeasurementListQuerySchema = MeasurementFilterSchema.merge(PageRequestSchema)

export type MeasurementKind = z.infer<typeof MeasurementKindSchema>
export type MeasurementListQuery = z.infer<typeof MeasurementListQuerySchema>
export type MeasurementInput = z.infer<typeof MeasurementInputSchema>
export type MeasurementResponse = z.infer<typeof MeasurementResponseSchema>
export type MeasurementFilter = z.infer<typeof MeasurementFilterSchema>
