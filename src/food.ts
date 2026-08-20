import { z } from 'zod'
import { PageRequestSchema } from './pagination'

export const FoodAliasSchema = z.object({
  alias: z.string().min(1).max(200),
  gramsFood: z.number().positive(),
})

const nutrients100 = {
  kcal100: z.number().nonnegative(),
  protein100: z.number().nonnegative(),
  carbs100: z.number().nonnegative(),
  fat100: z.number().nonnegative(),
  saturates100: z.number().nonnegative().nullish(),
  sugars100: z.number().nonnegative().nullish(),
  fiber100: z.number().nonnegative().nullish(),
  salt100: z.number().nonnegative().nullish(),
}

// D-045: g/ml. `null` = densità mai dichiarata, e senza non si converte un
// volume: la voce resta in coda e chiede i grammi. Non si indovina mai da un
// nome — sarebbe l'errore della 0034, un calcolo scritto e chiamato dato.
const densityGMl = { densityGMl: z.number().positive().nullish() }

export const UserFoodInputSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).nullish(),
  gtin: z.string().max(32).nullish(),
  aliases: z.array(FoodAliasSchema).max(50).nullish(),
  packageWeightG: z.number().positive().nullish(),
  canonicalFoodId: z.string().uuid().nullish(),
  // la seconda affermazione di chi scrive, dopo un `duplicate_user_food`: un
  // omonimo in dispensa si avvisa, non si vieta. Stessa forma di
  // `MealLogInputSchema.confirmDuplicate`
  confirmDuplicate: z.boolean().optional(),
  ...densityGMl,
  ...nutrients100,
})

export const FoodResponseSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['canonical', 'user']),
  name: z.string(),
  brand: z.string().nullish(),
  gtin: z.string().nullish(),
  aliases: z.array(FoodAliasSchema).nullish(),
  packageWeightG: z.number().nullish(),
  isFavorite: z.boolean().optional(),
  ...densityGMl,
  ...nutrients100,
})

// col catalogo seedato (11k+ righe) la ricerca è paginata
export const FoodSearchQuerySchema = PageRequestSchema.extend({
  q: z.string().min(1).max(200),
})

// la dispensa: l'alimento dell'utente con quanto lo usa. `useCount` conta le
// righe di diario ancora valide, non le volte che l'ha aperto
export const PantryFoodResponseSchema = FoodResponseSchema.extend({
  useCount: z.number().int().nonnegative(),
})

export type FoodAlias = z.infer<typeof FoodAliasSchema>
export type UserFoodInput = z.infer<typeof UserFoodInputSchema>
export type FoodResponse = z.infer<typeof FoodResponseSchema>
export type FoodSearchQuery = z.infer<typeof FoodSearchQuerySchema>
export type PantryFoodResponse = z.infer<typeof PantryFoodResponseSchema>
