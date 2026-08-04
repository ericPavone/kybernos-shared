import { describe, expect, it } from 'vitest'
import { FoodAliasSchema, FoodSearchQuerySchema, UserFoodInputSchema } from './food'

const baseFood = {
  name: 'Riso basmati',
  kcal100: 350,
  protein100: 7,
  carbs100: 78,
  fat100: 1,
}

describe('FoodSearchQuerySchema', () => {
  it('accetta q valida applicando i default di paginazione', () => {
    expect(FoodSearchQuerySchema.parse({ q: 'riso' })).toEqual({ q: 'riso', page: 1, pageSize: 20 })
  })

  it('rifiuta q vuota', () => {
    expect(FoodSearchQuerySchema.safeParse({ q: '' }).success).toBe(false)
  })

  it('rifiuta q oltre 200 caratteri', () => {
    expect(FoodSearchQuerySchema.safeParse({ q: 'x'.repeat(201) }).success).toBe(false)
  })
})

describe('FoodAliasSchema', () => {
  it('accetta un alias con gramsFood positivo', () => {
    expect(FoodAliasSchema.safeParse({ alias: 'porzione', gramsFood: 80 }).success).toBe(true)
  })

  it('rifiuta gramsFood non positivo', () => {
    expect(FoodAliasSchema.safeParse({ alias: 'porzione', gramsFood: 0 }).success).toBe(false)
  })
})

describe('UserFoodInputSchema', () => {
  it('accetta un alimento con i soli nutrienti obbligatori', () => {
    expect(UserFoodInputSchema.safeParse(baseFood).success).toBe(true)
  })

  it('accetta i campi opzionali a null perché nullish', () => {
    expect(
      UserFoodInputSchema.safeParse({
        ...baseFood,
        brand: null,
        gtin: null,
        aliases: null,
        packageWeightG: null,
        canonicalFoodId: null,
        fiber100: null,
      }).success,
    ).toBe(true)
  })

  it('rifiuta name oltre 200 caratteri', () => {
    expect(UserFoodInputSchema.safeParse({ ...baseFood, name: 'x'.repeat(201) }).success).toBe(
      false,
    )
  })

  it('rifiuta kcal100 negativo', () => {
    expect(UserFoodInputSchema.safeParse({ ...baseFood, kcal100: -1 }).success).toBe(false)
  })

  it('rifiuta piu di 50 alias', () => {
    const aliases = Array.from({ length: 51 }, (_, i) => ({ alias: `a${i}`, gramsFood: 10 }))
    expect(UserFoodInputSchema.safeParse({ ...baseFood, aliases }).success).toBe(false)
  })
})
