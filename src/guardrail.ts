import { z } from 'zod'

export const GuardrailMetricSchema = z.enum([
  'kcal',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'balance',
  'protein_g_per_kg',
  'slot_carbs',
])
export const GuardrailScopeSchema = z.enum(['meal', 'day', 'rolling_7d', 'iso_week'])
export const GuardrailUnitSchema = z.enum(['absolute', 'g_per_kg', 'pct_of_target'])
export const SoftSeveritySchema = z.enum(['info', 'warn'])

export const GuardrailResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  isActive: z.boolean(),
  metric: GuardrailMetricSchema,
  scope: GuardrailScopeSchema,
  unit: GuardrailUnitSchema,
  target: z.number().nullish(),
  softMin: z.number().nullish(),
  softMax: z.number().nullish(),
  hardMin: z.number().nullish(),
  hardMax: z.number().nullish(),
  softSeverity: SoftSeveritySchema.nullish(),
  softMessage: z.string().nullish(),
  hardMessage: z.string().nullish(),
})

// every threshold is individually editable; null removes a band (A6)
export const GuardrailPatchSchema = z
  .object({
    isActive: z.boolean().optional(),
    target: z.number().nullable().optional(),
    softMin: z.number().nullable().optional(),
    softMax: z.number().nullable().optional(),
    hardMin: z.number().nullable().optional(),
    hardMax: z.number().nullable().optional(),
    softSeverity: SoftSeveritySchema.nullable().optional(),
    softMessage: z.string().nullable().optional(),
    hardMessage: z.string().nullable().optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Empty patch' })

export type GuardrailResponse = z.infer<typeof GuardrailResponseSchema>
export type GuardrailPatch = z.infer<typeof GuardrailPatchSchema>
