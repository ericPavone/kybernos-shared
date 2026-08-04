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

export const UserFoodInputSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(200).nullish(),
  gtin: z.string().max(32).nullish(),
  aliases: z.array(FoodAliasSchema).max(50).nullish(),
  packageWeightG: z.number().positive().nullish(),
  canonicalFoodId: z.string().uuid().nullish(),
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
  ...nutrients100,
})

// col catalogo seedato (11k+ righe) la ricerca è paginata
export const FoodSearchQuerySchema = PageRequestSchema.extend({
  q: z.string().min(1).max(200),
})

export type FoodAlias = z.infer<typeof FoodAliasSchema>
export type UserFoodInput = z.infer<typeof UserFoodInputSchema>
export type FoodResponse = z.infer<typeof FoodResponseSchema>
export type FoodSearchQuery = z.infer<typeof FoodSearchQuerySchema>
