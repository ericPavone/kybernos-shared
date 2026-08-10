import { describe, expect, it } from 'vitest'
import { TurnInputSchema, TurnResultSchema } from './turn'

const uuid = '11111111-1111-4111-8111-111111111111'

const mealLogResponse = {
  id: uuid,
  planId: uuid,
  mealSlotId: uuid,
  foodId: uuid,
  foodName: 'Riso',
  gramsFood: 100,
  eatenAt: '2026-08-04T12:30:00+02:00',
  localTz: 'Europe/Rome',
  estimation: 'weighed',
  kcal: 350,
  proteinG: 7,
  carbsG: 78,
  fatG: 1,
}

const pendingActionResponse = {
  id: uuid,
  kind: 'preference',
  payload: { text: 'niente zucchero' },
  status: 'pending',
  expiresAt: '2026-08-05T12:00:00+02:00',
  createdAt: '2026-08-04T12:00:00+02:00',
}

describe('TurnInputSchema', () => {
  it('accetta un turno valido con soli campi obbligatori', () => {
    expect(TurnInputSchema.safeParse({ turnId: uuid, text: 'ho mangiato riso' }).success).toBe(
      true,
    )
  })

  it('accetta imageId e conversationId null perché nullish', () => {
    expect(
      TurnInputSchema.safeParse({ turnId: uuid, text: 'ciao', imageId: null, conversationId: null })
        .success,
    ).toBe(true)
  })

  it('rifiuta text oltre 2000 caratteri', () => {
    expect(TurnInputSchema.safeParse({ turnId: uuid, text: 'x'.repeat(2001) }).success).toBe(false)
  })

  it('rifiuta turnId non uuid', () => {
    expect(TurnInputSchema.safeParse({ turnId: 'abc', text: 'ciao' }).success).toBe(false)
  })
})

describe('TurnResultSchema', () => {
  it('accetta il ramo logged con balance omesso', () => {
    expect(
      TurnResultSchema.safeParse({ kind: 'logged', entries: [mealLogResponse] }).success,
    ).toBe(true)
  })

  it('rifiuta il ramo question, rimosso dal contratto', () => {
    expect(
      TurnResultSchema.safeParse({
        kind: 'question',
        prompt: 'Quale slot?',
        options: [{ label: 'Pranzo', value: 'lunch' }],
      }).success,
    ).toBe(false)
  })

  it('accetta il ramo answer con le citations', () => {
    expect(
      TurnResultSchema.safeParse({ kind: 'answer', text: 'Circa 350 kcal', citations: ['wiki:1'] })
        .success,
    ).toBe(true)
  })

  it('accetta il ramo proposal con le pending actions', () => {
    expect(
      TurnResultSchema.safeParse({ kind: 'proposal', actions: [pendingActionResponse] }).success,
    ).toBe(true)
  })

  it('porta le voci da chiarire sia sul ramo logged sia su answer (D-024)', () => {
    const unresolved = [
      {
        ...pendingActionResponse,
        kind: 'unresolved_food',
        payload: {
          food: 'mozzarella',
          mealSlotId: uuid,
          slotLabel: 'Pranzo',
          eatenAt: '2026-08-04T12:30:00+02:00',
          localTz: 'Europe/Rome',
          candidates: [{ foodId: uuid, name: 'Mozzarella light', detail: '160 kcal/100 g', personal: false }],
        },
      },
    ]
    expect(
      TurnResultSchema.safeParse({ kind: 'logged', entries: [mealLogResponse], unresolved }).success,
    ).toBe(true)
    expect(
      TurnResultSchema.safeParse({ kind: 'answer', text: 'da chiarire', citations: [], unresolved })
        .success,
    ).toBe(true)
  })

  it('rifiuta un kind non previsto dalla union', () => {
    expect(TurnResultSchema.safeParse({ kind: 'unknown' }).success).toBe(false)
  })

  it('rifiuta il ramo logged con la forma del ramo answer', () => {
    expect(
      TurnResultSchema.safeParse({ kind: 'logged', text: 'Circa 350 kcal', citations: [] }).success,
    ).toBe(false)
  })
})
