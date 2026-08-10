import { z } from 'zod'
import { ComputeMealResponseSchema } from './compute-meal'
import { UserFoodInputSchema } from './food'
import { EstimationSchema, MealLogInputSchema } from './meal-log'
import { PlanInputSchema } from './plan'
import { RuleInputSchema } from './rule'

export const PendingActionKindSchema = z.enum([
  'rule',
  'preference',
  'constraint',
  'meal',
  'food',
  'plan_change',
  'unresolved_food',
])

// D-024: i candidati di una voce ambigua, come li rende il client — nome e
// dettaglio per distinguerli, `foodId` per risolverla. È un'istantanea del
// momento in cui la voce è nata: l'alimento può non esistere più alla scelta.
export const FoodCandidateSchema = z.object({
  foodId: z.string().uuid(),
  name: z.string().min(1).max(200),
  detail: z.string().max(200),
  // la dispensa personale sempre prima (RF-21): l'ordine è quello dell'array
  personal: z.boolean(),
})

// D-022: voce di pasto non risolta dal batch — porta grammi, slot e orario
// originali, così la risoluzione registra retroattivamente sul momento vero.
// D-024: se l'irrisolto è un'ambiguità, porta anche i candidati.
export const UnresolvedFoodPayloadSchema = z.object({
  food: z.string().min(1).max(200),
  gramsFood: z.number().positive().nullish(),
  mealSlotId: z.string().uuid(),
  slotLabel: z.string().min(1).max(100),
  eatenAt: z.string().datetime({ offset: true }),
  localTz: z.string().min(1).max(64),
  estimation: EstimationSchema.nullish(),
  candidates: z.array(FoodCandidateSchema).max(4).nullish(),
})

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
  unresolved_food: UnresolvedFoodPayloadSchema,
} as const satisfies Record<z.infer<typeof PendingActionKindSchema>, z.ZodTypeAny>

// D-022/R-31: la risoluzione indica l'alimento; gli altri campi, se assenti,
// restano quelli del payload originale. `localTz` non è sovrascrivibile.
// ⚠️ `foodId` non è vincolato ai `candidates` del payload: D-022 lascia aperto
// anche «cerca in dispensa» e «crea», i candidati sono una scorciatoia.
export const UnresolvedFoodResolutionSchema = z.object({
  foodId: z.string().uuid(),
  gramsFood: z.number().positive().optional(),
  mealSlotId: z.string().uuid().optional(),
  eatenAt: z.string().datetime({ offset: true }).optional(),
  estimation: EstimationSchema.optional(),
})

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
export type FoodCandidate = z.infer<typeof FoodCandidateSchema>
export type UnresolvedFoodPayload = z.infer<typeof UnresolvedFoodPayloadSchema>
export type UnresolvedFoodResolution = z.infer<typeof UnresolvedFoodResolutionSchema>
export type PendingActionStatus = z.infer<typeof PendingActionStatusSchema>
export type PendingActionResponse = z.infer<typeof PendingActionResponseSchema>
