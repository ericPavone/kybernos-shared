import { z } from 'zod'

export const RuleSeveritySchema = z.enum(['block', 'warn'])

export const RuleInputSchema = z.object({
  code: z.string().min(1).max(100),
  condition: z.string().min(1).max(2000),
  constraintExpr: z.string().min(1).max(2000),
  exceptions: z.array(z.string().min(1).max(200)).max(50).nullish(),
  severity: RuleSeveritySchema,
  note: z.string().max(2000).nullish(),
  isActive: z.boolean().default(true),
})

export const RuleResponseSchema = RuleInputSchema.extend({
  id: z.string().uuid(),
})

export type RuleSeverity = z.infer<typeof RuleSeveritySchema>
export type RuleInput = z.infer<typeof RuleInputSchema>
export type RuleResponse = z.infer<typeof RuleResponseSchema>
