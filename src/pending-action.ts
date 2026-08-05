import { z } from 'zod'
import { ComputeMealResponseSchema } from './compute-meal'
import { UserFoodInputSchema } from './food'
import { MealLogInputSchema } from './meal-log'
import { PlanInputSchema } from './plan'
import { RuleInputSchema } from './rule'

export const PendingActionKindSchema = z.enum([
  'rule',
  'preference',
  'constraint',
  'meal',
  'food',
  'plan_change',
])

// H3.5: il payload di una pending_action deve superare questi schemi prima di
// diventare una scrittura — un payload malformato si rifiuta, mai si scrive.
// preference/constraint: forma provvisoria fino a RF-43
export const PendingActionPayloadSchemas = {
  rule: RuleInputSchema,
  preference: z.object({ text: z.string().min(1).max(1000) }),
  constraint: z.object({ text: z.string().min(1).max(1000) }),
  // computed: fotografia di computeMeal al momento della proposta (RF-41);
  // il decision service la ignora, il log usa solo i campi MealLogInput
  meal: MealLogInputSchema.extend({ computed: ComputeMealResponseSchema.nullish() }),
  food: UserFoodInputSchema,
  plan_change: PlanInputSchema,
} as const satisfies Record<z.infer<typeof PendingActionKindSchema>, z.ZodTypeAny>

export const PendingActionStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'expired'])

export const PendingActionResponseSchema = z.object({
  id: z.string().uuid(),
  kind: PendingActionKindSchema,
  payload: z.unknown(),
  status: PendingActionStatusSchema,
  expiresAt: z.string().datetime({ offset: true }),
  decidedAt: z.string().datetime({ offset: true }).nullish(),
  createdAt: z.string().datetime({ offset: true }),
})

export type PendingActionKind = z.infer<typeof PendingActionKindSchema>
export type PendingActionStatus = z.infer<typeof PendingActionStatusSchema>
export type PendingActionResponse = z.infer<typeof PendingActionResponseSchema>
