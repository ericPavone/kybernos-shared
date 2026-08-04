import { describe, expect, it } from 'vitest'
import { MealListQuerySchema, MealLogInputSchema } from './meal-log'

const uuid = '11111111-1111-4111-8111-111111111111'

const baseInput = {
  foodId: uuid,
  gramsFood: 150,
  mealSlotId: uuid,
  eatenAt: '2026-08-04T12:30:00+02:00',
  localTz: 'Europe/Rome',
}

describe('MealListQuerySchema', () => {
  it('unisce DateRange e PageRequest applicando i default di paginazione', () => {
    expect(MealListQuerySchema.parse({ from: '2026-08-01' })).toEqual({
      from: '2026-08-01',
      page: 1,
      pageSize: 20,
    })
  })

  it('rifiuta un from non in formato date', () => {
    expect(MealListQuerySchema.safeParse({ from: 'oggi' }).success).toBe(false)
  })
})

describe('MealLogInputSchema', () => {
  it('applica estimation weighed di default', () => {
    expect(MealLogInputSchema.parse(baseInput).estimation).toBe('weighed')
  })

  it('rifiuta gramsFood non positivo', () => {
    expect(MealLogInputSchema.safeParse({ ...baseInput, gramsFood: 0 }).success).toBe(false)
  })

  it('rifiuta eatenAt senza offset', () => {
    expect(
      MealLogInputSchema.safeParse({ ...baseInput, eatenAt: '2026-08-04T12:30:00' }).success,
    ).toBe(false)
  })

  it('accetta confidence null perché nullish', () => {
    expect(MealLogInputSchema.safeParse({ ...baseInput, confidence: null }).success).toBe(true)
  })

  it('rifiuta localTz oltre 64 caratteri', () => {
    expect(
      MealLogInputSchema.safeParse({ ...baseInput, localTz: 'x'.repeat(65) }).success,
    ).toBe(false)
  })
})
